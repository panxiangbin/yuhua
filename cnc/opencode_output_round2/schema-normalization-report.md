# 7 数据文件 Schema 规范化报告

## 解析验证

| 文件 | 状态 | 条数 | Schema 一致性 |
|------|------|------|--------------|
| search_alias_dictionary.json | ❌ 原始无法解析 → ✅ 已修复 | 219 | ✅ 修复后一致 |
| gcode_reference.json | ✅ 正常 | 89 | ✅ 100%一致 |
| mcode_reference.json | ✅ 正常 | 90 | ✅ 100%一致 |
| alarm_faq_data.json | ✅ 正常 | 130 | ✅ 100%一致 |
| parameter_faq_data.json | ✅ 正常 | 130 | ✅ 100%一致 |
| beginner_learning_faq.json | ✅ 正常 | 157 | ✅ 100%一致 |
| related_links_map.json | ✅ 正常 | 281 | ✅ 100%一致 |

## 各文件 Schema 定义

### search_alias_dictionary_clean.json
```json
{
  "canonical": "string",      // 规范名
  "aliases":    "string[]",   // 别名列表（已去重）
  "category":   "string",     // 类别: gcode|mcode|operation|alarm|machine|process|material|tool|system|common|param
  "priority":   "number",     // 1-3 优先级
  "notes":      "string",     // 备注
  "reviewStatus": "string"    // draft|approved
}
```

### gcode_reference.json / mcode_reference.json
```json
{
  "code":          "string",     // G代码号，如 "G00"
  "title":         "string",     // 中文标题
  "category":      "string",     // 分类标签
  "summary":       "string",     // 一句话说明
  "usage":         "string",     // 使用场景
  "commonMistakes":"string[]",   // 常见错误列表
  "relatedTerms":  "string[]",   // 相关术语
  "difficulty":    "string",     // 入门|初级|中级|高级
  "systemScope":   "string"      // 系统适用范围
}
```

### alarm_faq_data.json
```json
{
  "id":             "string",     // 如 "alarm-faq-001"
  "alarmCode":      "string",     // 报警代码，如 "PS0001"
  "title":          "string",     // 中文标题（含白话解释）
  "plainLanguage":  "string",     // 白话解释
  "possibleCauses": "string[]",   // 可能原因
  "firstChecks":    "string[]",   // 先查什么
  "dangerLevel":    "string",     // 低|中|高|紧急
  "relatedKeywords":"string[]",   // 相关关键词
  "systemScope":    "string",     // 系统范围
  "reviewStatus":   "string"      // draft
}
```

### parameter_faq_data.json
```json
{
  "id":           "string",     // 如 "param-faq-001"
  "topic":        "string",     // 主题分类
  "question":     "string",     // 问题
  "shortAnswer":  "string",     // 一句话回答
  "detailAnswer": "string",     // 详细解释
  "relatedCodes": "array",      // 相关参数号（number|string）
  "riskNote":     "string",     // 风险提示
  "reviewStatus": "string"      // draft
}
```

### beginner_learning_faq.json
```json
{
  "id":              "string",   // 如 "beginner-faq-001"
  "question":        "string",   // 问题
  "shortAnswer":     "string",   // 一句话回答
  "beginnerExplanation": "string", // 新手解释
  "relatedTopic":    "string",   // 主题
  "recommendedImageType": "string", // 配图类型
  "relatedEntryId":  "string",   // 关联知识点ID
  "reviewStatus":    "string"    // draft
}
```

### related_links_map.json
```json
{
  "sourceId":    "string",   // 源知识点ID
  "relatedId":   "string",   // 关联知识点ID
  "relationType":"string",   // 关系类型
  "reason":      "string",   // 关联理由
  "weight":      "number"    // 关联权重 1-10
}
```

## 不一致发现

除了 `search_alias_dictionary.json` 的尾部语法问题外，其余6个文件 **无 schema 不一致**。每个文件内部从头到尾字段结构完全统一。

### 待讨论项

1. **parameter_faq_data.json** 的 `relatedCodes` 字段类型不一致：既有数字（如 `1815`）也有字符串（如 `"APC"`）。建议统一为字符串或保持混合类型（前端需要有类型处理）。
2. **beginner_learning_faq.json** 缺少 `difficulty` 字段（与 gcode/mcode 参考不同），建议后续补添以便做难度过滤。
3. **alarm_faq_data.json** 的 `dangerLevel` 使用中文值（低/中/高/紧急），建议前端 enum 匹配时到中文。
