# 数控知识点关联关系映射

> 生成日期: 2026-07-06
> 关系组数: **281 组**
> 覆盖唯一知识点: **102 个**
> 关系类型: 10 种

---

## 关系类型统计

| 关系类型 | 组数 | 说明 |
|---------|------|------|
| `same_topic` | 48 | 同一主题的知识对应 |
| `case_study` | 46 | 案例关联 |
| `prerequisite` | 36 | 前置依赖 |
| `next_step` | 32 | 下一步建议学 |
| `param_related` | 30 | 参数关联 |
| `common_confusion` | 25 | 容易混淆 |
| `tool_related` | 21 | 刀具相关 |
| `code_related` | 18 | 代码关联 |
| `alarm_related` | 13 | 报警相关 |
| `beginner_path` | 12 | 新手路径 |

## 按入门基础类

| 源条目 | 关联条目 | 类型 | 理由 | 权重 |
|--------|---------|------|------|------|
| learn-coordinate-system | learn-absolute-incremental | next_step | 坐标系概念懂了之后，下一步最应该理解绝对值和增量的区别 | 10 |
| learn-coordinate-system | learn-g54-g59 | next_step | 理解坐标系后接着学工件坐标系设定 | 8 |
| learn-coordinate-system | g00-g01-motion | next_step | 坐标系是理解所有运动指令的基础 | 9 |
| learn-coordinate-system | kb-g16 | next_step | 坐标系理解后可以学极坐标编程G16 | 6 |
| learn-coordinate-system | machine-home-return | beginner_path | 坐标系和回零操作是数控入门两大基础 | 7 |
| learn-absolute-incremental | learn-program-structure | next_step | 理解绝对/增量后可以看程序结构怎么写 | 8 |
| learn-absolute-incremental | g94-g95-feed | prerequisite | 进给模式(G94/G95)依赖绝对/增量概念理解 | 6 |
| learn-absolute-incremental | learn-coordinate-system | prerequisite | 绝对增量是坐标系的延伸概念 | 7 |
| learn-g54-g59 | kb-g52-g53 | common_confusion | G54-G59和G52/G53的局部与全局坐标系常被混淆 | 9 |
| learn-g54-g59 | machine-tool-setting | prerequisite | 设定工件坐标系前需要先理解对刀操作 | 8 |
| learn-g54-g59 | learn-coordinate-system | prerequisite | 坐标系基础是理解工件坐标系的前提 | 8 |
| learn-g54-g59 | machine-home-return | beginner_path | 工件坐标系和回零操作是数控加工的必备基础 | 7 |
| machine-home-return | machine-tool-setting | next_step | 回零操作完成后下一步是对刀设定 | 7 |
| machine-home-return | kb-home-fail | prerequisite | 理解正常回零才能排查回零故障 | 9 |
| machine-home-return | learn-coordinate-system | beginner_path | 回零和坐标系是数控入门必须掌握的两个概念 | 7 |
| machine-home-return | fault-home-refer | case_study | 回零失败是常见故障，回零知识直接影响排查 | 8 |
| machine-tool-setting | kb-tool-setting | same_topic | 对刀操作的理论与实操对应 | 10 |
| machine-tool-setting | learn-g54-g59 | next_step | 对刀完成后需要用G54-G59设定坐标系 | 9 |
| machine-tool-setting | fault-limit-switch | case_study | 对刀操作不当常触发限位开关报警 | 5 |
| learn-program-structure | kb-program-structure | same_topic | 程序结构的理论与编程实践对应 | 10 |
| learn-program-structure | kb-program-opt | next_step | 掌握程序结构后可以学程序优化技巧 | 7 |
| learn-program-structure | machine-panel-english | beginner_path | 了解程序结构同时需要认识面板上的英文术语 | 5 |
| machine-panel-english | learn-program-structure | beginner_path | 面板英文认识后有助于理解程序结构显示 | 5 |
| machine-panel-english | alarm-servo | beginner_path | 面板报警英文是看懂伺服报警的前提 | 6 |

## 按G代码类

