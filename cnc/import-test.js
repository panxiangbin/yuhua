/*
 * 新手学习图片接入与页面兜底渲染
 * 目标：第2、3关无论通过课程数据渲染，还是页面已先打开，都能稳定显示教学图片。
 */
(function () {
  'use strict';

  var IMAGE_VERSION = '20260717f';
  var LESSON_IMAGE_CARDS = {
    2: [
      {
        src: './assets/images/learning/lesson-02/1.svg?v=' + IMAGE_VERSION,
        title: '认识 X、Y、Z 轴与正方向',
        desc: '用立式加工中心示意图分清 X、Y、Z 三轴方向，重点理解 Z 轴与主轴方向的关系。',
        loading: 'eager',
        fetchpriority: 'high'
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
        loading: 'eager',
        fetchpriority: 'high'
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
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function injectLessonData() {
    var content = window.CNC_LEARNING_CONTENT;
    if (!content || !content.lessons) return false;

    Object.keys(LESSON_IMAGE_CARDS).forEach(function (levelKey) {
      var lesson = content.lessons[levelKey] || content.lessons[Number(levelKey)];
      if (!lesson) return;
      lesson.imageCards = LESSON_IMAGE_CARDS[levelKey].map(function (card) {
        return Object.assign({}, card);
      });
    });

    window.CNC_LEARNING_IMAGE_CARDS = LESSON_IMAGE_CARDS;
    return true;
  }

  function imageFlowHtml(cards) {
    return '<div class="lesson-image-flow lesson-image-flow-fallback" data-learning-images="true">' + cards.map(function (card, index) {
      return '<section class="lesson-image-card">' +
        '<div class="lesson-image-head"><span>图 ' + (index + 1) + '</span><h3>' + escapeHtml(card.title) + '</h3></div>' +
        '<img src="' + escapeHtml(card.src) + '" alt="' + escapeHtml(card.title) + '" loading="' + escapeHtml(card.loading || (index === 0 ? 'eager' : 'lazy')) + '" decoding="async"' + (card.fetchpriority ? ' fetchpriority="' + escapeHtml(card.fetchpriority) + '"' : '') + '>' +
        '<p>' + escapeHtml(card.desc) + '</p>' +
        '</section>';
    }).join('') + '</div>';
  }

  function decorateOpenLesson() {
    var detail = document.querySelector('#study-detail-content .lesson-detail-v2');
    if (!detail) return false;

    var level = Number(detail.getAttribute('data-level') || 0);
    var cards = LESSON_IMAGE_CARDS[level];
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
    if ((level === 2 || level === 3) && typeof window.openStudyDetail === 'function') {
      window.openStudyDetail(level);
      window.setTimeout(decorateOpenLesson, 0);
    }
  }

  function wrapOpenStudyDetail() {
    var original = window.openStudyDetail;
    if (typeof original !== 'function' || original.__lessonImagesWrapped) return false;

    var wrapped = function () {
      var result = original.apply(this, arguments);
      window.setTimeout(function () {
        injectLessonData();
        decorateOpenLesson();
      }, 0);
      return result;
    };
    wrapped.__lessonImagesWrapped = true;
    window.openStudyDetail = wrapped;
    return true;
  }

  function observeStudyDetail() {
    var host = document.getElementById('study-detail-content');
    if (!host || host.__lessonImagesObserved) return;
    host.__lessonImagesObserved = true;

    var observer = new MutationObserver(function () {
      injectLessonData();
      decorateOpenLesson();
    });
    observer.observe(host, { childList: true, subtree: true });
  }

  function boot() {
    injectLessonData();
    observeStudyDetail();
    wrapOpenStudyDetail();
    decorateOpenLesson();

    var attempts = 0;
    var timer = window.setInterval(function () {
      attempts += 1;
      injectLessonData();
      observeStudyDetail();
      wrapOpenStudyDetail();
      decorateOpenLesson();
      if (attempts >= 40 || (window.openStudyDetail && document.getElementById('study-detail-content'))) {
        window.clearInterval(timer);
      }
    }, 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
  window.addEventListener('load', function () {
    injectLessonData();
    wrapOpenStudyDetail();
    observeStudyDetail();
    refreshOpenLesson();
    decorateOpenLesson();
  });

  window.CNC_IMPORT_TEST = {
    runAll: function () {
      var content = window.CNC_LEARNING_CONTENT;
      var lessons = content && content.lessons;
      var lesson2 = lessons && (lessons[2] || lessons['2']);
      var lesson3 = lessons && (lessons[3] || lessons['3']);
      var result = {
        passed: Boolean(
          lesson2 && Array.isArray(lesson2.imageCards) && lesson2.imageCards.length === 2 &&
          lesson3 && Array.isArray(lesson3.imageCards) && lesson3.imageCards.length === 2
        ),
        lesson2Images: lesson2 && lesson2.imageCards ? lesson2.imageCards.length : 0,
        lesson3Images: lesson3 && lesson3.imageCards ? lesson3.imageCards.length : 0,
        openLessonDecorated: Boolean(document.querySelector('#study-detail-content .lesson-image-flow'))
      };
      console.log('[新手课程图片检查]', result);
      return result;
    }
  };
})();
