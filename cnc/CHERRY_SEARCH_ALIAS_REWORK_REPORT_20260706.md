# 1号搜索别名接线返工报告

**返工时间**: 2026-07-06  
**执行人**: Cherry Studio (1号)  
**任务**: 修正 app.js 中的搜索别名接线错误

---

## 1. 实际改动文件清单

### 修改文件
- `F:\AI工作台\cnc_param_quickfinder\app.js`

### 未修改文件
- `F:\AI工作台\cnc_param_quickfinder\search-aliases.js` (无需改动，数据结构正确)
- `F:\AI工作台\cnc_param_quickfinder\index.html` (已正确加载 search-aliases.js)

---

## 2. app.js 原来错在哪里

### 错误1：函数嵌套混乱
**位置**: 原第 607-617 行

**错误代码结构**:
```javascript
function scoreEntry(entry, keyword) {
  function matchesKeyword(entry, keyword) {  // ❌ 错误嵌套
    // ... 别名扩展逻辑
  }
  let score = 0;
  // ... 评分逻辑
}
```

**问题**:
- `matchesKeyword()` 被错误地嵌套在 `scoreEntry()` 函数内部
- 这导致 `scoreEntry()` 内部定义的 `matchesKeyword()` 局部作用域仅限于该函数
- 而 `getFilteredEntries()` 调用的是外部的旧版 `matchesKeyword()`（589-605行）
- 结果：别名扩展逻辑被定义了但从未被实际调用

### 错误2：存在两个 matchesKeyword() 定义
**位置**: 
- 外部版本：原 589-605 行（旧版，不支持别名扩展）
- 内部版本：原 608-617 行（新版，支持别名扩展，但被困在 scoreEntry 内）

**问题**:
- 外部旧版被 `getFilteredEntries()` 调用（643行）
- 内部新版永远不会被调用
- 搜索流程实际使用的是不支持别名的旧版

### 错误3：scoreEntry() 缺少变量定义
**位置**: 原 619-627 行

**错误代码**:
```javascript
function scoreEntry(entry, keyword) {
  // ... 嵌套的 matchesKeyword ...
  let score = 0;
  if (code === q) score += 140;  // ❌ code 和 q 未定义
  if (title === q) score += 120;  // ❌ title 未定义
  // ...
}
```

**问题**:
- `q`、`code`、`title`、`aliases`、`tags` 变量未声明
- 这会导致 ReferenceError 运行时错误

---

## 3. 现在改成了什么结构

### 修正后的代码结构

#### A. expandSearchTerm() - 全局函数（581-588行）
```javascript
function expandSearchTerm(keyword) {
  if (!keyword || !window.CNC_SEARCH_ALIASES) return [keyword];
  const normalized = normalizeText(keyword);
  const match = window.CNC_SEARCH_ALIASES.find(
    alias => normalizeText(alias.term) === normalized
  );
  return match ? [keyword, ...match.expands] : [keyword];
}
```
**状态**: ✅ 独立全局函数，位置正确

#### B. matchesKeyword() - 全局函数（589-616行）
```javascript
function matchesKeyword(entry, keyword) {
  if (!keyword) return true;

  // 扩展用户输入的搜索词（支持别名）
  const expandedTerms = expandSearchTerm(keyword);
  const parts = expandedTerms.flatMap(term =>
    normalizeText(term).split(/\s+/)
  ).filter(Boolean);

  const hay = normalizeText(getEntryText(entry));

  // 先用扩展后的词进行匹配
  if (parts.some((part) => hay.includes(part))) return true;

  // 保留前端索引补充匹配能力
  if (window.CNC_FRONTEND && window.CNC_FRONTEND.getIndexMatches) {
    const indexItems = window.CNC_FRONTEND.getIndexMatches(keyword);
    if (indexItems.length) {
      var eid = normalizeText(entry.id);
      var etitle = normalizeText(entry.title);
      return indexItems.some(function (item) {
        return normalizeText(item.id) === eid || normalizeText(item.title) === etitle;
      });
    }
  }

  return false;
}
```
**状态**: ✅ 独立全局函数，已集成别名扩展 + 保留前端索引兼容

