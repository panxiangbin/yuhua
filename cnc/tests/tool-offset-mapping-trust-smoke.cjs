const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '../..');
const learningPath = path.join(root, 'cnc/learning-content-data.js');
const gmPath = path.join(root, 'cnc/gm-code-complete.js');
const learningText = fs.readFileSync(learningPath, 'utf8');
const gmText = fs.readFileSync(gmPath, 'utf8');
const errors = [];

for (const token of [
  'T/H 数字相同是常见约定，不是所有机床都必须遵守的硬规则',
  '不能仅凭 T01 M06 后使用 G43 H02 就直接判错',
  '不要先假定 H 号必须与 T 号数字相同',
  '当前 CNC/机床厂原厂手册、现场工具表和刀补表',
  '真正的安全判断是 Hxx 数据是否与当前实际刀具正确关联'
]) {
  if (!learningText.includes(token)) errors.push(`第5关缺少刀长补偿映射边界：${token}`);
}

for (const forbidden of [
  "title: 'T01 调刀却使用 H02'",
  "symptom: '机床按另一把刀的长度计算刀尖位置。'",
  "desc: '用连线表明 T01、H01 与对应刀长数据的关系。'",
  'H号必须与T号数字相同',
  'T01+H02一定错误'
]) {
  if (learningText.includes(forbidden)) errors.push(`第5关仍残留无适用范围的T/H绝对化表述：${forbidden}`);
}

if (!gmText.includes('"id": "kb-gcode-g43"')) errors.push('G43知识条目缺失');
for (const forbidden of ['T号必须和H号数字相同', 'T号必须与H号数字相同', 'T01配H02一定错误']) {
  if (gmText.includes(forbidden)) errors.push(`G/M代码库出现T/H数字强绑定表述：${forbidden}`);
}

const sandbox = { window: {}, console: { log() {} } };
vm.createContext(sandbox);
try {
  vm.runInContext(learningText, sandbox, { filename: 'learning-content-data.js' });
} catch (error) {
  errors.push(`12关课程脚本无法加载：${error.message}`);
}

const lesson = sandbox.window.CNC_LEARNING_CONTENT && sandbox.window.CNC_LEARNING_CONTENT.getLesson(5);
if (!lesson) {
  errors.push('无法读取第5关结构化课程');
} else {
  if (!String(lesson.teacherTip || '').includes('常见约定')) errors.push('第5关教师提示没有说明T/H同号仅是常见约定');
  if (!Array.isArray(lesson.errors) || !lesson.errors.some(item => String(item.title).includes('强制绑定'))) errors.push('第5关错误案例没有覆盖T/H数字强绑定误区');
  if (!Array.isArray(lesson.quizzes) || !lesson.quizzes.length) errors.push('第5关题目缺失');
  const mappingQuiz = lesson.quizzes.find(item => item.id === 'l5q1');
  if (!mappingQuiz) {
    errors.push('第5关缺少T01/H02映射判断题');
  } else {
    if (mappingQuiz.answer !== 1) errors.push(`T01/H02映射题答案异常：${mappingQuiz.answer}`);
    if (!String(mappingQuiz.options && mappingQuiz.options[1] || '').includes('工具表/刀补表')) errors.push('T01/H02映射题正确选项没有要求核对工具表/刀补表');
    if (!String(mappingQuiz.explanation || '').includes('原厂手册')) errors.push('T01/H02映射题解析没有要求核对原厂手册');
  }
}

if (errors.length) {
  console.error('CNC T/H刀长补偿映射可信度门禁失败：');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('CNC T/H刀长补偿映射可信度门禁通过：不把T/H数字相同当通用规则，T01+H02需按真实工具表和原厂规则判断。');
