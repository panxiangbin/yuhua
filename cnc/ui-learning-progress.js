/**
 * ui-learning-progress.js
 * 学习进度追踪系统 — 关卡完成度/学习时长/进度条/导出报告
 * 全局对象: window.CNC_LEARNING_PROGRESS
 */
(function () {
  'use strict';

  if (window.CNC_LEARNING_PROGRESS) return;

  var _progress = {};
  var _timeTracking = {};
  var _sessionStart = null;
  var _STORAGE_KEY = 'cnc_learning_progress';
  var _TIME_KEY = 'cnc_learning_time';
  var TOTAL_LEVELS = 12;
  var STAGES = [
    { id: 1, name: '认识机床与坐标', levels: [1, 2, 3, 4] },
    { id: 2, name: '安全操作与刀具', levels: [5, 6, 7] },
    { id: 3, name: '编程基础代码', levels: [8, 9, 10, 11] },
    { id: 4, name: '高效编程技巧', levels: [12] }
  ];

  function _loadProgress() {
    try {
      var data = localStorage.getItem(_STORAGE_KEY);
      if (data) _progress = JSON.parse(data);
      var timeData = localStorage.getItem(_TIME_KEY);
      if (timeData) _timeTracking = JSON.parse(timeData);
    } catch (e) { _progress = {}; _timeTracking = {}; }
  }

  function _saveProgress() {
    try {
      localStorage.setItem(_STORAGE_KEY, JSON.stringify(_progress));
      localStorage.setItem(_TIME_KEY, JSON.stringify(_timeTracking));
    } catch (e) { console.warn('[CNC_LEARNING_PROGRESS] 保存进度失败:', e.message); }
  }

  _loadProgress();

  function markLessonComplete(level) {
    if (!_progress[level]) {
      _progress[level] = { completed: false, completedAt: null, attempts: 0, timeSpent: 0 };
    }
    _progress[level].completed = true;
    _progress[level].completedAt = Date.now();
    _progress[level].attempts = (_progress[level].attempts || 0) + 1;
    if (_sessionStart) {
      var elapsed = Math.floor((Date.now() - _sessionStart) / 1000);
      _timeTracking[level] = (_timeTracking[level] || 0) + elapsed;
      _progress[level].timeSpent = (_progress[level].timeSpent || 0) + elapsed;
      _sessionStart = null;
    }
    _saveProgress();
    console.log('[CNC_LEARNING_PROGRESS] 关卡 ' + level + ' 已完成');
    return true;
  }

  function getLessonProgress(level) {
    var p = _progress[level];
    if (!p) return { completed: false, completedAt: null, attempts: 0, timeSpent: 0 };
    return { completed: p.completed || false, completedAt: p.completedAt || null, attempts: p.attempts || 0, timeSpent: _timeTracking[level] || 0 };
  }

  function getOverallProgress() {
    var completed = 0;
    var totalTime = 0;
    for (var i = 1; i <= TOTAL_LEVELS; i++) {
      if (_progress[i] && _progress[i].completed) completed++;
      totalTime += _timeTracking[i] || 0;
    }
    return {
      completed: completed,
      total: TOTAL_LEVELS,
      percentage: Math.round(completed / TOTAL_LEVELS * 100),
      totalTimeSeconds: totalTime,
      totalTimeFormatted: _formatDuration(totalTime)
    };
  }

  function renderProgressBar(stage) {
    var levels = STAGES[stage - 1];
    if (!levels) return '<p class="progress-error">无效的阶段编号</p>';
    var levelList = levels.levels;
    var completed = 0;
    var total = levelList.length;
    for (var i = 0; i < levelList.length; i++) {
      if (_progress[levelList[i]] && _progress[levelList[i]].completed) completed++;
    }
    var pct = total > 0 ? Math.round(completed / total * 100) : 0;
    var html = '<div class="progress-bar-container" data-stage="' + stage + '">';
    html += '<div class="progress-bar-label"><span>阶段 ' + stage + '</span><span>' + completed + '/' + total + '</span></div>';
    html += '<div class="progress-bar-track"><div class="progress-bar-fill" style="width:' + pct + '%"></div></div>';
    html += '</div>';
    return html;
  }

  function calculateTimeSpent(level) {
    return _timeTracking[level] || 0;
  }

  function startSession(level) {
    _sessionStart = Date.now();
    console.log('[CNC_LEARNING_PROGRESS] 开始学习关卡 ' + level);
  }

  function endSession(level) {
    if (!_sessionStart) return 0;
    var elapsed = Math.floor((Date.now() - _sessionStart) / 1000);
    _timeTracking[level] = (_timeTracking[level] || 0) + elapsed;
    if (_progress[level]) _progress[level].timeSpent = (_progress[level].timeSpent || 0) + elapsed;
    _sessionStart = null;
    _saveProgress();
    return elapsed;
  }

  function exportProgressReport() {
    var overall = getOverallProgress();
    var report = { exportedAt: new Date().toISOString(), overall: overall, stages: [], lessons: {} };
    for (var i = 0; i < STAGES.length; i++) {
      var s = STAGES[i];
      var stageDone = 0;
      for (var j = 0; j < s.levels.length; j++) {
        if (_progress[s.levels[j]] && _progress[s.levels[j]].completed) stageDone++;
      }
      report.stages.push({ id: s.id, name: s.name, completed: stageDone, total: s.levels.length });
    }
    for (var k = 1; k <= TOTAL_LEVELS; k++) {
      report.lessons[k] = getLessonProgress(k);
    }
    return report;
  }

  function getStageProgress(stageId) {
    var stage = null;
    for (var i = 0; i < STAGES.length; i++) {
      if (STAGES[i].id === stageId) { stage = STAGES[i]; break; }
    }
    if (!stage) return null;
    var completed = 0;
    for (var j = 0; j < stage.levels.length; j++) {
      if (_progress[stage.levels[j]] && _progress[stage.levels[j]].completed) completed++;
    }
    return { name: stage.name, completed: completed, total: stage.levels.length, percentage: Math.round(completed / stage.levels.length * 100) };
  }

  function _formatDuration(seconds) {
    if (seconds < 60) return seconds + '秒';
    var mins = Math.floor(seconds / 60);
    var secs = seconds % 60;
    if (mins < 60) return mins + '分' + secs + '秒';
    var hours = Math.floor(mins / 60);
    mins = mins % 60;
    return hours + '小时' + mins + '分' + secs + '秒';
  }

  window.CNC_LEARNING_PROGRESS = {
    markLessonComplete: markLessonComplete,
    getLessonProgress: getLessonProgress,
    getOverallProgress: getOverallProgress,
    renderProgressBar: renderProgressBar,
    calculateTimeSpent: calculateTimeSpent,
    startSession: startSession,
    endSession: endSession,
    exportProgressReport: exportProgressReport,
    getStageProgress: getStageProgress,
    getStages: function () { return STAGES.slice(); },
    resetAll: function () { _progress = {}; _timeTracking = {}; _saveProgress(); }
  };

  console.log('[CNC_LEARNING_PROGRESS] 学习进度追踪系统已加载。已完成 ' + getOverallProgress().completed + '/' + TOTAL_LEVELS + ' 关。');
})();
