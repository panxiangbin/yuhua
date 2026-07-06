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
