/* CNC 稳定性第一阶段：轻量启动、按需加载、品牌与安全文案修正。 */
(function () {
  'use strict';

  var BUILD = '20260720j';
  var PRO_BUILD = '20260720h';
  var PRO_SCRIPT = './mobile-gcode-pro.js?v=' + PRO_BUILD;
  var PRO_STYLE = './mobile-gcode-pro.css?v=' + PRO_BUILD;
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

  function disableServiceWorkerRegistration() {
    if (!('serviceWorker' in navigator)) return;

    try {
      navigator.serviceWorker.getRegistrations().then(function (registrations) {
        registrations.forEach(function (registration) {
          if (registration.scope.indexOf('/yuhua/cnc/') !== -1 || registration.scope.indexOf('/cnc/') !== -1) {
            registration.unregister();
          }
        });
      }).catch(function () {});
    } catch (error) {
      console.warn('[CNC稳定版] 注销旧 Service Worker 失败', error);
    }

    try {
      Object.defineProperty(navigator.serviceWorker, 'register', {
        configurable: true,
        value: function () {
          return Promise.resolve({
            scope: window.location.href,
            unregister: function () { return Promise.resolve(true); }
          });
        }
      });
    } catch (error) {
      try {
        navigator.serviceWorker.register = function () {
          return Promise.resolve({
            scope: window.location.href,
            unregister: function () { return Promise.resolve(true); }
          });
        };
      } catch (ignored) {}
    }
  }

  function setMeta(name, value, propertyMode) {
    var selector = propertyMode ? 'meta[property="' + name + '"]' : 'meta[name="' + name + '"]';
    var node = document.querySelector(selector);
    if (node) node.setAttribute('content', value);
  }

  function applyBranding() {
    document.title = '数控小潘 CNC速查与学习助手';
    setMeta('description', '数控小潘CNC速查与学习助手，提供G/M代码查询、报警排查、参数换算和数控编程入门课程。');
    setMeta('keywords', '数控小潘,CNC速查,G代码,M代码,数控报警,数控编程入门');
    setMeta('og:title', '数控小潘 CNC速查与学习助手', true);
    setMeta('og:description', '手机端快速查询G/M代码、报警和参数，并按12关学习数控编程。', true);

    var sidebarTitle = document.querySelector('.sidebar-head h1');
    if (sidebarTitle) sidebarTitle.textContent = '数控小潘 CNC助手';

    var topbarTitle = document.getElementById('topbar-title');
    if (topbarTitle && topbarTitle.textContent.indexOf('把网页改成') !== -1) {
      topbarTitle.textContent = '数控小潘 CNC助手';
    }

    var brandKicker = document.querySelector('.brand-kicker');
    if (brandKicker) brandKicker.textContent = 'CNC XIAOPAN';
  }

  function correctCourseCards() {
    var lesson9 = document.querySelector('.study-card[data-level="9"] p');
    if (lesson9) {
      lesson9.textContent = 'G00用于快速定位，G01用于直线切削。G00轨迹通常不保证直线，各轴到位时间可能不同，低位多轴快移存在碰撞风险。';
    }

    var lesson10 = document.querySelector('.study-card[data-level="10"] p');
    if (lesson10) {
      lesson10.textContent = '省略小数点后，系统可能按最小输入单位解释，实际尺寸可能与预期相差很大，必须以本机床说明书和参数设置为准。';
    }
  }

  function injectStaticCards() {
    var content = window.CNC_LEARNING_CONTENT;
    if (!content || !content.lessons) return false;
    Object.keys(STATIC_CARDS).forEach(function (key) {
      var lesson = content.lessons[key] || content.lessons[Number(key)];
      if (lesson) {
        lesson.imageCards = STATIC_CARDS[key].map(function (card) {
          return Object.assign({}, card);
        });
      }
    });
    window.CNC_LEARNING_IMAGE_CARDS = STATIC_CARDS;
    return true;
  }

  function ensureProStyle() {
    if (document.querySelector('link[data-cnc-mobile-pro]')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = PRO_STYLE;
    link.dataset.cncMobilePro = 'true';
    document.head.appendChild(link);
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
      script.addEventListener('load', function () { resolve(true); }, { once: true });
      script.addEventListener('error', function () {
        console.error('[CNC稳定版] G/M增强模块加载失败');
        resolve(false);
      }, { once: true });
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
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(function (registrations) {
          registrations.forEach(function (registration) {
            if (registration.scope.indexOf('/yuhua/cnc/') !== -1 || registration.scope.indexOf('/cnc/') !== -1) {
              registration.unregister();
            }
          });
        }).catch(function () {});
      }
    } catch (error) {
      console.warn('[CNC稳定版] 清理旧缓存失败', error);
    }
  }

  function bindLazyLoading() {
    document.addEventListener('click', function (event) {
      var target = event.target.closest('[data-filter="gcode"]');
      if (target) loadGcodePro();
    }, true);

    var query = new URLSearchParams(window.location.search).get('q');
    if (query) window.setTimeout(loadGcodePro, 0);
  }

  function boot() {
    applyBranding();
    correctCourseCards();
    injectStaticCards();
    bindLazyLoading();
    clearLegacyCaches();
    window.setTimeout(function () {
      applyBranding();
      correctCourseCards();
      clearLegacyCaches();
    }, 1200);
  }

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
      var result = {
        passed: true,
        build: BUILD,
        lightweightHome: true,
        brand: document.title,
        gcodeLoaded: window.__CNC_GM_PRO_INSTALLED__ === PRO_BUILD,
        serviceWorkerControlled: Boolean(navigator.serviceWorker && navigator.serviceWorker.controller),
        lesson9Corrected: Boolean(lesson9 && lesson9.textContent.indexOf('不保证直线') !== -1),
        lesson10Corrected: Boolean(lesson10 && lesson10.textContent.indexOf('最小输入单位') !== -1)
      };
      result.passed = !result.serviceWorkerControlled && result.lesson9Corrected && result.lesson10Corrected;
      console.log('[CNC稳定性第一阶段检查]', result);
      return result;
    }
  };
})();
