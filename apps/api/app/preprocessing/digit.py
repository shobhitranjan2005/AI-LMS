from __future__ import annotations

import base64
import binascii
import io
import time
from dataclasses import dataclass

import numpy as np
from PIL import Image, ImageOps

from app.schemas.digit import DigitTransforms


@dataclass(frozen=True)
class DigitPreprocessResult:
    tensor: np.ndarray
    preview_data_url: str
    latency_ms: float
    transforms: DigitTransforms


def decode_data_url(image_data_url: str) -> Image.Image:
    if "," not in image_data_url:
        raise ValueError("Expected a data URL with a base64 payload.")

    header, payload = image_data_url.split(",", 1)
    if "base64" not in header:
        raise ValueError("Expected a base64-encoded image data URL.")

    try:
        image_bytes = base64.b64decode(payload, validate=True)
    except binascii.Error as exc:
        raise ValueError("Image payload is not valid base64.") from exc

    try:
        image = Image.open(io.BytesIO(image_bytes))
        image.load()
    except Exception as exc:  # noqa: BLE001 - PIL raises several image-specific exceptions.
        raise ValueError("Image payload could not be decoded.") from exc

    return image


def _to_black_background_grayscale(image: Image.Image) -> Image.Image:
    if image.mode in {"RGBA", "LA"}:
        background = Image.new("RGBA", image.size, (0, 0, 0, 255))
        image = Image.alpha_composite(background, image.convert("RGBA"))
    return ImageOps.grayscale(image)


def _maybe_invert_for_mnist(gray: Image.Image) -> Image.Image:
    arr = np.asarray(gray, dtype=np.float32) / 255.0
    border = np.concatenate(
        [arr[0, :], arr[-1, :], arr[:, 0], arr[:, -1]],
        axis=0,
    )
    if float(border.mean()) > 0.55:
        return ImageOps.invert(gray)
    return gray


def _preview_data_url(arr: np.ndarray) -> str:
    preview = Image.fromarray(np.uint8(np.clip(arr, 0.0, 1.0) * 255), mode="L")
    preview = preview.resize((140, 140), Image.Resampling.NEAREST)
    buffer = io.BytesIO()
    preview.save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def preprocess_digit_image(
    image_data_url: str,
    transforms: DigitTransforms | None = None,
) -> DigitPreprocessResult:
    started = time.perf_counter()
    transforms = transforms or DigitTransforms()

    image = _to_black_background_grayscale(decode_data_url(image_data_url))
    image = _maybe_invert_for_mnist(image)

    if transforms.rotation_degrees:
        image = image.rotate(
            transforms.rotation_degrees,
            resample=Image.Resampling.BICUBIC,
            expand=False,
            fillcolor=0,
        )

    image = image.resize((28, 28), Image.Resampling.LANCZOS)
    arr = np.asarray(image, dtype=np.float32) / 255.0

    if transforms.noise_level > 0:
        rng = np.random.default_rng(transforms.seed or 1337)
        noise = rng.normal(0.0, transforms.noise_level * 0.28, size=arr.shape)
        arr = np.clip(arr + noise, 0.0, 1.0)

    tensor = arr.astype(np.float32).reshape(1, 1, 28, 28)
    return DigitPreprocessResult(
        tensor=tensor,
        preview_data_url=_preview_data_url(arr),
        latency_ms=(time.perf_counter() - started) * 1000.0,
        transforms=transforms,
    )

