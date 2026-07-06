# 前端数据消费指南

## 文件用途速览

| 文件 | 首页搜索 | 详情页 | 联想提示 | 风险提醒 | FAQ弹层 | 图片联动 |
|------|---------|--------|---------|---------|--------|---------|
| search-index-light.json | ✅ 主索引 | ✅ 跳转用 | ✅ 后端 | — | — | — |
| search-suggestions.json | ✅ 搜索框 | — | ✅ 主数据源 | — | — | — |
| risk-keywords.json | — | ✅ 高危标签 | ✅ 风险提示 | ✅ 主数据源 | — | — |
| entry-lookup-map.json | ✅ 路由 | — | — | — | — | ✅ 图片关联 |
| faq-unified.json | — | — | — | — | ✅ 主数据源 | — |
| faq-high-risk-only.json | — | ✅ 高危过滤 | — | ✅ 补充 | ✅ 快速展示 | — |
| faq-review-queue.json | — | — | — | — | ✅ 后台审核 | — |

## 各场景详细说明

### 首页搜索
- **主数据源**: `search-index-light.json`（815条，覆盖所有实体类型）
- **加载策略**: APP启动时 fetch + 缓存到 localStorage/IndexedDB
- **搜索方式**: 前端遍历 `keywords` 字段做模糊匹配，或用 Fuse.js/minisearch 做全文检索
- **跳转**: 用 `directLinkHint` 字段做客户端路由跳转
- **风险标记**: `riskLevel` 字段可在搜索结果上标红/标⚠️

### 搜索框联想（Autocomplete）
- **主数据源**: `search-suggestions.json`（434条，含分类和优先级）
- **加载策略**: 随 search-index-light 一起加载
- **展示逻辑**: 按 `priority` 排序（1=G/M代码优先 > 2=操作/报警 > 3=材料/工艺）
- **分类展示**: 按 `category` 分组展示，用 `type` 做图标区分

### 详情页
- **G/M代码详情**: 直接 fetch `gcode_reference.json` / `mcode_reference.json` 对应条目
- **报警FAQ**: 从 `alarm_faq_data.json` 取对应 id
- **参数FAQ**: 从 `parameter_faq_data.json` 取对应 id
- **新手FAQ**: 从 `beginner_learning_faq.json` 取对应 id
- **相关推荐**: 用 `related_links_map.json` 根据当前条目 sourceId 做关联推荐

### 风险提醒
- **输入时实时提醒**: 匹配 `risk-keywords.json` 的 `keyword`，在用户输入时弹出风险提示
- **详情页风险标签**: `search-index-light.json` 的 `riskLevel=high` 条目在详情页顶部标红
- **操作前确认**: 对高频高危关键词（G43/M06/参数修改等）做二次确认弹窗

### FAQ弹层/页面
- **统一数据源**: `faq-unified.json`，一次加载即可展示所有FAQ
- **筛选逻辑**: `faqType` 字段做 tab 切换（alarm/param/beginner）
- **风险标注**: `riskNote` 非空时在 FaqCard 上标红
- **高风险管理**: 独立页面 `faq-high-risk-only.json`

### 图片系统联动
- **桥梁文件**: `entry-lookup-map.json` 把搜索词映射到知识点
- **后续工作**: 图片系统图片的 alt/title 字段可从 `search-index-light.json` 的 `keywords` 中取
- **学习路径图**: `related_links_map.json` 可构建知识图谱树，用于图片联动导航

## 加载优先级建议

```
第一优先级（APP启动时加载）:
  search-index-light.json   → 主页搜索功能
  search-suggestions.json   → 搜索框联想
  entry-lookup-map.json     → 路由导航

第二优先级（用户首次进入相关页面时懒加载）:
  gcode_reference.json      → 用户点开G代码页时加载
  mcode_reference.json      → 用户点开M代码页时加载
  faq-unified.json          → 用户点开FAQ页时加载
  risk-keywords.json         → 用户开始输入搜索词时加载

第三优先级（空闲时加载）:
  related_links_map.json    → 知识图谱构建
  faq-high-risk-only.json   → 高风险管理页
  faq-review-queue.json     → 后台审核（仅管理员）
```

## 预计数据量

| 加载时机 | 总字节数 | 终端耗时（4G） |
|---------|---------|-------------|
| APP启动 | ~780KB | ~1.5s |
| 进入G代码页追加 | ~120KB | ~0.3s |
| 进入FAQ页追加 | ~380KB | ~0.8s |
| 全部加载 | ~1.5MB | ~3s |
