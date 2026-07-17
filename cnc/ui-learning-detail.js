/**
 * 数控小潘 CNC 助手｜新手学习 V2
 * 统一渲染 12 关课程、学习进度、答题反馈与继续学习。
 */
(function () {
  'use strict';

  if (window.CNC_LEARNING_UI && window.CNC_LEARNING_UI.version === '2.0.0') return;

  var STORAGE_KEY = 'cnc_learning_progress_v2';
  var currentLevel = 1;
  var STAGES = {
    1: { title: '图纸、坐标与安全', desc: '先看懂零件和机床，再建立安全操作习惯。' },
    2: { title: '坐标、对刀与程序基础', desc: '把图纸基准、刀尖位置和程序格式连起来。' },
    3: { title: '基础运动与切削参数', desc: '真正开始计算坐标、移动刀具和匹配转速进给。' },
    4: { title: '圆弧、刀补与完整程序', desc: '完成轮廓、刀补和钻孔循环，做出第一套程序。' }
  };

  function getCourse() {
    return (window.CNC_LEARNING_CONTENT && window.CNC_LEARNING_CONTENT.course) || {
      title: '零基础加工中心入门 12 关', subtitle: '按顺序学习数控加工基础。', totalLessons: 12,
      scope: '课程内容以 FANUC 立式加工中心为主要示例。',
      practicePiece: { title: '贯穿课程的练习零件', name: '100 × 80 × 15 mm 铝合金练习板', description: '' }
    };
  }
  function getLessons() { return (window.CNC_LEARNING_CONTENT && window.CNC_LEARNING_CONTENT.lessons) || {}; }
  function getLesson(level) { return getLessons()[Number(level)] || null; }
  function defaultProgress() { return { completed: [], correct: {}, lastLevel: 1, updatedAt: 0 }; }
  function readProgress() {
    try {
      var raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!raw || typeof raw !== 'object') return defaultProgress();
      raw.completed = Array.isArray(raw.completed) ? raw.completed.map(Number).filter(Boolean) : [];
      raw.correct = raw.correct && typeof raw.correct === 'object' ? raw.correct : {};
      raw.lastLevel = Number(raw.lastLevel) || 1;
      return raw;
    } catch (error) { return defaultProgress(); }
  }
  function writeProgress(progress) { progress.updatedAt = Date.now(); localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); }
  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function lessonQuizIds(lesson) { return (lesson.quizzes || []).map(function (quiz) { return quiz.id; }); }
  function correctCount(level) {
    var bucket = readProgress().correct[String(level)] || {};
    return Object.keys(bucket).filter(function (key) { return bucket[key] === true; }).length;
  }
  function isLessonPassed(level) {
    var lesson = getLesson(level); if (!lesson) return false;
    var ids = lessonQuizIds(lesson); if (!ids.length) return true;
    var bucket = readProgress().correct[String(level)] || {};
    return ids.every(function (id) { return bucket[id] === true; });
  }
  function rememberLastLevel(level) {
    var progress = readProgress(); progress.lastLevel = Number(level) || 1; writeProgress(progress); updateStudyProgressUI();
  }
  function markCorrect(level, quizId, correct) {
    var progress = readProgress(); var key = String(level);
    if (!progress.correct[key]) progress.correct[key] = {};
    progress.correct[key][quizId] = !!correct; progress.lastLevel = Number(level); writeProgress(progress);
  }
  function markLessonComplete(level) {
    var progress = readProgress(); var numeric = Number(level);
    if (progress.completed.indexOf(numeric) === -1) { progress.completed.push(numeric); progress.completed.sort(function (a, b) { return a - b; }); }
    progress.lastLevel = numeric < 12 ? numeric + 1 : 12; writeProgress(progress); updateStudyProgressUI(); renderStudyCards();
  }

  function installStyles() {
    if (document.getElementById('cnc-learning-v2-style')) return;
    var style = document.createElement('style'); style.id = 'cnc-learning-v2-style';
    style.textContent = [
      '#view-study .study-course-scope{margin:0 0 16px;padding:14px 16px;border-radius:16px;background:linear-gradient(135deg,rgba(26,115,232,.08),rgba(46,106,89,.08));border:1px solid rgba(26,115,232,.14);color:var(--text);line-height:1.7}',
      '#view-study .study-course-scope strong{display:block;margin-bottom:4px;color:#174ea6}',
      '#view-study .study-progress-panel{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:center;margin-bottom:18px;padding:18px;border-radius:20px;background:linear-gradient(135deg,#fff7ed,#f0fdf4);border:1px solid rgba(207,109,54,.18);box-shadow:0 12px 30px rgba(85,63,39,.08)}',
      '#view-study .study-progress-title{font-size:18px;font-weight:900;color:var(--text);margin-bottom:4px}',
      '#view-study .study-progress-sub{font-size:14px;color:var(--muted);line-height:1.6}',
      '#view-study .study-progress-track{height:10px;background:rgba(29,38,34,.08);border-radius:999px;overflow:hidden;margin-top:12px}',
      '#view-study .study-progress-fill{height:100%;background:linear-gradient(90deg,#cf6d36,#2e6a59);border-radius:inherit;transition:width .3s ease}',
      '#view-study .study-continue-btn{min-width:150px;border:0;border-radius:14px;padding:12px 16px;background:#1a73e8;color:#fff;font-weight:900;cursor:pointer;box-shadow:0 8px 18px rgba(26,115,232,.18)}',
      '#view-study .stage-header{margin-top:22px}.stage-header-copy{display:grid;gap:3px}.stage-header-copy p{margin:0;color:var(--muted);font-size:13px}',
      '#view-study .stage-progress{margin-left:auto;font-size:12px;font-weight:900;color:var(--green);background:var(--green-soft);padding:5px 10px;border-radius:999px}',
      '#view-study .study-card{position:relative}#view-study .study-card-status{display:inline-flex;margin-top:10px;padding:5px 9px;border-radius:999px;font-size:12px;font-weight:900;background:#f1f5f9;color:#64748b}',
      '#view-study .study-card.is-completed{border-color:rgba(22,163,74,.28);background:linear-gradient(180deg,rgba(240,253,244,.85),rgba(255,255,255,.95))}#view-study .study-card.is-completed .study-card-status{background:#dcfce7;color:#166534}',
      '#view-study .study-card.is-current{border-color:rgba(26,115,232,.34);box-shadow:0 14px 32px rgba(26,115,232,.12)}#view-study .study-card.is-current .study-card-status{background:#dbeafe;color:#1d4ed8}',
      '#view-study .lesson-detail-v2{display:grid;gap:14px;padding-bottom:82px}#view-study .lesson-v2-hero{border-radius:22px;padding:20px;background:linear-gradient(135deg,rgba(207,109,54,.16),rgba(46,106,89,.10));border:1px solid rgba(207,109,54,.18)}',
      '#view-study .lesson-v2-meta{display:flex;justify-content:space-between;gap:10px;color:var(--accent-deep);font-size:13px;font-weight:900;margin-bottom:10px}#view-study .lesson-v2-hero h2{margin:0;font-size:30px;line-height:1.16}#view-study .lesson-v2-hero>p{margin:10px 0 0;color:var(--muted);line-height:1.75}',
      '#view-study .lesson-v2-tags{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}#view-study .lesson-v2-tags span{border-radius:999px;background:var(--green-soft);color:var(--green);padding:6px 10px;font-size:12px;font-weight:900}',
      '#view-study .lesson-v2-section{background:var(--card-strong);border:1px solid rgba(29,38,34,.08);border-radius:18px;padding:17px}#view-study .lesson-v2-section h3{margin:0 0 10px;font-size:18px}#view-study .lesson-v2-section p,#view-study .lesson-v2-section li{line-height:1.75;color:var(--muted)}',
      '#view-study .lesson-teacher-v2{background:#fff7ed;border-color:#fed7aa}#view-study .lesson-teacher-v2 span{display:block;color:var(--accent-deep);font-size:13px;font-weight:900;margin-bottom:6px}#view-study .lesson-teacher-v2 strong{display:block;font-size:20px;line-height:1.45;color:#7c2d12}',
      '#view-study .lesson-objective-list{display:grid;gap:9px;margin:0;padding:0;list-style:none}#view-study .lesson-objective-list li{display:flex;gap:9px;align-items:flex-start}#view-study .lesson-objective-list li:before{content:"✓";display:inline-flex;align-items:center;justify-content:center;flex:0 0 22px;height:22px;border-radius:50%;background:#dcfce7;color:#166534;font-weight:900}',
      '#view-study .lesson-step-list{display:grid;gap:10px;list-style:none;padding:0;margin:0}#view-study .lesson-step-list li{display:grid;grid-template-columns:30px 1fr;gap:10px;align-items:start}#view-study .lesson-step-number{display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:#dbeafe;color:#1d4ed8;font-weight:900}',
      '#view-study .lesson-visual-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}#view-study .lesson-visual-card{border:1px solid rgba(29,38,34,.08);background:#fff;border-radius:16px;padding:14px}#view-study .lesson-visual-icon{font-size:28px;margin-bottom:8px}#view-study .lesson-visual-card strong{display:block;margin-bottom:5px}#view-study .lesson-visual-card p{margin:0;font-size:13px;line-height:1.6}',
      '#view-study .lesson-image-flow{display:grid;gap:14px}#view-study .lesson-image-card{background:var(--card-strong);border:1px solid rgba(29,38,34,.08);border-radius:18px;padding:14px}#view-study .lesson-image-card img{display:block;width:100%;height:auto;border-radius:15px;border:1px solid rgba(29,38,34,.08);background:#fff}#view-study .lesson-image-head{display:flex;align-items:center;gap:9px;margin-bottom:10px}#view-study .lesson-image-head span{padding:5px 9px;border-radius:999px;background:var(--green-soft);color:var(--green);font-size:12px;font-weight:900}#view-study .lesson-image-head h3{margin:0;font-size:17px}#view-study .lesson-image-card p{margin:10px 0 0;color:var(--muted);line-height:1.65}',
      '#view-study .lesson-error-list{display:grid;gap:10px}#view-study .lesson-error-card{border-left:5px solid #ef4444;background:#fff7f7;border-radius:14px;padding:13px 14px}#view-study .lesson-error-card strong{display:block;margin-bottom:5px;color:#991b1b}#view-study .lesson-error-card p{margin:3px 0;font-size:14px}',
      '#view-study .lesson-practice-card{background:linear-gradient(135deg,#eff6ff,#f0fdf4);border-color:#bfdbfe}#view-study .lesson-practice-piece{margin-top:10px;padding:11px 12px;border-radius:13px;background:rgba(255,255,255,.78);font-size:13px;color:var(--muted)}',
      '#view-study .lesson-quiz-list{display:grid;gap:12px}#view-study .quiz-card-v2{border:1px solid rgba(29,38,34,.09);background:rgba(255,255,255,.82);border-radius:16px;padding:14px}#view-study .quiz-card-v2.is-passed{border-color:#86efac;background:#f0fdf4}',
      '#view-study .quiz-v2-head{display:flex;justify-content:space-between;gap:10px;margin-bottom:8px;font-size:12px;font-weight:900;color:var(--muted)}#view-study .quiz-v2-question{font-weight:800;color:var(--text);line-height:1.6;margin:0 0 10px}#view-study .quiz-v2-options{display:grid;gap:8px}#view-study .quiz-v2-option{display:flex;gap:8px;align-items:flex-start;padding:10px;border-radius:13px;border:1px solid rgba(29,38,34,.10);background:#fff;cursor:pointer}',
      '#view-study .quiz-v2-submit{margin-top:10px;border:0;border-radius:12px;padding:10px 14px;background:#1a73e8;color:#fff;font-weight:900;cursor:pointer}#view-study .quiz-v2-feedback{display:none;margin-top:10px;border-radius:12px;padding:10px;line-height:1.65;font-size:14px}#view-study .quiz-v2-feedback.correct{display:block;background:#dcfce7;color:#166534}#view-study .quiz-v2-feedback.wrong{display:block;background:#fee2e2;color:#991b1b}',
      '#view-study .lesson-pass-box{background:#f0fdf4;border-color:#86efac}#view-study .lesson-complete-row{position:sticky;bottom:10px;z-index:7;display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;padding:11px;border-radius:18px;background:rgba(255,251,244,.96);border:1px solid rgba(29,38,34,.10);box-shadow:0 16px 36px rgba(85,63,39,.17);backdrop-filter:blur(8px)}',
      '#view-study .lesson-complete-status{font-size:13px;color:var(--muted);line-height:1.45}#view-study .lesson-complete-button{border:0;border-radius:13px;padding:12px 16px;background:#16a34a;color:#fff;font-weight:900;cursor:pointer;white-space:nowrap}#view-study .lesson-complete-button.is-completed{background:#64748b}#view-study .lesson-complete-message{display:none;margin-top:8px;padding:9px 11px;border-radius:10px;background:#fff7ed;color:#9a3412;font-size:13px}',
      '@media(max-width:720px){#view-study .study-progress-panel{grid-template-columns:1fr}#view-study .study-continue-btn{width:100%}#view-study .lesson-visual-grid{grid-template-columns:1fr}#view-study .lesson-v2-hero h2{font-size:25px}#view-study .lesson-v2-section{padding:14px}#view-study .lesson-complete-row{grid-template-columns:1fr}#view-study .lesson-complete-button{width:100%}}'
    ].join('');
    document.head.appendChild(style);
  }

  function stageProgress(stage) {
    var lessons = getLessons(), progress = readProgress();
    var levels = Object.keys(lessons).map(Number).filter(function (level) { return lessons[level].stage === Number(stage); });
    return { done: levels.filter(function (level) { return progress.completed.indexOf(level) !== -1; }).length, total: levels.length };
  }
  function cardStatus(level, progress) {
    if (progress.completed.indexOf(level) !== -1) return { cls: 'is-completed', text: '✓ 已完成' };
    if (progress.lastLevel === level) return { cls: 'is-current', text: '◐ 学习中' };
    return { cls: '', text: '○ 未开始' };
  }
  function renderStudyCards() {
    var container = document.querySelector('#view-study .learning-stages'); if (!container) return;
    var lessons = getLessons(), progress = readProgress(), html = '';
    Object.keys(STAGES).map(Number).forEach(function (stage) {
      var meta = STAGES[stage], levels = Object.keys(lessons).map(Number).filter(function (level) { return lessons[level].stage === stage; }).sort(function (a, b) { return a - b; }), sp = stageProgress(stage);
      html += '<div class="stage-header"><span class="stage-badge">阶段' + ['零','一','二','三','四'][stage] + '</span><div class="stage-header-copy"><h4>' + escapeHtml(meta.title) + '</h4><p>' + escapeHtml(meta.desc) + '</p></div><span class="stage-progress">' + sp.done + ' / ' + sp.total + ' 已完成</span></div><div class="study-card-grid">';
      levels.forEach(function (level) {
        var lesson = lessons[level], status = cardStatus(level, progress), icons = ['📐','🧭','🛑','📍','📏','🧩','📊','🚀','⚡','⭕','↔️','🏁'];
        html += '<article class="study-card ' + status.cls + '" data-stage="' + lesson.stage + '" data-level="' + level + '" role="button" tabindex="0"><div class="study-card-header"><span class="study-card-badge">第 ' + level + ' 关</span><span class="study-card-time">⏱ ' + escapeHtml(lesson.duration) + '</span></div><div class="study-card-icon">' + icons[level - 1] + '</div><h4>' + escapeHtml(lesson.title) + '</h4><p>' + escapeHtml(lesson.subtitle) + '</p><div class="study-card-tags">' + (lesson.tags || []).slice(0,4).map(function (tag) { return '<span class="tag">' + escapeHtml(tag) + '</span>'; }).join('') + '</div><span class="study-card-status">' + status.text + '</span></article>';
      });
      html += '</div>';
    });
    container.innerHTML = html; bindStudyCards();
  }
  function renderProgressPanel() {
    var studyView = document.getElementById('view-study'); if (!studyView) return;
    var panelHost = studyView.querySelector('.section-panel'), stages = studyView.querySelector('.learning-stages'); if (!panelHost || !stages) return;
    ['study-course-scope','study-progress-panel'].forEach(function (id) { var node = document.getElementById(id); if (node) node.remove(); });
    var course = getCourse(), scope = document.createElement('div'); scope.id = 'study-course-scope'; scope.className = 'study-course-scope'; scope.innerHTML = '<strong>课程适用范围</strong>' + escapeHtml(course.scope); panelHost.insertBefore(scope, stages);
    var progressPanel = document.createElement('div'); progressPanel.id = 'study-progress-panel'; progressPanel.className = 'study-progress-panel'; panelHost.insertBefore(progressPanel, stages); updateStudyProgressUI();
  }
  function updateStudyProgressUI() {
    var panel = document.getElementById('study-progress-panel'); if (!panel) return;
    var progress = readProgress(), completed = progress.completed.length, total = getCourse().totalLessons || 12, percent = Math.round((completed / total) * 100), nextLevel = completed >= total ? total : Math.max(1, Math.min(total, progress.lastLevel || 1)), nextLesson = getLesson(nextLevel) || getLesson(1);
    var title = completed >= total ? '12 关已全部完成' : (completed ? '接着上次继续学' : '从第 1 关开始');
    var sub = completed >= total ? '课程已经完成，可以从任意关卡复习，并继续使用知识库和换算工具。' : '已完成 ' + completed + ' / ' + total + '，下一步：第 ' + nextLevel + ' 关《' + (nextLesson ? nextLesson.title : '') + '》。';
    panel.innerHTML = '<div><div class="study-progress-title">' + escapeHtml(title) + '</div><div class="study-progress-sub">' + escapeHtml(sub) + '</div><div class="study-progress-track"><div class="study-progress-fill" style="width:' + percent + '%"></div></div></div><button class="study-continue-btn" type="button" data-continue-level="' + nextLevel + '">' + (completed >= total ? '复习最后一关' : '继续学习') + '</button>';
    var launchCard = document.querySelector('.launchpad-card[data-route="study"]'), badge = launchCard && launchCard.querySelector('.launchpad-badge'); if (badge) badge.textContent = completed ? '→ 继续第 ' + nextLevel + ' 关' : '→ 从第 1 关开始';
  }
  function bindStudyCards() {
    document.querySelectorAll('#view-study .study-card[data-level]').forEach(function (card) {
      if (card.dataset.v2Bound === 'true') return; card.dataset.v2Bound = 'true';
      function open() { var level = Number(card.dataset.level); rememberLastLevel(level); if (typeof window.openStudyDetail === 'function') window.openStudyDetail(level); }
      card.addEventListener('click', open); card.addEventListener('keydown', function (event) { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); } });
    });
  }
  function renderList(items, className) { return '<ul class="' + className + '">' + (items || []).map(function (item) { return '<li>' + escapeHtml(item) + '</li>'; }).join('') + '</ul>'; }
  function renderImageCards(cards) {
    if (!cards || !cards.length) return '';
    return '<div class="lesson-image-flow">' + cards.map(function (card, index) {
      return '<section class="lesson-image-card"><div class="lesson-image-head"><span>图 ' + (index + 1) + '</span><h3>' + escapeHtml(card.title) + '</h3></div><img src="' + escapeHtml(card.src) + '" alt="' + escapeHtml(card.title) + '" loading="' + escapeHtml(card.loading || (index === 0 ? 'eager' : 'lazy')) + '" decoding="async"' + (card.fetchpriority ? ' fetchpriority="' + escapeHtml(card.fetchpriority) + '"' : '') + '><p>' + escapeHtml(card.desc) + '</p></section>';
    }).join('') + '</div>';
  }
  function renderVisuals(visuals) {
    if (!visuals || !visuals.length) return '';
    return '<section class="lesson-v2-section"><h3>本关图解重点</h3><div class="lesson-visual-grid">' + visuals.map(function (item) { return '<article class="lesson-visual-card"><div class="lesson-visual-icon">' + escapeHtml(item.icon || '📌') + '</div><strong>' + escapeHtml(item.title) + '</strong><p>' + escapeHtml(item.desc) + '</p></article>'; }).join('') + '</div></section>';
  }
  function renderErrors(errors) {
    if (!errors || !errors.length) return '';
    return '<section class="lesson-v2-section"><h3>最容易犯的错误</h3><div class="lesson-error-list">' + errors.map(function (item) { return '<article class="lesson-error-card"><strong>⚠ ' + escapeHtml(item.title) + '</strong><p><b>现象：</b>' + escapeHtml(item.symptom) + '</p><p><b>处理：</b>' + escapeHtml(item.fix) + '</p></article>'; }).join('') + '</div></section>';
  }
  function renderQuizzes(lesson) {
    if (!lesson.quizzes || !lesson.quizzes.length) return '';
    var bucket = readProgress().correct[String(lesson.level)] || {};
    return '<section class="lesson-v2-section"><h3>过关小测</h3><div class="lesson-quiz-list">' + lesson.quizzes.map(function (quiz, index) {
      var passed = bucket[quiz.id] === true;
      return '<article class="quiz-card-v2 ' + (passed ? 'is-passed' : '') + '" data-quiz-id="' + escapeHtml(quiz.id) + '"><div class="quiz-v2-head"><span>第 ' + (index + 1) + ' 题</span><span>' + (passed ? '✓ 已答对' : '选择题') + '</span></div><p class="quiz-v2-question">' + escapeHtml(quiz.question) + '</p><div class="quiz-v2-options">' + quiz.options.map(function (option, optionIndex) { return '<label class="quiz-v2-option"><input type="radio" name="' + escapeHtml(quiz.id) + '" value="' + optionIndex + '"><span>' + escapeHtml(option) + '</span></label>'; }).join('') + '</div><button class="quiz-v2-submit" type="button" data-level="' + lesson.level + '" data-quiz-id="' + escapeHtml(quiz.id) + '" data-answer="' + quiz.answer + '">提交答案</button><div class="quiz-v2-feedback" data-feedback-for="' + escapeHtml(quiz.id) + '"></div></article>';
    }).join('') + '</div></section>';
  }
  function renderLessonDetail(level) {
    var lesson = getLesson(level); if (!lesson) return '';
    currentLevel = Number(level); rememberLastLevel(currentLevel);
    var course = getCourse(), progress = readProgress(), completed = progress.completed.indexOf(currentLevel) !== -1, correct = correctCount(currentLevel), quizTotal = (lesson.quizzes || []).length;
    var html = '<div class="lesson-detail-v2" data-level="' + currentLevel + '">';
    html += '<header class="lesson-v2-hero"><div class="lesson-v2-meta"><span>第 ' + currentLevel + ' 关 / ' + (course.totalLessons || 12) + '</span><span>建议 ' + escapeHtml(lesson.duration) + '</span></div><h2>' + escapeHtml(lesson.title) + '</h2><p>' + escapeHtml(lesson.subtitle) + '</p><div class="lesson-v2-tags">' + (lesson.tags || []).map(function (tag) { return '<span>' + escapeHtml(tag) + '</span>'; }).join('') + '</div></header>';
    html += '<section class="lesson-v2-section"><h3>这一关先解决什么问题</h3><p>' + escapeHtml(lesson.problem) + '</p></section>';
    html += '<section class="lesson-v2-section lesson-teacher-v2"><span>老师傅一句话</span><strong>' + escapeHtml(lesson.teacherTip) + '</strong></section>';
    html += '<section class="lesson-v2-section"><h3>学完要会什么</h3>' + renderList(lesson.objectives, 'lesson-objective-list') + '</section>';
    html += renderImageCards(lesson.imageCards) + renderVisuals(lesson.visuals);
    html += '<section class="lesson-v2-section"><h3>现场操作顺序</h3><ol class="lesson-step-list">' + (lesson.steps || []).map(function (step, index) { return '<li><span class="lesson-step-number">' + (index + 1) + '</span><span>' + escapeHtml(step) + '</span></li>'; }).join('') + '</ol></section>';
    html += renderErrors(lesson.errors);
    html += '<section class="lesson-v2-section lesson-practice-card"><h3>贯穿课程的现场任务</h3><p>' + escapeHtml(lesson.practice) + '</p><div class="lesson-practice-piece"><strong>' + escapeHtml(course.practicePiece.title) + '：</strong>' + escapeHtml(course.practicePiece.name) + '。' + escapeHtml(course.practicePiece.description) + '</div></section>';
    html += renderQuizzes(lesson);
    html += '<section class="lesson-v2-section lesson-pass-box"><h3>本关过关标准</h3><p>' + escapeHtml(lesson.passStandard) + '</p></section>';
    html += '<div class="lesson-complete-row"><div><div class="lesson-complete-status">小测进度：<strong data-quiz-progress="' + currentLevel + '">' + correct + ' / ' + quizTotal + '</strong>。全部答对后即可标记完成。</div><div class="lesson-complete-message" data-complete-message="' + currentLevel + '"></div></div><button class="lesson-complete-button ' + (completed ? 'is-completed' : '') + '" type="button" data-complete-level="' + currentLevel + '">' + (completed ? '✓ 本关已完成' : '完成本关 ✓') + '</button></div></div>';
    return html;
  }
  function updateLessonCompletionArea(level) {
    var node = document.querySelector('[data-quiz-progress="' + level + '"]'), lesson = getLesson(level); if (node && lesson) node.textContent = correctCount(level) + ' / ' + (lesson.quizzes || []).length;
  }
  function handleQuizSubmit(button) {
    var card = button.closest('.quiz-card-v2'); if (!card) return;
    var selected = card.querySelector('input[type="radio"]:checked'), level = Number(button.dataset.level), quizId = button.dataset.quizId, answer = String(button.dataset.answer), feedback = card.querySelector('.quiz-v2-feedback'), lesson = getLesson(level), quiz = lesson && (lesson.quizzes || []).find(function (item) { return item.id === quizId; });
    if (!selected) { feedback.className = 'quiz-v2-feedback wrong'; feedback.textContent = '先选择一个答案，再提交。'; return; }
    var correct = String(selected.value) === answer; markCorrect(level, quizId, correct);
    if (correct) { card.classList.add('is-passed'); feedback.className = 'quiz-v2-feedback correct'; feedback.textContent = '答对了。' + (quiz ? quiz.explanation : ''); var status = card.querySelector('.quiz-v2-head span:last-child'); if (status) status.textContent = '✓ 已答对'; }
    else { card.classList.remove('is-passed'); feedback.className = 'quiz-v2-feedback wrong'; feedback.textContent = '还不稳。' + (quiz ? quiz.explanation : '请重新对照本关内容。'); }
    updateLessonCompletionArea(level);
  }
  function handleComplete(level, button) {
    var message = document.querySelector('[data-complete-message="' + level + '"]');
    if (!isLessonPassed(level)) { if (message) { message.style.display = 'block'; message.textContent = '还有题目没有答对。先把本关小测全部通过，再标记完成。'; } return; }
    markLessonComplete(level); button.classList.add('is-completed'); button.textContent = '✓ 本关已完成';
    if (message) { message.style.display = 'block'; message.style.background = '#dcfce7'; message.style.color = '#166534'; message.textContent = level < 12 ? '本关完成，下一关已经可以继续学习。' : '恭喜完成 12 关，可以回到课程目录复习或进入知识库继续深入。'; }
  }
  function bindDelegatedEvents() {
    if (window.__CNC_LEARNING_V2_EVENTS__) return; window.__CNC_LEARNING_V2_EVENTS__ = true;
    document.addEventListener('click', function (event) {
      var continueButton = event.target.closest('[data-continue-level]'); if (continueButton) { var continueLevel = Number(continueButton.dataset.continueLevel); rememberLastLevel(continueLevel); if (typeof window.openStudyDetail === 'function') window.openStudyDetail(continueLevel); return; }
      var quizButton = event.target.closest('.quiz-v2-submit'); if (quizButton) { handleQuizSubmit(quizButton); return; }
      var completeButton = event.target.closest('[data-complete-level]'); if (completeButton) handleComplete(Number(completeButton.dataset.completeLevel), completeButton);
    });
  }
  function updateStudyHeading() {
    var course = getCourse(), heading = document.querySelector('#view-study .section-head h3'), intro = document.querySelector('#view-study .section-head > p'), eyebrow = document.querySelector('#view-study .section-head .eyebrow');
    if (heading) heading.textContent = course.title;
    if (intro) intro.textContent = course.subtitle + ' 每关约 8～12 分钟，包含图解、现场任务、答题和过关标准。';
    if (eyebrow) eyebrow.textContent = '零基础加工中心入门';
  }
  function boot() {
    installStyles(); updateStudyHeading(); renderStudyCards(); renderProgressPanel(); bindDelegatedEvents();
    console.log('[新手学习 V2] 12 关、进度记录和过关小测已接入。');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  window.CNC_LEARNING_UI = {
    version: '2.0.0', renderLessonDetail: renderLessonDetail, getLessonData: getLesson,
    getCurrentLevel: function () { return currentLevel; }, renderStudyCards: renderStudyCards,
    updateStudyProgressUI: updateStudyProgressUI, readProgress: readProgress
  };
})();
