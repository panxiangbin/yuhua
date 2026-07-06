/**
 * 知识树UI模块 - 为Gemini生成的knowledge-tree.json提供前端展示
 * 支持优雅降级：数据未到位时使用当前分类数据
 */

class KnowledgeTreeUI {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.treeData = null;
    this.currentView = 'tree';
    this.onNodeClick = null;
  }

  /**
   * 加载知识树数据
   * 优先加载 knowledge-tree.json，失败则降级到基础分类
   */
  async loadTree() {
    try {
      const response = await fetch('./knowledge-tree.json');
      if (response.ok) {
        this.treeData = await response.json();
        console.log('✅ 知识树数据加载成功', this.treeData);
        return true;
      }
    } catch (err) {
      console.log('⚠️ knowledge-tree.json 未就绪，使用降级方案');
    }

    // 降级：使用当前分类数据生成简化树
    this.treeData = this.generateFallbackTree();
    return false;
  }

  /**
   * 生成降级树结构（从现有分类数据）
   */
  generateFallbackTree() {
    return {
      version: "fallback-1.0",
      generatedAt: new Date().toISOString(),
      root: {
        id: "root",
        title: "数控知识库",
        children: [
          {
            id: "cat-gcode",
            title: "G代码与M代码",
            icon: "⚙️",
            description: "数控编程指令与控制代码",
            count: 0,
            children: []
          },
          {
            id: "cat-params",
            title: "参数与报警",
            icon: "⚠️",
            description: "系统参数、报警代码与故障排查",
            count: 0,
            children: []
          },
          {
            id: "cat-operation",
            title: "机床操作",
            icon: "🎮",
            description: "回零、对刀、手动操作",
            count: 0,
            children: []
          },
          {
            id: "cat-tooling",
            title: "刀具工艺",
            icon: "🔧",
            description: "刀具选择、切削参数、加工工艺",
            count: 0,
            children: []
          },
          {
            id: "cat-drawing",
            title: "图纸与检测",
            icon: "📐",
            description: "图纸识读、量具使用、质量控制",
            count: 0,
            children: []
          },
          {
            id: "cat-cases",
            title: "加工案例",
            icon: "💼",
            description: "实战案例与经验总结",
            count: 0,
            children: []
          }
        ]
      }
    };
  }

  /**
   * 渲染知识树
   */
  render() {
    if (!this.treeData) {
      this.renderPlaceholder();
      return;
    }

    if (this.currentView === 'tree') {
      this.renderTreeView();
    } else if (this.currentView === 'categories') {
      this.renderCategoriesView();
    } else if (this.currentView === 'paths') {
      this.renderPathsView();
    }
  }

  /**
   * 渲染占位符
   */
  renderPlaceholder() {
    const placeholder = document.querySelector('.knowledge-tree-placeholder');
    if (placeholder) {
      placeholder.innerHTML = `
        <div class="placeholder-icon">🗺</div>
        <p>知识地图加载中...</p>
        <small>正在从 knowledge-tree.json 读取数据</small>
      `;
    }
  }

  /**
   * 渲染树状视图
   */
  renderTreeView() {
    const canvas = document.getElementById('knowledgeTreeCanvas');
    const placeholder = document.querySelector('.knowledge-tree-placeholder');

    if (!canvas) return;

    if (!this.treeData || !this.treeData.root) {
      // 如果没有树数据，显示占位符
      if (placeholder) {
        placeholder.hidden = false;
      }
      canvas.hidden = true;
      return;
    }

    if (placeholder) placeholder.hidden = true;
    canvas.hidden = false;
    canvas.innerHTML = '';

    const tree = document.createElement('div');
    tree.className = 'knowledge-tree';

    this.renderNode(tree, this.treeData.root, 0);
    canvas.appendChild(tree);
  }

  /**
   * 递归渲染树节点
   */
  renderNode(parentEl, node, level) {
    const nodeEl = document.createElement('div');
    nodeEl.className = 'tree-node';
    nodeEl.dataset.nodeId = node.id;
    nodeEl.dataset.level = level;

    const hasChildren = node.children && node.children.length > 0;

    nodeEl.innerHTML = `
      <div class="tree-node-header ${hasChildren ? 'expandable' : ''}">
        ${hasChildren ? '<span class="tree-node-toggle">▸</span>' : '<span class="tree-node-dot">●</span>'}
        ${node.icon ? `<span class="tree-node-icon">${node.icon}</span>` : ''}
        <span class="tree-node-title">${this.escapeHtml(node.title)}</span>
        ${node.count ? `<span class="tree-node-count">${node.count}</span>` : ''}
      </div>
      ${node.description ? `<div class="tree-node-desc">${this.escapeHtml(node.description)}</div>` : ''}
      ${hasChildren ? '<div class="tree-node-children"></div>' : ''}
    `;

    parentEl.appendChild(nodeEl);

    // 绑定点击事件
    const header = nodeEl.querySelector('.tree-node-header');
    header.addEventListener('click', (e) => {
      e.stopPropagation();

      if (hasChildren) {
        const children = nodeEl.querySelector('.tree-node-children');
        const toggle = nodeEl.querySelector('.tree-node-toggle');
        const isOpen = nodeEl.classList.contains('open');

        nodeEl.classList.toggle('open');
        toggle.textContent = isOpen ? '▸' : '▾';
      }

      if (this.onNodeClick) {
        this.onNodeClick(node);
      }
    });

    // 递归渲染子节点
    if (hasChildren) {
      const childrenContainer = nodeEl.querySelector('.tree-node-children');
      node.children.forEach(child => {
        this.renderNode(childrenContainer, child, level + 1);
      });
    }
  }

  /**
   * 渲染分类视图
   */
  renderCategoriesView() {
    const grid = document.getElementById('knowledgeCategoriesGrid');
    if (!grid) return;

    grid.hidden = false;
    grid.innerHTML = '';

    if (!this.treeData || !this.treeData.root || !this.treeData.root.children) {
      grid.innerHTML = '<div class="empty-state">暂无分类数据</div>';
      return;
    }

    const categories = this.treeData.root.children;

    categories.forEach(cat => {
      const card = document.createElement('article');
      card.className = 'category-card';
      card.dataset.categoryId = cat.id;

      card.innerHTML = `
        <div class="category-card-icon">${cat.icon || '📁'}</div>
        <h4>${this.escapeHtml(cat.title)}</h4>
        <p>${this.escapeHtml(cat.description || '')}</p>
        ${cat.count ? `<span class="category-card-count">${cat.count} 个知识点</span>` : ''}
      `;

      card.addEventListener('click', () => {
        if (this.onNodeClick) {
          this.onNodeClick(cat);
        }
      });

      grid.appendChild(card);
    });
  }

  /**
   * 渲染学习路径视图
   */
  renderPathsView() {
    const grid = document.getElementById('learningPathsGrid');
    if (!grid) return;

    grid.hidden = false;
    grid.innerHTML = '';

    // 这里接入 Gemini 的 learning-paths.json
    // 当前使用占位符
    const placeholder = document.createElement('div');
    placeholder.className = 'paths-placeholder';
    placeholder.innerHTML = `
      <div class="placeholder-icon">🎯</div>
      <p>学习路径数据加载中...</p>
      <small>等待 learning-paths.json 接入</small>
    `;
    grid.appendChild(placeholder);
  }

  /**
   * 切换视图
   */
  switchView(viewName) {
    this.currentView = viewName;

    // 隐藏所有视图
    document.getElementById('knowledgeTreeCanvas').hidden = true;
    document.getElementById('knowledgeCategoriesGrid').hidden = true;
    document.getElementById('learningPathsGrid').hidden = true;

    this.render();
  }

  /**
   * 设置节点点击回调
   */
  setNodeClickHandler(handler) {
    this.onNodeClick = handler;
  }

  /**
   * HTML转义
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// 导出全局实例
window.KnowledgeTreeUI = KnowledgeTreeUI;
