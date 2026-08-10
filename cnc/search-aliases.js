// -*- coding: utf-8 -*-
// 数控速查搜索别名词典
// 编写：1号 Cherry Studio
// 日期：2026-07-06

window.CNC_SEARCH_ALIASES = [
  // G代码类
  { term: 'G2', expands: ['G02', '圆弧插补', '顺时针圆弧'], category: 'G代码' },
  { term: 'G3', expands: ['G03', '圆弧插补', '逆时针圆弧'], category: 'G代码' },
  { term: 'G0', expands: ['G00', '快速定位', '快移'], category: 'G代码' },
  { term: 'G1', expands: ['G01', '直线插补', '进给'], category: 'G代码' },
  { term: '圆弧', expands: ['G02', 'G03', '圆弧插补'], category: 'G代码' },
  { term: '快移', expands: ['G00', '快速定位'], category: 'G代码' },
  { term: '刀补', expands: ['G41', 'G42', '刀具半径补偿'], category: 'G代码' },
  { term: '刀长', expands: ['G43', 'G44', '刀长补偿', 'H代码'], category: 'G代码' },
  { term: '钻孔', expands: ['G81', 'G83', '钻孔循环', '啄钻'], category: 'G代码' },
  { term: '攻丝', expands: ['G84', '攻牙', '螺纹加工'], category: 'G代码' },

  // M代码类
  { term: 'M3', expands: ['M03', '主轴正转', '顺时针'], category: 'M代码' },
  { term: 'M5', expands: ['M05', '主轴停止'], category: 'M代码' },
  { term: 'M6', expands: ['M06', '换刀', 'ATC'], category: 'M代码' },
  { term: '主轴', expands: ['M03', 'M04', 'M05', '主轴控制'], category: 'M代码' },

  // 报警/故障类
  { term: '撞机', expands: ['撞刀', '碰撞', '安全路径', 'G00风险'], category: '故障' },
  { term: '撞刀', expands: ['防撞', '刀具碰撞', '安全高度'], category: '故障' },
  { term: '伺服报警', expands: ['伺服故障', '轴报警', 'SV报警'], category: '报警' },
  { term: '超程', expands: ['超程报警', '限位', 'OT报警', '释放'], category: '报警' },

  // 对刀/坐标类
  { term: '对刀', expands: ['对刀流程', '寻边器', '试切法', 'G54'], category: '操作' },
  { term: '工件零点', expands: ['G54', '工件坐标系', '对刀'], category: '操作' },
  { term: '回零', expands: ['参考点', 'G28', '开机回零'], category: '操作' },
  { term: '分中', expands: ['寻边器', '对刀', '工件中心'], category: '操作' },

  // 工艺/刀具类
  { term: '攻丝底孔', expands: ['底孔直径', '螺纹底孔', '攻牙参数'], category: '工艺' },
  { term: '底孔', expands: ['攻丝底孔', '螺纹底孔直径'], category: '工艺' },
  { term: '顺铣', expands: ['顺铣逆铣', '铣削方向', '切削力'], category: '工艺' },
  { term: '逆铣', expands: ['顺铣逆铣', '铣削方向'], category: '工艺' },
  { term: '铝件', expands: ['铝合金', '6061', '7075', '高速加工'], category: '材料' },

  // 新手口语问法
  { term: '主轴转速怎么算', expands: ['转速计算', 'Vc', 'RPM', '公式'], category: '新手' },
  { term: '怎么对刀', expands: ['对刀流程', '寻边器', '试切法'], category: '新手' },
  { term: '为什么要回零', expands: ['回零意义', '参考点', '开机流程'], category: '新手' }
];

