// 予华仪器网站统一配置
// 本站不公开电话、手机号或微信号；后续优化不得重新加入直接联系方式。
window.YUHUA_SITE = {
  company: "巩义市予华仪器有限责任公司",
  address: "巩义市英峪工业区",
  officialSite: "https://www.gyyuhua.cn/",
  publicDirectContact: false
};

// 视频数据保护：清空已确认缺失的封面，并隐藏文件名为空或仅为扩展名的无效视频。
(function installVideoDataGuard() {
  var missingPosters = {
    "assets/videos/img_1672.jpg": true,
    "assets/videos/img_1659.jpg": true,
    "assets/videos/img_1669.jpg": true,
    "assets/videos/img_1660.jpg": true,
    "assets/videos/img_1670.jpg": true,
    "assets/videos/img_1655.jpg": true,
    "assets/videos/img_1671.jpg": true,
    "assets/videos/img_1678.jpg": true,
    "assets/videos/dji_20260115_143343_503_video.jpg": true
  };
  var videoStore = [];

  function hasUsableVideoFile(file) {
    var normalized = String(file || "").trim().replace(/\\/g, "/");
    if (!normalized) return false;
    var filename = normalized.split("/").pop();
    return Boolean(filename && filename !== "." && filename !== ".." && !/^\.[a-z0-9]+$/i.test(filename));
  }

  Object.defineProperty(window, "VIDEOS", {
    configurable: true,
    enumerable: true,
    get: function () { return videoStore; },
    set: function (value) {
      videoStore = Array.isArray(value) ? value.filter(function (video) {
        return video && typeof video === "object" && hasUsableVideoFile(video.file);
      }).map(function (video) {
        if (missingPosters[String(video.poster || "")]) video.poster = "";
        return video;
      }) : [];
    }
  });
})();

// 无直接联系方式策略：清理旧控件和动态回归，保留型号查询与选型流程。
(function installNoDirectContactPolicy() {
  function removeLegacyDirectContact() {
    if (!document.querySelectorAll) return;

    ["#contactPhoneLink", "#callNow", "#copyPhone", "#mobileCall"].forEach(function (selector) {
      var element = document.querySelector(selector);
      if (element) element.remove();
    });

    Array.prototype.forEach.call(document.querySelectorAll('a[href="#contact"]'), function (link) {
      link.href = "#selector";
      link.textContent = "选型工具";
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", removeLegacyDirectContact);
  else removeLegacyDirectContact();

  if (typeof MutationObserver !== "undefined" && document.documentElement) {
    new MutationObserver(removeLegacyDirectContact).observe(document.documentElement, { childList: true, subtree: true });
  }
})();

// 产品数据运行时保护：保留简介用于全文搜索，但不让其中的年份和章节数字污染温度筛选。
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

// 精确搜索保护：把“20L反应釜、-40℃循环泵、316L高压釜”拆成多个必要条件。
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
      var identity = normalize(product && (product["型号"] || product["产品名称"]));
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

      function matches(item) {
        var source = itemSearchText(item);
        return groups.every(function (group) {
          return group.some(function (alternative) { return source.indexOf(alternative) >= 0; });
        });
      }

      var visible = 0;
      rows.forEach(function (row) {
        row.hidden = groups.length ? !matches(row) : false;
        if (!row.hidden) visible += 1;
      });
      cards.forEach(function (card) { card.hidden = groups.length ? !matches(card) : false; });

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

// 安全详情页解析器在所有产品与规格书数据加载完成后执行。
// 它只补充唯一、同分类、精确型号匹配的 detail 字段，不修改产品参数。
(function loadSafeDetailResolver() {
  function load() {
    if (!document.createElement || !document.head || document.getElementById("safe-detail-resolver")) return;
    var script = document.createElement("script");
    script.id = "safe-detail-resolver";
    script.src = "assets/detail-resolver.js?v=20260729a";
    script.async = false;
    document.head.appendChild(script);
  }

  if (window.addEventListener) window.addEventListener("load", load, { once: true });
})();
