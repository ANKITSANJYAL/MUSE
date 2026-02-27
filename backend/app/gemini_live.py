"""Gemini Live API session manager.

Wraps the google-genai SDK's async Live API to provide a clean interface for
bidirectional audio/video/text streaming with the Gemini 2.0 Flash model.
"""

from __future__ import annotations

import asyncio
import logging
import re
from dataclasses import dataclass, field
from enum import Enum
from typing import AsyncGenerator

from google import genai
from google.genai import types as genai_types

from .config import get_settings

logger = logging.getLogger(__name__)


# ── Parsed message types ──────────────────────────────────────────────────────

class SessionState(str, Enum):
    DISCONNECTED = "disconnected"
    CONNECTING = "connecting"
    ACTIVE = "active"
    LISTENING = "listening"
    THINKING = "thinking"
    ERROR = "error"


@dataclass
class AudioChunk:
    """Raw PCM audio bytes from Gemini (24 kHz, 16-bit, mono)."""
    data: bytes


@dataclass
class TextSegment:
    """A piece of text from Gemini's response."""
    text: str


@dataclass
class ImageTrigger:
    """Parsed [IMAGE_PROMPT: "..."] trigger extracted from text."""
    prompt: str


@dataclass
class SceneMarker:
    """Parsed [SCENE_START] or [SCENE_END] marker."""
    kind: str  # "start" or "end"


@dataclass
class StatusChange:
    """Session state transition."""
    state: SessionState


# Union-style for downstream consumers
GeminiMessage = AudioChunk | TextSegment | ImageTrigger | SceneMarker | StatusChange


# ── Trigger parser ────────────────────────────────────────────────────────────

_IMAGE_PROMPT_RE = re.compile(r'\[IMAGE_PROMPT:\s*"([^"]+)"\]')
_SCENE_START_RE = re.compile(r'\[SCENE_START\]')
_SCENE_END_RE = re.compile(r'\[SCENE_END\]')


def parse_triggers(text: str) -> list[GeminiMessage]:
    """Extract media triggers from text, returning a mix of TextSegments and triggers.

    The original text is split so that non-trigger portions are returned as
    TextSegment objects and trigger patterns are returned as their typed objects.
    """
    messages: list[GeminiMessage] = []
    last_end = 0

    # Combine all patterns with their factories
    patterns: list[tuple[re.Pattern, type]] = [
        (_IMAGE_PROMPT_RE, ImageTrigger),
        (_SCENE_START_RE, SceneMarker),
        (_SCENE_END_RE, SceneMarker),
    ]

    # Find all matches across all patterns and sort by position
    all_matches: list[tuple[int, int, GeminiMessage]] = []

    for pattern, msg_type in patterns:
        for m in pattern.finditer(text):
            if msg_type is ImageTrigger:
                obj = ImageTrigger(prompt=m.group(1))
            elif msg_type is SceneMarker:
                kind = "start" if "START" in m.group(0) else "end"
                obj = SceneMarker(kind=kind)
            else:
                continue
            all_matches.append((m.start(), m.end(), obj))

    all_matches.sort(key=lambda x: x[0])

    for start, end, obj in all_matches:
        # Emit any plain text before this trigger
        preceding = text[last_end:start].strip()
        if preceding:
            messages.append(TextSegment(text=preceding))
        messages.append(obj)
        last_end = end

    # Emit trailing text
    trailing = text[last_end:].strip()
    if trailing:
        messages.append(TextSegment(text=trailing))

    # If no triggers found, return the whole text as a segment
    if not all_matches and text.strip():
        messages.append(TextSegment(text=text.strip()))

    return messages


# ── Session manager ───────────────────────────────────────────────────────────

