/* 数控小潘：手机首页闯关游戏化、学习进度、训练营与成长记录。 */
(function () {
  'use strict';

  var BUILD = '20260728-game1';
  var RECORDS_BUILD = '20260722e';
  var TRAINING_BUILD = '20260728a';
  var GAME_STYLE_BUILD = '20260728a';
  var VISITED_KEY = 'cnc_study_visited_v1';
  var DONE_KEY = 'cnc_study_completed_v1';
  var CURRENT_KEY = 'cnc_study_current_v1';
  var FAVORITES_KEY = 'cnc_app_favorites_v2';
  var RECENTS_KEY = 'cnc_app_recents_v2';
  var PROFILE_KEY = 'cnc_training_profile_v1';
  var PRACTICE_KEY = 'cnc_training_practice_v1';
  var SIMULATOR_KEY = 'cnc_training_simulator_v1';
  var mounted = false;
  var recordsDecorateScheduled = false;

  var COURSES = [
    { id: 'stage-1', title: '安全基础', file: 'course-safety-foundation.html', reason: '先学会停，再学会动。' },
    { id: 'stage-2', title: '认识加工中心', file: 'course-machining-center-basics.html', reason: '认识主轴、工作台、刀库和三条直线轴。' },
    { id: 'stage-3', title: '坐标轴与运动方向', file: 'course-coordinate-axes.html', reason: '分清 X、Y、Z 正方向。' },
    { id: 'stage-4', title: '图纸、尺寸与基准', file: 'course-drawing-basics.html', reason: '按形状、位置和基准读图。' },
    { id: 'stage-5', title: '机床坐标与工件坐标', file: 'course-machine-work-offset.html', reason: '理解 G54 和坐标偏置。' },
    { id: 'stage-6', title: '工件装夹基础', file: 'course-workholding-basics.html', reason: '兼顾定位、夹紧和刀具通道。' },
    { id: 'stage-7', title: '刀具基础', file: 'course-tool-basics.html', reason: '认识刀具、刀柄和伸出量。' },
    { id: 'stage-8', title: '对刀与刀长补偿', file: 'course-tool-length-offset.html', reason: '把实物刀具、H号和程序调用连起来。' },
    { id: 'stage-9', title: 'G00 与 G01', file: 'course-g00-g01-basics.html', reason: '学会安全定位和直线进给。' },
    { id: 'stage-10', title: 'G02 与 G03', file: 'course-g02-g03-basics.html', reason: '判断加工平面、方向和圆心。' },
    { id: 'stage-11', title: '孔加工循环', file: 'course-hole-cycles.html', reason: '理解 G81、G83、R 平面和返回方式。' },
    { id: 'stage-12', title: '完整程序与首件验证', file: 'course-complete-program-first-piece.html', reason: '把图纸、装夹、程序和测量串成闭环。' }
  ];

  var ROADMAP = [
    { name: '零基础入门', range: '第 1—3 关', desc: '先把安全、机床和坐标方向学明白' },
    { name: '现场基础', range: '第 4—8 关', desc: '掌握图纸、坐标、装夹、刀具和对刀' },
    { name: '编程入门', range: '第 9—11 关', desc: '掌握直线、圆弧和孔加工程序' },
    { name: '独立首件', range: '第 12 关', desc: '完成程序验证、试切与首件测量' }
  ];

  function read(key, fallback) {
    try {
      var value = JSON.parse(localStorage.getItem(key));
      return value == null ? fallback : value;
    } catch (error) {
      return fallback;
    }
  }

  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (error) {}
  }

  function nums(value) {
    return Array.from(new Set((Array.isArray(value) ? value : []).map(Number).filter(function (n) {
      return n >= 1 && n <= 12;
    }))).sort(function (a, b) { return a - b; });
  }

  function esc(value) {
    return String(value || '').replace(/[&<>"']/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
    });
  }

  function cards() {
    return Array.from(document.querySelectorAll('#view-study .study-card[data-level]'));
  }

  function info(level) {
    var numericLevel = Number(level) || 1;
    var card = document.querySelector('#view-study .study-card[data-level="' + numericLevel + '"]');
    return {
      level: numericLevel,
      title: card && card.querySelector('h4') ? card.querySelector('h4').textContent.trim() : COURSES[numericLevel - 1].title,
      desc: card && card.querySelector('p') ? card.querySelector('p').textContent.trim() : COURSES[numericLevel - 1].reason
    };
  }

  function getScores(profile) {
    return profile && profile.courseScores && typeof profile.courseScores === 'object' ? profile.courseScores : {};
  }

  function isCourseDone(profile, course) {
    var stages = profile && Array.isArray(profile.completedStages) ? profile.completedStages : [];
    return stages.indexOf(course.id) !== -1 || Number(getScores(profile)[course.id] || 0) >= 80;
  }

  function countWrong(practice) {
    var wrong = practice && (practice.wrongQuestions || practice.wrong) || [];
    return Array.isArray(wrong) ? wrong.length : Object.keys(wrong || {}).length;
  }

  function countSimulatorPassed(simulator) {
    var source = simulator && simulator.simulators && typeof simulator.simulators === 'object' ? simulator.simulators : simulator;
    return Object.values(source || {}).filter(function (item) {
      return item && typeof item === 'object' && (item.passed === true || Number(item.bestScore || item.score || 0) >= 80);
    }).length;
  }

  function levelFromXp(xp) {
    if (xp >= 1600) return { name: '现场高手', level: 7, current: 1600, next: 2200 };
    if (xp >= 1100) return { name: 'CNC技术员', level: 6, current: 1100, next: 1600 };
    if (xp >= 750) return { name: '初级编程员', level: 5, current: 750, next: 1100 };
    if (xp >= 480) return { name: '独立操作工', level: 4, current: 480, next: 750 };
    if (xp >= 260) return { name: '初级操作工', level: 3, current: 260, next: 480 };
    if (xp >= 100) return { name: '学徒', level: 2, current: 100, next: 260 };
    return { name: 'CNC新人', level: 1, current: 0, next: 100 };
  }

  function legacyProfile(done, visited, saved) {
    var profile = saved && typeof saved === 'object' ? saved : {};
    var legacyXp = done.length * 100 + visited.filter(function (n) { return done.indexOf(n) === -1; }).length * 20;
    profile.version = Number(profile.version) || 1;
    profile.xp = Math.max(Number(profile.xp) || 0, legacyXp);
    return profile;
  }

  function state() {
    var visited = nums(read(VISITED_KEY, []));
    var done = nums(read(DONE_KEY, []));
    var savedProfile = read(PROFILE_KEY, {});
    var profile = legacyProfile(done, visited, savedProfile);
    var practice = read(PRACTICE_KEY, {});
    var simulator = read(SIMULATOR_KEY, {});
    var modernDone = COURSES.filter(function (course) { return isCourseDone(profile, course); });
    var doneCount = Math.max(done.length, modernDone.length);
    var nextCourse = COURSES.find(function (course) { return !isCourseDone(profile, course); }) || COURSES[COURSES.length - 1];
    var nextIndex = Math.max(0, COURSES.indexOf(nextCourse));
    var current = read(CURRENT_KEY, null);
    if (!current || !current.level) current = info(Math.min(12, doneCount + 1));
    return {
      visited: visited,
      done: done,
      doneCount: doneCount,
      current: current,
      profile: profile,
      practice: practice,
      simulator: simulator,
      wrongCount: countWrong(practice),
      simulatorPassed: countSimulatorPassed(simulator),
      nextCourse: nextCourse,
      nextIndex: nextIndex,
      favorites: read(FAVORITES_KEY, []),
      recents: read(RECENTS_KEY, [])
    };
  }

  function appendStyle(href, dataName) {
    var selector = 'link[data-' + dataName + ']';
    if (document.querySelector(selector)) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.setAttribute('data-' + dataName, '1');
    document.head.appendChild(link);
  }

  function appendScript(src, dataName) {
    var selector = 'script[data-' + dataName + ']';
    if (window.CNC_INDUSTRIAL_TOOLS && window.CNC_INDUSTRIAL_TOOLS.build === '20260722d') return;
    if (document.querySelector(selector)) return;
    var script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.setAttribute('data-' + dataName, '1');
    document.head.appendChild(script);
  }

  function ensureAssets() {
    appendStyle('./industrial-learning.css?v=20260722c', 'cnc-industrial-learning');
    appendStyle('./industrial-tools.css?v=20260722d', 'cnc-industrial-tools');
    appendScript('./industrial-tools.js?v=20260722d', 'cnc-industrial-tools-script');
    appendStyle('./industrial-personal-records.css?v=' + RECORDS_BUILD, 'cnc-industrial-records');
    appendStyle('./mobile-home-game.css?v=' + GAME_STYLE_BUILD, 'cnc-mobile-home-game');
    if (document.body) {
      document.body.classList.add('cnc-industrial-learning', 'cnc-industrial-records', 'cnc-game-home-enabled');
      document.body.dataset.cncTrainingBuild = TRAINING_BUILD;
    }
  }

  function keepLegacyPanelAfterLaunch(panel, launch) {
    if (panel && launch && launch.nextElementSibling !== panel) launch.insertAdjacentElement('afterend', panel);
  }

  function followsTools() {
    var panel = document.getElementById('xp-personal-home');
    var launch = document.querySelector('#view-dashboard .launchpad-grid');
    return Boolean(panel && launch && launch.nextElementSibling === panel);
  }

  function mark(st) {
    cards().forEach(function (card) {
      var level = Number(card.dataset.level);
      card.classList.toggle('xp-visited', st.visited.indexOf(level) !== -1);
      card.classList.toggle('xp-completed', st.done.indexOf(level) !== -1);
      card.dataset.trainingReady = 'true';
      if (!card.querySelector('.xp-course-meta')) {
        var meta = document.createElement('div');
        meta.className = 'xp-course-meta';
        meta.innerHTML = '<span>学习目标明确</span><span>含易错提醒</span><span>完成后可闯关</span>';
        card.appendChild(meta);
      }
    });
  }

  function renderLegacyPanel(st) {
    var dashboard = document.getElementById('view-dashboard');
    var launch = dashboard && dashboard.querySelector('.launchpad-grid');
    if (!dashboard || !launch) return false;
    var panel = document.getElementById('xp-personal-home');
    if (!panel) {
      panel = document.createElement('section');
      panel.id = 'xp-personal-home';
      panel.className = 'xp-personal-home';
    }
    keepLegacyPanelAfterLaunch(panel, launch);
    var xp = Number(st.profile.xp) || 0;
    var level = levelFromXp(xp);
    var percent = Math.round(st.doneCount / 12 * 100);
    panel.innerHTML = '<div class="xp-personal-hero"><div><p class="xp-personal-kicker">CNC 新手训练平台</p><h2>从零基础，闯到独立编程</h2><p>当前等级：Lv.' + level.level + ' ' + esc(level.name) + '。课程、题库和模拟记录都保存在本机。</p></div><div class="xp-progress-box"><div class="xp-progress-number"><strong>' + percent + '%</strong><span>已完成 ' + st.doneCount + ' / 12 关</span></div><div class="xp-progress-track"><div class="xp-progress-fill" style="width:' + percent + '%"></div></div></div></div>';
    return true;
  }

  function renderGameHome(st) {
    var dashboard = document.getElementById('view-dashboard');
    var launch = dashboard && dashboard.querySelector('.launchpad-grid');
    if (!dashboard || !launch) return false;
    var panel = document.getElementById('xp-game-home');
    if (!panel) {
      panel = document.createElement('section');
      panel.id = 'xp-game-home';
      panel.className = 'xp-game-home';
      launch.insertAdjacentElement('beforebegin', panel);
    }

    var xp = Number(st.profile.xp) || 0;
    var level = levelFromXp(xp);
    var levelSpan = Math.max(1, level.next - level.current);
    var levelProgress = Math.max(0, Math.min(100, Math.round((xp - level.current) / levelSpan * 100)));
    var nextNeed = Math.max(0, level.next - xp);
    var doneCount = st.doneCount;
    var nextNumber = Math.min(12, st.nextIndex + 1);
    var completedItems = COURSES.slice(0, Math.min(doneCount, 3));
    var progressRows = completedItems.map(function (course, index) {
      return '<li class="xp-game-stage done"><span>' + (index + 1) + '</span><strong>第' + (index + 1) + '关：' + esc(course.title) + '</strong><b aria-label="已完成">✓</b></li>';
    }).join('');
    progressRows += '<li class="xp-game-stage current"><span>' + nextNumber + '</span><strong>第' + nextNumber + '关：' + esc(st.nextCourse.title) + '</strong><b aria-label="当前关卡">🔥</b></li>';
    if (nextNumber < 12) progressRows += '<li class="xp-game-stage locked"><span>' + (nextNumber + 1) + '</span><strong>第' + (nextNumber + 1) + '关：' + esc(COURSES[nextNumber].title) + '</strong><b aria-label="未解锁">🔒</b></li>';

    var mainLabel = doneCount ? '继续闯关' : '开始第1关';
    var wrongCopy = st.wrongCount ? '还有 ' + st.wrongCount + ' 道错题待复习' : '查漏补缺 · 巩固提升';
    panel.innerHTML = '' +
      '<div class="xp-game-hero">' +
        '<div class="xp-game-topline"><span class="xp-game-brand">CNC新手训练营</span><a href="./profile.html" class="xp-game-sign">🏅 我的成长</a></div>' +
        '<p class="xp-game-kicker">12关主线课程 · 专项题库 · 现场模拟</p>' +
        '<h1>从零基础，<em>闯</em>到独立编程</h1>' +
        '<p class="xp-game-subtitle">学一点，练一点，会一点。打开首页就知道下一步该练什么。</p>' +
        '<div class="xp-game-level-card">' +
          '<div class="xp-game-avatar" aria-hidden="true">🧑‍🏭</div>' +
          '<div class="xp-game-level-copy"><small>当前等级</small><strong>' + esc(level.name) + ' Lv.' + level.level + '</strong><div class="xp-game-xp-track"><span style="width:' + levelProgress + '%"></span><b>' + xp + ' / ' + level.next + ' XP</b></div><p>距离“' + esc(levelFromXp(level.next).name) + '”还差 ' + nextNeed + ' XP</p></div>' +
        '</div>' +
        '<div class="xp-game-hero-actions"><a class="xp-game-primary" href="./' + st.nextCourse.file + '">' + mainLabel + ' <span>›</span></a><a class="xp-game-secondary" href="./beginner-placement.html">⏱ 2分钟起点测评</a></div>' +
      '</div>' +
      '<div class="xp-game-main-grid">' +
        '<article class="xp-game-progress-card"><header><span>🚩</span><h2>你的主线进度</h2></header><ol>' + progressRows + '</ol><a href="./' + st.nextCourse.file + '" class="xp-game-challenge-btn">挑战第' + nextNumber + '关 <span>›</span></a></article>' +
        '<article class="xp-game-daily-card"><div class="xp-game-daily-image" aria-hidden="true">⚙️<span>?</span></div><small>🎯 今日挑战</small><h2>G00快速定位为什么容易撞刀？</h2><a href="./practice.html" class="xp-game-daily-btn">⭐ 答题赚10 XP</a></article>' +
      '</div>' +
      '<div class="xp-game-shortcuts">' +
        '<a href="./training-camp.html"><span>🏆</span><strong>课程闯关</strong><small>系统学 · 关关进阶</small></a>' +
        '<a href="./practice.html"><span>🎯</span><strong>每日挑战</strong><small>每日一题 · 轻松拿分</small></a>' +
        '<a href="./practice-wrong-review.html"><span>📕</span><strong>错题复习</strong><small>' + esc(wrongCopy) + '</small></a>' +
        '<a href="./simulator-hub.html"><span>🏭</span><strong>模拟车间</strong><small>已通过 ' + st.simulatorPassed + ' / 13 项</small></a>' +
      '</div>' +
      '<button type="button" class="xp-game-tools-entry" data-route="calculator" data-cnc-industrial-tools-entry="true" aria-label="进入换算工具，计算转速、进给、锥度和直径"><span class="xp-game-tools-icon" aria-hidden="true">ƒ</span><span><strong>换算工具</strong><small>转速 · 进给 · 锥度 · 直径</small></span><span class="xp-game-tools-arrow" aria-hidden="true">›</span></button>' +
      '<nav class="xp-game-bottom-nav" aria-label="CNC训练平台主导航">' +
        '<a class="active" href="./index.html"><span>⌂</span><b>首页</b></a>' +
        '<a href="./training-camp.html"><span>⚔</span><b>闯关</b></a>' +
        '<a href="./practice.html"><span>◎</span><b>挑战</b></a>' +
        '<a href="./simulator-hub.html"><span>▣</span><b>模拟</b></a>' +
        '<a href="./profile.html"><span>♙</span><b>我的</b></a>' +
      '</nav>';
    panel.dataset.ready = 'true';
    return true;
  }

  function trainingOverview() {
    var study = document.getElementById('view-study');
    var st = state();
    if (!study) return false;
    var mainPanel = study.querySelector('.section-panel');
    var stages = mainPanel && mainPanel.querySelector('.learning-stages');
    if (!mainPanel || !stages) return false;
    var overview = document.getElementById('xp-training-overview');
    if (!overview) {
      overview = document.createElement('section');
      overview.id = 'xp-training-overview';
      overview.className = 'xp-training-overview';
      stages.insertAdjacentElement('beforebegin', overview);
    }
    var xp = Number(st.profile.xp) || 0;
    var level = levelFromXp(xp);
    overview.innerHTML = '<div class="xp-training-head"><div><p class="xp-personal-kicker">CNC 新手训练营</p><h4>从零基础到能独立完成首件</h4><p>按“先安全、再坐标、后编程、最后排障”的顺序学习。</p></div><div class="xp-level-chip"><strong>Lv.' + level.level + '</strong><small>' + esc(level.name) + '</small></div></div><div class="xp-training-stats"><div class="xp-training-stat"><strong>' + xp + '</strong><small>累计经验值</small></div><div class="xp-training-stat"><strong>' + st.doneCount + '/12</strong><small>已通过关卡</small></div><div class="xp-training-stat"><strong>' + st.wrongCount + '</strong><small>待复习错题</small></div></div><div class="xp-roadmap">' + ROADMAP.map(function (item, index) { return '<article class="xp-roadmap-card"><span class="xp-roadmap-index">' + (index + 1) + '</span><div><strong>' + esc(item.name) + '</strong><small>' + esc(item.range) + '</small><p>' + esc(item.desc) + '</p></div></article>'; }).join('') + '</div>';
    return true;
  }

  function sourceEntries() {
    var names = ['CNC_DATA', 'CNC_KB_EXTRA', 'CNC_ALARM_DATA', 'CNC_WEAK_CATEGORY_DATA', 'CNC_GM_CODE_COMPLETE', 'CNC_DIAGNOSIS_DATA'];
    var all = [];
    names.forEach(function (name) { if (Array.isArray(window[name])) all = all.concat(window[name]); });
    return all;
  }

  function findEntry(id) {
    var target = String(id || '');
    return sourceEntries().find(function (item) { return item && String(item.id || '') === target; }) || null;
  }

  function recordCode(entry) {
    return String(entry && (entry.code || entry.id) || '条目').trim();
  }

  function recordTitle(entry) {
    return String(entry && (entry.title || entry.name) || '知识条目').trim();
  }

  function decorateRecords() {
    var view = document.getElementById('view-favorites');
    if (!view) return false;
    var recordCards = Array.from(view.querySelectorAll('.favorites-grid > .detail-card'));
    if (recordCards.length !== 2) return false;

    recordCards.forEach(function (card) {
      var heading = card.querySelector('h4');
      var cloud = card.querySelector('.link-cloud');
      if (!heading || !cloud) return;
      var entryButtons = Array.from(cloud.querySelectorAll('[data-link-entry]'));
      var badge = heading.querySelector('.xp-record-count');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'xp-record-count';
        heading.appendChild(badge);
      }
      badge.textContent = String(entryButtons.length);
      badge.setAttribute('aria-label', '共' + entryButtons.length + '条');

      Array.from(cloud.querySelectorAll('button')).forEach(function (button) {
        var entryId = button.getAttribute('data-link-entry');
        if (!entryId) {
          button.classList.add('xp-record-empty');
          button.setAttribute('aria-label', button.textContent.trim() || '暂无记录');
          return;
        }
        var entry = findEntry(entryId);
        if (!entry) return;
        var code = recordCode(entry);
        var title = recordTitle(entry);
        var category = String(entry.category || entry.system || '知识条目').trim();
        if (button.dataset.cncIndustrialRecord !== entryId) {
          button.innerHTML = '<span class="xp-record-code">' + esc(code) + '</span>' +
            '<span class="xp-record-copy"><strong>' + esc(title) + '</strong><small>' + esc(category) + '</small></span>' +
            '<span class="xp-record-arrow" aria-hidden="true">›</span>';
          button.dataset.cncIndustrialRecord = entryId;
        }
        button.setAttribute('aria-label', (code + ' ' + title + '，' + category).trim());
      });
    });

    view.dataset.industrialRecords = 'ready';
    return true;
  }

  function scheduleRecords() {
    if (recordsDecorateScheduled) return;
    recordsDecorateScheduled = true;
    window.setTimeout(function () {
      recordsDecorateScheduled = false;
      decorateRecords();
    }, 0);
  }

  function render() {
    ensureAssets();
    var st = state();
    var legacyReady = renderLegacyPanel(st);
    var gameReady = renderGameHome(st);
    mark(st);
    trainingOverview();
    scheduleRecords();
    return legacyReady && gameReady;
  }

  function bind() {
    if (mounted) return;
    mounted = true;
    window.addEventListener('pageshow', function () { render(); scheduleRecords(); });
    window.addEventListener('storage', function () { render(); scheduleRecords(); });
    window.addEventListener('hashchange', function () {
      window.setTimeout(trainingOverview, 80);
      window.setTimeout(decorateRecords, 80);
    });
    document.addEventListener('click', function (event) {
      var target = event.target && event.target.closest ? event.target : null;
      var favoritesRoute = target && target.closest('.xp-bottom-nav [data-xp-route="favorites"],[data-route="favorites"]');
      if (favoritesRoute) {
        var guard = window.CNC_STARTUP_HOME_GUARD;
        if (guard && typeof guard.acceptTrustedRouteEvent === 'function') guard.acceptTrustedRouteEvent(event);
        [0, 60, 180, 420].forEach(function (delay) { window.setTimeout(decorateRecords, delay); });
      }

      var studyCard = target && target.closest('#view-study .study-card[data-level]');
      if (studyCard) {
        var level = Number(studyCard.dataset.level);
        var st = state();
        write(VISITED_KEY, nums(st.visited.concat([level])));
        write(CURRENT_KEY, info(level));
        window.setTimeout(render, 100);
      }
    }, true);
  }

  function boot() {
    ensureAssets();
    bind();
    render();
    window.setTimeout(render, 900);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();

  window.CNC_PERSONAL_HOME = {
    build: BUILD,
    recordsBuild: RECORDS_BUILD,
    trainingBuild: TRAINING_BUILD,
    render: render,
    decorateRecords: decorateRecords,
    getState: state,
    runCheck: function () {
      var panel = document.getElementById('xp-personal-home');
      var gamePanel = document.getElementById('xp-game-home');
      var learningStyle = document.querySelector('link[data-cnc-industrial-learning]');
      var recordsStyle = document.querySelector('link[data-cnc-industrial-records]');
      var gameStyle = document.querySelector('link[data-cnc-mobile-home-game]');
      var list = cards();
      var overview = document.getElementById('xp-training-overview');
      var st = state();
      return {
        passed: Boolean(panel && gamePanel && gamePanel.dataset.ready === 'true' && learningStyle && recordsStyle && gameStyle && list.length === 12 && followsTools() && overview && st.profile.version),
        build: BUILD,
        recordsBuild: RECORDS_BUILD,
        trainingBuild: TRAINING_BUILD,
        panel: Boolean(panel),
        gamePanel: Boolean(gamePanel),
        gameStyle: Boolean(gameStyle),
        trainingOverview: Boolean(overview),
        profileVersion: st.profile.version,
        studyCards: list.length,
        followsTools: followsTools(),
        recordsReady: Boolean(document.querySelector('#view-favorites[data-industrial-records="ready"]')),
        recordsObserver: false,
        state: st
      };
    }
  };
})();