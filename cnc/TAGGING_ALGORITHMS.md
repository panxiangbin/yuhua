# 智能标签系统 — 算法设计

> 文档版本: 1.0  
> 覆盖算法: 自动分类、相关度计算、难度评估、个性化推荐、搜索排序  
> 对应代码: tagging-algorithms.js, tagging-system.js

---

## 一、自动分类算法

### 1.1 算法概述

自动分类算法使用多策略融合方法，结合关键词匹配、路径推断、文件名分析和内容特征，为文件生成 7 个维度的标签。算法优先级：关键词匹配 > 路径推断 > 文件名分析 > 内容特征。

### 1.2 关键词匹配算法

```
输入: 内容 content, 路径 path, 文件名 name
输出: { contentCategory, difficulty, machineType, materialType, systemBrand, knowledgeAttr, confidence }

步骤:
  1. 预处理:
     content_lower = content.toLowerCase()
     words = content_lower.split(/[\s,，。；：、（）()]+/)
     code_blocks = extractCodeBlocks(content)
     
  2. 维度匹配 (以内容类型为例):
     for each category in CONTENT_CATEGORIES:
       for each subcat in category.subcategories:
         hits = 0
         total_weight = 0
         for each kw in subcat.keywords:
           if content_lower.contains(kw.toLowerCase()):
             hits++
             total_weight += kw.weight (默认0.7)
         
         if hits > 0:
           avg_weight = total_weight / subcat.keywords.length
           hit_ratio = hits / max(subcat.keywords.length * 0.1, 3)
           confidence = avg_weight * min(hit_ratio, 1.0)
           candidates.push({ tag: subcat.id, confidence, hits })
     
  3. 路径加分:
     for each pathRule in PATH_TAG_MAP:
       if path.contains(pathRule.path):
         for each tag in pathRule.tags:
           candidate = candidates.find(c => c.tag === tag)
           if candidate: candidate.confidence += 0.15
           else: candidates.push({ tag, confidence: 0.5 })
     
  4. 文件名加分:
     prefix = extractPrefix(name)
     for each prefixRule in FILE_PREFIX_MAP:
       if prefix === prefixRule.prefix:
         for each tag in prefixRule.tags:
           candidate = candidates.find(c => c.tag === tag)
           if candidate: candidate.confidence += 0.1
           else: candidates.push({ tag, confidence: 0.4 })
     
  5. 选前N个:
     sort candidates by confidence desc
     return candidates.filter(c => c.confidence > THRESHOLD).slice(0, 3)
```

### 1.3 代码实现

```javascript
function autoClassify(content, metadata) {
  var result = {
    contentCategory: [],
    machineType: [],
    materialType: [],
    systemBrand: [],
    knowledgeAttr: [],
    difficulty: null,
    confidence: {}
  };

  var contentLower = (content || '').toLowerCase();
  var path = metadata.path || '';
  var name = metadata.name || '';

  // D1: 内容类型
  result.contentCategory = matchDimension(contentLower, CONTENT_CATEGORIES, path, name, 'subcategories');

  // D3: 机床类型
  result.machineType = matchSimpleDimension(contentLower, MACHINE_TYPES);
  if (result.machineType.length === 0) result.machineType.push({ id: 'general', confidence: 0.3 });

  // D4: 材料类型
  result.materialType = matchSimpleDimension(contentLower, MATERIAL_TYPES);
  if (result.materialType.length === 0) result.materialType.push({ id: 'general', confidence: 0.3 });

  // D5: 系统品牌
  result.systemBrand = matchSimpleDimension(contentLower, SYSTEM_BRANDS);
  if (result.systemBrand.length === 0) result.systemBrand.push({ id: 'general', confidence: 0.3 });

  // D6: 知识属性
  result.knowledgeAttr = matchAttributes(contentLower);
  
  // D2: 难度 (独立算法)
  result.difficulty = assessDifficulty(content, metadata);

  return result;
}

function matchDimension(text, categories, path, name, subKey) {
  var candidates = [];
  
  categories.forEach(function(cat) {
    (cat[subKey] || []).forEach(function(sub) {
      var hits = 0;
      sub.keywords.forEach(function(kw) {
        if (text.indexOf(kw.toLowerCase()) !== -1) hits++;
      });
      
      if (hits > 0) {
        var hitRatio = hits / Math.max(sub.keywords.length * 0.1, 3);
        var confidence = 0.7 * Math.min(hitRatio, 1.0);
        
        // 路径加分
        PATH_TAG_MAP.forEach(function(rule) {
          if (path.indexOf(rule.path) !== -1 && rule.tags.indexOf(sub.id) !== -1) {
            confidence += 0.15;
          }
        });
        
        candidates.push({ id: sub.id, label: sub.label, confidence: Math.min(confidence, 1.0), hits: hits });
      }
    });
  });
  
  candidates.sort(function(a, b) { return b.confidence - a.confidence; });
  return candidates.filter(function(c) { return c.confidence >= 0.3; }).slice(0, 3);
}
```

