from __future__ import annotations

import pytest

from app.adapters.digit_adapter import digit_model_catalog, get_digit_adapter
from app.preprocessing.digit import preprocess_digit_image
from app.schemas.digit import DigitTransforms


def test_digit_catalog_contains_real_phase_one_models() -> None:
    catalog = {entry.id: entry for entry in digit_model_catalog()}

    assert set(catalog) == {"mnist-12-float32", "mnist-12-int8"}
    assert catalog["mnist-12-float32"].precision == "float32"
    assert catalog["mnist-12-int8"].precision == "int8"


def test_digit_adapter_runs_real_onnx_models(digit_data_url: str) -> None:
    unavailable = [entry.id for entry in digit_model_catalog() if not entry.available]
    if unavailable:
        pytest.fail(f"Missing local ONNX models: {unavailable}")

    processed = preprocess_digit_image(digit_data_url, DigitTransforms())
    for model_id in ["mnist-12-float32", "mnist-12-int8"]:
      result = get_digit_adapter(model_id).predict(processed.tensor)
      total = sum(item.probability for item in result.probabilities)
      assert len(result.probabilities) == 10
      assert abs(total - 1.0) < 1e-5
      assert result.latency_ms >= 0

