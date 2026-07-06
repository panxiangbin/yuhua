# 移动端UI重构 — 首页完整设计

> 文档版本: 1.0  
> 设计尺寸: 375×667px (基准)  
> 核心目标: 3秒内找到核心功能，单手可操作

---

## 一、首页布局总览

首页采用瀑布流式从上到下的布局，分为 5 个区域。用户只需拇指向下滑动即可浏览全部内容：

```
┌─────────────────────────────────────┐
│ 区域 1: 状态栏 + 顶部工具栏          │
│  [Logo]           [暗色] [设置]      │
│  高度: 44px + safe-area-top          │
├─────────────────────────────────────┤
│ 区域 2: 搜索区域 (固定/吸顶)          │
│  ┌─────────────────────────────┐    │
│  │ 🔍 搜索G代码/刀具/材料...     │    │
│  └─────────────────────────────┘    │
│  高度: 56px (含内边距)               │
├─────────────────────────────────────┤
│ 区域 3: 快捷入口宫格 (8-12个)         │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐      │
│  │G代码│ │M代码│ │刀具 │ │对刀 │      │
│  └────┘ └────┘ └────┘ └────┘      │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐      │
│  │工艺 │ │案例 │ │学习 │ │工具 │      │
│  └────┘ └────┘ └────┘ └────┘      │
│  高度: 180px (2行×90px)              │
├─────────────────────────────────────┤
│ 区域 4: 最近查看 (横向滚动)           │
│  [最近查看] → 更多                  │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐          │
│  │   │ │   │ │   │ │   │  →         │
│  └───┘ └───┘ └───┘ └───┘          │
│  高度: 140px                         │
├─────────────────────────────────────┤
│ 区域 5: 推荐内容 (纵向列表)           │
│  [推荐阅读]                          │
│  ┌──────────────────────────┐       │
│  │ G代码编程完整指南           │       │
│  │ > 标签: G00, G01, G02     │       │
│  └──────────────────────────┘       │
│  ┌──────────────────────────┐       │
│  │ FANUC系统报警代码速查      │       │
│  │ > 标签: FANUC, 报警       │       │
│  └──────────────────────────┘       │
│  ...加载更多...                      │
├─────────────────────────────────────┤
│          底部导航栏 (56px)            │
└─────────────────────────────────────┘
```

### 1.1 各区域高度分配（375px 视口）

| 区域 | 最小高度 | 最大高度 | 说明 |
|------|----------|----------|------|
| 顶部工具栏 | 44px | 44px | 固定，不滚动 |
| 搜索区域 | 56px | 56px | 吸顶，随滚动可固定 |
| 快捷入口 | 180px | 200px | 固定，不滚动 |
| 最近查看 | 140px | 160px | 固定高度，横向滚动 |
| 推荐内容 | 剩余 | 可滚动 | 占满剩余空间 |
| 底部导航 | 56px | 56px | 固定，覆盖内容 |

---

## 二、区域 1: 顶部工具栏

### 2.1 布局

```
┌─────────────────────────────────────┐
│  ┌────┐                      ┌──┐  │
│  │ 🔍  │  CNC Param Quick    │🌙│⚙│  │
│  └────┘     Finder           └──┴──┘  │
│  左侧: Logo图标 (36×36px)              │
│  中间: 产品名称 (16px, 灰色)            │
│  右侧: 暗色模式 + 设置 (44×44px)       │
└─────────────────────────────────────┘
```

### 2.2 交互规范

- 点击 Logo：回到首页顶部（若已顶部则无动作）
- 点击暗色模式图标：切换主题色（localStorage 持久化），图标切换（🌙→☀️）
- 点击设置：跳转至"我的 > 设置"页面
- 工具栏背景：半透明毛玻璃效果，与页面背景融合
- 暗色模式切换后立即生效，不需要页面刷新

### 2.3 代码实现

```html
<header class="top-bar" role="banner">
  <button class="top-logo" aria-label="返回首页">
    <img src="icon/logo.svg" alt="CNC Logo" width="36" height="36">
  </button>
  <span class="top-title">CNC Param QuickFinder</span>
  <div class="top-actions">
    <button class="top-btn" id="theme-toggle" aria-label="切换主题">
      <span class="icon-dark">🌙</span>
      <span class="icon-light hidden">☀️</span>
    </button>
    <button class="top-btn" id="settings-btn" aria-label="设置">
      <span>⚙️</span>
    </button>
  </div>
</header>
```