| 源条目 | 关联条目 | 类型 | 理由 | 权重 |
|--------|---------|------|------|------|
| learn-g17-g18-g19 | g02-g03-arc | prerequisite | 圆弧插补必须先在正确的平面上执行 | 10 |
| learn-g17-g18-g19 | kb-g68-g69 | prerequisite | 坐标旋转G68需要先理解平面选择 | 7 |
| learn-g17-g18-g19 | case-axis | case_study | 多轴加工中平面选择直接影响加工路径 | 6 |
| learn-g41-g42 | g40-cancel-comp | common_confusion | 开刀补和关刀补经常搞混，需要一起看 | 9 |
| learn-g41-g42 | g00-g01-motion | prerequisite | 刀补建立必须在G00/G01直线运动中进行 | 9 |
| learn-g41-g42 | case-thin-wall | case_study | 薄壁件加工中刀补应用非常关键 | 7 |
| learn-g41-g42 | kb-tool-holder | tool_related | 刀补参数与刀柄类型及装夹方式相关 | 5 |
| learn-g41-g42 | kb-drawing-reading | prerequisite | 看懂图纸上的尺寸公差才能正确使用刀补 | 6 |
| learn-g43-g44-g49 | learn-g41-g42 | same_topic | 长度补偿和半径补偿都属于刀具补偿大类 | 8 |
| learn-g43-g44-g49 | case-axis | case_study | 多轴加工中长度补偿和刀尖跟随必须配合使用 | 7 |
| g00-g01-motion | g02-g03-arc | next_step | 掌握G00/G01直线运动后可以接着学圆弧插补 | 9 |
| g00-g01-motion | g04-dwell | code_related | G04暂停指令常用于直线运动后的动作衔接 | 6 |
| g00-g01-motion | g28-g29-reference | code_related | 回参考点G28常与G00配合使用 | 7 |
| g00-g01-motion | kb-program-opt | code_related | G00/G01的路径规划是程序优化的重要环节 | 6 |
| g00-g01-motion | learn-program-structure | beginner_path | G00/G01是最基础的运动指令，学编程从这里开始 | 8 |
| g02-g03-arc | learn-g17-g18-g19 | prerequisite | 圆弧插补前必须确认当前加工平面 | 9 |
| g02-g03-arc | case-flange | case_study | 法兰类零件大量使用圆弧插补指令 | 7 |
| g02-g03-arc | case-axis | case_study | 曲面轴类加工中圆弧插补精度直接影响质量 | 6 |
| g02-g03-arc | case-thread-part | case_study | 螺纹件中的圆弧过渡常用G02/G03 | 5 |
| g04-dwell | kb-common-errors | code_related | G04使用不当是新手常见编程问题 | 5 |
| g04-dwell | g00-g01-motion | code_related | G04暂停常用于直线运动后的动作衔接 | 6 |
| g20-g21-unit | learn-coordinate-system | prerequisite | 单位设定(G20/G21)与坐标系理解密切相关 | 7 |
| g20-g21-unit | material-stainless | param_related | 英制/公制选择影响不锈钢切削参数 | 4 |
| g20-g21-unit | kb-common-errors | case_study | 单位混淆是常见编程错误之一 | 7 |
| g28-g29-reference | machine-home-return | param_related | G28回参考点与手动回零使用相同的参考点位置 | 8 |
| g28-g29-reference | kb-home-fail | alarm_related | G28执行失败是常见回零故障现象 | 7 |
| g40-cancel-comp | learn-g41-g42 | common_confusion | 开刀补和关刀补经常搞混，需要一起看 | 9 |
| g40-cancel-comp | kb-common-errors | case_study | 忘记取消刀补导致过切是常见事故原因 | 8 |
| g98-g99-return | machine-home-return | param_related | G98/G99返回平面与回零操作的平面设定有关 | 6 |
| g98-g99-return | g80-cancel-cycle | code_related | 固定循环结束后的返回方式G98/G99常与G80配合 | 7 |
| g80-cancel-cycle | learn-g81-g83 | common_confusion | G80取消固定循环与启动固定循环的配对使用 | 9 |
| g80-cancel-cycle | kb-g65-g66-g67 | code_related | G80取消模态调用与G66/G67的宏程序调用相关 | 5 |

## 按固定循环

| 源条目 | 关联条目 | 类型 | 理由 | 权重 |
|--------|---------|------|------|------|
| learn-g71-g72-g73 | learn-g81-g83 | same_topic | 粗车循环和钻孔循环都属于固定循环大类 | 7 |
| learn-g71-g72-g73 | case-gear | case_study | 齿轮毛坯粗加工常用G71粗车循环 | 7 |
| learn-g71-g72-g73 | case-flange | case_study | 法兰类零件粗加工常用G72端面粗车循环 | 7 |
| learn-g81-g83 | g80-cancel-cycle | common_confusion | 钻孔循环和取消钻孔循环的配对使用 | 8 |
| learn-g81-g83 | learn-g84 | next_step | 钻孔循环学会后可以学攻丝循环G84 | 9 |
| learn-g81-g83 | case-thin-wall | case_study | 薄壁件钻孔需要特别注意G83啄钻参数 | 6 |
| learn-g84 | fanuc-rigid-tap | param_related | 刚性攻丝G84需要设定相关FANUC参数 | 9 |
| learn-g84 | learn-g81-g83 | prerequisite | 攻丝循环G84建立在钻孔循环理解基础上 | 8 |
| learn-g84 | kb-cutting-params | param_related | 攻丝循环的转速和进给匹配需要精确切削参数 | 7 |
| g94-g95-feed | learn-absolute-incremental | prerequisite | 进给模式选择依赖于对绝对/增量坐标的理解 | 6 |
| g94-g95-feed | kb-g96-g97 | param_related | G94/G95进给模式与G96/G97转速模式配合使用 | 8 |
| g94-g95-feed | kb-cutting-params | param_related | 进给率设定是切削三要素之一 | 7 |

