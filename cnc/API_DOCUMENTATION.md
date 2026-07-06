# API 接口文档

## 概述

本文档描述《数控工程师工作平台》前端应用的接口规范。当前项目以本地静态网页和 JSON 数据为主，接口可以理解为“前端 API 适配层”：现在由 `api-adapter.js` 读取本地 JSON、LocalStorage、IndexedDB；后续如果升级为局域网服务或公网资料站，可以在不大改页面的情况下替换为真实 HTTP API。

## 基础信息

| 项目 | 说明 |
|---|---|
| 基础路径 | `/api` |
| 数据格式 | JSON |
| 编码 | UTF-8 |
| 请求方式 | GET / POST / PUT / DELETE |
| 时间格式 | ISO 8601，例如 `2026-07-03T22:00:00+08:00` |
| 成功标识 | `success: true` |
| 失败标识 | `success: false` |

## 通用返回结构

成功：

```json
{
  "success": true,
  "data": {},
  "message": "ok",
  "requestId": "req-20260703-000001"
}
```

失败：

```json
{
  "success": false,
  "error": {
    "code": "SEARCH_QUERY_EMPTY",
    "message": "搜索关键词不能为空",
    "detail": "query parameter is required"
  },
  "requestId": "req-20260703-000002"
}
```


## 1. 搜索接口

### 1.1 全文搜索

**端点**：`GET /api/search/fulltext`

**说明**：根据关键词在标题、正文、标签、别名、代码示例中检索。

**参数**：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `query` | string | 是 | 搜索关键词，如 G54、报警1001、铝合金铣削 |
| `page` | number | 否 | 页码，默认1 |
| `limit` | number | 否 | 每页数量，默认20 |
| `category` | string | 否 | 分类筛选 |
| `difficulty` | string | 否 | 难度筛选 |
| `tags` | string | 否 | 多个标签用英文逗号分隔 |
| `sort` | string | 否 | relevance / updatedAt / hot |

**示例**：

```json
{
  "success": true,
  "data": {
    "query": "G54",
    "total": 18,
    "page": 1,
    "limit": 20,
    "costMs": 12,
    "results": [
      {
        "id": "kb-00001",
        "title": "G54 工件坐标系",
        "category": "编程基础",
        "subcategory": "坐标系",
        "excerpt": "G54 是常用的<mark>工件坐标系</mark>设定指令。",
        "score": 0.95,
        "difficulty": "入门",
        "tags": ["G代码", "坐标系", "对刀"],
        "hasImages": true
      }
    ]
  }
}
```

**前端处理建议**：

- 请求前做参数校验，避免空查询、超长输入、非法数值。
- 手机端加载中状态必须明显，避免用户重复点击。
- 失败时显示可理解的中文提示，不直接暴露技术错误。
- 列表数据必须分页或分批渲染，避免一次性渲染大量节点。

### 1.2 智能问答匹配

**端点**：`GET /api/search/faq`

**说明**：把自然语言问题匹配到知识条目，例如“G71怎么用”“报警1001是什么原因”。

**参数**：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `question` | string | 是 | 用户问题 |
| `limit` | number | 否 | 返回数量，默认5 |
| `scene` | string | 否 | programming / alarm / tooling |

**示例**：

```json
{
  "success": true,
  "data": {
    "question": "G71怎么用",
    "intent": "code_usage",
    "answers": [
      {
        "entryId": "kb-01071",
        "title": "G71 外圆粗车循环",
        "summary": "G71 用于车床粗加工循环，常见格式为 G71 U__ R__ 与 G71 P__ Q__ U__ W__ F__。",
        "confidence": 0.91
      }
    ]
  }
}
```

**前端处理建议**：

- 请求前做参数校验，避免空查询、超长输入、非法数值。
- 手机端加载中状态必须明显，避免用户重复点击。
- 失败时显示可理解的中文提示，不直接暴露技术错误。
- 列表数据必须分页或分批渲染，避免一次性渲染大量节点。

### 1.3 搜索建议

**端点**：`GET /api/search/suggest`

**说明**：输入时返回自动补全建议。

**参数**：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `keyword` | string | 是 | 当前输入内容 |
| `limit` | number | 否 | 建议数量，默认10 |

