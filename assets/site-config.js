// 予华仪器网站统一配置
// 销售联系方式变化时，只修改本文件，不要在各页面重复替换。
window.YUHUA_SITE = {
  company: "巩义市予华仪器有限责任公司",
  phone: "15517593858",
  wechat: "15517593858",
  address: "巩义市英峪工业区",
  officialSite: "https://www.gyyuhua.cn/"
};

// 产品数据运行时保护：保留简介供全文搜索，但不让简介里的章节号、年份、功率等数字
// 参与“温度能力”解析。data.js 随后给 window.PRODUCTS 赋值时会自动经过这里。
(function installProductDataGuard() {
  var productStore = [];
  Object.defineProperty(window, "PRODUCTS", {
    configurable: true,
    enumerable: true,
    get: function () { return productStore; },
    set: function (value) {
      productStore = Array.isArray(value) ? value.map(function (product) {
        if (!product || typeof product !== "object") return product;
        var introduction = String(product["简介"] || "").trim();
        if (introduction) {
          product["搜索简介"] = introduction;
          product["简介"] = "";
        }
        return product;
      }) : [];
    }
  });
})();

// 精确搜索保护：把“20L反应釜、-40℃循环泵、316L高压釜”拆成多个条件，
// 先让主搜索获得候选结果，再要求每个工况条件都能在同一产品记录中命中。
(function installPreciseSearchGuard() {
  var expansions = {
    "浓缩": ["旋转蒸发", "蒸发器", "溶剂回收"],
    "溶剂回收": ["旋转蒸发", "冷凝"],
    "低温": ["低温冷却", "反应浴", "高低温"],
    "抽真空": ["真空泵", "循环水", "隔膜泵"],
    "高压": ["高压反应釜", "水热合成"],
    "搅拌": ["磁力搅拌", "电动搅拌", "分散", "乳化"],
    "蒸馏": ["旋转蒸发", "分子蒸馏", "短程蒸馏"],
    "反应": ["反应釜", "合成"]
  };

  function normalize(value) {
    return String(value == null ? "" : value)
      .toLowerCase()
      .replace(/[（）()【】[\]，,。；;：:\s_/\\]+/g, "")
      .replace(/[～—–−]/g, "-")
      .replace(/℃/g, "c")
      .replace(/毫升/g, "ml")
      .replace(/升/g, "l");
  }

  function flatten(product) {
    var values = [];
    Object.keys(product || {}).forEach(function (key) {
      var value = product[key];
      if (value == null || key.indexOf("__") === 0) return;
      if (Array.isArray(value)) values = values.concat(value);
      else if (typeof value === "object") {
        Object.keys(value).forEach(function (subKey) { values.push(subKey, value[subKey]); });
      } else values.push(value);
    });
    return normalize(values.join(" "));
  }

  function prepareVisibleQuery(raw) {
    return String(raw || "")
      .replace(/(-?\d+(?:\.\d+)?\s*(?:ml|毫升|l|升|℃|°c|c))(?=[\u4e00-\u9fff])/ig, "$1 ")
      .replace(/(316l|316|304|ptfe)(?=[\u4e00-\u9fff])/ig, "$1 ")
      .replace(/(高硼硅玻璃|玻璃|哈氏合金|哈氏|钛材|钛|聚四氟乙烯|聚四氟)(?=高压|反应|旋蒸|循环|真空|搅拌|蒸馏|干燥)/g, "$1 ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function queryGroups(raw) {
    var groups = [];
    String(raw || "").split(/[\s,，/]+/).filter(Boolean).forEach(function (word) {
      var normalized = normalize(word);
      if (!normalized) return;
      var alternatives = [normalized];
      if (/^-?\d+(?:\.\d+)?(?:ml|l|c)$/.test(normalized)) {
        alternatives.push(normalized.replace(/(?:ml|l|c)$/, ""));
      }
      Object.keys(expansions).forEach(function (key) {
        if (word.indexOf(key) >= 0 || key.indexOf(word) >= 0) {
          alternatives = alternatives.concat(expansions[key].map(normalize));
        }
      });
      groups.push(alternatives.filter(Boolean));
    });
    return groups;
  }

  function productIdentity(product) {
    return normalize(product && (product["型号"] || product["产品名称"]));
  }

  function start() {
    var input = document.getElementById("searchInput");
    var tableBody = document.getElementById("tableBody");
    var mobileList = document.getElementById("mobileProductList");
    var resultCount = document.getElementById("resultCount");
    var emptyTip = document.getElementById("emptyTip");
    var resultLimit = document.getElementById("resultLimit");
    if (!input || !tableBody || !mobileList || !resultCount) return;

    var productMap = {};
    (window.PRODUCTS || []).forEach(function (product) {
      var identity = productIdentity(product);
      if (identity && !productMap[identity]) productMap[identity] = flatten(product);
    });

    var timer;
    function schedule() {
      clearTimeout(timer);
      timer = setTimeout(apply, 190);
    }

    function itemSearchText(item) {
      var modelElement = item.querySelector(".model, .mobile-product-head b");
      var identity = normalize(modelElement ? modelElement.textContent : "");
      return productMap[identity] || normalize(item.textContent);
    }

    function apply() {
      var groups = queryGroups(input.value);
      var rows = Array.prototype.slice.call(tableBody.querySelectorAll("tr[data-index]"));
      var cards = Array.prototype.slice.call(mobileList.querySelectorAll(".mobile-product-card[data-index]"));

      if (!groups.length) {
        rows.forEach(function (row) { row.hidden = false; });
        cards.forEach(function (card) { card.hidden = false; });
        return;
      }

      function matches(item) {
        var source = itemSearchText(item);
        return groups.every(function (group) {
          return group.some(function (alternative) { return source.indexOf(alternative) >= 0; });
        });
      }

      var visible = 0;
      rows.forEach(function (row) {
        row.hidden = !matches(row);
        if (!row.hidden) visible += 1;
      });
      cards.forEach(function (card) { card.hidden = !matches(card); });

      resultCount.textContent = visible;
      if (emptyTip) emptyTip.hidden = visible > 0;
      if (resultLimit && visible === 0) resultLimit.hidden = true;
    }

    input.addEventListener("input", function () {
      var prepared = prepareVisibleQuery(input.value);
      if (prepared !== input.value) input.value = prepared;
      schedule();
    }, true);

    new MutationObserver(schedule).observe(tableBody, { childList: true });
    new MutationObserver(schedule).observe(mobileList, { childList: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else setTimeout(start, 0);
})();
