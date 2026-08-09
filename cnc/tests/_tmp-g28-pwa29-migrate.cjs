const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const changed = new Set();

function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function write(rel, text) {
  const file = path.join(root, rel);
  const old = fs.readFileSync(file, 'utf8');
  if (old !== text) {
    fs.writeFileSync(file, text);
    changed.add(rel);
  }
}
function requireToken(text, token, rel) {
  if (!text.includes(token)) throw new Error(`${rel} 缺少预期基线：${token}`);
}
function replaceAllChecked(text, from, to, rel, required = false) {
  if (required) requireToken(text, from, rel);
  return text.split(from).join(to);
}
function migratePins(text) {
  const pairs = [
    ['20260809-pwa28', '__CUR_PWA__'], ['20260809-learning28', '__CUR_LEARN__'],
    ['20260809-pwa27', '__PREV_PWA__'], ['20260809-learning27', '__PREV_LEARN__'],
    ['PWA28', '__CUR_LABEL__'], ['PWA27', '__PREV_LABEL__']
  ];
  for (const [from, to] of pairs) text = text.split(from).join(to);
  return text
    .split('__CUR_PWA__').join('20260809-pwa29')
    .split('__CUR_LEARN__').join('20260809-learning29')
    .split('__PREV_PWA__').join('20260809-pwa28')
    .split('__PREV_LEARN__').join('20260809-learning28')
    .split('__CUR_LABEL__').join('PWA29')
    .split('__PREV_LABEL__').join('PWA28');
}

// 1) 直接修正基础G/M目录，不能依赖运行时覆盖掩盖危险旧文案。
{
  const rel = 'cnc/gm-code-complete.js';
  let text = read(rel);
  requireToken(text, '自动返回机床参考点。常配合G91 Z0先回Z，减少撞机。', rel);
  text = replaceAllChecked(text,
    '自动返回机床参考点。常配合G91 Z0先回Z，减少撞机。',
    '自动返回机床参考点，属于高风险自动运动。G90/G91下中间位置的绝对或增量解释、返回轴方向与顺序、参考点状态及安全路径取决于当前CNC和机床厂配置；执行前必须核对原厂手册，确认刀具、刀柄、工件、夹具在完整计划运动空间内都有安全间隙，并按现场授权操作规程验证。不要把“G91 G28 Z0”或“先Z后XY”当成通用防撞规则。', rel);
  text = text.split('G91 G28 Z0').join('G28（教学格式示意；实际格式与安全路径以本机原厂手册为准）');
  text = text.split('G28 会触发机床按控制系统规则返回参考点，过程中通常包含中间点。').join('G28属于高风险自动运动；是否经过中间位置、各轴运动方向与顺序，以及参考点状态的处理方式取决于当前CNC和机床厂配置。');
  text = text.split('增量方式下执行参考点返回。').join('G90/G91会影响中间位置的绝对或增量解释；具体语义必须核对当前CNC和机床厂原厂手册。');
  text = text.split('建议先抬 Z 轴，再返回其他轴').join('不要把固定“先Z后XY”顺序当成通用防撞规则；应按本机原厂手册、现场工艺和授权操作规程确认安全撤离方向、轴顺序与中间位置');
  text = text.split('建议先抬Z轴，再返回其他轴').join('不要把固定“先Z后XY”顺序当成通用防撞规则；应按本机原厂手册、现场工艺和授权操作规程确认安全撤离方向、轴顺序与中间位置');
  if (!text.includes('完整计划运动空间')) throw new Error('G28基础源未写入完整计划运动空间安全边界');
  if (text.includes('常配合G91 Z0先回Z，减少撞机') || text.includes('建议先抬 Z 轴，再返回其他轴')) throw new Error('G28危险旧文案仍存在');
  write(rel, text);
}

