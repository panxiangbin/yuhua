# 3号任务｜先修图片映射 JSON，可解析后再谈绑定率

你是 **3号（Gemini CLI）**。  
这次不是继续写“图片系统很完整”的报告。  
你先做最关键的一步：

**把 `image-entry-map-round2.json` 修到可解析、可核查、可统计。**

---

## 一、任务背景

你上一轮已经交了这些文件：

- `F:\AI工作台\cnc_param_quickfinder\image-system-round2\image-binding-audit-fix.md`
- `F:\AI工作台\cnc_param_quickfinder\image-system-round2\image-binding-stats-v2.json`
- `F:\AI工作台\cnc_param_quickfinder\image-system-round2\image-entry-map-round2.json`

但经实际核查，当前存在两个问题：

### 问题1：报告说修好了，但主文件当前无法稳定解析

在本地机器核查时：

- `image-binding-stats-v2.json` 可以读
- 但 `image-entry-map-round2.json` 当前 `ConvertFrom-Json` 失败

这意味着：

**你交的是“修复说明”，不是“可直接被程序消费的数据成果”。**

### 问题2：统计文件并没有证明修复发生

当前 `image-binding-stats-v2.json` 里显示的仍然是：

- `entryLevelCount = 461`
- `sectionLevelCount = 7`
- `placeholderCount = 12`
- 修复前后增量 = `0`

也就是说，就算报告写得很长，统计本身也没有展示出“真正做了什么变化”。

---

## 二、你这次任务的核心目标

只做这三件事：

1. **先修好 `image-entry-map-round2.json` 的可解析性**
2. **再重新生成真实可信的绑定统计**
3. **最后再写报告**

顺序不能反。

---

## 三、允许你改的文件

你只允许改以下文件：

1. `F:\AI工作台\cnc_param_quickfinder\image-system-round2\image-entry-map-round2.json`
2. `F:\AI工作台\cnc_param_quickfinder\image-system-round2\image-binding-stats-v2.json`
3. `F:\AI工作台\cnc_param_quickfinder\image-system-round2\image-schema-contract.md`
4. `F:\AI工作台\cnc_param_quickfinder\image-system-round2\image-binding-audit-fix.md`

如确有必要，你可以新增一份返工报告：

5. `F:\AI工作台\cnc_param_quickfinder\image-system-round2\image-binding-rework-report-20260706.md`

禁止扩大到别的目录重写一整套系统。

---

## 四、这次必须先做的技术动作

### 任务A：先把 `image-entry-map-round2.json` 修成可解析 JSON

你必须先检查：

1. 是否存在引号损坏
2. 是否存在中途截断
3. 是否存在多余逗号
4. 是否存在 value 里未闭合字符串
5. 是否存在批量替换后留下的非法 JSON 结构

要求：

- 修复后的文件必须是 **标准 JSON**
- 不能依赖“某些宽松解析器”
- 必须能被严格 JSON 解析

### 任务B：重新定义“绑定率统计”的口径

你这次不能再只写一句“96.04%”。

你必须把统计拆成至少这 4 层：

1. `ENTRY_LEVEL`
2. `SECTION_LEVEL`
3. `PLACEHOLDER_LEVEL`
4. `UNRESOLVED`

如果 `UNRESOLVED = 0`，那就明确写 `0`。  
如果不是 `0`，必须老实写出来。

### 任务C：明确“真实知识点绑定”和“页面区域绑定”不是一回事

你要在 `image-schema-contract.md` 里写清楚：

1. 哪些键必须是知识点 ID
2. 哪些键允许是页面区块 ID
3. 哪些键只是预留占位
4. 前端未来消费时应该如何区分

不能再用一套模糊说法把三种类型混在一起。

---

## 五、这次必须交出的统计证据

你最终给出的统计文件 `image-binding-stats-v2.json` 至少要包含：

1. 总图片数
2. `ENTRY_LEVEL` 数量
3. `SECTION_LEVEL` 数量
4. `PLACEHOLDER_LEVEL` 数量
5. `UNRESOLVED` 数量
6. 每类占比
7. 修复前后差异
8. 统计口径说明

如果修复前后没有变化，也必须明确写原因：

- 是原来数据本来就对
- 还是只是规则文档修了
- 还是只是把坏 JSON 修成了可消费状态

---

## 六、完成标准

你只有在下面这些条件都满足时，才可以说“完成”：

### 标准1：主映射文件可被严格解析

`image-entry-map-round2.json`

- 不能报 JSON 解析错误
- 不能出现截断
- 不能只是“部分能读”

### 标准2：统计文件和主文件一致

`image-binding-stats-v2.json`

- 数量必须和主文件真实内容对应
- 不能出现“报告里说 480，但文件里对不上”

### 标准3：规则文档与现实一致

`image-schema-contract.md`

- 不能再要求“所有都必须是真实 entry.id”，如果现实里还有 section / placeholder
- 也不能继续模糊化

### 标准4：报告要有真实返工说明

你最终要明确回答这几个问题：

1. 这次到底修的是“坏 JSON”还是“坏绑定”
2. 修复前最严重的问题是什么
3. 修复后还剩什么问题
4. 哪些绑定是真知识点，哪些只是页面区块

---

## 七、你这次禁止做的事

这次严禁：

- 再写一篇很长但无法机器验证的总报告
- 用“已核验通过”代替真实文件修复
- 不修 JSON 本体，只修说明文档
- 再把“规则修了”和“数据真修了”混为一谈

---

## 八、你的交付物

本轮必须交付：

1. 修好的 `image-entry-map-round2.json`
2. 修好的 `image-binding-stats-v2.json`
3. 更新后的 `image-schema-contract.md`
4. 一份返工报告：
   `F:\AI工作台\cnc_param_quickfinder\image-system-round2\image-binding-rework-report-20260706.md`

---

## 九、你的回复格式

完成后，你必须这样开头回复：

**3号回复：图片映射 JSON 返工已完成**

然后必须附上：

1. 你修改的文件清单
2. 你确认已经可解析的主文件路径
3. 新统计结果摘要
4. 还没解决的问题（如果有）

---

## 十、最后一句话

这次不要急着“很快完成”。  
先把主 JSON 修到能过解析，再谈 96%、98%、100%。

**先过机器，再写报告。**
