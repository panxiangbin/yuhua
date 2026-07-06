# Gemini 第二批到第五批出图总指令

这份文件是给 `cnc_param_quickfinder` 项目继续扩图用的。

当前状态：
- 第一批 `24` 张核心教学图已经完成并接入网页。
- 下面继续补第二批到第五批，共 `96` 张。
- 这 `96` 张画完后，网站就会从“有一批核心图”升级成“有完整学习图库雏形”。

建议执行方式：
- 不要一次性让 Gemini 画完 96 张。
- 按批次发。
- 一次发 24 张，风格更稳，返工也更容易控。

---

## 通用固定要求

每一批开始前，都先把这一段一起发给 Gemini：

```text
你现在是“数控新手学习助手”项目的教学配图设计师。请严格按统一风格批量生成数控教学插图。

统一视觉要求：
1. 全部图片用于手机网页学习，优先适配竖版阅读，建议 3:4 或 4:5 比例。
2. 整体风格统一为：白底或浅米色底的工业教材风、信息图风、工程教学插图风。
3. 全部使用中文，不要英文标题，不要英文设备标签，不要英文说明。
4. 不要照片风，不要真实人物，不要复杂车间背景，不要炫酷海报风，不要赛博风。
5. 线条清晰，结构清楚，箭头明确，重点区域高亮，适合手机上直接看懂。
6. 主色调统一使用：橙色、墨绿色、深灰色，整体低饱和，不要花哨。
7. 尽量少堆大段文字，要“图形说明为主，文字辅助为辅”。
8. 坐标轴、零点、刀具、工件、运动方向、流程箭头必须专业正确。
9. 每张图都要适合放到网站详情页或图库卡片中，清晰、规整、专业。

负面限制：
不要英文，不要人物，不要摄影感，不要复杂透视，不要脏乱背景，不要金属强反光，不要模糊小字，不要夸张 3D 效果，不要宣传海报感，不要卡通幼稚风。

输出要求：
1. 每张图单独输出。
2. 文件名必须严格按我给出的文件名保存。
3. 完成后按文件名顺序返回清单。
```

---

## 保存目录规则

第二批保存到：

```text
F:\AI工作台\cnc_param_quickfinder\assets\images\batch02_operation_basics\
```

第三批保存到：

```text
F:\AI工作台\cnc_param_quickfinder\assets\images\batch03_turning_process\
```

第四批保存到：

```text
F:\AI工作台\cnc_param_quickfinder\assets\images\batch04_milling_tooling\
```

第五批保存到：

```text
F:\AI工作台\cnc_param_quickfinder\assets\images\batch05_alarm_drawing_material\
```

---

## 第二批：操作基础与上机流程 24 张

把下面整段直接发给 Gemini：

