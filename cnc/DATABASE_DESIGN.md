# 数据库设计文档

## 概述

本文档描述《数控工程师工作平台》的数据结构设计。当前项目以本地静态资源为主，数据主要采用 JSON 文件、LocalStorage 和 IndexedDB 存储。虽然不是传统数据库项目，但仍然需要按照“表结构”的方式设计数据模型，方便前端查询、后续维护、扩展为局域网服务或公网资料库。

## 技术选型

| 模块 | 当前方案 | 后续可升级方案 |
|---|---|---|
| 主数据存储 | JSON 文件 | SQLite / PostgreSQL / MySQL |
| 搜索索引 | 前端倒排索引 JSON | Fuse.js / Lunr.js / Meilisearch / Elasticsearch |
| 用户数据 | LocalStorage + IndexedDB | 服务端用户表 |
| 图片元数据 | images_metadata.json | 文件表 + 对象存储 |
| 缓存 | 浏览器缓存 | Service Worker + CDN |
| 授权信息 | 本地配置 / 邀请码文件 | 用户权限表 + Token |

## 数据文件规划

```text
data/
├── knowledge_entries.json
├── knowledge_tree.json
├── search_index.json
├── recommendations.json
├── learning_paths.json
├── images_metadata.json
├── tools_config.json
├── library_files.json
└── version.json
```


## 知识点表 `knowledge_entries`

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|---|---|---|---|---|
| `id` | string | 是 | 唯一标识 | kb-00001 |
| `title` | string | 是 | 标题 | G54 工件坐标系 |
| `alias` | array | 否 | 别名/同义词 | [工件坐标系] |
| `categoryId` | string | 是 | 一级分类ID | programming |
| `subcategoryId` | string | 否 | 二级分类ID | coordinate |
| `summary` | string | 是 | 一句话说明 | G54用于调用工件坐标系 |
| `content` | text | 是 | 正文内容 | Markdown正文 |
| `sections` | array | 否 | 结构化章节 | [{id,title,content}] |
| `codeExamples` | array | 否 | 程序示例 | [{language:gcode}] |
| `difficulty` | string | 否 | 难度 | 入门 |
| `tags` | array | 否 | 标签 | [G代码,坐标系] |
| `machineTypes` | array | 否 | 适用机床 | [加工中心] |
| `systems` | array | 否 | 数控系统 | [FANUC] |
| `images` | array | 否 | 关联图片ID | [img-00001] |
| `relatedEntryIds` | array | 否 | 关联知识点 | [kb-00002] |
| `riskLevel` | string | 否 | 风险等级 | medium |
| `isCommon` | boolean | 否 | 是否常用 | true |
| `createdAt` | string | 是 | 创建时间 | 2026-07-03 |
| `updatedAt` | string | 是 | 更新时间 | 2026-07-03 |

### 索引设计

- 主键：id
- 普通索引：categoryId、subcategoryId、difficulty、riskLevel
- 多值索引：tags、systems、machineTypes
- 全文索引：title、alias、summary、content、tags

### 设计说明

- 字段命名统一使用小驼峰或下划线，但同一文件内必须保持一致。
- 所有 ID 必须稳定，不允许因为排序变化重新生成。
- 时间字段统一使用 ISO 8601，便于排序、备份和迁移。
- 关联字段必须能在目标表中找到对应记录，避免死链。

## 搜索索引表 `search_index`

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|---|---|---|---|---|
| `token` | string | 是 | 分词关键词 | g54 |
| `entryIds` | array | 是 | 命中的知识点ID | [kb-00001] |
| `titleMatches` | array | 否 | 标题命中ID | [kb-00001] |
| `tagMatches` | array | 否 | 标签命中ID | [kb-00001] |
| `weight` | number | 否 | 关键词权重 | 10 |
| `updatedAt` | string | 是 | 更新时间 | 2026-07-03 |

### 索引设计

- 主键：token
- 普通索引：weight
- 用途：快速根据关键词定位候选知识点

### 设计说明

- 字段命名统一使用小驼峰或下划线，但同一文件内必须保持一致。
- 所有 ID 必须稳定，不允许因为排序变化重新生成。
- 时间字段统一使用 ISO 8601，便于排序、备份和迁移。
- 关联字段必须能在目标表中找到对应记录，避免死链。

