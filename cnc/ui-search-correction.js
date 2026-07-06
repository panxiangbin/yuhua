/**
 * ui-search-correction.js
 * 智能拼写纠错系统 — 编辑距离/常见错别字映射/纠错提示
 * 全局对象: window.CNC_SEARCH_CORRECT
 */
(function () {
  'use strict';

  if (window.CNC_SEARCH_CORRECT) return;

  var _COMMON_MISTAKES = {
    'G0': 'G00', 'G1': 'G01', 'G2': 'G02', 'G3': 'G03',
    'g0': 'G00', 'g1': 'G01', 'g2': 'G02', 'g3': 'G03',
    'G54.1': 'G54', 'G55.1': 'G55',
    'MO3': 'M03', 'MO5': 'M05', 'MO6': 'M06', 'MO8': 'M08',
    'mo3': 'M03', 'mo5': 'M05', 'mo6': 'M06',
    'g81': 'G81', 'g83': 'G83', 'g90': 'G90', 'g91': 'G91',
    '对刀仪': '对刀', '回零点': '回零', '回原点': '回零',
    'G0': 'G00', 'G1': 'G01',
    '坐标系统': '坐标系', '工件坐标': '工件坐标系',
    '主轴转速': 'S转速', '走刀速度': '进给速度',
    '碰刀': '对刀', '寻边': '对刀', '分中': '对刀',
    '车刀': '刀具', '铣刀': '刀具', '钻头': '刀具',
    '锣刀': '铣刀', '飞刀': '铣刀',
    '罗纹': '螺纹', '罗距': '螺距', '牙距': '螺距',
    '倒角': '倒角', 'C角': '倒角',
    '公差带': '公差', '配合公差': '公差',
    '线速度': 'Vc', '切削速度': 'Vc',
    '每转进给': '进给', '每分钟进给': '进给'
  };

  function detectTypo(keyword) {
    if (!keyword || !keyword.trim()) return null;
    var kw = keyword.trim();
    var result = { original: kw, isTypo: false, corrections: [], similarity: 1 };

    // 检查直接映射
    if (_COMMON_MISTAKES[kw]) {
      result.isTypo = true;
      result.corrections.push(_COMMON_MISTAKES[kw]);
      result.similarity = 0.3;
      return result;
    }

    // 检查大小写问题
    var upper = kw.toUpperCase();
    if (upper !== kw && /^[a-z]\d/.test(kw)) {
      result.isTypo = true;
      result.corrections.push(upper);
      result.similarity = 0.5;
      return result;
    }

    // 获取有效关键词列表
    var keywords = _getValidKeywords();
    var bestMatch = null;
    var bestDist = Infinity;

    for (var i = 0; i < keywords.length; i++) {
      var dist = _levenshteinDistance(kw.toLowerCase(), keywords[i].toLowerCase());
      var maxLen = Math.max(kw.length, keywords[i].length);
      var sim = maxLen > 0 ? 1 - dist / maxLen : 0;

      if (sim > 0.6 && dist < bestDist) {
        bestDist = dist;
        bestMatch = { keyword: keywords[i], distance: dist, similarity: sim };
      }
    }

    if (bestMatch && bestMatch.distance <= 2) {
      result.isTypo = true;
      result.corrections.push(bestMatch.keyword);
      result.similarity = bestMatch.similarity;
    }

    return result;
  }

  function suggestCorrection(keyword) {
    var result = detectTypo(keyword);
    if (!result || !result.isTypo) return null;
    return result.corrections.length > 0 ? result.corrections[0] : null;
  }

  function calculateSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    var dist = _levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
    var maxLen = Math.max(str1.length, str2.length);
    return maxLen > 0 ? 1 - dist / maxLen : 0;
  }

  function renderCorrectionPrompt(original, corrected) {
    if (!corrected) return '';
    var html = '<div class="search-correction-prompt" role="alert">';
    html += '<span class="correction-icon">💡</span>';
    html += '<span class="correction-text">您是不是想搜索 <strong>' + _escape(corrected) + '</strong>？</span>';
    html += '<button class="correction-use-btn" data-correction="' + _escape(corrected) + '">使用建议</button>';
    html += '<button class="correction-dismiss">×</button>';
    html += '</div>';
    return html;
  }

  function addCustomCorrection(wrong, correct) {
    if (!wrong || !correct) return false;
    _COMMON_MISTAKES[wrong.trim()] = correct.trim();
    return true;
  }

  function _levenshteinDistance(a, b) {
    var m = a.length, n = b.length;
    var dp = [];
    for (var i = 0; i <= m; i++) { dp[i] = [i]; }
    for (var j = 0; j <= n; j++) { dp[0][j] = j; }
    for (var i = 1; i <= m; i++) {
      for (var j = 1; j <= n; j++) {
        var cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
      }
    }
    return dp[m][n];
  }

  function _getValidKeywords() {
    var source = [];
    if (window.CNC_SEARCH_ALIASES && CNC_SEARCH_ALIASES.ALIASES) {
      source = source.concat(Object.keys(CNC_SEARCH_ALIASES.ALIASES));
    }
    if (window.CNC_DATA) {
      if (CNC_DATA.ALL_KEYWORDS) source = source.concat(CNC_DATA.ALL_KEYWORDS);
    }
    if (source.length < 20) {
      var fallback = ['G00','G01','G02','G03','G04','G54','G55','G90','G91','G81','G83','G41','G42','M03','M05','M06','M08','M09','M30','对刀','回零','坐标系','工件坐标系','刀具','主轴','进给速度','转速','螺距','螺纹','倒角','钻孔','镗孔','攻丝','铣削','车削','公差','配合','基准','刀具补偿','换刀','冷却液','急停','行程'];
      source = source.concat(fallback);
    }
    return source.filter(function (v, i, a) { return a.indexOf(v) === i; });
  }

  function _escape(text) {
    if (!text) return '';
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(text));
    return d.innerHTML;
  }

  window.CNC_SEARCH_CORRECT = {
    detectTypo: detectTypo,
    suggestCorrection: suggestCorrection,
    calculateSimilarity: calculateSimilarity,
    renderCorrectionPrompt: renderCorrectionPrompt,
    addCustomCorrection: addCustomCorrection
  };

  console.log('[CNC_SEARCH_CORRECT] 智能纠错系统已加载。内置 ' + Object.keys(_COMMON_MISTAKES).length + ' 条常见错误映射。');
})();
