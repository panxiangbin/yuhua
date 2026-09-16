(function () {
  "use strict";

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

  // ---------- 型号弹窗询价/分享工具 ----------
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
      '<button type="button" class="inquiry-action primary" id="copyInquiry">复制询价信息</button>' +
      '<button type="button" class="inquiry-action" id="copyModelLink">复制型号链接</button>' +
      '</div>' +
      '<div class="inquiry-status" id="inquiryStatus" aria-live="polite"></div>';

    var note = modalBody.querySelector(".modal-note");
    if (note) modalBody.insertBefore(inquiry, note);
    else modalBody.appendChild(inquiry);

    var status = document.getElementById("inquiryStatus");
    var copyInquiry = document.getElementById("copyInquiry");
    var copyModelLink = document.getElementById("copyModelLink");

    function modelInfo() {
      var model = (document.getElementById("mTitle").textContent || "").trim();
      var name = (document.getElementById("mName").textContent || "").trim();
      return { model: model, name: name };
    }

    function modelUrl() {
      var info = modelInfo();
      var url = new URL(window.location.href);
      url.hash = "catalog";
      url.searchParams.delete("spec");
      if (info.model) url.searchParams.set("q", info.model);
      return url.toString();
    }

    copyInquiry.addEventListener("click", function () {
      var info = modelInfo();
      var text = "您好，我想咨询予华仪器" +
        (info.model ? "，型号：" + info.model : "") +
        (info.name ? "，产品：" + info.name : "") +
        "。请提供适用配置、报价、交期及售后信息。\n产品链接：" + modelUrl();
      copyText(text, status, "询价信息已复制，可直接发给销售人员");
    });

    copyModelLink.addEventListener("click", function () {
      copyText(modelUrl(), status, "型号链接已复制");
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
