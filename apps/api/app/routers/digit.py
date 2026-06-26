from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.adapters.digit_adapter import DIGIT_MODEL_SPECS, get_digit_adapter
from app.preprocessing.digit import preprocess_digit_image
from app.schemas.common import ClassProbability
from app.schemas.digit import (
    DigitBattleRequest,
    DigitBattleResponse,
    DigitPredictionRequest,
    DigitPredictionResponse,
)

router = APIRouter(prefix="/api", tags=["digit-lab"])


def _ordered_top_k(probabilities: list[ClassProbability], top_k: int) -> list[ClassProbability]:
    return sorted(probabilities, key=lambda item: item.probability, reverse=True)[:top_k]


def _prediction_response(request: DigitPredictionRequest) -> DigitPredictionResponse:
    try:
        processed = preprocess_digit_image(request.image_data_url, request.transforms)
        adapter = get_digit_adapter(request.model_id)
        result = adapter.predict(processed.tensor)
    except (FileNotFoundError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    top_k = _ordered_top_k(result.probabilities, request.top_k)
    winner = top_k[0]
    spec = DIGIT_MODEL_SPECS[request.model_id]

    return DigitPredictionResponse(
        model_id=request.model_id,
        model_name=str(spec["name"]),
        prediction=winner.label,
        confidence=winner.probability,
        probabilities=result.probabilities,
        top_k=top_k,
        latency_ms=result.latency_ms,
        preprocessing_latency_ms=processed.latency_ms,
        model_size_bytes=adapter.path.stat().st_size,
        parameter_count=int(spec["parameter_count"]),
        preprocessed_preview=processed.preview_data_url,
        transforms=processed.transforms,
        explanation=(
            "The canvas is resized to 28x28 grayscale, normalized to 0..1, then classified by "
            "the local ONNX MNIST model. No cloud API is used."
        ),
    )


@router.post("/predict/digit", response_model=DigitPredictionResponse)
def predict_digit(request: DigitPredictionRequest) -> DigitPredictionResponse:
    return _prediction_response(request)


@router.post("/battle/run", response_model=DigitBattleResponse)
def run_digit_battle(request: DigitBattleRequest) -> DigitBattleResponse:
    float_request = DigitPredictionRequest(
        image_data_url=request.image_data_url,
        model_id="mnist-12-float32",
        transforms=request.transforms,
        top_k=3,
    )
    int8_request = DigitPredictionRequest(
        image_data_url=request.image_data_url,
        model_id="mnist-12-int8",
        transforms=request.transforms,
        top_k=3,
    )

    results = [_prediction_response(float_request), _prediction_response(int8_request)]
    latency_winner = min(results, key=lambda item: item.latency_ms)
    confidence_delta = abs(results[0].confidence - results[1].confidence)

    return DigitBattleResponse(
        results=results,
        agreement=results[0].prediction == results[1].prediction,
        latency_winner_model_id=latency_winner.model_id,
        confidence_delta=confidence_delta,
        explanation=(
            "The same preprocessed drawing was sent to the float32 and int8 MNIST models so students "
            "can compare speed, size, and confidence drift."
        ),
    )

