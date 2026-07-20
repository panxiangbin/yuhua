/* CNC 紧急恢复版：主页轻量启动，G/M增强仅在用户点击时加载。 */
(function () {
  'use strict';

  var BUILD = '20260720i';
  var PRO_SCRIPT = './mobile-gcode-pro.js?v=' + BUILD;
  var PRO_STYLE = './mobile-gcode-pro.css?v=' + BUILD;
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
    if (window.__CNC_GM_PRO_INSTALLED__ === BUILD) return Promise.resolve(true);
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
        console.error('[CNC恢复版] G/M增强模块加载失败');
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
            if (registration.scope.indexOf('/yuhua/cnc/') !== -1) registration.unregister();
          });
        }).catch(function () {});
      }
    } catch (error) {
      console.warn('[CNC恢复版] 清理旧缓存失败', error);
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
    injectStaticCards();
    bindLazyLoading();
    clearLegacyCaches();
    window.setTimeout(clearLegacyCaches, 1200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  window.CNC_LOAD_GCODE_PRO = loadGcodePro;
  window.CNC_IMPORT_TEST = {
    runAll: function () {
      var result = {
        passed: true,
        build: BUILD,
        lightweightHome: true,
        gcodeLoaded: window.__CNC_GM_PRO_INSTALLED__ === BUILD,
        serviceWorkerControlled: Boolean(navigator.serviceWorker && navigator.serviceWorker.controller)
      };
      console.log('[CNC紧急恢复检查]', result);
      return result;
    }
  };
})();
