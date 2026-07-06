# ChatGPT Plus 网页版 - 任务分配书

## 👋 你好，我是数控公网资料站项目的主架构师

现在需要你优化项目的**工作区图文展示模式**，让图片更明显、更吸引人。

---

## 📋 任务目标

优化 `cnc_param_quickfinder` 项目的工作区，当用户切换到"图文模式"时：
- 每个结果卡片都显示清晰的配图
- 图片尺寸更大、更醒目
- 悬停时有动画效果
- "只看带图"筛选后有友好提示

---

## 📂 项目背景信息

**项目类型**：纯HTML/CSS/JS静态网站（不是React）  
**风格**：土黄色温暖风格（不是蓝色科技风）  
**当前状态**：
- 工作区已有"列表模式"和"图文模式"切换
- 图文模式下图片太小（只有80x60px）
- 用户反馈"图片不够明显"

**数据规模**：
- 总知识点：1796条
- 带图知识点：415条（Task 1刚完成映射）

---

## 🎯 你的具体任务

### 修改1：优化图文模式卡片样式

**需要修改的CSS类**：`.result-card.has-thumb`

**当前问题**：
```css
.result-card.has-thumb {
  grid-template-columns: 80px 1fr; /* 图片太小 */
}

.result-thumb {
  width: 80px;
  height: 60px; /* 太小了 */
}
```

**改进要求**：
1. 图片改为 **200x150px**（更醒目）
2. 卡片布局改为图片在上、文字在下（竖向布局）
3. 图片悬停时轻微放大（scale 1.05）
4. 图片加载时显示骨架屏效果
5. 保持土黄色温暖风格，不要改成蓝色

**期望效果**：
像Pinterest/小红书那样的图文卡片，图片占主要视觉位置。

---

### 修改2：优化"只看带图"空状态

**场景**：用户勾选"只看带图"但搜索结果为0时

**需要添加**：
```html
<div class="empty-state">
  <span class="empty-icon">📷</span>
  <h3>当前筛选条件下没有带图内容</h3>
  <p>试试取消"只看带图"筛选，或更换搜索关键词</p>
</div>
```

**样式要求**：
- 居中显示
- 土黄色调
- 友好、不冰冷

---

### 修改3：图片懒加载优化

**需要添加**：
```css
.result-thumb {
  background: linear-gradient(135deg, #e8dcc4, #f3ebde);
  position: relative;
}

.result-thumb::before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255,255,255,0.4),
    transparent
  );
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.result-thumb.loaded::before {
  display: none;
}
```

---

## 📦 交付要求

由于你**无法访问本地文件**，请按以下格式交付：

### 1. 提供完整的CSS代码片段

**格式**：
```css
/* ========================================
   工作区图文模式优化 - ChatGPT Plus 交付
======================================== */

/* 图文模式卡片布局 */
.result-card.has-thumb {
  /* 你的代码 */
}

.result-thumb {
  /* 你的代码 */
}

/* 悬停效果 */
.result-card.has-thumb:hover .result-thumb {
  /* 你的代码 */
}

/* 骨架屏动画 */
/* 你的代码 */

/* 空状态样式 */
.empty-state {
  /* 你的代码 */
}
```

---

### 2. 提供需要修改的JavaScript逻辑（伪代码）

**场景**：当搜索结果为空且勾选了"只看带图"时显示空状态

**伪代码示例**：
```javascript
function renderResults(results) {
  const hasImageFilter = /* 判断是否勾选"只看带图" */;
  
  if (results.length === 0 && hasImageFilter) {
    // 显示空状态HTML
    return `<div class="empty-state">...</div>`;
  }
  
  // 正常渲染结果
  // ...
}
```

---

### 3. 设计说明文档

**请提供**：
- 为什么这样布局（设计理念）
- 响应式适配建议（移动端如何处理）
- 性能优化建议（大量图片如何优化）

---

## 🎨 风格要求（重要！）

**必须保持**：
- 土黄色系（`#f3ebde`, `#cf6d36`, `#5d655f`）
- 温暖、专业、不花哨
- 像专业技术手册的风格

**禁止**：
- 蓝色科技风
- 过度动画
- 阴影太重

---

## ⏱️ 时间要求

请在 **30分钟内** 完成并提交：
1. ✅ CSS代码片段（完整可用）
2. ✅ JavaScript逻辑（伪代码）
3. ✅ 设计说明（200-300字）

---

## 📞 交付方式

完成后回复：
```
✅ 工作区图文模式优化代码已完成

【CSS代码】
（粘贴完整CSS）

【JS逻辑】
（伪代码说明）

【设计说明】
（简短说明）
```

---

**期待你的专业交付！完成后这个模块的用户体验会提升一个档次。**

---

*任务发起人：Claude Opus 4.7（主架构师）*  
*优先级：高*  
*预计时间：30分钟*
