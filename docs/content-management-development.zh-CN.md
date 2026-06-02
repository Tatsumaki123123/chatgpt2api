# 分类、模板、案例管理功能开发文档

本文档整理自托管版本中“分类、模板、案例”三类内容管理功能的实现方式，覆盖数据库、后端接口、后台页面、外部 API、初始化导入和后续扩展建议。

## 1. 功能目标

自托管版本将原来的静态内容库升级为可在线管理的内容平台：

- 分类：维护案例和模板的主分类，用于前台筛选、导航和外部 API。
- 模板：维护可复用 Prompt 模板，包含适用场景、使用建议、防坑指南和关联案例。
- 案例：维护具体图片案例，包含图片、来源、Prompt、标签、发布状态、使用次数和收藏数。

核心原则是数据库作为主数据源，`data/cases.json` 和 `data/style-library.json` 只作为首次初始化导入来源。

## 2. 相关文件

主要实现文件：

- `server/migrate.js`：数据库表结构、索引和更新时间触发器。
- `server/seed.js`：从现有静态 JSON 导入分类、模板、标签和案例。
- `server/index.js`：后台 CRUD API、公开查询 API、案例统计接口。
- `src/admin.jsx`：后台管理页面逻辑。
- `src/admin.css`：后台管理页面样式。
- `docs/self-hosted-platform.md`：自托管运行和 API 使用文档。

前台读取逻辑：

- `src/main.jsx` 优先读取 `/api/v1/site-data` 和 `/api/v1/style-library`。
- 如果动态 API 不可用，则回退到 `/cases.json` 和 `/style-library.json`。

## 3. 数据库结构

### 3.1 分类表 `categories`

字段：

- `id`：自增主键。
- `value`：分类唯一值，例如 `Posters & Typography`。
- `title`：JSONB，中英文标题，例如 `{ "zh": "海报与排版", "en": "Posters & Typography" }`。
- `description`：JSONB，中英文描述。
- `cover`：分类封面路径。
- `anchor`：画廊文档锚点。
- `template_anchor`：模板文档锚点。
- `sort_order`：后台和前台排序。
- `created_at` / `updated_at`：创建和更新时间。

用途：

- 前台分类筛选。
- 管理后台分类下拉选项。
- 外部 API `/api/v1/categories` 返回。
- 模板和案例的 `category` 字段引用。

### 3.2 模板表 `templates`

字段：

- `id`：模板主键，例如 `tpl-poster`。
- `title`：JSONB，中英文标题。
- `description`：JSONB，中英文描述。
- `category`：所属分类。
- `anchor`：模板文档锚点。
- `cover`：封面路径。
- `styles`：风格标签数组。
- `scenes`：场景标签数组。
- `tags`：通用标签数组。
- `use_when`：JSONB，适用场景。
- `guidance`：JSONB，使用建议，通常是中英文数组。
- `pitfalls`：JSONB，防坑指南，通常是中英文数组。
- `example_cases`：关联案例 ID 数组。
- `prompt`：模板 Prompt 正文。
- `sort_order`：排序。
- `created_at` / `updated_at`：创建和更新时间。

用途：

- 前台模板区展示。
- Agent Skill / 外部项目选择模板。
- 外部 API `/api/v1/templates` 返回。

### 3.3 案例表 `cases`

字段：

- `id`：案例 ID，沿用原案例编号。
- `title`：案例标题。
- `image`：图片路径，例如 `/images/case484.jpg`。
- `image_alt`：图片说明。
- `source_label`：来源名称。
- `source_url`：来源链接。
- `prompt`：完整 Prompt。
- `prompt_preview`：Prompt 摘要。
- `category`：所属分类。
- `styles`：风格标签数组。
- `scenes`：场景标签数组。
- `featured`：是否推荐。
- `usage_count`：使用次数。
- `favorite_count`：收藏数。
- `github_url`：GitHub 原始案例链接。
- `status`：发布状态，支持 `draft`、`published`、`archived`。
- `created_at` / `updated_at`：创建和更新时间。

用途：

- 前台案例画廊展示。
- 后台案例管理。
- 外部 API 搜索和读取。
- 统计热度排序。

### 3.4 标签表 `style_tags`

虽然本文重点是分类、模板、案例，但标签会被模板和案例引用。

字段：

- `value`：标签值。
- `kind`：标签类型，`style` 或 `scene`。
- `title`：JSONB，中英文标题。
- `keywords`：JSONB，关键词数组。
- `sort_order`：排序。

唯一约束：

- `(kind, value)` 唯一。

## 4. 初始化导入

Docker API 容器启动时按顺序执行：

```bash
node server/migrate.js
node server/seed.js
node server/index.js
```

导入来源：

