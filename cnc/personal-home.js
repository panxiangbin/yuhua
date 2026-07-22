/* 数控小潘：个性化首页、继续学习、学习进度与本地记录。 */
(function () {
  'use strict';

  var BUILD = '20260722b';
  var VISITED_KEY = 'cnc_study_visited_v1';
  var DONE_KEY = 'cnc_study_completed_v1';
  var CURRENT_KEY = 'cnc_study_current_v1';
  var FAVORITES_KEY = 'cnc_app_favorites_v2';
  var RECENTS_KEY = 'cnc_app_recents_v2';
  var mounted = false;

  function read(key, fallback) {
    try {
      var value = JSON.parse(localStorage.getItem(key));
      return value == null ? fallback : value;
    } catch (error) {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {}
  }

  function uniqueNumbers(list) {
    return Array.from(new Set((Array.isArray(list) ? list : [])
      .map(Number)
      .filter(function (number) { return number >= 1 && number <= 12; })))
      .sort(function (a, b) { return a - b; });
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, function (character) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[character];
    });
  }

  function getCards() {
    return Array.from(document.querySelectorAll('#view-study .study-card[data-level]'));
  }

  function lessonInfo(level) {
    var card = document.querySelector('#view-study .study-card[data-level="' + level + '"]');
    return {
      level: Number(level) || 1,
      title: card && card.querySelector('h4') ? card.querySelector('h4').textContent.trim() : '第 ' + level + ' 关',
      desc: card && card.querySelector('p') ? card.querySelector('p').textContent.trim() : '继续完成数控入门学习'
    };
  }

  function state() {
    var visited = uniqueNumbers(read(VISITED_KEY, []));
    var done = uniqueNumbers(read(DONE_KEY, []));
    var current = read(CURRENT_KEY, null);
    if (!current || !current.level) {
      var next = done.length < 12
        ? Array.from({ length: 12 }, function (_, index) { return index + 1; })
          .find(function (number) { return done.indexOf(number) === -1; }) || 1
        : 12;
      current = lessonInfo(next);
    }
    return {
      visited: visited,
      done: done,
      current: current,
      favorites: read(FAVORITES_KEY, []),
      recents: read(RECENTS_KEY, [])
    };
  }

  function injectStyles() {
    if (document.getElementById('xp-personal-home-style')) return;
    var style = document.createElement('style');
    style.id = 'xp-personal-home-style';
    style.textContent = [
      '.xp-personal-home{margin:18px 0 0;display:grid;gap:12px}',
      '.xp-personal-hero{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(230px,.7fr);gap:14px;padding:18px;border:1px solid #d8d3c8;border-radius:14px;background:#fffdf9;color:#292c2f;box-shadow:0 8px 22px rgba(48,44,36,.08)}',
      '.xp-personal-kicker{margin:0 0 5px;font-size:12px;font-weight:900;letter-spacing:.08em;color:#667b8d}',
      '.xp-personal-hero h2{margin:0;font-size:clamp(22px,4vw,32px);line-height:1.15;font-weight:950}',
      '.xp-personal-hero p{margin:8px 0 0;color:#687078;line-height:1.65}',
      '.xp-progress-box{align-self:stretch;padding:14px;border-radius:12px;background:#f2efe8;border:1px solid #d8d3c8}',
      '.xp-progress-number{display:flex;align-items:flex-end;justify-content:space-between;gap:8px}',
      '.xp-progress-number strong{font-size:32px;line-height:1;font-weight:950;color:#292c2f}',
      '.xp-progress-number span{font-size:13px;font-weight:800;color:#4f565c}',
      '.xp-progress-track{height:9px;margin-top:12px;border-radius:999px;background:#dfdacf;overflow:hidden}',
      '.xp-progress-fill{height:100%;border-radius:inherit;background:#3f6179;transition:width .28s ease}',
      '.xp-personal-grid{display:grid;grid-template-columns:minmax(0,1.45fr) repeat(3,minmax(110px,.55fr));gap:10px}',
      '.xp-continue-card,.xp-stat-card{border:1px solid #d8d3c8;background:#fffdf9;border-radius:14px;padding:15px;box-shadow:0 5px 16px rgba(48,44,36,.06)}',
      '.xp-continue-card{display:flex;align-items:center;justify-content:space-between;gap:14px}',
      '.xp-continue-card small,.xp-stat-card small{display:block;color:#687078;font-size:12px;font-weight:800}',
      '.xp-continue-card strong{display:block;margin-top:4px;font-size:19px;line-height:1.35;color:#292c2f;font-weight:950}',
      '.xp-continue-card p{margin:5px 0 0;color:#687078;font-size:13px;line-height:1.5}',
      '.xp-continue-btn{flex:0 0 auto;min-height:44px;border:1px solid #29485f;border-radius:10px;padding:11px 15px;background:#3f6179;color:#fff;font-weight:950;cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,255,255,.22),0 4px 10px rgba(48,68,82,.18)}',
      '.xp-continue-btn:active{transform:translateY(1px);box-shadow:inset 0 2px 4px rgba(0,0,0,.16)}',
      '.xp-stat-card{display:flex;flex-direction:column;justify-content:center;min-height:92px}',
      '.xp-stat-card strong{display:block;margin-top:5px;font-size:27px;line-height:1;color:#292c2f;font-weight:950}',
      '.xp-complete-bar{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:14px 0 0;padding:12px 14px;border-radius:12px;background:#f2efe8;border:1px solid #d8d3c8}',
      '.xp-complete-bar strong{font-weight:950;color:#37434c}',
      '.xp-complete-btn{border:1px solid #2f6d55;border-radius:10px;padding:10px 13px;background:#3d8268;color:#fff;font-weight:950;cursor:pointer}',
      '.xp-complete-btn.done{background:#dce9e3;color:#2f6d55}',
      '#view-study .study-card.xp-visited{outline:2px solid rgba(63,97,121,.20)}',
      '#view-study .study-card.xp-completed{outline:2px solid rgba(61,130,104,.42);background:#f4fff9}',
      '#view-study .study-card.xp-completed:after{content:"已完成";position:absolute;right:12px;bottom:12px;padding:5px 9px;border-radius:999px;background:#3d8268;color:#fff;font-size:11px;font-weight:950}',
      '#view-study .study-card{position:relative}',
      '@media(max-width:760px){.xp-personal-home{margin-top:16px}.xp-personal-hero{grid-template-columns:1fr;padding:15px}.xp-personal-hero h2{font-size:22px}.xp-personal-grid{grid-template-columns:1fr}.xp-continue-card{align-items:flex-start;flex-direction:column}.xp-continue-btn{width:100%;min-height:48px}.xp-stat-card{min-height:72px}.xp-progress-number strong{font-size:29px}}'
    ].join('');
    document.head.appendChild(style);
  }

  function keepPanelAfterTools(panel, launch) {
    if (!panel || !launch) return;
    if (launch.nextElementSibling !== panel) {
      launch.insertAdjacentElement('afterend', panel);
    }
  }

  function render() {
    var dashboard = document.getElementById('view-dashboard');
    var launch = dashboard && dashboard.querySelector('.launchpad-grid');
    if (!dashboard || !launch) return false;

    var currentState = state();
    var panel = document.getElementById('xp-personal-home');
    if (!panel) {
      panel = document.createElement('section');
      panel.id = 'xp-personal-home';
      panel.className = 'xp-personal-home';
    }
    keepPanelAfterTools(panel, launch);

    var percent = Math.round((currentState.done.length / 12) * 100);
    var current = lessonInfo(currentState.current.level || 1);
    panel.innerHTML = ''
      + '<div class="xp-personal-hero"><div><p class="xp-personal-kicker">学习进度</p><h2>'
      + (currentState.done.length ? '接着学，不用从头再找' : '从第 1 关开始，稳稳入门')
      + '</h2><p>功能查询在上面，学习记录放在这里；不登录也能继续。</p></div>'
      + '<div class="xp-progress-box"><div class="xp-progress-number"><strong>' + percent + '%</strong><span>已完成 '
      + currentState.done.length + ' / 12 关</span></div><div class="xp-progress-track"><div class="xp-progress-fill" style="width:'
      + percent + '%"></div></div></div></div>'
      + '<div class="xp-personal-grid"><article class="xp-continue-card"><div><small>继续学习 · 第 '
      + current.level + ' 关</small><strong>' + escapeHtml(current.title) + '</strong><p>'
      + escapeHtml(current.desc) + '</p></div><button class="xp-continue-btn" type="button" data-xp-continue="'
      + current.level + '">继续学习</button></article>'
      + '<article class="xp-stat-card"><small>已看关卡</small><strong>' + currentState.visited.length + '</strong></article>'
      + '<article class="xp-stat-card"><small>我的收藏</small><strong>'
      + (Array.isArray(currentState.favorites) ? currentState.favorites.length : 0) + '</strong></article>'
      + '<article class="xp-stat-card"><small>最近查看</small><strong>'
      + (Array.isArray(currentState.recents) ? currentState.recents.length : 0) + '</strong></article></div>';

    markCards(currentState);
    return true;
  }

  function markCards(currentState) {
    getCards().forEach(function (card) {
      var level = Number(card.dataset.level);
      card.classList.toggle('xp-visited', currentState.visited.indexOf(level) !== -1);
      card.classList.toggle('xp-completed', currentState.done.indexOf(level) !== -1);
    });
  }

  function openLesson(level) {
    var card = document.querySelector('#view-study .study-card[data-level="' + level + '"]');
    if (!card) return;
    var info = lessonInfo(level);
    var currentState = state();
    currentState.visited = uniqueNumbers(currentState.visited.concat([level]));
    write(VISITED_KEY, currentState.visited);
    write(CURRENT_KEY, info);
    if (typeof window.navigate === 'function') {
      window.navigate('study');
    } else {
      var nav = document.querySelector('[data-route="study"]');
      if (nav) nav.click();
    }
    setTimeout(function () {
      card.click();
      card.scrollIntoView({ behavior: 'smooth', block: 'start' });
      render();
    }, 80);
  }

  function mountCompleteButton() {
    var content = document.getElementById('study-detail-content');
    if (!content) return;
    var detail = content.querySelector('.lesson-detail-v2[data-level]');
    if (!detail) return;
    var level = Number(detail.dataset.level);
    if (!level) return;
    var bar = detail.querySelector('.xp-complete-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'xp-complete-bar';
      var target = detail.querySelector('.lesson-pass-box') || detail.firstElementChild;
      if (target) target.insertAdjacentElement('afterend', bar);
      else detail.prepend(bar);
    }
    var done = state().done.indexOf(level) !== -1;
    bar.innerHTML = '<strong>'
      + (done ? '这一关已完成，可以继续下一关' : '学完并练习后，记得标记完成')
      + '</strong><button type="button" class="xp-complete-btn' + (done ? ' done' : '')
      + '" data-xp-complete="' + level + '">' + (done ? '✓ 已完成' : '标记完成') + '</button>';
  }

  function toggleComplete(level) {
    var currentState = state();
    var exists = currentState.done.indexOf(level) !== -1;
    currentState.done = exists
      ? currentState.done.filter(function (number) { return number !== level; })
      : uniqueNumbers(currentState.done.concat([level]));
    currentState.visited = uniqueNumbers(currentState.visited.concat([level]));
    write(DONE_KEY, currentState.done);
    write(VISITED_KEY, currentState.visited);
    if (!exists) {
      var next = Array.from({ length: 12 }, function (_, index) { return index + 1; })
        .find(function (number) { return currentState.done.indexOf(number) === -1; });
      if (next) write(CURRENT_KEY, lessonInfo(next));
    }
    render();
    mountCompleteButton();
  }

  function bind() {
    if (mounted) return;
    mounted = true;
    document.addEventListener('click', function (event) {
      var cont = event.target.closest && event.target.closest('[data-xp-continue]');
      if (cont) {
        openLesson(Number(cont.dataset.xpContinue));
        return;
      }
      var complete = event.target.closest && event.target.closest('[data-xp-complete]');
      if (complete) {
        toggleComplete(Number(complete.dataset.xpComplete));
        return;
      }
      var card = event.target.closest && event.target.closest('#view-study .study-card[data-level]');
      if (card) {
        var level = Number(card.dataset.level);
        var currentState = state();
        currentState.visited = uniqueNumbers(currentState.visited.concat([level]));
        write(VISITED_KEY, currentState.visited);
        write(CURRENT_KEY, lessonInfo(level));
        setTimeout(function () {
          render();
          mountCompleteButton();
        }, 80);
      }
      var favorite = event.target.closest && event.target.closest('#favorite-toggle');
      if (favorite) setTimeout(render, 60);
    }, true);
    window.addEventListener('storage', render);
    var detail = document.getElementById('study-detail-content');
    if (detail) {
      new MutationObserver(function () { mountCompleteButton(); })
        .observe(detail, { childList: true });
    }
  }

  function boot() {
    injectStyles();
    bind();
    render();
    mountCompleteButton();
    setTimeout(render, 900);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  window.CNC_PERSONAL_HOME = {
    build: BUILD,
    render: render,
    getState: state,
    runCheck: function () {
      var panel = document.getElementById('xp-personal-home');
      var launch = document.querySelector('#view-dashboard .launchpad-grid');
      var grid = panel && panel.querySelector('.xp-personal-grid');
      var single = window.innerWidth > 760 || Boolean(grid && getComputedStyle(grid).gridTemplateColumns.split(' ').length === 1);
      var followsTools = Boolean(panel && launch && launch.nextElementSibling === panel);
      return {
        passed: Boolean(panel && document.querySelector('[data-xp-continue]') && single && followsTools),
        build: BUILD,
        panel: Boolean(panel),
        mobileSingleColumn: single,
        followsTools: followsTools,
        state: state()
      };
    }
  };
})();
