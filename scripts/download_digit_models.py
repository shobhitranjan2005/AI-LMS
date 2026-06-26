from __future__ import annotations

import hashlib
import json
import sys
import urllib.request
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
MODEL_DIR = REPO_ROOT / "models" / "digit"
MANIFEST_PATH = REPO_ROOT / "models" / "manifests" / "digit-models.json"

MODELS = {
    "mnist-12-float32": {
        "filename": "mnist-12.onnx",
        "source_url": "https://github.com/onnx/models/raw/main/validated/vision/classification/mnist/model/mnist-12.onnx",
        "precision": "float32",
    },
    "mnist-12-int8": {
        "filename": "mnist-12-int8.onnx",
        "source_url": "https://github.com/onnx/models/raw/main/validated/vision/classification/mnist/model/mnist-12-int8.onnx",
        "precision": "int8",
    },
}


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 64), b""):
            digest.update(chunk)
    return digest.hexdigest()


def download(url: str, destination: Path) -> None:
    request = urllib.request.Request(url, headers={"User-Agent": "ai-playground-setup/0.1"})
    temp_path = destination.with_suffix(destination.suffix + ".download")
    with urllib.request.urlopen(request, timeout=60) as response:  # noqa: S310 - fixed official URLs.
        temp_path.write_bytes(response.read())

    payload = temp_path.read_bytes()
    if payload.startswith(b"version https://git-lfs"):
        temp_path.unlink(missing_ok=True)
        raise RuntimeError(f"Downloaded a Git LFS pointer instead of an ONNX model from {url}")
    if len(payload) < 8_000:
        temp_path.unlink(missing_ok=True)
        raise RuntimeError(f"Downloaded model is unexpectedly small: {url}")

    temp_path.replace(destination)


def main() -> int:
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)

    manifest: dict[str, dict[str, object]] = {}
    for model_id, info in MODELS.items():
        destination = MODEL_DIR / str(info["filename"])
        if not destination.exists():
            print(f"Downloading {model_id} -> {destination}")
            download(str(info["source_url"]), destination)
        else:
            print(f"Using existing {destination}")

        manifest[model_id] = {
            **info,
            "local_path": str(destination.relative_to(REPO_ROOT)).replace("\\", "/"),
            "size_bytes": destination.stat().st_size,
            "sha256": sha256_file(destination),
            "license": "MIT",
            "source_project": "https://github.com/onnx/models/tree/main/validated/vision/classification/mnist",
        }

    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {MANIFEST_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

