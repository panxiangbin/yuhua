# Round5 可直接复制提示词入口

生成时间：2026-07-03  
用途：这些是可以直接双击打开、复制给其它 AI 的长任务提示词。

---

## 1. 6号：搜索 P0 落地方案

文件：

```text
PROMPT_ROUND5_6_SEARCH_P0_20260703.txt
```

用途：给 Grok / 搜索方案 AI。

任务重点：

- 搜索权重体系。
- 数控同义词表。
- 可集成 JS 代码片段。
- 30 个搜索测试用例。

---

## 2. 4号：真实 AI 助手后端架构

文件：

```text
PROMPT_ROUND5_4_REAL_AI_BACKEND_20260703.txt
```

用途：给 ChatGPT / 产品与接口设计 AI。

任务重点：

- 后端代理接口。
- Claude API 接入原则。
- 结构化 JSON 返回。
- 安全二次校验。
- 40 个测试问题。

---

## 3. 3号：知识图谱应用化

文件：

```text
PROMPT_ROUND5_3_KNOWLEDGE_GRAPH_20260703.txt
```

用途：给 Gemini CLI / 数据结构 AI。

任务重点：

- knowledge_graph.json 审计。
- 关系类型规范。
- 六条核心知识链路。
- 图谱驱动推荐、学习路径、AI 上下文。
- 数据治理规则。

---

## 4. 2号：浏览器全流程验收

文件：

```text
PROMPT_ROUND5_2_BROWSER_ACCEPTANCE_20260703.txt
```

用途：给 Claude Code / 浏览器验证 AI。

任务重点：

- 路由验收。
- 学习卡片验收。
- 详情页新增模块验收。
- 搜索验收。
- 移动端验收。
- P0/P1/P2/P3 问题分级。

---

## 5. 5号：产品信息架构评审

文件：

```text
PROMPT_ROUND5_5_PRODUCT_IA_20260703.txt
```

用途：给 Gemini 网页版 / 产品体验 AI。

任务重点：

- 首页评审。
- 工作台评审。
- 用户角色分析。
- 快捷入口建议。
- 文案建议。
- 不建议现在做的功能。

---

## 6. 4号 Round4 方案留档

文件：

```text
CHATGPT_REAL_AI_ASSISTANT_PLAN_ROUND4_20260703.md
```

用途：保存用户提供的 4号真实 AI 助手方案，并附上 1号采纳与修正意见。

---

## 建议复制顺序

1. 先发 `PROMPT_ROUND5_6_SEARCH_P0_20260703.txt`。
2. 再发 `PROMPT_ROUND5_2_BROWSER_ACCEPTANCE_20260703.txt`。
3. 再发 `PROMPT_ROUND5_3_KNOWLEDGE_GRAPH_20260703.txt`。
4. 再发 `PROMPT_ROUND5_4_REAL_AI_BACKEND_20260703.txt`。
5. 最后发 `PROMPT_ROUND5_5_PRODUCT_IA_20260703.txt`。

原因：

- 搜索和浏览器验收最影响当前可用性。
- 图谱决定推荐和学习路径质量。
- AI 后端是长期能力，可以并行设计。
- 产品 IA 用于指导下一轮首页和工作台改造。
