# ChatGPT Plus 网页版 - 任务6（超长任务）

## 👋 这是一个综合性超长任务

设计并开发一个**完整的学习路径系统**，用于展示数控知识的学习进度、技能树和成就系统。

---

## 📋 任务目标

创建一个互动式的学习路径可视化系统，包括：
- 技能树可视化
- 学习进度追踪
- 成就徽章系统
- 每日学习打卡
- 知识点关联图谱

---

## 🎨 整体架构（5个核心模块）

### 模块1：技能树可视化

**功能描述**：
用树状或网状结构展示数控学习路径，从入门到精通。

**视觉效果**：
- 节点：圆形或六边形
- 连接线：渐变色、动画流动效果
- 节点状态：未解锁（灰色）、进行中（橙色）、已完成（绿色）
- 悬停显示详细信息

**节点层级**：
```
第1层（基础）：机床认知、坐标系、G代码入门
↓
第2层（进阶）：对刀、刀补、固定循环
↓
第3层（高级）：宏程序、多轴编程、参数优化
↓
第4层（专家）：故障诊断、工艺优化、自动化
```

**交互功能**：
1. 点击节点查看详情
2. 拖拽平移、滚轮缩放
3. 搜索定位节点
4. 高亮前置和后续节点
5. 显示完成百分比

---

### 模块2：学习进度追踪面板

**功能描述**：
展示用户的整体学习数据和统计信息。

**数据维度**：

**统计卡片组**（4个卡片）：
```
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ 总学习天数    │ │ 知识点完成   │ │ 本周学习时长  │ │ 连续打卡     │
│   47天      │ │  156/320   │ │   8.5小时   │ │   12天      │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
```

**学习曲线图**：
- 横轴：时间（最近30天）
- 纵轴：学习数量（知识点数）
- 折线图 + 渐变填充
- 标记重点日期（考试、实操等）

**分类进度环形图**：
- G代码掌握：75%
- 刀具工艺：60%
- 机床操作：85%
- CAM软件：40%
- 故障维修：30%

**最近学习记录**（时间线）：
```
今天 14:30   完成：G71粗车循环
今天 10:15   学习：刀具补偿原理
昨天 20:00   复习：对刀流程
昨天 16:45   练习：G代码编程
```

---

### 模块3：成就徽章系统

**功能描述**：
游戏化的激励系统，通过完成任务获得徽章。

**徽章分类**（6大类）：

#### 3.1 入门系列
- 🌱 初学者：完成第一个知识点
- 📚 勤学者：连续学习3天
- ⚡ 快速上手：7天内完成10个知识点

#### 3.2 专业技能系列
- 🎯 G代码大师：完成所有G代码知识点
- 🔧 刀具专家：完成刀具工艺分类
- 🏭 机床操作师：完成机床操作认证

#### 3.3 勤奋系列
- 🔥 连续打卡7天
- 💪 连续打卡30天
- 🏆 连续打卡100天

#### 3.4 探索系列
- 🔍 知识探索者：浏览50个知识点
- 🌍 全面发展：每个分类至少完成5个
- 🎓 知识渊博：完成80%的知识点

#### 3.5 实践系列
- 🛠️ 首件成功：完成首件加工案例
- 🎨 加工艺术家：完成10个加工案例
- 🚀 效率大师：完成速度优化挑战

#### 3.6 社区系列
- 💬 乐于分享：分享10次知识点
- ⭐ 收藏达人：收藏50个知识点
- 📝 笔记王：添加20条学习笔记

**徽章展示**：
- 3D翻转效果
- 发光动画
- 获得时弹窗庆祝
- 徽章墙展示
- 分享到社交媒体

---

### 模块4：每日打卡系统

**功能描述**：
记录每日学习情况，养成学习习惯。

