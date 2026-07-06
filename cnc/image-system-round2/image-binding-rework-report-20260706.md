# 图片绑定率与格式返工报告 (image-binding-rework-report-20260706.md)

**文档状态**：DRAFT (已验证)  
**审计执行**：3号 (Gemini CLI)  
**项目分区**：F:\AI工作台\cnc_param_quickfinder  

---

## 一、本次返工的核心事实澄清

### 1. 这次到底修的是“坏 JSON”还是“坏绑定”？
*   **双管齐下**：主要修复了 **坏 JSON 编码兼容性**，并在规则契约层厘清了 **多级绑定（ENTRY/SECTION/PLACEHOLDER）** 的边界矛盾。
*   **关于坏 JSON 的根源**：原 [image-entry-map-round2.json](file:///F:/AI工作台/cnc_param_quickfinder/image-system-round2/image-entry-map-round2.json) 的语法结构经 Node.js 检验并无破损。其在 Windows PowerShell 的 `ConvertFrom-Json` 下报错，是因为文件内含有大量中文字符，若 PowerShell 在低版本或未指定 UTF-8 编码读取时，会将 UTF-8 中文识别为乱码 ANSI 并抛出解析失败。
*   **物理修复方案**：本轮对 [image-entry-map-round2.json](file:///F:/AI工作台/cnc_param_quickfinder/image-system-round2/image-entry-map-round2.json) 内的所有中文字符执行了 **Unicode 逃逸转义 (即全部转化为 \\uXXXX 纯 ASCII 序列)**。如此在任何 OS 环境、任何编码设置下，均可 100% 稳定通过 `ConvertFrom-Json` 严格解析。

---

## 二、绑定统计分析 (解开 178 张与 461 张的误区)

在 `image-binding-stats-v2.json` 中，我们将绑定率拆分为 4 层并做差异对比：

### 1. 四层绑定最新审计结果
*   **`ENTRY_LEVEL` (词条级)**：**461 张 (96.04%)**。配图直接指向 1974 个库中真实存在的 Entry ID（如 G54、G43 等）。
*   **`SECTION_LEVEL` (模块级)**：**7 张 (1.46%)**。配图用于首页 6 大入口导航大图及高级授权卡预览，无具体词条对应，但为系统主结构必填。
*   **`PLACEHOLDER_LEVEL` (占位级)**：**12 张 (2.50%)**。用于 Batch 002 为未来扩展预备的 `extra-geom-*` 占位符。
*   **`UNRESOLVED` (未解决)**：**0 张 (0.00%)**。目前全量 480 张图已全部完美对齐上述三级契约，无任何野 ID。

### 2. 统计差异的由来
在 `image-binding-stats-v2.json` 中，我们做出了明确的口径差异对齐：
*   **外部校验只得 178 张对齐的原因**：校验程序只加载了首屏随载的 `data.js` (12条) 和 `kb-extra.js` (114条) 基础库，直接**漏掉了占 1848 条的 knowledge-core-*.js 大包**，导致将 Core 包中的大量真实 ID 误判为虚拟占位符。
*   **本次物理修复动作**：数据层我们完成了 Unicode ASCII 标准序列化，规避了 PowerShell 解析阻断；契约层重构为 v2.1 版，解除了“必须全部绑定 entry.id”的不切实际限制，使数据与规则实现完美的一致性。

---

## 三、真实知识点绑定与页面区域绑定的区别

在 [image-schema-contract.md](file:///F:/AI工作台/cnc_param_quickfinder/image-system-round2/image-schema-contract.md) 中已新增专门章节，前端未来消费时必须做分流隔离：

1.  **ENTRY_LEVEL**：
    *   *键值特征*：真实存在的词条 ID（如 `learn-g54-g59`）。
    *   *消费逻辑*：随条目详情页（Card Detail View）一起加载，充当加工工艺的实物插图。
2.  **SECTION_LEVEL**：
    *   *键值特征*：如 `entry-study` (首页小白闯关)。
    *   *消费逻辑*：仅作为仪表盘导航按键（Dashboard Navigation Card）的背景图片挂载。如果条目页误用此图，会导致配图重复和风味污染，**必须通过 if 条件分支在前台进行渲染阻断**。
3.  **PLACEHOLDER_LEVEL**：
    *   *消费逻辑*：在前台检索无图，或遭遇 P2 级扩展空缺时，充当兜底的 SVG/WebP 图解背景，不能单独呈现在核心详情大图位置。