```css
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 44px;
  padding: 0 12px;
  padding-top: env(safe-area-inset-top, 0px);
  background: rgba(255,255,255,0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  position: sticky;
  top: 0;
  z-index: 100;
}
.top-logo {
  width: 44px; height: 44px;
  display: flex; align-items: center; justify-content: center;
  border: none; background: none; cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.top-title {
  font-size: 16px; font-weight: 600;
  color: #2c3e50; flex: 1; text-align: center;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.top-actions { display: flex; gap: 4px; }
.top-btn {
  width: 44px; height: 44px;
  display: flex; align-items: center; justify-content: center;
  border: none; background: none; border-radius: 50%;
  font-size: 20px; cursor: pointer;
  transition: background 0.2s;
  -webkit-tap-highlight-color: transparent;
}
.top-btn:active { background: rgba(0,0,0,0.08); }
```

---

## 三、区域 2: 搜索区域

### 3.1 布局

```
┌─────────────────────────────────────┐
│  ┌─────────────────────────────┐    │
│  │ 🔍 搜索G代码/刀具/材料/案例... │    │
│  └─────────────────────────────┘    │
│  左侧: 搜索图标 (20×20px)            │
│  占位符: "搜索G代码/刀具/材料/案例..." │
│  背景: 浅灰圆角矩形                  │
└─────────────────────────────────────┘
```

### 3.2 交互规范

- 点击搜索框：全屏搜索页面覆盖层（从顶部滑入）
- 输入时：实时显示搜索建议（>2字触发）
- 搜索建议类型：联想关键词、历史搜索、热门搜索
- 点击建议项：直接进入该关键词搜索结果页
- 搜索框始终可见（吸顶效果，滚动时保持在顶部）

### 3.3 代码实现

```html
<div class="search-area" role="search">
  <button class="search-trigger" aria-label="打开搜索">
    <span class="search-icon">🔍</span>
    <span class="search-placeholder">搜索G代码/刀具/材料/案例...</span>
  </button>
</div>
```

```css
.search-area {
  padding: 8px 16px;
  background: #fff;
  position: sticky;
  top: calc(44px + env(safe-area-inset-top, 0px));
  z-index: 99;
}
.search-trigger {
  width: 100%; height: 44px;
  display: flex; align-items: center;
  gap: 10px; padding: 0 16px;
  background: #f0f2f5;
  border: none; border-radius: 22px;
  font-size: 16px; color: #999;
  cursor: pointer; text-align: left;
  transition: background 0.2s;
  -webkit-tap-highlight-color: transparent;
}
.search-trigger:active { background: #e4e6eb; }
.search-icon { font-size: 18px; flex-shrink: 0; }
.search-placeholder {
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  color: #999; font-size: 16px;
}
```

---

## 四、区域 3: 快捷入口宫格

### 4.1 布局

```
┌─────────────────────────────────────┐
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐  │
│  │ G代码 │ │ M代码 │ │ 刀具  │ │ 对刀  │  │
│  └─────┘ └─────┘ └─────┘ └─────┘  │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐  │
│  │ 工艺  │ │ 案例  │ │ 学习  │ │ 工具  │  │
│  └─────┘ └─────┘ └─────┘ └─────┘  │
│  4列 × 2行 = 8个入口                 │
│  可扩展到 3行 = 12个入口（2屏轮换）    │
└─────────────────────────────────────┘
```

### 4.2 交互规范

- 每个入口：图标(36×36px) + 文字(14px)
- 点击：直接导航到对应的二级页面
- 长按：显示快捷操作菜单（收藏/分享）
- 第 2 屏（第 3 行）：向右滑动或点击"更多"展开
- 入口顺序可自定义（"我的"中设置）
- 高频使用入口自动提升到前8个

### 4.3 入口定义

```javascript
var QUICK_ENTRIES = [
  { id: 'gcode',    icon: 'G', label: 'G代码',   color: '#e74c3c', path: '/knowledge/list?type=gcode' },
  { id: 'mcode',    icon: 'M', label: 'M代码',   color: '#e67e22', path: '/knowledge/list?type=mcode' },
  { id: 'tool',     icon: '🔧', label: '刀具',    color: '#3498db', path: '/knowledge/list?type=tool' },
  { id: 'setup',    icon: '🎯', label: '对刀',    color: '#9b59b6', path: '/knowledge/list?keyword=对刀' },
  { id: 'process',  icon: '🔄', label: '工艺',    color: '#1abc9c', path: '/knowledge/list?type=process' },
  { id: 'case',     icon: '📋', label: '案例',    color: '#e91e63', path: '/knowledge/list?type=case' },
  { id: 'learn',    icon: '📚', label: '学习',    color: '#2980b9', path: '/learning' },
  { id: 'calc',     icon: '📐', label: '工具',    color: '#34495e', path: '/tools' },
  // 扩展 (第3行):
  { id: 'alarm',    icon: '⚠️', label: '报警',    color: '#c0392b', path: '/knowledge/list?keyword=报警' },
  { id: 'material', icon: '🔩', label: '材料',    color: '#27ae60', path: '/knowledge/list?type=material' },
  { id: 'brand',    icon: '🏷️', label: '品牌',    color: '#7f8c8d', path: '/knowledge/list?type=brand' },
  { id: 'exam',     icon: '📝', label: '考证',    color: '#00bcd4', path: '/learning/exam' },
];
```

