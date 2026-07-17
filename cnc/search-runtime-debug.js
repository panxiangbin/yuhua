/**
 * 搜索诊断 + 第12关基础程序安全检查
 * 搜索诊断默认关闭；程序检查器仅作学习与首轮排查，不替代仿真、空运行和现场确认。
 */
(function () {
  'use strict';

  var debug = {
    enabled: false,
    logs: [],
    maxLogs: 100,

    checkAliasesLoaded: function () {
      var aliases = window.CNC_SEARCH_ALIASES;
      return {
        loaded: Array.isArray(aliases),
        count: Array.isArray(aliases) ? aliases.length : 0,
        sample: Array.isArray(aliases) ? aliases[0] || null : null,
        error: Array.isArray(aliases) ? null : 'window.CNC_SEARCH_ALIASES 未正确加载'
      };
    },

    logExpansion: function (keyword, expandedTerms) {
      if (!this.enabled) return;
      this._push({
        timestamp: Date.now(),
        type: 'expansion',
        keyword: keyword,
        expandedTerms: expandedTerms || [],
        expanded: Array.isArray(expandedTerms) && expandedTerms.length > 1
      });
      console.log('[搜索扩展]', keyword, '→', expandedTerms);
    },

    logMatch: function (entry, keyword, matchInfo) {
      if (!this.enabled || !entry) return;
      this._push({
        timestamp: Date.now(),
        type: 'match',
        entryId: entry.id,
        entryTitle: entry.title,
        keyword: keyword,
        matchInfo: matchInfo || {}
      });
      console.log('[匹配成功]', entry.title, '←', keyword, matchInfo);
    },

    explainMatch: function (entry, keyword, expandedTerms) {
      if (!entry) return [];
      var terms = [keyword].concat(Array.isArray(expandedTerms) ? expandedTerms : []).filter(Boolean);
      var sources = [
        { key: 'code', value: entry.code || '' },
        { key: 'title', value: entry.title || '' },
        { key: 'tags', value: (entry.tags || []).join(' ') },
        { key: 'aliases', value: (entry.aliases || []).join(' ') },
        { key: 'summary', value: entry.summary || '' }
      ];
      var output = [];
      terms.forEach(function (term) {
        var normalized = debug._normalize(term);
        sources.forEach(function (source) {
          if (normalized && debug._normalize(source.value).includes(normalized)) {
            output.push({
              type: term === keyword ? 'direct' : 'alias',
              source: source.key,
              term: term,
              text: source.key + ' 命中“' + term + '”'
            });
          }
        });
      });
      return output;
    },

    getRecentLogs: function (count) {
      return this.logs.slice(-(Number(count) || 10));
    },

    clearLogs: function () {
      this.logs = [];
      console.log('[搜索诊断] 日志已清空');
    },

    printDiagnostics: function () {
      var aliasStatus = this.checkAliasesLoaded();
      console.group('🔍 搜索系统诊断');
      console.log('别名表:', aliasStatus.loaded ? '已加载' : '未加载');
      console.log('别名数量:', aliasStatus.count);
      console.log('前端索引:', window.CNC_FRONTEND && window.CNC_FRONTEND.getIndexMatches ? '可用' : '不可用');
      console.log('最近日志:', this.getRecentLogs(5));
      console.groupEnd();
      return { aliases: aliasStatus, logs: this.getRecentLogs(5) };
    },

    testExpansion: function (keyword) {
      var expanded = window.expandSearchTerm ? window.expandSearchTerm(keyword) : [keyword];
      console.log('[搜索扩展测试]', keyword, '→', expanded);
      return expanded;
    },

    _push: function (item) {
      this.logs.push(item);
      if (this.logs.length > this.maxLogs) this.logs.shift();
    },

    _normalize: function (text) {
      return String(text || '').normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
    }
  };

  window.CNC_SEARCH_DEBUG = debug;
  window.checkSearch = function () { return debug.printDiagnostics(); };
  window.testSearch = function (keyword) { return debug.testExpansion(keyword); };
  window.enableSearchDebug = function () { debug.enabled = true; console.log('✅ 搜索调试已启用'); };
  window.disableSearchDebug = function () { debug.enabled = false; console.log('⚠️ 搜索调试已关闭'); };

  installProgramChecker();

  function installProgramChecker() {
    function boot() {
      installCheckerStyles();
      var content = document.getElementById('study-detail-content');
      if (!content) return;
      var observer = new MutationObserver(function () { mountChecker(); });
      observer.observe(content, { childList: true, subtree: true });
      mountChecker();
      bindCheckerEvents();
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot);
    } else {
      boot();
    }
  }

  function installCheckerStyles() {
    if (document.getElementById('cnc-program-checker-style')) return;
    var style = document.createElement('style');
    style.id = 'cnc-program-checker-style';
    style.textContent = [
      '#view-study .lesson-program-checker{background:linear-gradient(145deg,#0f1f38,#17354a);color:#eef8ff;border:1px solid rgba(123,211,255,.24)}',
      '#view-study .lesson-program-checker h3{color:#fff}',
      '#view-study .program-checker-intro{color:#c8dce8!important;margin:0 0 12px!important}',
      '#view-study .program-checker-warning{margin:0 0 12px;padding:10px 12px;border-radius:12px;background:rgba(245,158,11,.15);border:1px solid rgba(245,158,11,.35);color:#ffe2a8;font-size:13px;line-height:1.65}',
      '#view-study .program-checker-editor{width:100%;min-height:340px;box-sizing:border-box;border-radius:14px;border:1px solid rgba(148,202,230,.35);background:#08131f;color:#dff4ff;padding:14px;font:500 14px/1.65 Consolas,Monaco,monospace;resize:vertical;outline:none}',
      '#view-study .program-checker-editor:focus{border-color:#67d7c5;box-shadow:0 0 0 3px rgba(103,215,197,.12)}',
      '#view-study .program-checker-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}',
      '#view-study .program-checker-btn{border:0;border-radius:11px;padding:10px 14px;font-weight:900;cursor:pointer}',
      '#view-study .program-checker-btn.primary{background:#67d7c5;color:#08251f}',
      '#view-study .program-checker-btn.secondary{background:rgba(255,255,255,.10);color:#fff;border:1px solid rgba(255,255,255,.18)}',
      '#view-study .program-checker-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:14px}',
      '#view-study .program-checker-stat{padding:12px;border-radius:12px;background:rgba(255,255,255,.08);text-align:center}',
      '#view-study .program-checker-stat strong{display:block;font-size:23px;color:#fff}',
      '#view-study .program-checker-stat span{font-size:12px;color:#bfd2df}',
      '#view-study .program-checker-results{display:grid;gap:8px;margin-top:12px}',
      '#view-study .program-check-item{display:grid;grid-template-columns:28px 1fr;gap:9px;padding:11px 12px;border-radius:12px;line-height:1.55}',
      '#view-study .program-check-item.pass{background:rgba(34,197,94,.14);border:1px solid rgba(34,197,94,.28)}',
      '#view-study .program-check-item.warn{background:rgba(245,158,11,.14);border:1px solid rgba(245,158,11,.30)}',
      '#view-study .program-check-item.danger{background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.32)}',
      '#view-study .program-check-item.info{background:rgba(59,130,246,.14);border:1px solid rgba(59,130,246,.28)}',
      '#view-study .program-check-item b{color:#fff}',
      '#view-study .program-check-item p{margin:2px 0 0!important;color:#c8dce8!important;font-size:13px}',
      '@media(max-width:680px){#view-study .program-checker-summary{grid-template-columns:repeat(2,1fr)}#view-study .program-checker-editor{min-height:300px;font-size:13px}}'
    ].join('');
    document.head.appendChild(style);
  }

  function mountChecker() {
    var detail = document.querySelector('#study-detail-content .lesson-detail-v2[data-level="12"]');
    if (!detail || detail.querySelector('#lesson-program-checker')) return;
    var anchor = detail.querySelector('.lesson-practice-card') || detail.querySelector('.lesson-pass-box');
    if (!anchor) return;

    var section = document.createElement('section');
    section.id = 'lesson-program-checker';
    section.className = 'lesson-v2-section lesson-program-checker';
    section.innerHTML = [
      '<h3>基础程序安全检查练习</h3>',
      '<p class="program-checker-intro">把练习程序粘贴进来，检查常见的坐标、刀补、钻孔循环和结束段问题。</p>',
      '<div class="program-checker-warning">⚠️ 这只是学习型规则检查，不能证明程序绝对安全。正式加工前仍必须完成图形仿真、单段、低倍率、空运行、刀具与坐标现场核对。</div>',
      '<textarea id="lesson-program-input" class="program-checker-editor" spellcheck="false" placeholder="把 FANUC 风格程序粘贴到这里……"></textarea>',
      '<div class="program-checker-actions">',
      '<button type="button" class="program-checker-btn primary" data-program-check>开始检查</button>',
      '<button type="button" class="program-checker-btn secondary" data-program-sample>填入练习板示例</button>',
      '<button type="button" class="program-checker-btn secondary" data-program-clear>清空</button>',
      '</div>',
      '<div id="program-checker-output" aria-live="polite"></div>'
    ].join('');
    anchor.insertAdjacentElement('afterend', section);

    var saved = localStorage.getItem('cnc_lesson12_program_v1');
    if (saved) section.querySelector('#lesson-program-input').value = saved;
  }

  function bindCheckerEvents() {
    if (window.__CNC_PROGRAM_CHECKER_BOUND__) return;
    window.__CNC_PROGRAM_CHECKER_BOUND__ = true;

    document.addEventListener('click', function (event) {
      var checkButton = event.target.closest && event.target.closest('[data-program-check]');
      var sampleButton = event.target.closest && event.target.closest('[data-program-sample]');
      var clearButton = event.target.closest && event.target.closest('[data-program-clear]');
      var input = document.getElementById('lesson-program-input');
      if (!input) return;

      if (checkButton) {
        localStorage.setItem('cnc_lesson12_program_v1', input.value);
        renderCheckResult(analyzeProgram(input.value));
      }
      if (sampleButton) {
        input.value = sampleProgram();
        localStorage.setItem('cnc_lesson12_program_v1', input.value);
        renderCheckResult(analyzeProgram(input.value));
      }
      if (clearButton) {
        input.value = '';
        localStorage.removeItem('cnc_lesson12_program_v1');
        var output = document.getElementById('program-checker-output');
        if (output) output.innerHTML = '';
      }
    });

    document.addEventListener('input', function (event) {
      if (event.target && event.target.id === 'lesson-program-input') {
        localStorage.setItem('cnc_lesson12_program_v1', event.target.value);
      }
    });
  }

  function analyzeProgram(source) {
    var raw = String(source || '').toUpperCase();
    var cleaned = raw
      .replace(/\([^)]*\)/g, ' ')
      .replace(/;[^\n\r]*/g, ' ');
    var lines = cleaned.split(/\r?\n/).map(function (line) {
      return line.replace(/\s+/g, ' ').trim();
    }).filter(Boolean);
    var compact = lines.join('\n');
    var items = [];

    function add(level, title, detail) {
      items.push({ level: level, title: title, detail: detail });
    }
    function has(regex) { return regex.test(compact); }
    function passOr(levelWhenMissing, regex, title, passText, missingText) {
      if (has(regex)) add('pass', title, passText);
      else add(levelWhenMissing, title, missingText);
    }

    if (!lines.length) {
      add('danger', '没有读取到程序', '请先粘贴或填入一段程序。');
      return summarize(items);
    }

    passOr('warn', /(^|\n)O\d+/, '程序号', '已找到 O 程序号。', '未找到 O 程序号，正式程序建议使用清晰的程序号和名称注释。');
    passOr('danger', /\bG90\b/, '绝对坐标模式', '已明确调用 G90。', '未找到 G90；如果沿用了 G91，后续坐标可能全部按增量解释。');
    passOr('warn', /\bG17\b/, '加工平面', '已明确调用 G17 XY 平面。', '未找到 G17；圆弧和固定循环前建议明确当前加工平面。');
    passOr('warn', /\bG21\b/, '公制单位', '已明确调用 G21 公制。', '未找到 G21；应确认当前单位模式，避免毫米与英寸混淆。');
    passOr('danger', /\bG5[4-9]\b/, '工件坐标系', '已找到 G54～G59 工件坐标系。', '未找到 G54～G59；程序坐标可能没有明确对应到工件基准。');
    passOr('danger', /\bT\d+\b[^\n]*\bM0?6\b|\bM0?6\b[^\n]*\bT\d+\b/, '换刀指令', '已找到 T 号与 M06。', '未找到完整的 T 号 / M06 换刀调用。');
    passOr('danger', /\bS\d+(?:\.\d+)?\b[^\n]*\bM0?[34]\b|\bM0?[34]\b[^\n]*\bS\d+(?:\.\d+)?\b/, '主轴启动', '已找到 S 转速和 M03/M04。', '未找到转速 S 与主轴启动 M03/M04 的完整组合。');
    passOr('danger', /\bG43\b[^\n]*\bH\d+\b|\bH\d+\b[^\n]*\bG43\b/, '刀长补偿', '已找到 G43 与 H 号。', '未找到 G43 H 刀长补偿调用，Z 向位置存在高风险。');

    var toolNumbers = extractNumbers(compact, /\bT(\d+)\b/g);
    var hNumbers = extractNumbers(compact, /\bH(\d+)\b/g);
    if (toolNumbers.length && hNumbers.length) {
      var mismatches = [];
      hNumbers.forEach(function (h, index) {
        var nearestTool = toolNumbers[Math.min(index, toolNumbers.length - 1)];
        if (nearestTool !== h) mismatches.push('T' + pad(nearestTool) + ' / H' + pad(h));
      });
      if (mismatches.length) add('warn', 'T/H 对应关系', '发现可能不对应：' + mismatches.join('、') + '。有些现场允许不一致编号，但必须按刀补表确认。');
      else add('pass', 'T/H 对应关系', '检测到的 T 号与 H 号编号一致。');
    }

    var rapidXYZ = lines.filter(function (line) {
      return /\bG0?0\b/.test(line) && /\bX[-+]?\d/.test(line) && /\bY[-+]?\d/.test(line) && /\bZ[-+]?\d/.test(line);
    });
    if (rapidXYZ.length) add('warn', 'G00 多轴同时移动', '发现 ' + rapidXYZ.length + ' 段同时改变 X、Y、Z。不要假定快速轨迹会自动避开夹具，建议拆成“抬 Z—走 X/Y—再接近”。');
    else add('pass', '快速移动路径', '未发现 G00 同时改变 X、Y、Z 的明显写法。');

    var negativeRapidZ = lines.filter(function (line) {
      var match = line.match(/\bG0?0\b[^\n]*\bZ(-?\d+(?:\.\d+)?)/);
      return match && Number(match[1]) < 0;
    });
    if (negativeRapidZ.length) add('danger', '快速下到负 Z', '发现 G00 快速移动到负 Z：' + negativeRapidZ.slice(0, 2).join(' / ') + '。必须确认零点、工件高度和安全距离。');
    else add('pass', 'Z 向快速风险', '未发现明显的 G00 快速下到负 Z。');

    var cycleLines = lines.filter(function (line) { return /\bG8[13]\b/.test(line); });
    if (!cycleLines.length) {
      add('warn', '钻孔固定循环', '未找到 G81 或 G83；如果本程序不含钻孔可忽略。');
    } else {
      add('pass', '钻孔固定循环', '已找到 ' + cycleLines.length + ' 段 G81/G83 循环调用。');
      var firstCycle = cycleLines[0];
      ['Z', 'R', 'F'].forEach(function (word) {
        if (new RegExp('\\b' + word + '[-+]?\\d').test(firstCycle)) add('pass', '循环参数 ' + word, '首个循环段已包含 ' + word + ' 参数。');
        else add('warn', '循环参数 ' + word, '首个 G81/G83 段没有直接看到 ' + word + '，请确认是否安全地沿用了模态值。');
      });
    }

    if (has(/\bG9[89]\b/)) add('pass', '钻孔返回方式', '已明确调用 G98 或 G99。');
    else if (cycleLines.length) add('warn', '钻孔返回方式', '固定循环前未明确看到 G98/G99；请根据夹具高度确认返回初始点还是 R 平面。');

    var lastCycleIndex = findLastLine(lines, /\bG8[13]\b/);
    var g80Index = findLastLine(lines, /\bG80\b/);
    if (lastCycleIndex >= 0 && g80Index > lastCycleIndex) add('pass', 'G80 取消循环', '固定循环后已找到 G80。');
    else if (lastCycleIndex >= 0) add('danger', 'G80 取消循环', '固定循环后没有找到有效的 G80，后续位置可能继续执行钻孔动作。');
    else add('info', 'G80 取消循环', '本程序未发现 G81/G83，G80 检查不参与风险评分。');

    passOr('warn', /\bM0?9\b/, '关闭冷却', '已找到 M09。', '未找到 M09；程序结束或换刀前建议确认冷却状态。');
    passOr('danger', /\bM0?5\b/, '停止主轴', '已找到 M05。', '未找到 M05，程序结束前应确认主轴停止。');
    passOr('danger', /\bM30\b/, '程序结束', '已找到 M30。', '未找到 M30，程序结束与复位逻辑不完整。');

    if (has(/\bG91\b/) && !has(/\bG90\b[^\n]*\bM30\b|\bG90\b[\s\S]*\bM30\b/)) {
      add('warn', 'G91 模态残留', '程序使用了 G91，但结束前没有明显切回 G90。请确认后续段的坐标解释。');
    }

    if (has(/\bG40\b/) && has(/\bG49\b/) && has(/\bG80\b/)) {
      add('pass', '安全状态取消', '检测到 G40、G49、G80 等补偿/循环取消指令。');
    } else {
      add('info', '安全状态取消', '建议在安全开头或合适位置明确 G40、G49、G80，避免沿用上一个程序的模态状态。');
    }

    add('info', '现场验证仍然必须做', '规则检查通过不代表程序可以直接加工。还要核对图纸、刀具、刀补、G54、夹具最高点，并完成仿真、单段、低倍率和空运行。');
    return summarize(items);
  }

  function summarize(items) {
    var counts = { pass: 0, warn: 0, danger: 0, info: 0 };
    items.forEach(function (item) { counts[item.level] = (counts[item.level] || 0) + 1; });
    var score = Math.max(0, 100 - counts.danger * 15 - counts.warn * 6);
    var rating = counts.danger ? '存在高风险项' : (counts.warn ? '可继续复查' : '基础检查通过');
    return { items: items, counts: counts, score: score, rating: rating };
  }

  function renderCheckResult(result) {
    var output = document.getElementById('program-checker-output');
    if (!output) return;
    var iconMap = { pass: '✓', warn: '!', danger: '×', info: 'i' };
    output.innerHTML = [
      '<div class="program-checker-summary">',
      stat(result.score, '基础得分'),
      stat(result.counts.danger, '高风险'),
      stat(result.counts.warn, '需复查'),
      stat(result.counts.pass, '已通过'),
      '</div>',
      '<div class="program-checker-results">',
      result.items.map(function (item) {
        return '<div class="program-check-item ' + item.level + '"><div><b>' + iconMap[item.level] + '</b></div><div><b>' + escapeHtml(item.title) + '</b><p>' + escapeHtml(item.detail) + '</p></div></div>';
      }).join(''),
      '</div>'
    ].join('');
  }

  function stat(value, label) {
    return '<div class="program-checker-stat"><strong>' + value + '</strong><span>' + label + '</span></div>';
  }

  function extractNumbers(text, regex) {
    var output = [];
    var match;
    while ((match = regex.exec(text)) !== null) output.push(Number(match[1]));
    return output;
  }

  function findLastLine(lines, regex) {
    for (var i = lines.length - 1; i >= 0; i--) {
      if (regex.test(lines[i])) return i;
    }
    return -1;
  }

  function pad(number) {
    return String(number).padStart(2, '0');
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function sampleProgram() {
    return [
      '%',
      'O1200 (100X80 ALUMINUM PRACTICE PLATE)',
      'G90 G17 G21 G40 G49 G80',
      'G54',
      '',
      'T01 M06 (DRILL)',
      'S3000 M03',
      'G00 G43 H01 Z50.',
      'M08',
      'G00 X20. Y20.',
      'G98 G81 Z-12. R5. F120.',
      'X80. Y20.',
      'X80. Y60.',
      'X20. Y60.',
      'G80',
      'G00 Z50.',
      'M09',
      'M05',
      '',
      'T02 M06 (DEEP HOLE DRILL)',
      'S1800 M03',
      'G00 G43 H02 Z50.',
      'M08',
      'G00 X75. Y40.',
      'G98 G83 Z-18. R5. Q3. F90.',
      'G80',
      'G00 Z50.',
      'M09',
      'M05',
      'G91 G28 Z0.',
      'G90',
      'M30',
      '%'
    ].join('\n');
  }

  console.log('🔍 搜索诊断模块已加载；第12关程序检查器已就绪。');
})();
