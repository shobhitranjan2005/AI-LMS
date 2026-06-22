from __future__ import annotations

import base64
import io
import time
from functools import lru_cache

import numpy as np
import onnxruntime as ort
from PIL import Image, ImageEnhance

from app.adapters.base import ModelAdapter, cpu_session_options
from app.preprocessing.digit import decode_data_url
from app.schemas.playgrounds import StyleTransferRequest, StyleTransferResponse
from app.settings import get_settings


STYLE_NAMES = {
    "mosaic-9": "ONNX Fast Neural Style Mosaic",
    "candy-9": "ONNX Fast Neural Style Candy",
    "rain-princess-9": "ONNX Fast Neural Style Rain Princess",
}


def _image_data_url(image: Image.Image) -> str:
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buffer.getvalue()).decode("ascii")


class StyleTransferAdapter(ModelAdapter[StyleTransferRequest, StyleTransferResponse]):
    task = "neural-style-transfer"

    def __init__(self, style_id: str) -> None:
        if style_id not in STYLE_NAMES:
            raise ValueError(f"Unknown style model: {style_id}")
        self.id = style_id
        self.path = get_settings().style_model_root / f"{style_id}.onnx"
        if not self.path.exists():
            raise FileNotFoundError("Missing style model files. Run scripts/download_all_models.py.")
        self.session = ort.InferenceSession(
            str(self.path),
            sess_options=cpu_session_options(),
            providers=["CPUExecutionProvider"],
        )
        self.input_name = self.session.get_inputs()[0].name
        self.output_name = self.session.get_outputs()[0].name

    def predict(self, model_input: StyleTransferRequest) -> StyleTransferResponse:
        source = decode_data_url(model_input.image_data_url).convert("RGB")
        source = ImageEnhance.Brightness(source).enhance(model_input.brightness)
        source = ImageEnhance.Color(source).enhance(model_input.saturation)
        resized = source.resize((224, 224), Image.Resampling.LANCZOS)
        arr = np.asarray(resized, dtype=np.float32).transpose(2, 0, 1)[None, :, :, :]

        started = time.perf_counter()
        output = self.session.run([self.output_name], {self.input_name: arr})[0]
        latency_ms = (time.perf_counter() - started) * 1000.0

        stylized = np.asarray(output).reshape(3, 224, 224).transpose(1, 2, 0)
        stylized = np.clip(stylized, 0, 255).astype(np.uint8)
        stylized_image = Image.fromarray(stylized, mode="RGB")
        if model_input.intensity < 1:
            stylized_image = Image.blend(resized, stylized_image, model_input.intensity)

        return StyleTransferResponse(
            model_id=self.id,
            model_name=STYLE_NAMES[self.id],
            output_image_data_url=_image_data_url(stylized_image),
            latency_ms=latency_ms,
            model_size_bytes=self.path.stat().st_size,
            explanation="The image is resized to 224x224 RGB and transformed by a local ONNX fast neural style model.",
        )


@lru_cache(maxsize=3)
def get_style_adapter(style_id: str) -> StyleTransferAdapter:
    return StyleTransferAdapter(style_id)
