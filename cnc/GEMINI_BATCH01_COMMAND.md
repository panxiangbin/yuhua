# Gemini 第一批出图完整指令

把下面整段话直接发给 Gemini：

```text
你现在是“数控新手学习助手”项目的教学配图设计师。
请按统一风格，连续完成第一批 24 张数控教学插图。

一、统一视觉要求
1. 所有图片统一为白底或浅米色背景。
2. 风格为工业教学信息图、工程教材插图风，不要写实摄影风，不要赛博风，不要卡通幼稚风。
3. 所有文字必须为中文，标题清楚，标注简洁，重点词高亮。
4. 所有图片都要适合手机竖屏阅读，结构清楚，主体明显。
5. 线条必须干净，箭头必须明确，坐标轴、零点、刀具、工件、运动轨迹必须画清楚。
6. 主色调统一使用：橙色、墨绿色、深灰色，整体低饱和，不要花哨。
7. 不要复杂车间背景，不要人物，不要英文大段说明，不要密密麻麻小字，不要强烈3D海报感。
8. 输出清晰，适合网站详情页、学习海报、手机查看。

二、输出方式要求
1. 一次先生成 24 张，不要只生成 1 张。
2. 每张图都单独输出。
3. 每张图完成后，给出对应的文件名。
4. 文件名必须严格按我下面给你的命名规则命名。
5. 图片比例优先使用竖版，建议 3:4 或 4:5。
6. 如果某一张图内容较多，允许做成“上标题 + 中间主图 + 下方重点提示”的版式。

三、保存目录要求
这批图片画完以后，请我按下面目录保存：
F:\AI工作台\cnc_param_quickfinder\assets\images\batch01_core\

四、命名规则要求
全部使用英文小写 + 连字符 + 三位流水号，格式统一为：
主题名-序号.webp

必须严格使用以下文件名：
1. beginner-coordinate-001.webp
2. beginner-machine-zero-vs-work-zero-001.webp
3. beginner-g90-g91-001.webp
4. beginner-touchoff-flow-001.webp
5. gcode-g00-g01-001.webp
6. gcode-g02-g03-001.webp
7. gcode-g17-g18-g19-001.webp
8. gcode-g54-g59-001.webp
9. gcode-g41-g42-001.webp
10. gcode-g43-g49-001.webp
11. cycle-g81-001.webp
12. cycle-g83-001.webp
13. cycle-g84-001.webp
14. cycle-g98-g99-001.webp
15. feed-g94-g95-001.webp
16. unit-g20-g21-001.webp
17. home-safe-path-001.webp
18. fault-home-fail-001.webp
19. alarm-servo-001.webp
20. alarm-spindle-001.webp
21. alarm-limit-overtravel-001.webp
22. parameter-backup-001.webp
23. measure-reading-set-001.webp
24. drawing-tolerance-roughness-001.webp

五、每张图的具体内容要求

第1张：beginner-coordinate-001.webp
主题：机床坐标系与工件坐标系
要求：必须同时画出机床原点、工件零点、X/Z 轴正方向、刀具位置、工件位置、回零方向、对刀位置。底部加一句重点提示：“机床原点不等于工件零点”。

第2张：beginner-machine-zero-vs-work-zero-001.webp
主题：机床零点 和 工件零点 的区别
要求：左右对比版式，左边是机床零点，右边是工件零点，中间说明两者关系。必须画出机床、工件、刀具、零点位置。

第3张：beginner-g90-g91-001.webp
主题：G90 绝对值 与 G91 增量值 对比
要求：左右对比，同一个轮廓，两种不同移动逻辑。必须标出起点、终点、移动尺寸、箭头方向。

第4张：beginner-touchoff-flow-001.webp
主题：对刀流程图
要求：5 步流程，包含建立工件零点、刀尖接触基准面、记录刀补值、输入刀补、试切验证尺寸。

第5张：gcode-g00-g01-001.webp
主题：G00 快速定位 与 G01 进给切削
要求：左右对比。G00 用明显的快速移动轨迹，G01 用切削轨迹表示。标注“安全位置”“切削路径”。

第6张：gcode-g02-g03-001.webp
主题：G02 顺时针 / G03 逆时针
要求：左右双栏。每栏都要有起点、终点、圆心、圆弧箭头、R 或 I/K 示意。

第7张：gcode-g17-g18-g19-001.webp
主题：G17 / G18 / G19 三个平面的区别
要求：分三个区域，分别画 XY、XZ、YZ 平面。必须画出坐标轴方向和圆弧运动示意。

第8张：gcode-g54-g59-001.webp
主题：G54-G59 多个工件零点怎么切换
要求：同一机床上多个工位或多个工件，分别标出 G54-G59，不同零点用不同编号或色块区分。

第9张：gcode-g41-g42-001.webp
主题：G41 左刀补 与 G42 右刀补
要求：必须同时画出工件轮廓线、程序轨迹线、刀心真实轨迹线，并区分补偿方向。

第10张：gcode-g43-g49-001.webp
主题：G43 刀长补偿 / G49 取消补偿
要求：必须画出主轴、刀具、工件表面、基准面、Z 向高度关系，重点表现刀长变化。

第11张：cycle-g81-001.webp
主题：G81 普通钻孔
要求：分步骤画出到孔位、到 R 平面、进给钻孔、退回。

第12张：cycle-g83-001.webp
主题：G83 啄钻
要求：重点表现分段下刀、退刀排屑、继续下刀、最终孔深。

第13张：cycle-g84-001.webp
主题：G84 攻丝循环
要求：重点表现丝锥进入、同步进给、到底后反转退出。

第14张：cycle-g98-g99-001.webp
主题：G98 与 G99 的区别
要求：左右对比，左边返回初始点，右边返回 R 平面。必须画清返回路线。

第15张：feed-g94-g95-001.webp
主题：G94 每分钟进给 / G95 每转进给
要求：用图说明 mm/min 与 mm/rev 的区别，并体现主轴转速变化带来的影响。

第16张：unit-g20-g21-001.webp
主题：G20 英制 / G21 公制
要求：做成警示对比图，强调单位切换错误会导致尺寸异常。

第17张：home-safe-path-001.webp
主题：回零前为什么要先抬刀再退回
要求：画出加工位置、安全高度、中间点、参考点、回零方向。

第18张：fault-home-fail-001.webp
主题：回零失败排查流程图
要求：流程包括确认报警、观察轴动作、检查限位、检查参考点信号、检查参数、手动安全退回。

第19张：alarm-servo-001.webp
主题：伺服报警排查
要求：流程包括确认轴号、观察轴是否动作、查看驱动器报警灯、检查电源与编码器、检查机械卡滞。

第20张：alarm-spindle-001.webp
主题：主轴报警排查
要求：流程包括确认 M03/M04/M05 指令、确认转速设定、查看驱动状态、检查过载过热、检查机械卡滞。

第21张：alarm-limit-overtravel-001.webp
主题：限位 / 超程排查
要求：必须画出 X/Y/Z 正负方向、限位开关位置、超程状态、正确退回方向。

第22张：parameter-backup-001.webp
主题：参数备份与恢复流程
要求：流程必须有备份前确认、记录原值、导出备份、恢复前核对、恢复后验证，并明确“备份”和“初始化”不是一回事。

第23张：measure-reading-set-001.webp
主题：卡尺、千分尺、百分表怎么读数
要求：四宫格布局：卡尺、外径千分尺、百分表、内径表。每格都要有结构示意和读数位置示意。

第24张：drawing-tolerance-roughness-001.webp
主题：公差配合 与 粗糙度符号
要求：分三个区域：尺寸公差带、孔轴配合、表面粗糙度符号。必须标出“间隙配合”“过盈配合”“过渡配合”“Ra 符号”。

六、完成后的回复要求
24 张图全部完成后，请按下面格式给我一个清单：
1. 文件名
2. 图片主题
3. 这张图最适合放在网站的哪个栏目

七、如果一次生成 24 张太多
那就按下面 4 组分批生成，但风格必须完全统一：

第 1 组：
1. beginner-coordinate-001.webp
2. beginner-machine-zero-vs-work-zero-001.webp
3. beginner-g90-g91-001.webp
4. beginner-touchoff-flow-001.webp
5. gcode-g00-g01-001.webp
6. gcode-g02-g03-001.webp

第 2 组：
7. gcode-g17-g18-g19-001.webp
8. gcode-g54-g59-001.webp
9. gcode-g41-g42-001.webp
10. gcode-g43-g49-001.webp
11. cycle-g81-001.webp
12. cycle-g83-001.webp

第 3 组：
13. cycle-g84-001.webp
14. cycle-g98-g99-001.webp
15. feed-g94-g95-001.webp
16. unit-g20-g21-001.webp
17. home-safe-path-001.webp
18. fault-home-fail-001.webp

第 4 组：
19. alarm-servo-001.webp
20. alarm-spindle-001.webp
21. alarm-limit-overtravel-001.webp
22. parameter-backup-001.webp
23. measure-reading-set-001.webp
24. drawing-tolerance-roughness-001.webp

先从第 1 组开始。
```