### 1.4 分类准确率保障

| 策略 | 预期准确率 | 适用场景 |
|------|-----------|----------|
| 代码匹配 (G/M代码) | 95%+ | G代码/M代码标签 |
| 关键词匹配 (品牌/材料/机床) | 85%+ | 实体类标签 |
| 路径推断 | 90%+ | 内容分类 |
| 文件名分析 | 80%+ | 内容属性 |
| 全文模糊匹配 | 70%+ | 综合分类 |

---

## 二、相关度计算算法

### 2.1 混合相关度

文件间相关度采用标签相似度 + 内容相似度的混合策略：

```
FinalScore = 0.4 × TagSimilarity + 0.3 × ContentSimilarity + 
             0.15 × DifficultySimilarity + 0.15 × CategorySimilarity
```

### 2.2 Jaccard 标签相似度

```javascript
function computeTagSimilarity(tagsA, tagsB) {
  // 展平所有标签
  var flatA = flattenTags(tagsA);
  var flatB = flattenTags(tagsB);
  
  // 计算交集和并集
  var intersection = 0;
  var setB = {};
  
  flatB.forEach(function(t) { setB[t] = true; });
  flatA.forEach(function(t) { if (setB[t]) intersection++; });
  
  var union = new Set(flatA.concat(flatB)).size;
  
  // 维度加权: 内容类型权重更高
  var weightedA = tagWeightedVector(tagsA);
  var weightedB = tagWeightedVector(tagsB);
  var weightedScore = cosineSimilarity(weightedA, weightedB);
  
  return union > 0 ? (intersection / union) * 0.6 + weightedScore * 0.4 : 0;
}

function flattenTags(tags) {
  var result = [];
  if (tags.contentCategory) tags.contentCategory.forEach(function(t) { result.push('cc:' + (t.id || t)); });
  if (tags.machineType) tags.machineType.forEach(function(t) { result.push('mt:' + (t.id || t)); });
  if (tags.materialType) tags.materialType.forEach(function(t) { result.push('ml:' + (t.id || t)); });
  if (tags.systemBrand) tags.systemBrand.forEach(function(t) { result.push('sb:' + (t.id || t)); });
  if (tags.knowledgeAttr) tags.knowledgeAttr.forEach(function(t) { result.push('ka:' + (t.id || t)); });
  return result;
}
```

### 2.3 TF-IDF 内容相似度

