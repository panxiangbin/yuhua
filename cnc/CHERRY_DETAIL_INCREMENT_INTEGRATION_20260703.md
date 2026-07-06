# 4号详情页增量集成报告

**执行时间**: 2026-07-03  
**执行者**: Cherry Studio (1号AI)  
**来源**: 4号（ChatGPT 网页版）详情页深度改造交付

---

## 一、集成策略

本次没有全量接入4号的 `renderDetailV2()`，而是采用**增量集成**。

### 原因
项目现有详情页已经是固定DOM结构：

- `detail-title`
- `detail-category`
- `detail-summary`
- `detail-beginner`
- `detail-usage`
- `detail-warning`
- `detail-example`
- `detail-next`
- `detail-image-card`
- `related-links`

4号代码假设整块替换详情页，但当前项目是多视图 SPA，直接替换会破坏现有结构、路由和样式。

### 本轮实际接入
只提取4号交付中最有价值的增量：

1. 快速检查清单
2. 关联工具
3. 参数芯片联动
4. 智能推荐

### 暂不接入
- AI助手浮窗：暂不做，避免伪AI影响产品可信度
- `renderDetailV2()` 整体替换：不做，避免破坏当前稳定结构
- 4号内置CSS注入：不做，避免和5号设计系统冲突
- `calculator.html?tool=xxx` 独立页面跳转：改为项目现有 `navigate("calculator")`

---

## 二、修改文件

### 1. index.html
新增4个详情页模块容器：

#### 快速检查
```html
<article class="detail-card" id="detail-quick-check-card">
  <h4>✅ 加工前快速检查</h4>
  <div class="detail-check-list" id="detail-quick-check"></div>
</article>
```

#### 关联工具
```html
<article class="detail-card" id="detail-tools-card">
  <h4>🧮 关联工具</h4>
  <div class="detail-tool-list" id="detail-tools"></div>
</article>
```

#### 参数联动
```html
<article class="detail-card" id="detail-params-card">
  <h4>🔢 参数联动</h4>
  <div class="detail-param-list" id="detail-params"></div>
</article>
```

#### 智能推荐
```html
<article class="detail-card" id="detail-smart-recommend-card">
  <h4>🎯 智能推荐</h4>
  <div class="detail-smart-recommend" id="detail-smart-recommend"></div>
</article>
```

---

### 2. app.js

#### 新增 DOM 引用
```javascript
detailQuickCheck: document.querySelector("#detail-quick-check"),
detailTools: document.querySelector("#detail-tools"),
detailParams: document.querySelector("#detail-params"),
detailSmartRecommend: document.querySelector("#detail-smart-recommend"),
```

#### 新增工具定义
```javascript
const DETAIL_TOOL_DEFINITIONS = [
  speed,
  feed,
  surface-speed,
  unit,
  roughness
]
```

#### 新增函数
- `toArray(value)`
- `getItemText(entry)`
- `getQuickCheckList(entry)`
- `getRelatedTools(entry)`
- `openCalculatorTool(toolId, params, fromEntry)`
- `renderQuickCheckSection(entry)`
- `renderRelatedToolsSection(entry)`
- `renderDetailParamsSection(entry)`
- `getSmartRecommendations(entry)`
- `renderSmartRecommendSection(entry)`
- `renderDetailEnhancements(entry)`
- `clearDetailEnhancements()`

#### 接入 renderDetail()
空状态增加：
```javascript
clearDetailEnhancements();
```

正常状态增加：
```javascript
renderDetailEnhancements(entry);
```

---

### 3. styles.css
新增详情页增量模块样式：

- `.detail-check-list`
- `.detail-check-item`
- `.detail-tool-button`
- `.detail-recommend-button`
- `.detail-next-card`
- `.detail-param-chip`
- `.detail-soft-empty`

样式复用现有 `detail-card` 体系，没有接入4号独立CSS。

---

## 三、功能说明

### 1. 快速检查清单
优先读取数据字段：

- `quickCheck`
- `checklist`
- `checkPoints`
- `beforeUseCheck`

如果没有数据，按知识点内容自动生成兜底检查项：

- 坐标/G54类：坐标系、工件零点、Z零点、安全位置、单段检查
- 刀补类：刀号、补偿号、方向、刀长、首件尺寸
- 转速/进给类：刀具直径、材料、单位、机床刚性、保守试切
- 默认类：适用场景、参数、基准、风险、模拟检查