### 4.4 代码实现

```html
<div class="quick-grid" role="navigation" aria-label="快捷入口">
  <div class="grid-title">快捷功能</div>
  <div class="grid-container" id="quickGrid">
    <!-- JavaScript 动态渲染 -->
  </div>
</div>
```

```css
.quick-grid {
  padding: 12px 16px 8px;
  background: #fff;
}
.grid-title {
  font-size: 16px; font-weight: 600;
  color: #2c3e50; margin-bottom: 12px;
}
.grid-container {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.quick-entry {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  height: 80px; padding: 8px;
  border-radius: 12px;
  border: none; cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
  -webkit-tap-highlight-color: transparent;
}
.quick-entry:active {
  transform: scale(0.94);
}
.entry-icon {
  width: 40px; height: 40px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 12px; font-size: 20px;
  margin-bottom: 6px;
}
.entry-label {
  font-size: 13px; font-weight: 500;
  color: #2c3e50; text-align: center;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  max-width: 100%;
}
```

```javascript
function renderQuickEntries() {
  var container = document.getElementById('quickGrid');
  var html = '';
  var entries = QUICK_ENTRIES.slice(0, 8);
  entries.forEach(function(entry) {
    html += '<button class="quick-entry" onclick="navigate(\'' + entry.path + '\')" ' +
      'style="background:' + entry.color + '15" aria-label="' + entry.label + '">' +
      '<span class="entry-icon" style="background:' + entry.color + ';color:#fff">' +
        entry.icon +
      '</span>' +
      '<span class="entry-label">' + entry.label + '</span>' +
    '</button>';
  });
  container.innerHTML = html;
}
```

---

## 五、区域 4: 最近查看

### 5.1 布局

```
┌─────────────────────────────────────┐
│  最近查看                     → 更多  │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐       │
│  │缩略 │ │缩略 │ │缩略 │ │缩略 │  →   │
│  │标题 │ │标题 │ │标题 │ │标题 │       │
│  │时间 │ │时间 │ │时间 │ │时间 │       │
│  └────┘ └────┘ └────┘ └────┘       │
│  横向可滚动，最多显示 10 条            │
└─────────────────────────────────────┘
```

### 5.2 交互规范

- 横向滑动浏览最近查看的知识条目
- 每条显示：图标+标题+查看时间
- 点击条目: 直接进入详情页
- 点击"更多"：进入完整的浏览历史列表
- 无历史时显示空状态："还没有浏览记录"
- 最近查看存储在 localStorage，上限 50 条

---

## 六、区域 5: 推荐内容

### 6.1 布局

```
┌─────────────────────────────────────┐
│  推荐阅读                             │
│  ┌───────────────────────────────┐   │
│  │ G00/G01快速定位与直线插补详解   │   │
│  │ G00, G01, 快速定位, 直线插补   │   │
│  │ 2026-07-06 · 184 字 · 🔥精选   │   │
│  └───────────────────────────────┘   │
│  ┌───────────────────────────────┐   │
│  │ FANUC G代码全集参考手册         │   │
│  │ FANUC, G代码, 参考手册         │   │
│  │ 2026-07-06 · 25.1K · 🔥精选    │   │
│  └───────────────────────────────┘   │
│  ┌───────────────────────────────┐   │
│  │ 更多加载...                       │   │
│  └───────────────────────────────┘   │
└─────────────────────────────────────┘
```

### 6.2 交互规范

- 纵向列表，无限滚动（每次加载 10 条）
- 每条显示：标题 + 标签 + 元数据（日期/字数/热度）
- 顶部有 Tab 切换："推荐" / "最新" / "热门"
- 上拉加载更多（底部 loading 指示器）
- 下划刷新（顶部刷新指示器）

---

## 七、空状态设计

### 7.1 最近查看为空

```html
<div class="empty-state">
  <div class="empty-icon">📖</div>
  <div class="empty-title">还没有浏览记录</div>
  <div class="empty-desc">去知识库浏览内容，这里会显示你的最近查看</div>
  <button class="empty-action" onclick="navigate('/knowledge')">去知识库</button>
</div>
```

