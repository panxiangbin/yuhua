const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const htmlPath = path.resolve(__dirname, '../training-achievements.html');
const artifactDir = path.resolve(__dirname, '../test-artifacts/training-achievements');
fs.mkdirSync(artifactDir, { recursive: true });

const html = fs.readFileSync(htmlPath, 'utf8');
const start = html.indexOf('function stageLevel(value)');
const end = html.indexOf('function wrongEntries(v)', start);
assert.ok(start >= 0 && end > start, '必须能从真实成长成果页提取课程完成归一化函数');

const source = html.slice(start, end);
const context = vm.createContext({ Set, Number, Array });
vm.runInContext(`var invalid=[];\n${source}\nthis.stageLevel=stageLevel;this.completedCourses=completedCourses;`, context);

function sorted(set) {
  return Array.from(set).sort((a, b) => a - b);
}

context.invalid.length = 0;
const validCompleted = sorted(context.completedCourses(
  { valid: true, present: true, value: [1, 'stage-2', 2] },
  { valid: true, value: { completed: [3] } }
));
assert.deepEqual(validCompleted, [1, 2], 'canonical 存在时必须继续只认 canonical，并去重合法课程 ID');
assert.deepEqual(Array.from(context.invalid), [], '合法 canonical 完成记录不得制造数据异常');

context.invalid.length = 0;
const malformedCompleted = sorted(context.completedCourses(
  { valid: true, present: true, value: [1, 'stage-2', '3', 13, -1, 2] },
  { valid: true, value: { completed: [4, 5] } }
));
const malformedInvalid = Array.from(context.invalid);
const report = {
  validCompleted,
  malformedCompleted,
  malformedInvalid,
  expectedInvalidMarker: 'cnc_study_completed_v1:entry',
  source: 'cnc/training-achievements.html'
};
fs.writeFileSync(path.join(artifactDir, 'completion-integrity-contract.json'), JSON.stringify(report, null, 2));

assert.deepEqual(malformedCompleted, [1, 2], '纯数字字符串、越界与负数不得抬高课程完成数');
assert.ok(
  malformedInvalid.includes('cnc_study_completed_v1:entry'),
  'canonical 数组中出现非法课程完成项时，成长成果必须标记数据异常，不能静默忽略后继续生成个性化路线'
);

console.log('成长成果 canonical 课程完成项完整性契约通过', report);