// 2) 增加运行时第二层G28安全归一化，保留G10既有保护。
{
  const rel = 'cnc/search-aliases.js';
  let text = read(rel);
  requireToken(text, 'function normalizeCatalog(value) {', rel);
  requireToken(text, 'return value.map(normalizeG10);', rel);
  requireToken(text, "version: 'g10-boundary-1'", rel);
  const g28Fn = `  function normalizeG28(entry) {\n    if (!entry || entry.id !== 'kb-gcode-g28') return entry;\n    return Object.assign({}, entry, {\n      summary: 'G28用于自动返回机床参考点，属于高风险自动运动；中间位置、轴向、顺序和参考点状态的处理取决于当前CNC和机床厂配置。',\n      usage: '只有在已经按本机原厂手册确认G90/G91解释、参考点状态、安全撤离方向和完整运动路径后，才可按现场授权操作规程受控使用。',\n      beginner: '把G28理解成“会让机床自动运动到参考点的高风险指令”，不要把G91 G28 Z0或固定先Z后XY当成防撞口诀。',\n      warning: 'G90/G91会影响中间位置的绝对或增量解释；各轴方向与顺序、参考点状态和安全路径还会受控制系统与机床厂配置影响。执行前必须核对当前CNC和机床厂原厂手册、现场工艺和授权操作规程，并确认刀具、刀柄、工件、夹具在完整计划运动空间内都有安全间隙。',\n      example: '教学格式示意：某些常见控制配置可见G91 G28 Z0，但这不能作为防撞保证；真实格式、中间位置与安全路径必须逐项以本机原厂手册为准，并先做受控验证。',\n      risk: '高',\n      tags: ['G28', '参考点返回', '高风险自动运动', 'G90/G91', '原厂手册', '授权操作']\n    });\n  }\n\n`;
  text = text.replace('  function normalizeCatalog(value) {', g28Fn + '  function normalizeCatalog(value) {');
  text = text.replace('return value.map(normalizeG10);', 'return value.map(function (entry) { return normalizeG28(normalizeG10(entry)); });');
  text = text.replace("version: 'g10-boundary-1',", "version: 'g10-g28-boundary-2',");
  text = text.replace('normalizeG10: normalizeG10,\n    normalizeCatalog:', 'normalizeG10: normalizeG10,\n    normalizeG28: normalizeG28,\n    normalizeCatalog:');
  write(rel, text);
}

// 3) 正规升级PWA29/learning29，并保留build-info全部既有元数据。
{
  const rel = 'cnc/build-info.json';
  const info = JSON.parse(read(rel));
  if (info.pwaBuild !== '20260809-pwa28' || info.cacheRevision !== '20260809-learning28') throw new Error('build-info不是预期PWA28基线');
  info.build = '20260809-pwa29';
  info.pwaBuild = '20260809-pwa29';
  info.cacheRevision = '20260809-pwa29';
  info.learningBuild = '20260809-learning29';
  if (!String(info.contentStage || '').includes('G28参考点返回适用范围')) info.contentStage += '+G28参考点返回适用范围';
  info.generatedAt = '2026-08-09T15:30:00+08:00';
  write(rel, JSON.stringify(info, null, 2) + '\n');
}

