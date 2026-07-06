# 搜索别名词典底稿设计说明 (2026-07-06)

**文档状态**：DRAFT (可交接)  
**审计执行**：3号 (Gemini CLI)  
**项目分区**：F:\AI工作台\cnc_param_quickfinder  

---

## 一、设计理念与技术对齐

在操机现场，操作工在面对报警或需要换算切削用量时，往往只记得中文俗称（如“g02顺圆”）或简写（如“g2”）。然而，现有系统仅仅依靠强匹配，如果输入“顺时针圆弧插补”，根本无法导向 `G02`。

我们在 [synonym_dictionary_draft_20260706.json](file:///F:/AI工作台/cnc_param_quickfinder/gemini_output/synonym_dictionary_draft_20260706.json) 中规划了 **150 组别名数据**，包含正规词（canonical）及别名列表（aliases），旨在打通数控专有名词到大众口语的关联通道。

---

## 二、别名词典分类统计与分布

本字典 150 组别名全面覆盖了以下 9 大核心类别：

1.  **G代码类**：覆盖 G00 到 G99 常用指令，如打通 `G00` $\leftrightarrow$ `g0` $\leftrightarrow$ `快速定位` $\leftrightarrow$ `快移`。
2.  **M代码类**：打通 `M03` $\leftrightarrow$ `顺时针正转` $\leftrightarrow$ `主轴正转`。
3.  **报警类**：打通 `OT` $\leftrightarrow$ `超程` $\leftrightarrow$ `硬行程限位`；`5136` $\leftrightarrow$ `FSSB光纤`。
4.  **参数类**：打通 `1815` $\leftrightarrow$ `绝对编码器回零参数`。
5.  **对刀/坐标类**：打通 `分中` $\leftrightarrow$ `碰边找正`；`寻边器` $\leftrightarrow$ `分中棒`。
6.  **工艺类**：打通 `表面粗糙度` $\leftrightarrow$ `Ra` $\leftrightarrow$ `光洁度`。
7.  **刀具类**：打通 `立铣刀` $\leftrightarrow$ `平底铣刀` $\leftrightarrow$ `开粗刀`。
8.  **材料类**：打通 `45号钢` $\leftrightarrow$ `45#` $\leftrightarrow$ `中碳钢`。
9.  **新手口语问法**：打通 `扎刀` $\leftrightarrow$ `撞刀` $\leftrightarrow$ `撞车`。

---

## 三、前台搜索算法升级方案

为使同义词典生效，Codex 可以在 [app.js](file:///F:/AI工作台/cnc_param_quickfinder/app.js) 中新增以下查询转换机制：

```javascript
// 升级版搜索匹配引擎示例
function matchesKeywordWithSynonyms(entry, keyword) {
  if (!keyword) return true;
  
  // 1. 标准化用户输入
  const query = normalizeText(keyword);
  
  // 2. 在同义词库中搜寻别名
  const queryPills = [query];
  const dict = window.CNC_SYNONYM_DICTIONARY || [];
  
  const matchedRule = dict.find(r => 
    r.canonical.toLowerCase() === query || 
    r.aliases.some(alias => normalizeText(alias) === query)
  );
  
  if (matchedRule) {
    // 自动扩展检索词
    queryPills.push(matchedRule.canonical.toLowerCase());
    matchedRule.aliases.forEach(a => queryPills.push(normalizeText(a)));
  }
  
  // 3. 多词 AND 关系匹配
  const entryText = normalizeText(getEntryText(entry));
  return queryPills.some(pill => entryText.includes(pill));
}
```

通过这一重构，用户输入“顺圆”，系统会自动将其转化为 `['顺圆', 'g02', '顺时针圆弧插补', '顺圆', '右旋圆弧', '正向圆弧']` 这一搜索数组，并去匹配 [data.js](file:///F:/AI工作台/cnc_param_quickfinder/data.js)。这样 `G02` 即可被成功搜出，体验极为顺滑。