**示例**：

```json
{
  "success": true,
  "data": {
    "suggestions": [
      {"text": "G54 工件坐标系", "type": "entry", "entryId": "kb-00001"},
      {"text": "G54 对刀方法", "type": "entry", "entryId": "kb-00002"}
    ]
  }
}
```

**前端处理建议**：

- 请求前做参数校验，避免空查询、超长输入、非法数值。
- 手机端加载中状态必须明显，避免用户重复点击。
- 失败时显示可理解的中文提示，不直接暴露技术错误。
- 列表数据必须分页或分批渲染，避免一次性渲染大量节点。

### 1.4 热门关键词

**端点**：`GET /api/search/hot-keywords`

**说明**：返回首页和搜索页展示的热门词。

**参数**：

无。

**示例**：

```json
{
  "success": true,
  "data": {
    "keywords": [
      {"text": "G54", "count": 1200},
      {"text": "G71", "count": 980},
      {"text": "对刀", "count": 860}
    ]
  }
}
```

**前端处理建议**：

- 请求前做参数校验，避免空查询、超长输入、非法数值。
- 手机端加载中状态必须明显，避免用户重复点击。
- 失败时显示可理解的中文提示，不直接暴露技术错误。
- 列表数据必须分页或分批渲染，避免一次性渲染大量节点。

### 1.5 最近搜索

**端点**：`GET /api/search/history`

**说明**：获取当前用户最近搜索记录。本地版从 LocalStorage 或 IndexedDB 读取。

**参数**：

无。

**示例**：

```json
{
  "success": true,
  "data": {
    "items": [
      {"keyword": "G54", "searchedAt": "2026-07-03T10:00:00+08:00"}
    ]
  }
}
```

**前端处理建议**：

- 请求前做参数校验，避免空查询、超长输入、非法数值。
- 手机端加载中状态必须明显，避免用户重复点击。
- 失败时显示可理解的中文提示，不直接暴露技术错误。
- 列表数据必须分页或分批渲染，避免一次性渲染大量节点。

### 1.6 清空搜索历史

**端点**：`DELETE /api/search/history`

**说明**：清空搜索历史。

**参数**：

无。

**示例**：

```json
{"success": true, "message": "搜索历史已清空"}
```

**前端处理建议**：

- 请求前做参数校验，避免空查询、超长输入、非法数值。
- 手机端加载中状态必须明显，避免用户重复点击。
- 失败时显示可理解的中文提示，不直接暴露技术错误。
- 列表数据必须分页或分批渲染，避免一次性渲染大量节点。


## 2. 知识库接口

### 2.1 获取知识树

**端点**：`GET /api/knowledge/tree`

**说明**：获取知识地图使用的树状结构。

**参数**：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `depth` | number | 否 | 返回层级深度 |
| `includeCount` | boolean | 否 | 是否包含数量 |
| `category` | string | 否 | 只返回某一分类 |

**示例**：

```json
{
  "success": true,
  "data": {
    "root": {
      "id": "root",
      "title": "数控知识库",
      "count": 42294,
      "children": [
        {"id": "cat-programming", "title": "G代码与M代码", "icon": "⚙️", "count": 471}
      ]
    }
  }
}
```

**前端处理建议**：

- 请求前做参数校验，避免空查询、超长输入、非法数值。
- 手机端加载中状态必须明显，避免用户重复点击。
- 失败时显示可理解的中文提示，不直接暴露技术错误。
- 列表数据必须分页或分批渲染，避免一次性渲染大量节点。

### 2.2 获取分类列表

**端点**：`GET /api/knowledge/categories`

**说明**：获取首页入口、筛选器、分类视图使用的分类。

**参数**：

无。

**示例**：

```json
{
  "success": true,
  "data": {
    "categories": [
      {"id": "programming", "name": "G代码与M代码", "icon": "⚙️", "count": 471},
      {"id": "alarm", "name": "参数与报警", "icon": "⚠️", "count": 188},
      {"id": "operation", "name": "机床操作", "icon": "🎮", "count": 207}
    ]
  }
}
```

**前端处理建议**：

