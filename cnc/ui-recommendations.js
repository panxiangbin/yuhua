/**
 * 推荐系统UI模块 - 为Gemini生成的recommended-content.json提供前端展示
 * 支持多种推荐场景和智能推荐
 */

class RecommendationsUI {
  constructor() {
    this.recommendationsData = null;
    this.currentContext = null;
  }

  /**
   * 加载推荐数据
   * 优先加载 recommended-content.json，失败则使用基础推荐
   */
  async loadRecommendations() {
    try {
      const response = await fetch('./recommended-content.json');
      if (response.ok) {
        this.recommendationsData = await response.json();
        console.log('✅ 推荐内容数据加载成功', this.recommendationsData);
        return true;
      }
    } catch (err) {
      console.log('⚠️ recommended-content.json 未就绪，使用基础推荐');
    }

    // 降级：使用基础推荐规则
    this.recommendationsData = this.generateFallbackRecommendations();
    return false;
  }

  /**
   * 生成降级推荐数据
   */
  generateFallbackRecommendations() {
    return {
      version: "fallback-1.0",
      scenarios: [
        {
          scenario: "查看了G代码",
          recommendations: [
            { type: "entry", id: "related-gcode", title: "相关G代码", reason: "同类扩展" },
            { type: "entry", id: "gcode-examples", title: "代码示例", reason: "实战应用" }
          ]
        },
        {
          scenario: "查看了报警代码",
          recommendations: [
            { type: "entry", id: "alarm-flow", title: "报警排查流程", reason: "问题解决" },
            { type: "entry", id: "common-alarms", title: "常见报警", reason: "经验总结" }
          ]
        }
      ],
      popular: [
        { id: "g54-coordinate", title: "G54工件坐标系", views: 1520 },
        { id: "g02-g03-arc", title: "G02/G03圆弧插补", views: 1380 },
        { id: "tool-offset", title: "刀具偏置设定", views: 1250 }
      ]
    };
  }

  /**
   * 根据当前内容获取推荐
   */
  getRecommendationsFor(entryId, context = {}) {
    if (!this.recommendationsData) return [];

    const recommendations = [];

    // 场景匹配推荐
    if (this.recommendationsData.scenarios) {
      this.recommendationsData.scenarios.forEach(scenario => {
        if (this.matchScenario(scenario.scenario, entryId, context)) {
          recommendations.push(...scenario.recommendations);
        }
      });
    }

    // 限制推荐数量
    return recommendations.slice(0, 6);
  }

  /**
   * 匹配推荐场景
   */
  matchScenario(scenarioText, entryId, context) {
    const lowerScenario = scenarioText.toLowerCase();
    const lowerEntry = (entryId || '').toLowerCase();
    const lowerCategory = (context.category || '').toLowerCase();

    if (lowerScenario.includes('g代码') && (lowerEntry.includes('g') || lowerCategory.includes('gcode'))) {
      return true;
    }

    if (lowerScenario.includes('报警') && (lowerEntry.includes('alarm') || lowerCategory.includes('params'))) {
      return true;
    }

    if (lowerScenario.includes('刀具') && (lowerEntry.includes('tool') || lowerCategory.includes('tooling'))) {
      return true;
    }

    return false;
  }

  /**
   * 获取热门内容
   */
  getPopularContent(limit = 5) {
    if (!this.recommendationsData || !this.recommendationsData.popular) {
      return [];
    }

    return this.recommendationsData.popular.slice(0, limit);
  }

  /**
   * 渲染推荐内容到指定容器
   */
  renderRecommendations(containerId, recommendations) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    if (!recommendations || recommendations.length === 0) {
      container.innerHTML = '<p class="empty-state">暂无推荐内容</p>';
      return;
    }

    recommendations.forEach(rec => {
      const link = document.createElement('button');
      link.className = 'recommendation-link';
      const entryId = rec.id || rec.knowledgeId; // 修复：同时支持id和knowledgeId
      link.dataset.entryId = entryId;
      link.innerHTML = `
        <span class="rec-title">${this.escapeHtml(rec.title)}</span>
        <span class="rec-reason">${this.escapeHtml(rec.reason || '')}</span>
      `;

      link.addEventListener('click', () => {
        if (window.app && entryId) { // 修复：使用合并后的entryId
          window.app.selectEntry(entryId);
        }
      });

      container.appendChild(link);
    });
  }

  /**
   * HTML转义
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }
}

// 导出全局实例
window.RecommendationsUI = RecommendationsUI;
