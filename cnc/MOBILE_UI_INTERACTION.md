# 移动端UI重构 — 交互规范

> 文档版本: 1.0  
> 覆盖范围: 手势操作、动画效果、反馈机制、触摸事件、加载状态

---

## 一、手势操作规范

### 1.1 基础手势定义

| 手势 | 触发条件 | 触点 | 响应对象 | 反馈 |
|------|----------|------|----------|------|
| 点击 (tap) | touchstart + touchend < 300ms, 移动 < 10px | 1 指 | 按钮/卡片/列表项 | 视觉缩放 + 背景变色 |
| 长按 (longpress) | touchstart 持续 > 500ms, 移动 < 10px | 1 指 | 卡片/列表项 | 触觉震动 + 弹出菜单 |
| 滑动 (swipe) | touchstart → touchend, 移动 > 50px, 方向明确 | 1 指 | 页面/列表/卡片 | 跟随手指 + 弹性效果 |
| 双击 (doubletap) | 两次 tap < 300ms | 1 指 | 图片/图谱画布 | 缩放动画 |
| 双指缩放 (pinch) | 双指 touchstart + 距离变化 | 2 指 | 图谱/图片 | 平滑缩放 |
| 下拉刷新 (pulltorefresh) | 顶部向下滑动 > 60px | 1 指 | 列表页面 | 刷新指示器 + 弹性回弹 |
| 上拉加载 (loadmore) | 底部触发区域 | 1 指 | 列表页面 | loading 指示器 |

### 1.2 点击交互 (Tap)

点击是使用最频繁的操作，需要极低延迟和高反馈感：

```javascript
// 自定义 tap 事件，消除 300ms 延迟
function addTapListener(element, callback) {
  var startX, startY, startTime;
  var isTapping = false;

  element.addEventListener('touchstart', function(e) {
    var touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    startTime = Date.now();
    isTapping = true;
    
    // 立即视觉反馈 (按下)
    element.classList.add('pressed');
  });

  element.addEventListener('touchmove', function(e) {
    if (!isTapping) return;
    var touch = e.touches[0];
    var dx = Math.abs(touch.clientX - startX);
    var dy = Math.abs(touch.clientY - startY);
    if (dx > 10 || dy > 10) {
      isTapping = false;
      element.classList.remove('pressed');
    }
  });

  element.addEventListener('touchend', function(e) {
    element.classList.remove('pressed');
    if (!isTapping) return;
    var elapsed = Date.now() - startTime;
    if (elapsed < 300) {
      e.preventDefault();
      callback(e);
    }
  });
}
```

**反馈 CSS**：

```css
.pressed {
  transform: scale(0.96);
  opacity: 0.8;
  transition: transform 0.1s, opacity 0.1s;
}

/* 按钮点击 */
.btn:active {
  transform: scale(0.94);
  opacity: 0.85;
}

/* 卡片点击 */
.card:active {
  background: rgba(0,0,0,0.03);
  transform: scale(0.98);
}

/* 列表项点击 */
.list-item:active {
  background: #f0f2f5;
}
```

### 1.3 长按交互 (Long Press)

长按用于触发上下文操作，需要在移动端和桌面端同时支持：

```javascript
function addLongPressListener(element, callback) {
  var timer = null;
  var started = false;

  element.addEventListener('touchstart', function(e) {
    started = true;
    timer = setTimeout(function() {
      if (started) {
        started = false;
        // 触觉反馈 (如果设备支持)
        if (navigator.vibrate) navigator.vibrate(15);
        e.preventDefault();
        callback(e);
      }
    }, 500);
  });

  element.addEventListener('touchmove', function(e) {
    if (started) {
      clearTimeout(timer);
      started = false;
    }
  });

  element.addEventListener('touchend', function(e) {
    clearTimeout(timer);
    started = false;
  });

  // 桌面端鼠标支持
  element.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    callback(e);
  });
}
```

### 1.4 滑动交互 (Swipe)

滑动用于页面导航和列表操作：