- 请求前做参数校验，避免空查询、超长输入、非法数值。
- 手机端加载中状态必须明显，避免用户重复点击。
- 失败时显示可理解的中文提示，不直接暴露技术错误。
- 列表数据必须分页或分批渲染，避免一次性渲染大量节点。

### 2.3 获取知识点详情

**端点**：`GET /api/knowledge/entries/{id}`

**说明**：根据 ID 获取知识点完整内容。

**参数**：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | string | 是 | 知识点唯一ID，如 kb-00001 |

**示例**：

```json
{
  "success": true,
  "data": {
    "id": "kb-00001",
    "title": "G54 工件坐标系",
    "category": "编程基础",
    "summary": "G54 用于确定程序中的工件原点。",
    "content": "完整正文内容，支持 Markdown。",
    "sections": [
      {"id": "usage", "title": "用途", "content": "用于调用第1组工件坐标系。"},
      {"id": "format", "title": "格式", "content": "G90 G54 G00 X0 Y0"}
    ],
    "codeExamples": [
      {"language": "gcode", "title": "G54 示例", "code": "G90 G54 G00 X0 Y0\nG43 H01 Z50.0"}
    ],
    "images": ["img-00001"],
    "tags": ["G代码", "坐标系", "对刀"]
  }
}
```

**前端处理建议**：

- 请求前做参数校验，避免空查询、超长输入、非法数值。
- 手机端加载中状态必须明显，避免用户重复点击。
- 失败时显示可理解的中文提示，不直接暴露技术错误。
- 列表数据必须分页或分批渲染，避免一次性渲染大量节点。

### 2.4 按分类获取知识点

**端点**：`GET /api/knowledge/categories/{categoryId}/entries`

**说明**：获取某个分类下的知识点列表。

**参数**：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `categoryId` | string | 是 | 分类ID |
| `page` | number | 否 | 页码 |
| `limit` | number | 否 | 每页数量 |
| `tag` | string | 否 | 标签筛选 |

**示例**：

```json
{
  "success": true,
  "data": {
    "categoryId": "programming",
    "total": 471,
    "page": 1,
    "results": [
      {"id": "kb-00001", "title": "G54 工件坐标系", "summary": "常用工件坐标系说明"}
    ]
  }
}
```

**前端处理建议**：

- 请求前做参数校验，避免空查询、超长输入、非法数值。
- 手机端加载中状态必须明显，避免用户重复点击。
- 失败时显示可理解的中文提示，不直接暴露技术错误。
- 列表数据必须分页或分批渲染，避免一次性渲染大量节点。

### 2.5 获取相关推荐

**端点**：`GET /api/knowledge/entries/{id}/recommendations`

**说明**：根据当前知识点返回同类扩展、相关操作、实战案例等推荐。

**参数**：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `limit` | number | 否 | 默认8 |
| `type` | string | 否 | same_category / related_operation / case |

**示例**：

```json
{
  "success": true,
  "data": {
    "entryId": "kb-00001",
    "recommendations": [
      {"id": "kb-00002", "title": "G55-G59 坐标系区别", "type": "same_category", "reason": "同类扩展", "score": 0.88}
    ]
  }
}
```

**前端处理建议**：

- 请求前做参数校验，避免空查询、超长输入、非法数值。
- 手机端加载中状态必须明显，避免用户重复点击。
- 失败时显示可理解的中文提示，不直接暴露技术错误。
- 列表数据必须分页或分批渲染，避免一次性渲染大量节点。


## 3. 学习路径接口

### 3.1 获取学习路径列表

**端点**：`GET /api/learning/paths`

**说明**：获取入门、进阶、专家或专题学习路线。

**参数**：

无。

**示例**：

```json
{
  "success": true,
  "data": {
    "paths": [
      {"id": "path-beginner", "title": "数控编程入门路线", "estimatedHours": 120, "level": "入门", "stageCount": 5}
    ]
  }
}
```

**前端处理建议**：

- 请求前做参数校验，避免空查询、超长输入、非法数值。
- 手机端加载中状态必须明显，避免用户重复点击。
- 失败时显示可理解的中文提示，不直接暴露技术错误。
- 列表数据必须分页或分批渲染，避免一次性渲染大量节点。

