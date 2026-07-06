# 前端就绪报告 v2

## 文件接入状态

### ✅ 现在就能接（无依赖、无草稿标记）

| 文件 | 条目 | 稳定度 | 说明 |
|------|------|--------|------|
| `gcode_reference.json` | 89 | ⭐⭐⭐ | 结构固定，字段全，已经过实际验证 |
| `mcode_reference.json` | 90 | ⭐⭐⭐ | 同 gcode_reference，可对等处理 |
| `related_links_map.json` | 281 | ⭐⭐⭐ | 纯关系数组，schema 稳定 |
| `data-manifest.json` | - | ⭐⭐⭐ | 元数据，接入后自动更新 |
| `entry-lookup-map.json` | 2339 | ⭐⭐⭐ | 从源数据自动生成，稳定 |
| `search-index-light.json` | 815 | ⭐⭐⭐ | 从源数据自动生成，稳定 |

### ⚠️ 可以接但需过滤状态

| 文件 | 条目 | 建议 |
|------|------|------|
| `search_suggestions.json` | 434 | 可直接用于生产，建议后续人工补充热门搜索统计 |
| `risk-keywords.json` | 40 | 可直接用于生产，建议每季度根据事故反馈更新 |
| `faq-unified.json` | 417 | 开发/测试环境可以直接用，**生产环境建议等 reviewStatus 切换为 approved** |
| `faq-high-risk-only.json` | 218 | 同上，建议确认高风险判断逻辑后再上线 |
| `faq-review-queue.json` | 130 | 仅用于后台管理，不要暴露到前台 |

### ❌ 先别接

| 内容 | 原因 |
|------|------|
| 原始 `search_alias_dictionary.json` | JSON语法错误，已被clean版替换 |
| 任何 `reviewStatus=draft` 的数据直接用于生产 | 内容未经专家确认，有误导风险 |

## 字段稳定性评估

### 稳定字段（不改设计）
- `gcode_reference`: code, title, category, summary, usage, commonMistakes, relatedTerms, difficulty, systemScope
- `mcode_reference`: 同上
- `related_links_map`: sourceId, relatedId, relationType, reason, weight
- `entry-lookup-map`: keyword, targetType, targetId, reason

### 可能调整的字段
- `search-index-light`: riskLevel 的判定逻辑（目前基于规则，后续可改为基于统计数据）
- `risk-keywords`: riskMessage 和 recommendedGuard 措辞需要专家打磨
- `faq-unified`: fullAnswer 字段的格式（当前是纯文本，后续可能需要支持 Markdown）

## 优先级建议

### Codex 最值得优先接入的 3 个文件

1. **`search-index-light.json`** — 覆盖搜索、跳转、风险标记三大场景，一文件三用
2. **`search-suggestions.json`** — 搜索框联想是提升搜索体验的最直观功能
3. **`risk-keywords.json`** — 实时风险提醒功能，直接提升安全性和用户信任

三个文件合计约 450KB，一次 fetch 即可实现搜索+联想+风控三合一。

### 后续优先

- 如果做知识图谱 → `related_links_map.json`
- 如果做 FAQ 页面 → `faq-unified.json`
- 如果做代码手册 → `gcode_reference.json` + `mcode_reference.json`

## 已知问题

1. **faq-unified.json 的 fullAnswer 格式**: 目前是 `PossibleCauses: ... CheckSteps: ...` 的纯文本格式，不如 Markdown 易读。建议后续 Schema v2 中改为结构化对象 `{possibleCauses: string[], checkSteps: string[]}`。
2. **risk-keywords.json 覆盖范围**: 40 条覆盖了核心风险，但可能遗漏部分非常见风险词（如特定参数号组合引发的连锁风险）。
3. **search-suggestions.json 的热度排序**: 当前优先级是人工判断的，不反映真实搜索频率。建议上线后收集搜索日志，按真实热度微调。