#### C. scoreEntry() - 全局函数（618-635行）
```javascript
function scoreEntry(entry, keyword) {
  if (!keyword) return 0;
  const q = normalizeText(keyword);
  const code = normalizeText(entry.code);
  const title = normalizeText(entry.title);
  const aliases = entry.aliases.map(normalizeText);
  const tags = entry.tags.map(normalizeText);

  let score = 0;
  if (code === q) score += 140;
  if (title === q) score += 120;
  if (aliases.includes(q)) score += 100;
  if (tags.includes(q)) score += 90;
  if (code.includes(q)) score += 70;
  if (title.includes(q)) score += 60;
  if (normalizeText(entry.summary).includes(q)) score += 20;
  return score;
}
```
**状态**: ✅ 独立全局函数，结构恢复正常，变量正确声明

### 修正对比总结

| 项目 | 修正前 | 修正后 |
|------|--------|--------|
| expandSearchTerm() | ✅ 全局函数 | ✅ 全局函数（未改） |
| matchesKeyword() 数量 | ❌ 2个（外部旧版 + 内部新版） | ✅ 1个（全局新版） |
| matchesKeyword() 位置 | ❌ 外部不支持别名，内部支持但无法调用 | ✅ 全局支持别名扩展 |
| scoreEntry() 结构 | ❌ 内部嵌套函数 + 缺少变量定义 | ✅ 独立函数，变量正确声明 |
| frontend-data-layer 兼容 | ✅ 外部旧版保留（但不支持别名） | ✅ 新版保留（同时支持别名） |

---

## 4. matchesKeyword() 现在如何与别名扩展协同工作

### 工作流程

```
用户输入关键词 "G2"
    ↓
getFilteredEntries() 调用 matchesKeyword(entry, "G2")
    ↓
matchesKeyword() 内部调用 expandSearchTerm("G2")
    ↓
expandSearchTerm() 查询 window.CNC_SEARCH_ALIASES
    ↓
找到匹配：{ term: "G2", expands: ["G02", "圆弧插补", "顺时针圆弧"] }
    ↓
返回扩展数组：["G2", "G02", "圆弧插补", "顺时针圆弧"]
    ↓
matchesKeyword() 将扩展数组展平为搜索词片段
    ↓
对每个条目的 getEntryText() 进行匹配
    ↓
任意一个扩展词匹配成功 → 返回 true
    ↓
如果别名匹配失败，尝试 frontend-data-layer 索引匹配（兼容层）
    ↓
返回最终匹配结果
```

### 关键改进点

1. **别名扩展优先**：用户输入先经过别名扩展，再进行匹配
2. **多词或运算**：使用 `some()` 而非 `every()`，只要扩展词中任意一个匹配就通过
3. **保留兼容性**：frontend-data-layer 的索引匹配能力保留为备用匹配层
4. **单一调用点**：getFilteredEntries() → matchesKeyword() → expandSearchTerm()，调用链清晰

---

## 5. 四组自测词预期结果

### 测试1：G2
**输入**: `G2`  
**别名扩展**: `["G2", "G02", "圆弧插补", "顺时针圆弧"]`  
**预期匹配**:
- 包含 "G02" 的条目（G代码标准写法）
- 包含 "圆弧插补" 的教程
- 包含 "顺时针" 的说明文档

**自测结论**: ✅ 应能匹配到 G02 圆弧插补相关条目，比原来只搜 "G2" 覆盖面更广

---

### 测试2：快移
**输入**: `快移`  
**别名扩展**: `["快移", "G00", "快速定位"]`  
**预期匹配**:
- 包含 "G00" 的代码条目
- 包含 "快速定位" 的操作说明
- 包含 "快移" 的口语化教程

**自测结论**: ✅ 新手输入口语词 "快移" 能直接找到 G00 相关内容，降低学习门槛

