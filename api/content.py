from __future__ import annotations

import os
from typing import Any

from fastapi import APIRouter, Header, HTTPException, Query, Request
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, ConfigDict

from api.support import extract_bearer_token, require_admin
from services.content_library_service import content_library_service


class ContentPayload(BaseModel):
    model_config = ConfigDict(extra="allow")


def _public_keys() -> set[str]:
    raw = os.getenv("PUBLIC_API_KEYS") or os.getenv("PUBLIC_API_KEY") or ""
    return {item.strip() for item in raw.split(",") if item.strip()}


def _public_api_requires_key() -> bool:
    return str(os.getenv("PUBLIC_API_REQUIRE_KEY") or "").strip().lower() in {"1", "true", "yes", "on"}


def _require_public_api_key(x_api_key: str | None, authorization: str | None) -> None:
    if not _public_api_requires_key():
        return
    keys = _public_keys()
    token = (x_api_key or "").strip() or extract_bearer_token(authorization)
    if not keys or token not in keys:
        raise HTTPException(status_code=401, detail={"error": "public api key is required"})


def _case_id(value: str) -> int:
    try:
        case_id = int(value)
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=400, detail={"error": "case id must be an integer"}) from exc
    if case_id <= 0:
        raise HTTPException(status_code=400, detail={"error": "case id must be positive"})
    return case_id


def _amount(query_amount: int | None, body: dict[str, Any] | None) -> int:
    raw = query_amount if query_amount is not None else (body or {}).get("amount", 1)
    try:
        return min(100, max(1, int(raw)))
    except (TypeError, ValueError):
        return 1


def _filters(request: Request) -> dict[str, Any]:
    return dict(request.query_params)


