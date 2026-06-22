from __future__ import annotations

import pytest

from app.preprocessing.digit import preprocess_digit_image
from app.schemas.digit import DigitTransforms


def test_preprocess_digit_returns_mnist_tensor_and_preview(digit_data_url: str) -> None:
    result = preprocess_digit_image(digit_data_url, DigitTransforms(rotation_degrees=0, noise_level=0))

    assert result.tensor.shape == (1, 1, 28, 28)
    assert result.tensor.dtype.name == "float32"
    assert 0.0 <= float(result.tensor.min()) <= float(result.tensor.max()) <= 1.0
    assert result.preview_data_url.startswith("data:image/png;base64,")
    assert result.latency_ms >= 0


def test_preprocess_digit_applies_noise_with_seed(digit_data_url: str) -> None:
    transforms = DigitTransforms(rotation_degrees=12, noise_level=0.25, seed=42)
    first = preprocess_digit_image(digit_data_url, transforms)
    second = preprocess_digit_image(digit_data_url, transforms)

    assert first.tensor.shape == second.tensor.shape
    assert (first.tensor == second.tensor).all()
    assert first.transforms.rotation_degrees == 12


def test_preprocess_rejects_non_data_url() -> None:
    with pytest.raises(ValueError):
        preprocess_digit_image("not-an-image")

