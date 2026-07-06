/**
 * import-config.js
 * 知识图谱导入系统配置 — 批处理大小/性能参数/实体类型/关系类型/正则/别名映射表/质量阈值
 * 所有配置集中管理，供 graph-importer / entity-extractor / relationship-builder / data-cleaner 使用
 * 全局对象: window.CNC_IMPORT_CONFIG
 */
(function () {
  'use strict';

  if (window.CNC_IMPORT_CONFIG) return;

  var CONFIG = Object.freeze({

    // ── 性能参数 ──
    BATCH_SIZE: {
      SCAN: 500,          // 文件扫描批大小
      PARSE: 100,         // 文件解析批大小
      NODE_IMPORT: 1000,  // 节点导入批大小
      EDGE_IMPORT: 1000,  // 关系导入批大小
      ENTITY_EXTRACT: 50  // 实体提取批大小
    },

    // ── 超时与节流 (ms) ──
    TIMEOUT: {
      FILE_READ: 5000,    // 单文件读取超时
      PARSE: 3000,        // 单文件解析超时
      EXTRACT: 2000,      // 实体提取超时
      DB_WRITE: 10000,    // IndexedDB 写入超时
      PROGRESS_INTERVAL: 200  // 进度回调节流间隔
    },

    // ── 质量阈值 (字节) ──
    FILE_QUALITY: {
      DEEP_THRESHOLD: 14336,     // >14KB 深度文件 (14*1024)
      MEDIUM_THRESHOLD: 4096,    // 4-14KB 中等文件
      BASIC_MAX: 4096,           // <4KB 基础文件
      MIN_CONTENT_LENGTH: 100,   // 最小内容长度 (字节)
      MAX_FILE_SIZE: 52428800    // 最大文件大小 50MB (安全阈值)
    },

    // ── 实体类型 ──
    ENTITY_TYPES: Object.freeze([
      'gcode',       // G代码
      'mcode',       // M代码
      'tool',        // 刀具
      'machine',     // 机床
      'material',    // 材料
      'process',     // 工艺
      'concept',     // 概念
      'brand',       // 品牌
      'parameter',   // 参数
      'case',        // 案例
      'problem',     // 问题/故障
      'exam',        // 考点
      'category',    // 分类目录
      'file'         // 源文件 (知识文档)
    ]),

    // ── 关系类型 ──
    RELATION_TYPES: Object.freeze([
      'requires',       // 前置要求
      'related_to',     // 相关概念
      'part_of',        // 包含关系
      'used_in',        // 应用场景
      'replaces',       // 替代关系
      'compared_with',  // 对比关系
      'depends_on',     // 依赖关系
      'causes',         // 因果关系
      'tests',          // 考核关系
      'belongs_to',     // 属于 (文件→分类)
      'references',     // 引用 (文件→实体)
      'examples'        // 示例 (概念→案例)
    ]),

    // ── 关系权重 ──
    RELATION_WEIGHTS: Object.freeze({
      requires: 1.0,
      depends_on: 1.0,
      part_of: 0.8,
      causes: 0.8,
      used_in: 0.6,
      compared_with: 0.5,
      related_to: 0.5,
      references: 0.4,
      belongs_to: 0.3,
      examples: 0.3,
      tests: 0.5,
      replaces: 0.6
    }),

    // ── G代码正则 ──
    GCODE_REGEX: /\bG\d{2,3}(?!\d)\b/g,

    // ── M代码正则 ──
    MCODE_REGEX: /\bM\d{2,3}(?!\d)\b/g,

    // ── T代码 (刀具) ──
    TCODE_REGEX: /\bT\d{1,2}\b/g,

    // ── S/F/H/D 代码 ──
    SCODE_REGEX: /\bS\d{1,5}\b/g,
    FCODE_REGEX: /\bF\d+(?:\.\d+)?\b/g,
    HCODE_REGEX: /\bH\d{1,2}\b/g,
    DCODE_REGEX: /\bD\d{1,2}\b/g,

    // ── 刀具类型关键词 ──
    TOOL_PATTERNS: Object.freeze([
      { type: 'endmill', patterns: ['立铣刀', '端铣刀', '平刀', '平底刀', '平底铣刀', 'end mill', 'endmill'] },
      { type: 'ballnose', patterns: ['球头刀', '球头铣刀', '球刀', 'R刀', 'ball nose', 'ballnose'] },
      { type: 'facemill', patterns: ['面铣刀', '盘铣刀', 'face mill', 'facemill'] },
      { type: 'drill', patterns: ['钻头', '麻花钻', '中心钻', '定点钻', '钻', 'drill'] },
      { type: 'reamer', patterns: ['铰刀', 'reamer'] },
      { type: 'tap', patterns: ['丝锥', '攻丝', 'tap'] },
      { type: 'insert', patterns: ['刀片', '刀粒', 'insert'] },
      { type: 'toolholder', patterns: ['刀柄', '筒夹', '夹头', 'tool holder', 'holder'] },
      { type: 'boringbar', patterns: ['镗刀', 'boring bar', 'boringbar'] },
      { type: 'chamfertool', patterns: ['倒角刀', 'chamfer'] },
      { type: 'threadmill', patterns: ['螺纹铣刀', 'thread mill'] }
    ]),

    // ── 机床品牌/系统 ──
    MACHINE_PATTERNS: Object.freeze([
      { system: 'FANUC', patterns: ['发那科', 'FANUC', 'fanuc', '0i', '30i', '31i', '32i', '18i', '21i'] },
      { system: 'SIEMENS', patterns: ['西门子', 'Siemens', 'SIEMENS', 'sinumerik', 'Sinumerik', '802D', '828D', '840D'] },
      { system: 'MITSUBISHI', patterns: ['三菱', 'Mitsubishi', 'MITSUBISHI', 'M70', 'M80', 'E68', 'E70'] },
      { system: 'HEIDENHAIN', patterns: ['海德汉', 'Heidenhain', 'HEIDENHAIN', 'TNC', 'tnc'] },
      { system: 'BROTHER', patterns: ['兄弟', 'Brother', 'BROTHER'] },
      { system: 'MAZAK', patterns: ['马扎克', 'Mazak', 'MAZAK'] },
      { system: 'OKUMA', patterns: ['大隈', 'Okuma', 'OKUMA'] },
      { system: 'HAAS', patterns: ['哈斯', 'Haas', 'HAAS'] }
    ]),

    // ── 材料类型 ──
    MATERIAL_PATTERNS: Object.freeze([
      { material: 'steel', patterns: ['钢', '碳钢', '合金钢', '模具钢', '不锈钢', 'steel', 'S45C', 'SKD', 'NAK', 'P20', '718'] },
      { material: 'aluminum', patterns: ['铝', '铝合金', 'aluminum', 'aluminium', '6061', '7075', '5052', 'ADC12'] },
      { material: 'copper', patterns: ['铜', '紫铜', '黄铜', '铍铜', 'copper', 'brass'] },
      { material: 'titanium', patterns: ['钛', '钛合金', '钛金', 'titanium', 'TC4', 'Ti6Al4V'] },
      { material: 'plastic', patterns: ['塑料', '亚克力', 'POM', '尼龙', 'ABS', 'PC', 'PMMA', 'plastic', 'acrylic'] },
      { material: 'wood', patterns: ['木', '木材', 'wood'] },
      { material: 'composite', patterns: ['复合材料', '碳纤维', '玻璃纤维', 'composite', 'carbon fiber'] },
      { material: 'cast_iron', patterns: ['铸铁', 'cast iron', 'castiron'] }
    ]),

    // ── 概念关键词 ──
    CONCEPT_PATTERNS: Object.freeze([
      '坐标系', '对刀', '刀补', '半径补偿', '长度补偿', '零点偏移',
      '安全高度', '进退刀', '切削三要素', '切削速度', '进给速度', '切削深度',
      '顺铣', '逆铣', '爬面', '等高', '轮廓', '型腔',
      '分中', '寻边', '对刀仪', '刀长', '刀摆',
      '公差', '粗糙度', '形位公差', '基准',
      '冷却', '切削液', '油冷', '气冷',
      '排屑', '断屑', '切削力', '切削热',
      '刚性', '振动', '震颤', '让刀'
    ]),

    // ── 文件名前缀 → 分类映射 ──
    FILE_PREFIX_MAP: Object.freeze({
      '知识': 'knowledge',
      '教学': 'tutorial',
      '案例': 'case',
      '题库': 'exam',
      '手册': 'manual',
      '指南': 'guide',
      '教程': 'tutorial',
      '汇总': 'summary',
      '速查': 'quickref',
      '对比': 'comparison'
    }),

    // ── 别名映射表 (标准化名称) ──
    ALIAS_MAP: Object.freeze({
      // 刀具别名
      '平刀': '端铣刀',
      '平底刀': '端铣刀',
      '平底铣刀': '端铣刀',
      '球刀': '球头铣刀',
      'R刀': '球头铣刀',
      '盘刀': '面铣刀',
      '飞刀': '面铣刀',
      '麻花钻': '钻头',
      '中心钻': '钻头',
      '刀粒': '刀片',
      // 概念别名
      '刀补': '刀具补偿',
      '半径补偿': '刀具半径补偿',
      '长度补偿': '刀具长度补偿',
      '对刀': '工件对刀',
      '分中': '工件分中',
      '寻边': '工件寻边',
      '顺铣': '顺铣加工',
      '逆铣': '逆铣加工',
      '冷却': '切削冷却',
      // G代码别名 (小写→大写)
      'g00': 'G00',
      'g01': 'G01',
      'g02': 'G02',
      'g03': 'G03',
      'g04': 'G04',
      'g40': 'G40',
      'g41': 'G41',
      'g42': 'G42',
      'g43': 'G43',
      'g49': 'G49',
      'g54': 'G54',
      'g55': 'G55',
      'g56': 'G56',
      'g57': 'G57',
      'g58': 'G58',
      'g59': 'G59',
      'g90': 'G90',
      'g91': 'G91',
      'g94': 'G94',
      'g95': 'G95',
      'g98': 'G98',
      'g99': 'G99',
      // M代码别名
      'm00': 'M00',
      'm01': 'M01',
      'm02': 'M02',
      'm03': 'M03',
      'm04': 'M04',
      'm05': 'M05',
      'm06': 'M06',
      'm07': 'M07',
      'm08': 'M08',
      'm09': 'M09',
      'm10': 'M10',
      'm11': 'M11',
      'm30': 'M30',
      'm98': 'M98',
      'm99': 'M99'
    }),

    // ── 考试题库处理 ──
    EXAM_CONFIG: Object.freeze({
      PREFIX: '题库_',
      MIN_QUESTIONS_PER_GROUP: 3,
      MAX_NODES_PER_EXAM: 1,    // 按考点聚合，不逐题建节点
      GROUP_BY_KEYWORDS: ['考点', '题型', '章节', '知识点'],
      IGNORE_SINGLE_QUESTION: true  // 忽略孤立题目
    }),

    // ── 去重策略 ──
    DEDUP_STRATEGY: Object.freeze({
      ENABLED: true,
      SIMILARITY_THRESHOLD: 0.85,  // 文本相似度阈值
      COMPARE_PROPERTIES: ['label', 'keywords', 'content_hash'],
      KEEP_DEEPEST: true           // 相同内容保留深度文件
    }),

    // ── IndexedDB ──
    DB_CONFIG: Object.freeze({
      DB_NAME: 'CNC_KnowledgeGraph',
      DB_VERSION: 1,
      STORES: ['nodes', 'edges', 'meta']
    }),

    // ── 日志级别 ──
    LOG_LEVEL: Object.freeze({
      DEBUG: 0,
      INFO: 1,
      WARN: 2,
      ERROR: 3,
      NONE: 4
    }),

    // ── 默认导入选项 ──
    DEFAULT_OPTIONS: Object.freeze({
      batchSize: 1000,
      filterLowQuality: true,
      mergeDuplicates: true,
      enableProgress: true,
      enableLogging: true,
      entityTypes: null,          // null = 全部
      relationTypes: null,        // null = 全部
      maxFileSize: 52428800,
      minContentLength: 100,
      examGrouping: true,
      deepFilePriority: true,
      logLevel: 1,                // INFO
      progressInterval: 200
    })
  });

  // ── 辅助函数 ──
  function getEntityTypeLabel(type) {
    var labels = {
      gcode: 'G代码', mcode: 'M代码', tool: '刀具', machine: '机床',
      material: '材料', process: '工艺', concept: '概念', brand: '品牌',
      parameter: '参数', case: '案例', problem: '问题/故障', exam: '考点',
      category: '分类', file: '知识文档'
    };
    return labels[type] || type;
  }

  function getRelationTypeLabel(type) {
    var labels = {
      requires: '前置要求', related_to: '相关概念', part_of: '包含关系',
      used_in: '应用场景', replaces: '替代关系', compared_with: '对比关系',
      depends_on: '依赖关系', causes: '因果关系', tests: '考核关系',
      belongs_to: '属于', references: '引用', examples: '示例'
    };
    return labels[type] || type;
  }

  function getWeight(relationType) {
    return CONFIG.RELATION_WEIGHTS[relationType] || 0.5;
  }

  function getMaxDepth() {
    return 5;
  }

  window.CNC_IMPORT_CONFIG = {
    CONFIG: CONFIG,
    getEntityTypeLabel: getEntityTypeLabel,
    getRelationTypeLabel: getRelationTypeLabel,
    getWeight: getWeight,
    getMaxDepth: getMaxDepth
  };

  console.log('[CNC_IMPORT_CONFIG] 知识图谱导入配置已加载。实体类型: ' + CONFIG.ENTITY_TYPES.length + ' 种, 关系类型: ' + CONFIG.RELATION_TYPES.length + ' 种');
})();
