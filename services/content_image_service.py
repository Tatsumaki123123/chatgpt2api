from __future__ import annotations

import hashlib
import io
import time
from pathlib import Path

from fastapi import HTTPException
from PIL import Image

from services.content_paths import CONTENT_LIBRARY_IMAGES_DIR
from services.config import config

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
FORMAT_EXTENSIONS = {
    "jpeg": ".jpeg",
    "jpg": ".jpg",
    "png": ".png",
    "webp": ".webp",
}


def _safe_extension(filename: str | None, image_format: str | None) -> str:
    suffix = Path(str(filename or "")).suffix.lower()
    if suffix in IMAGE_EXTENSIONS:
        return suffix
    return FORMAT_EXTENSIONS.get((image_format or "").lower(), ".png")


class ContentImageService:
    def __init__(self, images_dir: Path = CONTENT_LIBRARY_IMAGES_DIR):
        self.images_dir = images_dir

    def _make_relative_path(self, image_data: bytes, suffix: str) -> str:
        file_hash = hashlib.md5(image_data).hexdigest()
        filename = f"case_{time.time_ns()}_{file_hash}{suffix}"
        return filename

    def save(self, image_data: bytes, filename: str | None = None, base_url: str | None = None) -> dict[str, object]:
        try:
            with Image.open(io.BytesIO(image_data)) as image:
                image.load()
                suffix = _safe_extension(filename, image.format)
        except Exception as exc:
            raise HTTPException(status_code=422, detail={"error": "invalid image file"}) from exc

        rel = self._make_relative_path(image_data, suffix)
        path = self.images_dir / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(image_data)
        public_path = f"/images/{rel}"
        public_url = f"{(base_url or config.base_url).rstrip('/')}{public_path}"
        return {
            "path": public_path,
            "relativePath": rel,
            "url": public_url,
            "name": path.name,
            "size": len(image_data),
        }


content_image_service = ContentImageService()
