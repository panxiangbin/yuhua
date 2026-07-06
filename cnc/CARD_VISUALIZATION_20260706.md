# 卡片可视化实现报告

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

卡片可视化增强包为 CNC Param QuickFinder 的知识卡片提供了瀑布流布局、交互动画、富文本渲染和标签系统四个维度的升级。

### 1.1 设计目标

- **视觉一致性**：所有卡片采用统一的设计语言，包括圆角、阴影、配色
- **交互反馈**：悬停、展开、入场等操作有明显视觉反馈
- **内容丰富**：支持 Markdown 渲染、代码高亮、表格展示
- **导航效率**：标签系统支持快速筛选和浏览

### 1.2 文件清单

| 文件 | 全局对象 | 行数 | 功能 |
|------|----------|------|------|
| ui-card-masonry.js | CNC_CARD_MASONRY | ~150 | 瀑布流布局 |
| ui-card-animations.js | CNC_CARD_ANIM | ~120 | 卡片动画 |
| ui-card-richtext.js | CNC_CARD_RICHTEXT | ~160 | 富文本渲染 |
| ui-card-tags.js | CNC_CARD_TAGS | ~100 | 标签系统 |
| styles-card-enhanced.css | — | ~250 | 全部增强样式 |

---

## 2. 模块说明

### 2.1 瀑布流布局 (CNC_CARD_MASONRY)

瀑布流（Masonry）布局是一种非均匀网格布局，卡片按列排列，每列高度独立增长，新卡片始终添加到当前最短的列中。

**核心功能**：

`initMasonryLayout(container, options)` 初始化瀑布流容器。`container` 可以是选择器字符串或 DOM 元素。`options` 支持 `gutter`（间距，默认 16px）和 `virtualScroll`（虚拟滚动开关）。

`calculateColumns()` 根据容器宽度动态计算列数：
- < 480px：2 列
- 480-768px：2 列
- 768-1024px：3 列
- ≥ 1024px：4 列

`distributeCards(cards)` 接受 HTML 字符串数组或 DOM 元素数组，分配到各列。

`reflow()` 在窗口 resize 时重新布局，保持列数自适应。

`addCard(card, position)` 动态添加单张卡片到指定位置（'first' / 'last'）。

**实现原理**：

使用 `display: inline-block` + `vertical-align: top` 实现列容器，每列宽度为 `100% / N`。每张卡片放在列容器内，通过 `_getShortestColumn()` 选择当前高度最小的列。

虚拟滚动通过监听 `window.scroll` 事件，在滚动范围内外切换卡片的 `display` 属性，减少 DOM 节点渲染量。

### 2.2 卡片动画 (CNC_CARD_ANIM)

**入场动画**：新卡片从下方 20px 处淡入，每张卡片间隔 60ms 顺序执行（stagger 效果）。

```css
@keyframes cardFadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
```

**悬停动画**：鼠标移入时卡片上移 4px 并加深阴影，移出时恢复。

**展开/折叠动画**：使用 `max-height` 过渡实现内容区域展开。原理是将内容的 `scrollHeight` 作为 `max-height` 的目标值，用 CSS transition 驱动动画。

**动画队列**：所有入场动画按顺序排队执行，前一个完成后才启动下一个，避免同时触发大量重排。

### 2.3 富文本渲染 (CNC_CARD_RICHTEXT)

支持以下 Markdown 语法：
- 标题（#, ##, ###）
- 代码块（``` 围栏式，支持语言标注）
- 内联代码（`code`）
- 粗体（**text**）和斜体（*text*）
- 表格（| header | header | 格式）
- 无序列表（- item）
- 有序列表（1. item）
- 链接（[text](url)）
- 图片（![alt](src)）

**代码高亮**：针对不同语言提供简单的语法高亮：
- JavaScript：关键字（function, var 等）、注释、字符串
- HTML：标签名、属性值
- GCode/NC：G 代码（蓝色）、M 代码（青色）、轴坐标（橙色）

**表格渲染**：解析 Markdown 表格语法，生成带 thead 和 tbody 的 HTML 表格，支持斑马纹和悬停高亮。

### 2.4 标签系统 (CNC_CARD_TAGS)

**标签颜色映射**：预设 18 种常见标签的颜色，如 G 代码（橙色）、报警（红色）、新手（绿色）等。未识别的标签使用灰色。

**标签云**：统计所有条目中各标签的出现频次，按权重排序，使用不同字号和透明度展示。热门标签字号大、不透明度高。

**权重计算**：标签的 count 值除以最大 count 值，得到 0-1 的权重分数。

---

## 3. 技术实现

### 3.1 瀑布流 vs CSS Columns

选择 JavaScript 实现的瀑布流而非 CSS `column-count`，原因：
- CSS columns 中卡片按列顺序排列（自上而下填满第一列再第二列），而 JS 实现可按内容顺序排列（自左向右）
- CSS columns 不支持 `break-inside` 的完美兼容
- JS 实现支持虚拟滚动优化

### 3.2 Markdown 渲染 vs 第三方库

自行实现 Markdown 渲染而非使用 marked.js，原因：
- 项目零 npm 依赖要求
- 仅需支持常用语法子集（标题/代码/表格/列表/粗斜体）
- 自实现可针对 GCode 做专用高亮扩展

### 3.3 动画性能

动画全部使用 CSS3 transitions 和 animations，由 GPU 合成器线程处理：
- `transform` 和 `opacity` 属性触发合成层，不触发重排（reflow）
- 避免 `height`、`margin`、`padding` 等触发重排的属性
- 展开动画使用 `max-height` 替代 `height`，避免每张卡片高度不同的计算开销

---

## 4. 集成指南

### 4.1 加载顺序

```html
<link rel="stylesheet" href="./styles-card-enhanced.css">
<script src="./ui-card-masonry.js"></script>
<script src="./ui-card-animations.js"></script>
<script src="./ui-card-richtext.js"></script>
<script src="./ui-card-tags.js"></script>
```

### 4.2 瀑布流使用示例

```html
<div id="card-container"></div>
<script>
  var container = document.getElementById('card-container');
  CNC_CARD_MASONRY.initMasonryLayout(container, { gutter: 16 });

  var cards = [
    '<div class="masonry-card"><h3>G00 快速定位</h3><p>G00 指令用于快速移动刀具到指定位置。</p></div>',
    '<div class="masonry-card"><h3>G01 直线插补</h3><p>G01 以指定的进给速度直线移动。</p></div>',
    '<div class="masonry-card"><h3>G02/G03 圆弧插补</h3><p>G02 顺时针圆弧，G03 逆时针圆弧。</p></div>'
  ];
  CNC_CARD_MASONRY.distributeCards(cards);
