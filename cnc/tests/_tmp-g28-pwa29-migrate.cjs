const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const changed = new Set();
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function write(rel, text) { const file = path.join(root, rel); const old = fs.readFileSync(file, 'utf8'); if (old !== text) { fs.writeFileSync(file, text); changed.add(rel); } }
function requireToken(text, token, rel) { if (!text.includes(token)) throw new Error(`${rel} 缺少预期基线：${token}`); }
function migrateBuildPins(text) {
  return text
    .split('20260809-pwa28').join('__CUR_PWA__')
    .split('20260809-learning28').join('__CUR_LEARN__')
    .split('20260809-pwa27').join('__PREV_PWA__')
    .split('20260809-learning27').join('__PREV_LEARN__')
    .split('__CUR_PWA__').join('20260809-pwa29')
    .split('__CUR_LEARN__').join('20260809-learning29')
    .split('__PREV_PWA__').join('20260809-pwa28')
    .split('__PREV_LEARN__').join('20260809-learning28');
}

{
  const rel = 'cnc/gm-code-complete.js';
  let text = read(rel);
  const baseline = [
    '"summary": "经中间点自动返回机床参考点。"',
    '"beginner": "G28常配合G91 Z0先回Z，减少撞机。"',
    '"warning": "绝对/增量模式写错会导致先跑到危险中间点。"',
    '"example": "G91 G28 Z0 表示Z轴以增量方式返回参考点。"'
  ];
  baseline.forEach(token => requireToken(text, token, rel));
  text = text.replace('"summary": "经中间点自动返回机床参考点。"', '"summary": "自动返回机床参考点，属于高风险自动运动；中间位置、轴向、顺序和参考点状态的处理取决于当前CNC和机床厂配置。"');
  text = text.replace('"usage": "换刀、结束加工、建立机床基准时使用。"', '"usage": "仅在已按本机原厂手册确认G90/G91解释、参考点状态、安全撤离方向和完整运动路径后，按现场工艺与授权操作规程受控使用。"');
  text = text.replace('"beginner": "G28常配合G91 Z0先回Z，减少撞机。"', '"beginner": "把G28理解成会触发自动参考点返回的高风险运动；不要把G91 G28 Z0或固定“先Z后XY”当成通用防撞规则。"');
  text = text.replace('"warning": "绝对/增量模式写错会导致先跑到危险中间点。"', '"warning": "G90/G91会影响中间位置的绝对或增量解释；各轴方向与顺序、参考点状态和安全路径还受控制系统与机床厂配置影响。执行前必须核对当前CNC和机床厂原厂手册，确认刀具、刀柄、工件、夹具在完整计划运动空间内都有安全间隙，并按现场工艺和授权操作规程验证。"');
  text = text.replace('"example": "G91 G28 Z0 表示Z轴以增量方式返回参考点。"', '"example": "教学格式示意：某些常见控制配置可见G91 G28 Z0，但这不能作为防撞保证；真实格式、中间位置与安全路径必须逐项以本机原厂手册为准，并先做受控验证。"');
  for (const forbidden of ['G28常配合G91 Z0先回Z，减少撞机。','G91 G28 Z0 表示Z轴以增量方式返回参考点。']) if (text.includes(forbidden)) throw new Error(`G28基础源仍含危险旧文案：${forbidden}`);
  for (const token of ['高风险自动运动','G90/G91','绝对或增量解释','当前CNC和机床厂原厂手册','刀具','刀柄','工件','夹具','完整计划运动空间','授权操作规程','通用防撞规则']) if (!text.includes(token)) throw new Error(`G28基础源缺少安全边界：${token}`);
  write(rel, text);
}

