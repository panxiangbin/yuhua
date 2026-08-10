window.CNC_GM_CODES = [
  {
    "id": "kb-gcode-g00",
    "category": "G代码",
    "title": "G00 快速定位",
    "code": "G00",
    "aliases": [
      "快移",
      "快速移动",
      "Rapid positioning"
    ],
    "summary": "让刀具以机床快速速度移动到指定位置，主要用于空行程定位。",
    "usage": "换刀后靠近工件、退刀、跨越安全距离时使用。",
    "beginner": "G00只负责快到位置，不适合切削材料。",
    "warning": "执行G00前必须确认Z向安全高度和路径不会穿过夹具或工件。",
    "example": "G00 X100. Y50. Z50. 表示快速移动到指定坐标。",
    "risk": "高",
    "tags": [
      "G00",
      "快速定位",
      "空行程",
      "安全高度"
    ]
  },
  {
    "id": "kb-gcode-g01",
    "category": "G代码",
    "title": "G01 直线插补",
    "code": "G01",
    "aliases": [
      "直线切削",
      "线性插补",
      "Linear interpolation"
    ],
    "summary": "让刀具按给定进给速度沿直线切削到目标坐标。",
    "usage": "铣平面、车外圆、走直边轮廓、切槽直线段时使用。",
    "beginner": "看到G01就要同时关注F进给。",
    "warning": "漏写F或沿用上一次过大的F，可能造成刀具损坏或工件报废。",
    "example": "G01 X50. F200. 表示以F200直线切削到X50。",
    "risk": "高",
    "tags": [
      "G01",
      "直线插补",
      "进给",
      "切削"
    ]
  },
  {
    "id": "kb-gcode-g02",
    "category": "G代码",
    "title": "G02 顺时针圆弧插补",
    "code": "G02",
    "aliases": [
      "顺圆",
      "CW圆弧",
      "Clockwise arc"
    ],
    "summary": "让刀具按顺时针方向加工圆弧轨迹。",
    "usage": "加工外轮廓圆角、圆孔轮廓、圆弧槽时使用。",
    "beginner": "判断顺逆时针要站在当前加工平面的正方向看。",
    "warning": "IJK圆心增量和R半径写法不要混用错，平面G17/G18/G19也必须正确。",
    "example": "G17 G02 X50. Y20. R10. F150. 表示XY平面顺时针圆弧。",
    "risk": "高",
    "tags": [
      "G02",
      "圆弧插补",
      "顺时针",
      "IJK",
      "R"
    ]
  },
  {
    "id": "kb-gcode-g03",
    "category": "G代码",
    "title": "G03 逆时针圆弧插补",
    "code": "G03",
    "aliases": [
      "逆圆",
      "CCW圆弧",
      "Counterclockwise arc"
    ],
    "summary": "让刀具按逆时针方向加工圆弧轨迹。",
    "usage": "加工逆向圆角、圆弧槽、孔轮廓时使用。",
    "beginner": "G02/G03不是看屏幕左右，而是看当前平面的正方向。",
    "warning": "平面选择错误会让圆弧方向、圆心解释全部变错。",
    "example": "G17 G03 X20. Y50. I0. J15. F120. 表示XY平面逆时针圆弧。",
    "risk": "高",
    "tags": [
      "G03",
      "圆弧插补",
      "逆时针",
      "IJK"
    ]
  },
  {
    "id": "kb-gcode-g04",
    "category": "G代码",
    "title": "G04 暂停/延时",
    "code": "G04",
    "aliases": [
      "停顿",
      "延时",
      "Dwell"
    ],
    "summary": "让程序在当前位置暂停指定时间。",
    "usage": "钻孔底部停留、退屑、主轴稳定、自动夹紧后等待时使用。",
    "beginner": "G04是等一会儿，不是停止程序。",
    "warning": "不同系统P/X单位可能是毫秒或秒，必须按机床说明书确认。",
    "example": "G04 P1000 通常表示暂停约1秒，具体以系统参数为准。",
    "risk": "中",
    "tags": [
      "G04",
      "暂停",
      "延时",
      "Dwell"
    ]
  },
  {
    "id": "kb-gcode-g05",
    "category": "G代码",
    "title": "G05 高速/高精度控制相关指令",
    "code": "G05",
    "aliases": [
      "高速加工",
      "AI轮廓控制",
      "High speed control"
    ],
    "summary": "G05在FANUC中常与高速高精度控制选项有关，具体格式依系统而定。",
    "usage": "模具加工、复杂曲面精加工、高速小线段加工时可能使用。",
    "beginner": "新手不要把G05当普通移动指令。",
    "warning": "G05/G05.1属于选项功能，未开通或格式不对会报警。",
    "example": "常见格式如G05.1 Q1开启AI轮廓控制，G05.1 Q0取消。",
    "risk": "中",
    "tags": [
      "G05",
      "高速加工",
      "AI轮廓控制",
      "选项功能"
    ]
  },
  {
    "id": "kb-gcode-g06",
    "category": "G代码",
    "title": "G06 抛物线插补/特殊插补",
    "code": "G06",
    "aliases": [
      "特殊插补",
      "Parabolic interpolation"
    ],
    "summary": "G06在部分FANUC系统中用于特殊插补，很多机床不启用。",
    "usage": "少数旧系统或特定加工功能中可能出现。",
    "beginner": "看到G06先查机床说明书。",
    "warning": "通用加工程序中不要随意使用G06，跨机床兼容性很差。",
    "example": "若程序出现G06，应确认该机床是否支持对应特殊插补格式。",
    "risk": "低",
    "tags": [
      "G06",
      "特殊插补",
      "选项功能"
    ]
  },
  {
    "id": "kb-gcode-g07",
    "category": "G代码",
    "title": "G07 圆柱插补/虚拟轴相关",
    "code": "G07",
    "aliases": [
      "圆柱插补",
      "Cylindrical interpolation",
      "G07.1"
    ],
    "summary": "G07常与圆柱插补或虚拟轴功能相关，常见实际格式为G07.1。",
    "usage": "在圆柱表面铣槽、刻字、展开加工时可能使用。",
    "beginner": "圆柱插补要先搞清楚旋转轴和半径。",
    "warning": "轴名、半径、单位和机床选项不一致会导致轨迹完全错误。",
    "example": "常见用法如G07.1 C50. 开启以C轴半径50的圆柱插补。",
    "risk": "中",
    "tags": [
      "G07",
      "G07.1",
      "圆柱插补",
      "C轴"
    ]
  },
  {
    "id": "kb-gcode-g08",
    "category": "G代码",
    "title": "G08 预读/加速控制相关",
    "code": "G08",
    "aliases": [
      "预读控制",
      "Look-ahead",
      "高级预读"
    ],
    "summary": "G08在部分FANUC系统中与预读或加速控制有关，现代系统常用替代功能。",
    "usage": "高速加工大量短线段时可能遇到。",
    "beginner": "它不是普通切削指令，而是控制加工平顺性的辅助G功能。",
    "warning": "不同年代FANUC系统差异大，照搬旧程序前必须验证。",
    "example": "旧程序中如G08 P1可能表示开启预读控制，具体以系统为准。",
    "risk": "低",
    "tags": [
      "G08",
      "预读",
      "高速加工"
    ]
  },
  {
    "id": "kb-gcode-g09",
    "category": "G代码",
    "title": "G09 准确停止检查",
    "code": "G09",
    "aliases": [
      "精确停止",
      "Exact stop check",
      "单段准确停止"
    ],
    "summary": "让当前程序段结束时进行准确到位检查后再执行下一段。",
    "usage": "用于尖角、定位孔、对接轮廓等不希望圆滑过渡的位置。",
    "beginner": "G09只影响当前一段，G61才是模式。",
    "warning": "频繁使用会降低效率，但可提高关键位置轮廓准确性。",
    "example": "G09 G01 X50. F200. 表示该直线段终点准确停止。",
    "risk": "中",
    "tags": [
      "G09",
      "准确停止",
      "轮廓精度"
    ]
  },
  {
    "id": "kb-gcode-g10",
    "category": "G代码",
    "title": "G10 可编程数据输入",
    "code": "G10",
    "aliases": [
      "参数写入",
      "坐标写入",
      "Programmable data input"
    ],
    "summary": "G10可在程序中写入工件坐标、刀具补偿或其它受当前控制器支持的数据；可写对象与格式取决于CNC系统和机床厂配置。",
    "usage": "仅在已经确认本机支持的G10格式、目标数据区、写入方式与权限后，用于受控设置或批量初始化。",
    "beginner": "把G10理解成会改机床数据的写入指令。先确认写什么、写到哪里、当前是绝对还是增量解释，再考虑是否允许执行。",
    "warning": "L/P/轴地址、可写对象、G90/G91下的绝对或增量解释以及写入权限会因控制系统和机床厂配置不同而变化。执行前必须核对当前CNC/机床厂原厂手册和现场工艺，备份原数据，并由授权人员确认；教学示例不能直接拿到真实机床执行。",
    "example": "教学示例：在部分明确支持该格式的控制系统中，G10 L2 P1 ... 可用于工件坐标相关数据写入；L2、P1、轴地址以及G90/G91下的解释必须逐项以本机原厂手册为准。未确认前不要上机执行。",
    "risk": "高",
    "tags": [
      "G10",
      "可编程数据输入",
      "坐标写入",
      "刀补",
      "原厂手册",
      "授权操作"
    ]
  },
  {
    "id": "kb-gcode-g11",
    "category": "G代码",
    "title": "G11 可编程数据输入取消",
    "code": "G11",
    "aliases": [
      "G10取消",
      "数据输入取消"
    ],
    "summary": "取消可编程数据输入模式，回到普通解释状态。",
    "usage": "使用G10写入数据后，用于结束该状态。",
    "beginner": "写完G10相关内容要确认是否需要G11取消。",
    "warning": "部分系统不要求单独G11，仍应按本机床说明书处理。",
    "example": "G11 表示结束可编程数据输入模式。",
    "risk": "中",
    "tags": [
      "G11",
      "G10取消",
      "数据输入"
    ]
  },
  {
    "id": "kb-gcode-g12",
    "category": "G代码",
    "title": "G12 厂家自定义/圆弧口袋相关",
    "code": "G12",
    "aliases": [
      "圆形口袋",
      "自定义循环",
      "Machine option"
    ],
    "summary": "G12在很多FANUC机床上不是统一标准，部分机床用于顺时针圆形口袋循环。",
    "usage": "加工圆形槽或口袋时，某些厂家宏程序会使用。",
    "beginner": "不要默认所有FANUC都支持G12。",
    "warning": "G12/G13多为机床厂家扩展或宏程序封装，换机床前必须测试。",
    "example": "某些机床上G12 I20. D01 F200. 可能表示顺时针圆形口袋。",
    "risk": "中",
    "tags": [
      "G12",
      "圆形口袋",
      "厂家自定义"
    ]
  },
  {
    "id": "kb-gcode-g13",
    "category": "G代码",
    "title": "G13 厂家自定义/逆向圆弧口袋相关",
    "code": "G13",
    "aliases": [
      "逆向圆形口袋",
      "自定义循环",
      "Machine option"
    ],
    "summary": "G13常不是FANUC统一标准，部分机床用于逆时针圆形口袋循环。",
    "usage": "与G12成对用于不同方向的圆形口袋加工。",
    "beginner": "先确认本机床的G13说明，再决定能不能用。",
    "warning": "跨品牌或跨系统复制G13程序风险较高。",
    "example": "某些机床上G13 I20. D01 F200. 可能表示逆时针圆形口袋。",
    "risk": "中",
    "tags": [
      "G13",
      "圆形口袋",
      "厂家自定义"
    ]
  },
  {
    "id": "kb-gcode-g14",
    "category": "G代码",
    "title": "G14 备用/厂家自定义G功能",
    "code": "G14",
    "aliases": [
      "备用G代码",
      "自定义G代码"
    ],
    "summary": "G14在通用FANUC编程中通常没有统一固定功能。",
    "usage": "只有在机床厂家说明书或后处理明确使用时才会出现。",
    "beginner": "看到不认识的G14，不要猜。",
    "warning": "擅自删除或替换可能破坏厂家循环，也可能引发报警。",
    "example": "旧程序含G14时，应先查该机床G代码表。",
    "risk": "低",
    "tags": [
      "G14",
      "备用",
      "厂家自定义"
    ]
  },
  {
    "id": "kb-gcode-g15",
    "category": "G代码",
    "title": "G15 极坐标指令取消",
    "code": "G15",
    "aliases": [
      "极坐标取消",
      "Polar cancel"
    ],
    "summary": "取消极坐标编程模式，恢复普通直角坐标输入。",
    "usage": "使用G16极坐标加工孔阵列后，用于退出极坐标。",
    "beginner": "G16用完记得G15。",
    "warning": "忘记取消极坐标，后续X/Y会被继续按角度和半径解释。",
    "example": "G15 表示取消极坐标编程。",
    "risk": "中",
    "tags": [
      "G15",
      "极坐标",
      "取消"
    ]
  },
  {
    "id": "kb-gcode-g16",
    "category": "G代码",
    "title": "G16 极坐标指令",
    "code": "G16",
    "aliases": [
      "极坐标编程",
      "Polar coordinate"
    ],
    "summary": "用半径和角度方式指定点位，适合圆周分布特征。",
    "usage": "圆周孔、分度孔、法兰孔阵列加工时使用。",
    "beginner": "G16下通常X表示半径，Y表示角度，具体看系统。",
    "warning": "极坐标必须配合正确的坐标原点，否则孔位整体偏移。",
    "example": "G16 X50. Y30. 可表示半径50、角度30度的位置。",
    "risk": "中",
    "tags": [
      "G16",
      "极坐标",
      "孔阵列"
    ]
  },
  {
    "id": "kb-gcode-g17",
    "category": "G代码",
    "title": "G17 XY平面选择",
    "code": "G17",
    "aliases": [
      "XY平面",
      "Plane XY"
    ],
    "summary": "指定圆弧、刀补、钻孔循环等在XY平面内解释。",
    "usage": "立式加工中心铣平面、钻孔时最常用。",
    "beginner": "加工中心默认多为G17，但程序开头最好写清楚。",
    "warning": "平面选错会导致圆弧IJK方向和固定循环轴向错误。",
    "example": "G17 G02 X50. Y50. R10. 表示XY平面圆弧。",
    "risk": "高",
    "tags": [
      "G17",
      "平面选择",
      "XY平面"
    ]
  },
  {
    "id": "kb-gcode-g18",
    "category": "G代码",
    "title": "G18 ZX平面选择",
    "code": "G18",
    "aliases": [
      "ZX平面",
      "Plane ZX"
    ],
    "summary": "指定圆弧、刀补等在ZX平面内解释。",
    "usage": "车床外圆端面、加工中心侧面圆弧加工时使用。",
    "beginner": "车床常用G18解释X-Z轮廓。",
    "warning": "从铣床程序切到车床思路时，要特别注意G18与G17差异。",
    "example": "G18 G03 X30. Z-20. R5. 表示ZX平面圆弧。",
    "risk": "高",
    "tags": [
      "G18",
      "平面选择",
      "ZX平面",
      "车床"
    ]
  },
  {
    "id": "kb-gcode-g19",
    "category": "G代码",
    "title": "G19 YZ平面选择",
    "code": "G19",
    "aliases": [
      "YZ平面",
      "Plane YZ"
    ],
    "summary": "指定圆弧、刀补等在YZ平面内解释。",
    "usage": "侧面加工、卧加特定方向圆弧加工时使用。",
    "beginner": "只有在需要YZ平面圆弧时才切换G19。",
    "warning": "G19后若忘记切回G17，后续XY圆弧会报警或轨迹错误。",
    "example": "G19 G02 Y20. Z-10. R4. 表示YZ平面圆弧。",
    "risk": "中",
    "tags": [
      "G19",
      "平面选择",
      "YZ平面"
    ]
  },
  {
    "id": "kb-gcode-g20",
    "category": "G代码",
    "title": "G20 英制单位输入",
    "code": "G20",
    "aliases": [
      "英寸",
      "Inch input"
    ],
    "summary": "把程序尺寸解释为英寸单位。",
    "usage": "加工英制图纸或海外程序时使用。",
    "beginner": "国内公制机床看到G20要特别警惕。",
    "warning": "G20/G21切换错误会让尺寸放大或缩小25.4倍，风险极高。",
    "example": "G20 X1.0 表示X为1英寸，而不是1毫米。",
    "risk": "高",
    "tags": [
      "G20",
      "英制",
      "单位"
    ]
  },
  {
    "id": "kb-gcode-g21",
    "category": "G代码",
    "title": "G21 公制单位输入",
    "code": "G21",
    "aliases": [
      "毫米",
      "Metric input"
    ],
    "summary": "把程序尺寸解释为毫米单位。",
    "usage": "国内数控加工最常见的单位模式。",
    "beginner": "程序开头建议明确写G21。",
    "warning": "从英制程序改公制程序时，不能只改G20/G21，还要核对所有尺寸和进给。",
    "example": "G21 X25. 表示X为25毫米。",
    "risk": "高",
    "tags": [
      "G21",
      "公制",
      "毫米",
      "单位"
    ]
  },
  {
    "id": "kb-gcode-g22",
    "category": "G代码",
    "title": "G22 存储行程检查开启",
    "code": "G22",
    "aliases": [
      "行程保护开启",
      "Stored stroke check on"
    ],
    "summary": "开启系统设定的禁止进入区域或行程保护检查。",
    "usage": "防止刀具进入夹具、尾座、卡盘等危险区域时使用。",
    "beginner": "它是保护功能，不是加工功能。",
    "warning": "保护区域参数设置不对，可能误报警或保护失效。",
    "example": "G22 表示开启存储行程检查。",
    "risk": "中",
    "tags": [
      "G22",
      "行程保护",
      "安全"
    ]
  },
  {
    "id": "kb-gcode-g23",
    "category": "G代码",
    "title": "G23 存储行程检查取消",
    "code": "G23",
    "aliases": [
      "行程保护取消",
      "Stored stroke check off"
    ],
    "summary": "取消存储行程检查功能。",
    "usage": "调机、特殊退刀或维护时可能临时使用。",
    "beginner": "正常加工不建议随意取消保护。",
    "warning": "关闭保护后撞夹具风险上升，必须确认安全再执行。",
    "example": "G23 表示取消存储行程检查。",
    "risk": "高",
    "tags": [
      "G23",
      "行程保护",
      "取消"
    ]
  },
  {
    "id": "kb-gcode-g24",
    "category": "G代码",
    "title": "G24 备用/厂家自定义G功能",
    "code": "G24",
    "aliases": [
      "备用G代码",
      "自定义G代码"
    ],
    "summary": "G24在通用FANUC编程中通常没有统一标准功能。",
    "usage": "只有本机床说明书规定时才使用。",
    "beginner": "不要把G24当成通用指令。",
    "warning": "旧程序中的G24可能是厂家宏或选项，必须查来源。",
    "example": "程序出现G24时，应核对机床G代码一览表。",
    "risk": "低",
    "tags": [
      "G24",
      "备用",
      "厂家自定义"
    ]
  },
  {
    "id": "kb-gcode-g25",
    "category": "G代码",
    "title": "G25 主轴速度波动检测取消/特殊功能",
    "code": "G25",
    "aliases": [
      "速度波动检测取消",
      "Spindle fluctuation off"
    ],
    "summary": "G25在部分FANUC车床中用于取消主轴速度波动检测，也可能为厂家定义。",
    "usage": "恒线速、螺纹加工或特殊主轴监控场景可能出现。",
    "beginner": "先确认系统是否把G25定义为该功能。",
    "warning": "主轴监控功能关系到螺纹和表面质量，不能随意关闭。",
    "example": "G25 可能表示取消主轴速度波动检测，具体以机床为准。",
    "risk": "中",
    "tags": [
      "G25",
      "主轴",
      "检测",
      "厂家差异"
    ]
  },
  {
    "id": "kb-gcode-g26",
    "category": "G代码",
    "title": "G26 主轴速度波动检测开启/特殊功能",
    "code": "G26",
    "aliases": [
      "速度波动检测开启",
      "Spindle fluctuation on"
    ],
    "summary": "G26在部分FANUC车床中用于开启主轴速度波动检测，也可能为厂家定义。",
    "usage": "需要监控主轴转速稳定性时可能使用。",
    "beginner": "它不是普通运动代码。",
    "warning": "不同系统定义差异较大，必须与说明书一致。",
    "example": "G26 可能表示开启主轴速度波动检测。",
    "risk": "中",
    "tags": [
      "G26",
      "主轴",
      "检测",
      "厂家差异"
    ]
  },
  {
    "id": "kb-gcode-g27",
    "category": "G代码",
    "title": "G27 返回参考点检查",
    "code": "G27",
    "aliases": [
      "原点检查",
      "Reference position check"
    ],
    "summary": "检查指定轴是否能准确回到参考点。",
    "usage": "换刀前、自动循环前、安全确认时使用。",
    "beginner": "G27是检查，不是普通回零。",
    "warning": "中间点设置不安全会让轴移动路径碰撞。",
    "example": "G91 G27 X0 Y0 Z0 用于检查当前位置到参考点关系。",
    "risk": "高",
    "tags": [
      "G27",
      "参考点",
      "回零检查"
    ]
  },
  {
    "id": "kb-gcode-g28",
    "category": "G代码",
    "title": "G28 自动返回参考点",
    "code": "G28",
    "aliases": [
      "回机械原点",
      "Return to reference"
    ],
    "summary": "自动返回机床参考点，属于高风险自动运动；中间位置、轴向、顺序和参考点状态的处理取决于当前CNC和机床厂配置。",
    "usage": "仅在已按本机原厂手册确认G90/G91解释、参考点状态、安全撤离方向和完整运动路径后，按现场工艺与授权操作规程受控使用。",
    "beginner": "把G28理解成会触发自动参考点返回的高风险运动；不要把G91 G28 Z0或固定“先Z后XY”当成通用防撞规则。",
    "warning": "G90/G91会影响中间位置的绝对或增量解释；各轴方向与顺序、参考点状态和安全路径还受控制系统与机床厂配置影响。执行前必须核对当前CNC和机床厂原厂手册，确认刀具、刀柄、工件、夹具在完整计划运动空间内都有安全间隙，并按现场工艺和授权操作规程验证。",
    "example": "教学格式示意：某些常见控制配置可见G91 G28 Z0，但这不能作为防撞保证；真实格式、中间位置与安全路径必须逐项以本机原厂手册为准，并先做受控验证。",
    "risk": "高",
    "tags": [
      "G28",
      "回零",
      "参考点",
      "安全"
    ]
  },
  {
    "id": "kb-gcode-g29",
    "category": "G代码",
    "title": "G29 从参考点返回",
    "code": "G29",
    "aliases": [
      "参考点返回后回到目标点",
      "Return from reference"
    ],
    "summary": "从参考点经中间点移动到指定位置。",
    "usage": "与G28配套，在自动流程中从参考点返回加工区。",
    "beginner": "新手用得少，看到G29要确认前面是否执行过G28。",
    "warning": "若前置参考点状态不正确，可能移动异常或报警。",
    "example": "G29 X0 Y0 Z50. 表示从参考点返回到指定点。",
    "risk": "中",
    "tags": [
      "G29",
      "参考点返回",
      "回零"
    ]
  },
  {
    "id": "kb-gcode-g30",
    "category": "G代码",
    "title": "G30 返回第二/第三/第四参考点",
    "code": "G30",
    "aliases": [
      "第二原点",
      "换刀点",
      "Second reference point"
    ],
    "summary": "让机床返回参数设定的第2、第3或第4参考点。",
    "usage": "自动换刀点、托盘交换点、测头停靠点常用。",
    "beginner": "G30不是一定回机械零点，而是回预设参考点。",
    "warning": "参考点参数设错或路径不安全会导致碰撞。",
    "example": "G91 G30 Z0 可让Z轴返回第二参考点。",
    "risk": "高",
    "tags": [
      "G30",
      "第二参考点",
      "换刀点"
    ]
  },
  {
    "id": "kb-gcode-g31",
    "category": "G代码",
    "title": "G31 跳转/跳步功能",
    "code": "G31",
    "aliases": [
      "跳跃功能",
      "Skip function",
      "测头跳过"
    ],
    "summary": "轴运动过程中接收到外部跳过信号后记录位置并进入下一段。",
    "usage": "测头测量、对刀仪测刀、自动找边时使用。",
    "beginner": "G31常用于测量，不是普通切削。",
    "warning": "测头信号、速度、方向错误会撞坏测头。",
    "example": "G31 Z-50. F100. 表示Z向探测到信号后跳过。",
    "risk": "高",
    "tags": [
      "G31",
      "测头",
      "跳步",
      "对刀"
    ]
  },
  {
    "id": "kb-gcode-g32",
    "category": "G代码",
    "title": "G32 螺纹切削",
    "code": "G32",
    "aliases": [
      "单刀螺纹",
      "Thread cutting"
    ],
    "summary": "按主轴同步关系进行螺纹切削，常见于车床。",
    "usage": "车削外螺纹、内螺纹的基础螺纹指令。",
    "beginner": "螺纹加工要确认主轴编码器和进给单位。",
    "warning": "起刀位置、退刀槽、牙距写错容易乱牙或撞刀。",
    "example": "G32 Z-30. F1.5 表示按1.5牙距车削螺纹。",
    "risk": "高",
    "tags": [
      "G32",
      "螺纹",
      "车床",
      "主轴同步"
    ]
  },
  {
    "id": "kb-gcode-g33",
    "category": "G代码",
    "title": "G33 螺纹切削/特殊螺纹功能",
    "code": "G33",
    "aliases": [
      "Thread cutting",
      "特殊螺纹"
    ],
    "summary": "G33在部分FANUC系统中也用于螺纹切削或特殊同步进给。",
    "usage": "特定车床、铣床攻牙或旧程序螺纹段中可能出现。",
    "beginner": "G32和G33不要想当然互换。",
    "warning": "不同系统G33格式差异明显，必须确认机床支持。",
    "example": "程序中出现G33 Z-20. F2.0 时，应按本机床螺纹格式检查。",
    "risk": "高",
    "tags": [
      "G33",
      "螺纹",
      "同步进给"
    ]
  },
  {
    "id": "kb-gcode-g34",
    "category": "G代码",
    "title": "G34 变导程螺纹切削",
    "code": "G34",
    "aliases": [
      "变牙距螺纹",
      "Variable lead thread"
    ],
    "summary": "用于加工导程逐渐变化的螺纹，属于较高级螺纹功能。",
    "usage": "特殊丝杠、油槽、变距螺纹加工时使用。",
    "beginner": "普通螺纹不要用G34，G32/G76更常见。",
    "warning": "导程变化量设置错误会直接造成螺纹报废。",
    "example": "G34 Z-50. F2.0 K0.05 可表示变导程螺纹，格式以系统为准。",
    "risk": "高",
    "tags": [
      "G34",
      "变导程螺纹",
      "车床"
    ]
  },
  {
    "id": "kb-gcode-g35",
    "category": "G代码",
    "title": "G35 备用/厂家自定义G功能",
    "code": "G35",
    "aliases": [
      "备用G代码",
      "自定义G代码"
    ],
    "summary": "G35在通用FANUC中没有统一固定功能，部分系统用于测量或补偿相关功能。",
    "usage": "只有机床厂家或后处理明确说明时使用。",
    "beginner": "看到G35先查本机说明书。",
    "warning": "不要把其它品牌的G35含义套到FANUC上。",
    "example": "旧程序出现G35时，先在MDI空运行或仿真验证。",
    "risk": "低",
    "tags": [
      "G35",
      "备用",
      "厂家自定义"
    ]
  },
  {
    "id": "kb-gcode-g36",
    "category": "G代码",
    "title": "G36 自动刀具补偿/测量相关",
    "code": "G36",
    "aliases": [
      "自动刀补",
      "测量补偿"
    ],
    "summary": "G36在部分FANUC系统中与自动刀具补偿或测量功能相关。",
    "usage": "测头自动测量工件尺寸并修正刀补时可能使用。",
    "beginner": "它通常依赖测头、宏程序和参数选项。",
    "warning": "测量方向、补偿号、允许修正量设置错误会造成批量尺寸跑偏。",
    "example": "G36 X50. D01 可能表示测量并修正X方向刀补，具体以机床为准。",
    "risk": "中",
    "tags": [
      "G36",
      "自动补偿",
      "测量"
    ]
  },
  {
    "id": "kb-gcode-g37",
    "category": "G代码",
    "title": "G37 自动刀具长度测量",
    "code": "G37",
    "aliases": [
      "自动测刀",
      "Tool length measurement"
    ],
    "summary": "G37常用于自动刀具长度测量或测量相关功能。",
    "usage": "加工中心用对刀仪自动测刀长时可能使用。",
    "beginner": "测刀前先确认测头位置和刀具长度大概范围。",
    "warning": "快速接近过低或测头高度设置错误会撞坏对刀仪。",
    "example": "G37 Z-100. H01 可能表示测量并写入H01刀长，格式以机床为准。",
    "risk": "高",
    "tags": [
      "G37",
      "自动测刀",
      "刀长补偿"
    ]
  },
  {
    "id": "kb-gcode-g38",
    "category": "G代码",
    "title": "G38 备用/厂家自定义G功能",
    "code": "G38",
    "aliases": [
      "备用G代码",
      "自定义G代码"
    ],
    "summary": "G38在通用FANUC中通常没有统一标准功能。",
    "usage": "少数机床可能用于测量、探针或厂家循环。",
    "beginner": "不要凭记忆使用G38。",
    "warning": "跨机床迁移时必须逐条核对。",
    "example": "遇到G38应查机床厂G代码表。",
    "risk": "低",
    "tags": [
      "G38",
      "备用",
      "厂家自定义"
    ]
  },
  {
    "id": "kb-gcode-g39",
    "category": "G代码",
    "title": "G39 拐角圆弧插补/转角功能",
    "code": "G39",
    "aliases": [
      "拐角圆弧",
      "Corner circular interpolation"
    ],
    "summary": "G39在部分FANUC系统中用于刀补状态下的拐角圆弧插补。",
    "usage": "轮廓加工中需要在拐角自动加入圆弧过渡时使用。",
    "beginner": "它和G02/G03不同，常与刀补状态有关。",
    "warning": "半径、刀补方向和轮廓关系错误会导致过切。",
    "example": "G41后使用G39可在特定系统中生成拐角圆弧。",
    "risk": "中",
    "tags": [
      "G39",
      "拐角",
      "刀补",
      "圆弧"
    ]
  },
  {
    "id": "kb-gcode-g40",
    "category": "G代码",
    "title": "G40 刀具半径补偿取消",
    "code": "G40",
    "aliases": [
      "刀补取消",
      "Cutter comp cancel"
    ],
    "summary": "取消G41/G42刀具半径补偿。",
    "usage": "轮廓加工结束、退刀到安全位置后使用。",
    "beginner": "刀补开启后一定要用G40取消。",
    "warning": "取消点位置不合理会产生过切或报警。",
    "example": "G40 G01 X0 Y0 表示直线移动并取消刀具半径补偿。",
    "risk": "高",
    "tags": [
      "G40",
      "刀补取消",
      "半径补偿"
    ]
  },
  {
    "id": "kb-gcode-g41",
    "category": "G代码",
    "title": "G41 刀具半径左补偿",
    "code": "G41",
    "aliases": [
      "左刀补",
      "Cutter comp left"
    ],
    "summary": "沿刀具前进方向看，刀具中心偏在轮廓左侧。",
    "usage": "用实际刀具半径加工图纸轮廓左侧补偿时使用。",
    "beginner": "判断左补右补，要顺着刀具运动方向看。",
    "warning": "刀补建立段长度不足或D号错误会报警或过切。",
    "example": "G41 D01 G01 X0 Y0 F200. 表示启用D01左刀补。",
    "risk": "高",
    "tags": [
      "G41",
      "左刀补",
      "半径补偿",
      "D补偿"
    ]
  },
  {
    "id": "kb-gcode-g42",
    "category": "G代码",
    "title": "G42 刀具半径右补偿",
    "code": "G42",
    "aliases": [
      "右刀补",
      "Cutter comp right"
    ],
    "summary": "沿刀具前进方向看，刀具中心偏在轮廓右侧。",
    "usage": "用实际刀具半径加工图纸轮廓右侧补偿时使用。",
    "beginner": "不要用屏幕左右判断G41/G42。",
    "warning": "D补偿值符号、进退刀方向和轮廓方向都要核对。",
    "example": "G42 D01 G01 X50. Y0 F200. 表示启用D01右刀补。",
    "risk": "高",
    "tags": [
      "G42",
      "右刀补",
      "半径补偿",
      "D补偿"
    ]
  },
  {
    "id": "kb-gcode-g43",
    "category": "G代码",
    "title": "G43 刀具长度正补偿",
    "code": "G43",
    "aliases": [
      "刀长补偿",
      "H补偿",
      "Tool length compensation +"
    ],
    "summary": "按H号调用刀具长度补偿，使Z坐标按刀长修正。",
    "usage": "加工中心换刀后建立刀长时使用。",
    "beginner": "每把刀下刀前都要确认T号和H号对应。",
    "warning": "H号用错是加工中心最常见撞刀原因之一。",
    "example": "G43 H01 Z100. 表示调用H01刀长补偿并到Z100。",
    "risk": "高",
    "tags": [
      "G43",
      "刀长补偿",
      "H补偿",
      "Z安全"
    ]
  },
  {
    "id": "kb-gcode-g44",
    "category": "G代码",
    "title": "G44 刀具长度负补偿",
    "code": "G44",
    "aliases": [
      "负刀长补偿",
      "Tool length compensation -"
    ],
    "summary": "按相反方向应用刀具长度补偿，现代加工中较少使用。",
    "usage": "特殊机床、特殊测量或旧程序中可能出现。",
    "beginner": "大多数新手只需要掌握G43。",
    "warning": "误用G44会使Z向补偿方向相反，撞刀风险很高。",
    "example": "G44 H01 Z100. 表示按负方向调用H01补偿。",
    "risk": "高",
    "tags": [
      "G44",
      "刀长补偿",
      "负补偿"
    ]
  },
  {
    "id": "kb-gcode-g45",
    "category": "G代码",
    "title": "G45 刀具位置补偿增加",
    "code": "G45",
    "aliases": [
      "刀具偏置增加",
      "Tool offset increase"
    ],
    "summary": "按设定补偿量增加指定轴的位置偏置，属于旧式刀具位置补偿。",
    "usage": "老机床、特殊刀补程序或维护程序中可能出现。",
    "beginner": "现代轮廓加工通常用G41/G42和G43。",
    "warning": "不了解补偿表含义时不要随意执行G45-G48。",
    "example": "G45 X10. D01 可能表示按D01增加X方向偏置。",
    "risk": "中",
    "tags": [
      "G45",
      "位置补偿",
      "旧式刀补"
    ]
  },
  {
    "id": "kb-gcode-g46",
    "category": "G代码",
    "title": "G46 刀具位置补偿减少",
    "code": "G46",
    "aliases": [
      "刀具偏置减少",
      "Tool offset decrease"
    ],
    "summary": "按设定补偿量减少指定轴的位置偏置，属于旧式刀具位置补偿。",
    "usage": "老程序中的尺寸修正或特殊补偿场景。",
    "beginner": "先弄清楚补偿号和方向，再判断能不能执行。",
    "warning": "补偿方向理解反了会造成尺寸越调越偏。",
    "example": "G46 X10. D01 可能表示按D01减少X方向偏置。",
    "risk": "中",
    "tags": [
      "G46",
      "位置补偿",
      "旧式刀补"
    ]
  },
  {
    "id": "kb-gcode-g47",
    "category": "G代码",
    "title": "G47 刀具位置补偿双倍增加",
    "code": "G47",
    "aliases": [
      "双倍增加补偿",
      "Double offset increase"
    ],
    "summary": "按两倍补偿量增加位置偏置，属于较少见旧式补偿。",
    "usage": "特殊旧程序或维修调试中可能出现。",
    "beginner": "新手看到G47要停下来查。",
    "warning": "双倍补偿效果明显，误用容易造成大尺寸偏差。",
    "example": "G47 X10. D01 表示可能按两倍D01增加偏置。",
    "risk": "中",
    "tags": [
      "G47",
      "位置补偿",
      "双倍补偿"
    ]
  },
  {
    "id": "kb-gcode-g48",
    "category": "G代码",
    "title": "G48 刀具位置补偿双倍减少",
    "code": "G48",
    "aliases": [
      "双倍减少补偿",
      "Double offset decrease"
    ],
    "summary": "按两倍补偿量减少位置偏置，属于较少见旧式补偿。",
    "usage": "特殊旧程序或维修调试中可能出现。",
    "beginner": "不要把G48和M48混淆。",
    "warning": "双倍补偿可能造成明显过切或欠切。",
    "example": "G48 X10. D01 表示可能按两倍D01减少偏置。",
    "risk": "中",
    "tags": [
      "G48",
      "位置补偿",
      "双倍补偿"
    ]
  },
  {
    "id": "kb-gcode-g49",
    "category": "G代码",
    "title": "G49 刀具长度补偿取消",
    "code": "G49",
    "aliases": [
      "刀长取消",
      "H补偿取消"
    ],
    "summary": "取消G43/G44刀具长度补偿。",
    "usage": "加工结束、换刀前、程序复位段常用。",
    "beginner": "取消刀长前先保证Z轴在安全位置。",
    "warning": "在低Z位置取消G43可能让显示坐标和实际安全距离突然变化。",
    "example": "G49 表示取消刀具长度补偿。",
    "risk": "高",
    "tags": [
      "G49",
      "刀长取消",
      "H补偿"
    ]
  },
  {
    "id": "kb-gcode-g50",
    "category": "G代码",
    "title": "G50 坐标设定/主轴限速/缩放取消",
    "code": "G50",
    "aliases": [
      "G50",
      "坐标设定",
      "最高转速限制"
    ],
    "summary": "G50在车床常用于坐标设定或恒线速最高转速限制，在加工中心也可能用于缩放取消。",
    "usage": "车床G96恒线速前限制最高转速，或旧程序设定坐标时使用。",
    "beginner": "G50含义最容易因机型不同而混淆。",
    "warning": "车床上漏写G50限速，G96靠近中心时主轴可能转速过高。",
    "example": "G50 S2000 表示恒线速模式下主轴最高限制2000转/分。",
    "risk": "高",
    "tags": [
      "G50",
      "限速",
      "坐标设定",
      "车床"
    ]
  },
  {
    "id": "kb-gcode-g51",
    "category": "G代码",
    "title": "G51 缩放功能",
    "code": "G51",
    "aliases": [
      "比例缩放",
      "Scaling"
    ],
    "summary": "按指定比例放大或缩小程序轨迹。",
    "usage": "同形状不同尺寸零件、图形比例加工时使用。",
    "beginner": "G51用完要取消，且要确认缩放中心。",
    "warning": "缩放会影响坐标轨迹，忘记取消会让后续加工尺寸全错。",
    "example": "G51 X0 Y0 P2.0 可能表示以原点为中心放大2倍。",
    "risk": "中",
    "tags": [
      "G51",
      "缩放",
      "比例"
    ]
  },
  {
    "id": "kb-gcode-g52",
    "category": "G代码",
    "title": "G52 局部坐标系设定",
    "code": "G52",
    "aliases": [
      "局部坐标",
      "Local coordinate"
    ],
    "summary": "在当前工件坐标系内再建立一个临时局部偏移。",
    "usage": "重复局部结构、临时调整编程原点时使用。",
    "beginner": "G52像在G54里面又加了一个小偏置。",
    "warning": "G52未清零会影响后续所有坐标，排查很隐蔽。",
    "example": "G52 X20. Y10. 表示建立局部坐标偏移。",
    "risk": "高",
    "tags": [
      "G52",
      "局部坐标",
      "坐标偏移"
    ]
  },
  {
    "id": "kb-gcode-g53",
    "category": "G代码",
    "title": "G53 机床坐标系定位",
    "code": "G53",
    "aliases": [
      "机械坐标",
      "Machine coordinate"
    ],
    "summary": "G53常用于在当前程序段按机床坐标解释定位，通常属于非模态的高风险运动；具体对工件坐标偏置、刀补或其它补偿的影响取决于当前CNC和机床厂实现。",
    "usage": "只有在已经核对本机原厂手册、机床坐标零点、目标机械坐标、刀补状态、轴行程和完整计划运动空间后，才可按现场工艺受控使用。",
    "beginner": "把G53理解成“按本机规定使用机床坐标的高风险定位”，不是自动安全退刀。不能把Z0、换刀点或任何固定机械坐标当成跨机床通用安全点。",
    "warning": "机床坐标零点、G53是否忽略或取消刀补/其它补偿以及各轴可达范围会因控制器和机床配置不同而变化。执行前必须核对当前CNC和机床厂原厂手册，确认刀具、刀柄、工件、夹具在完整计划运动空间内都有安全间隙，并按现场规程先做单段、低倍率或空运行验证。",
    "example": "教学格式示意：部分控制器程序中可见G53 G00 Z...按机床坐标定位；实际目标值、运动方式和刀补影响必须逐项以本机原厂手册为准，不能把Z0直接当成安全位置复制到真实机床。",
    "risk": "高",
    "tags": [
      "G53",
      "机械坐标",
      "高风险运动",
      "机床坐标零点",
      "原厂手册",
      "空运行"
    ]
  },
  {
    "id": "kb-gcode-g54",
    "category": "G代码",
    "title": "G54 第一工件坐标系",
    "code": "G54",
    "aliases": [
      "G54坐标",
      "工件坐标1"
    ],
    "summary": "调用第一组工件坐标偏置。",
    "usage": "单件加工或第一工位常用。",
    "beginner": "G54就是告诉机床工件零点在哪里。",
    "warning": "坐标系设置错，程序轨迹整体偏移，轻则报废重则撞机。",
    "example": "G54 G00 X0 Y0 表示在G54坐标系下移动到工件零点。",
    "risk": "高",
    "tags": [
      "G54",
      "工件坐标",
      "零点"
    ]
  },
  {
    "id": "kb-gcode-g55",
    "category": "G代码",
    "title": "G55 第二工件坐标系",
    "code": "G55",
    "aliases": [
      "G55坐标",
      "工件坐标2"
    ],
    "summary": "调用第二组工件坐标偏置。",
    "usage": "多工位夹具、第二个零件或第二道工序使用。",
    "beginner": "多个零点加工时，用G55区分第二个位置。",
    "warning": "切换坐标系前要确认刀具位置安全，避免跨工位碰撞。",
    "example": "G55 G00 X0 Y0 表示移动到第二工件坐标零点。",
    "risk": "高",
    "tags": [
      "G55",
      "工件坐标",
      "多工位"
    ]
  },
  {
    "id": "kb-gcode-g56",
    "category": "G代码",
    "title": "G56 第三工件坐标系",
    "code": "G56",
    "aliases": [
      "G56坐标",
      "工件坐标3"
    ],
    "summary": "调用第三组工件坐标偏置。",
    "usage": "多件排版加工、夹具第三工位使用。",
    "beginner": "G54-G59只是不同工件零点，不是不同程序。",
    "warning": "坐标号和实际夹具位置对应错会加工到错误工位。",
    "example": "G56 G00 X0 Y0 表示调用第三工件坐标系。",
    "risk": "高",
    "tags": [
      "G56",
      "工件坐标",
      "多工位"
    ]
  },
  {
    "id": "kb-gcode-g57",
    "category": "G代码",
    "title": "G57 第四工件坐标系",
    "code": "G57",
    "aliases": [
      "G57坐标",
      "工件坐标4"
    ],
    "summary": "调用第四组工件坐标偏置。",
    "usage": "多工位、多件阵列或夹具第四位置使用。",
    "beginner": "坐标越多，越要做坐标表记录。",
    "warning": "错把G57当G54会造成整件偏位。",
    "example": "G57 G00 X0 Y0 表示到第四工件坐标原点。",
    "risk": "高",
    "tags": [
      "G57",
      "工件坐标",
      "多工位"
    ]
  },
  {
    "id": "kb-gcode-g58",
    "category": "G代码",
    "title": "G58 第五工件坐标系",
    "code": "G58",
    "aliases": [
      "G58坐标",
      "工件坐标5"
    ],
    "summary": "调用第五组工件坐标偏置。",
    "usage": "多工位加工中第五个零点使用。",
    "beginner": "确认当前程序段到底在哪个坐标系里运行。",
    "warning": "程序中连续切换G54-G59时，必须核对每段安全高度。",
    "example": "G58 G00 X0 Y0 表示调用第五工件坐标系。",
    "risk": "高",
    "tags": [
      "G58",
      "工件坐标",
      "多工位"
    ]
  },
  {
    "id": "kb-gcode-g59",
    "category": "G代码",
    "title": "G59 第六工件坐标系",
    "code": "G59",
    "aliases": [
      "G59坐标",
      "工件坐标6"
    ],
    "summary": "调用第六组工件坐标偏置。",
    "usage": "多工位夹具、第六件或特殊偏置使用。",
    "beginner": "G59不是最大扩展坐标，很多系统还有G54.1。",
    "warning": "坐标系越靠后越容易被忽略，调机时要逐个确认。",
    "example": "G59 G00 X0 Y0 表示调用第六工件坐标系。",
    "risk": "高",
    "tags": [
      "G59",
      "工件坐标",
      "多工位"
    ]
  },
  {
    "id": "kb-gcode-g60",
    "category": "G代码",
    "title": "G60 单方向定位",
    "code": "G60",
    "aliases": [
      "单向定位",
      "One direction positioning"
    ],
    "summary": "让轴总是从同一方向接近目标位置，以减少反向间隙影响。",
    "usage": "精密孔位、镗孔定位、消除丝杠间隙影响时使用。",
    "beginner": "它是为了定位精度，不是为了加工速度。",
    "warning": "单向定位可能多走一段让位距离，需确认周围空间。",
    "example": "G60 X100. 表示以单方向定位方式到X100。",
    "risk": "中",
    "tags": [
      "G60",
      "单向定位",
      "精度"
    ]
  },
  {
    "id": "kb-gcode-g61",
    "category": "G代码",
    "title": "G61 准确停止模式",
    "code": "G61",
    "aliases": [
      "精确停止模式",
      "Exact stop mode"
    ],
    "summary": "让连续程序段在每段终点准确到位后再继续。",
    "usage": "高精度轮廓、尖角、定位要求高的加工场景。",
    "beginner": "G61是模态，影响后续段。",
    "warning": "一直开G61会使加工变慢，并可能在轮廓上留下停顿痕。",
    "example": "G61 G01 X50. F200. 表示进入准确停止模式。",
    "risk": "中",
    "tags": [
      "G61",
      "准确停止",
      "模态"
    ]
  },
  {
    "id": "kb-gcode-g62",
    "category": "G代码",
    "title": "G62 自动拐角倍率调整",
    "code": "G62",
    "aliases": [
      "拐角减速",
      "Automatic corner override"
    ],
    "summary": "在内拐角等位置自动调整进给倍率，改善轮廓质量。",
    "usage": "轮廓加工需要兼顾效率和拐角质量时使用。",
    "beginner": "它属于控制加工平顺性的模式。",
    "warning": "具体效果受系统参数影响，不同机床表现不同。",
    "example": "G62 可开启自动拐角倍率调整模式，具体以系统为准。",
    "risk": "中",
    "tags": [
      "G62",
      "拐角",
      "进给控制"
    ]
  },
  {
    "id": "kb-gcode-g63",
    "category": "G代码",
    "title": "G63 攻丝模式",
    "code": "G63",
    "aliases": [
      "刚性/同步攻丝相关",
      "Tapping mode"
    ],
    "summary": "用于攻丝相关的进给控制模式，具体含义因系统配置而异。",
    "usage": "丝锥攻牙或旧式同步攻丝程序中可能出现。",
    "beginner": "攻丝一定要核对转速、螺距和底孔。",
    "warning": "主轴转向、退刀、孔深错误会折断丝锥。",
    "example": "G63 Z-15. F1.25 可能表示按螺距进给攻丝。",
    "risk": "高",
    "tags": [
      "G63",
      "攻丝",
      "丝锥"
    ]
  },
  {
    "id": "kb-gcode-g64",
    "category": "G代码",
    "title": "G64 连续切削模式",
    "code": "G64",
    "aliases": [
      "切削模式",
      "Continuous cutting mode"
    ],
    "summary": "允许程序段之间平滑连续运动，提高加工效率和表面连续性。",
    "usage": "普通轮廓加工、曲面加工中常用。",
    "beginner": "多数加工可用G64保持连续。",
    "warning": "高速下过度圆滑可能影响尖角精度，需要配合公差控制。",
    "example": "G64 表示进入连续切削模式。",
    "risk": "中",
    "tags": [
      "G64",
      "连续切削",
      "轮廓"
    ]
  },
  {
    "id": "kb-gcode-g65",
    "category": "G代码",
    "title": "G65 宏程序非模态调用",
    "code": "G65",
    "aliases": [
      "宏调用",
      "Macro call"
    ],
    "summary": "调用指定宏程序一次，并可传递变量参数。",
    "usage": "封装孔阵列、倒角、测量、专用循环时使用。",
    "beginner": "G65像调用一个自定义小程序。",
    "warning": "参数字母与宏变量对应关系要清楚，否则宏动作会错。",
    "example": "G65 P9001 A10. B20. 表示调用O9001宏并传入参数。",
    "risk": "中",
    "tags": [
      "G65",
      "宏程序",
      "变量"
    ]
  },
  {
    "id": "kb-gcode-g66",
    "category": "G代码",
    "title": "G66 宏程序模态调用",
    "code": "G66",
    "aliases": [
      "模态宏调用",
      "Modal macro call"
    ],
    "summary": "调用宏程序并保持模态，使后续移动段自动执行该宏逻辑。",
    "usage": "孔阵列、重复加工、测量循环中可能使用。",
    "beginner": "G66会一直生效，直到G67取消。",
    "warning": "忘记G67取消会让后续移动都触发宏程序。",
    "example": "G66 P9001 A5. 后续坐标段会按宏逻辑执行。",
    "risk": "高",
    "tags": [
      "G66",
      "宏程序",
      "模态调用"
    ]
  },
  {
    "id": "kb-gcode-g67",
    "category": "G代码",
    "title": "G67 宏程序模态调用取消",
    "code": "G67",
    "aliases": [
      "取消模态宏",
      "Macro modal cancel"
    ],
    "summary": "取消G66模态宏调用。",
    "usage": "模态宏循环结束后必须执行。",
    "beginner": "看到G66就要找后面有没有G67。",
    "warning": "漏掉G67会造成程序后续动作异常。",
    "example": "G67 表示取消模态宏调用。",
    "risk": "中",
    "tags": [
      "G67",
      "宏程序",
      "取消"
    ]
  },
  {
    "id": "kb-gcode-g68",
    "category": "G代码",
    "title": "G68 坐标旋转",
    "code": "G68",
    "aliases": [
      "坐标系旋转",
      "Coordinate rotation"
    ],
    "summary": "把编程坐标按指定角度旋转。",
    "usage": "斜孔阵列、斜槽、重复角度特征加工时使用。",
    "beginner": "G68可以少算很多旋转后的坐标。",
    "warning": "旋转中心、角度正负和取消G69必须确认。",
    "example": "G68 X0 Y0 R45. 表示以原点为中心旋转45度。",
    "risk": "中",
    "tags": [
      "G68",
      "坐标旋转",
      "角度"
    ]
  },
  {
    "id": "kb-gcode-g69",
    "category": "G代码",
    "title": "G69 坐标旋转取消",
    "code": "G69",
    "aliases": [
      "取消旋转",
      "Rotation cancel"
    ],
    "summary": "取消G68坐标旋转，恢复原坐标方向。",
    "usage": "旋转加工结束后使用。",
    "beginner": "G68用完一定写G69。",
    "warning": "忘记取消会让后续所有坐标继续旋转。",
    "example": "G69 表示取消坐标旋转。",
    "risk": "中",
    "tags": [
      "G69",
      "坐标旋转",
      "取消"
    ]
  },
  {
    "id": "kb-gcode-g70",
    "category": "G代码",
    "title": "G70 精加工循环/英制输入旧用法",
    "code": "G70",
    "aliases": [
      "精车循环",
      "Finishing cycle"
    ],
    "summary": "在FANUC车床中G70常用于精加工循环，按前面定义的轮廓进行精车。",
    "usage": "车削粗加工G71/G72/G73之后，用G70完成精加工。",
    "beginner": "G70通常不是单独写轮廓，而是调用P-Q段。",
    "warning": "P/Q段号写错会调用错误轮廓；铣床上G70含义可能不同。",
    "example": "G70 P100 Q200 表示按N100到N200轮廓精加工。",
    "risk": "高",
    "tags": [
      "G70",
      "精加工循环",
      "车床"
    ]
  },
  {
    "id": "kb-gcode-g71",
    "category": "G代码",
    "title": "G71 外圆/内孔粗车循环",
    "code": "G71",
    "aliases": [
      "粗车循环",
      "Turning roughing cycle"
    ],
    "summary": "车床常用粗加工循环，按指定余量分层去除外圆或内孔材料。",
    "usage": "轴类、套类零件外圆内孔粗车时使用。",
    "beginner": "G71负责粗车，G70负责精车。",
    "warning": "吃刀量、退刀量、精加工余量和P/Q轮廓必须核对。",
    "example": "G71 U2. R0.5；G71 P100 Q200 U0.3 W0.1 F0.25。",
    "risk": "高",
    "tags": [
      "G71",
      "粗车循环",
      "车床"
    ]
  },
  {
    "id": "kb-gcode-g72",
    "category": "G代码",
    "title": "G72 端面粗车循环",
    "code": "G72",
    "aliases": [
      "端面粗加工",
      "Facing roughing cycle"
    ],
    "summary": "车床常用端面方向粗加工循环。",
    "usage": "盘类零件、端面台阶、端面轮廓粗加工时使用。",
    "beginner": "G72适合以端面方向为主的余量去除。",
    "warning": "P/Q轮廓方向和退刀方向错误会造成异常走刀。",
    "example": "G72 W1.5 R0.5；G72 P100 Q200 U0.2 W0.1 F0.2。",
    "risk": "高",
    "tags": [
      "G72",
      "端面粗车",
      "车床"
    ]
  },
  {
    "id": "kb-gcode-g73",
    "category": "G代码",
    "title": "G73 成形重复循环/高速深孔钻",
    "code": "G73",
    "aliases": [
      "仿形粗车",
      "高速深孔钻",
      "Peck drilling"
    ],
    "summary": "G73在车床常为成形重复粗车循环，在加工中心常为高速啄钻循环。",
    "usage": "车床用于毛坯形状接近零件的粗车；加工中心用于浅啄钻。",
    "beginner": "G73是典型的车铣含义不同代码。",
    "warning": "不分机型直接套用G73，可能把钻孔循环误当车削循环。",
    "example": "加工中心：G73 X0 Y0 Z-20. Q2. R2. F120.；车床：G73 U... W...。",
    "risk": "高",
    "tags": [
      "G73",
      "啄钻",
      "仿形粗车",
      "车铣差异"
    ]
  },
  {
    "id": "kb-gcode-g74",
    "category": "G代码",
    "title": "G74 左旋攻丝/端面切槽循环",
    "code": "G74",
    "aliases": [
      "反攻丝",
      "端面槽",
      "Left hand tapping"
    ],
    "summary": "G74在加工中心常用于左旋攻丝，在车床常用于端面切槽或深孔钻循环。",
    "usage": "反牙攻丝、端面槽、端面钻削时可能使用。",
    "beginner": "G74车铣差异很大，必须看机床类型。",
    "warning": "攻丝时主轴方向和螺距错误会折丝锥；车槽时退刀量错误会闷刀。",
    "example": "加工中心：G74 Z-15. R2. F1.25；车床：G74 R...。",
    "risk": "高",
    "tags": [
      "G74",
      "左旋攻丝",
      "端面槽",
      "车铣差异"
    ]
  },
  {
    "id": "kb-gcode-g75",
    "category": "G代码",
    "title": "G75 外径/内径切槽循环",
    "code": "G75",
    "aliases": [
      "切槽循环",
      "Grooving cycle"
    ],
    "summary": "车床常用径向切槽或断续切槽循环。",
    "usage": "外圆槽、内孔槽、切断前开槽时使用。",
    "beginner": "G75适合槽宽较大、需要分次退屑的切槽。",
    "warning": "槽刀宽度、槽底直径、退刀量和排屑空间要核对。",
    "example": "G75 R0.2；G75 X30. Z-20. P1000 Q2000 F0.08。",
    "risk": "高",
    "tags": [
      "G75",
      "切槽",
      "车床"
    ]
  },
  {
    "id": "kb-gcode-g76",
    "category": "G代码",
    "title": "G76 复合螺纹循环/精镗循环",
    "code": "G76",
    "aliases": [
      "螺纹循环",
      "Fine boring"
    ],
    "summary": "G76在车床常为复合螺纹循环，在加工中心常为精镗循环。",
    "usage": "车削螺纹或加工中心精镗孔时使用。",
    "beginner": "G76也是车铣含义差异很大的代码。",
    "warning": "车床G76参数复杂，牙型角、精车次数、最小吃刀量写错会乱牙。",
    "example": "车床：G76 P020060 Q100 R0.05；加工中心：G76 Z-20. R2. Q0.2 F80.。",
    "risk": "高",
    "tags": [
      "G76",
      "螺纹循环",
      "精镗",
      "车铣差异"
    ]
  },
  {
    "id": "kb-gcode-g77",
    "category": "G代码",
    "title": "G77 备用/厂家自定义G功能",
    "code": "G77",
    "aliases": [
      "备用G代码",
      "自定义G代码"
    ],
    "summary": "G77在通用FANUC中通常没有统一标准功能。",
    "usage": "少数机床或厂家宏循环可能使用。",
    "beginner": "遇到G77先查说明书，不要猜含义。",
    "warning": "厂家循环可能控制夹具、测量或特殊加工，误删会改变程序逻辑。",
    "example": "程序中出现G77时，应结合机床厂家G代码表确认。",
    "risk": "低",
    "tags": [
      "G77",
      "备用",
      "厂家自定义"
    ]
  },
  {
    "id": "kb-gcode-g78",
    "category": "G代码",
    "title": "G78 备用/厂家自定义G功能",
    "code": "G78",
    "aliases": [
      "备用G代码",
      "自定义G代码"
    ],
    "summary": "G78在通用FANUC中通常没有统一标准功能。",
    "usage": "可能用于特定厂家循环或选项功能。",
    "beginner": "不要把网上某一台机床的G78当通用规则。",
    "warning": "同为FANUC系统，不同机床厂定义可能不同。",
    "example": "遇到G78需查看该设备专用说明。",
    "risk": "低",
    "tags": [
      "G78",
      "备用",
      "厂家自定义"
    ]
  },
  {
    "id": "kb-gcode-g79",
    "category": "G代码",
    "title": "G79 备用/厂家自定义G功能",
    "code": "G79",
    "aliases": [
      "备用G代码",
      "自定义G代码"
    ],
    "summary": "G79在通用FANUC中通常没有统一标准功能。",
    "usage": "可能作为特殊循环、宏程序入口或保留代码。",
    "beginner": "看到G79要按本机床资料确认。",
    "warning": "未知G代码直接运行可能报警或触发非预期动作。",
    "example": "旧程序有G79时，应先仿真和空运行。",
    "risk": "低",
    "tags": [
      "G79",
      "备用",
      "厂家自定义"
    ]
  },
  {
    "id": "kb-gcode-g80",
    "category": "G代码",
    "title": "G80 固定循环取消",
    "code": "G80",
    "aliases": [
      "钻孔循环取消",
      "Canned cycle cancel"
    ],
    "summary": "取消G81-G89等固定循环。",
    "usage": "钻孔、攻丝、镗孔循环结束后使用。",
    "beginner": "固定循环做完一定写G80。",
    "warning": "忘记G80，后续坐标移动可能继续打孔。",
    "example": "G80 表示取消固定循环。",
    "risk": "高",
    "tags": [
      "G80",
      "固定循环",
      "取消"
    ]
  },
  {
    "id": "kb-gcode-g81",
    "category": "G代码",
    "title": "G81 钻孔循环",
    "code": "G81",
    "aliases": [
      "普通钻孔",
      "Drilling cycle"
    ],
    "summary": "最基础的钻孔固定循环，快速到R点后按F进给钻到Z深度再退回。",
    "usage": "浅孔、通孔、中心孔等普通钻削使用。",
    "beginner": "G81适合简单孔，不适合深孔强排屑。",
    "warning": "Z深度、R平面和G98/G99返回方式必须确认。",
    "example": "G81 X0 Y0 Z-10. R2. F100. 表示钻孔到Z-10。",
    "risk": "高",
    "tags": [
      "G81",
      "钻孔",
      "固定循环"
    ]
  },
  {
    "id": "kb-gcode-g82",
    "category": "G代码",
    "title": "G82 锪孔/带暂停钻孔循环",
    "code": "G82",
    "aliases": [
      "定点钻",
      "Spot drilling",
      "Counter boring"
    ],
    "summary": "钻到底部后暂停一段时间再退回，改善孔底或锪孔质量。",
    "usage": "锪平面、沉孔、定心孔底部停留时使用。",
    "beginner": "G82比G81多了底部暂停。",
    "warning": "P暂停时间单位要确认，停太久可能烧刀。",
    "example": "G82 X0 Y0 Z-5. R2. P500 F80. 表示孔底暂停后退刀。",
    "risk": "高",
    "tags": [
      "G82",
      "锪孔",
      "暂停",
      "固定循环"
    ]
  },
  {
    "id": "kb-gcode-g83",
    "category": "G代码",
    "title": "G83 深孔啄钻循环",
    "code": "G83",
    "aliases": [
      "深孔钻",
      "Peck drilling"
    ],
    "summary": "分段钻入并退刀排屑，适合较深孔加工。",
    "usage": "孔深超过约3倍径、排屑困难时使用。",
    "beginner": "深孔优先考虑G83，不要一刀闷到底。",
    "warning": "Q啄钻量过大易断钻，过小效率低；R平面要安全。",
    "example": "G83 X0 Y0 Z-40. R2. Q3. F80. 表示每次啄钻3mm。",
    "risk": "高",
    "tags": [
      "G83",
      "深孔",
      "啄钻",
      "排屑"
    ]
  },
  {
    "id": "kb-gcode-g84",
    "category": "G代码",
    "title": "G84 右旋攻丝循环",
    "code": "G84",
    "aliases": [
      "攻牙",
      "Tapping cycle"
    ],
    "summary": "主轴正转进给攻丝，到底后反转退回。",
    "usage": "普通右旋螺纹孔攻丝时使用。",
    "beginner": "攻丝的F要等于螺距或按系统要求设置。",
    "warning": "底孔、转速、螺距、深度错一个就容易断丝锥。",
    "example": "G84 X0 Y0 Z-15. R2. F1.25 表示攻M8常见1.25螺距。",
    "risk": "高",
    "tags": [
      "G84",
      "攻丝",
      "丝锥",
      "固定循环"
    ]
  },
  {
    "id": "kb-gcode-g85",
    "category": "G代码",
    "title": "G85 镗孔循环",
    "code": "G85",
    "aliases": [
      "镗孔",
      "Boring cycle"
    ],
    "summary": "进给镗到孔底后以进给方式退回。",
    "usage": "普通镗孔、铰孔类要求平稳退刀的孔加工。",
    "beginner": "G85退刀也是进给，孔壁质量较稳定。",
    "warning": "镗刀方向、孔底余量和退刀路径要确认。",
    "example": "G85 X0 Y0 Z-20. R2. F60. 表示镗孔到Z-20后进给退回。",
    "risk": "高",
    "tags": [
      "G85",
      "镗孔",
      "固定循环"
    ]
  },
  {
    "id": "kb-gcode-g86",
    "category": "G代码",
    "title": "G86 镗孔循环/主轴停转快速退回",
    "code": "G86",
    "aliases": [
      "镗孔停主轴",
      "Boring spindle stop"
    ],
    "summary": "镗到孔底后主轴停止，再快速退回。",
    "usage": "部分粗镗或不要求退刀刀痕的孔加工使用。",
    "beginner": "G86孔底会停主轴。",
    "warning": "刀具未让刀就快速退回，可能划伤孔壁或碰刀。",
    "example": "G86 X0 Y0 Z-20. R2. F60. 表示孔底停主轴后退回。",
    "risk": "高",
    "tags": [
      "G86",
      "镗孔",
      "主轴停止"
    ]
  },
  {
    "id": "kb-gcode-g87",
    "category": "G代码",
    "title": "G87 反镗循环",
    "code": "G87",
    "aliases": [
      "背镗",
      "Back boring"
    ],
    "summary": "用于从孔背面加工沉孔或背面镗孔。",
    "usage": "反面沉孔、背面倒角、特殊背镗工艺使用。",
    "beginner": "G87动作复杂，新手不要直接照抄。",
    "warning": "刀具偏移量、主轴定向、让刀方向错误极易撞刀。",
    "example": "G87 X0 Y0 Z-10. R2. Q0.5 F50. 具体格式以机床为准。",
    "risk": "高",
    "tags": [
      "G87",
      "反镗",
      "背镗",
      "固定循环"
    ]
  },
  {
    "id": "kb-gcode-g88",
    "category": "G代码",
    "title": "G88 镗孔循环/手动退回",
    "code": "G88",
    "aliases": [
      "手动镗孔",
      "Boring manual retract"
    ],
    "summary": "镗到底部后暂停，通常需要人工或指定动作退回。",
    "usage": "需要检查孔底或特殊退刀控制时使用。",
    "beginner": "G88不是普通自动钻孔循环。",
    "warning": "自动线或无人值守程序中慎用，可能停机等待。",
    "example": "G88 X0 Y0 Z-20. R2. P1000 F50. 表示镗孔后暂停。",
    "risk": "中",
    "tags": [
      "G88",
      "镗孔",
      "手动退回"
    ]
  },
  {
    "id": "kb-gcode-g89",
    "category": "G代码",
    "title": "G89 镗孔循环/孔底暂停",
    "code": "G89",
    "aliases": [
      "镗孔暂停",
      "Boring dwell"
    ],
    "summary": "镗到孔底后暂停，再以进给退回。",
    "usage": "精镗、铰孔、需要孔底稳定的加工使用。",
    "beginner": "G89比G85多了孔底暂停。",
    "warning": "暂停过长会产生刀痕或发热。",
    "example": "G89 X0 Y0 Z-20. R2. P500 F50. 表示孔底暂停后退回。",
    "risk": "高",
    "tags": [
      "G89",
      "镗孔",
      "暂停",
      "固定循环"
    ]
  },
  {
    "id": "kb-gcode-g90",
    "category": "G代码",
    "title": "G90 绝对坐标编程/车床外径循环",
    "code": "G90",
    "aliases": [
      "绝对编程",
      "Absolute",
      "外径固定循环"
    ],
    "summary": "加工中心常用G90表示绝对坐标；FANUC车床中也可能表示外径/内径切削循环。",
    "usage": "铣床程序定位最常用；车床固定循环中也常见。",
    "beginner": "铣床学编程先掌握G90绝对坐标。",
    "warning": "车铣含义不同，车床上不要把G90简单理解为绝对模式。",
    "example": "加工中心：G90 G00 X50. Y20.；车床：G90 X30. Z-20. F0.2。",
    "risk": "高",
    "tags": [
      "G90",
      "绝对坐标",
      "车铣差异"
    ]
  },
  {
    "id": "kb-gcode-g91",
    "category": "G代码",
    "title": "G91 增量坐标编程",
    "code": "G91",
    "aliases": [
      "相对编程",
      "Incremental"
    ],
    "summary": "坐标值表示相对当前位置的移动量。",
    "usage": "回参考点、孔距移动、重复偏移加工时使用。",
    "beginner": "G91是走多少，不是走到哪里。",
    "warning": "G90/G91混用错误是撞机高发原因。",
    "example": "G91 G00 Z10. 表示Z轴从当前位置再上移10mm。",
    "risk": "高",
    "tags": [
      "G91",
      "增量坐标",
      "相对移动"
    ]
  },
  {
    "id": "kb-gcode-g92",
    "category": "G代码",
    "title": "G92 坐标偏移/车床螺纹循环",
    "code": "G92",
    "aliases": [
      "坐标偏移",
      "坐标设定",
      "Thread cycle",
      "G92"
    ],
    "summary": "G92不是跨机型同一含义：在部分铣床/加工中心控制器中用于工作坐标系偏移或坐标设定相关功能；在部分车床控制器中则是螺纹车削循环。具体语义、模态状态和地址格式必须按当前CNC与机床厂原厂手册确认。",
    "usage": "只有先确认当前机型、控制器和G92组别后再使用。铣削坐标类用法需核对当前工件坐标系、已有G52/G54-G59等偏移以及设定/清除规则；车床螺纹循环需核对起始位置、X/Z或U/W、I/Q/F等地址解释、主轴与进给同步、退刀或倒角设置及完整运动空间。",
    "beginner": "看到G92先问：这是哪台机床、哪种控制器，当前是铣削坐标功能还是车床螺纹循环？两类程序不能直接互抄。",
    "warning": "G92在不同CNC上可能改变后续坐标解释，也可能直接进入螺纹切削循环；组别、模态性、清除方式和地址含义并不统一。上机前必须核对当前CNC和机床厂原厂手册，确认坐标偏移、刀补与现有G52/G54-G59状态，或确认螺纹参数、起始位置、主轴同步和安全退刀空间；先在仿真、图形检查或受控单段条件下验证，教学示例不得直接作为真实机床参数。",
    "example": "教学格式示意：部分车床系统中G92 X... Z... F...可表示简单螺纹循环；部分铣床/加工中心系统中G92 X...则用于坐标偏移或设定相关功能。两者语义不同，X/Z/U/W/I/Q/F、模态状态和清除方式必须逐项以本机原厂手册为准。",
    "risk": "高",
    "tags": [
      "G92",
      "车铣差异",
      "坐标偏移",
      "螺纹循环",
      "原厂手册",
      "主轴同步"
    ]
  },
  {
    "id": "kb-gcode-g93",
    "category": "G代码",
    "title": "G93 反时间进给",
    "code": "G93",
    "aliases": [
      "倒数时间进给",
      "Inverse time feed"
    ],
    "summary": "F值表示完成当前段所需时间的倒数，常用于多轴联动。",
    "usage": "五轴联动、复杂曲面或后处理输出中可能使用。",
    "beginner": "普通三轴加工很少手写G93。",
    "warning": "G93下F含义和G94完全不同，误用会导致进给异常。",
    "example": "G93 G01 X10. A30. F2. 表示按反时间进给执行。",
    "risk": "中",
    "tags": [
      "G93",
      "反时间进给",
      "五轴"
    ]
  },
  {
    "id": "kb-gcode-g94",
    "category": "G代码",
    "title": "G94 每分钟进给模式/车床端面循环",
    "code": "G94",
    "aliases": [
      "每分钟进给",
      "Feed per minute",
      "端面车削循环",
      "车铣差异"
    ],
    "summary": "G94不是跨机型同一含义：在部分铣床/加工中心控制器中用于每分钟进给模式；在部分车床控制器中则可能是端面/直线车削循环。具体语义、组别、模态状态和地址格式必须按当前CNC与机床厂原厂手册确认。",
    "usage": "先确认当前机型、控制器和G94组别。铣削进给模式需核对G93/G94/G95之间的模式关系、当前公制/英制状态以及F的单位与含义；车床循环需核对起始位置、X/Z或U/W、K/F等地址解释、返回/退刀路径、刀补与完整计划运动空间。",
    "beginner": "看到G94先问：这是哪台机床、哪种控制器？是铣削的每分钟进给模式，还是车床端面循环？两类程序不能直接互抄。",
    "warning": "把铣削进给模式当成车床循环，或把车床循环当成铣削进给模式，会让程序含义完全改变。上机前必须核对当前CNC与机床厂原厂手册，确认G93/G94/G95、单位制、F含义，或确认X/Z/U/W/K/F、起始位置、返回/退刀路径、主轴和刀补状态；同时确认刀具、刀柄、工件、夹具在完整计划运动空间内有安全间隙，并按现场规程先做仿真、图形检查、单段或低风险受控验证。教学示例不得直接作为真实机床参数。",
    "example": "教学语义示意：部分铣床/加工中心中G94表示每分钟进给模式；部分车床中G94表示端面/直线车削循环。两类语义不能互抄，具体F单位、循环地址、起始位置与返回路径必须逐项以本机原厂手册为准。",
    "risk": "高",
    "tags": [
      "G94",
      "车铣差异",
      "每分钟进给",
      "端面循环",
      "G93/G95",
      "原厂手册"
    ]
  },
  {
    "id": "kb-gcode-g95",
    "category": "G代码",
    "title": "G95 每转进给",
    "code": "G95",
    "aliases": [
      "每转进给",
      "Feed per revolution"
    ],
    "summary": "F值表示主轴每转刀具进给多少，常用于车削。",
    "usage": "车床外圆、端面、切槽等按转进给加工时使用。",
    "beginner": "车床常用G95配合F0.2这类每转进给。",
    "warning": "主轴未稳定或单位理解错会导致切削负载异常。",
    "example": "G95 F0.2 表示主轴每转进给0.2mm。",
    "risk": "高",
    "tags": [
      "G95",
      "每转进给",
      "车床"
    ]
  },
  {
    "id": "kb-gcode-g96",
    "category": "G代码",
    "title": "G96 恒线速度控制",
    "code": "G96",
    "aliases": [
      "恒线速",
      "CSS"
    ],
    "summary": "根据加工直径自动调整主轴转速，使切削线速度保持恒定。",
    "usage": "车床端面、外圆精车、直径变化较大加工时使用。",
    "beginner": "用G96前先用G50限制最高转速。",
    "warning": "靠近中心时若无限速，主轴可能飙到危险转速。",
    "example": "G50 S2000；G96 S180 表示线速度180m/min且最高2000转。",
    "risk": "高",
    "tags": [
      "G96",
      "恒线速",
      "车床",
      "G50"
    ]
  },
  {
    "id": "kb-gcode-g97",
    "category": "G代码",
    "title": "G97 恒转速控制",
    "code": "G97",
    "aliases": [
      "取消恒线速",
      "Constant RPM"
    ],
    "summary": "取消G96恒线速，改为固定主轴转速。",
    "usage": "钻孔、攻丝、切槽、螺纹或不适合变转速加工时使用。",
    "beginner": "G97后S就是转/分。",
    "warning": "忘记从G96切回G97，孔加工或攻丝可能转速异常。",
    "example": "G97 S800 M03 表示主轴固定800转/分正转。",
    "risk": "高",
    "tags": [
      "G97",
      "恒转速",
      "取消恒线速"
    ]
  },
  {
    "id": "kb-gcode-g98",
    "category": "G代码",
    "title": "G98 固定循环初始平面返回/车床每分钟进给",
    "code": "G98",
    "aliases": ["初始平面返回", "Initial point return", "每分钟进给", "车铣差异"],
    "summary": "G98不是跨机型同一含义：在部分铣床/加工中心控制器中，它在固定循环语境用于返回循环开始前的初始Z平面；在部分车床控制器中则用于每分钟进给模式。具体组别、模态性与F地址解释必须按当前CNC和机床厂原厂手册确认。",
    "usage": "先确认机型、控制器、当前G代码组别和是否处于固定循环。铣削侧要核对进入循环前的初始Z位置、R平面、夹具/凸台等障碍物和完整计划运动空间；车削侧要核对公制/英制、F的单位与含义、主轴及其它进给模式状态。",
    "beginner": "看到G98先问：这是铣床固定循环的返回方式，还是车床的每分钟进给？不要把“G98一定退得更高”当成跨机床口诀。",
    "warning": "铣削固定循环中，初始平面与R平面的实际高低关系由程序进入状态和本机规则决定，不能只凭G98/G99名称判断安全；车床侧G98会改变F地址的解释。真实机床必须核对当前CNC和机床厂原厂手册，并结合夹具、工件、刀具、刀柄与完整运动空间做图形检查、仿真、单段或其它受控验证。",
    "example": "教学语义示意：部分铣床/加工中心中G98表示固定循环返回初始平面；部分车床中G98表示每分钟进给。两类语义不能互抄，实际坐标、单位与进给值必须逐项以本机原厂手册和现场工艺为准。",
    "risk": "高",
    "tags": ["G98", "车铣差异", "固定循环", "初始平面", "每分钟进给", "原厂手册"]
  },
  {
    "id": "kb-gcode-g99",
    "category": "G代码",
    "title": "G99 固定循环R平面返回/车床每转进给",
    "code": "G99",
    "aliases": ["R平面返回", "R plane return", "每转进给", "车铣差异"],
    "summary": "G99不是跨机型同一含义：在部分铣床/加工中心控制器中，它在固定循环语境用于返回R平面；在部分车床控制器中则用于每转进给模式。具体组别、模态性与F地址解释必须按当前CNC和机床厂原厂手册确认。",
    "usage": "先确认机型、控制器、当前G代码组别和是否处于固定循环。铣削侧要核对R平面、进入循环前的初始Z位置、孔间移动路径、夹具/凸台等障碍物和完整计划运动空间；车削侧要核对公制/英制、F的每转单位与含义、主轴状态及其它进给模式。",
    "beginner": "看到G99先问：这是铣床固定循环的R平面返回，还是车床的每转进给？不要把“G99一定更低、更快或绝对安全”当成通用规则。",
    "warning": "铣削固定循环中，只有在本机规则与当前程序状态下确认R平面及孔间路径避开全部障碍物，才能判断返回路径是否合适；车床侧G99会把F解释为每转进给。真实机床必须核对当前CNC和机床厂原厂手册、主轴与单位状态，并按现场工艺做图形检查、仿真、单段或其它受控验证。",
    "example": "教学语义示意：部分铣床/加工中心中G99表示固定循环返回R平面；部分车床中G99表示每转进给。两类语义不能互抄，实际R平面、单位与进给值必须逐项以本机原厂手册和现场工艺为准。",
    "risk": "高",
    "tags": ["G99", "车铣差异", "固定循环", "R平面", "每转进给", "原厂手册"]
  },
  {
    "id": "kb-mcode-m00",
    "category": "M代码",
    "title": "M00 程序停止",
    "code": "M00",
    "aliases": [
      "程序暂停",
      "Program stop"
    ],
    "summary": "执行到M00时程序无条件停止，等待操作者重新启动。",
    "usage": "中途检查尺寸、清屑、翻面前人工确认时使用。",
    "beginner": "M00会停下来等人，不是程序结束。",
    "warning": "自动生产中随意放M00会导致机床停机等待。",
    "example": "M00 表示程序执行到此处暂停。",
    "risk": "中",
    "tags": [
      "M00",
      "程序停止",
      "暂停"
    ]
  },
  {
    "id": "kb-mcode-m01",
    "category": "M代码",
    "title": "M01 选择停止",
    "code": "M01",
    "aliases": [
      "可选停止",
      "Optional stop"
    ],
    "summary": "只有面板选择停止开关打开时，执行到M01才会暂停。",
    "usage": "首件调试、关键工序检查、可跳过检验点常用。",
    "beginner": "M01是否停，取决于机床面板的选择停止开关。",
    "warning": "批量加工前确认开关状态，否则可能意外停机或漏检。",
    "example": "M01 表示选择停止，开关打开时暂停。",
    "risk": "中",
    "tags": [
      "M01",
      "选择停止",
      "调试"
    ]
  },
  {
    "id": "kb-mcode-m02",
    "category": "M代码",
    "title": "M02 程序结束",
    "code": "M02",
    "aliases": [
      "程序结束",
      "End of program"
    ],
    "summary": "结束当前程序，通常不自动返回程序开头。",
    "usage": "老程序或简单程序结束时使用。",
    "beginner": "现代加工更多用M30结束并复位。",
    "warning": "M02后机床状态、光标位置因系统而异，批量加工要确认。",
    "example": "M02 表示程序结束。",
    "risk": "中",
    "tags": [
      "M02",
      "程序结束"
    ]
  },
  {
    "id": "kb-mcode-m03",
    "category": "M代码",
    "title": "M03 主轴正转",
    "code": "M03",
    "aliases": [
      "主轴顺时针",
      "Spindle CW"
    ],
    "summary": "启动主轴按正转方向旋转。",
    "usage": "铣削、钻孔、普通右手刀具切削前使用。",
    "beginner": "M03前要有合适的S转速。",
    "warning": "刀具装反、旋向错误或转速过高都可能损坏刀具。",
    "example": "S1200 M03 表示主轴1200转/分正转。",
    "risk": "高",
    "tags": [
      "M03",
      "主轴正转",
      "转速"
    ]
  },
  {
    "id": "kb-mcode-m04",
    "category": "M代码",
    "title": "M04 主轴反转",
    "code": "M04",
    "aliases": [
      "主轴逆时针",
      "Spindle CCW"
    ],
    "summary": "启动主轴按反转方向旋转。",
    "usage": "左旋刀具、反向攻丝、特殊加工时使用。",
    "beginner": "不是所有加工都能用M04，先看刀具旋向。",
    "warning": "普通右手刀具误用反转会不切削甚至打刀。",
    "example": "S500 M04 表示主轴500转/分反转。",
    "risk": "高",
    "tags": [
      "M04",
      "主轴反转",
      "转速"
    ]
  },
  {
    "id": "kb-mcode-m05",
    "category": "M代码",
    "title": "M05 主轴停止",
    "code": "M05",
    "aliases": [
      "停主轴",
      "Spindle stop"
    ],
    "summary": "停止主轴旋转。",
    "usage": "换刀、测量、程序结束、需要人工接近工件前使用。",
    "beginner": "主轴没停稳不要伸手。",
    "warning": "重切削后立即停主轴再退刀，可能在某些工艺中留下刀痕。",
    "example": "M05 表示停止主轴。",
    "risk": "高",
    "tags": [
      "M05",
      "主轴停止",
      "安全"
    ]
  },
  {
    "id": "kb-mcode-m06",
    "category": "M代码",
    "title": "M06 自动换刀",
    "code": "M06",
    "aliases": [
      "换刀",
      "Tool change"
    ],
    "summary": "调用机床自动换刀流程，将当前刀具换成指定T号刀具。",
    "usage": "加工中心多刀加工时使用。",
    "beginner": "常见写法是T02 M06。",
    "warning": "换刀前必须确认Z轴和换刀点安全，刀库号与刀具实际一致。",
    "example": "T03 M06 表示换到3号刀。",
    "risk": "高",
    "tags": [
      "M06",
      "换刀",
      "刀库",
      "T代码"
    ]
  },
  {
    "id": "kb-mcode-m07",
    "category": "M代码",
    "title": "M07 雾状冷却开启",
    "code": "M07",
    "aliases": [
      "雾冷",
      "Mist coolant"
    ],
    "summary": "开启雾状冷却或气雾润滑。",
    "usage": "铝件、轻切削、微量润滑场景使用。",
    "beginner": "M07不一定每台机床都有。",
    "warning": "冷却方式由厂家接线决定，有些机床M07可能未接或被改作他用。",
    "example": "M07 表示开启雾状冷却。",
    "risk": "中",
    "tags": [
      "M07",
      "雾冷",
      "冷却液"
    ]
  },
  {
    "id": "kb-mcode-m08",
    "category": "M代码",
    "title": "M08 冷却液开启",
    "code": "M08",
    "aliases": [
      "水冷",
      "Flood coolant"
    ],
    "summary": "开启常规切削液冷却。",
    "usage": "铣削、钻孔、车削等需要冷却和排屑时使用。",
    "beginner": "多数机床M08就是开水冷。",
    "warning": "深孔或难排屑场景仅开M08不一定够，还要看压力和排屑。",
    "example": "M08 表示开启冷却液。",
    "risk": "中",
    "tags": [
      "M08",
      "冷却液",
      "水冷"
    ]
  },
  {
    "id": "kb-mcode-m09",
    "category": "M代码",
    "title": "M09 冷却液关闭",
    "code": "M09",
    "aliases": [
      "关冷却",
      "Coolant off"
    ],
    "summary": "关闭冷却液、雾冷等冷却输出。",
    "usage": "加工结束、换刀前、测量前常用。",
    "beginner": "程序结束前一般要M09。",
    "warning": "某些机床M09会关闭所有冷却，若需保留气冷要确认厂家定义。",
    "example": "M09 表示关闭冷却液。",
    "risk": "中",
    "tags": [
      "M09",
      "冷却液关闭",
      "安全"
    ]
  },
  {
    "id": "kb-mcode-m10",
    "category": "M代码",
    "title": "M10 夹紧/卡盘夹紧",
    "code": "M10",
    "aliases": [
      "夹具夹紧",
      "Chuck clamp"
    ],
    "summary": "M10常被机床厂家定义为夹具、卡盘或第四轴夹紧。",
    "usage": "自动夹具、液压卡盘、转台夹紧时使用。",
    "beginner": "M10不是FANUC统一固定功能，要看机床厂家定义。",
    "warning": "夹紧动作涉及工件安全，执行前要确认夹具内无异物。",
    "example": "M10 可能表示夹具夹紧，具体以机床说明书为准。",
    "risk": "高",
    "tags": [
      "M10",
      "夹紧",
      "卡盘",
      "厂家定义"
    ]
  },
  {
    "id": "kb-mcode-m11",
    "category": "M代码",
    "title": "M11 松开/卡盘松开",
    "code": "M11",
    "aliases": [
      "夹具松开",
      "Chuck unclamp"
    ],
    "summary": "M11常被机床厂家定义为夹具、卡盘或第四轴松开。",
    "usage": "自动上下料、转台分度、卸料时使用。",
    "beginner": "M11通常和M10成对，但不是通用标准。",
    "warning": "加工中误松夹具会造成严重事故。",
    "example": "M11 可能表示夹具松开，具体以机床说明书为准。",
    "risk": "高",
    "tags": [
      "M11",
      "松开",
      "卡盘",
      "厂家定义"
    ]
  },
  {
    "id": "kb-mcode-m12",
    "category": "M代码",
    "title": "M12 辅助功能/厂家自定义",
    "code": "M12",
    "aliases": [
      "气吹",
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M12通常不是FANUC统一标准功能，常由厂家接成气吹、冷却或夹具动作。",
    "usage": "自动清屑、吹气、特殊冷却等辅助动作可能使用。",
    "beginner": "看到M12要查电气说明或M代码表。",
    "warning": "自定义M代码可能控制外设，误执行会造成夹具动作异常。",
    "example": "M12 可能表示气吹开启或其它辅助输出。",
    "risk": "中",
    "tags": [
      "M12",
      "辅助功能",
      "厂家定义"
    ]
  },
  {
    "id": "kb-mcode-m13",
    "category": "M代码",
    "title": "M13 主轴正转+冷却液",
    "code": "M13",
    "aliases": [
      "正转带冷却",
      "Spindle CW coolant"
    ],
    "summary": "部分机床把M13定义为主轴正转并开启冷却液。",
    "usage": "需要同时启动主轴和冷却时可简化程序。",
    "beginner": "不是所有FANUC机床都支持M13。",
    "warning": "若厂家未定义M13，程序会报警或无动作。",
    "example": "S1200 M13 可能表示主轴正转并开冷却。",
    "risk": "高",
    "tags": [
      "M13",
      "主轴正转",
      "冷却液",
      "厂家定义"
    ]
  },
  {
    "id": "kb-mcode-m14",
    "category": "M代码",
    "title": "M14 主轴反转+冷却液",
    "code": "M14",
    "aliases": [
      "反转带冷却",
      "Spindle CCW coolant"
    ],
    "summary": "部分机床把M14定义为主轴反转并开启冷却液。",
    "usage": "左旋刀具或反向加工同时需要冷却时使用。",
    "beginner": "M14常见但仍需看机床支持。",
    "warning": "旋向错误会损坏刀具，不能只看M14带冷却。",
    "example": "S500 M14 可能表示主轴反转并开冷却。",
    "risk": "高",
    "tags": [
      "M14",
      "主轴反转",
      "冷却液",
      "厂家定义"
    ]
  },
  {
    "id": "kb-mcode-m15",
    "category": "M代码",
    "title": "M15 辅助功能/厂家自定义",
    "code": "M15",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M15在通用FANUC中没有统一固定功能，多为厂家自定义。",
    "usage": "可能用于主轴方向、夹具、门锁、气吹或外设控制。",
    "beginner": "不要猜M15的动作。",
    "warning": "自定义M代码可能触发机械动作，必须查机床M代码表。",
    "example": "M15 的实际含义以机床厂家说明书为准。",
    "risk": "中",
    "tags": [
      "M15",
      "厂家定义",
      "辅助功能"
    ]
  },
  {
    "id": "kb-mcode-m16",
    "category": "M代码",
    "title": "M16 辅助功能/厂家自定义",
    "code": "M16",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M16通常为厂家自定义辅助功能。",
    "usage": "可能用于刀库、机械手、夹具或外部设备。",
    "beginner": "旧程序出现M16，要先确认原机床型号。",
    "warning": "不同机床M16含义可能完全不同。",
    "example": "M16 可能控制某个外部输出点。",
    "risk": "中",
    "tags": [
      "M16",
      "厂家定义",
      "辅助功能"
    ]
  },
  {
    "id": "kb-mcode-m17",
    "category": "M代码",
    "title": "M17 辅助功能/厂家自定义",
    "code": "M17",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M17通常不是FANUC统一标准，多由厂家自行定义。",
    "usage": "某些设备中可能用于子系统启动、夹具动作或安全互锁。",
    "beginner": "先查表，再运行。",
    "warning": "未知M代码不要在MDI随手执行。",
    "example": "M17 的含义需按机床说明书确认。",
    "risk": "中",
    "tags": [
      "M17",
      "厂家定义",
      "辅助功能"
    ]
  },
  {
    "id": "kb-mcode-m18",
    "category": "M代码",
    "title": "M18 辅助功能/厂家自定义",
    "code": "M18",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M18通常为厂家自定义或保留功能。",
    "usage": "可能用于外设停止、夹具状态切换或其它辅助动作。",
    "beginner": "不要把别的品牌M18含义套过来。",
    "warning": "未知M18可能不报警但会触发输出，风险更隐蔽。",
    "example": "M18 出现时应核对PLC/M代码表。",
    "risk": "中",
    "tags": [
      "M18",
      "厂家定义",
      "辅助功能"
    ]
  },
  {
    "id": "kb-mcode-m19",
    "category": "M代码",
    "title": "M19 主轴定向",
    "code": "M19",
    "aliases": [
      "主轴定位",
      "Spindle orientation"
    ],
    "summary": "让主轴停在设定角度位置。",
    "usage": "自动换刀、精镗让刀、刚性攻丝准备、定位装夹时使用。",
    "beginner": "M19是让主轴对准角度，不是普通停主轴。",
    "warning": "主轴未定向完成就换刀或伸出镗刀，可能撞刀。",
    "example": "M19 表示主轴定向停止。",
    "risk": "高",
    "tags": [
      "M19",
      "主轴定向",
      "换刀",
      "精镗"
    ]
  },
  {
    "id": "kb-mcode-m20",
    "category": "M代码",
    "title": "M20 辅助功能/厂家自定义",
    "code": "M20",
    "aliases": [
      "尾座",
      "夹具",
      "Machine M-code"
    ],
    "summary": "M20在通用FANUC中多为厂家自定义，常见于尾座、夹具或外设控制。",
    "usage": "车床尾座、中心架、自动门等动作可能使用。",
    "beginner": "M20不是通用固定含义。",
    "warning": "涉及夹紧支撑类动作时，误用风险很高。",
    "example": "M20 可能表示尾座前进或夹具动作，具体看机床。",
    "risk": "高",
    "tags": [
      "M20",
      "厂家定义",
      "夹具",
      "尾座"
    ]
  },
  {
    "id": "kb-mcode-m21",
    "category": "M代码",
    "title": "M21 辅助功能/厂家自定义",
    "code": "M21",
    "aliases": [
      "尾座",
      "夹具",
      "Machine M-code"
    ],
    "summary": "M21多由机床厂家定义，常与M20成对控制某个外设动作。",
    "usage": "尾座后退、夹具释放、门动作等场景可能出现。",
    "beginner": "看到M20/M21成对时要查它们控制什么。",
    "warning": "加工过程中误释放支撑或夹具会造成事故。",
    "example": "M21 可能表示尾座后退或夹具释放。",
    "risk": "高",
    "tags": [
      "M21",
      "厂家定义",
      "夹具",
      "尾座"
    ]
  },
  {
    "id": "kb-mcode-m22",
    "category": "M代码",
    "title": "M22 辅助功能/厂家自定义",
    "code": "M22",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M22通常没有FANUC统一标准功能。",
    "usage": "可能用于排屑、气吹、液压、夹具或测量装置。",
    "beginner": "不要把M22当成固定通用代码。",
    "warning": "外设动作类M代码必须确认互锁条件。",
    "example": "M22 的实际动作由机床PLC决定。",
    "risk": "中",
    "tags": [
      "M22",
      "厂家定义",
      "辅助功能"
    ]
  },
  {
    "id": "kb-mcode-m23",
    "category": "M代码",
    "title": "M23 辅助功能/厂家自定义",
    "code": "M23",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M23通常为厂家自定义或保留代码。",
    "usage": "可能与M22成对控制开启/关闭某项功能。",
    "beginner": "成对M代码要一起查，不要只查一个。",
    "warning": "错误开关外设可能影响加工安全或质量。",
    "example": "M23 的实际动作以机床M代码表为准。",
    "risk": "中",
    "tags": [
      "M23",
      "厂家定义",
      "辅助功能"
    ]
  },
  {
    "id": "kb-mcode-m24",
    "category": "M代码",
    "title": "M24 辅助功能/厂家自定义",
    "code": "M24",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M24在通用FANUC中通常由厂家自定义。",
    "usage": "可能用于卡盘、托料器、排屑机或特殊冷却。",
    "beginner": "先确认，不要盲目运行。",
    "warning": "自定义输出可能带机械动作，需避开手和工件。",
    "example": "M24 可能控制某个外部辅助装置。",
    "risk": "中",
    "tags": [
      "M24",
      "厂家定义",
      "辅助功能"
    ]
  },
  {
    "id": "kb-mcode-m25",
    "category": "M代码",
    "title": "M25 辅助功能/厂家自定义",
    "code": "M25",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M25通常不是统一标准功能，常见为厂家扩展。",
    "usage": "可能用于托盘、尾座、夹具、排屑机等控制。",
    "beginner": "通用资料不能替代本机床说明书。",
    "warning": "同一M25在不同机床可能一个开、一个关。",
    "example": "M25 的动作要按电气图或厂家表确认。",
    "risk": "中",
    "tags": [
      "M25",
      "厂家定义",
      "辅助功能"
    ]
  },
  {
    "id": "kb-mcode-m26",
    "category": "M代码",
    "title": "M26 辅助功能/厂家自定义",
    "code": "M26",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M26通常为厂家自定义辅助功能。",
    "usage": "可能用于门锁、吹气、液压站或自动化接口。",
    "beginner": "未知M代码先空运行观察也不够，最好查表。",
    "warning": "某些M代码只有在自动模式才触发完整动作。",
    "example": "M26 可能控制外设输出。",
    "risk": "中",
    "tags": [
      "M26",
      "厂家定义",
      "辅助功能"
    ]
  },
  {
    "id": "kb-mcode-m27",
    "category": "M代码",
    "title": "M27 辅助功能/厂家自定义",
    "code": "M27",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M27在通用FANUC中没有统一固定功能。",
    "usage": "自动化单元、夹具、排屑或冷却系统中可能出现。",
    "beginner": "把它当厂家自定义处理最安全。",
    "warning": "自定义动作可能影响夹紧、门锁或上下料流程。",
    "example": "M27 的含义需要查本机床M代码表。",
    "risk": "中",
    "tags": [
      "M27",
      "厂家定义",
      "辅助功能"
    ]
  },
  {
    "id": "kb-mcode-m28",
    "category": "M代码",
    "title": "M28 辅助功能/厂家自定义",
    "code": "M28",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M28通常为厂家自定义或保留代码。",
    "usage": "可能用于外设复位、夹具动作、送料器等。",
    "beginner": "不要与G28回参考点混淆。",
    "warning": "M28不是回零指令，误解会导致流程判断错误。",
    "example": "M28 的具体含义以机床厂家定义为准。",
    "risk": "中",
    "tags": [
      "M28",
      "厂家定义",
      "辅助功能"
    ]
  },
  {
    "id": "kb-mcode-m29",
    "category": "M代码",
    "title": "M29 刚性攻丝准备",
    "code": "M29",
    "aliases": [
      "刚性攻牙",
      "Rigid tapping"
    ],
    "summary": "FANUC加工中心常用M29配合G84/G74进入刚性攻丝同步模式。",
    "usage": "刚性攻丝前启用主轴与进给同步。",
    "beginner": "常见写法是S转速 M03 后 M29，再执行G84。",
    "warning": "机床不支持刚性攻丝或参数未开通会报警；螺距F必须正确。",
    "example": "S500 M03；M29 S500；G84 Z-15. R2. F1.25。",
    "risk": "高",
    "tags": [
      "M29",
      "刚性攻丝",
      "G84",
      "同步"
    ]
  },
  {
    "id": "kb-mcode-m30",
    "category": "M代码",
    "title": "M30 程序结束并复位",
    "code": "M30",
    "aliases": [
      "结束复位",
      "End and rewind"
    ],
    "summary": "结束程序并返回程序开头，常用于完整加工程序结尾。",
    "usage": "批量加工、自动循环结束时最常用。",
    "beginner": "程序最后通常用M30。",
    "warning": "M30前建议关闭主轴、冷却液并退到安全位置。",
    "example": "M09；M05；G91 G28 Z0；M30。",
    "risk": "中",
    "tags": [
      "M30",
      "程序结束",
      "复位"
    ]
  },
  {
    "id": "kb-mcode-m31",
    "category": "M代码",
    "title": "M31 辅助功能/厂家自定义",
    "code": "M31",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M31通常不是FANUC统一标准，多为厂家自定义功能。",
    "usage": "自动门、排屑机、夹具或测量流程中可能使用。",
    "beginner": "M31要按本机床说明书理解。",
    "warning": "自定义M代码可能不显示明显动作但改变信号状态。",
    "example": "M31 的动作由机床PLC定义。",
    "risk": "中",
    "tags": [
      "M31",
      "厂家定义",
      "辅助功能"
    ]
  },
  {
    "id": "kb-mcode-m32",
    "category": "M代码",
    "title": "M32 辅助功能/厂家自定义",
    "code": "M32",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M32通常由机床厂家定义。",
    "usage": "可能与M31成对控制外设开关。",
    "beginner": "成对使用时要确认谁开谁关。",
    "warning": "开关顺序错误可能造成外设未到位报警。",
    "example": "M32 的实际含义以厂家M代码表为准。",
    "risk": "中",
    "tags": [
      "M32",
      "厂家定义",
      "辅助功能"
    ]
  },
  {
    "id": "kb-mcode-m33",
    "category": "M代码",
    "title": "M33 辅助功能/厂家自定义",
    "code": "M33",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M33在通用FANUC中通常没有统一固定功能。",
    "usage": "可能用于齿轮范围、夹具、送料或特殊主轴功能。",
    "beginner": "不要默认M33代表某个通用动作。",
    "warning": "若与主轴或夹具相关，误用风险较高。",
    "example": "M33 需要按机床说明书确认。",
    "risk": "中",
    "tags": [
      "M33",
      "厂家定义",
      "辅助功能"
    ]
  },
  {
    "id": "kb-mcode-m34",
    "category": "M代码",
    "title": "M34 辅助功能/厂家自定义",
    "code": "M34",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M34通常为厂家自定义功能。",
    "usage": "可能用于主轴档位、外设动作或自动化接口。",
    "beginner": "旧程序迁移时重点检查M34。",
    "warning": "厂家自定义M代码在不同设备之间兼容性差。",
    "example": "M34 的实际动作由PLC设定。",
    "risk": "中",
    "tags": [
      "M34",
      "厂家定义",
      "辅助功能"
    ]
  },
  {
    "id": "kb-mcode-m35",
    "category": "M代码",
    "title": "M35 辅助功能/厂家自定义",
    "code": "M35",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M35在通用FANUC中通常没有统一固定功能。",
    "usage": "可能用于开关某个气动、液压或电气输出。",
    "beginner": "看到M35先查本机床M代码表。",
    "warning": "不要在装夹未确认时试运行未知M35。",
    "example": "M35 可能触发辅助装置动作。",
    "risk": "中",
    "tags": [
      "M35",
      "厂家定义",
      "辅助功能"
    ]
  },
  {
    "id": "kb-mcode-m36",
    "category": "M代码",
    "title": "M36 辅助功能/厂家自定义",
    "code": "M36",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M36通常由机床厂家定义。",
    "usage": "可能与M35成对控制夹具、气吹、排屑或其它外设。",
    "beginner": "M35/M36成对时要查开关方向。",
    "warning": "执行顺序错可能导致夹具未夹紧或外设未准备。",
    "example": "M36 的含义以机床说明书为准。",
    "risk": "中",
    "tags": [
      "M36",
      "厂家定义",
      "辅助功能"
    ]
  },
  {
    "id": "kb-mcode-m37",
    "category": "M代码",
    "title": "M37 辅助功能/厂家自定义",
    "code": "M37",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M37在通用FANUC中没有统一标准功能。",
    "usage": "常见于特殊冷却、门、托盘或自动化控制。",
    "beginner": "不要照搬其它机床的M37用法。",
    "warning": "未知外设动作可能影响安全门或上下料。",
    "example": "M37 需要查看本机床M代码表。",
    "risk": "中",
    "tags": [
      "M37",
      "厂家定义",
      "辅助功能"
    ]
  },
  {
    "id": "kb-mcode-m38",
    "category": "M代码",
    "title": "M38 辅助功能/厂家自定义",
    "code": "M38",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M38通常为厂家自定义或保留功能。",
    "usage": "可能用于外设启动、停止或状态切换。",
    "beginner": "M38含义不统一。",
    "warning": "跨机床复制程序时必须核对。",
    "example": "M38 的实际含义由机床PLC决定。",
    "risk": "中",
    "tags": [
      "M38",
      "厂家定义",
      "辅助功能"
    ]
  },
  {
    "id": "kb-mcode-m39",
    "category": "M代码",
    "title": "M39 辅助功能/厂家自定义",
    "code": "M39",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M39通常没有FANUC统一标准功能。",
    "usage": "某些机床可能用于主轴档位、刀库或外设控制。",
    "beginner": "M39不是通用换刀指令。",
    "warning": "如果控制刀库或主轴档位，误用会导致报警或机械干涉。",
    "example": "M39 需要按厂家资料确认。",
    "risk": "中",
    "tags": [
      "M39",
      "厂家定义",
      "辅助功能"
    ]
  },
  {
    "id": "kb-mcode-m40",
    "category": "M代码",
    "title": "M40 主轴低速档/厂家自定义",
    "code": "M40",
    "aliases": [
      "低速档",
      "Gear range low"
    ],
    "summary": "M40常被部分机床定义为主轴低速档或齿轮范围选择。",
    "usage": "有机械变速箱的机床切换低速大扭矩档时使用。",
    "beginner": "M40不一定每台机床都有。",
    "warning": "档位切换需主轴停稳并满足互锁条件。",
    "example": "M40 可能表示选择低速档，具体以机床为准。",
    "risk": "高",
    "tags": [
      "M40",
      "主轴档位",
      "厂家定义"
    ]
  },
  {
    "id": "kb-mcode-m41",
    "category": "M代码",
    "title": "M41 主轴档位1/厂家自定义",
    "code": "M41",
    "aliases": [
      "齿轮档位",
      "Gear range 1"
    ],
    "summary": "M41常用于部分机床的主轴档位选择，也可能为厂家自定义。",
    "usage": "按加工扭矩和转速范围选择主轴档时使用。",
    "beginner": "带档位的主轴要看S值是否在档位范围内。",
    "warning": "档位和转速不匹配会报警或损坏传动机构。",
    "example": "M41 可能表示选择主轴1档。",
    "risk": "高",
    "tags": [
      "M41",
      "主轴档位",
      "齿轮"
    ]
  },
  {
    "id": "kb-mcode-m42",
    "category": "M代码",
    "title": "M42 主轴档位2/厂家自定义",
    "code": "M42",
    "aliases": [
      "齿轮档位",
      "Gear range 2"
    ],
    "summary": "M42常用于部分机床的主轴第二档位选择。",
    "usage": "需要更高转速或不同扭矩范围时使用。",
    "beginner": "M41/M42/M43常是一组档位选择。",
    "warning": "切档前确认主轴停转和厂家规定的切换条件。",
    "example": "M42 可能表示选择主轴2档。",
    "risk": "高",
    "tags": [
      "M42",
      "主轴档位",
      "齿轮"
    ]
  },
  {
    "id": "kb-mcode-m43",
    "category": "M代码",
    "title": "M43 主轴档位3/厂家自定义",
    "code": "M43",
    "aliases": [
      "齿轮档位",
      "Gear range 3"
    ],
    "summary": "M43常用于部分机床的主轴第三档位选择。",
    "usage": "多档主轴按工艺选择档位时使用。",
    "beginner": "不是所有机床都有M43。",
    "warning": "程序从其它机床迁移时，档位M代码最容易不兼容。",
    "example": "M43 可能表示选择主轴3档。",
    "risk": "高",
    "tags": [
      "M43",
      "主轴档位",
      "齿轮"
    ]
  },
  {
    "id": "kb-mcode-m44",
    "category": "M代码",
    "title": "M44 主轴档位4/厂家自定义",
    "code": "M44",
    "aliases": [
      "齿轮档位",
      "Gear range 4"
    ],
    "summary": "M44常用于部分机床的主轴第四档位或厂家自定义功能。",
    "usage": "特殊主轴范围或机械变速机床中可能使用。",
    "beginner": "先看主轴档位表。",
    "warning": "档位错误会让主轴达不到目标转速或扭矩不足。",
    "example": "M44 可能表示选择主轴4档。",
    "risk": "高",
    "tags": [
      "M44",
      "主轴档位",
      "齿轮"
    ]
  },
  {
    "id": "kb-mcode-m45",
    "category": "M代码",
    "title": "M45 主轴档位5/厂家自定义",
    "code": "M45",
    "aliases": [
      "齿轮档位",
      "Gear range 5"
    ],
    "summary": "M45常用于部分机床的主轴档位或其它厂家定义动作。",
    "usage": "多档主轴、重切削或高速加工切换范围时可能出现。",
    "beginner": "M45含义不统一。",
    "warning": "若机床无对应档位，程序可能报警或无动作。",
    "example": "M45 的实际含义以机床M代码表为准。",
    "risk": "中",
    "tags": [
      "M45",
      "主轴档位",
      "厂家定义"
    ]
  },
  {
    "id": "kb-mcode-m46",
    "category": "M代码",
    "title": "M46 辅助功能/厂家自定义",
    "code": "M46",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M46通常为厂家自定义辅助功能。",
    "usage": "可能用于主轴档位、夹具、排屑或自动化信号。",
    "beginner": "不要默认M46是某个固定功能。",
    "warning": "自定义输出需确认外设状态和互锁。",
    "example": "M46 的动作由机床PLC定义。",
    "risk": "中",
    "tags": [
      "M46",
      "厂家定义",
      "辅助功能"
    ]
  },
  {
    "id": "kb-mcode-m47",
    "category": "M代码",
    "title": "M47 辅助功能/厂家自定义",
    "code": "M47",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M47通常没有FANUC统一标准功能。",
    "usage": "可能用于外部设备、主轴范围或特殊循环。",
    "beginner": "程序迁移时重点核对M47。",
    "warning": "未知功能可能影响加工流程。",
    "example": "M47 需要查本机床说明。",
    "risk": "中",
    "tags": [
      "M47",
      "厂家定义",
      "辅助功能"
    ]
  },
  {
    "id": "kb-mcode-m48",
    "category": "M代码",
    "title": "M48 倍率开关有效/厂家自定义",
    "code": "M48",
    "aliases": [
      "倍率有效",
      "Override enable"
    ],
    "summary": "M48在部分系统中用于允许进给/主轴倍率调节，也可能为厂家自定义。",
    "usage": "需要恢复面板倍率控制时可能使用。",
    "beginner": "M48和M49常成对出现。",
    "warning": "倍率控制影响实际进给和转速，调试时要确认状态。",
    "example": "M48 可能表示倍率开关有效。",
    "risk": "中",
    "tags": [
      "M48",
      "倍率",
      "厂家定义"
    ]
  },
  {
    "id": "kb-mcode-m49",
    "category": "M代码",
    "title": "M49 倍率开关无效/厂家自定义",
    "code": "M49",
    "aliases": [
      "倍率无效",
      "Override disable"
    ],
    "summary": "M49在部分系统中用于禁止倍率调节，也可能为厂家自定义。",
    "usage": "关键加工段需要固定进给或转速时可能使用。",
    "beginner": "它可能让面板倍率旋钮不起作用。",
    "warning": "调机时若M49生效，操作员降倍率可能无效，风险较高。",
    "example": "M49 可能表示倍率开关无效。",
    "risk": "高",
    "tags": [
      "M49",
      "倍率",
      "厂家定义"
    ]
  },
  {
    "id": "kb-mcode-m50",
    "category": "M代码",
    "title": "M50 辅助功能/厂家自定义",
    "code": "M50",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M50通常为厂家自定义辅助功能。",
    "usage": "常见于排屑、冷却、夹具、尾座或自动化接口。",
    "beginner": "M50以后很多代码更依赖厂家定义。",
    "warning": "不能用通用FANUC知识直接判断动作。",
    "example": "M50 的含义需查机床M代码表。",
    "risk": "中",
    "tags": [
      "M50",
      "厂家定义",
      "辅助功能"
    ]
  },
  {
    "id": "kb-mcode-m51",
    "category": "M代码",
    "title": "M51 辅助功能/厂家自定义",
    "code": "M51",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M51通常为厂家自定义功能。",
    "usage": "可能与M50成对控制某个外设。",
    "beginner": "成对代码要一起核对。",
    "warning": "开关方向错会导致外设状态相反。",
    "example": "M51 可能表示某辅助功能开启或关闭。",
    "risk": "中",
    "tags": [
      "M51",
      "厂家定义",
      "辅助功能"
    ]
  },
  {
    "id": "kb-mcode-m52",
    "category": "M代码",
    "title": "M52 辅助功能/厂家自定义",
    "code": "M52",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M52在通用FANUC中没有统一固定功能。",
    "usage": "可能用于自动门、夹具、气吹、排屑等。",
    "beginner": "未知M52先查表。",
    "warning": "外设动作可能受门锁和液压状态影响。",
    "example": "M52 的实际动作由厂家定义。",
    "risk": "中",
    "tags": [
      "M52",
      "厂家定义",
      "辅助功能"
    ]
  },
  {
    "id": "kb-mcode-m53",
    "category": "M代码",
    "title": "M53 辅助功能/厂家自定义",
    "code": "M53",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M53通常为厂家自定义或保留功能。",
    "usage": "可能用于工装、送料、测量或报警复位类流程。",
    "beginner": "不要把G53机械坐标和M53混淆。",
    "warning": "M53不是机械坐标定位。",
    "example": "M53 出现时应查M代码表。",
    "risk": "中",
    "tags": [
      "M53",
      "厂家定义",
      "辅助功能"
    ]
  },
  {
    "id": "kb-mcode-m54",
    "category": "M代码",
    "title": "M54 辅助功能/厂家自定义",
    "code": "M54",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M54通常没有FANUC统一标准功能。",
    "usage": "可能用于夹具定位、托盘、气缸或自动化单元。",
    "beginner": "先确认动作再执行。",
    "warning": "夹具类M代码必须确认工件已放置正确。",
    "example": "M54 的动作以机床说明书为准。",
    "risk": "中",
    "tags": [
      "M54",
      "厂家定义",
      "辅助功能"
    ]
  },
  {
    "id": "kb-mcode-m55",
    "category": "M代码",
    "title": "M55 辅助功能/厂家自定义",
    "code": "M55",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M55通常由机床厂家定义。",
    "usage": "可能与M54成对控制夹紧/松开、伸出/退回等动作。",
    "beginner": "看到M54/M55要考虑它们可能是一对。",
    "warning": "误把伸出/退回顺序写反会造成机械干涉。",
    "example": "M55 可能控制对应外设的反向动作。",
    "risk": "中",
    "tags": [
      "M55",
      "厂家定义",
      "辅助功能"
    ]
  },
  {
    "id": "kb-mcode-m56",
    "category": "M代码",
    "title": "M56 辅助功能/厂家自定义",
    "code": "M56",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M56通常为厂家自定义辅助功能。",
    "usage": "可能用于自动门、排屑、测头、冷却或夹具。",
    "beginner": "未知M代码不要直接用于新程序。",
    "warning": "机床外设动作受PLC互锁控制，报警原因可能不在NC代码本身。",
    "example": "M56 的实际动作由PLC设定。",
    "risk": "中",
    "tags": [
      "M56",
      "厂家定义",
      "辅助功能"
    ]
  },
  {
    "id": "kb-mcode-m57",
    "category": "M代码",
    "title": "M57 辅助功能/厂家自定义",
    "code": "M57",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M57在通用FANUC中通常没有统一功能。",
    "usage": "可能用于外围设备或自动化信号输出。",
    "beginner": "按厂家表确认。",
    "warning": "自动化接口M代码可能会向机器人或送料机发信号。",
    "example": "M57 可能发送外部完成或启动信号。",
    "risk": "中",
    "tags": [
      "M57",
      "厂家定义",
      "自动化"
    ]
  },
  {
    "id": "kb-mcode-m58",
    "category": "M代码",
    "title": "M58 辅助功能/厂家自定义",
    "code": "M58",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M58通常为厂家自定义或保留代码。",
    "usage": "可能用于气动、液压、冷却或自动化接口。",
    "beginner": "不能凭代码号判断功能。",
    "warning": "误执行可能改变外部设备状态。",
    "example": "M58 需要查机床厂家M代码表。",
    "risk": "中",
    "tags": [
      "M58",
      "厂家定义",
      "辅助功能"
    ]
  },
  {
    "id": "kb-mcode-m59",
    "category": "M代码",
    "title": "M59 辅助功能/厂家自定义",
    "code": "M59",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M59通常没有FANUC统一标准功能。",
    "usage": "可能与M58成对，控制某个外设关闭或反向动作。",
    "beginner": "成对输出注意确认开/关。",
    "warning": "状态反了会导致夹具、冷却或自动化流程异常。",
    "example": "M59 的实际含义以机床为准。",
    "risk": "中",
    "tags": [
      "M59",
      "厂家定义",
      "辅助功能"
    ]
  },
  {
    "id": "kb-mcode-m60",
    "category": "M代码",
    "title": "M60 托盘交换/工件交换",
    "code": "M60",
    "aliases": [
      "托盘交换",
      "Pallet change"
    ],
    "summary": "M60常用于托盘交换或工件交换动作，也可能由厂家定义。",
    "usage": "卧式加工中心、柔性生产线托盘交换时使用。",
    "beginner": "M60动作通常很大，必须确认机床区域安全。",
    "warning": "托盘未夹紧、门未关、轴未到位时执行会报警或干涉。",
    "example": "M60 可能表示执行托盘交换。",
    "risk": "高",
    "tags": [
      "M60",
      "托盘交换",
      "自动化"
    ]
  },
  {
    "id": "kb-mcode-m61",
    "category": "M代码",
    "title": "M61 辅助功能/厂家自定义",
    "code": "M61",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M61通常为厂家自定义功能。",
    "usage": "可能用于托盘、刀库、夹具或自动化单元。",
    "beginner": "M61不等于通用刀具选择。",
    "warning": "相关动作可能要求轴在特定位置。",
    "example": "M61 的动作需查厂家说明。",
    "risk": "中",
    "tags": [
      "M61",
      "厂家定义",
      "自动化"
    ]
  },
  {
    "id": "kb-mcode-m62",
    "category": "M代码",
    "title": "M62 辅助功能/厂家自定义",
    "code": "M62",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M62在通用FANUC中通常没有统一功能。",
    "usage": "可能用于夹具、机器人握手、外设准备完成信号。",
    "beginner": "自动化程序里M62可能是流程信号。",
    "warning": "删掉或改动会造成机器人/送料机不同步。",
    "example": "M62 可能发送或等待外部信号。",
    "risk": "中",
    "tags": [
      "M62",
      "厂家定义",
      "自动化"
    ]
  },
  {
    "id": "kb-mcode-m63",
    "category": "M代码",
    "title": "M63 辅助功能/厂家自定义",
    "code": "M63",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M63通常为厂家自定义或保留功能。",
    "usage": "可能用于外部设备开关、夹具或测量装置。",
    "beginner": "查清楚再运行。",
    "warning": "未知动作不一定可通过单段完全避免风险。",
    "example": "M63 的具体含义以本机床为准。",
    "risk": "中",
    "tags": [
      "M63",
      "厂家定义",
      "辅助功能"
    ]
  },
  {
    "id": "kb-mcode-m64",
    "category": "M代码",
    "title": "M64 辅助功能/厂家自定义",
    "code": "M64",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M64通常没有FANUC统一标准功能。",
    "usage": "可能用于PLC输出、自动化接口、夹具或冷却。",
    "beginner": "不要把M64当通用代码。",
    "warning": "错误信号可能让外设提前动作。",
    "example": "M64 需要结合电气图和M代码表确认。",
    "risk": "中",
    "tags": [
      "M64",
      "厂家定义",
      "自动化"
    ]
  },
  {
    "id": "kb-mcode-m65",
    "category": "M代码",
    "title": "M65 辅助功能/厂家自定义",
    "code": "M65",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M65通常为厂家自定义功能。",
    "usage": "可能与M64成对控制外部输出开关。",
    "beginner": "常见逻辑是M64开、M65关，但不保证。",
    "warning": "自动化信号顺序错会造成等待、报警或机械干涉。",
    "example": "M65 的含义以机床厂家定义为准。",
    "risk": "中",
    "tags": [
      "M65",
      "厂家定义",
      "自动化"
    ]
  },
  {
    "id": "kb-mcode-m66",
    "category": "M代码",
    "title": "M66 辅助功能/厂家自定义",
    "code": "M66",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M66在通用FANUC中通常没有统一固定功能。",
    "usage": "可能用于外部输入等待、夹具检测或测量流程。",
    "beginner": "如果是等待信号，程序可能停在这里。",
    "warning": "外部信号不满足会导致循环停滞。",
    "example": "M66 可能表示等待某输入信号，具体以厂家为准。",
    "risk": "中",
    "tags": [
      "M66",
      "厂家定义",
      "等待信号"
    ]
  },
  {
    "id": "kb-mcode-m67",
    "category": "M代码",
    "title": "M67 辅助功能/厂家自定义",
    "code": "M67",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M67通常为厂家自定义辅助功能。",
    "usage": "可能用于外设动作、自动化信号或夹具控制。",
    "beginner": "未知M67不要直接移植到新机床。",
    "warning": "自动化输出错误可能造成上下料顺序混乱。",
    "example": "M67 的实际动作需查本机床资料。",
    "risk": "中",
    "tags": [
      "M67",
      "厂家定义",
      "辅助功能"
    ]
  },
  {
    "id": "kb-mcode-m68",
    "category": "M代码",
    "title": "M68 夹紧/厂家自定义",
    "code": "M68",
    "aliases": [
      "夹具夹紧",
      "Clamp"
    ],
    "summary": "M68在部分机床中用于夹具、卡盘或转台夹紧，也可能为厂家自定义。",
    "usage": "第四轴夹紧、液压夹具夹紧、工件固定时可能使用。",
    "beginner": "M68/M69经常成对出现。",
    "warning": "切削前必须确认夹紧到位信号有效。",
    "example": "M68 可能表示夹具夹紧。",
    "risk": "高",
    "tags": [
      "M68",
      "夹紧",
      "夹具",
      "厂家定义"
    ]
  },
  {
    "id": "kb-mcode-m69",
    "category": "M代码",
    "title": "M69 松开/厂家自定义",
    "code": "M69",
    "aliases": [
      "夹具松开",
      "Unclamp"
    ],
    "summary": "M69在部分机床中用于夹具、卡盘或转台松开，也可能为厂家自定义。",
    "usage": "分度、卸料、自动上下料时可能使用。",
    "beginner": "加工中不要误执行M69。",
    "warning": "工件未支撑时松夹具会造成掉件或撞机。",
    "example": "M69 可能表示夹具松开。",
    "risk": "高",
    "tags": [
      "M69",
      "松开",
      "夹具",
      "厂家定义"
    ]
  },
  {
    "id": "kb-mcode-m70",
    "category": "M代码",
    "title": "M70 辅助功能/厂家自定义",
    "code": "M70",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M70通常为厂家自定义辅助功能。",
    "usage": "可能用于自动门、夹具、排屑、送料或托盘系统。",
    "beginner": "M70以后多为厂家扩展区。",
    "warning": "程序跨设备使用前必须逐项确认M代码。",
    "example": "M70 的动作由机床厂家定义。",
    "risk": "中",
    "tags": [
      "M70",
      "厂家定义",
      "辅助功能"
    ]
  },
  {
    "id": "kb-mcode-m71",
    "category": "M代码",
    "title": "M71 辅助功能/厂家自定义",
    "code": "M71",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M71通常没有FANUC统一标准功能。",
    "usage": "可能与M70成对控制外设。",
    "beginner": "按M代码表确认开关方向。",
    "warning": "外设状态错误可能导致互锁报警。",
    "example": "M71 的实际含义以本机床为准。",
    "risk": "中",
    "tags": [
      "M71",
      "厂家定义",
      "辅助功能"
    ]
  },
  {
    "id": "kb-mcode-m72",
    "category": "M代码",
    "title": "M72 辅助功能/厂家自定义",
    "code": "M72",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M72通常为厂家自定义或保留功能。",
    "usage": "可能用于夹具、尾座、门、吹气或排屑。",
    "beginner": "不要假定M72含义。",
    "warning": "机械动作类M代码要保证人员远离运动部件。",
    "example": "M72 需要查机床M代码说明。",
    "risk": "中",
    "tags": [
      "M72",
      "厂家定义",
      "辅助功能"
    ]
  },
  {
    "id": "kb-mcode-m73",
    "category": "M代码",
    "title": "M73 辅助功能/厂家自定义",
    "code": "M73",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M73在通用FANUC中通常没有统一功能。",
    "usage": "可能用于外部信号、工装动作、冷却方式切换。",
    "beginner": "遇到M73按厂家自定义处理。",
    "warning": "未知输出可能改变加工条件。",
    "example": "M73 的含义由PLC决定。",
    "risk": "中",
    "tags": [
      "M73",
      "厂家定义",
      "辅助功能"
    ]
  },
  {
    "id": "kb-mcode-m74",
    "category": "M代码",
    "title": "M74 辅助功能/厂家自定义",
    "code": "M74",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M74通常为厂家自定义辅助功能。",
    "usage": "可能用于气动、液压、自动化或夹具动作。",
    "beginner": "先查说明再编入程序。",
    "warning": "自动动作未确认时，禁止靠近工件和夹具。",
    "example": "M74 的实际动作以厂家资料为准。",
    "risk": "中",
    "tags": [
      "M74",
      "厂家定义",
      "辅助功能"
    ]
  },
  {
    "id": "kb-mcode-m75",
    "category": "M代码",
    "title": "M75 辅助功能/厂家自定义",
    "code": "M75",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M75通常没有FANUC统一固定功能。",
    "usage": "可能与M74成对控制某项动作。",
    "beginner": "成对代码注意逻辑。",
    "warning": "开关逻辑写反可能造成未夹紧加工。",
    "example": "M75 的含义以机床M代码表为准。",
    "risk": "中",
    "tags": [
      "M75",
      "厂家定义",
      "辅助功能"
    ]
  },
  {
    "id": "kb-mcode-m76",
    "category": "M代码",
    "title": "M76 辅助功能/厂家自定义",
    "code": "M76",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M76通常为厂家自定义或保留功能。",
    "usage": "可能用于测头、外设、排屑或夹具。",
    "beginner": "不要与G76螺纹循环混淆。",
    "warning": "M76不是螺纹循环，G/M含义完全不同。",
    "example": "M76 需要查本机床资料。",
    "risk": "中",
    "tags": [
      "M76",
      "厂家定义",
      "辅助功能"
    ]
  },
  {
    "id": "kb-mcode-m77",
    "category": "M代码",
    "title": "M77 辅助功能/厂家自定义",
    "code": "M77",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M77在通用FANUC中通常没有统一功能。",
    "usage": "可能用于自动化信号、夹具或冷却扩展。",
    "beginner": "未知M77不能直接套用。",
    "warning": "特殊M代码可能只在自动循环中有效。",
    "example": "M77 的动作由机床PLC定义。",
    "risk": "中",
    "tags": [
      "M77",
      "厂家定义",
      "辅助功能"
    ]
  },
  {
    "id": "kb-mcode-m78",
    "category": "M代码",
    "title": "M78 辅助功能/厂家自定义",
    "code": "M78",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M78通常为厂家自定义功能。",
    "usage": "可能用于安全门、工装、送料器或机器人接口。",
    "beginner": "查表是唯一可靠方法。",
    "warning": "机器人接口信号错误可能造成设备等待或碰撞。",
    "example": "M78 的具体含义以厂家说明为准。",
    "risk": "中",
    "tags": [
      "M78",
      "厂家定义",
      "自动化"
    ]
  },
  {
    "id": "kb-mcode-m79",
    "category": "M代码",
    "title": "M79 辅助功能/厂家自定义",
    "code": "M79",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M79通常没有FANUC统一标准功能。",
    "usage": "可能与M78成对或作为保留代码。",
    "beginner": "不要将M79当通用结束代码。",
    "warning": "结束程序应使用M30或M02，M79含义需查表。",
    "example": "M79 的实际动作由厂家定义。",
    "risk": "中",
    "tags": [
      "M79",
      "厂家定义",
      "辅助功能"
    ]
  },
  {
    "id": "kb-mcode-m80",
    "category": "M代码",
    "title": "M80 辅助功能/厂家自定义",
    "code": "M80",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M80通常为厂家自定义辅助功能。",
    "usage": "可能用于高压冷却、自动门、排屑或液压装置。",
    "beginner": "M80不是通用开关代码。",
    "warning": "若控制高压冷却，需确认刀具是否支持中心出水。",
    "example": "M80 的含义以机床M代码表为准。",
    "risk": "中",
    "tags": [
      "M80",
      "厂家定义",
      "辅助功能"
    ]
  },
  {
    "id": "kb-mcode-m81",
    "category": "M代码",
    "title": "M81 辅助功能/厂家自定义",
    "code": "M81",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M81通常没有统一标准功能。",
    "usage": "可能与M80成对控制外设。",
    "beginner": "查清楚开关状态。",
    "warning": "外设未关闭可能造成测量、换刀或开门异常。",
    "example": "M81 的实际含义由厂家定义。",
    "risk": "中",
    "tags": [
      "M81",
      "厂家定义",
      "辅助功能"
    ]
  },
  {
    "id": "kb-mcode-m82",
    "category": "M代码",
    "title": "M82 辅助功能/厂家自定义",
    "code": "M82",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M82通常为厂家自定义或保留功能。",
    "usage": "可能用于夹具、冷却、排屑或自动化信号。",
    "beginner": "不要凭编号推断功能。",
    "warning": "不同机床可能同号不同义。",
    "example": "M82 需要查本机床资料。",
    "risk": "中",
    "tags": [
      "M82",
      "厂家定义",
      "辅助功能"
    ]
  },
  {
    "id": "kb-mcode-m83",
    "category": "M代码",
    "title": "M83 辅助功能/厂家自定义",
    "code": "M83",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M83通常没有FANUC统一固定功能。",
    "usage": "可能用于油雾、气吹、液压或自动化外设。",
    "beginner": "未知M83先查说明。",
    "warning": "若控制润滑或冷却，错误状态会影响刀具寿命。",
    "example": "M83 的动作以机床说明书为准。",
    "risk": "中",
    "tags": [
      "M83",
      "厂家定义",
      "辅助功能"
    ]
  },
  {
    "id": "kb-mcode-m84",
    "category": "M代码",
    "title": "M84 辅助功能/厂家自定义",
    "code": "M84",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M84通常为厂家自定义功能。",
    "usage": "可能用于门、夹具、尾座、排屑或测量装置。",
    "beginner": "不要与G84攻丝混淆。",
    "warning": "M84不是攻丝循环，G84才是固定攻丝循环。",
    "example": "M84 的含义需查M代码表。",
    "risk": "中",
    "tags": [
      "M84",
      "厂家定义",
      "辅助功能"
    ]
  },
  {
    "id": "kb-mcode-m85",
    "category": "M代码",
    "title": "M85 辅助功能/厂家自定义",
    "code": "M85",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M85通常没有统一标准功能。",
    "usage": "可能与M84成对控制某个外设动作。",
    "beginner": "成对出现时要确认开/关或进/退。",
    "warning": "方向写反可能造成机械干涉。",
    "example": "M85 的实际动作由机床厂家定义。",
    "risk": "中",
    "tags": [
      "M85",
      "厂家定义",
      "辅助功能"
    ]
  },
  {
    "id": "kb-mcode-m86",
    "category": "M代码",
    "title": "M86 辅助功能/厂家自定义",
    "code": "M86",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M86通常为厂家自定义或保留功能。",
    "usage": "可能用于自动门、吹气、冷却、夹具或外设。",
    "beginner": "先查表，再判断。",
    "warning": "未知M代码触发外设时，空运行也要保持安全距离。",
    "example": "M86 的具体含义以本机床为准。",
    "risk": "中",
    "tags": [
      "M86",
      "厂家定义",
      "辅助功能"
    ]
  },
  {
    "id": "kb-mcode-m87",
    "category": "M代码",
    "title": "M87 辅助功能/厂家自定义",
    "code": "M87",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M87通常没有FANUC统一固定功能。",
    "usage": "可能用于气吹、高压冷却、夹具或自动化接口。",
    "beginner": "M87/M88/M89常见为厂家扩展区。",
    "warning": "不能把某台机的定义当成行业标准。",
    "example": "M87 的动作由机床厂家定义。",
    "risk": "中",
    "tags": [
      "M87",
      "厂家定义",
      "辅助功能"
    ]
  },
  {
    "id": "kb-mcode-m88",
    "category": "M代码",
    "title": "M88 高压冷却开启/厂家自定义",
    "code": "M88",
    "aliases": [
      "中心出水",
      "High pressure coolant"
    ],
    "summary": "M88在部分机床中用于开启高压冷却或主轴中心出水，也可能为厂家自定义。",
    "usage": "深孔钻、内冷刀具、难加工材料排屑冷却时使用。",
    "beginner": "内冷刀具才适合开高压中心出水。",
    "warning": "刀具不通水或夹头不支持时开高压冷却可能喷溅或损坏密封。",
    "example": "M88 可能表示开启高压冷却。",
    "risk": "高",
    "tags": [
      "M88",
      "高压冷却",
      "中心出水",
      "厂家定义"
    ]
  },
  {
    "id": "kb-mcode-m89",
    "category": "M代码",
    "title": "M89 高压冷却关闭/厂家自定义",
    "code": "M89",
    "aliases": [
      "中心出水关闭",
      "High pressure coolant off"
    ],
    "summary": "M89在部分机床中用于关闭高压冷却或中心出水，也可能为厂家自定义。",
    "usage": "高压冷却加工结束、换刀前或测量前使用。",
    "beginner": "开了M88通常要用对应关闭代码。",
    "warning": "若M89不是关闭代码，应按本机床定义使用。",
    "example": "M89 可能表示关闭高压冷却。",
    "risk": "中",
    "tags": [
      "M89",
      "高压冷却关闭",
      "厂家定义"
    ]
  },
  {
    "id": "kb-mcode-m90",
    "category": "M代码",
    "title": "M90 辅助功能/厂家自定义",
    "code": "M90",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M90通常为厂家自定义功能。",
    "usage": "可能用于自动化、夹具、冷却、门或安全互锁。",
    "beginner": "M90不是通用程序结束。",
    "warning": "高编号M代码多为厂家扩展，兼容性差。",
    "example": "M90 的含义以机床M代码表为准。",
    "risk": "中",
    "tags": [
      "M90",
      "厂家定义",
      "辅助功能"
    ]
  },
  {
    "id": "kb-mcode-m91",
    "category": "M代码",
    "title": "M91 辅助功能/厂家自定义",
    "code": "M91",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M91通常没有FANUC统一标准功能。",
    "usage": "可能用于外设、自动化信号或夹具动作。",
    "beginner": "不要把G91增量和M91混淆。",
    "warning": "M91不是增量编程指令。",
    "example": "M91 的实际动作由厂家定义。",
    "risk": "中",
    "tags": [
      "M91",
      "厂家定义",
      "辅助功能"
    ]
  },
  {
    "id": "kb-mcode-m92",
    "category": "M代码",
    "title": "M92 辅助功能/厂家自定义",
    "code": "M92",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M92通常为厂家自定义或保留功能。",
    "usage": "可能用于特殊主轴、夹具、排屑或自动化流程。",
    "beginner": "按厂家表确认。",
    "warning": "未知M92直接运行可能触发外设动作。",
    "example": "M92 的含义需查本机床资料。",
    "risk": "中",
    "tags": [
      "M92",
      "厂家定义",
      "辅助功能"
    ]
  },
  {
    "id": "kb-mcode-m93",
    "category": "M代码",
    "title": "M93 辅助功能/厂家自定义",
    "code": "M93",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M93通常没有统一固定功能。",
    "usage": "可能用于机器人接口、夹具、冷却或测量流程。",
    "beginner": "先看程序来源和机床型号。",
    "warning": "自动化信号错误可能造成等待或动作不同步。",
    "example": "M93 的实际含义由PLC定义。",
    "risk": "中",
    "tags": [
      "M93",
      "厂家定义",
      "自动化"
    ]
  },
  {
    "id": "kb-mcode-m94",
    "category": "M代码",
    "title": "M94 辅助功能/厂家自定义",
    "code": "M94",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M94通常为厂家自定义辅助功能。",
    "usage": "可能用于外设动作、互锁、液压或气动控制。",
    "beginner": "不要与G94进给模式混淆。",
    "warning": "M94不是每分钟进给，G94才是进给模式。",
    "example": "M94 的动作以机床说明书为准。",
    "risk": "中",
    "tags": [
      "M94",
      "厂家定义",
      "辅助功能"
    ]
  },
  {
    "id": "kb-mcode-m95",
    "category": "M代码",
    "title": "M95 辅助功能/厂家自定义",
    "code": "M95",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M95通常没有FANUC统一标准功能。",
    "usage": "可能与M94成对控制某项厂家功能。",
    "beginner": "成对M代码要确认动作方向。",
    "warning": "错误关闭/开启外设会影响安全和加工质量。",
    "example": "M95 的实际含义以厂家定义为准。",
    "risk": "中",
    "tags": [
      "M95",
      "厂家定义",
      "辅助功能"
    ]
  },
  {
    "id": "kb-mcode-m96",
    "category": "M代码",
    "title": "M96 辅助功能/厂家自定义",
    "code": "M96",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M96通常为厂家自定义，部分系统可能用于跳转或外部信号相关功能。",
    "usage": "自动化流程、条件跳转、外部信号控制程序中可能出现。",
    "beginner": "FANUC常规子程序调用一般看M98/M99。",
    "warning": "不要把M96当成通用子程序调用。",
    "example": "M96 的具体功能需按本机床资料确认。",
    "risk": "中",
    "tags": [
      "M96",
      "厂家定义",
      "程序控制"
    ]
  },
  {
    "id": "kb-mcode-m97",
    "category": "M代码",
    "title": "M97 辅助功能/厂家自定义",
    "code": "M97",
    "aliases": [
      "辅助输出",
      "Machine M-code"
    ],
    "summary": "M97通常为厂家自定义，部分品牌有本地子程序含义但FANUC不应默认。",
    "usage": "旧程序或跨品牌程序中可能出现。",
    "beginner": "FANUC里常用M98调用子程序，M99返回。",
    "warning": "把其它品牌M97用法套到FANUC可能造成报警或逻辑错误。",
    "example": "M97 出现时应查该机床系统和厂家定义。",
    "risk": "中",
    "tags": [
      "M97",
      "厂家定义",
      "子程序"
    ]
  },
  {
    "id": "kb-mcode-m98",
    "category": "M代码",
    "title": "M98 调用子程序",
    "code": "M98",
    "aliases": [
      "子程序调用",
      "Subprogram call"
    ],
    "summary": "调用指定O号子程序，可配合L重复执行。",
    "usage": "重复轮廓、孔阵列、多个相同加工位置时使用。",
    "beginner": "M98像去执行另一个小程序。",
    "warning": "P号、L次数和子程序结尾M99必须对应，否则会报警或循环异常。",
    "example": "M98 P1000 L3 表示调用O1000子程序3次。",
    "risk": "中",
    "tags": [
      "M98",
      "子程序",
      "重复调用"
    ]
  },
  {
    "id": "kb-mcode-m99",
    "category": "M代码",
    "title": "M99 子程序返回/循环返回",
    "code": "M99",
    "aliases": [
      "子程序结束",
      "Return from subprogram"
    ],
    "summary": "从子程序返回主程序；在某些场景也可用于程序循环返回。",
    "usage": "O子程序结尾必须用M99返回。",
    "beginner": "主程序别随便用M99，否则可能循环不停。",
    "warning": "M99位置错误会造成死循环或程序不结束。",
    "example": "O1000子程序末尾写M99，执行完返回M98下一段。",
    "risk": "高",
    "tags": [
      "M99",
      "子程序返回",
      "循环"
    ]
  }
];
