# 移动端UI重构 — 实施计划与修改清单

> 文档版本: 1.0  
> 目标: 指导 1 号（Claude Code）按文档完成移动端 UI 重构代码修改  
> 优先级: P0(阻塞) / P1(核心) / P2(增强) / P3(优化)

---

## 一、总体策略

### 1.1 实施原则

1. **渐进式改造**：先改造核心页面（首页/搜索/详情），再改造次要页面（学习/工具/个人）
2. **CSS优先**：先建立 CSS 变量体系、全局样式、组件库，再用新样式替换旧样式
3. **功能不变**：重构仅涉及 UI 和交互层，不改变数据模型和业务逻辑
4. **兼容保留**：桌面端原有 UI 通过媒体查询保持可用（`@media (min-width: 768px)`）
5. **增量替换**：每次提交改造一个页面，不要一次性改造所有页面

### 1.2 代码修改方式

```
新增文件:
  /mobile/css/mobile-base.css       — 移动端基础样式 + CSS 变量
  /mobile/css/mobile-nav.css        — 底部导航栏样式
  /mobile/css/mobile-home.css       — 首页样式
  /mobile/css/mobile-search.css     — 搜索页样式
  /mobile/css/mobile-detail.css     — 详情页样式
  /mobile/css/mobile-learn.css      — 学习系统样式
  /mobile/css/mobile-tools.css      — 工具页面样式
  /mobile/js/mobile-app.js          — 移动端主 JS (路由/手势/导航)
  /mobile/js/mobile-home.js         — 首页逻辑
  /mobile/js/mobile-search.js       — 搜索逻辑
  /mobile/js/mobile-detail.js       — 详情页逻辑
  /mobile/js/mobile-gesture.js      — 手势管理器

修改文件:
  index.html                        — 添加移动端 meta + CSS/JS 链接
  styles.css                        — 添加移动端 CSS 变量 (或独立的 mobile-base.css)
```

### 1.3 文件结构

```
cnc_param_quickfinder/
├── mobile/
│   ├── css/
│   │   ├── mobile-base.css     (全局变量/重置/布局)
│   │   ├── mobile-nav.css      (导航栏)
│   │   ├── mobile-home.css     (首页)
│   │   ├── mobile-search.css   (搜索)
│   │   ├── mobile-detail.css   (详情)
│   │   ├── mobile-learn.css    (学习)
│   │   └── mobile-tools.css    (工具)
│   └── js/
│       ├── mobile-app.js       (路由/状态管理)
│       ├── mobile-home.js      (首页渲染)
│       ├── mobile-search.js    (搜索交互)
│       ├── mobile-detail.js    (详情渲染)
│       └── mobile-gesture.js   (手势系统)
├── GRAPH_IMPORT_ARCHITECTURE.md (已有)
├── MOBILE_UI_ARCHITECTURE.md   (已有)
├── MOBILE_UI_HOMEPAGE.md       (已有)
├── MOBILE_UI_DETAIL_PAGES.md   (已有)
├── MOBILE_UI_INTERACTION.md    (已有)
├── MOBILE_UI_THEME.md          (已有)
└── MOBILE_UI_IMPLEMENTATION.md (本文)
```

---

## 二、实施阶段

### 阶段 1: 基础框架 (P0, 预计 2 天)

**目标**：建立移动端 CSS 变量体系、基础样式、HTML 结构改造，使页面在手机上可正常显示。

| 序号 | 任务 | 文件 | 优先级 | 详细说明 |
|------|------|------|--------|----------|
| 1.1 | 创建 CSS 变量文件 | `mobile/css/mobile-base.css` | P0 | 从 MOBILE_UI_THEME.md 复制所有 CSS 变量定义 |
| 1.2 | 创建全局重置样式 | `mobile/css/mobile-base.css` | P0 | `* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }` 禁止文本选择、设置字体族 |
| 1.3 | 修改 viewport meta | `index.html` | P0 | `<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">` |
| 1.4 | 添加 safe-area 支持 | `mobile/css/mobile-base.css` | P0 | 使用 `env(safe-area-inset-top/bottom)` 适配刘海屏 |
| 1.5 | 添加字体流体缩放 | `mobile/css/mobile-base.css` | P0 | `font-size: clamp(16px, 4.27vw, 20px)` 等 |
| 1.6 | 添加骨架屏样式 | `mobile/css/mobile-base.css` | P1 | skeleton 动画 + 各组件骨架变体 |
| 1.7 | 添加加载/空/错误状态样式 | `mobile/css/mobile-base.css` | P1 | 三种状态的标准布局 |
| 1.8 | 添加暗色模式支持 | `mobile/css/mobile-base.css` | P1 | `[data-theme="dark"]` 所有变量覆盖 + `prefers-color-scheme: dark` 自动检测 |
| 1.9 | 新建 mobile 目录 | 文件系统 | P0 | `mkdir -p mobile/css mobile/js` |

