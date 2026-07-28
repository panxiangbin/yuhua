// 安全详情页解析器：仅使用“精确型号 + 分类一致 + 唯一规格书页面”的证据。
// 不做模糊包含匹配，不按分类随机兜底，不修改产品参数。
(function resolveExactSpecDetails() {
  "use strict";

  var products = Array.isArray(window.PRODUCTS) ? window.PRODUCTS : [];
  var specs = Array.isArray(window.SPECS) ? window.SPECS : [];
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

  products.forEach(function (product) {
    if (!product || typeof product !== "object" || clean(product.detail)) return;
    var model = normalizeModel(product["型号"]);
    var key = clean(product.key);
    if (!isUsableModel(model) || !key) return;

    var pages = exactSpecPages[key + "::" + model] || [];
    if (pages.length !== 1) return;

    product.detail = pages[0];
    product.detailSource = "exact-spec-model";
  });
})();
