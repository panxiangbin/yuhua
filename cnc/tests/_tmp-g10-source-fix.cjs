const fs = require('fs');
const path = require('path');

const cncRoot = path.resolve(__dirname, '..');
const changed = [];

function read(rel) {
  return fs.readFileSync(path.join(cncRoot, rel), 'utf8');
}

function write(rel, text) {
  fs.writeFileSync(path.join(cncRoot, rel), text, 'utf8');
  if (!changed.includes(rel)) changed.push(rel);
}

function replaceOnce(rel, before, after, label) {
  let text = read(rel);
  if (text.includes(after)) return false;
  const count = text.split(before).length - 1;
  if (count !== 1) throw new Error(`${rel} ${label}预期出现1次，实际${count}次，拒绝模糊替换。`);
  text = text.replace(before, after);
  write(rel, text);
  return true;
}

function replaceAllExpected(rel, before, after, expectedCount, label) {
  let text = read(rel);
  if (text.includes(after) && !text.includes(before)) return false;
  const count = text.split(before).length - 1;
  if (count !== expectedCount) throw new Error(`${rel} ${label}预期出现${expectedCount}次，实际${count}次，拒绝不确定替换。`);
  text = text.split(before).join(after);
  write(rel, text);
  return true;
}

// 1) 直接修正 G10 基础目录，不再只依赖运行时覆盖。
{
  const rel = 'gm-code-complete.js';
  let text = read(rel);
  const oldBlock = `    "summary": "用程序写入工件坐标、刀补、参数等数据。",
    "usage": "批量设置G54、刀具补偿、夹具偏置时使用。",
    "beginner": "G10很强，也很危险，因为它会改机床数据。",
    "warning": "写错坐标系或刀补号会让后续程序整体偏移，必须备份原数据。",
    "example": "G10 L2 P1 X100. Y50. 表示写入G54坐标偏置。",
    "risk": "高",
    "tags": [
      "G10",
      "坐标写入",
      "刀补",
      "参数"
    ]`;
  const newBlock = `    "summary": "G10可在程序中写入工件坐标、刀具补偿或其它受当前控制器支持的数据；可写对象与格式取决于CNC系统和机床厂配置。",
    "usage": "仅在已经确认本机支持的G10格式、目标数据区、写入方式与权限后，用于受控设置或批量初始化。",
    "beginner": "把G10理解成会改机床数据的写入指令。先确认写什么、写到哪里、当前是绝对还是增量解释，再考虑是否允许执行。",
    "warning": "L/P/轴地址、可写对象、G90/G91下的绝对或增量解释以及写入权限会因控制系统和机床厂配置不同而变化。执行前必须核对当前CNC/机床厂原厂手册和现场工艺，备份原数据，并由授权人员确认；教学示例不能直接拿到真实机床执行。",
    "example": "教学示例：在部分明确支持该格式的控制系统中，G10 L2 P1 ... 可用于工件坐标相关数据写入；L2、P1、轴地址以及G90/G91下的解释必须逐项以本机原厂手册为准。未确认前不要上机执行。",
    "risk": "高",
    "tags": [
      "G10",
      "可编程数据输入",
      "坐标写入",
      "刀补",
      "原厂手册",
      "授权操作"
    ]`;
  const g10Ids = (text.match(/"id": "kb-gcode-g10"/g) || []).length;
  if (g10Ids !== 1) throw new Error(`G10源目录条目数量异常：${g10Ids}，拒绝自动修改。`);
  if (!text.includes(newBlock)) {
    const oldOccurrences = text.split(oldBlock).length - 1;
    if (oldOccurrences !== 1) throw new Error(`预期旧G10块出现次数应为1，实际为${oldOccurrences}，拒绝模糊替换。`);
    text = text.replace(oldBlock, newBlock);
    if (text.includes('G10 L2 P1 X100. Y50. 表示写入G54坐标偏置。')) throw new Error('旧的无适用范围G10示例仍然存在。');
    write(rel, text);
  }
}

