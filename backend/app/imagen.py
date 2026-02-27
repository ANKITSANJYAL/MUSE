"""Imagen 3 image generation service via Vertex AI.

Uses the unified google-genai SDK to call Imagen 3 for text-to-image generation.
Images are returned as base64-encoded PNGs for WebSocket transport.
"""

from __future__ import annotations

import asyncio
import base64
import logging
from io import BytesIO

from google import genai
from google.genai.types import GenerateImagesConfig

from .config import get_settings

logger = logging.getLogger(__name__)

# Maximum retries for transient Imagen API failures
_MAX_RETRIES = 3
_RETRY_BACKOFF_BASE = 1.5  # seconds


class ImagenService:
    """Generates images from text prompts using Imagen 3 on Vertex AI."""

    def __init__(self) -> None:
        self._settings = get_settings()
        self._client = genai.Client()

    async def generate(self, prompt: str) -> str | None:
        """Generate an image from a text prompt.

        Args:
            prompt: Detailed visual description for image generation.

        Returns:
            Base64-encoded PNG string, or None if generation failed after retries.
        """
        logger.info("Generating image for prompt: %.120s...", prompt)

        for attempt in range(1, _MAX_RETRIES + 1):
            try:
                # The SDK's generate_images is synchronous — run in thread pool
                result = await asyncio.to_thread(
                    self._client.models.generate_images,
                    model=self._settings.imagen_model,
                    prompt=prompt,
                    config=GenerateImagesConfig(
                        number_of_images=1,
                        aspect_ratio="16:9",  # Widescreen for storyboards
                    ),
                )

                if result.generated_images and len(result.generated_images) > 0:
                    image_bytes = result.generated_images[0].image.image_bytes
                    b64_str = base64.b64encode(image_bytes).decode("utf-8")
                    logger.info(
                        "Image generated successfully (%d bytes)", len(image_bytes)
                    )
                    return b64_str

                logger.warning("Imagen returned no images for prompt: %.80s", prompt)
                return None

            except Exception as exc:
                if attempt < _MAX_RETRIES:
                    backoff = _RETRY_BACKOFF_BASE ** attempt
                    logger.warning(
                        "Imagen attempt %d/%d failed (%s), retrying in %.1fs",
                        attempt,
                        _MAX_RETRIES,
                        exc,
                        backoff,
                    )
                    await asyncio.sleep(backoff)
                else:
                    logger.exception(
                        "Imagen generation failed after %d attempts", _MAX_RETRIES
                    )
                    return None
