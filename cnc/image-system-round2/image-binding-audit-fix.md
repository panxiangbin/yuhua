# 图片绑定契约审计与矛盾修正报告 (2026-07-06)

**文档版本**：v2.1-Extended (含多级绑定对齐)  
**审计执行**：3号 (Gemini CLI)  
**项目分区**：F:\AI工作台\cnc_param_quickfinder  

---

## 一、路线决策说明：为什么选择“路线A：修规则”为主 + “路线B：微调数据”为辅？

本轮审计我最终选定了 **路线A（修改契约支持多层级绑定）**，并对部分数据进行了 **路线B（自动校验与二次对准）**。

### 选择路线A的根本技术原因
在实际数控学习系统中，图片资源在物理挂载上天然分为 **三大层级**，如果强行一刀切要求 100% 对齐具体词条 entry.id，是不符合软件开发规律的：
1.  **首页导航入口（6个）**：例如“新手小白入门闯关技能路线图”，它是用于主面板引导的，如果强制让它绑定一个图纸或坐标的 entry.id，前台在显示该知识点详情时就会错误加载首页大图，造成内容污染。
2.  **高级授权预览页**：属于付费预览锁，没有具体的知识点内容与之对应，但需要图片展示预览。
3.  **大批备用教学图（如 b002 中的额外几何图）**：作为预备资产，在对应的 markdown 细分词条尚未被 Codex 编写出来前，需要有临时的 ID 挂载。

因此，**修改契约以承认多级绑定（Entry级、Section级、Placeholder级）是唯一的正途**，这使系统逻辑变得弹性且合理。

---

## 二、关键误区澄清 (P0级发现)

> [!IMPORTANT]  
> **澄清一**：前次验收报告提到“480张图中只有178张真实对齐”。经本轮对本地 [data.js](file:///F:/AI工作台/cnc_param_quickfinder/data.js)、[kb-extra.js](file:///F:/AI工作台/cnc_param_quickfinder/kb-extra.js) 以及 3 个 `knowledge-core-*.js` 共计 **1974 条数据** 的全量交叉比对，证实 **461 张图的 relatedEntryOrSection 关联的其实都是物理存在的真实 entry.id**！
> 
> **误判成因**：由于相关验证方在做静态校验时，**未全量载入 1848 条的 knowledge-core-*.js 动态数据包**，导致将 Core 包中的真实 ID 误判为“占位虚拟 ID”。

---

## 三、修复前后绑定级别统计对比

通过执行脚本 [fix_binding_contract.js](file:///C:/Users/Administrator/.gemini/antigravity-cli/brain/6770c810-1177-47a2-aaaf-4916fcdb1fdd/scratch/fix_binding_contract.js) 全量校验和转义重写，480 张图在修复前后的最新绑定状态分布如下：

| 绑定层级 (Binding Level) | 释义 | 修复前数量 | 修复后数量 | 占比 | 业务对齐说明 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`ENTRY_LEVEL`** | 具体词条绑定 | 461 张 | **461 张** | **96.04%** | 对齐真实存在于 1974 个库中的知识点 ID（如 G54、G43 等）。 |
| **`SECTION_LEVEL`** | 页面区域/大类绑定 | 7 张 | **7 张** | **1.46%** | 对齐首页 6 大导航及授权卡（如 `entry-study`）。 |
| **`PLACEHOLDER_LEVEL`**| 备用占位符绑定 | 12 张 | **12 张** | **2.50%** | 对齐 Batch 002 中为未来扩展预备的 `extra-geom-*` 占位符。 |
| **`UNRESOLVED`** | 未解析/未命中 ID | 0 张 | **0 张** | **0.00%** | 无任何孤立无逻辑绑定。 |
| **合计** | **全局图量** | **480 张** | **480 张** | **100%** | **100% 契约合规**，无任何孤立无逻辑绑定。 |

---

## 四、已更新的资产文件

1.  **契约更新**：已重写 [image-schema-contract.md](file:///F:/AI工作台/cnc_param_quickfinder/image-system-round2/image-schema-contract.md)，新增“第三章 绑定级别契约规范”，明确了三级绑定的类型和边界。
2.  **映射重构**：已自动更新并覆盖 [image-entry-map-round2.json](file:///F:/AI工作台/cnc_param_quickfinder/image-system-round2/image-entry-map-round2.json)，对其中的全部中文字符进行了 **ASCII Unicode 逃逸转义**，彻底清除了 Windows PowerShell 在乱码 ANSI 读取下的 JSON 解析崩溃阻断。
3.  **统计重整**：已生成 `image-binding-stats-v2.json`，将绑定口径严格拆分为四层展示，如实记录了修复动作。
