(function () {
  'use strict';

  var BUILD = '20260721s';
  var GALLERY_BUILD = '20260722x';
  var refreshTimer = 0;
  var shareStatusTimer = 0;
  var lastGalleryTrigger = null;

  function meta(name, value, property) {
    var node = document.querySelector(property ? 'meta[property="' + name + '"]' : 'meta[name="' + name + '"]');
    if (node && node.content !== value) node.content = value;
  }

  function setText(node, value) {
    if (node && node.textContent !== value) node.textContent = value;
  }

  function brand() {
    if (document.title !== '数控小潘 CNC速查与学习助手') document.title = '数控小潘 CNC速查与学习助手';
    meta('description', '数控小潘 CNC随身助手：手机端快速查询G/M代码、报警、参数与现场故障，并按路线学习数控编程。');
    meta('keywords', '数控小潘,CNC随身助手,G代码,M代码,报警排查,参数速查,故障问诊');
    meta('og:title', '数控小潘 CNC速查与学习助手', true);
    meta('og:description', '查代码、查报警、查参数、排故障，手机端随手用。', true);
    setText(document.querySelector('.sidebar-head h1'), '数控小潘 CNC随身助手');
    setText(document.querySelector('.brand-kicker'), 'CNC XIAOPAN');
  }

  function risk(entry) {
    var text = ((entry && entry.warning) || '') + ' ' + ((entry && entry.risk) || '') + ' ' + ((entry && entry.summary) || '');
    if (/撞机|人身|高压|主轴|急停|危险|严禁/.test(text)) return ['高风险', 'high'];
    if (/注意|确认|报警|参数|刀补|回零/.test(text)) return ['需核验', 'medium'];
    return ['一般参考', 'low'];
  }

  function entryList() {
    try {
      if (window.state && Array.isArray(window.state.entries)) return window.state.entries;
    } catch (error) {}
    return Array.isArray(window.CNC_DATA) ? window.CNC_DATA : [];
  }

  function currentEntry() {
    var list = entryList();
    try {
      var id = window.state && window.state.selectedId;
      if (id) {
        var byId = list.find(function (item) { return item && item.id === id; });
        if (byId) return byId;
      }
    } catch (error) {}
    var code = ((document.getElementById('detail-code') || {}).textContent || '').trim();
    var title = ((document.getElementById('detail-title') || {}).textContent || '').trim();
    return list.find(function (item) {
      return item && ((code && String(item.code || '').trim() === code) || (title && String(item.title || '').trim() === title));
    }) || null;
  }

  function esc(value) {
    return String(value || '').replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }

  function trust() {
    var host = document.querySelector('#view-workspace .detail-panel,#detail-panel,.workspace-detail,.detail-content');
    if (!host) return false;
    var old = host.querySelector('.xp-trust-panel');
    if (old) old.remove();
    var entry = currentEntry() || {};
    var rating = risk(entry);
    var serialized = JSON.stringify(entry);
    var system = entry.system || entry.controller || (/FANUC/i.test(serialized) ? 'FANUC系列' : '按条目说明');
    var machine = entry.machine || entry.machineType || entry.model || '加工中心/数控车床需现场确认';
    var status = (entry.source || entry.sourceStatus) ? '已整理·待机床手册复核' : '学习资料·需现场复核';
    var source = entry.source || entry.reference || '数控小潘知识库与公开手册整理';
    var box = document.createElement('section');
    box.className = 'xp-trust-panel';
    box.setAttribute('aria-label', '技术资料可信度说明');
    box.innerHTML = '<div class="xp-trust-title"><span>技术资料核验卡</span><small>不能替代机床原厂手册</small></div>' +
      '<div class="xp-trust-grid">' +
      '<div class="xp-trust-item"><span>适用系统</span><strong>' + esc(system) + '</strong></div>' +
      '<div class="xp-trust-item"><span>适用机型</span><strong>' + esc(machine) + '</strong></div>' +
      '<div class="xp-trust-item"><span>资料状态</span><strong>' + esc(status) + '</strong></div>' +
      '<div class="xp-trust-item xp-risk-' + rating[1] + '"><span>风险等级</span><strong>' + rating[0] + '</strong></div>' +
      '<div class="xp-trust-item"><span>核验日期</span><strong>2026-07-21</strong></div>' +
      '<div class="xp-trust-item"><span>资料来源</span><strong>' + esc(source) + '</strong></div></div>';
    var anchor = host.querySelector('.detail-summary,#detail-summary,.detail-header');
    if (anchor && anchor.parentNode) anchor.insertAdjacentElement('afterend', box);
    else host.prepend(box);
    return true;
  }

  function scheduleTrust(delay) {
    clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(trust, typeof delay === 'number' ? delay : 90);
  }

  function activeKeyFromPage() {
    var activeView = document.querySelector('.view.active');
    if (!activeView || activeView.id === 'view-dashboard') return 'dashboard';
    if (activeView.id === 'view-study') return 'study';
    if (activeView.id === 'view-favorites') return 'favorites';
    if (activeView.id !== 'view-workspace') return '';
    var title = ((document.getElementById('workspace-title') || {}).textContent || '') + ' ' + ((document.getElementById('topbar-title') || {}).textContent || '');
    if (/报警/.test(title)) return 'alarm';
    if (/参数/.test(title)) return 'parameter';
    if (/G\/M|代码/.test(title)) return 'gcode';
    return '';
  }

  function syncNavState(preferred) {
    var key = preferred || activeKeyFromPage();
    document.querySelectorAll('.xp-bottom-nav button').forEach(function (button) {
      var buttonKey = button.dataset.xpRoute || button.dataset.xpFilter || '';
      var active = buttonKey === key;
      button.classList.toggle('active', active);
      if (active) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
  }

  function navigateFromBottomButton(button, routeEvent) {
    var route = button.dataset.xpRoute || '';
    var filter = button.dataset.xpFilter || '';

    // “查代码”必须复用已经被完整回归验证的侧栏工作区路由。
    // 原底栏直接调用 navigate，在启动保护、动态增强层同时就绪时可能只改了底栏状态，
    // 工作区却未真正激活。先把本次可信点击明确交给启动保护，再走既有路由按钮；
    // 只有路由按钮不存在时才退回直接调用，并同步触发 G 代码增强层加载。
    if (filter === 'gcode') {
      if (routeEvent && window.CNC_STARTUP_HOME_GUARD &&
          typeof window.CNC_STARTUP_HOME_GUARD.acceptTrustedRouteEvent === 'function') {
        window.CNC_STARTUP_HOME_GUARD.acceptTrustedRouteEvent(routeEvent);
      }
      var gcodeTarget = document.querySelector('#sidebar [data-route="workspace"][data-filter="gcode"]');
      if (gcodeTarget) {
        gcodeTarget.click();
        return true;
      }
      if (typeof window.navigate === 'function') {
        window.navigate('workspace', { filter: 'gcode' });
        if (typeof window.CNC_LOAD_GCODE_PRO === 'function') window.CNC_LOAD_GCODE_PRO();
        return true;
      }
    }

    var target = route
      ? document.querySelector('[data-route="' + route + '"]')
      : document.querySelector('[data-route="workspace"][data-filter="' + filter + '"],[data-filter="' + filter + '"]');
    if (target) {
      target.click();
      return true;
    }
    return false;
  }

  function nav() {
    if (document.querySelector('.xp-bottom-nav')) return;
    var node = document.createElement('nav');
    node.className = 'xp-bottom-nav';
    node.setAttribute('aria-label', '手机底部导航');
    node.innerHTML = '<button type="button" data-xp-route="dashboard" aria-label="首页"><b aria-hidden="true">⌂</b><span>首页</span></button>' +
      '<button type="button" data-xp-filter="gcode" aria-label="查G代码和M代码"><b aria-hidden="true">G</b><span>查代码</span></button>' +
      '<button type="button" data-xp-filter="alarm" aria-label="报警排查"><b aria-hidden="true">!</b><span>报警</span></button>' +
      '<button type="button" data-xp-route="study" aria-label="新手学习"><b aria-hidden="true">01</b><span>学习</span></button>' +
      '<button type="button" data-xp-route="favorites" aria-label="我的收藏与记录"><b aria-hidden="true">★</b><span>我的</span></button>';
    document.body.appendChild(node);
    node.addEventListener('click', function (event) {
      var button = event.target.closest('button');
      if (!button) return;
      navigateFromBottomButton(button, event);
      syncNavState(button.dataset.xpRoute || button.dataset.xpFilter);
      scheduleTrust();
    });
    syncNavState();
  }

  function ensureGalleryLayer() {
    var link = document.querySelector('link[data-cnc-industrial-gallery]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = './industrial-gallery.css?v=' + GALLERY_BUILD;
      link.dataset.cncIndustrialGallery = '1';
      document.head.appendChild(link);
    }
    var modal = document.getElementById('cncGalleryModal');
    if (!modal || modal.dataset.cncAccessible === 'true') return;
    modal.dataset.cncAccessible = 'true';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'cncGalleryPreviewTitle');
    modal.setAttribute('aria-describedby', 'cncGalleryPreviewDesc');
    document.addEventListener('click', function (event) {
      var card = event.target.closest && event.target.closest('.cnc-gallery-card');
      if (card) {
        lastGalleryTrigger = card;
        window.setTimeout(function () {
          var close = document.getElementById('cncGalleryClose');
          if (modal.classList.contains('is-open') && close) close.focus();
        }, 40);
      }
      if (event.target.closest && event.target.closest('#cncGalleryClose,[data-close="true"]')) {
        window.setTimeout(function () {
          if (lastGalleryTrigger && document.contains(lastGalleryTrigger)) lastGalleryTrigger.focus();
        }, 40);
      }
    }, true);
    document.addEventListener('keydown', function (event) {
      if (!modal.classList.contains('is-open') || event.key !== 'Tab') return;
      var focusable = Array.from(modal.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')).filter(function (node) {
        return !node.disabled && node.offsetParent !== null;
      });
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
  }

  function sharePayload() {
    var entry = currentEntry() || {};
    var code = String(entry.code || (document.getElementById('detail-code') || {}).textContent || '').trim();
    var title = String(entry.title || (document.getElementById('detail-title') || {}).textContent || '').trim();
    var summary = String(entry.summary || (document.getElementById('detail-summary') || {}).textContent || '').trim();
    var url = new URL(location.href);
    url.hash = '';
    url.search = '';
    if (code) url.searchParams.set('q', code);
    return {
      title: code ? code + ' · ' + title : title || '数控小潘 CNC随身助手',
      text: summary ? (code ? code + '：' : '') + summary : '数控小潘 CNC随身助手知识条目',
      url: url.toString()
    };
  }

  function ensureShareStatus() {
    var status = document.getElementById('xp-share-status');
    if (status) return status;
    status = document.createElement('div');
    status.id = 'xp-share-status';
    status.className = 'xp-share-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.hidden = true;
    document.body.appendChild(status);
    return status;
  }

  function announceShare(message, isError) {
    var status = ensureShareStatus();
    clearTimeout(shareStatusTimer);
    status.textContent = message;
    status.classList.toggle('is-error', Boolean(isError));
    status.hidden = false;
    shareStatusTimer = window.setTimeout(function () { status.hidden = true; }, 2400);
  }

  function copyText(value) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') return navigator.clipboard.writeText(value);
    return new Promise(function (resolve, reject) {
      var area = document.createElement('textarea');
      area.value = value;
      area.setAttribute('readonly', 'readonly');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      try {
        if (document.execCommand('copy')) resolve();
        else reject(new Error('copy failed'));
      } catch (error) { reject(error); }
      area.remove();
    });
  }

  function shareCurrentDetail() {
    var payload = sharePayload();
    if (navigator.share && typeof navigator.share === 'function') {
      return navigator.share(payload).then(function () {
        announceShare('已打开系统分享');
        return true;
      }).catch(function (error) {
        if (error && error.name === 'AbortError') return false;
        return copyText(payload.url).then(function () { announceShare('分享不可用，链接已复制'); return true; });
      });
    }
    return copyText(payload.url).then(function () {
      announceShare('链接已复制');
      return true;
    }).catch(function () {
      announceShare('复制失败，请长按地址栏复制', true);
      return false;
    });
  }

  function forceMobileDetailActions() {
    if (window.innerWidth > 760) return;
    var toolbar = document.querySelector('#detail-panel .detail-toolbar');
    var favorite = document.getElementById('favorite-toggle');
    var share = document.getElementById('detail-share');
    if (toolbar) {
      toolbar.style.setProperty('display', 'grid', 'important');
      toolbar.style.setProperty('grid-template-columns', '44px 48px', 'important');
      toolbar.style.setProperty('gap', '8px', 'important');
      toolbar.style.setProperty('min-width', '100px', 'important');
    }
    [favorite, share].forEach(function (button) {
      if (!button) return;
      button.style.setProperty('display', 'inline-flex', 'important');
      button.style.setProperty('visibility', 'visible', 'important');
      button.style.setProperty('opacity', '1', 'important');
      button.style.setProperty('min-height', '44px', 'important');
    });
  }

  function bindDetailShare() {
    var button = document.getElementById('detail-share');
    if (!button) return false;
    forceMobileDetailActions();
    button.setAttribute('aria-label', '分享当前知识条目');
    button.title = '分享当前知识条目';
    if (button.dataset.cncShareBound !== 'true') {
      button.dataset.cncShareBound = 'true';
      button.addEventListener('click', function () { shareCurrentDetail(); });
    }
    ensureShareStatus();
    return true;
  }

  function scheduleDetailActions() {
    [0, 80, 220, 500].forEach(function (delay) {
      window.setTimeout(function () { bindDetailShare(); forceMobileDetailActions(); }, delay);
    });
  }

  function bindPageEvents() {
    document.addEventListener('click', function (event) {
      if (!event.target || !event.target.closest) return;
      if (event.target.closest('.result-card,.knowledge-card,[data-entry-id],[data-route],[data-filter],[data-open-entry]')) {
        scheduleTrust();
        window.setTimeout(syncNavState, 120);
        scheduleDetailActions();
      }
      if (event.target.closest('[data-route="gallery"]')) window.setTimeout(ensureGalleryLayer, 80);
    }, true);
    window.addEventListener('hashchange', function () {
      window.setTimeout(syncNavState, 60);
      scheduleTrust(120);
      window.setTimeout(ensureGalleryLayer, 80);
      scheduleDetailActions();
    });
    window.addEventListener('resize', scheduleDetailActions, { passive: true });
  }

  function boot() {
    brand();
    nav();
    var link = document.querySelector('link[data-xp-trust-nav]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = './mobile-trust-nav.css?v=' + BUILD;
      link.dataset.xpTrustNav = '1';
      document.head.appendChild(link);
    }
    ensureGalleryLayer();
    scheduleDetailActions();
    bindPageEvents();
    window.setTimeout(function () {
      trust();
      syncNavState();
      ensureGalleryLayer();
      scheduleDetailActions();
      window.__CNC_TRUST_READY_AT__ = Date.now();
    }, 500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();

  window.CNC_TRUST_NAV = {
    build: BUILD,
    galleryBuild: GALLERY_BUILD,
    polling: false,
    observer: false,
    refresh: trust,
    syncNavState: syncNavState,
    ensureGalleryLayer: ensureGalleryLayer,
    bindDetailShare: bindDetailShare,
    sharePayload: sharePayload,
    shareCurrentDetail: shareCurrentDetail
  };
})();

/* CNC 手机端无障碍基础层：补齐主内容跳转、隐藏区域焦点隔离与目录键盘交互。 */
(function () {
  'use strict';

  var BUILD = '20260801-a11y2';
  var syncTimers = [];
  var FOCUSABLE = 'button,a[href],input,select,textarea,[contenteditable="true"],[tabindex]';
  var SYNC_DELAYS = [0, 80, 240, 600];

  function installStyles() {
    if (document.getElementById('cnc-accessibility-foundation-style')) return;
    var style = document.createElement('style');
    style.id = 'cnc-accessibility-foundation-style';
    style.textContent = [
      '.cnc-skip-link{position:fixed;z-index:100000;top:8px;left:8px;padding:12px 16px;border-radius:10px;background:#fff;color:#071a33;font-weight:900;text-decoration:none;box-shadow:0 0 0 3px #ffbf00,0 8px 24px rgba(0,0,0,.3);transform:translateY(-160%)}',
      '.cnc-skip-link:focus,.cnc-skip-link:focus-visible{transform:translateY(0);outline:3px solid #0b76ff;outline-offset:3px}',
      '@media(prefers-reduced-motion:reduce){.cnc-skip-link{transition:none!important}}'
    ].join('');
    document.head.appendChild(style);
  }

  function ensureMainAndSkipLink() {
    var main = document.querySelector('main.main-shell') || document.querySelector('main');
    if (!main) return false;
    if (!main.id) main.id = 'main-content';
    var skip = document.querySelector('.cnc-skip-link');
    if (!skip) {
      skip = document.createElement('a');
      skip.className = 'cnc-skip-link';
      skip.textContent = '跳到主内容';
      document.body.insertBefore(skip, document.body.firstChild);
    }
    skip.href = '#' + main.id;
    if (skip.dataset.cncSkipBound !== 'true') {
      skip.dataset.cncSkipBound = 'true';
      skip.addEventListener('click', function () {
        main.setAttribute('tabindex', '-1');
        window.requestAnimationFrame(function () {
          main.focus({ preventScroll: true });
          main.scrollIntoView({ block: 'start' });
        });
      });
    }
    return true;
  }

  function saveAndDisable(node) {
    if (!node || node.disabled) return;
    if (!node.hasAttribute('data-cnc-a11y-tabindex')) {
      node.setAttribute('data-cnc-a11y-tabindex', node.hasAttribute('tabindex') ? node.getAttribute('tabindex') : '__missing__');
    }
    node.setAttribute('tabindex', '-1');
  }

  function restore(node) {
    if (!node || !node.hasAttribute('data-cnc-a11y-tabindex')) return;
    var previous = node.getAttribute('data-cnc-a11y-tabindex');
    node.removeAttribute('data-cnc-a11y-tabindex');
    if (previous === '__missing__') node.removeAttribute('tabindex');
    else node.setAttribute('tabindex', previous);
  }

  function applyHiddenState(host, hidden) {
    if (!host) return;
    if (hidden) {
      if (!host.hasAttribute('inert')) host.setAttribute('inert', '');
      host.querySelectorAll(FOCUSABLE).forEach(saveAndDisable);
    } else {
      if (host.hasAttribute('inert')) host.removeAttribute('inert');
      host.querySelectorAll('[data-cnc-a11y-tabindex]').forEach(restore);
    }
  }

  function syncHiddenRegions() {
    document.querySelectorAll('[aria-hidden]').forEach(function (host) {
      applyHiddenState(host, host.getAttribute('aria-hidden') === 'true');
    });
  }

  function setAttr(node, name, value) {
    if (node && node.getAttribute(name) !== value) node.setAttribute(name, value);
  }

  function ensureStatusSemantics() {
    var accessMessage = document.getElementById('access-message');
    if (accessMessage) {
      setAttr(accessMessage, 'role', 'status');
      setAttr(accessMessage, 'aria-live', 'polite');
      setAttr(accessMessage, 'aria-atomic', 'true');
    }
    var loading = document.getElementById('loading-screen');
    setAttr(loading, 'aria-hidden', 'true');
  }

  function syncAccessibilityState() {
    ensureMainAndSkipLink();
    ensureStatusSemantics();
    syncHiddenRegions();
  }

  function scheduleAccessibilitySync() {
    syncTimers.forEach(function (timer) { window.clearTimeout(timer); });
    syncTimers = SYNC_DELAYS.map(function (delay) {
      return window.setTimeout(syncAccessibilityState, delay);
    });
  }

  function setSidebarState(open, returnFocus) {
    var sidebar = document.getElementById('sidebar');
    var trigger = document.getElementById('sidebar-open');
    var mask = document.getElementById('sidebar-mask');
    var close = document.getElementById('sidebar-close');
    if (!sidebar || !trigger) return false;

    trigger.setAttribute('aria-controls', 'sidebar');
    trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (sidebar.getAttribute('aria-hidden') !== (open ? 'false' : 'true')) {
      sidebar.setAttribute('aria-hidden', open ? 'false' : 'true');
    }

    if (open) {
      sidebar.hidden = false;
      applyHiddenState(sidebar, false);
      sidebar.classList.add('open');
      if (mask) mask.hidden = window.innerWidth > 760;
      window.setTimeout(function () {
        if (window.innerWidth <= 760 && close && sidebar.classList.contains('open')) close.focus();
      }, 0);
    } else {
      sidebar.classList.remove('open');
      applyHiddenState(sidebar, true);
      sidebar.hidden = window.innerWidth <= 760;
      if (mask) mask.hidden = true;
      if (returnFocus) window.setTimeout(function () { trigger.focus(); }, 0);
    }
    return true;
  }

  function initialSidebarState() {
    var sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    var open = window.innerWidth > 760 || sidebar.classList.contains('open');
    setSidebarState(open, false);
  }

  function handleSidebarKeydown(event) {
    var sidebar = document.getElementById('sidebar');
    if (window.innerWidth > 760 || !sidebar || !sidebar.classList.contains('open')) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      setSidebarState(false, true);
      scheduleAccessibilitySync();
      return;
    }

    if (event.key !== 'Tab') return;
    var focusable = Array.from(sidebar.querySelectorAll(FOCUSABLE)).filter(function (node) {
      return !node.disabled && node.getAttribute('tabindex') !== '-1' && node.getClientRects().length > 0;
    });
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function bindSidebarKeyboard() {
    if (document.documentElement.dataset.cncA11ySidebarBound === 'true') return;
    document.documentElement.dataset.cncA11ySidebarBound = 'true';

    document.addEventListener('click', function (event) {
      if (!event.target || !event.target.closest) return;
      if (event.target.closest('#sidebar-open')) setSidebarState(true, false);
      if (event.target.closest('#sidebar-close,#sidebar-mask')) setSidebarState(false, true);
      scheduleAccessibilitySync();
    }, true);

    window.addEventListener('keydown', handleSidebarKeydown, true);
  }

  function bindBoundedSyncEvents() {
    if (document.documentElement.dataset.cncA11ySyncBound === 'true') return;
    document.documentElement.dataset.cncA11ySyncBound = 'true';

    document.addEventListener('click', function (event) {
      if (!event.target || !event.target.closest) return;
      if (event.target.closest(
        '[data-route],[data-filter],[data-entry-id],[data-open-entry],[data-close],button,a[href],input,select,textarea'
      )) scheduleAccessibilitySync();
    }, true);
    document.addEventListener('submit', scheduleAccessibilitySync, true);
    window.addEventListener('hashchange', scheduleAccessibilitySync);
    window.addEventListener('pageshow', scheduleAccessibilitySync);
    window.addEventListener('resize', function () {
      initialSidebarState();
      scheduleAccessibilitySync();
    }, { passive: true });
  }

  function boot() {
    installStyles();
    ensureMainAndSkipLink();
    ensureStatusSemantics();
    bindSidebarKeyboard();
    bindBoundedSyncEvents();
    initialSidebarState();
    syncHiddenRegions();
    scheduleAccessibilitySync();
    window.CNC_ACCESSIBILITY_FOUNDATION = {
      build: BUILD,
      polling: false,
      observer: false,
      sync: function () {
        ensureMainAndSkipLink();
        ensureStatusSemantics();
        initialSidebarState();
        syncHiddenRegions();
        return true;
      }
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
