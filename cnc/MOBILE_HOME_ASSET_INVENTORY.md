# 手机端“速肯方面”素材清单

更新时间：2026-08-04

## 检索原则

用户原话为“速肯方面的图片”，本清单保留该词，不擅自改名。素材筛选同时按以下关键词核对：

- 速肯
- 数控
- CNC
- 机床
- 刀具
- 加工
- 编程
- 报警
- 测量
- 图纸
- 工艺

只使用图片实际内容与知识点明确匹配的仓库素材。不得仅根据文件名判断，不得把一张通用机床图重复用于全部课程。

## 资料源状态

- 最新 Git 仓库 `cnc/assets/images`：已读取现有图片映射并优先复用。
- `featured-images.js`、`featured-images-supplement.js` 等现有映射：已用于确认图片主题和条目关系。
- `F:\AI工作台\cnc_param_quickfinder\assets\images`：当前远程执行环境无法读取，待本机环境补充盘点；该目录不作为网页发布路径。
- 所有上线引用均使用仓库内 `./assets/images/...` 相对路径，不引用 `F:\`。

## 手机首页学习主图

| 用途 | 仓库路径 | 主题判断 | 采用原因 |
|---|---|---|---|
| 首页当前学习主图 | `assets/images/batch01_core/beginner-machine-zero-vs-work-zero-001.webp` | 机床参考点、工件零点与坐标关系 | 与零基础学习路线和坐标主题明确匹配 |

## 12关学习缩略图

| 关卡 | 主题 | 仓库路径 | 图片说明 |
|---:|---|---|---|
| 1 | 安全基础 | `assets/images/batch02_operation_basics/machine-init-flow-001.webp` | 开机、自检、回零和安全确认流程 |
| 2 | 认识加工中心 | `assets/images/batch04_milling_tooling/milling-process-overview-001.webp` | 常见铣削工艺与加工中心工作区域 |
| 3 | 坐标轴与运动方向 | `assets/images/batch01_core/beginner-machine-zero-vs-work-zero-001.webp` | 参考点、工件零点和坐标方向关系 |
| 4 | 图纸、尺寸与基准 | `assets/images/batch01_core/measure-reading-set-001.webp` | 图纸尺寸与卡尺、千分尺、百分表检测 |
| 5 | 机床坐标与工件坐标 | `assets/images/batch05_alarm_drawing_material/dial-indicator-detail-001.webp` | 百分表找正与坐标基准建立 |
| 6 | 工件装夹基础 | `assets/images/batch04_milling_tooling/vise-clamping-basic-001.webp` | 平口钳、垫块和工件装夹找正 |
| 7 | 刀具基础 | `assets/images/batch04_milling_tooling/tool-selection-beginner-001.webp` | 立铣刀、球头刀和基础刀具选用 |
| 8 | 对刀与刀长补偿 | `assets/images/batch04_milling_tooling/bt-er-holder-overview-001.webp` | BT刀柄、ER夹头、伸出量和刀长关系 |
| 9 | G00与G01 | `assets/images/batch02_operation_basics/single-block-dry-run-001.webp` | 单段、空运行和低倍率验证 |
| 10 | G02与G03 | `assets/images/batch04_milling_tooling/milling-contour-001.webp` | 轮廓圆弧切入切出和方向判断 |
| 11 | 孔加工循环 | `assets/images/batch02_operation_basics/canned-cycle-overview-001.webp` | 快速定位、进给、孔底动作和退刀 |
| 12 | 完整程序与首件验证 | `assets/images/batch05_alarm_drawing_material/first-piece-inspection-001.webp` | 首件检测、图纸比对和记录闭环 |

## 查询结果可复用图片示例

| 查询范围 | 已确认映射图片 |
|---|---|
| G41/G42、轮廓补偿 | `assets/images/batch04_milling_tooling/milling-contour-001.webp` |
| G54、工件坐标系 | `assets/images/batch01_core/beginner-machine-zero-vs-work-zero-001.webp` |
| 固定循环、孔加工 | `assets/images/batch02_operation_basics/canned-cycle-overview-001.webp` |
| 刀具选型 | `assets/images/batch04_milling_tooling/tool-selection-beginner-001.webp` |
| 刀柄与夹头 | `assets/images/batch04_milling_tooling/bt-er-holder-overview-001.webp` |
| 装夹找正 | `assets/images/batch04_milling_tooling/vise-clamping-basic-001.webp` |
| 单段和空运行 | `assets/images/batch02_operation_basics/single-block-dry-run-001.webp` |
| 报警与安全误操作 | `assets/images/batch05_alarm_drawing_material/beginner-mistakes-overview-001.webp` |
| 量具和测量 | `assets/images/batch01_core/measure-reading-set-001.webp` |
| 首件检验 | `assets/images/batch05_alarm_drawing_material/first-piece-inspection-001.webp` |

## 去重和上线规则

1. 同一课程只使用与其主题最直接匹配的图片。
2. 首页主图允许在对应坐标课程中再次出现，但不作为全部课程通用图。
3. 查询结果仅在条目已有明确映射时显示图片。
4. 图片加载失败时保留文本结果，不显示破图占位。
5. 所有课程图片必须有中文 `alt` 和简短说明。
6. 公网验收时检查图片 `naturalWidth > 0`。
7. 后续在本机补充 `F:\AI工作台\cnc_param_quickfinder\assets\images` 时，先做哈希和视觉去重，再只复制最终选中素材到仓库。
