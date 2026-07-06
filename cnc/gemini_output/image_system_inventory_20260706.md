# 图片映射系统总清洗审计报告 (2026-07-06)

**文档状态**：DRAFT (可交接)  
**审计执行**：3号 (Gemini CLI)  
**项目分区**：F:\AI工作台\cnc_param_quickfinder  

---

## 一、图片数据文件现状清查

当前项目根目录下共发现 **9 个** 图片及映射相关数据文件，其职责和地位清点如下：

### 1. 主数据文件 (Master Data)
*   **[gallery-library-enhanced.js](file:///F:/AI工作台/cnc_param_quickfinder/gallery-library-enhanced.js)** (125 条图片数据)
    *   *作用*：定义了包含 `id`、`src`、`batch`、`title`、`desc`、`keywords` 和 `category` 在内的多维图片属性。
    *   *判定*：这是当前图片检索和智能分类的主数据库，字段最为丰富。
*   **[featured-images.js](file:///F:/AI工作台/cnc_param_quickfinder/featured-images.js)** (32 个 Key 映射)
    *   *作用*：定义了 Entry ID（如 `learn-coordinate-system`）到精选图数组的映射。
    *   *判定*：这是前台渲染详情页精确配图的主关联表，关系干净。

### 2. 补充数据文件 (Supplemental Data)
*   **[featured-images-supplement.js](file:///F:/AI工作台/cnc_param_quickfinder/featured-images-supplement.js)** (177 个 Key 映射)
    *   *作用*：定义了“中文长标题”到配图的映射。
    *   *判定*：由于知识库中很多 README 的 Title 较长，用于补充历史映射。映射关系极易因文本微调失效。
*   **[featured-images-part2.js](file:///F:/AI工作台/cnc_param_quickfinder/featured-images-part2.js)** / **[featured-images-extended.js](file:///F:/AI工作台/cnc_param_quickfinder/featured-images-extended.js)**
    *   *作用*：拓展的 Entry ID / 标题精选映射。
    *   *判定*：在开发迭代中分批注入的增量数据，应全部归并入 `featured-images.js`。

### 3. 未接线但有价值资产 (Assets Pending Integration)
*   **[gallery-library-master.js](file:///F:/AI工作台/cnc_param_quickfinder/gallery-library-master.js)** / **[gallery-featured.js](file:///F:/AI工作台/cnc_param_quickfinder/gallery-featured.js)**
    *   *作用*：包含更大批量的精选图以及 UI 独立的图库渲染函数。
    *   *判定*：这部分图片资源在前台主工作区详情页中尚未被完全匹配，但其 WebP 实物资产已存在于 `assets/` 目录中，是极佳的待映射储备库。

### 4. 历史遗留文件 (Obsolete Legacies)
*   **[gallery-library.js](file:///F:/AI工作台/cnc_param_quickfinder/gallery-library.js)** (125 条数据)
    *   *判定*：已被 `gallery-library-enhanced.js` 100% 覆盖。数据冗余，建议物理删除（需 Codex 确认）。
*   **[entry-to-images-map.js](file:///F:/AI工作台/cnc_param_quickfinder/entry-to-images-map.js)** / **[knowledge-gallery.js](file:///F:/AI工作台/cnc_param_quickfinder/knowledge-gallery.js)**
    *   *判定*：内容为空，纯历史开发遗留的废弃死壳，可直接物理删除。

---

## 二、字段结构冲突审计

目前图片系统存在 **两类严重的字段定义冲突**，会影响 Codex 的自动加载逻辑：

1.  **图片路径字段不一致**：
    *   [gallery-library.js](file:///F:/AI工作台/cnc_param_quickfinder/gallery-library.js) 和 `enhanced` 文件中，使用的是 `src` 字段（如 `./assets/images/...`）。
    *   而在前台仪表盘缩略图渲染逻辑（[app.js](file:///F:/AI工作台/cnc_param_quickfinder/app.js) 第 2109 行）中，却尝试读取 `img.path`。这导致前台如果不做容错，会直接抛出 undefined 错并回退为 SVG 占位图。
2.  **映射结构与扁平列表冲突**：
    *   精选映射表（`featured-images.js`）的结构是 `{ id: [ { title, caption, src } ] }`。
    *   但前台 `getEntryImages()` 会将模糊匹配的 `galleryLibrary` 结果（扁平的 `{ id, src, title, desc }`）与上述精选结构强行拼接，容易导致在前台解析 `image.caption` 时发生属性空指针崩溃。

---

## 三、图片映射覆盖率审计 (基于 415+ 条目清点)

通过对 [data.js](file:///F:/AI工作台/cnc_param_quickfinder/data.js) 及 `knowledge-core-*.js` 的 415 个知识点进行全量映射清点，得出以下结果：

*   **已有精准图片映射的 Entry ID (部分高频核心示例)**:
    *   `learn-coordinate-system` (坐标系与对刀详解) $\rightarrow$ 映射了 2 张图
    *   `machine-tool-setting` (工件坐标设定) $\rightarrow$ 映射了 2 张图
    *   `g02-g03-arc` (G02/G03圆弧方向) $\rightarrow$ 映射了 2 张图
    *   `learn-g54-g59` (工件坐标系偏置) $\rightarrow$ 映射了 1 张图
    *   `learn-g81-g83` (啄钻固定循环) $\rightarrow$ 映射了 3 张图
    *   `fanuc-alarm-common` (发那科常见报警) $\rightarrow$ 映射了 1 张图
*   **明显缺图的核心 Entry ID**:
    *   `learn-absolute-incremental` (G90/G91绝对与增量) $\rightarrow$ 缺图。G90/G91 是极需要走刀轨迹示意图支撑的。
    *   `learn-g17-g18-g19` (平面选择) $\rightarrow$ 缺图。三维平面的右手定则和圆弧插补投影急需配图。
    *   `tool-thread-tap` (攻丝与螺纹切削) $\rightarrow$ 缺图。英制/公制螺距实物和进给配比需要图表。
*   **重复收录与无图占位问题**:
    *   部分条目在 `featured-images-supplement.js` 中因为中文同义词名称（如 "数控编程基础"、"数控技术基础原理"）映射了同一张 `./assets/images/batch01_core/beginner-machine-zero-vs-work-zero-001.webp` 图片。这导致多个非精准关联的条目右侧详情里，呈现的都是重复的“机械原点与工件零点对比图”，形成了视觉干扰。

---

## 四、给 Codex 的一键式重构建议

1.  **统一元数据引用**：
    *   废弃 `gallery-library.js`。
    *   前台加载完全统一为读取 `gallery-library-enhanced.js` 导出的 `window.CNC_GALLERY_LIBRARY_ENHANCED`。
2.  **编译生成 Master Mapping 表**：
    *   采用本次在 `gemini_output\entry_image_mapping_master_draft.json` 中合并后的去重 JSON，一键重写 `featured-images.js`。
    *   物理卸载 `featured-images-supplement.js`、`part2` 和 `extended`，消除多头映射的问题。