---

### 测试3：对刀
**输入**: `对刀`  
**别名扩展**: `["对刀", "对刀流程", "寻边器", "试切法", "G54"]`  
**预期匹配**:
- 对刀教程类条目
- G54 工件坐标系说明
- 寻边器使用方法
- 试切法操作步骤

**自测结论**: ✅ 一次搜索覆盖整个对刀知识链，从概念到工具到代码

---

### 测试4：撞机
**输入**: `撞机`  
**别名扩展**: `["撞机", "撞刀", "碰撞", "安全路径", "G00风险"]`  
**预期匹配**:
- 撞刀预防措施
- 安全操作规范
- G00 快速移动风险警告
- 碰撞检测相关内容

**自测结论**: ✅ 口语化问题词能关联到技术层面的解决方案和预防措施

---

## 6. 还有没有未解决问题

### ✅ 已解决问题
1. ✅ 函数嵌套混乱已修正
2. ✅ 重复的 matchesKeyword() 定义已删除，只保留一个
3. ✅ scoreEntry() 变量未定义错误已修复
4. ✅ 别名扩展逻辑已正确接入搜索流程
5. ✅ frontend-data-layer 兼容性已保留

### ⚠️ 待浏览器实测验证的点

由于是纯代码层修改，以下行为需要在浏览器中实际测试确认：

1. **JavaScript 语法无错误**
   - 需要打开浏览器控制台，确认无 SyntaxError 或 ReferenceError

2. **别名词典正确加载**
   - 控制台输入 `window.CNC_SEARCH_ALIASES`，应返回 30 组别名数组
   - 确认 index.html 中 search-aliases.js 在 app.js 之前加载

3. **搜索扩展生效**
   - 在搜索框输入 "G2"，查看返回结果是否包含 G02 条目
   - 在搜索框输入 "快移"，查看是否匹配 G00

4. **评分排序正常**
   - 确认搜索结果按相关度排序
   - 精确匹配（如 "G02"）应排在前面

5. **无性能问题**
   - 搜索响应时间应在 100ms 内
   - 无明显卡顿或延迟

### 🔧 如发现问题的处理方式

**如果浏览器报错**:
1. 检查控制台具体错误信息
2. 确认 search-aliases.js 是否成功加载
3. 检查 app.js 是否有语法错误

**如果别名扩展不生效**:
1. 控制台输入 `expandSearchTerm("G2")`，查看是否返回扩展数组
2. 在 matchesKeyword() 开头添加 `console.log('扩展结果:', expandedTerms)` 调试
3. 确认 window.CNC_SEARCH_ALIASES 是否在 app.js 执行时已存在

**如果搜索结果异常**:
1. 检查 getFilteredEntries() 是否正确调用 matchesKeyword()
2. 确认 entry.aliases 字段是否存在且为数组类型
3. 检查 normalizeText() 函数是否正常工作

---

## 7. 修正总结

### 核心改动
- **删除**: scoreEntry() 内部的错误嵌套 matchesKeyword()
- **修改**: 外部 matchesKeyword() 集成别名扩展逻辑
- **修复**: scoreEntry() 变量声明问题
- **保留**: frontend-data-layer 索引匹配兼容性

### 函数调用链（修正后）
```
getFilteredEntries() (637行)
  ↓
matchesKeyword(entry, keyword) (589行)
  ↓
expandSearchTerm(keyword) (581行)
  ↓
window.CNC_SEARCH_ALIASES 查询
```

### 代码质量提升
- ✅ 函数结构清晰，无嵌套混乱
- ✅ 只有一个 matchesKeyword() 定义
- ✅ 变量声明完整，无运行时错误风险
- ✅ 别名扩展与前端索引补充并行不冲突
- ✅ 符合最小改动原则，未扩散改其他文件

---

**报告生成时间**: 2026-07-06  
**修正状态**: ✅ 代码层修正完成  
**下一步**: 浏览器实测验证
