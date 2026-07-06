/**
 * ui-learning-detail.js
 * 学习关卡详情页渲染引擎
 * 全局对象: window.CNC_LEARNING_UI
 */
(function () {
  'use strict';

  if (window.CNC_LEARNING_UI) return;

  var _currentLevel = null;
  var _lessonCache = {};
  var _LEVELS = {
    1: { id: 1, title: '认识零件的身份证', stage: 1, time: '5分钟', objectives: ['理解图纸基本符号', '认识尺寸标注', '了解公差符号', '掌握表面粗糙度符号'], steps: ['打开图纸，找到标题栏', '识别图框中的零件名称和材料', '查看所有尺寸标注，区分线性/直径/半径', '识别公差符号和表面粗糙度标记', '核对所有技术要求'], errors: ['忽略标题栏信息：标题栏包含材料、比例、图号等关键信息', '混淆尺寸线：注意区分线性尺寸和直径尺寸的标注方式', '忽视基准符号：基准符号影响后续加工定位'], quizzes: [{ id: 'q1', type: 'multiple', question: '图纸中标注 Φ50H7 表示什么？', options: ['直径50mm，公差等级H7的孔', '半径50mm，公差等级H7的轴', '直径50mm，配合间隙H7', '螺纹M50，精度等级H7'], answer: 0, explanation: 'Φ表示直径，50是基本尺寸，H7是公差带代号（H表示孔的基本偏差，7表示IT7公差等级）' }, { id: 'q2', type: 'truefalse', question: '表面粗糙度值越小，表面越光滑。', options: ['正确', '错误'], answer: 0, explanation: '表面粗糙度值（Ra）越小，表示加工表面越光滑，但加工成本也相应提高。' }, { id: 'q3', type: 'multiple', question: 'C2 在图纸中表示什么？', options: ['倒角2mm', '倒角2×45°', '圆角R2', '锥度2:1'], answer: 1, explanation: 'C2表示45°倒角，倒角宽度为2mm。C是Chamfer（倒角）的缩写。'}], summary: '本章学习了图纸基本符号的识别方法，包括标题栏信息读取、尺寸标注分类、公差符号理解、表面粗糙度判定。掌握这些基础知识后，可以正确解读大多数机械图纸的基本信息。' },
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
    var html = '<div class="lesson-detail" data-level="' + level + '">';
    html += '<div class="lesson-header"><h2>' + data.title + '</h2>';
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
      if (parts.length > 1) { html += '<strong>' + escapeHtml(parts[0]) + '</strong>：' + escapeHtml(parts[1]); }
      else { html += escapeHtml(errors[i]); }
      html += '</div></div>';
    }
    html += '</div></section>';
    return html;
  }

  function renderQuizzes(quizzes) {
    if (!quizzes || !quizzes.length) return '';
    var html = '<section class="lesson-section lesson-quizzes"><h3>互动练习</h3><div class="quizzes-list">';
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
    html += '<button class="quiz-submit primary-button" data-quiz-id="' + quiz.id + '">提交答案</button>';
    html += '<div class="quiz-explanation" style="display:none"><p>' + escapeHtml(quiz.explanation) + '</p></div></div>';
    return html;
  }

  function renderSummary(summary) {
    if (!summary) return '';
    return '<section class="lesson-section lesson-summary"><h3>本章小结</h3><div class="summary-content">' + escapeHtml(summary) + '</div></section>';
  }

  function initNavigation() {
    var nav = document.getElementById('lesson-nav');
    if (!nav) return;
    var level = _currentLevel;
    var prevLevel = level > 1 ? level - 1 : null;
    var nextLevel = _LEVELS[level + 1] ? level + 1 : null;
    var html = '<div class="lesson-nav-buttons">';
    if (prevLevel) { html += '<button class="lesson-nav-btn prev" data-level="' + prevLevel + '">← ' + _LEVELS[prevLevel].title + '</button>'; }
    else { html += '<button class="lesson-nav-btn disabled" disabled>← 已是第一关</button>'; }
    html += '<button class="lesson-nav-btn mark-complete" data-level="' + level + '">标记完成 ✓</button>';
    if (nextLevel) { html += '<button class="lesson-nav-btn next" data-level="' + nextLevel + '">' + _LEVELS[nextLevel].title + ' →</button>'; }
    else { html += '<button class="lesson-nav-btn disabled" disabled>已是最后一关 →</button>'; }
    html += '</div>';
    nav.innerHTML = html;
  }

  function escapeHtml(text) {
    if (!text) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
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
    getCurrentLevel: function () { return _currentLevel; }
  };

  console.log('[CNC_LEARNING_UI] 学习详情页渲染引擎已加载。内置 ' + Object.keys(_LEVELS).length + ' 关示例数据。');
})();
