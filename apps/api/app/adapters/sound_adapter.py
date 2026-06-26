from __future__ import annotations

import csv
import time
from functools import lru_cache

import numpy as np
import onnxruntime as ort

from app.adapters.base import ModelAdapter, cpu_session_options
from app.schemas.common import ClassProbability
from app.schemas.playgrounds import SoundPredictionRequest, SoundPredictionResponse
from app.settings import get_settings


def _resample_linear(samples: np.ndarray, sample_rate: int, target_rate: int = 16000) -> np.ndarray:
    if sample_rate == target_rate:
        return samples.astype(np.float32)
    duration = samples.size / float(sample_rate)
    target_count = max(1, int(duration * target_rate))
    source_x = np.linspace(0.0, duration, num=samples.size, endpoint=False)
    target_x = np.linspace(0.0, duration, num=target_count, endpoint=False)
    return np.interp(target_x, source_x, samples).astype(np.float32)


class YamnetAdapter(ModelAdapter[SoundPredictionRequest, SoundPredictionResponse]):
    id = "yamnet-onnx"
    task = "audio-classification"

    def __init__(self) -> None:
        settings = get_settings()
        self.path = settings.sound_model_root / "yamnet.onnx"
        labels_path = settings.sound_model_root / "yamnet_class_map.csv"
        if not self.path.exists() or not labels_path.exists():
            raise FileNotFoundError("Missing YAMNet files. Run scripts/download_all_models.py.")
        self.labels = self._load_labels(labels_path)
        self.session = ort.InferenceSession(
            str(self.path),
            sess_options=cpu_session_options(),
            providers=["CPUExecutionProvider"],
        )
        self.input_name = self.session.get_inputs()[0].name

    @staticmethod
    def _load_labels(path) -> list[str]:
        with path.open("r", encoding="utf-8", newline="") as handle:
            return [row["display_name"] for row in csv.DictReader(handle)]

    def predict(self, model_input: SoundPredictionRequest) -> SoundPredictionResponse:
        samples = np.asarray(model_input.samples, dtype=np.float32)
        samples = np.nan_to_num(samples, nan=0.0, posinf=0.0, neginf=0.0)
        samples = np.clip(samples * model_input.gain, -1.0, 1.0)
        if model_input.noise_level > 0:
            rng = np.random.default_rng(model_input.seed)
            samples = np.clip(samples + rng.normal(0.0, model_input.noise_level * 0.1, samples.shape), -1.0, 1.0)
        samples = _resample_linear(samples, model_input.sample_rate)
        samples = samples[: 16000 * 5]
        if samples.size < int(16000 * 0.96):
            samples = np.pad(samples, (0, int(16000 * 0.96) - samples.size))

        started = time.perf_counter()
        frame_scores = self.session.run(None, {self.input_name: samples.astype(np.float32)})[0]
        latency_ms = (time.perf_counter() - started) * 1000.0
        scores = np.mean(np.asarray(frame_scores), axis=0)
        indexes = np.argsort(scores)[::-1][:5]
        top_k = [
            ClassProbability(label=self.labels[int(index)], probability=float(np.clip(scores[int(index)], 0.0, 1.0)))
            for index in indexes
        ]
        winner = top_k[0]
        return SoundPredictionResponse(
            model_id=self.id,
            model_name="YAMNet ONNX audio classifier",
            prediction=winner.label,
            confidence=winner.probability,
            top_k=top_k,
            latency_ms=latency_ms,
            model_size_bytes=self.path.stat().st_size,
            duration_seconds=float(samples.size / 16000.0),
            explanation="The waveform is kept local, resampled to 16 kHz mono, then classified by local CPU YAMNet.",
        )


@lru_cache(maxsize=1)
def get_sound_adapter() -> YamnetAdapter:
    return YamnetAdapter()
