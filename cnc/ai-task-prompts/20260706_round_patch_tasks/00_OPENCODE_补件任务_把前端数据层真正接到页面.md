# 0号补件任务：把前端数据层真正接到页面

你是0号（OPENCODE）。

你的回复开头必须写：

`0号回复：`

你这次不要再生产新数据包了。
你要做的是把你已经做好的 `opencode_frontend_ready` 数据层，真正接到项目页面里，至少做到“前端可实际读取并使用”。

你可以读取和修改本地文件。

---

## 一、任务目标

当前已有目录：

`F:\AI工作台\cnc_param_quickfinder\opencode_frontend_ready\`

其中重点文件：

- `data-manifest.json`
- `search-index-light.json`
- `search-suggestions.json`
- `risk-keywords.json`
- `entry-lookup-map.json`
- `faq-unified.json`
- `faq-high-risk-only.json`
- `faq-review-queue.json`

你的任务是：

让当前网页项目至少能在一个真实前端入口里消费这批数据，而不是只把 JSON 放在那里。

---

## 二、必须完成的事

### 任务A：接入搜索联想

你要检查项目现有搜索入口，然后实现：

- 搜索框联想建议读取 `search-suggestions.json`
- 至少让用户输入时，能基于本地 JSON 弹出建议项

要求：

- 不要大改现有 UI
- 最小改动接入
- 如果当前页面已有搜索组件，就复用它

---

### 任务B：接入轻量搜索索引

让搜索至少能用到：

- `search-index-light.json`

你不需要做完整搜索引擎，但至少要做到：

- 输入 `G02`、`G2`、`快移`、`对刀`、`回零` 这类词时，有明确命中路径

---

### 任务C：接入风险提醒

让搜索结果或详情页至少有一个位置能消费：

- `risk-keywords.json`

要求：

- 如果命中高风险词，页面出现明显风险提醒
- 先做最小版本，不追求完美设计

---

### 任务D：接入 FAQ 层（最小版）

至少选一个页面或一个测试入口，让：

- `faq-unified.json`

中的数据能被实际加载出来。

要求：

- 可以只做一个开发入口
- 可以先只展示一类 FAQ
- 但必须是真实运行，不是只写说明

---

### 任务E：生成接入说明

请生成：

`F:\AI工作台\cnc_param_quickfinder\OPENCODE_FRONTEND_INTEGRATION_REPORT_20260706.md`

写清：

- 改了哪些文件
- 哪些 JSON 真接进去了
- 现在用户在哪能看到效果
- 还没接的部分是什么

---

## 三、验证要求

你必须自己验证：

1. 改完后的前端文件仍可正常加载
2. 相关 JSON 路径真实能读到
3. 至少给出 3 个可复测的示例查询
4. 如果你启动了本地验证，写清访问方式

---

## 四、回复格式

只汇报：

1. 改了哪些文件
2. 接入了哪几个 JSON
3. 现在在哪个页面能看到效果
4. 哪些部分还没做
