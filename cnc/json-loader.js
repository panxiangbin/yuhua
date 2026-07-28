/**
 * JSON加载器 - 处理带BOM的JSON文件
 * 解决3号生成的JSON文件UTF-8 BOM兼容性问题
 * 创建日期：2026-07-06
 */

window.JSONLoader = {
  /**
   * 加载JSON文件（自动处理BOM）
   * @param {string} url - JSON文件路径
   * @returns {Promise<Object>} 解析后的JSON对象
   */
  async loadJSON(url) {
    try {
      const response = await fetch(url);
      const text = await response.text();

      // 移除UTF-8 BOM（如果存在）
      const cleanText = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;

      return JSON.parse(cleanText);
    } catch (error) {
      console.error(`[JSONLoader] 加载失败: ${url}`, error);
      throw error;
    }
  },

  /**
   * 批量加载多个JSON文件
   * @param {Array<string>} urls - JSON文件路径数组
   * @returns {Promise<Array<Object>>} 解析后的JSON对象数组
   */
  async loadMultiple(urls) {
    return Promise.all(urls.map(url => this.loadJSON(url)));
  },

  /**
   * 加载图片批次文件
   * @param {Array<number>} batchNumbers - 批次编号数组 [1, 2, 3, 4, 5]
   * @returns {Promise<Object>} 合并后的图片数据
   */
  async loadImageBatches(batchNumbers = [1, 2, 3, 4]) {
    const batchMap = {
      1: { file: './image-batch-001-core-fixed.json', name: '核心概念' },
      2: { file: './image-batch-002-operation-fixed.json', name: '机床操作' },
      3: { file: './image-batch-003-prompts-fixed.json', name: '编程提示' },
      4: { file: './image-batch-004-milling-fixed.json', name: '铣削加工' },
      5: { file: './image-batch-005-alarm-fixed.json', name: '报警处理' }
    };

    const result = {
      batches: {},
      totalImages: 0,
      loadedAt: new Date().toISOString()
    };

    for (const num of batchNumbers) {
      const batch = batchMap[num];
      if (!batch) continue;

      try {
        const data = await this.loadJSON(batch.file);
        result.batches[num] = {
          name: batch.name,
          file: batch.file,
          images: data,
          count: data.length
        };
        result.totalImages += data.length;
        console.log(`[JSONLoader] 批次${num} 加载成功: ${data.length}张图片`);
      } catch (error) {
        console.warn(`[JSONLoader] 批次${num} 加载失败，跳过`, error);
        result.batches[num] = {
          name: batch.name,
          file: batch.file,
          error: error.message,
          count: 0
        };
      }
    }

    return result;
  }
};

console.log('[JSON加载器] 已就绪，支持BOM处理');

(function restoreNativePwaRegistration(){
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  let restoring = null;

  function ensureWorkerCaches(registration) {
    const worker = registration && (registration.active || registration.waiting || registration.installing);
    if (!worker) return Promise.resolve(false);
    return new Promise(resolve => {
      const channel = new MessageChannel();
      const timer = window.setTimeout(() => resolve(false), 5000);
      channel.port1.onmessage = event => {
        window.clearTimeout(timer);
        resolve(Boolean(event.data && event.data.type === 'CNC_CACHES_READY' && event.data.ready));
      };
      worker.postMessage({ type: 'ENSURE_CACHES' }, [channel.port2]);
    });
  }

  function restoreAndRegister() {
    if (restoring) return restoring;
    const container = navigator.serviceWorker;
    const prototype = Object.getPrototypeOf(container);
    const nativeRegister = prototype && prototype.register;
    if (typeof nativeRegister !== 'function') return Promise.resolve(false);

    try {
      if (Object.prototype.hasOwnProperty.call(container, 'register')) delete container.register;
    } catch (error) {}

    restoring = nativeRegister.call(container, './sw.js', {
      scope: './',
      updateViaCache: 'none'
    }).then(async registration => {
      window.__CNC_PWA_REGISTRATION__ = registration;
      await navigator.serviceWorker.ready.catch(() => registration);
      const cachesReady = await ensureWorkerCaches(registration);
      document.documentElement.dataset.cncPwaRegistration = cachesReady ? 'ready' : 'registered';
      return cachesReady;
    }).catch(error => {
      window.__CNC_PWA_REGISTRATION_ERROR__ = String(error && error.message ? error.message : error);
      document.documentElement.dataset.cncPwaRegistration = 'failed';
      return false;
    }).finally(() => {
      restoring = null;
    });
    return restoring;
  }

  function restoreAfterLateStartupLayers() {
    // import-test.js 在本脚本之后加载，并可能在 DOMContentLoaded 中覆盖注册API和清空缓存。
    // 把恢复动作排到同一事件循环末尾，确保所有启动层完成后再恢复原生注册与当前版本缓存。
    window.setTimeout(restoreAndRegister, 0);
    window.setTimeout(restoreAndRegister, 120);
    window.setTimeout(restoreAndRegister, 500);
    window.setTimeout(restoreAndRegister, 1200);
  }

  restoreAndRegister();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', restoreAfterLateStartupLayers, { once: true });
  } else {
    restoreAfterLateStartupLayers();
  }
  window.addEventListener('load', restoreAfterLateStartupLayers, { once: true });
  window.addEventListener('pageshow', event => {
    if (event.persisted) restoreAfterLateStartupLayers();
  });
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.setTimeout(restoreAndRegister, 0);
  });
  window.CNC_RESTORE_PWA_REGISTRATION = restoreAndRegister;
})();

(function loadTrainingPractice(){
  if (document.querySelector('script[data-cnc-training-practice-script]')) return;
  var script = document.createElement('script');
  script.src = './training-practice.js?v=20260723b';
  script.async = true;
  script.dataset.cncTrainingPracticeScript = '1';
  document.head.appendChild(script);
})();