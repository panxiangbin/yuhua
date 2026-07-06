# 3号补件任务：修正图片绑定率与契约矛盾

你是3号（Gemini CLI）。

你的回复开头必须写：

`3号回复：`

你这一轮不是重做图片系统，而是修一处已经被验收抓到的关键矛盾：

- 你的格式、命名、枚举都很好
- 但 `relatedEntryOrSection` 和你自己写的契约规则对不上

这次你只修这个矛盾。

---

## 一、问题背景

当前目录：

`F:\AI工作台\cnc_param_quickfinder\image-system-round2\`

验收结论已经指出：

- 480 张图里只有 178 张 `relatedEntryOrSection` 真实对齐了 `data.js / kb-extra.js` 的 entry.id
- 其余大量绑定到了目录级、占位级、或非真实知识点 ID
- 这和你自己在 `image-schema-contract.md` 里写的“必须与真实 entry.id 对齐”矛盾

---

## 二、你必须完成的二选一修正

你必须自己判断走哪条，但必须只选一条并执行到底：

### 路线A：修规则

如果你认为“分类封面图”不该强制绑定真实 entry.id，
那你就：

- 改写 `image-schema-contract.md`
- 明确区分：
  - `entry-level binding`
  - `section-level binding`
  - `system placeholder binding`

并让规则和实际数据一致。

### 路线B：修数据

如果你认为“就是应该尽量对齐真实 entry.id”，
那你就：

- 修 `image-entry-map-round2.json`
- 修 batch001 fixed / batch002 的 `relatedEntryOrSection`
- 尽可能把更多图片对齐到真实存在的 entry.id

---

## 三、必须生成的文件

无论你选哪条，都必须生成：

1. `F:\AI工作台\cnc_param_quickfinder\image-system-round2\image-binding-audit-fix.md`
2. `F:\AI工作台\cnc_param_quickfinder\image-system-round2\image-binding-stats-v2.json`

如果你改了契约，还要更新：

- `image-schema-contract.md`

如果你改了数据，还要更新：

- `image-entry-map-round2.json`
- `image-batch-001-prompts-fixed.json`
- `image-batch-002-prompts.json`

---

## 四、统计要求

你必须给出明确统计：

- 总图数
- 真实 entry.id 对齐数
- section-level 绑定数
- placeholder 绑定数
- 修复前后的变化

不要只说“提升了很多”。

---

## 五、验证要求

你必须自己验证：

1. 涉及的 JSON 都能解析
2. 如果改了契约，契约文本和实际数据不再互相打架
3. 在 `image-binding-audit-fix.md` 里明确写：
   - 你选了路线A还是路线B
   - 为什么

---

## 六、回复格式

只汇报：

1. 你选了哪条路线
2. 改了哪些文件
3. 修复前后的绑定统计
4. 现在还剩什么问题
