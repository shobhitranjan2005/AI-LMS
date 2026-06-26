from __future__ import annotations

from pydantic import BaseModel, Field

from app.schemas.common import ClassProbability


class TextPredictionRequest(BaseModel):
    text: str = Field(min_length=1, max_length=1000)
    perturbation: str = "none"
    explanation_mode: str = "simple"


class TextPredictionResponse(BaseModel):
    model_id: str
    model_name: str
    prediction: str
    confidence: float
    probabilities: list[ClassProbability]
    latency_ms: float
    model_size_bytes: int
    token_count: int
    highlighted_tokens: list[str]
    explanation: str


class SoundPredictionRequest(BaseModel):
    samples: list[float] = Field(min_length=100)
    sample_rate: int = Field(default=16000, ge=8000, le=48000)
    gain: float = Field(default=1.0, ge=0.1, le=3.0)
    noise_level: float = Field(default=0.0, ge=0.0, le=1.0)
    seed: int = 1337


class SoundPredictionResponse(BaseModel):
    model_id: str
    model_name: str
    prediction: str
    confidence: float
    top_k: list[ClassProbability]
    latency_ms: float
    model_size_bytes: int
    duration_seconds: float
    explanation: str


class StyleTransferRequest(BaseModel):
    image_data_url: str = Field(min_length=24)
    style_id: str = "mosaic-9"
    intensity: float = Field(default=0.8, ge=0.0, le=1.0)
    brightness: float = Field(default=1.0, ge=0.5, le=1.5)
    saturation: float = Field(default=1.0, ge=0.0, le=2.0)


class StyleTransferResponse(BaseModel):
    model_id: str
    model_name: str
    output_image_data_url: str
    latency_ms: float
    model_size_bytes: int
    explanation: str


class ImageRepairRequest(BaseModel):
    image_data_url: str = Field(min_length=24)
    damage: str = "noise"
    strength: float = Field(default=0.4, ge=0.0, le=1.0)


class ImageRepairResponse(BaseModel):
    status: str
    model_id: str
    reason: str
    researched_candidates: list[str]


class BattleTextRequest(BaseModel):
    original_text: str = Field(min_length=1, max_length=1000)
    edited_text: str = Field(min_length=1, max_length=1000)


class BattleSoundRequest(BaseModel):
    samples: list[float] = Field(min_length=100)
    sample_rate: int = Field(default=16000, ge=8000, le=48000)


class BattleStyleRequest(BaseModel):
    image_data_url: str = Field(min_length=24)
    first_style_id: str = "mosaic-9"
    second_style_id: str = "candy-9"
