# 数据接入就绪摘要

## 文件状态速览

| 数据包 | 文件 | 状态 | 条数 | 可接入? | 备注 |
|--------|------|------|------|---------|------|
| A-别名词典 | `search_alias_dictionary_clean.json` | ✅ 已修复 | 219 | **是** | JSON已修复并验证，含reviewStatus字段 |
| B1-G代码 | `gcode_reference.json` | ✅ 完好 | 89 | **是** | 结构完整 |
| B2-M代码 | `mcode_reference.json` | ✅ 完好 | 90 | **是** | 结构完整 |
| C-报警FAQ | `alarm_faq_data.json` | ✅ 完好 | 130 | 有条件 | 含reviewStatus=draft |
| D-参数FAQ | `parameter_faq_data.json` | ✅ 完好 | 130 | 有条件 | 含reviewStatus=draft |
| E-新手FAQ | `beginner_learning_faq.json` | ✅ 完好 | 157 | 有条件 | 含reviewStatus=draft |
| F-关联映射 | `related_links_map.json` | ✅ 完好 | 281 | **是** | 结构完整，无reviewStatus字段 |

## 接入 readiness

### 可直接接入（✅）
- **别名词典** (`search_alias_dictionary_clean.json`): 语义简单，直接 `fetch` 后构建 Map
- **G/M代码参考** (`gcode_reference.json`, `mcode_reference.json`): 标准 key-value 结构
- **关联映射** (`related_links_map.json`): 纯关系数组，structure 明确

### 需有条件接入（⚠️ reviewStatus = "draft"）
- **报警FAQ / 参数FAQ / 新手FAQ**: 所有条目标记 `"reviewStatus": "draft"`，代表未经人工核实
- **接入策略**:
  - 方式A: 前端过滤 `reviewStatus === 'approved'` 才显示（当前会显示0条）
  - 方式B: 在开发/测试环境临时接受 `draft` 状态，上线前人工切换
  - 推荐方式B，3个FAQ包总计417条，人工复核后批量改状态即可

### 暂不可接入（❌）
- **原始别名词典** (`search_alias_dictionary.json`): JSON 语法错误，已被修复版替代

## 接入推荐顺序

```
1. search_alias_dictionary_clean.json   → 搜索容错，无风险
2. gcode_reference.json                 → 代码查询，数据成熟
3. mcode_reference.json                 → 同上
4. related_links_map.json               → 推荐引擎/知识图谱
5. alarm_faq_data.json                  → 草稿状态，可先开放
6. parameter_faq_data.json              → 同上
7. beginner_learning_faq.json           → 同上
```

## 数据量汇总（可接入）

| 级别 | 条数 |
|------|------|
| 可接入（无状态限制） | 679（219别名+89G+90M+281关联） |
| 可接入（含draft） | 417（130报警+130参数+157新手） |
| **总计** | **1,096 条** |