```javascript
function addSwipeListener(element, callbacks) {
  var startX, startY, startTime;
  var isSwiping = false;

  element.addEventListener('touchstart', function(e) {
    var touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    startTime = Date.now();
    isSwiping = true;
  });

  element.addEventListener('touchmove', function(e) {
    if (!isSwiping) return;
    var touch = e.touches[0];
    var dx = touch.clientX - startX;
    var dy = touch.clientY - startY;
    var absDx = Math.abs(dx);
    var absDy = Math.abs(dy);

    // 确定滑动方向 (水平 vs 垂直)
    if (absDx > absDy && absDx > 10) {
      e.preventDefault();
      // 跟随手指移动
      element.style.transform = 'translateX(' + dx + 'px)';
      element.style.transition = 'none';
      element.style.opacity = 1 - Math.min(absDx / 200, 0.5);
    }
  });

  element.addEventListener('touchend', function(e) {
    if (!isSwiping) return;
    isSwiping = false;
    var dx = parseInt(element.style.transform.replace('translateX(', '')) || 0;
    var absDx = Math.abs(dx);
    var elapsed = Date.now() - startTime;

    // 速度判断 (快速滑动即使小于阈值也触发)
    var velocity = absDx / elapsed;
    if (absDx > 80 || velocity > 0.5) {
      // 滑动成功
      var direction = dx > 0 ? 'right' : 'left';
      var animEnd = direction === 'right' ? '100%' : '-100%';
      element.style.transform = 'translateX(' + animEnd + ')';
      element.style.transition = 'transform 0.25s ease';
      element.style.opacity = '0';
      
      setTimeout(function() {
        element.style.transform = '';
        element.style.transition = '';
        element.style.opacity = '';
        if (callbacks && callbacks[direction]) callbacks[direction]();
      }, 250);
    } else {
      // 滑动取消，弹回
      element.style.transform = 'translateX(0)';
      element.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)';
      element.style.opacity = '1';
    }
  });
}
```

**滑动返回**：从屏幕左边缘向右滑动触发返回操作：

```javascript
// 边缘滑动返回
function addEdgeSwipeBack(element, onBack) {
  var EDGE_THRESHOLD = 20; // 从左侧 20px 内开始
  var SWIPE_THRESHOLD = 60;

  element.addEventListener('touchstart', function(e) {
    var touch = e.touches[0];
    if (touch.clientX < EDGE_THRESHOLD) {
      // 边缘手势开始
      startEdgeSwipe(e, onBack);
    }
  });
}
```

### 1.5 双击交互 (Double Tap)

双击用于知识图谱节点展开和图片缩放：

```javascript
function addDoubleTapListener(element, callback) {
  var lastTap = 0;
  var timer = null;

  element.addEventListener('touchend', function(e) {
    var now = Date.now();
    var elapsed = now - lastTap;
    lastTap = now;

    if (elapsed < 300 && elapsed > 0) {
      // 双击检测成功
      clearTimeout(timer);
      e.preventDefault();
      callback(e);
    } else {
      // 等待可能的第二次点击
      timer = setTimeout(function() {}, 300);
    }
  });
}
```

---

## 二、动画效果规范

### 2.1 动画类型与参数

| 动画类型 | 属性 | 时长 | 缓动函数 | 触发场景 |
|----------|------|------|----------|----------|
| fade-in | opacity | 200ms | ease-out | 页面出现、弹窗显示 |
| fade-out | opacity | 150ms | ease-in | 页面消失、弹窗关闭 |
| slide-up | transform:translateY | 300ms | cubic-bezier(0.25, 0.1, 0.25, 1) | 底部面板弹出 |
| slide-down | transform:translateY | 250ms | ease-out | 搜索覆盖层、通知 |
| slide-left | transform:translateX | 300ms | cubic-bezier(0.25, 0.1, 0.25, 1) | 页面 push |
| slide-right | transform:translateX | 300ms | cubic-bezier(0.25, 0.1, 0.25, 1) | 页面 pop |
| scale-bounce | transform:scale | 200ms | cubic-bezier(0.175, 0.885, 0.32, 1.275) | 按钮点击 |
| skeleton-shimmer | background-position | 1.4s | ease infinite | 骨架屏加载 |
| spinner-rotate | transform:rotate | 0.8s | linear infinite | loading 指示器 |
| ripple | clip-path:circle | 400ms | ease-out | 按钮水波纹效果 |

### 2.2 CSS 动画定义