- `data/style-library.json`
  - 导入 `categories`
  - 导入 `style_tags`
  - 导入 `templates`
- `data/cases.json`
  - 导入 `cases`

导入策略：

- 分类按 `value` 做 upsert。
- 标签按 `(kind, value)` 做 upsert。
- 模板按 `id` 做 upsert。
- 案例按 `id` 做 upsert。

注意：

- `seed.js` 会同步静态 JSON 中的内容字段。
- 线上如果已经通过后台编辑过内容，再重新 seed 可能覆盖部分字段。
- 后续可以增加 `SKIP_SEED=true` 或导入模式开关，避免生产环境重复覆盖。

## 5. 后台管理接口

后台接口使用管理员登录后的 HTTP-only Cookie 鉴权。

登录相关：

```http
POST /api/admin/auth/login
GET  /api/admin/auth/me
POST /api/admin/auth/logout
```

### 5.1 分类 CRUD

```http
GET    /api/admin/categories
POST   /api/admin/categories
PUT    /api/admin/categories/:value
DELETE /api/admin/categories/:value
```

创建/更新字段：

```json
{
  "value": "Posters & Typography",
  "title": { "zh": "海报与排版", "en": "Posters & Typography" },
  "description": { "zh": "活动海报、封面、字体视觉", "en": "Posters, covers and typography." },
  "cover": "/images/category-covers/poster.jpg",
  "anchor": "cat-poster",
  "templateAnchor": "tpl-poster",
  "sortOrder": 3
}
```

### 5.2 模板 CRUD

```http
GET    /api/admin/templates
POST   /api/admin/templates
PUT    /api/admin/templates/:id
DELETE /api/admin/templates/:id
```

查询参数：

- `q`：搜索模板 ID 或标题。

创建/更新字段示例：

```json
{
  "id": "tpl-poster",
  "title": { "zh": "海报模板", "en": "Poster Template" },
  "description": { "zh": "适合活动海报和强排版", "en": "For campaign posters." },
  "category": "Posters & Typography",
  "anchor": "tpl-poster",
  "cover": "/images/category-covers/poster.jpg",
  "styles": ["Poster"],
  "scenes": ["Commerce"],
  "tags": ["campaign", "typography"],
  "useWhen": { "zh": "需要活动海报时使用", "en": "Use for campaign posters." },
  "guidance": { "zh": ["明确标题层级"], "en": ["Define title hierarchy."] },
  "pitfalls": { "zh": ["避免文字过多"], "en": ["Avoid too much text."] },
  "exampleCases": [1, 2, 3],
  "prompt": "Write the reusable prompt here.",
  "sortOrder": 1
}
```

### 5.3 案例 CRUD

```http
GET    /api/admin/cases
POST   /api/admin/cases
PUT    /api/admin/cases/:id
DELETE /api/admin/cases/:id
```

查询参数：

- `q`：搜索标题、Prompt、来源。
- `status`：`draft`、`published`、`archived`。
- `category`：分类值。
- `style`：风格标签。
- `scene`：场景标签。
- `featured=true`：只看推荐案例。
- `sort`：`latest`、`oldest`、`id`、`usage`、`favorites`、`popular`。
- `order`：`asc` 或 `desc`。
- `page`：页码。
- `pageSize`：每页数量。

创建/更新字段示例：

```json
{
  "id": 484,
  "title": "霓虹涂鸦黑白人像",
  "image": "/images/case484.jpg",
  "imageAlt": "霓虹涂鸦黑白人像",
  "sourceLabel": "X Community",
  "sourceUrl": "https://x.com/example/status/1",
  "prompt": "Full prompt text.",
  "promptPreview": "Prompt preview.",
  "category": "Photography & Realism",
  "styles": ["Realistic", "Poster"],
  "scenes": ["Creative"],
  "featured": true,
  "usageCount": 12,
  "favoriteCount": 5,
  "githubUrl": "https://github.com/...",
  "status": "published"
}
```

## 6. 后台页面实现

后台入口：

```text
/admin.html
```

主要组件在 `src/admin.jsx`：

- `AdminApp`：后台总入口，处理登录态、导航、基础 lookup 数据。
- `Overview`：概览页，展示案例、分类、模板、标签、API Key 统计。
- `CasesPanel`：案例列表、筛选、分页、排序、编辑入口。
- `CaseEditor`：案例编辑表单。
- `CategoriesPanel`：分类列表和编辑。
- `CategoryEditor`：分类编辑表单。
- `TemplatesPanel`：模板列表和搜索。
- `TemplateEditor`：模板编辑表单。
- `ImagePreview`：图片缩略图和编辑页预览。

### 6.1 案例列表

案例列表支持：