## 知识树表 `knowledge_tree`

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|---|---|---|---|---|
| `id` | string | 是 | 节点ID | cat-programming |
| `parentId` | string | 否 | 父节点ID | root |
| `title` | string | 是 | 节点名称 | G代码与M代码 |
| `type` | string | 是 | root/category/topic/entry | category |
| `entryId` | string | 否 | 关联知识点ID | kb-00001 |
| `icon` | string | 否 | 图标 | ⚙️ |
| `order` | number | 是 | 排序 | 1 |
| `count` | number | 否 | 子知识点数量 | 471 |
| `children` | array | 否 | 子节点 | [] |

### 索引设计

- 主键：id
- 普通索引：parentId、type、order
- 树节点应避免循环引用

### 设计说明

- 字段命名统一使用小驼峰或下划线，但同一文件内必须保持一致。
- 所有 ID 必须稳定，不允许因为排序变化重新生成。
- 时间字段统一使用 ISO 8601，便于排序、备份和迁移。
- 关联字段必须能在目标表中找到对应记录，避免死链。

## 推荐关系表 `recommendations`

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|---|---|---|---|---|
| `sourceId` | string | 是 | 当前知识点ID | kb-00001 |
| `targetId` | string | 是 | 推荐知识点ID | kb-00002 |
| `type` | string | 是 | 推荐类型 | same_category |
| `reason` | string | 是 | 推荐原因 | 同类扩展 |
| `score` | number | 是 | 推荐分数 | 0.88 |
| `sortOrder` | number | 否 | 排序 | 1 |

### 索引设计

- 联合主键：sourceId + targetId + type
- 普通索引：sourceId、targetId、type、score

### 设计说明

- 字段命名统一使用小驼峰或下划线，但同一文件内必须保持一致。
- 所有 ID 必须稳定，不允许因为排序变化重新生成。
- 时间字段统一使用 ISO 8601，便于排序、备份和迁移。
- 关联字段必须能在目标表中找到对应记录，避免死链。

## 学习路径表 `learning_paths`

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|---|---|---|---|---|
| `id` | string | 是 | 路径ID | path-beginner |
| `title` | string | 是 | 路径名称 | 数控编程入门路线 |
| `description` | string | 是 | 说明 | 适合零基础 |
| `level` | string | 是 | 难度 | 入门 |
| `estimatedHours` | number | 是 | 预计时长 | 120 |
| `stages` | array | 是 | 阶段列表 | [] |
| `coverImageId` | string | 否 | 封面图 | img-path-001 |
| `isRecommended` | boolean | 否 | 是否推荐 | true |

### 索引设计

- 主键：id
- 普通索引：level、isRecommended

### 设计说明

- 字段命名统一使用小驼峰或下划线，但同一文件内必须保持一致。
- 所有 ID 必须稳定，不允许因为排序变化重新生成。
- 时间字段统一使用 ISO 8601，便于排序、备份和迁移。
- 关联字段必须能在目标表中找到对应记录，避免死链。

## 图片元数据表 `images_metadata`

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|---|---|---|---|---|
| `id` | string | 是 | 图片ID | img-00001 |
| `title` | string | 是 | 标题 | 坐标轴示意图 |
| `description` | string | 否 | 说明 | 展示XYZ方向 |
| `category` | string | 是 | 分类 | path |
| `imageUrl` | string | 是 | 原图路径 | assets/images/img.webp |
| `thumbnailUrl` | string | 是 | 缩略图路径 | assets/images/thumbs/img.webp |
| `width` | number | 是 | 宽度 | 1080 |
| `height` | number | 是 | 高度 | 720 |
| `labels` | array | 否 | 图片标注 | [{text,x,y}] |
| `relatedEntryIds` | array | 否 | 关联知识点 | [kb-00011] |
| `tags` | array | 否 | 标签 | [坐标系] |

### 索引设计

- 主键：id
- 普通索引：category
- 多值索引：tags、relatedEntryIds

### 设计说明