```javascript
function computeContentSimilarity(contentA, contentB) {
  if (!contentA || !contentB) return 0;
  
  // 提取关键词
  var termsA = extractKeywords(contentA);
  var termsB = extractKeywords(contentB);
  
  // 构建TF向量
  var tfA = termFrequency(termsA);
  var tfB = termFrequency(termsB);
  
  // 计算IDF (基于文档集)
  var idf = computeIDF([termsA, termsB]);
  
  // TF-IDF加权
  var tfidfA = applyIDF(tfA, idf);
  var tfidfB = applyIDF(tfB, idf);
  
  // 余弦相似度
  return cosineSimilarity(tfidfA, tfidfB);
}

function extractKeywords(content) {
  // 提取专业术语和常见词
  var text = content.toLowerCase();
  var terms = [];
  
  // 匹配G代码
  var gMatches = text.match(/\bG\d{2,3}\b/g);
  if (gMatches) terms = terms.concat(gMatches);
  
  // 匹配M代码
  var mMatches = text.match(/\bM\d{2,3}\b/g);
  if (mMatches) terms = terms.concat(mMatches);
  
  // 匹配工艺术语
  TECHNICAL_TERMS.forEach(function(term) {
    var idx = text.indexOf(term.toLowerCase());
    if (idx !== -1) terms.push(term);
  });
  
  return terms;
}

function termFrequency(terms) {
  var tf = {};
  var maxFreq = 0;
  terms.forEach(function(t) {
    tf[t] = (tf[t] || 0) + 1;
    if (tf[t] > maxFreq) maxFreq = tf[t];
  });
  // 归一化
  if (maxFreq > 0) {
    Object.keys(tf).forEach(function(k) { tf[k] /= maxFreq; });
  }
  return tf;
}

function cosineSimilarity(vecA, vecB) {
  var dotProduct = 0;
  var magA = 0;
  var magB = 0;
  
  var allKeys = Object.keys(vecA).concat(Object.keys(vecB));
  var uniqueKeys = {};
  allKeys.forEach(function(k) { uniqueKeys[k] = true; });
  
  Object.keys(uniqueKeys).forEach(function(key) {
    var a = vecA[key] || 0;
    var b = vecB[key] || 0;
    dotProduct += a * b;
    magA += a * a;
    magB += b * b;
  });
  
  magA = Math.sqrt(magA);
  magB = Math.sqrt(magB);
  
  return (magA > 0 && magB > 0) ? dotProduct / (magA * magB) : 0;
}
```

### 2.4 相关度阈值

| 阈值区间 | 判定 | 应用场景 |
|----------|------|----------|
| 0.7 - 1.0 | 高度相关 | "相关推荐"Top3, "你可能也喜欢" |
| 0.4 - 0.7 | 相关 | "相关推荐"更多结果 |
| 0.2 - 0.4 | 弱相关 | "延伸阅读" |
| < 0.2 | 不相关 | 过滤 |

---

## 三、难度评估算法

### 3.1 评估指标

```javascript
function assessDifficulty(content, metadata) {
  if (!content || content.length < 50) return { level: 'beginner', score: 1 };
  
  // 指标1: 专业术语密度
  var termDensity = computeTermDensity(content);
  var termScore = scoreTermDensity(termDensity);
  
  // 指标2: 文件大小
  var fileSize = content.length;
  var sizeScore = scoreFileSize(fileSize);
  
  // 指标3: 代码复杂度
  var codeStats = analyzeCodeBlocks(content);
  var codeScore = scoreCodeComplexity(codeStats);
  
  // 指标4: 公式数量
  var formulaCount = countFormulas(content);
  var formulaScore = scoreFormulaCount(formulaCount);
  
  // 指标5: 前置知识
  var prereqCount = countPrerequisites(content);
  var prereqScore = scorePrerequisites(prereqCount);
  
  // 加权综合
  var weights = { termDensity: 0.25, fileSize: 0.15, codeLines: 0.20, formulaCount: 0.15, prereqCount: 0.25 };
  var totalScore = termScore * weights.termDensity +
                   sizeScore * weights.fileSize +
                   codeScore * weights.codeLines +
                   formulaScore * weights.formulaCount +
                   prereqScore * weights.prereqCount;
  
  // 映射到难度级别
  var level;
  if (totalScore <= 1.5) level = 'beginner';
  else if (totalScore <= 2.5) level = 'elementary';
  else if (totalScore <= 3.5) level = 'intermediate';
  else if (totalScore <= 4.5) level = 'advanced';
  else level = 'expert';
  
  return { level: level, score: Math.round(totalScore * 10) / 10, details: {
    termDensity: termDensity,
    fileSize: fileSize,
    codeLines: codeStats.totalLines,
    formulaCount: formulaCount,
    prereqCount: prereqCount
  }};
}
```

