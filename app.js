(function () {
  "use strict";

  var $ = function (selector, root) { return (root || document).querySelector(selector); };
  var $$ = function (selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); };

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function text(value) {
    return String(value == null ? "" : value).trim();
  }

  function normalize(value) {
    return text(value)
      .toLowerCase()
      .replace(/[（）()【】[\]，,。；;：:\s_/\\]+/g, "")
      .replace(/[～—–−]/g, "-")
      .replace(/℃/g, "c")
      .replace(/毫升/g, "ml")
      .replace(/升/g, "l");
  }

  function flattenProduct(product) {
    var values = [];
    Object.keys(product || {}).forEach(function (key) {
      var value = product[key];
      if (value == null) return;
      if (Array.isArray(value)) values = values.concat(value);
      else if (typeof value === "object") {
        Object.keys(value).forEach(function (subKey) {
          values.push(subKey, value[subKey]);
        });
      } else values.push(value);
    });
    return normalize(values.join(" "));
  }

  function parseCapacityLiters(product) {
    var source = [
      product["容量"],
      product["产品名称"],
      product["型号"],
      product.specs && product.specs["容量"],
      product.specs && product.specs["旋转瓶"],
      product.specs && product.specs["反应容量"]
    ].filter(Boolean).join(" ");
    var matches = String(source).match(/(\d+(?:\.\d+)?)\s*(ml|毫升|l|升)\b/ig);
    if (!matches || !matches.length) return null;
    var values = matches.map(function (item) {
      var m = item.match(/(\d+(?:\.\d+)?)\s*(ml|毫升|l|升)/i);
      if (!m) return null;
      var n = Number(m[1]);
      return /ml|毫升/i.test(m[2]) ? n / 1000 : n;
    }).filter(function (n) { return Number.isFinite(n); });
    return values.length ? Math.max.apply(Math, values) : null;
  }

  function parseTemperatures(product) {
    var source = [
      product["控温范围"],
      product["简介"],
      product.specs && product.specs["控温范围"],
      product.specs && product.specs["温度范围"],
      product.specs && product.specs["最高温度"],
      product.specs && product.specs["最低温度"]
    ].filter(Boolean).join(" ");
    var matches = String(source).match(/-?\d+(?:\.\d+)?\s*(?:℃|°c|c)?/ig) || [];
    return matches.map(function (item) {
      var n = Number(item.replace(/[^\d.-]/g, ""));
      return Number.isFinite(n) ? n : null;
    }).filter(function (n) { return n !== null && n >= -200 && n <= 1000; });
  }

  function isDisplayable(product) {
    if (!product || typeof product !== "object") return false;
    var status = normalize(product.status || "");
    if (status === "hidden" || status === "pending" || status === "discontinued") return false;
    return Boolean(text(product["型号"]) || text(product["产品名称"]));
  }

  function showToast(message) {
    var toast = $("#toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(function () { toast.classList.remove("show"); }, 2200);
  }

  function copyText(value, successMessage) {
    if (!value) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(value).then(function () {
        showToast(successMessage || "已复制");
      }).catch(function () { fallbackCopy(value, successMessage); });
    } else fallbackCopy(value, successMessage);
  }

  function fallbackCopy(value, successMessage) {
    var textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
      showToast(successMessage || "已复制");
    } catch (error) {
      showToast("复制失败，请手动复制");
    }
    textarea.remove();
  }

  var RAW_CATEGORIES = Array.isArray(window.CATEGORIES) ? window.CATEGORIES : [];
  var RAW_PRODUCTS = Array.isArray(window.PRODUCTS) ? window.PRODUCTS : [];
  var PRODUCTS = RAW_PRODUCTS.filter(isDisplayable);
  var CATEGORIES = RAW_CATEGORIES.slice();
  var SPECS = Array.isArray(window.SPECS) ? window.SPECS : [];
  var VIDEOS = Array.isArray(window.VIDEOS) ? window.VIDEOS : [];
  var PAGES = Array.isArray(window.PAGES) ? window.PAGES : [];

  var keyName = {};
  CATEGORIES.forEach(function (category) { keyName[category.key] = category.name; });
  keyName.misc = "其他设备";

  var counts = {};
  PRODUCTS.forEach(function (product) {
    var key = product.key || "misc";
    counts[key] = (counts[key] || 0) + 1;
    product.__search = flattenProduct(product);
    product.__capacity = parseCapacityLiters(product);
    product.__temperatures = parseTemperatures(product);
  });

  function initStats() {
    var statCats = $("#stat-cats");
    var statModels = $("#stat-models");
    var statSpecs = $("#stat-specs");
    var totalCount = $("#totalCount");
    var specCount = $("#specCount");
    if (statCats) statCats.textContent = CATEGORIES.length;
    if (statModels) statModels.textContent = PRODUCTS.length;
    if (statSpecs) statSpecs.textContent = SPECS.length;
    if (totalCount) totalCount.textContent = PRODUCTS.length;
    if (specCount) specCount.textContent = SPECS.length;

    var dataAlert = $("#dataAlert");
    if (!RAW_PRODUCTS.length && dataAlert) {
      dataAlert.hidden = false;
      dataAlert.textContent = "产品数据未加载成功，请刷新页面；如问题持续，请检查 assets/data.js。";
    } else if (RAW_PRODUCTS.length !== PRODUCTS.length && dataAlert) {
      dataAlert.hidden = false;
      dataAlert.innerHTML = "已自动隐藏 <b>" + (RAW_PRODUCTS.length - PRODUCTS.length) + "</b> 条缺少型号与名称、待审核或停用的记录，避免干扰客户查询。";
      dataAlert.classList.add("info");
    }
  }

  function initContact() {
    var config = window.YUHUA_SITE || {};
    var phone = text(config.phone);
    var address = text(config.address) || "巩义市英峪工业区";
    var phoneText = $("#contactPhoneText");
    var phoneLink = $("#contactPhoneLink");
    var callNow = $("#callNow");
    var mobileCall = $("#mobileCall");
    var copyPhone = $("#copyPhone");
    var addressEl = $("#contactAddress");

    if (addressEl) addressEl.textContent = address;
    if (!phone) {
      if (phoneText) phoneText.textContent = "请在配置文件填写销售号码";
      return;
    }

    if (phoneText) phoneText.textContent = phone + "（微信同号）";
    [phoneLink, callNow, mobileCall].forEach(function (element) {
      if (element) element.href = "tel:" + phone.replace(/[^\d+]/g, "");
    });
    if (copyPhone) {
      copyPhone.addEventListener("click", function () {
        copyText(phone, "联系方式已复制");
      });
    }
  }

  function initCategories() {
    var grid = $("#catGrid");
    if (!grid) return;
    if (!CATEGORIES.length) {
      grid.innerHTML = '<div class="empty-state"><b>产品分类数据未加载</b><p>请检查 assets/data.js。</p></div>';
      return;
    }

    grid.innerHTML = CATEGORIES.map(function (category) {
      var number = counts[category.key] || 0;
      return '<button class="cat-card" type="button" data-key="' + esc(category.key) + '">' +
        '<div class="cat-thumb"><span class="cat-count">' + number + ' 款</span>' +
        '<img loading="lazy" src="' + esc(category.img) + '" alt="' + esc(category.name) + '"></div>' +
        '<div class="cat-body"><h3>' + esc(category.name) + '</h3><p>' + esc(category.desc || "") + '</p>' +
        '<span class="cat-more">查看全部型号 →</span></div></button>';
    }).join("");

    grid.addEventListener("click", function (event) {
      var card = event.target.closest("[data-key]");
      if (!card) return;
      filterTo(card.dataset.key);
    });
  }

  function initApplications() {
    $$(".application-card").forEach(function (button) {
      button.addEventListener("click", function () {
        var query = button.dataset.query || "";
        var input = $("#searchInput");
        if (input) input.value = query;
        setActive("all");
        resetAdvancedFilters(false);
        renderProducts();
        $("#catalog").scrollIntoView({ behavior: "smooth" });
      });
    });
  }

  function initVideos() {
    var grid = $("#videoGrid");
    var section = $("#videos");
    if (!grid) return;
    if (!VIDEOS.length) {
      if (section) section.hidden = true;
      return;
    }

    grid.innerHTML = VIDEOS.map(function (video) {
      return '<article class="video-card">' +
        '<video controls preload="none" playsinline poster="' + esc(video.poster || "") + '">' +
        '<source src="' + esc(video.file || "") + '" type="video/mp4"></video>' +
        '<div class="video-meta"><b>' + esc(video.title || "产品演示") + '</b><span>' + esc(video.sub || "") + '</span></div>' +
        '</article>';
    }).join("");
  }

  var activeKey = "all";
  var currentRows = [];
  var MAX_RESULTS = 300;

  function initCategoryChips() {
    var chipsBox = $("#chips");
    if (!chipsBox) return;
    var definitions = [{ key: "all", name: "全部" }].concat(
      CATEGORIES.map(function (category) { return { key: category.key, name: category.name }; })
    );
    if (counts.misc) definitions.push({ key: "misc", name: "其他设备" });

    chipsBox.innerHTML = definitions.map(function (definition) {
      var countText = definition.key === "all" ? "" : " (" + (counts[definition.key] || 0) + ")";
      return '<button type="button" class="chip' + (definition.key === "all" ? " active" : "") +
        '" data-key="' + esc(definition.key) + '">' + esc(definition.name) + countText + '</button>';
    }).join("");

    chipsBox.addEventListener("click", function (event) {
      var button = event.target.closest("button[data-key]");
      if (!button) return;
      setActive(button.dataset.key);
      renderProducts();
    });
  }

  function setActive(key) {
    activeKey = key || "all";
    $$("#chips .chip").forEach(function (button) {
      button.classList.toggle("active", button.dataset.key === activeKey);
    });
  }

  function resetAdvancedFilters(renderAfter) {
    ["capacityFilter", "materialFilter", "temperatureFilter"].forEach(function (id) {
      var element = $("#" + id);
      if (element) element.value = "all";
    });
    if (renderAfter !== false) renderProducts();
  }

  function matchesCapacity(product, filter) {
    if (filter === "all") return true;
    var capacity = product.__capacity;
    if (capacity == null) return false;
    if (filter === "lt1") return capacity < 1;
    if (filter === "1to5") return capacity >= 1 && capacity <= 5;
    if (filter === "5to20") return capacity > 5 && capacity < 20;
    if (filter === "gte20") return capacity >= 20;
    return true;
  }

  function matchesMaterial(product, filter) {
    if (filter === "all") return true;
    var source = product.__search;
    var map = {
      glass: ["玻璃", "高硼硅"],
      "304": ["304"],
      "316": ["316", "316l"],
      titanium: ["钛"],
      hastelloy: ["哈氏"],
      ptfe: ["聚四氟", "ptfe", "四氟"]
    };
    return (map[filter] || []).some(function (keyword) { return source.indexOf(normalize(keyword)) >= 0; });
  }

  function matchesTemperature(product, filter) {
    if (filter === "all") return true;
    var values = product.__temperatures;
    if (!values.length) return false;
    var min = Math.min.apply(Math, values);
    var max = Math.max.apply(Math, values);
    if (filter === "low") return min < 0;
    if (filter === "room") return max <= 100 && min >= 0;
    if (filter === "mid") return max > 100 && max <= 250;
    if (filter === "high") return max > 250;
    return true;
  }

  var queryExpansions = {
    "浓缩": ["旋转蒸发", "蒸发器", "溶剂回收"],
    "溶剂回收": ["旋转蒸发", "冷凝"],
    "低温": ["低温冷却", "反应浴", "高低温"],
    "抽真空": ["真空泵", "循环水", "隔膜泵"],
    "高压": ["高压反应釜", "水热合成"],
    "搅拌": ["磁力搅拌", "电动搅拌", "分散", "乳化"],
    "蒸馏": ["旋转蒸发", "分子蒸馏", "短程蒸馏"],
    "反应": ["反应釜", "合成"]
  };

  function queryTokens(query) {
    var raw = text(query);
    if (!raw) return [];
    var tokens = raw.split(/[\s,，/]+/).filter(Boolean);
    var expanded = tokens.slice();
    Object.keys(queryExpansions).forEach(function (key) {
      if (raw.indexOf(key) >= 0) expanded = expanded.concat(queryExpansions[key]);
    });
    return expanded.map(normalize).filter(Boolean);
  }

  function matchesQuery(product, query) {
    var tokens = queryTokens(query);
    if (!tokens.length) return true;
    var source = product.__search;
    return tokens.every(function (token) {
      if (source.indexOf(token) >= 0) return true;
      return tokens.length > 1 && tokens.some(function (alternative) {
        return alternative !== token && source.indexOf(alternative) >= 0;
      });
    });
  }

  function filterSummary() {
    var parts = [];
    if (activeKey !== "all") parts.push(keyName[activeKey] || activeKey);
    var capacity = $("#capacityFilter");
    var material = $("#materialFilter");
    var temperature = $("#temperatureFilter");
    [capacity, material, temperature].forEach(function (select) {
      if (select && select.value !== "all") parts.push(select.options[select.selectedIndex].text);
    });
    var q = text($("#searchInput") && $("#searchInput").value);
    if (q) parts.push("关键词：" + q);
    return parts.length ? parts.join(" / ") : "全部产品";
  }

  function cell(value) {
    return text(value) ? esc(value) : '<span class="muted">—</span>';
  }

  function renderProducts() {
    var input = $("#searchInput");
    var query = input ? input.value : "";
    var capacityFilter = $("#capacityFilter") ? $("#capacityFilter").value : "all";
    var materialFilter = $("#materialFilter") ? $("#materialFilter").value : "all";
    var temperatureFilter = $("#temperatureFilter") ? $("#temperatureFilter").value : "all";

    currentRows = PRODUCTS.filter(function (product) {
      if (activeKey !== "all" && (product.key || "misc") !== activeKey) return false;
      if (!matchesQuery(product, query)) return false;
      if (!matchesCapacity(product, capacityFilter)) return false;
      if (!matchesMaterial(product, materialFilter)) return false;
      if (!matchesTemperature(product, temperatureFilter)) return false;
      return true;
    });

    var resultCount = $("#resultCount");
    var empty = $("#emptyTip");
    var tableBody = $("#tableBody");
    var mobileList = $("#mobileProductList");
    var resultLimit = $("#resultLimit");
    var clearSearch = $("#clearSearch");
    var summary = $("#activeFilterSummary");

    if (resultCount) resultCount.textContent = currentRows.length;
    if (summary) summary.textContent = "当前：" + filterSummary();
    if (clearSearch) clearSearch.hidden = !text(query);

    if (!currentRows.length) {
      if (tableBody) tableBody.innerHTML = "";
      if (mobileList) mobileList.innerHTML = "";
      if (empty) empty.hidden = false;
      if (resultLimit) resultLimit.hidden = true;
      return;
    }

    if (empty) empty.hidden = true;
    var shown = currentRows.slice(0, MAX_RESULTS);

    if (tableBody) {
      tableBody.innerHTML = shown.map(function (product, index) {
        var name = text(product["产品名称"]) || keyName[product.key] || "产品资料";
        var specCount = product.specs ? Object.keys(product.specs).length : 0;
        return '<tr data-index="' + index + '">' +
          '<td class="model">' + cell(product["型号"]) + '</td>' +
          '<td class="pname">' + esc(name) + '<br><span class="ptag">' + esc(keyName[product.key] || product["类别"] || "其他设备") + '</span></td>' +
          '<td>' + cell(product["材质"]) + '</td>' +
          '<td>' + cell(product["容量"]) + '</td>' +
          '<td>' + cell(product["控温范围"]) + '</td>' +
          '<td><button class="spec-btn' + (product.rich ? " rich" : "") + '" type="button">' +
          (specCount ? "查看参数" : "查看资料") + (product.rich ? " ✦" : "") + '</button></td>' +
          '</tr>';
      }).join("");
    }

    if (mobileList) {
      mobileList.innerHTML = shown.map(function (product, index) {
        var name = text(product["产品名称"]) || keyName[product.key] || "产品资料";
        return '<article class="mobile-product-card" data-index="' + index + '">' +
          '<div class="mobile-product-head"><div><b>' + esc(product["型号"] || name) + '</b>' +
          '<span>' + esc(name) + '</span></div><span class="ptag">' + esc(keyName[product.key] || product["类别"] || "其他设备") + '</span></div>' +
          '<dl>' +
          '<div><dt>容量</dt><dd>' + cell(product["容量"]) + '</dd></div>' +
          '<div><dt>材质</dt><dd>' + cell(product["材质"]) + '</dd></div>' +
          '<div><dt>温度</dt><dd>' + cell(product["控温范围"]) + '</dd></div>' +
          '</dl><button type="button" class="spec-btn">查看完整参数</button></article>';
      }).join("");
    }

    if (resultLimit) {
      resultLimit.hidden = currentRows.length <= MAX_RESULTS;
      resultLimit.textContent = currentRows.length > MAX_RESULTS
        ? "当前显示前 " + MAX_RESULTS + " 条，共 " + currentRows.length + " 条；请输入更具体的型号或工况缩小范围。"
        : "";
    }
  }

  function filterTo(key) {
    setActive(key);
    var input = $("#searchInput");
    if (input) input.value = "";
    resetAdvancedFilters(false);
    renderProducts();
    $("#catalog").scrollIntoView({ behavior: "smooth" });
  }

  var prefixPages = [];
  PAGES.forEach(function (page) {
    (page.prefixes || []).forEach(function (prefix) {
      prefixPages.push({ prefix: String(prefix).toUpperCase(), page: page.page });
    });
  });
  prefixPages.sort(function (a, b) { return b.prefix.length - a.prefix.length; });

  function getDetail(product) {
    if (text(product.detail)) return product.detail;
    var model = text(product["型号"]).toUpperCase();
    if (!model) return "";
    for (var i = 0; i < prefixPages.length; i += 1) {
      if (model.indexOf(prefixPages[i].prefix) === 0) return prefixPages[i].page;
    }
    return "";
  }

  var modalMask = $("#modalMask");
  var openedProduct = null;
  var imageByKey = {};
  CATEGORIES.forEach(function (category) { imageByKey[category.key] = category.img; });

  function openModal(product) {
    if (!product || !modalMask) return;
    openedProduct = product;
    $("#mTitle").textContent = text(product["型号"]) || text(product["产品名称"]) || "产品参数";
    $("#mName").textContent = text(product["产品名称"]);
    $("#mCat").textContent = keyName[product.key] || text(product["类别"]) || "产品资料";

    var image = $("#mImg");
    var imageSource = text(product.image || product.img) || imageByKey[product.key] || "";
    if (imageSource) {
      image.src = imageSource;
      image.alt = (text(product["型号"]) || text(product["产品名称"])) + "产品图片";
      image.hidden = false;
    } else image.hidden = true;

    var detailUrl = getDetail(product);
    var detailContainer = $("#mDetail");
    if (detailUrl) {
      detailContainer.innerHTML = '<a class="full-doc-btn" href="' + esc(detailUrl) +
        '" target="_blank" rel="noopener">查看完整产品资料与下载文件 →</a>';
    } else {
      detailContainer.innerHTML = '<div class="missing-doc">该型号尚未绑定专属详情页，系统不会再跳转到同类其他型号资料。请提交工况获取正式参数。</div>';
    }

    var specs = product.specs || {};
    var rows = Object.keys(specs).filter(function (key) {
      return text(specs[key]);
    }).map(function (key) {
      return "<tr><th>" + esc(key) + "</th><td>" + esc(specs[key]) + "</td></tr>";
    }).join("");

    if (!rows) {
      ["材质", "容量", "功率", "控温范围", "真空度", "转速", "电源", "尺寸", "重量"].forEach(function (key) {
        if (text(product[key])) rows += "<tr><th>" + esc(key) + "</th><td>" + esc(product[key]) + "</td></tr>";
      });
    }
    $("#mSpecs").innerHTML = rows || '<tr><td colspan="2" class="muted">暂无完整参数，请提交工况进行人工确认。</td></tr>';

    var selling = Array.isArray(product.selling) ? product.selling.filter(Boolean) : [];
    var sellingWrap = $("#mSellingWrap");
    if (selling.length) {
      sellingWrap.hidden = false;
      $("#mSelling").innerHTML = selling.map(function (item) { return "<li>" + esc(item) + "</li>"; }).join("");
    } else sellingWrap.hidden = true;

    modalMask.hidden = false;
    document.body.classList.add("modal-open");
    $("#modalClose").focus();
  }

  function closeModal() {
    if (!modalMask) return;
    modalMask.hidden = true;
    document.body.classList.remove("modal-open");
    openedProduct = null;
  }

  function initProductInteractions() {
    ["#tableBody", "#mobileProductList"].forEach(function (selector) {
      var container = $(selector);
      if (!container) return;
      container.addEventListener("click", function (event) {
        var item = event.target.closest("[data-index]");
        if (!item) return;
        var product = currentRows[Number(item.dataset.index)];
        if (product) openModal(product);
      });
    });

    if ($("#modalClose")) $("#modalClose").addEventListener("click", closeModal);
    if (modalMask) {
      modalMask.addEventListener("click", function (event) {
        if (event.target === modalMask) closeModal();
      });
    }
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && modalMask && !modalMask.hidden) closeModal();
    });

    if ($("#copyModel")) {
      $("#copyModel").addEventListener("click", function () {
        if (!openedProduct) return;
        copyText(text(openedProduct["型号"]) || text(openedProduct["产品名称"]), "型号已复制");
      });
    }

    if ($("#consultModel")) {
      $("#consultModel").addEventListener("click", function () {
        if (!openedProduct) return;
        var model = text(openedProduct["型号"]) || text(openedProduct["产品名称"]);
        var form = $("#selectorForm");
        form.dataset.model = model;
        var oldNotice = $(".selected-model-notice", form);
        if (oldNotice) oldNotice.remove();
        var notice = document.createElement("div");
        notice.className = "selected-model-notice";
        notice.innerHTML = '当前指定型号：<b>' + esc(model) + '</b><button type="button" aria-label="取消指定型号">×</button>';
        form.insertBefore(notice, form.firstChild);
        notice.querySelector("button").addEventListener("click", function () {
          delete form.dataset.model;
          notice.remove();
        });
        closeModal();
        $("#selector").scrollIntoView({ behavior: "smooth" });
        showToast("已带入咨询型号，请补充工况");
      });
    }
  }

  function initProductFilters() {
    var input = $("#searchInput");
    var clear = $("#clearSearch");
    var timer;

    if (input) {
      input.addEventListener("input", function () {
        clearTimeout(timer);
        timer = setTimeout(renderProducts, 120);
      });
    }
    if (clear) {
      clear.addEventListener("click", function () {
        input.value = "";
        input.focus();
        renderProducts();
      });
    }

    ["capacityFilter", "materialFilter", "temperatureFilter"].forEach(function (id) {
      var element = $("#" + id);
      if (element) element.addEventListener("change", renderProducts);
    });
    if ($("#resetFilters")) {
      $("#resetFilters").addEventListener("click", function () {
        setActive("all");
        if (input) input.value = "";
        resetAdvancedFilters(false);
        renderProducts();
      });
    }
  }

  function initSpecs() {
    var body = $("#specBody");
    var search = $("#specSearch");
    var chips = $("#specChips");
    var resultCount = $("#specResultCount");
    var empty = $("#specEmptyTip");
    if (!body) return;

    var specKey = "all";
    var names = {
      glass_reactor: "反应釜", hilo_circ: "高低温", rotary: "旋转蒸发",
      chiller: "低温冷却", hp_reactor: "高压釜", hi_circ: "高温循环",
      vacuum: "真空泵", mag_stir: "磁力搅拌", elec_stir: "电动搅拌",
      mol_dist: "分子蒸馏", bath: "恒温槽", others: "其他", misc: "其他"
    };
    var specCounts = {};
    SPECS.forEach(function (spec) { specCounts[spec.key] = (specCounts[spec.key] || 0) + 1; });
    var order = ["glass_reactor", "hilo_circ", "rotary", "chiller", "hp_reactor", "hi_circ",
      "vacuum", "mag_stir", "elec_stir", "mol_dist", "bath", "others"];

    if (chips) {
      var definitions = [["all", "全部"]].concat(order.filter(function (key) {
        return specCounts[key];
      }).map(function (key) { return [key, names[key] || key]; }));

      chips.innerHTML = definitions.map(function (definition) {
        return '<button type="button" class="chip' + (definition[0] === "all" ? " active" : "") +
          '" data-key="' + esc(definition[0]) + '">' + esc(definition[1]) +
          (definition[0] === "all" ? "" : " (" + specCounts[definition[0]] + ")") + '</button>';
      }).join("");

      chips.addEventListener("click", function (event) {
        var button = event.target.closest("button[data-key]");
        if (!button) return;
        specKey = button.dataset.key;
        $$(".chip", chips).forEach(function (item) {
          item.classList.toggle("active", item === button);
        });
        renderSpecs();
      });
    }

    function renderSpecs() {
      var query = normalize(search ? search.value : "");
      var rows = SPECS.filter(function (spec) {
        if (specKey !== "all" && spec.key !== specKey) return false;
        if (!query) return true;
        return normalize([spec.title, spec.series, spec.model].join(" ")).indexOf(query) >= 0;
      });
      if (resultCount) resultCount.textContent = rows.length;
      if (!rows.length) {
        body.innerHTML = "";
        if (empty) empty.hidden = false;
        return;
      }
      if (empty) empty.hidden = true;
      var shown = rows.slice(0, 200);
      body.innerHTML = shown.map(function (spec) {
        return '<tr>' +
          '<td class="model">' + esc(spec.model || text(spec.title).slice(0, 24)) + '</td>' +
          '<td class="pname">' + esc(spec.title || "产品规格书") + '<br><span class="ptag">' + esc(spec.series || names[spec.key] || "") + '</span></td>' +
          '<td>' + (spec.page ? '<a class="spec-btn rich" href="' + esc(spec.page) + '" target="_blank" rel="noopener">查看</a>' : '<span class="muted">—</span>') + '</td>' +
          '<td>' + (spec.dl ? '<a class="spec-btn" href="' + esc(spec.dl) + '" download>下载 Word</a>' : '<span class="muted">—</span>') + '</td>' +
          '</tr>';
      }).join("");
      if (rows.length > 200) {
        body.innerHTML += '<tr><td colspan="4" class="table-message">显示前200条，请输入更具体的型号缩小范围（共' + rows.length + '条）</td></tr>';
      }
    }

    if (search) {
      var timer;
      search.addEventListener("input", function () {
        clearTimeout(timer);
        timer = setTimeout(renderSpecs, 150);
      });
    }
    renderSpecs();
  }

  var selectorRules = {
    concentration: {
      title: "浓缩 / 溶剂回收方案",
      keys: ["rotary"],
      main: ["旋转蒸发仪"],
      support: ["循环水式真空泵或隔膜真空泵", "低温冷却液循环泵", "真空控制与防倒吸附件"],
      basis: "利用减压降低溶剂沸点，并通过冷凝系统回收溶剂。"
    },
    reaction: {
      title: "常压反应 / 合成方案",
      keys: ["glass_reactor"],
      main: ["单层或双层玻璃反应釜"],
      support: ["高低温循环装置或高温循环装置", "循环水真空泵（需要真空时）", "滴加、冷凝与回流组件"],
      basis: "玻璃反应系统便于观察反应过程，夹层循环介质用于控制温度。"
    },
    pressure: {
      title: "高温高压反应方案",
      keys: ["hp_reactor"],
      main: ["高压反应釜"],
      support: ["配套控温循环装置", "压力、温度与安全联锁配置", "按物料评估316L、钛材或哈氏合金"],
      basis: "正压力工况必须使用按设计条件选定的压力反应设备，不能使用普通玻璃反应釜替代。"
    },
    cooling: {
      title: "低温反应 / 冷却方案",
      keys: ["chiller", "hilo_circ", "bath"],
      main: ["低温冷却液循环泵、低温反应浴或高低温循环装置"],
      support: ["保温循环管路", "适配的载冷介质", "与反应设备匹配的流量和扬程"],
      basis: "根据最低温度、热负荷、环境温度和循环距离选择制冷量与泵参数。"
    },
    vacuum: {
      title: "抽真空 / 抽滤方案",
      keys: ["vacuum"],
      main: ["循环水式真空泵、隔膜真空泵或旋片真空泵"],
      support: ["缓冲瓶与防倒吸装置", "真空表或真空控制器", "耐腐蚀管路与接头"],
      basis: "泵型取决于目标真空度、抽气量、溶剂蒸汽和是否要求无油。"
    },
    distillation: {
      title: "蒸馏 / 提纯方案",
      keys: ["mol_dist", "rotary"],
      main: ["分子蒸馏装置、短程蒸馏系统或旋转蒸发仪"],
      support: ["真空系统", "冷却循环系统", "加热循环系统与收集系统"],
      basis: "需结合沸点、热敏性、处理量和目标真空度确定蒸馏路线。"
    },
    mixing: {
      title: "搅拌 / 分散 / 乳化方案",
      keys: ["mag_stir", "elec_stir", "others"],
      main: ["磁力搅拌器、电动搅拌器或高剪切分散乳化机"],
      support: ["适配搅拌桨", "加热或恒温装置", "按粘度核算扭矩与转速"],
      basis: "选择重点是物料粘度、容器直径、处理量、桨型、扭矩和剪切需求。"
    },
    drying: {
      title: "干燥 / 烘干方案",
      keys: ["others"],
      main: ["鼓风干燥箱、真空干燥箱、电热套或玻璃仪器烘干器"],
      support: ["温度控制与超温保护", "按样品性质评估真空和防爆要求", "耐腐蚀托盘或容器"],
      basis: "需根据样品挥发性、含溶剂情况、目标温度和干燥速度选型。"
    }
  };

  function candidateProducts(rule, formText) {
    return PRODUCTS.filter(function (product) {
      return rule.keys.indexOf(product.key) >= 0;
    }).map(function (product) {
      var score = 0;
      var source = product.__search;
      queryTokens(formText).forEach(function (token) {
        if (source.indexOf(token) >= 0) score += 2;
      });
      if (text(product["型号"])) score += 1;
      if (product.rich) score += 1;
      if (getDetail(product)) score += 1;
      return { product: product, score: score };
    }).sort(function (a, b) {
      return b.score - a.score || text(a.product["型号"]).localeCompare(text(b.product["型号"]), "zh-CN");
    }).slice(0, 6).map(function (item) { return item.product; });
  }

  function selectorSummary(form, rule) {
    var value = function (id) {
      var element = $("#" + id);
      if (!element) return "";
      if (element.tagName === "SELECT") return element.options[element.selectedIndex].text;
      return text(element.value);
    };
    var selectedModel = text(form.dataset.model);
    return [
      "予华仪器初步选型需求",
      selectedModel ? "指定型号：" + selectedModel : "",
      "主要用途：" + value("useCase"),
      "处理物料：" + (value("materialName") || "未填写"),
      "处理容量：" + (value("processCapacity") || "未填写"),
      "温度范围：" + (value("processTemperature") || "未填写"),
      "真空要求：" + value("vacuumNeed"),
      "正压力：" + value("pressureNeed"),
      "接触材质：" + value("contactMaterial"),
      "防爆要求：" + value("explosionProof"),
      "初步方向：" + rule.title,
      "说明：自动推荐仅用于初步沟通，正式采购前需由销售或技术人员复核。"
    ].filter(Boolean).join("\n");
  }

  function initSelector() {
    var form = $("#selectorForm");
    var result = $("#selectorResult");
    if (!form || !result) return;

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var useCase = $("#useCase").value;
      var rule = selectorRules[useCase];
      if (!rule) {
        showToast("请先选择主要用途");
        $("#useCase").focus();
        return;
      }

      var formText = [
        $("#materialName").value,
        $("#processCapacity").value,
        $("#processTemperature").value,
        $("#contactMaterial").value,
        form.dataset.model || ""
      ].join(" ");
      var candidates = candidateProducts(rule, formText);
      var warnings = [];
      if ($("#pressureNeed").value === "yes" && useCase !== "pressure") {
        warnings.push("已填写存在正压力：必须由技术人员确认压力等级，普通玻璃设备不可按压力容器使用。");
      }
      if ($("#explosionProof").value === "yes") {
        warnings.push("已填写需要防爆：电机、控制、电气元件及现场环境需整体评估，不能只更换单个防爆部件。");
      }
      if ($("#contactMaterial").value === "unknown") {
        warnings.push("接触材质尚未确定：需提供物料成分、浓度、温度和腐蚀性信息。");
      }

      var candidateHtml = candidates.length ? candidates.map(function (product) {
        return '<button type="button" class="candidate-product" data-model="' + esc(product["型号"] || product["产品名称"]) + '">' +
          '<b>' + esc(product["型号"] || product["产品名称"]) + '</b>' +
          '<span>' + esc(product["产品名称"] || keyName[product.key] || "") + '</span></button>';
      }).join("") : '<p class="muted">当前数据中暂无可直接列出的候选型号，请人工选型。</p>';

      result.innerHTML =
        '<div class="recommendation">' +
        '<span class="recommendation-tag">初步建议</span><h3>' + esc(rule.title) + '</h3>' +
        '<div class="recommendation-block"><h4>主设备方向</h4><ul>' + rule.main.map(function (item) { return "<li>" + esc(item) + "</li>"; }).join("") + '</ul></div>' +
        '<div class="recommendation-block"><h4>建议配套</h4><ul>' + rule.support.map(function (item) { return "<li>" + esc(item) + "</li>"; }).join("") + '</ul></div>' +
        '<div class="recommendation-block"><h4>选型依据</h4><p>' + esc(rule.basis) + '</p></div>' +
        '<div class="recommendation-block"><h4>数据库候选型号</h4><div class="candidate-grid">' + candidateHtml + '</div></div>' +
        (warnings.length ? '<div class="risk-box"><h4>必须人工确认</h4><ul>' + warnings.map(function (item) { return "<li>" + esc(item) + "</li>"; }).join("") + '</ul></div>' : "") +
        '<div class="recommendation-actions"><button type="button" class="btn btn-primary compact" id="copyRequirement">复制完整工况</button>' +
        '<a class="btn btn-secondary compact" href="#contact">查看联系方式</a></div>' +
        '<p class="selector-disclaimer">本结果不构成工艺、安全或压力容器设计结论。</p></div>';

      $("#copyRequirement").addEventListener("click", function () {
        copyText(selectorSummary(form, rule), "完整工况已复制");
      });

      $$(".candidate-product", result).forEach(function (button) {
        button.addEventListener("click", function () {
          var model = button.dataset.model;
          var product = PRODUCTS.find(function (item) {
            return (item["型号"] || item["产品名称"]) === model;
          });
          if (product) openModal(product);
        });
      });
    });
  }

  function initNavigation() {
    var navToggle = $("#navToggle");
    var navMobile = $("#navMobile");
    if (navToggle && navMobile) {
      navToggle.addEventListener("click", function () {
        var open = navMobile.classList.toggle("open");
        navToggle.classList.toggle("open", open);
        navToggle.setAttribute("aria-expanded", open ? "true" : "false");
        document.body.classList.toggle("nav-open", open);
      });
      $$("a", navMobile).forEach(function (link) {
        link.addEventListener("click", function () {
          navMobile.classList.remove("open");
          navToggle.classList.remove("open");
          navToggle.setAttribute("aria-expanded", "false");
          document.body.classList.remove("nav-open");
        });
      });
    }

    var nav = $(".nav");
    var toTop = $("#toTop");
    window.addEventListener("scroll", function () {
      if (nav) nav.classList.toggle("scrolled", window.scrollY > 10);
      if (toTop) toTop.classList.toggle("show", window.scrollY > 600);
    }, { passive: true });
    if (toTop) toTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  initStats();
  initContact();
  initNavigation();
  initApplications();
  initCategories();
  initVideos();
  initCategoryChips();
  initProductFilters();
  initProductInteractions();
  initSpecs();
  initSelector();
  renderProducts();
})();
