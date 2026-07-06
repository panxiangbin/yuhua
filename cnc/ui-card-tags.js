/**
 * ui-card-tags.js
 * 卡片标签系统 — 标签渲染/筛选/标签云/权重计算
 * 全局对象: window.CNC_CARD_TAGS
 */
(function () {
  'use strict';

  if (window.CNC_CARD_TAGS) return;

  var _tagColors = {
    'G代码': '#cf6d36', 'M代码': '#2d6a9f', '参数': '#5d655f',
    '报警': '#c0392b', '故障': '#c0392b', '操作': '#2980b9',
    '刀具': '#8e44ad', '工艺': '#1a6b4f', '材料': '#d4a017',
    '图纸': '#16a085', '量具': '#7f8c8d', '案例': '#e67e22',
    '新手': '#27ae60', '进阶': '#2980b9', '高级': '#c0392b',
    '基础': '#27ae60', '安全': '#e74c3c', '警告': '#f39c12',
    '默认': '#95a5a6'
  };

  function renderTags(tags) {
    if (!tags || !tags.length) return '';
    var html = '<div class="card-tag-list">';
    for (var i = 0; i < tags.length; i++) {
      var tag = tags[i];
      var color = _tagColors[tag] || _tagColors['默认'];
      html += '<span class="card-tag" data-tag="' + _escape(tag) + '" style="--tag-color:' + color + '">' + _escape(tag) + '</span>';
    }
    html += '</div>';
    return html;
  }

  function filterByTag(tag) {
    var items = _getAllItems();
    if (!tag) return items;
    var tagLower = tag.toLowerCase();
    var results = [];
    for (var i = 0; i < items.length; i++) {
      var itemTags = items[i].tags || items[i].categories || [];
      for (var j = 0; j < itemTags.length; j++) {
        if (itemTags[j].toLowerCase() === tagLower) {
          results.push(items[i]);
          break;
        }
      }
    }
    return results;
  }

  function getTagCloud() {
    var items = _getAllItems();
    var tagCount = {};
    for (var i = 0; i < items.length; i++) {
      var tags = items[i].tags || items[i].categories || [];
      for (var j = 0; j < tags.length; j++) {
        var tag = tags[j];
        tagCount[tag] = (tagCount[tag] || 0) + 1;
      }
    }
    var cloud = [];
    for (var t in tagCount) {
      if (tagCount.hasOwnProperty(t)) {
        cloud.push({ tag: t, count: tagCount[t], weight: _calculateWeight(tagCount[t]) });
      }
    }
    cloud.sort(function (a, b) { return b.count - a.count; });
    return cloud;
  }

  function renderTagCloud() {
    var cloud = getTagCloud();
    if (!cloud.length) return '<p class="tag-cloud-empty">暂无标签数据</p>';
    var html = '<div class="tag-cloud">';
    for (var i = 0; i < cloud.length; i++) {
      var item = cloud[i];
      var color = _tagColors[item.tag] || _tagColors['默认'];
      var fontSize = 12 + item.weight * 8;
      html += '<span class="tag-cloud-item" data-tag="' + _escape(item.tag) + '" style="--tag-color:' + color + ';font-size:' + fontSize + 'px;opacity:' + (0.5 + item.weight * 0.5) + '">' + _escape(item.tag) + ' <small>(' + item.count + ')</small></span>';
    }
    html += '</div>';
    return html;
  }

  function addTagColor(tag, color) {
    _tagColors[tag] = color;
  }

  function getTagColor(tag) {
    return _tagColors[tag] || _tagColors['默认'];
  }

  function _calculateWeight(count) {
    var maxCount = 1;
    var cloud = getTagCloud();
    for (var i = 0; i < cloud.length; i++) {
      if (cloud[i].count > maxCount) maxCount = cloud[i].count;
    }
    return maxCount > 0 ? count / maxCount : 0;
  }

  function _getAllItems() {
    if (window.CNC_DATA && CNC_DATA.ENTRIES) return CNC_DATA.ENTRIES;
    if (window.CNC_RUNTIME && CNC_RUNTIME.DataLoader) return CNC_RUNTIME.DataLoader.ENTRIES || [];
    return [];
  }

  function _escape(text) {
    if (!text) return '';
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(text));
    return d.innerHTML;
  }

  window.CNC_CARD_TAGS = {
    renderTags: renderTags,
    filterByTag: filterByTag,
    getTagCloud: getTagCloud,
    renderTagCloud: renderTagCloud,
    addTagColor: addTagColor,
    getTagColor: getTagColor
  };

  console.log('[CNC_CARD_TAGS] 卡片标签系统已加载。');
})();
