# 内容库外部 API 文档

本文档整理分类、模板、案例相关的外部读取 API。外部项目通过这些接口获取内容库数据、搜索案例、读取模板，并上报案例使用和收藏统计。

## 基础信息

- Base URL: `https://your-domain`
- API 前缀: `/api/v1`
- 数据来源: PostgreSQL 内容库
- 图片路径: 返回值中的 `/images/...` 由当前服务代理，图片文件位于项目 `case-data/images`
- 公开范围: 案例接口只返回 `status = published` 的案例

## 鉴权

外部 API 默认可以不鉴权。若环境变量启用鉴权，则请求必须携带 API Key。

启用方式:

```env
PUBLIC_API_REQUIRE_KEY=true
PUBLIC_API_KEYS=key-1,key-2
```

支持两种传参方式:

```http
X-API-Key: key-1
```

或:

```http
Authorization: Bearer key-1
```

鉴权失败返回:

```json
{
  "detail": {
    "error": "public api key is required"
  }
}
```

## 通用字段

### 多语言文本

分类和模板中的标题、描述等字段通常是对象:

```json
{
  "zh": "中文内容",
  "en": "English content"
}
```

### 案例状态

外部案例接口只返回:

```text
published
```

后台中可能还存在:

```text
draft
archived
```

## 分类

### 获取分类列表

```http
GET /api/v1/categories
```

返回按 `sortOrder` 排序的分类数组。

示例:

```bash
curl "https://your-domain/api/v1/categories"
```

返回示例:

```json
[
  {
    "value": "Posters & Typography",
    "title": {
      "zh": "海报与排版",
      "en": "Posters & Typography"
    },
    "description": {
      "zh": "活动海报、封面和字体视觉。",
      "en": "Posters, covers, and typography."
    },
    "cover": "/images/category-covers/poster.jpg",
    "anchor": "cat-poster",
    "templateAnchor": "tpl-poster",
    "sortOrder": 3,
    "createdAt": "2026-06-02T03:00:00Z",
    "updatedAt": "2026-06-02T03:00:00Z"
  }
]
```

## 模板

### 获取模板列表

```http
GET /api/v1/templates
```

查询参数:

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `q` | string | 搜索模板 ID、标题、Prompt 等文本 |
| `search` | string | `q` 的别名；同时传入时优先使用 `q` |
| `category` | string | 按分类 `value` 筛选 |

示例:

```bash
curl "https://your-domain/api/v1/templates?category=Posters%20%26%20Typography&q=poster"
```

返回示例:

```json
[
  {
    "id": "tpl-poster",
    "title": {
      "zh": "海报模板",
      "en": "Poster Template"
    },
    "description": {
      "zh": "适合活动海报和强排版。",
      "en": "For campaign posters."
    },
    "category": "Posters & Typography",
    "anchor": "tpl-poster",
    "cover": "/images/category-covers/poster.jpg",
    "styles": ["Poster"],
    "scenes": ["Commerce"],
    "tags": ["campaign", "typography"],
    "useWhen": {
      "zh": "需要活动海报时使用。",
      "en": "Use for campaign posters."
    },
    "guidance": {
      "zh": ["明确标题层级"],
      "en": ["Define title hierarchy."]
    },
    "pitfalls": {
      "zh": ["避免文字过多"],
      "en": ["Avoid too much text."]
    },
    "exampleCases": [1, 2, 3],
    "prompt": "Reusable prompt text.",
    "sortOrder": 1,
    "createdAt": "2026-06-02T03:00:00Z",
    "updatedAt": "2026-06-02T03:00:00Z"
  }
]
```

### 获取模板详情

```http
GET /api/v1/templates/{template_id}
```

示例:

```bash
curl "https://your-domain/api/v1/templates/tpl-poster"
```

找不到时返回 `404`:

```json
{
  "detail": {
    "error": "template not found"
  }
}
```

## 案例

### 获取案例列表

```http
GET /api/v1/cases
```

只返回已发布案例。

查询参数:

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `q` | string | 空 | 搜索标题、Prompt、来源、分类等文本 |
| `search` | string | 空 | `q` 的别名 |
| `category` | string | 空 | 按分类 `value` 筛选 |
| `style` | string | 空 | 按 `styles` 中的值筛选 |
| `scene` | string | 空 | 按 `scenes` 中的值筛选 |
| `featured` | string | 空 | 传 `true` 时只返回推荐案例 |
| `sort` | string | `latest` | 排序字段 |
| `order` | string | `desc` | 排序方向，支持 `asc` / `desc` |
| `page` | number | `1` | 页码，从 1 开始 |
| `pageSize` | number | `24` | 每页数量，最大 5000 |

排序字段:

| sort | 说明 |
| --- | --- |
| `latest` | 按案例 ID 倒序 |
| `oldest` | 按案例 ID 正序 |
| `id` | 按案例 ID，受 `order` 影响 |
| `usage` | 按使用次数 |
| `favorites` | 按收藏次数 |
| `popular` | 综合热度，当前公式为 `usageCount * 2 + favoriteCount` |

示例:

