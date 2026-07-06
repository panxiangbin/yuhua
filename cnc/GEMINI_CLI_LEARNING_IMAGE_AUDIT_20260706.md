# 12关学习系统与图片数据现状深度审计报告

**文档编号**：GEMINI-CLI-AUDIT-20260706-02  
**分析时间**：2026-07-06  
**主分析位**：3号 (Gemini CLI)  

---

## 编者按
本审计报告基于本地项目的实际数据文件运行结果（包含学习卡片 [learning-cards-round2.js](file:///F:/AI工作台/cnc_param_quickfinder/learning-cards-round2.js)、匹配规则 [app.js](file:///F:/AI工作台/cnc_param_quickfinder/app.js)、主数据 [data.js](file:///F:/AI工作台/cnc_param_quickfinder/data.js)、图片库 [gallery-library.js](file:///F:/AI工作台/cnc_param_quickfinder/gallery-library.js) 等），对 12 关学习系统的匹配状态以及图片元数据文件现状进行了精准诊断。旨在为 Codex 提供下一阶段内容解耦、规则重构和图片库整合的可靠底稿。

---

## 第一部分：12关学习系统状态总表

通过模拟前端 [app.js](file:///F:/AI工作台/cnc_param_quickfinder/app.js) 的 `STUDY_CARD_MATCH_RULES` 对 [learning-cards-round2.js](file:///F:/AI工作台/cnc_param_quickfinder/learning-cards-round2.js) 里的 12 张卡片标题进行匹配，发现**当前 12 关中只有第 2 关能够成功完成映射与详情渲染，其余 11 关在点击时全部断开**。

### 12关学习系统审计状态总表

| 关卡编号 | 卡片标题 | 匹配规则标题 (Rule) | 映射知识点ID (Entry) | 详情页面状态 | 精选图片状态 | 诊断问题说明 | 建议优先级 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **第 1 关** | 看图与认路：识读机械图纸符号 | 认识零件的身份证 | `NONE` (匹配断开) | 无法打开 | `NONE` (无配图) | 规则标题不匹配，找不到对应条目；实际应映射到知识库中的 `drawing-symbol`。 | **P0** (门面关卡) |
| **第 2 关** | 机床的东南西北：认识机床坐标轴 | 机床的东南西北 | `learn-coordinate-system` | **完整可用** | 2张精选图已匹配 (坐标系图、面板图) | 标题刚好重合匹配成功。详情和配图均可流畅展现。 | **-** (已完成) |
| **第 3 关** | 机床的安全归宿：开机手动回零 | `NONE` (无此规则) | `NONE` (匹配断开) | 无法打开 | `NONE` (无配图) | 匹配规则完全缺失，无法关联 `fault-home-fail` 或 `learn-g28-g29` 等知识点。 | **P0** (安全关卡) |
| **第 4 关** | 告诉机床从哪开始：工件坐标系设定 | 告诉机床活儿在哪 | `NONE` (匹配断开) | 无法打开 | `NONE` (无配图) | 标题不匹配（"工件坐标系设定" 无法与 "告诉机床活儿在哪" 达成模糊匹配）。应映射到 `learn-g54-g59`。 | **P0** (核心概念) |
| **第 5 关** | 车床与铣床的手动对刀秘诀 | `NONE` (无此规则) | `NONE` (匹配断开) | 无法打开 | `NONE` (无配图) | 规则缺失。应映射到 `learn-coordinate-system` 中对刀段落或新建对刀专题。 | **P0** (实操核心) |
| **第 6 关** | 刀长偏置 G43 的安全防扎刀技巧 | `NONE` (无此规则) | `NONE` (匹配断开) | 无法打开 | `NONE` (无配图) | 规则缺失。实际应映射到知识库中的 `learn-g43-g44-g49`。 | **P1** (防扎刀必学) |
| **第 7 关** | 认识你的武器：铣刀与车刀的选型 | `NONE` (无此规则) | `NONE` (匹配断开) | 无法打开 | `NONE` (无配图) | 规则缺失。应映射到刀具工艺分类中的 `tool-drill-selection` 等。 | **P1** |
| **第 8 关** | 干活的节奏：切削速度与进给换算 | `NONE` (无此规则) | `NONE` (匹配断开) | 无法打开 | `NONE` (无配图) | 规则缺失。应关联参数换算条目 `calc-vc-rpm`，且应在详情中绑定计算器。 | **P1** |
| **第 9 关** | 顺铣与逆铣的受力及表面粗糙度区别 | `NONE` (无此规则) | `NONE` (匹配断开) | 无法打开 | `NONE` (无配图) | 规则缺失。应映射到工艺底层的 `process-allowance-basics` / `process-surface-roughness`。 | **P1** |
| **第 10 关** | 让机床动起来：G00 至 G03 指令轨迹 | `NONE` (无此规则) | `NONE` (匹配断开) | 无法打开 | `NONE` (无配图) | 规则缺失。实际应关联代码编程的 G00/G01/G02/G03 相关条目。 | **P0** (高崩刀风险) |
| **第 11 关** | 打包的高级动作：G83啄钻与孔固定循环 | `NONE` (无此规则) | `NONE` (匹配断开) | 无法打开 | `NONE` (无配图) | 规则缺失。实际应映射到 `learn-g81-g83`。 | **P1** |
| **第 12 关** | 机床的脾气：伺服超程与常用报警自排障 | `NONE` (无此规则) | `NONE` (匹配断开) | 无法打开 | `NONE` (无配图) | 规则缺失。应映射到报警排障类条目 `fault-limit-switch` 或 `learn-fanuc-alarm-common`。 | **P0** (自维修必读) |

---

## 第二部分：当前最该先补的关卡清单 (P0 级)

基于加工现场撞刀风险、安全红线以及教学逻辑，以下 6 个关卡必须在首批由 Codex 派工补齐映射：

### 1. 第 3 关：开机手动回零 (P0)
*   **断开原因**：新关卡标题“机床的安全归宿：开机手动回零”在 `app.js` 的 `STUDY_CARD_MATCH_RULES` 中完全缺失匹配规则，导致点击报错。
*   **修补方案**：
    *   在规则库中新增对该关卡的映射项。
    *   **目标 Entry ID**：映射到 `fault-home-fail` ("回不了零点时先查什么")，该条目在 [data.js](file:///F:/AI工作台/cnc_param_quickfinder/data.js) 中已存在，且详情和易错提醒极度健全。
    *   **配图匹配**：映射配图 `assets/images/batch01_core/fault-home-fail-001.webp`。

### 2. 第 4 关：工件坐标系设定 (P0)
*   **断开原因**：标题不匹配。`app.js` 中对应的规则标题为“告诉机床活儿在哪”，其绑定的精确 ID 是 `learn-coordinate-system`。但在 [learning-cards-round2.js](file:///F:/AI工作台/cnc_param_quickfinder/learning-cards-round2.js) 中，此标题被变更为“告诉机床从哪开始：工件坐标系设定”，这与第 2 关的映射目标产生冲突，且未能匹配到专门的坐标系条目。
*   **修补方案**：
    *   修改匹配关联，直接以 ID 的方式解耦文本模糊匹配。
    *   **目标 Entry ID**：映射到 [data.js](file:///F:/AI工作台/cnc_param_quickfinder/data.js) 中的 `learn-g54-g59` ("G54-G59 工件坐标系")。
    *   **配图匹配**：映射配图 `assets/images/batch01_core/gcode-g54-g59-001.webp`。

### 3. 第 5 关：车床与铣床的手动对刀秘诀 (P0)
*   **断开原因**：此关卡完全跳过了旧版“程序从哪里开始”的规则定义，导致点击无响应。
*   **修补方案**：
    *   **目标 Entry ID**：目前 [data.js](file:///F:/AI工作台/cnc_param_quickfinder/data.js) 中缺少一个专门的对刀操作技术专题（如试切法、分中对刀仪原理）。当前应临时映射到 `learn-coordinate-system`，并规划在下阶段数据包中新增 `learn-tool-setting-basics` 条目。
    *   **配图匹配**：映射配图 `assets/images/batch02_operation_basics/work-offset-setting-001.webp`。

### 4. 第 1 关：识读机械图纸符号 (P0)
*   **断开原因**：小白关卡，但标题“看图与认路：识读机械图纸符号”被漏匹配，用户第一关就无法点开，极大影响产品印象。
*   **修补方案**：
    *   **目标 Entry ID**：映射到 [data.js](file:///F:/AI工作台/cnc_param_quickfinder/data.js) 中的 `drawing-symbol` ("图纸符号与尺寸标注入门")。
    *   **配图匹配**：映射配图 `assets/images/batch01_core/measure-reading-set-001.webp`。

### 5. 第 10 关：G00 至 G03 指令轨迹 (P0)
*   **断开原因**：此为进阶层第一课，原规则库中的“圆弧怎么加工”与新标题完全脱靶。
*   **修补方案**：
    *   **目标 Entry ID**：在 [data.js](file:///F:/AI工作台/cnc_param_quickfinder/data.js) 中缺乏 G00/G01 的单独 entry。当前应映射到 `learn-g17-g18-g19` ("G17 / G18 / G19 平面选择") 或是新建 `learn-g00-g03-motion`。
    *   **配图匹配**：映射配图 `assets/images/batch01_core/gcode-g02-g03-001.webp` 极其精准，能解决圆弧走向痛点。

### 6. 第 12 关：伺服超程与报警自排障 (P0)
*   **断开原因**：12关大收尾，现场极其高频的超程自救被漏匹配。
*   **修补方案**：
    *   **目标 Entry ID**：映射到 [data.js](file:///F:/AI工作台/cnc_param_quickfinder/data.js) 中的 `fault-limit-switch` ("限位与超程类问题排查")。
    *   **配图匹配**：映射配图 `assets/images/batch01_core/alarm-limit-overtravel-001.webp`。

---

## 第三部分：图片数据文件总览

目前项目目录下共有 **6** 个图片相关的数据文件，字段结构各异，分工重叠。

### 1. 图片数据文件现状一览表

| 文件名 | 存储数据结构 | 数据条目数 | 字段结构示例 | 核心职责说明 | 状态判定 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **[gallery-library.js](file:///F:/AI工作台/cnc_param_quickfinder/gallery-library.js)** | 数组 (window.CNC_GALLERY_LIBRARY) | 125 条 | `{ id, batch, title, src }` | 基础图库的定义，供老图库或者 app 初始化时读取。 | **历史遗留，可废弃** |
| **[gallery-library-enhanced.js](file:///F:/AI工作台/cnc_param_quickfinder/gallery-library-enhanced.js)** | 数组 (window.CNC_GALLERY_LIBRARY_ENHANCED) | 125 条 | `{ id, src, batch, title, desc, keywords, category }` | 精细化图库元数据定义。包含 keywords 分词，用于快速查询和智能匹配。 | **必须保留，充当主库** |
| **[featured-images.js](file:///F:/AI工作台/cnc_param_quickfinder/featured-images.js)** | 键值对 (window.CNC_FEATURED_IMAGES) | 32 个 Key | `"id": [ { title, caption, src } ]` | 精准建立 Entry ID 到精选教学配图的映射。关系明确。 | **必须保留并规范** |
| **[featured-images-supplement.js](file:///F:/AI工作台/cnc_param_quickfinder/featured-images-supplement.js)** | 键值对 (window.CNC_FEATURED_IMAGES_SUPPLEMENT) | 177 个 Key | `"中文标题": [ { title, caption, src } ]` | 依靠知识库长标题做 Key 映射图片，关系极其脆弱。 | **过渡产物，需重构合并** |
| **[entry-to-images-map.js](file:///F:/AI工作台/cnc_param_quickfinder/entry-to-images-map.js)** | 键值对 (window.CNC_ENTRY_TO_IMAGES_MAP) | 0 个 Key | `window.CNC_ENTRY_TO_IMAGES_MAP = {}` | 没有任何实质数据的空文件。 | **纯历史遗留，可立即删除** |
| **[knowledge-gallery.js](file:///F:/AI工作台/cnc_param_quickfinder/knowledge-gallery.js)** | 数组 (window.CNC_KNOWLEDGE_GALLERY) | 0 条 | `window.CNC_KNOWLEDGE_GALLERY = []` | 没有任何实质数据的空文件。 | **纯历史遗留，可立即删除** |

---

## 第四部分：图片系统当前主要混乱点

1.  **物理重合度高，双轨并存浪费带宽**：
    *   `gallery-library.js` 与 `gallery-library-enhanced.js` 都包含了 125 张图片，ID 重合度达 121/125。但字段结构不同。这导致前台加载了两个庞大的 JS，不仅浪费带宽，也造成了数据流多源头问题。
2.  **字符串 Key 匹配过于脆弱**：
    *   `featured-images-supplement.js` 包含 177 个以中文长标题为 Key 的映射。只要后端的 Markdown 原文微调、标题空格变动，所有的图片映射便会瞬间失效断开，极其不稳定。
3.  **废弃空文件堆积**：
    *   `entry-to-images-map.js` 与 `knowledge-gallery.js` 完全为空，在项目根目录下构成了代码噪音，应果断清理。

---

## 第五部分：给 Codex 的直接执行建议 (派工清单)

为完成本轮整合，请 Codex 按照以下步骤下发任务：

### 1. 重构 app.js 里的关卡匹配引擎 (2号任务)
*   **目标**：彻底丢弃靠卡片标题匹配知识点的脆弱逻辑。
*   **操作**：
    *   修改 [app.js](file:///F:/AI工作台/cnc_param_quickfinder/app.js) 的 `bindStudyCards()`。
    *   将 HTML 的 `.study-card` 结构与 [learning-cards-round2.js](file:///F:/AI工作台/cnc_param_quickfinder/learning-cards-round2.js) 里的 `id` (如 `card-001` 等) 强绑定。
    *   在 `learning-cards-round2.js` 的每个卡片对象中，新增 `entryId` 字段显式声明其对应的知识点。
    *   **重构后的关卡-知识点数据映射规范如下**：
        ```javascript
        // 在 learning-cards-round2.js 中新增/规范 entryId 字段：
        window.CNC_LEARNING_CARDS = [
          { "id": "card-001", "title": "看图与认路：识读机械图纸符号", "entryId": "drawing-symbol", ... },
          { "id": "card-002", "title": "机床的东南西北：认识机床坐标轴", "entryId": "learn-coordinate-system", ... },
          { "id": "card-003", "title": "机床的安全归宿：开机手动回零", "entryId": "fault-home-fail", ... },
          { "id": "card-004", "title": "告诉机床从哪开始：工件坐标系设定", "entryId": "learn-g54-g59", ... },
          { "id": "card-005", "title": "车床与铣床的手动对刀秘诀", "entryId": "learn-coordinate-system", ... }, // 临时共用，后续改为 learn-tool-setting-basics
          { "id": "card-006", "title": "刀长偏置 G43 的安全防扎刀技巧", "entryId": "learn-g43-g44-g49", ... },
          { "id": "card-007", "title": "认识你的武器：铣刀与车刀的选型", "entryId": "tool-drill-selection", ... },
          { "id": "card-008", "title": "干活的节奏：切削速度与进给换算", "entryId": "calc-vc-rpm", ... },
          { "id": "card-009", "title": "顺铣与逆铣的受力及表面粗糙度区别", "entryId": "process-surface-roughness", ... },
          { "id": "card-010", "title": "让机床动起来：G00 至 G03 指令轨迹", "entryId": "learn-g17-g18-g19", ... },
          { "id": "card-011", "title": "打包的高级动作：G83啄钻与孔固定循环", "entryId": "learn-g81-g83", ... },
          { "id": "card-012", "title": "机床的脾气：伺服超程与常用报警自排障", "entryId": "fault-limit-switch", ... }
        ];
        ```
    *   前台点击时，直接获取该 `card.entryId`，调用 `goToKnowledgeDetail(entry)`，完全绕过模糊规则比对，性能提升且 100% 精确。

### 2. 清理并归并图片库元数据 (1号/2号任务)
*   **物理删除**：直接删除空文件 [entry-to-images-map.js](file:///F:/AI工作台/cnc_param_quickfinder/entry-to-images-map.js)、[knowledge-gallery.js](file:///F:/AI工作台/cnc_param_quickfinder/knowledge-gallery.js) 并且废弃旧的 [gallery-library.js](file:///F:/AI工作台/cnc_param_quickfinder/gallery-library.js)。
*   **统一元数据主库**：以后全部读取 [gallery-library-enhanced.js](file:///F:/AI工作台/cnc_param_quickfinder/gallery-library-enhanced.js)。
*   **重构 Supplement 映射关系**：编写一个简单的脚本，将 `featured-images-supplement.js` 里的中文 Title Key 通过反向查表转化为精确的 Entry ID，将其合并归纳到 `featured-images.js` 中，形成唯一的精选图片关联主表。

---

## 第六部分：分析声明

以下项已分析，但无法确认真实运行结果：
1.  **旧版浏览器手势滑动的点击冲突**：改写对 `study-card` 的点击和手势捕获后，部分使用旧式内核的操机现场手持机（如 Android 4.4 系统）可能会出现卡片点击无响应的偶发事件，该真机表现未进行物理运行验证。
2.  **图片懒加载库的兼容性瓶颈**：弃用 `getEntryImages` 分词检索后，若直接将 125 张大 WebP 图加载于手机内存中，部分老旧机型（内存低于 2GB）在连续翻看 8 关后可能会产生崩溃重启，此极限承载能力未在真机上运行验证。