```text
请继续生成“数控新手学习助手”项目第二批教学图，共 24 张，全部保存到：
F:\AI工作台\cnc_param_quickfinder\assets\images\batch02_operation_basics\

文件名和内容要求如下：

1. panel-control-overview-001.webp
主题：数控机床操作面板总览
要求：画出常见数控面板分区，包含模式区、手轮区、轴移动区、主轴区、倍率区、急停区，做成新手一眼看懂的功能总览图。

2. panel-jog-handle-001.webp
主题：手动点动与手轮操作图
要求：画出点动、手轮、连续移动三种操作方式的区别，显示手轮档位、轴选择、移动方向。

3. startup-checklist-001.webp
主题：开机前检查清单图
要求：做成可视化检查清单，包含电源、气压、润滑、刀具、夹具、工件、限位、冷却液、安全门。

4. machine-init-flow-001.webp
主题：机床上电到回零流程图
要求：流程必须包括上电、解除急停、初始化、回零、检查状态、试运行前确认。

5. program-structure-basic-001.webp
主题：基础程序结构图
要求：画出程序头、换刀、主轴启动、移动、加工、退刀、回零、程序结束的基本结构。

6. safe-tool-approach-001.webp
主题：安全进刀与退刀路径
要求：画出刀具靠近工件和离开工件的安全路径，对比错误走刀与正确走刀。

7. zero-return-sequence-001.webp
主题：回零顺序图
要求：画出多轴机床回零顺序示意，标清各轴方向和回零参考点。

8. work-offset-setting-001.webp
主题：工件坐标设定图
要求：画出工件坐标设定步骤，包含接触基准面、记录偏置、输入偏置、验证零点。

9. tool-offset-table-001.webp
主题：刀补表怎么看
要求：画出刀补表结构，标注刀号、刀长补偿、刀尖补偿、半径补偿、备注区。

10. turret-tool-number-001.webp
主题：刀位号与程序刀号关系图
要求：画出转塔或刀库编号与程序中 T 指令之间的关系。

11. chuck-clamping-safety-001.webp
主题：卡盘夹紧安全图
要求：画出正确夹持、夹持过浅、伸出过长、夹偏、危险夹持的对比。

12. tailstock-support-001.webp
主题：长轴类尾座支撑图
要求：画出长轴加工时尾座支撑前后差异，强调防振和防弯曲。

13. coolant-nozzle-setup-001.webp
主题：冷却喷嘴对准图
要求：画出喷嘴方向正确和错误的对比，强调刀尖和切削区对准。

14. override-control-001.webp
主题：进给倍率与主轴倍率图
要求：画出进给倍率、快移倍率、主轴倍率的作用与区别。

15. single-block-dry-run-001.webp
主题：单段运行与空运行图
要求：对比单段、空运行、正式自动运行三种模式的使用场景。

16. mdi-vs-auto-mode-001.webp
主题：MDI 与自动模式区别图
要求：用双栏对比，讲清临时指令输入与整段程序自动执行的区别。

17. tool-nose-radius-basic-001.webp
主题：刀尖圆弧半径基础图
要求：画出刀尖圆弧、理论尖角、实际轨迹差异，适合新手理解刀尖圆弧影响。

18. canned-cycle-overview-001.webp
主题：固定循环选择总览图
要求：用总览图说明什么时候用 G81、G83、G84，做成入口型图卡。

19. arc-r-vs-ik-001.webp
主题：R 写法与 I/K 写法对比图
要求：用同一圆弧展示两种编程写法的区别和适用场景。

20. screen-coordinate-reading-001.webp
主题：屏幕坐标值怎么看
要求：画出机床坐标、相对坐标、工件坐标三栏屏幕读数示意。

21. alarm-category-overview-001.webp
主题：报警分类总览图
要求：分成程序报警、伺服报警、主轴报警、限位报警、换刀报警几大类，做成入口图。

22. lubrication-check-001.webp
主题：润滑检查图
要求：画出润滑箱、导轨、丝杠、油位、报警点，适合新手日常点检。

23. chip-control-turning-001.webp
主题：车削排屑与断屑图
要求：对比正常断屑、长屑缠绕、堵屑风险，强调安全。

24. fixture-basics-001.webp
主题：基础装夹认知图
要求：画出工件、夹具、基准面、夹紧方向、受力方向的基础关系图。
```

---

## 第三批：车床工艺与典型零件 24 张

把下面整段直接发给 Gemini：

```text
请继续生成“数控新手学习助手”项目第三批教学图，共 24 张，全部保存到：
F:\AI工作台\cnc_param_quickfinder\assets\images\batch03_turning_process\

文件名和内容要求如下：

1. turning-facing-001.webp
主题：端面车削图
要求：画出端面加工走刀方向、切削区域、尺寸控制重点。

2. turning-od-roughing-001.webp
主题：外圆粗车图
要求：画出粗车余量、走刀层次、切削方向。

3. turning-od-finishing-001.webp
主题：外圆精车图
要求：强调表面质量、余量小、刀尖位置稳定。

4. turning-step-shaft-001.webp
主题：阶梯轴加工图
要求：画出多直径台阶轴的典型加工顺序。

5. turning-chamfer-001.webp
主题：倒角加工图
要求：画出 45 度倒角的刀路和尺寸理解方式。

6. turning-fillet-001.webp
主题：圆角过渡图
要求：画出圆角半径与刀路关系。

7. turning-grooving-001.webp
主题：切槽加工图
要求：画出槽宽、槽深、刀具宽度和分层切槽思路。

8. turning-parting-off-001.webp
主题：切断加工图
要求：画出切断刀位置、冷却、夹持风险和正确操作。

9. turning-thread-od-001.webp
主题：外螺纹车削图
要求：画出螺纹区域、退刀槽、牙型、螺距标注。

10. turning-thread-id-001.webp
主题：内螺纹车削图
要求：画出内螺纹孔、底孔、退刀空间和刀具运动。

11. turning-boring-001.webp
主题：内孔镗削图
要求：画出内孔、镗刀、悬伸量、振动风险。

12. turning-center-drill-001.webp
主题：中心钻定位图
要求：画出中心钻作用、钻孔起点稳定作用。

13. turning-deep-hole-001.webp
主题：深孔加工图
要求：强调排屑、分层进给、冷却和钻杆风险。

14. turning-thin-wall-001.webp
主题：薄壁件车削图
要求：画出变形风险、余量控制、夹持方式。

15. turning-long-shaft-001.webp
主题：细长轴加工图
要求：画出尾座、跟刀架或支撑点，强调防振。

16. turning-allowance-flow-001.webp
主题：粗加工到精加工余量图
要求：分粗车、半精车、精车三个阶段画余量变化。

17. turning-surface-finish-001.webp
主题：表面粗糙度与车削参数图
要求：讲清进给、刀尖圆弧、精车表面关系。

18. turning-burr-control-001.webp
主题：毛刺控制图
要求：画出毛刺出现位置和减少毛刺的工艺思路。

19. turning-tool-wear-001.webp
主题：车刀磨损阶段图
要求：画出正常磨损、崩刃、烧损、异常磨损。

20. flange-part-process-001.webp
主题：法兰类零件加工流程图
要求：从毛坯到成品，画出典型法兰零件的车削流程。

21. step-shaft-case-001.webp
主题：阶梯轴案例图
要求：以案例方式串起端面、外圆、台阶、倒角。

22. thread-part-case-001.webp
主题：螺纹件案例图
要求：用完整零件案例串起外圆、退刀槽、螺纹。

23. retaining-ring-groove-001.webp
主题：卡簧槽加工图
要求：画出卡簧槽位置、尺寸、槽刀关系。

24. lathe-process-overview-001.webp
主题：车床常见工艺总览图
要求：把端面、外圆、切槽、螺纹、切断做成工艺总览入口图。
```