### 3.2 术语密度计算

```javascript
function computeTermDensity(content) {
  var text = content.replace(/```[\s\S]*?```/g, ''); // 移除代码块
  var totalChars = text.length;
  if (totalChars === 0) return 0;
  
  // 统计专业术语出现次数
  var termCount = 0;
  TECHNICAL_TERMS.forEach(function(term) {
    var regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    var matches = text.match(regex);
    if (matches) termCount += matches.length;
  });
  
  // 密度 = 术语出现次数 / 总字符数
  return termCount / totalChars;
}

function scoreTermDensity(density) {
  if (density < 0.03) return 1;     // 入门
  if (density < 0.06) return 2;     // 初级
  if (density < 0.10) return 3;     // 中级
  if (density < 0.15) return 4;     // 高级
  return 5;                          // 专家
}
```

### 3.3 代码复杂度分析

```javascript
function analyzeCodeBlocks(content) {
  var result = { totalLines: 0, blockCount: 0, avgNestingDepth: 0, hasLoops: false, hasConditions: false };
  
  // 匹配代码块 (```...```)
  var codeBlockRegex = /```[\s\S]*?```/g;
  var blocks = content.match(codeBlockRegex);
  if (!blocks) return result;
  
  result.blockCount = blocks.length;
  
  blocks.forEach(function(block) {
    var lines = block.split('\n');
    result.totalLines += lines.length;
    
    // 分析嵌套深度
    var maxNesting = 0;
    var currentNesting = 0;
    lines.forEach(function(line) {
      var trimmed = line.trim();
      if (trimmed.indexOf('IF') !== -1 || trimmed.indexOf('WHILE') !== -1 || trimmed.indexOf('FOR') !== -1) {
        currentNesting++;
        if (currentNesting > maxNesting) maxNesting = currentNesting;
      }
      if (trimmed.indexOf('ENDIF') !== -1 || trimmed.indexOf('ENDW') !== -1 || trimmed.indexOf('NEXT') !== -1) {
        currentNesting = Math.max(0, currentNesting - 1);
      }
      // GOTO 和循环
      if (trimmed.match(/GOTO\s+\d+/)) result.hasLoops = true;
      if (trimmed.match(/IF\s+\[.*\]/)) result.hasConditions = true;
    });
    result.avgNestingDepth += maxNesting;
  });
  
  if (result.blockCount > 0) result.avgNestingDepth /= result.blockCount;
  return result;
}

function scoreCodeComplexity(codeStats) {
  var lines = codeStats.totalLines;
  if (lines <= 3) return 1;
  if (lines <= 8) return 2;
  if (lines <= 15) return 3;
  if (lines <= 30) return 4;
  return 5;
}
```

### 3.4 前置知识检测

```javascript
function countPrerequisites(content) {
  var text = content.toLowerCase();
  var count = 0;
  
  // 检测文件中引用的其他概念
  var prereqPatterns = [
    '前置', '前提', '需要先', '必须掌握', '要求', '预先',
    '在...之前', '需要了解', '需要有', '基础知识',
    '编程基础', 'G代码基础', '操作基础', 'CAM基础'
  ];
  
  prereqPatterns.forEach(function(pattern) {
    if (text.indexOf(pattern) !== -1) count++;
  });
  
  // 检测引用的其他知识文件
  var fileRefs = text.match(/\[.+?\]\(.+?\.md\)/g);
  if (fileRefs) count += fileRefs.length * 0.5;
  
  return Math.round(count);
}
```

---

## 四、个性化推荐算法

### 4.1 用户画像构建

