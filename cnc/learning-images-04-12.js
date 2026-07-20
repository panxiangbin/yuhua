(function () {
  'use strict';

  var DATA = {
    4: [
      {
        title: '第4关｜机床坐标、工件坐标、G54是什么？',
        subtitle: '机床坐标 ≠ 工件坐标，G54把程序零点对应到工件。',
        accent: '#2563eb', type: 'coordinates',
        cards: [
          ['机床坐标', '机床本身的固定位置基准，回参考点后用于确认各轴位置。'],
          ['工件坐标', '编程时使用的坐标，以选定的工件零点为基准。'],
          ['G54作用', '保存机床坐标到工件零点之间的偏置关系。']
        ],
        code: ['机床坐标 → G54偏置 → 工件坐标', '程序中的 X/Y/Z 通常相对工件零点计算'],
        warning: '不要把机床当前位置直接当成程序零点。',
        tip: '先分清两个坐标系，再去做分中、对刀和写程序。'
      },
      {
        title: '第4关｜怎么理解G54偏置？',
        subtitle: '装夹后先找零，再把测量结果写入G54。',
        accent: '#16a34a', type: 'offset',
        cards: [
          ['装夹', '工件装到机床上后，实际位置每次都可能不同。'],
          ['找零', '通过分中、寻边或测头确认工件零点的位置。'],
          ['写入G54', '把测量得到的X、Y、Z偏置保存到G54。']
        ],
        code: ['G54', 'G00 X0 Y0', 'G43 H01 Z50.'],
        warning: '换工件或重新装夹后没重设G54，孔位可能整体偏移。',
        tip: 'G54不是尺寸，它是一组把程序零点搬到工件上的坐标偏置。'
      }
    ],
    5: [
      {
        title: '第5关｜T号、H号和刀长补偿',
        subtitle: 'T号选刀，H号调用刀长补偿。',
        accent: '#0f766e', type: 'tool',
        cards: [
          ['T号', '告诉机床使用哪一把刀，例如T01。'],
          ['H号', '调用哪一组刀长补偿，例如H01。'],
          ['G43', '把H号中的刀长值加入Z轴位置计算。']
        ],
        code: ['T01 M06', 'G00 G43 H01 Z50.'],
        warning: 'T01却调用H02，Z向高度可能全部错误。',
        tip: '先核对刀号，再核对补偿号，最后低倍率空运行。'
      },
      {
        title: '第5关｜Z轴对刀和刀长补偿',
        subtitle: '刀具长短不同，所以必须建立统一的刀尖位置关系。',
        accent: '#ea580c', type: 'toolLength',
        cards: [
          ['对刀', '确认刀尖与工件基准面之间的实际关系。'],
          ['刀长补偿', '让不同长度的刀具都按同一个工件零点加工。'],
          ['安全高度', '调用补偿后先到安全Z，再逐步接近工件。']
        ],
        code: ['G43 H01 Z50.', 'G00 X0 Y0', 'G01 Z-2. F150.'],
        warning: '忘记调用G43 H号，刀具可能过高，也可能直接撞下去。',
        tip: '正式加工前必须核对零点、刀补、程序和安全高度。'
      }
    ],
    6: [
      {
        title: '第6关｜一段程序长什么样？',
        subtitle: '先看懂程序结构，再学会逐行检查。',
        accent: '#1d4ed8', type: 'program',
        cards: [
          ['O / N', 'O是程序号，N是顺序号，便于识别和查找程序段。'],
          ['G / M', 'G代码定义运动方式，M代码控制主轴、冷却和结束等动作。'],
          ['坐标与参数', 'X/Y/Z是位置，S是转速，F是进给，T/H是刀具和刀补。']
        ],
        code: ['O0001', 'N10 G90 G54 G00 X0 Y0', 'N20 T01 M06', 'N30 S2500 M03', 'N40 G43 H01 Z50.', 'N50 G01 Z-2. F200.', 'N60 M05', 'N70 M30'],
        warning: '只会照抄程序，却不知道每一行在做什么，排错时最危险。',
        tip: '先看坐标系、换刀、主轴和刀补，再看真正的加工动作。'
      },
      {
        title: '第6关｜程序格式和小数点',
        subtitle: '格式看着小，出错却可能很大。',
        accent: '#7c3aed', type: 'format',
        cards: [
          ['写清地址', '坐标值前必须有X/Y/Z，转速和进给要分清S与F。'],
          ['统一小数点', '按机床说明书和现场规范统一写法，避免数量级歧义。'],
          ['数字与字母', '数字0与字母O要区分，程序号O和数值0不能混。']
        ],
        code: ['正确：G01 X50. Y20. Z-2. F200.', '错误：G01 50. 20. -2. S200.'],
        warning: '把X10、X10.、X10.0想当然地当成完全一样并不严谨。',
        tip: '统一格式、统一习惯、先仿真，再上机加工。'
      }
    ],
    7: [
      {
        title: '第7关｜G90和G91怎么区分？',
        subtitle: 'G90看工件零点，G91看当前位置。',
        accent: '#0891b2', type: 'g90',
        cards: [
          ['G90绝对坐标', '指令中的坐标就是相对工件零点的目标位置。'],
          ['G91增量坐标', '指令中的数值是从当前位置再移动多少。'],
          ['切换要小心', '模式切换后，后面每个坐标数字的含义都会改变。']
        ],
        code: ['当前：X20 Y10', 'G90 X40 Y30 → 终点X40 Y30', 'G91 X20 Y20 → 终点X40 Y30'],
        warning: '上一段用了G91，下一段忘记切回G90，后续位置可能全部错误。',
        tip: '看到坐标数字之前，先确认当前到底是G90还是G91。'
      },
      {
        title: '第7关｜怎么判断终点位置？',
        subtitle: '先找起点，再看模式，最后算终点。',
        accent: '#f59e0b', type: 'endpoint',
        cards: [
          ['找当前位置', '先确认刀具当前坐标，也就是计算起点。'],
          ['确认模式', 'G90直接读目标坐标，G91需要在当前位置上做加减。'],
          ['检查路径', '算出终点后，还要看中途路径是否会经过工件和夹具。']
        ],
        code: ['起点：X20 Y10', 'G90 X50 Y30 → X50 Y30', 'G91 X30 Y20 → X50 Y30'],
        warning: '只看坐标数字、不看G90/G91，是判断错终点的主要原因。',
        tip: '拿不准时先画草图、标起点和终点，再做图形仿真。'
      }
    ],
    8: [
      {
        title: '第8关｜G00和G01怎么区分？',
        subtitle: 'G00负责快速定位，G01负责切削进给。',
        accent: '#2563eb', type: 'g00g01',
        cards: [
          ['G00快速定位', '用于接近、退刀和空行程，不应低位穿过障碍物。'],
          ['G01直线切削', '按照F值沿直线运动，常用于真正的切削动作。'],
          ['先安全再效率', '快速移动前先确认Z安全高度和完整经过路径。']
        ],
        code: ['G00 X0 Y0', 'G01 Z-2. F200.', 'G01 X50. Y20.'],
        warning: '把G00直接用于低位横穿工件或夹具，最容易发生碰撞。',
        tip: 'G00快到位，G01真加工；两者使用场景不能混。'
      },
      {
        title: '第8关｜安全走刀路径怎么判断？',
        subtitle: '先抬Z，再走X/Y，最后接近工件。',
        accent: '#16a34a', type: 'safePath',
        cards: [
          ['看当前位置', '先确认刀具现在处于工件上方、侧面还是夹具附近。'],
          ['抬到安全Z', '安全高度必须高于工件、压板、虎钳和其他障碍物。'],
          ['再走平面', '在安全高度移动X/Y，最后再用受控速度接近加工点。']
        ],
        code: ['G00 Z50.', 'G00 X80. Y40.', 'G01 Z-2. F200.'],
        warning: '只看终点、不看刀具经过哪里，仍然可能在中途撞夹具。',
        tip: '快移前先在脑中走一遍：刀具会不会从夹具上面经过？'
      }
    ],
    9: [
      {
        title: '第9关｜S、F、M03、M05',
        subtitle: 'S让刀转，F让刀走，M03开，M05停。',
        accent: '#0f766e', type: 'spindleFeed',
        cards: [
          ['S转速', '主轴每分钟转数，单位通常是rpm。'],
          ['F进给', '刀具每分钟移动速度，常用单位是mm/min。'],
          ['M03 / M05', 'M03启动主轴正转，M05停止主轴。']
        ],
        code: ['S2500 M03', 'G01 X50. F200.', 'M05'],
        warning: '把S和F混淆，或者忘记启动主轴就下刀，会直接损坏刀具。',
        tip: 'S管主轴快慢，F管刀具进给，M03开主轴，M05停主轴。'
      },
      {
        title: '第9关｜转速和进给怎么配合？',
        subtitle: '参数要结合材料、刀具和切削状态。',
        accent: '#dc2626', type: 'parameter',
        cards: [
          ['转速高、进给低', '容易摩擦发热、切屑过薄和刀具快速磨损。'],
          ['转速低、进给高', '切削负荷大，容易振动、崩刀或表面粗糙。'],
          ['合理配合', '参考刀具资料，从中低值试切，观察声音、切屑和表面。']
        ],
        code: ['进给 ≈ 每齿进给 × 刃数 × 转速', '每次只调整一个参数，便于判断效果'],
        warning: '只会一味加快，而不观察切屑、声音和刀具状态，风险很高。',
        tip: '参数不是死背：先稳，再快；多记录，才能找到合适组合。'
      }
    ],
    10: [
      {
        title: '第10关｜G02和G03怎么区分？',
        subtitle: '在加工平面内判断顺时针和逆时针。',
        accent: '#2563eb', type: 'arc',
        cards: [
          ['G02', '从规定观察方向看，刀具沿顺时针方向走圆弧。'],
          ['G03', '从规定观察方向看，刀具沿逆时针方向走圆弧。'],
          ['先看平面', 'G17、G18、G19决定圆弧所在平面，不能脱离平面判断。']
        ],
        code: ['G17', 'G02 X50. Y30. R20.', 'G03 X20. Y60. R20.'],
        warning: '只看终点、不看观察方向和加工平面，很容易把G02/G03写反。',
        tip: '常用记忆：从+Z看XY平面，G02顺时针，G03逆时针。'
      },
      {
        title: '第10关｜圆弧中的R和I/J',
        subtitle: 'R写半径，I/J写起点到圆心的偏置。',
        accent: '#16a34a', type: 'arcCenter',
        cards: [
          ['R写法', '用起点、终点和半径描述圆弧，程序简短直观。'],
          ['I/J写法', 'I是X方向圆心偏置，J是Y方向圆心偏置。'],
          ['检查四要素', '起点、终点、圆心和加工平面必须互相一致。']
        ],
        code: ['G02 X80. Y60. R30.', 'G03 X80. Y60. I0. J30.'],
        warning: 'R正负号、圆心偏置方向或平面选错，都会产生错误轨迹。',
        tip: '先在图上标出起点、终点和圆心，再决定用R还是I/J。'
      }
    ],
    11: [
      {
        title: '第11关｜顺铣和逆铣怎么区分？',
        subtitle: '同时观察刀具旋转方向与进给方向。',
        accent: '#059669', type: 'milling',
        cards: [
          ['顺铣', '接触点处刀具旋转方向与进给方向相同，常见表面效果较好。'],
          ['逆铣', '接触点处刀具旋转方向与进给方向相反，切削受力特点不同。'],
          ['结合机床状态', '还要考虑机床间隙、刚性、装夹和材料表面状态。']
        ],
        code: ['先看刀具怎么转', '再看刀具往哪走', '在接触点比较两者方向'],
        warning: '只背“顺铣、逆铣”文字，不看旋转和进给方向，最容易判断反。',
        tip: '判断时永远把旋转箭头和进给箭头画在同一张图上。'
      },
      {
        title: '第11关｜G41和G42左补还是右补？',
        subtitle: '沿着刀具前进方向看左右。',
        accent: '#7c3aed', type: 'compensation',
        cards: [
          ['G41左刀补', '沿刀具实际前进方向看，刀具中心位于轮廓左侧。'],
          ['G42右刀补', '沿刀具实际前进方向看，刀具中心位于轮廓右侧。'],
          ['G40取消', '刀补使用结束后必须在合适的退出段取消补偿。']
        ],
        code: ['G41 D01 G01 X100. Y0 F200.', 'G40 G00 Z50.'],
        warning: '从操作者视角判断左右、进入刀补太晚或忘记G40，都可能过切。',
        tip: '看前进方向：左边G41，右边G42，用完记得G40。'
      }
    ],
    12: [
      {
        title: '第12关｜第一个零件程序怎么串起来？',
        subtitle: '把单条知识连接成一套完整、安全的加工流程。',
        accent: '#1d4ed8', type: 'workflow',
        cards: [
          ['开头安全段', '明确单位、平面、G90、G54，并取消可能残留的补偿和循环。'],
          ['加工动作', '换刀、主轴、G43 H、安全接近，再执行轮廓或槽加工。'],
          ['钻孔与收尾', '调用固定循环，G80取消，抬刀，M05/M09，最后M30。']
        ],
        code: ['G90 G17 G21 G40 G49 G80', 'G54', 'T01 M06', 'S2500 M03', 'G00 G43 H01 Z50.', 'G01 ...', 'G81 / G83 ...', 'G80', 'M05 M09', 'M30'],
        warning: '忘记安全高度、忘记G80，或不检查程序就直接运行，都可能造成事故。',
        tip: '会单条指令还不够，必须会把它们按安全顺序连接起来。'
      },
      {
        title: '第12关｜G81、G83、G98、G99',
        subtitle: '钻孔不仅看下刀，还要看退到哪里。',
        accent: '#0f766e', type: 'drill',
        cards: [
          ['G81普通钻孔', '一次进给到孔底，再快速返回，适合普通浅孔。'],
          ['G83深孔啄钻', '分段进给并退刀排屑，Q值控制每次进给量。'],
          ['G98 / G99', 'G98返回初始平面，G99返回R平面，跨夹具时尤其关键。']
        ],
        code: ['G98 G81 Z-20. R5. F150.', 'G99 G83 Z-40. Q5. R5. F120.', 'G80'],
        warning: '忘记G80、返回方式选错或R平面低于夹具，都可能发生碰撞。',
        tip: '钻孔前看Z、R、F；跨夹具时特别确认G98、G99和返回高度。'
      }
    ]
  };

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function lines(text, x, y, width, size, weight, color, lineHeight) {
    var max = Math.max(6, Math.floor(width / (size * 0.96)));
    var chars = Array.from(String(text));
    var rows = [];
    var row = '';
    chars.forEach(function (ch) {
      if (ch === '\n' || row.length >= max) {
        rows.push(row); row = ch === '\n' ? '' : ch;
      } else row += ch;
    });
    if (row) rows.push(row);
    return '<text x="' + x + '" y="' + y + '" font-size="' + size + '" font-weight="' + weight + '" fill="' + color + '" font-family="Microsoft YaHei,Arial,sans-serif">' +
      rows.map(function (r, i) { return '<tspan x="' + x + '" dy="' + (i ? lineHeight : 0) + '">' + esc(r) + '</tspan>'; }).join('') + '</text>';
  }

  function arrow(x1, y1, x2, y2, color, dashed) {
    return '<defs><marker id="a' + color.replace('#','') + '" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M0 0 L10 5 L0 10Z" fill="' + color + '"/></marker></defs>' +
      '<path d="M' + x1 + ' ' + y1 + ' L' + x2 + ' ' + y2 + '" stroke="' + color + '" stroke-width="6" fill="none" ' + (dashed ? 'stroke-dasharray="14 10" ' : '') + 'marker-end="url(#a' + color.replace('#','') + ')"/>';
  }

  function diagram(type, accent) {
    var s = '<g transform="translate(48 250)"><rect width="624" height="300" rx="28" fill="#f8fbff" stroke="' + accent + '" stroke-width="3"/>';
    if (type === 'coordinates' || type === 'offset') {
      s += '<rect x="42" y="58" width="230" height="160" rx="18" fill="#dbeafe"/><rect x="352" y="58" width="230" height="160" rx="18" fill="#dcfce7"/>';
      s += lines('机床坐标', 92, 98, 160, 28, 900, '#1d4ed8', 34) + lines('工件坐标 G54', 385, 98, 180, 28, 900, '#15803d', 34);
      s += arrow(122,190,222,190,'#ef4444',false)+arrow(122,190,122,118,'#2563eb',false)+arrow(122,190,72,235,'#16a34a',false);
      s += arrow(430,190,530,190,'#ef4444',false)+arrow(430,190,430,118,'#2563eb',false)+arrow(430,190,380,235,'#16a34a',false);
      s += arrow(275,138,345,138,accent,true)+lines('偏置', 292, 125, 70, 22, 900, accent, 28);
    } else if (type === 'tool' || type === 'toolLength') {
      s += '<rect x="72" y="45" width="170" height="58" rx="16" fill="#dbeafe"/>' + lines('T01 刀具', 100, 82, 120, 28, 900, '#1d4ed8', 32);
      s += '<rect x="382" y="45" width="170" height="58" rx="16" fill="#fee2e2"/>' + lines('H01 刀长', 405, 82, 130, 28, 900, '#dc2626', 32);
      s += '<path d="M145 118 L145 235" stroke="#475569" stroke-width="26"/><path d="M145 215 L120 275 L170 275Z" fill="#64748b"/>';
      s += '<path d="M465 118 L465 190" stroke="#475569" stroke-width="26"/><path d="M465 170 L440 275 L490 275Z" fill="#64748b"/>';
      s += '<line x1="60" y1="278" x2="565" y2="278" stroke="#d97706" stroke-width="10"/>' + arrow(242,75,370,75,accent,false);
      s += lines('不同刀长 → 同一程序Z位置', 180, 265, 300, 23, 800, '#334155', 28);
    } else if (type === 'program' || type === 'format') {
      s += '<rect x="36" y="36" width="552" height="228" rx="18" fill="#0f172a"/>';
      var code = type === 'program' ? ['O0001','N10 G90 G54 G00 X0 Y0','N20 T01 M06','N30 S2500 M03','N40 G43 H01 Z50.','N50 G01 Z-2. F200.','N60 M30'] : ['正确  G01 X50. Y20. Z-2. F200.','错误  G01 50. 20. -2. S200.','注意  X10 / X10. / X10.0','按现场规范统一书写'];
      code.forEach(function (row,i) { s += lines(row, 60, 72+i*29, 500, 20, 700, i===0?'#86efac':'#e2e8f0', 24); });
    } else if (type === 'g90' || type === 'endpoint') {
      s += '<line x1="75" y1="240" x2="560" y2="240" stroke="#334155" stroke-width="4"/><line x1="75" y1="240" x2="75" y2="45" stroke="#334155" stroke-width="4"/>';
      s += '<circle cx="220" cy="190" r="12" fill="#16a34a"/><circle cx="470" cy="85" r="12" fill="#ef4444"/>' + arrow(230,183,455,93,accent,true);
      s += lines('起点 X20 Y10', 130, 225, 180, 22, 800, '#15803d', 28) + lines('终点 X50 Y30', 410, 65, 170, 22, 800, '#dc2626', 28);
      s += '<rect x="95" y="255" width="200" height="34" rx="12" fill="#dbeafe"/>' + lines('G90：到指定坐标', 120, 279, 170, 20, 900, '#1d4ed8', 24);
      s += '<rect x="325" y="255" width="210" height="34" rx="12" fill="#fef3c7"/>' + lines('G91：从当前位置增量', 343, 279, 190, 20, 900, '#b45309', 24);
    } else if (type === 'g00g01' || type === 'safePath') {
      s += '<rect x="70" y="205" width="480" height="52" rx="10" fill="#d6a76b"/><rect x="380" y="150" width="100" height="55" rx="8" fill="#64748b"/>';
      s += '<circle cx="125" cy="180" r="11" fill="#1e293b"/><circle cx="520" cy="180" r="11" fill="#1e293b"/>';
      s += arrow(125,180,520,180,'#dc2626',true) + lines('危险：低位横穿', 230, 165, 210, 23, 900, '#dc2626', 28);
      s += arrow(125,180,125,70,'#16a34a',true)+arrow(125,70,520,70,'#16a34a',true)+arrow(520,70,520,180,'#16a34a',true);
      s += lines('安全：抬Z → 走X/Y → 接近', 175, 55, 330, 23, 900, '#15803d', 28);
    } else if (type === 'spindleFeed' || type === 'parameter') {
      s += '<circle cx="190" cy="145" r="82" fill="#dbeafe" stroke="#2563eb" stroke-width="5"/>' + lines('S 转速', 142, 142, 110, 30, 900, '#1d4ed8', 34) + lines('主轴旋转', 140, 178, 120, 21, 700, '#475569', 25);
      s += arrow(300,145,535,145,'#f59e0b',false) + lines('F 进给', 380, 120, 120, 30, 900, '#d97706', 34) + lines('刀具移动', 380, 175, 120, 21, 700, '#475569', 25);
      s += lines(type==='parameter'?'参数要配合材料、刀具和切削状态':'M03启动主轴 · M05停止主轴', 160, 265, 350, 24, 900, accent, 30);
    } else if (type === 'arc' || type === 'arcCenter') {
      s += '<circle cx="205" cy="155" r="88" fill="none" stroke="#dbeafe" stroke-width="22"/><path d="M205 67 A88 88 0 0 1 293 155" stroke="#2563eb" stroke-width="8" fill="none"/>';
      s += '<circle cx="445" cy="155" r="88" fill="none" stroke="#dcfce7" stroke-width="22"/><path d="M445 67 A88 88 0 0 0 357 155" stroke="#16a34a" stroke-width="8" fill="none"/>';
      s += lines('G02 顺时针', 145, 275, 150, 24, 900, '#1d4ed8', 28) + lines('G03 逆时针', 385, 275, 150, 24, 900, '#15803d', 28);
      if (type === 'arcCenter') s += lines('R = 半径　I/J = 起点到圆心偏置', 130, 35, 420, 23, 900, accent, 28);
    } else if (type === 'milling' || type === 'compensation') {
      s += '<rect x="65" y="205" width="500" height="48" rx="10" fill="#cbd5e1"/><circle cx="195" cy="150" r="55" fill="#94a3b8" stroke="#475569" stroke-width="8"/><circle cx="445" cy="150" r="55" fill="#94a3b8" stroke="#475569" stroke-width="8"/>';
      s += arrow(110,275,260,275,'#16a34a',false)+arrow(520,275,370,275,'#f97316',false);
      s += lines(type==='milling'?'顺铣：旋转与进给同向':'G41：沿前进方向看在左侧', 85, 70, 245, 23, 900, '#15803d', 28);
      s += lines(type==='milling'?'逆铣：旋转与进给反向':'G42：沿前进方向看在右侧', 355, 70, 245, 23, 900, '#c2410c', 28);
    } else if (type === 'workflow') {
      var steps=['看图','G54','对刀','安全接近','轮廓','钻孔','G80','收尾'];
      steps.forEach(function (t,i) { var x=35+(i%4)*148, y=48+Math.floor(i/4)*120; s += '<rect x="'+x+'" y="'+y+'" width="125" height="78" rx="16" fill="'+(i%2?'#dcfce7':'#dbeafe')+'"/>'+lines((i+1)+' '+t,x+14,y+47,100,21,900,i%2?'#15803d':'#1d4ed8',25); if(i%4<3)s+=arrow(x+125,y+39,x+145,y+39,accent,false); });
    } else if (type === 'drill') {
      s += '<rect x="80" y="220" width="470" height="42" rx="8" fill="#cbd5e1"/><path d="M180 45 L180 215" stroke="#475569" stroke-width="20"/><path d="M180 180 L160 230 L200 230Z" fill="#64748b"/>';
      s += '<path d="M430 45 L430 215" stroke="#475569" stroke-width="20"/><path d="M430 180 L410 230 L450 230Z" fill="#64748b"/>';
      s += arrow(235,70,235,210,'#2563eb',true)+arrow(485,70,485,125,'#16a34a',true)+arrow(485,125,485,80,'#16a34a',true)+arrow(485,80,485,170,'#16a34a',true);
      s += lines('G81 一次到底', 100, 285, 190, 23, 900, '#1d4ed8', 28)+lines('G83 分段啄钻', 365, 285, 190, 23, 900, '#15803d', 28);
    }
    return s + '</g>';
  }

  function makePoster(item, lesson, index) {
    var accent=item.accent;
    var svg='<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280" viewBox="0 0 720 1280">'+
      '<rect width="720" height="1280" fill="#f4f8fc"/><rect width="720" height="210" fill="#0f3b75"/>'+
      '<circle cx="76" cy="70" r="42" fill="#facc15"/>'+lines(String(lesson),53,84,55,38,900,'#0f3b75',42)+
      lines(item.title,135,58,535,39,900,'#ffffff',46)+
      '<rect x="45" y="148" width="630" height="46" rx="23" fill="#2563eb"/>'+lines(item.subtitle,70,179,580,21,800,'#ffffff',25)+
      diagram(item.type,accent);
    var cardY=575;
    item.cards.forEach(function(card,i){var x=48+i*208;svg+='<rect x="'+x+'" y="'+cardY+'" width="190" height="205" rx="22" fill="#ffffff" stroke="'+accent+'" stroke-width="3"/>'+
      '<circle cx="'+(x+30)+'" cy="'+(cardY+34)+'" r="20" fill="'+accent+'"/>'+lines(String(i+1),x+23,cardY+42,20,20,900,'#ffffff',22)+
      lines(card[0],x+58,cardY+42,115,22,900,accent,26)+lines(card[1],x+18,cardY+86,155,18,600,'#334155',25);});
    svg+='<rect x="48" y="810" width="624" height="190" rx="24" fill="#0f172a"/>'+lines('程序 / 记忆重点',75,850,250,24,900,'#93c5fd',28);
    item.code.slice(0,7).forEach(function(row,i){svg+=lines(row,75,888+i*28,565,18,700,i===0?'#86efac':'#e2e8f0',23);});
    svg+='<rect x="48" y="1025" width="624" height="92" rx="20" fill="#fee2e2" stroke="#ef4444" stroke-width="3"/>'+lines('⚠ '+item.warning,72,1062,560,20,800,'#991b1b',28)+
      '<rect x="48" y="1140" width="624" height="92" rx="20" fill="#dcfce7" stroke="#16a34a" stroke-width="3"/>'+lines('✓ '+item.tip,72,1177,560,20,800,'#166534',28)+
      '<text x="630" y="1260" text-anchor="end" font-size="17" font-weight="700" fill="#64748b" font-family="Microsoft YaHei,Arial,sans-serif">'+String(lesson).padStart(2,'0')+'-'+String(index+1).padStart(2,'0')+' · 数控小潘 CNC助手</text></svg>';
    return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
  }

  function inject() {
    var content=window.CNC_LEARNING_CONTENT;
    if(!content||!content.lessons)return false;
    Object.keys(DATA).forEach(function(levelKey){
      var level=Number(levelKey),lesson=content.lessons[level]||content.lessons[levelKey];
      if(!lesson)return;
      lesson.imageCards=DATA[level].map(function(item,index){return {src:makePoster(item,level,index),title:item.title.replace(/^第\d+关｜/,''),desc:item.subtitle,loading:index===0?'eager':'lazy'};});
    });
    window.CNC_LEARNING_VECTOR_POSTERS=DATA;
    return true;
  }

  if(!inject()){
    var tries=0,timer=setInterval(function(){tries++;if(inject()||tries>40)clearInterval(timer);},100);
  }
})();
