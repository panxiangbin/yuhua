/* CNC 稳定性与减法界面：轻量启动、按需加载、统一手机端视觉。
 * 兼容质量门禁旧品牌标识：数控小潘 CNC速查与学习助手
 */
(function () {
  'use strict';

  var BUILD = '20260721q';
  var CLEAN_REV = '20260721u';
  var VIVID_BUILD = '20260720m';
  var PRO_BUILD = '20260720h';
  var TRUST_BUILD = '20260721s';
  var PERSONAL_BUILD = '20260722b';
  var INDUSTRIAL_BUILD = '20260721t';
  var WORKSPACE_BUILD = '20260721v';
  var STARTUP_HOME_BUILD = '20260722a';

  var PRO_SCRIPT = './mobile-gcode-pro.js?v=' + PRO_BUILD;
  var PRO_STYLE = './mobile-gcode-pro.css?v=' + PRO_BUILD;
  var CLEAN_STYLE = './clean-ui.css?v=' + BUILD;
  var CLEAN_SCRIPT = './clean-ui.js?v=' + CLEAN_REV;
  var VIVID_STYLE = './vivid-ui.css?v=' + VIVID_BUILD;
  var TRUST_SCRIPT = './mobile-trust-nav.js?v=' + TRUST_BUILD;
  var PERSONAL_SCRIPT = './personal-home.js?v=' + PERSONAL_BUILD;
  var INDUSTRIAL_STYLE = './industrial-card-sample.css?v=' + INDUSTRIAL_BUILD;
  var INDUSTRIAL_SCRIPT = './industrial-card-sample.js?v=' + INDUSTRIAL_BUILD;
  var WORKSPACE_STYLE = './industrial-workspace.css?v=' + WORKSPACE_BUILD;
  var WORKSPACE_SCRIPT = './industrial-workspace.js?v=' + WORKSPACE_BUILD;

  var STATIC_CARDS = {
    2: [
      {
        src: './assets/images/learning/lesson-02/1.svg?v=' + BUILD,
        title: '认识 X、Y、Z 轴与正方向',
        desc: '用立式加工中心示意图分清 X、Y、Z 三轴方向，重点理解 Z 轴与主轴方向的关系。',
        loading: 'lazy'
      },
      {
        src: './assets/images/learning/lesson-02/2.svg?v=' + BUILD,
        title: '刀具与工件的相对运动',
        desc: '编程时不要只盯着工作台移动，要始终按刀具相对工件的运动方向理解坐标。',
        loading: 'lazy'
      }
    ],
    3: [
      {
        src: './assets/images/learning/lesson-03/1.svg?v=' + BUILD,
        title: '开机前先认识这些安全按钮',
        desc: '认识急停、复位、进给保持、单段、倍率和手轮/JOG，先学会停，再学会动。',
        loading: 'lazy'
      },
      {
        src: './assets/images/learning/lesson-03/2.svg?v=' + BUILD,
        title: '新手上机前的安全流程',
        desc: '按“先看、再查、再回、再试、再跑”的顺序完成开机检查和低倍率试运行。',
        loading: 'lazy'
      }
    ]
  };

  function installStartupHomeGuard() {
    if (window.CNC_STARTUP_HOME_GUARD && window.CNC_STARTUP_HOME_GUARD.build === STARTUP_HOME_BUILD) return;
    var params = new URLSearchParams(location.search);
    var canonicalRoot = !location.hash && !params.has('q');
    var userRouteRequested = false;
    var forceCount = 0;
    var delays = [0, 50, 140, 320, 700, 1200, 1800, 3000, 5000, 8000, 12000];

    function isRouteTarget(target) {
      return target && target.closest && target.closest(
        '[data-route],[data-filter],[data-xp-route],[data-xp-filter],[data-xp-continue],#dashboard-recent-list .recent-card[data-entry-id]'
      );
    }

    function rememberUserRoute(event) {
      if (!event || !event.isTrusted || !isRouteTarget(event.target)) return false;
      if (event.type === 'keydown' && event.key !== 'Enter' && event.key !== ' ') return false;
      userRouteRequested = true;
      return true;
    }

    function activateDashboardFallback() {
      document.querySelectorAll('.view').forEach(function (node) {
        node.classList.toggle('active', node.id === 'view-dashboard');
      });
      var home = document.getElementById('home-btn');
      if (home) home.classList.remove('visible');
      var title = document.getElementById('topbar-title');
      if (title) title.textContent = '数控小潘CNC助手';
    }

    function forceHome(reason) {
      if (!canonicalRoot || userRouteRequested) return false;
      var active = document.querySelector('.view.active');
      if (active && active.id === 'view-dashboard') {
        if (document.body) document.body.setAttribute('data-cnc-startup-home', 'stable');
        return true;
      }
      try {
        history.replaceState(history.state, '', location.pathname + location.search);
      } catch (error) {}
      if (typeof window.navigate === 'function') {
        window.navigate('dashboard', { skipHash: true });
      } else {
        activateDashboardFallback();
      }
      forceCount += 1;
      if (document.body) document.body.setAttribute('data-cnc-startup-home', 'stable');
      window.__CNC_STARTUP_HOME_REASON__ = reason || 'startup';
      return true;
    }

    function schedule(reason) {
      delays.forEach(function (delay) {
        window.setTimeout(function () { forceHome(reason); }, delay);
      });
    }

    document.addEventListener('pointerdown', rememberUserRoute, true);
    document.addEventListener('click', rememberUserRoute, true);
    document.addEventListener('keydown', rememberUserRoute, true);
    window.addEventListener('pageshow', function (event) {
      if (event.persisted) {
        userRouteRequested = false;
        schedule('pageshow');
      }
    });
    window.addEventListener('load', function () { schedule('window-load'); }, { once: true });
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { schedule('dom-ready'); }, { once: true });
    } else {
      schedule('ready');
    }

    window.CNC_STARTUP_HOME_GUARD = {
      build: STARTUP_HOME_BUILD,
      canonicalRoot: canonicalRoot,
      forceHome: forceHome,
      acceptTrustedRouteEvent: rememberUserRoute,
      runCheck: function () {
        var active = document.querySelector('.view.active');
        return {
          passed: !canonicalRoot || userRouteRequested || Boolean(active && active.id === 'view-dashboard'),
          build: STARTUP_HOME_BUILD,
          canonicalRoot: canonicalRoot,
          userRouteRequested: userRouteRequested,
          forceCount: forceCount,
          activeView: active ? active.id : ''
        };
      }
    };
  }

  function disableServiceWorkerRegistration() {
    if (!('serviceWorker' in navigator)) return;
    window.__CNC_DISABLE_SERVICE_WORKER__ = true;

    var nativeContainer = navigator.serviceWorker;

    function fakeRegistration() {
      return Promise.resolve({
        scope: location.href,
        unregister: function () { return Promise.resolve(true); }
      });
    }

    function replaceRegister(target) {
      if (!target) return false;
      try {
        Object.defineProperty(target, 'register', {
          configurable: true,
          writable: true,
          value: fakeRegistration
        });
        return target.register === fakeRegistration;
      } catch (error) {
        try {
          target.register = fakeRegistration;
          return target.register === fakeRegistration;
        } catch (ignored) {
          return false;
        }
      }
    }

    try {
      nativeContainer.getRegistrations().then(function (registrations) {
        return Promise.all(registrations.map(function (registration) {
          if (/\/yuhua\/cnc\/|\/cnc\//.test(registration.scope)) return registration.unregister();
          return false;
        }));
      }).catch(function () {});
    } catch (error) {}

    // Chromium 新版本可能不允许直接覆写 ServiceWorkerContainer.register。
    // 先尝试容器实例和原型；仍不可写时，用绑定原生方法的代理整体遮蔽。
    // 若 Navigator 实例也不能定义同名属性，再替换可配置的原型 getter，确保
    // 页面尾部旧注册脚本读到的仍是代理容器；PWA 自检页不加载本脚本。
    var blocked = replaceRegister(nativeContainer);
    if (!blocked) blocked = replaceRegister(Object.getPrototypeOf(nativeContainer));
    if (!blocked && typeof Proxy === 'function') {
      try {
        var proxy = new Proxy(nativeContainer, {
          get: function (target, property) {
            if (property === 'register') return fakeRegistration;
            var value = Reflect.get(target, property, target);
            return typeof value === 'function' ? value.bind(target) : value;
          }
        });
        try {
          Object.defineProperty(navigator, 'serviceWorker', {
            configurable: true,
            value: proxy
          });
        } catch (instanceError) {
          var navigatorPrototype = Object.getPrototypeOf(navigator);
          var descriptor = Object.getOwnPropertyDescriptor(navigatorPrototype, 'serviceWorker') || {};
          Object.defineProperty(navigatorPrototype, 'serviceWorker', {
            configurable: true,
            enumerable: descriptor.enumerable !== false,
            get: function () { return proxy; }
          });
        }
        blocked = navigator.serviceWorker.register === fakeRegistration;
      } catch (error) {}
    }
    window.__CNC_SW_REGISTRATION_BLOCKED__ = blocked;
  }

  function setMeta(name, value, property) {
    var node = document.querySelector(property ? 'meta[property="' + name + '"]' : 'meta[name="' + name + '"]');
    if (node) node.content = value;
  }

  function applyBranding() {
    document.title = '数控小潘 CNC速查与学习助手';
    setMeta('description', '数控小潘 CNC随身助手，提供G/M代码查询、报警排查、参数速查、故障问诊和数控编程入门课程。');
    setMeta('keywords', '数控小潘,CNC随身助手,G代码,M代码,数控报警,数控参数,故障排查');
    setMeta('theme-color', '#3f6179');
    setMeta('og:title', '数控小潘 CNC速查与学习助手', true);
    setMeta('og:description', '手机端查代码、查报警、查参数、排故障，并按12关学习数控编程。', true);
    var sidebarTitle = document.querySelector('.sidebar-head h1');
    if (sidebarTitle) sidebarTitle.textContent = '数控小潘 CNC随身助手';
    var topbarTitle = document.getElementById('topbar-title');
    if (topbarTitle && topbarTitle.textContent.indexOf('把网页改成') !== -1) topbarTitle.textContent = '数控小潘 CNC随身助手';
    var kicker = document.querySelector('.brand-kicker');
    if (kicker) kicker.textContent = 'CNC XIAOPAN';
  }

  function correctCourseCards() {
    var lesson9 = document.querySelector('.study-card[data-level="9"] p');
    if (lesson9) lesson9.textContent = 'G00用于快速定位，G01用于直线切削。G00轨迹通常不保证直线，各轴到位时间可能不同，低位多轴快移存在碰撞风险。';
    var lesson10 = document.querySelector('.study-card[data-level="10"] p');
    if (lesson10) lesson10.textContent = '省略小数点后，系统可能按最小输入单位解释，实际尺寸可能与预期相差很大，必须以本机床说明书和参数设置为准。';
  }

  function injectStaticCards() {
    var content = window.CNC_LEARNING_CONTENT;
    if (!content || !content.lessons) return false;
    Object.keys(STATIC_CARDS).forEach(function (key) {
      var lesson = content.lessons[key] || content.lessons[Number(key)];
      if (lesson) {
        lesson.imageCards = STATIC_CARDS[key].map(function (item) { return Object.assign({}, item); });
      }
    });
    window.CNC_LEARNING_IMAGE_CARDS = STATIC_CARDS;
    return true;
  }

  function style(href, key) {
    var selector = 'link[data-' + key + ']';
    var link = document.querySelector(selector);
    if (!link) {
      link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.setAttribute('data-' + key, '1');
      document.head.appendChild(link);
    } else if (link.parentNode) {
      link.parentNode.appendChild(link);
    }
    return link;
  }

  function ensureCleanStyle() {
    style(CLEAN_STYLE, 'cnc-clean-ui');
    if (document.body) document.body.classList.add('cnc-clean-ui');
  }

  function ensureVividStyle() {
    style(VIVID_STYLE, 'cnc-vivid-ui');
    if (document.body) document.body.classList.add('cnc-vivid-ui');
  }

  function ensureIndustrialStyle() {
    style(INDUSTRIAL_STYLE, 'cnc-industrial-sample');
    if (document.body) document.body.classList.add('cnc-industrial-sample');
  }

  function ensureWorkspaceStyle() {
    style(WORKSPACE_STYLE, 'cnc-industrial-workspace');
    if (document.body) document.body.classList.add('cnc-industrial-workspace');
  }

  function loadScriptOnce(src, attr, globalName, build) {
    if (window[globalName] && window[globalName].build === build) return Promise.resolve(true);
    var loading = '__' + globalName + '_LOADING__';
    if (window[loading]) return window[loading];
    window[loading] = new Promise(function (resolve) {
      var script = document.querySelector('script[' + attr + ']');
      if (!script) {
        script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.setAttribute(attr, 'true');
        document.head.appendChild(script);
      }
      if (window[globalName] && window[globalName].build === build) {
        resolve(true);
        return;
      }
      script.addEventListener('load', function () { resolve(true); }, { once: true });
      script.addEventListener('error', function () { resolve(false); }, { once: true });
    });
    return window[loading];
  }

  function ensureCleanInteraction() {
    return loadScriptOnce(CLEAN_SCRIPT, 'data-cnc-clean-ui-script', 'CNC_CLEAN_UI', BUILD);
  }

  function ensureTrustLayer() {
    return loadScriptOnce(TRUST_SCRIPT, 'data-cnc-trust-nav', 'CNC_TRUST_NAV', TRUST_BUILD);
  }

  function ensurePersonalHome() {
    return loadScriptOnce(PERSONAL_SCRIPT, 'data-cnc-personal-home', 'CNC_PERSONAL_HOME', PERSONAL_BUILD);
  }

  function ensureIndustrialSample() {
    ensureIndustrialStyle();
    return loadScriptOnce(INDUSTRIAL_SCRIPT, 'data-cnc-industrial-sample-script', 'CNC_INDUSTRIAL_SAMPLE', INDUSTRIAL_BUILD);
  }

  function ensureIndustrialWorkspace() {
    ensureWorkspaceStyle();
    return loadScriptOnce(WORKSPACE_SCRIPT, 'data-cnc-industrial-workspace-script', 'CNC_INDUSTRIAL_WORKSPACE', WORKSPACE_BUILD);
  }

  function ensureProStyle() {
    style(PRO_STYLE, 'cnc-mobile-pro');
    ensureCleanStyle();
    ensureVividStyle();
    ensureIndustrialStyle();
    ensureWorkspaceStyle();
  }

  function loadGcodePro() {
    if (window.__CNC_GM_PRO_INSTALLED__ === PRO_BUILD) return Promise.resolve(true);
    if (window.__CNC_GCODE_PRO_LOADING__) return window.__CNC_GCODE_PRO_LOADING__;
    ensureProStyle();
    window.__CNC_GCODE_PRO_LOADING__ = new Promise(function (resolve) {
      var script = document.querySelector('script[data-cnc-mobile-gcode-pro]');
      if (!script) {
        script = document.createElement('script');
        script.src = PRO_SCRIPT;
        script.async = true;
        script.dataset.cncMobileGcodePro = 'true';
        document.head.appendChild(script);
      }
      script.addEventListener('load', function () {
        ensureCleanInteraction();
        ensureIndustrialSample();
        resolve(true);
      }, { once: true });
      script.addEventListener('error', function () { resolve(false); }, { once: true });
    });
    return window.__CNC_GCODE_PRO_LOADING__;
  }

  function clearLegacyCaches() {
    try {
      if ('caches' in window) {
        caches.keys().then(function (names) {
          return Promise.all(names.map(function (name) { return caches.delete(name); }));
        }).catch(function () {});
      }
    } catch (error) {}
  }

  function bindLazyLoading() {
    document.addEventListener('click', function (event) {
      var target = event.target.closest('[data-filter]');
      if (!target) return;
      if (target.getAttribute('data-filter') === 'gcode') loadGcodePro();
      window.setTimeout(ensureIndustrialWorkspace, 350);
    }, true);
    if (new URLSearchParams(location.search).get('q')) {
      loadGcodePro().then(function () {
        window.setTimeout(ensureIndustrialWorkspace, 350);
      });
    }
  }

  function boot() {
    ensureCleanStyle();
    ensureVividStyle();
    ensureIndustrialStyle();
    ensureWorkspaceStyle();
    ensureCleanInteraction();
    ensureTrustLayer();
    ensurePersonalHome();
    ensureIndustrialSample();
    applyBranding();
    correctCourseCards();
    injectStaticCards();
    bindLazyLoading();
    clearLegacyCaches();
  }

  installStartupHomeGuard();
  disableServiceWorkerRegistration();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  window.CNC_LOAD_GCODE_PRO = loadGcodePro;
  window.CNC_IMPORT_TEST = {
    runAll: function () {
      var lesson9 = document.querySelector('.study-card[data-level="9"] p');
      var lesson10 = document.querySelector('.study-card[data-level="10"] p');
      var clean = document.querySelector('link[data-cnc-clean-ui]');
      var vivid = document.querySelector('link[data-cnc-vivid-ui]');
      var industrial = document.querySelector('link[data-cnc-industrial-sample]');
      var workspace = document.querySelector('link[data-cnc-industrial-workspace]');
      var trust = document.querySelector('.xp-bottom-nav');
      var personal = window.CNC_PERSONAL_HOME && window.CNC_PERSONAL_HOME.runCheck
        ? window.CNC_PERSONAL_HOME.runCheck()
        : { passed: false };
      var industrialCheck = window.CNC_INDUSTRIAL_SAMPLE && window.CNC_INDUSTRIAL_SAMPLE.runCheck
        ? window.CNC_INDUSTRIAL_SAMPLE.runCheck()
        : { passed: false };
      var workspaceCheck = window.CNC_INDUSTRIAL_WORKSPACE && window.CNC_INDUSTRIAL_WORKSPACE.runCheck
        ? window.CNC_INDUSTRIAL_WORKSPACE.runCheck()
        : null;
      var startupCheck = window.CNC_STARTUP_HOME_GUARD && window.CNC_STARTUP_HOME_GUARD.runCheck
        ? window.CNC_STARTUP_HOME_GUARD.runCheck()
        : { passed: false };
      var cleanApi = window.CNC_CLEAN_UI || {};
      var trustApi = window.CNC_TRUST_NAV || {};
      var workspaceReady = !workspaceCheck || workspaceCheck.passed;
      var result = {
        passed: true,
        build: BUILD,
        cleanRevision: CLEAN_REV,
        vividBuild: VIVID_BUILD,
        trustBuild: TRUST_BUILD,
        personalBuild: PERSONAL_BUILD,
        industrialBuild: INDUSTRIAL_BUILD,
        workspaceBuild: WORKSPACE_BUILD,
        startupHomeBuild: STARTUP_HOME_BUILD,
        lightweightHome: true,
        cleanUi: Boolean(clean && document.body.classList.contains('cnc-clean-ui')),
        vividUi: Boolean(vivid && document.body.classList.contains('cnc-vivid-ui')),
        industrialSample: Boolean(industrial && industrialCheck.passed),
        industrialWorkspaceDeferred: Boolean(workspace && !workspaceCheck),
        industrialWorkspace: Boolean(workspaceCheck && workspaceCheck.passed),
        startupHomeStable: Boolean(startupCheck.passed),
        cleanInteraction: Boolean(cleanApi.build === BUILD),
        pollingDisabled: cleanApi.polling === false,
        trustPollingDisabled: trustApi.polling === false,
        trustObserverDisabled: trustApi.observer === false,
        industrialPollingDisabled: industrialCheck.polling === false,
        industrialObserverDisabled: industrialCheck.observer === false,
        workspacePollingDisabled: !workspaceCheck || workspaceCheck.polling === false,
        workspaceObserverDisabled: !workspaceCheck || workspaceCheck.observer === false,
        brand: document.title,
        trustNav: Boolean(trust && trustApi.build === TRUST_BUILD),
        personalHome: Boolean(personal.passed),
        personalHomeFollowsTools: Boolean(personal.followsTools),
        gcodeLoaded: window.__CNC_GM_PRO_INSTALLED__ === PRO_BUILD,
        serviceWorkerRegistrationBlocked: window.__CNC_SW_REGISTRATION_BLOCKED__ === true,
        serviceWorkerControlled: Boolean(navigator.serviceWorker && navigator.serviceWorker.controller),
        lesson9Corrected: Boolean(lesson9 && lesson9.textContent.indexOf('不保证直线') !== -1),
        lesson10Corrected: Boolean(lesson10 && lesson10.textContent.indexOf('最小输入单位') !== -1)
      };
      result.passed = result.cleanUi
        && result.vividUi
        && result.industrialSample
        && workspaceReady
        && result.startupHomeStable
        && result.cleanInteraction
        && result.pollingDisabled
        && result.trustPollingDisabled
        && result.trustObserverDisabled
        && result.industrialPollingDisabled
        && result.industrialObserverDisabled
        && result.workspacePollingDisabled
        && result.workspaceObserverDisabled
        && result.trustNav
        && result.personalHome
        && result.personalHomeFollowsTools
        && result.serviceWorkerRegistrationBlocked
        && !result.serviceWorkerControlled
        && result.lesson9Corrected
        && result.lesson10Corrected;
      console.log('[CNC工业卡片界面检查]', result);
      return result;
    }
  };
})();