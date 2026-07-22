(function () {
  'use strict';

  var BUILD = '20260721s';
  var GALLERY_BUILD = '20260722x';
  var refreshTimer = 0;
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

    var code = (document.querySelector('#detail-code') || {}).textContent || '';
    var title = (document.querySelector('#detail-title') || {}).textContent || '';
    code = code.trim();
    title = title.trim();
    return list.find(function (item) {
      if (!item) return false;
      return (code && String(item.code || '').trim() === code) || (title && String(item.title || '').trim() === title);
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
    box.innerHTML = '<div class="xp-trust-title"><span>🛡 技术资料核验卡</span><small>不能替代机床原厂手册</small></div>' +
      '<div class="xp-trust-grid">' +
      '<div class="xp-trust-item"><span>适用系统</span><strong>' + esc(system) + '</strong></div>' +
      '<div class="xp-trust-item"><span>适用机型</span><strong>' + esc(machine) + '</strong></div>' +
      '<div class="xp-trust-item"><span>资料状态</span><strong>' + esc(status) + '</strong></div>' +
      '<div class="xp-trust-item xp-risk-' + rating[1] + '"><span>风险等级</span><strong>' + rating[0] + '</strong></div>' +
      '<div class="xp-trust-item"><span>核验日期</span><strong>2026-07-21</strong></div>' +
      '<div class="xp-trust-item"><span>资料来源</span><strong>' + esc(source) + '</strong></div>' +
      '</div>';
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

  function nav() {
    if (document.querySelector('.xp-bottom-nav')) return;
    var node = document.createElement('nav');
    node.className = 'xp-bottom-nav';
    node.setAttribute('aria-label', '手机底部导航');
    node.innerHTML = '<button type="button" data-xp-route="dashboard" aria-label="首页"><b aria-hidden="true">⌂</b><span>首页</span></button>' +
      '<button type="button" data-xp-filter="gcode" aria-label="G/M代码"><b aria-hidden="true">G</b><span>代码</span></button>' +
      '<button type="button" data-xp-filter="alarm" aria-label="报警排查"><b aria-hidden="true">!</b><span>报警</span></button>' +
      '<button type="button" data-xp-filter="parameter" aria-label="参数速查"><b aria-hidden="true">#</b><span>参数</span></button>' +
      '<button type="button" data-xp-route="favorites" aria-label="收藏与记录"><b aria-hidden="true">★</b><span>收藏</span></button>';
    document.body.appendChild(node);
    node.addEventListener('click', function (event) {
      var button = event.target.closest('button');
      if (!button) return;
      var target;
      if (button.dataset.xpRoute) target = document.querySelector('[data-route="' + button.dataset.xpRoute + '"]');
      else target = document.querySelector('[data-route="workspace"][data-filter="' + button.dataset.xpFilter + '"],[data-filter="' + button.dataset.xpFilter + '"]');
      if (target) target.click();
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
        window.setTimeout(function () { if (lastGalleryTrigger && document.contains(lastGalleryTrigger)) lastGalleryTrigger.focus(); }, 40);
      }
    }, true);
    document.addEventListener('keydown', function (event) {
      if (!modal.classList.contains('is-open') || event.key !== 'Tab') return;
      var focusable = Array.from(modal.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')).filter(function (node) { return !node.disabled && node.offsetParent !== null; });
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
  }

  function bindPageEvents() {
    document.addEventListener('click', function (event) {
      if (!event.target || !event.target.closest) return;
      if (event.target.closest('.result-card,.knowledge-card,[data-entry-id],[data-route],[data-filter]')) {
        scheduleTrust();
        window.setTimeout(syncNavState, 120);
      }
      if (event.target.closest('[data-route="gallery"]')) window.setTimeout(ensureGalleryLayer, 80);
    }, true);
    window.addEventListener('hashchange', function () {
      window.setTimeout(syncNavState, 60);
      scheduleTrust(120);
      window.setTimeout(ensureGalleryLayer, 80);
    });
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
    bindPageEvents();
    window.setTimeout(function () {
      trust();
      syncNavState();
      ensureGalleryLayer();
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
    ensureGalleryLayer: ensureGalleryLayer
  };
})();
