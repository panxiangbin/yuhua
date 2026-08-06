'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..');
const OUTPUT_DIR = path.join(ROOT, 'cnc', 'test-results', 'learning-sublesson-specificity');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'report.json');

const STAGE_TERMS = {
  1: ['急停', '授权', '运动通道'],
  2: ['主轴', '刀库', '原厂结构图'],
  3: ['坐标系', '参考点', '轴选择'],
  4: ['基准', '量具', '公差'],
  5: ['工件坐标系', '偏置', '独立复核'],
  6: ['定位', '夹紧', '运动包络'],
  7: ['刀柄', '伸出量', '刀具厂家资料'],
  8: ['H号', '刀长数据', '安全高度'],
  9: ['G90/G91', 'G94/G95', 'G00路径'],
  10: ['加工平面', 'I/J/K', '受控试切'],
  11: ['R平面', 'G98/G99', 'G80'],
  12: ['程序版本', '首件', '授权放行']
};

const FORBIDDEN_GENERIC = [
  '先在停机或受控状态下辨认',
  '只看一个画面、一个数值或一次动作便判断已经正确',
  '未完成复核便直接进入自动运行或连续加工'
];

function fail(message) {
  throw new Error(message);
}

function loadScript(file, context) {
  const source = fs.readFileSync(path.join(ROOT, file), 'utf8');
  new vm.Script(source, { filename: file }).runInContext(context);
}

function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const context = vm.createContext({ window: {} });
  loadScript('cnc/learning-sublesson-catalog.js', context);
  loadScript('cnc/learning-sublesson-specificity.js', context);

  const catalog = context.window.CNC_LEARNING_SUBLESSONS;
  if (!catalog) fail('80课目录未加载');
  if (catalog.totalSublessons !== 80) fail(`80课数量异常：${catalog.totalSublessons}`);
  if (catalog.specificityVersion !== '20260806-specificity1') fail(`针对性版本异常：${catalog.specificityVersion}`);

  const lessons = [];
  const stageReports = [];
  const actionSignatures = new Set();
  const errorSignatures = new Set();

  for (let stage = 1; stage <= 12; stage += 1) {
    const items = catalog.stages[String(stage)];
    if (!Array.isArray(items) || items.length < 6) fail(`第${stage}关小课结构异常`);
    const expectedTerms = STAGE_TERMS[stage];
    const stageCombined = [];

    for (const item of items) {
      if (item.specificityVersion !== catalog.specificityVersion) fail(`${item.id} 缺少针对性版本`);
      if (!Array.isArray(item.actions) || item.actions.length !== 3) fail(`${item.id} 现场动作必须恰好3项`);
      if (!Array.isArray(item.errors) || item.errors.length !== 3) fail(`${item.id} 高风险错误必须恰好3项`);
      if (!item.actions.every(text => typeof text === 'string' && text.trim().length >= 12)) fail(`${item.id} 现场动作过短或为空`);
      if (!item.errors.every(text => typeof text === 'string' && text.trim().length >= 12)) fail(`${item.id} 高风险错误过短或为空`);
      if (!item.actions.some(text => text.includes(item.title))) fail(`${item.id} 现场动作未对应课程标题`);
      if (FORBIDDEN_GENERIC.some(token => [...item.actions, ...item.errors].some(text => text.includes(token)))) fail(`${item.id} 仍使用旧通用模板`);
      if (!String(item.safety || '').includes('机床说明书') || !String(item.safety || '').includes('现场工艺') || !String(item.safety || '').includes('空运行验证')) fail(`${item.id} 安全边界缺失`);

      const combined = [...item.actions, ...item.errors].join('｜');
      stageCombined.push(combined);
      actionSignatures.add(item.actions.join('｜'));
      errorSignatures.add(item.errors.join('｜'));
      lessons.push({ id: item.id, stage, title: item.title, actions: item.actions, errors: item.errors, terms: item.specificityTerms });
    }

    const stageText = stageCombined.join('｜');
    const missingTerms = expectedTerms.filter(term => !stageText.includes(term));
    if (missingTerms.length) fail(`第${stage}关缺少主题词：${missingTerms.join('、')}`);
    stageReports.push({ stage, lessonCount: items.length, expectedTerms, missingTerms });
  }

  if (actionSignatures.size !== 80) fail(`现场动作签名应覆盖80个小课，实际${actionSignatures.size}`);
  if (errorSignatures.size < 12) fail(`高风险错误至少应形成12组关卡主题，实际${errorSignatures.size}`);

  const detail = fs.readFileSync(path.join(ROOT, 'cnc', 'learning-detail.html'), 'utf8');
  const catalogIndex = detail.indexOf('./learning-sublesson-catalog.js');
  const specificityIndex = detail.indexOf('./learning-sublesson-specificity.js');
  const renderIndex = detail.indexOf("const params=new URLSearchParams");
  if (catalogIndex < 0 || specificityIndex < 0 || renderIndex < 0) fail('小课详情缺少目录、针对性脚本或渲染逻辑');
  if (!(catalogIndex < specificityIndex && specificityIndex < renderIndex)) fail('针对性脚本必须在目录之后、详情渲染之前加载');

  const sw = fs.readFileSync(path.join(ROOT, 'cnc', 'sw.js'), 'utf8');
  const selfTest = fs.readFileSync(path.join(ROOT, 'cnc', 'pwa-self-test.html'), 'utf8');
  for (const source of [sw, selfTest]) {
    if (!source.includes('./learning-sublesson-specificity.js')) fail('PWA核心清单缺少针对性脚本');
  }

  const report = {
    generatedAt: new Date().toISOString(),
    commitSha: process.env.GITHUB_SHA || null,
    passed: true,
    specificityVersion: catalog.specificityVersion,
    totalSublessons: lessons.length,
    uniqueActionSignatures: actionSignatures.size,
    uniqueErrorSignatures: errorSignatures.size,
    stageReports,
    sampleLessons: [lessons[0], lessons[19], lessons[50], lessons[79]]
  };
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2));
  console.log(`CNC 80课针对性门禁通过：${lessons.length}课，现场动作${actionSignatures.size}组，高风险错误${errorSignatures.size}组。`);
}

try {
  main();
} catch (error) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUTPUT_DIR, 'error.txt'), String(error && error.stack ? error.stack : error));
  console.error(error);
  process.exitCode = 1;
}