// 2) 真实门禁日志指出的六处 PWA27 主动构建针，精确迁移到 PWA28。
replaceOnce('tests/mobile-pwa-offline-cache-smoke.cjs',
  "const PWA_BUILD = '20260809-pwa27';\nconst CACHE_REVISION = '20260809-learning27';",
  "const PWA_BUILD = '20260809-pwa28';\nconst CACHE_REVISION = '20260809-learning28';",
  '冷离线当前构建针');
replaceOnce('tests/mobile-pwa-profile-bfcache-smoke.cjs',
  "const PWA_BUILD = '20260809-pwa27';\nconst CACHE_REVISION = '20260809-learning27';",
  "const PWA_BUILD = '20260809-pwa28';\nconst CACHE_REVISION = '20260809-learning28';",
  'BFCache当前构建针');
replaceOnce('tests/mobile-pwa-upgrade-data-smoke.cjs',
  "const CURRENT_PWA_BUILD = '20260809-pwa27';\nconst PREVIOUS_PWA_BUILD = '20260809-pwa26';\nconst CURRENT_CACHE_REVISION = '20260809-learning27';\nconst PREVIOUS_CACHE_REVISION = '20260809-learning26';",
  "const CURRENT_PWA_BUILD = '20260809-pwa28';\nconst PREVIOUS_PWA_BUILD = '20260809-pwa27';\nconst CURRENT_CACHE_REVISION = '20260809-learning28';\nconst PREVIOUS_CACHE_REVISION = '20260809-learning27';",
  '升级数据当前/上一构建针');
replaceOnce('tests/mobile-pwa-upgrade-data-smoke.cjs',
  "const TRAINING_CORE_PATHS = ['./training-practice.js', './training-profile.js', './learning-content-data.js'];",
  "const TRAINING_CORE_PATHS = ['./training-practice.js', './training-profile.js', './search-aliases.js', './gm-code-complete.js', './learning-content-data.js'];",
  '升级后核心缓存清单');
replaceOnce('tests/mobile-pwa-upgrade-data-smoke.cjs',
  "source: 'pwa26'",
  "source: 'pwa27'",
  '升级前IndexedDB来源标记');

for (const rel of [
  'tests/pages-ai-teacher-offline-core-deployment-smoke.cjs',
  'tests/pages-beginner-placement-offline-deployment-smoke.cjs'
]) {
  replaceOnce(rel,
    "const branchTargetPwaBuild = '20260809-pwa27';\nconst previousPublicPwaBuild = '20260809-pwa26';",
    "const branchTargetPwaBuild = '20260809-pwa28';\nconst previousPublicPwaBuild = '20260809-pwa27';",
    'Pages当前/上一PWA构建针');
  replaceOnce(rel,
    "[branchTargetPwaBuild]: '20260809-learning27',\n  [previousPublicPwaBuild]: '20260809-learning26'",
    "[branchTargetPwaBuild]: '20260809-learning28',\n  [previousPublicPwaBuild]: '20260809-learning27'",
    'Pages缓存修订映射');
}
replaceOnce('tests/pages-training-camp-route-handoff-deployment-smoke.cjs',
  "const expectedPwaBuild = '20260809-pwa27';\nconst previousPublicSiteBuild = '20260806-learning-depth1';\nconst previousPublicPwaBuild = '20260809-pwa26';",
  "const expectedPwaBuild = '20260809-pwa28';\nconst previousPublicSiteBuild = '20260806-learning-depth1';\nconst previousPublicPwaBuild = '20260809-pwa27';",
  '训练营Pages当前/上一PWA构建针');
replaceOnce('tests/pages-training-camp-route-handoff-deployment-smoke.cjs',
  "[expectedPwaBuild]: '20260809-learning27',\n  [previousPublicPwaBuild]: '20260809-learning26'",
  "[expectedPwaBuild]: '20260809-learning28',\n  [previousPublicPwaBuild]: '20260809-learning27'",
  '训练营Pages缓存修订映射');

