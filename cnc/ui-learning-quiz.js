/**
 * ui-learning-quiz.js
 * 交互练习题系统 — 选择题/判断题/填空题，即时反馈与进度追踪
 * 全局对象: window.CNC_QUIZ_SYSTEM
 */
(function () {
  'use strict';

  if (window.CNC_QUIZ_SYSTEM) return;

  var _quizResults = {};
  var _STORAGE_KEY = 'cnc_quiz_progress';

  function _loadProgress() {
    try {
      var data = localStorage.getItem(_STORAGE_KEY);
      if (data) { _quizResults = JSON.parse(data); }
    } catch (e) { _quizResults = {}; }
  }

  function _saveProgress() {
    try { localStorage.setItem(_STORAGE_KEY, JSON.stringify(_quizResults)); }
    catch (e) { console.warn('[CNC_QUIZ_SYSTEM] 保存答题进度失败:', e.message); }
  }

  _loadProgress();

  function renderMultipleChoice(quiz) {
    if (!quiz || !quiz.options) return '<p class="quiz-error">选择题数据无效</p>';
    var id = quiz.id || 'quiz-' + Date.now();
    var html = '<div class="quiz-card quiz-multiple" data-quiz-id="' + id + '">';
    html += '<div class="quiz-header"><span class="quiz-type-badge">选择题</span></div>';
    html += '<p class="quiz-question">' + _escape(quiz.question) + '</p><div class="quiz-options">';
    for (var i = 0; i < quiz.options.length; i++) {
      var checked = '';
      html += '<label class="quiz-option"><input type="radio" name="q-' + id + '" value="' + i + '"' + checked + '>';
      html += '<span class="quiz-option-text">' + _escape(quiz.options[i]) + '</span></label>';
    }
    html += '</div><div class="quiz-feedback" style="display:none"></div>';
    html += '<button class="quiz-submit primary-button" data-quiz-id="' + id + '">提交</button>';
    html += '</div>';
    return html;
  }

  function renderTrueFalse(quiz) {
    if (!quiz || !quiz.options) return '<p class="quiz-error">判断题数据无效</p>';
    var id = quiz.id || 'quiz-' + Date.now();
    var html = '<div class="quiz-card quiz-truefalse" data-quiz-id="' + id + '">';
    html += '<div class="quiz-header"><span class="quiz-type-badge">判断题</span></div>';
    html += '<p class="quiz-question">' + _escape(quiz.question) + '</p><div class="quiz-options">';
    var labels = ['正确', '错误'];
    for (var i = 0; i < 2; i++) {
      html += '<label class="quiz-option ' + (i === 0 ? 'option-true' : 'option-false') + '">';
      html += '<input type="radio" name="q-' + id + '" value="' + i + '">';
      html += '<span class="quiz-option-text">' + labels[i] + '</span></label>';
    }
    html += '</div><div class="quiz-feedback" style="display:none"></div>';
    html += '<button class="quiz-submit primary-button" data-quiz-id="' + id + '">提交</button>';
    html += '</div>';
    return html;
  }

  function renderFillBlank(quiz) {
    if (!quiz) return '<p class="quiz-error">填空题数据无效</p>';
    var id = quiz.id || 'quiz-' + Date.now();
    var html = '<div class="quiz-card quiz-fillblank" data-quiz-id="' + id + '">';
    html += '<div class="quiz-header"><span class="quiz-type-badge">填空题</span></div>';
    html += '<p class="quiz-question">' + _escape(quiz.question) + '</p>';
    html += '<div class="quiz-input-group"><input type="text" class="quiz-fill-input" placeholder="请输入答案" data-quiz-id="' + id + '"></div>';
    html += '<div class="quiz-feedback" style="display:none"></div>';
    html += '<button class="quiz-submit primary-button" data-quiz-id="' + id + '">提交</button>';
    html += '</div>';
    return html;
  }

  function checkAnswer(quizId, userAnswer) {
    var quizEl = document.querySelector('.quiz-card[data-quiz-id="' + quizId + '"]');
    if (!quizEl) return { correct: false, error: '未找到题目元素' };
    var feedbackEl = quizEl.querySelector('.quiz-feedback');
    var submitBtn = quizEl.querySelector('.quiz-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = '已提交';

    var quiz = _findQuizData(quizId);
    if (!quiz) {
      _showFeedback(feedbackEl, '未找到答案数据', 'error');
      return { correct: false, error: '未找到答案数据' };
    }
    var correct = false;
    if (quiz.type === 'fillblank') {
      var acceptable = Array.isArray(quiz.answer) ? quiz.answer : [quiz.answer];
      correct = acceptable.some(function (a) { return a.toLowerCase().trim() === String(userAnswer).toLowerCase().trim(); });
    } else {
      correct = Number(userAnswer) === quiz.answer;
    }
    if (correct) {
      _showFeedback(feedbackEl, '✓ 回答正确！' + (quiz.explanation ? ' ' + quiz.explanation : ''), 'correct');
      quizEl.classList.add('quiz-correct');
    } else {
      var correctText = quiz.type === 'fillblank' ? (Array.isArray(quiz.answer) ? quiz.answer[0] : quiz.answer) : (quiz.options ? quiz.options[quiz.answer] : '');
      _showFeedback(feedbackEl, '✗ 回答错误。正确答案：' + correctText + (quiz.explanation ? ' — ' + quiz.explanation : ''), 'incorrect');
      quizEl.classList.add('quiz-incorrect');
    }
    trackQuizProgress(_getCurrentLevel(), quizId, correct);
    return { correct: correct, quizId: quizId };
  }

  function showExplanation(quizId) {
    var quizEl = document.querySelector('.quiz-card[data-quiz-id="' + quizId + '"]');
    if (!quizEl) return;
    var explEl = quizEl.querySelector('.quiz-explanation');
    if (explEl) { explEl.style.display = 'block'; }
  }

  function trackQuizProgress(level, quizId, correct) {
    if (!_quizResults[level]) _quizResults[level] = {};
    if (!_quizResults[level][quizId]) {
      _quizResults[level][quizId] = { attempts: 0, correct: 0, lastAttempt: null };
    }
    _quizResults[level][quizId].attempts++;
    if (correct) _quizResults[level][quizId].correct++;
    _quizResults[level][quizId].lastAttempt = Date.now();
    _saveProgress();
  }

  function getQuizStats(level) {
    if (!_quizResults[level]) return { total: 0, correct: 0, rate: 0 };
    var ids = Object.keys(_quizResults[level]);
    var total = ids.length;
    var correctCount = 0;
    for (var i = 0; i < ids.length; i++) {
      if (_quizResults[level][ids[i]].correct > 0) correctCount++;
    }
    return { total: total, correct: correctCount, rate: total > 0 ? Math.round(correctCount / total * 100) : 0 };
  }

  function resetQuizProgress(level) {
    if (level) { delete _quizResults[level]; }
    else { _quizResults = {}; }
    _saveProgress();
  }

  function _showFeedback(el, msg, type) {
    if (!el) return;
    el.innerHTML = msg;
    el.className = 'quiz-feedback quiz-feedback-' + type;
    el.style.display = 'block';
  }

  function _findQuizData(quizId) {
    var levels = window.CNC_LEARNING_UI;
    if (!levels) return null;
    for (var l = 1; l <= 12; l++) {
      var data = levels.getLessonData(l);
      if (data && data.quizzes) {
        for (var i = 0; i < data.quizzes.length; i++) {
          if (data.quizzes[i].id === quizId) return data.quizzes[i];
        }
      }
    }
    return null;
  }

  function _getCurrentLevel() {
    var ui = window.CNC_LEARNING_UI;
    return ui ? ui.getCurrentLevel() || 0 : 0;
  }

  function _escape(text) {
    if (!text) return '';
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(text));
    return d.innerHTML;
  }

  window.CNC_QUIZ_SYSTEM = {
    renderMultipleChoice: renderMultipleChoice,
    renderTrueFalse: renderTrueFalse,
    renderFillBlank: renderFillBlank,
    checkAnswer: checkAnswer,
    showExplanation: showExplanation,
    trackQuizProgress: trackQuizProgress,
    getQuizStats: getQuizStats,
    resetQuizProgress: resetQuizProgress
  };

  console.log('[CNC_QUIZ_SYSTEM] 交互练习系统已加载。已恢复 ' + Object.keys(_quizResults).length + ' 个关卡的答题记录。');
})();