## 按车床/螺纹

| 源条目 | 关联条目 | 类型 | 理由 | 权重 |
|--------|---------|------|------|------|
| kb-g32-g33 | kb-g76 | next_step | 单刀螺纹G32/G33学会后可以学复合螺纹循环G76 | 9 |
| kb-g32-g33 | case-thread-part | case_study | 螺纹加工常见案例分析，G32/G33是基础 | 8 |
| kb-g32-g33 | quick-thread | same_topic | 螺纹加工快速图卡和G32/G33知识点对应 | 7 |
| kb-g76 | kb-g32-g33 | prerequisite | G76复合螺纹循环的底层逻辑基于G32/G33 | 8 |
| kb-g76 | kb-g92 | common_confusion | G76和G92都是螺纹加工循环，但用法不同 | 8 |
| kb-g76 | case-thread-part | case_study | 螺纹类零件案例直接应用G76编程 | 8 |
| kb-g92 | kb-g76 | common_confusion | G92和G76都是螺纹加工指令，功能容易混淆 | 8 |
| kb-g92 | kb-g70 | next_step | G92螺纹切削之后可以学精车循环G70 | 5 |
| kb-g70 | kb-g71-g72-g73 | next_step | 精车循环G70与粗车循环G71/G72/G73配合使用 | 9 |
| kb-g70 | case-flange | case_study | 法兰精加工常用G70精车循环 | 7 |
| kb-g71-g72-g73 | kb-g70 | prerequisite | 粗车循环后一般接精车循环G70 | 9 |
| kb-g71-g72-g73 | kb-g74-g75 | code_related | 切槽循环G74/G75和粗车循环常在同零件中使用 | 6 |
| kb-g71-g72-g73 | case-gear | case_study | 齿轮粗加工常用G71/G72/G73粗车循环 | 7 |
| kb-g74-g75 | kb-g71-g72-g73 | code_related | 切槽G74/G75与粗车循环G71常用于同一轴类零件 | 6 |

## 按其他G代码

| 源条目 | 关联条目 | 类型 | 理由 | 权重 |
|--------|---------|------|------|------|
| kb-g10 | fanuc-param-backup | param_related | G10可编程参数输入与参数备份操作相关 | 7 |
| kb-g16 | learn-coordinate-system | prerequisite | 极坐标编程G16依赖坐标系的基本概念 | 8 |
| kb-g50 | machine-home-return | param_related | G50坐标系设定与回参考点位置有关 | 6 |
| kb-g50 | kb-g96-g97 | param_related | G50最高转速限制与G96恒定线速度配合使用 | 8 |
| kb-g51 | kb-g50 | common_confusion | G50和G51容易混淆，一个是设定一个是缩放 | 7 |
| kb-g52-g53 | learn-g54-g59 | common_confusion | G52局部坐标系和G54-G59工件坐标系容易混淆 | 9 |
| kb-g52-g53 | machine-home-return | prerequisite | G53机械坐标系建立在理解回零基础上 | 7 |
| kb-g61-g64 | g00-g01-motion | code_related | G61/G64准确停止与G00/G01运动路径精度相关 | 7 |
| kb-g61-g64 | kb-process-rules | code_related | 加工工艺规则中需要根据精度要求选择G61或G64 | 6 |
| kb-g65-g66-g67 | learn-program-structure | code_related | 宏程序调用G65/G66与程序结构组织密切相关 | 7 |
| kb-g65-g66-g67 | g80-cancel-cycle | code_related | G65宏程序调用与G80取消模态调用都是子程序控制 | 5 |
| kb-g68-g69 | learn-g17-g18-g19 | prerequisite | 坐标旋转G68需要先理解平面选择 | 8 |
| kb-g68-g69 | case-axis | case_study | 多轴箱体加工中G68坐标旋转应用广泛 | 7 |
| kb-g96-g97 | g94-g95-feed | param_related | G96/G97转速模式和G94/G95进给模式需要配合设定 | 9 |
| kb-g96-g97 | quick-g96 | same_topic | G96/G97的快速速查图卡 | 8 |
| kb-g96-g97 | kb-g50 | param_related | G96恒定线速度模式下G50限制最高转速 | 8 |
| kb-g96-g97 | kb-fanuc-params | param_related | G96/G97的最大转速限制需要设置FANUC参数 | 6 |

