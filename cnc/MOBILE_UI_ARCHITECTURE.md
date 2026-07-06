# 移动端UI重构 — 页面架构设计

> 文档版本: 1.0  
> 目标平台: 手机浏览器 (iOS Safari / Chrome Android)  
> 设计基线: 375×667 (iPhone SE/8 尺寸)  
> 适配范围: 320px – 768px 宽度

---

## 一、现状问题分析

### 1.1 当前软件在手机端的核心问题

通过对现有桌面端 UI 在手机屏幕上的表现分析，识别出 8 个关键问题：

**问题1：布局溢出与缩放混乱**  
现有 CSS 使用固定 px 宽度和绝对定位，在 375px 宽的手机屏幕上，页面内容溢出右侧，浏览器自动缩放导致字体小到无法阅读（实测 G 代码详情页在主流的 Chrome Android 上，正文字号等效于 9px，远低于可读阈值）。

**问题2：交互热区过小**  
桌面端设计的按钮为 24×24px 图标和 12px 字号链接，远低于移动端推荐最小触摸目标 44×44px。操机员戴手套操作时几乎无法准确点击。

**问题3：导航层级混乱**  
现有导航采用左侧边栏+顶部标签+面包屑的三重导航体系，在手机屏幕上一方面占据大量空间，另一方面用户找不到功能入口（实测 "进入学习系统" 需要 6 次点击）。

**问题4：缺乏触控优化**  
没有实现触摸事件处理，所有交互依赖 click 事件（有 300ms 延迟）。没有滑动返回、长按预览、下拉刷新、上拉加载等移动端标准交互。

**问题5：内容密度过高**  
桌面端单屏可展示 30 条知识列表，手机端被迫缩放后每条只有 3 行可见，滚动极度频繁（搜索 "G代码" 返回 47 条结果，需要滚动 12 屏才能看完）。

**问题6：表单输入困难**  
搜索框在手机端聚焦后，键盘弹起遮挡搜索结果；筛选条件通过多列下拉菜单实现，手机上每个下拉需要精确点击，操作极度不友好。

**问题7：没有离线适配**  
在车间网络不稳定的情况下（实测车间 4G 信号 1-2 格），页面加载超时，没有任何离线缓存策略或加载状态提示。

**问题8：配色不适合车间环境**  
桌面端浅色主题在车间强光下完全不可读；暗色模式切换入口隐藏太深，绝大多数用户不知道如何开启。

### 1.2 用户画像与场景分析

**角色 A: 操机员（小张，25 岁，3 年经验）**  
- 场景: 机床旁边，戴棉纱手套，站立操作
- 需求: 快速查 G 代码格式、查报警代码含义
- 设备: 小米千元机，6.2 寸屏，户外亮度
- 时间: 每次操作 <30 秒，加工间隙查询
- 关键需求: 大按钮、大字体、暗色模式、搜索联想

**角色 B: 编程员（老王，40 岁，15 年经验）**  
- 场景: 办公室或车间编程，坐着看屏幕
- 需求: 查刀具参数、查切削参数、看加工案例
- 设备: iPhone 12，6.1 寸屏，正常光线
- 时间: 每次操作 2-5 分钟
- 关键需求: 内容详细、参数表清晰、可收藏

**角色 C: 学徒（小李，20 岁，入行 3 个月）**  
- 场景: 通勤地铁、午休、睡前
- 需求: 学习 12 关课程、刷题
- 设备: 荣耀千元机，6.5 寸屏
- 时间: 每次 10-20 分钟碎片时间
- 关键需求: 学习进度追踪、练习题交互、离线学习

**角色 D: 维修师傅（老刘，50 岁，20+ 年经验）**  
- 场景: 抢修现场，光线差，着急
- 需求: 查故障排除流程、查参数设定
- 设备: 老款华为，5.5 寸屏，近视+老花
- 关键需求: 字体大、步骤清晰、可语音搜索

---

## 二、设计原则

### 2.1 核心原则

**原则 1: 拇指操作优先（Thumb Zone First）**  
手机屏幕可分为三个触摸区：底部舒适区（拇指自然位置）、中部延伸区、顶部困难区。所有核心操作必须放在底部舒适区和中部延伸区，顶部仅放置非频繁操作的 Logo 和设置入口。

**原则 2: 3 秒可达（3-Second Rule）**  
从打开页面到找到核心功能入口，最长路径不超过 3 次触控。首页必须直接展示最常用的 8-12 个快捷入口，搜索框必须始终可见且处于页面上半部分。