{
  const rel = 'cnc/search-aliases.js';
  let text = read(rel);
  requireToken(text, 'function normalizeCatalog(value) {', rel);
  requireToken(text, 'return value.map(normalizeG10);', rel);
  requireToken(text, "version: 'g10-boundary-1'", rel);
  const fn = `  function normalizeG28(entry) {\n    if (!entry || entry.id !== 'kb-gcode-g28') return entry;\n    return Object.assign({}, entry, {\n      summary: 'G28用于自动返回机床参考点，属于高风险自动运动；中间位置、轴向、顺序和参考点状态的处理取决于当前CNC和机床厂配置。',\n      usage: '只有在已经按本机原厂手册确认G90/G91解释、参考点状态、安全撤离方向和完整运动路径后，才可按现场工艺与授权操作规程受控使用。',\n      beginner: '把G28理解成“会让机床自动运动到参考点的高风险指令”，不要把G91 G28 Z0或固定先Z后XY当成防撞口诀。',\n      warning: 'G90/G91会影响中间位置的绝对或增量解释；各轴方向与顺序、参考点状态和安全路径还会受控制系统与机床厂配置影响。执行前必须核对当前CNC和机床厂原厂手册、现场工艺和授权操作规程，并确认刀具、刀柄、工件、夹具在完整计划运动空间内都有安全间隙。',\n      example: '教学格式示意：某些常见控制配置可见G91 G28 Z0，但这不能作为防撞保证；真实格式、中间位置与安全路径必须逐项以本机原厂手册为准，并先做受控验证。',\n      risk: '高',\n      tags: ['G28','参考点返回','高风险自动运动','G90/G91','原厂手册','授权操作']\n    });\n  }\n\n`;
  text = text.replace('  function normalizeCatalog(value) {', fn + '  function normalizeCatalog(value) {');
  text = text.replace('return value.map(normalizeG10);', 'return value.map(function (entry) { return normalizeG28(normalizeG10(entry)); });');
  text = text.replace("version: 'g10-boundary-1',", "version: 'g10-g28-boundary-2',");
  text = text.replace('normalizeG10: normalizeG10,\n    normalizeCatalog:', 'normalizeG10: normalizeG10,\n    normalizeG28: normalizeG28,\n    normalizeCatalog:');
  write(rel, text);
}

{
  const rel = 'cnc/build-info.json';
  const info = JSON.parse(read(rel));
  if (info.pwaBuild !== '20260809-pwa28' || info.cacheRevision !== '20260809-learning28') throw new Error(`build-info基线异常：${info.pwaBuild}/${info.cacheRevision}`);
  const preserved = { app: info.app, name: info.name, build: info.build, mobileBuild: info.mobileBuild, scope: info.scope, learningBuild: info.learningBuild, source: info.source };
  info.pwaBuild = '20260809-pwa29';
  info.cacheRevision = '20260809-learning29';
  if (!String(info.contentStage || '').includes('G28参考点返回适用范围')) info.contentStage += ' · G28参考点返回适用范围';
  info.generatedAt = '2026-08-09T15:30:00+08:00';
  for (const [key, value] of Object.entries(preserved)) if (info[key] !== value) throw new Error(`build-info不允许改写既有元数据：${key}`);
  write(rel, JSON.stringify(info, null, 2) + '\n');
}

for (const rel of ['cnc/sw.js','cnc/pwa-status.html','cnc/pwa-self-test.html','cnc/MOBILE_LEARNING_MEDIA_PROGRESS.md']) write(rel, migrateBuildPins(read(rel)));
function walk(dir, filter) {
  const abs = path.join(root, dir);
  for (const name of fs.readdirSync(abs)) {
    const rel = path.posix.join(dir, name);
    const stat = fs.statSync(path.join(root, rel));
    if (stat.isDirectory()) walk(rel, filter);
    else if (filter(rel)) { const before = read(rel); const after = migrateBuildPins(before); if (after !== before) write(rel, after); }
  }
}
walk('cnc/tests', rel => rel.endsWith('.cjs') && !rel.endsWith('_tmp-g28-pwa29-migrate.cjs'));

