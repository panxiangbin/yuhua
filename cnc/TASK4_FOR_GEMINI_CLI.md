# Gemini CLI 新任务 - 为未映射图片生成智能映射

## 👋 你好，上个任务完成得很好！现在继续

---

## 📋 任务目标

为那61张**未映射图片**生成智能映射关系，让它们也能被知识点关联。

---

## 📂 数据来源

### 输入1：未映射图片清单
**路径**：`F:\AI工作台\cnc_param_quickfinder\gallery-statistics.json`  
**字段**：`unmappedImages`（61张图片ID）

### 输入2：图片信息
**路径**：`F:\AI工作台\cnc_param_quickfinder\gallery-library-master.js`  
从中读取这61张图片的title、desc、keywords

### 输入3：知识点索引
**路径**：`F:\AI工作台\cnc_param_quickfinder\knowledge-core-01.js`  
**路径**：`F:\AI工作台\cnc_param_quickfinder\knowledge-core-02.js`  
**路径**：`F:\AI工作台\cnc_param_quickfinder\knowledge-core-03.js`

---

## 🎯 任务要求

### 步骤1：分析未映射图片

为每张未映射图片提取关键信息：
- 图片ID
- 中文标题
- 中文描述
- 关键词列表

**示例**：
```
ID: beginner-machine-zero-vs-work-zero-001
标题: 机床原点与工件原点区别
关键词: ["机床零点", "工件零点", "坐标系", "对刀"]
```

---

### 步骤2：智能匹配知识点

对每张图片，从1796个知识点中找出最相关的3-5个。

**匹配策略**：
1. **关键词精准匹配**：图片关键词与知识点标题/标签完全匹配
2. **语义相似匹配**：图片描述与知识点内容语义相关
3. **分类匹配**：同属一个大类（如都是"刀具相关"）

**示例输出**：
```javascript
{
  "imageId": "beginner-machine-zero-vs-work-zero-001",
  "matchedEntries": [
    {
      "entryId": "machine-coordinate-system",
      "entryTitle": "机床坐标系详解",
      "matchScore": 0.95,
      "matchReason": "关键词精准匹配：机床零点"
    },
    {
      "entryId": "work-offset-g54",
      "entryTitle": "工件坐标系G54设置",
      "matchScore": 0.88,
      "matchReason": "语义相似：工件零点、坐标系"
    }
  ]
}
```

---

### 步骤3：生成映射补充文件

**输出文件**：`featured-images-补充.js`

**格式**（与现有featured-images-extended.js兼容）：
```javascript
window.CNC_FEATURED_IMAGES_SUPPLEMENT = {
  "机床坐标系详解": [
    {
      "title": "机床原点与工件原点区别",
      "caption": "清晰展示机床零点和工件零点的位置关系",
      "src": "./assets/images/batch05_alarm_drawing_material/beginner-machine-zero-vs-work-zero-001.webp"
    }
  ],
  // ... 更多映射
};
```

---

### 步骤4：生成映射报告

**输出文件**：`unmapped-images-mapping-report.md`

**内容**：
```markdown
# 未映射图片智能映射报告

## 总览
- 原未映射图片数：61张
- 成功映射图片数：XX张
- 新增映射关系：XXX条
- 仍未映射：XX张（需人工处理）

## 映射详情

### 1. beginner-machine-zero-vs-work-zero-001
**图片标题**：机床原点与工件原点区别
**匹配知识点**：
1. 机床坐标系详解（匹配度：95%）
2. 工件坐标系G54设置（匹配度：88%）
3. 对刀流程详解（匹配度：82%）

### 2. parameter-backup-001
**图片标题**：参数备份流程
...
```

---

## ✅ 交付物

1. ✅ `featured-images-supplement.js`（新增映射数据）
2. ✅ `unmapped-images-mapping-report.md`（映射报告）
3. ✅ 简短说明（执行总结）

---

## ⏱️ 时间要求

**30-40分钟**

---

## 📝 完成后回复

```
✅ 未映射图片智能映射完成

【映射统计】
- 成功映射：XX/61张
- 新增映射关系：XXX条
- 平均每张图映射：X.X个知识点
- 仍未映射：XX张（需人工处理）

【生成文件】
1. featured-images-supplement.js - XX KB
2. unmapped-images-mapping-report.md - XX KB
```

---

**开始执行吧！尽可能多地为这61张图片找到合适的知识点映射。**
