# 数控工程师工作平台 - 第二轮数据交付报告
报告日期：2026-07-03  
签发AI：3号 (Gemini CLI)

本报告详细说明了本轮交付给前端开发团队（由1号 AI 执行）的核心配置与数据资源，方便前后端进行轻量级适配与页面模块数据集成。

---

## 一、 本轮交付文件清单及用途说明

### 1. [MOBILE_PAGE_SPEC_ROUND2_20260703.md](file:///F:/AI工作台/cnc_param_quickfinder/MOBILE_PAGE_SPEC_ROUND2_20260703.md)
*   **解决的前端问题**：为前端提供了一份纯文本、高度精准的**手机优先 UI 设计规范书**。规范了 6 大手机端页面的展示层、逻辑流和数据流，确保在 360px 至 414px 宽度的窄屏下交互防错，防止前端页面排版崩溃。

### 2. [learning-cards-round2.js](file:///F:/AI工作台/cnc_param_quickfinder/learning-cards-round2.js)
*   **解决的前端问题**：交付了 12 张结构完整、内容精良的“新手闯关卡片”。提供小白、操作、进阶三层关卡的描述、目标、翻转测验题目以及标准答案，让前端可以直接以交互翻转卡的形式呈现场景式学习。

### 3. [home-entries-config.js](file:///F:/AI工作台/cnc_param_quickfinder/home-entries-config.js)
*   **解决的前端问题**：为首页提供了 6 个高频核心入口（新手学习、G/M代码、报警排查、参数速查、工艺刀具、换算工具）的独立元数据配置，包含受众、首屏展示目标与热点关键词，免去前端在页面中生硬地硬编码（Hard-coding）分类入口。

### 4. [premium-preview-cards.js](file:///F:/AI工作台/cnc_param_quickfinder/premium-preview-cards.js)
*   **解决的前端问题**：为后续的授权访问机制交付了 12 套不同营销维度的“高级资料预览卡片”，包含钛合金切削、西门子报警自诊断、攻丝螺纹匹配等核心价值内容，让未授权用户在遇到私密资源时能获得非常友好、非强制的价值引导卡片。

---

## 二、 数据文件字段的强约束规范

为保障前端逻辑及渲染的正确性，以下数据字段属于**强约束，请前端切勿乱改或擅自变更其类型**：

### 1. 闯关卡片数据 (`learning-cards-round2.js`)
*   `id`：必须保持为 `card-xxx` 的格式，用以维持唯一的学习路径追踪状态。
*   `stage`：必须为数值型，代表该关卡所处的物理阶段（1=小白，2=操作，3=进阶）。
*   `nextTopic`：关卡流的解锁指针，指向下一个卡片的 `id`；若为关底则必须为 `"completed"`，用于触发解锁打卡与打卡日历记录。
*   `answer`：存储单选题的标准答案文本，需与答题校验组件直接对齐。

### 2. 首页核心入口数据 (`home-entries-config.js`)
*   `id`：固定为 `entry-xxx` 的格式，与 `index.html` 中的模块跳转路由锚点（Route Anchor）直接配对。
*   `priority`：数值型，决定了在小屏下进行 CSS 布局自适应折行时的相对展示次序（数字越小优先级越高）。

### 3. 高级资料预览卡 (`premium-preview-cards.js`)
*   `scene` 与 `suitableFor`：用于向用户直观展示本卡片的高级工艺场景与受众类型，前端需高亮加粗展示。

---

## 三、 后续内容扩充计划

*   **图片资源对齐**：当前卡片中定义的 `imageType`（如 `drawing_symbol`, `coordinate_diagram`, `tool_compare`）目前暂由前端使用 SVG 或 category 的默认 WebP 配图进行降级替代。后续随着 96 张大图的补齐，需将 `imageType` 精确映射到 `assets/images/` 下真实的 WebP 文件名。
*   **计算器组件绑定**：`home-entries-config.js` 中的“换算工具”入口和计算卡片，需在后续与 ChatGPT 所开发的 10 个独立计算器 HTML 页面进行 JS 接口层打通。
*   **学习卡题库扩展**：目前的 12 张学习卡题目较为轻量，后续可配合 40,439 条理论考试题库，在每张卡片答题完毕后关联推荐 3-5 道进阶真题。

【3号回复】