{
  const rel = 'cnc/tests/g10-programmable-data-input-trust-smoke.cjs';
  let text = read(rel);
  requireToken(text, "guard.version !== 'g10-boundary-1'", rel);
  text = text.replace("guard.version !== 'g10-boundary-1'", "guard.version !== 'g10-g28-boundary-2'");
  write(rel, text);
}

for (const rel of ['cnc/pwa-status.html','cnc/pwa-self-test.html']) {
  let text = read(rel);
  if (!text.includes('G28参考点返回适用范围')) {
    const note = '<p class="pwa-note" data-contract="g28-reference-return-boundary"><strong>G28参考点返回适用范围：</strong>G28属于高风险自动运动；G90/G91下中间位置的绝对或增量解释、参考点状态、轴方向与顺序及安全路径必须核对当前CNC和机床厂原厂手册，并确认刀具、刀柄、工件、夹具在完整计划运动空间内都有安全间隙，按现场工艺和授权操作规程验证。不要把G91 G28 Z0或固定“先Z后XY”当成通用防撞规则。</p>';
    if (text.includes('</main>')) text = text.replace('</main>', `${note}\n</main>`); else if (text.includes('</body>')) text = text.replace('</body>', `${note}\n</body>`); else throw new Error(`${rel}找不到G28说明插入点`);
  }
  write(rel, text);
}
{
  const rel = 'cnc/MOBILE_LEARNING_MEDIA_PROGRESS.md'; let text = read(rel);
  if (!text.includes('G28参考点返回适用范围')) text += '\n\n## G28参考点返回适用范围\nPWA29：G28属于高风险自动运动。G90/G91下中间位置的绝对或增量解释、参考点状态、轴方向与顺序和安全路径必须核对当前CNC和机床厂原厂手册；执行前确认刀具、刀柄、工件、夹具在完整计划运动空间内有安全间隙，并按现场工艺和授权操作规程验证。不要把 `G91 G28 Z0` 或固定“先Z后XY”当成通用防撞规则。\n';
  write(rel, text);
}

{
  const rel = 'cnc/tests/mobile-pwa-offline-cache-smoke.cjs';
  let text = read(rel);
  const anchor = "    if (offlineGmTrust.gmText.includes('G10 L2 P1 X100. Y50. 表示写入G54坐标偏置。')) throw new Error('G10冷离线源目录仍含无适用范围旧示例');\n";
  requireToken(text, anchor, rel);
  if (!text.includes('G28冷离线源目录缺少安全边界')) {
    const addition = `${anchor}    for (const token of ['高风险自动运动', 'G90/G91', '绝对或增量解释', '当前CNC和机床厂原厂手册', '刀具', '刀柄', '工件', '夹具', '完整计划运动空间', '授权操作规程']) {\n      if (!offlineGmTrust.gmText.includes(token)) throw new Error(\`G28冷离线源目录缺少安全边界：\${token}\`);\n    }\n    for (const forbidden of ['G28常配合G91 Z0先回Z，减少撞机。', '必须先Z后XY', 'G91 G28 Z0一定安全']) {\n      if (offlineGmTrust.gmText.includes(forbidden)) throw new Error(\`G28冷离线源目录仍含无适用范围防撞表述：\${forbidden}\`);\n    }\n`;
    text = text.replace(anchor, addition);
  }
  write(rel, text);
}

for (const rel of [...changed]) if (!rel.startsWith('cnc/')) throw new Error(`本次自动迁移只允许cnc/**，发现：${rel}`);
for (const required of ['cnc/gm-code-complete.js','cnc/search-aliases.js','cnc/build-info.json','cnc/sw.js','cnc/pwa-status.html','cnc/pwa-self-test.html','cnc/tests/mobile-pwa-offline-cache-smoke.cjs']) if (!changed.has(required)) throw new Error(`未形成必要改动：${required}`);
console.log('G28/PWA29生产与测试迁移完成：'); [...changed].sort().forEach(rel => console.log(rel));
