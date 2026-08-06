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
const requirements = parseLiteral(/var LESSON_REQUIREMENTS=(\{[\s\S]*?\});\s*var gateObserver=/, '12关映射');
const questionById = new Map(questions.map(question => [question.id, question]));
const levelKeys = Object.keys(requirements).map(Number).sort((a, b) => a - b);
const expectedLevels = Array.from({ length: 12 }, (_, index) => index + 1);
const topicRules = {
  1: /安全|急停|进给保持|防护门|授权/,
  2: /加工中心|主轴|工作台|刀库|机床结构/,
  3: /坐标|轴|方向|参考点|回零/,
  4: /图纸|尺寸|基准|公差|量具/,
  5: /工件坐标|G54|偏置|找正|零点/,
  6: /装夹|定位|夹紧|支撑|刀具通道/,
  7: /刀具|刀柄|夹头|刃口|伸出量/,
  8: /对刀|刀长|H号|补偿|安全高度/,
  9: /G00|G01|快速定位|直线插补|进给/,
  10: /G02|G03|圆弧|加工平面|圆心|半径/,
  11: /孔加工|固定循环|R平面|G98|G99|G80/,
  12: /完整程序|首件|空运行|试切|测量|放行/
};

const errors = [];
function check(condition, message) {
  if (!condition) errors.push(message);
}

check(JSON.stringify(levelKeys) === JSON.stringify(expectedLevels), `闯关映射必须严格覆盖固定12关，实际：${levelKeys.join(',')}`);

const usage = new Map();
const levels = {};
for (const level of expectedLevels) {
  const ids = Array.isArray(requirements[level]) ? requirements[level] : [];
  const missing = ids.filter(id => !questionById.has(id));
  const duplicateInside = ids.filter((id, index) => ids.indexOf(id) !== index);
  const texts = ids
    .map(id => questionById.get(id))
    .filter(Boolean)
    .map(question => [question.stage, question.title, question.explain].join(' '));

  ids.forEach(id => {
    if (!usage.has(id)) usage.set(id, []);
    usage.get(id).push(level);
  });

  check(ids.length >= 2, `第${level}关至少需要2道专属闯关题，实际${ids.length}道`);
  check(missing.length === 0, `第${level}关引用不存在的题目：${missing.join(',')}`);
  check(duplicateInside.length === 0, `第${level}关内部重复引用：${duplicateInside.join(',')}`);
  check(texts.some(text => topicRules[level].test(text)), `第${level}关题目未覆盖本关核心主题`);

  levels[level] = {
    questionIds: ids,
    questionCount: ids.length,
    missing,
    topicMatched: texts.some(text => topicRules[level].test(text))
  };
}

const reused = Array.from(usage.entries())
  .filter(([, levelsUsed]) => levelsUsed.length > 1)
  .map(([id, levelsUsed]) => ({ id, levels: levelsUsed }));
const distinctGateQuestions = usage.size;
check(reused.length === 0, `闯关题不得跨关复用：${reused.map(item => `${item.id}=>${item.levels.join('/')}`).join(', ')}`);
check(distinctGateQuestions >= 24, `12关至少需要24道不重复专属题，实际${distinctGateQuestions}道`);

for (const [id] of usage) {
  const question = questionById.get(id);
  if (!question) continue;
  check(typeof question.explain === 'string' && question.explain.trim().length >= 12, `${id}缺少足够清晰的中文解析`);
  check(typeof question.system === 'string' && question.system.trim().length > 0, `${id}缺少适用范围`);
  if (question.risk === '高') {
    const safetyText = `${question.explain || ''} ${question.system || ''}`;
    check(/原厂手册|机床说明书|现场|企业制度|核对|验证|授权/.test(safetyText), `${id}为高风险题，但解析缺少手册、现场或受控验证边界`);
  }
}

const report = {
  checkedAt: new Date().toISOString(),
  source: 'cnc/training-practice.js',
  totalQuestions: questions.length,
  mappedLevels: levelKeys,
  distinctGateQuestions,
  reused,
  levels,
  passed: errors.length === 0,
  errors
};
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

if (errors.length) {
  console.error('CNC 12关专属闯关题审计失败：');
  errors.forEach(error => console.error(`- ${error}`));
  console.error(`诊断报告：${reportPath}`);
  process.exit(1);
}

console.log('CNC固定12关专属闯关题、主题覆盖、适用范围与高风险安全边界审计通过', {
  totalQuestions: questions.length,
  distinctGateQuestions,
  levels: levelKeys.length
});
