/**
 * 搜索运行时诊断和可解释命中模块
 *
 * 功能：
 * 1. 诊断别名表加载状态
 * 2. 记录搜索扩展过程
 * 3. 提供命中来源追踪
 * 4. 输出可读的匹配解释
 */

window.CNC_SEARCH_DEBUG = {
  enabled: false, // 默认关闭，可通过控制台开启
  logs: [],
  maxLogs: 100,

  /**
   * 检查别名表是否正确加载
   */
  checkAliasesLoaded() {
    const result = {
      loaded: false,
      count: 0,
      sample: null,
      error: null
    };

    try {
      if (!window.CNC_SEARCH_ALIASES) {
        result.error = "window.CNC_SEARCH_ALIASES 未定义";
        return result;
      }

      if (!Array.isArray(window.CNC_SEARCH_ALIASES)) {
        result.error = "window.CNC_SEARCH_ALIASES 不是数组";
        return result;
      }

      result.loaded = true;
      result.count = window.CNC_SEARCH_ALIASES.length;
      result.sample = window.CNC_SEARCH_ALIASES[0] || null;
    } catch (error) {
      result.error = error.message;
    }

    return result;
  },

  /**
   * 记录搜索扩展过程
   */
  logExpansion(keyword, expandedTerms) {
    if (!this.enabled) return;

    const log = {
      timestamp: Date.now(),
      type: 'expansion',
      keyword,
      expandedTerms,
      expanded: expandedTerms.length > 1
    };

    this.logs.push(log);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    console.log('[搜索扩展]', keyword, '→', expandedTerms);
  },

  /**
   * 记录匹配结果
   */
  logMatch(entry, keyword, matchInfo) {
    if (!this.enabled) return;

    const log = {
      timestamp: Date.now(),
      type: 'match',
      entryId: entry.id,
      entryTitle: entry.title,
      keyword,
      matchInfo
    };

    this.logs.push(log);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    console.log('[匹配成功]', entry.title, '←', keyword, matchInfo);
  },

  /**
   * 获取匹配来源说明
   */
  explainMatch(entry, keyword, expandedTerms) {
    const explanations = [];

    // 检查直接匹配
    const directMatch = this._checkDirectMatch(entry, keyword);
    if (directMatch) {
      explanations.push({
        type: 'direct',
        source: directMatch.source,
        text: `直接匹配：${directMatch.source} 包含 "${keyword}"`
      });
    }

    // 检查别名扩展匹配
    if (expandedTerms && expandedTerms.length > 1) {
      const aliasMatches = this._checkAliasMatches(entry, expandedTerms);
      aliasMatches.forEach(match => {
        explanations.push({
          type: 'alias',
          source: match.source,
          term: match.term,
          text: `别名扩展匹配：${match.source} 包含扩展词 "${match.term}"`
        });
      });
    }

    return explanations;
  },

  /**
   * 检查直接匹配
   */
  _checkDirectMatch(entry, keyword) {
    const normalized = this._normalize(keyword);

    if (this._normalize(entry.code).includes(normalized)) {
      return { source: 'code', value: entry.code };
    }
    if (this._normalize(entry.title).includes(normalized)) {
      return { source: 'title', value: entry.title };
    }
    if (entry.tags && entry.tags.some(tag => this._normalize(tag).includes(normalized))) {
      return { source: 'tags', value: entry.tags.filter(tag => this._normalize(tag).includes(normalized)).join(', ') };
    }
    if (entry.aliases && entry.aliases.some(alias => this._normalize(alias).includes(normalized))) {
      return { source: 'aliases', value: entry.aliases.filter(alias => this._normalize(alias).includes(normalized)).join(', ') };
    }

    return null;
  },

  /**
   * 检查别名扩展匹配
   */
  _checkAliasMatches(entry, expandedTerms) {
    const matches = [];
    const entryText = this._normalize([
      entry.code,
      entry.title,
      ...(entry.tags || []),
      ...(entry.aliases || [])
    ].join(' '));

    expandedTerms.forEach(term => {
      const normalized = this._normalize(term);
      if (entryText.includes(normalized)) {
        matches.push({
          term,
          source: this._findMatchSource(entry, normalized)
        });
      }
    });

    return matches;
  },

  /**
   * 找到匹配的字段来源
   */
  _findMatchSource(entry, normalizedTerm) {
    if (this._normalize(entry.code).includes(normalizedTerm)) return 'code';
    if (this._normalize(entry.title).includes(normalizedTerm)) return 'title';
    if (entry.tags && entry.tags.some(tag => this._normalize(tag).includes(normalizedTerm))) return 'tags';
    if (entry.aliases && entry.aliases.some(alias => this._normalize(alias).includes(normalizedTerm))) return 'aliases';
    return 'summary';
  },

  /**
   * 标准化文本
   */
  _normalize(text) {
    return String(text || '')
      .normalize('NFKC')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  },

  /**
   * 获取最近的日志
   */
  getRecentLogs(count = 10) {
    return this.logs.slice(-count);
  },

  /**
   * 清空日志
   */
  clearLogs() {
    this.logs = [];
    console.log('[搜索诊断] 日志已清空');
  },

  /**
   * 打印诊断信息
   */
  printDiagnostics() {
    console.group('🔍 搜索系统诊断');

    // 1. 别名表状态
    console.group('1. 别名表状态');
    const aliasStatus = this.checkAliasesLoaded();
    console.log('加载状态:', aliasStatus.loaded ? '✅ 已加载' : '❌ 未加载');
    console.log('映射数量:', aliasStatus.count);
    if (aliasStatus.sample) {
      console.log('示例映射:', aliasStatus.sample);
    }
    if (aliasStatus.error) {
      console.error('错误信息:', aliasStatus.error);
    }
    console.groupEnd();

    // 2. 前端索引状态
    console.group('2. 前端索引状态');
    const frontendExists = !!(window.CNC_FRONTEND && window.CNC_FRONTEND.getIndexMatches);
    console.log('前端索引:', frontendExists ? '✅ 可用' : '❌ 不可用');
    if (frontendExists && window.CNC_FRONTEND.getIndexSize) {
      console.log('索引大小:', window.CNC_FRONTEND.getIndexSize());
    }
    console.groupEnd();

    // 3. 最近搜索日志
    console.group('3. 最近搜索日志');
    const recentLogs = this.getRecentLogs(5);
    if (recentLogs.length === 0) {
      console.log('暂无搜索日志（提示：设置 CNC_SEARCH_DEBUG.enabled = true 启用日志记录）');
    } else {
      recentLogs.forEach(log => {
        if (log.type === 'expansion') {
          console.log(`[扩展] ${log.keyword} → [${log.expandedTerms.join(', ')}]`);
        } else if (log.type === 'match') {
          console.log(`[命中] ${log.entryTitle}`);
        }
      });
    }
    console.groupEnd();

    console.groupEnd();
  },

  /**
   * 测试搜索扩展
   */
  testExpansion(keyword) {
    console.group(`🧪 测试搜索扩展: "${keyword}"`);

    // 检查别名表
    const aliasStatus = this.checkAliasesLoaded();
    if (!aliasStatus.loaded) {
      console.error('❌ 别名表未加载，无法扩展');
      console.groupEnd();
      return [];
    }

    // 执行扩展
    const expandedTerms = window.expandSearchTerm ? window.expandSearchTerm(keyword) : [keyword];
    console.log('原始词:', keyword);
    console.log('扩展结果:', expandedTerms);
    console.log('是否扩展:', expandedTerms.length > 1 ? '✅ 是' : '❌ 否');

    if (expandedTerms.length > 1) {
      console.log('扩展词数量:', expandedTerms.length - 1);
      console.log('新增词:', expandedTerms.slice(1));
    }

    console.groupEnd();
    return expandedTerms;
  }
};

// 全局便捷方法
window.checkSearch = () => window.CNC_SEARCH_DEBUG.printDiagnostics();
window.testSearch = (keyword) => window.CNC_SEARCH_DEBUG.testExpansion(keyword);
window.enableSearchDebug = () => {
  window.CNC_SEARCH_DEBUG.enabled = true;
  console.log('✅ 搜索调试已启用');
};
window.disableSearchDebug = () => {
  window.CNC_SEARCH_DEBUG.enabled = false;
  console.log('⚠️ 搜索调试已关闭');
};

console.log('🔍 搜索诊断模块已加载');
console.log('使用 checkSearch() 查看诊断信息');
console.log('使用 testSearch("关键词") 测试搜索扩展');
console.log('使用 enableSearchDebug() 启用详细日志');
