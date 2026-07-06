# 学习系统前端实现报告

**日期**: 2026-07-06
**项目**: CNC Param QuickFinder
**版本**: v1.0.0

---

## 目录

1. [概述](#1-概述)
2. [功能清单](#2-功能清单)
3. [技术选型](#3-技术选型)
4. [模块结构](#4-模块结构)
5. [集成步骤](#5-集成步骤)
6. [测试用例（20个）](#6-测试用例20个)
7. [已知问题](#7-已知问题)
8. [未来优化方向](#8-未来优化方向)

---

## 1. 概述

学习系统前端是 CNC Param QuickFinder 项目中"新手路线"功能的完整前端实现。系统包含课程详情渲染引擎、交互练习系统、学习进度追踪、导航系统、配图占位符五个核心模块，覆盖从课程展示到学习追踪的完整闭环。

### 1.1 设计目标

- 将现有的 12 关学习内容（目前仅以静态 HTML 卡片展示）扩展为完整的交互式学习系统
- 每关包含：学习目标 → 操作步骤 → 常见错误 → 互动练习 → 小结 的完整结构
- 支持答题、进度追踪、学习时长统计
- 所有功能在浏览器控制台可直接访问和测试

### 1.2 与现有系统的关系

学习系统前端不修改现有的 app.js 页面渲染逻辑，也不修改现有的数据结构。它作为一个独立的前端模块层，通过 window 全局对象暴露 API，可被 app.js 或其他模块调用。

---

## 2. 功能清单

### 2.1 详情页渲染引擎 (ui-learning-detail.js)

| 功能 | 全局方法 | 说明 |
|------|----------|------|
| 渲染完整课程 | `renderLessonDetail(level)` | 根据关卡编号渲染全部内容 |
| 学习目标 | `renderObjectives(objectives)` | 带复选框的学习目标列表 |
| 操作步骤 | `renderSteps(steps)` | 带编号的步骤列表 |
| 常见错误 | `renderErrors(errors)` | 警告卡片形式展示 |
| 互动练习 | `renderQuizzes(quizzes)` | 渲染所有练习题容器 |
| 单题渲染 | 内部 `renderSingleQuiz()` | 支持单选/判断 |
| 小结 | `renderSummary(summary)` | 小结内容渲染 |
| 导航初始化 | `initNavigation()` | 上下关导航按钮 |
| 数据获取 | `getLessonData(level)` | 带缓存的数据读取 |

内置 4 关示例数据（第 1~4 关），每关包含完整的目标、步骤、错误、练习题、小结。

### 2.2 交互练习系统 (ui-learning-quiz.js)

| 功能 | 全局方法 | 说明 |
|------|----------|------|
| 选择题渲染 | `renderMultipleChoice(quiz)` | 单选按钮选项 |
| 判断题渲染 | `renderTrueFalse(quiz)` | 正确/错误两个选项 |
| 填空题渲染 | `renderFillBlank(quiz)` | 文本输入框 |
| 答案检查 | `checkAnswer(quizId, userAnswer)` | 即时反馈对/错 |
| 显示解析 | `showExplanation(quizId)` | 显示答案解析 |
| 答题追踪 | `trackQuizProgress(level, quizId, correct)` | 记录到 LocalStorage |
| 统计查询 | `getQuizStats(level)` | 正确率统计 |
| 重置 | `resetQuizProgress(level)` | 清除答题记录 |

### 2.3 学习进度追踪 (ui-learning-progress.js)

| 功能 | 全局方法 | 说明 |
|------|----------|------|
| 标记完成 | `markLessonComplete(level)` | 标记关卡完成并记录时间 |
| 获取进度 | `getLessonProgress(level)` | 单关完成状态 |
| 总体统计 | `getOverallProgress()` | 已完成/总计/百分比/总时间 |
| 进度条 | `renderProgressBar(stage)` | 阶段进度条 HTML |
| 时间计算 | `calculateTimeSpent(level)` | 关卡学习时长 |
| 开始会话 | `startSession(level)` | 开始计时 |
| 结束会话 | `endSession(level)` | 结束计时并保存 |
| 导出报告 | `exportProgressReport()` | JSON 格式完整报告 |
| 阶段查询 | `getStageProgress(stageId)` | 按阶段统计 |
| 重置全部 | `resetAll()` | 清空所有数据 |

数据持久化使用 LocalStorage，键名 `cnc_learning_progress` 和 `cnc_learning_time`。

### 2.4 导航系统 (ui-learning-navigation.js)

| 功能 | 全局方法 | 说明 |
|------|----------|------|
| 章节目录 | `renderTableOfContents(level)` | 根据课程数据生成目录 |
| 滚动定位 | `scrollToSection(sectionId)` | 平滑滚动到指定章节 |
| 激活更新 | `updateActiveSection()` | 滚动时自动更新高亮 |
| 面包屑 | `renderBreadcrumb(level)` | 阶段 > 课程 面包屑 |
| 上一关 | `goPrevLesson()` | 切换到上一关 |
| 下一关 | `goNextLesson()` | 切换到下一关 |
| 导航回调 | `setOnNavigate(callback)` | 注册关卡切换监听 |
| 键盘导航 | `initKeyboardNav()` | ← → 方向键切换 |

### 2.5 配图占位符 (ui-learning-image-placeholder.js)

| 功能 | 全局方法 | 说明 |
|------|----------|------|
| 渲染占位符 | `renderImagePlaceholder(desc, w, h)` | 生成 SVG 占位图 |
| 注册槽位 | `registerImageSlot(lessonId, imageId)` | 注册图片槽位 |
| 加载图片 | `loadActualImage(imageId, src)` | 替换占位符为真实图片 |
| 批量替换 | `batchReplacePlaceholders(imageMap)` | 批量替换 |
| 查询槽位 | `getRegisteredSlots(lessonId)` | 按课程查询 |

---

## 3. 技术选型

### 3.1 为什么选择原生 JS 而非框架

项目无 npm 依赖，不使用构建工具。所有代码使用 ES5 语法，通过 IIFE 封装，全局对象通过 window 暴露。选择原生 JS 的原因：

1. 项目为纯静态 HTML/CSS/JS 页面，无 Node.js/Webpack 等工具链
2. 需要在 file:// 协议下直接运行，不支持模块加载器
3. 保持与现有代码风格一致（现有 app.js 使用同样的模式）
4. 零外部依赖，降低维护成本

### 3.2 存储方案

使用 LocalStorage（而非 cookie 或 IndexedDB）进行数据持久化：
- 容量充裕（5MB 限制，学习数据远小于此值）
- API 简单（setItem/getItem）
- 所有主流浏览器支持
- file:// 协议下可用

### 3.3 占位图方案

使用内联 SVG 生成占位图，而非 Canvas 或外部图片：
- 无需加载额外资源
- 支持文字渲染
- 可根据容器大小自适应
- 打印时保留矢量清晰度

---

## 4. 模块结构

### 4.1 依赖关系

```
ui-learning-detail.js（数据源 + 渲染引擎）
  ├── ui-learning-quiz.js（练习题系统，依赖 detail 的数据）
  ├── ui-learning-progress.js（进度追踪，独立）
  ├── ui-learning-navigation.js（导航系统，依赖 detail 的数据）
  └── ui-learning-image-placeholder.js（占位符系统，独立）
```

独立模块之间不强制依赖，但 quiz 和 navigation 模块在存在 CNC_LEARNING_UI 时会使用其数据。

### 4.2 全局对象命名

所有模块使用 CNC_ 前缀，与现有 CNC_DATA、CNC_RUNTIME、CNC_FRONTEND 等保持一致。

| 文件 | 全局对象 | 独立可运行 |
|------|----------|-----------|
| ui-learning-detail.js | CNC_LEARNING_UI | 是 |
| ui-learning-quiz.js | CNC_QUIZ_SYSTEM | 是 |
| ui-learning-progress.js | CNC_LEARNING_PROGRESS | 是 |
| ui-learning-navigation.js | CNC_LEARNING_NAV | 是 |
| ui-learning-image-placeholder.js | CNC_LEARNING_IMAGES | 是 |

### 4.3 示例数据结构

每关课程的数据结构：

```javascript
{
  id: Number,           // 关卡编号 1-12
  title: String,        // 关卡标题
  stage: Number,        // 所属阶段 1-4
  time: String,         // 预计学习时长
  objectives: [String], // 学习目标列表
  steps: [String],      // 操作步骤列表
  errors: [String],     // 常见错误列表
  quizzes: [{           // 练习题列表
    id: String,         // 题目唯一标识
    type: 'multiple'|'truefalse'|'fillblank',
    question: String,   // 题目描述
    options: [String],  // 选项列表
    answer: Number|String|[String],  // 正确答案
    explanation: String // 答案解析
  }],
  summary: String       // 本章小结
}
```

---

## 5. 集成步骤

### 5.1 在 index.html 中添加脚本

在 app.js 之前添加（保持顺序）：

```html
<!-- 学习系统 -->
<script src="./ui-learning-detail.js"></script>
<script src="./ui-learning-quiz.js"></script>
<script src="./ui-learning-progress.js"></script>
<script src="./ui-learning-navigation.js"></script>
<script src="./ui-learning-image-placeholder.js"></script>
```

### 5.2 添加 CSS

在 head 区域添加：

```html
<link rel="stylesheet" href="./styles-learning-detail.css">
```

### 5.3 在 app.js 中调用示例

```javascript
// 渲染学习内容
var level = 1;
var html = window.CNC_LEARNING_UI.renderLessonDetail(level);
document.getElementById('learning-content').innerHTML = html;
window.CNC_LEARNING_UI.initNavigation();

// 启动进度追踪
window.CNC_LEARNING_PROGRESS.startSession(level);

// 绑定答题事件
document.querySelectorAll('.quiz-submit').forEach(function (btn) {
  btn.addEventListener('click', function () {
    var quizId = btn.getAttribute('data-quiz-id');
    var selected = document.querySelector('input[name="q-' + quizId + '"]:checked');
    if (selected) {
      CNC_QUIZ_SYSTEM.checkAnswer(quizId, parseInt(selected.value, 10));
    }
  });
});
```

### 5.4 在浏览器控制台直接测试

```javascript
// 1. 查看所有模块是否加载
console.log(window.CNC_LEARNING_UI, window.CNC_QUIZ_SYSTEM, window.CNC_LEARNING_PROGRESS);

// 2. 获取第1关数据
var data = CNC_LEARNING_UI.getLessonData(1);
console.log(data);

// 3. 渲染第1关HTML
var html = CNC_LEARNING_UI.renderLessonDetail(1);
document.body.innerHTML = '<div>' + html + '</div>';

// 4. 查看学习进度
console.log(CNC_LEARNING_PROGRESS.getOverallProgress());

// 5. 标记第1关完成
CNC_LEARNING_PROGRESS.markLessonComplete(1);

// 6. 生成占位图
document.body.innerHTML += CNC_LEARNING_IMAGES.renderImagePlaceholder('主轴结构示意图', 400, 300);
```

---

## 6. 测试用例（20个）

以下测试用例可直接在浏览器控制台执行（带 learning-detail.html 测试页时可通过点击"运行测试"自动执行）：

### 6.1 模块加载测试

```
TC01: CNC_LEARNING_UI 已加载
  → console.assert(!!window.CNC_LEARNING_UI, 'TC01 FAIL')
  
TC02: CNC_QUIZ_SYSTEM 已加载
  → console.assert(!!window.CNC_QUIZ_SYSTEM, 'TC02 FAIL')
  
TC03: CNC_LEARNING_PROGRESS 已加载
  → console.assert(!!window.CNC_LEARNING_PROGRESS, 'TC03 FAIL')
  
TC04: CNC_LEARNING_NAV 已加载
  → console.assert(!!window.CNC_LEARNING_NAV, 'TC04 FAIL')

TC05: CNC_LEARNING_IMAGES 已加载
  → console.assert(!!window.CNC_LEARNING_IMAGES, 'TC05 FAIL')
```

### 6.2 渲染功能测试

```
TC06: renderLessonDetail(1) 返回含课程标题的 HTML
  → var h = CNC_LEARNING_UI.renderLessonDetail(1)
  → console.assert(h.indexOf('lesson-detail') !== -1, 'TC06 FAIL')
  → console.assert(h.indexOf('学习目标') !== -1, 'TC06 FAIL')

TC07: renderObjectives 返回目标列表
  → var h = CNC_LEARNING_UI.renderObjectives(['目标A', '目标B'])
  → console.assert(h.indexOf('objective-item') !== -1, 'TC07 FAIL')

TC08: renderSteps 返回带编号的步骤列表
  → var h = CNC_LEARNING_UI.renderSteps(['步骤1', '步骤2'])
  → console.assert(h.indexOf('step-number') !== -1, 'TC08 FAIL')

TC09: renderErrors 返回错误卡片
  → var h = CNC_LEARNING_UI.renderErrors(['错误1：测试'])
  → console.assert(h.indexOf('error-card') !== -1, 'TC09 FAIL')

TC10: renderSummary 返回小结内容
  → var h = CNC_LEARNING_UI.renderSummary('测试小结')
  → console.assert(h.indexOf('summary-content') !== -1, 'TC10 FAIL')
```

### 6.3 练习系统测试

```
TC11: renderMultipleChoice 生成选择题选项
  → var h = CNC_QUIZ_SYSTEM.renderMultipleChoice({id:'t', question:'Q', options:['A','B'], answer:0})
  → console.assert(h.indexOf('quiz-option') !== -1, 'TC11 FAIL')

TC12: renderTrueFalse 生成判断选项
  → var h = CNC_QUIZ_SYSTEM.renderTrueFalse({id:'t', question:'Q', options:['正确','错误'], answer:0})
  → console.assert(h.indexOf('option-true') !== -1, 'TC12 FAIL')

TC13: renderFillBlank 生成输入框
  → var h = CNC_QUIZ_SYSTEM.renderFillBlank({id:'t', question:'填空', answer:'答案'})
  → console.assert(h.indexOf('quiz-fill-input') !== -1, 'TC13 FAIL')

TC14: checkAnswer 对不存在题目返回错误信息
  → var r = CNC_QUIZ_SYSTEM.checkAnswer('nonexistent', 'A')
  → console.assert(r && r.error, 'TC14 FAIL')
```

### 6.4 进度系统测试

```
TC15: getOverallProgress 返回 12 关总数
  → var p = CNC_LEARNING_PROGRESS.getOverallProgress()
  → console.assert(p.total === 12, 'TC15 FAIL')

TC16: markLessonComplete 和 getLessonProgress 联动
  → CNC_LEARNING_PROGRESS.markLessonComplete(2)
  → var p = CNC_LEARNING_PROGRESS.getLessonProgress(2)
  → console.assert(p.completed === true, 'TC16 FAIL')

TC17: renderProgressBar 返回进度条 HTML
  → var h = CNC_LEARNING_PROGRESS.renderProgressBar(1)
  → console.assert(h.indexOf('progress-bar-fill') !== -1, 'TC17 FAIL')

TC18: exportProgressReport 包含完整字段
  → var r = CNC_LEARNING_PROGRESS.exportProgressReport()
  → console.assert(r.overall && r.stages && r.lessons, 'TC18 FAIL')
```

### 6.5 导航系统测试

```
TC19: renderBreadcrumb 生成面包屑
  → var h = CNC_LEARNING_NAV.renderBreadcrumb(2)
  → console.assert(h.indexOf('breadcrumb-sep') !== -1, 'TC19 FAIL')

TC20: goPrevLesson 在第2关返回 true
  → CNC_LEARNING_NAV.setCurrentLevel(2)
  → console.assert(CNC_LEARNING_NAV.goPrevLesson() === true, 'TC20 FAIL')
```

---

## 7. 已知问题

### 7.1 内置示例数据有限

当前仅内置了第 1~4 关的完整数据（4/12 关）。第 5~12 关的数据需要通过 `_LEVELS` 对象扩展或在 app.js 中通过 `getLessonData` 钩子注入。

### 7.2 答题事件绑定

练习题提交按钮的事件绑定需要外部实现。当前 `renderQuizzes` 仅生成 HTML，不绑定事件。建议在 app.js 中使用事件委托统一处理：

```javascript
document.querySelector('.lesson-content').addEventListener('click', function (e) {
  if (e.target.classList.contains('quiz-submit')) {
    var quizId = e.target.getAttribute('data-quiz-id');
    var selected = document.querySelector('input[name="q-' + quizId + '"]:checked');
    if (selected) CNC_QUIZ_SYSTEM.checkAnswer(quizId, parseInt(selected.value, 10));
  }
});
```

### 7.3 无自动化测试运行器

测试用例需要手动复制到浏览器控制台执行，或通过 `learning-detail.html` 测试页的"运行测试"按钮执行。暂无命令行自动化测试方案。

### 7.4 键盘导航冲突

`initKeyboardNav()` 监听全局 `ArrowLeft` 和 `ArrowRight` 事件，如果页面其他组件也使用方向键导航，可能产生冲突。建议在输入框聚焦时跳过快捷键处理（当前已实现）。

### 7.5 placeholder SVG 中文渲染

内联 SVG 中的中文文字渲染依赖系统字体。在部分浏览器（较老版本的 Safari）上，SVG 中的中文可能显示为方块。

---

## 8. 未来优化方向

### 8.1 完整 12 关数据

将第 5~12 关的完整数据（目标、步骤、错误、练习、小结）补充到 `_LEVELS` 对象中，或从外部 JSON 加载。

### 8.2 动画和过渡效果

- 答题反馈动画（正确答案绿色闪烁）
- 进度条填充动画
- 页面切换时的过渡效果
- 图片懒加载和加载动画

### 8.3 离线支持

- 使用 Service Worker 缓存学习内容
- 答题结果在离线状态下正常保存
- 网络恢复后自动同步

### 8.4 学习提醒系统

- 基于学习间隔的提醒
- 未完成关卡的高亮提示
- 定期复习提醒

### 8.5 学习数据可视化

- 在仪表盘页面显示学习进度图表
- 每个阶段的学习时长分布图
- 答题正确率趋势图

### 8.6 多人学习统计（服务器端）

- 用户注册和登录
- 学习进度云端同步
- 学员间排名
- 教师后台查看学员进度

### 8.7 表情包反馈系统

- 答对时的鼓励表情
- 完成关卡后的成就徽章
- 连续学习天数统计
