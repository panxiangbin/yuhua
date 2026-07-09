/**
 * ui-learning-detail.js
 * 学习关卡详情页渲染引擎
 * 全局对象: window.CNC_LEARNING_UI
 * 只优化新手学习区和第1关手机端体验，不改 app.js / sw.js / 全局主题。
 */
(function () {
  'use strict';

  if (window.CNC_LEARNING_UI) return;

  var _currentLevel = null;
  var _lessonCache = {};
  var LESSON_01_IMAGE_BASE = './assets/images/learning/lesson-01/';

  var _LEVELS = {
    1: {
      id: 1,
      title: '先看懂零件图',
      stage: 1,
      time: '10分钟',
      subtitle: '先找基准，再看关键尺寸。图纸没看明白，程序写得再漂亮也容易错。',
      teacherTip: '图纸没看明白，程序写得再漂亮也没用。',
      problem: '很多新手一拿到图纸就急着想G代码，其实第一步应该先确认零件、材料、基准、关键尺寸和技术要求。图纸方向错了，后面的装夹、对刀、程序零点都会跟着错。',
      imageCards: [
        {
          src: LESSON_01_IMAGE_BASE + '1.png',
          title: '拿到图纸，先看这4步',
          desc: '先看标题栏，再找基准，然后看关键尺寸，最后看技术要求。'
        },
        {
          src: LESSON_01_IMAGE_BASE + '2.png',
          title: '基准A/B/C是什么意思',
          desc: '基准会影响装夹方式、测量依据和G54零点思路。'
        },
        {
          src: LESSON_01_IMAGE_BASE + '3.png',
          title: '哪些尺寸最关键',
          desc: '先抓决定成败的尺寸，比如孔径、孔位、中心距、台阶高度和公差尺寸。'
        },
        {
          src: LESSON_01_IMAGE_BASE + '4.png',
          title: '新手最容易犯的4个错误',
          desc: '很多问题不是程序不会写，而是图纸先看错了。'
        },
        {
          src: LESSON_01_IMAGE_BASE + '5.png',
          title: '编程前先检查这6项',
          desc: '先检查，再编程，能少犯很多低级错误。'
        }
      ],
      quizzes: [
        { id: 'l1q1', type: 'multiple', question: '拿到一张零件图，新手第一步最应该先看什么？', options: ['直接开始写G代码', '先看标题栏、材料、基准和关键尺寸', '先估一个转速进给', '先找一把看起来合适的刀'], answer: 1, explanation: '先确认图纸和基准，再谈刀具、坐标、工序和程序。图纸信息没确认，后面越做越容易偏。' },
        { id: 'l1q2', type: 'multiple', question: '图纸上的基准A/B/C，主要会影响数控加工中的哪件事？', options: ['工件装夹、测量依据和G54零点', '主轴颜色', '冷却液品牌', '机床外观'], answer: 0, explanation: '基准决定工件按哪里定位、按哪里测量，也会影响编程零点和加工顺序。没看基准就编程，很容易导致尺寸整体偏。' },
        { id: 'l1q3', type: 'truefalse', question: '只要外形尺寸看懂了，技术要求可以最后随便看看。', options: ['正确', '错误'], answer: 1, explanation: '技术要求里常有倒角、去毛刺、粗糙度、热处理、未注公差等要求，很多加工返工都来自这里漏看。' }
      ],
      summary: '本关过关标准：你能对着一张简单零件图说出“材料是什么、基准在哪里、关键尺寸有哪些、哪些公差必须重点控制”，就算真正入门。'
    },
    2: { id: 2, title: '机床的东南西北', stage: 1, time: '8分钟', objectives: ['理解机床坐标轴概念', '掌握X/Y/Z轴方向判断', '了解正负方向含义', '认识机床坐标系与工件坐标系的关系'], steps: ['站在操作位置面对机床', '右手直角坐标系：大拇指=X轴，食指=Y轴，中指=Z轴', 'Z轴为主轴方向，远离工件为正', 'X轴为水平方向，右方为正', 'Y轴根据右手定则确定'], errors: ['坐标系混淆：加工中心Z轴垂直于工作台，车床Z轴平行于主轴', '正负方向记反：远离工件为正，靠近工件为负的规则适用于大多数情况', '忽略机床类型：立式加工中心和卧式加工中心的坐标系方向不同'], quizzes: [{ id: 'q4', type: 'multiple', question: '在立式加工中心上，Z轴正方向指向哪里？', options: ['指向工作台', '指向主轴上方（远离工件）', '指向操作者', '指向右侧'], answer: 1, explanation: 'Z轴正方向为刀具远离工件的方向，在立式加工中心上即主轴向上方向。' }, { id: 'q5', type: 'truefalse', question: '数控机床的坐标轴方向在所有机床上都是一样的。', options: ['正确', '错误'], answer: 1, explanation: '不同机床类型（立式/卧式/车床）的坐标轴方向不同，需要根据具体机床类型确定。'}], summary: '本章学习了机床坐标系的建立方法，掌握了X、Y、Z三轴的方向判断规则，理解了正负方向与加工运动的关系。坐标系是数控编程的基础。' },
    3: { id: 3, title: '找机床的老家', stage: 1, time: '6分钟', objectives: ['理解回零(回参考点)的意义', '掌握回零操作方法', '了解参考点位置', '认识机床坐标系建立过程'], steps: ['确认机床处于手动模式', '按回零键（通常标记为HOME或REF）', '先回Z轴（避免干涉），再回X和Y', '观察坐标显示变为零或机床设定值', '确认回零指示灯亮起'], errors: ['不回零直接编程：机床断电后丢失坐标系，必须回零重新建立', '回零顺序错误：应先回Z轴避免碰撞', '回零过程中急停：可能导致参考点位置偏移'], quizzes: [{ id: 'q6', type: 'multiple', question: '机床回参考点的目的是什么？', options: ['让刀具回到换刀位置', '建立机床绝对坐标系', '清除加工程序', '检查主轴转速'], answer: 1, explanation: '回参考点是为了让机床建立绝对坐标系，使机床知道自己的准确位置。'}, { id: 'q7', type: 'multiple', question: '为什么应该先回Z轴？', options: ['Z轴运动最快', '避免刀具与工件或夹具碰撞', '先回Z轴可以节省时间', '机床控制系统有要求'], answer: 1, explanation: '先回Z轴可以将刀具抬高到安全位置，避免在回其他轴时发生碰撞。'}], summary: '本章学习了机床回参考点的方法和意义。回零是开机后的第一步操作，用于建立机床坐标系，确保位置精度。' },
    4: { id: 4, title: '告诉机床活儿在哪', stage: 1, time: '10分钟', objectives: ['理解工件坐标系G54-G59', '掌握对刀操作方法', '了解工件零点设置', '掌握坐标系偏移概念'], steps: ['装夹工件并找正', '选择对刀方式（试切法/对刀仪）', '分别对X、Y、Z轴确定工件零点', '将零点数值输入对应的G54-G59寄存器', '验证对刀结果'], errors: ['对刀方向错误：正负方向搞反会导致加工位置偏移', '忘记切换坐标系：在G54中对刀却在G55中运行程序', '忽略刀长补偿：Z轴对刀必须考虑刀具长度'], quizzes: [{ id: 'q8', type: 'multiple', question: 'G54-G59用于什么？', options: ['主轴转速设置', '工件坐标系选择', '进给速度设置', '刀具补偿选择'], answer: 1, explanation: 'G54到G59用于选择工件坐标系，每个编号对应一组可设定的零点偏移值。'}, { id: 'q9', type: 'truefalse', question: '对刀完成后可以不验证直接开始加工。', options: ['正确', '错误'], answer: 1, explanation: '对刀完成后必须验证，通常通过手动移动到已知位置或使用对刀仪检查，确认坐标值正确。'}], summary: '本章学习了对刀和工件坐标系的设置方法。掌握G54-G59的使用是数控加工中的核心技能，直接影响加工精度。' }
  };

  function getLessonData(level) {
    if (_lessonCache[level]) return _lessonCache[level];
    var data = _LEVELS[level];
    if (!data) return null;
    _lessonCache[level] = data;
    return data;
  }

  function renderLessonDetail(level) {
    var data = getLessonData(level);
    if (!data) { console.error('[CNC_LEARNING_UI] 关卡 ' + level + ' 数据不存在'); return ''; }
    _currentLevel = level;
    if (Number(level) === 1) return renderLessonOne(data);

    var html = '<div class="lesson-detail" data-level="' + level + '">';
    html += '<div class="lesson-header"><h2>' + escapeHtml(data.title) + '</h2>';
    html += '<div class="lesson-meta"><span class="lesson-stage">阶段 ' + data.stage + '</span><span class="lesson-time">⏱ ' + data.time + '</span></div></div>';
    html += renderObjectives(data.objectives);
    html += renderSteps(data.steps);
    html += renderErrors(data.errors);
    html += renderQuizzes(data.quizzes);
    html += renderSummary(data.summary);
    html += '<div class="lesson-navigation" id="lesson-nav"></div>';
    html += '</div>';
    return html;
  }

  function renderLessonOne(data) {
    var html = '<div class="lesson-detail lesson-detail-mobile" data-level="1">';
    html += '<div class="lesson-mobile-hero">';
    html += '<div class="lesson-mobile-progress"><span>第1关 / 12</span><span>建议 10 分钟</span></div>';
    html += '<h2>' + escapeHtml(data.title) + '</h2>';
    html += '<p>' + escapeHtml(data.subtitle) + '</p>';
    html += '<div class="lesson-mobile-tags"><span>图纸识读</span><span>基准</span><span>关键尺寸</span><span>公差</span></div>';
    html += '</div>';

    html += '<section class="lesson-section lesson-focus-card"><h3>这一关先解决什么问题</h3><p>' + escapeHtml(data.problem) + '</p></section>';
    html += '<section class="lesson-teacher-tip"><span>老师傅一句话</span><strong>' + escapeHtml(data.teacherTip) + '</strong></section>';
    html += renderImageCards(data.imageCards);
    html += renderQuizzes(data.quizzes);
    html += renderSummary(data.summary);
    html += '<div class="lesson-navigation" id="lesson-nav"></div>';
    html += '</div>';
    return html;
  }

  function renderImageCards(cards) {
    if (!cards || !cards.length) return '';
    var html = '<div class="lesson-image-flow">';
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      html += '<section class="lesson-image-card">';
      html += '<div class="lesson-image-head"><span>图 ' + (i + 1) + '</span><h3>' + escapeHtml(card.title) + '</h3></div>';
      html += '<img src="' + escapeHtml(card.src) + '" alt="' + escapeHtml(card.title) + '" loading="lazy">';
      html += '<p>' + escapeHtml(card.desc) + '</p>';
      html += '</section>';
    }
    html += '</div>';
    return html;
  }

  function renderObjectives(objectives) {
    if (!objectives || !objectives.length) return '';
    var html = '<section class="lesson-section lesson-objectives"><h3>学习目标</h3><ul class="objective-list">';
    for (var i = 0; i < objectives.length; i++) {
      html += '<li class="objective-item"><span class="objective-check">☐</span> ' + escapeHtml(objectives[i]) + '</li>';
    }
    html += '</ul></section>';
    return html;
  }

  function renderSteps(steps) {
    if (!steps || !steps.length) return '';
    var html = '<section class="lesson-section lesson-steps"><h3>操作步骤</h3><ol class="steps-list">';
    for (var i = 0; i < steps.length; i++) {
      html += '<li class="step-item"><span class="step-number">' + (i + 1) + '</span><div class="step-content">' + escapeHtml(steps[i]) + '</div></li>';
    }
    html += '</ol></section>';
    return html;
  }

  function renderErrors(errors) {
    if (!errors || !errors.length) return '';
    var html = '<section class="lesson-section lesson-errors"><h3>常见错误与避免</h3><div class="errors-list">';
    for (var i = 0; i < errors.length; i++) {
      var parts = errors[i].split('：');
      html += '<div class="error-card"><span class="error-icon">⚠️</span><div class="error-text">';
      if (parts.length > 1) { html += '<strong>' + escapeHtml(parts[0]) + '</strong>：' + escapeHtml(parts.slice(1).join('：')); }
      else { html += escapeHtml(errors[i]); }
      html += '</div></div>';
    }
    html += '</div></section>';
    return html;
  }

  function renderQuizzes(quizzes) {
    if (!quizzes || !quizzes.length) return '';
    var html = '<section class="lesson-section lesson-quizzes"><h3>过关小测</h3><div class="quizzes-list">';
    for (var i = 0; i < quizzes.length; i++) {
      html += renderSingleQuiz(quizzes[i], i);
    }
    html += '</div></section>';
    return html;
  }

  function renderSingleQuiz(quiz, index) {
    var html = '<div class="quiz-card" data-quiz-id="' + quiz.id + '">';
    html += '<div class="quiz-header"><span class="quiz-number">第 ' + (index + 1) + ' 题</span>';
    var typeLabel = quiz.type === 'multiple' ? '选择题' : quiz.type === 'truefalse' ? '判断题' : '填空题';
    html += '<span class="quiz-type">' + typeLabel + '</span></div>';
    html += '<p class="quiz-question">' + escapeHtml(quiz.question) + '</p><div class="quiz-options">';
    for (var j = 0; j < quiz.options.length; j++) {
      html += '<label class="quiz-option"><input type="radio" name="' + quiz.id + '" value="' + j + '"><span class="quiz-option-text">' + escapeHtml(quiz.options[j]) + '</span></label>';
    }
    html += '</div><div class="quiz-feedback" style="display:none"></div>';
    html += '<button class="quiz-submit primary-button" data-quiz-id="' + quiz.id + '" data-answer="' + quiz.answer + '">提交答案</button>';
    html += '<div class="quiz-explanation" style="display:none"><p>' + escapeHtml(quiz.explanation) + '</p></div></div>';
    return html;
  }

  function renderSummary(summary) {
    if (!summary) return '';
    return '<section class="lesson-section lesson-summary"><h3>本关过关标准</h3><div class="summary-content">' + escapeHtml(summary) + '</div></section>';
  }

  function initNavigation() {
    var nav = document.getElementById('lesson-nav');
    if (!nav) return;
    var level = _currentLevel;
    var prevLevel = level > 1 ? level - 1 : null;
    var nextLevel = _LEVELS[level + 1] ? level + 1 : null;
    var html = '<div class="lesson-nav-buttons">';
    if (prevLevel) { html += '<button class="lesson-nav-btn prev" data-level="' + prevLevel + '">← ' + escapeHtml(_LEVELS[prevLevel].title) + '</button>'; }
    else { html += '<button class="lesson-nav-btn disabled" disabled>← 已是第一关</button>'; }
    html += '<button class="lesson-nav-btn mark-complete" data-level="' + level + '">完成本关 ✓</button>';
    if (nextLevel) { html += '<button class="lesson-nav-btn next" data-level="' + nextLevel + '">' + escapeHtml(_LEVELS[nextLevel].title) + ' →</button>'; }
    else { html += '<button class="lesson-nav-btn disabled" disabled>已是最后一关 →</button>'; }
    html += '</div>';
    nav.innerHTML = html;
  }

  function installMobileStudyStyles() {
    if (document.getElementById('cnc-mobile-study-style')) return;
    var css = '' +
      '#view-study .study-card[data-level="1"] h4{font-size:20px;}' +
      '#view-study .study-card[data-level="1"]{border-color:rgba(207,109,54,.28);box-shadow:0 14px 32px rgba(207,109,54,.12);}' +
      '#view-study .study-card[data-level="1"] .study-card-icon{background:rgba(207,109,54,.12);}' +
      '#view-study .lesson-detail-mobile{display:grid;gap:14px;padding-bottom:76px;}' +
      '#view-study .lesson-mobile-hero{border-radius:22px;padding:18px;background:linear-gradient(135deg,rgba(207,109,54,.16),rgba(46,106,89,.10));border:1px solid rgba(207,109,54,.18);}' +
      '#view-study .lesson-mobile-progress{display:flex;justify-content:space-between;gap:10px;color:var(--accent-deep);font-size:13px;font-weight:800;margin-bottom:10px;}' +
      '#view-study .lesson-mobile-hero h2{margin:0;font-size:28px;line-height:1.15;}' +
      '#view-study .lesson-mobile-hero p{margin:10px 0 0;color:var(--muted);line-height:1.75;}' +
      '#view-study .lesson-mobile-tags{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;}' +
      '#view-study .lesson-mobile-tags span{border-radius:999px;background:var(--green-soft);color:var(--green);padding:6px 10px;font-size:12px;font-weight:800;}' +
      '#view-study .lesson-section,#view-study .lesson-teacher-tip,#view-study .lesson-image-card{background:var(--card-strong);border:1px solid rgba(29,38,34,.08);border-radius:18px;padding:16px;}' +
      '#view-study .lesson-section h3,#view-study .lesson-image-card h3{margin:0;font-size:18px;}' +
      '#view-study .lesson-section p,#view-study .summary-content,#view-study .lesson-image-card p{line-height:1.75;color:var(--muted);}' +
      '#view-study .lesson-teacher-tip{display:grid;gap:8px;background:#fff7ed;border-color:#fed7aa;}' +
      '#view-study .lesson-teacher-tip span{color:var(--accent-deep);font-size:13px;font-weight:800;}' +
      '#view-study .lesson-teacher-tip strong{font-size:20px;line-height:1.45;color:#7c2d12;}' +
      '#view-study .lesson-image-flow{display:grid;gap:14px;}' +
      '#view-study .lesson-image-head{display:flex;align-items:center;gap:10px;margin-bottom:12px;}' +
      '#view-study .lesson-image-head span{display:inline-flex;align-items:center;justify-content:center;min-width:42px;height:28px;border-radius:999px;background:var(--green-soft);color:var(--green);font-size:12px;font-weight:900;}' +
      '#view-study .lesson-image-card img{display:block;width:100%;height:auto;border-radius:16px;background:#fff;border:1px solid rgba(29,38,34,.08);box-shadow:0 10px 24px rgba(85,63,39,.10);}' +
      '#view-study .lesson-image-card p{margin:12px 0 0!important;font-size:14px;}' +
      '#view-study .quiz-card{background:rgba(255,255,255,.70);border:1px solid rgba(29,38,34,.08);border-radius:16px;padding:14px;margin-top:12px;}' +
      '#view-study .quiz-options{display:grid;gap:8px;margin-top:10px;}' +
      '#view-study .quiz-option{display:flex;gap:8px;align-items:flex-start;border:1px solid rgba(29,38,34,.10);background:#fff;border-radius:14px;padding:10px;}' +
      '#view-study .quiz-feedback.is-correct{display:block!important;background:#dcfce7;color:#166534;border-radius:12px;padding:10px;margin-top:10px;}' +
      '#view-study .quiz-feedback.is-wrong{display:block!important;background:#fee2e2;color:#991b1b;border-radius:12px;padding:10px;margin-top:10px;}' +
      '#view-study .quiz-explanation{display:block!important;background:#f8fafc;border-radius:12px;padding:10px;margin-top:10px;color:var(--muted);}' +
      '@media(max-width:640px){#view-study .section-head h3{font-size:24px}#view-study .study-card-grid{display:grid;gap:12px}#view-study .study-card{padding:14px;border-radius:18px}#view-study .study-card-icon{font-size:24px;margin:8px 0}#view-study .study-card h4{font-size:19px;margin:6px 0}#view-study .study-card p{font-size:14px;line-height:1.65}#view-study .lesson-mobile-hero h2{font-size:25px}#view-study .lesson-image-card{padding:12px;border-radius:18px}#view-study .lesson-image-card img{border-radius:14px}#view-study .lesson-nav-buttons{position:sticky;bottom:10px;z-index:6;background:rgba(255,251,244,.94);border:1px solid rgba(29,38,34,.08);border-radius:18px;padding:10px;box-shadow:0 14px 34px rgba(85,63,39,.16)}#view-study .lesson-nav-buttons .lesson-nav-btn{width:100%;margin-top:8px}}';
    var style = document.createElement('style');
    style.id = 'cnc-mobile-study-style';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function polishStudyList() {
    var stageOneTitle = document.querySelector('#view-study .stage-header h4');
    if (stageOneTitle) stageOneTitle.textContent = '图纸、坐标与机床基准';

    var intro = document.querySelector('#view-study .section-head > p');
    if (intro) intro.textContent = '按顺序闯关，从看懂图纸、找基准、建坐标，到能独立判断程序和加工风险。每关都有图文、答题和过关检查。';

    var card = document.querySelector('#view-study .study-card[data-level="1"]');
    if (!card) return;
    var time = card.querySelector('.study-card-time');
    var title = card.querySelector('h4');
    var desc = card.querySelector('p');
    var tags = card.querySelector('.study-card-tags');
    if (time) time.textContent = '⏱ 10分钟';
    if (title) title.textContent = '先看懂零件图';
    if (desc) desc.textContent = '拿到图纸别急着编程。先确认标题栏、材料、基准、关键尺寸和技术要求，避免一开始方向就错。';
    if (tags) tags.innerHTML = '<span class="tag">图纸识读</span><span class="tag">基准</span><span class="tag">关键尺寸</span><span class="tag">公差</span>';
  }

  function bindQuizFeedback() {
    if (window.__CNC_LESSON_QUIZ_BOUND__) return;
    window.__CNC_LESSON_QUIZ_BOUND__ = true;
    document.addEventListener('click', function (event) {
      var btn = event.target.closest && event.target.closest('.quiz-submit[data-quiz-id]');
      if (!btn) return;
      var card = btn.closest('.quiz-card');
      if (!card) return;
      var answer = String(btn.getAttribute('data-answer'));
      var selected = card.querySelector('input[type="radio"]:checked');
      var feedback = card.querySelector('.quiz-feedback');
      var explanation = card.querySelector('.quiz-explanation');
      if (!feedback) return;
      feedback.className = 'quiz-feedback';
      feedback.style.display = 'block';
      if (!selected) {
        feedback.classList.add('is-wrong');
        feedback.textContent = '先选一个答案，再提交。';
        return;
      }
      if (String(selected.value) === answer) {
        feedback.classList.add('is-correct');
        feedback.textContent = '答对了。这个判断很关键，说明你已经开始按加工逻辑看图纸了。';
      } else {
        feedback.classList.add('is-wrong');
        feedback.textContent = '还不稳。别急着背代码，先把图纸信息、基准和关键尺寸看明白。';
      }
      if (explanation) explanation.style.display = 'block';
    });
  }

  function boot() {
    installMobileStudyStyles();
    polishStudyList();
    bindQuizFeedback();
  }

  function escapeHtml(text) {
    if (!text) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.CNC_LEARNING_UI = {
    renderLessonDetail: renderLessonDetail,
    renderObjectives: renderObjectives,
    renderSteps: renderSteps,
    renderErrors: renderErrors,
    renderQuizzes: renderQuizzes,
    renderSummary: renderSummary,
    initNavigation: initNavigation,
    getLessonData: getLessonData,
    getCurrentLevel: function () { return _currentLevel; },
    polishStudyList: polishStudyList
  };

  console.log('[CNC_LEARNING_UI] 学习详情页渲染引擎已加载。第1关已接入5张图片，优化为手机端图文课。');
})();
