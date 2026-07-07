/**
 * 学习入口映射规则模块
 *
 * 功能：
 * 1. 定义学习卡片到知识点的映射规则
 * 2. 提供统一的匹配接口
 * 3. 支持ID精确匹配和关键词模糊匹配
 * 4. 提供诊断和验证功能
 */

window.CNC_STUDY_ENTRY_RULES = {
  /**
   * 学习关卡映射规则
   * 每个规则包含：
   * - cardTitle: 卡片标题（用于识别卡片）
   * - id: 精确匹配的知识点ID（优先级最高）
   * - keywords: 模糊匹配的关键词列表
   * - stage: 所属阶段（1-4）
   * - level: 关卡编号（1-12）
   */
  rules: [
    // 阶段一：认识机床与坐标
    {
      stage: 1,
      level: 1,
      cardTitle: '认识零件的身份证',
      id: 'drawing-symbol',
      keywords: ['图纸', '零件图', '工程图', '尺寸标注', '符号识别']
    },
    {
      stage: 1,
      level: 2,
      cardTitle: '机床的东南西北',
      id: 'learn-coordinate-system',
      keywords: ['坐标系', 'X轴', 'Y轴', 'Z轴', '机床坐标', '方向']
    },
    {
      stage: 1,
      level: 3,
      cardTitle: '找机床的老家',
      id: 'fault-home-fail',
      keywords: ['回零', '参考点', '回参考点', '机床回零']
    },
    {
      stage: 1,
      level: 4,
      cardTitle: '告诉机床活儿在哪',
      id: 'learn-g54-g59',
      keywords: ['工件坐标系', 'G54', '对刀', '工件零点']
    },

    // 阶段二：安全操作与刀具
    {
      stage: 2,
      level: 5,
      cardTitle: 'Z 轴对刀，保命绝招',
      id: 'machine-tool-setting',
      keywords: ['Z轴对刀', '对刀', '试切法', '对刀仪', '安全']
    },
    {
      stage: 2,
      level: 6,
      cardTitle: '认识你的武器',
      id: 'tool-drill-selection',
      keywords: ['刀具', '铣刀', '车刀', '钻头', '刀具材料', '刀尖圆弧']
    },
    {
      stage: 2,
      level: 7,
      cardTitle: '顺着切还是逆着切',
      id: 'process-surface-roughness',
      keywords: ['顺铣', '逆铣', 'G41', 'G42', '刀补', '左补偿', '右补偿']
    },

    // 阶段三：编程基础代码
    {
      stage: 3,
      level: 8,
      cardTitle: 'S 和 F，谁跑得快',
      id: 'calc-vc-rpm',
      keywords: ['S转速', 'F进给', '主轴转速', '进给速度', '线速度', 'Vc']
    },
    {
      stage: 3,
      level: 9,
      cardTitle: 'G00 和 G01，快慢有别',
      id: 'g00-g01-motion',
      keywords: ['G00', 'G01', '快速定位', '直线切削', '撞刀风险']
    },
    {
      stage: 3,
      level: 10,
      cardTitle: '致命的小数点',
      id: 'kb-decimal-point',
      keywords: ['编程规范', '小数点', '编程错误', '数值格式']
    },
    {
      stage: 3,
      level: 11,
      cardTitle: 'G90 和 G91：算总账还是算小账',
      id: 'learn-absolute-incremental',
      keywords: ['G90', 'G91', '绝对值', '增量值', '绝对编程', '增量编程']
    },

    // 阶段四：高效编程技巧
    {
      stage: 4,
      level: 12,
      cardTitle: 'G81：钻孔自动化',
      id: 'learn-g81-g83',
      keywords: ['G81', 'G83', '固定循环', '钻孔循环', '深孔钻']
    }
  ],

  /**
   * 标准化文本（用于匹配）
   */
  normalizeText(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[：:，,。.!！?？"""'''（）()【】\[\]-]/g, '');
  },

  /**
   * 根据卡片标题查找规则
   */
  findRuleByCardTitle(cardTitle) {
    const normalizedCardTitle = this.normalizeText(cardTitle);

    return this.rules.find(rule => {
      const normalizedRuleTitle = this.normalizeText(rule.cardTitle);
      return (
        normalizedCardTitle.includes(normalizedRuleTitle) ||
        normalizedRuleTitle.includes(normalizedCardTitle)
      );
    });
  },

  /**
   * 根据stage和level查找规则
   */
  findRuleByLevel(stage, level) {
    return this.rules.find(rule =>
      rule.stage === stage && rule.level === level
    );
  },

  /**
   * 在知识库中查找匹配的条目
   */
  findKnowledgeItem(rule, knowledgeList) {
    if (!Array.isArray(knowledgeList) || !rule) return null;

    // 1. 优先按 id 精确匹配
    if (rule.id) {
      const itemById = knowledgeList.find(item => item.id === rule.id);
      if (itemById) return itemById;
    }

    // 2. 按关键词匹配
    const keywords = rule.keywords || [];
    if (keywords.length === 0) return null;

    return knowledgeList.find(item => {
      const searchableText = this.normalizeText([
        item.id,
        item.title,
        item.name,
        item.code,
        item.subtitle,
        item.summary,
        item.desc,
        item.description,
        item.content,
        Array.isArray(item.tags) ? item.tags.join(' ') : item.tags,
        Array.isArray(item.aliases) ? item.aliases.join(' ') : item.aliases,
        item.category
      ].join(' '));

      return keywords.some(keyword =>
        searchableText.includes(this.normalizeText(keyword))
      );
    });
  },

  /**
   * 验证所有规则的映射状态
   */
  validateRules(knowledgeList) {
    const results = {
      total: this.rules.length,
      mapped: 0,
      unmapped: 0,
      details: []
    };

    this.rules.forEach(rule => {
      const item = this.findKnowledgeItem(rule, knowledgeList);
      const status = {
        stage: rule.stage,
        level: rule.level,
        cardTitle: rule.cardTitle,
        mapped: !!item,
        targetId: item ? item.id : null,
        targetTitle: item ? item.title : null
      };

      if (item) {
        results.mapped++;
      } else {
        results.unmapped++;
      }

      results.details.push(status);
    });

    return results;
  },

  /**
   * 打印验证报告
   */
  printValidation(knowledgeList) {
    const validation = this.validateRules(knowledgeList);

    console.group('📚 学习入口映射验证');
    console.log(`总规则数: ${validation.total}`);
    console.log(`已映射: ${validation.mapped} ✅`);
    console.log(`未映射: ${validation.unmapped} ❌`);
    console.log(`映射率: ${((validation.mapped / validation.total) * 100).toFixed(1)}%`);

    if (validation.unmapped > 0) {
      console.group('❌ 未映射的规则');
      validation.details
        .filter(d => !d.mapped)
        .forEach(d => {
          console.log(`第${d.level}关: ${d.cardTitle}`);
        });
      console.groupEnd();
    }

    console.group('📋 详细映射');
    validation.details.forEach(d => {
      const icon = d.mapped ? '✅' : '❌';
      console.log(
        `${icon} 第${d.level}关: ${d.cardTitle} → ${d.mapped ? d.targetTitle : '(未找到)'}`
      );
    });
    console.groupEnd();

    console.groupEnd();

    return validation;
  },

  /**
   * 获取所有阶段信息
   */
  getStages() {
    return [
      { stage: 1, name: '认识机床与坐标', levels: [1, 2, 3, 4] },
      { stage: 2, name: '安全操作与刀具', levels: [5, 6, 7] },
      { stage: 3, name: '编程基础代码', levels: [8, 9, 10, 11] },
      { stage: 4, name: '高效编程技巧', levels: [12] }
    ];
  },

  /**
   * 获取某个阶段的所有规则
   */
  getRulesByStage(stage) {
    return this.rules.filter(rule => rule.stage === stage);
  }
};

// 全局便捷方法
window.validateStudyRules = (knowledgeList) => {
  return window.CNC_STUDY_ENTRY_RULES.printValidation(knowledgeList);
};

console.log('📚 学习入口映射规则已加载');
console.log('使用 validateStudyRules(state.entries) 验证映射状态');