## 按M代码

| 源条目 | 关联条目 | 类型 | 理由 | 权重 |
|--------|---------|------|------|------|
| kb-m03-m05 | alarm-spindle | alarm_related | M03/M05主轴启停异常时会触发主轴报警 | 8 |
| kb-m03-m05 | kb-m08-m09 | code_related | 主轴旋转M03和冷却液M08常在程序中一起出现 | 8 |
| kb-m03-m05 | tool-life | tool_related | 主轴转速直接影响刀具寿命 | 6 |
| kb-m06 | alarm-atc | alarm_related | M06换刀时常发生换刀臂报警 | 9 |
| kb-m06 | kb-tool-setting | tool_related | M06换刀指令需要对刀数据配合才能正确执行 | 8 |
| kb-m06 | kb-m03-m05 | next_step | 换刀后一般紧接着启动主轴M03 | 8 |
| kb-m08-m09 | kb-m03-m05 | code_related | 冷却液开关与主轴启停常在同一程序段中 | 7 |
| kb-m08-m09 | fault-limit-switch | alarm_related | 冷却液管路异常可能导致限位开关故障 | 4 |
| kb-m19 | kb-home-fail | alarm_related | 主轴定向M19异常常与回零故障有关 | 6 |
| kb-m19 | alarm-spindle | alarm_related | M19主轴定向失败会触发主轴报警 | 7 |
| kb-m30-m02 | kb-m98-m99 | common_confusion | M02/M30程序结束和M98/M99子程序返回容易混淆 | 7 |
| kb-m30-m02 | kb-program-structure | code_related | 程序结束指令M02/M30是程序结构的必要组成部分 | 8 |
| kb-m98-m99 | learn-program-structure | prerequisite | 子程序调用M98需要理解程序结构 | 8 |
| kb-m98-m99 | kb-m30-m02 | common_confusion | 子程序返回M99和主程序结束M30容易混淆 | 7 |

## 按报警维护

| 源条目 | 关联条目 | 类型 | 理由 | 权重 |
|--------|---------|------|------|------|
| alarm-servo | kb-servo-fault | same_topic | 伺服报警与伺服故障排查是同一知识领域 | 10 |
| alarm-servo | fanuc-param-backup | param_related | 伺服报警的排查常涉及FANUC参数调整 | 8 |
| alarm-servo | kb-fanuc-alarm | next_step | 理解伺服报警后可以深入学习FANUC报警大全 | 7 |
| alarm-servo | quick-fanuc-alarm | same_topic | 伺服报警速查图卡便于现场排查 | 7 |
| alarm-servo | fault-limit-switch | common_confusion | 伺服报警和限位开关故障有时症状相似 | 6 |
| alarm-spindle | kb-spindle-fault | same_topic | 主轴报警与主轴故障排查是同一知识领域 | 10 |
| alarm-spindle | kb-m03-m05 | alarm_related | 主轴启停M03/M05异常是主轴报警的常见原因 | 8 |
| alarm-spindle | kb-g96-g97 | alarm_related | 恒线速度G96模式下主轴转速异常触发报警 | 6 |
| alarm-spindle | quick-fanuc-alarm | same_topic | 主轴报警速查图卡便于快速诊断 | 7 |
| alarm-atc | kb-atc-fault | same_topic | 换刀报警与换刀故障排查是同一知识领域 | 10 |
| alarm-atc | kb-m06 | alarm_related | M06换刀指令执行失败触发换刀报警 | 9 |
| alarm-atc | kb-common-errors | case_study | 换刀报警的排查是常见故障案例 | 6 |
| kb-home-fail | machine-home-return | prerequisite | 排查回零故障必须先理解正常回零流程 | 9 |
| kb-home-fail | fault-home-refer | same_topic | 回零失败和参考点故障是同一问题 | 9 |
| kb-home-fail | alarm-servo | alarm_related | 回零异常常伴随伺服报警 | 7 |
| kb-home-fail | g28-g29-reference | alarm_related | G28回参考点失败是回零故障的表现之一 | 7 |
| fault-limit-switch | fault-home-refer | common_confusion | 限位开关故障和回参考点故障症状相似容易误判 | 8 |
| fault-limit-switch | machine-tool-setting | case_study | 手动操作时误触限位开关是常见新手事故 | 6 |
| fault-limit-switch | quick-fanuc-alarm | alarm_related | 限位报警可以在FANUC报警速查中快速定位 | 6 |
| fault-home-refer | kb-home-fail | same_topic | 参考点故障和回零失败是同一类问题 | 9 |
| fault-home-refer | machine-home-return | prerequisite | 排查参考点故障需要先理解回零原理 | 8 |
| fault-home-refer | fanuc-param-backup | param_related | 参考点位置参数丢失是常见故障原因 | 7 |
| kb-servo-fault | alarm-servo | same_topic | 伺服故障排查与伺服报警知识对应 | 10 |
| kb-servo-fault | fanuc-param-backup | next_step | 伺服故障排查后常需要调整参数和备份 | 7 |
| kb-servo-fault | kb-fanuc-alarm | next_step | 伺服故障是FANUC报警的重要子集 | 6 |
| kb-spindle-fault | alarm-spindle | same_topic | 主轴故障排查与主轴报警知识对应 | 10 |
| kb-spindle-fault | kb-fanuc-alarm | next_step | 主轴故障是FANUC报警的重要子集 | 6 |
| kb-atc-fault | alarm-atc | same_topic | 换刀故障排查与换刀报警知识对应 | 10 |
| kb-atc-fault | kb-m06 | tool_related | 换刀故障与M06换刀指令执行密切相关 | 8 |
| kb-fanuc-alarm | quick-fanuc-alarm | same_topic | FANUC报警大全和速查图卡内容对应 | 9 |
| kb-fanuc-alarm | alarm-servo | prerequisite | 报警大全涵盖伺服报警的详细解析 | 7 |
| kb-fanuc-alarm | alarm-spindle | prerequisite | 报警大全涵盖主轴报警的详细解析 | 7 |
| kb-fanuc-alarm | alarm-atc | prerequisite | 报警大全涵盖换刀报警的详细解析 | 7 |
| kb-fanuc-alarm | kb-siemens-840d | common_confusion | FANUC和西门子840D的报警代码体系完全不同 | 5 |