```javascript
function buildUserProfile(viewHistory, searchHistory, favorites) {
  var profile = {
    interestTags: {},       // { tagId: weight }
    skillLevel: 'beginner',
    preferredMachines: {},
    preferredBrands: {},
    preferredMaterials: {},
    viewedCategories: {},
    totalViews: 0,
    lastActive: Date.now()
  };
  
  // 从浏览历史构建
  (viewHistory || []).forEach(function(item) {
    profile.totalViews++;
    
    if (item.tags) {
      // 各维度标签权重递增
      (item.tags.contentCategory || []).forEach(function(tag) {
        var key = 'cc:' + (tag.id || tag);
        profile.interestTags[key] = (profile.interestTags[key] || 0) + 1;
        profile.viewedCategories[key] = (profile.viewedCategories[key] || 0) + 1;
      });
      
      // 近期行为权重更高
      var daysSinceView = (Date.now() - item.timestamp) / 86400000;
      var recencyWeight = Math.max(0.1, 1 - daysSinceView / 30);
      
      (item.tags.machineType || []).forEach(function(m) {
        var mKey = m.id || m;
        profile.preferredMachines[mKey] = (profile.preferredMachines[mKey] || 0) + recencyWeight;
      });
      
      (item.tags.systemBrand || []).forEach(function(b) {
        var bKey = b.id || b;
        profile.preferredBrands[bKey] = (profile.preferredBrands[bKey] || 0) + recencyWeight;
      });
    }
    
    // 推断技能水平 (取查看内容的难度平均值)
    if (item.difficulty) {
      var diffScores = { 'beginner': 1, 'elementary': 2, 'intermediate': 3, 'advanced': 4, 'expert': 5 };
      var currentScore = diffScores[profile.skillLevel] || 1;
      var itemScore = diffScores[item.difficulty.level] || 1;
      profile.skillLevel = Object.keys(diffScores)[Math.round((currentScore + itemScore) / 2) - 1] || 'beginner';
    }
  });
  
  return profile;
}
```

### 4.2 4 策略融合推荐

```javascript
function getRecommendations(userProfile, allFiles, limits) {
  limits = limits || { count: 10 };
  
  // 策略1: 协同过滤 (30%)
  var collabResults = collaborativeFiltering(userProfile, allFiles);
  
  // 策略2: 基于内容 (35%)
  var contentResults = contentBasedFiltering(userProfile, allFiles);
  
  // 策略3: 热门推荐 (15%)
  var popularResults = getPopularFiles(allFiles, 20);
  
  // 策略4: 难度适配 (20%)
  var difficultyResults = difficultyMatch(userProfile, allFiles);
  
  // 融合与去重
  var merged = {};
  function addResult(results, weight) {
    results.forEach(function(item, idx) {
      var id = item.fileId || item.id;
      if (!merged[id]) merged[id] = { fileId: id, score: 0, reasons: [], file: item };
      merged[id].score += (results.length - idx) / results.length * weight;
      merged[id].reasons.push(item.reason || '推荐');
    });
  }
  
  addResult(collabResults, 0.30);
  addResult(contentResults, 0.35);
  addResult(popularResults, 0.15);
  addResult(difficultyResults, 0.20);
  
  // 转换为数组并按分数排序
  var results = Object.keys(merged).map(function(id) { return merged[id]; });
  results.sort(function(a, b) { return b.score - a.score; });
  
  // 去重 (已查看的过滤)
  var viewed = new Set((userProfile.viewHistory || []).map(function(v) { return v.fileId; }));
  results = results.filter(function(r) { return !viewed.has(r.fileId); });
  
  return results.slice(0, limits.count);
}
```

### 4.3 基于内容的推荐

```javascript
function contentBasedFiltering(profile, allFiles) {
  var results = [];
  var topTags = Object.keys(profile.interestTags)
    .sort(function(a, b) { return profile.interestTags[b] - profile.interestTags[a]; })
    .slice(0, 5);
  
  allFiles.forEach(function(file) {
    if (!file.tags) return;
    var fileTags = flattenTags(file.tags);
    
    // 计算文件标签与用户兴趣标签的匹配
    var matchScore = 0;
    topTags.forEach(function(userTag) {
      if (fileTags.indexOf(userTag) !== -1) matchScore++;
    });
    
    if (matchScore > 0) {
      results.push({
        fileId: file.id || file.fileId,
        score: matchScore / topTags.length,
        reason: '基于你的浏览兴趣',
        file: file
      });
    }
  });
  
  results.sort(function(a, b) { return b.score - a.score; });
  return results.slice(0, 20);
}
```