// G/M 代码目录来自大批量生成的基础表。这里在目录载入前安装高风险内容归一化器，
// 作为第二层防御保持G10/G28/G53/G92/G94/G96/G97/G98/G99边界一致；基础源本身仍必须通过独立可信度门禁。
(function installGmContentSafetyGuard() {
  var gmCodesValue;

  function normalizeG10(entry) {
    if (!entry || entry.id !== 'kb-gcode-g10') return entry;
    return Object.assign({}, entry, {
      summary: 'G10可在程序中写入工件坐标、刀具补偿或其它受当前控制器支持的数据；可写对象与格式取决于CNC系统和机床厂配置。',
      usage: '仅在已经确认本机支持的G10格式、目标数据区、写入方式与权限后，用于受控设置或批量初始化。',
      beginner: '把G10理解成“会改机床数据的写入指令”。先确认写什么、写到哪里、当前是绝对还是增量解释，再考虑是否允许执行。',
      warning: 'L/P/轴地址、可写对象、G90/G91下的绝对或增量解释以及写入权限会因控制系统和机床厂配置不同而变化。执行前必须核对当前CNC/机床厂原厂手册和现场工艺，备份原数据，并由授权人员确认；教学示例不能直接拿到真实机床执行。',
      example: '教学示例：在部分明确支持该格式的控制系统中，G10 L2 P1 ... 可用于工件坐标相关数据写入；L2、P1、轴地址以及G90/G91下的解释必须逐项以本机原厂手册为准。未确认前不要上机执行。',
      tags: ['G10', '可编程数据输入', '坐标写入', '刀补', '原厂手册', '授权操作']
    });
  }

  function normalizeG28(entry) {
    if (!entry || entry.id !== 'kb-gcode-g28') return entry;
    return Object.assign({}, entry, {
      summary: 'G28用于自动返回机床参考点，属于高风险自动运动；中间位置、轴向、顺序和参考点状态的处理取决于当前CNC和机床厂配置。',
      usage: '只有在已经按本机原厂手册确认G90/G91解释、参考点状态、安全撤离方向和完整运动路径后，才可按现场工艺与授权操作规程受控使用。',
      beginner: '把G28理解成“会让机床自动运动到参考点的高风险指令”，不要把G91 G28 Z0或固定先Z后XY当成防撞口诀。',
      warning: 'G90/G91会影响中间位置的绝对或增量解释；各轴方向与顺序、参考点状态和安全路径还会受控制系统与机床厂配置影响。执行前必须核对当前CNC和机床厂原厂手册、现场工艺和授权操作规程，并确认刀具、刀柄、工件、夹具在完整计划运动空间内都有安全间隙。',
      example: '教学格式示意：某些常见控制配置可见G91 G28 Z0，但这不能作为防撞保证；真实格式、中间位置与安全路径必须逐项以本机原厂手册为准，并先做受控验证。',
      risk: '高',
      tags: ['G28','参考点返回','高风险自动运动','G90/G91','原厂手册','授权操作']
    });
  }

  function normalizeG53(entry) {
    if (!entry || entry.id !== 'kb-gcode-g53') return entry;
    return Object.assign({}, entry, {
      summary: 'G53常用于在当前程序段按机床坐标解释定位，通常属于非模态的高风险运动；具体对工件坐标偏置、刀补或其它补偿的影响取决于当前CNC和机床厂实现。',
      usage: '只有在已经核对本机原厂手册、机床坐标零点、目标机械坐标、刀补状态、轴行程和完整计划运动空间后，才可按现场工艺受控使用。',
      beginner: '把G53理解成“按本机规定使用机床坐标的高风险定位”，不是自动安全退刀。不能把Z0、换刀点或任何固定机械坐标当成跨机床通用安全点。',
      warning: '机床坐标零点、G53是否忽略或取消刀补/其它补偿以及各轴可达范围会因控制器和机床配置不同而变化。执行前必须核对当前CNC和机床厂原厂手册，确认刀具、刀柄、工件、夹具在完整计划运动空间内都有安全间隙，并按现场规程先做单段、低倍率或空运行验证。',
      example: '教学格式示意：部分控制器程序中可见G53 G00 Z...按机床坐标定位；实际目标值、运动方式和刀补影响必须逐项以本机原厂手册为准，不能把Z0直接当成安全位置复制到真实机床。',
      risk: '高',
      tags: ['G53','机械坐标','高风险运动','机床坐标零点','原厂手册','空运行']
    });
  }

  function normalizeG92(entry) {
    if (!entry || entry.id !== 'kb-gcode-g92') return entry;
    return Object.assign({}, entry, {
      title: 'G92 坐标偏移/车床螺纹循环',
      summary: 'G92不是跨机型同一含义：在部分铣床/加工中心控制器中用于工作坐标系偏移或坐标设定相关功能；在部分车床控制器中则是螺纹车削循环。具体语义、模态状态和地址格式必须按当前CNC与机床厂原厂手册确认。',
      usage: '只有先确认当前机型、控制器和G92组别后再使用。铣削坐标类用法需核对当前工件坐标系、已有G52/G54-G59等偏移以及设定/清除规则；车床螺纹循环需核对起始位置、X/Z或U/W、I/Q/F等地址解释、主轴与进给同步、退刀或倒角设置及完整运动空间。',
      beginner: '看到G92先问：这是哪台机床、哪种控制器，当前是铣削坐标功能还是车床螺纹循环？两类程序不能直接互抄。',
      warning: 'G92在不同CNC上可能改变后续坐标解释，也可能直接进入螺纹切削循环；组别、模态性、清除方式和地址含义并不统一。上机前必须核对当前CNC和机床厂原厂手册，确认坐标偏移、刀补与现有G52/G54-G59状态，或确认螺纹参数、起始位置、主轴同步和安全退刀空间；先在仿真、图形检查或受控单段条件下验证，教学示例不得直接作为真实机床参数。',
      example: '教学格式示意：部分车床系统中G92 X... Z... F...可表示简单螺纹循环；部分铣床/加工中心系统中G92 X...则用于坐标偏移或设定相关功能。两者语义不同，X/Z/U/W/I/Q/F、模态状态和清除方式必须逐项以本机原厂手册为准。',
      risk: '高',
      tags: ['G92','车铣差异','坐标偏移','螺纹循环','原厂手册','主轴同步']
    });
  }

  function normalizeG94(entry) {
    if (!entry || entry.id !== 'kb-gcode-g94') return entry;
    return Object.assign({}, entry, {
      title: 'G94 每分钟进给模式/车床端面循环',
      summary: 'G94不是跨机型同一含义：在部分铣床/加工中心控制器中用于每分钟进给模式；在部分车床控制器中则可能是端面/直线车削循环。具体语义、组别、模态状态和地址格式必须按当前CNC与机床厂原厂手册确认。',
      usage: '先确认当前机型、控制器和G94组别。铣削进给模式需核对G93/G94/G95之间的模式关系、当前公制/英制状态以及F的单位与含义；车床循环需核对起始位置、X/Z或U/W、K/F等地址解释、返回/退刀路径、刀补与完整计划运动空间。',
      beginner: '看到G94先问：这是哪台机床、哪种控制器？是铣削的每分钟进给模式，还是车床端面循环？两类程序不能直接互抄。',
      warning: '把铣削进给模式当成车床循环，或把车床循环当成铣削进给模式，会让程序含义完全改变。上机前必须核对当前CNC与机床厂原厂手册，确认G93/G94/G95、单位制、F含义，或确认X/Z/U/W/K/F、起始位置、返回/退刀路径、主轴和刀补状态；同时确认刀具、刀柄、工件、夹具在完整计划运动空间内有安全间隙，并按现场规程先做仿真、图形检查、单段或低风险受控验证。教学示例不得直接作为真实机床参数。',
      example: '教学语义示意：部分铣床/加工中心中G94表示每分钟进给模式；部分车床中G94表示端面/直线车削循环。两类语义不能互抄，具体F单位、循环地址、起始位置与返回路径必须逐项以本机原厂手册为准。',
      risk: '高',
      tags: ['G94','车铣差异','每分钟进给','端面循环','G93/G95','原厂手册']
    });
  }

  function normalizeG96(entry) {
    if (!entry || entry.id !== 'kb-gcode-g96') return entry;
    return Object.assign({}, entry, {
      title: 'G96 恒线速度模式（部分车床CNC）',
      summary: '在部分明确支持该车床语义的CNC中，G96用于恒线速度控制，主轴转速会随当前加工直径变化；其它机床或控制器上G96可能具有不同含义，必须先核对当前CNC和机床厂原厂手册。',
      usage: '仅在确认机床类型、当前CNC、G96组别、单位制与S地址含义后使用；同时确认本机最高允许主轴转速及限制方式，并核对主轴、卡盘、装夹、工件和刀具各自允许的转速与安全限制。',
      beginner: '不要把“G96前必写G50”或任何固定S数值记成跨系统口诀；先确认本机如何设置最高主轴转速限制、S的单位以及当前加工直径解释。',
      warning: '恒线速度下随着有效加工直径减小，主轴转速可能升高。最高允许主轴转速不是只由程序一个数值决定，还受主轴、卡盘、装夹、工件、刀具和机床配置限制。上机前必须按当前CNC和机床厂原厂手册确认限制方式、单位制、S含义与全部转速上限，并按现场规程做仿真、图形检查、单段或其它受控验证。',
      example: '教学语义示意：部分车床CNC中G96表示恒线速度模式，S表示该模式规定的线速度值；具体单位、最高转速限制指令与可用范围必须逐项以本机原厂手册为准，不提供可直接照抄的固定转速或线速度数值。',
      risk: '高',
      tags: ['G96','恒线速度','车床适用范围','当前CNC','原厂手册','最高允许主轴转速','卡盘','装夹','工件','刀具']
    });
  }

  function normalizeG97(entry) {
    if (!entry || entry.id !== 'kb-gcode-g97') return entry;
    return Object.assign({}, entry, {
      title: 'G97 恒线速度取消/固定转速模式（部分车床CNC）',
      summary: '在部分明确支持该车床语义的CNC中，G97用于取消恒线速度并进入固定主轴转速模式；其它机床或控制器上G97可能具有不同含义，必须先核对当前CNC和机床厂原厂手册。',
      usage: '仅在确认机床类型、当前CNC、G97组别、单位制与S地址含义后使用；同时确认本机最高允许主轴转速，以及主轴、卡盘、装夹、工件和刀具的全部转速与安全限制。',
      beginner: '不要把“G97后S一定就是转/分”当成跨系统口诀；只有本机原厂手册明确该车床语义时，才能按其规定解释S和固定转速模式。',
      warning: '切换到固定转速并不会自动证明该转速安全。S地址解释、单位和最大允许值必须按当前CNC与机床配置确认，并同时受主轴、卡盘、装夹、工件和刀具限制；上机前核对原厂手册并按现场规程做受控验证。',
      example: '教学语义示意：部分车床CNC中G97取消恒线速度并按本机规定使用S设置固定主轴转速；具体S单位、允许范围和主轴方向控制必须以本机原厂手册为准，不提供可直接照抄的固定转速数值。',
      risk: '高',
      tags: ['G97','恒线速度取消','固定转速','车床适用范围','当前CNC','原厂手册','最高允许主轴转速','卡盘','装夹','工件','刀具']
    });
  }

  function normalizeG98(entry) {
    if (!entry || entry.id !== 'kb-gcode-g98') return entry;
    return Object.assign({}, entry, {
      title: 'G98 固定循环初始平面返回/车床每分钟进给',
      summary: 'G98不是跨机型同一含义：部分铣床/加工中心在固定循环语境用于返回循环开始前的初始Z平面；部分车床则用于每分钟进给模式。具体组别、模态性与F地址解释必须按当前CNC和机床厂原厂手册确认。',
      usage: '先确认机型、控制器、G代码组别和固定循环状态。铣削侧核对初始Z位置、R平面、障碍物与完整计划运动空间；车削侧核对单位制、F的单位与含义、主轴和其它进给模式状态。',
      beginner: 'G98先分清机床和语境：铣削固定循环返回方式与车床每分钟进给不是一回事；不要记成“G98一定退得更高”。',
      warning: '初始平面与R平面的实际高低不能脱离当前程序状态和本机规则判断；车床侧G98会改变F地址解释。必须核对当前CNC和机床厂原厂手册，并结合完整运动空间做图形检查、仿真、单段或其它受控验证。',
      example: '教学语义示意：部分铣床/加工中心中G98表示固定循环返回初始平面；部分车床中G98表示每分钟进给。实际坐标、单位与进给值必须以本机原厂手册为准。',
      risk: '高',
      tags: ['G98','车铣差异','固定循环','初始平面','每分钟进给','原厂手册']
    });
  }

  function normalizeG99(entry) {
    if (!entry || entry.id !== 'kb-gcode-g99') return entry;
    return Object.assign({}, entry, {
      title: 'G99 固定循环R平面返回/车床每转进给',
      summary: 'G99不是跨机型同一含义：部分铣床/加工中心在固定循环语境用于返回R平面；部分车床则用于每转进给模式。具体组别、模态性与F地址解释必须按当前CNC和机床厂原厂手册确认。',
      usage: '先确认机型、控制器、G代码组别和固定循环状态。铣削侧核对R平面、初始Z位置、孔间路径、障碍物与完整计划运动空间；车削侧核对单位制、F的每转单位与含义、主轴和其它进给模式状态。',
      beginner: 'G99先分清机床和语境：铣削固定循环R平面返回与车床每转进给不是一回事；不要记成“G99一定更低、更快或绝对安全”。',
      warning: 'R平面是否适合作为孔间返回高度必须结合当前程序状态、障碍物和本机规则判断；车床侧G99会改变F地址解释。必须核对当前CNC和机床厂原厂手册，并按现场工艺做受控验证。',
      example: '教学语义示意：部分铣床/加工中心中G99表示固定循环返回R平面；部分车床中G99表示每转进给。实际R平面、单位与进给值必须以本机原厂手册为准。',
      risk: '高',
      tags: ['G99','车铣差异','固定循环','R平面','每转进给','原厂手册']
    });
  }

  function normalizeCatalog(value) {
    if (!Array.isArray(value)) return value;
    return value.map(function (entry) { return normalizeG99(normalizeG98(normalizeG97(normalizeG96(normalizeG94(normalizeG92(normalizeG53(normalizeG28(normalizeG10(entry))))))))); });
  }

  Object.defineProperty(window, 'CNC_GM_CODES', {
    configurable: true,
    enumerable: true,
    get: function () { return gmCodesValue; },
    set: function (value) { gmCodesValue = normalizeCatalog(value); }
  });

  window.CNC_GM_CONTENT_SAFETY = {
    version: 'g10-g28-g53-g92-g94-g96-g97-g98-g99-boundary-7',
    normalizeG10: normalizeG10,
    normalizeG28: normalizeG28,
    normalizeG53: normalizeG53,
    normalizeG92: normalizeG92,
    normalizeG94: normalizeG94,
    normalizeG96: normalizeG96,
    normalizeG97: normalizeG97,
    normalizeG98: normalizeG98,
    normalizeG99: normalizeG99,
    normalizeCatalog: normalizeCatalog
  };
})();