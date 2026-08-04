/**
 * ui-learning-detail.js
 * 学习关卡详情页渲染引擎
 * 全局对象: window.CNC_LEARNING_UI
 */
(function () {
  'use strict';

  if (window.CNC_LEARNING_UI) return;

  var _currentLevel = null;
  var _lessonCache = {};
  var _markdownCache = {};
  var _lessonMediaMap = {};
  var _quizSubmitBound = false;
  var _LEVELS = {
    1: { id: 1, title: '认识零件的身份证', stage: 1, time: '5分钟', objectives: ['理解图纸基本符号', '认识尺寸标注', '了解公差符号', '掌握表面粗糙度符号'], steps: ['打开图纸，找到标题栏', '识别图框中的零件名称和材料', '查看所有尺寸标注，区分线性/直径/半径', '识别公差符号和表面粗糙度标记', '核对所有技术要求'], errors: ['忽略标题栏信息：标题栏包含材料、比例、图号等关键信息', '混淆尺寸线：注意区分线性尺寸和直径尺寸的标注方式', '忽视基准符号：基准符号影响后续加工定位'], quizzes: [{ id: 'q1', type: 'multiple', question: '图纸中标注 Φ50H7 表示什么？', options: ['直径50mm，公差等级H7的孔', '半径50mm，公差等级H7的轴', '直径50mm，配合间隙H7', '螺纹M50，精度等级H7'], answer: 0, explanation: 'Φ表示直径，50是基本尺寸，H7是公差带代号（H表示孔的基本偏差，7表示IT7公差等级）' }, { id: 'q2', type: 'truefalse', question: '表面粗糙度值越小，表面越光滑。', options: ['正确', '错误'], answer: 0, explanation: '表面粗糙度值（Ra）越小，表示加工表面越光滑，但加工成本也相应提高。' }, { id: 'q3', type: 'multiple', question: 'C2 在图纸中表示什么？', options: ['倒角2mm', '倒角2×45°', '圆角R2', '锥度2:1'], answer: 1, explanation: 'C2表示45°倒角，倒角宽度为2mm。C是Chamfer（倒角）的缩写。'}], summary: '本章学习了图纸基本符号的识别方法，包括标题栏信息读取、尺寸标注分类、公差符号理解、表面粗糙度判定。掌握这些基础知识后，可以正确解读大多数机械图纸的基本信息。' },
    2: { id: 2, title: '机床的东南西北', stage: 1, time: '8分钟', objectives: ['理解机床坐标轴概念', '掌握X/Y/Z轴方向判断', '了解正负方向含义', '认识机床坐标系与工件坐标系的关系'], steps: ['站在操作位置面对机床', '右手直角坐标系：大拇指=X轴，食指=Y轴，中指=Z轴', 'Z轴为主轴方向，远离工件为正', 'X轴为水平方向，右方为正', 'Y轴根据右手定则确定'], errors: ['坐标系混淆：加工中心Z轴垂直于工作台，车床Z轴平行于主轴', '正负方向记反：远离工件为正，靠近工件为负的规则适用于大多数情况', '忽略机床类型：立式加工中心和卧式加工中心的坐标系方向不同'], quizzes: [{ id: 'q4', type: 'multiple', question: '在立式加工中心上，Z轴正方向指向哪里？', options: ['指向工作台', '指向主轴上方（远离工件）', '指向操作者', '指向右侧'], answer: 1, explanation: 'Z轴正方向为刀具远离工件的方向，在立式加工中心上即主轴向上方向。' }, { id: 'q5', type: 'truefalse', question: '数控机床的坐标轴方向在所有机床上都是一样的。', options: ['正确', '错误'], answer: 1, explanation: '不同机床类型（立式/卧式/车床）的坐标轴方向不同，需要根据具体机床类型确定。'}], summary: '本章学习了机床坐标系的建立方法，掌握了X、Y、Z三轴的方向判断规则，理解了正负方向与加工运动的关系。坐标系是数控编程的基础。' },
    3: { id: 3, title: '找机床的老家', stage: 1, time: '6分钟', objectives: ['理解回零(回参考点)的意义', '掌握回零操作方法', '了解参考点位置', '认识机床坐标系建立过程'], steps: ['确认机床处于手动模式', '按回零键（通常标记为HOME或REF）', '先回Z轴（避免干涉），再回X和Y', '观察坐标显示变为零或机床设定值', '确认回零指示灯亮起'], errors: ['不回零直接编程：机床断电后丢失坐标系，必须回零重新建立', '回零顺序错误：应先回Z轴避免碰撞', '回零过程中急停：可能导致参考点位置偏移'], quizzes: [{ id: 'q6', type: 'multiple', question: '机床回参考点的目的是什么？', options: ['让刀具回到换刀位置', '建立机床绝对坐标系', '清除加工程序', '检查主轴转速'], answer: 1, explanation: '回参考点是为了让机床建立绝对坐标系，使机床知道自己的准确位置。'}, { id: 'q7', type: 'multiple', question: '为什么应该先回Z轴？', options: ['Z轴运动最快', '避免刀具与工件或夹具碰撞', '先回Z轴可以节省时间', '机床控制系统有要求'], answer: 1, explanation: '先回Z轴可以将刀具抬高到安全位置，避免在回其他轴时发生碰撞。'}], summary: '本章学习了机床回参考点的方法和意义。回零是开机后的第一步操作，用于建立机床坐标系，确保位置精度。' },
    4: { id: 4, title: '告诉机床活儿在哪', stage: 1, time: '10分钟', objectives: ['理解工件坐标系G54-G59', '掌握对刀操作方法', '了解工件零点设置', '掌握坐标系偏移概念'], steps: ['装夹工件并找正', '选择对刀方式（试切法/对刀仪）', '分别对X、Y、Z轴确定工件零点', '将零点数值输入对应的G54-G59寄存器', '验证对刀结果'], errors: ['对刀方向错误：正负方向搞反会导致加工位置偏移', '忘记切换坐标系：在G54中对刀却在G55中运行程序', '忽略刀长补偿：Z轴对刀必须考虑刀具长度'], quizzes: [{ id: 'q8', type: 'multiple', question: 'G54-G59用于什么？', options: ['主轴转速设置', '工件坐标系选择', '进给速度设置', '刀具补偿选择'], answer: 1, explanation: 'G54到G59用于选择工件坐标系，每个编号对应一组可设定的零点偏移值。'}, { id: 'q9', type: 'truefalse', question: '对刀完成后可以不验证直接开始加工。', options: ['正确', '错误'], answer: 1, explanation: '对刀完成后必须验证，通常通过手动移动到已知位置或使用对刀仪检查，确认坐标值正确。'}], summary: '本章学习了对刀和工件坐标系的设置方法。掌握G54-G59的使用是数控加工中的核心技能，直接影响加工精度。' }
  };

  function getExternalLessons() {
    if (!window.CNC_LEARNING_CONTENT) return null;
    if (!window.CNC_LEARNING_CONTENT.lessons) return null;
    return window.CNC_LEARNING_CONTENT.lessons;
  }

  function getAllLevelNumbers() {
    var levelsMap = {};
    Object.keys(_LEVELS).forEach(function (key) {
      var n = parseInt(key, 10);
      if (!Number.isNaN(n)) levelsMap[n] = true;
    });

    var externalLessons = getExternalLessons();
    if (externalLessons) {
      Object.keys(externalLessons).forEach(function (key) {
        var n = parseInt(key, 10);
        if (!Number.isNaN(n)) levelsMap[n] = true;
      });
    }

    return Object.keys(levelsMap)
      .map(function (item) { return parseInt(item, 10); })
      .filter(function (item) { return !Number.isNaN(item); })
      .sort(function (a, b) { return a - b; });
  }

  function resolveLessonTime(lesson, fallback) {
    return lesson && (lesson.time || lesson.duration) ? (lesson.time || lesson.duration) : fallback;
  }

  function normalizeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function mergeLessonData(level) {
    var external = getExternalLessons();
    var local = _LEVELS[level] || {};
    var fromContent = external && external[level] ? external[level] : null;

    if (!fromContent) return local || null;

    return {
      id: level,
      title: fromContent.title || local.title || ('第 ' + level + ' 关'),
      stage: fromContent.stage || local.stage || 1,
      time: resolveLessonTime(fromContent, local.time || '待定'),
      objectives: normalizeArray(fromContent.objectives).length ? fromContent.objectives : normalizeArray(local.objectives),
      steps: normalizeArray(fromContent.steps).length ? fromContent.steps : normalizeArray(local.steps),
      errors: normalizeArray(fromContent.errors).length ? fromContent.errors : normalizeArray(local.errors),
      quizzes: normalizeArray(fromContent.quizzes).length ? fromContent.quizzes : normalizeArray(local.quizzes),
      summary: fromContent.summary || local.summary || '',
      contentFile: fromContent.contentFile || local.contentFile || ''
    };
  }

  function normalizeSimpleText(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[：:，,。.!！?？、()（）\[\]{}""''\-_]/g, '');
  }

  function getLessonImageCandidates(level, data) {
    var candidates = [];
    var stage = data && data.stage ? parseInt(data.stage, 10) : 1;
    var rule = null;

    if (window.CNC_STUDY_ENTRY_RULES && typeof window.CNC_STUDY_ENTRY_RULES.findRuleByLevel === 'function') {
      rule = window.CNC_STUDY_ENTRY_RULES.findRuleByLevel(stage, parseInt(level, 10));
    }

    if (rule) {
      if (rule.id) candidates.push(rule.id);
      if (rule.cardTitle) candidates.push(rule.cardTitle);
      if (rule.keywords && rule.keywords.length) {
        for (var k = 0; k < rule.keywords.length; k++) {
          candidates.push(rule.keywords[k]);
        }
      }
    }

    if (data) {
      if (data.id) candidates.push(data.id);
      if (data.title) candidates.push(data.title);
    }

    candidates.push('level-' + parseInt(level, 10));

    var uniq = {};
    var result = [];
    for (var c = 0; c < candidates.length; c++) {
      var item = String(candidates[c] || '').trim();
      if (!item) continue;
      var normalized = normalizeSimpleText(item);
      if (uniq[normalized]) continue;
      uniq[normalized] = true;
      result.push(item);
    }
    return result;
  }

  function appendMediaItems(container, list, source, mediaType) {
    if (!list || !list.length) return;
    var type = mediaType || 'image';
    for (var i = 0; i < list.length; i++) {
      var raw = list[i] || {};
      if (!raw.src) continue;
      var src = String(raw.src).trim();
      if (!src || container.seen[src]) continue;
      var description = raw.title || raw.caption || raw.name || raw.description || raw.alt || source;
      var mediaId = raw.videoId || raw.imageId || raw.id || (type === 'video' ? ('video-' + (container.items.length + 1)) : ('img-' + (container.items.length + 1)));
      container.seen[src] = true;
      container.items.push({
        id: mediaId,
        src: src,
        description: description,
        type: type
      });
    }
  }

  function gatherLessonImageItems(level, data) {
    var levelNum = parseInt(level, 10);
    if (Number.isNaN(levelNum)) return [];

    var candidates = getLessonImageCandidates(levelNum, data);
    var result = { items: [], seen: {} };
    var container = { items: result.items, seen: result.seen };

    var runtime = window.CNC_RUNTIME && window.CNC_RUNTIME.imageLayer;
    var map = window.ENTRY_TO_IMAGES_MAP || null;

    for (var i = 0; i < candidates.length; i++) {
      var candidate = candidates[i];
      var direct = null;

      if (runtime && typeof runtime.getImagesForEntry === 'function') {
        direct = runtime.getImagesForEntry(candidate);
        appendMediaItems(container, direct, candidate, 'image');
      }

      if (map && map[candidate]) {
        appendMediaItems(container, map[candidate], candidate, 'image');
      }
    }

    if (!result.items.length && map) {
      var mapKeys = Object.keys(map);
      for (var m = 0; m < mapKeys.length; m++) {
        var key = mapKeys[m];
        var keyNorm = normalizeSimpleText(key);
        for (var c2 = 0; c2 < candidates.length; c2++) {
          var candidate2 = normalizeSimpleText(candidates[c2]);
          if (keyNorm.indexOf(candidate2) === -1 && candidate2.indexOf(keyNorm) === -1) continue;
          appendMediaItems(container, map[key], key, 'image');
          break;
        }
      }
    }

    return container.items.slice(0, 6);
  }

  function gatherLessonVideoItems(level, data) {
    var levelNum = parseInt(level, 10);
    if (Number.isNaN(levelNum)) return [];

    var candidates = getLessonImageCandidates(levelNum, data);
    var result = { items: [], seen: {} };
    var container = { items: result.items, seen: result.seen };

    var runtime = window.CNC_RUNTIME && window.CNC_RUNTIME.imageLayer;
    var map = window.ENTRY_TO_VIDEOS_MAP || null;
    var runtimeVideos = (runtime && typeof runtime.getVideosForEntry === 'function') ? true : false;
    for (var i = 0; i < candidates.length; i++) {
      var candidate = candidates[i];
      var direct = null;

      if (runtimeVideos) {
        direct = runtime.getVideosForEntry(candidate);
        appendMediaItems(container, direct, candidate, 'video');
      }

      if (map && map[candidate]) {
        appendMediaItems(container, map[candidate], candidate, 'video');
      }
    }

    if (!result.items.length && map) {
      var mapKeys = Object.keys(map);
      for (var m = 0; m < mapKeys.length; m++) {
        var key = mapKeys[m];
        var keyNorm = normalizeSimpleText(key);
        for (var c2 = 0; c2 < candidates.length; c2++) {
          var candidate2 = normalizeSimpleText(candidates[c2]);
          if (keyNorm.indexOf(candidate2) === -1 && candidate2.indexOf(keyNorm) === -1) continue;
          appendMediaItems(container, map[key], key, 'video');
          break;
        }
      }
    }

    return container.items.slice(0, 2);
  }

  function buildFallbackImagePlaceholder(description, width, height) {
    var w = width || 600;
    var h = height || 360;
    return '<div class="lesson-fallback-image" '
      + 'style="width:' + w + 'px;max-width:100%;height:' + h + 'px;display:flex;'
      + 'align-items:center;justify-content:center;border:1px dashed var(--lesson-border);'
      + 'border-radius:10px;color:var(--lesson-text-light);background:#f8f9fa;text-align:center;padding:0 12px;">'
      + escapeHtml(description || '暂未找到关联配图') + '</div>';
  }

  function renderLessonGallery(level, data) {
    var mediaId = 'lesson-' + level;
    var images = gatherLessonImageItems(level, data);
    var videos = gatherLessonVideoItems(level, data);
    var mediaItems = (videos || []).concat(images || []);
    var hasVideo = videos && videos.length > 0;
    if (!mediaItems || !mediaItems.length) {
      _lessonMediaMap[mediaId] = [];
      return '';
    }

    if (window.CNC_LEARNING_IMAGES && typeof window.CNC_LEARNING_IMAGES.renderImagePlaceholder === 'function') {
      _lessonMediaMap[mediaId] = mediaItems.map(function (item) { return item; });
    } else {
      _lessonMediaMap[mediaId] = mediaItems.slice();
    }

    var html = '<section class="lesson-section lesson-media"><h3>教学配图（含视频）</h3>';
    if (hasVideo) {
      html += '<p class="lesson-media-note">该课程含教学视频，建议先观看最前面的核心视频，再查看配套配图。</p>';
    }
    html += '<div class="lesson-media-grid">';
    for (var i = 0; i < mediaItems.length; i++) {
      var item = mediaItems[i];
      var slotId = mediaId + '-img-' + (i + 1);
      var description = item.description || '教学配图';
      var itemClass = item.type === 'video'
        ? 'lesson-media-item lesson-media-item-video'
        : 'lesson-media-item lesson-media-item-image';
      var badgeClass = item.type === 'video'
        ? 'media-type-badge media-type-video'
        : 'media-type-badge media-type-image';
      var badgeText = item.type === 'video'
        ? (i === 0 ? '先看视频' : '教学视频')
        : '配图';
      if (item.type === 'video' && i === 0) {
        itemClass += ' lesson-media-item-featured';
      }

      if (item.type === 'video') {
        html += '<div class="' + itemClass + '"><span class="' + badgeClass + '">' + escapeHtml(badgeText) + '</span><video class="lesson-video" controls preload="metadata" src="' + escapeHtml(item.src) + '" data-video-slot="' + escapeHtml(slotId) + '">';
        html += '<source src="' + escapeHtml(item.src) + '" type="video/mp4">';
        html += '您的浏览器不支持视频播放。';
        html += '</video><p class="image-placeholder-caption">' + escapeHtml(description) + '</p></div>';
      } else if (window.CNC_LEARNING_IMAGES && typeof window.CNC_LEARNING_IMAGES.renderImagePlaceholder === 'function') {
        var placeholder = window.CNC_LEARNING_IMAGES.renderImagePlaceholder(description, 700, 390);
        placeholder = placeholder.replace(
          '<div class="image-placeholder"',
          '<div class="image-placeholder" data-image-slot="' + slotId + '" data-description="' + escapeHtml(description) + '"'
        );
        html += '<div class="' + itemClass + '"><span class="' + badgeClass + '">' + escapeHtml(badgeText) + '</span>' + placeholder + '</div>';
      } else {
        html += '<div class="' + itemClass + '" data-image-slot="' + slotId + '" data-description="' + escapeHtml(description) + '"><span class="' + badgeClass + '">' + escapeHtml(badgeText) + '</span>'
          + buildFallbackImagePlaceholder(description, 700, 390)
          + '</div>';
      }

      if (window.CNC_LEARNING_IMAGES && typeof window.CNC_LEARNING_IMAGES.registerImageSlot === 'function') {
        window.CNC_LEARNING_IMAGES.registerImageSlot(mediaId, slotId);
      }
      _lessonMediaMap[mediaId][i] = {
        id: slotId,
        type: item.type || 'image',
        src: item.src
      };
    }
    html += '</div></section>';
    return html;
  }

  function loadLessonMarkdownFromFile(contentFile, level) {
    if (!contentFile) return null;
    if (_markdownCache[contentFile] !== undefined) return _markdownCache[contentFile];

    if (typeof XMLHttpRequest === 'undefined') {
      _markdownCache[contentFile] = null;
      return null;
    }

    try {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', contentFile, false);
      xhr.send();
      if (xhr.status === 0 || (xhr.status >= 200 && xhr.status < 300)) {
        var parsed = parseLessonMarkdown(xhr.responseText || '', level);
        _markdownCache[contentFile] = parsed;
        return parsed;
      }
    } catch (e) {
      console.warn('[CNC_LEARNING_UI] 读取课程文本失败:', contentFile, e && e.message ? e.message : e);
    }

    _markdownCache[contentFile] = null;
    return null;
  }

  function applyMarkdownToLesson(level, baseData) {
    if (!baseData || !baseData.contentFile) return baseData;
    var parsed = loadLessonMarkdownFromFile(baseData.contentFile, level);
    if (!parsed) return baseData;

    return {
      id: baseData.id,
      title: baseData.title,
      stage: baseData.stage,
      time: baseData.time,
      objectives: parsed.objectives && parsed.objectives.length ? parsed.objectives : baseData.objectives,
      steps: parsed.steps && parsed.steps.length ? parsed.steps : baseData.steps,
      errors: parsed.errors && parsed.errors.length ? parsed.errors : baseData.errors,
      quizzes: parsed.quizzes && parsed.quizzes.length ? parsed.quizzes : baseData.quizzes,
      summary: parsed.summary || baseData.summary || '',
      contentFile: baseData.contentFile,
      contentSourceSummary: parsed
    };
  }

  function splitMarkdownSections(markdown) {
    var sections = {};
    var lines = (markdown || '').replace(/\r\n/g, '\n').split('\n');
    var current = '__root__';
    sections[current] = '';
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var heading = line.match(/^(#{1,4})\s*(.+)$/);
      if (heading && heading[2]) {
        if (heading[1].length <= 2) {
          current = heading[2].trim();
          if (!sections[current]) sections[current] = '';
          continue;
        }
      }
      sections[current] += line + '\n';
    }
    return sections;
  }

  function pickSectionText(sections, titles) {
    for (var key in sections) {
      if (!sections.hasOwnProperty(key)) continue;
      for (var i = 0; i < titles.length; i++) {
        if (key.indexOf(titles[i]) !== -1) return sections[key];
      }
    }
    return '';
  }

  function splitSectionBySubheading(sectionText, subHeadPattern) {
    if (!sectionText) return [];
    var escaped = String(subHeadPattern).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var regex = new RegExp('(?:^|\\n)###\\s*(' + escaped + '[^\\n]*\\n[\\s\\S]*?)(?=\\n###\\s*|\\n##\\s*|$)', 'g');
    var blockMatches = sectionText.match(regex) || [];
    return blockMatches;
  }

  function cleanMarkdownText(text) {
    return String(text || '')
      .replace(/`+/g, '')
      .replace(/[_*]{1,2}/g, '')
      .replace(/^\s*[>-]\s*/g, '')
      .replace(/\n+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function extractQuestionOrText(lines) {
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (line.indexOf('题目') !== -1 && (line.indexOf('：') !== -1 || line.indexOf(':') !== -1)) {
        var split = line.split('：');
        if (split.length > 1) return cleanMarkdownText(split.slice(1).join('：'));
        split = line.split(':');
        if (split.length > 1) return cleanMarkdownText(split.slice(1).join(':'));
      }
    }
    for (i = 0; i < lines.length; i++) {
      var raw = cleanMarkdownText(lines[i]);
      if (raw) return raw;
    }
    return '';
  }

  function parseLabeledLine(lines, labels) {
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      for (var j = 0; j < labels.length; j++) {
        var label = labels[j];
        var idx = line.indexOf(label + '：');
        if (idx !== -1) {
          return cleanMarkdownText(line.slice(idx + label.length + 1));
        }
        idx = line.indexOf(label + ':');
        if (idx !== -1) {
          return cleanMarkdownText(line.slice(idx + label.length + 1));
        }
      }
    }
    return '';
  }

  function parseBulletList(text) {
    if (!text) return [];
    var result = [];
    var lines = String(text).split('\n');
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      var matchBullet = line.match(/^[-*]\s+(.+)$/);
      var matchNum = line.match(/^\d+[\.)]\s+(.+)$/);
      if (matchBullet) result.push(cleanMarkdownText(matchBullet[1]));
      else if (matchNum) result.push(cleanMarkdownText(matchNum[1]));
    }
    if (!result.length) {
      var merged = cleanMarkdownText(text);
      if (merged) result.push(merged);
    }
    return result;
  }

  function parseStepList(text) {
    if (!text) return [];
    var blocks = splitSectionBySubheading(text, '步骤');
    var steps = [];
    if (blocks.length) {
      for (var i = 0; i < blocks.length; i++) {
        var body = blocks[i].replace(/^\n?###\s*[^:\n]*\s*:?/, '');
        var parsed = cleanMarkdownText(body);
        if (parsed) steps.push(parsed);
      }
    }
    if (!steps.length) {
      steps = parseBulletList(text);
    }
    return steps;
  }

  function parseErrorList(text) {
    if (!text) return [];
    var errors = [];
    var blocks = splitSectionBySubheading(text, '错误');
    if (!blocks.length) {
      return parseBulletList(text);
    }
    for (var i = 0; i < blocks.length; i++) {
      var body = cleanMarkdownText(blocks[i].replace(/^\n?###\s*[^:\n]*\s*:?/, ''));
      if (body) errors.push(body);
    }
    return errors;
  }

  function parseQuizAnswerIndex(answerText, options) {
    if (!answerText) return -1;
    var t = String(answerText).toLowerCase().replace(/\s+/g, '');
    if (t.indexOf('正确') === 0) return 0;
    if (t.indexOf('错误') === 0) return 1;
    if (!options || !options.length) {
      var num = parseInt(t.replace(/\D/g, ''), 10);
      return Number.isNaN(num) ? -1 : num - 1;
    }
    if (t.indexOf('a') === 0 || t.indexOf('答案a') === 0 || t.indexOf('选a') === 0) return 0;
    if (t.indexOf('b') === 0 || t.indexOf('答案b') === 0 || t.indexOf('选b') === 0) return 1;
    if (t.indexOf('c') === 0 || t.indexOf('答案c') === 0 || t.indexOf('选c') === 0) return 2;
    if (t.indexOf('d') === 0 || t.indexOf('答案d') === 0 || t.indexOf('选d') === 0) return 3;
    var num = parseInt(t.replace(/\D/g, ''), 10);
    if (!Number.isNaN(num) && num > 0 && num <= options.length) return num - 1;
    return -1;
  }

  function parseFillAnswers(answerText) {
    if (!answerText) return [];
    var normalized = String(answerText).trim();
    if (!normalized) return [];
    normalized = normalized.replace(/\s+/g, ' ');

    var candidates = normalized.split(/[；;，,、/|]/);
    var answers = [];
    for (var i = 0; i < candidates.length; i++) {
      var value = cleanMarkdownText(candidates[i]);
      if (!value) continue;
      if (value.charAt(0) === '：' || value.charAt(0) === ':') {
        value = cleanMarkdownText(value.slice(1));
      }
      if (!value) continue;
      if (answers.indexOf(value) === -1) answers.push(value);
    }
    return answers;
  }

  function parseQuizOptions(text) {
    var lines = String(text).split('\n');
    var options = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      var letter = line.match(/^[-*]\s*[A-Da-d][\.\)]\s*(.+)$/);
      if (letter) {
        options.push(cleanMarkdownText(letter[1]));
      }
    }
    if (!options.length) return [];
    return options;
  }

  function parseQuizzes(text, level) {
    if (!text) return [];
    var quizBlocks = text.match(/\n?###\s*[^\n]+\n[\s\S]*?(?=(\n###\s*[^\n]+\n|$))/g) || [];
    var results = [];
    for (var i = 0; i < quizBlocks.length; i++) {
      var raw = quizBlocks[i];
      var headingMatch = raw.match(/^\n?###\s*([^\n]+)\n/);
      var title = headingMatch && headingMatch[1] ? cleanMarkdownText(headingMatch[1]) : '';
      raw = raw.replace(/^\n?###\s*([^\n]+\n)/, '');
      var lines = raw.split('\n');
      if (!title && lines[0]) title = cleanMarkdownText(lines[0]);
      var question = parseLabeledLine(lines, ['题目', '**题目**']);
      if (!question) question = extractQuestionOrText(lines);
      var options = parseQuizOptions(raw);
      var answerText = parseLabeledLine(lines, ['答案', '**答案**']);
      var fillAnswers = parseFillAnswers(answerText);
      var explanation = parseLabeledLine(lines, ['解析', '**解析**']);
      var titleWithNoSpace = String(title).replace(/\s+/g, '');
      var isFill = titleWithNoSpace.indexOf('填空题') !== -1
        || titleWithNoSpace.indexOf('填空') !== -1
        || question.indexOf('____') !== -1;
      var isTrueFalse = !isFill && (options.length === 2 || title.indexOf('判断') !== -1);
      if (!options.length && isTrueFalse) {
        options = ['正确', '错误'];
      }
      if (isFill) {
        if (!fillAnswers.length || !question) continue;
        results.push({
          id: 'md-' + level + '-quiz-' + (i + 1),
          type: 'fillblank',
          question: question,
          options: [],
          answer: fillAnswers,
          explanation: explanation || ('答案：' + fillAnswers.join('；'))
        });
        continue;
      }

      if (!question || !options.length || options.length < 2) continue;
      var answer = parseQuizAnswerIndex(answerText, options);
      if (answer < 0) continue;
      results.push({
        id: 'md-' + level + '-quiz-' + (i + 1),
        type: isTrueFalse ? 'truefalse' : 'multiple',
        question: question,
        options: options,
        answer: answer,
        explanation: explanation || ('答案：' + options[answer])
      });
    }
    return results;
  }

  function parseLessonMarkdown(markdown, level) {
    var normalized = (markdown || '').replace(/\r\n/g, '\n');
    var sections = splitMarkdownSections(normalized);
    var extractedTitle = '';
    for (var k in sections) {
      if (!sections.hasOwnProperty(k)) continue;
      if (k && k.indexOf('第') === 0 || k.indexOf('1') === 0 || k.indexOf('2') === 0) {
        extractedTitle = k;
        break;
      }
    }
    if (!extractedTitle) {
      var titleMatch = normalized.match(/^\s*#\s*(.+)$/m);
      if (titleMatch) extractedTitle = cleanMarkdownText(titleMatch[1]);
    }

    var objectivesText = pickSectionText(sections, ['学习目标', '核心概念']);
    var stepsText = pickSectionText(sections, ['操作步骤']);
    var errorText = pickSectionText(sections, ['常见错误']);
    var quizText = pickSectionText(sections, ['互动练习', '练习']);
    var summaryText = pickSectionText(sections, ['小结']);

    return {
      title: extractedTitle || '',
      objectives: parseBulletList(objectivesText),
      steps: parseStepList(stepsText),
      errors: parseErrorList(errorText),
      quizzes: parseQuizzes(quizText, level),
      summary: cleanMarkdownText(summaryText)
    };
  }

  function getLessonData(level) {
    if (_lessonCache[level]) return _lessonCache[level];
    if (!level) return null;
    var levelNumber = parseInt(level, 10);
    if (Number.isNaN(levelNumber)) return null;
    var data = mergeLessonData(levelNumber);
    if (!data || !data.title) return null;
    data = applyMarkdownToLesson(levelNumber, data);
    _lessonCache[level] = data;
    return data;
  }

  function renderLessonDetail(level) {
    var data = getLessonData(level);
    if (!data) { console.error('[CNC_LEARNING_UI] 关卡 ' + level + ' 数据不存在'); return ''; }
    _currentLevel = level;
    var html = '<div class="lesson-detail" data-level="' + level + '">';
    html += '<div class="lesson-header"><h2>' + data.title + '</h2>';
    html += '<div class="lesson-meta"><span class="lesson-stage">阶段 ' + data.stage + '</span><span class="lesson-time">⏱ ' + data.time + '</span></div></div>';
    html += renderLessonGallery(level, data);
    html += renderObjectives(data.objectives);
    html += renderSteps(data.steps);
    html += renderErrors(data.errors);
    html += renderQuizzes(data.quizzes);
    html += renderSummary(data.summary);
    if (data.contentFile) {
      html += '<p class=\"lesson-content-note\">课程文本文件：' + escapeHtml(data.contentFile) + '</p>';
    }
    html += '<div class="lesson-navigation" id="lesson-nav"></div>';
    html += '</div>';
    bindQuizSubmitHandler();
    return html;
  }

  function hydrateLessonImages(level) {
    if (!window.CNC_LEARNING_IMAGES || typeof window.CNC_LEARNING_IMAGES.batchReplacePlaceholders !== 'function') return 0;
    var mediaId = 'lesson-' + parseInt(level, 10);
    var images = _lessonMediaMap[mediaId];
    if (!images || !images.length) {
      return 0;
    }
    var map = {};
    map[mediaId] = images;
    return window.CNC_LEARNING_IMAGES.batchReplacePlaceholders(map);
  }

  function bindQuizSubmitHandler() {
    if (_quizSubmitBound) return;
    if (typeof document === 'undefined') return;

    document.addEventListener('click', function (event) {
      var submitBtn = event.target.closest('.quiz-submit');
      if (!submitBtn) return;

      var quizId = submitBtn.dataset && submitBtn.dataset.quizId;
      if (!quizId) return;

      var quizEl = submitBtn.closest('.quiz-card');
      if (!quizEl) return;

      var system = window.CNC_QUIZ_SYSTEM;
      if (!system || typeof system.checkAnswer !== 'function') {
        return;
      }

      var fillInput = quizEl.querySelector('.quiz-fill-input');
      var userAnswer = '';
      if (fillInput) {
        userAnswer = fillInput.value || '';
      } else {
        var checked = quizEl.querySelector('input[type="radio"]:checked');
        if (checked) {
          userAnswer = checked.value;
        } else {
          userAnswer = '-1';
        }
      }

      var result = system.checkAnswer(quizId, userAnswer);
      if (result && result.error) return;
      if (system.showExplanation) {
        system.showExplanation(quizId);
      }
    });

    _quizSubmitBound = true;
  }

  function renderObjectives(objectives) {
    if (!objectives || !objectives.length) return '';
    var html = '<section class="lesson-section lesson-objectives"><h3>学习目标</h3><ul class="objective-list">';
    for (var i = 0; i < objectives.length; i++) {
      html += '<li class="objective-item"><span class="objective-check">☐</span> ' + escapeHtml(objectives[i]) + '</li>';
    }
    html += '</ul></section>';
    return html;
  }

  function renderSteps(steps) {
    if (!steps || !steps.length) return '';
    var html = '<section class="lesson-section lesson-steps"><h3>操作步骤</h3><ol class="steps-list">';
    for (var i = 0; i < steps.length; i++) {
      html += '<li class="step-item"><span class="step-number">' + (i + 1) + '</span><div class="step-content">' + escapeHtml(steps[i]) + '</div></li>';
    }
    html += '</ol></section>';
    return html;
  }

  function renderErrors(errors) {
    if (!errors || !errors.length) return '';
    var html = '<section class="lesson-section lesson-errors"><h3>常见错误与避免</h3><div class="errors-list">';
    for (var i = 0; i < errors.length; i++) {
      var parts = errors[i].split('：');
      html += '<div class="error-card"><span class="error-icon">⚠️</span><div class="error-text">';
      if (parts.length > 1) { html += '<strong>' + escapeHtml(parts[0]) + '</strong>：' + escapeHtml(parts[1]); }
      else { html += escapeHtml(errors[i]); }
      html += '</div></div>';
    }
    html += '</div></section>';
    return html;
  }

  function renderQuizzes(quizzes) {
    if (!quizzes || !quizzes.length) return '';
    var html = '<section class="lesson-section lesson-quizzes"><h3>互动练习</h3><div class="quizzes-list">';
    for (var i = 0; i < quizzes.length; i++) {
      html += renderSingleQuiz(quizzes[i], i);
    }
    html += '</div></section>';
    return html;
  }

  function renderSingleQuiz(quiz, index) {
    var html = '<div class="quiz-card" data-quiz-id="' + quiz.id + '">';
    html += '<div class="quiz-header"><span class="quiz-number">第 ' + (index + 1) + ' 题</span>';
    var typeLabel = quiz.type === 'multiple'
      ? '选择题'
      : quiz.type === 'truefalse'
        ? '判断题'
        : '填空题';
    html += '<span class="quiz-type">' + typeLabel + '</span></div>';
    html += '<p class="quiz-question">' + escapeHtml(quiz.question) + '</p>';
    if (quiz.type === 'fillblank') {
      html += '<div class="quiz-input-group"><input type="text" class="quiz-fill-input" placeholder="请输入答案" data-quiz-id="' + quiz.id + '"></div>';
    } else {
      html += '<div class="quiz-options">';
      for (var j = 0; j < quiz.options.length; j++) {
        html += '<label class="quiz-option"><input type="radio" name="' + quiz.id + '" value="' + j + '"><span class="quiz-option-text">' + escapeHtml(quiz.options[j]) + '</span></label>';
      }
      html += '</div>';
    }
    html += '<div class="quiz-feedback" style="display:none"></div>';
    html += '<button class="quiz-submit primary-button" data-quiz-id="' + quiz.id + '">提交答案</button>';
    html += '<div class="quiz-explanation" style="display:none"><p>' + escapeHtml(quiz.explanation) + '</p></div></div>';
    return html;
  }

  function renderSummary(summary) {
    if (!summary) return '';
    return '<section class="lesson-section lesson-summary"><h3>本章小结</h3><div class="summary-content">' + escapeHtml(summary) + '</div></section>';
  }

  function initNavigation() {
    var nav = document.getElementById('lesson-nav');
    if (!nav) return;
    var level = _currentLevel;
    var allLevels = getAllLevelNumbers();
    var index = allLevels.indexOf(level);
    var prevLevel = index > 0 ? allLevels[index - 1] : null;
    var nextLevel = index >= 0 && index < allLevels.length - 1 ? allLevels[index + 1] : null;
    var prevLabel = prevLevel ? ((mergeLessonData(prevLevel) && mergeLessonData(prevLevel).title) || ('第 ' + prevLevel + ' 关')) : '';
    var nextLabel = nextLevel ? ((mergeLessonData(nextLevel) && mergeLessonData(nextLevel).title) || ('第 ' + nextLevel + ' 关')) : '';
    var html = '<div class="lesson-nav-buttons">';
    if (prevLevel) { html += '<button class="lesson-nav-btn prev" data-level="' + prevLevel + '">← ' + prevLabel + '</button>'; }
    else { html += '<button class="lesson-nav-btn disabled" disabled>← 已是第一关</button>'; }
    html += '<button class="lesson-nav-btn mark-complete" data-level="' + level + '">标记完成 ✓</button>';
    if (nextLevel) { html += '<button class="lesson-nav-btn next" data-level="' + nextLevel + '">' + nextLabel + ' →</button>'; }
    else { html += '<button class="lesson-nav-btn disabled" disabled>已是最后一关 →</button>'; }
    html += '</div>';
    nav.innerHTML = html;
  }

  function escapeHtml(text) {
    if (!text) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
  }

  window.CNC_LEARNING_UI = {
    renderLessonDetail: renderLessonDetail,
    renderObjectives: renderObjectives,
    renderSteps: renderSteps,
    renderErrors: renderErrors,
    renderQuizzes: renderQuizzes,
    renderSummary: renderSummary,
    initNavigation: initNavigation,
    getLessonData: getLessonData,
    hydrateLessonImages: hydrateLessonImages,
    getCurrentLevel: function () { return _currentLevel; }
  };

  console.log('[CNC_LEARNING_UI] 学习详情页渲染引擎已加载。课程数: ' + getAllLevelNumbers().length + ' 关（内置 ' + Object.keys(_LEVELS).length + ' 关示例 + 元数据扩展）。');
})();
