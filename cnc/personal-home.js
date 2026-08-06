/*
 * 数控小潘：手机学习进度、12关课程图片、80个可展开小课与查询图片兼容层。
 * 不动态插入第二套首页，固定12关顺序不变。
 */
(function () {
  'use strict';

  var BUILD = '20260722b';
  var DEPTH_BUILD = '20260805-learning-depth1';
  var PROFILE_KEY = 'cnc_training_profile_v1';
  var DONE_KEY = 'cnc_study_completed_v1';
  var CURRENT_KEY = 'cnc_study_current_v1';
  var media = window.matchMedia('(max-width: 768px)');
  var queryObserver = null;
  var routeObserver = null;
  var routeSyncFrame = 0;
  var routeSyncTimer = 0;
  var depthPromise = null;

  var COURSES = [
    { id:'stage-1', title:'安全基础', file:'course-safety-foundation.html', reason:'先建立急停、进给保持、单段、倍率和上机前检查意识。', image:'./assets/images/batch02_operation_basics/machine-init-flow-001.webp', alt:'数控机床开机、自检、回零与安全确认流程演示图', caption:'先确认急停、模式、门锁和回零状态，再进行受控操作。' },
    { id:'stage-2', title:'认识加工中心', file:'course-machining-center-basics.html', reason:'认识主轴、工作台、刀库、防护门和三条直线轴。', image:'./assets/images/batch04_milling_tooling/milling-process-overview-001.webp', alt:'加工中心常见铣削工艺和机床工作区域演示图', caption:'认识主轴、工作台、刀库以及常见铣削工作区域。' },
    { id:'stage-3', title:'坐标轴与运动方向', file:'course-coordinate-axes.html', reason:'分清X、Y、Z正方向、机床坐标和工件坐标。', image:'./assets/images/batch01_core/beginner-machine-zero-vs-work-zero-001.webp', alt:'机床参考点、工件零点与坐标方向关系演示图', caption:'用机床参考点和工件零点的关系理解X、Y、Z运动方向。' },
    { id:'stage-4', title:'图纸、尺寸与基准', file:'course-drawing-basics.html', reason:'按形状、位置、精度读图，避免尺寸链和基准错误。', image:'./assets/images/batch01_core/measure-reading-set-001.webp', alt:'卡尺、千分尺和百分表对应图纸尺寸检测演示图', caption:'从尺寸、基准和量具对应关系入手读懂零件图。' },
    { id:'stage-5', title:'机床坐标与工件坐标', file:'course-machine-work-offset.html', reason:'分清机床的零与零件的零，理解G54和坐标偏置。', image:'./assets/images/batch05_alarm_drawing_material/dial-indicator-detail-001.webp', alt:'使用杠杆百分表找正工件和建立坐标基准的演示图', caption:'通过找正和偏置，把机床位置转换为工件坐标。' },
    { id:'stage-6', title:'工件装夹基础', file:'course-workholding-basics.html', reason:'同时检查定位、夹紧、支撑和刀具运动通道。', image:'./assets/images/batch04_milling_tooling/vise-clamping-basic-001.webp', alt:'平口钳、等高垫块和工件装夹找正演示图', caption:'定位、夹紧和刀具通道必须同时确认。' },
    { id:'stage-7', title:'刀具基础', file:'course-tool-basics.html', reason:'认识刀具类型、刀具材料、刀柄夹头和伸出量。', image:'./assets/images/batch04_milling_tooling/tool-selection-beginner-001.webp', alt:'立铣刀、球头刀和常见铣削刀具选用演示图', caption:'根据加工特征认识刀具类型和基本用途。' },
    { id:'stage-8', title:'对刀与刀长补偿', file:'course-tool-length-offset.html', reason:'把实物刀具、H号、刀长数据和程序调用连成一条链。', image:'./assets/images/batch04_milling_tooling/bt-er-holder-overview-001.webp', alt:'BT刀柄、ER夹头、刀具伸出量和刀长关系演示图', caption:'把实物刀具、刀柄、H号和程序调用连成一条链。' },
    { id:'stage-9', title:'G00与G01', file:'course-g00-g01-basics.html', reason:'分清G00快速定位与G01直线切削；G00移动路径通常不保证直线，必须结合本机说明、单段、空运行和低倍率受控验证。', image:'./assets/images/batch02_operation_basics/single-block-dry-run-001.webp', alt:'单段、空运行和低倍率验证G00与G01程序的演示图', caption:'快速定位与直线切削必须先用单段、空运行和低倍率验证。' },
    { id:'stage-10', title:'G02与G03', file:'course-g02-g03-basics.html', reason:'结合加工平面、方向、圆心和半径理解圆弧编程。', image:'./assets/images/batch04_milling_tooling/milling-contour-001.webp', alt:'轮廓圆弧切入切出和圆弧方向演示图', caption:'结合加工平面、圆弧方向和切向进退刀理解圆弧编程。' },
    { id:'stage-11', title:'孔加工循环', file:'course-hole-cycles.html', reason:'分清R平面、孔深、孔底动作、退刀方式和循环取消。', image:'./assets/images/batch02_operation_basics/canned-cycle-overview-001.webp', alt:'钻孔固定循环快速定位、进给、孔底动作和退刀演示图', caption:'分清R平面、孔深、孔底动作和返回方式。' },
    { id:'stage-12', title:'完整程序与首件验证', file:'course-complete-program-first-piece.html', reason:'把程序、装夹、空运行、试切、测量和放行串成闭环。', image:'./assets/images/batch05_alarm_drawing_material/first-piece-inspection-001.webp', alt:'完整程序试切后进行首件尺寸检测和记录的演示图', caption:'程序、装夹、空运行、试切和首件测量必须形成闭环。' }
  ];

  function read(key, fallback) {
    try {
      var value = JSON.parse(localStorage.getItem(key));
      return value == null ? fallback : value;
    } catch (error) {
      return fallback;
    }
  }

  function completedIds() {
    var profile = read(PROFILE_KEY, {});
    var stages = profile && Array.isArray(profile.completedStages) ? profile.completedStages.slice() : [];
    var legacy = read(DONE_KEY, []);
    if (Array.isArray(legacy)) {
      legacy.forEach(function (level) {
        var course = COURSES[Number(level) - 1];
        if (course && stages.indexOf(course.id) === -1) stages.push(course.id);
      });
    }
    return stages;
  }

  function progressState() {
    var done = completedIds();
    var nextIndex = COURSES.findIndex(function (course) { return done.indexOf(course.id) === -1; });
    if (nextIndex < 0) nextIndex = COURSES.length - 1;
    return {
      done: done,
      doneCount: COURSES.filter(function (course) { return done.indexOf(course.id) !== -1; }).length,
      nextIndex: nextIndex,
      next: COURSES[nextIndex]
    };
  }

  function removeLegacyHome() {
    ['xp-game-home', 'xp-personal-home'].forEach(function (id) {
      var node = document.getElementById(id);
      if (node) node.remove();
    });
    document.querySelectorAll('link[data-cnc-mobile-home-game]').forEach(function (node) { node.remove(); });
    if (document.body) document.body.classList.remove('cnc-game-home-enabled');
  }

  function forceStyle(node, name, value) {
    if (node) node.style.setProperty(name, value, 'important');
  }

  function syncBottomNav() {
    if (!document.body) return false;
    var nav = document.querySelector('body > .xp-bottom-nav');
    if (!nav || !media.matches) {
      document.body.classList.remove('cnc-mobile-nav-ready');
      return false;
    }
    nav.hidden = false;
    nav.removeAttribute('hidden');
    nav.removeAttribute('inert');
    nav.setAttribute('aria-hidden', 'false');
    delete nav.dataset.cncGameUtility;
    forceStyle(nav, 'position', 'fixed');
    forceStyle(nav, 'z-index', '920');
    forceStyle(nav, 'left', '0');
    forceStyle(nav, 'right', '0');
    forceStyle(nav, 'bottom', '0');
    forceStyle(nav, 'display', 'grid');
    forceStyle(nav, 'visibility', 'visible');
    forceStyle(nav, 'opacity', '1');
    forceStyle(nav, 'width', '100%');
    forceStyle(nav, 'height', 'calc(66px + env(safe-area-inset-bottom, 0px))');
    forceStyle(nav, 'min-height', 'calc(66px + env(safe-area-inset-bottom, 0px))');
    forceStyle(nav, 'grid-template-columns', 'repeat(5, minmax(0, 1fr))');
    forceStyle(nav, 'padding', '5px 5px env(safe-area-inset-bottom, 0px)');
    forceStyle(nav, 'border-top', '1px solid #dfe6ee');
    forceStyle(nav, 'background', 'rgba(255,255,255,.985)');
    forceStyle(nav, 'box-shadow', '0 -8px 24px rgba(25,42,67,.08)');
    forceStyle(nav, 'transform', 'none');
    forceStyle(nav, 'pointer-events', 'auto');
    document.body.classList.add('cnc-mobile-nav-ready');
    return nav.getBoundingClientRect().height > 0;
  }

  function refreshRouteState() {
    if (!media.matches) return false;
    removeLegacyHome();
    syncHomeProgress();
    var ready = syncBottomNav();
    installQueryImageObserver();
    primeQueryImages(document);
    return ready;
  }

  function scheduleRouteSync() {
    if (!media.matches) return;
    if (routeSyncFrame) window.cancelAnimationFrame(routeSyncFrame);
    if (routeSyncTimer) window.clearTimeout(routeSyncTimer);
    routeSyncFrame = window.requestAnimationFrame(function () {
      routeSyncFrame = window.requestAnimationFrame(function () {
        routeSyncFrame = 0;
        refreshRouteState();
      });
    });
    routeSyncTimer = window.setTimeout(function () {
      routeSyncTimer = 0;
      refreshRouteState();
    }, 120);
  }

  function installRouteObserver() {
    if (routeObserver) return true;
    var views = Array.from(document.querySelectorAll('.view'));
    if (!views.length) return false;
    routeObserver = new MutationObserver(function (records) {
      var routeChanged = records.some(function (record) {
        return record.type === 'attributes' && record.attributeName === 'class';
      });
      if (routeChanged) scheduleRouteSync();
    });
    views.forEach(function (view) {
      routeObserver.observe(view, { attributes: true, attributeFilter: ['class'] });
    });
    return true;
  }

  function primeQueryImages(root) {
    var scope = root && root.querySelectorAll ? root : document;
    var images = scope.querySelectorAll('#view-workspace .result-card.has-thumb .result-thumb img');
    images.forEach(function (image) {
      image.loading = 'eager';
      image.decoding = 'async';
      try { image.fetchPriority = 'high'; } catch (error) {}
      if (!image.dataset.cncDecodeTracked) {
        image.dataset.cncDecodeTracked = 'true';
        image.addEventListener('error', function () {
          var thumb = image.closest('.result-thumb');
          if (thumb) thumb.setAttribute('data-image-error', 'true');
        }, { once: true });
      }
      if (typeof image.decode === 'function') image.decode().catch(function () {});
    });
    return images.length;
  }

  function installQueryImageObserver() {
    var resultList = document.getElementById('result-list');
    if (!resultList) return false;
    if (!queryObserver) {
      queryObserver = new MutationObserver(function () {
        window.requestAnimationFrame(function () { primeQueryImages(resultList); });
      });
      queryObserver.observe(resultList, { childList: true, subtree: true });
    }
    primeQueryImages(resultList);
    return true;
  }

  function ensureDepthAssets() {
    if (window.CNC_LEARNING_SUBLESSONS && window.CNC_LEARNING_SUBLESSONS.version === DEPTH_BUILD) {
      return Promise.resolve(window.CNC_LEARNING_SUBLESSONS);
    }
    if (depthPromise) return depthPromise;

    var style = document.querySelector('link[data-cnc-learning-depth]');
    if (!style) {
      style = document.createElement('link');
      style.rel = 'stylesheet';
      style.href = './learning-depth.css?v=20260805a';
      style.dataset.cncLearningDepth = 'true';
      document.head.appendChild(style);
    }

    depthPromise = new Promise(function (resolve, reject) {
      var script = document.querySelector('script[data-cnc-learning-depth]');
      if (!script) {
        script = document.createElement('script');
        script.src = './learning-sublesson-catalog.js?v=20260805a';
        script.async = true;
        script.dataset.cncLearningDepth = 'true';
        document.head.appendChild(script);
      }
      if (window.CNC_LEARNING_SUBLESSONS) {
        resolve(window.CNC_LEARNING_SUBLESSONS);
        return;
      }
      script.addEventListener('load', function () { resolve(window.CNC_LEARNING_SUBLESSONS); }, { once: true });
      script.addEventListener('error', function () { reject(new Error('learning catalog load failed')); }, { once: true });
    });
    return depthPromise;
  }

  function syncLearningContent() {
    var content = window.CNC_LEARNING_CONTENT;
    if (!content || !content.lessons) return;
    COURSES.forEach(function (course, index) {
      var lesson = content.lessons[index + 1] || content.lessons[String(index + 1)];
      if (!lesson) return;
      lesson.imageCards = [{ src: course.image, title: course.title + '演示', desc: course.caption, alt: course.alt, loading: 'lazy' }];
    });
    window.CNC_LEARNING_IMAGE_CARDS = COURSES.map(function (course, index) {
      return { level: index + 1, src: course.image, title: course.title, desc: course.caption, alt: course.alt };
    });
    document.dispatchEvent(new CustomEvent('cnc:learning-images-ready', { detail: { build: BUILD, count: COURSES.length } }));
  }

  function syncStageHeaders() {
    var labels = [
      '基础认知与坐标',
      '坐标、装夹与刀具',
      '刀补与基础编程',
      '完整程序与首件'
    ];
    document.querySelectorAll('#view-study .stage-header').forEach(function (header, index) {
      var title = header.querySelector('h4');
      if (title && labels[index]) title.textContent = labels[index];
    });
  }

  function buildSublessonPanel(level, course, items) {
    var details = document.createElement('details');
    details.className = 'cnc-sublesson-panel';
    details.dataset.stage = String(level);
    var summary = document.createElement('summary');
    summary.innerHTML = '<span>本关 <b>' + items.length + '</b> 个小课</span><span class="cnc-learning-depth-badge">共80课</span>';
    details.appendChild(summary);

    var list = document.createElement('ol');
    list.className = 'cnc-sublesson-list';
    items.forEach(function (item, index) {
      var row = document.createElement('li');
      var link = document.createElement('a');
      link.className = 'cnc-sublesson-link';
      link.href = './learning-detail.html?stage=' + level + '&lesson=' + encodeURIComponent(item.id);
      link.innerHTML =
        '<span class="cnc-sublesson-index">' + level + '.' + (index + 1) + '</span>' +
        '<span class="cnc-sublesson-copy"><strong>' + item.title + '</strong><small>' + item.summary + '</small></span>' +
        '<span class="cnc-sublesson-arrow">›</span>';
      row.appendChild(link);
      list.appendChild(row);
    });
    details.appendChild(list);
    details.addEventListener('click', function (event) { event.stopPropagation(); });
    return details;
  }

  function renderLearningDepth(catalog) {
    if (!catalog || !catalog.stages || !media.matches) return false;
    syncStageHeaders();
    document.querySelectorAll('#view-study .study-card[data-level]').forEach(function (card) {
      var level = Number(card.dataset.level);
      var course = COURSES[level - 1];
      var items = catalog.stages[String(level)] || [];
      if (!course || !items.length) return;

      var heading = card.querySelector('h4');
      var description = card.querySelector('p');
      var badge = card.querySelector('.study-card-badge');
      var time = card.querySelector('.study-card-time');
      if (heading) heading.textContent = course.title;
      if (description) description.textContent = course.reason;
      if (badge) badge.textContent = '第 ' + level + ' 关';
      if (time) time.textContent = '📚 ' + items.length + '个小课';

      var old = card.querySelector('.cnc-sublesson-panel');
      if (old) old.remove();
      card.appendChild(buildSublessonPanel(level, course, items));
      card.dataset.sublessonCount = String(items.length);
      card.dataset.courseFile = course.file;
    });
    if (document.body) document.body.dataset.cncLearningDepthBuild = DEPTH_BUILD;
    document.dispatchEvent(new CustomEvent('cnc:learning-depth-ready', {
      detail: { build: DEPTH_BUILD, stages: 12, sublessons: catalog.totalSublessons }
    }));
    return true;
  }

  function syncStudyCards() {
    var mobile = media.matches;
    document.querySelectorAll('#view-study .study-card[data-level]').forEach(function (card) {
      var index = Number(card.dataset.level) - 1;
      var course = COURSES[index];
      if (!course) return;
      var old = card.querySelector('.study-card-thumb');
      if (!mobile) {
        if (old) old.remove();
        var panel = card.querySelector('.cnc-sublesson-panel');
        if (panel) panel.remove();
        return;
      }
      var image = old || document.createElement('img');
      image.className = 'study-card-thumb';
      image.src = course.image;
      image.alt = course.alt;
      image.loading = 'lazy';
      image.decoding = 'async';
      image.width = 328;
      image.height = 220;
      image.dataset.lessonImage = String(index + 1);
      if (!old) card.insertBefore(image, card.firstChild);
      card.setAttribute('aria-label', '第' + (index + 1) + '关：' + course.title + '。' + course.caption);
      card.dataset.courseFile = course.file;
      if (card.dataset.cncProgressBound !== 'true') {
        card.dataset.cncProgressBound = 'true';
        card.addEventListener('click', function () {
          try {
            localStorage.setItem(CURRENT_KEY, JSON.stringify({
              level: index + 1,
              title: course.title,
              file: course.file,
              updatedAt: new Date().toISOString()
            }));
          } catch (error) {}
        });
      }
    });
  }

  function syncHomeProgress() {
    if (!media.matches) return;
    var state = progressState();
    var primary = document.querySelector('#view-dashboard .cnc-home-primary');
    var eyebrow = document.querySelector('#view-dashboard .cnc-home-eyebrow');
    var firstCapability = document.querySelector('#view-dashboard .cnc-home-capabilities li:first-child');
    if (primary) {
      primary.href = './' + state.next.file;
      primary.setAttribute('aria-label', '继续学习第' + (state.nextIndex + 1) + '关：' + state.next.title);
      primary.dataset.nextCourse = String(state.nextIndex + 1);
    }
    if (eyebrow) eyebrow.textContent = '当前学习 · 第' + (state.nextIndex + 1) + '关';
    if (firstCapability) {
      var strong = firstCapability.querySelector('strong');
      var label = firstCapability.querySelector('span');
      if (strong) strong.textContent = state.doneCount + '/12';
      if (label) label.textContent = state.doneCount ? '已完成课程' : '从第1关开始';
    }
  }

  function runCheck() {
    var images = Array.from(document.querySelectorAll('#view-study .study-card-thumb'));
    var visibleImages = images.filter(function (image) { return image.getClientRects().length > 0; });
    var queryImages = Array.from(document.querySelectorAll('#view-workspace .result-card.has-thumb img'));
    var legacy = document.querySelector('#xp-game-home,#xp-personal-home');
    var nav = document.querySelector('body > .xp-bottom-nav');
    var panels = Array.from(document.querySelectorAll('#view-study .cnc-sublesson-panel'));
    var sublessonLinks = Array.from(document.querySelectorAll('#view-study .cnc-sublesson-link'));
    return {
      build: BUILD,
      depthBuild: document.body ? document.body.dataset.cncLearningDepthBuild || '' : '',
      mobile: media.matches,
      legacyHomeRemoved: !legacy,
      courseImages: images.length,
      visibleCourseImages: visibleImages.length,
      decodedImages: visibleImages.filter(function (image) { return image.complete && image.naturalWidth > 0; }).length,
      queryImages: queryImages.length,
      decodedQueryImages: queryImages.filter(function (image) { return image.complete && image.naturalWidth > 0; }).length,
      bottomNavReady: Boolean(nav && nav.getBoundingClientRect().height > 0),
      depthPanels: panels.length,
      sublessonLinks: sublessonLinks.length,
      nextCourse: progressState().next.file
    };
  }

  function syncQuickSearchAccessibility() {
    var input = document.getElementById('quick-search-input');
    if (input && !input.getAttribute('aria-label')) {
      input.setAttribute('aria-label', '快速搜索G代码、报警号和现场关键词');
    }
    return Boolean(input && input.getAttribute('aria-label'));
  }

  function boot() {
    syncQuickSearchAccessibility();
    removeLegacyHome();
    syncLearningContent();
    syncStudyCards();
    syncHomeProgress();
    syncBottomNav();
    installRouteObserver();
    installQueryImageObserver();
    ensureDepthAssets().then(renderLearningDepth).catch(function (error) {
      console.error('[CNC学习深度] ' + error.message);
    });
    [60, 120, 240, 480, 900, 1600, 2600, 4200].forEach(function (delay) {
      window.setTimeout(function () {
        syncBottomNav();
        installQueryImageObserver();
        primeQueryImages(document);
        if (window.CNC_LEARNING_SUBLESSONS) renderLearningDepth(window.CNC_LEARNING_SUBLESSONS);
      }, delay);
    });
    if (document.body) document.body.dataset.cncMobileHomeBuild = '20260804-mobile1';
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();

  media.addEventListener('change', function () {
    removeLegacyHome();
    syncStudyCards();
    syncHomeProgress();
    syncBottomNav();
    installRouteObserver();
    primeQueryImages(document);
    if (window.CNC_LEARNING_SUBLESSONS) renderLearningDepth(window.CNC_LEARNING_SUBLESSONS);
  });
  window.addEventListener('pageshow', boot);
  window.addEventListener('hashchange', scheduleRouteSync);
  document.addEventListener('cnc:route-changed', function () {
    scheduleRouteSync();
    window.setTimeout(function () {
      primeQueryImages(document);
      if (window.CNC_LEARNING_SUBLESSONS) renderLearningDepth(window.CNC_LEARNING_SUBLESSONS);
    }, 0);
  });

  window.CNC_PERSONAL_HOME = {
    build: BUILD,
    refactorBuild: '20260804-mobile1',
    depthBuild: DEPTH_BUILD,
    courses: COURSES,
    refresh: boot,
    refreshRoute: scheduleRouteSync,
    primeQueryImages: primeQueryImages,
    renderLearningDepth: renderLearningDepth,
    runCheck: runCheck
  };
})();