```bash
curl "https://your-domain/api/v1/cases?q=poster&featured=true&sort=popular&page=1&pageSize=20"
```

返回示例:

```json
{
  "items": [
    {
      "id": 484,
      "title": "Example Case",
      "image": "/images/case484.jpg",
      "imageAlt": "Example Case",
      "sourceLabel": "X Community",
      "sourceUrl": "https://example.com/status/1",
      "prompt": "Full prompt text.",
      "promptPreview": "Prompt preview.",
      "category": "Posters & Typography",
      "styles": ["Poster"],
      "scenes": ["Commerce"],
      "featured": true,
      "usageCount": 12,
      "favoriteCount": 5,
      "githubUrl": "https://github.com/example",
      "status": "published",
      "createdAt": "2026-06-02T03:00:00Z",
      "updatedAt": "2026-06-02T03:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 20
}
```

### 搜索案例

```http
GET /api/v1/search
```

`/api/v1/search` 与 `/api/v1/cases` 使用同一套查询参数和返回结构，适合外部项目用作统一搜索入口。

示例:

```bash
curl "https://your-domain/api/v1/search?search=logo&category=Brand%20%26%20Identity"
```

### 获取案例详情

```http
GET /api/v1/cases/{case_id}
```

示例:

```bash
curl "https://your-domain/api/v1/cases/484"
```

找不到或案例未发布时返回 `404`:

```json
{
  "detail": {
    "error": "case not found"
  }
}
```

## 案例统计

### 获取案例统计

```http
GET /api/v1/cases/{case_id}/stats
```

返回:

```json
{
  "id": 484,
  "usageCount": 12,
  "favoriteCount": 5
}
```

### 增加使用次数

```http
POST /api/v1/cases/{case_id}/use
```

`amount` 可以通过 query 或 JSON body 传入，范围为 1 到 100，默认 1。

示例:

```bash
curl -X POST "https://your-domain/api/v1/cases/484/use?amount=1"
```

或:

```bash
curl -X POST "https://your-domain/api/v1/cases/484/use" \
  -H "Content-Type: application/json" \
  -d '{"amount": 3}'
```

返回:

```json
{
  "id": 484,
  "usageCount": 13,
  "favoriteCount": 5
}
```

### 增加收藏次数

```http
POST /api/v1/cases/{case_id}/favorite
```

示例:

```bash
curl -X POST "https://your-domain/api/v1/cases/484/favorite"
```

### 取消收藏

```http
DELETE /api/v1/cases/{case_id}/favorite
```

示例:

```bash
curl -X DELETE "https://your-domain/api/v1/cases/484/favorite"
```

取消收藏会减少 `favoriteCount`，但不会低于 0。

## 样式库聚合数据

### 获取样式库

```http
GET /api/v1/style-library
```

返回分类、风格标签、场景标签和模板。

返回结构:

```json
{
  "categories": [],
  "styles": [],
  "scenes": [],
  "templates": []
}
```

示例:

```bash
curl "https://your-domain/api/v1/style-library"
```

## 站点聚合数据

### 获取首页/站点数据

```http
GET /api/v1/site-data
```

返回分类和案例列表。支持案例列表同样的筛选参数，默认 `pageSize=100`。

示例:

```bash
curl "https://your-domain/api/v1/site-data?pageSize=50&sort=latest"
```

返回结构:

```json
{
  "categories": [],
  "cases": {
    "items": [],
    "total": 0,
    "page": 1,
    "pageSize": 50
  }
}
```

## 图片访问

内容 API 返回的图片字段通常是应用内路径:

```text
/images/case484.jpg
```

外部项目可以拼接当前服务域名访问:

```text
https://your-domain/images/case484.jpg
```

案例图片文件使用 `case-data/images` 目录作为内容库图片目录；后台上传案例图片后，也会写入该目录。

## JavaScript 调用示例

```ts
const baseUrl = "https://your-domain";
const apiKey = "key-1";

async function fetchCases() {
  const params = new URLSearchParams({
    q: "poster",
    page: "1",
    pageSize: "20",
  });
  const response = await fetch(`${baseUrl}/api/v1/cases?${params}`, {
    headers: {
      "X-API-Key": apiKey,
    },
  });
  if (!response.ok) {
    throw new Error(`content api failed: ${response.status}`);
  }
  return response.json();
}
```

## 错误码

| 状态码 | 场景 |
| --- | --- |
| `400` | 案例 ID 不是正整数 |
| `401` | 启用 API Key 后未携带有效密钥 |
| `404` | 模板或案例不存在，或案例未发布 |
| `500` | 服务端异常 |

## 对接建议

- 外部项目优先使用 `/api/v1/site-data` 获取页面初始数据。
- 搜索场景使用 `/api/v1/search` 或 `/api/v1/cases`。
- 展示模板列表使用 `/api/v1/templates`，按分类筛选时传 `category`。
- 用户复制或使用某个案例 Prompt 后，调用 `POST /api/v1/cases/{id}/use`。
- 用户收藏案例时调用 `POST /api/v1/cases/{id}/favorite`，取消收藏时调用 `DELETE /api/v1/cases/{id}/favorite`。