**原则 3: 大字体大按钮（Accessibility First）**  
所有正文字号 ≥16px，标题字号 ≥20px，按钮最小尺寸 44×44px，行高 ≥1.5。车间环境（500-1000 lux 照度，阳光直射时可达 10000 lux）下必须保证可读。

**原则 4: 层级扁平化（Flat Hierarchy）**  
页面架构不超过 3 层：一级页签（底部导航）→ 二级页面（分类/列表）→ 三级页面（详情）。禁止超过 3 层的页面嵌套。

**原则 5: 渐进增强（Progressive Enhancement）**  
先保证基础功能在低端机上的可用性（CSS 基础样式 + 标准 DOM 事件），再逐步增强动画、过渡、手势等高级体验。

**原则 6: 离线优先（Offline First）**  
核心功能（最近查看、已收藏内容、基础搜索）在无网络环境下可用。使用 LocalStorage + Service Worker 缓存策略。

### 2.2 设计约束

```
屏幕宽度适配: 320px (小屏) / 375px (标准) / 414px (大屏) / 768px (平板)
页面层级: 最高 3 层
触摸目标: 最小 44×44px（推荐 48×48px）
正文字体: 最小 16px（推荐 18px）
行高: 最少 1.5（推荐 1.6）
动画时长: 150-300ms
导航点: 底部 Tab 最多 5 个
页面加载反馈: 200ms 内必须显示
```

---

## 三、页面架构总览

### 3.1 一级页面（底部导航）

底部导航栏固定 5 个 Tab，始终可见，点击即切换，无过渡动画延迟：

```
┌─────────────────────────────────────┐
│   (一级页面容器 — viewport 高度 100%)  │
│                                       │
│      内容区域 — 每个 Tab 独立          │
│                                       │
│                                       │
│                                       │
├─────────────────────────────────────┤
│  首页  知识  学习  工具   我的        │
│  (🏠)  (📚)  (🎯)  (🔧)  (👤)       │
└─────────────────────────────────────┘
```

| Tab | 名称 | 图标 | 定位 | 核心功能 |
|-----|------|------|------|----------|
| 1 | 首页 | 房子 | 功能入口聚合 | 搜索、快捷入口、最近查看、推荐 |
| 2 | 知识 | 书本 | 知识库浏览 | 分类导航、知识列表、筛选排序 |
| 3 | 学习 | 靶心 | 12 关学习系统 | 学习路线、课程、练习题 |
| 4 | 工具 | 扳手 | 实用工具集 | 参数计算、代码生成、速查表 |
| 5 | 我的 | 人像 | 个人中心 | 收藏、历史、设置、关于 |

### 3.2 二级页面（按 Tab 展开）

**首页 → 二级页面**：
- 首页本身无二级页面（所有功能在首页直达）
- 搜索框点击 → 搜索页（覆盖层，非独立页面）
- 快捷入口点击 → 直接跳转到对应的三级页面或外部二级页面

**知识 → 二级页面**：
- 分类列表页（按分类展示知识条目）
- 搜索结果页（搜索知识的专用结果）
- 收藏知识页（筛选已收藏条目）

**学习 → 二级页面**：
- 学习路线总览页（12 关卡片排列）
- 当前关卡详情页（关卡进度、课时列表）
- 练习题列表页

**工具 → 二级页面**：
- 参数速查页（G代码/ M代码速查表）
- 计算器页（切削参数计算器）
- 知识图谱可视化页

**我的 → 二级页面**：
- 个人资料页
- 收藏夹页
- 浏览历史页
- 设置页（主题、字体、存储管理）
- 关于页

### 3.3 三级页面（详情页 — 统一模板）

所有详情页使用同一套布局模板，包括：

- 知识详情页（知识库条目）
- 代码详情页（G代码/M代码详细说明）
- 课程详情页（学习课程内容）
- 案例详情页（加工案例）
- 工具详情页（参数说明）
- 报警详情页（故障排除）

详情页通用结构：

```
┌─────────────────────────────────────┐
│  状态栏沉浸 (透明/半透明)            │
├─────────────────────────────────────┤
│  导航栏: 返回按钮 + 标题 + 更多(…)   │
├─────────────────────────────────────┤
│                                     │
│        内容滚动区域                  │
│    (标题 → 属性 → 正文 →            │
│     相关推荐 → 操作按钮)             │
│                                     │
├─────────────────────────────────────┤
│  底部操作栏: 收藏 / 分享 / 字体调整  │
└─────────────────────────────────────┘
```

### 3.4 页面导航流程图

