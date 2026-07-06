// 搜索关键词高亮组件 - ChatGPT Plus 交付
// 用法：highlightKeywords(text, keyword)

/**
 * 搜索关键词高亮函数
 * @param {string} text 原始文本
 * @param {string} keyword 搜索关键词，支持多个关键词（空格分隔）
 * @returns {string} 返回包含 <span class="highlight"> 的 HTML
 */
function highlightKeywords(text, keyword) {
  if (!text) return "";

  const safeText = String(text);
  const safeKeyword = String(keyword || "").trim();

  if (!safeKeyword) {
    return escapeHTML(safeText);
  }

  const keywords = safeKeyword
    .split(/\s+/)
    .filter(Boolean)
    .map(item => item.trim())
    .filter(Boolean);

  if (!keywords.length) {
    return escapeHTML(safeText);
  }

  const uniqueKeywords = [...new Set(keywords.map(item => item.toLowerCase()))]
    .map(lowerKeyword => {
      return keywords.find(original => original.toLowerCase() === lowerKeyword);
    })
    .sort((a, b) => b.length - a.length);

  const pattern = uniqueKeywords
    .map(escapeRegExp)
    .join("|");

  const reg = new RegExp(`(${pattern})`, "gi");

  return safeText
    .split(reg)
    .map(part => {
      if (reg.test(part)) {
        reg.lastIndex = 0;
        return `<span class="highlight">${escapeHTML(part)}</span>`;
      }

      reg.lastIndex = 0;
      return escapeHTML(part);
    })
    .join("");
}

/**
 * 转义 HTML，防止 XSS 攻击
 */
function escapeHTML(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * 转义正则特殊字符，保证 G02/G03、G54.1 等关键词可以正常匹配
 */
function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
