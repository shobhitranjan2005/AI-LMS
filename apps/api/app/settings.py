from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import BaseModel


class Settings(BaseModel):
    app_name: str = "Lightweight AI Learning Playground"
    repo_root: Path
    models_root: Path
    web_public_root: Path
    digit_model_root: Path
    digit_manifest_path: Path
    text_model_root: Path
    sound_model_root: Path
    style_model_root: Path
    all_manifest_path: Path


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    repo_root = Path(__file__).resolve().parents[3]
    models_root = repo_root / "models"
    return Settings(
        repo_root=repo_root,
        models_root=models_root,
        web_public_root=repo_root / "apps" / "web" / "public",
        digit_model_root=models_root / "digit",
        digit_manifest_path=models_root / "manifests" / "digit-models.json",
        text_model_root=models_root / "text",
        sound_model_root=models_root / "sound",
        style_model_root=models_root / "style",
        all_manifest_path=models_root / "manifests" / "all-models.json",
    )