### 4.4 协同过滤

```javascript
function collaborativeFiltering(profile, allFiles) {
  // 在本地单用户环境中, 协同过滤退化为基于内容的推荐
  // 多用户环境下, 计算用户间Jaccard相似度
  return [];
}
```

### 4.5 难度匹配

```javascript
function difficultyMatch(profile, allFiles) {
  var userLevel = profile.skillLevel || 'beginner';
  var levels = ['beginner', 'elementary', 'intermediate', 'advanced', 'expert'];
  var userIdx = levels.indexOf(userLevel);
  if (userIdx === -1) userIdx = 0;
  
  var results = [];
  allFiles.forEach(function(file) {
    var fileLevel = (file.tags && file.tags.difficulty && file.tags.difficulty.level) || 'beginner';
    var fileIdx = levels.indexOf(fileLevel);
    if (fileIdx === -1) fileIdx = 0;
    
    var diff = Math.abs(userIdx - fileIdx);
    var score = diff <= 1 ? 1.0 : diff <= 2 ? 0.5 : 0.1;
    
    if (score > 0.3) {
      results.push({
        fileId: file.id || file.fileId,
        score: score,
        reason: '适合你当前水平 (' + fileLevel + ')',
        file: file
      });
    }
  });
  
  results.sort(function(a, b) { return b.score - a.score; });
  return results.slice(0, 20);
}
```

---

## 五、搜索排序算法

### 5.1 5 因子加权排序

```javascript
function rankSearchResults(results, keyword, userProfile) {
  results.forEach(function(result) {
    var score = 0;
    
    // 因子1: 关键词匹配度 (40%)
    var matchScore = computeKeywordMatch(result, keyword);
    score += matchScore * 0.40;
    
    // 因子2: 内容质量 (20%)
    var qualityScore = computeQualityScore(result);
    score += qualityScore * 0.20;
    
    // 因子3: 热度 (15%)
    var popularityScore = computePopularityScore(result);
    score += popularityScore * 0.15;
    
    // 因子4: 时效性 (10%)
    var timelinessScore = computeTimelinessScore(result);
    score += timelinessScore * 0.10;
    
    // 因子5: 个性化 (15%)
    var personalScore = computePersonalScore(result, userProfile);
    score += personalScore * 0.15;
    
    result.rankScore = Math.round(score * 100) / 100;
  });
  
  results.sort(function(a, b) { return b.rankScore - a.rankScore; });
  return results;
}

function computeKeywordMatch(result, keyword) {
  var kw = keyword.toLowerCase();
  var title = (result.title || '').toLowerCase();
  var tags = flattenTags(result.tags || {}).join(' ').toLowerCase();
  var content = (result.content || '').toLowerCase().substring(0, 500);
  
  if (title === kw) return 1.0;                     // 标题完全匹配
  if (title.indexOf(kw) !== -1) return 0.8;          // 标题部分匹配
  if (tags.indexOf(kw) !== -1) return 0.7;           // 标签匹配
  
  // 分词匹配
  var kwParts = kw.split(/[\s,，、]/).filter(function(p) { return p.length > 0; });
  var titleHits = 0;
  kwParts.forEach(function(part) {
    if (title.indexOf(part) !== -1) titleHits++;
  });
  if (titleHits > 0) return 0.4 + 0.4 * (titleHits / kwParts.length);
  
  if (content.indexOf(kw) !== -1) return 0.3;        // 内容匹配
  return 0.1;
}

function computeQualityScore(result) {
  var size = result.size || (result.content || '').length || 0;
  var score = 0;
  
  if (size > 14336) score = 1.0;      // 深度文件
  else if (size > 4096) score = 0.7;  // 中等文件
  else if (size > 500) score = 0.4;   // 基础文件
  else score = 0.1;                    // 过短
  
  // 代码示例加成
  if (result.content && result.content.indexOf('```') !== -1) score = Math.min(score + 0.15, 1.0);
  if (result.content && result.content.indexOf('|') !== -1) score = Math.min(score + 0.1, 1.0); // 表格
  
  return score;
}