### 3.2 获取学习路径详情

**端点**：`GET /api/learning/paths/{pathId}`

**说明**：获取学习路线阶段、模块和知识点列表。

**参数**：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `pathId` | string | 是 | 学习路径ID |

**示例**：

```json
{
  "success": true,
  "data": {
    "id": "path-beginner",
    "title": "数控编程入门路线",
    "stages": [
      {"id": "stage-001", "title": "认识机床与坐标轴", "order": 1, "modules": [{"id": "module-001", "title": "机床坐标系基础", "entryIds": ["kb-00011"]}]}
    ]
  }
}
```

**前端处理建议**：

- 请求前做参数校验，避免空查询、超长输入、非法数值。
- 手机端加载中状态必须明显，避免用户重复点击。
- 失败时显示可理解的中文提示，不直接暴露技术错误。
- 列表数据必须分页或分批渲染，避免一次性渲染大量节点。

### 3.3 获取学习进度

**端点**：`GET /api/learning/progress`

**说明**：获取用户学习路径完成情况。

**参数**：

无。

**示例**：

```json
{
  "success": true,
  "data": {
    "paths": [
      {"pathId": "path-beginner", "completedEntries": 18, "totalEntries": 80, "progressPercent": 22.5}
    ]
  }
}
```

**前端处理建议**：

- 请求前做参数校验，避免空查询、超长输入、非法数值。
- 手机端加载中状态必须明显，避免用户重复点击。
- 失败时显示可理解的中文提示，不直接暴露技术错误。
- 列表数据必须分页或分批渲染，避免一次性渲染大量节点。

### 3.4 更新学习进度

**端点**：`POST /api/learning/progress`

**说明**：用户完成或开始学习某个知识点时调用。

**参数**：

无。

**示例**：

```json
{
  "pathId": "path-beginner",
  "entryId": "kb-00012",
  "status": "completed",
  "durationSeconds": 300
}
```

**前端处理建议**：

- 请求前做参数校验，避免空查询、超长输入、非法数值。
- 手机端加载中状态必须明显，避免用户重复点击。
- 失败时显示可理解的中文提示，不直接暴露技术错误。
- 列表数据必须分页或分批渲染，避免一次性渲染大量节点。


## 4. 用户数据接口

### 4.1 获取收藏列表

**端点**：`GET /api/user/favorites`

**说明**：获取用户收藏内容。

**参数**：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `type` | string | 否 | entry / image / tool |
| `page` | number | 否 | 页码 |
| `limit` | number | 否 | 每页数量 |

**示例**：

```json
{
  "success": true,
  "data": {
    "total": 1,
    "items": [{"targetId": "kb-00001", "type": "entry", "title": "G54 工件坐标系"}]
  }
}
```

**前端处理建议**：

- 请求前做参数校验，避免空查询、超长输入、非法数值。
- 手机端加载中状态必须明显，避免用户重复点击。
- 失败时显示可理解的中文提示，不直接暴露技术错误。
- 列表数据必须分页或分批渲染，避免一次性渲染大量节点。

### 4.2 添加收藏

**端点**：`POST /api/user/favorites`

**说明**：收藏知识点、图片或工具。

**参数**：

无。

**示例**：

```json
{"targetId": "kb-00001", "type": "entry", "note": "常用坐标系"}
```

**前端处理建议**：

- 请求前做参数校验，避免空查询、超长输入、非法数值。
- 手机端加载中状态必须明显，避免用户重复点击。
- 失败时显示可理解的中文提示，不直接暴露技术错误。
- 列表数据必须分页或分批渲染，避免一次性渲染大量节点。

### 4.3 取消收藏

**端点**：`DELETE /api/user/favorites/{targetId}`

**说明**：取消收藏。

**参数**：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `targetId` | string | 是 | 收藏对象ID |

**示例**：

```json
{"success": true, "message": "已取消收藏"}
```

**前端处理建议**：

- 请求前做参数校验，避免空查询、超长输入、非法数值。
- 手机端加载中状态必须明显，避免用户重复点击。
- 失败时显示可理解的中文提示，不直接暴露技术错误。
- 列表数据必须分页或分批渲染，避免一次性渲染大量节点。

