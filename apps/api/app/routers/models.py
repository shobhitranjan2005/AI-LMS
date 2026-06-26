from __future__ import annotations

from fastapi import APIRouter

import json

from app.adapters.digit_adapter import digit_model_catalog
from app.settings import get_settings

router = APIRouter(prefix="/api/models", tags=["models"])


@router.get("/catalog")
def catalog() -> dict[str, object]:
    settings = get_settings()
    models = [entry.model_dump() for entry in digit_model_catalog()]
    for manifest_name, task in [
        ("text-models.json", "text-mood"),
        ("sound-models.json", "sound-classification"),
        ("style-models.json", "style-transfer"),
    ]:
        path = settings.models_root / "manifests" / manifest_name
        if not path.exists():
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        for model_id, entry in data.items():
            local_path = settings.repo_root / str(entry["local_path"])
            models.append(
                {
                    "id": model_id,
                    "name": model_id,
                    "task": task,
                    "precision": entry.get("precision", "float32"),
                    "local_path": entry["local_path"],
                    "source_url": entry["source_url"],
                    "license": entry["license"],
                    "parameter_count": 0,
                    "model_size_bytes": entry["size_bytes"],
                    "available": local_path.exists(),
                    "notes": entry.get("task", task),
                }
            )
    all_manifest_path = settings.all_manifest_path
    blocked = {}
    if all_manifest_path.exists():
        blocked = json.loads(all_manifest_path.read_text(encoding="utf-8")).get("blocked", {})
    return {
        "playgrounds": ["digit-lab", "image-repair", "text-lab", "sound-lab", "style-studio", "model-battle"],
        "models": models,
        "blocked": blocked,
        "offline_ready": all(model["available"] for model in models),
    }
