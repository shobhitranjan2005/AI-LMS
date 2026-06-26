from __future__ import annotations

import base64
import io
import math
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "apps" / "api"))

from PIL import Image, ImageDraw

from app.adapters.digit_adapter import get_digit_adapter
from app.adapters.sound_adapter import get_sound_adapter
from app.adapters.style_adapter import get_style_adapter
from app.adapters.text_adapter import get_text_adapter
from app.preprocessing.digit import preprocess_digit_image
from app.schemas.digit import DigitTransforms
from app.schemas.playgrounds import SoundPredictionRequest, StyleTransferRequest


def data_url(image: Image.Image) -> str:
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buffer.getvalue()).decode("ascii")


def digit_image() -> str:
    image = Image.new("L", (280, 280), 0)
    draw = ImageDraw.Draw(image)
    draw.line([(140, 34), (140, 236)], fill=255, width=38)
    draw.ellipse((96, 24, 184, 92), outline=255, width=30)
    return data_url(image)


def style_image() -> str:
    image = Image.new("RGB", (224, 224), (32, 76, 120))
    draw = ImageDraw.Draw(image)
    draw.rectangle((24, 24, 108, 168), fill=(230, 190, 88))
    draw.ellipse((104, 64, 196, 188), fill=(240, 116, 146))
    return data_url(image)


def tone() -> list[float]:
    return [math.sin(2 * math.pi * 440 * i / 16000) * 0.35 for i in range(16000)]


def main() -> int:
    digit = preprocess_digit_image(digit_image(), DigitTransforms()).tensor
    rows = []

    for model_id in ["mnist-12-float32", "mnist-12-int8"]:
        result = get_digit_adapter(model_id).predict(digit)
        rows.append((model_id, result.latency_ms))

    text_started = time.perf_counter()
    text_result = get_text_adapter().predict("This lesson is wonderful and bright.")
    rows.append(("distilbert-sst2-int8-onnx", text_result.latency_ms))
    rows.append(("distilbert-sst2-int8-total-warm", (time.perf_counter() - text_started) * 1000))

    sound_result = get_sound_adapter().predict(SoundPredictionRequest(samples=tone(), sample_rate=16000))
    rows.append(("yamnet-onnx", sound_result.latency_ms))

    style_result = get_style_adapter("mosaic-9").predict(StyleTransferRequest(image_data_url=style_image(), style_id="mosaic-9"))
    rows.append(("mosaic-9", style_result.latency_ms))

    for name, latency in rows:
        print(f"{name}: {latency:.2f} ms")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