class GeminiLiveSession:
    """Manages a single persistent Gemini Live API session."""

    def __init__(self) -> None:
        self._settings = get_settings()
        self._client = genai.Client()
        self._session: genai_types.AsyncSession | None = None
        self._state = SessionState.DISCONNECTED
        self._text_buffer: str = ""
        self._receive_task: asyncio.Task | None = None

    @property
    def state(self) -> SessionState:
        return self._state

    async def connect(self) -> None:
        """Open a persistent live session with Gemini."""
        if self._session is not None:
            logger.warning("Session already connected — disconnecting first")
            await self.disconnect()

        self._state = SessionState.CONNECTING
        logger.info(
            "Connecting to Gemini Live API with model=%s", self._settings.gemini_model
        )

        config = {
            "response_modalities": ["AUDIO", "TEXT"],
            "system_instruction": self._settings.gemini_system_instruction,
        }

        try:
            self._session = await self._client.aio.live.connect(
                model=self._settings.gemini_model,
                config=config,
            )
            self._state = SessionState.ACTIVE
            logger.info("Gemini Live session established")
        except Exception:
            self._state = SessionState.ERROR
            logger.exception("Failed to connect to Gemini Live API")
            raise

    async def disconnect(self) -> None:
        """Gracefully close the live session."""
        if self._receive_task and not self._receive_task.done():
            self._receive_task.cancel()
            try:
                await self._receive_task
            except asyncio.CancelledError:
                pass

        if self._session is not None:
            try:
                await self._session.close()
            except Exception:
                logger.exception("Error closing Gemini session")
            finally:
                self._session = None

        self._state = SessionState.DISCONNECTED
        self._text_buffer = ""
        logger.info("Gemini Live session disconnected")

    async def send_audio(self, data: bytes, mime_type: str = "audio/pcm") -> None:
        """Send a chunk of audio to the live session."""
        if self._session is None:
            raise RuntimeError("Session not connected")

        self._state = SessionState.LISTENING
        await self._session.send_realtime_input(
            audio={"data": data, "mime_type": mime_type}
        )

    async def send_video(self, data: bytes, mime_type: str = "image/jpeg") -> None:
        """Send a video frame to the live session."""
        if self._session is None:
            raise RuntimeError("Session not connected")

        await self._session.send_realtime_input(
            video={"data": data, "mime_type": mime_type}
        )

    async def send_text(self, text: str) -> None:
        """Send a text message to the live session."""
        if self._session is None:
            raise RuntimeError("Session not connected")

        self._state = SessionState.THINKING
        await self._session.send_client_content(
            turns=[{"role": "user", "parts": [{"text": text}]}],
            turn_complete=True,
        )

    async def receive_responses(self) -> AsyncGenerator[GeminiMessage, None]:
        """Async generator that yields parsed messages from the Gemini session.

        Yields AudioChunk, TextSegment, ImageTrigger, SceneMarker, and
        StatusChange objects as they arrive.  Handles interruptions by
        clearing state and emitting status changes.
        """
        if self._session is None:
            raise RuntimeError("Session not connected")

        self._state = SessionState.THINKING
        yield StatusChange(state=SessionState.THINKING)

        try:
            turn = self._session.receive()
            async for response in turn:
                server_content = response.server_content
                if server_content is None:
                    continue

                # ── Model turn: audio and text parts ──
                if server_content.model_turn:
                    for part in server_content.model_turn.parts:
                        # Audio data
                        if part.inline_data and isinstance(
                            part.inline_data.data, bytes
                        ):
                            yield AudioChunk(data=part.inline_data.data)

                        # Text data — buffer and parse for triggers
                        if part.text:
                            self._text_buffer += part.text
                            # Parse complete triggers from the buffer
                            parsed = parse_triggers(self._text_buffer)
                            # Keep un-triggered tail in buffer
                            self._text_buffer = ""
                            for msg in parsed:
                                yield msg

                # ── Turn complete ──
                if server_content.turn_complete:
                    # Flush any remaining text buffer
                    if self._text_buffer.strip():
                        for msg in parse_triggers(self._text_buffer):
                            yield msg
                        self._text_buffer = ""

                    self._state = SessionState.ACTIVE
                    yield StatusChange(state=SessionState.ACTIVE)

                # ── Interruption ──
                if server_content.interrupted:
                    logger.info("Gemini response interrupted by user")
                    self._text_buffer = ""
                    self._state = SessionState.LISTENING
                    yield StatusChange(state=SessionState.LISTENING)

        except asyncio.CancelledError:
            logger.info("Receive loop cancelled")
            raise
        except Exception:
            self._state = SessionState.ERROR
            logger.exception("Error in Gemini receive loop")
            yield StatusChange(state=SessionState.ERROR)
            raise
