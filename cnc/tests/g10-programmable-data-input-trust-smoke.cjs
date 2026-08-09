const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '../..');
const aliasesPath = path.join(root, 'cnc/search-aliases.js');
const gmPath = path.join(root, 'cnc/gm-code-complete.js');
const indexPath = path.join(root, 'cnc/index.html');
const aliasesText = fs.readFileSync(aliasesPath, 'utf8');
const gmText = fs.readFileSync(gmPath, 'utf8');
const indexText = fs.readFileSync(indexPath, 'utf8');
const errors = [];

for (const token of [
  'G/M 代码目录来自大批量生成的基础表',
  '只修正会直接改写机床数据的 G10 教学边界',
  '当前CNC/机床厂原厂手册',
  '备份原数据',
  '授权人员确认',
  'G90/G91下的绝对或增量解释',
  '教学示例不能直接拿到真实机床执行'
]) {
  if (!aliasesText.includes(token)) errors.push(`G10安全归一化器缺少可信度边界：${token}`);
}

const aliasPos = indexText.indexOf('<script src="./search-aliases.js"></script>');
const gmPos = indexText.indexOf('<script src="./gm-code-complete.js"></script>');
if (aliasPos < 0 || gmPos < 0 || aliasPos >= gmPos) {
  errors.push('首页脚本顺序异常：G10安全归一化器必须在gm-code-complete.js之前加载');
}

const sandbox = { window: {}, console: { log() {}, warn() {}, error() {} } };
vm.createContext(sandbox);
try {
  vm.runInContext(aliasesText, sandbox, { filename: 'search-aliases.js' });
  vm.runInContext(gmText, sandbox, { filename: 'gm-code-complete.js' });
} catch (error) {
  errors.push(`G/M代码运行时目录无法加载：${error.message}`);
}

const guard = sandbox.window.CNC_GM_CONTENT_SAFETY;
if (!guard || guard.version !== 'g10-boundary-1') errors.push('G10内容安全归一化器未安装或版本异常');
const catalog = sandbox.window.CNC_GM_CODES;
const g10 = Array.isArray(catalog) ? catalog.find(item => item && item.id === 'kb-gcode-g10') : null;
if (!g10) {
  errors.push('运行时G10知识条目缺失');
} else {
  const text = JSON.stringify(g10);
  for (const token of [
    '当前控制器支持的数据',
    '取决于CNC系统和机床厂配置',
    '当前是绝对还是增量解释',
    'G90/G91',
    '原厂手册',
    '备份原数据',
    '授权人员确认',
    '教学示例不能直接拿到真实机床执行',
    '部分明确支持该格式的控制系统',
    '未确认前不要上机执行'
  ]) {
    if (!text.includes(token)) errors.push(`运行时G10条目缺少安全边界：${token}`);
  }
  for (const forbidden of [
    'G10 L2 P1 X100. Y50. 表示写入G54坐标偏置。',
    'G10 L2 P1一定表示G54',
    '所有FANUC都可直接使用G10 L2 P1',
    '不需要核对原厂手册'
  ]) {
    if (text.includes(forbidden)) errors.push(`运行时G10条目仍含无适用范围表述：${forbidden}`);
  }
  if (g10.risk !== '高') errors.push(`G10风险等级被降低：${g10.risk}`);
}

// 基础目录目前仍保留历史生成文本，因此门禁同时锁定：标准页面必须先加载安全归一化器，
// 且最终暴露给用户的运行时条目不得保留旧的无适用范围结论。
if (!gmText.includes('"id": "kb-gcode-g10"')) errors.push('基础G/M目录缺少G10条目');

if (errors.length) {
  console.error('CNC G10可编程数据写入可信度门禁失败：');
  errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}

console.log('CNC G10可编程数据写入可信度门禁通过：G10被明确限定为控制器相关的高风险数据写入，真实机床必须核对原厂手册、备份并由授权人员确认。');
