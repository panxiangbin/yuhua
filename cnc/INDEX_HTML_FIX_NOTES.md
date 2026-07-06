# index.html 节点补充与修复说明文档
生成日期：2026-07-03

为了解决前端首页图库渲染及工作区图文/列表切换按钮高亮逻辑失效的问题，对 `index.html` 进行了最小化结构修改，具体补充了以下两个核心 DOM 节点：

---

## 1. 首页图库预览节点
*   **补充位置**：在 `index.html` 的 `<!-- 精选图库预览 -->`（`view-dashboard` 视图）的底部，置于 `featuredImagesPreview` 容器下方。
*   **补充节点**：`<div class="dashboard-gallery-grid" id="dashboard-gallery-grid"></div>`
*   **解决问题**：
    *   `app.js` 的 `renderDashboardGallery()` 依赖该节点，用于动态注入来自 `getGalleryLibrary()` 的 6 张车间现场工艺图。
    *   该节点补齐后，首页图库预览能正常渲染，且点击卡片可实现向 `/gallery` 视图的正确跳转。

---

## 2. 工作区模式切换控制行
*   **修改位置**：将 `index.html` 的 `<!-- 左侧：搜索与列表区 -->` 中的视图模式工具栏容器进行 ID 补齐。
*   **修改节点**：将 `<div class="view-mode-toolbar">` 修改为 `<div class="view-mode-toolbar" id="workspace-mode-row">`
*   **解决问题**：
    *   `app.js` 在初始化及渲染工作区时，会调用 `dom.workspaceModeRow.querySelectorAll("[data-workspace-mode]")` 和 `dom.workspaceModeRow.querySelectorAll("[data-workspace-flag]")` 来添加/移去 `.active` 类以实现按钮高亮。
    *   此 ID 补齐后，工作区在“列表模式”、“图文模式”及“仅带图”过滤器按钮之间的切换动作将正确实现高亮切换及事件监听。
