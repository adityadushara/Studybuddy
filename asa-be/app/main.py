"""
app/main.py - FastAPI application factory with middleware, CORS, rate limiting, and routers.
"""

from __future__ import annotations

import logging
import os
import time
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

from app.database import create_tables

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
# Suppress noisy SQLAlchemy engine logs
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
logging.getLogger("sqlalchemy.pool").setLevel(logging.WARNING)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Rate limiter
# ---------------------------------------------------------------------------

RATE_LIMIT = os.getenv("RATE_LIMIT_PER_MINUTE", "60")
limiter = Limiter(key_func=get_remote_address, default_limits=[f"{RATE_LIMIT}/minute"])

# ---------------------------------------------------------------------------
# Lifespan (startup / shutdown)
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting Study Buddy API...")
    # Ensure uploads directory exists
    upload_dir = Path(os.getenv("UPLOAD_DIR", "uploads"))
    upload_dir.mkdir(parents=True, exist_ok=True)
    # Create DB tables
    await create_tables()
    logger.info("Study Buddy API is ready ✓")
    yield
    # Shutdown
    logger.info("Shutting down Study Buddy API...")


# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------

def create_app() -> FastAPI:
    app = FastAPI(
        title=os.getenv("APP_NAME", "Study Buddy API"),
        version=os.getenv("APP_VERSION", "1.0.0"),
        description=(
            "AI-powered study platform API. "
            "Supports PDF ingestion, summaries, flashcards, quizzes, and chat."
        ),
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    # -----------------------------------------------------------------------
    # CORS
    # -----------------------------------------------------------------------
    raw_origins = os.getenv(
        "ALLOWED_ORIGINS",
        "https://studybuddy-one-nu.vercel.app,http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173"
    )
    allowed_origins = [o.strip() for o in raw_origins.split(",") if o.strip()]

    # -----------------------------------------------------------------------
    # Gzip compression
    # -----------------------------------------------------------------------
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    # -----------------------------------------------------------------------
    # Rate limiting
    # -----------------------------------------------------------------------
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)

    # CORS must be added LAST so it executes FIRST (FastAPI reverses middleware order)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def add_security_headers(request: Request, call_next):
        # Let CORS middleware handle preflight OPTIONS requests
        if request.method == "OPTIONS":
            response = await call_next(request)
            return response
        response = await call_next(request)
        # Allow embedding in iframes for PDF viewing
        if "X-Frame-Options" in response.headers:
            del response.headers["X-Frame-Options"]
        
        # CSP frame-ancestors allows the iframe to be embedded by our frontend origins
        response.headers["Content-Security-Policy"] = f"frame-ancestors 'self' *"
        return response

    # -----------------------------------------------------------------------
    # Request timing middleware
    # -----------------------------------------------------------------------
    @app.middleware("http")
    async def add_process_time_header(request: Request, call_next):
        start = time.perf_counter()
        response = await call_next(request)
        elapsed = time.perf_counter() - start
        response.headers["X-Process-Time"] = f"{elapsed:.4f}s"
        return response

    # -----------------------------------------------------------------------
    # Global exception handler
    # -----------------------------------------------------------------------
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.error("Unhandled exception on %s %s: %s", request.method, request.url.path, exc, exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"error": "Internal server error", "detail": str(exc), "status_code": 500},
        )

    # -----------------------------------------------------------------------
    # Include routers
    # -----------------------------------------------------------------------
    from fastapi.staticfiles import StaticFiles
    from app.routers.auth import router as auth_router
    from app.routers.documents import router as documents_router
    from app.routers.ai import router as ai_router
    from app.routers.dashboard import router as dashboard_router

    os.makedirs("uploads", exist_ok=True)
    app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

    app.include_router(auth_router)
    app.include_router(documents_router)
    app.include_router(ai_router)
    app.include_router(dashboard_router)

    # -----------------------------------------------------------------------
    # Health check
    # -----------------------------------------------------------------------
    @app.get("/health", tags=["System"])
    async def health_check():
        return {
            "status": "healthy",
            "app": os.getenv("APP_NAME", "Study Buddy API"),
            "version": os.getenv("APP_VERSION", "1.0.0"),
        }

    @app.get("/", tags=["System"])
    async def root():
        return {
            "message": "Welcome to Study Buddy API 📚",
            "docs": "/docs",
            "redoc": "/redoc",
        }

    return app


app = create_app()