```
底部 Tab 切换 (5个)
  │
  ├── 首页 ───────── 搜索页 (覆盖层) ──── 详情页
  │     ├── 快捷入口 ────────────────── 详情页 / 外部页
  │     ├── 最近查看 ────────────────── 详情页
  │     └── 推荐内容 ────────────────── 详情页
  │
  ├── 知识 ───────── 分类列表页 ──────── 详情页
  │     ├── 搜索 (在知识Tab内) ──────── 搜索页 → 详情页
  │     └── 筛选/排序 ──────────────── 列表页 (参数更新)
  │
  ├── 学习 ───────── 路线总览页 ──────── 关卡详情页 → 课时详情页
  │     ├── 继续学习 ────────────────── 关卡详情页
  │     └── 练习题 ─────────────────── 答题页
  │
  ├── 工具 ───────── 速查表页 ───────── 代码详情页
  │     ├── 计算器 ─────────────────── 计算结果页 (同一页)
  │     └── 图谱 ───────────────────── 节点详情页 (覆盖层)
  │
  └── 我的 ───────── 设置页 ─────────── (弹窗/切换)
        ├── 收藏夹 ─────────────────── 详情页
        ├── 历史 ───────────────────── 详情页
        └── 关于 ───────────────────── (弹窗)
```

**关键导航规则**：
1. 底部 Tab 切换保留页面状态（首页保持滚动位置，知识保持筛选条件）
2. 二级→三级使用 push 动画（从左向右滑动）
3. 返回操作统一使用 pop 动画（从右向左滑动）
4. 搜索页使用覆盖层（从顶部弹出），点击搜索框外部或返回按钮关闭
5. 弹窗/底部菜单使用从底部滑出动画

---

## 四、核心页面布局规范

### 4.1 底部导航栏规范

```
高度: 56px (安全区域外) / 64px (含安全区域)
背景: 毛玻璃效果 (backdrop-filter: blur)
图标尺寸: 24×24px (DP)
文字尺寸: 11px (DP)
选中状态: 图标填充+颜色强调色
未选中: 图标线框+灰色
Badge: 在有更新/未完成时显示小红点
```

```css
/* 底部导航栏 CSS 规范 */
.bottom-nav {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  height: calc(56px + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  background: rgba(255,255,255,0.92);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  display: flex;
  justify-content: space-around;
  align-items: center;
  border-top: 0.5px solid rgba(0,0,0,0.08);
  z-index: 1000;
}
.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 56px;
  min-height: 44px;
  padding: 4px 0;
  border: none;
  background: none;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.nav-icon { width: 24px; height: 24px; margin-bottom: 2px; }
.nav-label { font-size: 11px; line-height: 1; }
```

### 4.2 顶部导航栏规范

```
高度: 44px (内容区域) + safe-area-top
左侧: 返回按钮 (44×44px)
中间: 标题文字 (20px, 单行截断)
右侧: 操作按钮 (44×44px, 可选)
背景: 与页面背景一致或半透明毛玻璃
显示规则:
  - 一级页面: 显示标题和右侧操作
  - 二级页面: 显示返回+标题+右侧操作
  - 三级页面: 显示返回+标题+右侧更多
```

### 4.3 内容间距规范

```
页面内边距:
  左右: 16px (标准) / 12px (小屏) / 20px (大屏)
  上下: 16px

卡片间距: 12px
列表项间距: 1px (分割线) + 16px padding

段落间距:
  标题与内容: 12px
  段落之间: 16px
  列表项之间: 8px

安全区域:
  顶部: env(safe-area-inset-top)
  底部: env(safe-area-inset-bottom)
```

### 4.4 触摸热区布局

根据拇指操作舒适度分析，将屏幕划分为三个区域：

```
┌─────────────────────────────────────┐
│  区域 C: 困难区 (顶部 1/3)           │
│  - Logo, 设置, 通知图标              │
│  - 非频繁操作                        │
│  高度: ≈250px                        │
├─────────────────────────────────────┤
│  区域 B: 延伸区 (中部 1/3)           │
│  - 内容列表, 卡片, 正文阅读          │
│  - 搜索框（推荐位置）                 │
│  高度: ≈200px                        │
├─────────────────────────────────────┤
│  区域 A: 舒适区 (底部 1/3 + 导航栏)   │
│  - 核心操作按钮                      │
│  - 快捷入口宫格                      │
│  - 底部操作栏                        │
│  高度: ≈200px + 56px bottom nav     │
└─────────────────────────────────────┘
```

