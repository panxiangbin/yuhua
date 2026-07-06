# 前端数据层集成报告

**日期**: 2026-07-06
**任务**: 将 `opencode_frontend_ready/` 的 JSON 数据接入项目页面

---

## 集成概况

| 数据文件 | 条目数 | 用途 | 状态 |
|---------|-------|------|------|
| `search-suggestions.json` | 434 | 搜索框自动联想 (A) | ✅ |
| `search-index-light.json` | 815 | 搜索索引补充 (B) | ✅ |
| `risk-keywords.json` | 40 | 详情页风险提示 (C) | ✅ |
| `faq-unified.json` | 417 | 首页 FAQ 速查 (D) | ✅ |
| `entry-lookup-map.json` | 2339 | 关键词路由映射 | 🔌 已加载待用 |

## 改动的文件

| 文件 | 改动类型 | 说明 |
|------|---------|------|
| `frontend-data-layer.js` | **新建** | 数据加载与查询层，负责 fetch JSON、构建索引、提供查询接口 |
| `index.html` | 修改 | 添加脚本引用、搜索联想容器、高危提醒卡片、FAQ 速查区 |
| `app.js` | 修改 | 5 处集成：启动加载、搜索匹配增强、自动联想绑定、风险检测、FAQ 渲染 |
| `styles.css` | 修改 | 新增 ~140 行样式 |

## 各集成点详情

### A — 搜索框自动联想 (`search-suggestions.json`)

- **机制**: 用户在 workspace 搜索框输入时，实时匹配 `search-suggestions.json` 的 keyword 字段
- **展示**: 搜索框下方出现下拉建议列表，每个建议项显示类型徽标（G/OP/AL/PM）、关键词文本、分类
- **点击**: 点击建议项自动填入搜索框并触发搜索
- **技术实现**: `frontend-data-layer.js` 的 `getSuggestions()` 做前缀+子串匹配，`renderSuggestionBox()` 绑定 DOM 事件

### B — 搜索索引补充 (`search-index-light.json`)

- **机制**: 当关键词在现有条目中无匹配时，查询 `search-index-light.json` 的 keywords 数组
- **映射方式**: 通过 index 条目的 id 或 title 匹配到现有条目
- **示例**: 搜索"快移"→ 前端索引命中 `alias-G00` 的 keywords → 映射到 id=G00 的条目 → 搜索结果出现 G00
- **技术实现**: 修改 `matchesKeyword()` 函数，增加 `window.CNC_FRONTEND.getIndexMatches()` 补充匹配

### C — 详情页风险提示 (`risk-keywords.json`)

- **机制**: 在详情渲染时检查条目标题/代码/摘要/警告中是否包含风险关键词
- **展示**: 若命中则在"最容易错的地方"卡片下方插入红色高危提醒卡片
- **风险内容**: 显示 `riskMessage` 和 `recommendedGuard` 字段
- **示例**: 打开 G43 条目 → 风险数据匹配"G43"→ 显示"刀长补偿：H值与当前刀具不匹配直接撞刀"

### D — FAQ 速查 (`faq-unified.json`)

- **位置**: 总览面板（dashboard）下方，"精选教学图片"之后
- **Tab 切换**: 报警 / 参数 / 新手 三个分类
- **展示形式**: `<details>` 可折叠卡片，含标题、风险徽标（高危）、短答案
- **一键展开**: "展开全部"按钮可展开当前所有 FAQ
- **数据**: 默认显示 5 条报警 FAQ，可切换分类

## 测试查询

以下 3 组查询用于验证集成是否生效：

| 查询词 | 预期行为 |
|--------|---------|
| `快移` (B) | 搜索索引补充应匹配到 G00 条目，出现在搜索结果 |
| `G43` (C) | 详情页应显示"刀长补偿"高危提醒 |
| `报警` (A) | 搜索框下拉应出现"报警重心偏移"等联想建议 |

## 后续建议

1. `gcode_reference.json` / `mcode_reference.json` 可在条目详情页懒加载，提供更完整的 G/M 代码参考
2. `related_links_map.json` 可用于增强智能推荐
3. `faq-unified.json` 的 `fullAnswer` 字段可结构化解析为 `possibleCauses[]` + `checkSteps[]` 格式
4. `entry-lookup-map.json` 可结合图片系统做关键词→图片联动
