from __future__ import annotations

import os
import tempfile
from io import BytesIO
from pathlib import Path
from unittest import TestCase, mock

os.environ.setdefault("CHATGPT2API_AUTH_KEY", "test-auth-key")

from fastapi import FastAPI
from fastapi.testclient import TestClient
from PIL import Image

import api.content as content_module
from services.content_image_service import ContentImageService
from services.content_library_service import ContentLibraryService


class ContentLibraryApiTests(TestCase):
    def setUp(self):
        self.tmpdir = tempfile.TemporaryDirectory()
        database_path = Path(self.tmpdir.name) / "content.db"
        self.service = ContentLibraryService(lambda: f"sqlite:///{database_path.as_posix()}")
        self.service.initialize()
        self.service_patcher = mock.patch.object(content_module, "content_library_service", self.service)
        self.image_service = ContentImageService(Path(self.tmpdir.name) / "case-images")
        self.image_service_patcher = mock.patch.object(content_module, "content_image_service", self.image_service)
        self.admin_patcher = mock.patch.object(content_module, "require_admin", lambda authorization=None: {"role": "admin"})
        self.service_patcher.start()
        self.image_service_patcher.start()
        self.admin_patcher.start()
        self.addCleanup(self.service_patcher.stop)
        self.addCleanup(self.image_service_patcher.stop)
        self.addCleanup(self.admin_patcher.stop)
        self.addCleanup(self.tmpdir.cleanup)
        app = FastAPI()
        app.include_router(content_module.create_router())
        self.client = TestClient(app)

    def test_category_template_case_flow(self):
        category_payload = {
            "value": "Posters & Typography",
            "title": {"zh": "海报", "en": "Posters"},
            "description": {"zh": "测试", "en": "Test"},
            "cover": "/images/category-covers/poster.jpg",
            "anchor": "cat-poster",
            "templateAnchor": "tpl-poster",
            "sortOrder": 1,
        }
        create_category = self.client.post("/api/content/categories", json=category_payload)
        self.assertEqual(create_category.status_code, 200, create_category.text)

        template_payload = {
            "id": "tpl-poster",
            "title": {"zh": "海报模板", "en": "Poster Template"},
            "description": {"zh": "测试", "en": "Test"},
            "category": "Posters & Typography",
            "anchor": "tpl-poster",
            "cover": "/images/category-covers/poster.jpg",
            "styles": ["Poster"],
            "scenes": ["Commerce"],
            "tags": ["campaign"],
            "useWhen": {"zh": "用", "en": "Use"},
            "guidance": {"zh": ["A"], "en": ["B"]},
            "pitfalls": {"zh": ["C"], "en": ["D"]},
            "exampleCases": [1, 2],
            "prompt": "hello",
            "sortOrder": 1,
        }
        create_template = self.client.post("/api/content/templates", json=template_payload)
        self.assertEqual(create_template.status_code, 200, create_template.text)

        case_payload = {
            "id": 484,
            "title": "Example Case",
            "image": "/images/case484.jpg",
            "imageAlt": "Example Case",
            "sourceLabel": "X",
            "sourceUrl": "https://example.com",
            "prompt": "Full prompt",
            "promptPreview": "Preview",
            "category": "Posters & Typography",
            "styles": ["Poster"],
            "scenes": ["Commerce"],
            "featured": True,
            "usageCount": 2,
            "favoriteCount": 1,
            "githubUrl": "https://github.com/example",
            "status": "published",
        }
        create_case = self.client.post("/api/content/cases", json=case_payload)
        self.assertEqual(create_case.status_code, 200, create_case.text)

        public_cases = self.client.get("/api/v1/cases")
        self.assertEqual(public_cases.status_code, 200, public_cases.text)
        self.assertEqual(public_cases.json()["items"][0]["id"], 484)

        bump_usage = self.client.post("/api/v1/cases/484/use")
        self.assertEqual(bump_usage.status_code, 200, bump_usage.text)
        self.assertEqual(bump_usage.json()["usageCount"], 3)

        bump_favorite = self.client.delete("/api/v1/cases/484/favorite")
        self.assertEqual(bump_favorite.status_code, 200, bump_favorite.text)
        self.assertEqual(bump_favorite.json()["favoriteCount"], 0)

        search_templates = self.client.get("/api/content/templates?q=poster")
        self.assertEqual(search_templates.status_code, 200, search_templates.text)
        self.assertEqual(search_templates.json()["items"][0]["id"], "tpl-poster")

    def test_upload_content_image_saves_to_case_data_directory(self):
        buffer = BytesIO()
        Image.new("RGB", (2, 2), color=(255, 0, 0)).save(buffer, format="PNG")
        response = self.client.post(
            "/api/content/images",
            files={"file": ("sample.png", buffer.getvalue(), "image/png")},
        )
        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()["item"]
        self.assertTrue(payload["path"].startswith("/images/"))
        self.assertTrue((self.image_service.images_dir / payload["relativePath"]).is_file())


if __name__ == "__main__":
    import unittest

    unittest.main()