### 阶段 2: 底部导航系统 (P0, 预计 1 天)

**目标**：实现固定底部导航栏，支持 5 个 Tab 切换，保留页面状态。

| 序号 | 任务 | 文件 | 优先级 | 详细说明 |
|------|------|------|--------|----------|
| 2.1 | 创建底部导航 CSS | `mobile/css/mobile-nav.css` | P0 | 56px 高度、毛玻璃效果、安全区域适配、选中态样式 |
| 2.2 | 创建导航 HTML | `index.html` (或通过 JS 注入) | P0 | 5个 Tab：首页/知识/学习/工具/我的 |
| 2.3 | 创建路由 JS | `mobile/js/mobile-app.js` | P0 | Tab 切换函数、页面容器管理、状态保持 |
| 2.4 | 实现页面缓存 | `mobile/js/mobile-app.js` | P1 | Tab 容器使用 `display:none` 切换保留 DOM |
| 2.5 | 添加导航过渡动画 | `mobile/css/mobile-nav.css` | P2 | Tab切换淡入效果 (200ms fade) |
| 2.6 | 添加 Badge 支持 | `mobile/js/mobile-app.js` | P2 | 学习 Tab 未完成进度小红点 |
| 2.7 | 实现页面 Push/Pop | `mobile/js/mobile-app.js` | P1 | 二级/三级页面滑动切换 300ms |

### 阶段 3: 首页改造 (P0, 预计 2 天)

**目标**：完全改造首页为移动端专属布局，替换现有桌面版首页。

| 序号 | 任务 | 文件 | 优先级 | 详细说明 |
|------|------|------|--------|----------|
| 3.1 | 创建首页 CSS | `mobile/css/mobile-home.css` | P0 | 5 个区域样式：顶部/搜索/快捷入口/最近查看/推荐 |
| 3.2 | 创建首页 JS | `mobile/js/mobile-home.js` | P0 | 快捷入口渲染、最近查看加载、推荐列表渲染 |
| 3.3 | 替换首页 HTML | `index.html` 首页容器 | P0 | 按 MOBILE_UI_HOMEPAGE.md 的 5 区域布局重写 |
| 3.4 | 实现快捷入口宫格 | `mobile/js/mobile-home.js` | P0 | 4 列 Grid，8 个入口，点击导航 |
| 3.5 | 实现最近查看 | `mobile/js/mobile-home.js` | P0 | localStorage 读写，横向滚动，空状态 |
| 3.6 | 实现推荐列表 | `mobile/js/mobile-home.js` | P0 | 纵向列表，显示标题/标签/元数据 |
| 3.7 | 实现搜索框入口 | `index.html` | P0 | 点击弹出搜索覆盖层 |
| 3.8 | 添加上拉刷新 | `mobile/css/mobile-home.css` + JS | P1 | 下拉刷新推荐列表 |
| 3.9 | 添加上拉加载更多 | `mobile/js/mobile-home.js` | P2 | 推荐列表滚动加载 |
| 3.10 | 添加入口长按菜单 | `mobile/js/mobile-home.js` | P2 | 长按快捷入口弹出收藏/分享操作 |
| 3.11 | 添加骨架屏 | `mobile/js/mobile-home.js` | P1 | 首页首次加载显示骨架 |

### 阶段 4: 搜索系统改造 (P0, 预计 2 天)

**目标**：实现全屏搜索覆盖层，支持联想、历史、筛选。