- 图片缩略图。
- 标题和来源展示。
- 分类展示。
- 发布状态展示。
- 使用次数、收藏数展示。
- 标签展示。
- 编辑和删除。
- 按热度、收藏、使用次数排序。

### 6.2 案例编辑页

案例编辑页支持：

- 修改 ID、标题、分类、状态。
- 修改图片路径和图片说明。
- 实时图片预览。
- 修改来源名称和来源 URL。
- 修改风格标签和场景标签。
- 修改推荐状态。
- 修改使用次数和收藏数。
- 修改 GitHub URL。
- 修改 Prompt 摘要和完整 Prompt。

图片路径为空时显示“暂无图片”；图片加载失败时显示“图片无法加载”。

### 6.3 分类管理

分类管理支持：

- 新增分类。
- 编辑分类唯一值、排序、中英文标题、描述、封面、锚点。
- 删除分类。

当前删除分类不会自动清空案例和模板中的 `category` 字段，后续可增加引用检查。

### 6.4 模板管理

模板管理支持：

- 新增模板。
- 搜索模板。
- 编辑中英文标题、描述、适用场景。
- 编辑封面、分类、排序。
- 编辑风格标签、场景标签、通用标签。
- 编辑关联案例 ID。
- 编辑模板 Prompt。
- 编辑使用建议和防坑指南 JSON。

## 7. 公开 API

公开 API 可选 API Key 保护，由 `PUBLIC_API_REQUIRE_KEY` 控制。

如果开启：

```http
X-API-Key: agi_xxx
```

### 7.1 分类接口

```http
GET /api/v1/categories
```

返回分类数组，按 `sort_order` 排序。

### 7.2 模板接口

```http
GET /api/v1/templates
GET /api/v1/templates/:id
```

支持查询参数：

- `category`
- `q` 或 `search`

### 7.3 案例接口

```http
GET /api/v1/cases
GET /api/v1/cases/:id
GET /api/v1/search
```

只返回 `status = published` 的案例。

支持查询参数：

- `q` 或 `search`
- `category`
- `style`
- `scene`
- `featured=true`
- `sort=latest | oldest | id | usage | favorites | popular`
- `order=asc | desc`
- `page`
- `pageSize`

排序说明：

- `latest`：按案例 ID 倒序。
- `oldest`：按案例 ID 正序。
- `id`：按案例 ID，受 `order` 影响。
- `usage`：按使用次数排序。
- `favorites`：按收藏数排序。
- `popular`：综合热度排序，当前公式为 `usage_count * 2 + favorite_count`。

### 7.4 案例统计接口

```http
GET    /api/v1/cases/:id/stats
POST   /api/v1/cases/:id/use
POST   /api/v1/cases/:id/favorite
DELETE /api/v1/cases/:id/favorite
```

用途：

- 外部项目复制或使用某个案例时，调用 `POST /use` 增加使用次数。
- 外部项目收藏案例时，调用 `POST /favorite` 增加收藏数。
- 外部项目取消收藏时，调用 `DELETE /favorite` 减少收藏数。

`amount` 参数：

- 可通过 query 或 body 传入。
- 范围限制为 1 到 100。
- 默认值为 1。

示例：

```bash
curl -X POST -H "X-API-Key: agi_xxx" \
  "https://your-domain/api/v1/cases/484/use"
```

## 8. 前台读取

前台 `src/main.jsx` 使用动态 API 优先策略：

```text
/api/v1/site-data      -> 失败后回退 /cases.json
/api/v1/style-library  -> 失败后回退 /style-library.json
```

因此：

- Docker 自托管时优先使用数据库数据。
- API 异常时仍可显示静态数据。
- 原来的静态 Vite 站点能力不会被破坏。

## 9. 当前限制

目前实现仍有一些可继续完善的点：

- 图片上传暂未实现，现在只维护图片路径。
- 删除分类时不会检查案例和模板引用。
- 删除标签时不会检查案例和模板引用。
- 使用次数和收藏数是总量计数，不区分用户维度。
- 外部 API 的统计上报没有去重机制。
- 模板的 `guidance` 和 `pitfalls` 仍通过 JSON 文本维护。
- 生产环境重复执行 seed 可能覆盖后台编辑内容。

## 10. 后续建议

建议优先扩展：

1. 图片上传：增加 `/api/admin/uploads`，支持本地 volume 或 S3/MinIO。
2. 引用保护：删除分类或标签前检查案例/模板引用。
3. 统计明细：增加 `case_usage_events` 和 `case_favorite_events`，记录来源项目、用户、时间。
4. 导入导出：支持从数据库导出 `cases.json` 和 `style-library.json`。
5. 模板结构化编辑：把 JSON 文本编辑改为逐项列表编辑。
6. 权限细分：管理员可分为只读、编辑、发布、超级管理员。

