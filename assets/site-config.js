// 予华仪器网站统一配置
// 本站不公开电话、手机号或微信号；后续优化不得重新加入直接联系方式。
window.YUHUA_SITE = {
  company: "巩义市予华仪器有限责任公司",
  address: "巩义市英峪工业区",
  officialSite: "https://www.gyyuhua.cn/",
  publicDirectContact: false
};

// 无电话策略：移除页面中可能遗留或后续动态生成的电话、拨号、复制号码入口。
(function installNoPhonePolicy() {
  function removeDirectContact() {
    if (!document.querySelectorAll) return;

    ["#contactPhoneLink", "#callNow", "#copyPhone", "#mobileCall"].forEach(function (selector) {
      var element = document.querySelector(selector);
      if (element) element.remove();
    });

    Array.prototype.forEach.call(document.querySelectorAll('a[href^="tel:"], a[href="#contact"]'), function (link) {
      if (link.closest && link.closest(".recommendation-actions")) {
        link.href = "#catalog";
        link.textContent = "继续查询型号";
        return;
      }
      if (link.classList && link.classList.contains("nav-contact")) {
        link.href = "#selector";
        link.textContent = "选型工具";
        return;
      }
      if (link.closest && link.closest("#navMobile")) {
        link.href = "#selector";
        link.textContent = "选型工具";
      }
    });

    var section = document.getElementById("contact");
    if (section) {
      section.id = "service";
      section.innerHTML =
        '<div class="contact-inner">' +
          '<div>' +
            '<span class="section-eyebrow light">选型服务</span>' +
            '<h2>先把型号和工况整理清楚</h2>' +
            '<p>网站不公开直接联系方式。可先使用智能选型生成需求摘要，再通过现有业务渠道提交给销售或技术人员复核。</p>' +
          '</div>' +
          '<div class="contact-card service-card">' +
            '<b class="service-card-title">推荐操作顺序</b>' +
            '<ol class="service-steps">' +
              '<li>查询产品型号与现有参数</li>' +
              '<li>填写物料、容量、温度、压力和材质要求</li>' +
              '<li>复制系统生成的完整工况摘要</li>' +
              '<li>通过现有业务渠道提交人工确认</li>' +
            '</ol>' +
            '<div class="contact-actions">' +
              '<a class="btn btn-primary compact" href="#selector">填写选型需求</a>' +
              '<a class="btn btn-ghost compact" href="#catalog">查询产品型号</a>' +
              '<a class="btn btn-ghost compact" href="#specs">查找规格书</a>' +
            '</div>' +
          '</div>' +
        '</div>';
    }

    var mobileBar = document.querySelector(".mobile-action-bar");
    if (mobileBar && mobileBar.getAttribute("data-no-phone-ready") !== "true") {
      mobileBar.setAttribute("data-no-phone-ready", "true");
      mobileBar.innerHTML =
        '<a href="#products"><span>▦</span>产品中心</a>' +
        '<a href="#catalog"><span>⌕</span>型号查询</a>' +
        '<a href="#selector"><span>✓</span>智能选型</a>';
    }

    var style = document.getElementById("no-phone-policy-style");
    if (!style && document.head) {
      style = document.createElement("style");
      style.id = "no-phone-policy-style";
      style.textContent =
        '.service-card-title{display:block;color:#fff;font-size:18px}' +
        '.service-steps{margin:13px 0 0;padding-left:22px;color:rgba(255,255,255,.78);font-size:13.5px}' +
        '.service-steps li+li{margin-top:6px}';
      document.head.appendChild(style);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", removeDirectContact);
  } else {
    removeDirectContact();
  }

  if (typeof MutationObserver !== "undefined" && document.documentElement) {
    var observer = new MutationObserver(function () { removeDirectContact(); });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
})();

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