```css
/* 统一动画曲线 */
:root {
  --ease-out: cubic-bezier(0.25, 0.1, 0.25, 1);
  --ease-in: cubic-bezier(0.42, 0, 1, 1);
  --ease-bounce: cubic-bezier(0.175, 0.885, 0.32, 1.275);
  --anim-fast: 150ms;
  --anim-normal: 250ms;
  --anim-slow: 300ms;
}

/* 页面推入 */
.page-enter {
  animation: pageEnter var(--anim-slow) var(--ease-out) forwards;
}
@keyframes pageEnter {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

/* 页面退出 */
.page-exit {
  animation: pageExit var(--anim-slow) var(--ease-out) forwards;
}
@keyframes pageExit {
  from { transform: translateX(0); }
  to { transform: translateX(30%); opacity: 0.8; }
}

/* 底部面板弹出 */
.sheet-enter {
  animation: sheetEnter var(--anim-slow) var(--ease-out) forwards;
}
@keyframes sheetEnter {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

/* 搜索覆盖层 */
.overlay-enter {
  animation: overlayEnter var(--anim-normal) ease-out forwards;
}
@keyframes overlayEnter {
  from { transform: translateY(-100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

/* 骨架屏闪烁 */
@keyframes skeletonLoading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.skeleton {
  background: linear-gradient(90deg, #e8e8e8 25%, #f5f5f5 37%, #e8e8e8 63%);
  background-size: 200% 100%;
  animation: skeletonLoading 1.4s ease infinite;
  border-radius: 8px;
}

/* Loading 旋转 */
@keyframes spin {
  to { transform: rotate(360deg); }
}
.spinner {
  width: 24px; height: 24px;
  border: 3px solid #e0e0e0;
  border-top-color: #2980b9;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* Toast 提示 */
.toast {
  animation: toastIn 0.3s ease-out, toastOut 0.3s ease-in 2.2s forwards;
}
@keyframes toastIn {
  from { transform: translateY(100px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
@keyframes toastOut {
  from { opacity: 1; }
  to { opacity: 0; }
}
```

### 2.3 动画性能要求

- 所有动画使用 `transform` 和 `opacity` 属性（GPU 加速）
- 禁止对 `width`, `height`, `top`, `left` 做动画（触发 layout）
- 动画帧率保证 60fps（使用 requestAnimationFrame）
- 动画时长控制在 150-300ms 之间
- 复杂动画使用 `will-change` 提前声明

```css
/* GPU 加速优化 */
.anim-gpu {
  will-change: transform, opacity;
  transform: translateZ(0); /* 强制 GPU 层 */
}
```

### 2.4 无障碍动画

对于 `prefers-reduced-motion` 用户，所有动画降级为瞬时切换：

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
  .page-enter { transform: none; }
  .page-exit { transform: none; }
  .sheet-enter { transform: none; }
}
```

---

## 三、反馈机制

### 3.1 视觉反馈

| 场景 | 反馈类型 | 表现 | 时机 |
|------|----------|------|------|
| 按钮点击 | 缩放 + 颜色变化 | scale(0.94) + 背景变深 | pointerdown |
| 卡片点击 | 微缩放 | scale(0.98) + 阴影变化 | pointerdown |
| 长按 | 震动 + 高亮 | 背景色加深 + 震动反馈 | 500ms 后 |
| 滑动 | 跟随手指 + 不透明度 | transform + opacity | 滑动中 |
| 页面切换 | push/pop 动画 | 全屏滑动 | 触发后 |
| 操作成功 | Toast | 底部弹出，2s 消失 | 操作完成后 |
| 操作失败 | Toast + 震动 | 红色 Toast + 触觉反馈 | 操作完成后 |
| 加载完成 | 内容渐入 | opacity 0→1 | 数据到达 |
| 下拉刷新 | 指示器下拉 | 箭头旋转 + 文案变化 | 下拉中 |

### 3.2 Toast 提示

```javascript
function showToast(message, type) {
  type = type || 'info'; // info | success | error
  var toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  // 自动移除
  setTimeout(function() {
    toast.addEventListener('animationend', function() {
      toast.remove();
    });
    toast.style.animation = 'toastOut 0.3s ease-in forwards';
  }, 2200);
}
```

**Toast 样式**：

```css
.toast {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  background: rgba(0,0,0,0.85);
  color: #fff;
  font-size: 15px;
  border-radius: 24px;
  white-space: nowrap;
  max-width: 80vw;
  text-overflow: ellipsis;
  overflow: hidden;
  z-index: 9999;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  animation: toastIn 0.3s ease-out;
}
.toast-success { background: rgba(39, 174, 96, 0.9); }
.toast-error { background: rgba(231, 76, 60, 0.9); }
```

### 3.3 加载骨架屏 (Skeleton)

骨架屏是首屏加载的核心反馈，每个页面组件对应一个骨架片：

```html
<!-- 首页骨架屏 -->
<div class="skeleton-page" id="skeletonHome">
  <div class="skeleton skeleton-topbar" style="height:44px; width:100%; margin-bottom:8px;"></div>
  <div class="skeleton skeleton-search" style="height:44px; width:90%; margin:0 auto 16px; border-radius:22px;"></div>
  <div class="skeleton-grid">
    <div class="skeleton skeleton-entry" style="height:80px; width:22%; border-radius:12px;"></div>
    <div class="skeleton skeleton-entry" style="height:80px; width:22%; border-radius:12px;"></div>
    <div class="skeleton skeleton-entry" style="height:80px; width:22%; border-radius:12px;"></div>
    <div class="skeleton skeleton-entry" style="height:80px; width:22%; border-radius:12px;"></div>
  </div>
  <div class="skeleton skeleton-list" style="height:120px; width:100%; margin-top:16px; border-radius:12px;"></div>
  <div class="skeleton skeleton-list" style="height:120px; width:100%; margin-top:12px; border-radius:12px;"></div>
