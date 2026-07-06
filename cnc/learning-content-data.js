/**
 * 学习系统完整教学内容数据
 * 来源：4号（ChatGPT）生成的12关完整教学内容
 * 生成日期：2026-07-06
 */

window.CNC_LEARNING_CONTENT = {
  /**
   * 获取指定关卡的完整教学内容
   * @param {number} level - 关卡编号 (1-12)
   * @returns {Object|null} 教学内容对象
   */
  getContent: function(level) {
    return this.lessons[level] || null;
  },

  /**
   * 获取指定阶段的所有关卡
   * @param {number} stage - 阶段编号 (1-4)
   * @returns {Array} 关卡数组
   */
  getStageContent: function(stage) {
    const stageMap = {
      1: [1, 2, 3, 4],
      2: [5, 6, 7],
      3: [8, 9, 10, 11],
      4: [12]
    };
    const levels = stageMap[stage] || [];
    return levels.map(level => this.lessons[level]).filter(Boolean);
  },

  /**
   * 12关完整教学内容
   * 数据源文件：
   * - 04_learning_content_lesson_01_04.md (第1-4关)
   * - 04_learning_content_lesson_05_08.md (第5-8关)
   * - 04_learning_content_lesson_09_12.md (第9-12关)
   */
  lessons: {
    // 阶段一：认识机床与坐标
    1: {
      level: 1,
      stage: 1,
      title: '认识零件的身份证',
      contentFile: './learning-content/lesson-01.md',
      summary: '学会看懂零件图纸，识别外形、基准和关键尺寸',
      objectives: [
        '看懂零件图不是一堆线，而是在告诉你零件要做成什么样',
        '能从图纸里先找外形、基准、孔、槽、倒角和关键尺寸',
        '知道没看懂图纸就上机，是新手最容易把活干废的开始'
      ],
      keywords: ['图纸', '零件图', '工程图', '基准', '尺寸标注'],
      duration: '15-20分钟'
    },

    2: {
      level: 2,
      stage: 1,
      title: '机床的东南西北',
      contentFile: './learning-content/lesson-02.md',
      summary: '理解机床坐标系，分清X、Y、Z三个方向',
      objectives: [
        '分清机床 X、Y、Z 三个方向的基本含义',
        '知道程序坐标不是纸上数字，而是刀具真实移动方向',
        '重点记住 Z 向下最危险，不能凭感觉移动'
      ],
      keywords: ['坐标系', 'X轴', 'Y轴', 'Z轴', '方向'],
      duration: '15-20分钟'
    },

    3: {
      level: 3,
      stage: 1,
      title: '找机床的老家',
      contentFile: './learning-content/lesson-03.md',
      summary: '掌握机床回零操作，理解参考点的作用',
      objectives: [
        '理解机床回零的作用和必要性',
        '学会正确的回零操作步骤',
        '识别回零失败的常见原因'
      ],
      keywords: ['回零', '参考点', '回参考点', '机床原点'],
      duration: '15-20分钟'
    },

    4: {
      level: 4,
      stage: 1,
      title: '告诉机床活儿在哪',
      contentFile: './learning-content/lesson-04.md',
      summary: '学习工件坐标系设定，掌握G54的使用',
      objectives: [
        '理解工件坐标系和机床坐标系的区别',
        '掌握G54工件坐标系的设定方法',
        '学会对刀并输入坐标值'
      ],
      keywords: ['工件坐标系', 'G54', '对刀', '工件零点'],
      duration: '20-25分钟'
    },

    // 阶段二：安全操作与刀具
    5: {
      level: 5,
      stage: 2,
      title: 'Z 轴对刀，保命绝招',
      contentFile: './learning-content/lesson-05.md',
      summary: '掌握Z轴对刀方法，避免撞刀事故',
      objectives: [
        '理解Z轴对刀的重要性和危险性',
        '掌握试切法Z轴对刀步骤',
        '学会使用对刀仪提高效率'
      ],
      keywords: ['Z轴对刀', '试切法', '对刀仪', '安全'],
      duration: '20-25分钟'
    },

    6: {
      level: 6,
      stage: 2,
      title: '认识你的武器',
      contentFile: './learning-content/lesson-06.md',
      summary: '了解常用刀具类型和基本参数',
      objectives: [
        '认识常用刀具的种类和用途',
        '理解刀具材料和涂层的作用',
        '学会根据加工要求选择刀具'
      ],
      keywords: ['刀具', '铣刀', '车刀', '钻头', '刀具材料'],
      duration: '20-25分钟'
    },

    7: {
      level: 7,
      stage: 2,
      title: '顺着切还是逆着切',
      contentFile: './learning-content/lesson-07.md',
      summary: '理解顺铣和逆铣的区别，掌握刀补概念',
      objectives: [
        '理解顺铣和逆铣的原理和区别',
        '掌握G41/G42刀具半径补偿',
        '学会根据情况选择铣削方向'
      ],
      keywords: ['顺铣', '逆铣', 'G41', 'G42', '刀补'],
      duration: '25-30分钟'
    },

    // 阶段三：编程基础代码
    8: {
      level: 8,
      stage: 3,
      title: 'S 和 F，谁跑得快',
      contentFile: './learning-content/lesson-08.md',
      summary: '理解主轴转速和进给速度的关系',
      objectives: [
        '理解S转速和F进给的含义',
        '掌握转速进给的匹配原则',
        '学会根据材料和刀具调整参数'
      ],
      keywords: ['S转速', 'F进给', '主轴转速', '进给速度', '线速度'],
      duration: '25-30分钟'
    },

    9: {
      level: 9,
      stage: 3,
      title: 'G00 和 G01，快慢有别',
      contentFile: './learning-content/lesson-09.md',
      summary: '掌握快速定位和直线切削指令',
      objectives: [
        '理解G00快速定位的特点和风险',
        '掌握G01直线切削的用法',
        '学会安全使用G00避免撞刀'
      ],
      keywords: ['G00', 'G01', '快速定位', '直线切削'],
      duration: '25-30分钟'
    },

    10: {
      level: 10,
      stage: 3,
      title: '致命的小数点',
      contentFile: './learning-content/lesson-10.md',
      summary: '理解编程规范，避免数值格式错误',
      objectives: [
        '理解小数点错误的严重后果',
        '掌握正确的数值格式规范',
        '学会检查程序避免常见错误'
      ],
      keywords: ['编程规范', '小数点', '编程错误', '数值格式'],
      duration: '20-25分钟'
    },

    11: {
      level: 11,
      stage: 3,
      title: 'G90 和 G91：算总账还是算小账',
      contentFile: './learning-content/lesson-11.md',
      summary: '理解绝对值和增量值编程的区别',
      objectives: [
        '理解G90绝对值编程的特点',
        '理解G91增量值编程的特点',
        '学会选择合适的编程方式'
      ],
      keywords: ['G90', 'G91', '绝对值', '增量值', '绝对编程', '增量编程'],
      duration: '25-30分钟'
    },

    // 阶段四：高效编程技巧
    12: {
      level: 12,
      stage: 4,
      title: 'G81：钻孔自动化',
      contentFile: './learning-content/lesson-12.md',
      summary: '掌握固定循环指令，提高编程效率',
      objectives: [
        '理解固定循环的概念和优势',
        '掌握G81钻孔循环的使用',
        '学会其他常用固定循环指令'
      ],
      keywords: ['G81', '固定循环', '钻孔循环', '编程技巧'],
      duration: '30-35分钟'
    }
  },

  /**
   * 内容状态
   */
  status: {
    contentSource: 'ChatGPT 4号任务输出',
    generatedDate: '2026-07-06',
    totalLessons: 12,
    stages: 4,
    sourceFiles: [
      'C:/Users/Administrator/Desktop/临时/1/04_learning_content_lesson_01_04.md',
      'C:/Users/Administrator/Desktop/临时/1/04_learning_content_lesson_05_08.md',
      'C:/Users/Administrator/Desktop/临时/1/04_learning_content_lesson_09_12.md'
    ],
    integrationStatus: 'metadata-complete',
    nextStep: 'create-detailed-content-files'
  }
};

// 调试接口
window.CNC_LEARNING_CONTENT.debug = {
  listAll: function() {
    console.log('=== 学习系统内容概览 ===');
    Object.keys(window.CNC_LEARNING_CONTENT.lessons).forEach(level => {
      const lesson = window.CNC_LEARNING_CONTENT.lessons[level];
      console.log(`第${level}关: ${lesson.title} (阶段${lesson.stage})`);
    });
  },

  getLesson: function(level) {
    const lesson = window.CNC_LEARNING_CONTENT.getContent(level);
    if (lesson) {
      console.log(`=== 第${level}关：${lesson.title} ===`);
      console.log('学习目标：', lesson.objectives);
      console.log('关键词：', lesson.keywords);
      console.log('预计时长：', lesson.duration);
    } else {
      console.log(`第${level}关内容不存在`);
    }
    return lesson;
  },

  getStage: function(stage) {
    const lessons = window.CNC_LEARNING_CONTENT.getStageContent(stage);
    console.log(`=== 阶段${stage}内容 ===`);
    lessons.forEach(lesson => {
      console.log(`第${lesson.level}关: ${lesson.title}`);
    });
    return lessons;
  }
};

console.log('[学习内容数据] 已加载 12 关完整元数据');