### 4.4 获取浏览历史

**端点**：`GET /api/user/history`

**说明**：获取最近查看内容。

**参数**：

无。

**示例**：

```json
{
  "success": true,
  "data": {"items": [{"targetId": "kb-00001", "type": "entry", "title": "G54 工件坐标系"}]}
}
```

**前端处理建议**：

- 请求前做参数校验，避免空查询、超长输入、非法数值。
- 手机端加载中状态必须明显，避免用户重复点击。
- 失败时显示可理解的中文提示，不直接暴露技术错误。
- 列表数据必须分页或分批渲染，避免一次性渲染大量节点。

### 4.5 记录浏览历史

**端点**：`POST /api/user/history`

**说明**：打开知识点、图片、工具时记录浏览历史。

**参数**：

无。

**示例**：

```json
{"targetId": "kb-00001", "type": "entry", "durationSeconds": 60}
```

**前端处理建议**：

- 请求前做参数校验，避免空查询、超长输入、非法数值。
- 手机端加载中状态必须明显，避免用户重复点击。
- 失败时显示可理解的中文提示，不直接暴露技术错误。
- 列表数据必须分页或分批渲染，避免一次性渲染大量节点。

### 4.6 用户设置

**端点**：`GET /api/user/settings / PUT /api/user/settings`

**说明**：读取或更新主题、字体、首页卡片、默认搜索分类等设置。

**参数**：

无。

**示例**：

```json
{
  "theme": "dark-blue",
  "fontSize": "medium",
  "defaultSearchCategory": "all",
  "enableRecommendations": true
}
```

**前端处理建议**：

- 请求前做参数校验，避免空查询、超长输入、非法数值。
- 手机端加载中状态必须明显，避免用户重复点击。
- 失败时显示可理解的中文提示，不直接暴露技术错误。
- 列表数据必须分页或分批渲染，避免一次性渲染大量节点。


## 5. 图库接口

### 5.1 获取图片分类

**端点**：`GET /api/images/categories`

**说明**：获取图库分类。

**参数**：

无。

**示例**：

```json
{
  "success": true,
  "data": {"categories": [{"id": "panel", "name": "机床面板操作图", "count": 28}]}
}
```

**前端处理建议**：

- 请求前做参数校验，避免空查询、超长输入、非法数值。
- 手机端加载中状态必须明显，避免用户重复点击。
- 失败时显示可理解的中文提示，不直接暴露技术错误。
- 列表数据必须分页或分批渲染，避免一次性渲染大量节点。

### 5.2 获取图片列表

**端点**：`GET /api/images`

**说明**：按分类、关键词分页获取图片。

**参数**：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `category` | string | 否 | 图片分类 |
| `keyword` | string | 否 | 关键词 |
| `page` | number | 否 | 页码 |
| `limit` | number | 否 | 每页数量 |

**示例**：

```json
{
  "success": true,
  "data": {
    "total": 125,
    "items": [
      {"id": "img-00001", "title": "加工中心坐标轴示意图", "thumbnailUrl": "assets/images/thumbs/img-00001.webp", "imageUrl": "assets/images/img-00001.webp", "width": 1080, "height": 720}
    ]
  }
}
```

**前端处理建议**：

- 请求前做参数校验，避免空查询、超长输入、非法数值。
- 手机端加载中状态必须明显，避免用户重复点击。
- 失败时显示可理解的中文提示，不直接暴露技术错误。
- 列表数据必须分页或分批渲染，避免一次性渲染大量节点。

### 5.3 获取图片详情

**端点**：`GET /api/images/{imageId}`

**说明**：获取图片说明、标注和关联知识点。

**参数**：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `imageId` | string | 是 | 图片ID |

**示例**：

```json
{
  "success": true,
  "data": {
    "id": "img-00001",
    "title": "加工中心坐标轴示意图",
    "description": "用于说明 X、Y、Z 三个直线轴方向。",
    "labels": [{"text": "X轴", "x": 420, "y": 320}],
    "relatedEntries": [{"id": "kb-00011", "title": "机床坐标系基础"}]
  }
}
```