---

### 2. 关联工具
支持5类工具：

| 工具ID | 名称 | 匹配关键词 |
|--------|------|------------|
| speed | 转速计算器 | 转速、主轴、线速度、vc、S值 |
| feed | 进给计算器 | 进给、每齿进给、fz、刃数、F值 |
| surface-speed | 线速度计算器 | 线速度、vc、切削速度 |
| unit | 英制/公制换算 | 英制、公制、inch、mm |
| roughness | Ra/Rz粗糙度换算 | Ra、Rz、粗糙度 |

优先读取：

- `toolIds`
- `relatedTools`

如果没有字段，则根据标题、分类、摘要、标签自动匹配。

点击工具后：

1. 写入 `localStorage.cnc_calculator_prefill`
2. 执行 `navigate("calculator")`
3. 执行 `renderAll()`

没有使用4号的 `calculator.html?tool=xxx` 跳转方式。

---

### 3. 参数芯片联动
优先读取字段：

- `params`
- `parameters`
- `formulaParams`

数据格式示例：

```javascript
params: [
  {
    label: "刀具直径",
    name: "diameter",
    value: "10",
    unit: "mm",
    toolId: "speed"
  }
]
```

点击参数芯片后：

1. 写入 `localStorage.cnc_calculator_prefill`
2. 跳转参数计算器视图

当前数据多数没有 `params` 字段，因此会显示占位提示：

> 暂无可联动参数。后续补充 params 字段后可自动带入计算器。

---

### 4. 智能推荐
推荐来源：

1. `relatedIds` / `related` / `links` 指定关联
2. 分类相似知识点
3. 最近查看记录 `state.recents`
4. `nextId` 作为下一步推荐

点击推荐卡片后：

```javascript
state.selectedId = button.dataset.smartEntry;
renderWorkspace();
```

不修改 URL，不使用 `history.pushState()`，保持项目现有 SPA 路由稳定。

---

## 四、同步修复

### 修复重复 normalizeText()
之前学习卡片集成时，在 app.js 后部新增了第二个 `normalizeText()`，覆盖了文件顶部原本的搜索归一化函数。

本轮已修复为：

```javascript
function normalizeCompactText(text) {
  return normalizeText(text)
    .replace(/\s+/g, '')
    .replace(/[：:，,。.!！?？"“”'‘’（）()【】\[\]-]/g, '');
}
```

并将学习卡片匹配逻辑改为调用 `normalizeCompactText()`。

意义：

- 保留原始 `normalizeText()` 给搜索系统使用
- 学习卡片仍然使用紧凑匹配
- 避免函数重复定义造成潜在搜索回归

---

## 五、验证结果

### JavaScript 语法检查
```bash
node -c app.js
```

结果：通过，无输出。

### 文件大小
- `index.html`: 43638 bytes
- `styles.css`: 45910 bytes
- `app.js`: 80782 bytes

---

## 六、未验证事项

由于2号额度已用完，本轮无法进行真实浏览器回归测试。

以下项目仍需浏览器验证：

1. 详情页是否正常显示新增4个模块
2. 快速检查复选框是否显示正常
3. 关联工具点击是否跳转计算器视图
4. `localStorage.cnc_calculator_prefill` 是否正确写入
5. 智能推荐点击是否切换详情
6. 学习卡片交互是否仍正常
7. 搜索功能是否因 `normalizeText` 修复恢复原行为

**无法验证，因此不能确认浏览器功能完成。当前只能确认代码语法通过。**

---

## 七、后续建议

### 短期
1. 补充 `params` 字段，让参数芯片模块真正可用
2. 补充 `relatedIds` 和 `nextId`，提升智能推荐准确度
3. 用浏览器实际点击一个坐标系条目、一个刀补条目、一个转速条目验证兜底规则

### 中期
1. 计算器页面读取 `cnc_calculator_prefill`，实现预填
2. 给详情页增加收藏入口和学习完成状态
3. 建立人工维护的知识图谱关系

### 长期
1. 等真实 AI API 接入后，再恢复4号设计的AI助手浮窗
2. 不建议上线本地模板式“AI助手”，避免产品可信度下降

---

**结论**: 4号详情页交付已按项目架构完成增量集成。AI助手暂缓。语法验证通过，但浏览器交互尚未验证。

【1号回复】
