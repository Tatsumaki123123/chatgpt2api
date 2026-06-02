from __future__ import annotations

from datetime import datetime
import json
import os
from typing import Any

from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text, UniqueConstraint, create_engine
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.types import JSON

from services.content_paths import CONTENT_LIBRARY_SOURCE_DIR, RUNTIME_DATA_DIR

ContentBase = declarative_base()
JSON_FIELD = JSON().with_variant(JSONB(), "postgresql")


def _now() -> datetime:
    return datetime.utcnow()


class CategoryModel(ContentBase):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, autoincrement=True)
    value = Column(String(255), unique=True, nullable=False, index=True)
    title = Column(JSON_FIELD, nullable=False, default=dict)
    description = Column(JSON_FIELD, nullable=False, default=dict)
    cover = Column(Text, nullable=False, default="")
    anchor = Column(String(255), nullable=False, default="")
    template_anchor = Column(String(255), nullable=False, default="")
    sort_order = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, nullable=False, default=_now)
    updated_at = Column(DateTime, nullable=False, default=_now, onupdate=_now)


class StyleTagModel(ContentBase):
    __tablename__ = "style_tags"
    __table_args__ = (UniqueConstraint("kind", "value", name="uq_style_tags_kind_value"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    kind = Column(String(32), nullable=False, index=True)
    value = Column(String(255), nullable=False, index=True)
    title = Column(JSON_FIELD, nullable=False, default=dict)
    keywords = Column(JSON_FIELD, nullable=False, default=list)
    sort_order = Column(Integer, nullable=False, default=0)


class TemplateModel(ContentBase):
    __tablename__ = "templates"

    id = Column(String(255), primary_key=True)
    title = Column(JSON_FIELD, nullable=False, default=dict)
    description = Column(JSON_FIELD, nullable=False, default=dict)
    category = Column(String(255), nullable=False, default="", index=True)
    anchor = Column(String(255), nullable=False, default="")
    cover = Column(Text, nullable=False, default="")
    styles = Column(JSON_FIELD, nullable=False, default=list)
    scenes = Column(JSON_FIELD, nullable=False, default=list)
    tags = Column(JSON_FIELD, nullable=False, default=list)
    use_when = Column(JSON_FIELD, nullable=False, default=dict)
    guidance = Column(JSON_FIELD, nullable=False, default=dict)
    pitfalls = Column(JSON_FIELD, nullable=False, default=dict)
    example_cases = Column(JSON_FIELD, nullable=False, default=list)
    prompt = Column(Text, nullable=False, default="")
    sort_order = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, nullable=False, default=_now)
    updated_at = Column(DateTime, nullable=False, default=_now, onupdate=_now)


class CaseModel(ContentBase):
    __tablename__ = "cases"

    id = Column(Integer, primary_key=True)
    title = Column(Text, nullable=False, default="")
    image = Column(Text, nullable=False, default="")
    image_alt = Column(Text, nullable=False, default="")
    source_label = Column(Text, nullable=False, default="")
    source_url = Column(Text, nullable=False, default="")
    prompt = Column(Text, nullable=False, default="")
    prompt_preview = Column(Text, nullable=False, default="")
    category = Column(String(255), nullable=False, default="", index=True)
    styles = Column(JSON_FIELD, nullable=False, default=list)
    scenes = Column(JSON_FIELD, nullable=False, default=list)
    featured = Column(Boolean, nullable=False, default=False, index=True)
    usage_count = Column(Integer, nullable=False, default=0)
    favorite_count = Column(Integer, nullable=False, default=0)
    github_url = Column(Text, nullable=False, default="")
    status = Column(String(32), nullable=False, default="published", index=True)
    created_at = Column(DateTime, nullable=False, default=_now)
    updated_at = Column(DateTime, nullable=False, default=_now, onupdate=_now)


def _database_url() -> str:
    value = os.getenv("CONTENT_DATABASE_URL") or os.getenv("DATABASE_URL") or ""
    value = value.strip()
    if value.startswith("postgres://"):
        return "postgresql://" + value.removeprefix("postgres://")
    if value:
        return value
    return f"sqlite:///{(RUNTIME_DATA_DIR / 'content_library.db').as_posix()}"


def _as_dict(value: object) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _as_list(value: object) -> list[Any]:
    return value if isinstance(value, list) else []


def _clean(value: object, default: str = "") -> str:
    return str(value if value is not None else default).strip()


def _int(value: object, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _bool(value: object, default: bool = False) -> bool:
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "on"}
    if value is None:
        return default
    return bool(value)


def _dt(value: datetime | None) -> str | None:
    return value.replace(microsecond=0).isoformat() + "Z" if value else None


def _match_text(item: dict[str, Any], q: str) -> bool:
    if not q:
        return True
    needle = q.lower()
    haystack: list[str] = []
    for key in ("id", "title", "prompt", "promptPreview", "sourceLabel", "category"):
        value = item.get(key)
        if isinstance(value, dict):
            haystack.extend(str(part) for part in value.values())
        elif isinstance(value, list):
            haystack.extend(str(part) for part in value)
        else:
            haystack.append(str(value or ""))
    return needle in " ".join(haystack).lower()


class ContentLibraryService:
    def __init__(self, database_url_getter=_database_url):
        self.database_url_getter = database_url_getter
        self._engine = None
        self._session_factory = None

    def initialize(self) -> None:
        session_factory = self._get_session_factory()
        ContentBase.metadata.create_all(self._engine)
        with session_factory() as session:
            has_content = (
                session.query(CategoryModel).count()
                or session.query(TemplateModel).count()
                or session.query(CaseModel).count()
            )
        seed_mode = os.getenv("CONTENT_LIBRARY_SEED", "auto").strip().lower()
        if seed_mode in {"0", "false", "no", "skip"}:
            return
        if seed_mode == "force" or not has_content:
            self.seed_from_data_dir(force=seed_mode == "force")

    def _get_session_factory(self):
        if self._session_factory is None:
            self._engine = create_engine(
                self.database_url_getter(),
                pool_pre_ping=True,
                pool_recycle=3600,
            )
            self._session_factory = sessionmaker(bind=self._engine)
        return self._session_factory

    def seed_from_data_dir(self, *, force: bool = False) -> dict[str, int]:
        style_data = self._read_json(CONTENT_LIBRARY_SOURCE_DIR / "style-library.json")
        case_data = self._read_json(CONTENT_LIBRARY_SOURCE_DIR / "cases.json")
        categories = _as_list(style_data.get("categories"))
        templates = _as_list(style_data.get("templates"))
        styles = _as_list(style_data.get("styles"))
        scenes = _as_list(style_data.get("scenes"))
        cases = _as_list(case_data.get("cases"))
        with self._get_session_factory()() as session:
            if force:
                session.query(CaseModel).delete()
                session.query(TemplateModel).delete()
                session.query(StyleTagModel).delete()
                session.query(CategoryModel).delete()
            for index, item in enumerate(categories):
                if isinstance(item, dict):
                    self._upsert_category_locked(session, item, sort_order=index)
            for index, item in enumerate(styles):
                if isinstance(item, dict):
                    self._upsert_tag_locked(session, item, kind="style", sort_order=index)
            for index, item in enumerate(scenes):
                if isinstance(item, dict):
                    self._upsert_tag_locked(session, item, kind="scene", sort_order=index)
            for index, item in enumerate(templates):
                if isinstance(item, dict):
                    self._upsert_template_locked(session, item, sort_order=index)
            for item in cases:
                if isinstance(item, dict):
                    self._upsert_case_locked(session, item)
            session.commit()
        return {
            "categories": len(categories),
            "templates": len(templates),
            "style_tags": len(styles) + len(scenes),
            "cases": len(cases),
        }

    @staticmethod
    def _read_json(path: Path) -> dict[str, Any]:
        if not path.exists():
            return {}
        data = json.loads(path.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}

    def list_categories(self) -> list[dict[str, Any]]:
        with self._get_session_factory()() as session:
            rows = session.query(CategoryModel).order_by(CategoryModel.sort_order.asc(), CategoryModel.id.asc()).all()
            return [self._category(row) for row in rows]

    def save_category(self, payload: dict[str, Any], *, value: str | None = None) -> dict[str, Any]:
        with self._get_session_factory()() as session:
            item = dict(payload or {})
            if value is not None:
                item["value"] = value
            row = self._upsert_category_locked(session, item)
            session.commit()
            session.refresh(row)
            return self._category(row)

    def delete_category(self, value: str) -> bool:
        with self._get_session_factory()() as session:
            row = session.query(CategoryModel).filter(CategoryModel.value == value).first()
            if row is None:
                return False
            session.delete(row)
            session.commit()
            return True

    def list_templates(self, *, q: str = "", category: str = "") -> list[dict[str, Any]]:
        with self._get_session_factory()() as session:
            query = session.query(TemplateModel)
            if category:
                query = query.filter(TemplateModel.category == category)
            rows = query.order_by(TemplateModel.sort_order.asc(), TemplateModel.id.asc()).all()
            items = [self._template(row) for row in rows]
        return [item for item in items if _match_text(item, q)]

    def list_style_tags(self, *, kind: str = "") -> list[dict[str, Any]]:
        with self._get_session_factory()() as session:
            query = session.query(StyleTagModel)
            if kind:
                query = query.filter(StyleTagModel.kind == kind)
            rows = query.order_by(StyleTagModel.sort_order.asc(), StyleTagModel.value.asc()).all()
            return [
                {
                    "kind": row.kind,
                    "value": row.value,
                    "title": row.title or {},
                    "keywords": row.keywords or [],
                    "sortOrder": row.sort_order or 0,
                }
                for row in rows
            ]

    def get_template(self, template_id: str) -> dict[str, Any] | None:
        with self._get_session_factory()() as session:
            row = session.query(TemplateModel).filter(TemplateModel.id == template_id).first()
            return self._template(row) if row else None

    def save_template(self, payload: dict[str, Any], *, template_id: str | None = None) -> dict[str, Any]:
        with self._get_session_factory()() as session:
            item = dict(payload or {})
            if template_id is not None:
                item["id"] = template_id
            row = self._upsert_template_locked(session, item)
            session.commit()
            session.refresh(row)
            return self._template(row)

    def delete_template(self, template_id: str) -> bool:
        with self._get_session_factory()() as session:
            row = session.query(TemplateModel).filter(TemplateModel.id == template_id).first()
            if row is None:
                return False
            session.delete(row)
            session.commit()
            return True

    def list_cases(self, filters: dict[str, Any], *, public_only: bool = False) -> dict[str, Any]:
        page = max(1, _int(filters.get("page"), 1))
        page_size = min(5000, max(1, _int(filters.get("pageSize") or filters.get("page_size"), 24)))
        with self._get_session_factory()() as session:
            rows = session.query(CaseModel).all()
            items = [self._case(row) for row in rows]

        if public_only:
            items = [item for item in items if item["status"] == "published"]
        elif filters.get("status"):
            items = [item for item in items if item["status"] == _clean(filters.get("status"))]
        if filters.get("category"):
            items = [item for item in items if item["category"] == _clean(filters.get("category"))]
        if filters.get("style"):
            style = _clean(filters.get("style"))
            items = [item for item in items if style in item["styles"]]
        if filters.get("scene"):
            scene = _clean(filters.get("scene"))
            items = [item for item in items if scene in item["scenes"]]
        if _clean(filters.get("featured")).lower() == "true":
            items = [item for item in items if item["featured"]]
        q = _clean(filters.get("q") or filters.get("search"))
        items = [item for item in items if _match_text(item, q)]

        self._sort_cases(items, sort=_clean(filters.get("sort"), "latest"), order=_clean(filters.get("order"), "desc"))
        total = len(items)
        start = (page - 1) * page_size
        return {"items": items[start:start + page_size], "total": total, "page": page, "pageSize": page_size}

    def get_case(self, case_id: int, *, public_only: bool = False) -> dict[str, Any] | None:
        with self._get_session_factory()() as session:
            row = session.query(CaseModel).filter(CaseModel.id == case_id).first()
            if row is None or (public_only and row.status != "published"):
                return None
            return self._case(row)

    def save_case(self, payload: dict[str, Any], *, case_id: int | None = None) -> dict[str, Any]:
        with self._get_session_factory()() as session:
            item = dict(payload or {})
            if case_id is not None:
                item["id"] = case_id
            row = self._upsert_case_locked(session, item)
            session.commit()
            session.refresh(row)
            return self._case(row)

    def delete_case(self, case_id: int) -> bool:
        with self._get_session_factory()() as session:
            row = session.query(CaseModel).filter(CaseModel.id == case_id).first()
            if row is None:
                return False
            session.delete(row)
            session.commit()
            return True

    def case_stats(self, case_id: int) -> dict[str, int] | None:
        item = self.get_case(case_id, public_only=True)
        if item is None:
            return None
        return {"id": item["id"], "usageCount": item["usageCount"], "favoriteCount": item["favoriteCount"]}

    def bump_case_counter(self, case_id: int, field: str, amount: int) -> dict[str, int] | None:
        if amount == 0:
            amount = 1
        amount = max(-100, min(100, amount))
        with self._get_session_factory()() as session:
            row = session.query(CaseModel).filter(CaseModel.id == case_id, CaseModel.status == "published").first()
            if row is None:
                return None
            current = _int(getattr(row, field))
            setattr(row, field, max(0, current + amount))
            row.updated_at = _now()
            session.commit()
            return {"id": row.id, "usageCount": row.usage_count, "favoriteCount": row.favorite_count}

    def overview(self) -> dict[str, int]:
        with self._get_session_factory()() as session:
            return {
                "categories": session.query(CategoryModel).count(),
                "templates": session.query(TemplateModel).count(),
                "cases": session.query(CaseModel).count(),
                "publishedCases": session.query(CaseModel).filter(CaseModel.status == "published").count(),
                "styleTags": session.query(StyleTagModel).count(),
            }

    @staticmethod
    def _sort_cases(items: list[dict[str, Any]], *, sort: str, order: str) -> None:
        reverse = order != "asc"
        if sort == "oldest":
            items.sort(key=lambda item: item["id"])
            return
        if sort == "id":
            items.sort(key=lambda item: item["id"], reverse=reverse)
            return
        if sort == "usage":
            items.sort(key=lambda item: item["usageCount"], reverse=reverse)
            return
        if sort == "favorites":
            items.sort(key=lambda item: item["favoriteCount"], reverse=reverse)
            return
        if sort == "popular":
            items.sort(key=lambda item: item["usageCount"] * 2 + item["favoriteCount"], reverse=reverse)
            return
        items.sort(key=lambda item: item["id"], reverse=True)

    def _upsert_category_locked(self, session, item: dict[str, Any], *, sort_order: int | None = None) -> CategoryModel:
        value = _clean(item.get("value"))
        if not value:
            raise ValueError("category value is required")
        row = session.query(CategoryModel).filter(CategoryModel.value == value).first() or CategoryModel(value=value)
        row.title = _as_dict(item.get("title"))
        row.description = _as_dict(item.get("description"))
        row.cover = _clean(item.get("cover"))
        row.anchor = _clean(item.get("anchor"))
        row.template_anchor = _clean(item.get("templateAnchor") or item.get("template_anchor"))
        row.sort_order = _int(item.get("sortOrder") or item.get("sort_order"), sort_order or 0)
        row.updated_at = _now()
        session.add(row)
        return row

    def _upsert_tag_locked(self, session, item: dict[str, Any], *, kind: str, sort_order: int) -> StyleTagModel:
        value = _clean(item.get("value"))
        if not value:
            raise ValueError("tag value is required")
        row = session.query(StyleTagModel).filter(StyleTagModel.kind == kind, StyleTagModel.value == value).first() or StyleTagModel(kind=kind, value=value)
        row.title = _as_dict(item.get("title"))
        row.keywords = _as_list(item.get("keywords"))
        row.sort_order = _int(item.get("sortOrder") or item.get("sort_order"), sort_order)
        session.add(row)
        return row

    def _upsert_template_locked(self, session, item: dict[str, Any], *, sort_order: int | None = None) -> TemplateModel:
        template_id = _clean(item.get("id"))
        if not template_id:
            raise ValueError("template id is required")
        row = session.query(TemplateModel).filter(TemplateModel.id == template_id).first() or TemplateModel(id=template_id)
        row.title = _as_dict(item.get("title"))
        row.description = _as_dict(item.get("description"))
        row.category = _clean(item.get("category"))
        row.anchor = _clean(item.get("anchor"))
        row.cover = _clean(item.get("cover"))
        row.styles = _as_list(item.get("styles"))
        row.scenes = _as_list(item.get("scenes"))
        row.tags = _as_list(item.get("tags"))
        row.use_when = _as_dict(item.get("useWhen") or item.get("use_when"))
        row.guidance = _as_dict(item.get("guidance"))
        row.pitfalls = _as_dict(item.get("pitfalls"))
        row.example_cases = _as_list(item.get("exampleCases") or item.get("example_cases"))
        row.prompt = _clean(item.get("prompt"))
        row.sort_order = _int(item.get("sortOrder") or item.get("sort_order"), sort_order or 0)
        row.updated_at = _now()
        session.add(row)
        return row

    def _upsert_case_locked(self, session, item: dict[str, Any]) -> CaseModel:
        case_id = _int(item.get("id"))
        if case_id <= 0:
            raise ValueError("case id is required")
        row = session.query(CaseModel).filter(CaseModel.id == case_id).first() or CaseModel(id=case_id)
        row.title = _clean(item.get("title"))
        row.image = _clean(item.get("image"))
        row.image_alt = _clean(item.get("imageAlt") or item.get("image_alt"))
        row.source_label = _clean(item.get("sourceLabel") or item.get("source_label"))
        row.source_url = _clean(item.get("sourceUrl") or item.get("source_url"))
        row.prompt = _clean(item.get("prompt"))
        row.prompt_preview = _clean(item.get("promptPreview") or item.get("prompt_preview"))
        row.category = _clean(item.get("category"))
        row.styles = _as_list(item.get("styles"))
        row.scenes = _as_list(item.get("scenes"))
        row.featured = _bool(item.get("featured"))
        row.usage_count = _int(item.get("usageCount") or item.get("usage_count"))
        row.favorite_count = _int(item.get("favoriteCount") or item.get("favorite_count"))
        row.github_url = _clean(item.get("githubUrl") or item.get("github_url"))
        status = _clean(item.get("status"), "published")
        row.status = status if status in {"draft", "published", "archived"} else "published"
        row.updated_at = _now()
        session.add(row)
        return row

    @staticmethod
    def _category(row: CategoryModel) -> dict[str, Any]:
        return {
            "value": row.value,
            "title": row.title or {},
            "description": row.description or {},
            "cover": row.cover or "",
            "anchor": row.anchor or "",
            "templateAnchor": row.template_anchor or "",
            "sortOrder": row.sort_order or 0,
            "createdAt": _dt(row.created_at),
            "updatedAt": _dt(row.updated_at),
        }

    @staticmethod
    def _template(row: TemplateModel) -> dict[str, Any]:
        return {
            "id": row.id,
            "title": row.title or {},
            "description": row.description or {},
            "category": row.category or "",
            "anchor": row.anchor or "",
            "cover": row.cover or "",
            "styles": row.styles or [],
            "scenes": row.scenes or [],
            "tags": row.tags or [],
            "useWhen": row.use_when or {},
            "guidance": row.guidance or {},
            "pitfalls": row.pitfalls or {},
            "exampleCases": row.example_cases or [],
            "prompt": row.prompt or "",
            "sortOrder": row.sort_order or 0,
            "createdAt": _dt(row.created_at),
            "updatedAt": _dt(row.updated_at),
        }

    @staticmethod
    def _case(row: CaseModel) -> dict[str, Any]:
        return {
            "id": row.id,
            "title": row.title or "",
            "image": row.image or "",
            "imageAlt": row.image_alt or "",
            "sourceLabel": row.source_label or "",
            "sourceUrl": row.source_url or "",
            "prompt": row.prompt or "",
            "promptPreview": row.prompt_preview or "",
            "category": row.category or "",
            "styles": row.styles or [],
            "scenes": row.scenes or [],
            "featured": bool(row.featured),
            "usageCount": row.usage_count or 0,
            "favoriteCount": row.favorite_count or 0,
            "githubUrl": row.github_url or "",
            "status": row.status or "published",
            "createdAt": _dt(row.created_at),
            "updatedAt": _dt(row.updated_at),
        }


content_library_service = ContentLibraryService()
