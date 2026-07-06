# Gemini CLI 新任务 - 整合所有图片数据

## 👋 你好，访问控制问题暂时搁置，现在给你新任务

---

## 📋 任务目标

整合3个图片相关文件的数据，生成一个统一的、完整的图片数据文件。

---

## 📂 需要整合的文件

### 文件1：基础图片索引
**路径**：`F:\AI工作台\cnc_param_quickfinder\gallery-library.js`  
**内容**：125张图片的基础信息（id, src, title）

### 文件2：中文增强描述
**路径**：`F:\AI工作台\cnc_param_quickfinder\gallery-library-enhanced.js`  
**内容**：125张图片的中文标题、描述、关键词（你之前生成的）

### 文件3：知识点映射
**路径**：`F:\AI工作台\cnc_param_quickfinder\featured-images-extended.js`  
**内容**：383个知识点到图片的映射关系

---

## 🎯 任务要求

### 步骤1：读取并分析3个文件

理解每个文件的数据结构和关系。

---

### 步骤2：生成统一的图片主数据文件

**输出文件**：`gallery-library-master.js`

**数据结构**：
```javascript
window.CNC_GALLERY_MASTER = [
  {
    "id": "alarm-limit-overtravel-001",
    "src": "./assets/images/batch01_core/alarm-limit-overtravel-001.webp",
    "batch": "batch01_core",
    
    // 中文信息（来自enhanced）
    "title": "轴行程超程报警故障",
    "desc": "机床轴移动超出软/硬限位时触发...",
    "keywords": ["报警", "限位", "超程", "FANUC"],
    "category": "报警相关",
    
    // 映射信息（来自featured-images-extended）
    "mappedEntries": [
      "fanuc-alarm-overtravel",
      "axis-limit-switch"
    ],
    "mappedCount": 2
  },
  // ... 125条
];
```

---

### 步骤3：生成反向映射文件

**输出文件**：`entry-to-images-map.js`

**用途**：根据知识点ID快速查找对应图片

**数据结构**：
```javascript
window.ENTRY_TO_IMAGES_MAP = {
  "fanuc-alarm-overtravel": [
    {
      "imageId": "alarm-limit-overtravel-001",
      "title": "轴行程超程报警故障",
      "src": "./assets/images/batch01_core/alarm-limit-overtravel-001.webp"
    }
  ],
  // ... 更多映射
};
```

---

### 步骤4：生成统计报告

**输出文件**：`gallery-statistics.json`

**内容**：
```json
{
  "totalImages": 125,
  "totalMappedEntries": 415,
  "categoryBreakdown": {
    "报警相关": 27,
    "刀具相关": 119,
    "G代码相关": 83,
    ...
  },
  "topMappedImages": [
    {
      "imageId": "gcode-g00-g01-001",
      "mappedCount": 8,
      "title": "..."
    }
  ],
  "unmappedImages": []
}
```

---

## ✅ 交付物

完成后提供：

1. ✅ `gallery-library-master.js`（125条完整图片数据）
2. ✅ `entry-to-images-map.js`（反向映射）
3. ✅ `gallery-statistics.json`（统计报告）
4. ✅ 简短说明文档（Markdown格式）

---

## ⏱️ 时间要求

**30-40分钟**

---

## 📝 完成后回复

```
✅ 图片数据整合完成

【生成文件】
1. gallery-library-master.js - XX KB
2. entry-to-images-map.js - XX KB  
3. gallery-statistics.json - XX KB

【统计摘要】
总图片数：125张
总映射数：XXX个知识点
平均每张图映射：X.X个知识点
```

---

**开始执行吧！**