## 按FANUC参数

| 源条目 | 关联条目 | 类型 | 理由 | 权重 |
|--------|---------|------|------|------|
| fanuc-param-backup | kb-fanuc-backup | same_topic | FANUC参数备份和还原是同一操作的两个方面 | 10 |
| fanuc-param-backup | quick-fanuc-param | same_topic | 参数备份操作可以配合参数速查图卡使用 | 7 |
| fanuc-param-backup | alarm-servo | param_related | 参数误改是伺服报警的常见原因，备份可恢复 | 7 |
| fanuc-param-backup | kb-fanuc-params | next_step | 参数备份后可以深入学习各参数的详细含义 | 8 |
| fanuc-rigid-tap | learn-g84 | param_related | 刚性攻丝G84需要设定对应的FANUC参数 | 9 |
| fanuc-rigid-tap | kb-cutting-params | param_related | 刚性攻丝的转速和进给匹配需要精确的切削参数 | 7 |
| kb-fanuc-params | fanuc-param-backup | prerequisite | 了解参数后才能正确进行参数备份操作 | 8 |
| kb-fanuc-params | quick-fanuc-param | common_confusion | 详细参数文档和速查图卡的学习深度不同 | 6 |
| kb-fanuc-params | fanuc-rigid-tap | param_related | FANUC参数中包含刚性攻丝相关设定 | 7 |
| quick-fanuc-param | fanuc-param-backup | beginner_path | 参数速查适合入门，备份操作是下一步实践 | 7 |
| quick-fanuc-param | kb-fanuc-params | beginner_path | 速查图卡入手后再深入详细参数文档 | 7 |

## 按刀具工艺

