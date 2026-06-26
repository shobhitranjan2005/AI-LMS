from __future__ import annotations

import base64
import io
import math

from fastapi.testclient import TestClient
from PIL import Image, ImageDraw

from app.main import app


client = TestClient(app)


def _style_data_url() -> str:
    image = Image.new("RGB", (224, 224), (32, 76, 120))
    draw = ImageDraw.Draw(image)
    draw.rectangle((24, 24, 108, 168), fill=(230, 190, 88))
    draw.ellipse((104, 64, 196, 188), fill=(240, 116, 146))
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buffer.getvalue()).decode("ascii")


def _tone(freq: float = 440.0, sample_rate: int = 16000, seconds: float = 1.0) -> list[float]:
    return [math.sin(2 * math.pi * freq * i / sample_rate) * 0.35 for i in range(int(sample_rate * seconds))]


def test_text_prediction_uses_local_classifier() -> None:
    response = client.post("/api/predict/text", json={"text": "I loved this bright and wonderful lesson."})

    assert response.status_code == 200
    body = response.json()
    assert body["model_id"] == "distilbert-sst2-int8-onnx"
    assert body["prediction"] in {"Positive", "Negative"}
    assert len(body["probabilities"]) == 2
    assert body["latency_ms"] >= 0


def test_sound_prediction_uses_yamnet() -> None:
    response = client.post(
        "/api/predict/sound",
        json={"samples": _tone(), "sample_rate": 16000, "gain": 1, "noise_level": 0},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["model_id"] == "yamnet-onnx"
    assert len(body["top_k"]) == 5
    assert body["latency_ms"] >= 0


def test_style_transfer_uses_local_onnx_model() -> None:
    response = client.post(
        "/api/transform/style",
        json={"image_data_url": _style_data_url(), "style_id": "mosaic-9", "intensity": 0.4},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["model_id"] == "mosaic-9"
    assert body["output_image_data_url"].startswith("data:image/png;base64,")
    assert body["latency_ms"] >= 0


def test_image_repair_reports_verified_checkpoint_blocker() -> None:
    response = client.post(
        "/api/repair/image",
        json={"image_data_url": _style_data_url(), "damage": "noise", "strength": 0.4},
    )

    assert response.status_code == 424
    body = response.json()
    assert body["status"] == "blocked"
    assert "licence" in body["reason"].lower()


def test_cross_lab_battle_endpoints() -> None:
    text = client.post(
        "/api/battle/text",
        json={"original_text": "This is amazing.", "edited_text": "This is terrible."},
    )
    sound = client.post("/api/battle/sound", json={"samples": _tone(), "sample_rate": 16000})
    style = client.post(
        "/api/battle/style",
        json={"image_data_url": _style_data_url(), "first_style_id": "mosaic-9", "second_style_id": "candy-9"},
    )

    assert text.status_code == 200
    assert sound.status_code == 200
    assert style.status_code == 200
    assert len(text.json()["results"]) == 2
    assert len(sound.json()["results"]) == 2
    assert len(style.json()["results"]) == 2
