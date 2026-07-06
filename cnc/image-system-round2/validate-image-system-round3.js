const fs = require('fs');
const path = require('path');

const targetDir = __dirname;
let hasError = false;

const logSuccess = (msg) => console.log(`\x1b[32m[PASS]\x1b[0m ${msg}`);
const logError = (msg) => {
  console.error(`\x1b[31m[FAIL]\x1b[0m ${msg}`);
  hasError = true;
};

// 官方枚举规范定义
const VALID_IMAGE_TYPES = [
  '坐标示意图', '刀路轨迹图', '报警情景图', '对比图',
  '对刀步骤图', '参数仪表图', '图纸实物对比图', '流程图'
];

const TYPE_ABBR_MAP = {
  '坐标示意图': 'coord',
  '刀路轨迹图': 'path',
  '报警情景图': 'alarm',
  '对比图': 'comp',
  '对刀步骤图': 'toff',
  '参数仪表图': 'calc',
  '图纸实物对比图': 'draw',
  '流程图': 'flow'
};

const VALID_AUDIENCES = [
  '零基础新手', '车间学徒', '现场操作工', '数控编程师', '自修维护员'
];

const VALID_PAGE_AREAS = [
  '首页导航', '新手学习路线', 'G/M代码速查', '报警诊断排障',
  '切削参数换算', '工艺刀具详情', '授权预览卡', '公网宣传页'
];

console.log('--------------------------------------------------');
console.log('数控学习系统图片三期工程自动化校验器 (validate-image-system-round3.js)');
console.log('--------------------------------------------------');

// 1. 验证 JSON 文件解析
const checkJsonFile = (filename) => {
  const absolutePath = path.resolve(targetDir, filename);
  if (!fs.existsSync(absolutePath)) {
    logError(`File not found: ${filename}`);
    return null;
  }
  try {
    const raw = fs.readFileSync(absolutePath, 'utf8');
    const parsed = JSON.parse(raw);
    logSuccess(`JSON syntax parsing check passed: ${filename}`);
    return parsed;
  } catch (e) {
    logError(`JSON syntax parsing failed: ${filename} - ${e.message}`);
    return null;
  }
};

const mapJson = checkJsonFile('image-entry-map-round2.json');
const statsJson = checkJsonFile('image-binding-stats-round3.json');
const b003Json = checkJsonFile('image-batch-003-prompts.json');
const b004Json = checkJsonFile('image-batch-004-prompts.json');
const missingJson = checkJsonFile('image-missing-queue.json');

// 2. 契约校验
const validateBatch = (records, batchName) => {
  if (!records) return;
  let invalidCount = 0;
  records.forEach((r, idx) => {
    const prefix = `[${batchName}][Index ${idx}][ID: ${r.imageId}]`;
    
    // 检查字段完整性
    const requiredKeys = ['imageId', 'pageArea', 'topicTitle', 'imageType', 'filename', 'prompt', 'priority', 'targetAudience', 'relatedEntryOrSection'];
    requiredKeys.forEach(k => {
      if (!r[k]) {
        logError(`${prefix} Missing required field: ${k}`);
        invalidCount++;
      }
    });

    // 检查枚举
    if (r.imageType && !VALID_IMAGE_TYPES.includes(r.imageType)) {
      logError(`${prefix} Invalid imageType: "${r.imageType}"`);
      invalidCount++;
    }
    if (r.targetAudience && !VALID_AUDIENCES.includes(r.targetAudience)) {
      logError(`${prefix} Invalid targetAudience: "${r.targetAudience}"`);
      invalidCount++;
    }

    // 检查文件名对准
    if (r.imageType && r.filename) {
      const abbr = TYPE_ABBR_MAP[r.imageType];
      const expectedFilename = `img_${batchName}_${abbr}_${r.imageId.split('-')[2]}.webp`;
      if (r.filename !== expectedFilename) {
        logError(`${prefix} Filename rules mismatch. Found: "${r.filename}", Expected: "${expectedFilename}"`);
        invalidCount++;
      }
    }
  });

  if (invalidCount === 0) {
    logSuccess(`${batchName} records format check passed (Total: ${records.length} records).`);
  } else {
    logError(`${batchName} check failed with ${invalidCount} invalid configurations.`);
  }
};

validateBatch(b003Json, 'b003');
validateBatch(b004Json, 'b004');

// 3. 统计比对校验
if (mapJson && statsJson) {
  const actualKeys = Object.keys(mapJson).length;
  if (actualKeys === statsJson.totalBindingKeys) {
    logSuccess(`Stats count match check passed: total keys count is ${actualKeys}.`);
  } else {
    logError(`Stats count mismatch. Stats file says: ${statsJson.totalBindingKeys}, actual mapping has: ${actualKeys} keys.`);
  }
}

// 4. 缺图队列大小校验
if (missingJson) {
  if (missingJson.length >= 100) {
    logSuccess(`Missing queue target length check passed (Found: ${missingJson.length} targets).`);
  } else {
    logError(`Missing queue size too small: ${missingJson.length} (Target: >= 100).`);
  }
}

console.log('--------------------------------------------------');
if (hasError) {
  console.log('\x1b[31m[FINAL RESULT] VERIFICATION FAILED. PLEASE CHECK DETAILS.\x1b[0m');
  process.exit(1);
} else {
  console.log('\x1b[32m[FINAL RESULT] VERIFICATION PASSED. READY FOR DEPLOYMENT.\x1b[0m');
  process.exit(0);
}
