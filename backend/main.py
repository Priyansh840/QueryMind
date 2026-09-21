"""
QueryMind - FastAPI Application Entry Point
"""

import os
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from api.v1.router import api_router
from services.workflow_worker import get_workflow_worker


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager to start and stop the durable WorkflowWorker."""
    if "pytest" in sys.modules or os.environ.get("TESTING") == "1":
        yield
        return
    # Warm up embedding model at startup so first RAG query doesn't freeze the event loop
    try:
        from ingestion.embeddings import embedding_service
        _ = embedding_service
    except Exception as e:
        pass

    worker = get_workflow_worker()
    worker.start()
    yield
    await worker.stop()


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""

    app = FastAPI(
        title=settings.APP_NAME,
        description="AI-Driven Personal Knowledge Management and Retrieval System",
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # CORS Middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include API routes
    app.include_router(api_router, prefix="/api/v1")

    @app.get("/", tags=["Health"])
    async def health_check():
        return {
            "status": "healthy",
            "app": settings.APP_NAME,
            "version": "1.0.0",
        }

    return app


app = create_app()
