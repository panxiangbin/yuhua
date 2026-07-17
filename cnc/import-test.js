/*
 * 新手学习图片接入与轻量完整性检查
 * 说明：该脚本位于 learning-content-data.js 与 ui-learning-detail.js 之后加载，
 * 因此可直接为指定关卡补充 imageCards，而无需改动课程主数据文件。
 */
(function () {
  'use strict';

  var LESSON_IMAGE_CARDS = {
    2: [
      {
        src: './assets/images/learning/lesson-02/1.svg',
        title: '认识 X、Y、Z 轴与正方向',
        desc: '用立式加工中心示意图分清 X、Y、Z 三轴方向，重点理解 Z 轴与主轴方向的关系。',
        loading: 'eager',
        fetchpriority: 'high'
      },
      {
        src: './assets/images/learning/lesson-02/2.svg',
        title: '刀具与工件的相对运动',
        desc: '编程时不要只盯着工作台移动，要始终按刀具相对工件的运动方向理解坐标。'
      }
    ],
    3: [
      {
        src: './assets/images/learning/lesson-03/1.svg',
        title: '开机前先认识这些安全按钮',
        desc: '认识急停、复位、进给保持、单段、倍率和手轮/JOG，先学会停，再学会动。',
        loading: 'eager',
        fetchpriority: 'high'
      },
      {
        src: './assets/images/learning/lesson-03/2.svg',
        title: '新手上机前的安全流程',
        desc: '按“先看、再查、再回、再试、再跑”的顺序完成开机检查和低倍率试运行。'
      }
    ]
  };

  function injectLessonImages() {
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

  function refreshOpenLesson() {
    var detail = document.querySelector('#study-detail-content .lesson-detail-v2');
    if (!detail || typeof window.openStudyDetail !== 'function') return;
    var level = Number(detail.getAttribute('data-level') || 0);
    if (level === 2 || level === 3) window.openStudyDetail(level);
  }

  function boot() {
    if (injectLessonImages()) {
      refreshOpenLesson();
      return;
    }

    var attempts = 0;
    var timer = window.setInterval(function () {
      attempts += 1;
      if (injectLessonImages() || attempts >= 20) {
        window.clearInterval(timer);
        refreshOpenLesson();
      }
    }, 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.CNC_IMPORT_TEST = window.CNC_IMPORT_TEST || {
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
        lesson3Images: lesson3 && lesson3.imageCards ? lesson3.imageCards.length : 0
      };
      console.log('[新手课程图片检查]', result);
      return result;
    }
  };
})();
