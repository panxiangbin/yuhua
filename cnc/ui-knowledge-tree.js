(function () {
  'use strict';

  class KnowledgeTreeUI {
    constructor(containerId) {
      this.container = document.getElementById(containerId);
      this.treeData = null;
      this.currentView = 'tree';
      this.onNodeClick = null;
      this.paths = [
        { id: 'path-beginner', code: '01', title: '零基础入门', desc: '按12关顺序认识图纸、坐标、对刀和基础代码。', route: 'study', label: '开始学习' },
        { id: 'path-programming', code: 'G', title: '编程指令速查', desc: '从G00、G01、G02/G03到固定循环，边查边学。', route: 'workspace', filter: 'gcode', label: '查G/M代码' },
        { id: 'path-alarm', code: '!', title: '报警排查路线', desc: '先确认报警号，再核对原因、风险与复位步骤。', route: 'workspace', filter: 'alarm', label: '查报警' },
        { id: 'path-parameter', code: '#', title: '参数与调机', desc: '查参数含义、适用系统和修改前必须确认的风险。', route: 'workspace', filter: 'parameter', label: '查参数' }
      ];
    }

    async loadTree() {
      try {
        const response = await fetch('./knowledge-tree.json', { cache: 'no-store' });
        if (response.ok) this.treeData = await response.json();
      } catch (error) {}
      if (!this.treeData || !this.treeData.root) this.treeData = this.generateFallbackTree();
      this.applyLiveCounts();
      return true;
    }

    generateFallbackTree() {
      return {
        version: 'fallback-2.0',
        root: {
          id: 'root', title: '数控知识库', description: '按现场任务分类查找', children: [
            { id: 'cat-gcode', title: 'G代码与M代码', icon: 'G', description: '数控编程指令与辅助代码', count: 0, children: [] },
            { id: 'cat-params', title: '参数与报警', icon: '!', description: '系统参数、报警代码与故障排查', count: 0, children: [] },
            { id: 'cat-operation', title: '机床操作', icon: 'O', description: '回零、对刀、手动操作与安全', count: 0, children: [] },
            { id: 'cat-tooling', title: '刀具工艺', icon: 'T', description: '刀具选择、切削参数与加工工艺', count: 0, children: [] },
            { id: 'cat-drawing', title: '图纸与检测', icon: 'D', description: '图纸识读、量具与质量控制', count: 0, children: [] },
            { id: 'cat-cases', title: '加工案例', icon: 'C', description: '典型程序、实战案例与经验', count: 0, children: [] }
          ]
        }
      };
    }

    applyLiveCounts() {
      const entries = Array.isArray(window.CNC_DATA) ? window.CNC_DATA : [];
      const rules = {
        'cat-gcode': /g代码|m代码|编程指令/i,
        'cat-params': /参数|报警|故障/i,
        'cat-operation': /操作|回零|对刀|机床/i,
        'cat-tooling': /刀具|工艺|材料|切削/i,
        'cat-drawing': /图纸|量具|检测|质量/i,
        'cat-cases': /案例|实战|程序/i
      };
      const children = this.treeData && this.treeData.root && this.treeData.root.children || [];
      children.forEach((node) => {
        const re = rules[node.id];
        if (!re) return;
        node.count = entries.filter((item) => re.test([item.category, item.title, item.code, item.tags].join(' '))).length;
      });
      if (this.treeData && this.treeData.root) this.treeData.root.count = entries.length;
    }

    render() {
      if (!this.treeData) return this.renderPlaceholder();
      this.hideAllViews();
      if (this.currentView === 'categories') this.renderCategoriesView();
      else if (this.currentView === 'paths') this.renderPathsView();
      else this.renderTreeView();
      this.syncToolbar();
    }

    hideAllViews() {
      ['knowledgeTreeCanvas', 'knowledgeCategoriesGrid', 'learningPathsGrid'].forEach((id) => {
        const node = document.getElementById(id);
        if (node) node.hidden = true;
      });
    }

    syncToolbar() {
      document.querySelectorAll('[data-map-view]').forEach((button) => {
        const active = button.dataset.mapView === this.currentView;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
    }

    renderPlaceholder() {
      const placeholder = document.querySelector('.knowledge-tree-placeholder');
      if (placeholder) placeholder.innerHTML = '<div class="placeholder-icon">MAP</div><p>知识地图加载中…</p><small>正在整理分类和学习路径</small>';
    }

    renderTreeView() {
      const canvas = document.getElementById('knowledgeTreeCanvas');
      const placeholder = document.querySelector('.knowledge-tree-placeholder');
      if (!canvas || !this.treeData || !this.treeData.root) return;
      if (placeholder) placeholder.hidden = true;
      canvas.hidden = false;
      canvas.innerHTML = '';
      const tree = document.createElement('div');
      tree.className = 'knowledge-tree';
      tree.setAttribute('role', 'tree');
      this.renderNode(tree, this.treeData.root, 0);
      canvas.appendChild(tree);
    }

    renderNode(parentEl, node, level) {
      const hasChildren = Array.isArray(node.children) && node.children.length > 0;
      const nodeEl = document.createElement('div');
      nodeEl.className = 'tree-node' + (level === 0 ? ' open' : '');
      nodeEl.dataset.nodeId = node.id;
      nodeEl.dataset.level = String(level);
      nodeEl.setAttribute('role', 'treeitem');
      nodeEl.setAttribute('aria-level', String(level + 1));
      if (hasChildren) nodeEl.setAttribute('aria-expanded', level === 0 ? 'true' : 'false');
      nodeEl.innerHTML = '<button type="button" class="tree-node-header' + (hasChildren ? ' expandable' : '') + '">' +
        '<span class="tree-node-toggle" aria-hidden="true">' + (hasChildren ? (level === 0 ? '−' : '+') : '·') + '</span>' +
        '<span class="tree-node-icon" aria-hidden="true">' + this.escapeHtml(node.icon || (level === 0 ? 'CNC' : '•')) + '</span>' +
        '<span class="tree-node-copy"><strong class="tree-node-title">' + this.escapeHtml(node.title) + '</strong>' +
        (node.description ? '<small class="tree-node-desc">' + this.escapeHtml(node.description) + '</small>' : '') + '</span>' +
        '<span class="tree-node-count">' + Number(node.count || 0) + '</span></button>' +
        (hasChildren ? '<div class="tree-node-children" role="group"></div>' : '');
      parentEl.appendChild(nodeEl);
      const header = nodeEl.querySelector('.tree-node-header');
      header.setAttribute('aria-label', node.title + (node.count ? '，' + node.count + '条' : ''));
      header.addEventListener('click', () => {
        if (hasChildren) {
          const open = !nodeEl.classList.contains('open');
          nodeEl.classList.toggle('open', open);
          nodeEl.setAttribute('aria-expanded', open ? 'true' : 'false');
          nodeEl.querySelector('.tree-node-toggle').textContent = open ? '−' : '+';
        }
        if (node.id !== 'root' && this.onNodeClick) this.onNodeClick(node);
      });
      if (hasChildren) node.children.forEach((child) => this.renderNode(nodeEl.querySelector('.tree-node-children'), child, level + 1));
    }

    renderCategoriesView() {
      const grid = document.getElementById('knowledgeCategoriesGrid');
      if (!grid) return;
      grid.hidden = false;
      const categories = this.treeData && this.treeData.root && this.treeData.root.children || [];
      grid.innerHTML = categories.map((cat) => '<button type="button" class="category-card" data-category-id="' + this.escapeHtml(cat.id) + '">' +
        '<span class="category-card-icon" aria-hidden="true">' + this.escapeHtml(cat.icon || '•') + '</span><span class="category-card-copy"><strong>' + this.escapeHtml(cat.title) + '</strong><small>' + this.escapeHtml(cat.description || '') + '</small></span><b>' + Number(cat.count || 0) + '</b></button>').join('');
      grid.querySelectorAll('.category-card').forEach((card) => card.addEventListener('click', () => {
        const cat = categories.find((item) => item.id === card.dataset.categoryId);
        if (cat && this.onNodeClick) this.onNodeClick(cat);
      }));
    }

    openPath(path) {
      if (!path) return;
      if (typeof window.navigate === 'function') {
        window.navigate(path.route, path.filter ? { filter: path.filter } : {});
        return;
      }
      const selector = '[data-route="' + path.route + '"]' + (path.filter ? '[data-filter="' + path.filter + '"]' : '');
      const target = document.querySelector(selector);
      if (target) target.click();
    }

    renderPathsView() {
      const grid = document.getElementById('learningPathsGrid');
      if (!grid) return;
      grid.hidden = false;
      grid.innerHTML = this.paths.map((path) => '<button type="button" class="learning-path-card" data-path-id="' + path.id + '"><span class="learning-path-code">' + path.code + '</span><span><strong>' + path.title + '</strong><small>' + path.desc + '</small><em>' + path.label + ' →</em></span></button>').join('');
      grid.querySelectorAll('.learning-path-card').forEach((card) => card.addEventListener('click', () => this.openPath(this.paths.find((path) => path.id === card.dataset.pathId))));
    }

    switchView(viewName) {
      this.currentView = ['tree', 'categories', 'paths'].includes(viewName) ? viewName : 'tree';
      this.render();
    }

    setNodeClickHandler(handler) { this.onNodeClick = handler; }
    escapeHtml(text) { const div = document.createElement('div'); div.textContent = String(text || ''); return div.innerHTML; }
  }

  window.KnowledgeTreeUI = KnowledgeTreeUI;
})();