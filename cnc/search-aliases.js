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

// G/M 代码目录来自大批量生成的基础表。这里在目录载入前安装一个高风险内容归一化器，
// 只修正会直接改写机床数据的 G10 教学边界，避免把某一种控制器格式教成跨机床通用规则。
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

  function normalizeCatalog(value) {
    if (!Array.isArray(value)) return value;
    return value.map(function (entry) { return normalizeG53(normalizeG28(normalizeG10(entry))); });
  }

  Object.defineProperty(window, 'CNC_GM_CODES', {
    configurable: true,
    enumerable: true,
    get: function () { return gmCodesValue; },
    set: function (value) { gmCodesValue = normalizeCatalog(value); }
  });

  window.CNC_GM_CONTENT_SAFETY = {
    version: 'g10-g28-g53-boundary-3',
    normalizeG10: normalizeG10,
    normalizeG28: normalizeG28,
    normalizeG53: normalizeG53,
    normalizeCatalog: normalizeCatalog
  };
})();
