# 聊天生图页面实现说明

> 适合参考这套实现来自建类似画图网页。

## 一、整体架构

---

## 二、核心数据结构

### 会话（ImageConversation）

```ts
type ImageConversation = {
  id: string;
  title: string; // 自动取提示词前12字
  createdAt: string;
  updatedAt: string;
  turns: ImageTurn[]; // 多轮对话
};
```

### 每一轮（ImageTurn）

```ts
type ImageTurn = {
  id: string;
  prompt: string; // 提示词
  model: "gpt-image-2" | "codex-gpt-image-2";
  mode: "generate" | "edit"; // 文生图 or 图生图
  referenceImages: StoredReferenceImage[]; // 本轮参考图（base64存储）
  count: number; // 生成张数
  size: string; // 宽高比，如 "16:9"
  images: StoredImage[]; // 结果图列表
  status: "queued" | "generating" | "success" | "error";
  createdAt: string;
};
```

### 单张图（StoredImage）

```ts
type StoredImage = {
  id: string;
  taskId?: string; // 对应后端任务ID
  status?: "loading" | "success" | "error";
  b64_json?: string; // base64图片数据（本地缓存）
  url?: string; // 服务端图片URL
  revised_prompt?: string; // 上游修正后的提示词
  error?: string;
};
```

---

## 三、API 调用层

### 文生图（异步任务）

```
POST /api/image-tasks/generations
Body: { client_task_id, prompt, model?, size? }
返回: ImageTask（含 id、status、data）
```

### 图生图（异步任务）

```
POST /api/image-tasks/edits
Body: multipart/form-data
  - client_task_id
  - image（可多张）
  - prompt / model / size
返回: ImageTask
```

### 查询任务状态

```
GET /api/image-tasks?ids=id1,id2,...
返回: { items: ImageTask[], missing_ids: string[] }
```

> 注意：页面不直接调用 `/v1/images/generations`，而是调用封装了任务队列的 `/api/image-tasks/*`，由后端异步执行并可轮询查询状态。

---

## 四、生图流程（核心逻辑）

```
用户提交提示词
    ↓
创建 ImageTurn（status=queued，images 全为 loading 占位）
    ↓
写入本地 IndexedDB
    ↓
runConversationQueue(conversationId)
    ├─ 调用 createImageGenerationTask / createImageEditTask
    │    → 后端创建任务，立即返回任务ID
    ├─ 循环 sleep(2000) + fetchImageTasks(taskIds)
    │    → 轮询后端任务状态
    │    → 更新对应 StoredImage.status / b64_json / url
    └─ 所有图完成后退出轮询
```

### 关键设计点

- **幂等的 `client_task_id`**：前端生成任务ID，提交和重试时传同一个ID，后端不会重复创建任务
- **`activeConversationQueueIds`**：模块级 Set，防止同一会话同时跑两个队列循环
- **页面刷新恢复**：启动时读取 IndexedDB，对仍在 loading 状态且有 taskId 的图直接发起 `fetchImageTasks` 轮询
- **missing_ids 处理**：如果后端找不到任务（如服务重启）则自动重新提交

---

## 五、本地持久化

存储引擎：**IndexedDB**（通过 `localforage`）

```ts
const imageConversationStorage = localforage.createInstance({
  name: "chatgpt2api",
  storeName: "image_conversations",
});
```

写操作通过 `imageConversationWriteQueue` 串行化（Promise 链），避免并发写冲突。

历史记录存储内容：提示词、参考图（base64）、结果图（b64_json + url）、状态。**图片数据全存浏览器本地，不上传服务器历史。**

---

## 六、UI 组件结构

### ImageComposer（输入区）

| 功能           | 实现方式                                           |
| -------------- | -------------------------------------------------- |
| 提示词输入     | `<Textarea>`，Enter 提交，Shift+Enter 换行         |
| 粘贴图片       | 监听 `onPaste`，过滤 image/\* 类型文件             |
| 上传参考图     | `<input type="file" multiple accept="image/*">`    |
| 张数输入       | `<input type="number">`，限制 1~100                |
| 宽高比选择     | 自定义浮层菜单，支持 1:1 / 16:9 / 9:16 / 4:3 / 3:4 |
| 剩余额度显示   | 仅管理员可见，从 `/api/accounts` 聚合计算          |
| 任务进行中提示 | 显示当前排队+生成中的任务总数                      |

### ImageResults（结果区）

每轮显示：

- 右侧气泡：提示词 + 轮次信息 + "复用配置"按钮
- 左侧：参考图缩略图（可点击大图预览）+ 生成结果图

结果图操作：

- **下载**：b64_json 直接 Blob 下载，无 b64 则 fetch URL 后下载
- **加入编辑**：把结果图加入当前输入区参考图列表
- **重新生成**：基于同一配置创建新 Turn，追加到同一会话末尾
- **单张重试**：仅重新生成失败的那张，不影响其他图

### ImageSidebar（会话列表）

- 按 `updatedAt` 降序排列
- 显示轮数、最后更新时间、排队/进行中状态角标
- 支持双击重命名（inline input）
- 新建对话 / 清空全部历史

---

## 七、宽高比实现

前端只传 `size` 字符串（如 `"16:9"`），后端在 prompt 末尾拼接中文描述：

```python
# services/protocol/conversation.py
def build_image_prompt(prompt, size):
    hint = {
        "1:1": "输出为 1:1 正方形构图，主体居中，适合正方形画幅。",
        "16:9": "输出为 16:9 横屏构图，适合宽画幅展示。",
        ...
    }[size]
    return f"{prompt.strip()}\n\n{hint}"
```

---

## 八、如果你要自建类似页面

### 最简实现路线（直接调 API）

```
POST /v1/images/generations   ← 同步等待结果（20~60s）
Authorization: Bearer <key>
{ "model": "gpt-image-2", "prompt": "...", "n": 1 }

返回:
{ "data": [{ "b64_json": "...", "url": "...", "revised_prompt": "..." }] }
```

直接用此接口，不需要任务队列，适合简单页面。

### 异步任务路线（需要管理员 key）

如果用 `/api/image-tasks/*`，需要管理员身份（普通用户 key 只能访问 `/v1/*`）。

### 参考图传递

```js
const formData = new FormData();
formData.append("image", file); // 参考图文件
formData.append("prompt", prompt);
formData.append("model", "gpt-image-2");
formData.append("n", "1");

fetch("/v1/images/edits", {
  method: "POST",
  headers: { Authorization: "Bearer <key>" },
  body: formData,
});
```

### 注意事项

1. 生图耗时长（20~60s），务必加 loading 状态
2. `b64_json` 图片比较大，存 IndexedDB 比 localStorage 更合适
3. `url` 字段是服务端缓存的图片 URL，有效期有限，长期保存建议用 `b64_json`
4. 多张图（`n > 1`）时后端是每张独立生成的，可能部分成功部分失败
