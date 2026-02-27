"""WebSocket endpoint bridging the browser client to Gemini Live + Imagen.

Handles bidirectional message passing:
  Client → Server: audio_data, video_frame, text_message, control
  Server → Client: audio, transcript, image, status, error
"""

from __future__ import annotations

import asyncio
import base64
import json
import logging
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from .gemini_live import (
    AudioChunk,
    GeminiLiveSession,
    GeminiMessage,
    ImageTrigger,
    SceneMarker,
    SessionState,
    StatusChange,
    TextSegment,
)
from .imagen import ImagenService

logger = logging.getLogger(__name__)

router = APIRouter()


async def _send_json(ws: WebSocket, payload: dict[str, Any]) -> bool:
    """Send a JSON message to the client.  Returns False if the socket is gone."""
    try:
        await ws.send_json(payload)
        return True
    except (WebSocketDisconnect, RuntimeError):
        return False


async def _handle_image_trigger(
    ws: WebSocket,
    imagen: ImagenService,
    trigger: ImageTrigger,
) -> None:
    """Generate an image from an IMAGE_PROMPT trigger and send it to the client."""
    # Notify client that image generation is in progress
    await _send_json(ws, {
        "type": "image_loading",
        "prompt": trigger.prompt,
    })

    b64_image = await imagen.generate(trigger.prompt)
    if b64_image:
        await _send_json(ws, {
            "type": "image",
            "data": b64_image,
            "prompt": trigger.prompt,
            "mime_type": "image/png",
        })
    else:
        await _send_json(ws, {
            "type": "error",
            "message": f"Image generation failed for: {trigger.prompt[:80]}",
        })


async def _process_gemini_responses(
    ws: WebSocket,
    session: GeminiLiveSession,
    imagen: ImagenService,
) -> None:
    """Continuously receive Gemini responses and forward to the WebSocket client.

    Runs as a background task for the lifetime of the WebSocket connection.
    """
    image_tasks: list[asyncio.Task] = []

    try:
        while True:
            try:
                async for msg in session.receive_responses():
                    if isinstance(msg, AudioChunk):
                        ok = await _send_json(ws, {
                            "type": "audio",
                            "data": base64.b64encode(msg.data).decode("utf-8"),
                        })
                        if not ok:
                            return

                    elif isinstance(msg, TextSegment):
                        ok = await _send_json(ws, {
                            "type": "transcript",
                            "text": msg.text,
                            "role": "assistant",
                        })
                        if not ok:
                            return

                    elif isinstance(msg, ImageTrigger):
                        # Send transcript for the trigger itself
                        await _send_json(ws, {
                            "type": "transcript",
                            "text": f'🎨 Generating: "{msg.prompt}"',
                            "role": "system",
                        })
                        # Spawn image generation in background (non-blocking)
                        task = asyncio.create_task(
                            _handle_image_trigger(ws, imagen, msg)
                        )
                        image_tasks.append(task)

                    elif isinstance(msg, SceneMarker):
                        await _send_json(ws, {
                            "type": "scene_marker",
                            "kind": msg.kind,
                        })

                    elif isinstance(msg, StatusChange):
                        await _send_json(ws, {
                            "type": "status",
                            "state": msg.state.value,
                        })

            except asyncio.CancelledError:
                raise
            except Exception:
                logger.exception("Error in Gemini response processing")
                await _send_json(ws, {
                    "type": "error",
                    "message": "Connection to AI interrupted. Reconnecting...",
                })
                # Brief pause before retrying the receive loop
                await asyncio.sleep(1.0)

    finally:
        # Cancel any pending image generation tasks
        for task in image_tasks:
            if not task.done():
                task.cancel()
        if image_tasks:
            await asyncio.gather(*image_tasks, return_exceptions=True)


@router.websocket("/ws")
async def websocket_endpoint(ws: WebSocket) -> None:
    """Main WebSocket endpoint for the Muse creative agent."""
    await ws.accept()
    logger.info("WebSocket client connected")

    session = GeminiLiveSession()
    imagen = ImagenService()
    response_task: asyncio.Task | None = None

    try:
        # Connect to Gemini Live on WebSocket open
        await session.connect()
        await _send_json(ws, {
            "type": "status",
            "state": SessionState.ACTIVE.value,
        })

        # Start background task to process Gemini responses
        response_task = asyncio.create_task(
            _process_gemini_responses(ws, session, imagen)
        )

        # Main loop: receive messages from the client
        while True:
            try:
                raw = await ws.receive_text()
            except WebSocketDisconnect:
                logger.info("WebSocket client disconnected normally")
                break

            try:
                message = json.loads(raw)
            except json.JSONDecodeError:
                logger.warning("Received non-JSON message from client")
                await _send_json(ws, {
                    "type": "error",
                    "message": "Invalid message format — expected JSON",
                })
                continue

            msg_type = message.get("type", "")

            # ── Audio data from microphone ──
            if msg_type == "audio_data":
                audio_b64 = message.get("data", "")
                if audio_b64:
                    audio_bytes = base64.b64decode(audio_b64)
                    await session.send_audio(audio_bytes)

            # ── Video frame from camera ──
            elif msg_type == "video_frame":
                frame_b64 = message.get("data", "")
                if frame_b64:
                    frame_bytes = base64.b64decode(frame_b64)
                    await session.send_video(frame_bytes)

            # ── Text message ──
            elif msg_type == "text_message":
                text = message.get("text", "").strip()
                if text:
                    # Echo user message back as transcript
                    await _send_json(ws, {
                        "type": "transcript",
                        "text": text,
                        "role": "user",
                    })
                    await session.send_text(text)

            # ── Control commands ──
            elif msg_type == "control":
                action = message.get("action", "")
                if action == "disconnect":
                    logger.info("Client requested disconnect")
                    break
                else:
                    logger.warning("Unknown control action: %s", action)

            else:
                logger.warning("Unknown message type: %s", msg_type)

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")
    except Exception:
        logger.exception("Unhandled error in WebSocket handler")
        try:
            await _send_json(ws, {
                "type": "error",
                "message": "Internal server error",
            })
        except Exception:
            pass
    finally:
        # ── Cleanup ──
        if response_task and not response_task.done():
            response_task.cancel()
            try:
                await response_task
            except asyncio.CancelledError:
                pass

        await session.disconnect()

        try:
            await ws.close()
        except Exception:
            pass

        logger.info("WebSocket handler cleanup complete")
