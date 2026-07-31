(function () {
  'use strict';

  // 兼容旧版首页精选图渲染器：它读取 image.path，
  // 新图库数据统一使用 image.src。应用主脚本执行前补齐同源字段，
  // 避免首页把真实 WebP 路径误降级成不存在的同名 SVG。
  var enhanced = window.CNC_GALLERY_LIBRARY_ENHANCED;
  if (Array.isArray(enhanced)) {
    enhanced.forEach(function (image) {
      if (image && image.src && !image.path) image.path = image.src;
    });
  }

  // 最近查看卡片是 article + role=button。旧增强层虽然补了 tabindex，
  // 但 Enter 后只合成 click，启动导航层可能把工作区切换吞掉。
  // 在捕获阶段先把真实可信键盘事件交给启动首页守卫确认，再按条目 ID 导航；
  // Space 同样支持，并阻止页面滚动。
  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    var target = event.target;
    var card = target && target.closest
      ? target.closest('#dashboard-recent-list .recent-card[data-entry-id]')
      : null;
    if (!card) return;

    var startupGuard = window.CNC_STARTUP_HOME_GUARD;
    if (startupGuard && typeof startupGuard.acceptTrustedRouteEvent === 'function') {
      startupGuard.acceptTrustedRouteEvent(event);
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    var entryId = card.dataset.entryId;
    try {
      state.selectedId = entryId;
      if (typeof window.navigate === 'function') {
        window.navigate('workspace');
        return;
      }
    } catch (error) {}

    // 仅在应用全局导航尚未就绪时退回原生点击，不伪造完成状态。
    card.click();
  }, true);

  window.CNC_KB_CONTENT_MANIFEST = {
    build: '20260731d',
    enhancedImagesNormalized: Array.isArray(enhanced)
      ? enhanced.filter(function (image) { return image && image.path === image.src; }).length
      : 0,
    recentCardKeyboardNavigation: true,
    startupGuardBridge: true
  };
})();