**前端处理建议**：

- 请求前做参数校验，避免空查询、超长输入、非法数值。
- 手机端加载中状态必须明显，避免用户重复点击。
- 失败时显示可理解的中文提示，不直接暴露技术错误。
- 列表数据必须分页或分批渲染，避免一次性渲染大量节点。


## 6. 工具接口

### 6.1 转速计算

**端点**：`POST /api/tools/calculate-spindle-speed`

**说明**：根据线速度和刀具直径计算主轴转速。公式：n = 1000 × Vc / (π × D)。

**参数**：

无。

**示例**：

```json
{
  "cuttingSpeed": 200,
  "diameter": 10,
  "unit": "metric"
}
```

**前端处理建议**：

- 请求前做参数校验，避免空查询、超长输入、非法数值。
- 手机端加载中状态必须明显，避免用户重复点击。
- 失败时显示可理解的中文提示，不直接暴露技术错误。
- 列表数据必须分页或分批渲染，避免一次性渲染大量节点。

### 6.2 进给速度计算

**端点**：`POST /api/tools/calculate-feed-rate`

**说明**：根据转速、齿数、每齿进给计算进给速度。公式：F = n × z × fz。

**参数**：

无。

**示例**：

```json
{
  "spindleSpeed": 8000,
  "toothCount": 3,
  "feedPerTooth": 0.05
}
```

**前端处理建议**：

- 请求前做参数校验，避免空查询、超长输入、非法数值。
- 手机端加载中状态必须明显，避免用户重复点击。
- 失败时显示可理解的中文提示，不直接暴露技术错误。
- 列表数据必须分页或分批渲染，避免一次性渲染大量节点。

### 6.3 单位换算

**端点**：`POST /api/tools/unit-convert`

**说明**：毫米、英寸、角度等常用单位换算。

**参数**：

无。

**示例**：

```json
{"value": 25.4, "from": "mm", "to": "inch"}
```

**前端处理建议**：

- 请求前做参数校验，避免空查询、超长输入、非法数值。
- 手机端加载中状态必须明显，避免用户重复点击。
- 失败时显示可理解的中文提示，不直接暴露技术错误。
- 列表数据必须分页或分批渲染，避免一次性渲染大量节点。

### 6.4 工具列表

**端点**：`GET /api/tools`

**说明**：返回所有可用工具配置。

**参数**：

无。

**示例**：

```json
{
  "success": true,
  "data": {
    "tools": [
      {"id": "spindle-speed", "title": "转速计算"},
      {"id": "feed-rate", "title": "进给计算"}
    ]
  }
}
```

**前端处理建议**：

- 请求前做参数校验，避免空查询、超长输入、非法数值。
- 手机端加载中状态必须明显，避免用户重复点击。
- 失败时显示可理解的中文提示，不直接暴露技术错误。
- 列表数据必须分页或分批渲染，避免一次性渲染大量节点。


## 7. 授权资料库接口

### 7.1 获取资料库入口信息

**端点**：`GET /api/library/access-info`

**说明**：判断用户是否具备高级资料库访问权限。

**参数**：

无。

**示例**：

```json
{
  "success": true,
  "data": {
    "status": "guest",
    "canAccessPublic": true,
    "canAccessPrivate": false,
    "message": "当前可查看公开资料。高级资料需要授权访问。"
  }
}
```

**前端处理建议**：

- 请求前做参数校验，避免空查询、超长输入、非法数值。
- 手机端加载中状态必须明显，避免用户重复点击。
- 失败时显示可理解的中文提示，不直接暴露技术错误。
- 列表数据必须分页或分批渲染，避免一次性渲染大量节点。

### 7.2 验证邀请码

**端点**：`POST /api/library/verify-code`

**说明**：输入邀请码获取授权。

**参数**：

无。

**示例**：

```json
{"code": "CNC-2026-8888"}
```

**前端处理建议**：

- 请求前做参数校验，避免空查询、超长输入、非法数值。
- 手机端加载中状态必须明显，避免用户重复点击。
- 失败时显示可理解的中文提示，不直接暴露技术错误。
- 列表数据必须分页或分批渲染，避免一次性渲染大量节点。

