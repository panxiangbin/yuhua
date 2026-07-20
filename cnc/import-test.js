/*
 * 新手学习图片接入 V3
 * 第2、3关使用仓库SVG，第4～12关使用动态高清矢量教学图。
 * 无论课程数据先加载还是详情页先打开，都保证图片可以显示。
 */
(function () {
  'use strict';

  var IMAGE_VERSION = '20260720a';
  var EXTENDED_SCRIPT = './learning-images-04-12.js?v=' + IMAGE_VERSION;
  var STATIC_CARDS = {
    2: [
      {
        src: './assets/images/learning/lesson-02/1.svg?v=' + IMAGE_VERSION,
        title: '认识 X、Y、Z 轴与正方向',
        desc: '用立式加工中心示意图分清 X、Y、Z 三轴方向，重点理解 Z 轴与主轴方向的关系。',
        loading: 'eager', fetchpriority: 'high'
      },
      {
        src: './assets/images/learning/lesson-02/2.svg?v=' + IMAGE_VERSION,
        title: '刀具与工件的相对运动',
        desc: '编程时不要只盯着工作台移动，要始终按刀具相对工件的运动方向理解坐标。'
      }
    ],
    3: [
      {
        src: './assets/images/learning/lesson-03/1.svg?v=' + IMAGE_VERSION,
        title: '开机前先认识这些安全按钮',
        desc: '认识急停、复位、进给保持、单段、倍率和手轮/JOG，先学会停，再学会动。',
        loading: 'eager', fetchpriority: 'high'
      },
      {
        src: './assets/images/learning/lesson-03/2.svg?v=' + IMAGE_VERSION,
        title: '新手上机前的安全流程',
        desc: '按“先看、再查、再回、再试、再跑”的顺序完成开机检查和低倍率试运行。'
      }
    ]
  };

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function getContent() {
    return window.CNC_LEARNING_CONTENT;
  }

  function getLesson(level) {
    var content = getContent();
    return content && content.lessons && (content.lessons[level] || content.lessons[String(level)]);
  }

  function injectStaticCards() {
    var content = getContent();
    if (!content || !content.lessons) return false;
    Object.keys(STATIC_CARDS).forEach(function (key) {
      var lesson = getLesson(Number(key));
      if (lesson) lesson.imageCards = STATIC_CARDS[key].map(function (card) { return Object.assign({}, card); });
    });
    window.CNC_LEARNING_IMAGE_CARDS = STATIC_CARDS;
    return true;
  }

  function loadExtendedCards() {
    if (window.CNC_LEARNING_VECTOR_POSTERS) return Promise.resolve(true);
    if (window.__CNC_LEARNING_IMAGES_PROMISE__) return window.__CNC_LEARNING_IMAGES_PROMISE__;
    window.__CNC_LEARNING_IMAGES_PROMISE__ = new Promise(function (resolve) {
      var old = document.querySelector('script[data-learning-images-04-12]');
      if (old) {
        old.addEventListener('load', function () { resolve(true); }, { once: true });
        old.addEventListener('error', function () { resolve(false); }, { once: true });
        return;
      }
      var script = document.createElement('script');
      script.src = EXTENDED_SCRIPT;
      script.async = false;
      script.dataset.learningImages0412 = 'true';
      script.onload = function () { resolve(true); };
      script.onerror = function () { console.error('[新手课程图片] 第4～12关图片脚本加载失败'); resolve(false); };
      document.head.appendChild(script);
    });
    return window.__CNC_LEARNING_IMAGES_PROMISE__;
  }

  function imageFlowHtml(cards) {
    return '<div class="lesson-image-flow lesson-image-flow-fallback" data-learning-images="true">' + cards.map(function (card, index) {
      return '<section class="lesson-image-card">' +
        '<div class="lesson-image-head"><span>图 ' + (index + 1) + '</span><h3>' + escapeHtml(card.title) + '</h3></div>' +
        '<img src="' + escapeHtml(card.src) + '" alt="' + escapeHtml(card.title) + '" loading="' + escapeHtml(card.loading || (index === 0 ? 'eager' : 'lazy')) + '" decoding="async"' + (card.fetchpriority ? ' fetchpriority="' + escapeHtml(card.fetchpriority) + '"' : '') + '>' +
        '<p>' + escapeHtml(card.desc || '') + '</p>' +
        '</section>';
    }).join('') + '</div>';
  }

  function decorateOpenLesson() {
    var detail = document.querySelector('#study-detail-content .lesson-detail-v2');
    if (!detail) return false;
    var level = Number(detail.getAttribute('data-level') || 0);
    var lesson = getLesson(level);
    var cards = lesson && lesson.imageCards;
    if (!cards || !cards.length) return false;
    if (detail.querySelector('.lesson-image-flow')) return true;

    var sections = detail.querySelectorAll('.lesson-v2-section');
    var anchor = null;
    for (var i = 0; i < sections.length; i += 1) {
      var heading = sections[i].querySelector('h3');
      if (heading && heading.textContent.indexOf('学完要会什么') !== -1) {
        anchor = sections[i];
        break;
      }
    }
    if (!anchor) anchor = detail.querySelector('.lesson-teacher-v2') || detail.querySelector('.lesson-v2-hero');
    if (!anchor) return false;
    anchor.insertAdjacentHTML('afterend', imageFlowHtml(cards));
    return true;
  }

  function refreshOpenLesson() {
    var detail = document.querySelector('#study-detail-content .lesson-detail-v2');
    if (!detail) return;
    var level = Number(detail.getAttribute('data-level') || 0);
    var lesson = getLesson(level);
    if (lesson && lesson.imageCards && lesson.imageCards.length && typeof window.openStudyDetail === 'function') {
      window.openStudyDetail(level);
      window.setTimeout(decorateOpenLesson, 0);
    }
  }

  function wrapOpenStudyDetail() {
    var original = window.openStudyDetail;
    if (typeof original !== 'function' || original.__lessonImagesV3Wrapped) return false;
    var wrapped = function () {
      var result = original.apply(this, arguments);
      window.setTimeout(decorateOpenLesson, 0);
      return result;
    };
    wrapped.__lessonImagesV3Wrapped = true;
    window.openStudyDetail = wrapped;
    return true;
  }

  function observeStudyDetail() {
    var host = document.getElementById('study-detail-content');
    if (!host || host.__lessonImagesV3Observed) return;
    host.__lessonImagesV3Observed = true;
    new MutationObserver(function () { decorateOpenLesson(); })
      .observe(host, { childList: true, subtree: true });
  }

  function boot() {
    injectStaticCards();
    wrapOpenStudyDetail();
    observeStudyDetail();
    decorateOpenLesson();

    loadExtendedCards().then(function () {
      injectStaticCards();
      wrapOpenStudyDetail();
      observeStudyDetail();
      refreshOpenLesson();
      decorateOpenLesson();
    });

    var attempts = 0;
    var timer = window.setInterval(function () {
      attempts += 1;
      injectStaticCards();
      wrapOpenStudyDetail();
      observeStudyDetail();
      decorateOpenLesson();
      if (attempts >= 50 || (window.openStudyDetail && window.CNC_LEARNING_VECTOR_POSTERS)) {
        window.clearInterval(timer);
      }
    }, 100);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  window.addEventListener('load', function () {
    injectStaticCards();
    loadExtendedCards().then(function () { refreshOpenLesson(); decorateOpenLesson(); });
  });

  window.CNC_IMPORT_TEST = {
    runAll: function () {
      var result = { passed: true, lessons: {}, openLessonDecorated: Boolean(document.querySelector('#study-detail-content .lesson-image-flow')) };
      for (var level = 2; level <= 12; level += 1) {
        var lesson = getLesson(level);
        var count = lesson && Array.isArray(lesson.imageCards) ? lesson.imageCards.length : 0;
        result.lessons[level] = count;
        if (count < 2) result.passed = false;
      }
      console.log('[新手课程图片检查 V3]', result);
      return result;
    }
  };
})();
