# 3号任务：图片系统JSON全批次修复与验证包

你是 3号（Gemini CLI）。

这是一个超长任务包，要求你修复所有图片批次的 JSON 文件，并确保外部解析稳定。

---

## 一、任务目标

修复所有图片批次的 JSON 文件，确保：
1. PowerShell 能成功解析（UTF-8编码）
2. Node.js 能成功解析
3. Python 能成功解析
4. 内容完整无损

---

## 二、必须产出的文件

**目标目录**: `F:\AI工作台\cnc_param_quickfinder\`

### 批次1：核心图包
**文件1**: `image-batch-001-core-fixed.json`
- 原文件：image-batch-001-core.json
- 必须保持所有条目完整
- 必须修复编码问题
- 必须通过三种解析器验证

### 批次2：操作基础
**文件2**: `image-batch-002-operation-fixed.json`
- 原文件：image-batch-002-operation.json
- 必须保持所有条目完整
- 必须修复编码问题
- 必须通过三种解析器验证

### 批次3：车削工艺
**文件3**: `image-batch-003-prompts-fixed.json`
- 原文件：image-batch-003-prompts.json
- 必须保持所有条目完整
- 必须修复编码问题
- 必须通过三种解析器验证

### 批次4：铣削刀具
**文件4**: `image-batch-004-milling-fixed.json`
- 原文件：image-batch-004-milling.json（如果存在）
- 必须保持所有条目完整
- 必须修复编码问题
- 必须通过三种解析器验证

### 批次5：报警排障
**文件5**: `image-batch-005-alarm-fixed.json`
- 原文件：image-batch-005-alarm.json（如果存在）
- 必须保持所有条目完整
- 必须修复编码问题
- 必须通过三种解析器验证

### 验证脚本
**文件6**: `validate-all-image-json.js`
- 功能：批量验证所有修复后的 JSON 文件
- 必须支持三种解析器测试
- 必须输出详细报告
- 代码行数 ≥ 100 行

### 修复工具
**文件7**: `fix-json-encoding.js`
- 功能：自动修复 JSON 编码问题的工具
- 必须支持批量处理
- 必须保留原文件备份
- 代码行数 ≥ 80 行

### 完整报告
**文件8**: `IMAGE_JSON_COMPLETE_FIX_REPORT_20260706.md`
- 必须包含：问题分析、修复方法、验证结果、风险提示
- 字数 ≥ 2500 字

---

## 三、明确限制

### 禁止事项
1. ❌ **不要改变 JSON 数据结构**
2. ❌ **不要删除任何图片条目**
3. ❌ **不要修改提示词内容本身**
4. ❌ **不要修改图片路径**
5. ❌ **不要修改图片ID**

### 必须遵守
1. ✅ **只修复编码和语法问题**
2. ✅ **必须保留原文件备份**
3. ✅ **必须同时通过自校验和外部解析**
4. ✅ **不准只报统计数，要给失败样例或抽样样例**

---

## 四、验证要求

### PowerShell 验证（必须实际运行）

```powershell
# 验证批次1
$json1 = Get-Content F:\AI工作台\cnc_param_quickfinder\image-batch-001-core-fixed.json -Raw -Encoding UTF8 | ConvertFrom-Json
Write-Host "批次1条目数: $($json1.Count)"

# 验证批次2
$json2 = Get-Content F:\AI工作台\cnc_param_quickfinder\image-batch-002-operation-fixed.json -Raw -Encoding UTF8 | ConvertFrom-Json
Write-Host "批次2条目数: $($json2.Count)"

# 验证批次3
$json3 = Get-Content F:\AI工作台\cnc_param_quickfinder\image-batch-003-prompts-fixed.json -Raw -Encoding UTF8 | ConvertFrom-Json
Write-Host "批次3条目数: $($json3.Count)"

# 验证批次4（如果存在）
$json4 = Get-Content F:\AI工作台\cnc_param_quickfinder\image-batch-004-milling-fixed.json -Raw -Encoding UTF8 | ConvertFrom-Json
Write-Host "批次4条目数: $($json4.Count)"

# 验证批次5（如果存在）
$json5 = Get-Content F:\AI工作台\cnc_param_quickfinder\image-batch-005-alarm-fixed.json -Raw -Encoding UTF8 | ConvertFrom-Json
Write-Host "批次5条目数: $($json5.Count)"
```

### Node.js 验证（必须实际运行）

```bash
cd F:\AI工作台\cnc_param_quickfinder\
node validate-all-image-json.js
```

### Python 验证（必须实际运行）

```python
import json

# 验证批次1
with open('F:/AI工作台/cnc_param_quickfinder/image-batch-001-core-fixed.json', 'r', encoding='utf-8') as f:
    data1 = json.load(f)
    print(f"批次1条目数: {len(data1)}")

# 验证批次2
with open('F:/AI工作台/cnc_param_quickfinder/image-batch-002-operation-fixed.json', 'r', encoding='utf-8') as f:
    data2 = json.load(f)
    print(f"批次2条目数: {len(data2)}")

# 验证批次3
with open('F:/AI工作台/cnc_param_quickfinder/image-batch-003-prompts-fixed.json', 'r', encoding='utf-8') as f:
    data3 = json.load(f)
    print(f"批次3条目数: {len(data3)}")
```

---

## 五、回复格式（严格遵守）

```markdown
3号回复：图片系统JSON全批次修复已完成

## 1. 问题原因分析
- 批次1问题：[详细说明]
- 批次2问题：[详细说明]
- 批次3问题：[详细说明]
- 批次4问题：[详细说明]
- 批次5问题：[详细说明]
- 共性问题：[UTF-8 BOM / 特殊字符 / 其他]

## 2. 修复方法说明
- [具体操作步骤]
- [使用的工具或脚本]

## 3. 新增文件清单
- F:\AI工作台\cnc_param_quickfinder\image-batch-001-core-fixed.json (XX条目)
- F:\AI工作台\cnc_param_quickfinder\image-batch-002-operation-fixed.json (XX条目)
- F:\AI工作台\cnc_param_quickfinder\image-batch-003-prompts-fixed.json (XX条目)
- F:\AI工作台\cnc_param_quickfinder\image-batch-004-milling-fixed.json (XX条目)
- F:\AI工作台\cnc_param_quickfinder\image-batch-005-alarm-fixed.json (XX条目)
- F:\AI工作台\cnc_param_quickfinder\validate-all-image-json.js
- F:\AI工作台\cnc_param_quickfinder\fix-json-encoding.js
- F:\AI工作台\cnc_param_quickfinder\IMAGE_JSON_COMPLETE_FIX_REPORT_20260706.md

## 4. 自校验结果
[你的内部校验器输出]

## 5. PowerShell 外部解析结果
[实际命令及完整输出]

## 6. Node.js 外部解析结果
[实际命令及完整输出]

## 7. Python 外部解析结果
[实际命令及完整输出]

## 8. 数据完整性验证
- 批次1：原XX条 → 修复后XX条 [✓/✗]
- 批次2：原XX条 → 修复后XX条 [✓/✗]
- 批次3：原XX条 → 修复后XX条 [✓/✗]
- 批次4：原XX条 → 修复后XX条 [✓/✗]
- 批次5：原XX条 → 修复后XX条 [✓/✗]

## 9. 抽样样例（每批次至少1个）
- 批次1示例：[JSON片段]
- 批次2示例：[JSON片段]
- 批次3示例：[JSON片段]

## 10. 不能确认的部分
- [明确列出]

## 11. 风险提示
- [列出潜在风险]
```

---

开始执行任务。