---

## 第四批：铣床工艺、刀具与装夹 24 张

把下面整段直接发给 Gemini：

```text
请继续生成“数控新手学习助手”项目第四批教学图，共 24 张，全部保存到：
F:\AI工作台\cnc_param_quickfinder\assets\images\batch04_milling_tooling\

文件名和内容要求如下：

1. milling-face-milling-001.webp
主题：平面铣削图
要求：画出面铣刀走刀方向、覆盖范围、刀纹方向。

2. milling-side-milling-001.webp
主题：侧面铣削图
要求：画出刀具与侧壁接触关系。

3. milling-slot-001.webp
主题：开槽加工图
要求：画出槽宽、刀径、下刀方式和排屑。

4. milling-pocket-001.webp
主题：型腔加工图
要求：画出粗加工型腔和清角区域。

5. milling-contour-001.webp
主题：外轮廓铣削图
要求：画出轮廓路径、让刀位置、进退刀点。

6. milling-helical-entry-001.webp
主题：螺旋下刀图
要求：画出螺旋下刀路径，强调比直插更稳。

7. milling-stepdown-stepover-001.webp
主题：步深与步距图
要求：解释轴向吃刀和径向吃刀区别。

8. milling-rough-vs-finish-001.webp
主题：粗加工与精加工图
要求：双栏对比粗加工和精加工刀路差异。

9. milling-corner-cleanup-001.webp
主题：清角加工图
要求：画出大刀粗加工后小刀清角区域。

10. milling-drill-ream-tap-001.webp
主题：钻孔铰孔攻丝流程图
要求：画出钻孔、铰孔、攻丝的先后流程。

11. vise-clamping-basic-001.webp
主题：平口钳装夹基础图
要求：画出垫块、平行块、基准边、夹紧方向。

12. fixture-plate-datum-001.webp
主题：治具板与基准设定图
要求：画出定位销、压板、基准边、零点设定。

13. soft-jaw-clamping-001.webp
主题：软爪装夹图
要求：画出软爪包络工件的特点和用途。

14. bt-er-holder-overview-001.webp
主题：BT 刀柄与 ER 夹头总览图
要求：画出主流刀柄系统结构和用途差异。

15. endmill-2f-vs-4f-001.webp
主题：两刃刀与四刃刀对比图
要求：说明排屑能力、适用材料和使用场景。

16. ballnose-vs-flat-endmill-001.webp
主题：球刀与平刀对比图
要求：说明平面、侧壁、曲面加工适用差异。

17. drill-types-overview-001.webp
主题：钻头类型总览图
要求：画出中心钻、麻花钻、阶梯钻等基础区别。

18. tap-types-overview-001.webp
主题：丝锥类型总览图
要求：画出直槽丝锥、螺旋丝锥、挤压丝锥的区别。

19. insert-shape-overview-001.webp
主题：刀片形状识别图
要求：画出常见车刀片形状，适合新手识别。

20. tool-holder-reach-rigidity-001.webp
主题：悬伸量与刚性图
要求：对比短悬伸和长悬伸，强调振动风险。

21. tool-breakage-warning-001.webp
主题：刀具断裂前征兆图
要求：画出崩刃、烧刀、振纹、异常声音等视觉表达。

22. burr-in-milling-001.webp
主题：铣削毛刺与去毛刺图
要求：画出毛刺出现位置和改善思路。

23. milling-process-overview-001.webp
主题：铣床常见工艺总览图
要求：把平面、槽、型腔、轮廓、钻孔做成入口图卡。

24. tool-selection-beginner-001.webp
主题：新手刀具怎么选图
要求：用入口图形式说明平刀、球刀、钻头、丝锥、面铣刀的基本选择逻辑。
```