**打卡日历**（热力图）：
```
    一  二  三  四  五  六  日
第1周 🟢 🟢 ⚪ 🟢 🟢 🟢 🟢
第2周 🟢 🟢 🟢 🟡 🟢 ⚪ 🟢
第3周 🟢 🟢 🟢 🟢 🟢 🟢 🟢
第4周 🟢 🔴 🟢 🟢 🟢 ⬜ ⬜

图例：
🟢 已打卡（学习>30分钟）
🟡 部分完成（学习10-30分钟）
🔴 已打卡但未达标（<10分钟）
⚪ 未打卡
⬜ 未来日期
```

**打卡详情**：
- 学习时长
- 完成知识点数
- 学习分类
- 学习笔记

**连续打卡奖励**：
- 3天：解锁"勤奋"徽章
- 7天：解锁高级知识点
- 30天：解锁专家模式
- 100天：解锁定制主题

**打卡提醒**：
- 每日推送提醒（可设置时间）
- 连续打卡中断预警
- 目标达成通知

---

### 模块5：知识点关联图谱

**功能描述**：
用力导向图展示知识点之间的关联关系。

**节点类型**：
- 🔵 G代码（蓝色）
- 🟠 M代码（橙色）
- 🟢 刀具工艺（绿色）
- 🟡 机床操作（黄色）
- 🔴 故障维修（红色）

**连接关系**：
- 实线：强关联（必学前置）
- 虚线：弱关联（建议学习）
- 箭头：学习顺序

**交互功能**：
1. 点击节点：展开相关知识点
2. 双击节点：进入详情页
3. 拖拽节点：调整布局
4. 悬停：显示关联数量
5. 筛选：按分类显示/隐藏

**示例关联**：
```
G54 → 对刀 → 工件坐标系 → G55-G59
  ↓
刀具偏置 → G41/G42 → 刀补原理
  ↓
G71 → 粗车循环 → G70精车
```

---

## 🎨 风格要求（土黄色温暖风 + 科技元素）

### 配色方案

**主色调**（温暖）：
```css
--bg-primary: #f3ebde;
--bg-card: #fffaf2;
--text-primary: #5d655f;
--accent-warm: #cf6d36;
```

**科技色**（技能树、图谱）：
```css
--tech-blue: #4a9eff;
--tech-green: #00d4aa;
--tech-purple: #b794f6;
--tech-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

**状态色**：
```css
--locked: #b8b5b0;     /* 未解锁 */
--learning: #ffb86c;   /* 进行中 */
--completed: #50a05a;  /* 已完成 */
--master: #bd93f9;     /* 精通 */
```

---

## 📦 交付要求

### 1. 完整HTML结构（5个模块）

```html
<!-- 主容器 -->
<div class="learning-path-system">
  
  <!-- 模块1：技能树 -->
  <section class="skill-tree-section">
    <canvas id="skillTreeCanvas"></canvas>
    <div class="skill-tree-controls"></div>
  </section>
  
  <!-- 模块2：学习进度 -->
  <section class="progress-dashboard">
    <div class="stats-cards"></div>
    <div class="learning-chart"></div>
    <div class="category-progress"></div>
    <div class="recent-activity"></div>
  </section>
  
  <!-- 模块3：成就徽章 -->
  <section class="achievement-wall">
    <div class="badge-grid"></div>
    <div class="badge-modal"></div>
  </section>
  
  <!-- 模块4：每日打卡 -->
  <section class="daily-checkin">
    <div class="calendar-heatmap"></div>
    <div class="checkin-details"></div>
    <div class="streak-tracker"></div>
  </section>
  
  <!-- 模块5：知识图谱 -->
  <section class="knowledge-graph">
    <canvas id="graphCanvas"></canvas>
    <div class="graph-legend"></div>
  </section>
  
</div>
```

---

### 2. 完整CSS样式（包含动画）

**必须包含**：
- 响应式布局（桌面/平板/手机）
- 流畅过渡动画
- 微交互效果（悬停、点击）
- 骨架屏加载
- 深色模式支持（可选）

**动画要求**：
- 节点连接线流动动画
- 徽章发光脉冲效果
- 进度条填充动画
- 打卡日历翻转动画
- 图谱节点呼吸效果

---

### 3. 完整JavaScript逻辑

**核心功能**：
```javascript
class LearningPathSystem {
  constructor(options) {}
  
