(function () {
  "use strict";

  var SALES_EMAIL = "smxpxb008@gmail.com";

  function setCopyStatus(statusEl, text) {
    if (!statusEl) return;
    statusEl.textContent = text;
    window.setTimeout(function () {
      if (statusEl.textContent === text) statusEl.textContent = "";
    }, 3200);
  }

  function copyText(text, statusEl, successText) {
    function done() {
      setCopyStatus(statusEl, successText || "已复制");
    }

    function failed() {
      setCopyStatus(statusEl, "复制失败，请重试");
    }

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done).catch(function () {
        fallbackCopy(text, done, failed);
      });
    } else {
      fallbackCopy(text, done, failed);
    }
  }

  function fallbackCopy(text, onSuccess, onFailure) {
    var ta = document.createElement("textarea");
    var copied = false;
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try { copied = document.execCommand("copy"); } catch (e) {}
    document.body.removeChild(ta);
    if (copied) onSuccess();
    else onFailure();
  }

  function setUrlParam(key, value, hash, exclusiveKey) {
    if (!window.history || !history.replaceState) return;
    var url = new URL(window.location.href);
    if (value) {
      url.searchParams.set(key, value);
      if (exclusiveKey) url.searchParams.delete(exclusiveKey);
    } else {
      url.searchParams.delete(key);
    }
    if (value && hash) url.hash = hash;
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
        setUrlParam("q", searchInput.value.trim(), "catalog", "spec");
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
        setUrlParam("spec", specSearch.value.trim(), "specs", "q");
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

  // ---------- 规格书列表：上下文邮件咨询 ----------
  function enhanceSpecInquiryActions() {
    var specBody = document.getElementById("specBody");
    var specTable = specBody ? specBody.closest("table") : null;
    if (!specBody || !specTable) return;

    var headRow = specTable.querySelector("thead tr");
    if (headRow && !headRow.querySelector(".spec-inquiry-head")) {
      var headCell = document.createElement("th");
      headCell.className = "spec-inquiry-head";
      headCell.textContent = "邮件咨询";
      headRow.appendChild(headCell);
    }

    function syncSpecInquiryActions() {
      Array.prototype.forEach.call(specBody.rows, function (row) {
        if (row.cells.length === 1) {
          if (row.cells[0].colSpan >= 4) row.cells[0].colSpan = 5;
          return;
        }
        if (row.querySelector(".spec-inquiry-cell") || row.cells.length < 4) return;

        var label = (row.cells[0].textContent || "").trim();
        var series = (row.cells[1].textContent || "").trim();
        var pageLink = row.cells[2].querySelector("a[href]");
        var pageUrl = pageLink ? pageLink.href : window.location.href;
        var subject = "予华仪器规格书咨询" + (label ? " - " + label : "");
        var body = "您好，我想咨询以下予华仪器规格书对应产品：\n\n" +
          (label ? "型号/文件名：" + label + "\n" : "") +
          (series ? "产品系列：" + series + "\n" : "") +
          "规格书在线页：" + pageUrl + "\n\n" +
          "请提供适用配置、报价、交期及相关技术资料。";

        var cell = document.createElement("td");
        cell.className = "spec-inquiry-cell";
        var link = document.createElement("a");
        link.className = "spec-btn";
        link.href = mailto(subject, body);
        link.textContent = "邮件咨询";
        link.setAttribute("aria-label", "邮件咨询 " + (label || "当前规格书"));
        cell.appendChild(link);
        row.appendChild(cell);
      });
    }

    syncSpecInquiryActions();
    new MutationObserver(syncSpecInquiryActions).observe(specBody, { childList: true });
  }

  enhanceSpecInquiryActions();

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
  var copySelectionInquiry = null;
  var selectionCopyStatus = null;

  if (copyEmail) {
    copyEmail.addEventListener("click", function () {
      copyText(SALES_EMAIL, copyEmailStatus, "邮箱已复制");
    });
  }

  function fieldValue(id) {
    var el = document.getElementById(id);
    return el ? (el.value || "").trim() : "";
  }

  function selectionInquiryContent() {
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

    return { subject: subject, body: lines.join("\n") };
  }

  if (selectionForm) {
    var formActions = selectionForm.querySelector(".form-actions");
    if (formActions) {
      copySelectionInquiry = document.createElement("button");
      copySelectionInquiry.type = "button";
      copySelectionInquiry.id = "copySelectionInquiry";
      copySelectionInquiry.className = "clear-form-btn";
      copySelectionInquiry.textContent = "复制完整询价内容";
      copySelectionInquiry.setAttribute("aria-describedby", "selectionCopyStatus");

      if (clearInquiry) formActions.insertBefore(copySelectionInquiry, clearInquiry);
      else formActions.appendChild(copySelectionInquiry);

      selectionCopyStatus = document.createElement("span");
      selectionCopyStatus.id = "selectionCopyStatus";
      selectionCopyStatus.className = "inquiry-status";
      selectionCopyStatus.setAttribute("aria-live", "polite");
      selectionCopyStatus.setAttribute("aria-atomic", "true");
      formActions.appendChild(selectionCopyStatus);
    }

    selectionForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var inquiryContent = selectionInquiryContent();
      window.location.href = mailto(inquiryContent.subject, inquiryContent.body);
    });

    if (copySelectionInquiry) {
      copySelectionInquiry.addEventListener("click", function () {
        var inquiryContent = selectionInquiryContent();
        var fullText =
          "收件人：" + SALES_EMAIL + "\n" +
          "主题：" + inquiryContent.subject + "\n\n" +
          inquiryContent.body;
        copyText(fullText, selectionCopyStatus, "完整询价内容已复制");
      });
    }
  }

  if (clearInquiry && selectionForm) {
    clearInquiry.addEventListener("click", function () {
      selectionForm.reset();
      if (selectionCopyStatus) selectionCopyStatus.textContent = "";
      document.getElementById("inqCategory").focus();
    });
  }
})();