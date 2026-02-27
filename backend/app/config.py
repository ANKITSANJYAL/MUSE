"""Application configuration loaded from environment variables using Pydantic Settings.

Uses Google Application Default Credentials (ADC) — no API keys required.
Set GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION in your environment or .env file.
"""

from __future__ import annotations

import os
from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Centralised application settings.

    Values are read from environment variables (or a .env file) and validated at
    startup.  Google Cloud auth is handled via ADC so no secret keys appear here.
    """

    # ── Google Cloud ──────────────────────────────────────────────────────
    google_cloud_project: str = ""
    google_cloud_location: str = "us-central1"

    # ── Gemini Live API ───────────────────────────────────────────────────
    gemini_model: str = "gemini-2.0-flash-live-001"

    # System instruction for the creative‑director persona
    gemini_system_instruction: str = (
        "You are Muse, a Creative Director AI. You help users storyboard ads "
        "and creative campaigns. When a user describes a scene, you MUST respond "
        "verbally with a compelling creative direction while simultaneously "
        "providing an IMAGE_PROMPT tag for the visual.\n\n"
        "FORMAT RULES — follow these EXACTLY:\n"
        "• Whenever you envision a visual, emit exactly:\n"
        '  [IMAGE_PROMPT: "<detailed visual description>"]\n'
        "• To mark the beginning of a storyboard scene emit: [SCENE_START]\n"
        "• To mark the end of a storyboard scene emit: [SCENE_END]\n\n"
        "You may include multiple IMAGE_PROMPT tags in a single response. "
        "Always weave your verbal direction around these tags naturally."
    )

    # ── Imagen (Vertex AI) ────────────────────────────────────────────────
    imagen_model: str = "imagen-3.0-generate-002"

    # ── Server ────────────────────────────────────────────────────────────
    cors_origins: list[str] = ["http://localhost:3000"]
    port: int = 8000

    # ── Audio ─────────────────────────────────────────────────────────────
    send_sample_rate: int = 16000  # PCM 16 kHz mono from client
    receive_sample_rate: int = 24000  # PCM 24 kHz from Gemini

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
    }

    def configure_genai_env(self) -> None:
        """Ensure environment variables required by the google‑genai SDK are set."""
        if self.google_cloud_project:
            os.environ.setdefault("GOOGLE_CLOUD_PROJECT", self.google_cloud_project)
        if self.google_cloud_location:
            os.environ.setdefault("GOOGLE_CLOUD_LOCATION", self.google_cloud_location)
        # Tell the SDK to use Vertex AI backend
        os.environ.setdefault("GOOGLE_GENAI_USE_VERTEXAI", "True")


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings singleton."""
    settings = Settings()
    settings.configure_genai_env()
    return settings
