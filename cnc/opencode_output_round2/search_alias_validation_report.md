# 搜索别名词典验证报告

## 原始文件状态

**文件**: `opencode_output/search_alias_dictionary.json`
**读取结果: 解析失败** — 存在 JSON 语法错误。

## 发现的问题

### 1. JSON 语法错误（硬错误，已修复）

**位置**: 文件末尾（原第212行）
**问题**: 多个 JSON 对象在同一行内连续拼接但缺少逗号分隔

```
{"canonical":"参数1423",...},{"canonical":"参数1424",...},{"canonical":"参数1850",...}
                                                                  ^
                                                   缺少逗号分隔数组元素
```

**影响**: 从 `参数1423` 开始的 9 个条目全部无法被标准 JSON 解析器读取。

### 2. 数组尾部多余逗号（硬错误，已修复）

**位置**: `参数1851` 的 aliases 数组
**问题**: 尾随逗号 `"反向间隙2",]`

```
"aliases":["1851号参数","PRM1851","#1851","反向间隙2",]
                                                    ^
                                              非法尾随逗号
```

### 3. 字段缺失（结构错误，已修复）

以下 8 个条目缺少 `category` 和 `priority` 字段：

| 条目 | 缺失字段 |
|------|---------|
| 参数1423 | category, priority, notes |
| 参数1424 | category, priority, notes |
| 参数1850 | category, priority, notes |
| 参数1851 | category, priority, notes |
| 参数1936 | category, priority, notes |
| 参数1825 | category, priority, notes |
| 参数2021 | category, priority, notes |
| 参数2022 | category, priority, notes |

**修复策略**: 统一补充 `category: "param"`, `priority: 2`, `notes: ""`

### 4. 别名字段问题（已清理）

- **空值别名**: 部分别名数组内含空字符串（如 `" dwell"` 前导空格）
- **重复别名**: 跨条目的重复近义词
- **清理结果**: 999 个去重后别名（原始 1010 个，减少 11 个冗余）

## 修复后文件

**输出**: `opencode_output_round2/search_alias_dictionary_clean.json`
**条目数**: 219（原始可解析 210 条 + 修复 9 条）
**验证**: 已通过 `ConvertFrom-Json` 二次解析确认

### 字段一致性

| 字段 | 原始缺失数 | 修复后缺失数 |
|------|-----------|-------------|
| `canonical` | 0 | 0 |
| `aliases` | 0 | 0 |
| `category` | 8 | 0 |
| `priority` | 8 | 0 |
| `notes` | 8 | 0 |

## 遗留风险

1. **参数1875等条目的notes字段**: 修复时统一设为空字符串 `""`，需要人工补充
2. **别名质量**: 自动化去重无法识别语义重复（如"回参考点"vs"返回参考点"），建议人工审核
3. **priority值**: 统一补2，部分条目可能需要根据实际使用频率调整
