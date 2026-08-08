const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..', '..');
const sourcePath = path.join(root, 'cnc', 'training-practice.js');
const reportPath = process.env.CNC_GATE_REPORT || path.join(root, 'artifacts', 'course-gate-specificity.json');
const source = fs.readFileSync(sourcePath, 'utf8');

function parseLiteral(pattern, label) {
  const match = source.match(pattern);
  assert.ok(match, `无法从 training-practice.js 提取${label}`);
  return vm.runInNewContext(`(${match[1]})`, Object.create(null), { timeout: 1000 });
}

const questions = parseLiteral(/var QUESTIONS=(\[[\s\S]*?\]);\s*var LESSON_REQUIREMENTS=/, '题库');
const requirements = parseLiteral(/var LESSON_REQUIREMENTS=(\{[\s\S]*?\});\s*var CRITICAL_REQUIREMENTS=/, '12关映射');
const criticalRequirements = parseLiteral(/var CRITICAL_REQUIREMENTS=(\{[\s\S]*?\});\s*var gateObserver=/, '关键题映射');
const questionById = new Map(questions.map(question => [question.id, question]));
const questionIds = questions.map(question => question.id);
const levelKeys = Object.keys(requirements).map(Number).sort((a, b) => a - b);
const criticalLevelKeys = Object.keys(criticalRequirements).map(Number).sort((a, b) => a - b);
const expectedLevels = Array.from({ length: 12 }, (_, index) => index + 1);
const topicRules = {
  1: /安全|急停|进给保持|防护门|授权|PPE|切屑/,
  2: /加工中心|主轴|进给轴|刀库|机床结构|换刀|面板/,
  3: /坐标|轴|方向|参考点|回零/,
  4: /图纸|尺寸|基准|公差|量具|测量/,
  5: /工件坐标|G54|偏置|找正|零点/,
  6: /装夹|定位|夹紧|支撑|刀具通道|夹具/,
  7: /刀具|刀柄|夹头|刃口|伸出量/,
  8: /对刀|刀长|H号|补偿|安全高度/,
  9: /G00|G01|快速定位|直线插补|进给/,
  10: /G02|G03|圆弧|加工平面|圆心|半径/,
  11: /孔加工|固定循环|R平面|G98|G99|G80/,
  12: /完整程序|首件|空运行|单段|测量|放行|程序补空/
};

const errors = [];
function check(condition, message) {
  if (!condition) errors.push(message);
}

check(JSON.stringify(levelKeys) === JSON.stringify(expectedLevels), `闯关映射必须严格覆盖固定12关，实际：${levelKeys.join(',')}`);
check(JSON.stringify(criticalLevelKeys) === JSON.stringify(expectedLevels), `关键题映射必须严格覆盖固定12关，实际：${criticalLevelKeys.join(',')}`);
check(questionIds.every(Boolean), '题库存在空题号');
check(new Set(questionIds).size === questionIds.length, '题库存在重复题号');
check(questions.length === 60, `固定12关题库必须恰好60道，实际${questions.length}道`);
check(/var PASS_SCORE=80;/.test(source), '通关分数必须保持80分，禁止通过降低及格线解决问题');
check(/var GATE_VERSION=2;/.test(source), '新版门禁必须使用gateVersion=2保护旧学习数据迁移');
check(/legacyLessonScores/.test(source), '必须保留旧lessonScores作为迁移审计数据');
check(/rawScore>=PASS_SCORE&&missingCritical\.length\?PASS_SCORE-1:rawScore/.test(source), '原始80分但漏关键题时，有效成绩必须保持在80分以下');

