# 验证结果报告

## 方法

每个 JSON 文件用 PowerShell `ConvertFrom-Json` 解析，统计条目数和空字段情况。

## 结果汇总

| 文件名 | 解析成功 | 条目数 | 空关键字段 | 建议接入 |
|--------|---------|-------|-----------|---------|
| data-manifest.json | ✅ | 7 | 无 | ✅ |
| search-index-light.json | ✅ | 815 | 无 | ✅ |
| search-suggestions.json | ✅ | 434 | 无 | ✅ |
| risk-keywords.json | ✅ | 40 | 无 | ✅ |
| entry-lookup-map.json | ✅ | 2339 | 无 | ✅ |
| faq-unified.json | ✅ | 417 | 无 | ⚠️ 含draft |
| faq-high-risk-only.json | ✅ | 218 | 无 | ⚠️ 含draft |
| faq-review-queue.json | ✅ | 130 | 无 | ✅ 仅后台 |
| frontend-consumption-guide.md | — | — | — | ✅ |
| frontend-ready-summary-v2.md | — | — | — | ✅ |

## 各文件详细验证

### data-manifest.json
- **解析**: ✅
- **条目**: 7 个数据包元信息
- **字段完整性**: 每个条目含 name/path/entries/schemaVersion/readyForProduction/containsDraft/recommendedUse/recommendedLoad

### search-index-light.json
- **解析**: ✅
- **条目**: 815
- **类型分布**: alias 219, gcode 89, mcode 90, alarm-faq 130, param-faq 130, beginner-faq 157
- **字段完整性**: 每条含 id/type/title/keywords/riskLevel/sourceFile/directLinkHint

### search-suggestions.json
- **解析**: ✅
- **条目**: 434
- **优先级分布**: priority=1: 40, priority=2: 63, priority=3: 12, priority=5: 319
- **字段完整性**: 每条含 keyword/type/priority/category

### risk-keywords.json
- **解析**: ✅
- **条目**: 40
- **风险类型分布**: 刀补方向 2, 刀长补偿 1, 局部坐标系 1, 坐标系 2, 工件坐标系 1, 回零操作 1, 对刀操作 1, 半径补偿 2, 参数修改 1, 回零参数 1, 进给参数 1, 行程极限 1, 伺服报警 1, 伺服过电流 1, 主轴方向 2, 换刀操作 1, 主轴定向 1, 快移碰撞 1, 恒线速 1, 钻孔 1, 攻丝 2, 刀补取消 1, 刀长取消 1, 行程超限 1, 安全操作 1, 刚性攻丝 1, 编码器电池 1, 编码器通信 1, 编码器断线 1, 伺服超差 1, 移动超差 1, 主轴过热 1, 主轴电流 1
- **字段完整性**: 每条含 keyword/riskType/riskMessage/recommendedGuard

### entry-lookup-map.json
- **解析**: ✅
- **条目**: 2339
- **字段完整性**: 每条含 keyword/targetType/targetId/reason
- **去重**: 已按 keyword+targetId 去重

### faq-unified.json
- **解析**: ✅
- **条目**: 417（alarm=130, param=130, beginner=157）
- **字段完整性**: 每条含 id/faqType/title/question/shortAnswer/fullAnswer/riskNote/relatedKeywords/reviewStatus/sourceFile
- **reviewStatus 分布**: draft=417

### faq-high-risk-only.json
- **解析**: ✅
- **条目**: 218
- **筛选逻辑**: riskNote 非空 OR fullAnswer 含风险关键词 OR id 在白名单中
- **字段完整性**: 同 faq-unified.json

### faq-review-queue.json
- **解析**: ✅
- **条目**: 130
- **优先级分布**: P0=10, P1=46, P2=74
- **字段完整性**: 每条含 id/faqType/title/priority/reason

## 未通过验证

无。所有 8 个 JSON 文件均解析成功。

## 风险提示

1. **reviewStatus 问题**: faq-unified.json 中所有 417 条均标记为 draft，接入生产前需人工确认至少 P0 条目
2. **faq-high-risk 召回率**: 当前基于关键词启发式判定，可能遗漏边界情况（详细风险讨论温和但实际危险的操作）