| 序号 | 任务 | 文件 | 优先级 | 详细说明 |
|------|------|------|--------|----------|
| 4.1 | 创建搜索页 CSS | `mobile/css/mobile-search.css` | P0 | 覆盖层动画、搜索栏、建议列表、结果列表 |
| 4.2 | 创建搜索页 JS | `mobile/js/mobile-search.js` | P0 | 搜索逻辑、建议查询、命中高亮 |
| 4.3 | 实现搜索覆盖层 | `index.html` + JS | P0 | 从顶部滑出覆盖层，搜索框自动聚焦 |
| 4.4 | 实现联想建议 | `mobile/js/mobile-search.js` | P0 | >2字触发，匹配标签，显示前10条 |
| 4.5 | 实现搜索结果 | `mobile/js/mobile-search.js` | P0 | 结果列表渲染，点击进入详情 |
| 4.6 | 实现历史搜索 | `mobile/js/mobile-search.js` | P0 | localStorage 存储最近 20 条，可清空 |
| 4.7 | 实现热门搜索 | `mobile/js/mobile-search.js` | P2 | 初始状态显示热门标签 |
| 4.8 | 实现搜索结果筛选 | `mobile/js/mobile-search.js` | P1 | 按类型筛选标签栏（可横向滚动） |
| 4.9 | 实现搜索高亮 | `mobile/js/mobile-search.js` | P1 | 搜索结果中匹配文字高亮显示 |
| 4.10 | 添加搜索空状态 | `mobile/css/mobile-search.css` | P1 | 无结果引导提示 |

### 阶段 5: 详情页改造 (P1, 预计 3 天)

**目标**：统一所有详情页（知识/代码/课程/案例）使用同一套移动端模板。

| 序号 | 任务 | 文件 | 优先级 | 详细说明 |
|------|------|------|--------|----------|
| 5.1 | 创建详情页 CSS | `mobile/css/mobile-detail.css` | P1 | 标题/正文/代码块/表格/底部操作栏 |
| 5.2 | 创建详情页 JS | `mobile/js/mobile-detail.js` | P1 | 渲染逻辑、代码复制、字体调整 |
| 5.3 | 实现返回导航 | `mobile/js/mobile-detail.js` | P1 | 顶部返回按钮 + 左边缘滑动返回 |
| 5.4 | 实现代码块交互 | `mobile/js/mobile-detail.js` | P1 | 复制按钮、横向滚动 |
| 5.5 | 实现表格卡片化 | `mobile/js/mobile-detail.js` | P1 | 600px 以下表格 → 卡片列表 |
| 5.6 | 实现字体调整 | `mobile/js/mobile-detail.js` | P2 | 底部 Aa 按钮切换字号 16-24px |
| 5.7 | 实现收藏功能 | `mobile/js/mobile-detail.js` | P1 | 底部收藏按钮，localStorage 持久化 |
| 5.8 | 实现相关推荐 | `mobile/js/mobile-detail.js` | P2 | 底部显示相关知识条目 |
| 5.9 | 实现标签跳转 | `mobile/js/mobile-detail.js` | P2 | 点击标签搜索同类内容 |
| 5.10 | 添加目录导航 | `mobile/js/mobile-detail.js` | P3 | 长文内容显示目录浮窗 |

### 阶段 6: 学习系统改造 (P1, 预计 3 天)

**目标**：改造 12 关学习系统为手机端友好的布局。

| 序号 | 任务 | 文件 | 优先级 | 详细说明 |
|------|------|------|--------|----------|
| 6.1 | 创建学习页 CSS | `mobile/css/mobile-learn.css` | P1 | 路线卡片、关卡进度条、练习选项 |
| 6.2 | 创建学习页 JS | `mobile/js/mobile-app.js` (集成) | P1 | 关卡渲染、进度管理、练习交互 |
| 6.3 | 改造路线总览页 | 学习系统 HTML | P1 | 卡片式关卡列表，进度条竖排 |
| 6.4 | 改造关卡详情页 | 学习系统 HTML | P1 | 课时列表，进度指示，开始按钮 |
| 6.5 | 改造练习题页 | 学习系统 HTML | P1 | 选择题选项 48px 高，提交反馈 |
| 6.6 | 添加练习结果页 | 学习系统 HTML | P2 | 得分/用时/解析展示 |

### 阶段 7: 工具页面改造 (P2, 预计 2 天)

**目标**：工具页面重构为 2 列卡片网格。

| 序号 | 任务 | 文件 | 优先级 | 详细说明 |
|------|------|------|--------|----------|
| 7.1 | 创建工具页 CSS | `mobile/css/mobile-tools.css` | P2 | 2 列 Grid、各工具卡片样式 |
| 7.2 | 改造 G代码速查表 | 工具页面 HTML | P2 | 代码列表，按分类筛选 |
| 7.3 | 改造计算器 | 工具页面 HTML | P2 | 大输入框，结果即时显示 |
| 7.4 | 改造知识图谱 | 工具页面 HTML | P2 | Canvas/SVG 渲染，双指缩放 |

