from __future__ import annotations

import zipfile
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
PACKAGE_ROOT = REPO_ROOT / "dist"
PACKAGE_PATH = PACKAGE_ROOT / "ai-playground-offline.zip"

INCLUDE = [
    "apps/api",
    "apps/web/public",
    "docs",
    "models",
    "packages/types",
    "scripts/download_all_models.py",
    "scripts/measure_latency.py",
    "README.md",
    "pytest.ini",
]

EXCLUDE_PARTS = {"__pycache__", ".pytest_cache", ".mypy_cache", ".ruff_cache"}
EXCLUDE_SUFFIXES = {".pyc", ".download"}


def should_include(path: Path) -> bool:
    if any(part in EXCLUDE_PARTS for part in path.parts):
        return False
    if path.suffix in EXCLUDE_SUFFIXES:
        return False
    return True


def main() -> int:
    PACKAGE_ROOT.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(PACKAGE_PATH, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for entry in INCLUDE:
            path = REPO_ROOT / entry
            if path.is_file() and should_include(path):
                archive.write(path, path.relative_to(REPO_ROOT))
            elif path.is_dir():
                for child in path.rglob("*"):
                    if child.is_file() and should_include(child):
                        archive.write(child, child.relative_to(REPO_ROOT))
    print(PACKAGE_PATH)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

