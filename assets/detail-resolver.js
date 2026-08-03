// 安全详情页解析器：仅使用“精确型号 + 分类一致 + 唯一规格书页面”的证据。
// 不做模糊包含匹配，不按分类随机兜底，不修改产品参数。
(function resolveExactSpecDetails() {
  "use strict";

  var products = Array.isArray(window.PRODUCTS) ? window.PRODUCTS : [];
  var specs = Array.isArray(window.SPECS) ? window.SPECS : [];
  var pages = Array.isArray(window.PAGES) ? window.PAGES : [];
  if (!products.length || !specs.length) return;

  var GENERIC_MODELS = {
    "DOC": true,
    "DOCX": true,
    "PDF": true,
    "WORD": true,
    "FACTORY": true,
    "YUHUA": true,
    "PARAMETER": true,
    "MANUAL": true
  };

  function clean(value) {
    return String(value == null ? "" : value).trim();
  }

  function normalizeModel(value) {
    var model = clean(value);
    if (!model) return "";
    if (model.normalize) model = model.normalize("NFKC");
    return model
      .toUpperCase()
      .replace(/\.(?:DOCX?|PDF)$/i, "")
      .replace(/[（(].*?[）)]$/g, "")
      .replace(/[＿_\s]+/g, "-")
      .replace(/[—–−]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^[^A-Z0-9]+|[^A-Z0-9]+$/g, "");
  }

  function isUsableModel(model) {
    if (!model || model.length < 3) return false;
    if (GENERIC_MODELS[model]) return false;
    return /[A-Z]/.test(model) && /[0-9]/.test(model);
  }

  // 保留现有 pages.js 前缀映射的优先级，避免重复覆盖或把既有覆盖误算为新增。
  var existingPrefixPages = [];
  pages.forEach(function (page) {
    var pagePath = clean(page && page.page);
    var key = clean(page && page.key);
    if (!pagePath) return;
    (page.prefixes || []).forEach(function (prefix) {
      var normalizedPrefix = normalizeModel(prefix);
      if (!normalizedPrefix) return;
      existingPrefixPages.push({ prefix: normalizedPrefix, page: pagePath, key: key });
    });
  });
  existingPrefixPages.sort(function (a, b) { return b.prefix.length - a.prefix.length; });

  function hasExistingPrefixDetail(model, key) {
    return existingPrefixPages.some(function (entry) {
      if (entry.key && key && entry.key !== key) return false;
      return model.indexOf(entry.prefix) === 0;
    });
  }

  var exactSpecPages = Object.create(null);
  specs.forEach(function (spec) {
    var model = normalizeModel(spec && spec.model);
    var page = clean(spec && spec.page);
    var key = clean(spec && spec.key);
    if (!isUsableModel(model) || !page || !key) return;

    var groupKey = key + "::" + model;
    if (!exactSpecPages[groupKey]) exactSpecPages[groupKey] = [];
    if (exactSpecPages[groupKey].indexOf(page) < 0) exactSpecPages[groupKey].push(page);
  });

  var resolvedCount = 0;
  products.forEach(function (product) {
    if (!product || typeof product !== "object" || clean(product.detail)) return;
    var model = normalizeModel(product["型号"]);
    var key = clean(product.key);
    if (!isUsableModel(model) || !key || hasExistingPrefixDetail(model, key)) return;

    var matchedPages = exactSpecPages[key + "::" + model] || [];
    if (matchedPages.length !== 1) return;

    product.detail = matchedPages[0];
    product.detailSource = "exact-spec-model";
    resolvedCount += 1;
  });

  window.YUHUA_DETAIL_RESOLVER_RESULT = {
    resolvedCount: resolvedCount,
    strategy: "exact-model-same-category-unique-page"
  };

  if (typeof document !== "undefined" && document.documentElement) {
    document.documentElement.setAttribute("data-safe-detail-resolved", String(resolvedCount));
  }
})();
