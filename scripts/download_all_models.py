from __future__ import annotations

import csv
import hashlib
import json
import urllib.request
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
MANIFEST_ROOT = REPO_ROOT / "models" / "manifests"

MODEL_GROUPS = {
    "digit": {
        "mnist-12-float32": {
            "filename": "mnist-12.onnx",
            "source_url": "https://github.com/onnx/models/raw/main/validated/vision/classification/mnist/model/mnist-12.onnx",
            "license": "MIT",
            "precision": "float32",
        },
        "mnist-12-int8": {
            "filename": "mnist-12-int8.onnx",
            "source_url": "https://github.com/onnx/models/raw/main/validated/vision/classification/mnist/model/mnist-12-int8.onnx",
            "license": "MIT",
            "precision": "int8",
        },
    },
    "text": {
        "distilbert-sst2-int8-onnx": {
            "filename": "model_quantized.onnx",
            "source_url": "https://huggingface.co/fxmarty/distilbert-base-uncased-sst2-onnx-int8-for-tensorrt/resolve/main/model_quantized.onnx",
            "license": "MIT",
            "task": "sentiment-classification",
            "precision": "int8",
        },
        "distilbert-sst2-vocab": {
            "filename": "vocab.txt",
            "source_url": "https://huggingface.co/fxmarty/distilbert-base-uncased-sst2-onnx-int8-for-tensorrt/resolve/main/vocab.txt",
            "license": "MIT",
            "task": "tokenizer",
        },
        "distilbert-sst2-config": {
            "filename": "config.json",
            "source_url": "https://huggingface.co/fxmarty/distilbert-base-uncased-sst2-onnx-int8-for-tensorrt/resolve/main/config.json",
            "license": "MIT",
            "task": "metadata",
        },
    },
    "sound": {
        "yamnet-onnx": {
            "filename": "yamnet.onnx",
            "source_url": "https://huggingface.co/zeropointnine/yamnet-onnx/resolve/main/yamnet.onnx",
            "license": "Apache-2.0",
            "task": "audio-classification",
        },
        "yamnet-labels": {
            "filename": "yamnet_class_map.csv",
            "source_url": "https://huggingface.co/zeropointnine/yamnet-onnx/resolve/main/yamnet_class_map.csv",
            "license": "Apache-2.0",
            "task": "labels",
        },
    },
    "style": {
        "mosaic-9": {
            "filename": "mosaic-9.onnx",
            "source_url": "https://github.com/onnx/models/raw/main/validated/vision/style_transfer/fast_neural_style/model/mosaic-9.onnx",
            "license": "BSD-3-Clause",
            "task": "neural-style-transfer",
        },
        "candy-9": {
            "filename": "candy-9.onnx",
            "source_url": "https://github.com/onnx/models/raw/main/validated/vision/style_transfer/fast_neural_style/model/candy-9.onnx",
            "license": "BSD-3-Clause",
            "task": "neural-style-transfer",
        },
        "rain-princess-9": {
            "filename": "rain-princess-9.onnx",
            "source_url": "https://github.com/onnx/models/raw/main/validated/vision/style_transfer/fast_neural_style/model/rain-princess-9.onnx",
            "license": "BSD-3-Clause",
            "task": "neural-style-transfer",
        },
    },
}

BLOCKED_MODELS = {
    "image_repair": {
        "mnist-autoencoder": {
            "status": "blocked",
            "reason": (
                "The researched pretrained MNIST autoencoder checkpoints on Hugging Face expose no compatible "
                "licence metadata. The app does not package unlicensed weights."
            ),
            "researched_candidates": [
                "Ab0/autoencoder-keras-mnist-demo",
                "nateraw/autoencoder-keras-mnist-demo-with-card",
            ],
        }
    }
}


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 64), b""):
            digest.update(chunk)
    return digest.hexdigest()


def download(url: str, destination: Path) -> None:
    request = urllib.request.Request(url, headers={"User-Agent": "ai-playground-setup/0.2"})
    temp_path = destination.with_suffix(destination.suffix + ".download")
    with urllib.request.urlopen(request, timeout=180) as response:  # noqa: S310 - fixed verified URLs.
        temp_path.write_bytes(response.read())

    payload = temp_path.read_bytes()
    if payload.startswith(b"version https://git-lfs"):
        temp_path.unlink(missing_ok=True)
        raise RuntimeError(f"Downloaded a Git LFS pointer instead of a model from {url}")
    if destination.suffix == ".onnx" and len(payload) < 8_000:
        temp_path.unlink(missing_ok=True)
        raise RuntimeError(f"Downloaded ONNX model is unexpectedly small: {url}")

    temp_path.replace(destination)


def write_sound_label_json(sound_dir: Path) -> None:
    csv_path = sound_dir / "yamnet_class_map.csv"
    json_path = sound_dir / "yamnet_class_map.json"
    if not csv_path.exists():
        return

    rows = []
    with csv_path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            rows.append(row)
    json_path.write_text(json.dumps(rows, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    MANIFEST_ROOT.mkdir(parents=True, exist_ok=True)
    all_manifest: dict[str, object] = {"blocked": BLOCKED_MODELS}

    for group, models in MODEL_GROUPS.items():
        model_dir = REPO_ROOT / "models" / group
        model_dir.mkdir(parents=True, exist_ok=True)
        manifest_path = MANIFEST_ROOT / f"{group}-models.json"
        previous_manifest = {}
        if manifest_path.exists():
            previous_manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        manifest: dict[str, dict[str, object]] = {}

        for model_id, info in models.items():
            destination = model_dir / str(info["filename"])
            previous_entry = previous_manifest.get(model_id, {})
            source_changed = previous_entry.get("source_url") and previous_entry.get("source_url") != info["source_url"]
            if not destination.exists() or source_changed:
                print(f"Downloading {group}/{model_id} -> {destination}")
                download(str(info["source_url"]), destination)
            else:
                print(f"Using existing {destination}")

            manifest[model_id] = {
                **info,
                "local_path": str(destination.relative_to(REPO_ROOT)).replace("\\", "/"),
                "size_bytes": destination.stat().st_size,
                "sha256": sha256_file(destination),
            }

        if group == "sound":
            write_sound_label_json(model_dir)

        manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
        all_manifest[group] = manifest

    (MANIFEST_ROOT / "all-models.json").write_text(json.dumps(all_manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote manifests under {MANIFEST_ROOT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
