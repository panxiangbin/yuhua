/* 工业卡片样板：把 G01 结果点击稳定同步到详情视觉状态。 */
(function () {
  'use strict';
  var BUILD = '20260721t';

  function isG01Entry(value) {
    return /gcode-g0?1/i.test(String(value || '')) || /(?:^|[-_])g0?1$/i.test(String(value || ''));
  }

  function applyG01Surface() {
    if (!document.body) return;
    document.body.classList.add('cnc-industrial-sample');
    document.body.setAttribute('data-cnc-industrial-surface', 'g01');
    if (window.CNC_INDUSTRIAL_SAMPLE && typeof window.CNC_INDUSTRIAL_SAMPLE.sync === 'function') {
      window.CNC_INDUSTRIAL_SAMPLE.sync();
      if (document.body.getAttribute('data-cnc-industrial-surface') !== 'g01') {
        document.body.setAttribute('data-cnc-industrial-surface', 'g01');
      }
    }
  }

  document.addEventListener('click', function (event) {
    if (!event.target || !event.target.closest) return;
    var button = event.target.closest('[data-open-entry]');
    if (!button || !isG01Entry(button.getAttribute('data-open-entry'))) return;
    applyG01Surface();
    [80, 220, 500, 900].forEach(function (delay) {
      window.setTimeout(applyG01Surface, delay);
    });
  }, true);

  document.addEventListener('click', function (event) {
    if (!event.target || !event.target.closest) return;
    if (event.target.closest('#detail-back-btn,[data-cnc-bottom="back"]')) {
      window.setTimeout(function () {
        if (document.body && document.body.getAttribute('data-cnc-detail-open') !== 'true') {
          document.body.removeAttribute('data-cnc-industrial-surface');
        }
      }, 100);
    }
  }, true);

  window.CNC_INDUSTRIAL_CLICK = { build: BUILD, polling: false, observer: false };
})();