| 源条目 | 关联条目 | 类型 | 理由 | 权重 |
|--------|---------|------|------|------|
| tool-life | kb-tool-life | same_topic | 刀具寿命的概念理论与延长技巧对应 | 10 |
| tool-life | kb-tool-setting | next_step | 理解刀具寿命后可以学习刀具设定方法 | 7 |
| tool-life | kb-cutting-params | param_related | 切削参数直接影响刀具寿命 | 9 |
| tool-life | kb-tool-coating | next_step | 刀具涂层可以延长刀具寿命 | 7 |
| tool-life | material-high-temp | tool_related | 高温合金加工中刀具寿命管理尤为重要 | 7 |
| tool-coating | kb-tool-coating | same_topic | 刀具涂层的概念与具体技术对应 | 10 |
| tool-coating | tool-life | prerequisite | 涂层技术是延长刀具寿命的重要手段 | 8 |
| tool-coating | material-high-temp | tool_related | 高温合金加工必须选用合适的刀具涂层 | 8 |
| tool-coating | material-stainless | tool_related | 不锈钢加工对刀具涂层有特殊要求 | 7 |
| kb-tool-setting | machine-tool-setting | same_topic | 刀具设定的理论和实际对刀操作对应 | 10 |
| kb-tool-setting | tool-life | same_topic | 刀具设定和刀具寿命是刀具管理的两个方面 | 6 |
| kb-tool-setting | kb-tool-holder | next_step | 刀具设定后需要了解刀柄选择 | 6 |
| kb-tool-setting | kb-m06 | tool_related | M06换刀需要配合刀具设定数据 | 8 |
| kb-tool-life | tool-life | same_topic | 刀具寿命延长技巧对应刀具寿命基本概念 | 10 |
| kb-tool-life | kb-cutting-params | param_related | 合理切削参数是延长刀具寿命的核心 | 8 |
| kb-tool-life | kb-tool-material | next_step | 刀具材料选择直接影响刀具寿命 | 6 |
| kb-tool-life | kb-tool-coating | next_step | 延长寿命的技巧中包含选用合适涂层 | 7 |
| kb-cutting-params | material-stainless | case_study | 不锈钢加工需要特定的切削参数设定 | 8 |
| kb-cutting-params | material-aluminum | case_study | 铝合金加工需要特定的切削参数设定 | 8 |
| kb-cutting-params | tool-life | param_related | 切削参数是影响刀具寿命的直接因素 | 9 |
| kb-cutting-params | kb-surface-roughness | param_related | 切削参数直接影响表面粗糙度 | 8 |
| kb-cutting-params | kb-tool-coating | tool_related | 涂层的刀具需要调整切削参数来发挥性能 | 6 |
| kb-cutting-params | quick-allowance-card | tool_related | 切削参数配合加工余量卡使用效果更好 | 5 |
| kb-tool-holder | kb-tool-setting | prerequisite | 选择刀柄后需要进行刀具设定 | 6 |
| kb-tool-holder | case-gear | case_study | 齿轮加工需要专用的齿轮铣刀刀柄 | 5 |
| kb-tool-holder | kb-tool-material | next_step | 了解刀柄后可以学习刀具材料选择 | 5 |
| kb-tool-material | material-carbon-steel | tool_related | 碳钢加工常用刀具材料的选择要点 | 7 |
| kb-tool-material | kb-tool-coating | next_step | 刀具材料选定后再选择合适涂层 | 7 |
| kb-tool-material | kb-tool-holder | prerequisite | 刀具材料影响刀柄夹持方式选择 | 5 |
| kb-tool-coating | tool-coating | same_topic | 涂层技术分类与基础概念对应 | 10 |
| kb-tool-coating | kb-tool-material | prerequisite | 不同刀具材料对应不同的涂层方案 | 7 |
| kb-tool-coating | material-high-temp | tool_related | 高温合金加工必须使用高性能涂层 | 8 |
| kb-g76 | material-stainless | case_study | 不锈钢螺纹加工推荐使用G76 | 6 |

## 按材料类

| 源条目 | 关联条目 | 类型 | 理由 | 权重 |
|--------|---------|------|------|------|
| material-stainless | kb-cutting-params | next_step | 了解不锈钢特性后需要选切削参数 | 9 |
| material-stainless | kb-tool-coating | tool_related | 不锈钢加工推荐使用TiAlN涂层刀具 | 8 |
| material-stainless | material-carbon-steel | common_confusion | 不锈钢和碳钢加工特性不同容易混淆 | 6 |
| material-stainless | case-thin-wall | case_study | 不锈钢薄壁件是典型加工难点 | 7 |
| material-stainless | kb-surface-roughness | param_related | 不锈钢加工的表面粗糙度控制是难点 | 6 |
| material-aluminum | kb-cutting-params | next_step | 了解铝合金特性后需要选切削参数 | 9 |
| material-aluminum | tool-life | tool_related | 铝合金加工对刀具寿命的影响因素 | 6 |
| material-aluminum | case-thin-wall | case_study | 铝合金薄壁件加工案例 | 8 |
| material-aluminum | material-plastic | common_confusion | 铝合金和塑料的加工特性完全不同 | 5 |
| material-high-temp | kb-tool-coating | tool_related | 高温合金必须使用耐热涂层刀具 | 9 |
| material-high-temp | tool-life | tool_related | 高温合金加工对刀具寿命要求极高 | 8 |
| material-high-temp | material-stainless | same_topic | 高温合金和不锈钢都属于难加工材料 | 7 |
| material-high-temp | case-axis | case_study | 高温合金轴类零件加工案例 | 7 |
| material-carbon-steel | material-stainless | common_confusion | 碳钢和不锈钢加工特性不同需要区分 | 7 |
| material-carbon-steel | kb-tool-material | tool_related | 碳钢加工的刀具材料选择要点 | 7 |
| material-plastic | material-aluminum | same_topic | 塑料和铝合金都是轻质材料加工 | 5 |
| kb-material-base | kb-material-params | next_step | 材料基础学完后需要学具体切削参数 | 8 |
| kb-material-base | material-stainless | next_step | 材料基础后可以深入了解各类材料 | 7 |
| kb-material-params | kb-cutting-params | same_topic | 材料切削参数知识与通用切削参数对应 | 8 |

