# ChatGPT Plus 网页版 - 任务4

## 👋 新任务来了

设计一个**搜索结果高亮显示组件**，让搜索关键词在结果中醒目标注。

---

## 📋 任务目标

当用户搜索时，在结果列表中高亮显示匹配的关键词，提升查找效率。

---

## 🎨 设计要求

### 场景
用户搜索"G54"，结果列表中所有包含"G54"的地方都要高亮显示。

### 高亮效果
- 背景色：#cf6d36（主色）
- 文字色：#fffaf2（浅色）
- 圆角：4px
- 内边距：2px 6px
- 字重：700（加粗）

### 匹配规则
1. **精准匹配**：完全匹配搜索词（如搜索"G54"匹配"G54"）
2. **忽略大小写**：搜索"g54"也能匹配"G54"
3. **部分匹配**：搜索"报警"能匹配"报警代码"、"伺服报警"
4. **多关键词**：搜索"G54 对刀"能同时高亮两个词

---

## 📦 交付格式

提供完整JavaScript函数 + CSS样式：

```javascript
/**
 * 高亮显示搜索关键词
 * @param {string} text - 原始文本
 * @param {string} keyword - 搜索关键词（可能包含多个词，空格分隔）
 * @returns {string} - 包含高亮标签的HTML
 */
function highlightKeywords(text, keyword) {
  // 你的代码
}
```

**使用示例**：
```javascript
const title = "G54工件坐标系设置与对刀流程";
const keyword = "G54 对刀";
const highlighted = highlightKeywords(title, keyword);
// 输出：<span class="highlight">G54</span>工件坐标系设置与<span class="highlight">对刀</span>流程
```

---

## 🎨 CSS样式

```css
.highlight {
  /* 你的样式 */
}
```

---

## ✅ 功能要求

1. ✅ 忽略大小写匹配
2. ✅ 支持多关键词（空格分隔）
3. ✅ 部分匹配（"报警"匹配"伺服报警"）
4. ✅ 避免HTML标签被破坏（安全处理）
5. ✅ 性能优化（大量结果时不卡顿）
6. ✅ 特殊字符转义（避免正则表达式错误）

---

## 🔒 安全要求

**输入处理**：
```javascript
// 错误示例（不安全）
text.replace(keyword, `<span class="highlight">${keyword}</span>`);

// 正确示例（安全）
// 1. 先转义HTML特殊字符
// 2. 再进行匹配和高亮
// 3. 避免XSS攻击
```

---

## 📝 测试用例

```javascript
// 测试1：基本匹配
highlightKeywords("G54工件坐标系", "G54")
// 期望：<span class="highlight">G54</span>工件坐标系

// 测试2：忽略大小写
highlightKeywords("G54工件坐标系", "g54")
// 期望：<span class="highlight">G54</span>工件坐标系

// 测试3：多关键词
highlightKeywords("G54工件坐标系对刀", "G54 对刀")
// 期望：<span class="highlight">G54</span>工件坐标系<span class="highlight">对刀</span>

// 测试4：部分匹配
highlightKeywords("伺服驱动报警代码", "报警")
// 期望：伺服驱动<span class="highlight">报警</span>代码

// 测试5：特殊字符
highlightKeywords("G02/G03圆弧插补", "G02/G03")
// 期望：<span class="highlight">G02/G03</span>圆弧插补

// 测试6：空关键词
highlightKeywords("G54工件坐标系", "")
// 期望：G54工件坐标系（不高亮）
```

---

## ⏱️ 时间要求

**30分钟内完成**

---

## 📝 交付格式

回复：
```
✅ 搜索高亮组件完成

【JavaScript代码】
（完整的highlightKeywords函数）

【CSS样式】
（.highlight样式）

【测试结果】
（验证6个测试用例）

【使用说明】
（如何集成到项目中）
```

---

**开始开发吧！注意安全性和性能。**
