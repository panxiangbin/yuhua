# 图片系统升级报告

**日期**: 2026-07-06
**项目**: CNC Param QuickFinder
**版本**: v1.0.0

---

## 目录

1. [概述](#1-概述)
2. [模块说明](#2-模块说明)
3. [技术实现](#3-技术实现)
4. [集成指南](#4-集成指南)
5. [测试用例](#5-测试用例)
6. [已知问题](#6-已知问题)
7. [未来优化](#7-未来优化)

---

## 1. 概述

图片系统升级包为 CNC Param QuickFinder 的图片展示功能提供了查看器（缩放/旋转/拖拽）、滤镜（亮度/对比度/灰度）、标注（文字/箭头/矩形/导出）三个维度的增强。

### 1.1 设计目标

- **专业查看体验**：图片查看器支持缩放、旋转、拖拽、滚轮，接近 Photoshop 的导航体验
- **教学增强**：标注系统允许用户在图片上添加文字说明、箭头指示，适合教学场景
- **视觉调整**：滤镜系统帮助用户在光线不足或屏幕偏色时调整图片显示
- **无外部依赖**：所有功能使用原生 API（Canvas、CSS Filter），不依赖第三方库

### 1.2 文件清单

| 文件 | 全局对象 | 行数 | 功能 |
|------|----------|------|------|
| ui-image-viewer.js | CNC_IMAGE_VIEWER | ~180 | 全屏查看器 |
| ui-image-filters.js | CNC_IMAGE_FILTERS | ~120 | CSS 滤镜 |
| ui-image-annotations.js | CNC_IMAGE_ANNOTATE | ~200 | Canvas 标注 |
| styles-image-viewer.css | — | ~180 | 全部样式 |

---

## 2. 模块说明

### 2.1 图片查看器 (CNC_IMAGE_VIEWER)

**打开查看器**：`openImageViewer(imageSrc)` 创建全屏覆盖层，加载指定图片，显示缩放/旋转控制和当前状态信息。

**缩放控制**：
- 滚轮缩放：鼠标滚轮向上放大、向下缩小
- 按钮缩放：控制栏的 +/- 按钮
- 键盘缩放：+ / - 键
- 范围：25% ~ 500%

**旋转控制**：
- 按钮旋转：控制栏的 ↺（-90°）/ ↻（+90°）按钮
- 键盘旋转：r（+90°）/ R（-90°）
- 按 0 键重置视图

**拖拽移动**：
- 鼠标拖拽图片平移
- 按住左键拖拽，跟随鼠标移动
- 光标在拖拽时变为 grabbing

**关闭**：
- 点击覆盖层背景
- 按 Esc 键
- 点击控制栏 × 按钮

### 2.2 图片滤镜 (CNC_IMAGE_FILTERS)

**实现方式**：使用 CSS `filter` 属性，通过修改 `brightness`、`contrast`、`grayscale`、`sepia`、`saturate`、`hue-rotate` 函数值实现。

**滤镜函数说明**：

| 函数 | 默认值 | 范围 | 说明 |
|------|--------|------|------|
| brightness | 1 | 0-3 | 亮度，1=原始，0=全黑 |
| contrast | 1 | 0-3 | 对比度，1=原始 |
| grayscale | 0 | 0/1 | 灰度切换 |
| sepia | 0 | 0/1 | 怀旧切换 |
| saturate | 1 | 0-3 | 饱和度，1=原始 |
| hue-rotate | 0 | 0-360° | 色相旋转 |

**滤镜面板**：`renderFilterPanel()` 生成包含滑块和切换按钮的 HTML 面板。`bindFilterPanel(container)` 将面板中的控件绑定到滤镜函数。

**实时预览**：调整滑块时图片立即更新，无延迟。所有滤镜组合为单个 CSS filter 字符串，浏览器合成器处理，不触发重排。

### 2.3 图片标注 (CNC_IMAGE_ANNOTATE)

**实现方式**：在图片上方叠加 Canvas 元素，通过 Canvas 2D API 绘制标注内容。

**标注工具**：

| 工具 | 方法 | 操作方式 |
|------|------|----------|
| 文字 | `addTextAnnotation(x, y, text)` | 点击位置弹出输入框 |
| 箭头 | `addArrowAnnotation(x1, y1, x2, y2)` | 拖拽绘制，实时预览 |
| 矩形 | `addRectAnnotation(x, y, w, h)` | 通过 API 添加 |

**撤销/重做**：
- 每次添加或清除操作自动保存快照到撤销栈
- 撤销栈最多 50 步
- 撤销后进入重做栈，可重新应用

**导出**：
- `exportAnnotatedImage()` 返回包含标注的图片 DataURL（PNG 格式）
- `downloadAnnotatedImage(filename)` 直接触发下载

---

## 3. 技术实现

### 3.1 CSS Filter 性能

CSS filter 由 GPU 合成器线程处理，不占用主线程。6 个滤镜函数组合为单个 `filter` 属性的性能开销可以忽略：

```javascript
'filter': 'brightness(1.2) contrast(1.1) grayscale(0) sepia(0) saturate(1) hue-rotate(0deg)'
```

注意：`filter` 属性会为元素创建新的堆叠上下文（stacking context），如果目标图片有复杂的 CSS 定位关系，需要注意 z-index 问题。

### 3.2 Canvas 坐标映射

标注系统的 Canvas 覆盖在图片上方，但 Canvas 的分辨率可能与显示尺寸不同（高分辨率图片可能被 CSS 缩放）。坐标映射公式：

```javascript
var canvasX = (mouseX - canvasRect.left) * (canvas.width / canvasRect.width);
var canvasY = (mouseY - canvasRect.top) * (canvas.height / canvasRect.height);
```

这确保了标注数据与原始图片分辨率对应，导出时保持精度。

### 3.3 撤销栈实现

使用深拷贝（`JSON.parse(JSON.stringify(...))`）保存标注数组快照。虽然在大数据量下效率不高，但标注数据通常较小（几十到几百条），深拷贝在 1ms 内完成。

---

## 4. 集成指南

### 4.1 加载

```html
<link rel="stylesheet" href="./styles-image-viewer.css">
<script src="./ui-image-viewer.js"></script>
<script src="./ui-image-filters.js"></script>
<script src="./ui-image-annotations.js"></script>
```

### 4.2 查看器集成

```html
<img src="./image.jpg" id="gallery-img" style="cursor:pointer;" onclick="CNC_IMAGE_VIEWER.openImageViewer(this.src)">
```

### 4.3 滤镜集成

```html
<div id="filter-panel"></div>
<img src="./image.jpg" id="filter-target">

<script>
  CNC_IMAGE_FILTERS.setTargetImage('#filter-target');
  document.getElementById('filter-panel').innerHTML = CNC_IMAGE_FILTERS.renderFilterPanel();
  CNC_IMAGE_FILTERS.bindFilterPanel('#filter-panel');
</script>
```

### 4.4 标注集成

```html
<div class="annotation-canvas-wrapper">
  <img src="./image.jpg" id="annotate-img" crossorigin="anonymous">
  <canvas class="annotation-canvas" id="annotate-canvas"></canvas>
</div>
<div class="annotation-toolbar" id="annotate-toolbar">
  <button class="annotation-tool-btn active" data-tool="text">文字</button>
  <button class="annotation-tool-btn" data-tool="arrow">箭头</button>
  <button class="annotation-tool-btn" data-tool="rect">矩形</button>
  <input type="color" class="annotation-color-picker" id="annotate-color" value="#ff4444">
  <button class="annotation-action-btn" id="annotate-undo">撤销</button>
  <button class="annotation-action-btn" id="annotate-redo">重做</button>
  <button class="annotation-action-btn" id="annotate-download">导出</button>
</div>

<script>
  var img = document.getElementById('annotate-img');
  img.onload = function () {
    CNC_IMAGE_ANNOTATE.enableAnnotationMode(img, '#annotate-canvas');
  };

  document.getElementById('annotate-toolbar').addEventListener('click', function (e) {
    if (e.target.classList.contains('annotation-tool-btn')) {
      document.querySelectorAll('.annotation-tool-btn').forEach(function (b) { b.classList.remove('active'); });
      e.target.classList.add('active');
      CNC_IMAGE_ANNOTATE.setTool(e.target.getAttribute('data-tool'));
    }
    if (e.target.id === 'annotate-undo') CNC_IMAGE_ANNOTATE.undo();
    if (e.target.id === 'annotate-redo') CNC_IMAGE_ANNOTATE.redo();
    if (e.target.id === 'annotate-download') CNC_IMAGE_ANNOTATE.downloadAnnotatedImage();
  });

  document.getElementById('annotate-color').addEventListener('input', function () {
    CNC_IMAGE_ANNOTATE.setFontColor(this.value);
  });
</script>
```

---

## 5. 测试用例

### 5.1 查看器

```
TC01: openImageViewer 创建覆盖层 DOM 元素
TC02: 缩放范围在 25%-500% 之间
TC03: 滚轮缩放触发 zoomIn/zoomOut
TC04: 旋转累积角度正确
TC05: 重置恢复缩放/旋转/位置
TC06: 点击覆盖层背景关闭查看器
TC07: Esc 键关闭查看器
TC08: + / - 键缩放
TC09: r/R 键旋转
```

### 5.2 滤镜

```
TC10: applyBrightness(1.5) 设置亮度为 1.5
TC11: applyContrast(0.5) 设置对比度为 0.5
TC12: applyGrayscale() 切换灰度开关
TC13: applySepia() 切换怀旧开关
TC14: resetFilters() 恢复所有滤镜默认值
TC15: getCurrentFilters() 返回当前滤镜对象
TC16: setTargetImage 绑定图片元素
```

### 5.3 标注

```
TC17: enableAnnotationMode 初始化 Canvas
TC18: addTextAnnotation 在指定坐标添加文字
TC19: addArrowAnnotation 绘制箭头带箭头头
TC20: undo 恢复到上一步
TC21: redo 重新应用被撤销的操作
TC22: clearAnnotations 清空所有标注
TC23: saveAnnotations 返回 JSON
TC24: exportAnnotatedImage 返回 DataURL
TC25: downloadAnnotatedImage 触发下载
```

---

## 6. 已知问题

1. **Canvas 跨域**：如果图片来自外部域名且未设置 CORS 头，Canvas 导出时会抛出安全错误。解决方案：确保图片服务器设置 `Access-Control-Allow-Origin` 头，或使用本地图片。
2. **滤镜层叠顺序**：CSS filter 会创建新的堆叠上下文，如果图片在复杂定位的容器中，滤镜可能导致 z-index 异常。
3. **标注撤销内存**：撤销栈使用深拷贝，50 步快照在标注数量较大时（>500 条）可能占用数 MB 内存。
4. **移动端触摸**：查看器的拖拽功能在触摸设备上未实现 touch 事件支持，需要使用鼠标模拟。

---

## 7. 未来优化

1. **移动端触摸支持**：添加 touchstart/touchmove/touchend 事件，支持触屏拖拽和双指缩放
2. **标注图层管理**：支持标注图层的显示/隐藏、锁定、排序
3. **滤镜预设**：预设常用滤镜组合（如"增强对比度"、"黑白打印"等）
4. **图片对比模式**：并列或叠加模式显示原图和滤镜后/标注后的图片
5. **标注导出格式**：支持导出为 SVG（矢量标注）或 JSON（可编辑格式）
6. **图片批处理**：批量应用滤镜到多张图片
