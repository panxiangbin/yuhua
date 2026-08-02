# AI CNC老师一次性交接无障碍焦点与播报契约

## 目标

AI CNC老师把高风险阻断或安全原理问题一次性交给判断说明页后，零基础用户必须立即知道当前发生了什么。视力正常用户、键盘用户和屏幕阅读器用户应获得一致的状态，不得只依赖颜色、视觉位置或页面自动滚动判断结果。

本契约只服务 `cnc/ai-teacher-explainability.html`，不改变分类规则，不提供固定上机值、参数写入步骤、安全联锁绕过、盲目复位或现场放行方法。

## 必须满足的焦点规则

1. 合法的一次性交接被消费并完成判断后，焦点必须落到 `#result-title`。
2. 手动提交问题或点击示例问题后，焦点同样必须落到 `#result-title`。
3. `#result-title` 使用 `tabindex="-1"`，只允许程序化聚焦，不进入普通 Tab 顺序。
4. 页面没有交接数据且没有判断结果时，不得抢占焦点到隐藏状态或隐藏结果标题。
5. SessionStorage 不可用、交接过期或交接损坏时，焦点必须落到 `#handoff-note`，让用户先听到恢复提示。
6. 真实 BFCache 返回后，已消费的问题和结果必须继续保持清空，焦点必须落到 `#handoff-note`，不得回到旧判断标题。
7. `pagehide` 清理阶段不得主动抢焦点；只有页面重新可见并确认 BFCache 恢复后才允许聚焦恢复状态。

## 必须满足的屏幕阅读器语义

- `#handoff-note` 必须保持 `role="status"`、`aria-live="polite"`、`aria-atomic="true"`。
- `#result` 必须是命名清晰的结果区域，使用 `role="region"`。
- `#result` 必须由 `aria-labelledby="result-title"` 命名，并由 `aria-describedby="result-reason"`关联判断理由。
- `#result` 必须使用 `aria-live="polite"` 和 `aria-atomic="true"`，避免高风险判断被拆成难以理解的零碎播报。
- 问题输入框必须通过 `aria-describedby="question-help"`说明问题只在本地规则中处理，不上传，也不进入长期学习记录。
- 交接成功、存储不可用、交接失效和 `consumed-cleared` 必须使用不同中文提示，不得只显示统一的“操作完成”。

## 可见焦点

`#result-title` 和 `#handoff-note` 被程序化聚焦时必须显示至少 2px 的清晰轮廓。不得通过 `outline:none` 或仅改变轻微颜色隐藏焦点位置。

## 隐私与异常恢复

- 临时问题只能使用当前标签页 SessionStorage。
- 问题不得进入 URL、LocalStorage、IndexedDB、成长档案、错题记录或站外接口。
- 消费后必须立即清除固定键。
- BFCache 返回不得恢复已消费的问题文本或判断结果。
- SessionStorage 抛出 `SecurityError` 时不得降级到其他长期存储。
- 独立标签页不得读取另一个标签页的临时问题。

## 自动门禁

390×844 Chromium 门禁必须真实验证：

1. 一次性交接成功后活动元素为 `result-title`；
2. 手动判断和示例判断后活动元素为 `result-title`；
3. 存储不可用时活动元素为 `handoff-note`；
4. 没有交接数据时不聚焦隐藏状态或隐藏结果；
5. `pageshow.persisted === true` 的真实 BFCache 返回后活动元素为 `handoff-note`；
6. 上述焦点均有可见轮廓；
7. ARIA 角色、命名、描述和 live region 属性完整；
8. 页面无浏览器错误、无站外请求；
9. 原有一次性交接消费、异常恢复和分类回归继续执行，不能由新测试替代。

不得使用普通刷新冒充 BFCache，不得删除测试、降低断言、跳过步骤或把 cancelled/skipped 当作成功。

## CNC技术与安全边界

判断说明仅用于教学分流。涉及具体机床参数、报警、刀补、联锁和恢复操作，必须核对相同版本原厂手册、企业制度、受控工艺和现场条件，并由授权人员确认。资料清单与逐条复核记录不能互相替代，未逐条复核内容不可直接上机。