## 按案例类

| 源条目 | 关联条目 | 类型 | 理由 | 权重 |
|--------|---------|------|------|------|
| case-thin-wall | kb-sample-thin-wall | same_topic | 薄壁件案例理论分析和实操案例对应 | 10 |
| case-thin-wall | material-aluminum | case_study | 铝合金薄壁件是典型加工难点 | 8 |
| case-thin-wall | learn-g41-g42 | case_study | 薄壁件加工中刀补应用是关键 | 6 |
| case-thin-wall | material-stainless | case_study | 不锈钢薄壁件加工案例 | 7 |
| case-axis | kb-sample-aviation | same_topic | 轴类件案例与航空件案例对应 | 9 |
| case-axis | material-high-temp | case_study | 高温合金轴类加工是典型案例 | 8 |
| case-axis | kb-g68-g69 | case_study | 多轴加工中坐标旋转应用场景 | 7 |
| case-axis | learn-g43-g44-g49 | case_study | 轴类加工中长度补偿应用 | 6 |
| case-thread-part | kb-g32-g33 | case_study | 螺纹零件案例直接应用G32/G33编程 | 9 |
| case-thread-part | kb-g76 | case_study | 复合螺纹循环G76在螺纹零件中的应用 | 9 |
| case-thread-part | case-flange | same_topic | 螺纹件和法兰件都是典型车削零件 | 6 |
| case-flange | kb-sample-case-flange | same_topic | 法兰案例理论与实操对应 | 10 |
| case-flange | kb-g70 | case_study | 法兰精加工应用G70精车循环 | 8 |
| case-flange | g02-g03-arc | case_study | 法兰类零件大量使用圆弧插补 | 7 |
| case-gear | kb-g71-g72-g73 | case_study | 齿轮粗加工应用G71粗车循环 | 8 |
| case-gear | kb-tool-holder | tool_related | 齿轮加工需要专用刀柄 | 6 |
| case-gear | case-thread-part | same_topic | 齿轮和螺纹件都属于复杂轮廓零件 | 5 |

## 按速查图卡

| 源条目 | 关联条目 | 类型 | 理由 | 权重 |
|--------|---------|------|------|------|
| quick-fanuc-alarm | alarm-servo | same_topic | FANUC报警速查覆盖伺服报警 | 8 |
| quick-fanuc-alarm | alarm-spindle | same_topic | FANUC报警速查覆盖主轴报警 | 8 |
| quick-fanuc-alarm | alarm-atc | same_topic | FANUC报警速查覆盖换刀报警 | 8 |
| quick-fanuc-alarm | kb-fanuc-alarm | beginner_path | 速查图卡是报警大全的入门预览 | 7 |
| quick-gcode | learn-program-structure | beginner_path | G代码速查帮助理解程序结构 | 7 |
| quick-gcode | kb-g-code-m-code | same_topic | G代码速查与G/M代码大全内容对应 | 9 |
| quick-gcode | g00-g01-motion | beginner_path | G代码速查从最常用G00/G01开始 | 8 |
| quick-thread | kb-g32-g33 | same_topic | 螺纹速查图卡对应G32/G33螺纹指令 | 9 |
| quick-thread | kb-g76 | same_topic | 螺纹速查图卡也覆盖G76复合螺纹循环 | 8 |
| quick-thread | case-thread-part | case_study | 螺纹速查配合螺纹零件案例学习效果更好 | 7 |
| quick-measure | kb-measurement | same_topic | 测量速查与测量基础知识对应 | 9 |
| quick-measure | kb-spc-msa | next_step | 基础测量速查后可学SPC/MSA统计方法 | 6 |
| quick-measure | kb-surface-roughness | param_related | 测量速查涵盖表面粗糙度检测方法 | 6 |
| quick-allowance-card | kb-cutting-params | tool_related | 加工余量卡需要配合切削参数使用 | 8 |
| quick-allowance-card | kb-process-rules | param_related | 余量分配是加工工艺规则的重要内容 | 7 |
| quick-insert-card | kb-tool-material | tool_related | 刀片选型卡配合刀具材料知识使用 | 8 |
| quick-insert-card | kb-tool-holder | tool_related | 刀片和刀柄需要匹配选择 | 6 |
| quick-g96 | kb-g96-g97 | same_topic | G96速查图卡与恒线速度知识对应 | 9 |

