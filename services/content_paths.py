from __future__ import annotations

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
RUNTIME_DATA_DIR = BASE_DIR / "data"


def _resolve_dir(value: str, default: str) -> Path:
    path = Path(value or default)
    return path if path.is_absolute() else BASE_DIR / path


CONTENT_LIBRARY_SOURCE_DIR = _resolve_dir(os.getenv("CONTENT_LIBRARY_SOURCE_DIR", ""), "case-data")
CONTENT_LIBRARY_IMAGES_DIR = CONTENT_LIBRARY_SOURCE_DIR / "images"