---

## 第五批：报警、图纸、量具、材料、案例 24 张

把下面整段直接发给 Gemini：

```text
请继续生成“数控新手学习助手”项目第五批教学图，共 24 张，全部保存到：
F:\AI工作台\cnc_param_quickfinder\assets\images\batch05_alarm_drawing_material\

文件名和内容要求如下：

1. atc-alarm-flow-001.webp
主题：换刀报警排查图
要求：画出刀库、机械手、刀臂、联锁和排查流程。

2. emergency-stop-chain-001.webp
主题：急停链路图
要求：画出急停按钮、安全门、伺服、主轴、系统之间的链路关系。

3. safety-door-interlock-001.webp
主题：安全门联锁图
要求：说明门没关好时为什么程序不能继续。

4. power-sequence-warning-001.webp
主题：错误上电顺序风险图
要求：做成警示图，说明错误操作可能带来的问题。

5. machine-warmup-flow-001.webp
主题：机床预热流程图
要求：画出冬天或长期停机后预热思路。

6. daily-maintenance-001.webp
主题：每日点检图
要求：画出每天要看的油、气、液、屑、门、夹具、刀具。

7. weekly-maintenance-001.webp
主题：每周保养图
要求：画出过滤、清洁、紧固、润滑、散热检查。

8. ballscrew-guideway-maintenance-001.webp
主题：丝杠导轨保养图
要求：画出丝杠、导轨、润滑点、灰尘积屑影响。

9. coolant-system-overview-001.webp
主题：冷却系统总览图
要求：画出液箱、泵、喷嘴、过滤、回流路径。

10. cabinet-fan-filter-001.webp
主题：电柜风扇与滤网清理图
要求：强调散热不良对系统的影响。

11. grounding-shielding-001.webp
主题：接地与屏蔽基础图
要求：适合新手理解信号线、动力线、屏蔽层和接地关系。

12. battery-loss-parameter-risk-001.webp
主题：电池失效与参数丢失风险图
要求：警示图风格，说明掉电后可能出现的问题。

13. vernier-caliper-detail-001.webp
主题：游标卡尺详细读数图
要求：单独放大游标卡尺结构与读数步骤。

14. micrometer-detail-001.webp
主题：外径千分尺详细读数图
要求：单独画微分筒、套筒刻线、读数示意。

15. dial-indicator-detail-001.webp
主题：百分表详细读数图
要求：单独画大表盘、小表盘、读数方向和测头。

16. bore-gauge-detail-001.webp
主题：内径量表详细使用图
要求：画出找极值、标准环规校正、孔内测量姿态。

17. drawing-fit-h7-h6-001.webp
主题：H7/h6 配合图
要求：画出孔轴公差带位置关系。

18. drawing-gdt-basic-001.webp
主题：形位公差基础图
要求：画出平面度、垂直度、位置度三个最常见符号和示意。

19. drawing-thread-pitch-tapdrill-001.webp
主题：螺距与底孔对照图
要求：适合新手快速判断攻丝底孔尺寸逻辑。

20. material-stainless-cutting-001.webp
主题：不锈钢加工特点图
要求：画出粘刀、发热、毛刺、排屑等特点。

21. material-aluminum-cutting-001.webp
主题：铝件加工特点图
要求：画出高速、轻切削、积屑瘤风险和表面质量特点。

22. material-steel-castiron-001.webp
主题：钢件与铸铁加工对比图
要求：双栏对比钢件和铸铁的切削特性。

23. first-piece-inspection-001.webp
主题：首件检验流程图
要求：画出首件加工后测量、记录、修正、复检的流程。

24. beginner-mistakes-overview-001.webp
主题：新手最常见错误总览图
要求：做成总览入口图，包含坐标系看错、对刀错、单位错、刀补错、报警乱处理等。
```

---

## 使用建议

执行顺序建议：

1. 先画第二批
2. 第二批验收没问题，再画第三批
3. 然后第四批
4. 最后第五批

原因：
- 第二批和第一批衔接最紧，最容易直接接网页
- 第三批、第四批会快速把工艺内容做厚
- 第五批更适合补充为知识库和速查图库

---

## Gemini 回复格式要求

每一批发给 Gemini 后，建议你追加一句：

```text
这批图片全部画完后，请按下面格式回复我：
1. 文件名
2. 图片主题
3. 是否已经按指定目录和指定文件名保存
4. 哪几张最适合优先接入网页
```

---

## 后续扩图方向

这 96 张画完后，下一轮可以继续扩：
- 车床典型零件案例系列
- 铣床型腔案例系列
- 刀片型号识别系列
- 参数高风险分组系列
- 报警细分类系列
- 材料切削参数系列
- 工装夹具系列
- 安全规范系列

