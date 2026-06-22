from __future__ import annotations

from pydantic import BaseModel, Field

from app.schemas.common import ClassProbability


class DigitTransforms(BaseModel):
    rotation_degrees: float = Field(default=0.0, ge=-45.0, le=45.0)
    noise_level: float = Field(default=0.0, ge=0.0, le=1.0)
    stroke_width: float | None = Field(default=None, ge=1.0, le=64.0)
    seed: int | None = Field(default=1337)


class DigitPredictionRequest(BaseModel):
    image_data_url: str = Field(min_length=24)
    model_id: str = "mnist-12-float32"
    transforms: DigitTransforms = Field(default_factory=DigitTransforms)
    top_k: int = Field(default=3, ge=1, le=10)


class DigitPredictionResponse(BaseModel):
    model_id: str
    model_name: str
    prediction: str
    confidence: float
    probabilities: list[ClassProbability]
    top_k: list[ClassProbability]
    latency_ms: float
    preprocessing_latency_ms: float
    model_size_bytes: int
    parameter_count: int
    preprocessed_preview: str
    transforms: DigitTransforms
    explanation: str


class DigitBattleRequest(BaseModel):
    image_data_url: str = Field(min_length=24)
    transforms: DigitTransforms = Field(default_factory=DigitTransforms)


class DigitBattleResponse(BaseModel):
    results: list[DigitPredictionResponse]
    agreement: bool
    latency_winner_model_id: str
    confidence_delta: float
    explanation: str

