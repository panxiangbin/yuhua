/**
 * ui-card-richtext.js
 * 卡片富文本渲染 — Markdown/代码块/数学公式/表格
 * 全局对象: window.CNC_CARD_RICHTEXT
 */
(function () {
  'use strict';

  if (window.CNC_CARD_RICHTEXT) return;

  function renderMarkdown(text) {
    if (!text) return '';
    var html = _escape(text);

    // 标题
    html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^# (.+)$/gm, '<h2>$1</h2>');

    // 代码块 (``` ... ```)
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, function (_, lang, code) {
      return renderCodeBlock(code.trim(), lang);
    });

    // 内联代码
    html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

    // 粗体和斜体
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // 表格
    html = html.replace(/^(\|.+\|)\n(\|[-:| ]+\|)\n((?:\|.+\|\n?)*)/gm, function (match, header, sep, rows) {
      return renderTable(_parseTable(header, rows));
    });

    // 无序列表
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

    // 有序列表
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

    // 链接
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    // 图片
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;height:auto;border-radius:4px;">');

    // 段落（非列表项/标题/代码块/表格的行）
    html = html.replace(/^(?!<[hou<])/gm, '<p>');
    html = html.replace(/(\n|$)(?!<[\/p])/g, '</p>\n');

    // 修复多余的 <p> 标签
    html = html.replace(/<p>\s*<\/p>/g, '');
    html = html.replace(/<p><li>/g, '<li>');
    html = html.replace(/<\/li><\/p>/g, '</li>');

    // 换行
    html = html.replace(/\n/g, '<br>');

    return html;
  }

  function renderCodeBlock(code, lang) {
    var langLabel = lang ? ' class="code-lang-' + _escape(lang) + '"' : '';
    var highlighted = _simpleHighlight(code, lang);
    return '<div class="code-block" ' + langLabel + '>' +
           (lang ? '<div class="code-block-header"><span class="code-lang">' + _escape(lang) + '</span><button class="code-copy-btn" data-code="' + _escape(code) + '">复制</button></div>' : '') +
           '<pre><code>' + highlighted + '</code></pre></div>';
  }

  function renderMathFormula(tex) {
    if (!tex) return '';
    return '<span class="math-formula" data-tex="' + _escape(tex) + '">' + _escape(tex) + '</span>';
  }

  function renderTable(data) {
    if (!data || !data.headers || !data.rows) return '';
    var html = '<div class="table-wrapper"><table class="richtext-table"><thead><tr>';
    for (var i = 0; i < data.headers.length; i++) {
      html += '<th>' + _escape(data.headers[i]) + '</th>';
    }
    html += '</tr></thead><tbody>';
    for (var r = 0; r < data.rows.length; r++) {
      html += '<tr>';
      for (var c = 0; c < data.rows[r].length; c++) {
        html += '<td>' + _escape(data.rows[r][c]) + '</td>';
      }
      html += '</tr>';
    }
    html += '</tbody></table></div>';
    return html;
  }

  function renderInlineCode(text) {
    return '<code class="inline-code">' + _escape(text) + '</code>';
  }

  function _simpleHighlight(code, lang) {
    var html = _escape(code);
    if (lang === 'javascript' || lang === 'js') {
      html = html.replace(/\b(function|var|let|const|if|else|for|while|return|new|this|typeof|instanceof)\b/g, '<span class="hl-keyword">$1</span>');
      html = html.replace(/\/\/.*/g, '<span class="hl-comment">$&</span>');
      html = html.replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, '<span class="hl-string">$1</span>');
    }
    if (lang === 'html') {
      html = html.replace(/(&lt;\/?[\w-]+)/g, '<span class="hl-tag">$1</span>');
      html = html.replace(/(["'].*?["'])/g, '<span class="hl-string">$1</span>');
    }
    if (lang === 'gcode' || lang === 'nc') {
      html = html.replace(/\b(G\d{2})\b/g, '<span class="hl-gcode">$1</span>');
      html = html.replace(/\b(M\d{2})\b/g, '<span class="hl-mcode">$1</span>');
      html = html.replace(/\b([XYZIJK])(-?\d+\.?\d*)/g, '<span class="hl-axis">$1</span><span class="hl-value">$2</span>');
    }
    return html;
  }

  function _parseTable(headerLine, rowsText) {
    var headers = headerLine.replace(/^\||\|$/g, '').split('|').map(function (s) { return s.trim(); });
    var rows = [];
    var lines = rowsText.trim().split('\n');
    for (var i = 0; i < lines.length; i++) {
      var cells = lines[i].replace(/^\||\|$/g, '').split('|').map(function (s) { return s.trim(); });
      if (cells.length) rows.push(cells);
    }
    return { headers: headers, rows: rows };
  }

  function _escape(text) {
    if (!text) return '';
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(text));
    return d.innerHTML;
  }

  window.CNC_CARD_RICHTEXT = {
    renderMarkdown: renderMarkdown,
    renderCodeBlock: renderCodeBlock,
    renderMathFormula: renderMathFormula,
    renderTable: renderTable,
    renderInlineCode: renderInlineCode
  };

  console.log('[CNC_CARD_RICHTEXT] 富文本渲染引擎已加载。');
})();
