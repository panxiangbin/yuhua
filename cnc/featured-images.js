window.CNC_FEATURED_IMAGES = {
  "learn-coordinate-system": [
    {
      title: "坐标系基础图",
      caption: "先看懂 X / Z / 工件零点 / 绝对值与增量。",
      src: "./assets/images/batch01_core/beginner-coordinate-001.webp"
    },
    {
      title: "操作面板总览图",
      caption: "先认清屏幕、模式旋钮和常用键位。",
      src: "./assets/images/batch02_operation_basics/panel-control-overview-001.webp"
    }
  ],
  "machine-tool-setting": [
    {
      title: "工件坐标设定图",
      caption: "对刀后怎么录入工件零点。",
      src: "./assets/images/batch02_operation_basics/work-offset-setting-001.webp"
    },
    {
      title: "回零顺序图",
      caption: "开机后先回参考点，再继续操作。",
      src: "./assets/images/batch02_operation_basics/zero-return-sequence-001.webp"
    }
  ],
  "g02-g03-arc": [
    {
      title: "G02 / G03 圆弧方向图",
      caption: "顺逆时针、R 写法、I/K 写法一起看。",
      src: "./assets/images/batch01_core/gcode-g02-g03-001.webp"
    },
    {
      title: "R 与 I/K 对比图",
      caption: "圆弧最容易混的地方，用图看最直观。",
      src: "./assets/images/batch02_operation_basics/arc-r-vs-ik-001.webp"
    }
  ],
  "learn-g54-g59": [
    {
      title: "G54-G59 坐标系图",
      caption: "同一套程序如何切换不同工件零点。",
      src: "./assets/images/batch01_core/gcode-g54-g59-001.webp"
    }
  ],
  "learn-g81-g83": [
    {
      title: "G81 普通钻孔图",
      caption: "普通钻孔循环的最基础入口。",
      src: "./assets/images/batch01_core/cycle-g81-001.webp"
    },
    {
      title: "G83 啄钻图",
      caption: "深孔啄钻为什么需要分段退屑。",
      src: "./assets/images/batch01_core/cycle-g83-001.webp"
    },
    {
      title: "G84 攻丝图",
      caption: "攻丝循环最怕方向和进给关系没弄清。",
      src: "./assets/images/batch01_core/cycle-g84-001.webp"
    }
  ],
  "g98-g99-return": [
    {
      title: "G98 / G99 返回平面图",
      caption: "初始点和 R 点的区别。",
      src: "./assets/images/batch01_core/cycle-g98-g99-001.webp"
    }
  ],
  "fanuc-alarm-common": [
    {
      title: "报警分类总览图",
      caption: "先分程序、伺服、主轴、限位、换刀。",
      src: "./assets/images/batch02_operation_basics/alarm-category-overview-001.webp"
    }
  ],
  "alarm-servo": [
    {
      title: "伺服报警图",
      caption: "轴不动、跟随异常、驱动器报警先从这里进。",
      src: "./assets/images/batch01_core/alarm-servo-001.webp"
    }
  ],
  "alarm-spindle": [
    {
      title: "主轴报警图",
      caption: "主轴不转、过载、驱动报警常见入口。",
      src: "./assets/images/batch01_core/alarm-spindle-001.webp"
    }
  ],
  "alarm-atc": [
    {
      title: "换刀故障流程图",
      caption: "先判断卡在第几步，再查联锁与到位。",
      src: "./assets/images/batch05_alarm_drawing_material/atc-alarm-flow-001.webp"
    }
  ],
  "quick-measure": [
    {
      title: "游标卡尺读数图",
      caption: "先认主尺、副尺和对齐刻线。",
      src: "./assets/images/batch05_alarm_drawing_material/vernier-caliper-detail-001.webp"
    },
    {
      title: "千分尺读数图",
      caption: "精度更高，但更要注意棘轮和读数顺序。",
      src: "./assets/images/batch05_alarm_drawing_material/micrometer-detail-001.webp"
    }
  ],
  "drawing-symbol": [
    {
      title: "几何公差图解",
      caption: "平面度、垂直度、同轴度这些符号先看懂。",
      src: "./assets/images/batch05_alarm_drawing_material/drawing-gdt-basic-001.webp"
    }
  ],
  "calc-vc-rpm": [
    {
      title: "端面车削图",
      caption: "把刀路、线速度和转速关系放到真实加工里看。",
      src: "./assets/images/batch03_turning_process/turning-facing-001.webp"
    },
    {
      title: "面铣刀路图",
      caption: "看懂切入、切出和覆盖宽度，再去算参数。",
      src: "./assets/images/batch04_milling_tooling/milling-face-milling-001.webp"
    }
  ],
  "g94-g95-feed": [
    {
      title: "G94 / G95 进给方式图",
      caption: "每分钟进给和每转进给的区别。",
      src: "./assets/images/batch01_core/feed-g94-g95-001.webp"
    }
  ],
  "g00-g01-motion": [
    {
      title: "G00 / G01 运动图区",
      caption: "快移和按进给切削，用图看比只看代码更直观。",
      src: "./assets/images/batch01_core/gcode-g00-g01-001.webp"
    }
  ],
  "learn-absolute-incremental": [
    {
      title: "G90 / G91 绝对与增量",
      caption: "绝对值和增量最容易写偏，先用图理解坐标逻辑。",
      src: "./assets/images/batch01_core/beginner-g90-g91-001.webp"
    }
  ],
  "learn-g17-g18-g19": [
    {
      title: "G17 / G18 / G19 平面选择",
      caption: "先看当前平面，再判断圆弧方向和补偿逻辑。",
      src: "./assets/images/batch01_core/gcode-g17-g18-g19-001.webp"
    }
  ],
  "learn-g41-g42": [
    {
      title: "G41 / G42 刀补方向",
      caption: "刀具补偿先看刀走向，再看左右补。",
      src: "./assets/images/batch01_core/gcode-g41-g42-001.webp"
    }
  ],
  "learn-g43-g44-g49": [
    {
      title: "G43 / G44 / G49 刀长补偿",
      caption: "刀长补偿和工件坐标要分开理解，不然容易混。",
      src: "./assets/images/batch01_core/gcode-g43-g49-001.webp"
    }
  ],
  "g20-g21-unit": [
    {
      title: "G20 / G21 单位切换",
      caption: "英制和公制切换一定要提前确认单位。",
      src: "./assets/images/batch01_core/unit-g20-g21-001.webp"
    }
  ],
  "machine-home-return": [
    {
      title: "回零安全路径图",
      caption: "先回参考点，再继续对刀和加工操作。",
      src: "./assets/images/batch01_core/home-safe-path-001.webp"
    }
  ],
  "fault-home-fail": [
    {
      title: "回零失败排查入口",
      caption: "回不了零点时，先分机械、参数、检测开关几个方向。",
      src: "./assets/images/batch01_core/fault-home-fail-001.webp"
    }
  ],
  "learn-program-structure": [
    {
      title: "程序结构基础图",
      caption: "先看地址符顺序和程序分段，再去写复杂代码。",
      src: "./assets/images/batch02_operation_basics/program-structure-basic-001.webp"
    }
  ],
  "machine-panel-english": [
    {
      title: "面板总览图",
      caption: "先把常见按钮和模式区域认清，再去操作机床。",
      src: "./assets/images/batch02_operation_basics/panel-control-overview-001.webp"
    }
  ],
  "process-allowance-basics": [
    {
      title: "加工余量流程图",
      caption: "粗、半精、精三段余量关系，现场很常用。",
      src: "./assets/images/batch03_turning_process/turning-allowance-flow-001.webp"
    }
  ],
  "tool-drill-selection": [
    {
      title: "钻头类型总览",
      caption: "先分普通钻、定心钻、铰刀和丝锥前工序。",
      src: "./assets/images/batch04_milling_tooling/drill-types-overview-001.webp"
    }
  ],
  "tool-thread-tap": [
    {
      title: "攻丝与底孔关系图",
      caption: "攻丝前先看底孔、螺距和材料，不要只背规格。",
      src: "./assets/images/batch04_milling_tooling/milling-drill-ream-tap-001.webp"
    }
  ],
  "material-aluminum": [
    {
      title: "铝合金加工图卡",
      caption: "铝件切削重点先看排屑、转速和毛刺控制。",
      src: "./assets/images/batch05_alarm_drawing_material/material-aluminum-cutting-001.webp"
    }
  ],
  "material-stainless": [
    {
      title: "不锈钢加工图卡",
      caption: "不锈钢重点先看发热、刀具磨损和冷却策略。",
      src: "./assets/images/batch05_alarm_drawing_material/material-stainless-cutting-001.webp"
    }
  ],
  "case-thin-wall": [
    {
      title: "薄壁件加工案例",
      caption: "薄壁件先看装夹、让刀和走刀策略。",
      src: "./assets/images/batch03_turning_process/turning-thin-wall-001.webp"
    }
  ],
  "case-axis": [
    {
      title: "阶梯轴加工案例",
      caption: "阶梯轴适合新手入门看程序结构和加工顺序。",
      src: "./assets/images/batch03_turning_process/step-shaft-case-001.webp"
    }
  ],
  "case-thread-part": [
    {
      title: "螺纹零件案例",
      caption: "结合螺距、退刀和循环参数一起理解最稳。",
      src: "./assets/images/batch03_turning_process/thread-part-case-001.webp"
    }
  ]
};
