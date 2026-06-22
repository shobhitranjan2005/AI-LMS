from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.routers import digit, models, playgrounds
from app.settings import get_settings

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="Local AI learning playground API with CPU-only model adapters.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:8000", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(models.router)
app.include_router(digit.router)
app.include_router(playgrounds.router)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


if settings.web_public_root.exists():
    app.mount("/", StaticFiles(directory=settings.web_public_root, html=True), name="web")
