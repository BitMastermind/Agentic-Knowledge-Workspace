"""FastAPI application instance and configuration."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1 import auth, tenants, documents, rag, agent, credentials
from app.core.config import settings
from app.core.database import engine
from app.core.logging import setup_logging

# Set up structured logging
setup_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events."""
    # Startup
    print(f"[*] Starting {settings.APP_NAME}")
    print(f"[*] Database: {str(settings.DATABASE_URL).split('@')[-1]}")
    print(f"[*] Environment: {settings.ENVIRONMENT}")
    yield
    # Shutdown
    await engine.dispose()
    print("[*] Shutting down")


# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    description="AI-powered document workspace with RAG and agent capabilities",
    version="0.1.0",
    lifespan=lifespan,
    docs_url=f"/api/{settings.API_VERSION}/docs",
    redoc_url=f"/api/{settings.API_VERSION}/redoc",
    openapi_url=f"/api/{settings.API_VERSION}/openapi.json",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return JSONResponse(
        content={
            "status": "healthy",
            "service": settings.APP_NAME,
            "version": "0.1.0",
            "environment": settings.ENVIRONMENT,
        }
    )


# Include routers
app.include_router(auth.router, prefix=f"/api/{settings.API_VERSION}/auth", tags=["auth"])
app.include_router(
    tenants.router, prefix=f"/api/{settings.API_VERSION}/tenants", tags=["tenants"]
)
app.include_router(
    documents.router, prefix=f"/api/{settings.API_VERSION}/documents", tags=["documents"]
)
app.include_router(rag.router, prefix=f"/api/{settings.API_VERSION}/rag", tags=["rag"])
app.include_router(agent.router, prefix=f"/api/{settings.API_VERSION}/agent", tags=["agent"])
app.include_router(
    credentials.router, prefix=f"/api/{settings.API_VERSION}/credentials", tags=["credentials"]
)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info",
    )