function computePopularityScore(result) {
  var views = result.viewCount || result.popularity || 0;
  return Math.min(views / 100, 1.0);
}

function computeTimelinessScore(result) {
  var updated = result.updated || result.timestamp || 0;
  if (!updated) return 0.5;
  var daysSinceUpdate = (Date.now() - updated) / 86400000;
  
  if (daysSinceUpdate <= 30) return 1.0;
  if (daysSinceUpdate <= 90) return 0.7;
  if (daysSinceUpdate <= 180) return 0.5;
  if (daysSinceUpdate <= 365) return 0.3;
  return 0.1;
}

function computePersonalScore(result, profile) {
  if (!profile) return 0.5;
  
  var tagMatch = 0;
  var fileTags = flattenTags(result.tags || {});
  var interestTags = Object.keys(profile.interestTags || {});
  
  interestTags.forEach(function(interest) {
    if (fileTags.indexOf(interest) !== -1) tagMatch++;
  });
  
  var tagScore = interestTags.length > 0 ? tagMatch / interestTags.length : 0;
  
  // 难度适配
  var diffMatch = 0;
  if (profile.skillLevel && result.tags && result.tags.difficulty) {
    var levels = ['beginner', 'elementary', 'intermediate', 'advanced', 'expert'];
    var userIdx = levels.indexOf(profile.skillLevel);
    var fileIdx = levels.indexOf(result.tags.difficulty.level);
    if (userIdx >= 0 && fileIdx >= 0) {
      diffMatch = Math.max(0, 1 - Math.abs(userIdx - fileIdx) * 0.3);
    }
  }
  
  return tagScore * 0.6 + diffMatch * 0.4;
}
```

---

## 六、搜索建议算法

```javascript
function getSuggestions(keyword, knowledgeBase) {
  if (!keyword || keyword.length < 2) return [];
  
  var kw = keyword.toLowerCase();
  var suggestions = [];
  var seen = {};
  
  // 从标签匹配
  var allKeywords = getAllKeywords();
  allKeywords.forEach(function(tagKeyword) {
    if (tagKeyword.toLowerCase().indexOf(kw) !== -1 && !seen[tagKeyword]) {
      seen[tagKeyword] = true;
      suggestions.push({ text: tagKeyword, type: 'keyword', score: tagKeyword.length / (tagKeyword.length + Math.abs(tagKeyword.length - kw.length)) });
    }
  });
  
  // 从文件名匹配
  if (knowledgeBase) {
    knowledgeBase.forEach(function(file) {
      var name = (file.name || '').toLowerCase();
      if (name.indexOf(kw) !== -1 && !seen[name]) {
        seen[name] = true;
        suggestions.push({ text: file.name, type: 'file', score: 0.6 });
      }
    });
  }
  
  suggestions.sort(function(a, b) { return b.score - a.score; });
  return suggestions.slice(0, 8);
}
```

---

## 七、算法性能预估

| 算法 | 时间复杂度 | 单文件耗时 | 42K 文件总耗时 |
|------|-----------|-----------|----------------|
| 自动分类 | O(K) K=关键词数 | <5ms | ~3.5 分钟 |
| 相关度计算 | O(T²) T=标签数 | <1ms | - |
| 难度评估 | O(N) N=字符数 | <2ms | ~1.4 分钟 |
| 搜索排序 | O(M) M=结果数 | <1ms | 实时 |
| 推荐计算 | O(F) F=文件数+标签数 | <10ms | 实时 |
| 搜索建议 | O(K) K=关键词数 | <1ms | 实时 |

所有算法均可在浏览器端实时运行（42K 文件批量分类约 5 分钟，搜索和推荐 <10ms）。

---

## 总结

本算法文档定义了 5 大核心算法：自动分类（关键词+路径+文件名多策略）、相关度（Jaccard+TF-IDF 混合）、难度评估（5 指标加权）、推荐系统（4 策略融合）、搜索排序（5 因子加权）。所有算法以 JavaScript 实现，可直接在浏览器端运行，无需服务器端支持。