### 阶段 8: 手势与交互系统 (P1, 预计 2 天)

**目标**：实现移动端手势管理器，替换所有的 click 事件。

| 序号 | 任务 | 文件 | 优先级 | 详细说明 |
|------|------|------|--------|----------|
| 8.1 | 创建手势管理器 | `mobile/js/mobile-gesture.js` | P1 | tap/longpress/swipe 事件封装 |
| 8.2 | 替换 click → tap | 全局搜索替换 | P1 | 所有按钮使用 tap 事件 (按页面逐步替换) |
| 8.3 | 添加边缘滑动返回 | `mobile/js/mobile-gesture.js` | P1 | 仅二级/三级页面左边缘生效 |
| 8.4 | 添加长按菜单 | `mobile/js/mobile-gesture.js` | P2 | 卡片/列表项长按弹出操作菜单 |
| 8.5 | 添加 300ms 消除 | `mobile/js/mobile-gesture.js` | P1 | `touch-action: manipulation` + 自定义 tap |
| 8.6 | 添加触觉反馈 | `mobile/js/mobile-gesture.js` | P2 | navigator.vibrate 在重要操作时触发 |

### 阶段 9: 兼容与测试 (P2, 预计 2 天)

**目标**：确保在不同设备和浏览器上的兼容性。

| 序号 | 任务 | 文件 | 优先级 | 详细说明 |
|------|------|------|--------|----------|
| 9.1 | 测试 320px 小屏 | 全局 | P2 | 确保无水平滚动，布局正常 |
| 9.2 | 测试 414px 大屏 | 全局 | P2 | 确保内容充分利用屏幕宽度 |
| 9.3 | 测试 iOS Safari | 全局 | P2 | 底部安全区域、滚动卡顿、表单聚焦 |
| 9.4 | 测试 Chrome Android | 全局 | P2 | 触控响应、暗色模式、字体缩放 |
| 9.5 | 测试微信内置浏览器 | 全局 | P2 | X5 内核兼容，缓存策略 |
| 9.6 | 测试离线模式 | 全局 | P2 | Service Worker 缓存，LocalStorage 回退 |
| 9.7 | 测试 200% 字体缩放 | 全局 | P2 | 无障碍检查，布局不崩 |
| 9.8 | 测试横屏模式 | 全局 | P3 | 布局自适应 |

### 阶段 10: 性能优化 (P3, 预计 1 天)

**目标**：首屏加载 <2s，滚动 60fps。

| 序号 | 任务 | 文件 | 优先级 | 详细说明 |
|------|------|------|--------|----------|
| 10.1 | 图片懒加载 | 全局 | P3 | `loading="lazy"` + Intersection Observer |
| 10.2 | CSS 内联首屏关键样式 | `index.html` | P3 | 首屏所需 CSS 直接内联，减少请求 |
| 10.3 | JS 异步加载 | `index.html` | P3 | `defer` 或 `type="module"` 异步加载 |
| 10.4 | 动画 GPU 加速 | 全局 | P3 | `will-change: transform` + `transform: translateZ(0)` |
| 10.5 | 列表虚拟滚动 | 长列表 | P3 | 仅渲染可见区域的列表项 |

---

## 三、HTML 结构改造要点

### 3.1 index.html 改造

现有首页 HTML 需要替换为以下容器结构（由 JavaScript 渲染内容）：

```html
<!-- 移动端容器 (用于 <768px) -->
<div id="mobileApp" class="mobile-layout">
  <!-- 页面由 JS 动态渲染 -->
</div>

<!-- 桌面端容器 (用于 >=768px) 保持现有 -->
<div id="desktopApp" class="desktop-layout">
  <!-- 现有内容 -->
</div>
```

### 3.2 媒体查询断点

```css
/* 移动端样式 (默认, 0-767px) */
.mobile-layout { display: block; }
.desktop-layout { display: none; }

/* 桌面端样式 (≥768px) */
@media (min-width: 768px) {
  .mobile-layout { display: none; }
  .desktop-layout { display: block; }
}
```

### 3.3 JS 条件加载