// 3) PWA28 新增 G/M 可信目录，冷离线与 Pages exact-core 都必须真正验证它们。
replaceOnce('tests/mobile-pwa-offline-cache-smoke.cjs',
  "  './training-practice.js',\n  './training-profile.js',\n  './learning-content-data.js',",
  "  './training-practice.js',\n  './training-profile.js',\n  './search-aliases.js',\n  './gm-code-complete.js',\n  './learning-content-data.js',",
  '冷离线G/M核心清单');
replaceOnce('tests/mobile-pwa-offline-cache-smoke.cjs',
  "    stage = 'cold-offline-beginner-placement';\n    await context.setOffline(true);\n\n    stage = 'cold-offline-video-core';",
  `    stage = 'cold-offline-beginner-placement';
    await context.setOffline(true);

    stage = 'cold-offline-g10-directory';
    const offlineGmTrust = await page.evaluate(async () => {
      const [aliasResponse, gmResponse] = await Promise.all([
        fetch('./search-aliases.js'),
        fetch('./gm-code-complete.js')
      ]);
      return {
        aliasesOk: aliasResponse.ok,
        gmOk: gmResponse.ok,
        aliasesText: await aliasResponse.text(),
        gmText: await gmResponse.text()
      };
    });
    if (!offlineGmTrust.aliasesOk || !offlineGmTrust.gmOk) throw new Error('G/M可信目录首次安装后冷离线读取失败');
    for (const token of ['取决于CNC系统和机床厂配置', 'G90/G91下的绝对或增量解释', '原厂手册', '备份原数据', '授权人员确认', '未确认前不要上机执行']) {
      if (!offlineGmTrust.gmText.includes(token)) throw new Error(\`G10冷离线源目录缺少安全边界：\${token}\`);
    }
    if (offlineGmTrust.gmText.includes('G10 L2 P1 X100. Y50. 表示写入G54坐标偏置。')) throw new Error('G10冷离线源目录仍含无适用范围旧示例');
    if (!offlineGmTrust.aliasesText.includes('CNC_SEARCH_ALIASES')) throw new Error('冷离线搜索别名目录内容异常');

    stage = 'cold-offline-video-core';`,
  'G10冷离线实读门禁');

replaceOnce('tests/pages-ai-teacher-offline-core-deployment-smoke.cjs',
  "  './training-practice.js',\n  './training-profile.js',\n  './learning-content-data.js',",
  "  './training-practice.js',\n  './training-profile.js',\n  './search-aliases.js',\n  './gm-code-complete.js',\n  './learning-content-data.js',",
  'AI Pages G/M exact-core');
replaceOnce('tests/pages-ai-teacher-offline-core-deployment-smoke.cjs',
  'const PREVIOUS_PUBLIC_CORE_PATHS = EXACT_CORE_PATHS;',
  "const PREVIOUS_PUBLIC_CORE_PATHS = EXACT_CORE_PATHS.filter(item => !['./search-aliases.js', './gm-code-complete.js'].includes(item));",
  'AI Pages上一正式核心兼容');

for (const rel of [
  'tests/pages-beginner-placement-offline-deployment-smoke.cjs',
  'tests/pages-training-camp-route-handoff-deployment-smoke.cjs'
]) {
  replaceOnce(rel,
    "'./training-practice.js','./training-profile.js','./learning-content-data.js'",
    "'./training-practice.js','./training-profile.js','./search-aliases.js','./gm-code-complete.js','./learning-content-data.js'",
    'Pages G/M exact-core');
  replaceOnce(rel,
    'const PREVIOUS_PUBLIC_CORE_PATHS = EXACT_CORE;',
    "const PREVIOUS_PUBLIC_CORE_PATHS = EXACT_CORE.filter(item => !['./search-aliases.js', './gm-code-complete.js'].includes(item));",
    'Pages上一正式核心兼容');
}

console.log(`PWA28精确迁移完成，实际修改文件：${changed.join('、') || '无（已是目标状态）'}`);
