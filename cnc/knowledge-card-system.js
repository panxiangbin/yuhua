// 知识卡片系统 - ChatGPT Plus 交付
// 这是一个完整的、可复用的知识卡片系统
// 支持5种卡片类型、10种交互效果、土黄色温暖风格

// 完整代码请参考：knowledge-card-system.html
// 该文件为单文件完整版，可直接在浏览器打开查看效果

// 使用方法：
// 1. 将完整HTML文件保存到项目中
// 2. 或者提取其中的JS/CSS集成到现有项目

// API示例：
/*
KnowledgeCardSystem.init({
  root: "#knowledgeCardApp",
  data: cards,
  loadingDelay: 650
});

// 添加卡片
KnowledgeCardSystem.addCard({
  type: "basic",
  title: "G00快速定位",
  category: "G代码",
  tags: ["定位", "基础"],
  summary: "...",
  riskLevel: "low"
});

// 更新卡片
KnowledgeCardSystem.updateCard("card-id", { title: "新标题" });

// 筛选
KnowledgeCardSystem.filterByTag("对刀");
*/

// 5种卡片类型：
// - basic: 基础信息卡片
// - code: 代码示例卡片（G代码语法高亮）
// - mixed: 图文混排卡片
// - compare: 对比卡片（G90 VS G91）
// - timeline: 时间线卡片（流程步骤）

// 10种交互效果：
// 1. 悬停上浮
// 2. 展开/收起
// 3. 图片放大
// 4. 代码复制
// 5. 收藏动画
// 6. 分享弹窗
// 7. 标签筛选
// 8. 拖拽排序
// 9. 懒加载
// 10. 骨架屏

// 数据格式文档和完整实现请查看 knowledge-card-system.html
