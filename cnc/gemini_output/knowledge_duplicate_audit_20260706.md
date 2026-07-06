# 知识库重复与冗余条目深度审计报告 (2026-07-06)

**文档状态**：DRAFT (可交接)  
**清洗执行**：3号 (Gemini CLI)  
**项目分区**：F:\AI工作台\cnc_param_quickfinder  

---

## 一、标题完全重复条目审计 (TITLE_DUPLICATE)

在全量合并 1974 条数据源后，清查出了多组由于数据合并产生的 **标题重合性冲突**：

1.  **M03 / M04 / M05 主轴控制**：
    *   *冲突源*：`m03-m04-m05` (位于 `data.js`) 与 `learn-m03-m05` (位于 `knowledge-core-03.js`)。
    *   *危害*：导致前台工作区左侧列表显示两个重合的主轴控制词条，点击时逻辑分流，内容不一致。
    *   *处理建议*：**合并**。保留 `data.js` 的完整版本，直接从 Core-03 中将 `learn-m03-m05` 物理剥离。
2.  **M06 自动换刀**：
    *   *冲突源*：`m06-tool-change` (在 `data.js`) 与 `learn-m06` (在 `knowledge-core-03.js`)。
    *   *处理建议*：保留 data.js 内的主版本，废弃 Core 版。
3.  **M08 / M09 冷却液控制**：
    *   *冲突源*：`m08-m09-coolant` (在 `data.js`) 与 `learn-m08-m09` (在 `knowledge-core-03.js`)。
    *   *处理建议*：合并保留 data.js 版本。

---

## 二、主题近重复与过度拆分审计 (THEME_OVERLAP)

有些条目标题虽有细微差异，但实质探讨的是同一个现场操作流程，导致内容拆得太碎：

1.  **回零故障专题**：
    *   *重叠条目*：`fault-home-fail` ("回不了零点时先查什么") 与 `fault-home-reference` ("回零失败与参考点异常")。
    *   *分析*：两者都是在讲回机械原点受阻的排障步骤。多头存在只会分流操机工的检索思路。
    *   *建议*：**融并**。将“参考点异常”的参数检查部分，归并入“回不了零点时先查什么”的 `warning` 和 `checklist` 字段中，对外只暴露一个干净入口。
2.  **工件坐标偏置与零点**：
    *   *重叠条目*：`learn-g54-g59` ("G54-G59 工件坐标系") 与 `G54-G59 工件坐标系偏置详解` (在 supplement 映射的条目中)。
    *   *建议*：统一以 `learn-g54-g59` 为主词条。

---

## 三、占位符与低价值测试条目 (DRAFT_PLACEHOLDER)

这类条目在批量转换时产生，不应被检索命中或直接呈现在列表上：

*   **草稿大类节点**：
    *   `kb-root-01_编程基础` 等 README 目录。
    *   `example` 字段填充为 `"???????????????????????"` 的占位符词条。
    *   *审计结论*：这部分条目有 **300 多条**，均已被我们在 [knowledge_duplicate_candidates.json](file:///F:/AI工作台/cnc_param_quickfinder/gemini_output/knowledge_duplicate_candidates.json) 中标记为 `DRAFT_STANDBY` 状态，建议在前台渲染和词频打分时直接屏蔽，避免其在搜索框干扰高价值数据。

---

## 四、给 Codex 的物理清理与重构工单

1.  **物理删除/隐藏操作**：
    *   加载 `knowledge_duplicate_candidates.json`。
    *   若 `suggestedAction` 为 `MERGE_OR_DELETE_DRAFT`，则在脚本中直接将对应的条目从 `knowledge-core-*.js` 数组中物理移除，实现干净打包。
2.  **草稿归入 Standby**：
    *   若 `suggestedAction` 为 `HIDE_OR_DEPRECATE`，则在其对象属性中增加 `status: "draft"` 标记，前台检索逻辑中自动过滤 `entry.status === 'draft'` 的节点。