</div>
```

骨架屏显示时机：页面开始加载时立即显示，数据到达后隐藏（通常 200-500ms）。

### 3.4 下拉刷新 (Pull to Refresh)

```javascript
function addPullToRefresh(element, onRefresh) {
  var startY = 0;
  var pullDistance = 0;
  var THRESHOLD = 60;
  var isPulling = false;
  var maxPull = 120;

  element.addEventListener('touchstart', function(e) {
    if (element.scrollTop === 0) {
      startY = e.touches[0].clientY;
      isPulling = true;
    }
  });

  element.addEventListener('touchmove', function(e) {
    if (!isPulling) return;
    var currentY = e.touches[0].clientY;
    pullDistance = Math.max(0, currentY - startY);
    
    if (pullDistance > 0) {
      e.preventDefault();
      // 弹性阻力效果
      var elasticDistance = pullDistance * 0.4;
      if (pullDistance > THRESHOLD) {
        elasticDistance = THRESHOLD * 0.4 + (pullDistance - THRESHOLD) * 0.2;
      }
      updatePullIndicator(elasticDistance, pullDistance >= THRESHOLD);
    }
  });

  element.addEventListener('touchend', function(e) {
    if (!isPulling) return;
    isPulling = false;
    if (pullDistance >= THRESHOLD) {
      // 触发刷新
      showRefreshLoading();
      onRefresh(function() {
        hideRefreshLoading();
      });
    } else {
      // 弹回
      resetPullIndicator();
    }
    pullDistance = 0;
  });
}
```

### 3.5 触觉反馈 (Haptic)

```javascript
// iOS 触觉反馈
function hapticFeedback(type) {
  type = type || 'light'; // light | medium | heavy | selection | notification
  if (window.navigator && window.navigator.vibrate) {
    var durations = {
      light: 10,
      medium: 20,
      heavy: 40,
      selection: [10, 30, 10],
      notification: [10, 50, 10, 50, 10]
    };
    window.navigator.vibrate(durations[type] || 10);
  }
  // iOS Taptic Engine (通过 UIInteraction)
  if (window.navigator.mediaDevices) {
    // iOS 不支持 vibrate，使用 Web Haptic API
  }
}
```

---

## 四、触摸事件策略

### 4.1 事件优先级

```
pointerdown → touchstart → mousedown (按触发顺序)
推荐使用 Pointer Events API (统一触控和鼠标)
```

### 4.2 事件委托

使用事件委托减少绑定数量，提升性能：

```javascript
// 在一个容器上监听所有点击
document.getElementById('contentArea').addEventListener('click', function(e) {
  var target = e.target.closest('[data-action]');
  if (!target) return;
  var action = target.dataset.action;
  
  switch(action) {
    case 'navigate': handleNavigate(target.dataset.path); break;
    case 'favorite': handleFavorite(target.dataset.id); break;
    case 'share': handleShare(target.dataset.id); break;
    case 'copy': handleCopy(target.dataset.text); break;
  }
});
```

### 4.3 滚动性能

```css
/* 启用 GPU 加速滚动 */
.scroll-container {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}
```

### 4.4 防止误触

```javascript
// 防止双击缩放 (在搜索页面等)
document.addEventListener('dblclick', function(e) {
  e.preventDefault();
}, { passive: false });