  // 技能树
  renderSkillTree(data) {}
  updateNodeStatus(nodeId, status) {}
  highlightPath(nodeId) {}
  
  // 学习进度
  updateStats(stats) {}
  renderChart(chartData) {}
  addActivity(activity) {}
  
  // 成就系统
  unlockBadge(badgeId) {}
  checkAchievements() {}
  shareBadge(badgeId) {}
  
  // 打卡系统
  checkIn(date, duration) {}
  getStreak() {}
  renderHeatmap(data) {}
  
  // 知识图谱
  renderGraph(nodes, edges) {}
  expandNode(nodeId) {}
  filterByCategory(category) {}
}
```

---

### 4. 数据格式定义

#### 技能树数据
```javascript
const skillTreeData = {
  nodes: [
    {
      id: "basic-01",
      title: "机床认知",
      level: 1,
      status: "completed",
      progress: 100,
      prerequisites: [],
      unlocks: ["basic-02", "basic-03"],
      content: {
        duration: "2小时",
        knowledgeCount: 8,
        difficulty: "入门"
      }
    }
  ],
  edges: [
    { from: "basic-01", to: "basic-02", type: "required" }
  ]
};
```

#### 学习进度数据
```javascript
const progressData = {
  totalDays: 47,
  completedNodes: 156,
  totalNodes: 320,
  weeklyHours: 8.5,
  streak: 12,
  chartData: [
    { date: "2026-06-01", count: 3 },
    { date: "2026-06-02", count: 5 }
  ],
  categoryProgress: {
    "G代码": 75,
    "刀具工艺": 60,
    "机床操作": 85
  }
};
```

#### 成就数据
```javascript
const achievements = [
  {
    id: "beginner",
    title: "初学者",
    icon: "🌱",
    description: "完成第一个知识点",
    category: "入门系列",
    unlocked: true,
    unlockedAt: "2026-05-15",
    rarity: "common"
  }
];
```

#### 打卡数据
```javascript
const checkinData = {
  calendar: {
    "2026-06-01": { duration: 45, nodes: 3, status: "good" },
    "2026-06-02": { duration: 20, nodes: 1, status: "partial" }
  },
  currentStreak: 12,
  longestStreak: 28
};
```

---

## ⏱️ 时间要求

**3-4小时完成**（这是超长任务，慢慢做）

---

## ✅ 验收标准

1. ✅ 5个模块全部实现
2. ✅ 可视化效果流畅美观
3. ✅ 所有交互功能可用
4. ✅ 数据驱动、API清晰
5. ✅ 响应式布局完善
6. ✅ 代码结构清晰、可维护
7. ✅ 详细的使用文档
8. ✅ 完整的数据格式说明

---

## 📝 交付格式

回复：
```
✅ 学习路径系统开发完成

【完整HTML】
（5个模块的HTML结构）

【完整CSS】
（包含所有样式和动画，约2000行）

【完整JavaScript】
（包含核心类和所有交互逻辑，约1500行）

【使用文档】
（初始化方法、API说明、数据格式）

【演示说明】
（如何测试每个模块的功能）

【集成建议】
（如何集成到现有项目中）
```

---

## 💡 额外加分项（可选）

如果时间充裕，可以添加：

1. **导出功能**：导出学习报告（PDF/图片）
2. **社交分享**：分享学习成就到社交媒体
3. **学习建议**：基于当前进度推荐下一步
4. **学习排行榜**：与其他用户对比（Mock数据）
5. **学习日记**：添加学习笔记和心得
6. **复习提醒**：艾宾浩斯遗忘曲线提醒
7. **学习目标**：设置短期和长期目标
8. **数据统计**：更详细的学习分析

---

**这是一个大型任务，预计3-4小时。慢慢做，做完整、做精致、做到生产级别。**

---

*任务发起人：Claude Opus 4.7 (Kiro)*  
*任务类型：超长综合任务*  
*预计时间：3-4小时*
