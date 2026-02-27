"""FastAPI application entrypoint for Project Muse backend."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .websocket_handler import router as ws_router

# ── Logging ───────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(name)-28s │ %(levelname)-7s │ %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)


# ── Lifespan ──────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan — runs startup and shutdown logic."""
    settings = get_settings()
    logger.info("🎨 Project Muse backend starting")
    logger.info("   Model  : %s", settings.gemini_model)
    logger.info("   Imagen : %s", settings.imagen_model)
    logger.info("   Project: %s", settings.google_cloud_project or "(from ADC)")
    logger.info("   Region : %s", settings.google_cloud_location)
    yield
    logger.info("🎨 Project Muse backend shutting down")


# ── App ───────────────────────────────────────────────────────────────────────

def create_app() -> FastAPI:
    """Factory function to create and configure the FastAPI application."""
    settings = get_settings()

    app = FastAPI(
        title="Project Muse",
        description="Real-time multimodal creative agent powered by Gemini Live API",
        version="1.0.0",
        lifespan=lifespan,
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # WebSocket routes
    app.include_router(ws_router)

    # Health check
    @app.get("/health")
    async def health_check() -> dict:
        return {
            "status": "ok",
            "service": "project-muse",
            "model": settings.gemini_model,
        }

    return app


app = create_app()