## 按检测质量

| 源条目 | 关联条目 | 类型 | 理由 | 权重 |
|--------|---------|------|------|------|
| kb-measurement | quick-measure | same_topic | 测量基础与测量速查卡内容对应 | 9 |
| kb-measurement | kb-surface-roughness | next_step | 基础测量后可以深入了解表面粗糙度 | 7 |
| kb-measurement | kb-machine-accuracy | prerequisite | 机床精度检测建立在测量基础之上 | 8 |
| kb-surface-roughness | kb-cutting-params | param_related | 切削参数直接影响表面粗糙度 | 9 |
| kb-surface-roughness | kb-measurement | prerequisite | 表面粗糙度检测是测量的子领域 | 7 |
| kb-surface-roughness | material-stainless | case_study | 不锈钢表面粗糙度控制是加工难点 | 7 |
| kb-spc-msa | kb-measurement | prerequisite | SPC/MSA建立在测量基础之上 | 8 |
| kb-spc-msa | quick-measure | same_topic | SPC/MSA和测量速查都是质量检测工具 | 6 |
| kb-machine-accuracy | machine-home-return | param_related | 机床精度与回零重复定位精度相关 | 7 |
| kb-machine-accuracy | alarm-servo | alarm_related | 机床精度下降可能触发伺服报警 | 6 |
| kb-machine-accuracy | kb-measurement | prerequisite | 机床精度检测需要使用测量工具 | 8 |
| kb-drawing-reading | learn-program-structure | prerequisite | 看图是编写加工程序的前提技能 | 8 |
| kb-drawing-reading | learn-g41-g42 | prerequisite | 图纸上的尺寸公差决定刀补取值 | 7 |

## 按其他

| 源条目 | 关联条目 | 类型 | 理由 | 权重 |
|--------|---------|------|------|------|
| kb-program-structure | learn-program-structure | same_topic | 程序结构理论与实践对应 | 10 |
| kb-program-opt | g00-g01-motion | code_related | 程序优化中最常优化G00/G01路径 | 7 |
| kb-program-opt | g04-dwell | code_related | 合理使用G04暂停可以优化加工节拍 | 5 |
| kb-common-errors | alarm-servo | case_study | 伺服报警是常见加工错误之一 | 6 |
| kb-common-errors | alarm-atc | case_study | 换刀报警是常见加工错误之一 | 6 |
| kb-common-errors | g40-cancel-comp | case_study | 忘记取消刀补是常见编程错误 | 7 |
| kb-common-errors | g20-g21-unit | case_study | 英制公制混淆是常见编程错误 | 6 |
| kb-g-code-m-code | quick-gcode | same_topic | G/M代码大全与速查图卡内容对应 | 9 |
| kb-siemens-840d | kb-fanuc-alarm | common_confusion | 西门子和FANUC的报警代码体系完全不同 | 6 |
| kb-siemens-840d | kb-g-code-m-code | common_confusion | 西门子和FANUC的G代码体系有差异 | 5 |
| kb-gsk | kb-fanuc-alarm | common_confusion | GSK广数和FANUC的报警代码不同 | 5 |
| kb-gsk | kb-g-code-m-code | common_confusion | GSK系统G代码与FANUC有些差异 | 5 |
| kb-okuma | kb-mazak | common_confusion | OKUMA和MAZAK系统同属日系但操作不同 | 5 |
| kb-okuma | kb-fanuc-alarm | common_confusion | OKUMA与FANUC报警代码不同 | 4 |
| kb-mazak | kb-fanuc-alarm | common_confusion | MAZAK与FANUC报警代码不同 | 4 |
| kb-process-rules | kb-cutting-params | param_related | 工艺规则中包含切削参数的选择 | 8 |
| kb-process-rules | kb-program-structure | prerequisite | 工艺规则指导程序结构设计 | 7 |
| kb-process-rules | quick-allowance-card | param_related | 工艺规则中的余量分配与余量卡对应 | 6 |

## 按实操案例

| 源条目 | 关联条目 | 类型 | 理由 | 权重 |
|--------|---------|------|------|------|
| kb-sample-case-flange | case-flange | same_topic | 法兰实操案例与法兰知识对应 | 10 |
| kb-sample-case-flange | kb-g70 | case_study | 法兰案例中应用G70精车 | 8 |
| kb-sample-thin-wall | case-thin-wall | same_topic | 薄壁件实操案例与薄壁件知识对应 | 10 |
| kb-sample-aviation | case-axis | same_topic | 航空件实操案例与轴类件知识对应 | 9 |
| kb-sample-aviation | material-high-temp | case_study | 航空件常用高温合金材料 | 8 |
