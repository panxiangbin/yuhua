/**
 * ui-learning-navigation.js
 * 课程导航与目录系统 — 章节目录/滚动导航/面包屑/上下关切换
 * 全局对象: window.CNC_LEARNING_NAV
 */
(function () {
  'use strict';

  if (window.CNC_LEARNING_NAV) return;

  var _currentLevel = 1;
  var _sectionIds = [];
  var _scrollOffset = 80;
  var _prevLesson = null;
  var _nextLesson = null;
  var _onNavigate = null;

  var _LESSON_TITLES = {
    1: '认识零件的身份证', 2: '机床的东南西北', 3: '找机床的老家',
    4: '告诉机床活儿在哪', 5: 'Z轴对刀，保命绝招', 6: '认识你的武器',
    7: '顺着切还是逆着切', 8: 'S和F，谁跑得快', 9: 'G00和G01，快慢有别',
    10: '致命的小数点', 11: 'G90和G91', 12: 'G81钻孔自动化'
  };

  function renderTableOfContents(level) {
    var data = null;
    if (window.CNC_LEARNING_UI) data = window.CNC_LEARNING_UI.getLessonData(level);
    if (!data) return '<p class="toc-empty">暂无目录数据</p>';
    _sectionIds = ['lesson-header', 'lesson-section'];
    var html = '<nav class="lesson-toc"><h3>本章目录</h3><ul class="toc-list">';
    var sections = [];
    if (data.objectives && data.objectives.length) sections.push({ id: 'objectives', label: '学习目标' });
    if (data.steps && data.steps.length) sections.push({ id: 'steps', label: '操作步骤' });
    if (data.errors && data.errors.length) sections.push({ id: 'errors', label: '常见错误' });
    if (data.quizzes && data.quizzes.length) sections.push({ id: 'quizzes', label: '互动练习' });
    if (data.summary) sections.push({ id: 'summary', label: '本章小结' });
    for (var i = 0; i < sections.length; i++) {
      html += '<li class="toc-item" data-section="' + sections[i].id + '"><a href="#section-' + sections[i].id + '">' + sections[i].label + '</a></li>';
    }
    html += '</ul></nav>';
    return html;
  }

  function scrollToSection(sectionId) {
    var el = document.getElementById('section-' + sectionId);
    if (!el) {
      var els = document.querySelectorAll('[data-section-id="' + sectionId + '"]');
      if (els.length) el = els[0];
    }
    if (!el) return false;
    var rect = el.getBoundingClientRect();
    var top = rect.top + window.pageYOffset - _scrollOffset;
    window.scrollTo({ top: top, behavior: 'smooth' });
    return true;
  }

  function updateActiveSection() {
    var scrollY = window.pageYOffset + _scrollOffset + 50;
    var sectionEls = document.querySelectorAll('.lesson-section');
    var activeId = null;
    for (var i = sectionEls.length - 1; i >= 0; i--) {
      var el = sectionEls[i];
      if (el.offsetTop <= scrollY) {
        var id = el.id || el.getAttribute('data-section-id');
        if (id) { activeId = id; break; }
      }
    }
    var items = document.querySelectorAll('.toc-item');
    for (var j = 0; j < items.length; j++) {
      var section = items[j].getAttribute('data-section');
      items[j].classList.toggle('active', section === activeId);
    }
  }

  function renderBreadcrumb(level) {
    _currentLevel = level;
    var stageNames = { 1: '阶段一', 2: '阶段二', 3: '阶段三', 4: '阶段四' };
    var stage = Math.ceil(level / 3);
    if (stage > 4) stage = 4;
    var title = _LESSON_TITLES[level] || '第' + level + '关';
    var html = '<nav class="lesson-breadcrumb" aria-label="面包屑导航">';
    html += '<a href="#" data-route="study">新手路线</a>';
    html += '<span class="breadcrumb-sep">›</span>';
    html += '<span>' + (stageNames[stage] || '') + '</span>';
    html += '<span class="breadcrumb-sep">›</span>';
    html += '<span class="breadcrumb-current">' + title + '</span>';
    html += '</nav>';
    return html;
  }

  function goPrevLesson() {
    if (_currentLevel > 1) {
      _navigateTo(_currentLevel - 1);
      return true;
    }
    return false;
  }

  function goNextLesson() {
    if (_currentLevel < 12) {
      _navigateTo(_currentLevel + 1);
      return true;
    }
    return false;
  }

  function setOnNavigate(callback) {
    _onNavigate = callback;
  }

  function _navigateTo(level) {
    _currentLevel = level;
    if (_onNavigate) _onNavigate(level);
  }

  function initKeyboardNav() {
    document.addEventListener('keydown', function (e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); goPrevLesson(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); goNextLesson(); }
    });
  }

  function setCurrentLevel(level) {
    _currentLevel = level;
  }

  window.CNC_LEARNING_NAV = {
    renderTableOfContents: renderTableOfContents,
    scrollToSection: scrollToSection,
    updateActiveSection: updateActiveSection,
    renderBreadcrumb: renderBreadcrumb,
    goPrevLesson: goPrevLesson,
    goNextLesson: goNextLesson,
    setOnNavigate: setOnNavigate,
    initKeyboardNav: initKeyboardNav,
    setCurrentLevel: setCurrentLevel,
    getCurrentLevel: function () { return _currentLevel; },
    getLessonTitle: function (level) { return _LESSON_TITLES[level] || '第' + level + '关'; }
  };

  console.log('[CNC_LEARNING_NAV] 课程导航系统已加载。');
})();