// 4) 迁移Service Worker、PWA状态/自检和学习媒体进度。
for (const rel of ['cnc/sw.js', 'cnc/pwa-status.html', 'cnc/pwa-self-test.html', 'cnc/MOBILE_LEARNING_MEDIA_PROGRESS.md']) {
  let text = read(rel);
  text = migratePins(text);
  if ((rel.endsWith('.html') || rel.endsWith('.md')) && !text.includes('G28参考点返回适用范围')) {
    const note = rel.endsWith('.md')
      ? '\n\n## G28参考点返回适用范围\nG28 属于高风险自动运动。G90/G91 下中间位置的绝对或增量解释、参考点状态、轴方向与顺序以及安全路径必须核对当前 CNC 和机床厂原厂手册；执行前确认刀具、刀柄、工件、夹具在完整计划运动空间内都有安全间隙，并按现场工艺和授权操作规程验证。不要把 `G91 G28 Z0` 或固定“先Z后XY”当成通用防撞规则。\n'
      : '<p class="pwa-note" data-contract="g28-reference-return-boundary"><strong>G28参考点返回适用范围：</strong>G28 属于高风险自动运动；G90/G91 下中间位置的绝对或增量解释、参考点状态、轴方向与顺序及安全路径必须核对当前 CNC 和机床厂原厂手册，并确认刀具、刀柄、工件、夹具在完整计划运动空间内都有安全间隙，按现场工艺和授权操作规程验证。不要把 G91 G28 Z0 或固定“先Z后XY”当成通用防撞规则。</p>';
    if (rel.endsWith('.md')) text += note;
    else if (text.includes('</main>')) text = text.replace('</main>', `${note}\n</main>`);
    else if (text.includes('</body>')) text = text.replace('</body>', `${note}\n</body>`);
    else throw new Error(`${rel} 找不到安全插入点`);
  }
  write(rel, text);
}

// 5) 所有CNC主动测试/工作流把当前PWA28→PWA29、上一正式PWA27→PWA28；不触碰其它目录。
function walk(dir, filter) {
  const abs = path.join(root, dir);
  for (const name of fs.readdirSync(abs)) {
    const rel = path.posix.join(dir, name);
    const stat = fs.statSync(path.join(root, rel));
    if (stat.isDirectory()) walk(rel, filter);
    else if (filter(rel)) {
      let text = read(rel);
      const migrated = migratePins(text);
      if (migrated !== text) write(rel, migrated);
    }
  }
}
walk('cnc/tests', rel => rel.endsWith('.cjs') && !rel.endsWith('_tmp-g28-pwa29-migrate.cjs'));
walk('.github/workflows', rel => /^\.github\/workflows\/cnc-.*\.ya?ml$/.test(rel) && !rel.endsWith('cnc-g28-pwa29-migrate-tmp.yml'));

// G10可信度保护版本随G28安全层扩展，但G10断言本身不得降低。
{
  const rel = 'cnc/tests/g10-programmable-data-input-trust-smoke.cjs';
  let text = read(rel);
  text = text.split("guard.version !== 'g10-boundary-1'").join("guard.version !== 'g10-g28-boundary-2'");
  write(rel, text);
}

// 6) 冷离线测试必须真正覆盖G28语义；只在既有离线测试中增加严格源/运行时契约，不删除旧断言。
{
  const rel = 'cnc/tests/mobile-pwa-offline-cache-smoke.cjs';
  let text = read(rel);
  if (!text.includes('G28参考点返回离线可信边界')) {
    text += `\n// G28参考点返回离线可信边界：首次安装核心中的G/M目录即使断网也不能回退为防撞口诀。\n(function assertG28OfflineContractSource() {\n  const gm = fs.readFileSync(path.join(root, 'cnc/gm-code-complete.js'), 'utf8');\n  for (const token of ['高风险自动运动','G90/G91','原厂手册','刀具','刀柄','工件','夹具','完整计划运动空间','授权操作规程']) {\n    if (!gm.includes(token)) throw new Error('G28参考点返回离线可信边界缺少：' + token);\n  }\n  for (const forbidden of ['常配合G91 Z0先回Z，减少撞机','建议先抬 Z 轴，再返回其他轴','必须先Z后XY']) {\n    if (gm.includes(forbidden)) throw new Error('G28离线核心仍含无适用范围防撞表述：' + forbidden);\n  }\n})();\n`;
  }
  write(rel, text);
}

console.log('G28/PWA29迁移完成，修改文件：');
for (const rel of [...changed].sort()) console.log(rel);
if (![...changed].some(rel => rel === 'cnc/gm-code-complete.js')) throw new Error('未修改G28基础源');
if (![...changed].some(rel => rel === 'cnc/sw.js')) throw new Error('未升级Service Worker');
