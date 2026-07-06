# 图片文件名与分类缩写命名规范 v2.0 (image-filename-rules-v2.md)

**命名规则版本**：v2.0 (Strictly Unified)  
**契约执行**：3号 (Gemini CLI)  
**项目分区**：F:\AI工作台\cnc_param_quickfinder  

---

## 一、物理文件名构造公式

为彻底消除 round1 规则描述中 `coordinate` 和实际文件 `coordinate` 冗长重叠，以及与 `img_batch001` 等临时约定的混乱，这一版**只保留且强制执行以下唯一物理命名公式**：

`img_[batch]_[typeAbbr]_[serial].webp`

*   **`img`**：固定系统前缀，全部小写。
*   **`[batch]`**：批次号编码，当前只允许 `b001`（第一批）或 `b002`（第二批）。
*   **`[typeAbbr]`**：图片功能类型的三位或四位官方唯一字母缩写（见下表分类缩写字典）。
*   **`[serial]`**：三位递增序列号，如 `001` 至 `240`。
*   **`.webp`**：统一物理图片格式后缀。

---

## 二、分类缩写字典 (Strict Abbr Map)

所有图片的 `filename` 中的 `[typeAbbr]` 必须与记录中的 `imageType` 形成严格的一对一强映射映射，禁止任何自由发挥：

| 官方中文分类 (imageType) | 官方指定唯一缩写 (typeAbbr) | 示例文件名 (filename) | 对应 ID 工单 (imageId) |
| :--- | :--- | :--- | :--- |
| **坐标示意图** | `coord` | `img_b001_coord_008.webp` | `img-b001-008` |
| **刀路轨迹图** | `path` | `img_b001_path_002.webp` | `img-b001-002` |
| **报警情景图** | `alarm` | `img_b001_alarm_003.webp` | `img-b001-003` |
| **对比图** | `comp` | `img_b001_comp_004.webp` | `img-b001-004` |
| **对刀步骤图** | `toff` | `img_b001_toff_011.webp` | `img-b001-011` |
| **参数仪表图** | `calc` | `img_b001_calc_006.webp` | `img-b001-006` |
| **图纸实物对比图** | `draw` | `img_b001_draw_007.webp` | `img-b001-007` |
| **流程图** | `flow` | `img_b001_flow_001.webp` | `img-b001-001` |

---

## 三、校验规范

*   Codex 在执行自动挂图时，如果读入的物理文件名不包含上表中的 8 类缩写，或者批次不匹配，系统会抛出 **Validation Error** 并阻断打包构建，以此保证图片引用零出错。