### 7.2 推荐内容为空

```html
<div class="empty-state">
  <div class="empty-icon">📚</div>
  <div class="empty-title">知识库加载中...</div>
  <div class="empty-desc">请等待知识图谱数据导入完成后刷新</div>
</div>
```

---

## 八、首页响应式适配

### 8.1 小屏 320px

```
快捷入口: 4列 → 3列 (6个入口)
最近查看: 卡片宽度缩窄
字体: 使用 clamp() 缩小 10%
```

### 8.2 大屏 414px+

```
快捷入口: 4列 → 5列 (10个入口可见)
最近查看: 横向多显示1-2条
推荐列表: 列表项更多信息展示
```

### 8.3 平板 768px (横屏/竖屏)

```
布局: 分栏模式
左侧: 固定宽度 320px (快捷入口+最近查看)
右侧: 推荐内容列表 (充分利用宽屏)
底部导航: 保持在左侧 (侧边导航模式)
```

---

## 九、首页 JavaScript 逻辑

```javascript
(function() {
  var RECENT_KEY = 'cnc_recent_views';
  var MAX_RECENT = 50;

  function loadRecent() {
    try {
      var raw = localStorage.getItem(RECENT_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch(e) { return []; }
  }

  function renderRecent() {
    var items = loadRecent().slice(0, 10);
    var container = document.getElementById('recentList');
    if (!container) return;
    if (items.length === 0) {
      container.innerHTML = '<div class="empty-state-mini">暂无最近查看</div>';
      return;
    }
    var html = '';
    items.forEach(function(item) {
      html += '<button class="recent-card" onclick="navigate(\'/knowledge/detail?id=' + 
        encodeURIComponent(item.id) + '\')">' +
        '<div class="recent-thumb">' + (item.icon || '📄') + '</div>' +
        '<div class="recent-info">' +
        '<div class="recent-title">' + escapeHtml(item.title) + '</div>' +
        '<div class="recent-time">' + timeAgo(item.timestamp) + '</div>' +
        '</div></button>';
    });
    container.innerHTML = html;
  }

  function addRecentView(item) {
    var list = loadRecent();
    // 去重
    list = list.filter(function(i) { return i.id !== item.id; });
    list.unshift({
      id: item.id,
      title: item.title,
      icon: item.icon || '📄',
      timestamp: Date.now()
    });
    if (list.length > MAX_RECENT) list = list.slice(0, MAX_RECENT);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch(e) {}
    renderRecent();
  }

  function escapeHtml(text) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(text));
    return d.innerHTML;
  }

  function timeAgo(ts) {
    var diff = Date.now() - ts;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
    return Math.floor(diff / 86400000) + '天前';
  }

  // 页面加载时渲染
  document.addEventListener('DOMContentLoaded', function() {
    renderQuickEntries();
    renderRecent();
    // 加载推荐内容
    loadRecommendations();
  });

  window.addRecentView = addRecentView;
  window.renderRecent = renderRecent;
})();
```

---

## 十、首页性能优化

### 10.1 懒加载策略

- 快捷入口: 首屏立即渲染（8个入口，DOM 操作 < 5ms）
- 最近查看: 首屏后 200ms 渲染（数据在 localStorage，读取 < 2ms）
- 推荐内容: 首屏后 500ms 开始加载（需读取 IndexedDB/网络）
- 图片: 全部使用懒加载（loading="lazy" 属性）

### 10.2 缓存策略

- 首页 HTML 结构: 由 JavaScript 在 DOMContentLoaded 时渲染
- 快捷入口配置: 存储在 localStorage（可自定义）
- 最近查看: 每次查看详情时更新 localStorage
- 推荐内容: 缓存到 IndexedDB，5 分钟过期

### 10.3 首屏渲染优化顺序

```
1. 顶部工具栏 (同步)              → 0ms (内联 HTML)
2. 搜索区域 (同步)                → 0ms (内联 HTML)
3. 快捷入口 (同步 JS 渲染)         → ~5ms (8个按钮)
4. 最近查看 (localStorage 读取)    → ~10ms
5. 推荐内容 (IndexedDB 查询)       → ~100ms (异步)
6. 底部导航栏 (同步)              → 0ms (内联 HTML)
```

---

## 总结

首页设计围绕"3秒找到核心功能"的目标，采用 5 个垂直区域的分段布局：顶部工具栏（品牌+设置）→ 搜索区域（全局搜索入口）→ 快捷入口宫格（8-12个核心功能直达）→ 最近查看（横向滚动快速返回）→ 推荐内容（纵向列表发现新知识）。所有交互元素满足 44×44px 最小触控面积，关键按钮集中在拇指舒适区。
