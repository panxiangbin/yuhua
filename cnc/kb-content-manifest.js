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

  window.CNC_KB_CONTENT_MANIFEST = {
    build: '20260731b',
    enhancedImagesNormalized: Array.isArray(enhanced)
      ? enhanced.filter(function (image) { return image && image.path === image.src; }).length
      : 0
  };
})();