- 字段命名统一使用小驼峰或下划线，但同一文件内必须保持一致。
- 所有 ID 必须稳定，不允许因为排序变化重新生成。
- 时间字段统一使用 ISO 8601，便于排序、备份和迁移。
- 关联字段必须能在目标表中找到对应记录，避免死链。

## 用户收藏表 `favorites`

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|---|---|---|---|---|
| `id` | string | 是 | 收藏记录ID | fav-00001 |
| `userId` | string | 是 | 用户ID | local-user |
| `targetId` | string | 是 | 收藏对象ID | kb-00001 |
| `targetType` | string | 是 | entry/image/tool | entry |
| `title` | string | 是 | 标题快照 | G54 工件坐标系 |
| `note` | string | 否 | 备注 | 常用 |
| `createdAt` | string | 是 | 收藏时间 | 2026-07-03 |

### 索引设计

- 主键：id
- 唯一索引：userId + targetId + targetType
- 普通索引：createdAt

### 设计说明

- 字段命名统一使用小驼峰或下划线，但同一文件内必须保持一致。
- 所有 ID 必须稳定，不允许因为排序变化重新生成。
- 时间字段统一使用 ISO 8601，便于排序、备份和迁移。
- 关联字段必须能在目标表中找到对应记录，避免死链。

## 浏览历史表 `browsing_history`

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|---|---|---|---|---|
| `id` | string | 是 | 记录ID | his-00001 |
| `userId` | string | 是 | 用户ID | local-user |
| `targetId` | string | 是 | 浏览对象ID | kb-00001 |
| `targetType` | string | 是 | entry/image/tool | entry |
| `title` | string | 是 | 标题快照 | G54 工件坐标系 |
| `durationSeconds` | number | 否 | 停留时长 | 60 |
| `viewedAt` | string | 是 | 浏览时间 | 2026-07-03 |

### 索引设计

- 主键：id
- 普通索引：userId、viewedAt
- 同一target重复浏览时更新时间

### 设计说明

- 字段命名统一使用小驼峰或下划线，但同一文件内必须保持一致。
- 所有 ID 必须稳定，不允许因为排序变化重新生成。
- 时间字段统一使用 ISO 8601，便于排序、备份和迁移。
- 关联字段必须能在目标表中找到对应记录，避免死链。

## 学习进度表 `learning_progress`

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|---|---|---|---|---|
| `id` | string | 是 | 记录ID | lp-00001 |
| `userId` | string | 是 | 用户ID | local-user |
| `pathId` | string | 是 | 路径ID | path-beginner |
| `stageId` | string | 否 | 阶段ID | stage-001 |
| `moduleId` | string | 否 | 模块ID | module-001 |
| `entryId` | string | 是 | 知识点ID | kb-00012 |
| `status` | string | 是 | not_started/in_progress/completed | completed |
| `durationSeconds` | number | 否 | 学习时长 | 300 |
| `updatedAt` | string | 是 | 更新时间 | 2026-07-03 |

### 索引设计

- 联合索引：userId + pathId + entryId
- 普通索引：status、updatedAt

### 设计说明

- 字段命名统一使用小驼峰或下划线，但同一文件内必须保持一致。
- 所有 ID 必须稳定，不允许因为排序变化重新生成。
- 时间字段统一使用 ISO 8601，便于排序、备份和迁移。
- 关联字段必须能在目标表中找到对应记录，避免死链。

## 授权资料库文件表 `library_files`

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|---|---|---|---|---|
| `id` | string | 是 | 文件ID | doc-00001 |
| `title` | string | 是 | 标题 | FANUC参数速查表 |
| `category` | string | 是 | 分类 | 参数资料 |
| `fileType` | string | 是 | pdf/docx/xlsx/video/image | pdf |
| `filePath` | string | 是 | 文件路径 | library/private/doc.pdf |
| `accessLevel` | string | 是 | public/private/internal | private |
| `size` | number | 否 | 文件大小 | 2048000 |
| `tags` | array | 否 | 标签 | [FANUC] |
| `relatedEntryIds` | array | 否 | 关联知识点 | [kb-00001] |

### 索引设计