### 7.3 获取资料库文件列表

**端点**：`GET /api/library/files`

**说明**：按权限、分类、关键词获取资料文件。

**参数**：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `accessLevel` | string | 否 | public / private |
| `category` | string | 否 | 分类 |
| `keyword` | string | 否 | 关键词 |

**示例**：

```json
{
  "success": true,
  "data": {
    "files": [
      {"id": "doc-00001", "title": "FANUC 常用参数速查表", "category": "参数资料", "accessLevel": "private", "fileType": "pdf"}
    ]
  }
}
```

**前端处理建议**：

- 请求前做参数校验，避免空查询、超长输入、非法数值。
- 手机端加载中状态必须明显，避免用户重复点击。
- 失败时显示可理解的中文提示，不直接暴露技术错误。
- 列表数据必须分页或分批渲染，避免一次性渲染大量节点。


## 错误码说明

| 错误码 | HTTP状态 | 说明 | 前端处理建议 |
|---|---:|---|---|
| BAD_REQUEST | 400 | 请求参数错误 | 提示用户检查输入 |
| SEARCH_QUERY_EMPTY | 400 | 搜索关键词为空 | 展示热门关键词 |
| SEARCH_QUERY_TOO_LONG | 400 | 搜索关键词过长 | 限制输入长度 |
| ENTRY_NOT_FOUND | 404 | 知识点不存在 | 返回列表页并提示 |
| IMAGE_NOT_FOUND | 404 | 图片不存在 | 显示占位图 |
| CATEGORY_NOT_FOUND | 404 | 分类不存在 | 回退到全部分类 |
| ACCESS_DENIED | 403 | 无访问权限 | 引导申请授权 |
| INVITE_CODE_INVALID | 400 | 邀请码无效 | 提示重新输入 |
| DATA_LOAD_FAILED | 500 | 数据加载失败 | 提供重试按钮 |
| STORAGE_FULL | 507 | 本地存储空间不足 | 提示清理缓存 |
| UNKNOWN_ERROR | 500 | 未知错误 | 记录日志并提示反馈 |

## 接口调用示例

### fetch 基础封装

```javascript
async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error?.message || '接口请求失败');
  }

  return result.data;
}
```

### 搜索调用示例

```javascript
async function searchKnowledge(query, page = 1) {
  if (!query || !query.trim()) {
    return { total: 0, results: [] };
  }

  const params = new URLSearchParams({
    query: query.trim(),
    page: String(page),
    limit: '20',
    highlight: 'true'
  });

  return await apiRequest(`/api/search/fulltext?${params.toString()}`);
}
```

### 本地 API 适配层示例

```javascript
class LocalApiAdapter {
  constructor() {
    this.entries = [];
  }

  async init() {
    this.entries = await fetch('data/knowledge_entries.json').then(r => r.json());
  }

  async searchFulltext({ query, page = 1, limit = 20 }) {
    const keyword = query.toLowerCase();

    const matched = this.entries.filter(entry => {
      return entry.title.toLowerCase().includes(keyword)
        || entry.content.toLowerCase().includes(keyword)
        || (entry.tags || []).some(tag => tag.toLowerCase().includes(keyword));
    });

    const start = (page - 1) * limit;

    return {
      query,
      total: matched.length,
      page,
      limit,
      results: matched.slice(start, start + limit)
    };
  }
}
```

## 前端状态约定

```javascript
const appState = {
  currentView: 'home',
  currentQuery: '',
  selectedEntryId: null,
  searchResults: [],
  favorites: [],
  history: [],
  settings: {},
  loading: false,
  error: null
};
```

## 版本兼容策略

| 接口版本 | 说明 | 兼容要求 |
|---|---|---|
| v1.0 | 本地静态数据版本 | 必须支持 |
| v1.1 | 增加授权资料库 | 保持 v1.0 字段不变 |
| v1.2 | 增加用户同步 | 新字段可选 |
| v2.0 | 服务端接口版本 | 通过适配层兼容旧页面 |

接口字段只允许新增，不建议删除。如果字段废弃，应保留至少一个大版本周期，并在文档中标记 `deprecated`。
