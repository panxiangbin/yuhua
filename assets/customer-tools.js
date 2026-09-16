(function () {
  "use strict";

  var SALES_EMAIL = "smxpxb008@gmail.com";

  function copyText(text, statusEl, successText) {
    function done() {
      if (statusEl) statusEl.textContent = successText || "已复制";
      window.setTimeout(function () {
        if (statusEl) statusEl.textContent = "";
      }, 2600);
    }

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done).catch(function () {
        fallbackCopy(text, done);
      });
    } else {
      fallbackCopy(text, done);
    }
  }

  function fallbackCopy(text, callback) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) {}
    document.body.removeChild(ta);
    callback();
  }

  function setUrlParam(key, value) {
    if (!window.history || !history.replaceState) return;
    var url = new URL(window.location.href);
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
    history.replaceState(null, "", url.pathname + url.search + url.hash);
  }

  function mailto(subject, body) {
    return "mailto:" + SALES_EMAIL +
      "?subject=" + encodeURIComponent(subject) +
      "&body=" + encodeURIComponent(body);
  }

  // ---------- 可分享搜索链接 ----------
  var query = new URLSearchParams(window.location.search);
  var searchInput = document.getElementById("searchInput");
  var specSearch = document.getElementById("specSearch");

  if (searchInput) {
    var initialQ = query.get("q");
    if (initialQ) {
      searchInput.value = initialQ;
      searchInput.dispatchEvent(new Event("input", { bubbles: true }));
    }
    var qTimer;
    searchInput.addEventListener("input", function () {
      clearTimeout(qTimer);
      qTimer = setTimeout(function () {
        setUrlParam("q", searchInput.value.trim());
      }, 250);
    });
  }

  if (specSearch) {
    var initialSpec = query.get("spec");
    if (initialSpec) {
      specSearch.value = initialSpec;
      specSearch.dispatchEvent(new Event("input", { bubbles: true }));
    }
    var specTimer;
    specSearch.addEventListener("input", function () {
      clearTimeout(specTimer);
      specTimer = setTimeout(function () {
        setUrlParam("spec", specSearch.value.trim());
      }, 250);
    });
  }

  // ---------- 分类卡键盘可操作 ----------
  Array.prototype.forEach.call(document.querySelectorAll(".cat-card"), function (card) {
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        card.click();
      }
    });
  });

  // ---------- 筛选状态与搜索结果无障碍反馈 ----------
  function enhanceFilterGroup(containerId, label) {
    var container = document.getElementById(containerId);
    if (!container) return;
    container.setAttribute("role", "group");
    container.setAttribute("aria-label", label);

    function syncPressed() {
      Array.prototype.forEach.call(container.querySelectorAll("button"), function (button) {
        button.setAttribute("aria-pressed", button.classList.contains("active") ? "true" : "false");
      });
    }

    syncPressed();
    container.addEventListener("click", function (e) {
      if (!e.target.closest("button")) return;
      window.setTimeout(syncPressed, 0);
    });
  }

  function enhanceSearchStatus(input, resultCountId, tableBodyId, statusId) {
    if (!input) return;
    var resultCount = document.getElementById(resultCountId);
    var status = resultCount ? resultCount.parentElement : null;
    if (status) {
      status.id = statusId;
      status.setAttribute("aria-live", "polite");
      status.setAttribute("aria-atomic", "true");
      input.setAttribute("aria-describedby", statusId);
    }
    input.setAttribute("aria-controls", tableBodyId);
  }

  enhanceFilterGroup("chips", "产品分类筛选");
  enhanceFilterGroup("specChips", "规格书分类筛选");
  enhanceSearchStatus(searchInput, "resultCount", "tableBody", "catalogResultStatus");
  enhanceSearchStatus(specSearch, "specResultCount", "specBody", "specResultStatus");

  // ---------- 移动导航 ARIA 状态 ----------
  var navToggle = document.getElementById("navToggle");
  var navMobile = document.getElementById("navMobile");
  if (navToggle && navMobile) {
    navToggle.setAttribute("aria-expanded", navToggle.classList.contains("open") ? "true" : "false");
    navToggle.setAttribute("aria-controls", "navMobile");
    navMobile.setAttribute("aria-hidden", navMobile.classList.contains("open") ? "false" : "true");
    navToggle.addEventListener("click", function () {
      window.setTimeout(function () {
        var open = navToggle.classList.contains("open");
        navToggle.setAttribute("aria-expanded", open ? "true" : "false");
        navMobile.setAttribute("aria-hidden", open ? "false" : "true");
      }, 0);
    });
  }

  // ---------- 型号弹窗：邮件询价、复制文本、分享链接 ----------
  var mask = document.getElementById("modalMask");
  var modal = mask ? mask.querySelector(".modal") : null;
  var modalBody = mask ? mask.querySelector(".modal-body") : null;
  var modalClose = document.getElementById("modalClose");
  var lastFocus = null;

  if (modal) modal.setAttribute("aria-labelledby", "mTitle");
  if (modalClose) modalClose.setAttribute("aria-label", "关闭产品参数");

  if (modalBody) {
    var inquiry = document.createElement("div");
    inquiry.className = "inquiry-tools";
    inquiry.innerHTML =
      '<span class="inquiry-tools-title">咨询这个型号</span>' +
      '<div class="inquiry-actions">' +
      '<a class="inquiry-action primary" id="emailInquiry" href="#">邮件询价</a>' +
      '<button type="button" class="inquiry-action" id="copyInquiry">复制询价信息</button>' +
      '<button type="button" class="inquiry-action" id="copyModelLink">复制型号链接</button>' +
      '</div>' +
      '<div class="inquiry-status" id="inquiryStatus" aria-live="polite"></div>';

    var note = modalBody.querySelector(".modal-note");
    if (note) modalBody.insertBefore(inquiry, note);
    else modalBody.appendChild(inquiry);

    var status = document.getElementById("inquiryStatus");
    var emailInquiry = document.getElementById("emailInquiry");
    var copyInquiry = document.getElementById("copyInquiry");
    var copyModelLink = document.getElementById("copyModelLink");

    function modelInfo() {
      var model = (document.getElementById("mTitle").textContent || "").trim();
      var name = (document.getElementById("mName").textContent || "").trim();
      var category = (document.getElementById("mCat").textContent || "").trim();
      return { model: model, name: name, category: category };
    }

    function modelUrl() {
      var info = modelInfo();
      var url = new URL(window.location.href);
      url.hash = "catalog";
      url.searchParams.delete("spec");
      if (info.model) url.searchParams.set("q", info.model);
      return url.toString();
    }

    function inquiryText() {
      var info = modelInfo();
      return "您好，我想咨询予华仪器。\n\n" +
        (info.model ? "型号：" + info.model + "\n" : "") +
        (info.name ? "产品：" + info.name + "\n" : "") +
        (info.category ? "类别：" + info.category + "\n" : "") +
        "请提供适用配置、报价、交期及售后信息。\n\n" +
        "产品查询链接：" + modelUrl();
    }

    function refreshInquiryLink() {
      var info = modelInfo();
      var subject = "予华仪器产品询价" + (info.model ? " - " + info.model : "");
      emailInquiry.href = mailto(subject, inquiryText());
    }

    emailInquiry.addEventListener("click", refreshInquiryLink);

    copyInquiry.addEventListener("click", function () {
      copyText(inquiryText(), status, "询价信息已复制");
    });

    copyModelLink.addEventListener("click", function () {
      copyText(modelUrl(), status, "型号链接已复制");
    });

    if (mask) {
      new MutationObserver(function () {
        if (!mask.hidden) refreshInquiryLink();
      }).observe(mask, { attributes: true, attributeFilter: ["hidden"] });
    }
  }

  // ---------- 选型助手 ----------
  var selectionForm = document.getElementById("selectionForm");
  var copyEmail = document.getElementById("copyEmail");
  var copyEmailStatus = document.getElementById("copyEmailStatus");
  var clearInquiry = document.getElementById("clearInquiry");

  if (copyEmail) {
    copyEmail.addEventListener("click", function () {
      copyText(SALES_EMAIL, copyEmailStatus, "邮箱已复制");
    });
  }

  function fieldValue(id) {
    var el = document.getElementById(id);
    return el ? (el.value || "").trim() : "";
  }

  if (selectionForm) {
    selectionForm.addEventListener("submit", function (e) {
      e.preventDefault();

      var category = fieldValue("inqCategory");
      var model = fieldValue("inqModel");
      var capacity = fieldValue("inqCapacity");
      var temperature = fieldValue("inqTemperature");
      var pressure = fieldValue("inqPressure");
      var power = fieldValue("inqPower");
      var notes = fieldValue("inqNotes");

      var subject = "予华仪器选型/询价" +
        (model ? " - " + model : category ? " - " + category : "");

      var lines = [
        "您好，我需要咨询予华仪器产品，需求如下：",
        "",
        "产品类别：" + (category || "暂不确定"),
        "参考型号：" + (model || "暂不确定"),
        "容量/处理量：" + (capacity || "未填写"),
        "温度范围：" + (temperature || "未填写"),
        "真空/压力要求：" + (pressure || "未填写"),
        "电源/使用地区：" + (power || "未填写"),
        "材质、防爆、物料与其他要求：" + (notes || "未填写"),
        "",
        "请协助推荐适合的型号/配置，并提供报价、交期及相关技术资料。",
        "",
        "网站：" + window.location.origin + window.location.pathname
      ];

      window.location.href = mailto(subject, lines.join("\n"));
    });
  }

  if (clearInquiry && selectionForm) {
    clearInquiry.addEventListener("click", function () {
      selectionForm.reset();
      document.getElementById("inqCategory").focus();
    });
  }

  // ---------- 弹窗焦点管理 ----------
  if (mask && modal) {
    var tableBody = document.getElementById("tableBody");
    if (tableBody) {
      tableBody.addEventListener("click", function () {
        lastFocus = document.activeElement;
      }, true);
    }

    var observer = new MutationObserver(function () {
      if (!mask.hidden) {
        if (modalClose) modalClose.focus();
      } else if (lastFocus && typeof lastFocus.focus === "function") {
        lastFocus.focus();
      }
    });
    observer.observe(mask, { attributes: true, attributeFilter: ["hidden"] });

    document.addEventListener("keydown", function (e) {
      if (mask.hidden || e.key !== "Tab") return;
      var focusable = modal.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])');
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  }
})();
