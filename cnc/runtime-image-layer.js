(function () {
  'use strict';

  var CNC_RUNTIME = window.CNC_RUNTIME || {};
  if (CNC_RUNTIME.ImageLayer) return;

  function normalizeImage(raw, source) {
    return {
      id: raw.id || raw.src || 'img-' + Math.random().toString(36).slice(2, 8),
      src: raw.src || '',
      title: raw.title || raw.name || '',
      caption: raw.caption || raw.desc || raw.description || '',
      alt: raw.alt || raw.title || raw.name || '',
      batch: raw.batch || '',
      category: raw.category || '',
      tags: raw.tags || raw.keywords || [],
      entryIds: raw.mappedEntries || raw.entryIds || [],
      source: source || 'unknown',
      priority: raw.priority || 2,
      width: raw.width || 0,
      height: raw.height || 0
    };
  }

  var imagePool = [];
  var imageByEntry = {};
  var imageByCategory = {};
  var imageBySource = {};
  var status = {
    initialized: false,
    totalImages: 0,
    sourceCount: 0,
    entryCoverage: 0,
    categoryCoverage: 0,
    errors: []
  };

  function Layer(config) {
    config = config || {};
    this.config = config;
    this.reset();
    this.initialize(config);
  }

  Layer.prototype.reset = function () {
    imagePool = [];
    imageByEntry = {};
    imageByCategory = {};
    imageBySource = {};
    status = { initialized: false, totalImages: 0, sourceCount: 0, entryCoverage: 0, categoryCoverage: 0, errors: [] };
    return this;
  };

  Layer.prototype.initialize = function (config) {
    config = config || this.config || {};
    var sourceMap = {
      'featured': config.featuredImages || window.CNC_FEATURED_IMAGES || {},
      'extended': config.featuredImagesExtended || window.CNC_FEATURED_IMAGES_EXTENDED || {},
      'supplement': config.featuredImagesSupplement || window.CNC_FEATURED_IMAGES_SUPPLEMENT || {},
      'gallery': config.galleryLibrary || window.CNC_GALLERY_LIBRARY || [],
      'galleryEnhanced': config.galleryLibraryEnhanced || window.CNC_GALLERY_LIBRARY_ENHANCED || [],
      'entryToImages': config.entryToImagesMap || window.ENTRY_TO_IMAGES_MAP || {}
    };

    this._ingestFeatured(sourceMap.featured, 'featured');
    this._ingestFeatured(sourceMap.extended, 'extended');
    this._ingestFeatured(sourceMap.supplement, 'supplement');
    this._ingestGalleryArray(sourceMap.gallery, 'gallery');
    this._ingestGalleryArray(sourceMap.galleryEnhanced, 'gallery-enhanced');
    this._ingestEntryToImages(sourceMap.entryToImages, 'entry-to-images');

    this._buildIndex();
    status.initialized = true;
    return this;
  };

  Layer.prototype._ingestFeatured = function (source, sourceName) {
    if (!source || typeof source !== 'object') return;
    var count = 0;
    var self = this;
    Object.keys(source).forEach(function (entryId) {
      var images = source[entryId];
      if (!images) return;
      var imageArr = Array.isArray(images) ? images : (images.images || [images]);
      imageArr.forEach(function (img) {
        if (!img || !img.src) return;
        var normalized = normalizeImage(img, sourceName);
        imagePool.push(normalized);
        if (!imageByEntry[entryId]) imageByEntry[entryId] = [];
        imageByEntry[entryId].push(normalized);
        count++;
      });
    });
    imageBySource[sourceName] = count;
  };

  Layer.prototype._ingestGalleryArray = function (source, sourceName) {
    if (!source || !Array.isArray(source)) return;
    var count = 0;
    var self = this;
    source.forEach(function (img) {
      if (!img || !img.src) return;
      var normalized = normalizeImage(img, sourceName);
      imagePool.push(normalized);
      (img.mappedEntries || img.entryIds || []).forEach(function (eid) {
        if (!imageByEntry[eid]) imageByEntry[eid] = [];
        imageByEntry[eid].push(normalized);
      });
      if (img.category) {
        if (!imageByCategory[img.category]) imageByCategory[img.category] = [];
        imageByCategory[img.category].push(normalized);
      }
      count++;
    });
    imageBySource[sourceName] = count;
  };

  Layer.prototype._ingestEntryToImages = function (source, sourceName) {
    if (!source || typeof source !== 'object') return;
    var count = 0;
    var self = this;
    Object.keys(source).forEach(function (entryId) {
      var images = source[entryId];
      if (!images) return;
      var imageArr = Array.isArray(images) ? images : [images];
      imageArr.forEach(function (img) {
        if (!img || !img.src) return;
        var normalized = normalizeImage(img, sourceName);
        imagePool.push(normalized);
        if (!imageByEntry[entryId]) imageByEntry[entryId] = [];
        imageByEntry[entryId].push(normalized);
        count++;
      });
    });
    imageBySource[sourceName] = count;
  };

  Layer.prototype._buildIndex = function () {
    var self = this;

    imagePool.forEach(function (img) {
      if (img.category && !imageByCategory[img.category]) {
        imageByCategory[img.category] = [];
      }
      if (img.category) {
        var found = imageByCategory[img.category].some(function (existing) { return existing.id === img.id; });
        if (!found) imageByCategory[img.category].push(img);
      }
    });

    status.totalImages = imagePool.length;
    status.sourceCount = Object.keys(imageBySource).length;
    status.entryCoverage = Object.keys(imageByEntry).length;

    var categoryCount = 0;
    Object.keys(imageByCategory).forEach(function (cat) {
      categoryCount += imageByCategory[cat].length;
    });
    status.categoryCoverage = categoryCount;
  };

  Layer.prototype.getImagesForEntry = function (entryId) {
    if (!entryId) return [];
    var direct = imageByEntry[entryId] || [];
    var fuzzy = [];
    if (direct.length) return direct;

    var q = entryId.toLowerCase();
    var eids = Object.keys(imageByEntry);
    for (var i = 0; i < eids.length; i++) {
      if (eids[i].toLowerCase().indexOf(q) !== -1 || q.indexOf(eids[i].toLowerCase()) !== -1) {
        fuzzy = fuzzy.concat(imageByEntry[eids[i]]);
      }
    }
    return fuzzy.slice(0, 5);
  };

  Layer.prototype.getImagesForCategory = function (category) {
    if (!category) return [];
    var direct = imageByCategory[category] || [];
    var fuzzy = [];
    if (direct.length) return direct;

    var q = category.toLowerCase();
    var cats = Object.keys(imageByCategory);
    for (var i = 0; i < cats.length; i++) {
      if (cats[i].toLowerCase().indexOf(q) !== -1 || q.indexOf(cats[i].toLowerCase()) !== -1) {
        fuzzy = fuzzy.concat(imageByCategory[cats[i]]);
      }
    }
    return fuzzy.slice(0, 10);
  };

  Layer.prototype.getAll = function () {
    return imagePool;
  };

  Layer.prototype.getStatus = function () {
    return {
      initialized: status.initialized,
      totalImages: status.totalImages,
      sourceBreakdown: JSON.parse(JSON.stringify(imageBySource)),
      entriesWithImages: Object.keys(imageByEntry).length,
      categoriesWithImages: Object.keys(imageByCategory).length,
      errors: status.errors
    };
  };

  Layer.prototype.getEntryCoverage = function (entryIds) {
    if (!entryIds || !entryIds.length) return { total: 0, withImages: 0, withoutImages: 0, coverage: 0 };
    var withImages = 0;
    var without = 0;
    entryIds.forEach(function (eid) {
      var images = imageByEntry[eid] || [];
      if (images.length > 0) withImages++; else without++;
    });
    return {
      total: entryIds.length,
      withImages: withImages,
      withoutImages: without,
      coverage: entryIds.length ? (withImages / entryIds.length * 100).toFixed(1) + '%' : '0%'
    };
  };

  Layer.prototype.refresh = function (config) {
    return this.reset().initialize(config);
  };

  CNC_RUNTIME.ImageLayer = Layer;
  CNC_RUNTIME.ImageLayer.create = function (config) {
    return new Layer(config);
  };

  window.CNC_RUNTIME = CNC_RUNTIME;
})();
