# 1号任务｜只修搜索别名接线，不准扩散改动

你是 **1号（Cherry Studio）**。  
这次不是让你重新做方案，也不是让你继续加新功能。  
你只做一件事：**把搜索别名功能正确接到现有页面里**。

---

## 一、任务背景

上一轮你已经生成了：

- `F:\AI工作台\cnc_param_quickfinder\search-aliases.js`
- `F:\AI工作台\cnc_param_quickfinder\CHERRY_SEARCH_ALIAS_CODE_REPORT_20260706.md`

但经实际核查，当前问题不是“没有文件”，而是：

1. `search-aliases.js` 已存在
2. `index.html` 也已经加载了这个脚本
3. **真正的问题在 `app.js` 接线错误**

已确认的硬问题如下：

- 在 `F:\AI工作台\cnc_param_quickfinder\app.js`
- 大约 `581-617` 行附近
- 你把新的 `matchesKeyword()` 逻辑插到了 `scoreEntry()` 函数内部
- 结果导致全局搜索并没有稳定切换到“别名扩展版匹配”

所以这次任务目标不是“继续写报告”，而是：

**把 `expandSearchTerm()` 和 `matchesKeyword()` 正确放到应该在的位置，并且不破坏原有搜索。**

---

## 二、你这次只能改哪些文件

只允许改这两个文件：

1. `F:\AI工作台\cnc_param_quickfinder\app.js`
2. `F:\AI工作台\cnc_param_quickfinder\CHERRY_SEARCH_ALIAS_CODE_REPORT_20260706.md`

如果你认为 `search-aliases.js` 本身也必须改，允许你改：

3. `F:\AI工作台\cnc_param_quickfinder\search-aliases.js`

但前提是：

- 必须是为了修语法或结构问题
- 不要扩大到“重写整套词典”

---

## 三、具体执行要求

### 任务A：修正 `app.js` 中的函数结构

你要检查并修复：

1. `expandSearchTerm()` 是否处于合理的全局函数层级
2. `matchesKeyword()` 是否只保留 **一个** 有效版本
3. 不能出现“在 `scoreEntry()` 函数内部又嵌一个 `matchesKeyword()`”这种错误结构
4. `scoreEntry()` 必须恢复成正常独立函数
5. 搜索流程应为：

```text
用户输入关键词
→ 如果该词命中别名词典，则扩展为多个词
→ 用扩展后的词参与匹配
→ 返回正常搜索结果
```

### 任务B：保留现有前端数据层兼容性

当前项目里已经存在：

- `frontend-data-layer.js`
- `window.CNC_FRONTEND.getIndexMatches()`

你修 `matchesKeyword()` 时：

1. 不要删掉已有的 `CNC_FRONTEND` 补充匹配能力
2. 要让“别名扩展匹配”和“前端索引补充匹配”可以共存
3. 不要为了接别名功能把已有搜索增强砍掉

### 任务C：最小改动原则

你这次严禁做这些事：

- 不准重排整个 `app.js`
- 不准顺手改 UI
- 不准加新面板
- 不准写“建议后续如何如何”来替代本次修复
- 不准只交报告不改代码

---

## 四、完成标准

你完成后，必须自己核查并在报告里明确写出：

### 必须满足的代码层标准

1. `app.js` 中只存在 **一个有效的 `matchesKeyword()` 定义**
2. `expandSearchTerm()` 不在其他函数体内部
3. `scoreEntry()` 不再被嵌套函数污染
4. `index.html` 继续保留对 `search-aliases.js` 的加载

### 必须满足的行为层标准

请至少按这几个词做自测并写结果：

1. `G2` 应能帮助命中 `G02`
2. `快移` 应能帮助命中 `G00`
3. `对刀` 应能比以前搜到更多相关内容
4. `撞机` 应能联想到安全/报警/快速移动风险相关内容

### 必须满足的交付层标准

你最终必须交付：

1. 改好的 `app.js`
2. 如有必要，改好的 `search-aliases.js`
3. 一份新的返工报告：
   `F:\AI工作台\cnc_param_quickfinder\CHERRY_SEARCH_ALIAS_REWORK_REPORT_20260706.md`

---

## 五、报告必须怎么写

你的返工报告必须包含以下 6 段：

1. 你实际改了哪些文件
2. `app.js` 中原来错在哪里
3. 你现在改成了什么结构
4. `matchesKeyword()` 现在如何与别名扩展协同工作
5. 4 组自测词分别得到什么结果
6. 还有没有未解决问题

注意：

- 不要只写“已修复”
- 要写出真实改动点
- 要写出你自己核查过的证据

---

## 六、你的回复格式

完成后，你回复时必须以这句开头：

**1号回复：搜索别名接线返工已完成**

然后紧接着给出：

1. 你生成的报告路径
2. 你修改的文件清单
3. 你确认修掉的核心问题
4. 你仍不能确认的点（如果有）

---

## 七、最后提醒

这次任务不是拼字数。  
谁都不关心你再写一篇方案。  
现在只要一件事：

**把 `app.js` 里的搜索别名接线修正到可继续验收的状态。**