</script>
```

### 4.3 动画使用示例

```javascript
// 批量入场动画
var cards = document.querySelectorAll('.masonry-card');
cards.forEach(function (card, i) {
  CNC_CARD_ANIM.animateCardEntry(card, i);
});

// 悬停效果
cards.forEach(function (card) {
  CNC_CARD_ANIM.animateCardHover(card);
});

// 展开/折叠
var expandBtn = document.getElementById('expand-btn');
expandBtn.addEventListener('click', function () {
  CNC_CARD_ANIM.animateCardExpand(document.querySelector('.masonry-card'));
});
```

### 4.4 富文本使用示例

```javascript
var markdown = '# G00 快速定位\n\n**G00** 指令用于快速移动，不可用于切削。\n\n## 格式\n```\nG00 X_ Y_ Z_\n```\n\n| 参数 | 说明 |\n|------|------|\n| X | X 轴目标位置 |\n| Y | Y 轴目标位置 |\n| Z | Z 轴目标位置 |';

var html = CNC_CARD_RICHTEXT.renderMarkdown(markdown);
document.getElementById('card-content').innerHTML = html;
```

### 4.5 标签系统使用示例

```javascript
// 渲染标签
var tags = ['G代码', '基础', '操作'];
document.getElementById('tag-area').innerHTML = CNC_CARD_TAGS.renderTags(tags);

// 按标签筛选
var results = CNC_CARD_TAGS.filterByTag('G代码');

// 渲染标签云
var container = document.getElementById('tag-cloud');
container.innerHTML = CNC_CARD_TAGS.renderTagCloud();
```

---

## 5. 测试用例

### 5.1 瀑布流

```
TC01: initMasonryLayout 接受 CSS 选择器字符串
TC02: initMasonryLayout 接受 DOM 元素对象
TC03: 容器宽度 < 480px 时列数为 2
TC04: 容器宽度 768-1024px 时列数为 3
TC05: 容器宽度 ≥ 1024px 时列数为 4
TC06: distributeCards 分配 10 张卡片后所有列非空
TC07: reflow 在 resize 后保持布局
TC08: destroy 移除事件监听
```

### 5.2 动画

```
TC09: animateCardEntry 设置 opacity:0 后过渡到 1
TC10: animateCardEntry 的延迟随 index 递增
TC11: animateCardHover 注册 mouseenter/mouseleave
TC12: animateCardExpand 展开可折叠内容
TC13: animateCardCollapse 折叠内容
TC14: animateBatch 批量动画不报错
```

### 5.3 富文本

```
TC15: renderMarkdown 将标题 # 转为 h2
TC16: renderMarkdown 将 **粗体** 转为 strong
TC17: renderMarkdown 将 ``` 转为代码块
TC18: renderMarkdown 将表格行转为 table
TC19: renderMarkdown 将链接转为 a 标签
TC20: renderMarkdown 将图片转为 img 标签
TC21: renderCodeBlock 包含复制按钮
TC22: renderTable 包含 thead/tbody
```

### 5.4 标签

```
TC23: renderTags 为每个标签生成 span
TC24: renderTags 的标签使用预设颜色
TC25: filterByTag 返回匹配的条目数组
TC26: getTagCloud 返回按频次降序数组
TC27: renderTagCloud 按权重使用不同字号
TC28: addTagColor 动态添加配色
```

---

## 6. 已知问题

1. **瀑布流滚动抖动**：虚拟滚动模式下，快速滚动时可能出现短暂空白
2. **Markdown 嵌套解析**：代码块内的 Markdown 语法不会被转义，可能被错误解析
3. **标签云重叠**：标签云中大字号标签可能与小字号标签重叠（低分辨率屏幕）
4. **动画队列堆积**：短时间内触发大量动画卡片时，队列可能积压导致延迟

---

## 7. 未来优化

1. **IntersectionObserver 懒加载**：使用 IntersectionObserver 替代滚动监听实现虚拟滚动
2. **marked.js 可选集成**：如果项目允许 npm 依赖，可集成 marked.js 获得完整 Markdown 支持
3. **拖拽排序**：瀑布流卡片支持拖拽重新排列
4. **标签分组**：支持标签分组（如按类别/难度/场景分组显示）
5. **自适应图片加载**：根据卡片宽度加载不同分辨率的图片
