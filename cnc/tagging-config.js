/**
 * tagging-config.js
 * 智能标签系统配置 — 标签维度定义/关键词词典/权重配置/难度阈值/颜色映射
 * 全局对象: window.CNC_TAG_CONFIG
 */
(function () {
  'use strict';

  if (window.CNC_TAG_CONFIG) return;

  // ── 维度1: 内容类型 (Content Type) ──
  var CONTENT_CATEGORIES = [
    { id: 'programming', label: '编程', icon: 'G', color: '#e74c3c', priority: 1,
      subcategories: [
        { id: 'gcode', label: 'G代码', keywords: ['G00','G01','G02','G03','G04','G17','G18','G19','G20','G21','G28','G40','G41','G42','G43','G54','G90','G91','G94','G95','G98','G99','快速定位','直线插补','圆弧插补','暂停指令','平面选择','单位设置','返回参考点','刀具补偿','工件坐标系','绝对编程','增量编程','进给模式'] },
        { id: 'mcode', label: 'M代码', keywords: ['M00','M01','M02','M03','M04','M05','M06','M07','M08','M09','M10','M11','M13','M19','M30','M41','M42','M98','M99','程序暂停','主轴正转','主轴反转','主轴停止','自动换刀','切削液','子程序调用','程序结束'] },
        { id: 'macro', label: '宏程序', keywords: ['宏程序','宏变量','#','G65','G66','G67','变量','循环','判断','IF','WHILE','GOTO','算术运算','逻辑运算','系统变量','用户宏'] },
        { id: 'cycle', label: '固定循环', keywords: ['G73','G74','G76','G80','G81','G82','G83','G84','G85','G86','G87','G88','G89','钻孔循环','攻丝循环','镗孔循环','深孔钻','固定循环','啄钻'] },
        { id: 'technique', label: '编程技巧', keywords: ['编程技巧','编程优化','刀路优化','加工策略','走刀方式','进刀策略','退刀策略','拐角减速','顺铣','逆铣','摆线加工','螺旋插补','高效加工'] }
      ] },
    { id: 'operation', label: '操作', icon: '🎯', color: '#e67e22', priority: 2,
      subcategories: [
        { id: 'setup', label: '对刀', keywords: ['对刀','寻边','分中','对刀仪','寻边器','光电寻边','自动对刀','刀具长度测量','工件测量','在线测量','触发式测头'] },
        { id: 'operation', label: '机床操作', keywords: ['开机','关机','回零','JOG','手轮','MDI','DNC','程序传输','U盘传输','网线传输','操作面板','按键说明','模式选择','倍率','急停'] },
        { id: 'toolchange', label: '换刀', keywords: ['换刀','刀库','刀臂','换刀指令','M06','换刀点','刀号','刀具表','刀盘','换刀宏程序','自动换刀'] },
        { id: 'maintain', label: '维护保养', keywords: ['维护','保养','润滑','冷却液更换','过滤器清洗','导轨润滑','主轴维护','丝杆维护','定期保养','油位检查','精度检测','水平调整'] }
      ] },
    { id: 'process', label: '工艺', icon: '🔄', color: '#1abc9c', priority: 3,
      subcategories: [
        { id: 'cutting', label: '切削参数', keywords: ['切削速度','进给速度','切削深度','主轴转速','每齿进给量','Vc','F值','S值','ap','ae','材料去除率','切削力','切削热','切削功率','刀具寿命','刀具磨损'] },
        { id: 'tool_select', label: '刀具选择', keywords: ['刀具选择','刀具类型','铣刀','车刀','钻头','铰刀','丝锥','刀片','涂层刀具','硬质合金','高速钢','陶瓷刀具','CBN','PCD','刀具直径','刀尖圆弧'] },
        { id: 'route', label: '工艺路线', keywords: ['工艺路线','工序安排','粗加工','精加工','半精加工','开粗','光刀','清根','热处理工序','基准面','加工余量','工序卡','工艺规程'] }
      ] },
    { id: 'cam', label: 'CAM', icon: '💻', color: '#3498db', priority: 4,
      subcategories: [
        { id: 'ug', label: 'UG_NX', keywords: ['UG','NX','UG_NX','Siemens NX','建模','加工模块','型腔铣','等高轮廓','固定轴','刀轨生成','后处理','刀路仿真','碰撞检查'] },
        { id: 'mastercam', label: 'Mastercam', keywords: ['Mastercam','刀路','2D加工','3D加工','曲面加工','实体加工','动态铣','动态车','后处理','机床仿真','刀路转换'] },
        { id: 'powermill', label: 'PowerMill', keywords: ['PowerMill','PM','高速加工','五轴加工','刀轴控制','碰撞避让','残留加工','投影加工','策略加工器','边界','参考线'] },
        { id: 'fusion360', label: 'Fusion360', keywords: ['Fusion360','Autodesk','自适应','清根','仿真','制造','CAM','CAD/CAM','云制造','协作'] }
      ] },
    { id: 'repair', label: '维修', icon: '⚠️', color: '#e53935', priority: 5,
      subcategories: [
        { id: 'alarm', label: '报警代码', keywords: ['报警','报警代码','警报','error','alarm','ER','SP','SV','OT','过热','过载','超程','急停','伺服报警','主轴报警','系统报警'] },
        { id: 'diagnosis', label: '故障诊断', keywords: ['故障诊断','排查','分析','现象','原因','解决','维修步骤','检查方法','测量点','信号检测','PLC诊断','梯形图','IO诊断'] },
        { id: 'repair_case', label: '维修案例', keywords: ['维修案例','维修记录','维修报告','故障案例','维修经验','维修总结','修复过程','备件更换'] }
      ] },
    { id: 'quality', label: '质量', icon: '📊', color: '#9b59b6', priority: 6,
      subcategories: [
        { id: 'inspection', label: '检测方法', keywords: ['检测','测量','检验','三坐标','测头','千分尺','卡尺','高度规','粗糙度仪','圆度仪','轮廓仪','投影仪','气动量仪'] },
        { id: 'control', label: '质量控制', keywords: ['质量控制','SPC','Cp','Cpk','过程控制','统计','合格率','不良率','首检','巡检','末检','抽检','全检'] },
        { id: 'tolerance', label: '精度分析', keywords: ['公差','精度','形位公差','尺寸公差','配合','定位精度','重复定位精度','反向间隙','螺距误差','热变形','振动分析'] }
      ] },
    { id: 'theory', label: '理论', icon: '📖', color: '#00bcd4', priority: 7,
      subcategories: [
        { id: 'foundation', label: '基础理论', keywords: ['数控原理','插补原理','伺服控制','闭环控制','开环控制','脉冲当量','电子齿轮','位置检测','编码器','光栅尺'] },
        { id: 'math', label: '原理解析', keywords: ['三角函数','坐标变换','矩阵','向量','插补算法','刀具轨迹','曲面拟合','误差补偿','数学模型','解析'] },
        { id: 'standard', label: '标准规范', keywords: ['ISO标准','GB标准','JB标准','数控代码标准','G代码标准','编程规范','安全规范','操作规范','检验标准'] }
      ] },
    { id: 'case', label: '案例', icon: '📋', color: '#e91e63', priority: 8,
      subcategories: [
        { id: 'case_machining', label: '加工案例', keywords: ['案例','加工案例','实战','实例','加工经验','实际加工','试切','首件','批量加工','典型零件','复杂零件'] },
        { id: 'case_project', label: '项目经验', keywords: ['项目经验','项目总结','技术方案','工艺方案','夹具设计','刀具方案','加工方案','效率提升','成本优化'] },
        { id: 'case_skill', label: '生产技巧', keywords: ['技巧','经验','窍门','心法','诀窍','小技巧','实用技巧','经验之谈','老司机','干货'] }
      ] }
  ];

  // ── 维度2: 难度级别 ──
  var DIFFICULTY_LEVELS = [
    { id: 'beginner', label: '入门', score: 1, color: '#4caf50', desc: '零基础可学，无需前置知识' },
    { id: 'elementary', label: '初级', score: 2, color: '#8bc34a', desc: '有基本概念即可理解' },
    { id: 'intermediate', label: '中级', score: 3, color: '#ffc107', desc: '需要一定实操经验' },
    { id: 'advanced', label: '高级', score: 4, color: '#ff9800', desc: '需要精通原理和丰富经验' },
    { id: 'expert', label: '专家', score: 5, color: '#f44336', desc: '行业专家级别内容' }
  ];

  var DIFFICULTY_THRESHOLDS = {
    termDensity: { beginner: 0.03, elementary: 0.06, intermediate: 0.10, advanced: 0.15, expert: 0.20 },
    fileSize: { beginner: 2048, elementary: 4096, intermediate: 8192, advanced: 14336, expert: 20480 },
    codeLines: { beginner: 3, elementary: 8, intermediate: 15, advanced: 30, expert: 50 },
    formulaCount: { beginner: 0, elementary: 1, intermediate: 3, advanced: 5, expert: 8 },
    prereqCount: { beginner: 0, elementary: 1, intermediate: 3, advanced: 5, expert: 8 }
  };

  // ── 维度3: 机床类型 ──
  var MACHINE_TYPES = [
    { id: 'milling', label: '加工中心', keywords: ['加工中心','铣床','立式','卧式','五轴','CNC铣','数控铣','立加','卧加','龙门铣','雕铣机','高速铣','3轴','4轴','5轴'] },
    { id: 'lathe', label: '车床', keywords: ['车床','数控车','车削中心','车铣复合','走心机','排刀车','斜床身','平床身','双主轴','车削','车加工'] },
    { id: 'mill_turn', label: '车铣复合', keywords: ['车铣复合','复合加工','B轴','Y轴','动力刀塔','复合机床','多功能机床','5轴车铣'] },
    { id: 'grinder', label: '磨床', keywords: ['磨床','磨削','平面磨','外圆磨','内圆磨','无心磨','工具磨','坐标磨','研磨','超精磨'] },
    { id: 'edm_wire', label: '线切割', keywords: ['线切割','快走丝','慢走丝','中走丝','线切割机','钼丝','铜丝','切割参数','电火花线切割'] },
    { id: 'edm', label: '电火花', keywords: ['电火花','EDM','放电加工','电脉冲','镜面火花','石墨','铜电极','加工液','放电参数'] },
    { id: 'general', label: '通用', keywords: ['数控机床','数字控制','CNC','NC','通用','综合','各类机床'] }
  ];

  // ── 维度4: 材料类型 ──
  var MATERIAL_TYPES = [
    { id: 'aluminum', label: '铝合金', keywords: ['铝','铝合金','6061','7075','5052','2024','6082','ADC12','A356','铸铝','锻铝','铝板','铝棒','LY12','LC4'] },
    { id: 'stainless', label: '不锈钢', keywords: ['不锈钢','304','316','316L','2205','17-4PH','430','201','321','sus304','sus316','耐热钢','耐酸钢'] },
    { id: 'steel', label: '碳钢', keywords: ['钢','45钢','Q235','Q345','A3','20钢','40Cr','42CrMo','35CrMo','65Mn','弹簧钢','工具钢','碳钢','合金钢','模具钢'] },
    { id: 'titanium', label: '钛合金', keywords: ['钛','钛合金','TC4','TC11','TA2','TA15','Ti6Al4V','Ti6Al7Nb','BT20','钛棒','钛板','难加工材料'] },
    { id: 'cast_iron', label: '铸铁', keywords: ['铸铁','灰铸铁','球墨铸铁','HT200','HT250','QT400','QT500','QT600','铸钢','合金铸铁','冷硬铸铁'] },
    { id: 'copper', label: '铜合金', keywords: ['铜','黄铜','青铜','紫铜','铍铜','铬铜','铜合金','H59','H62','H68','QSn','QBe','无氧铜'] },
    { id: 'plastic', label: '塑料', keywords: ['塑料','POM','PEEK','PC','ABS','尼龙','PMMA','亚克力','PTFE','特氟龙','UHMWPE','PVC','PE','PP','工程塑料'] },
    { id: 'composite', label: '复合材料', keywords: ['复合材料','碳纤维','玻璃纤维','CFRP','GFRP','凯夫拉','芳纶','蜂窝','夹芯','预浸料','层压'] },
    { id: 'general', label: '通用材料', keywords: ['钢铁','金属','材料','通用材料','多材料','各种材料'] }
  ];

  // ── 维度5: 系统品牌 ──
  var SYSTEM_BRANDS = [
    { id: 'fanuc', label: 'FANUC', keywords: ['FANUC','发那科','发那克','0i','30i','31i','32i','18i','21i','15i','16i','Power Motion','Series 0'] },
    { id: 'siemens', label: 'SIEMENS', keywords: ['Siemens','西门子','Sinumerik','828D','840D','840Dsl','802D','802S','802C','810D','Operate','ShopMill','ShopTurn'] },
    { id: 'mitsubishi', label: 'MITSUBISHI', keywords: ['三菱','Mitsubishi','M70','M70V','M80','M800','E68','E70','M64','M60','M50','PLC三菱'] },
    { id: 'haas', label: 'HAAS', keywords: ['Haas','哈斯','VF系列','ST系列','Mini Mill',' Haas控制','哈斯系统'] },
    { id: 'mazak', label: 'MAZAK', keywords: ['Mazak','马扎克','Mazatrol','SmoothG','SmoothX','Matrix','INTEGREX','VARIAXIS','QV'] },
    { id: 'heidenhain', label: 'HEIDENHAIN', keywords: ['Heidenhain','海德汉','TNC','TNC620','TNC640','iTNC530','TNC320','TNC128','Klartext'] },
    { id: 'general', label: '通用系统', keywords: ['数控系统','控制系统','通用系统','不限系统','各类系统'] }
  ];

  // ── 维度6: 知识属性 ──
  var KNOWLEDGE_ATTRIBUTES = [
    { id: 'must_learn', label: '必修', icon: '⭐', color: '#f44336', desc: '新手必须掌握的核心内容', keywords: ['必修','必学','必须掌握','核心知识','基础','基本功','必知','必备','入门必备'] },
    { id: 'frequent', label: '高频', icon: '🔥', color: '#ff9800', desc: '日常工作中频繁使用', keywords: ['常用','日常','频繁','经常用','高频','高频使用','实用','常见'] },
    { id: 'advanced', label: '进阶', icon: '🚀', color: '#2196f3', desc: '提升技能的高级内容', keywords: ['进阶','提高','提升','深入','高级','精通','优化','进阶技巧','高手','大师'] },
    { id: 'special', label: '专项', icon: '🎯', color: '#9c27b0', desc: '特定场景才用到的专项知识', keywords: ['专项','特殊','特定','专用','专有','特有','定向','窄领域'] },
    { id: 'safety', label: '安全', icon: '🛡️', color: '#ff5722', desc: '涉及安全操作的内容', keywords: ['安全','警示','警告','危险','注意','防护','事故','碰撞','人身安全','设备安全'] },
    { id: 'pitfall', label: '避坑', icon: '⚠️', color: '#e91e63', desc: '新手容易犯错的常见误区', keywords: ['误区','易错','常见错误','避坑','踩坑','教训','注意','陷阱','避免','错误','失败教训'] },
    { id: 'handson', label: '实战', icon: '🔧', color: '#4caf50', desc: '经过验证的实战经验', keywords: ['实战','实测','验证','经验','实操','实际','案例实战','现场','一线','真实'] }
  ];

  // ── 维度7: 时间属性 ──
  var TIME_ATTRIBUTES = [
    { id: 'new', label: '最新', icon: '🆕', color: '#4caf50', desc: '30天内新增的内容', threshold: 30 },
    { id: 'hot', label: '热门', icon: '🔥', color: '#ff5722', desc: '最近访问量高的热门内容', threshold: 0.8 },
    { id: 'classic', label: '经典', icon: '🏆', color: '#ffc107', desc: '长期稳定的高质量内容', threshold: 0.6 },
    { id: 'outdated', label: '待更新', icon: '📦', color: '#9e9e9e', desc: '内容已过时，需要更新', threshold: 365 }
  ];

  // ── 算法权重配置 ──
  var ALGORITHM_WEIGHTS = {
    // 标签匹配权重
    labelWeight: {
      exactTitle: 10,
      partialTitle: 5,
      exactTag: 8,
      partialTag: 4,
      contentMatch: 2,
      pathMatch: 3,
      categoryMatch: 6
    },
    // 相关度权重
    relevance: {
      tagSimilarity: 0.4,
      contentSimilarity: 0.3,
      difficultySimilarity: 0.15,
      categorySimilarity: 0.15
    },
    // 搜索排序权重
    searchRanking: {
      keywordMatch: 0.40,
      contentQuality: 0.20,
      popularity: 0.15,
      timeliness: 0.10,
      personalization: 0.15
    },
    // 难度评估权重
    difficulty: {
      termDensity: 0.25,
      fileSize: 0.15,
      codeLines: 0.20,
      formulaCount: 0.15,
      prereqCount: 0.25
    },
    // 推荐权重
    recommendation: {
      collaborative: 0.30,
      contentBased: 0.35,
      popularity: 0.15,
      difficultyMatch: 0.20
    }
  };

  // ── 相似度阈值 ──
  var SIMILARITY_THRESHOLDS = {
    highlyRelevant: 0.7,
    relevant: 0.4,
    slightlyRelevant: 0.2,
    notRelevant: 0
  };

  // ── 专业术语表 (G代码/M代码/工艺术语) ──
  var TECHNICAL_TERMS = [
    // G代码
    'G00','G01','G02','G03','G04','G17','G18','G19','G20','G21','G22','G28','G30','G32','G33',
    'G40','G41','G42','G43','G44','G49','G50','G52','G53','G54','G55','G56','G57','G58','G59',
    'G61','G62','G63','G64','G65','G66','G67','G68','G69','G70','G71','G72','G73','G74','G75',
    'G76','G80','G81','G82','G83','G84','G85','G86','G87','G88','G89','G90','G91','G92','G94',
    'G95','G96','G97','G98','G99',
    // M代码
    'M00','M01','M02','M03','M04','M05','M06','M07','M08','M09','M10','M11','M12','M13','M14',
    'M15','M16','M17','M18','M19','M20','M21','M22','M23','M24','M25','M26','M27','M28','M29',
    'M30','M31','M32','M33','M34','M35','M36','M37','M38','M39','M40','M41','M42','M43','M44',
    'M45','M46','M47','M48','M49','M50','M51','M52','M53','M54','M55','M56','M57','M58','M59',
    'M60','M61','M62','M63','M64','M65','M66','M67','M68','M69','M70','M71','M72','M73','M74',
    'M75','M76','M77','M78','M79','M80','M81','M82','M83','M84','M85','M86','M87','M88','M89',
    'M90','M91','M92','M93','M94','M95','M96','M97','M98','M99',
    // T/H/D/S/F 代码
    'T01','T02','T03','T04','T05','T06','T07','T08','T09','T10',
    'H01','H02','H03','D01','D02',
    'S500','S1000','S1500','S2000','S3000','S4000','S5000','S6000','S8000','S10000',
    'F50','F100','F200','F300','F500','F800','F1000','F1500','F2000','F3000','F5000',
    // 工艺术语
    '切削速度','进给速度','切削深度','主轴转速','每齿进给量','材料去除率','切削力','切削热','刀尖圆弧',
    '顺铣','逆铣','型腔铣','等高轮廓','固定轴','流线加工','清根','笔式加工','摆线','螺旋插补',
    '刀路优化','碰撞检查','机床仿真','后处理','加工策略','走刀方式','进刀方式','退刀方式',
    // 机床术语
    '加工中心','数控车床','五轴联动','车铣复合','电火花','线切割','龙门铣','立式加工中心','卧式加工中心',
    '对刀','寻边','分中','刀补','半径补偿','长度补偿','坐标系','G54','G59','工件零点','参考点',
    '伺服电机','主轴','丝杆','导轨','轴承','编码器','光栅尺','联轴器','刀库','机械手',
    '锥度','主轴锥孔','BT30','BT40','BT50','HSK','CAPTO',
    // 检测术语
    '三坐标','粗糙度','圆度','圆柱度','垂直度','平行度','同轴度','位置度','轮廓度','跳动',
    '公差','配合','间隙','过盈','H7','g6','Js','基孔制','基轴制'
  ];

  // ── 文件名前缀映射 ──
  var FILE_PREFIX_MAP = [
    { prefix: '知识', tags: ['knowledge'] },
    { prefix: '教学', tags: ['tutorial'] },
    { prefix: '案例', tags: ['case_study'] },
    { prefix: '题库', tags: ['exam'] },
    { prefix: '手册', tags: ['manual'] },
    { prefix: '指南', tags: ['guide'] },
    { prefix: '教程', tags: ['tutorial'] },
    { prefix: '汇总', tags: ['summary'] },
    { prefix: '速查', tags: ['quickref'] },
    { prefix: '对比', tags: ['comparison'] },
    { prefix: '基础', tags: ['foundation'] },
    { prefix: '进阶', tags: ['advanced'] },
    { prefix: '技巧', tags: ['skill'] },
    { prefix: '常见', tags: ['faq'] },
    { prefix: '经验', tags: ['experience'] },
    { prefix: '总结', tags: ['summary'] },
    { prefix: '常见问题', tags: ['faq'] },
    { prefix: 'FAQ', tags: ['faq'] },
    { prefix: '注意', tags: ['warning','safety'] },
    { prefix: '安全', tags: ['safety'] },
    { prefix: '疑难', tags: ['troubleshooting'] },
    { prefix: '故障', tags: ['troubleshooting','repair'] }
  ];

  // ── 路径到标签映射 ──
  var PATH_TAG_MAP = [
    { path: '01_编程基础', tags: ['programming','gcode'] },
    { path: '02_机床操作', tags: ['operation','machine'] },
    { path: '03_CAM软件', tags: ['cam','software'] },
    { path: '04_刀具工艺', tags: ['process','tool'] },
    { path: '05_故障维修', tags: ['repair','maintenance'] },
    { path: '06_检测质量', tags: ['quality','inspection'] },
    { path: '06_考证职业', tags: ['exam','certification'] },
    { path: '07_行业资讯', tags: ['news','industry'] },
    { path: '08_加工案例', tags: ['case','case_study'] }
  ];

  // ── 辅助函数 ──
  function getCategoryById(id) {
    for (var i = 0; i < CONTENT_CATEGORIES.length; i++) {
      if (CONTENT_CATEGORIES[i].id === id) return CONTENT_CATEGORIES[i];
      for (var j = 0; j < CONTENT_CATEGORIES[i].subcategories.length; j++) {
        if (CONTENT_CATEGORIES[i].subcategories[j].id === id) return CONTENT_CATEGORIES[i].subcategories[j];
      }
    }
    return null;
  }

  function getDifficultyById(id) {
    for (var i = 0; i < DIFFICULTY_LEVELS.length; i++) {
      if (DIFFICULTY_LEVELS[i].id === id) return DIFFICULTY_LEVELS[i];
    }
    return null;
  }

  function getMachineById(id) {
    for (var i = 0; i < MACHINE_TYPES.length; i++) {
      if (MACHINE_TYPES[i].id === id) return MACHINE_TYPES[i];
    }
    return null;
  }

  function getMaterialById(id) {
    for (var i = 0; i < MATERIAL_TYPES.length; i++) {
      if (MATERIAL_TYPES[i].id === id) return MATERIAL_TYPES[i];
    }
    return null;
  }

  function getBrandById(id) {
    for (var i = 0; i < SYSTEM_BRANDS.length; i++) {
      if (SYSTEM_BRANDS[i].id === id) return SYSTEM_BRANDS[i];
    }
    return null;
  }

  function isTechnicalTerm(word) {
    return TECHNICAL_TERMS.indexOf(word) !== -1;
  }

  function getAllKeywords() {
    var all = [];
    // 内容分类关键词
    for (var i = 0; i < CONTENT_CATEGORIES.length; i++) {
      for (var j = 0; j < CONTENT_CATEGORIES[i].subcategories.length; j++) {
        all = all.concat(CONTENT_CATEGORIES[i].subcategories[j].keywords);
      }
    }
    // 机床关键词
    for (var k = 0; k < MACHINE_TYPES.length; k++) {
      all = all.concat(MACHINE_TYPES[k].keywords);
    }
    // 材料关键词
    for (var m = 0; m < MATERIAL_TYPES.length; m++) {
      all = all.concat(MATERIAL_TYPES[m].keywords);
    }
    // 品牌关键词
    for (var b = 0; b < SYSTEM_BRANDS.length; b++) {
      all = all.concat(SYSTEM_BRANDS[b].keywords);
    }
    // 属性关键词
    for (var a = 0; a < KNOWLEDGE_ATTRIBUTES.length; a++) {
      all = all.concat(KNOWLEDGE_ATTRIBUTES[a].keywords);
    }
    return all;
  }

  window.CNC_TAG_CONFIG = {
    CONTENT_CATEGORIES: CONTENT_CATEGORIES,
    DIFFICULTY_LEVELS: DIFFICULTY_LEVELS,
    DIFFICULTY_THRESHOLDS: DIFFICULTY_THRESHOLDS,
    MACHINE_TYPES: MACHINE_TYPES,
    MATERIAL_TYPES: MATERIAL_TYPES,
    SYSTEM_BRANDS: SYSTEM_BRANDS,
    KNOWLEDGE_ATTRIBUTES: KNOWLEDGE_ATTRIBUTES,
    TIME_ATTRIBUTES: TIME_ATTRIBUTES,
    ALGORITHM_WEIGHTS: ALGORITHM_WEIGHTS,
    SIMILARITY_THRESHOLDS: SIMILARITY_THRESHOLDS,
    TECHNICAL_TERMS: TECHNICAL_TERMS,
    FILE_PREFIX_MAP: FILE_PREFIX_MAP,
    PATH_TAG_MAP: PATH_TAG_MAP,
    getCategoryById: getCategoryById,
    getDifficultyById: getDifficultyById,
    getMachineById: getMachineById,
    getMaterialById: getMaterialById,
    getBrandById: getBrandById,
    isTechnicalTerm: isTechnicalTerm,
    getAllKeywords: getAllKeywords
  };

  console.log('[CNC_TAG_CONFIG] 标签系统配置已加载。关键词总数: ' + getAllKeywords().length + ', 专业术语数: ' + TECHNICAL_TERMS.length);
})();