def create_router() -> APIRouter:
    router = APIRouter()

    @router.get("/api/content/overview")
    async def admin_overview(authorization: str | None = Header(default=None)):
        require_admin(authorization)
        return await run_in_threadpool(content_library_service.overview)

    @router.get("/api/content/categories")
    async def admin_categories(authorization: str | None = Header(default=None)):
        require_admin(authorization)
        return {"items": await run_in_threadpool(content_library_service.list_categories)}

    @router.post("/api/content/categories")
    async def create_category(body: ContentPayload, authorization: str | None = Header(default=None)):
        require_admin(authorization)
        try:
            item = await run_in_threadpool(content_library_service.save_category, body.model_dump(mode="python"))
        except ValueError as exc:
            raise HTTPException(status_code=400, detail={"error": str(exc)}) from exc
        return {"item": item, "items": await run_in_threadpool(content_library_service.list_categories)}

    @router.put("/api/content/categories/{value}")
    async def update_category(value: str, body: ContentPayload, authorization: str | None = Header(default=None)):
        require_admin(authorization)
        try:
            item = await run_in_threadpool(content_library_service.save_category, body.model_dump(mode="python"), value=value)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail={"error": str(exc)}) from exc
        return {"item": item, "items": await run_in_threadpool(content_library_service.list_categories)}

    @router.delete("/api/content/categories/{value}")
    async def delete_category(value: str, authorization: str | None = Header(default=None)):
        require_admin(authorization)
        ok = await run_in_threadpool(content_library_service.delete_category, value)
        if not ok:
            raise HTTPException(status_code=404, detail={"error": "category not found"})
        return {"items": await run_in_threadpool(content_library_service.list_categories)}

    @router.get("/api/content/templates")
    async def admin_templates(
        q: str = "",
        category: str = "",
        authorization: str | None = Header(default=None),
    ):
        require_admin(authorization)
        return {"items": await run_in_threadpool(content_library_service.list_templates, q=q.strip(), category=category.strip())}

    @router.post("/api/content/templates")
    async def create_template(body: ContentPayload, authorization: str | None = Header(default=None)):
        require_admin(authorization)
        try:
            item = await run_in_threadpool(content_library_service.save_template, body.model_dump(mode="python"))
        except ValueError as exc:
            raise HTTPException(status_code=400, detail={"error": str(exc)}) from exc
        return {"item": item}

    @router.put("/api/content/templates/{template_id}")
    async def update_template(template_id: str, body: ContentPayload, authorization: str | None = Header(default=None)):
        require_admin(authorization)
        try:
            item = await run_in_threadpool(content_library_service.save_template, body.model_dump(mode="python"), template_id=template_id)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail={"error": str(exc)}) from exc
        return {"item": item}

    @router.delete("/api/content/templates/{template_id}")
    async def delete_template(template_id: str, authorization: str | None = Header(default=None)):
        require_admin(authorization)
        ok = await run_in_threadpool(content_library_service.delete_template, template_id)
        if not ok:
            raise HTTPException(status_code=404, detail={"error": "template not found"})
        return {"ok": True}

    @router.get("/api/content/cases")
    async def admin_cases(request: Request, authorization: str | None = Header(default=None)):
        require_admin(authorization)
        return await run_in_threadpool(content_library_service.list_cases, _filters(request), public_only=False)

    @router.post("/api/content/cases")
    async def create_case(body: ContentPayload, authorization: str | None = Header(default=None)):
        require_admin(authorization)
        try:
            item = await run_in_threadpool(content_library_service.save_case, body.model_dump(mode="python"))
        except ValueError as exc:
            raise HTTPException(status_code=400, detail={"error": str(exc)}) from exc
        return {"item": item}

    @router.put("/api/content/cases/{case_id}")
    async def update_case(case_id: str, body: ContentPayload, authorization: str | None = Header(default=None)):
        require_admin(authorization)
        try:
            item = await run_in_threadpool(content_library_service.save_case, body.model_dump(mode="python"), case_id=_case_id(case_id))
        except ValueError as exc:
            raise HTTPException(status_code=400, detail={"error": str(exc)}) from exc
        return {"item": item}

    @router.delete("/api/content/cases/{case_id}")
    async def delete_case(case_id: str, authorization: str | None = Header(default=None)):
        require_admin(authorization)
        ok = await run_in_threadpool(content_library_service.delete_case, _case_id(case_id))
        if not ok:
            raise HTTPException(status_code=404, detail={"error": "case not found"})
        return {"ok": True}

    @router.get("/api/v1/categories")
    async def public_categories(x_api_key: str | None = Header(default=None), authorization: str | None = Header(default=None)):
        _require_public_api_key(x_api_key, authorization)
        return await run_in_threadpool(content_library_service.list_categories)

    @router.get("/api/v1/templates")
    async def public_templates(
        q: str = "",
        search: str = "",
        category: str = "",
        x_api_key: str | None = Header(default=None),
        authorization: str | None = Header(default=None),
    ):
        _require_public_api_key(x_api_key, authorization)
        return await run_in_threadpool(content_library_service.list_templates, q=(q or search).strip(), category=category.strip())

    @router.get("/api/v1/templates/{template_id}")
    async def public_template(template_id: str, x_api_key: str | None = Header(default=None), authorization: str | None = Header(default=None)):
        _require_public_api_key(x_api_key, authorization)
        item = await run_in_threadpool(content_library_service.get_template, template_id)
        if item is None:
            raise HTTPException(status_code=404, detail={"error": "template not found"})
        return item

    @router.get("/api/v1/cases")
    async def public_cases(request: Request, x_api_key: str | None = Header(default=None), authorization: str | None = Header(default=None)):
        _require_public_api_key(x_api_key, authorization)
        return await run_in_threadpool(content_library_service.list_cases, _filters(request), public_only=True)

    @router.get("/api/v1/search")
    async def public_search(request: Request, x_api_key: str | None = Header(default=None), authorization: str | None = Header(default=None)):
        _require_public_api_key(x_api_key, authorization)
        return await run_in_threadpool(content_library_service.list_cases, _filters(request), public_only=True)

    @router.get("/api/v1/cases/{case_id}")
    async def public_case(case_id: str, x_api_key: str | None = Header(default=None), authorization: str | None = Header(default=None)):
        _require_public_api_key(x_api_key, authorization)
        item = await run_in_threadpool(content_library_service.get_case, _case_id(case_id), public_only=True)
        if item is None:
            raise HTTPException(status_code=404, detail={"error": "case not found"})
        return item

    @router.get("/api/v1/cases/{case_id}/stats")
    async def public_case_stats(case_id: str, x_api_key: str | None = Header(default=None), authorization: str | None = Header(default=None)):
        _require_public_api_key(x_api_key, authorization)
        item = await run_in_threadpool(content_library_service.case_stats, _case_id(case_id))
        if item is None:
            raise HTTPException(status_code=404, detail={"error": "case not found"})
        return item

    @router.post("/api/v1/cases/{case_id}/use")
    async def public_case_use(
        case_id: str,
        body: dict[str, Any] | None = None,
        amount: int | None = Query(default=None),
        x_api_key: str | None = Header(default=None),
        authorization: str | None = Header(default=None),
    ):
        _require_public_api_key(x_api_key, authorization)
        item = await run_in_threadpool(content_library_service.bump_case_counter, _case_id(case_id), "usage_count", _amount(amount, body))
        if item is None:
            raise HTTPException(status_code=404, detail={"error": "case not found"})
        return item

    @router.post("/api/v1/cases/{case_id}/favorite")
    async def public_case_favorite(
        case_id: str,
        body: dict[str, Any] | None = None,
        amount: int | None = Query(default=None),
        x_api_key: str | None = Header(default=None),
        authorization: str | None = Header(default=None),
    ):
        _require_public_api_key(x_api_key, authorization)
        item = await run_in_threadpool(content_library_service.bump_case_counter, _case_id(case_id), "favorite_count", _amount(amount, body))
        if item is None:
            raise HTTPException(status_code=404, detail={"error": "case not found"})
        return item

    @router.delete("/api/v1/cases/{case_id}/favorite")
    async def public_case_unfavorite(
        case_id: str,
        amount: int | None = Query(default=None),
        x_api_key: str | None = Header(default=None),
        authorization: str | None = Header(default=None),
    ):
        _require_public_api_key(x_api_key, authorization)
        item = await run_in_threadpool(content_library_service.bump_case_counter, _case_id(case_id), "favorite_count", -_amount(amount, None))
        if item is None:
            raise HTTPException(status_code=404, detail={"error": "case not found"})
        return item

    @router.get("/api/v1/style-library")
    async def public_style_library(x_api_key: str | None = Header(default=None), authorization: str | None = Header(default=None)):
        _require_public_api_key(x_api_key, authorization)
        tags = await run_in_threadpool(content_library_service.list_style_tags)
        return {
            "categories": await run_in_threadpool(content_library_service.list_categories),
            "styles": [item for item in tags if item["kind"] == "style"],
            "scenes": [item for item in tags if item["kind"] == "scene"],
            "templates": await run_in_threadpool(content_library_service.list_templates),
        }

    @router.get("/api/v1/site-data")
    async def public_site_data(request: Request, x_api_key: str | None = Header(default=None), authorization: str | None = Header(default=None)):
        _require_public_api_key(x_api_key, authorization)
        filters = _filters(request)
        filters.setdefault("pageSize", "100")
        return {
            "categories": await run_in_threadpool(content_library_service.list_categories),
            "cases": await run_in_threadpool(content_library_service.list_cases, filters, public_only=True),
        }

    return router
