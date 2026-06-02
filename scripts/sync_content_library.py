from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

os.environ.setdefault("CHATGPT2API_AUTH_KEY", "sync-content-library")

from services.content_library_service import content_library_service  # noqa: E402


def main() -> int:
    result = content_library_service.seed_from_data_dir(force=True)
    print("Content library synced from data/")
    print(result)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

