from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health_endpoint() -> None:
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_model_catalog_endpoint() -> None:
    response = client.get("/api/models/catalog")

    assert response.status_code == 200
    body = response.json()
    assert set(body["playgrounds"]) == {
        "digit-lab",
        "image-repair",
        "text-lab",
        "sound-lab",
        "style-studio",
        "model-battle",
    }
    model_ids = {model["id"] for model in body["models"]}
    assert {"mnist-12-float32", "mnist-12-int8"}.issubset(model_ids)


def test_predict_digit_endpoint_uses_local_model(digit_data_url: str) -> None:
    response = client.post(
        "/api/predict/digit",
        json={
            "image_data_url": digit_data_url,
            "model_id": "mnist-12-float32",
            "transforms": {"rotation_degrees": 0, "noise_level": 0, "stroke_width": 22, "seed": 7},
            "top_k": 3,
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["model_id"] == "mnist-12-float32"
    assert len(body["probabilities"]) == 10
    assert len(body["top_k"]) == 3
    assert body["preprocessed_preview"].startswith("data:image/png;base64,")
    assert 0 <= body["confidence"] <= 1


def test_battle_endpoint_compares_float32_and_int8(digit_data_url: str) -> None:
    response = client.post(
        "/api/battle/run",
        json={
            "image_data_url": digit_data_url,
            "transforms": {"rotation_degrees": 8, "noise_level": 0.1, "stroke_width": 22, "seed": 7},
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert {result["model_id"] for result in body["results"]} == {"mnist-12-float32", "mnist-12-int8"}
    assert body["latency_winner_model_id"] in {"mnist-12-float32", "mnist-12-int8"}
    assert body["confidence_delta"] >= 0
