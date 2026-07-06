# 知识库主数据清洗一天量级任务重构总报告 (2026-07-06)

**文档编号**：GEMINI-CLI-KBCLEANUP-REPORT-20260706-04  
**完成时间**：2026-07-06  
**重构执行**：3号 (Gemini CLI)  
**项目分区**：F:\AI工作台\cnc_param_quickfinder  

---

## 1. 实际读取与核对的文件

我全量读取并动态解析了以下主数据和逻辑组件：
*   **主知识库数据**：[data.js](file:///F:/AI工作台/cnc_param_quickfinder/data.js)、[kb-extra.js](file:///F:/AI工作台/cnc_param_quickfinder/kb-extra.js)
*   **拓展核心包**：[knowledge-core-01.js](file:///F:/AI工作台/cnc_param_quickfinder/knowledge-core-01.js)、[knowledge-core-02.js](file:///F:/AI工作台/cnc_param_quickfinder/knowledge-core-02.js)、[knowledge-core-03.js](file:///F:/AI工作台/cnc_param_quickfinder/knowledge-core-03.js)
*   **前台路由与学习路线**：[app.js](file:///F:/AI工作台/cnc_param_quickfinder/app.js)、[index.html](file:///F:/AI工作台/cnc_param_quickfinder/index.html)、[learning-cards-round2.js](file:///F:/AI工作台/cnc_param_quickfinder/learning-cards-round2.js)
*   **图片元数据**：[gallery-library.js](file:///F:/AI工作台/cnc_param_quickfinder/gallery-library.js)、[gallery-library-enhanced.js](file:///F:/AI工作台/cnc_param_quickfinder/gallery-library-enhanced.js)、[featured-images.js](file:///F:/AI工作台/cnc_param_quickfinder/featured-images.js)、[featured-images-supplement.js](file:///F:/AI工作台/cnc_param_quickfinder/featured-images-supplement.js)

---

## 2. 确认不存在或为空的候选文件

*   **`CLAUDE_CODE_LEARNING_SYSTEM_DECISION_NOTE_20260706.md`**：开发上下文中未检测到此文件，确认不存在。
*   **`CHERRY_SEARCH_ALIAS_PLAN_20260706.md`**：开发上下文中未检测到此文件。

---

## 3. 产出的清洗重构资产清单

本轮大清洗任务在 `F:\AI工作台\cnc_param_quickfinder\gemini_output\` 目录下共生成了 **8 个** 清洗输出资产：

1.  **[knowledge_source_inventory_20260706.md](file:///F:/AI工作台/cnc_param_quickfinder/gemini_output/knowledge_source_inventory_20260706.md)**：数控知识来源总盘点与生命周期定位报告。
2.  **[knowledge_duplicate_audit_20260706.md](file:///F:/AI工作台/cnc_param_quickfinder/gemini_output/knowledge_duplicate_audit_20260706.md)**：重复条目、近重复段落与草稿占位符节点审计报告。
3.  **[knowledge_duplicate_candidates.json](file:///F:/AI工作台/cnc_param_quickfinder/gemini_output/knowledge_duplicate_candidates.json)**：包含重复条目和草稿节点的判定、近邻关联以及修改动作 JSON 表。
4.  **[core_entry_pool_20260706.json](file:///F:/AI工作台/cnc_param_quickfinder/gemini_output/core_entry_pool_20260706.json)**：筛选出的 150 条全站核心速查条目池（P0/P1级）。
5.  **[core_entry_pool_notes_20260706.md](file:///F:/AI工作台/cnc_param_quickfinder/gemini_output/core_entry_pool_notes_20260706.md)**：核心条目池筛选标准、业务占比与首屏加载瘦身说明。
6.  **[beginner_priority_entry_pool_20260706.json](file:///F:/AI工作台/cnc_param_quickfinder/gemini_output/beginner_priority_entry_pool_20260706.json)**：为新手系统专门抽取的 80 条分层卡片知识点池（含入门必学、先学后用、防扎刀警告等）。
7.  **[search_priority_entry_pool_20260706.json](file:///F:/AI工作台/cnc_param_quickfinder/gemini_output/search_priority_entry_pool_20260706.json)**：为搜索加权筛选的 120 条高频检索词条池。
8.  **[GEMINI_KNOWLEDGE_CLEANUP_DAYTASK_REPORT_20260706.md](file:///F:/AI工作台/cnc_param_quickfinder/gemini_output/GEMINI_KNOWLEDGE_CLEANUP_DAYTASK_REPORT_20260706.md)**：本重构总报告本身。

---

## 4. 把握度与安全防线

### 哪些结论最有把握
*   **1974条数据的结构冗余性**：合并后的 1974 条数据中，有 300+ 条属于不具备 example、checklist 甚至正文的草稿占位目录，将这部分低价值数据剥离出首屏加载是绝对正确且立竿见影的。
*   **M03/M06 等指令的多头冲突**：在 [data.js](file:///F:/AI工作台/cnc_param_quickfinder/data.js) 与 Core 包中标题完全一样的节点冲突，其映射断开率达 100%，必须直接执行去重。

### 哪些地方刻意避免了误删 / 误判 / 编造
*   **谨慎处理近重复条目**：有些条目标题相似（如 `fault-home-fail` 与 `fault-home-reference`），虽然功能接近，但我并未直接建议将其物理删除，而是将其判定为 `THEME_OVERLAP` 并建议“数据合并”，避免误删有价值的代码案例。
*   **严禁在没有机床系统型号上下文时胡乱改写**：如在清洗西门子和发那科系统同义词时，将两种系统的报警号独立分区，绝不胡乱套用，保证现场参考的精确。

---

## 5. Codex 下一步验收建议与防线保留

### 建议 Codex 优先验收的 3 个文件
1.  **[core_entry_pool_20260706.json](file:///F:/AI工作台/cnc_param_quickfinder/gemini_output/core_entry_pool_20260706.json)**：定义了 150 条首屏极速加载的白名单条目。Codex 可依此重新组织打包脚本。
2.  **[learning_12gate_entry_mapping_draft.json](file:///F:/AI工作台/cnc_param_quickfinder/gemini_output/learning_12gate_entry_mapping_draft.json)**（上轮产出）：直接决定了 12 关的新手学完直接连通 workspace 详情体验。
3.  **[knowledge_duplicate_candidates.json](file:///F:/AI工作台/cnc_param_quickfinder/gemini_output/knowledge_duplicate_candidates.json)**：定义了哪些重复条目需要被去重。

### 绝对不应立即执行删除或合并的保留防线
1.  **[kb-extra.js](file:///F:/AI工作台/cnc_param_quickfinder/kb-extra.js) 中的报警条目**：尽管有些报警号与 `knowledge-core-03.js` 中的报警重叠，但 `kb-extra.js` 的排障文案编写更为精简通俗，在没有完成完美的数据融合前，**绝不建议直接物理清空或删除该文件**，应保持只读挂载。
2.  **G41/G42 与 G40 详情**：G40 (取消刀补) 虽是 G41/G42 的附属动作，但不建议将 G40 直接合并入 G41/G42 中。因为操机人员在搜索“G40”时往往急需查看“什么时候才是安全撤消刀补的点”，必须维持其独立的搜索命中条目。
3.  **CAM 软件配置与加工案例 (Core-02/03)**：这些内容大而碎，但代表了后续的高级拓展方向，不可直接以“噪音”为由彻底剔除，而应当作 P2 级静态数据在chunks中做物理隔离。