**核心交互控件布局建议**：
- 搜索框: 区域 B 顶部（区域 C 底部也行，但 B 更优）
- 快捷入口: 区域 A 中部（拇指最舒适）
- 底部操作: 区域 A 底部（收藏/分享等）
- 确认按钮: 区域 A 中部或底部
- 列表选择: 区域 B 中部
- 设置开关: 根据频率决定（常用在 A，不常用在 C）

---

## 五、响应式适配策略

### 5.1 断点设置

```
xs: 320-374px   (小屏手机，如 iPhone SE 1代)
sm: 375-413px   (标准手机，如 iPhone 8/SE2)
md: 414-599px   (大屏手机，如 iPhone Plus)
lg: 600-767px   (小平板竖屏)
xl: 768px+      (平板横屏/桌面端，使用桌面布局)
```

### 5.2 适配策略

- 使用 `clamp()` 和 `calc()` 实现字号和间距的流体缩放
- 使用 `dvw` / `dvh` 单位替代 `vw` / `vh`（动态视口）
- 使用 CSS Grid 实现宫格布局自动调整列数
- 图片使用 `max-width: 100%` + `height: auto`
- 表格在手机上转换为卡片列表（隐藏次要列）

### 5.3 字体流体缩放

```css
:root {
  --font-size-body: clamp(16px, 4.27vw, 20px);
  --font-size-h1: clamp(24px, 6.4vw, 32px);
  --font-size-h2: clamp(20px, 5.33vw, 28px);
  --font-size-h3: clamp(18px, 4.8vw, 24px);
  --font-size-small: clamp(13px, 3.47vw, 16px);
  --font-size-label: clamp(11px, 2.93vw, 14px);
  --spacing-xs: clamp(4px, 1.07vw, 8px);
  --spacing-sm: clamp(8px, 2.13vw, 16px);
  --spacing-md: clamp(12px, 3.2vw, 24px);
  --spacing-lg: clamp(20px, 5.33vw, 40px);
}
```

---

## 六、页面过渡与路由

### 6.1 页面切换类型

| 类型 | 动画 | 适用场景 |
|------|------|----------|
| Tab 切换 | 瞬时切换（无动画）或 200ms fade | 底部导航切换 |
| Push 推入 | 300ms slide-left | 二级→三级页面 |
| Pop 返回 | 300ms slide-right | 三级→二级页面 |
| 覆盖层 | 250ms slide-down | 搜索页/弹出菜单 |
| 底部面板 | 300ms slide-up | 多选/分享/操作面板 |
| 淡入淡出 | 200ms opacity | 弹窗/提示/加载 |

### 6.2 过渡动画 CSS

```css
.page-push-enter {
  transform: translateX(100%);
  transition: transform 0.3s cubic-bezier(0.25, 0.1, 0.25, 1);
}
.page-push-enter-active { transform: translateX(0); }

.page-pop-enter {
  transform: translateX(-30%);
  transition: transform 0.3s cubic-bezier(0.25, 0.1, 0.25, 1);
}
.page-pop-enter-active { transform: translateX(0); }

.overlay-enter {
  transform: translateY(-100%);
  transition: transform 0.25s ease-out;
}
.overlay-enter-active { transform: translateY(0); }
```

---

## 七、加载与空状态

### 7.1 加载状态规范

| 状态 | UI 表现 | 触发条件 |
|------|---------|----------|
| 首次加载 | Skeleton 骨架屏（8-12 个灰块） | 页面首次渲染 |
| 刷新加载 | 顶部下拉指示器 | 用户下拉刷新 |
| 更多加载 | 底部 loading spinner | 滚动到底部加载更多 |
| 操作反馈 | Toast 提示（底部，2s 自动消失） | 收藏/分享/保存完成 |
| 错误 | 错误提示卡片 + 重试按钮 | 网络超时/加载失败 |
| 空数据 | 插画 + 引导文案 + 操作按钮 | 列表为空/搜索无结果 |

### 7.2 骨架屏规范

```css
.skeleton {
  background: linear-gradient(90deg, 
    #e0e0e0 25%, 
    #f0f0f0 37%, 
    #e0e0e0 63%
  );
  background-size: 400% 100%;
  animation: skeleton-loading 1.4s ease infinite;
  border-radius: 8px;
}
@keyframes skeleton-loading {
  0% { background-position: 100% 50%; }
  100% { background-position: 0 50%; }
}
```

---

## 八、页面状态管理

### 8.1 页面缓存策略

- 底部 Tab 容器使用 `display: none` 切换（保留 DOM 和滚动位置）
- 详情页每次 push 创建新实例（方便返回）
- 搜索页为单例覆盖层（复用实例，重置内容）
- 弹窗使用动态创建/销毁