// 防止长按弹出菜单
document.addEventListener('contextmenu', function(e) {
  e.preventDefault();
}, { passive: false });
```

---

## 五、加载状态管理

### 5.1 加载时序

```
0ms      →   用户操作 (click/touch)
50ms     →   :active 伪类触发 (视觉反馈)
100ms    →   显示加载指示器 (如果仍未完成)
200ms    →   Skeleton → 内容替换 (数据到达)
300ms    →   Toast 反馈 (操作完成)
2.2s     →   Toast 消失
```

### 5.2 状态切换规范

```javascript
var LoadingState = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
  EMPTY: 'empty'
};

function switchState(container, state, data) {
  // 隐藏所有状态
  container.querySelectorAll('.state-*').forEach(function(el) {
    el.style.display = 'none';
  });
  
  switch(state) {
    case 'loading':
      container.querySelector('.state-loading').style.display = 'flex';
      break;
    case 'success':
      container.querySelector('.state-content').style.display = 'block';
      renderData(container, data);
      break;
    case 'error':
      container.querySelector('.state-error').style.display = 'flex';
      break;
    case 'empty':
      container.querySelector('.state-empty').style.display = 'flex';
      break;
  }
}
```

---

## 六、响应式交互适配

### 6.1 横屏检测

```javascript
function isLandscape() {
  return window.innerWidth > window.innerHeight;
}

window.addEventListener('orientationchange', function() {
  // 横屏 → 显示更多内容
  if (isLandscape()) {
    document.body.classList.add('landscape');
    // 调整布局
  } else {
    document.body.classList.remove('landscape');
  }
});
```

### 6.2 键盘弹出适配

```javascript
// 监听键盘弹出，调整布局
var originalHeight = window.innerHeight;

window.addEventListener('resize', function() {
  var currentHeight = window.innerHeight;
  var keyboardHeight = originalHeight - currentHeight;
  
  if (keyboardHeight > 100) {
    // 键盘弹出，把输入框调整到键盘上方
    document.body.classList.add('keyboard-open');
  } else {
    document.body.classList.remove('keyboard-open');
  }
});
```

### 6.3 交互优先级

根据拇指舒适度区域，交互控件按以下优先级放置：

```
拇指自然区域 (屏幕底部 1/3):
  优先级 1: 主要操作按钮 (收藏、下一页、确认)
  优先级 2: 底部导航栏

拇指延伸区域 (屏幕中部 1/3):
  优先级 3: 列表项选择、内容展示
  优先级 4: 搜索框

拇指困难区域 (屏幕顶部 1/3):
  优先级 5: 标题、返回按钮
  优先级 6: 设置入口、通知
```

---

## 七、跨平台兼容

| 平台 | 兼容问题 | 解决方案 |
|------|----------|----------|
| iOS Safari | 300ms 点击延迟 | 使用 touch 事件 + CSS touch-action |
| iOS Safari | 底部安全区域 | env(safe-area-inset-bottom) |
| Chrome Android | 滚动卡顿 | -webkit-overflow-scrolling: touch |
| 微信内置浏览器 | 缓存问题 | 版本号 URL 参数 |
| 所有平台 | 触控 vs 鼠标 | Pointer Events API 统一处理 |
| 所有平台 | 系统字体缩放 | 使用 rem 而非 px |

---

## 总结

本交互规范定义了移动端 UI 的完整交互体系：4 种核心手势（点击、长按、滑动、双击）、5 种布局动画（fade/slide/scale/skeleton/spinner）、3 级反馈机制（视觉/触觉/状态）。所有交互设计以拇指操作为中心，确保响应时间 < 100ms，动画帧率 60fps，并遵循无障碍设计原则。
