from __future__ import annotations

import json

from fastapi import APIRouter, HTTPException, Response, status

from app.adapters.sound_adapter import get_sound_adapter
from app.adapters.style_adapter import get_style_adapter
from app.adapters.text_adapter import get_text_adapter
from app.schemas.playgrounds import (
    BattleSoundRequest,
    BattleStyleRequest,
    BattleTextRequest,
    ImageRepairRequest,
    ImageRepairResponse,
    SoundPredictionRequest,
    SoundPredictionResponse,
    StyleTransferRequest,
    StyleTransferResponse,
    TextPredictionRequest,
    TextPredictionResponse,
)
from app.settings import get_settings

router = APIRouter(prefix="/api", tags=["playgrounds"])


@router.post("/predict/text", response_model=TextPredictionResponse)
def predict_text(request: TextPredictionRequest) -> TextPredictionResponse:
    try:
        return get_text_adapter().predict(request.text)
    except (FileNotFoundError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/predict/sound", response_model=SoundPredictionResponse)
def predict_sound(request: SoundPredictionRequest) -> SoundPredictionResponse:
    try:
        return get_sound_adapter().predict(request)
    except (FileNotFoundError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/transform/style", response_model=StyleTransferResponse)
def transform_style(request: StyleTransferRequest) -> StyleTransferResponse:
    try:
        return get_style_adapter(request.style_id).predict(request)
    except (FileNotFoundError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/repair/image", response_model=ImageRepairResponse, status_code=status.HTTP_424_FAILED_DEPENDENCY)
def repair_image(request: ImageRepairRequest, response: Response) -> ImageRepairResponse:
    manifest_path = get_settings().all_manifest_path
    blocked = {}
    if manifest_path.exists():
        blocked = json.loads(manifest_path.read_text(encoding="utf-8")).get("blocked", {})
    entry = blocked.get("image_repair", {}).get("mnist-autoencoder", {})
    response.status_code = status.HTTP_424_FAILED_DEPENDENCY
    return ImageRepairResponse(
        status="blocked",
        model_id="mnist-autoencoder",
        reason=entry.get("reason", "No compatible licensed pretrained autoencoder checkpoint is packaged."),
        researched_candidates=entry.get("researched_candidates", []),
    )


@router.post("/battle/text")
def battle_text(request: BattleTextRequest) -> dict[str, object]:
    adapter = get_text_adapter()
    first = adapter.predict(request.original_text)
    second = adapter.predict(request.edited_text)
    return {
        "results": [first.model_dump(), second.model_dump()],
        "agreement": first.prediction == second.prediction,
        "confidence_delta": abs(first.confidence - second.confidence),
        "latency_winner": "original" if first.latency_ms <= second.latency_ms else "edited",
    }


@router.post("/battle/sound")
def battle_sound(request: BattleSoundRequest) -> dict[str, object]:
    base = SoundPredictionRequest(samples=request.samples, sample_rate=request.sample_rate, noise_level=0.0)
    noisy = SoundPredictionRequest(samples=request.samples, sample_rate=request.sample_rate, noise_level=0.25)
    adapter = get_sound_adapter()
    first = adapter.predict(base)
    second = adapter.predict(noisy)
    return {
        "results": [first.model_dump(), second.model_dump()],
        "agreement": first.prediction == second.prediction,
        "confidence_delta": abs(first.confidence - second.confidence),
        "latency_winner": "clean" if first.latency_ms <= second.latency_ms else "noisy",
    }


@router.post("/battle/style")
def battle_style(request: BattleStyleRequest) -> dict[str, object]:
    first = get_style_adapter(request.first_style_id).predict(
        StyleTransferRequest(image_data_url=request.image_data_url, style_id=request.first_style_id)
    )
    second = get_style_adapter(request.second_style_id).predict(
        StyleTransferRequest(image_data_url=request.image_data_url, style_id=request.second_style_id)
    )
    return {
        "results": [first.model_dump(), second.model_dump()],
        "latency_winner": first.model_id if first.latency_ms <= second.latency_ms else second.model_id,
    }