const usage = new Map();
const levels = {};
for (const level of expectedLevels) {
  const ids = Array.isArray(requirements[level]) ? requirements[level] : [];
  const criticalIds = Array.isArray(criticalRequirements[level]) ? criticalRequirements[level] : [];
  const missing = ids.filter(id => !questionById.has(id));
  const duplicateInside = ids.filter((id, index) => ids.indexOf(id) !== index);
  const criticalOutside = criticalIds.filter(id => !ids.includes(id));
  const mappedQuestions = ids.map(id => questionById.get(id)).filter(Boolean);
  const texts = mappedQuestions.map(question => [question.stage, question.title, question.explain].join(' '));
  const topicMatches = texts.map(text => topicRules[level].test(text));
  const highRiskIds = mappedQuestions.filter(question => question.risk === '高').map(question => question.id);

  ids.forEach(id => {
    if (!usage.has(id)) usage.set(id, []);
    usage.get(id).push(level);
  });

  check(ids.length === 5, `第${level}关必须恰好配置5道专属闯关题，实际${ids.length}道`);
  check(missing.length === 0, `第${level}关引用不存在的题目：${missing.join(',')}`);
  check(duplicateInside.length === 0, `第${level}关内部重复引用：${duplicateInside.join(',')}`);
  check(criticalOutside.length === 0, `第${level}关关键题不属于本关：${criticalOutside.join(',')}`);
  check(topicMatches.length === ids.length && topicMatches.every(Boolean), `第${level}关存在未覆盖本关核心主题的专属题`);
  check(highRiskIds.every(id => criticalIds.includes(id)), `第${level}关存在高风险题未纳入关键题硬门禁：${highRiskIds.filter(id => !criticalIds.includes(id)).join(',')}`);

  levels[level] = {
    questionIds: ids,
    questionCount: ids.length,
    criticalIds,
    highRiskIds,
    missing,
    topicMatched: topicMatches.length === ids.length && topicMatches.every(Boolean)
  };
}

const reused = Array.from(usage.entries())
  .filter(([, levelsUsed]) => levelsUsed.length > 1)
  .map(([id, levelsUsed]) => ({ id, levels: levelsUsed }));
const distinctGateQuestions = usage.size;
check(reused.length === 0, `闯关题不得跨关复用：${reused.map(item => `${item.id}=>${item.levels.join('/')}`).join(', ')}`);
check(distinctGateQuestions === 60, `固定12关应恰好使用60道不重复专属题，实际${distinctGateQuestions}道`);
check(questionIds.every(id => usage.has(id)), `存在未归属固定12关的题目：${questionIds.filter(id => !usage.has(id)).join(',')}`);

const singleAnswerPositions = [0, 0, 0, 0];
for (const [id] of usage) {
  const question = questionById.get(id);
  if (!question) continue;
  check(typeof question.explain === 'string' && question.explain.trim().length >= 12, `${id}缺少足够清晰的中文解析`);
  check(typeof question.system === 'string' && question.system.trim().length > 0, `${id}缺少适用范围`);
  if (['single', 'judge', 'find-error'].includes(question.type)) {
    check(Array.isArray(question.options) && question.options.length >= 2, `${id}缺少有效选项`);
    check(Number.isInteger(question.answer) && question.answer >= 0 && question.answer < question.options.length, `${id}正确答案索引越界`);
  }
  if (question.type === 'single' && Number.isInteger(question.answer) && question.answer >= 0 && question.answer <= 3) {
    singleAnswerPositions[question.answer] += 1;
  }
  if (question.risk === '高') {
    const safetyText = `${question.explain || ''} ${question.system || ''}`;
    check(/原厂手册|机床说明书/.test(safetyText), `${id}为高风险题，但解析/适用范围缺少原厂手册边界`);
    check(/现场|企业制度|授权|验证/.test(safetyText), `${id}为高风险题，但解析/适用范围缺少现场、授权或受控验证边界`);
  }
}

singleAnswerPositions.forEach((count, index) => {
  check(count >= 3, `单选题正确选项${String.fromCharCode(65 + index)}仅${count}道，答案位置分布过于偏斜`);
});

const report = {
  checkedAt: new Date().toISOString(),
  source: 'cnc/training-practice.js',
  totalQuestions: questions.length,
  mappedLevels: levelKeys,
  distinctGateQuestions,
  reused,
  gateVersion: 2,
  passScore: 80,
  singleAnswerPositions: {
    A: singleAnswerPositions[0],
    B: singleAnswerPositions[1],
    C: singleAnswerPositions[2],
    D: singleAnswerPositions[3]
  },
  levels,
  passed: errors.length === 0,
  errors
};
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

if (errors.length) {
  console.error('CNC 12关真实80分与关键安全题审计失败：');
  errors.forEach(error => console.error(`- ${error}`));
  console.error(`诊断报告：${reportPath}`);
  process.exit(1);
}

console.log('CNC固定12关60题、真实80分、关键题硬门禁、适用范围与高风险安全边界审计通过', {
  totalQuestions: questions.length,
  distinctGateQuestions,
  singleAnswerPositions,
  levels: levelKeys.length
});
