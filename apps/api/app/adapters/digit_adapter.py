from __future__ import annotations

import json
import math
import time
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

import numpy as np
import onnxruntime as ort

from app.adapters.base import ModelAdapter, cpu_session_options
from app.schemas.common import ClassProbability, ModelCatalogEntry
from app.settings import get_settings


DIGIT_MODEL_SPECS: dict[str, dict[str, str | int]] = {
    "mnist-12-float32": {
        "name": "ONNX Model Zoo MNIST-12 float32",
        "filename": "mnist-12.onnx",
        "precision": "float32",
        "source_url": "https://github.com/onnx/models/raw/main/validated/vision/classification/mnist/model/mnist-12.onnx",
        "license": "MIT",
        "parameter_count": 6500,
        "notes": "Small CNN for 28x28 white-on-black MNIST digit classification.",
    },
    "mnist-12-int8": {
        "name": "ONNX Model Zoo MNIST-12 int8",
        "filename": "mnist-12-int8.onnx",
        "precision": "int8",
        "source_url": "https://github.com/onnx/models/raw/main/validated/vision/classification/mnist/model/mnist-12-int8.onnx",
        "license": "MIT",
        "parameter_count": 6500,
        "notes": "Quantized companion model for comparing size, latency, and confidence drift.",
    },
}


@dataclass(frozen=True)
class DigitModelResult:
    probabilities: list[ClassProbability]
    latency_ms: float


def _softmax(scores: np.ndarray) -> np.ndarray:
    scores = scores.astype(np.float64)
    shifted = scores - np.max(scores)
    exps = np.exp(shifted)
    denominator = float(np.sum(exps))
    if math.isclose(denominator, 0.0):
        return np.full_like(scores, 1.0 / scores.size, dtype=np.float64)
    return exps / denominator


def _as_probabilities(raw_output: np.ndarray) -> np.ndarray:
    scores = np.asarray(raw_output).reshape(-1).astype(np.float64)
    if scores.size != 10:
        raise ValueError(f"Expected 10 digit scores, received {scores.size}.")

    if np.all(scores >= 0.0) and np.all(scores <= 1.0) and np.isclose(scores.sum(), 1.0, atol=1e-3):
        probabilities = scores / scores.sum()
    else:
        probabilities = _softmax(scores)
    return probabilities.astype(np.float64)


def model_path_for(model_id: str) -> Path:
    settings = get_settings()
    try:
        filename = str(DIGIT_MODEL_SPECS[model_id]["filename"])
    except KeyError as exc:
        raise ValueError(f"Unknown digit model id: {model_id}") from exc
    return settings.digit_model_root / filename


def digit_model_catalog() -> list[ModelCatalogEntry]:
    settings = get_settings()
    manifest_data: dict[str, dict[str, str | int]] = {}
    if settings.digit_manifest_path.exists():
        manifest_data = json.loads(settings.digit_manifest_path.read_text(encoding="utf-8"))

    entries: list[ModelCatalogEntry] = []
    for model_id, spec in DIGIT_MODEL_SPECS.items():
        path = model_path_for(model_id)
        manifest_entry = manifest_data.get(model_id, {})
        entries.append(
            ModelCatalogEntry(
                id=model_id,
                name=str(spec["name"]),
                task="digit-classification",
                precision=str(spec["precision"]),
                local_path=str(path.relative_to(settings.repo_root)),
                source_url=str(spec["source_url"]),
                license=str(spec["license"]),
                parameter_count=int(spec["parameter_count"]),
                model_size_bytes=int(manifest_entry.get("size_bytes", path.stat().st_size if path.exists() else 0)),
                available=path.exists(),
                notes=str(spec["notes"]),
            )
        )
    return entries


class DigitOnnxAdapter(ModelAdapter[np.ndarray, DigitModelResult]):
    task = "digit-classification"

    def __init__(self, model_id: str) -> None:
        if model_id not in DIGIT_MODEL_SPECS:
            raise ValueError(f"Unknown digit model id: {model_id}")

        self.id = model_id
        self.spec = DIGIT_MODEL_SPECS[model_id]
        self.path = model_path_for(model_id)
        if not self.path.exists():
            raise FileNotFoundError(
                f"Missing model file {self.path}. Run scripts/download_digit_models.py before starting the API."
            )

        options = cpu_session_options()
        self.session = ort.InferenceSession(
            str(self.path),
            sess_options=options,
            providers=["CPUExecutionProvider"],
        )
        self.input_name = self.session.get_inputs()[0].name
        self.output_name = self.session.get_outputs()[0].name

    def predict(self, model_input: np.ndarray) -> DigitModelResult:
        started = time.perf_counter()
        output = self.session.run([self.output_name], {self.input_name: model_input})[0]
        latency_ms = (time.perf_counter() - started) * 1000.0
        probabilities = _as_probabilities(output)
        return DigitModelResult(
            probabilities=[
                ClassProbability(label=str(index), probability=float(probability))
                for index, probability in enumerate(probabilities)
            ],
            latency_ms=latency_ms,
        )


@lru_cache(maxsize=2)
def get_digit_adapter(model_id: str) -> DigitOnnxAdapter:
    return DigitOnnxAdapter(model_id)
