window.CNC_DATA = [
  {
    "id": "learn-coordinate-system",
    "category": "入门基础",
    "title": "坐标系与对刀详解",
    "code": "坐标系 对刀",
    "summary": "新手最先要学会的不是参数，而是机床怎么认位置。工件坐标系、机床坐标系和对刀逻辑看懂了，后面程序才看得懂。",
    "usage": "适合刚开始学数控、还分不清回零、对刀和程序坐标的人。",
    "beginner": "先搞清楚机床坐标和工件坐标的区别，再学具体代码。",
    "warning": "坐标系没搞懂，后面很多代码和参数都会学偏。",
    "example": "机床坐标：机床自己认的位置基准\n工件坐标：你这次加工自己设的零点\n先回零，再建工件零点，再开始程序。",
    "memory": "先有机床基准，再有工件基准。",
    "nextLearn": "下一步建议继续看 G90/G91 和 G54-G59。",
    "risk": "中",
    "source": "04_数控知识库 / 编程基础",
    "tags": [
      "坐标系",
      "对刀",
      "回零",
      "入门"
    ],
    "imageUrl": "./assets/images/batch01_core/beginner-coordinate-001.webp",
    "thumbnails": [
      "./assets/images/batch01_core/beginner-coordinate-001.webp",
      "./assets/images/batch02_operation_basics/panel-control-overview-001.webp"
    ],
    "difficulty": 3,
    "estimatedTime": 8,
    "prerequisites": null,
    "nextRecommend": "learn-absolute-incremental",
    "relatedIds": [
      "learn-absolute-incremental",
      "learn-program-structure"
    ],
    "type": "core"
  },
  {
    "id": "learn-absolute-incremental",
    "category": "入门基础",
    "title": "G90 / G91 绝对值与增量编程",
    "code": "G90 G91",
    "summary": "绝对值编程和增量编程是新手必须跨过去的一关。很多程序读不懂，本质上就是没搞懂坐标是从哪算的。",
    "usage": "适合看程序、学编程和判断轨迹变化。",
    "beginner": "先拿简单两三段直线程序理解绝对值和增量值差异。",
    "warning": "模式看错，走刀方向和尺寸都会跟着错。",
    "example": "G90 X50 Z0   ; 走到绝对坐标\nG91 X-5 Z-2  ; 在当前位置基础上再退 5 和 2",
    "memory": "G90看零点，G91看增量。",
    "nextLearn": "下一步建议继续看工件坐标系和对刀流程。",
    "risk": "高",
    "source": "04_数控知识库 / 编程基础",
    "tags": [
      "G90",
      "G91",
      "绝对值",
      "增量"
    ],
    "imageUrl": "./assets/images/batch01_core/beginner-g90-g91-001.webp",
    "thumbnails": [
      "./assets/images/batch01_core/beginner-g90-g91-001.webp"
    ],
    "difficulty": 4,
    "estimatedTime": 8,
    "prerequisites": "learn-coordinate-system",
    "nextRecommend": "learn-program-structure",
    "relatedIds": [
      "learn-coordinate-system",
      "learn-g54-g59",
      "g28-g29-reference"
    ],
    "type": "core",
    "quickCheck": [
      "当前活动模态指令是绝对值（G90）还是增量值（G91）？",
      "程序中的坐标尺寸是相对于工件零点（G90）还是当前位置（G91）？",
      "在执行子程序嵌套前，是否明确转换了增量/绝对模式以防累积误差？",
      "如果中途切换为G91，在程序返回主切削段前是否已切换回G90？",
      "首件试切前是否在空载位置移动检查X/Z轴相对坐标移动量？"
    ],
    "toolIds": [
      "unit"
    ],
    "params": [
      {
        "label": "绝对坐标值",
        "name": "value",
        "value": "50.0",
        "unit": "mm",
        "toolId": "unit"
      }
    ],
    "nextId": "learn-g54-g59"
  },
  {
    "id": "learn-g54-g59",
    "category": "常用代码",
    "title": "G54-G59 工件坐标系",
    "code": "G54 G55 G56 G57 G58 G59",
    "summary": "这是最常用的一组坐标系指令，适合多工件、多工位和重复装夹场景。",
    "usage": "看加工中心程序、理解坐标切换和工件位置管理。",
    "beginner": "先把 G54 理解成最常用的工件零点，再慢慢扩展到多个坐标系。",
    "warning": "工件坐标系切换错，整段程序位置都会偏。",
    "example": "G54\nG00 X0 Y0\nG43 H01 Z50\n后续位置都按这组工件零点来算。",
    "memory": "G54是工件零点，不是机床零点。",
    "nextLearn": "下一步建议继续看对刀和刀长补偿。",
    "risk": "高",
    "source": "04_数控知识库 / 编程基础",
    "tags": [
      "G54",
      "G55",
      "坐标系",
      "工件零点"
    ],
    "imageUrl": "./assets/images/batch01_core/gcode-g54-g59-001.webp",
    "thumbnails": [
      "./assets/images/batch01_core/gcode-g54-g59-001.webp"
    ],
    "difficulty": 4,
    "estimatedTime": 12,
    "prerequisites": "learn-coordinate-system",
    "nextRecommend": "learn-g17-g18-g19",
    "relatedIds": [
      "learn-coordinate-system",
      "learn-g43-g44-g49",
      "g53-machine-coordinate"
    ],
    "type": "core",
    "quickCheck": [
      "主程序中调用的坐标系（如G54）是否与对刀记录一致？",
      "机床零点偏置寄存器中输入的X/Y/Z物理测量值是否已保存？",
      "是否确认了多工位夹具之间的偏置间距无碰撞风险？",
      "Z轴安全高度偏置是否设为+50mm以上进行首件校验？",
      "是否执行了手轮模拟运行（Dry Run）核对第一坐标点？"
    ],
    "toolIds": [],
    "params": [],
    "nextId": "learn-g43-g44-g49"
  },
  {
    "id": "learn-g17-g18-g19",
    "category": "G代码编程",
    "title": "G17 / G18 / G19 平面选择",
    "code": "G17 G18 G19",
    "summary": "平面选择决定圆弧插补、刀补和很多后续运动的工作平面，新手必须先搞清楚。",
    "usage": "适合坐标平面、圆弧方向和刀路理解入门。",
    "beginner": "先记住：G17 = XY，G18 = XZ，G19 = YZ。",
    "warning": "很多圆弧报错，不是代码错，而是平面选错了。",
    "example": "铣削最常见是 G17。\n车削和部分端面加工经常要理解 G18。",
    "memory": "先选平面，再谈圆弧和刀补。",
    "nextLearn": "下一步建议继续看 G02 / G03 圆弧和 G41 / G42 刀补。",
    "risk": "中",
    "source": "04_数控知识库 / G代码编程",
    "tags": [
      "G17",
      "G18",
      "G19",
      "平面",
      "圆弧"
    ],
    "imageUrl": "./assets/images/batch01_core/gcode-g17-g18-g19-001.webp",
    "thumbnails": [
      "./assets/images/batch01_core/gcode-g17-g18-g19-001.webp"
    ],
    "difficulty": 3,
    "estimatedTime": 10,
    "prerequisites": null,
    "nextRecommend": "learn-g41-g42",
    "relatedIds": [
      "learn-g41-g42",
      "learn-g43-g44-g49"
    ],
    "type": "core"
  },
  {
    "id": "learn-g41-g42",
    "category": "G代码编程",
    "title": "G41 / G42 刀具补偿",
    "code": "G41 G42",
    "summary": "刀补是新手最容易混乱的重点之一，必须结合刀路方向、左右关系一起看。",
    "usage": "适合轮廓加工、外形精加工、编程入门强化。",
    "beginner": "先看刀具运动方向，再判断工件左边还是右边。",
    "warning": "刀补前导线太短、方向反了、取消太晚，都会出问题。",
    "example": "G41 表示刀具左补偿。\nG42 表示刀具右补偿。",
    "memory": "先方向，后左右，再看刀补。",
    "nextLearn": "下一步建议继续看 G40 取消刀补和 G01 走刀方式。",
    "risk": "高",
    "source": "04_数控知识库 / G代码编程",
    "tags": [
      "G41",
      "G42",
      "刀补",
      "轮廓",
      "精加工"
    ],
    "imageUrl": "./assets/images/batch01_core/gcode-g41-g42-001.webp",
    "thumbnails": [
      "./assets/images/batch01_core/gcode-g41-g42-001.webp"
    ],
    "difficulty": 4,
    "estimatedTime": 10,
    "prerequisites": "learn-absolute-incremental",
    "nextRecommend": "learn-g43-g44-g49",
    "relatedIds": [
      "g40-cancel-comp",
      "learn-absolute-incremental",
      "process-allowance-basics"
    ],
    "type": "core",
    "quickCheck": [
      "走向是顺铣还是逆铣？左补偿（G41）或右补偿（G42）方向是否加反？",
      "机床D寄存器（刀具半径偏置）中输入的值是否与刀具实际半径一致？",
      "G41/G42建立和取消刀补时，其移动直线段是否大于刀具半径？",
      "是否确认刀补建立时不会在拐角处发生轮廓干涉或过切？",
      "程序结束前是否已使用 G40 彻底取消了半径补偿？"
    ],
    "toolIds": [
      "feed"
    ],
    "params": [
      {
        "label": "实际刀具直径",
        "name": "diameter",
        "value": "10",
        "unit": "mm",
        "toolId": "feed"
      },
      {
        "label": "刀补D值",
        "name": "offset_d",
        "value": "5.0",
        "unit": "mm",
        "toolId": "feed"
      }
    ],
    "nextId": "g40-cancel-comp"
  },
  {
    "id": "learn-g43-g44-g49",
    "category": "G代码编程",
    "title": "G43 / G44 / G49 刀长补偿",
    "code": "G43 G44 G49",
    "summary": "刀长补偿决定 Z 方向安全与加工深度，是机床上机最常用的基础功能之一。",
    "usage": "适合刀具长度设定、对刀和上机实操入门。",
    "beginner": "先明白刀长补偿是补 Z，不是补轮廓。",
    "warning": "刀长数据填错，轻则尺寸不准，重则撞刀。",
    "example": "G43 常见为正刀长补偿。\nG49 常见为取消刀长补偿。",
    "memory": "刀长看 Z，刀补看轮廓。",
    "nextLearn": "下一步建议继续看对刀、坐标系和安全高度设置。",
    "risk": "高",
    "source": "04_数控知识库 / G代码编程",
    "tags": [
      "G43",
      "G44",
      "G49",
      "刀长",
      "对刀"
    ],
    "imageUrl": "./assets/images/batch01_core/gcode-g43-g49-001.webp",
    "thumbnails": [
      "./assets/images/batch01_core/gcode-g43-g49-001.webp"
    ],
    "difficulty": 4,
    "estimatedTime": 10,
    "prerequisites": "learn-g54-g59",
    "nextRecommend": "learn-g20-g21",
    "relatedIds": [
      "learn-g54-g59",
      "machine-tool-setting",
      "m06-tool-change"
    ],
    "type": "core",
    "quickCheck": [
      "程序中G43后面的H代号是否与当前主轴上的刀具编号（T代码）完全一致？",
      "机床H寄存器（刀长偏置）中录入的测量值正负号与对刀高度是否核对过？",
      "首次下刀时，是否调低进给倍率并在Z100mm处停住用尺子物理测量？",
      "换刀宏程序（M06）之后是否遗漏了重新建立G43长度补偿的指令？",
      "程序结束或换刀前是否已使用 G49 或 H00 取消了长度补偿？"
    ],
    "toolIds": [
      "unit"
    ],
    "params": [
      {
        "label": "刀具长度",
        "name": "length",
        "value": "120.5",
        "unit": "mm",
        "toolId": "unit"
      },
      {
        "label": "长度偏差",
        "name": "wear_h",
        "value": "0.02",
        "unit": "mm",
        "toolId": "unit"
      }
    ],
    "nextId": "machine-tool-setting"
  },
  {
    "id": "learn-g71-g72-g73",
    "category": "常用代码",
    "title": "G71 / G72 / G73 车床循环",
    "code": "G71 G72 G73",
    "summary": "这是车床粗加工高频循环，适合新手开始接触循环编程时学习。",
    "usage": "看车床程序、学习轮廓粗车和循环语句结构。",
    "beginner": "先学会手工直线程序，再回来学循环更容易理解。",
    "warning": "程序段范围和留量逻辑容易看混。",
    "risk": "中",
    "source": "04_数控知识库 / 编程基础",
    "tags": [
      "G71",
      "G72",
      "G73",
      "车床循环"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 3,
    "estimatedTime": 12,
    "prerequisites": "learn-g43-g44-g49",
    "nextRecommend": "learn-g81-g83",
    "relatedIds": [
      "learn-g81-g83",
      "learn-g84"
    ],
    "type": "core"
  },
  {
    "id": "learn-g81-g83",
    "category": "常用代码",
    "title": "G81 / G83 钻孔与啄钻循环",
    "code": "G81 G83",
    "summary": "固定循环比单段程序省很多事，但前提是你先知道每个地址是控制什么动作。",
    "usage": "钻孔、深孔和循环学习入门。",
    "beginner": "先分清普通钻孔和深孔啄钻，再记代码。",
    "warning": "孔深、返回平面和进给理解错最常见。",
    "risk": "中",
    "source": "04_数控知识库 / 编程基础",
    "tags": [
      "G81",
      "G83",
      "钻孔",
      "啄钻"
    ],
    "imageUrl": "./assets/images/batch01_core/cycle-g81-001.webp",
    "thumbnails": [
      "./assets/images/batch01_core/cycle-g81-001.webp",
      "./assets/images/batch01_core/cycle-g83-001.webp",
      "./assets/images/batch01_core/cycle-g84-001.webp"
    ],
    "difficulty": 3,
    "estimatedTime": 12,
    "prerequisites": "learn-g71-g72-g73",
    "nextRecommend": "learn-g84",
    "relatedIds": [
      "g98-g99-return",
      "g80-cancel-cycle",
      "tool-drill-selection"
    ],
    "type": "core",
    "quickCheck": [
      "R平面安全高度是否设定为高出工件表面2mm-5mm以防快速定位撞刀？",
      "啄钻循环（G83）中的Q值（每次吃刀深）是否合理？排屑是否通畅？",
      "盲孔加工时，Z轴最终孔深是否计入了钻头钻尖的斜角高度？",
      "退刀平面模式（G98/G99）是否根据夹具避让要求正确切换？",
      "加工完成后是否已使用 G80 指令注销了固定循环？"
    ],
    "toolIds": [
      "feed",
      "speed"
    ],
    "params": [
      {
        "label": "钻头直径",
        "name": "diameter",
        "value": "6.8",
        "unit": "mm",
        "toolId": "speed"
      },
      {
        "label": "切削速度",
        "name": "vc",
        "value": "80",
        "unit": "m/min",
        "toolId": "speed"
      },
      {
        "label": "每转进给",
        "name": "fr",
        "value": "0.15",
        "unit": "mm/r",
        "toolId": "feed"
      }
    ],
    "nextId": "g98-g99-return"
  },
  {
    "id": "learn-g84",
    "category": "G代码编程",
    "title": "G84 攻丝循环",
    "code": "G84",
    "summary": "攻丝循环是新手最容易和底孔、转速、进给关系混淆的功能之一。",
    "usage": "适合攻丝程序、螺纹加工和循环代码入门。",
    "beginner": "先明确攻丝必须和螺距、转速、同步关系一起看。",
    "warning": "没有搞清楚底孔和螺距，攻丝很容易报废。",
    "example": "G84 常用于刚性攻丝或标准攻丝循环。",
    "memory": "先底孔，再螺距，再攻丝。",
    "nextLearn": "下一步建议继续看螺纹参数、转速换算和 G76 螺纹加工。",
    "risk": "高",
    "source": "04_数控知识库 / G代码编程",
    "tags": [
      "G84",
      "攻丝",
      "螺纹",
      "循环"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 4,
    "estimatedTime": 10,
    "prerequisites": "learn-m08-m09",
    "nextRecommend": "calc-vc-rpm",
    "relatedIds": [
      "learn-g81-g83",
      "g80-cancel-cycle",
      "tool-thread-tap"
    ],
    "type": "core",
    "quickCheck": [
      "主轴转速S和进给F是否严格满足公式 F = S * P（P为螺距）？",
      "是否确认机床已切换至刚性攻丝模式（如FANUC系统的M29）？",
      "攻丝底孔直径是否已使用塞规或卡尺测量合格？",
      "主轴正反转切削液喷淋是否充足？润滑油是否就位防扭断？",
      "攻丝深度是否预留了攻丝轴向滑移的缓冲裕量？"
    ],
    "toolIds": [
      "feed",
      "speed"
    ],
    "params": [
      {
        "label": "螺纹公称直径",
        "name": "diameter",
        "value": "8",
        "unit": "mm",
        "toolId": "speed"
      },
      {
        "label": "螺距P",
        "name": "pitch",
        "value": "1.25",
        "unit": "mm",
        "toolId": "feed"
      },
      {
        "label": "转速S",
        "name": "rpm",
        "value": "300",
        "unit": "r/min",
        "toolId": "feed"
      }
    ],
    "nextId": "tool-thread-tap"
  },
  {
    "id": "fanuc-param-backup",
    "category": "FANUC参数",
    "title": "FANUC 参数备份与恢复",
    "code": "参数备份",
    "summary": "对新手来说，学参数之前要先学备份。先保命，再学习具体参数的含义。",
    "usage": "适合学习参数管理基本流程。",
    "beginner": "先知道改参数前要备份，再学具体参数号。",
    "warning": "不备份直接改参数是新手最危险的错误之一。",
    "example": "先备份参数\n再记录原值\n确认系统型号后再查具体参数号",
    "memory": "先备份，再查看，最后才考虑改。",
    "nextLearn": "下一步建议继续看回零参数和高风险参数类别。",
    "risk": "高",
    "source": "04_数控知识库 / 系统参数",
    "tags": [
      "FANUC",
      "参数",
      "备份",
      "恢复"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 4,
    "estimatedTime": 10,
    "prerequisites": null,
    "nextRecommend": "fanuc-rigid-tap",
    "relatedIds": [
      "fanuc-rigid-tap"
    ],
    "type": "auxiliary"
  },
  {
    "id": "fanuc-rigid-tap",
    "category": "FANUC参数",
    "title": "FANUC 刚性攻丝编程与参数",
    "code": "刚性攻丝",
    "summary": "刚性攻丝涉及同步、主轴、螺距和系统条件，属于进阶主题，但现场很常见。",
    "usage": "适合从普通攻丝进一步学习系统能力和参数关联。",
    "beginner": "先学普通攻丝逻辑，再接触刚性攻丝更稳妥。",
    "warning": "没搞清系统条件和参数前，不建议直接上机改。",
    "risk": "高",
    "source": "04_数控知识库 / 编程基础",
    "tags": [
      "刚性攻丝",
      "FANUC",
      "参数",
      "G84"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 4,
    "estimatedTime": 10,
    "prerequisites": "fanuc-param-backup",
    "nextRecommend": "alarm-servo",
    "relatedIds": [
      "fanuc-param-backup"
    ],
    "type": "auxiliary"
  },
  {
    "id": "alarm-servo",
    "category": "报警排查",
    "title": "伺服系统常见故障与排除",
    "code": "伺服故障",
    "aliases": [
      "伺服报警",
      "伺服故障",
      "轴报警"
    ],
    "summary": "伺服相关报警是现场高频问题，适合新手先建立排查顺序，而不是一上来盯某个代码。",
    "usage": "报警排查、维修入门、理解故障逻辑。",
    "beginner": "先看故障发生在移动、回零还是换刀动作之后。",
    "warning": "报警排查先排基础状态，别只盯代码名称。",
    "example": "先看报警号\n再看发生动作\n再看轴、驱动、编码器或状态链",
    "memory": "先看动作，再看报警。",
    "nextLearn": "下一步建议继续看主轴故障和 ATC 换刀故障。",
    "risk": "高",
    "source": "04_数控知识库 / 故障维修",
    "tags": [
      "伺服",
      "报警",
      "排查",
      "维修"
    ],
    "imageUrl": "./assets/images/batch01_core/alarm-servo-001.webp",
    "thumbnails": [
      "./assets/images/batch01_core/alarm-servo-001.webp"
    ],
    "difficulty": 4,
    "estimatedTime": 10,
    "prerequisites": null,
    "nextRecommend": "alarm-spindle",
    "relatedIds": [
      "alarm-spindle",
      "alarm-atc"
    ],
    "type": "auxiliary"
  },
  {
    "id": "alarm-spindle",
    "category": "报警排查",
    "title": "主轴常见故障与排除",
    "code": "主轴故障",
    "aliases": [
      "主轴报警",
      "主轴故障",
      "主轴不转"
    ],
    "summary": "主轴不转、转速异常、负载异常都是新手常会遇到的问题。",
    "usage": "适合新手学习主轴故障排查思路。",
    "beginner": "先看是程序没给指令、机床没就绪，还是系统报警。",
    "warning": "主轴问题不能只看机械，也要看程序和系统条件。",
    "risk": "高",
    "source": "04_数控知识库 / 故障维修",
    "tags": [
      "主轴",
      "故障",
      "报警",
      "排查"
    ],
    "imageUrl": "./assets/images/batch01_core/alarm-spindle-001.webp",
    "thumbnails": [
      "./assets/images/batch01_core/alarm-spindle-001.webp"
    ],
    "difficulty": 4,
    "estimatedTime": 10,
    "prerequisites": "alarm-servo",
    "nextRecommend": "alarm-atc",
    "relatedIds": [
      "alarm-atc",
      "fault-limit-switch"
    ],
    "type": "auxiliary"
  },
  {
    "id": "alarm-atc",
    "category": "报警排查",
    "title": "ATC 自动换刀故障诊断",
    "code": "ATC",
    "aliases": [
      "换刀报警",
      "刀库故障",
      "ATC故障"
    ],
    "summary": "换刀故障是加工中心高频问题，适合学习动作顺序和联锁思维。",
    "usage": "学习换刀流程和故障排查顺序。",
    "beginner": "先看换刀动作卡在哪一步，再回头找原因。",
    "warning": "ATC故障经常是动作链问题，不只是单个零件问题。",
    "risk": "高",
    "source": "04_数控知识库 / 故障维修",
    "tags": [
      "ATC",
      "换刀",
      "故障",
      "加工中心"
    ],
    "imageUrl": "./assets/images/batch05_alarm_drawing_material/atc-alarm-flow-001.webp",
    "thumbnails": [
      "./assets/images/batch05_alarm_drawing_material/atc-alarm-flow-001.webp"
    ],
    "difficulty": 4,
    "estimatedTime": 10,
    "prerequisites": "alarm-spindle",
    "nextRecommend": "fault-limit-switch",
    "relatedIds": [
      "fault-limit-switch",
      "fault-home-fail"
    ],
    "type": "auxiliary"
  },
  {
    "id": "tool-life",
    "category": "刀具工艺",
    "title": "刀具寿命管理",
    "code": "刀具寿命",
    "aliases": [
      "寿命",
      "刀具寿命",
      "磨损",
      "换刀"
    ],
    "summary": "新手常只看能不能切，不看刀具状态。学会刀具寿命概念后，才会逐渐理解稳定加工。",
    "usage": "适合学习刀具磨损、寿命和换刀节奏。",
    "beginner": "先学会分辨崩刃、磨损和断刀风险。",
    "warning": "只会盯尺寸，不看刀具状态，后面问题会越来越多。",
    "risk": "中",
    "source": "04_数控知识库 / 刀具工艺",
    "tags": [
      "刀具",
      "寿命",
      "磨损",
      "换刀"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 3,
    "estimatedTime": 10,
    "prerequisites": null,
    "nextRecommend": "tool-coating",
    "relatedIds": [
      "tool-coating",
      "tool-insert-brand"
    ],
    "type": "auxiliary"
  },
  {
    "id": "tool-coating",
    "category": "刀具工艺",
    "title": "刀具涂层技术",
    "code": "刀具涂层",
    "aliases": [
      "涂层",
      "涂层刀具",
      "涂层选择"
    ],
    "summary": "涂层不是花里胡哨的概念，它直接关系到耐磨、耐热和适用材料。",
    "usage": "适合学习不同刀具为什么适合不同材料。",
    "beginner": "先理解涂层是为了解决什么问题，再记品牌和型号。",
    "warning": "不要只看牌号，不看材料和加工场景。",
    "risk": "低",
    "source": "04_数控知识库 / 刀具工艺",
    "tags": [
      "刀具",
      "涂层",
      "材料",
      "选型"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 2,
    "estimatedTime": 10,
    "prerequisites": "tool-life",
    "nextRecommend": "tool-insert-brand",
    "relatedIds": [
      "tool-insert-brand",
      "tool-drill-selection"
    ],
    "type": "auxiliary"
  },
  {
    "id": "material-stainless",
    "category": "材料加工",
    "title": "不锈钢加工完整方案",
    "code": "不锈钢加工",
    "summary": "不锈钢是新手最容易觉得难切的一类材料，适合从切削特点和排屑问题入手学习。",
    "usage": "学习材料差异和刀具工艺选择。",
    "beginner": "先理解它为什么黏刀、发热和容易出毛刺。",
    "warning": "不锈钢的加工经验不能直接照搬到铝件上。",
    "risk": "中",
    "source": "04_数控知识库 / 刀具工艺",
    "tags": [
      "不锈钢",
      "材料",
      "切削",
      "工艺"
    ],
    "imageUrl": "./assets/images/batch05_alarm_drawing_material/material-stainless-cutting-001.webp",
    "thumbnails": [
      "./assets/images/batch05_alarm_drawing_material/material-stainless-cutting-001.webp"
    ],
    "difficulty": 3,
    "estimatedTime": 10,
    "prerequisites": null,
    "nextRecommend": "material-aluminum",
    "relatedIds": [
      "material-aluminum",
      "material-high-temp"
    ],
    "type": "auxiliary"
  },
  {
    "id": "material-aluminum",
    "category": "材料加工",
    "title": "铝合金加工基础",
    "code": "铝合金加工",
    "aliases": [
      "铝件",
      "铝合金",
      "铝材"
    ],
    "summary": "铝件看似好加工，但高速、高光洁度和积屑瘤问题对新手也很典型。",
    "usage": "适合学习轻切削、高速和表面质量基础。",
    "beginner": "先搞清铝件和钢件在切削感觉上的主要差别。",
    "warning": "别把钢件的思路直接套到铝件上。",
    "risk": "中",
    "source": "04_数控知识库 / 刀具工艺",
    "tags": [
      "铝合金",
      "加工",
      "表面质量",
      "切削"
    ],
    "imageUrl": "./assets/images/batch05_alarm_drawing_material/material-aluminum-cutting-001.webp",
    "thumbnails": [
      "./assets/images/batch05_alarm_drawing_material/material-aluminum-cutting-001.webp"
    ],
    "difficulty": 3,
    "estimatedTime": 10,
    "prerequisites": "material-stainless",
    "nextRecommend": "material-high-temp",
    "relatedIds": [
      "tool-drill-selection",
      "process-allowance-basics",
      "material-carbon-steel"
    ],
    "type": "auxiliary",
    "quickCheck": [
      "选用刀具是否为铝合金专用的大前角、2刃镜面铣刀？",
      "切削液乳化度是否调高至8%-10%以提供强力冷却和防粘刀？",
      "是否确认进给量F和吃刀深度ap足够大，防止产生极薄热熔铝屑缠绕？",
      "型腔加工时，螺旋切入下刀角是否控制在3度以内？",
      "精加工时是否启用了恒线速切削或提高转速至刀具极限？"
    ],
    "toolIds": [
      "speed",
      "feed"
    ],
    "params": [
      {
        "label": "推荐Vc",
        "name": "vc",
        "value": "350",
        "unit": "m/min",
        "toolId": "speed"
      },
      {
        "label": "刀具直径",
        "name": "diameter",
        "value": "10",
        "unit": "mm",
        "toolId": "speed"
      },
      {
        "label": "每齿进给Fz",
        "name": "fz",
        "value": "0.12",
        "unit": "mm/z",
        "toolId": "feed"
      }
    ],
    "nextId": "material-carbon-steel"
  },
  {
    "id": "material-high-temp",
    "category": "材料加工",
    "title": "高温合金加工专项",
    "code": "高温合金",
    "summary": "这类材料偏进阶，但适合建立“不同材料必须用不同工艺思路”的观念。",
    "usage": "作为扩展学习，建立材料难加工概念。",
    "beginner": "先知道这类材料为什么难切，不必急着背参数。",
    "warning": "难加工材料更不能照搬普通钢件经验。",
    "risk": "高",
    "source": "04_数控知识库 / 刀具工艺",
    "tags": [
      "高温合金",
      "难加工",
      "材料",
      "工艺"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 4,
    "estimatedTime": 10,
    "prerequisites": "material-aluminum",
    "nextRecommend": "material-carbon-steel",
    "relatedIds": [
      "material-carbon-steel",
      "material-plastic"
    ],
    "type": "auxiliary"
  },
  {
    "id": "case-thin-wall",
    "category": "加工案例",
    "title": "薄壁零件加工案例",
    "code": "薄壁件",
    "aliases": [
      "薄壁件",
      "薄壁零件",
      "变形控制"
    ],
    "summary": "薄壁件是新手很容易碰到但很难稳定做好的题型，适合用案例理解装夹、余量和变形控制。",
    "usage": "学习加工变形控制和工艺安排。",
    "beginner": "先看为什么会变形，再看怎么减轻变形。",
    "warning": "薄壁件最怕只盯尺寸，不看装夹和余量。",
    "risk": "中",
    "source": "04_数控知识库 / 加工案例",
    "tags": [
      "薄壁件",
      "案例",
      "变形",
      "工艺"
    ],
    "imageUrl": "./assets/images/batch03_turning_process/turning-thin-wall-001.webp",
    "thumbnails": [
      "./assets/images/batch03_turning_process/turning-thin-wall-001.webp"
    ],
    "difficulty": 3,
    "estimatedTime": 10,
    "prerequisites": null,
    "nextRecommend": "case-axis",
    "relatedIds": [
      "case-axis",
      "case-thread-part"
    ],
    "type": "auxiliary"
  },
  {
    "id": "case-axis",
    "category": "加工案例",
    "title": "车削阶梯轴案例",
    "code": "阶梯轴",
    "aliases": [
      "阶梯轴",
      "车轴",
      "轴类零件"
    ],
    "summary": "这是很适合新手理解车床程序结构的典型零件类型。",
    "usage": "学习车床编程顺序、尺寸变化和外圆加工。",
    "beginner": "先学这种典型件，比一上来就看复杂零件更容易。",
    "warning": "别只背程序，先看每一刀在加工哪里。",
    "risk": "低",
    "source": "04_数控知识库 / 加工案例",
    "tags": [
      "车床",
      "阶梯轴",
      "案例",
      "编程"
    ],
    "imageUrl": "./assets/images/batch03_turning_process/step-shaft-case-001.webp",
    "thumbnails": [
      "./assets/images/batch03_turning_process/step-shaft-case-001.webp"
    ],
    "difficulty": 2,
    "estimatedTime": 10,
    "prerequisites": "case-thin-wall",
    "nextRecommend": "case-thread-part",
    "relatedIds": [
      "case-thread-part",
      "case-flange"
    ],
    "type": "auxiliary"
  },
  {
    "id": "case-thread-part",
    "category": "加工案例",
    "title": "螺纹零件加工案例",
    "code": "螺纹案例",
    "aliases": [
      "螺纹件",
      "螺纹零件",
      "攻丝案例"
    ],
    "summary": "把螺纹代码、螺距理解和实际零件放到一起，更适合新手从例子中学习。",
    "usage": "学习螺纹程序、底孔和零件加工逻辑。",
    "beginner": "先看零件，再看程序，再回头看代码更容易懂。",
    "warning": "看螺纹案例时一定把螺距和退刀动作看明白。",
    "risk": "中",
    "source": "04_数控知识库 / 加工案例",
    "tags": [
      "螺纹",
      "案例",
      "零件",
      "加工"
    ],
    "imageUrl": "./assets/images/batch03_turning_process/thread-part-case-001.webp",
    "thumbnails": [
      "./assets/images/batch03_turning_process/thread-part-case-001.webp"
    ],
    "difficulty": 3,
    "estimatedTime": 10,
    "prerequisites": "case-axis",
    "nextRecommend": "case-flange",
    "relatedIds": [
      "case-flange",
      "case-gear"
    ],
    "type": "auxiliary"
  },
  {
    "id": "quick-fanuc-param",
    "category": "速查图卡",
    "title": "FANUC 参数修改速查",
    "code": "参数速查图",
    "summary": "这是你现成的速查图卡栏目，适合做手机上快速浏览入口，后面可继续配详细讲解页。",
    "usage": "手机速查、栏目封面、知识卡入口。",
    "beginner": "先拿它快速定位主题，再看详细解释。",
    "warning": "图卡适合看概览，不建议只看图卡就直接改参数。",
    "risk": "中",
    "source": "E盘速查表系列",
    "tags": [
      "FANUC",
      "参数",
      "图卡",
      "速查"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 3,
    "estimatedTime": 10,
    "prerequisites": null,
    "nextRecommend": "quick-fanuc-alarm",
    "relatedIds": [
      "quick-fanuc-alarm",
      "quick-gcode"
    ],
    "type": "auxiliary"
  },
  {
    "id": "quick-fanuc-alarm",
    "category": "速查图卡",
    "title": "FANUC 报警代码速查表",
    "code": "报警速查图",
    "summary": "把报警做成图卡很适合手机查看，后续可配故障现象和排查流程页。",
    "usage": "手机快速查报警、做栏目入口、学习总结。",
    "beginner": "先知道报警大概属于哪类，再继续深挖原因。",
    "warning": "报警图卡只能帮你定位方向，不等于排查已经完成。",
    "risk": "中",
    "source": "E盘速查表系列",
    "tags": [
      "报警",
      "FANUC",
      "图卡",
      "故障"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 3,
    "estimatedTime": 10,
    "prerequisites": "quick-fanuc-param",
    "nextRecommend": "quick-gcode",
    "relatedIds": [
      "quick-gcode",
      "quick-g96"
    ],
    "type": "auxiliary"
  },
  {
    "id": "quick-gcode",
    "category": "速查图卡",
    "title": "G代码与编程速查",
    "code": "G代码速查图",
    "summary": "适合做软件里的快捷总入口，把常见代码先分类给新手看。",
    "usage": "手机入门速查、代码总览。",
    "beginner": "先学最常见的几组代码，不要一口气全背。",
    "warning": "只看代码名称，不看应用场景，很快又会忘。",
    "risk": "低",
    "source": "E盘速查表系列",
    "tags": [
      "G代码",
      "编程",
      "图卡",
      "速查"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 2,
    "estimatedTime": 10,
    "prerequisites": "quick-fanuc-alarm",
    "nextRecommend": "quick-g96",
    "relatedIds": [
      "quick-g96",
      "quick-thread"
    ],
    "type": "auxiliary"
  },
  {
    "id": "quick-g96",
    "category": "速查图卡",
    "title": "G96 恒线速速查表",
    "code": "G96 图卡",
    "summary": "适合配合换算工具一起用，让新手更容易把公式和实际效果连起来。",
    "usage": "学习恒线速、做配图和快速复习。",
    "beginner": "边看图卡边用换算工具，理解会更快。",
    "warning": "恒线速必须和最高转速控制一起理解。",
    "risk": "高",
    "source": "E盘速查表系列",
    "tags": [
      "G96",
      "恒线速",
      "图卡",
      "车削"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 4,
    "estimatedTime": 10,
    "prerequisites": "quick-gcode",
    "nextRecommend": "quick-thread",
    "relatedIds": [
      "quick-thread",
      "quick-measure"
    ],
    "type": "auxiliary"
  },
  {
    "id": "quick-thread",
    "category": "速查图卡",
    "title": "螺纹与规格速查",
    "code": "螺纹图卡",
    "summary": "适合在手机上快速查牙距、规格和常见识别方式，是很适合新手的图卡类型。",
    "usage": "螺纹学习、现场查规格、打底孔前快速确认。",
    "beginner": "先分清公制和英制，再看具体规格。",
    "warning": "看错规格，后面钻孔攻牙都会出偏差。",
    "risk": "中",
    "source": "E盘速查表系列",
    "tags": [
      "螺纹",
      "规格",
      "图卡",
      "牙距"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 3,
    "estimatedTime": 10,
    "prerequisites": "quick-g96",
    "nextRecommend": "quick-measure",
    "relatedIds": [
      "quick-measure",
      "quick-allowance-card"
    ],
    "type": "auxiliary"
  },
  {
    "id": "quick-measure",
    "category": "速查图卡",
    "title": "量具使用速查表",
    "code": "量具图卡",
    "summary": "新手非常适合从量具图卡入门，把量具用途和读数建立起第一印象。",
    "usage": "手机学习、培训演示、首件检验前复习。",
    "beginner": "先学用途，再学读数，再学怎么测得准。",
    "warning": "看懂图卡不代表就会实际测量。",
    "risk": "低",
    "source": "E盘速查表系列",
    "tags": [
      "量具",
      "图卡",
      "卡尺",
      "千分尺"
    ],
    "imageUrl": "./assets/images/batch05_alarm_drawing_material/vernier-caliper-detail-001.webp",
    "thumbnails": [
      "./assets/images/batch05_alarm_drawing_material/vernier-caliper-detail-001.webp",
      "./assets/images/batch05_alarm_drawing_material/micrometer-detail-001.webp"
    ],
    "difficulty": 2,
    "estimatedTime": 10,
    "prerequisites": "quick-thread",
    "nextRecommend": "quick-allowance-card",
    "relatedIds": [
      "quick-allowance-card",
      "quick-insert-card"
    ],
    "type": "auxiliary"
  },
  {
    "id": "learn-program-structure",
    "category": "入门基础",
    "title": "程序结构与常见地址符",
    "code": "N G X Z F S T M",
    "summary": "新手看程序最先会被一堆字母劝退。其实先搞懂常见地址符分别表示什么，程序就没那么吓人了。",
    "usage": "适合刚开始看G代码、连程序每一段什么意思都不熟的人。",
    "beginner": "先认字母含义，再看整段程序。",
    "warning": "连地址符都没分清，就很容易把程序看成乱码。",
    "risk": "低",
    "source": "04_数控知识库 / 编程基础",
    "tags": [
      "程序结构",
      "地址符",
      "G代码",
      "入门"
    ],
    "imageUrl": "./assets/images/batch02_operation_basics/program-structure-basic-001.webp",
    "thumbnails": [
      "./assets/images/batch02_operation_basics/program-structure-basic-001.webp"
    ],
    "difficulty": 2,
    "estimatedTime": 8,
    "prerequisites": "learn-absolute-incremental",
    "nextRecommend": "learn-g54-g59",
    "relatedIds": [
      "m30-program-end",
      "learn-absolute-incremental",
      "quick-gcode"
    ],
    "type": "core",
    "quickCheck": [
      "程序开头是否有安全程序段（如G40 G80 G90 G17）清除之前的模态？",
      "程序名是否规范（如O1001）？是否包含了正确的换刀与对刀备注信息？",
      "每一个坐标数值后面是否补齐了小数点（如X10. 而非 X10）？",
      "子程序调用M98/M99中，P代号指定的子程序号和循环次数是否无误？",
      "程序末尾是否使用了 M30 执行复位并将光标自动带回程序开头？"
    ],
    "toolIds": [
      "unit"
    ],
    "params": [
      {
        "label": "程序段数",
        "name": "lines",
        "value": "500",
        "unit": "行",
        "toolId": "unit"
      }
    ],
    "nextId": "m30-program-end"
  },
  {
    "id": "machine-home-return",
    "category": "机床操作",
    "title": "回零操作与参考点概念",
    "code": "回零",
    "summary": "回零不是形式动作，而是机床重新确认位置基准的重要过程。新手必须把回零意义学明白。",
    "usage": "适合机床开机、回参考点、理解坐标来源时学习。",
    "beginner": "先理解为什么机床要先回零，再记操作步骤。",
    "warning": "没回零就乱动机床，是最典型的新手风险动作之一。",
    "risk": "高",
    "source": "04_数控知识库 / 机床操作",
    "tags": [
      "回零",
      "参考点",
      "机床操作",
      "开机"
    ],
    "imageUrl": "./assets/images/batch01_core/home-safe-path-001.webp",
    "thumbnails": [
      "./assets/images/batch01_core/home-safe-path-001.webp"
    ],
    "difficulty": 4,
    "estimatedTime": 10,
    "prerequisites": null,
    "nextRecommend": "machine-tool-setting",
    "relatedIds": [
      "g28-g29-reference",
      "fault-home-fail",
      "fault-home-reference"
    ],
    "type": "auxiliary",
    "quickCheck": [
      "回零时，各滑动轴的移动方向是否确实为参考点方向（通常为正向+）？",
      "回零碰块及接近限位开关是否保持清洁，无铁屑缠绕或油污覆盖？",
      "开机后是否严格按照Z轴优先，X/Y轴随后的顺序执行回零？",
      "回零完成标志（如指示灯常亮或系统第一诊断画面坐标）是否建立？",
      "回参考点行程中是否确认无异响、颤动或限位报警强行弹出？"
    ],
    "toolIds": [],
    "params": [],
    "nextId": "g28-g29-reference"
  },
  {
    "id": "machine-tool-setting",
    "category": "机床操作",
    "title": "FANUC 对刀完整操作流程",
    "code": "对刀",
    "summary": "对刀是从新手走向能独立干活的重要一步。先看流程，再理解每一步是在建立什么基准。",
    "usage": "适合车床、加工中心入门和现场教学。",
    "beginner": "先背顺序，再理解坐标逻辑，学习会更顺。",
    "warning": "对刀动作顺序错，后面尺寸和位置都会跟着错。",
    "example": "先回零\n再找工件零点\n再录入刀补或偏置\n最后用试切验证尺寸",
    "memory": "先建基准，再谈尺寸。",
    "nextLearn": "下一步建议继续看 G54-G59 和刀长/刀尖补偿。",
    "risk": "高",
    "source": "04_数控知识库 / 机床操作",
    "tags": [
      "对刀",
      "FANUC",
      "操作流程",
      "机床"
    ],
    "imageUrl": "./assets/images/batch02_operation_basics/work-offset-setting-001.webp",
    "thumbnails": [
      "./assets/images/batch02_operation_basics/work-offset-setting-001.webp",
      "./assets/images/batch02_operation_basics/zero-return-sequence-001.webp"
    ],
    "difficulty": 4,
    "estimatedTime": 10,
    "prerequisites": "machine-home-return",
    "nextRecommend": "machine-panel-english",
    "relatedIds": [
      "learn-coordinate-system",
      "learn-g43-g44-g49",
      "fault-limit-switch"
    ],
    "type": "auxiliary",
    "quickCheck": [
      "对刀仪/寻边器本身的物理尺寸（如寻边器直径）在换算时是否已扣除？",
      "对刀所用的基准面是否已清扫干净，无切屑、铁末或油污残留？",
      "对刀测得的绝对物理差值是否正确录入了工件偏置（G54）寄存器？",
      "多把刀对刀时，基准刀与非基准刀的长度偏差值正负号是否对齐？",
      "第一把刀对刀完后，是否手摇Z轴离工件20mm处用量块复核？"
    ],
    "toolIds": [
      "unit"
    ],
    "params": [
      {
        "label": "寻边器直径",
        "name": "diameter",
        "value": "10",
        "unit": "mm",
        "toolId": "unit"
      }
    ],
    "nextId": "learn-g43-g44-g49"
  },
  {
    "id": "machine-panel-english",
    "category": "机床操作",
    "title": "机床面板常见英文单词",
    "code": "PANEL ENGLISH",
    "summary": "很多新手不是不会按按钮，而是根本不认识面板上的英文。这个条目适合快速扫盲。",
    "usage": "适合新手认识面板、学基本操作。",
    "beginner": "先把最常见的几十个词认识了，现场不容易慌。",
    "warning": "不认识按钮含义时，不要凭感觉乱按。",
    "risk": "中",
    "source": "速查系列 / G代码与编程速查",
    "tags": [
      "面板",
      "英文",
      "机床",
      "入门"
    ],
    "imageUrl": "./assets/images/batch02_operation_basics/panel-control-overview-001.webp",
    "thumbnails": [
      "./assets/images/batch02_operation_basics/panel-control-overview-001.webp"
    ],
    "difficulty": 3,
    "estimatedTime": 10,
    "prerequisites": "machine-tool-setting",
    "nextRecommend": "fanuc-alarm-common",
    "relatedIds": [
      "machine-home-return",
      "machine-tool-setting"
    ],
    "type": "auxiliary"
  },
  {
    "id": "g04-dwell",
    "category": "常用代码",
    "title": "G04 暂停指令",
    "code": "G04",
    "summary": "暂停指令看着简单，但在倒角、镗孔、表面质量控制和某些节拍动作中很常见。",
    "usage": "适合理解程序停顿、延时和工艺节奏。",
    "beginner": "先理解它是在原地暂停，不是停止程序结束。",
    "warning": "别把G04和M00/M01混为一谈。",
    "risk": "低",
    "source": "04_数控知识库 / 编程基础",
    "tags": [
      "G04",
      "暂停",
      "常用代码",
      "延时"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 2,
    "estimatedTime": 12,
    "prerequisites": "learn-g84",
    "nextRecommend": "g20-g21-unit",
    "relatedIds": [
      "g20-g21-unit",
      "g28-g29-reference"
    ],
    "type": "auxiliary"
  },
  {
    "id": "g20-g21-unit",
    "category": "常用代码",
    "title": "G20 / G21 英制与公制切换",
    "code": "G20 G21",
    "summary": "单位切换不是高频操作，但一旦看错，整段尺寸都会错得很离谱。",
    "usage": "适合学习程序单位概念和跨资料阅读。",
    "beginner": "先记住国内大多数学习和现场默认是公制。",
    "warning": "单位理解错，尺寸错误会非常大。",
    "risk": "高",
    "source": "04_数控知识库 / 编程基础",
    "tags": [
      "G20",
      "G21",
      "英制",
      "公制"
    ],
    "imageUrl": "./assets/images/batch01_core/unit-g20-g21-001.webp",
    "thumbnails": [
      "./assets/images/batch01_core/unit-g20-g21-001.webp"
    ],
    "difficulty": 4,
    "estimatedTime": 12,
    "prerequisites": "g04-dwell",
    "nextRecommend": "g28-g29-reference",
    "relatedIds": [
      "learn-program-structure",
      "learn-absolute-incremental",
      "calc-thread-pitch"
    ],
    "type": "auxiliary",
    "quickCheck": [
      "当前输入程序图纸单位是毫米（G21）还是英寸（G20）？",
      "在程序中切换单位前，是否确认机床内部参数已被置于对应物理系统？",
      "切换G20/G21指令是否独立位于程序第一行，且后续无其他移动动作？",
      "工件原点寄存器（G54）中的数值是否已根据单位系统做了单位转换？",
      "对刀偏置值（H/D）是否已更换为对应单位系统的刀长读数？"
    ],
    "toolIds": [
      "unit"
    ],
    "params": [
      {
        "label": "毫米值",
        "name": "mm",
        "value": "25.4",
        "unit": "mm",
        "toolId": "unit"
      },
      {
        "label": "英寸值",
        "name": "inch",
        "value": "1.0",
        "unit": "inch",
        "toolId": "unit"
      }
    ],
    "nextId": "calc-thread-pitch"
  },
  {
    "id": "g28-g29-reference",
    "category": "常用代码",
    "title": "G28 / G29 参考点返回",
    "code": "G28 G29",
    "summary": "这是和回参考点有关的常用指令，适合理解程序里如何让机床回到参考位置。",
    "usage": "适合看程序避让、换刀前动作和参考点操作。",
    "beginner": "先理解参考点是什么，再看代码会更容易。",
    "warning": "不了解中间点和返回逻辑时，不要机械照抄。",
    "risk": "中",
    "source": "04_数控知识库 / 编程基础",
    "tags": [
      "G28",
      "G29",
      "参考点",
      "返回"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 3,
    "estimatedTime": 12,
    "prerequisites": "g20-g21-unit",
    "nextRecommend": "g00-g01-motion",
    "relatedIds": [
      "g00-g01-motion",
      "g02-g03-arc"
    ],
    "type": "auxiliary"
  },
  {
    "id": "g00-g01-motion",
    "category": "常用代码",
    "title": "G00 / G01 快移与直线切削",
    "code": "G00 G01",
    "summary": "G00 和 G01 是最基础的运动指令，新手读程序时先分清“快速定位”和“直线切削”。",
    "usage": "适合程序开头、走刀理解和基础运动学习。",
    "beginner": "G00 不参与切削，G01 才是按进给直线运动。",
    "warning": "把 G00 当成切削走刀，是新手常见错误。",
    "example": "G00 X0 Y0\nG01 X50 F200",
    "memory": "00 快移，01 走刀。",
    "nextLearn": "下一步建议继续看 G02 / G03 圆弧插补和进给单位。",
    "risk": "中",
    "source": "04_数控知识库 / 编程基础",
    "tags": [
      "G00",
      "G01",
      "快移",
      "直线",
      "进给"
    ],
    "imageUrl": "./assets/images/batch01_core/gcode-g00-g01-001.webp",
    "thumbnails": [
      "./assets/images/batch01_core/gcode-g00-g01-001.webp"
    ],
    "difficulty": 3,
    "estimatedTime": 12,
    "prerequisites": "g28-g29-reference",
    "nextRecommend": "g02-g03-arc",
    "relatedIds": [
      "g02-g03-arc",
      "g04-dwell",
      "g94-g95-feed"
    ],
    "type": "core",
    "quickCheck": [
      "机床控制面板的快速进给修调倍率（G00 Override）是否调低至25%或以下？",
      "是否确认G00下刀路径上无工件压板、夹具或凸出部件？",
      "切削进给速度（F）在G01执行前是否已指定有效数值？",
      "G00转换为G01的切入过渡点高度是否高于工件表面5mm以上？",
      "首件空运行（Dry Run）时刀具是否在半空中悬空核对？"
    ],
    "toolIds": [
      "feed",
      "surface-speed"
    ],
    "params": [
      {
        "label": "刀具直径",
        "name": "diameter",
        "value": "10",
        "unit": "mm",
        "toolId": "surface-speed"
      },
      {
        "label": "主轴转速",
        "name": "rpm",
        "value": "3000",
        "unit": "r/min",
        "toolId": "feed"
      },
      {
        "label": "每齿进给",
        "name": "fz",
        "value": "0.08",
        "unit": "mm/z",
        "toolId": "feed"
      },
      {
        "label": "刀具齿数",
        "name": "flutes",
        "value": "4",
        "unit": "z",
        "toolId": "feed"
      }
    ],
    "nextId": "g02-g03-arc"
  },
  {
    "id": "g02-g03-arc",
    "category": "常用代码",
    "title": "G02 / G03 圆弧插补",
    "code": "G02 G03",
    "aliases": [
      "圆弧",
      "圆弧插补",
      "顺圆",
      "逆圆",
      "顺时针",
      "逆时针"
    ],
    "summary": "圆弧插补是数控编程的基础难点之一，方向、平面和终点都要一起看。",
    "usage": "适合圆弧编程、轮廓加工和方向判断入门。",
    "beginner": "先确认当前平面，再看顺时针还是逆时针。",
    "warning": "平面不对、终点不对、半径不对，圆弧都会出错。",
    "example": "G17\nG02 X20 Y10 I10 J0\nG03 X0 Y0 I-10 J0",
    "memory": "G02 顺，G03 逆，先看平面。",
    "nextLearn": "下一步建议继续看 G41 / G42 刀补和 G04 暂停。",
    "risk": "高",
    "source": "04_数控知识库 / 编程基础",
    "tags": [
      "G02",
      "G03",
      "圆弧",
      "插补",
      "顺逆"
    ],
    "imageUrl": "./assets/images/batch01_core/gcode-g02-g03-001.webp",
    "thumbnails": [
      "./assets/images/batch01_core/gcode-g02-g03-001.webp",
      "./assets/images/batch02_operation_basics/arc-r-vs-ik-001.webp"
    ],
    "difficulty": 4,
    "estimatedTime": 12,
    "prerequisites": "g00-g01-motion",
    "nextRecommend": "g40-cancel-comp",
    "relatedIds": [
      "g00-g01-motion",
      "learn-g17-g18-g19",
      "g40-cancel-comp"
    ],
    "type": "core",
    "quickCheck": [
      "圆弧插补方向是顺时针（G02）还是逆时针（G03）？是否与图纸走向一致？",
      "如果使用R写法，R值正负号是否根据圆弧角度（大于或小于180度）确认过？",
      "如果使用I/K写法，中心坐标矢量方向和增量值是否计算正确？",
      "当前平面选择（G17/G18/G19）是否已正确设置以防圆弧插补报警？",
      "圆弧切入和切出时是否指定了正确的刀补引入直线段？"
    ],
    "toolIds": [
      "feed"
    ],
    "params": [
      {
        "label": "圆弧半径",
        "name": "radius",
        "value": "12.5",
        "unit": "mm",
        "toolId": "feed"
      },
      {
        "label": "每齿进给",
        "name": "fz",
        "value": "0.05",
        "unit": "mm/z",
        "toolId": "feed"
      },
      {
        "label": "刀具齿数",
        "name": "flutes",
        "value": "2",
        "unit": "z",
        "toolId": "feed"
      }
    ],
    "nextId": "learn-g17-g18-g19"
  },
  {
    "id": "g40-cancel-comp",
    "category": "常用代码",
    "title": "G40 取消刀补",
    "code": "G40",
    "aliases": [
      "取消刀补",
      "刀补取消",
      "G40取消"
    ],
    "summary": "G40 用来取消刀具半径补偿，常和 G41/G42 配合使用。",
    "usage": "适合轮廓加工收尾、刀补退出和程序结构理解。",
    "beginner": "刀补开了以后，结束前通常要记得正确取消。",
    "warning": "取消刀补的位置和方向不对，会造成轮廓突变。",
    "example": "G41 ...\nG40\nG00 X0 Y0",
    "memory": "开刀补要 G41/G42，关刀补看 G40。",
    "nextLearn": "下一步建议继续看 G01 走刀和安全退刀动作。",
    "risk": "高",
    "source": "04_数控知识库 / G代码编程",
    "tags": [
      "G40",
      "刀补",
      "取消",
      "轮廓"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 4,
    "estimatedTime": 12,
    "prerequisites": "g02-g03-arc",
    "nextRecommend": "g53-machine-coordinate",
    "relatedIds": [
      "g53-machine-coordinate",
      "g94-g95-feed"
    ],
    "type": "auxiliary"
  },
  {
    "id": "g53-machine-coordinate",
    "category": "常用代码",
    "title": "G53 机床坐标调用",
    "code": "G53",
    "summary": "G53 常用于按机床坐标快速回安全位置，不受工件坐标影响。",
    "usage": "适合换刀、退到安全位和程序收尾理解。",
    "beginner": "先把 G53 理解成‘回机床自己的坐标’。",
    "warning": "别把 G53 和 G54 工件坐标混在一起。",
    "example": "G53 G00 Z0\nG53 G00 X0 Y0",
    "memory": "G53 看机床坐标，不看工件零点。",
    "nextLearn": "下一步建议继续看 G28 参考点返回和安全退刀流程。",
    "risk": "中",
    "source": "04_数控知识库 / G代码编程",
    "tags": [
      "G53",
      "机床坐标",
      "安全",
      "回位"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 3,
    "estimatedTime": 12,
    "prerequisites": "g40-cancel-comp",
    "nextRecommend": "g94-g95-feed",
    "relatedIds": [
      "g94-g95-feed",
      "g76-thread-cycle"
    ],
    "type": "auxiliary"
  },
  {
    "id": "g94-g95-feed",
    "category": "常用代码",
    "title": "G94 / G95 进给方式",
    "code": "G94 G95",
    "aliases": [
      "进给方式",
      "每分钟进给",
      "每转进给"
    ],
    "summary": "G94 和 G95 决定进给是按每分钟还是按每转计算，新手算参数必须分清。",
    "usage": "适合进给换算、车削与铣削区别理解。",
    "beginner": "G94 常见为每分钟进给，G95 常见为每转进给。",
    "warning": "进给方式错了，表面质量和刀具负荷都会明显异常。",
    "example": "G94 F300\nG95 F0.2",
    "memory": "94 按分钟，95 按每转。",
    "nextLearn": "下一步建议继续看切削速度、转速和进给量换算。",
    "risk": "高",
    "source": "04_数控知识库 / G代码编程",
    "tags": [
      "G94",
      "G95",
      "进给",
      "换算",
      "每转"
    ],
    "imageUrl": "./assets/images/batch01_core/feed-g94-g95-001.webp",
    "thumbnails": [
      "./assets/images/batch01_core/feed-g94-g95-001.webp"
    ],
    "difficulty": 4,
    "estimatedTime": 12,
    "prerequisites": "g53-machine-coordinate",
    "nextRecommend": "g76-thread-cycle",
    "relatedIds": [
      "g00-g01-motion",
      "m03-m04-m05",
      "calc-feed"
    ],
    "type": "auxiliary",
    "quickCheck": [
      "当前是分进给模式（G94，mm/min）还是转进给模式（G95，mm/r）？",
      "车床编程中切削螺纹或普通车削，F值是否已根据G95核对为小数（如F0.25）？",
      "铣床编程中，G94下的F值是否根据主轴转速换算正确（如F800）？",
      "进给速度修调旋钮（Feedrate Override）是否置于100%或正常范围？",
      "进给轴在运行大F值切入时，其机床伺服负荷率是否处于安全红线内？"
    ],
    "toolIds": [
      "feed"
    ],
    "params": [
      {
        "label": "主轴转速S",
        "name": "rpm",
        "value": "2000",
        "unit": "r/min",
        "toolId": "feed"
      },
      {
        "label": "每转进给f",
        "name": "feed_r",
        "value": "0.2",
        "unit": "mm/rev",
        "toolId": "feed"
      }
    ],
    "nextId": "calc-feed"
  },
  {
    "id": "g76-thread-cycle",
    "category": "常用代码",
    "title": "G76 螺纹循环",
    "code": "G76",
    "aliases": [
      "螺纹",
      "螺纹循环",
      "车螺纹"
    ],
    "summary": "G76 是常见的螺纹车削循环，理解参数段和退刀逻辑很重要。",
    "usage": "适合车削螺纹编程、循环结构和参数读取入门。",
    "beginner": "先确认螺距、牙型、终点和刀具方向。",
    "warning": "G76 参数较多，直接照抄很容易出错。",
    "example": "G76 X18.0 Z-20.0 P.. Q.. R..\nG76 X... Z... P.. Q.. F1.5",
    "memory": "先看螺距，再看终点，再看刀路。",
    "nextLearn": "下一步建议继续看 G84 攻丝循环和螺纹标准。",
    "risk": "高",
    "source": "04_数控知识库 / G代码编程",
    "tags": [
      "G76",
      "螺纹",
      "车削",
      "循环"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 4,
    "estimatedTime": 12,
    "prerequisites": "g94-g95-feed",
    "nextRecommend": "g80-cancel-cycle",
    "relatedIds": [
      "g80-cancel-cycle",
      "g98-g99-return"
    ],
    "type": "auxiliary"
  },
  {
    "id": "g80-cancel-cycle",
    "category": "常用代码",
    "title": "G80 取消固定循环",
    "code": "G80",
    "summary": "G80 用于取消钻孔、攻丝等固定循环，避免后续程序继续沿用循环模式。",
    "usage": "适合钻孔程序收尾、循环切换和新手读程序。",
    "beginner": "看到 G81/G83/G84 后，要知道 G80 是退出这些循环的常用写法。",
    "warning": "忘记取消循环，后面的普通运动可能被当成循环段处理。",
    "example": "G81 X10 Y10 Z-20 R2 F120\nG80",
    "memory": "有循环就要会关循环。",
    "nextLearn": "下一步建议继续看 G98/G99 返回平面模式。",
    "risk": "中",
    "source": "04_数控知识库 / G代码编程",
    "tags": [
      "G80",
      "循环",
      "取消",
      "钻孔"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 3,
    "estimatedTime": 12,
    "prerequisites": "g76-thread-cycle",
    "nextRecommend": "g98-g99-return",
    "relatedIds": [
      "g98-g99-return",
      "g96-g97-spindle"
    ],
    "type": "auxiliary"
  },
  {
    "id": "g98-g99-return",
    "category": "常用代码",
    "title": "G98 / G99 返回平面",
    "code": "G98 G99",
    "summary": "G98 和 G99 决定固定循环结束后回到初始点还是回到 R 平面。",
    "usage": "适合钻孔循环、孔加工和安全高度理解。",
    "beginner": "先把它看成‘循环结束后回哪一层’。",
    "warning": "返回模式看错，钻孔动作会比预期更高或更低。",
    "example": "G98 G81 ...\nG99 G81 ...",
    "memory": "98 回初始，99 回 R 面。",
    "nextLearn": "下一步建议继续看 G81/G83/G84 的区别。",
    "risk": "中",
    "source": "04_数控知识库 / G代码编程",
    "tags": [
      "G98",
      "G99",
      "返回平面",
      "固定循环"
    ],
    "imageUrl": "./assets/images/batch01_core/cycle-g98-g99-001.webp",
    "thumbnails": [
      "./assets/images/batch01_core/cycle-g98-g99-001.webp"
    ],
    "difficulty": 3,
    "estimatedTime": 12,
    "prerequisites": "g80-cancel-cycle",
    "nextRecommend": "g96-g97-spindle",
    "relatedIds": [
      "g96-g97-spindle",
      "m30-program-end"
    ],
    "type": "auxiliary"
  },
  {
    "id": "g96-g97-spindle",
    "category": "常用代码",
    "title": "G96 / G97 恒线速与固定转速",
    "code": "G96 G97",
    "summary": "G96 是恒线速，G97 是固定转速，车削学习里经常一起出现。",
    "usage": "适合车削外圆、端面和转速换算入门。",
    "beginner": "先知道 G96 不是固定转速，而是跟直径变化联动。",
    "warning": "没设好最高转速限制时，小直径段可能转得过高。",
    "example": "G96 S180\nG97 S800",
    "memory": "96 看线速，97 看固定转速。",
    "nextLearn": "下一步建议继续看 Vc、n 和 F 的换算。",
    "risk": "高",
    "source": "04_数控知识库 / G代码编程",
    "tags": [
      "G96",
      "G97",
      "恒线速",
      "转速",
      "车削"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 4,
    "estimatedTime": 12,
    "prerequisites": "g98-g99-return",
    "nextRecommend": "m30-program-end",
    "relatedIds": [
      "m30-program-end",
      "m03-m04-m05"
    ],
    "type": "auxiliary"
  },
  {
    "id": "m30-program-end",
    "category": "常用代码",
    "title": "M30 程序结束与复位",
    "code": "M30",
    "summary": "M30 用于程序结束并回到开头，是很多机床程序的标准收尾写法。",
    "usage": "适合程序结尾、循环结束和调试理解。",
    "beginner": "M30 不只是停机，还通常会让程序回到开始位置。",
    "warning": "别把 M30 和 M00、M01 混成一类。",
    "example": "M05\nM09\nM30",
    "memory": "结束前先停主轴，再关冷却，再 M30。",
    "nextLearn": "下一步建议继续看 M00 / M01 程序停止。",
    "risk": "中",
    "source": "04_数控知识库 / G代码编程",
    "tags": [
      "M30",
      "结束",
      "复位",
      "程序"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 3,
    "estimatedTime": 12,
    "prerequisites": "g96-g97-spindle",
    "nextRecommend": "m03-m04-m05",
    "relatedIds": [
      "m03-m04-m05",
      "m06-tool-change"
    ],
    "type": "core"
  },
  {
    "id": "m03-m04-m05",
    "category": "常用代码",
    "title": "M03 / M04 / M05 主轴控制",
    "code": "M03 M04 M05",
    "summary": "主轴正转、反转、停止是最基础也最常用的M代码，新手必须非常熟。",
    "usage": "适合入门编程、上机操作和程序阅读。",
    "beginner": "先记住主轴转向，再结合刀具和加工方向理解。",
    "warning": "主轴方向错了，加工状态可能完全相反。",
    "risk": "高",
    "source": "04_数控知识库 / 编程基础",
    "tags": [
      "M03",
      "M04",
      "M05",
      "主轴"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 4,
    "estimatedTime": 12,
    "prerequisites": "m30-program-end",
    "nextRecommend": "m06-tool-change",
    "relatedIds": [
      "m30-program-end",
      "m08-m09-coolant",
      "g96-g97-spindle"
    ],
    "type": "core",
    "quickCheck": [
      "正转（M03）方向是否对应右旋切削刀具的主方向（从上往下看顺时针）？",
      "是否确认主轴转速S代码已被指定？未指定S时直接M03可能不转或报警。",
      "主轴换挡或变频器转速到达信号（Spindle Speed Arrival）是否正常建立？",
      "切削完毕或执行对刀、手动测量前是否已使用 M05 停止主轴旋转？",
      "高速主轴开机前，是否已执行 3-5 分钟的低速热机程序？"
    ],
    "toolIds": [
      "speed",
      "surface-speed"
    ],
    "params": [
      {
        "label": "刀具直径",
        "name": "diameter",
        "value": "50",
        "unit": "mm",
        "toolId": "surface-speed"
      },
      {
        "label": "线速度Vc",
        "name": "vc",
        "value": "250",
        "unit": "m/min",
        "toolId": "speed"
      }
    ],
    "nextId": "m08-m09-coolant"
  },
  {
    "id": "m06-tool-change",
    "category": "常用代码",
    "title": "M06 自动换刀",
    "code": "M06",
    "summary": "加工中心高频M代码，适合配合刀长补偿、刀具号和换刀流程一起学。",
    "usage": "适合学习加工中心程序结构。",
    "beginner": "先知道换的是哪把刀，再看为什么后面要跟刀补。",
    "warning": "换刀、刀号和补偿常被新手拆不开理解。",
    "risk": "中",
    "source": "04_数控知识库 / 编程基础",
    "tags": [
      "M06",
      "换刀",
      "加工中心",
      "刀具"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 3,
    "estimatedTime": 12,
    "prerequisites": "m03-m04-m05",
    "nextRecommend": "m08-m09-coolant",
    "relatedIds": [
      "m08-m09-coolant",
      "m00-m01-stop"
    ],
    "type": "auxiliary"
  },
  {
    "id": "m08-m09-coolant",
    "category": "常用代码",
    "title": "M08 / M09 冷却液控制",
    "code": "M08 M09",
    "summary": "冷却液相关M代码看似简单，但和排屑、降温、刀具寿命、表面质量都有关。",
    "usage": "适合理解冷却辅助动作和程序节奏。",
    "beginner": "先明白冷却液是干什么的，再看什么时候开和关。",
    "warning": "不是所有加工都能简单理解成冷却越大越好。",
    "risk": "低",
    "source": "04_数控知识库 / 编程基础",
    "tags": [
      "M08",
      "M09",
      "冷却液",
      "M代码"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 2,
    "estimatedTime": 12,
    "prerequisites": "m06-tool-change",
    "nextRecommend": "m00-m01-stop",
    "relatedIds": [
      "m00-m01-stop",
      "learn-g54-g59"
    ],
    "type": "auxiliary"
  },
  {
    "id": "m00-m01-stop",
    "category": "常用代码",
    "title": "M00 / M01 程序停止",
    "code": "M00 M01",
    "summary": "程序停止和选择停止对调试、试切和首件确认很常用。",
    "usage": "适合学习调试思路和程序节拍控制。",
    "beginner": "先理解暂停和结束不是一回事。",
    "warning": "M00、M01、M30 这几类代码新手常混。",
    "risk": "低",
    "source": "04_数控知识库 / 编程基础",
    "tags": [
      "M00",
      "M01",
      "程序停止",
      "调试"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 2,
    "estimatedTime": 12,
    "prerequisites": "m08-m09-coolant",
    "nextRecommend": "fanuc-param-backup",
    "relatedIds": [
      "learn-g54-g59",
      "learn-g17-g18-g19"
    ],
    "type": "auxiliary"
  },
  {
    "id": "fanuc-alarm-common",
    "category": "FANUC报警",
    "title": "FANUC 常见报警代码解析",
    "code": "报警代码",
    "aliases": [
      "报警",
      "报警代码",
      "故障代码"
    ],
    "summary": "适合做报警总入口。新手先别追求把所有报警背下来，先学怎么按类别看。",
    "usage": "机床报警后快速定位方向。",
    "beginner": "先看报警属于程序、伺服、主轴还是换刀类。",
    "warning": "同一个报警号在不同动作下原因可能不同。",
    "risk": "中",
    "source": "04_数控知识库 / 编程基础",
    "tags": [
      "FANUC",
      "报警",
      "代码",
      "排查"
    ],
    "imageUrl": "./assets/images/batch02_operation_basics/alarm-category-overview-001.webp",
    "thumbnails": [
      "./assets/images/batch02_operation_basics/alarm-category-overview-001.webp"
    ],
    "difficulty": 3,
    "estimatedTime": 10,
    "prerequisites": null,
    "nextRecommend": "learn-fanuc-alarm-common",
    "relatedIds": [
      "learn-fanuc-alarm-common"
    ],
    "type": "auxiliary"
  },
  {
    "id": "fault-limit-switch",
    "category": "报警排查",
    "title": "限位与超程类问题排查",
    "code": "超程 限位",
    "summary": "超程和限位是新手现场最容易遇到也最容易慌的故障之一，适合先建立排查顺序。",
    "usage": "适合学习机床移动类故障的基础判断。",
    "beginner": "先判断是真超程还是参考点、参数、坐标异常。",
    "warning": "别看到超程就急着乱改参数。",
    "risk": "高",
    "source": "知识库整理 / 高风险常见问题",
    "tags": [
      "超程",
      "限位",
      "故障",
      "排查"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 4,
    "estimatedTime": 10,
    "prerequisites": "alarm-atc",
    "nextRecommend": "fault-home-fail",
    "relatedIds": [
      "fault-home-fail",
      "fault-home-reference"
    ],
    "type": "auxiliary"
  },
  {
    "id": "fault-home-fail",
    "category": "报警排查",
    "title": "回不了零点时先查什么",
    "code": "回零异常",
    "summary": "回不了零点是新手很容易遇到的问题，适合配合1815等相关参数一起看。",
    "usage": "适合回零异常、参考点异常和参数排查入门。",
    "beginner": "先看机床状态、轴动作和报警信息，再看参数。",
    "warning": "不要一遇到回零异常就直接改参数。",
    "risk": "高",
    "source": "现场高频问题整理",
    "tags": [
      "回零",
      "零点",
      "参数",
      "故障"
    ],
    "imageUrl": "./assets/images/batch01_core/fault-home-fail-001.webp",
    "thumbnails": [
      "./assets/images/batch01_core/fault-home-fail-001.webp"
    ],
    "difficulty": 4,
    "estimatedTime": 10,
    "prerequisites": "fault-limit-switch",
    "nextRecommend": "fault-home-reference",
    "relatedIds": [
      "fault-home-reference",
      "alarm-servo"
    ],
    "type": "auxiliary"
  },
  {
    "id": "fault-home-reference",
    "category": "报警排查",
    "title": "回零失败与参考点异常",
    "code": "回零 参考点",
    "aliases": [
      "回零失败",
      "回零异常",
      "参考点异常",
      "找不到零点"
    ],
    "summary": "回零失败是新手上机很常见的问题，先看轴动作、机床状态和报警信息，再看参数。",
    "usage": "适合回零异常、参考点异常和回零失败的快速排查。",
    "beginner": "先确认机床是不是已经发出了回零动作，再看机械和电气链路。",
    "warning": "不要一看到回零失败就直接改参数，先排基础状态。",
    "example": "先看机床状态\n再看轴动作\n再看限位、开关和相关参数",
    "memory": "先动作，再状态，最后参数。",
    "nextLearn": "下一步建议继续看超程和限位类问题排查。",
    "risk": "高",
    "source": "04_数控知识库 / 故障维修",
    "tags": [
      "回零",
      "参考点",
      "异常",
      "排查"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 4,
    "estimatedTime": 10,
    "prerequisites": "fault-home-fail",
    "nextRecommend": "tool-life",
    "relatedIds": [
      "alarm-servo",
      "alarm-spindle"
    ],
    "type": "auxiliary"
  },
  {
    "id": "process-allowance-basics",
    "category": "加工工艺",
    "title": "粗加工 / 半精加工 / 精加工余量逻辑",
    "code": "加工余量",
    "aliases": [
      "余量",
      "粗加工",
      "半精加工",
      "精加工",
      "余量逻辑"
    ],
    "summary": "余量不是一个数字，而是一套分阶段留量思路。新手把这个逻辑学会后，工艺理解会快很多。",
    "usage": "适合工艺入门、程序安排和工序理解。",
    "beginner": "先学为什么要分粗、半精、精，再看具体余量。",
    "warning": "别把别人一个余量值当成万能答案。",
    "risk": "中",
    "source": "04_数控知识库 / 编程基础",
    "tags": [
      "余量",
      "粗加工",
      "精加工",
      "工艺"
    ],
    "imageUrl": "./assets/images/batch03_turning_process/turning-allowance-flow-001.webp",
    "thumbnails": [
      "./assets/images/batch03_turning_process/turning-allowance-flow-001.webp"
    ],
    "difficulty": 3,
    "estimatedTime": 10,
    "prerequisites": null,
    "nextRecommend": "process-surface-roughness",
    "relatedIds": [
      "learn-g41-g42",
      "process-surface-roughness",
      "quick-allowance-card"
    ],
    "type": "auxiliary",
    "quickCheck": [
      "粗加工的单边留量是否均匀？是否能保证精加工刀具切削负荷恒定？",
      "半精加工是否清除了粗加工在大拐角处遗留的残留材料（残料清角）？",
      "精加工吃刀深度（ap）是否大于刀具刀尖圆弧半径（RE），以防刮擦？",
      "加工硬化材质时，精加工余量是否深于上道工序造成的表层硬化层？",
      "精加工首件加工后，是否立即停机检测核心尺寸并微调D/H刀补？"
    ],
    "toolIds": [
      "roughness"
    ],
    "params": [
      {
        "label": "要求Ra",
        "name": "ra",
        "value": "1.6",
        "unit": "um",
        "toolId": "roughness"
      },
      {
        "label": "刀尖半径RE",
        "name": "re",
        "value": "0.8",
        "unit": "mm",
        "toolId": "roughness"
      }
    ],
    "nextId": "process-surface-roughness"
  },
  {
    "id": "process-surface-roughness",
    "category": "加工工艺",
    "title": "表面粗糙度标准与选用",
    "code": "Ra",
    "aliases": [
      "粗糙度",
      "表面粗糙度",
      "Ra值"
    ],
    "summary": "表面粗糙度是图纸上高频出现的指标之一，适合新手先学怎么看，再学怎么做出来。",
    "usage": "适合图纸学习、工艺理解和检测基础。",
    "beginner": "先理解粗糙度是什么，再看数字大小代表什么水平。",
    "warning": "粗糙度不是只靠一刀慢慢走就能解决的。",
    "risk": "低",
    "source": "04_数控知识库 / 编程基础",
    "tags": [
      "粗糙度",
      "Ra",
      "图纸",
      "工艺"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 2,
    "estimatedTime": 10,
    "prerequisites": "process-allowance-basics",
    "nextRecommend": "drawing-symbol",
    "relatedIds": [
      "process-allowance-basics",
      "quick-allowance-card",
      "quick-insert-card"
    ],
    "type": "auxiliary",
    "quickCheck": [
      "图纸标注的粗糙度（如Ra1.6/Ra3.2）是否转化为加工时的转速/进给指标？",
      "精车或精铣时的每转进给量f是否已根据RE半径用公式限制？",
      "刀片刃口是否无崩刃、积屑瘤或过度磨损？这会直接恶化表面光洁度。",
      "是否确认主轴未发生高频共振或滑台轴承间隙晃动导致刀纹颤振？",
      "精加工时切削液喷淋角度是否直指切削区以冲走微细切屑防划伤？"
    ],
    "toolIds": [
      "roughness"
    ],
    "params": [
      {
        "label": "目标Ra",
        "name": "ra",
        "value": "1.6",
        "unit": "um",
        "toolId": "roughness"
      },
      {
        "label": "刀尖圆角RE",
        "name": "re",
        "value": "0.4",
        "unit": "mm",
        "toolId": "roughness"
      }
    ],
    "nextId": "quick-allowance-card"
  },
  {
    "id": "drawing-symbol",
    "category": "图纸识读",
    "title": "图纸符号与尺寸标注入门",
    "code": "图纸符号",
    "aliases": [
      "机械制图",
      "尺寸标注",
      "图纸识读",
      "公差",
      "粗糙度"
    ],
    "summary": "新手看图纸最先要认识的不是复杂工艺，而是尺寸、公差、粗糙度和常见符号。先看懂图，后面加工才不容易跑偏。",
    "usage": "适合图纸识读入门、尺寸理解和公差概念建立。",
    "beginner": "先把尺寸线、标注值、公差和粗糙度符号分清楚。",
    "warning": "只看数字不看符号，容易把图纸要求理解错。",
    "example": "先看基本尺寸，再看公差带，再看粗糙度要求，最后确认加工基准。",
    "memory": "先看尺寸，再看公差，再看表面要求。",
    "nextLearn": "下一步建议继续看表面粗糙度和形位公差。",
    "risk": "中",
    "source": "04_数控知识库 / 编程基础",
    "tags": [
      "图纸",
      "机械制图",
      "尺寸标注",
      "公差",
      "粗糙度"
    ],
    "imageUrl": "./assets/images/batch05_alarm_drawing_material/drawing-gdt-basic-001.webp",
    "thumbnails": [
      "./assets/images/batch05_alarm_drawing_material/drawing-gdt-basic-001.webp"
    ],
    "difficulty": 3,
    "estimatedTime": 10,
    "prerequisites": null,
    "nextRecommend": "learn-g17-g18-g19",
    "relatedIds": [],
    "type": "auxiliary"
  },
  {
    "id": "tool-insert-brand",
    "category": "刀具工艺",
    "title": "刀具品牌与牌号认知入门",
    "code": "刀具牌号",
    "summary": "新手经常看到一堆牌号就懵。这个条目适合先建立‘品牌、牌号、材料、用途’之间的对应关系。",
    "usage": "适合刀具选型入门和现场沟通。",
    "beginner": "先别追着背牌号，先知道它是给谁用的。",
    "warning": "牌号和材料、工况不匹配时，再贵也不好用。",
    "risk": "低",
    "source": "04_数控知识库 / 刀具工艺",
    "tags": [
      "刀具",
      "牌号",
      "品牌",
      "选型"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 2,
    "estimatedTime": 10,
    "prerequisites": "tool-coating",
    "nextRecommend": "tool-drill-selection",
    "relatedIds": [
      "tool-drill-selection",
      "tool-thread-tap"
    ],
    "type": "auxiliary"
  },
  {
    "id": "tool-drill-selection",
    "category": "刀具工艺",
    "title": "钻头选型与切削基础",
    "code": "钻头选型",
    "summary": "钻孔是新手高频动作之一，钻头类型、材料和孔深理解很关键。",
    "usage": "适合钻孔学习、钻头选择和深孔入门。",
    "beginner": "先分清普通钻、深孔钻和中心钻用途。",
    "warning": "钻头看起来像，但适用工况可能差很多。",
    "risk": "中",
    "source": "04_数控知识库 / 刀具工艺",
    "tags": [
      "钻头",
      "钻孔",
      "选型",
      "刀具"
    ],
    "imageUrl": "./assets/images/batch04_milling_tooling/drill-types-overview-001.webp",
    "thumbnails": [
      "./assets/images/batch04_milling_tooling/drill-types-overview-001.webp"
    ],
    "difficulty": 3,
    "estimatedTime": 10,
    "prerequisites": "tool-insert-brand",
    "nextRecommend": "tool-thread-tap",
    "relatedIds": [
      "learn-g81-g83",
      "tool-thread-tap",
      "material-carbon-steel"
    ],
    "type": "auxiliary",
    "quickCheck": [
      "钻头类型（麻花钻/定心钻/内冷合金钻）是否与孔深及排屑要求相符？",
      "加工中心高精度孔加工前，是否使用了定心钻（Spot Drill）预打中心孔？",
      "合金钻头切入斜面或圆弧面时，是否确认进给降至正常的25%以下？",
      "切削液压力是否调高（内冷孔必须开启高压内冷泵）以带走深孔切屑？",
      "钻削钢件或不锈钢时，切屑是否呈现断裂状，而非连续带状缠绕？"
    ],
    "toolIds": [
      "speed",
      "feed"
    ],
    "params": [
      {
        "label": "钻头直径",
        "name": "diameter",
        "value": "10",
        "unit": "mm",
        "toolId": "speed"
      },
      {
        "label": "切削速度Vc",
        "name": "vc",
        "value": "80",
        "unit": "m/min",
        "toolId": "speed"
      },
      {
        "label": "每转进给f",
        "name": "fr",
        "value": "0.15",
        "unit": "mm/r",
        "toolId": "feed"
      }
    ],
    "nextId": "tool-thread-tap"
  },
  {
    "id": "tool-thread-tap",
    "category": "刀具工艺",
    "title": "丝锥攻丝入门",
    "code": "丝锥 攻丝",
    "summary": "丝锥和攻丝是新手现场高频话题，适合和G84、螺距、底孔一起学习。",
    "usage": "适合攻丝基础和螺纹学习配套。",
    "beginner": "先知道底孔、螺距和丝锥类型是什么关系。",
    "warning": "攻丝最怕没搞清底孔和同步关系。",
    "example": "先确认螺纹规格\n再查底孔\n再看攻丝方式和螺距同步",
    "memory": "先底孔，再螺距，再攻丝。",
    "nextLearn": "下一步建议继续看 G84 攻丝循环和螺纹规格速查。",
    "risk": "高",
    "source": "04_数控知识库 / 刀具工艺",
    "tags": [
      "丝锥",
      "攻丝",
      "螺纹",
      "底孔"
    ],
    "imageUrl": "./assets/images/batch04_milling_tooling/milling-drill-ream-tap-001.webp",
    "thumbnails": [
      "./assets/images/batch04_milling_tooling/milling-drill-ream-tap-001.webp"
    ],
    "difficulty": 4,
    "estimatedTime": 10,
    "prerequisites": "tool-drill-selection",
    "nextRecommend": "material-stainless",
    "relatedIds": [
      "learn-g84",
      "tool-drill-selection",
      "quick-thread"
    ],
    "type": "auxiliary",
    "quickCheck": [
      "丝锥类别是直槽（铸铁/断屑料）、螺旋槽（盲孔排屑）还是挤压丝锥（无屑）？",
      "所用的攻丝底孔钻头直径是否符合标准牙型计算值（D - P）？",
      "攻丝轴线是否与工件表面垂直度良好？工件夹紧是否无偏摆？",
      "是否确认机床主轴反转进给修调倍率置于100%锁死状态？",
      "螺旋丝锥加工盲孔时，孔底排屑间隙深度是否预留了3-5mm？"
    ],
    "toolIds": [
      "feed",
      "speed"
    ],
    "params": [
      {
        "label": "丝锥规格",
        "name": "diameter",
        "value": "6",
        "unit": "mm",
        "toolId": "speed"
      },
      {
        "label": "螺距P",
        "name": "pitch",
        "value": "1.0",
        "unit": "mm",
        "toolId": "feed"
      },
      {
        "label": "转速S",
        "name": "rpm",
        "value": "250",
        "unit": "r/min",
        "toolId": "feed"
      }
    ],
    "nextId": "quick-thread"
  },
  {
    "id": "material-carbon-steel",
    "category": "材料加工",
    "title": "常见钢材加工基础",
    "code": "钢材加工",
    "aliases": [
      "钢材",
      "碳钢",
      "合金钢",
      "不锈钢"
    ],
    "summary": "适合新手建立‘不同钢材切削感觉并不一样’的第一印象。",
    "usage": "材料基础、切削差异入门。",
    "beginner": "先知道碳钢、合金钢、不锈钢不是一回事。",
    "warning": "别把一种钢件经验直接套到所有钢材上。",
    "risk": "低",
    "source": "04_数控知识库 / 刀具工艺",
    "tags": [
      "钢材",
      "材料",
      "切削",
      "基础"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 2,
    "estimatedTime": 10,
    "prerequisites": "material-high-temp",
    "nextRecommend": "material-plastic",
    "relatedIds": [
      "material-aluminum",
      "material-stainless",
      "tool-insert-brand"
    ],
    "type": "auxiliary",
    "quickCheck": [
      "加工45号钢或普通碳钢时，切削液是否选择极压乳化液以提供润滑？",
      "刀片牌号是否选择钢件专用的P类涂层刀片（通常为黄色或双色涂层）？",
      "加工硬度高的合金钢时，切削线速度Vc是否根据手册降低20%-30%？",
      "粗车时吃刀深度（ap）是否足够，以跨过工件表面的硬皮和氧化层？",
      "精加工时是否使用高线速以避开积屑瘤产生区（避开100m/min左右）？"
    ],
    "toolIds": [
      "speed",
      "feed"
    ],
    "params": [
      {
        "label": "钢件推荐Vc",
        "name": "vc",
        "value": "180",
        "unit": "m/min",
        "toolId": "speed"
      },
      {
        "label": "刀具直径",
        "name": "diameter",
        "value": "12",
        "unit": "mm",
        "toolId": "speed"
      },
      {
        "label": "每齿进给Fz",
        "name": "fz",
        "value": "0.08",
        "unit": "mm/z",
        "toolId": "feed"
      }
    ],
    "nextId": "material-stainless"
  },
  {
    "id": "material-plastic",
    "category": "材料加工",
    "title": "工程塑料加工特点",
    "code": "工程塑料",
    "summary": "虽然不是最常见金属材料，但它很适合帮新手建立‘材料不同，工艺就不同’的思路。",
    "usage": "扩展材料视野和工艺理解。",
    "beginner": "先把它当成理解材料差异的练习样本。",
    "warning": "塑料加工的思路不能直接照搬金属件。",
    "risk": "低",
    "source": "04_数控知识库 / 刀具工艺",
    "tags": [
      "工程塑料",
      "材料",
      "加工",
      "工艺"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 2,
    "estimatedTime": 10,
    "prerequisites": "material-carbon-steel",
    "nextRecommend": "case-thin-wall",
    "relatedIds": [
      "material-stainless",
      "material-aluminum"
    ],
    "type": "auxiliary"
  },
  {
    "id": "case-flange",
    "category": "加工案例",
    "title": "法兰盘加工案例",
    "code": "法兰盘",
    "aliases": [
      "法兰",
      "法兰盘",
      "孔系零件"
    ],
    "summary": "法兰盘是很适合新手练习孔系、分布、轮廓和装夹思维的典型零件。",
    "usage": "适合案例学习和程序结构训练。",
    "beginner": "先看零件结构，再看程序和工艺安排。",
    "warning": "别只盯孔位，要一起看基准和装夹。",
    "risk": "低",
    "source": "04_数控知识库 / 加工案例",
    "tags": [
      "法兰盘",
      "案例",
      "孔系",
      "零件"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 2,
    "estimatedTime": 10,
    "prerequisites": "case-thread-part",
    "nextRecommend": "case-gear",
    "relatedIds": [
      "case-gear",
      "case-thin-wall"
    ],
    "type": "auxiliary"
  },
  {
    "id": "case-gear",
    "category": "加工案例",
    "title": "精密齿轮加工案例",
    "code": "齿轮加工",
    "aliases": [
      "齿轮",
      "齿轮件",
      "高精度案例"
    ],
    "summary": "齿轮案例偏进阶，但很适合让新手知道高精度零件为什么对工艺要求更高。",
    "usage": "作为进阶案例拓展视野。",
    "beginner": "先理解为什么齿轮件比普通外圆件要求高。",
    "warning": "高精度案例适合学习思路，不适合直接照搬工艺。",
    "risk": "中",
    "source": "04_数控知识库 / 加工案例",
    "tags": [
      "齿轮",
      "案例",
      "高精度",
      "工艺"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 3,
    "estimatedTime": 10,
    "prerequisites": "case-flange",
    "nextRecommend": "quick-fanuc-param",
    "relatedIds": [
      "case-thin-wall",
      "case-axis"
    ],
    "type": "auxiliary"
  },
  {
    "id": "quick-allowance-card",
    "category": "速查图卡",
    "title": "加工余量标准速查表",
    "code": "余量图卡",
    "summary": "很适合做手机首页里的工艺速查入口，帮助新手先建立粗加工和精加工概念。",
    "usage": "手机复习、工艺速查、学习入口。",
    "beginner": "先看阶段逻辑，再看具体数字范围。",
    "warning": "图卡是参考入口，不是固定标准答案。",
    "risk": "中",
    "source": "E盘速查表系列",
    "tags": [
      "余量",
      "图卡",
      "工艺",
      "速查"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 3,
    "estimatedTime": 10,
    "prerequisites": "quick-measure",
    "nextRecommend": "quick-insert-card",
    "relatedIds": [
      "quick-insert-card",
      "quick-cutting-card"
    ],
    "type": "auxiliary"
  },
  {
    "id": "quick-insert-card",
    "category": "速查图卡",
    "title": "刀片型号解读速查表",
    "code": "刀片图卡",
    "summary": "非常适合新手学习，每一位字母代表什么，一看就有印象。",
    "usage": "手机速查、刀具学习、客服和培训。",
    "beginner": "先拆字母含义，再学品牌和牌号。",
    "warning": "只记型号外形，不看适用工况，还是不会选刀。",
    "risk": "低",
    "source": "E盘速查表系列",
    "tags": [
      "刀片",
      "图卡",
      "刀具",
      "型号"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 2,
    "estimatedTime": 10,
    "prerequisites": "quick-allowance-card",
    "nextRecommend": "quick-cutting-card",
    "relatedIds": [
      "quick-cutting-card",
      "quick-fanuc-param"
    ],
    "type": "auxiliary"
  },
  {
    "id": "quick-cutting-card",
    "category": "速查图卡",
    "title": "切削参数速查",
    "code": "切削参数图",
    "summary": "适合和换算工具配套，让新手先把参数关系建立起来。",
    "usage": "复习公式、理解转速线速度关系。",
    "beginner": "边看图卡边算一遍，记得最快。",
    "warning": "切削参数不能脱离材料和刀具单独看。",
    "risk": "中",
    "source": "E盘速查表系列",
    "tags": [
      "切削参数",
      "图卡",
      "线速度",
      "转速"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 3,
    "estimatedTime": 10,
    "prerequisites": "quick-insert-card",
    "nextRecommend": "machine-home-return",
    "relatedIds": [
      "quick-fanuc-param",
      "quick-fanuc-alarm"
    ],
    "type": "auxiliary"
  },
  {
    "id": "learn-g20-g21",
    "category": "G代码编程",
    "title": "G20 / G21 英制与公制切换",
    "code": "G20 G21",
    "summary": "单位切换看起来简单，但一旦搞错，尺寸会直接放大或缩小十几倍。",
    "usage": "适合程序阅读、单位换算和新手防错。",
    "beginner": "先确认机床和图纸是毫米还是英寸。",
    "warning": "单位一旦混用，后果通常很明显，不要凭感觉猜。",
    "example": "G21 = 公制。\nG20 = 英制。",
    "memory": "先看单位，再看尺寸。",
    "nextLearn": "下一步建议继续看坐标值、进给单位和程序首段安全检查。",
    "risk": "高",
    "source": "04_数控知识库 / G代码编程",
    "tags": [
      "G20",
      "G21",
      "单位",
      "英制",
      "公制"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 4,
    "estimatedTime": 10,
    "prerequisites": "learn-g43-g44-g49",
    "nextRecommend": "learn-g28-g29",
    "relatedIds": [
      "learn-g28-g29",
      "learn-m03-m05"
    ],
    "type": "core"
  },
  {
    "id": "learn-g28-g29",
    "category": "G代码编程",
    "title": "G28 / G29 参考点返回",
    "code": "G28 G29",
    "summary": "参考点返回是上机安全、换刀回零和程序结束常见动作，新手必须会读。",
    "usage": "适合回零、换刀和程序收尾理解。",
    "beginner": "先把参考点看成机床的安全基准位置。",
    "warning": "没搞清楚中间点和返回方式，容易出危险动作。",
    "example": "G28 通常用于返回参考点。\nG29 通常与中间点返回配合使用。",
    "memory": "先中间，再回零。",
    "nextLearn": "下一步建议继续看 G53 机床坐标和安全停机流程。",
    "risk": "中",
    "source": "04_数控知识库 / G代码编程",
    "tags": [
      "G28",
      "G29",
      "回零",
      "参考点",
      "安全"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 3,
    "estimatedTime": 10,
    "prerequisites": "learn-g20-g21",
    "nextRecommend": "learn-m03-m05",
    "relatedIds": [
      "learn-m03-m05",
      "learn-m06"
    ],
    "type": "core"
  },
  {
    "id": "learn-m03-m05",
    "category": "G代码编程",
    "title": "M03 / M04 / M05 主轴控制",
    "code": "M03 M04 M05",
    "summary": "主轴正转、反转、停止是最基础的 M 代码，新手看程序时一定要先确认。",
    "usage": "适合开机、试切、程序开头结尾理解。",
    "beginner": "先确认刀具旋向和主轴转向是否匹配。",
    "warning": "主轴方向错了，刀具可能直接不吃刀或异常损坏。",
    "example": "M03 主轴正转。\nM04 主轴反转。\nM05 主轴停止。",
    "memory": "03 正，04 反，05 停。",
    "nextLearn": "下一步建议继续看转速 S 代码和刀具切削方向。",
    "risk": "高",
    "source": "04_数控知识库 / G代码编程",
    "tags": [
      "M03",
      "M04",
      "M05",
      "主轴",
      "转速"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 4,
    "estimatedTime": 10,
    "prerequisites": "learn-g28-g29",
    "nextRecommend": "learn-m06",
    "relatedIds": [
      "learn-m06",
      "learn-m08-m09"
    ],
    "type": "core"
  },
  {
    "id": "learn-m06",
    "category": "G代码编程",
    "title": "M06 自动换刀",
    "code": "M06",
    "summary": "M06 是加工中心高频动作，理解换刀逻辑对新手非常关键。",
    "usage": "适合程序流程、刀具管理和自动换刀入门。",
    "beginner": "换刀前先确认刀号、刀补和安全位置。",
    "warning": "没有回安全点就换刀，是常见撞刀风险。",
    "example": "T01 M06 通常表示执行 1 号刀换刀。",
    "memory": "先安全，再换刀。",
    "nextLearn": "下一步建议继续看刀号管理、刀补调用和程序分段。",
    "risk": "高",
    "source": "04_数控知识库 / G代码编程",
    "tags": [
      "M06",
      "换刀",
      "刀号",
      "加工中心"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 4,
    "estimatedTime": 10,
    "prerequisites": "learn-m03-m05",
    "nextRecommend": "learn-m08-m09",
    "relatedIds": [
      "learn-m08-m09",
      "learn-g84"
    ],
    "type": "core"
  },
  {
    "id": "learn-m08-m09",
    "category": "G代码编程",
    "title": "M08 / M09 冷却液控制",
    "code": "M08 M09",
    "summary": "冷却液控制看似简单，但与材料、刀具寿命和排屑都有关系。",
    "usage": "适合试切、精加工和加工过程理解。",
    "beginner": "先知道冷却液不是越早越多越好。",
    "warning": "某些材料和工艺需要控制冷却方式，不能一刀切。",
    "example": "M08 开冷却液。\nM09 关冷却液。",
    "memory": "08 开，09 关。",
    "nextLearn": "下一步建议继续看主轴转速、进给和切削液配合。",
    "risk": "中",
    "source": "04_数控知识库 / G代码编程",
    "tags": [
      "M08",
      "M09",
      "冷却液",
      "排屑"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 3,
    "estimatedTime": 10,
    "prerequisites": "learn-m06",
    "nextRecommend": "learn-g84",
    "relatedIds": [
      "learn-g84",
      "learn-g17-g18-g19"
    ],
    "type": "core"
  },
  {
    "id": "learn-fanuc-alarm-common",
    "category": "FANUC报警",
    "title": "FANUC 常见报警代码解析",
    "code": "报警",
    "summary": "先学会读常见报警，再学会按类别排查，是新手上机的重要能力。",
    "usage": "适合报警处理、故障排查和学习笔记。",
    "beginner": "先别慌，先看是程序类、伺服类还是限位类报警。",
    "warning": "报警号不是直接答案，必须结合上下文和操作过程看。",
    "example": "常见项可以从程序、参数、伺服、润滑、限位几个方向排查。",
    "memory": "先分类，再排查。",
    "nextLearn": "下一步建议继续看伺服报警、参数备份和机床初始化流程。",
    "risk": "高",
    "source": "04_数控知识库 / FANUC报警",
    "tags": [
      "FANUC",
      "报警",
      "故障",
      "排查"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 4,
    "estimatedTime": 10,
    "prerequisites": "fanuc-alarm-common",
    "nextRecommend": "process-allowance-basics",
    "relatedIds": [
      "fanuc-alarm-common"
    ],
    "type": "core"
  },
  {
    "id": "calc-vc-rpm",
    "category": "参数换算",
    "title": "线速度、转速换算",
    "code": "Vc n",
    "summary": "这是现场最常用的一组换算：知道线速度和直径，可以算主轴转速；反过来也能算线速度。",
    "usage": "适合铣削、车削和现场调参时快速估算。",
    "beginner": "先记住直径越小，同样线速度下转速越高。",
    "warning": "单位一旦混成 mm 和 m/min，结果会差很多。",
    "example": "n = 1000 × Vc ÷ (π × D)\nVc = π × D × n ÷ 1000",
    "memory": "线速和转速是一对换算关系。",
    "nextLearn": "下一步建议继续看进给速度和每转进给换算。",
    "risk": "中",
    "source": "04_数控知识库 / 参数换算",
    "tags": [
      "Vc",
      "n",
      "转速",
      "线速度",
      "换算"
    ],
    "imageUrl": "./assets/images/batch03_turning_process/turning-facing-001.webp",
    "thumbnails": [
      "./assets/images/batch03_turning_process/turning-facing-001.webp",
      "./assets/images/batch04_milling_tooling/milling-face-milling-001.webp"
    ],
    "difficulty": 3,
    "estimatedTime": 10,
    "prerequisites": null,
    "nextRecommend": "calc-feed",
    "relatedIds": [
      "calc-feed",
      "calc-thread-pitch"
    ],
    "type": "auxiliary"
  },
  {
    "id": "calc-feed",
    "category": "参数换算",
    "title": "进给速度换算",
    "code": "F",
    "summary": "把每转进给和主轴转速换成进给速度，是加工中最常见的现场计算之一。",
    "usage": "适合车削、铣削和循环加工时估算进给速度。",
    "beginner": "先确认你手里的是每转进给还是每分钟进给。",
    "warning": "G94 和 G95 的进给含义不一样，别直接套错。",
    "example": "F = 每转进给 × 转速",
    "memory": "每转进给乘转速，就是进给速度。",
    "nextLearn": "下一步建议继续看 G94 / G95 进给模式。",
    "risk": "中",
    "source": "04_数控知识库 / 参数换算",
    "tags": [
      "进给",
      "F",
      "G94",
      "G95",
      "换算"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 3,
    "estimatedTime": 10,
    "prerequisites": "calc-vc-rpm",
    "nextRecommend": "calc-thread-pitch",
    "relatedIds": [
      "calc-thread-pitch",
      "calc-radius-diameter"
    ],
    "type": "auxiliary"
  },
  {
    "id": "calc-thread-pitch",
    "category": "参数换算",
    "title": "螺距与 TPI 换算",
    "code": "TPI 螺距",
    "summary": "英制牙距和公制螺距经常需要互相换算，尤其是看图纸和攻丝时。",
    "usage": "适合螺纹识别、攻丝和螺纹车削入门。",
    "beginner": "先分清 TPI 是每英寸牙数，螺距是相邻牙之间的距离。",
    "warning": "不要把牙数直接当成螺距。",
    "example": "螺距 = 25.4 ÷ TPI",
    "memory": "25.4 是英寸和毫米换算的关键数。",
    "nextLearn": "下一步建议继续看 G76 和 G84 螺纹/攻丝循环。",
    "risk": "中",
    "source": "04_数控知识库 / 参数换算",
    "tags": [
      "TPI",
      "螺距",
      "螺纹",
      "换算"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 3,
    "estimatedTime": 10,
    "prerequisites": "calc-feed",
    "nextRecommend": "calc-radius-diameter",
    "relatedIds": [
      "calc-radius-diameter",
      "calc-vc-rpm"
    ],
    "type": "auxiliary"
  },
  {
    "id": "calc-radius-diameter",
    "category": "参数换算",
    "title": "半径与直径换算",
    "code": "R D",
    "summary": "看图、对刀、编程时，半径和直径换算经常会用到，必须能秒算。",
    "usage": "适合图纸阅读、轮廓理解和现场复核。",
    "beginner": "半径就是直径的一半，直径就是半径的两倍。",
    "warning": "圆弧、刀补和孔类尺寸中，半径直径很容易看错。",
    "example": "D = 2 × R\nR = D ÷ 2",
    "memory": "两倍和一半，最基础也最常见。",
    "nextLearn": "下一步建议继续看圆弧插补和刀补方向。",
    "risk": "低",
    "source": "04_数控知识库 / 参数换算",
    "tags": [
      "半径",
      "直径",
      "R",
      "D",
      "换算"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 2,
    "estimatedTime": 10,
    "prerequisites": "calc-thread-pitch",
    "nextRecommend": "diagram-prompt-coordinate",
    "relatedIds": [
      "calc-vc-rpm",
      "calc-feed"
    ],
    "type": "auxiliary"
  },
  {
    "id": "diagram-prompt-coordinate",
    "category": "图解提示词",
    "title": "坐标系教学配图提示词",
    "code": "提示词",
    "summary": "把机床坐标、工件坐标、回零和对刀关系直接变成一张新手能看懂的示意图提示词。",
    "usage": "适合给 Gemini 生成讲解配图，或者给短视频里做首张总览图。",
    "beginner": "先让画面里同时出现机床原点、工件零点和刀具位置，别只画一个坐标轴。",
    "warning": "提示词里一定要写清楚平面、箭头方向和中文标注，否则图会很花但不够准。",
    "example": "生成一张适合数控新手学习的教学示意图：白底工程风格，画出机床坐标系和工件坐标系的关系，标注机床原点、工件零点、X/Y/Z 轴正方向、回零方向、对刀位置、刀具与工件的距离。要求线条干净、中文大字清晰、颜色区分明显、像教材插图，不要写实照片风。",
    "memory": "先画总关系，再画局部细节。",
    "nextLearn": "下一步建议继续看 G54/G59 和 G28 回零的配图提示词。",
    "risk": "低",
    "source": "04_数控知识库 / 图解提示词",
    "tags": [
      "提示词",
      "配图",
      "坐标系",
      "对刀",
      "回零"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 2,
    "estimatedTime": 10,
    "prerequisites": null,
    "nextRecommend": "diagram-prompt-g02",
    "relatedIds": [
      "diagram-prompt-g02",
      "diagram-prompt-compensation"
    ],
    "type": "auxiliary"
  },
  {
    "id": "diagram-prompt-g02",
    "category": "图解提示词",
    "title": "G02 / G03 圆弧配图提示词",
    "code": "G02 G03 配图",
    "summary": "把圆弧插补方向、起点终点、R/I/J/K 参数变成一张容易理解的教学图。",
    "usage": "适合圆弧插补、刀路方向和新手易错点讲解。",
    "beginner": "要同时把顺时针、逆时针、平面选择和起终点放在同一张图里。",
    "warning": "一定要标清楚当前平面，不然 G02 和 G03 很容易画反。",
    "example": "生成一张数控圆弧插补教学图：工程教材风格，分成左右两幅，左边画 G02 顺时针圆弧，右边画 G03 逆时针圆弧；每幅图都标注起点、终点、圆心、R 值、I/J/K 方向、当前平面（XY 或 XZ）以及箭头方向。要求颜色简洁，箭头明显，中文标注清晰，适合手机端快速学习，不要复杂背景。",
    "memory": "先看平面，再看方向。",
    "nextLearn": "下一步建议继续看 G17/G18/G19 和 G41/G42 的配图提示词。",
    "risk": "中",
    "source": "04_数控知识库 / 图解提示词",
    "tags": [
      "提示词",
      "配图",
      "G02",
      "G03",
      "圆弧插补"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 3,
    "estimatedTime": 10,
    "prerequisites": "diagram-prompt-coordinate",
    "nextRecommend": "diagram-prompt-compensation",
    "relatedIds": [
      "diagram-prompt-compensation",
      "diagram-prompt-cycle"
    ],
    "type": "core"
  },
  {
    "id": "diagram-prompt-compensation",
    "category": "图解提示词",
    "title": "刀补教学配图提示词",
    "code": "G41 G42 G43",
    "summary": "把刀具左补、右补、刀长补偿和取消补偿做成可视化教学图。",
    "usage": "适合刀补新手、对刀教学和程序讲解。",
    "beginner": "重点不是背代码，而是看刀具相对轮廓往哪边偏。",
    "warning": "图里要同时画出程序路径和真实刀心路径，不然很难看懂补偿含义。",
    "example": "生成一张数控刀具补偿教学图：白底教材插图风格，画出零件轮廓、程序中心线和刀具真实走刀轨迹，分别标注 G41 左刀补、G42 右刀补、G43 刀长补偿、G49 取消补偿。要求用不同颜色显示程序轨迹和刀心轨迹，画出刀具半径方向的偏移箭头，中文大标注清晰，适合数控新手手机查看。",
    "memory": "程序线是一条线，刀心线是另一条线。",
    "nextLearn": "下一步建议继续看 G40 取消刀补和对刀流程配图提示词。",
    "risk": "中",
    "source": "04_数控知识库 / 图解提示词",
    "tags": [
      "提示词",
      "配图",
      "G41",
      "G42",
      "G43",
      "刀补"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 3,
    "estimatedTime": 10,
    "prerequisites": "diagram-prompt-g02",
    "nextRecommend": "diagram-prompt-cycle",
    "relatedIds": [
      "diagram-prompt-cycle",
      "diagram-prompt-plane"
    ],
    "type": "core"
  },
  {
    "id": "diagram-prompt-cycle",
    "category": "图解提示词",
    "title": "钻孔与攻丝循环提示词",
    "code": "G81 G83 G84",
    "summary": "把钻孔、啄钻、攻丝和返回平面的循环关系画成新手能一眼看懂的示意图。",
    "usage": "适合固定循环、孔加工和工艺入门讲解。",
    "beginner": "要把下刀、退刀、停留、回到 R 平面和返回初始点画清楚。",
    "warning": "别只画一个孔，最好把循环过程分步骤展开。",
    "example": "生成一张数控孔加工循环教学图：教材风格，画出 G81 普通钻孔、G83 啄钻、G84 攻丝三个流程对比；每个流程都分成下刀、加工、退刀、返回 R 平面四个阶段，并标注 Z 深度、R 平面、F 进给和返回方式。要求中文标签清晰、箭头明确、颜色区分三种循环，适合手机快速学习。",
    "memory": "先看下刀，再看退刀，再看返回。",
    "nextLearn": "下一步建议继续看 G98/G99 返回平面和螺纹规格提示词。",
    "risk": "中",
    "source": "04_数控知识库 / 图解提示词",
    "tags": [
      "提示词",
      "配图",
      "G81",
      "G83",
      "G84",
      "钻孔"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 3,
    "estimatedTime": 10,
    "prerequisites": "diagram-prompt-compensation",
    "nextRecommend": "diagram-prompt-plane",
    "relatedIds": [
      "diagram-prompt-plane",
      "diagram-prompt-offset"
    ],
    "type": "auxiliary"
  },
  {
    "id": "diagram-prompt-plane",
    "category": "图解提示词",
    "title": "G17 / G18 / G19 平面提示词",
    "code": "G17 G18 G19 配图",
    "summary": "把当前平面、圆弧方向和刀补工作平面画清楚，避免新手把 XY、XZ、YZ 混在一起。",
    "usage": "适合圆弧入门、刀补理解和平面切换讲解。",
    "beginner": "一张图里最好同时有三个平面对比，别只画一个平面。",
    "warning": "平面图一定要标明当前激活平面，不然圆弧方向容易看反。",
    "example": "生成一张数控平面选择教学图：教材插图风格，分成三块区域分别画 G17 XY 平面、G18 XZ 平面、G19 YZ 平面；每块图都标注坐标轴方向、圆弧方向示意、当前平面名称和适用场景。要求中文标注大而清晰、线条简洁、颜色统一、适合新手手机查看。",
    "memory": "先分清平面，再看圆弧和刀补。",
    "nextLearn": "下一步建议继续看 G02/G03 圆弧和 G41/G42 刀补的配图提示词。",
    "risk": "低",
    "source": "04_数控知识库 / 图解提示词",
    "tags": [
      "提示词",
      "配图",
      "G17",
      "G18",
      "G19",
      "平面"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 2,
    "estimatedTime": 10,
    "prerequisites": "diagram-prompt-cycle",
    "nextRecommend": "diagram-prompt-offset",
    "relatedIds": [
      "diagram-prompt-offset",
      "diagram-prompt-home"
    ],
    "type": "auxiliary"
  },
  {
    "id": "diagram-prompt-offset",
    "category": "图解提示词",
    "title": "G54 / G59 工件坐标提示词",
    "code": "G54 G59 配图",
    "summary": "把工件零点、机床零点和多个工件坐标系的切换关系做成新手看得懂的图。",
    "usage": "适合讲解对刀、批量加工和多工位零点设置。",
    "beginner": "要把同一台机床上的多个零点位置画成对比，不能只画一个 G54。",
    "warning": "如果不写清楚工件零点和机床原点的区别，图容易看着像，但概念是错的。",
    "example": "生成一张数控工件坐标教学图：白底教材风格，画出机床原点、工件原点、G54 到 G59 的多个工件坐标系位置，展示批量加工时如何切换零点。要求用编号或色块区分不同坐标系，标注 X/Y/Z 轴方向、对刀点和程序起点，中文说明清晰，适合新手学习。",
    "memory": "机床原点不等于工件零点。",
    "nextLearn": "下一步建议继续看 G28 回零和对刀流程提示词。",
    "risk": "中",
    "source": "04_数控知识库 / 图解提示词",
    "tags": [
      "提示词",
      "配图",
      "G54",
      "G55",
      "G59",
      "坐标系"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 3,
    "estimatedTime": 10,
    "prerequisites": "diagram-prompt-plane",
    "nextRecommend": "diagram-prompt-home",
    "relatedIds": [
      "diagram-prompt-home",
      "diagram-prompt-thread"
    ],
    "type": "core"
  },
  {
    "id": "diagram-prompt-home",
    "category": "图解提示词",
    "title": "G28 回零与安全退刀提示词",
    "code": "G28 配图",
    "summary": "把回零、参考点和安全抬刀过程画成一张能直接教新手避坑的图。",
    "usage": "适合回零教学、换刀前准备和开机复位讲解。",
    "beginner": "一定要把中间点、安全高度和最终参考点都画出来。",
    "warning": "不要把 G28 直接画成从当前位置猛冲到原点，中间过程必须标清。",
    "example": "生成一张数控回零教学图：教材风格，画出刀具从加工位置抬刀到安全高度，再经由中间点返回参考点的全过程；同时标注 G28、参考点、Z 轴安全高度、X/Y 轴退刀方向和常见误区。要求箭头明显、分步骤展示、中文标注清晰，适合手机端新手学习。",
    "memory": "先抬高，再退回，最后到参考点。",
    "nextLearn": "下一步建议继续看 G54/G59 工件坐标和刀长补偿提示词。",
    "risk": "中",
    "source": "04_数控知识库 / 图解提示词",
    "tags": [
      "提示词",
      "配图",
      "G28",
      "回零",
      "参考点",
      "安全"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 3,
    "estimatedTime": 10,
    "prerequisites": "diagram-prompt-offset",
    "nextRecommend": "diagram-prompt-thread",
    "relatedIds": [
      "diagram-prompt-thread",
      "diagram-prompt-alarm"
    ],
    "type": "auxiliary"
  },
  {
    "id": "diagram-prompt-thread",
    "category": "图解提示词",
    "title": "G76 螺纹循环提示词",
    "code": "G76 配图",
    "summary": "把螺纹循环、牙型、切深和多刀走刀过程画成新手能直观看懂的图。",
    "usage": "适合螺纹编程、车床教学和螺距理解。",
    "beginner": "最好把牙型、进刀过程和最后成型效果一起展示。",
    "warning": "螺距、导程和进给关系要标清，不然新手会把几个量混掉。",
    "example": "生成一张数控螺纹循环教学图：工程教材风格，画出 G76 螺纹循环的多刀切削过程，包含起刀、逐步切深、退刀和最终螺纹成型；同时标注螺距、导程、牙型角、切深和切削方向。要求画面干净、箭头明确、中文标签清晰，适合数控新手手机快速理解。",
    "memory": "先看牙型，再看螺距，再看切深。",
    "nextLearn": "下一步建议继续看 G84 攻丝循环和螺纹规格提示词。",
    "risk": "中",
    "source": "04_数控知识库 / 图解提示词",
    "tags": [
      "提示词",
      "配图",
      "G76",
      "螺纹",
      "螺距",
      "循环"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 3,
    "estimatedTime": 10,
    "prerequisites": "diagram-prompt-home",
    "nextRecommend": "diagram-prompt-alarm",
    "relatedIds": [
      "diagram-prompt-alarm",
      "diagram-prompt-gauge"
    ],
    "type": "auxiliary"
  },
  {
    "id": "diagram-prompt-alarm",
    "category": "图解提示词",
    "title": "报警排查流程提示词",
    "code": "报警 配图",
    "summary": "把常见报警的排查顺序、动作链路和现场判断流程画成新手能照着走的图。",
    "usage": "适合 FANUC 报警、伺服报警、主轴报警和限位报警教学。",
    "beginner": "要把先看什么、后看什么、哪些情况先停机写清楚。",
    "warning": "不要把报警图画成只看报警号，排查顺序比编号更重要。",
    "example": "生成一张数控报警排查流程教学图：教材风格，画出从报警出现到排查完成的完整步骤，包括先确认报警号、观察发生动作、判断伺服/主轴/限位/ATC 类别、查看上下文、记录异常现象、再进入具体检查。要求用流程箭头串起来，中文标注清晰，颜色简洁，适合新手手机查看。",
    "memory": "先分类型，再按顺序查。",
    "nextLearn": "下一步建议继续看伺服报警、主轴报警和限位报警的配图提示词。",
    "risk": "中",
    "source": "04_数控知识库 / 图解提示词",
    "tags": [
      "提示词",
      "配图",
      "报警",
      "排查",
      "故障"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 3,
    "estimatedTime": 10,
    "prerequisites": "diagram-prompt-thread",
    "nextRecommend": "diagram-prompt-gauge",
    "relatedIds": [
      "diagram-prompt-gauge",
      "diagram-prompt-tool-life"
    ],
    "type": "auxiliary"
  },
  {
    "id": "diagram-prompt-gauge",
    "category": "图解提示词",
    "title": "量具识别与读数提示词",
    "code": "量具 配图",
    "summary": "把卡尺、千分尺、百分表和内径表的读数方式画成新手一看就懂的示意图。",
    "usage": "适合量具入门、测量教学和现场读数讲解。",
    "beginner": "最好每种量具都给一个结构图和一个读数图。",
    "warning": "不要只画外观，量爪、刻度、读数位置必须标出来。",
    "example": "生成一张数控量具教学图：教材插图风格，分四格分别画游标卡尺、外径千分尺、百分表、内径表；每一格都标注零位、刻度线、测量面、读数方向和常见误读点。要求中文标签清晰、线条简单、颜色统一、适合手机端快速学习，不要写实照片风。",
    "memory": "先看结构，再看刻度，最后看读数。",
    "nextLearn": "下一步建议继续看公差、表面粗糙度和孔轴配合的配图提示词。",
    "risk": "低",
    "source": "04_数控知识库 / 图解提示词",
    "tags": [
      "提示词",
      "配图",
      "量具",
      "卡尺",
      "千分尺",
      "百分表",
      "内径表"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 2,
    "estimatedTime": 10,
    "prerequisites": "diagram-prompt-alarm",
    "nextRecommend": "diagram-prompt-tool-life",
    "relatedIds": [
      "diagram-prompt-tool-life",
      "diagram-prompt-tolerance"
    ],
    "type": "auxiliary"
  },
  {
    "id": "diagram-prompt-tool-life",
    "category": "图解提示词",
    "title": "刀具寿命与涂层提示词",
    "code": "刀具寿命 配图",
    "summary": "把刀片磨损、寿命阶段、涂层作用和换刀信号画成适合新手学习的图。",
    "usage": "适合刀具选择、工艺优化和常见加工问题讲解。",
    "beginner": "要把新刀、半磨损、报废三种状态并排画出来。",
    "warning": "不要只画刀片照片，最好把磨损位置和加工现象也标出来。",
    "example": "生成一张数控刀具寿命教学图：白底教材风格，分成三列展示新刀、正常磨损、严重磨损/报废三种状态；同时标注涂层作用、切削刃磨损位置、崩刃、积屑瘤和换刀信号。要求中文标注大而清晰、颜色简洁、适合新手手机快速学习，不要复杂背景。",
    "memory": "先看磨损，再看涂层，再看换刀时机。",
    "nextLearn": "下一步建议继续看刀具材质、切削参数和换刀报警的配图提示词。",
    "risk": "中",
    "source": "04_数控知识库 / 图解提示词",
    "tags": [
      "提示词",
      "配图",
      "刀具寿命",
      "涂层",
      "换刀",
      "磨损"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 3,
    "estimatedTime": 10,
    "prerequisites": "diagram-prompt-gauge",
    "nextRecommend": "diagram-prompt-tolerance",
    "relatedIds": [
      "diagram-prompt-tolerance",
      "diagram-prompt-roughness"
    ],
    "type": "auxiliary"
  },
  {
    "id": "diagram-prompt-tolerance",
    "category": "图解提示词",
    "title": "公差与配合提示词",
    "code": "公差 配图",
    "summary": "把尺寸公差、孔轴配合和常见公差带画成新手一眼能分清的图。",
    "usage": "适合机械制图、公差入门和现场判图教学。",
    "beginner": "最好把基准尺寸、公差带和实际尺寸放在同一张图里。",
    "warning": "不要只写正负数，要把孔、轴和配合关系一起画出来。",
    "example": "生成一张机械制图公差教学图：教材插图风格，画出基本尺寸、公差带、上偏差、下偏差，以及孔轴配合的三种常见情况；分别标注间隙配合、过盈配合和过渡配合。要求中文标注清晰、线条简洁、颜色区分明显、适合新手手机学习，不要写实照片风。",
    "memory": "先看基准，再看公差带，再看配合结果。",
    "nextLearn": "下一步建议继续看形位公差和尺寸标注的配图提示词。",
    "risk": "低",
    "source": "04_数控知识库 / 图解提示词",
    "tags": [
      "提示词",
      "配图",
      "公差",
      "配合",
      "孔轴",
      "制图"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 2,
    "estimatedTime": 10,
    "prerequisites": "diagram-prompt-tool-life",
    "nextRecommend": "diagram-prompt-roughness",
    "relatedIds": [
      "diagram-prompt-roughness",
      "diagram-prompt-cutting"
    ],
    "type": "auxiliary"
  },
  {
    "id": "diagram-prompt-roughness",
    "category": "图解提示词",
    "title": "表面粗糙度提示词",
    "code": "粗糙度 配图",
    "summary": "把 Ra、加工痕迹、刀纹方向和表面质量要求画成易懂的教学图。",
    "usage": "适合粗糙度教学、工艺说明和图纸判读。",
    "beginner": "要把不同粗糙度对应的表面纹理放在一起对比。",
    "warning": "不要只画一个 Ra 数字，最好连加工痕迹和适用场景一起画。",
    "example": "生成一张表面粗糙度教学图：教材插图风格，分三档展示光洁、一般、粗糙三种表面效果，并标注 Ra 数值、刀纹方向、加工方法和常见应用场景；画面要有放大纹理示意、中文标签清晰、颜色简洁、适合手机端学习。",
    "memory": "先看 Ra，再看纹理，再看工艺。",
    "nextLearn": "下一步建议继续看公差配合和工艺余量的配图提示词。",
    "risk": "低",
    "source": "04_数控知识库 / 图解提示词",
    "tags": [
      "提示词",
      "配图",
      "粗糙度",
      "Ra",
      "表面质量"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 2,
    "estimatedTime": 10,
    "prerequisites": "diagram-prompt-tolerance",
    "nextRecommend": "diagram-prompt-cutting",
    "relatedIds": [
      "diagram-prompt-cutting",
      "diagram-prompt-parameter-sheet"
    ],
    "type": "auxiliary"
  },
  {
    "id": "diagram-prompt-cutting",
    "category": "图解提示词",
    "title": "切削参数提示词",
    "code": "Vc n F 配图",
    "summary": "把线速度、转速、进给和螺距之间的换算关系画成参数图。",
    "usage": "适合参数换算、现场调参和新手公式理解。",
    "beginner": "最好把公式、单位和常见误区都放进去。",
    "warning": "不要只画公式，要把不同材料和不同刀具的应用场景也画出来。",
    "example": "生成一张数控切削参数教学图：教材风格，画出线速度 Vc、主轴转速 n、进给 F 和螺距 P 的关系图，用箭头把参数转换链串起来；在图中标注单位 mm/min、m/min、rpm 和 mm/rev，并在侧边放一个简单算例。要求中文大字清晰、颜色区分明显、适合手机端学习，不要复杂背景。",
    "memory": "先认单位，再看关系，再看换算。",
    "nextLearn": "下一步建议继续看 G94/G95 进给模式和直径换算提示词。",
    "risk": "中",
    "source": "04_数控知识库 / 图解提示词",
    "tags": [
      "提示词",
      "配图",
      "Vc",
      "n",
      "F",
      "螺距",
      "换算"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 3,
    "estimatedTime": 10,
    "prerequisites": "diagram-prompt-roughness",
    "nextRecommend": "diagram-prompt-parameter-sheet",
    "relatedIds": [
      "diagram-prompt-parameter-sheet",
      "diagram-prompt-material"
    ],
    "type": "auxiliary"
  },
  {
    "id": "diagram-prompt-parameter-sheet",
    "category": "图解提示词",
    "title": "现场参数速查提示词",
    "code": "参数速查 配图",
    "summary": "把常用 G 代码、报警、量具和工艺参数整理成一张适合手机查看的速查图。",
    "usage": "适合做总览图、合集封面和新手学习目录页。",
    "beginner": "一张图里要有标题、分类、例子和一个明确的使用场景。",
    "warning": "别把速查图做成大段文字，图必须让人快速扫到关键词。",
    "example": "生成一张数控参数速查总览图：白底教材风格，按栏目分区展示常用 G 代码、报警排查、量具识别、刀具寿命、公差配合、表面粗糙度和切削参数；每个分区只放 1 到 2 个最关键关键词和一个简短用途说明。要求排版清晰、适合手机端查看、中文标题醒目、整体像课程目录页而不是海报。",
    "memory": "先做总览，再拆专题。",
    "nextLearn": "下一步建议继续看各专题的单独配图提示词。",
    "risk": "低",
    "source": "04_数控知识库 / 图解提示词",
    "tags": [
      "提示词",
      "配图",
      "速查",
      "总览",
      "目录"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 2,
    "estimatedTime": 10,
    "prerequisites": "diagram-prompt-cutting",
    "nextRecommend": "diagram-prompt-material",
    "relatedIds": [
      "diagram-prompt-material",
      "diagram-prompt-startup"
    ],
    "type": "auxiliary"
  },
  {
    "id": "diagram-prompt-material",
    "category": "图解提示词",
    "title": "材料切削与刀具选择提示词",
    "code": "材料 切削 配图",
    "summary": "把碳钢、不锈钢、铝件和高温合金的切削特点与刀具选择画成对比图。",
    "usage": "适合材料入门、工艺选刀和切削参数说明。",
    "beginner": "最好把材料、刀具、转速和排屑效果放在同一张图里对比。",
    "warning": "不要只画材料名称，切削难点和刀具建议也要一起画。",
    "example": "生成一张材料切削教学图：教材插图风格，分四格分别展示碳钢、不锈钢、铝合金和高温合金；每一格都标注材料特点、适合的刀具类型、推荐切削特点和常见问题，例如积屑瘤、发热、排屑困难和磨损。要求中文标签清晰、颜色区分明显、适合新手手机快速学习，不要复杂背景。",
    "memory": "先看材料，再看刀具，再看切削表现。",
    "nextLearn": "下一步建议继续看切削参数和刀具寿命的配图提示词。",
    "risk": "中",
    "source": "04_数控知识库 / 图解提示词",
    "tags": [
      "提示词",
      "配图",
      "材料",
      "刀具",
      "切削",
      "不锈钢",
      "铝合金"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 3,
    "estimatedTime": 10,
    "prerequisites": "diagram-prompt-parameter-sheet",
    "nextRecommend": "diagram-prompt-startup",
    "relatedIds": [
      "diagram-prompt-startup",
      "diagram-prompt-atc"
    ],
    "type": "auxiliary"
  },
  {
    "id": "diagram-prompt-startup",
    "category": "图解提示词",
    "title": "开机检查与安全准备提示词",
    "code": "开机 安全 配图",
    "summary": "把开机前检查、回零、气压、润滑和夹具确认画成新手上机前的流程图。",
    "usage": "适合机床开机、上机安全和新手实操准备。",
    "beginner": "要把先后顺序写明白，别让新手上来就直接按循环启动。",
    "warning": "重点是安全检查，不要把流程画成纯操作说明而没有风险提示。",
    "example": "生成一张数控机床开机前检查教学图：教材风格，按顺序画出检查电源、气压、润滑、刀具、夹具、工件装夹、回零和空运行试车的流程；每一步都加一个小图标和简短说明。要求中文标注醒目、步骤箭头清晰、颜色简洁、适合新手手机端查看。",
    "memory": "先安全检查，再回零，再试运行。",
    "nextLearn": "下一步建议继续看 G28 回零和报警排查的配图提示词。",
    "risk": "中",
    "source": "04_数控知识库 / 图解提示词",
    "tags": [
      "提示词",
      "配图",
      "开机",
      "安全",
      "回零",
      "检查"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 3,
    "estimatedTime": 10,
    "prerequisites": "diagram-prompt-material",
    "nextRecommend": "diagram-prompt-atc",
    "relatedIds": [
      "diagram-prompt-atc",
      "diagram-prompt-compensation-flow"
    ],
    "type": "auxiliary"
  },
  {
    "id": "diagram-prompt-atc",
    "category": "图解提示词",
    "title": "ATC 换刀与刀库提示词",
    "code": "ATC 配图",
    "summary": "把刀库、刀臂、刀号确认和换刀动作顺序画成一张能让新手看懂的流程图。",
    "usage": "适合 ATC 故障、换刀逻辑和刀号管理讲解。",
    "beginner": "最好把刀库位置、主轴刀号和换刀动作分开画。",
    "warning": "一定要标出换刀前后的刀号确认，不然新手容易混淆。",
    "example": "生成一张数控自动换刀（ATC）教学图：教材插图风格，分步骤画出刀库、机械手、主轴取刀、换刀完成四个动作；每一步标注当前刀号、目标刀号、刀库位置和换刀方向。要求中文标签清晰、流程箭头明显、颜色简洁、适合手机端新手快速理解，不要复杂背景。",
    "memory": "先认刀号，再看动作，再看结果。",
    "nextLearn": "下一步建议继续看换刀报警和刀具寿命提示词。",
    "risk": "中",
    "source": "04_数控知识库 / 图解提示词",
    "tags": [
      "提示词",
      "配图",
      "ATC",
      "换刀",
      "刀库",
      "刀号"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 3,
    "estimatedTime": 10,
    "prerequisites": "diagram-prompt-startup",
    "nextRecommend": "diagram-prompt-compensation-flow",
    "relatedIds": [
      "diagram-prompt-compensation-flow",
      "diagram-prompt-feed-mode"
    ],
    "type": "auxiliary"
  },
  {
    "id": "diagram-prompt-compensation-flow",
    "category": "图解提示词",
    "title": "刀补流程与对刀提示词",
    "code": "刀补 流程 配图",
    "summary": "把对刀、建立刀长补偿、调用刀补和取消刀补的流程画成连贯图。",
    "usage": "适合对刀教学、刀补入门和程序理解。",
    "beginner": "要把对刀点、刀长值和程序调用关系串起来。",
    "warning": "别只画 G41/G42，刀补前后的准备动作也要一起画。",
    "example": "生成一张数控刀补流程教学图：教材风格，按顺序画出对刀、测量刀长、建立刀长补偿、程序调用刀补、加工中补偿、G49 取消补偿的完整过程；每一步都标注 H 值、刀长值、程序路径和刀心轨迹。要求中文标注清晰、步骤连贯、颜色简洁、适合新手手机学习。",
    "memory": "先对刀，再补偿，再取消。",
    "nextLearn": "下一步建议继续看 G43/G49 和 G41/G42 的单独配图提示词。",
    "risk": "中",
    "source": "04_数控知识库 / 图解提示词",
    "tags": [
      "提示词",
      "配图",
      "刀补",
      "对刀",
      "G43",
      "G49"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 3,
    "estimatedTime": 10,
    "prerequisites": "diagram-prompt-atc",
    "nextRecommend": "diagram-prompt-feed-mode",
    "relatedIds": [
      "diagram-prompt-feed-mode",
      "diagram-prompt-return-plane"
    ],
    "type": "auxiliary"
  },
  {
    "id": "diagram-prompt-feed-mode",
    "category": "图解提示词",
    "title": "G94 / G95 进给模式提示词",
    "code": "G94 G95 配图",
    "summary": "把每分钟进给、每转进给和换算关系画成新手能快速看懂的图。",
    "usage": "适合进给方式、参数换算和车铣编程讲解。",
    "beginner": "要把单位和使用场景放在一张图里对比，不然容易混。",
    "warning": "千万别把每分钟进给和每转进给混写成一个单位。",
    "example": "生成一张数控进给模式教学图：教材插图风格，左右对比展示 G94 每分钟进给和 G95 每转进给；每一侧都标注单位、适用机床、典型 F 值和换算关系。要求中文标注清晰、箭头明显、颜色简洁、适合新手手机学习，不要复杂背景。",
    "memory": "先看单位，再看模式，再看参数。",
    "nextLearn": "下一步建议继续看切削参数和螺纹/攻丝的配图提示词。",
    "risk": "中",
    "source": "04_数控知识库 / 图解提示词",
    "tags": [
      "提示词",
      "配图",
      "G94",
      "G95",
      "进给",
      "单位"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 3,
    "estimatedTime": 10,
    "prerequisites": "diagram-prompt-compensation-flow",
    "nextRecommend": "diagram-prompt-return-plane",
    "relatedIds": [
      "diagram-prompt-return-plane",
      "diagram-prompt-unit-switch"
    ],
    "type": "auxiliary"
  },
  {
    "id": "diagram-prompt-return-plane",
    "category": "图解提示词",
    "title": "G98 / G99 返回平面提示词",
    "code": "G98 G99 配图",
    "summary": "把固定循环结束后回到初始点还是回到 R 平面的区别画清楚。",
    "usage": "适合钻孔循环、攻丝循环和孔加工安全说明。",
    "beginner": "一定要画出初始点和 R 平面两个不同位置。",
    "warning": "不要只写 G98/G99 编号，要把回到哪里画出来。",
    "example": "生成一张数控返回平面教学图：教材风格，分左右两幅展示 G98 与 G99 的区别；左边画循环结束后回到初始点，右边画循环结束后回到 R 平面，并标注初始点、R 平面、孔底、进退刀方向和适用场景。要求中文标签清晰、箭头明确、颜色简洁、适合手机端学习。",
    "memory": "G98 回初始点，G99 回 R 平面。",
    "nextLearn": "下一步建议继续看 G81/G83/G84 固定循环的配图提示词。",
    "risk": "中",
    "source": "04_数控知识库 / 图解提示词",
    "tags": [
      "提示词",
      "配图",
      "G98",
      "G99",
      "返回平面",
      "固定循环"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 3,
    "estimatedTime": 10,
    "prerequisites": "diagram-prompt-feed-mode",
    "nextRecommend": "diagram-prompt-unit-switch",
    "relatedIds": [
      "diagram-prompt-unit-switch",
      "diagram-prompt-tool-length"
    ],
    "type": "auxiliary"
  },
  {
    "id": "diagram-prompt-unit-switch",
    "category": "图解提示词",
    "title": "G20 / G21 单位切换提示词",
    "code": "G20 G21 配图",
    "summary": "把英制和公制切换、单位误差和常见场景画成一张直观对比图。",
    "usage": "适合单位切换、图纸识别和换算入门。",
    "beginner": "要把 mm、inch 和常见数值差别放在一起对比。",
    "warning": "单位图里必须写清楚当前系统单位，避免新手看错。",
    "example": "生成一张数控单位切换教学图：教材插图风格，左右对比展示 G21 公制和 G20 英制；每侧标注单位符号、典型尺寸写法和常见误读风险。要求中文标注清晰、数字醒目、颜色简洁、适合手机端学习，不要写实照片风。",
    "memory": "先看单位，再看数字，再看图纸。",
    "nextLearn": "下一步建议继续看螺纹规格和切削参数换算提示词。",
    "risk": "低",
    "source": "04_数控知识库 / 图解提示词",
    "tags": [
      "提示词",
      "配图",
      "G20",
      "G21",
      "单位",
      "英制",
      "公制"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 2,
    "estimatedTime": 10,
    "prerequisites": "diagram-prompt-return-plane",
    "nextRecommend": "diagram-prompt-tool-length",
    "relatedIds": [
      "diagram-prompt-tool-length",
      "diagram-prompt-fixed-cycle"
    ],
    "type": "auxiliary"
  },
  {
    "id": "diagram-prompt-tool-length",
    "category": "图解提示词",
    "title": "G43 / G49 刀长补偿提示词",
    "code": "G43 G49 配图",
    "summary": "把刀长补偿的建立、调用和取消做成新手能直观看懂的对比图。",
    "usage": "适合对刀教学、立铣刀补偿和程序入门。",
    "beginner": "一定要把刀具长度和 Z 方向补偿方向画出来。",
    "warning": "不要只写 G43 和 G49，刀长值 H 和刀尖位置也要一起画。",
    "example": "生成一张数控刀长补偿教学图：教材风格，画出未补偿、G43 刀长补偿和 G49 取消补偿三种状态；标注刀长值 H、Z 轴方向、刀尖位置、工件表面和机床参考点。要求中文标注清晰、颜色区分明显、适合新手手机学习，不要复杂背景。",
    "memory": "G43 加刀长，G49 取消刀长。",
    "nextLearn": "下一步建议继续看对刀流程和刀补流程提示词。",
    "risk": "中",
    "source": "04_数控知识库 / 图解提示词",
    "tags": [
      "提示词",
      "配图",
      "G43",
      "G49",
      "刀长",
      "对刀"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 3,
    "estimatedTime": 10,
    "prerequisites": "diagram-prompt-unit-switch",
    "nextRecommend": "diagram-prompt-fixed-cycle",
    "relatedIds": [
      "diagram-prompt-fixed-cycle",
      "diagram-prompt-alarm-servo"
    ],
    "type": "core"
  },
  {
    "id": "diagram-prompt-fixed-cycle",
    "category": "图解提示词",
    "title": "G81 / G83 / G84 固定循环提示词",
    "code": "G81 G83 G84 配图",
    "summary": "把钻孔、啄钻、攻丝三个固定循环的动作和适用场景画成一张对比图。",
    "usage": "适合固定循环入门、孔加工教学和攻丝理解。",
    "beginner": "最好把三种循环并排展示，别只画单一孔加工流程。",
    "warning": "循环图必须标清楚下刀、退刀、R 平面和返回方式，否则新手容易混。",
    "example": "生成一张数控固定循环教学图：教材插图风格，左右或上下分成三块，分别展示 G81 普通钻孔、G83 啄钻和 G84 攻丝；每块都画出下刀、加工、退刀、返回 R 平面和循环结束后的状态。要求中文标注清晰、箭头明显、颜色简洁、适合新手手机学习，不要复杂背景。",
    "memory": "先看类型，再看动作，再看返回。",
    "nextLearn": "下一步建议继续看 G98/G99 返回平面和 G80 取消循环提示词。",
    "risk": "中",
    "source": "04_数控知识库 / 图解提示词",
    "tags": [
      "提示词",
      "配图",
      "G81",
      "G83",
      "G84",
      "固定循环",
      "钻孔",
      "攻丝"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 3,
    "estimatedTime": 10,
    "prerequisites": "diagram-prompt-tool-length",
    "nextRecommend": "diagram-prompt-alarm-servo",
    "relatedIds": [
      "diagram-prompt-alarm-servo",
      "diagram-prompt-alarm-spindle"
    ],
    "type": "auxiliary"
  },
  {
    "id": "diagram-prompt-alarm-servo",
    "category": "图解提示词",
    "title": "伺服报警排查提示词",
    "code": "伺服报警 配图",
    "summary": "把伺服报警的常见原因、排查顺序和动作链路画成新手能照着查的图。",
    "usage": "适合伺服报警、轴报警和驱动器类故障教学。",
    "beginner": "要把轴不动、报警灯、编码器和电源这些要素放在同一张图里。",
    "warning": "不要只画报警代码，伺服报警最重要的是先看动作和上下文。",
    "example": "生成一张数控伺服报警教学图：教材风格，画出伺服报警出现后的排查流程，包括确认轴号、观察轴动作、检查驱动器报警灯、确认电源与编码器、查看限位与机械卡滞、记录异常现象。要求用流程箭头串起来，中文标注清晰，颜色简洁，适合新手手机查看。",
    "memory": "先看轴，再看驱动，再看机械。",
    "nextLearn": "下一步建议继续看主轴报警和限位报警提示词。",
    "risk": "中",
    "source": "04_数控知识库 / 图解提示词",
    "tags": [
      "提示词",
      "配图",
      "伺服报警",
      "轴报警",
      "排查",
      "故障"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 3,
    "estimatedTime": 10,
    "prerequisites": "diagram-prompt-fixed-cycle",
    "nextRecommend": "diagram-prompt-alarm-spindle",
    "relatedIds": [
      "diagram-prompt-alarm-spindle",
      "diagram-prompt-alarm-limit"
    ],
    "type": "auxiliary"
  },
  {
    "id": "diagram-prompt-alarm-spindle",
    "category": "图解提示词",
    "title": "主轴报警排查提示词",
    "code": "主轴报警 配图",
    "summary": "把主轴不转、过载、转速异常和刹车问题画成一张排查流程图。",
    "usage": "适合主轴故障、主轴报警和加工中停机教学。",
    "beginner": "要把主轴电机、变频器、指令和机械卡滞一起考虑。",
    "warning": "主轴报警不能只看电气，也要看程序指令和机械状态。",
    "example": "生成一张数控主轴报警教学图：教材风格，画出主轴报警后的排查步骤，包括确认 M03/M04/M05 指令、检查转速设定、查看主轴驱动器状态、检查负载与过热、确认刹车和机械卡滞。要求中文标注清晰、流程箭头明确、颜色简洁、适合手机端新手学习。",
    "memory": "先看指令，再看驱动，再看机械。",
    "nextLearn": "下一步建议继续看伺服报警和限位报警提示词。",
    "risk": "中",
    "source": "04_数控知识库 / 图解提示词",
    "tags": [
      "提示词",
      "配图",
      "主轴报警",
      "主轴故障",
      "排查",
      "故障"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 3,
    "estimatedTime": 10,
    "prerequisites": "diagram-prompt-alarm-servo",
    "nextRecommend": "diagram-prompt-alarm-limit",
    "relatedIds": [
      "diagram-prompt-alarm-limit",
      "diagram-prompt-home-fail"
    ],
    "type": "auxiliary"
  },
  {
    "id": "diagram-prompt-alarm-limit",
    "category": "图解提示词",
    "title": "限位与超程报警提示词",
    "code": "限位 超程 配图",
    "summary": "把超程、限位开关和退刀方向画成新手不容易走错的教学图。",
    "usage": "适合限位报警、超程解除和安全退刀教学。",
    "beginner": "要把撞限位前的动作、超程后的状态和正确退回方向都画出来。",
    "warning": "限位图必须明确标注正方向和负方向，不然退刀方向容易反。",
    "example": "生成一张数控限位与超程教学图：教材插图风格，画出 X/Y/Z 轴正负方向、限位开关位置、超程发生时的画面和正确退回路径；同时标注常见报警字样、手动退回方法和安全注意事项。要求中文标注清晰、箭头明显、颜色简洁、适合新手手机快速理解，不要复杂背景。",
    "memory": "先认方向，再退回，再复位。",
    "nextLearn": "下一步建议继续看报警总览和回零失败提示词。",
    "risk": "中",
    "source": "04_数控知识库 / 图解提示词",
    "tags": [
      "提示词",
      "配图",
      "限位",
      "超程",
      "报警",
      "退刀"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 3,
    "estimatedTime": 10,
    "prerequisites": "diagram-prompt-alarm-spindle",
    "nextRecommend": "diagram-prompt-home-fail",
    "relatedIds": [
      "diagram-prompt-home-fail",
      "diagram-prompt-touchoff-fail"
    ],
    "type": "auxiliary"
  },
  {
    "id": "diagram-prompt-home-fail",
    "category": "图解提示词",
    "title": "回零失败与参考点异常提示词",
    "code": "回零失败 配图",
    "summary": "把回零失败的常见原因、轴动作和排查顺序画成一张新手能照着查的图。",
    "usage": "适合回零失败、参考点异常和零点找不到的教学。",
    "beginner": "要把机床状态、轴动作、限位和参数异常放在同一张图里。",
    "warning": "不要一上来就画改参数，先把基础检查顺序画清楚。",
    "example": "生成一张数控回零失败教学图：教材风格，按顺序画出回零失败后的排查流程，包括确认报警、观察轴是否反向或卡住、检查限位开关、确认参考点信号、查看相关参数和手动退回方法。要求中文标注清晰、流程箭头明确、颜色简洁、适合手机端新手学习。",
    "memory": "先看动作，再看状态，最后看参数。",
    "nextLearn": "下一步建议继续看参数备份和回零参数提示词。",
    "risk": "中",
    "source": "04_数控知识库 / 图解提示词",
    "tags": [
      "提示词",
      "配图",
      "回零失败",
      "参考点异常",
      "回零",
      "参数"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 3,
    "estimatedTime": 10,
    "prerequisites": "diagram-prompt-alarm-limit",
    "nextRecommend": "diagram-prompt-touchoff-fail",
    "relatedIds": [
      "diagram-prompt-touchoff-fail",
      "diagram-prompt-parameter-backup"
    ],
    "type": "auxiliary"
  },
  {
    "id": "diagram-prompt-touchoff-fail",
    "category": "图解提示词",
    "title": "对刀失败与基准异常提示词",
    "code": "对刀失败 配图",
    "summary": "把对刀失败、刀长异常和坐标基准错误画成一张新手容易理解的图。",
    "usage": "适合对刀教学、刀长测量和坐标基准说明。",
    "beginner": "要把测量位置、刀尖位置、工件表面和坐标零点一起画出来。",
    "warning": "不要只画对刀动作，失败后尺寸为什么跑掉也要画出来。",
    "example": "生成一张数控对刀失败教学图：教材插图风格，画出对刀测量过程、刀长记录、刀尖接触工件表面、刀补值输入和失败时尺寸偏差的示意；同时标注基准面、刀长值、工件零点、程序零点和常见错误点。要求中文标注清晰、步骤连贯、颜色简洁、适合新手手机快速理解。",
    "memory": "先找基准，再测刀长，再核对坐标。",
    "nextLearn": "下一步建议继续看刀长补偿和对刀流程提示词。",
    "risk": "中",
    "source": "04_数控知识库 / 图解提示词",
    "tags": [
      "提示词",
      "配图",
      "对刀失败",
      "刀长异常",
      "对刀",
      "基准"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 3,
    "estimatedTime": 10,
    "prerequisites": "diagram-prompt-home-fail",
    "nextRecommend": "diagram-prompt-parameter-backup",
    "relatedIds": [
      "diagram-prompt-parameter-backup",
      "diagram-prompt-home-parameter"
    ],
    "type": "auxiliary"
  },
  {
    "id": "diagram-prompt-parameter-backup",
    "category": "图解提示词",
    "title": "参数备份与初始化提示词",
    "code": "参数备份 配图",
    "summary": "把参数备份、恢复、初始化和风险提示画成一张新手能看懂的流程图。",
    "usage": "适合参数管理、系统维护和安全操作教学。",
    "beginner": "要把备份前、备份中、恢复和初始化分别画出来。",
    "warning": "初始化和恢复不是一回事，图里必须明确区分。",
    "example": "生成一张数控参数备份教学图：教材风格，画出参数备份、记录原值、恢复参数、初始化前确认和风险提示的完整流程；同时标注 U 盘/存储介质、系统型号、参数号、备份文件和恢复前检查事项。要求中文标注清晰、步骤连贯、颜色简洁、适合手机端新手学习。",
    "memory": "先备份，再记录，再恢复。",
    "nextLearn": "下一步建议继续看回零参数和高风险参数类别提示词。",
    "risk": "高",
    "source": "04_数控知识库 / 图解提示词",
    "tags": [
      "提示词",
      "配图",
      "参数备份",
      "恢复",
      "初始化",
      "参数"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 4,
    "estimatedTime": 10,
    "prerequisites": "diagram-prompt-touchoff-fail",
    "nextRecommend": "diagram-prompt-home-parameter",
    "relatedIds": [
      "diagram-prompt-home-parameter",
      "diagram-prompt-init"
    ],
    "type": "auxiliary"
  },
  {
    "id": "diagram-prompt-home-parameter",
    "category": "图解提示词",
    "title": "回零参数与参考点设定提示词",
    "code": "回零参数 配图",
    "summary": "把回零参数、参考点信号和回零动作关系画成新手能理解的流程图。",
    "usage": "适合回零参数、参考点设定和回零异常教学。",
    "beginner": "要把参数号、信号来源和回零动作顺序一起画出来。",
    "warning": "不要只画参数号，参考点和动作关系必须画清楚。",
    "example": "生成一张数控回零参数教学图：教材风格，画出回零参数、参考点信号、轴回零动作和异常时的排查路径；同时标注参数号、参考点开关、信号反馈和手动回零方向。要求中文标注清晰、流程连贯、颜色简洁、适合手机端新手学习。",
    "memory": "先看参数，再看信号，再看动作。",
    "nextLearn": "下一步建议继续看回零失败与参考点异常提示词。",
    "risk": "中",
    "source": "04_数控知识库 / 图解提示词",
    "tags": [
      "提示词",
      "配图",
      "回零参数",
      "参考点",
      "G28",
      "参数"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 3,
    "estimatedTime": 10,
    "prerequisites": "diagram-prompt-parameter-backup",
    "nextRecommend": "diagram-prompt-init",
    "relatedIds": [
      "diagram-prompt-init",
      "diagram-prompt-high-risk-params"
    ],
    "type": "auxiliary"
  },
  {
    "id": "diagram-prompt-init",
    "category": "图解提示词",
    "title": "机床初始化与上电流程提示词",
    "code": "初始化 流程 配图",
    "summary": "把上电、初始化、回零、试运行和安全确认画成一张完整的新手上机流程图。",
    "usage": "适合机床开机、初始化和新手上岗前培训。",
    "beginner": "要把上电后先做什么、后做什么写成一条看得懂的流程。",
    "warning": "初始化不是直接开干，必须先画安全确认和回零流程。",
    "example": "生成一张数控机床初始化教学图：教材风格，按顺序画出上电、初始化、回零、检查气压和润滑、空运行和试切的完整流程；每一步都标注安全检查点和常见错误点。要求中文标注清晰、步骤连贯、颜色简洁、适合手机端新手学习。",
    "memory": "先上电，再初始化，再回零。",
    "nextLearn": "下一步建议继续看回零参数、参数备份和安全操作提示词。",
    "risk": "中",
    "source": "04_数控知识库 / 图解提示词",
    "tags": [
      "提示词",
      "配图",
      "初始化",
      "上电",
      "回零",
      "安全"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 3,
    "estimatedTime": 10,
    "prerequisites": "diagram-prompt-home-parameter",
    "nextRecommend": "diagram-prompt-high-risk-params",
    "relatedIds": [
      "diagram-prompt-high-risk-params",
      "diagram-prompt-init-checklist"
    ],
    "type": "auxiliary"
  },
  {
    "id": "diagram-prompt-high-risk-params",
    "category": "图解提示词",
    "title": "高风险参数类别提示词",
    "code": "高风险参数 配图",
    "summary": "把高风险参数、影响范围、备份要求和改动前确认事项画成警示型图卡。",
    "usage": "适合参数学习、风险提示和新手安全教育。",
    "beginner": "要把哪些参数不能乱改、为什么不能乱改说清楚。",
    "warning": "高风险参数图卡必须突出‘先备份再修改’，不能只看参数号。",
    "example": "生成一张数控高风险参数教学图：教材风格，分区展示回零参数、伺服参数、主轴参数、刀库参数和坐标参数等高风险类别；每一类旁边都写上影响范围、修改前必备操作和典型风险。要求中文标注清晰、警示色明显、排版简洁、适合手机端新手学习。",
    "memory": "先备份，再确认，再修改。",
    "nextLearn": "下一步建议继续看参数备份与恢复和回零参数提示词。",
    "risk": "高",
    "source": "04_数控知识库 / 图解提示词",
    "tags": [
      "提示词",
      "配图",
      "高风险参数",
      "参数",
      "备份",
      "警示"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 4,
    "estimatedTime": 10,
    "prerequisites": "diagram-prompt-init",
    "nextRecommend": "diagram-prompt-init-checklist",
    "relatedIds": [
      "diagram-prompt-init-checklist",
      "diagram-prompt-alarm-overview"
    ],
    "type": "auxiliary"
  },
  {
    "id": "diagram-prompt-init-checklist",
    "category": "图解提示词",
    "title": "机床初始化检查清单提示词",
    "code": "初始化检查 配图",
    "summary": "把上电前、初始化中、回零后和试运行前的检查清单画成一张新手可打勾的图。",
    "usage": "适合机床开机培训、实操检查和手机快速查看。",
    "beginner": "要把每一步该看什么、该确认什么、该打勾什么画清楚。",
    "warning": "清单图不能只写标题，必须有可执行的步骤和检查点。",
    "example": "生成一张数控机床初始化检查清单教学图：教材风格，分成上电前、初始化中、回零后、试运行前四个区域；每个区域都列出可勾选的检查点，例如电源、气压、润滑、刀具、夹具、限位和空运行。要求中文标注清晰、步骤连贯、颜色简洁、适合手机端新手学习。",
    "memory": "先检查，再启动，再试运行。",
    "nextLearn": "下一步建议继续看机床初始化与上电流程提示词。",
    "risk": "中",
    "source": "04_数控知识库 / 图解提示词",
    "tags": [
      "提示词",
      "配图",
      "初始化",
      "检查清单",
      "安全",
      "上电"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 3,
    "estimatedTime": 10,
    "prerequisites": "diagram-prompt-high-risk-params",
    "nextRecommend": "diagram-prompt-alarm-overview",
    "relatedIds": [
      "diagram-prompt-alarm-overview",
      "diagram-prompt-coordinate"
    ],
    "type": "auxiliary"
  },
  {
    "id": "diagram-prompt-alarm-overview",
    "category": "图解提示词",
    "title": "报警总览与分类图卡提示词",
    "code": "报警总览 配图",
    "summary": "把程序、伺服、主轴、限位和换刀报警画成一张适合手机查看的总览图卡。",
    "usage": "适合报警栏目入口、学习目录和总览封面。",
    "beginner": "要把报警分成几大类，再给每类一个最常见的例子。",
    "warning": "总览图不是排查流程图，重点是分类和入口，不是细节步骤。",
    "example": "生成一张数控报警总览图卡：白底教材风格，按分类展示程序类报警、伺服类报警、主轴类报警、限位类报警和换刀类报警；每一类只放一个代表性关键词和一个简短说明。要求中文标题醒目、分类色块清晰、排版简洁、适合手机端快速浏览，不要复杂背景。",
    "memory": "先分大类，再进细分。",
    "nextLearn": "下一步建议继续看伺服报警、主轴报警和限位报警提示词。",
    "risk": "低",
    "source": "04_数控知识库 / 图解提示词",
    "tags": [
      "提示词",
      "配图",
      "报警",
      "总览",
      "分类",
      "入口"
    ],
    "imageUrl": "./assets/images/batch01_core/placeholder.svg",
    "thumbnails": [
      "./assets/images/batch01_core/placeholder.svg"
    ],
    "difficulty": 2,
    "estimatedTime": 10,
    "prerequisites": "diagram-prompt-init-checklist",
    "nextRecommend": null,
    "relatedIds": [
      "diagram-prompt-coordinate",
      "diagram-prompt-g02"
    ],
    "type": "auxiliary"
  }
];