```html
<script>
  if (window.innerWidth < 768) {
    // 加载移动端 JS
    loadScript('mobile/js/mobile-app.js');
    loadScript('mobile/js/mobile-home.js');
    loadScript('mobile/js/mobile-search.js');
    loadScript('mobile/js/mobile-gesture.js');
  } else {
    // 加载桌面端 JS (现有)
    loadScript('js/desktop-app.js');
  }
</script>
```

---

## 四、修改优先级总结

| 阶段 | 名称 | 优先级 | 文件数 | 预估工时 |
|------|------|--------|--------|----------|
| 1 | 基础框架 | P0 | 3 | 2 天 |
| 2 | 底部导航 | P0 | 3 | 1 天 |
| 3 | 首页改造 | P0 | 3 | 2 天 |
| 4 | 搜索改造 | P0 | 2 | 2 天 |
| 5 | 详情页改造 | P1 | 3 | 3 天 |
| 6 | 学习系统改造 | P1 | 2 | 3 天 |
| 7 | 工具页面改造 | P2 | 2 | 2 天 |
| 8 | 手势与交互 | P1 | 1 | 2 天 |
| 9 | 兼容与测试 | P2 | - | 2 天 |
| 10 | 性能优化 | P3 | - | 1 天 |
| | **总计** | | **~19 文件** | **~20 天** |

---

## 五、风险与对策

| 风险 | 可能性 | 影响 | 对策 |
|------|--------|------|------|
| file:// 协议无法加载本地 CSS/JS | 高 | 高 | 使用内联 `<style>` 和 `<script>`，或通过 1 号集成到软件时用相对路径 |
| 微信 X5 内核不兼容部分 CSS | 中 | 中 | 避免使用较新的 CSS 特性 (如 :has(), subgrid)，使用 -webkit- 前缀 |
| iOS 键盘弹出遮挡输入框 | 高 | 高 | 使用 `visualViewport` API 监听键盘事件 |
| 旧手机性能不足导致动画卡顿 | 中 | 中 | 使用 `prefers-reduced-motion` 降级，优先保证功能可用 |
| 42K 知识文件加载影响首屏速度 | 高 | 中 | 首页不依赖知识文件内容，仅使用 localStorage 缓存的数据 |

---

## 六、验收测试清单

### 6.1 功能验收

- [ ] 首页 5 区域完整显示
- [ ] 快捷入口 8 个可点击跳转
- [ ] 搜索覆盖层弹出/关闭动画流畅
- [ ] 搜索联想建议在 200ms 内显示
- [ ] 搜索结果高亮显示匹配文字
- [ ] 详情页代码块可复制
- [ ] 详情页表格在手机端显示为卡片
- [ ] 底部导航 5 Tab 切换正常
- [ ] 学习系统关卡卡片显示进度
- [ ] 练习题选择有 48px 触控区

### 6.2 交互验收

- [ ] 所有按钮点击有视觉反馈 (缩放/变色)
- [ ] 按钮最小 44×44px
- [ ] 正文字号 ≥16px
- [ ] 页面 Push/Pop 动画 300ms
- [ ] 边缘滑动返回生效
- [ ] 下拉刷新推荐列表
- [ ] 长按卡片弹出操作菜单
- [ ] 暗色模式切换立即生效

### 6.3 性能验收

- [ ] 首屏渲染 < 2s (3G 模拟)
- [ ] 列表滚动 60fps
- [ ] 无内存泄漏 (连续切换 Tab 30 次后内存稳定)
- [ ] 骨架屏在 200ms 内显示

### 6.4 兼容性验收

- [ ] iPhone SE (320px) 布局完整
- [ ] iPhone 12 (390px) 布局完整
- [ ] 三星 Galaxy S21 (412px) 布局完整
- [ ] 平板竖屏 (768px) 自动切换到桌面布局
- [ ] iOS Safari 键盘弹出时搜索框可见
- [ ] 暗色模式跟随系统设置

---

## 总结

本实施计划将移动端 UI 重构分解为 10 个阶段、约 50 个具体任务，按优先级 P0→P3 排列。P0 任务（基础框架/底部导航/首页/搜索）是"能用"的基础，P1 任务（详情页/学习系统）是"好用"的核心，P2/P3 任务（工具页/手势/性能）是"优用"的增强。预计总工时约 20 天，产出约 19 个新文件。所有代码修改以新增文件为主，尽量减少对现有桌面端代码的修改（通过媒体查询和条件加载实现双端共存）。
