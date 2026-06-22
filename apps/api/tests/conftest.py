from __future__ import annotations

import base64
import io
from pathlib import Path

import pytest
from PIL import Image, ImageDraw


REPO_ROOT = Path(__file__).resolve().parents[3]


@pytest.fixture()
def digit_data_url() -> str:
    image = Image.new("L", (280, 280), 0)
    draw = ImageDraw.Draw(image)
    draw.line([(140, 34), (140, 236)], fill=255, width=38)
    draw.ellipse((96, 24, 184, 92), outline=255, width=30)
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buffer.getvalue()).decode("ascii")


@pytest.fixture()
def repo_root() -> Path:
    return REPO_ROOT

