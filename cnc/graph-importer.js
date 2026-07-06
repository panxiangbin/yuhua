/**
 * graph-importer.js
 * 知识图谱主导入器 — 文件扫描/解析/实体提取/关系构建/清洗/导入IndexedDB/进度/回滚
 * 依赖: CNC_IMPORT_CONFIG, CNC_ENTITY_EXTRACTOR, CNC_DATA_CLEANER, CNC_RELATIONSHIP_BUILDER
 * 全局对象: window.CNC_GRAPH_IMPORTER
 */
(function () {
  'use strict';

  if (window.CNC_GRAPH_IMPORTER) return;

  var _defaultOptions = {
    batchSize: 1000,
    filterLowQuality: true,
    mergeDuplicates: true,
    enableProgress: true,
    enableLogging: true,
    entityTypes: null,
    relationTypes: null,
    maxFileSize: 52428800,
    minContentLength: 100,
    examGrouping: true,
    deepFilePriority: true,
    logLevel: 1,
    progressInterval: 200
  };

  // ── 工具函数 ──
  function _now() { return Date.now(); }
  function _elapsed(start) { return Date.now() - start; }

  function _log(msg, level, opts) {
    if (!opts || !opts.enableLogging) return;
    if (level < (opts.logLevel || 1)) return;
    var prefix = '[CNC_IMPORTER]';
    if (level === 0) console.debug(prefix, msg);
    else if (level === 1) console.info(prefix, msg);
    else if (level === 2) console.warn(prefix, msg);
    else if (level === 3) console.error(prefix, msg);
  }

  function _progress(loaded, total, msg, callback) {
    if (typeof callback === 'function') {
      callback({ loaded: loaded, total: total, percent: total > 0 ? Math.round((loaded / total) * 10000) / 100 : 0, message: msg || '' });
    }
  }

  function _fileId(filePath) {
    var h = 0;
    var s = filePath || '';
    for (var i = 0; i < s.length; i++) {
      h = ((h << 5) - h) + s.charCodeAt(i);
      h = h & h;
    }
    return 'file_' + Math.abs(h).toString(36);
  }

  function _readFile(filePath) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', filePath, true);
      xhr.overrideMimeType('text/plain; charset=utf-8');
      xhr.onload = function () {
        if (xhr.status === 0 || xhr.status === 200) {
          resolve({ content: xhr.responseText, size: xhr.responseText.length });
        } else {
          reject(new Error('读取失败: ' + filePath + ' status: ' + xhr.status));
        }
      };
      xhr.onerror = function () {
        reject(new Error('网络错误: ' + filePath));
      };
      xhr.ontimeout = function () {
        reject(new Error('读取超时: ' + filePath));
      };
      xhr.timeout = 5000;
      xhr.send();
    });
  }

  // ── FileScanner ──
  function FileScanner() {}

  FileScanner.prototype.scanDirectory = function (path, options) {
    var self = this;
    return new Promise(function (resolve, reject) {
      _log('扫描目录: ' + path, 1, options);
      // file:// 协议无法递归扫描，返回空
      resolve([]);
    });
  };

  FileScanner.prototype.parseFile = function (filePath, options) {
    var self = this;
    return _readFile(filePath).then(function (result) {
      return self._parseContent(result.content, filePath, options);
    });
  };

  FileScanner.prototype._parseContent = function (content, filePath, options) {
    var metadata = {
      path: filePath,
      fileId: _fileId(filePath),
      size: content.length,
      contentHash: '',
      categories: [],
      prefix: 'unknown',
      type: 'knowledge'
    };

    var cleaner = window.CNC_DATA_CLEANER;
    if (cleaner) {
      metadata.contentHash = cleaner.computeContentHash(content);
      var prefixResult = cleaner.classifyFileByPrefix(filePath.split('/').pop() || filePath.split('\\').pop() || '');
      metadata.prefix = prefixResult.prefix;
      metadata.type = prefixResult.type;
      metadata.categories = cleaner.extractCategories(filePath);
    }

    // 从文件名提取信息
    var fileName = (filePath.split('/').pop() || filePath.split('\\').pop() || '').replace(/\.md$/i, '');
    metadata.fileName = fileName;

    // 提取frontmatter
    var frontmatter = {};
    var fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (fmMatch) {
      var fmLines = fmMatch[1].split('\n');
      for (var i = 0; i < fmLines.length; i++) {
        var line = fmLines[i];
        var sep = line.indexOf(':');
        if (sep > 0) {
          frontmatter[line.substring(0, sep).trim()] = line.substring(sep + 1).trim();
        }
      }
    }
    metadata.frontmatter = frontmatter;

    // 提取标题
    var titleMatch = content.match(/^#\s+(.+)/m);
    metadata.title = titleMatch ? titleMatch[1].trim() : fileName;

    // 提取标签行
    var tagMatch = content.match(/(?:标签|tags|keywords)[：:]\s*(.+)/i);
    metadata.tags = tagMatch ? tagMatch[1].split(/[,，、\s]+/).filter(function (t) { return t.trim(); }) : [];

    // 质量分级
    if (cleaner) {
      metadata.quality = cleaner.classifyFileQuality(content.length, content);
    }

    // 提取目录结构作为分类
    var catParts = filePath.replace(/\\/g, '/').split('/');
    metadata.topCategory = '';
    metadata.subCategory = '';
    for (var j = 0; j < catParts.length; j++) {
      var p = catParts[j];
      if (p.match(/^\d+_/)) {
        var name = p.replace(/^\d+_/, '');
        if (!metadata.topCategory) metadata.topCategory = name;
        else metadata.subCategory = name;
      }
    }

    return metadata;
  };

  FileScanner.prototype.batchParse = function (filePaths, options) {
    var self = this;
    var batchSize = (options && options.batchSize) || 100;
    var results = [];
    var errors = [];

    function processBatch(start) {
      if (start >= filePaths.length) {
        return Promise.resolve({ files: results, errors: errors });
      }
      var end = Math.min(start + batchSize, filePaths.length);
      var batch = filePaths.slice(start, end);
      var promises = batch.map(function (fp) {
        return self.parseFile(fp, options).then(function (meta) {
          results.push(meta);
          return meta;
        }).catch(function (err) {
          errors.push({ file: fp, error: err.message });
          return null;
        });
      });
      return Promise.all(promises).then(function () {
        return processBatch(end);
      });
    }

    return processBatch(0);
  };

  // ── GraphImporter ──
  function GraphImporter(knowledgeGraph) {
    this.graph = knowledgeGraph || null;
    this.scanner = new FileScanner();
    this.stats = {
      totalFiles: 0,
      scannedFiles: 0,
      parsedFiles: 0,
      extractedEntities: 0,
      builtRelations: 0,
      importedNodes: 0,
      importedEdges: 0,
      errors: 0,
      duplicates: 0,
      filteredLow: 0,
      startTime: 0,
      endTime: 0,
      phases: {}
    };
    this._aborted = false;
    this._phaseLog = [];
  }

  GraphImporter.prototype._beginPhase = function (name) {
    this._phaseLog.push({ phase: name, start: _now() });
  };

  GraphImporter.prototype._endPhase = function (name) {
    for (var i = this._phaseLog.length - 1; i >= 0; i--) {
      if (this._phaseLog[i].phase === name) {
        this._phaseLog[i].end = _now();
        this._phaseLog[i].elapsed = _elapsed(this._phaseLog[i].start);
        this.stats.phases[name] = this._phaseLog[i];
        break;
      }
    }
  };

  GraphImporter.prototype.abort = function () {
    this._aborted = true;
    _log('导入已中止', 2, _defaultOptions);
  };

  GraphImporter.prototype.isAborted = function () {
    return this._aborted;
  };

  GraphImporter.prototype._readFileViaAPI = function (fileEntry) {
    var self = this;
    return new Promise(function (resolve, reject) {
      if (fileEntry.content) {
        var metadata = {
          path: fileEntry.path || fileEntry.name || '',
          fileId: _fileId(fileEntry.path || ''),
          content: fileEntry.content,
          size: fileEntry.content.length,
          contentHash: '',
          categories: [],
          prefix: 'unknown',
          type: 'knowledge',
          fileName: '',
          title: '',
          tags: [],
          quality: { level: 'basic', score: 1, label: '基础文件', priority: 3 },
          topCategory: '',
          subCategory: ''
        };
        var cleaner = window.CNC_DATA_CLEANER;
        if (cleaner) {
          metadata.contentHash = cleaner.computeContentHash(fileEntry.content);
          var prefixResult = cleaner.classifyFileByPrefix(metadata.path.split('/').pop() || metadata.path.split('\\').pop() || '');
          metadata.prefix = prefixResult.prefix;
          metadata.type = prefixResult.type;
          metadata.categories = cleaner.extractCategories(metadata.path);
          metadata.quality = cleaner.classifyFileQuality(fileEntry.content.length, fileEntry.content);
        }
        var fileName = (metadata.path.split('/').pop() || metadata.path.split('\\').pop() || '').replace(/\.md$/i, '');
        metadata.fileName = fileName;
        var titleMatch = fileEntry.content.match(/^#\s+(.+)/m);
        metadata.title = titleMatch ? titleMatch[1].trim() : fileName;
        var tagMatch = fileEntry.content.match(/(?:标签|tags|keywords)[：:]\s*(.+)/i);
        metadata.tags = tagMatch ? tagMatch[1].split(/[,，、\s]+/).filter(function (t) { return t.trim(); }) : [];
        var catParts = metadata.path.replace(/\\/g, '/').split('/');
        for (var i = 0; i < catParts.length; i++) {
          var p = catParts[i];
          if (p.match(/^\d+_/)) {
            var name = p.replace(/^\d+_/, '');
            if (!metadata.topCategory) metadata.topCategory = name;
            else metadata.subCategory = name;
          }
        }
        resolve(metadata);
      } else {
        reject(new Error('文件条目没有内容'));
      }
    });
  };

  GraphImporter.prototype.importNodes = function (nodes, options) {
    var self = this;
    options = options || _defaultOptions;
    if (!this.graph) return Promise.reject(new Error('知识图谱引擎未初始化'));
    var batchSize = options.batchSize || 1000;
    var imported = 0;
    var errors = [];

    function processBatch(start) {
      if (self._aborted) return Promise.resolve({ imported: imported, errors: errors });
      if (start >= nodes.length) return Promise.resolve({ imported: imported, errors: errors });
      var end = Math.min(start + batchSize, nodes.length);
      for (var i = start; i < end; i++) {
        try {
          var node = nodes[i];
          if (!node || !node.type || !node.label) {
            errors.push({ index: i, reason: '节点缺少必要字段' });
            continue;
          }
          self.graph.addNode(node);
          imported++;
        } catch (e) {
          errors.push({ index: i, reason: e.message });
        }
      }
      return processBatch(end);
    }

    return processBatch(0);
  };

  GraphImporter.prototype.importEdges = function (edges, options) {
    var self = this;
    options = options || _defaultOptions;
    if (!this.graph) return Promise.reject(new Error('知识图谱引擎未初始化'));
    var batchSize = options.batchSize || 1000;
    var imported = 0;
    var errors = [];

    function processBatch(start) {
      if (self._aborted) return Promise.resolve({ imported: imported, errors: errors });
      if (start >= edges.length) return Promise.resolve({ imported: imported, errors: errors });
      var end = Math.min(start + batchSize, edges.length);
      for (var i = start; i < end; i++) {
        try {
          var edge = edges[i];
          if (!edge || !edge.source || !edge.target || !edge.relationType) {
            errors.push({ index: i, reason: '关系缺少必要字段' });
            continue;
          }
          self.graph.addEdge(edge);
          imported++;
        } catch (e) {
          errors.push({ index: i, reason: e.message });
        }
      }
      return processBatch(end);
    }

    return processBatch(0);
  };

  GraphImporter.prototype.importFromFileEntries = function (fileEntries, options) {
    var self = this;
    options = self._mergeOptions(options);
    self.stats.startTime = _now();
    self.stats.totalFiles = fileEntries.length;
    self._aborted = false;

    _log('开始导入: ' + fileEntries.length + ' 个文件条目', 1, options);

    return new Promise(function (resolve, reject) {
      self._beginPhase('parse');
      var parsedFiles = [];
      var parseErrors = [];

      function parseNext(idx) {
        if (self._aborted) {
          self.stats.endTime = _now();
          reject(new Error('导入已中止'));
          return;
        }
        if (idx >= fileEntries.length) {
          self._endPhase('parse');
          self.stats.parsedFiles = parsedFiles.length;
          _log('解析完成: ' + parsedFiles.length + ' 个文件, ' + parseErrors.length + ' 个错误', 1, options);
          processEntities(parsedFiles);
          return;
        }

        var entry = fileEntries[idx];
        self._readFileViaAPI(entry).then(function (metadata) {
          parsedFiles.push(metadata);
          if (options.enableProgress && idx % (options.batchSize || 100) === 0) {
            _progress(idx + 1, fileEntries.length, '解析文件...', options.onProgress);
          }
          parseNext(idx + 1);
        }).catch(function (err) {
          parseErrors.push({ file: entry.path || entry.name, error: err.message });
          parseNext(idx + 1);
        });
      }

      function processEntities(files) {
        self._beginPhase('extract');
        var allEntities = [];
        var fileEntityMap = [];
        var totalExtracted = 0;

        for (var i = 0; i < files.length; i++) {
          var file = files[i];
          var extractor = window.CNC_ENTITY_EXTRACTOR;
          var result;
          if (file.type === 'exam' && options.examGrouping) {
            result = extractor ? extractor.extractFromExamContent(file.content || '', file) : { entities: [], tags: [] };
          } else {
            result = extractor ? extractor.extractAll(file.content || '', file) : { entities: [], tags: [] };
          }
          fileEntityMap.push({ file: file, entities: result.entities });
          allEntities = allEntities.concat(result.entities);
          totalExtracted += result.entities.length;
        }

        self._endPhase('extract');
        self.stats.extractedEntities = totalExtracted;
        _log('实体提取完成: ' + totalExtracted + ' 个实体', 1, options);
        cleanEntities(allEntities, fileEntityMap);
      }

      function cleanEntities(entities, fileEntityMap) {
        self._beginPhase('clean');
        var cleaner = window.CNC_DATA_CLEANER;
        var cleaned;
        if (cleaner && options.mergeDuplicates) {
          var stdEntities = cleaner.standardizeEntities(entities);
          var dedupResult = cleaner.deduplicateEntities(stdEntities);
          cleaned = dedupResult.entities;
          self.stats.duplicates = dedupResult.duplicates;
          _log('去重: 移除 ' + dedupResult.duplicates + ' 个重复实体, 保留 ' + dedupResult.entities.length + ' 个', 1, options);
        } else {
          cleaned = entities;
        }

        if (options.filterLowQuality && cleaner) {
          // 过滤低置信度实体
          var filtered = [];
          var filterCount = 0;
          for (var i = 0; i < cleaned.length; i++) {
            if ((cleaned[i].confidence || 0.5) >= 0.3) filtered.push(cleaned[i]);
            else filterCount++;
          }
          _log('低质量过滤: 移除 ' + filterCount + ' 个低置信度实体', 1, options);
          cleaned = filtered;
        }

        self._endPhase('clean');
        buildRelations(cleaned, fileEntityMap);
      }

      function buildRelations(entities, fileEntityMap) {
        self._beginPhase('relate');
        var builder = window.CNC_RELATIONSHIP_BUILDER;
        var allEdges = [];
        var totalEdgeStats = {};

        if (builder) {
          // 按文件构建关系 (共现)
          for (var i = 0; i < fileEntityMap.length; i++) {
            var item = fileEntityMap[i];
            if (!item.entities || !item.entities.length) continue;
            var fileNodeId = item.file ? _fileId(item.file.path) : '';
            var result = builder.buildAllRelations(item.entities, {
              filePath: item.file ? item.file.path : '',
              fileNodeId: fileNodeId
            });
            allEdges = allEdges.concat(result.edges);
          }

          // 全局关系 (跨文件)
          var globalResult = builder.buildBatchRelations(fileEntityMap);
          allEdges = allEdges.concat(globalResult.edges);
        }

        self._endPhase('relate');
        self.stats.builtRelations = allEdges.length;
        _log('关系构建完成: ' + allEdges.length + ' 条关系', 1, options);
        importToGraph(entities, allEdges);
      }

      function importToGraph(entities, edges) {
        self._beginPhase('import');
        _log('开始导入图数据库: ' + entities.length + ' 节点, ' + edges.length + ' 关系', 1, options);

        self.importNodes(entities, options).then(function (nodeResult) {
          self.stats.importedNodes = nodeResult.imported;
          return self.importEdges(edges, options);
        }).then(function (edgeResult) {
          self.stats.importedEdges = edgeResult.imported;
          self._endPhase('import');

          // 保存到 IndexedDB
          self._beginPhase('persist');
          if (self.graph && typeof self.graph.saveToIndexedDB === 'function') {
            return self.graph.saveToIndexedDB().then(function () {
              self._endPhase('persist');
              self.stats.endTime = _now();
              var report = self.generateReport();
              _log('导入完成! ' + report.summary, 1, options);
              if (options.onComplete) options.onComplete(report);
              resolve(report);
            }).catch(function (err) {
              self._endPhase('persist');
              _log('IndexedDB 持久化失败: ' + err.message, 3, options);
              self.stats.endTime = _now();
              var report = self.generateReport();
              resolve(report);
            });
          } else {
            self._endPhase('persist');
            self.stats.endTime = _now();
            var report = self.generateReport();
            _log('导入完成! ' + report.summary, 1, options);
            if (options.onComplete) options.onComplete(report);
            resolve(report);
          }
        }).catch(function (err) {
          _log('导入错误: ' + err.message, 3, options);
          self.stats.errors++;
          self.stats.endTime = _now();
          reject(err);
        });
      }

      parseNext(0);
    });
  };

  GraphImporter.prototype.importFromContent = function (contentItems, options) {
    var self = this;
    var entries = [];
    for (var i = 0; i < contentItems.length; i++) {
      var item = contentItems[i];
      entries.push({
        path: item.path || item.name || ('file_' + i + '.md'),
        content: item.content || '',
        name: item.name || ('file_' + i + '.md')
      });
    }
    return self.importFromFileEntries(entries, options);
  };

  GraphImporter.prototype.importFromDirectory = function (dirPath, options) {
    var self = this;
    _log('importFromDirectory 在 file:// 协议下需要外部提供文件列表', 2, options);
    return Promise.reject(new Error('file:// 协议无法递归扫描目录。请使用 importFromContent 或 importFromFileEntries 传入文件列表'));
  };

  GraphImporter.prototype.generateReport = function () {
    var elapsed = this.stats.endTime - this.stats.startTime;
    var elapsedStr = elapsed < 1000 ? elapsed + 'ms' : (elapsed / 1000).toFixed(1) + 's';
    var phaseDetails = {};
    for (var key in this.stats.phases) {
      if (this.stats.phases.hasOwnProperty(key)) {
        var p = this.stats.phases[key];
        phaseDetails[key] = { elapsed: p.elapsed || 0, elapsedStr: (p.elapsed || 0) < 1000 ? (p.elapsed || 0) + 'ms' : ((p.elapsed || 0) / 1000).toFixed(1) + 's' };
      }
    }

    return {
      timestamp: new Date().toISOString(),
      totalFiles: this.stats.totalFiles,
      parsedFiles: this.stats.parsedFiles,
      extractedEntities: this.stats.extractedEntities,
      builtRelations: this.stats.builtRelations,
      importedNodes: this.stats.importedNodes,
      importedEdges: this.stats.importedEdges,
      duplicatesRemoved: this.stats.duplicates,
      errors: this.stats.errors,
      filteredLow: this.stats.filteredLow,
      elapsed: elapsed,
      elapsedStr: elapsedStr,
      summary: this.stats.importedNodes + ' 节点, ' + this.stats.importedEdges + ' 关系, ' + this.stats.parsedFiles + ' 文件, 耗时 ' + elapsedStr + ', 错误 ' + this.stats.errors,
      phaseDetails: phaseDetails,
      stats: this.stats
    };
  };

  GraphImporter.prototype.getStats = function () {
    return this.stats;
  };

  GraphImporter.prototype.resetStats = function () {
    this.stats = {
      totalFiles: 0, scannedFiles: 0, parsedFiles: 0,
      extractedEntities: 0, builtRelations: 0,
      importedNodes: 0, importedEdges: 0,
      errors: 0, duplicates: 0, filteredLow: 0,
      startTime: 0, endTime: 0, phases: {}
    };
    this._phaseLog = [];
    this._aborted = false;
  };

  GraphImporter.prototype._mergeOptions = function (options) {
    var merged = {};
    for (var key in _defaultOptions) {
      if (_defaultOptions.hasOwnProperty(key)) merged[key] = _defaultOptions[key];
    }
    if (options) {
      for (var k in options) {
        if (options.hasOwnProperty(k)) merged[k] = options[k];
      }
    }
    return merged;
  };

  // ── 静态工厂 ──
  GraphImporter.createWithGraph = function () {
    var KG = window.CNC_KnowledgeGraph || window.KnowledgeGraph;
    if (KG) {
      var graph = new KG();
      return new GraphImporter(graph);
    }
    return new GraphImporter(null);
  };

  window.CNC_GRAPH_IMPORTER = {
    GraphImporter: GraphImporter,
    FileScanner: FileScanner,
    createWithGraph: GraphImporter.createWithGraph
  };

  console.log('[CNC_GRAPH_IMPORTER] 知识图谱主导入器已加载。');
})();
