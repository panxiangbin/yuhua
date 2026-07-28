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

  function restoreAndRegister() {
    const container = navigator.serviceWorker;
    const prototype = Object.getPrototypeOf(container);
    const nativeRegister = prototype && prototype.register;
    if (typeof nativeRegister !== 'function') return Promise.resolve(false);

    try {
      if (Object.prototype.hasOwnProperty.call(container, 'register')) delete container.register;
    } catch (error) {}

    return nativeRegister.call(container, './sw.js', {
      scope: './',
      updateViaCache: 'none'
    }).then(registration => {
      window.__CNC_PWA_REGISTRATION__ = registration;
      document.documentElement.dataset.cncPwaRegistration = 'ready';
      return true;
    }).catch(error => {
      window.__CNC_PWA_REGISTRATION_ERROR__ = String(error && error.message ? error.message : error);
      document.documentElement.dataset.cncPwaRegistration = 'failed';
      return false;
    });
  }

  restoreAndRegister();
  [0, 50, 250, 1000, 2500, 5000, 9000].forEach(delay => {
    window.setTimeout(restoreAndRegister, delay);
  });
  window.addEventListener('pageshow', restoreAndRegister);
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
