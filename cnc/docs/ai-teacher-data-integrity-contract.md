# AI CNC老师学习档案异常处理契约

## 目标

AI CNC老师只能依据可解析、根结构为对象的本机学习档案生成个性化建议。任何受管数据键出现 JSON 损坏或根结构异常时，不得把异常数据静默替换为空档案，也不得继续显示“0/12”“0道错题”等容易被误认为真实进度的结果。

受管数据键：

- `cnc_training_profile_v1`
- `cnc_training_practice_v1`
- `cnc_training_simulator_v1`
- `cnc_training_exam_v1`

## 强制行为

1. 逐键区分“尚无记录”与“记录存在但损坏”。
2. 任一受管键损坏时，页面必须显示可见且可访问的数据异常提示。
3. 课程进度、错题数、模拟通过数和薄弱能力不得继续以正常个性化结果呈现。
4. `window.CNC_AI_TEACHER.initialSummary` 与 `getSummary()` 等公开摘要接口必须同步进入 `integrity: 'blocked'` 状态，进度、错题、模拟和薄弱能力字段必须返回 `null`，不得继续向页面外部消费者暴露可信零值。
5. “下一步学什么”等依赖学习档案的问题必须暂停个性化判断，明确说明依据不可靠。
6. 异常处置必须提供：
   - `data-health.html` 学习数据健康检查；
   - `data-backup.html` 备份与恢复。
7. 页面只读，不得自动覆盖损坏数据，不得清空其他 LocalStorage，不得修改成绩、XP、错题、连续训练、徽章或奖励记录。
8. 高风险 CNC 技术内容仍必须注明适用范围，并要求核对相同系统和机型的原厂手册、企业制度、受控工艺及现场条件，由授权人员确认。

## 验收

`cnc/tests/ai-teacher-data-integrity-smoke.cjs` 使用 390×844 Chromium 写入真实损坏 JSON 后验证：

- 静默 `catch { return {} }` 回退不存在；
- 显式异常提示可见；
- 页面汇总不再伪装成真实零进度；
- `initialSummary` 与 `getSummary()` 均返回阻断状态和空结论，不泄漏伪造零进度；
- 个性化推荐被阻断；
- 数据健康和备份恢复入口均存在；
- 无关 LocalStorage 保持不变；
- 可见链接和按钮触控尺寸不小于 44px；
- 失败时保留 JSON、日志、错误栈和页面截图。

不得删除测试、降低断言、跳过 Chromium、把 `cancelled` 或 `skipped` 当作成功，也不得用重置全部本地数据代替异常诊断。