- 主键：id
- 普通索引：category、fileType、accessLevel
- 公网部署时私有文件不可直接暴露真实路径

### 设计说明

- 字段命名统一使用小驼峰或下划线，但同一文件内必须保持一致。
- 所有 ID 必须稳定，不允许因为排序变化重新生成。
- 时间字段统一使用 ISO 8601，便于排序、备份和迁移。
- 关联字段必须能在目标表中找到对应记录，避免死链。

## 数据关系图

```text
knowledge_entries
    ├── images ────────────────► images_metadata
    ├── relatedEntryIds ───────► knowledge_entries
    ├── id ────────────────────► recommendations.sourceId
    ├── id ────────────────────► recommendations.targetId
    └── id ────────────────────► learning_paths.stages.modules.entryIds

knowledge_tree
    └── entryId ───────────────► knowledge_entries

favorites / browsing_history
    └── targetId ──────────────► knowledge_entries / images_metadata / tools_config

learning_progress
    ├── pathId ────────────────► learning_paths
    └── entryId ───────────────► knowledge_entries

library_files
    └── relatedEntryIds ───────► knowledge_entries
```

## 搜索权重建议

| 命中位置 | 权重 |
|---|---:|
| 标题完全匹配 | 100 |
| 标题部分匹配 | 80 |
| 标签匹配 | 70 |
| 别名匹配 | 65 |
| 摘要匹配 | 50 |
| 正文匹配 | 30 |
| 相关知识匹配 | 15 |

## 索引优化策略

1. 首页只加载轻量索引，包括标题、标签、摘要和常用关键词。
2. 完整正文索引延后到搜索页加载，避免首屏过慢。
3. 大列表必须分页或虚拟滚动。
4. 图片列表只加载缩略图，大图在预览时再加载。
5. 每张图片必须记录宽高，避免布局抖动。
6. 用户数据建索引：`targetId`、`createdAt`、`viewedAt`、`pathId`、`entryId`。

## 数据校验规则

| 校验项 | 规则 |
|---|---|
| 知识点ID | 必须唯一，不可为空 |
| 标题 | 不可为空，建议 2-60 字 |
| 分类 | 必须在分类表中存在 |
| 正文 | 详情页知识点必须有正文 |
| 图片路径 | metadata 中的路径必须能访问 |
| 推荐关系 | sourceId 和 targetId 必须都存在 |
| 学习路径 | entryIds 必须指向有效知识点 |
| 时间字段 | updatedAt 不应早于 createdAt |

## 数据版本管理

`version.json` 示例：

```json
{
  "appVersion": "1.0.0",
  "dataVersion": "2026.07.03",
  "knowledgeCount": 42294,
  "imageCount": 125,
  "generatedAt": "2026-07-03T22:00:00+08:00",
  "checksum": {
    "knowledge_entries.json": "sha256-xxxx",
    "search_index.json": "sha256-yyyy"
  }
}
```

## 数据迁移方案

小版本迁移只新增字段，不删除字段：

```javascript
function migrateV100ToV110(entry) {
  return {
    ...entry,
    riskLevel: entry.riskLevel || 'low',
    isCommon: entry.isCommon ?? false
  };
}
```

用户数据迁移前必须备份：

```javascript
async function migrateUserData(db, fromVersion, toVersion) {
  const backup = await exportUserData(db);
  try {
    await runMigration(db, fromVersion, toVersion);
  } catch (error) {
    await restoreUserData(db, backup);
    throw error;
  }
}
```

## 备份策略

备份内容包括：收藏夹、浏览历史、搜索历史、学习进度、用户设置、用户笔记。备份文件建议命名为：

```text
cnc_platform_backup_20260703_v1.0.0.json
```

## 安全与权限设计

未来资料库授权需要预留字段：

| 字段 | 使用位置 | 说明 |
|---|---|---|
| accessLevel | knowledge_entries / library_files | public/private/internal |
| expiresAt | user_access | 授权过期时间 |
| allowedModules | user_access | 可访问模块 |
| inviteCodeHash | access_codes | 邀请码哈希，不存明文 |

公网部署时，私有文件不能直接放在公开静态目录中，必须通过权限接口校验后返回临时访问地址。