### 8.2 页面状态保持

```
首页: 保持搜索词、最近查看列表、滚动位置
知识列表: 保持分类筛选、排序方式、滚动位置、页码
学习路线: 保持关卡展开状态、滚动位置
工具: 保持计算器输入值
我的: 无需保持特殊状态
```

---

## 九、页面注册表

所有页面的统一注册表，用于路由和导航控制：

```javascript
// 页面定义: { id, tab, title, parent, path, level, auth, cache }
var PAGES = [
  // Tab 1: 首页
  { id: 'home', tab: 0, title: '首页', parent: null, path: '/home', level: 1, cache: true },
  { id: 'search', tab: 0, title: '搜索', parent: 'home', path: '/search', level: 2, cache: false },
  
  // Tab 2: 知识
  { id: 'knowledge', tab: 1, title: '知识库', parent: null, path: '/knowledge', level: 1, cache: true },
  { id: 'knowledge-list', tab: 1, title: '{category}', parent: 'knowledge', path: '/knowledge/list', level: 2, cache: true },
  { id: 'knowledge-detail', tab: 1, title: '{title}', parent: 'knowledge-list', path: '/knowledge/detail', level: 3, cache: false },
  
  // Tab 3: 学习
  { id: 'learning', tab: 2, title: '学习', parent: null, path: '/learning', level: 1, cache: true },
  { id: 'learning-stage', tab: 2, title: '第{stage}关', parent: 'learning', path: '/learning/stage', level: 2, cache: true },
  { id: 'learning-lesson', tab: 2, title: '{lesson}', parent: 'learning-stage', path: '/learning/lesson', level: 3, cache: false },
  { id: 'learning-quiz', tab: 2, title: '练习题', parent: 'learning-stage', path: '/learning/quiz', level: 3, cache: false },
  
  // Tab 4: 工具
  { id: 'tools', tab: 3, title: '工具', parent: null, path: '/tools', level: 1, cache: true },
  { id: 'tools-gcode', tab: 3, title: 'G代码速查', parent: 'tools', path: '/tools/gcode', level: 2, cache: true },
  { id: 'tools-calculator', tab: 3, title: '切削计算器', parent: 'tools', path: '/tools/calculator', level: 2, cache: false },
  { id: 'tools-graph', tab: 3, title: '知识图谱', parent: 'tools', path: '/tools/graph', level: 2, cache: false },
  
  // Tab 5: 我的
  { id: 'profile', tab: 4, title: '我的', parent: null, path: '/profile', level: 1, cache: true },
  { id: 'profile-favorites', tab: 4, title: '收藏夹', parent: 'profile', path: '/profile/favorites', level: 2, cache: true },
  { id: 'profile-history', tab: 4, title: '浏览历史', parent: 'profile', path: '/profile/history', level: 2, cache: true },
  { id: 'profile-settings', tab: 4, title: '设置', parent: 'profile', path: '/profile/settings', level: 2, cache: false },
];
```

---

## 十、性能目标

| 指标 | 目标 | 测量方法 |
|------|------|----------|
| 首屏加载 | < 2s (3G) | Chrome DevTools Network Throttling |
| Tab 切换 | < 100ms | performance.now() instrumentation |
| 页面 Push | < 300ms (含动画) | requestAnimationFrame 检测 |
| 搜索响应 | < 200ms (本地) | 搜索输入到结果展示 |
| 列表滚动 | 60fps | Chrome DevTools FPS meter |
| 按钮反馈 | < 100ms | pointerdown → 视觉反馈 |
| 骨架屏显示 | < 200ms | 页面加载 → skeleton 出现 |
| 内容渲染 | < 500ms | 数据到 → DOM 渲染完成 |

---

## 十一、可访问性要求

- 所有按钮支持 `:focus-visible` 轮廓
- 所有图片使用 `alt` 属性
- 颜色对比度 ≥ 4.5:1 (正文) / ≥ 3:1 (大标题)
- 支持 `prefers-reduced-motion` 禁用动画
- 支持 `prefers-color-scheme: dark` 自动暗色模式
- 触摸目标最小 44×44px（WCAG 2.1 标准）
- 支持系统字体放大设置

---

## 总结

本架构文档定义了移动端 UI 重构的顶层设计：3 层页面架构、5 个底部 Tab、统一详情页模板、拇指操作优先布局、响应式断点系统、页面过渡规范和性能目标。后续文档将在此架构基础上详细设计每个页面的具体布局、交互细节和视觉表现。
