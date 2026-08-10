from pathlib import Path
import json
import re

ROOT = Path('.')
PWA_OLD = '20260810-pwa32'
CACHE_OLD = '20260810-learning32'
PWA_PREV = '20260809-pwa31'
CACHE_PREV = '20260809-learning31'
PWA_NEW = '20260810-pwa33'
CACHE_NEW = '20260810-learning33'
GUARD_OLD = 'g10-g28-g53-g92-g94-boundary-5'
GUARD_NEW = 'g10-g28-g53-g92-g94-g98-g99-boundary-6'
STAGE = 'G98/G99车铣双语义适用范围'

ACTIVE_PIN_FILES = [
    '.github/workflows/cnc-ai-teacher-offline-core-pages-smoke.yml',
    '.github/workflows/cnc-beginner-placement-offline-pages-smoke.yml',
    '.github/workflows/cnc-learning-media-smoke.yml',
    '.github/workflows/cnc-pwa-offline-cache-smoke.yml',
    '.github/workflows/cnc-pwa-self-test-smoke.yml',
    '.github/workflows/cnc-pwa-upgrade-data-smoke.yml',
    '.github/workflows/cnc-training-camp-route-handoff-pages-smoke.yml',
    'cnc/MOBILE_LEARNING_MEDIA_PROGRESS.md',
    'cnc/pwa-self-test.html',
    'cnc/pwa-status.html',
    'cnc/tests/g10-programmable-data-input-trust-smoke.cjs',
    'cnc/tests/g28-reference-return-boundary-trust-smoke.cjs',
    'cnc/tests/g53-machine-coordinate-boundary-trust-smoke.cjs',
    'cnc/tests/g92-dual-semantic-boundary-trust-smoke.cjs',
    'cnc/tests/g94-dual-semantic-boundary-trust-smoke.cjs',
    'cnc/tests/mobile-pwa-offline-smoke.cjs',
    'cnc/tests/mobile-pwa-profile-bfcache-smoke.cjs',
    'cnc/tests/mobile-pwa-upgrade-data-smoke.cjs',
    'cnc/tests/pages-ai-teacher-offline-core-deployment-smoke.cjs',
    'cnc/tests/pages-beginner-placement-offline-deployment-smoke.cjs',
    'cnc/tests/pages-training-camp-route-handoff-deployment-smoke.cjs',
]

for rel in ACTIVE_PIN_FILES:
    p = ROOT / rel
    if not p.exists():
        raise SystemExit(f'受控迁移目标不存在：{rel}')
    text = p.read_text(encoding='utf-8')
    text = text.replace(PWA_OLD, PWA_NEW).replace(CACHE_OLD, CACHE_NEW)
    text = text.replace(PWA_PREV, PWA_OLD).replace(CACHE_PREV, CACHE_OLD)
    text = text.replace(GUARD_OLD, GUARD_NEW)
    p.write_text(text, encoding='utf-8')

# 基础G/M目录：直接替换G98/G99两个条目，删除可被误当成通用口诀或真实参数的旧示例。
gm_path = ROOT / 'cnc/gm-code-complete.js'
gm = gm_path.read_text(encoding='utf-8')
start = gm.index('  {\n    "id": "kb-gcode-g98"')
end = gm.index('  {\n    "id": "kb-mcode-m00"', start)
new_entries = '''  {
    "id": "kb-gcode-g98",
    "category": "G代码",
    "title": "G98 固定循环初始平面返回/车床每分钟进给",
    "code": "G98",
    "aliases": ["初始平面返回", "Initial point return", "每分钟进给", "车铣差异"],
    "summary": "G98不是跨机型同一含义：在部分铣床/加工中心控制器中，它在固定循环语境用于返回循环开始前的初始Z平面；在部分车床控制器中则用于每分钟进给模式。具体组别、模态性与F地址解释必须按当前CNC和机床厂原厂手册确认。",
    "usage": "先确认机型、控制器、当前G代码组别和是否处于固定循环。铣削侧要核对进入循环前的初始Z位置、R平面、夹具/凸台等障碍物和完整计划运动空间；车削侧要核对公制/英制、F的单位与含义、主轴及其它进给模式状态。",
    "beginner": "看到G98先问：这是铣床固定循环的返回方式，还是车床的每分钟进给？不要把“G98一定退得更高”当成跨机床口诀。",
    "warning": "铣削固定循环中，初始平面与R平面的实际高低关系由程序进入状态和本机规则决定，不能只凭G98/G99名称判断安全；车床侧G98会改变F地址的解释。真实机床必须核对当前CNC和机床厂原厂手册，并结合夹具、工件、刀具、刀柄与完整运动空间做图形检查、仿真、单段或其它受控验证。",
    "example": "教学语义示意：部分铣床/加工中心中G98表示固定循环返回初始平面；部分车床中G98表示每分钟进给。两类语义不能互抄，实际坐标、单位与进给值必须逐项以本机原厂手册和现场工艺为准。",
    "risk": "高",
    "tags": ["G98", "车铣差异", "固定循环", "初始平面", "每分钟进给", "原厂手册"]
  },
  {
    "id": "kb-gcode-g99",
    "category": "G代码",
    "title": "G99 固定循环R平面返回/车床每转进给",
    "code": "G99",
    "aliases": ["R平面返回", "R plane return", "每转进给", "车铣差异"],
    "summary": "G99不是跨机型同一含义：在部分铣床/加工中心控制器中，它在固定循环语境用于返回R平面；在部分车床控制器中则用于每转进给模式。具体组别、模态性与F地址解释必须按当前CNC和机床厂原厂手册确认。",
    "usage": "先确认机型、控制器、当前G代码组别和是否处于固定循环。铣削侧要核对R平面、进入循环前的初始Z位置、孔间移动路径、夹具/凸台等障碍物和完整计划运动空间；车削侧要核对公制/英制、F的每转单位与含义、主轴状态及其它进给模式。",
    "beginner": "看到G99先问：这是铣床固定循环的R平面返回，还是车床的每转进给？不要把“G99一定更低、更快或绝对安全”当成通用规则。",
    "warning": "铣削固定循环中，只有在本机规则与当前程序状态下确认R平面及孔间路径避开全部障碍物，才能判断返回路径是否合适；车床侧G99会把F解释为每转进给。真实机床必须核对当前CNC和机床厂原厂手册、主轴与单位状态，并按现场工艺做图形检查、仿真、单段或其它受控验证。",
    "example": "教学语义示意：部分铣床/加工中心中G99表示固定循环返回R平面；部分车床中G99表示每转进给。两类语义不能互抄，实际R平面、单位与进给值必须逐项以本机原厂手册和现场工艺为准。",
    "risk": "高",
    "tags": ["G99", "车铣差异", "固定循环", "R平面", "每转进给", "原厂手册"]
  },
'''
gm = gm[:start] + new_entries + gm[end:]
gm_path.write_text(gm, encoding='utf-8')

# 运行时第二层安全归一化器。
alias_path = ROOT / 'cnc/search-aliases.js'
alias = alias_path.read_text(encoding='utf-8')
marker = '  function normalizeCatalog(value) {'
if marker not in alias:
    raise SystemExit('search-aliases缺少normalizeCatalog插入点')
insert = '''  function normalizeG98(entry) {
    if (!entry || entry.id !== 'kb-gcode-g98') return entry;
    return Object.assign({}, entry, {
      title: 'G98 固定循环初始平面返回/车床每分钟进给',
      summary: 'G98不是跨机型同一含义：部分铣床/加工中心在固定循环语境用于返回循环开始前的初始Z平面；部分车床则用于每分钟进给模式。具体组别、模态性与F地址解释必须按当前CNC和机床厂原厂手册确认。',
      usage: '先确认机型、控制器、G代码组别和固定循环状态。铣削侧核对初始Z位置、R平面、障碍物与完整计划运动空间；车削侧核对单位制、F的单位与含义、主轴和其它进给模式状态。',
      beginner: 'G98先分清机床和语境：铣削固定循环返回方式与车床每分钟进给不是一回事；不要记成“G98一定退得更高”。',
      warning: '初始平面与R平面的实际高低不能脱离当前程序状态和本机规则判断；车床侧G98会改变F地址解释。必须核对当前CNC和机床厂原厂手册，并结合完整运动空间做图形检查、仿真、单段或其它受控验证。',
      example: '教学语义示意：部分铣床/加工中心中G98表示固定循环返回初始平面；部分车床中G98表示每分钟进给。实际坐标、单位与进给值必须以本机原厂手册为准。',
      risk: '高',
      tags: ['G98','车铣差异','固定循环','初始平面','每分钟进给','原厂手册']
    });
  }

  function normalizeG99(entry) {
    if (!entry || entry.id !== 'kb-gcode-g99') return entry;
    return Object.assign({}, entry, {
      title: 'G99 固定循环R平面返回/车床每转进给',
      summary: 'G99不是跨机型同一含义：部分铣床/加工中心在固定循环语境用于返回R平面；部分车床则用于每转进给模式。具体组别、模态性与F地址解释必须按当前CNC和机床厂原厂手册确认。',
      usage: '先确认机型、控制器、G代码组别和固定循环状态。铣削侧核对R平面、初始Z位置、孔间路径、障碍物与完整计划运动空间；车削侧核对单位制、F的每转单位与含义、主轴和其它进给模式状态。',
      beginner: 'G99先分清机床和语境：铣削固定循环R平面返回与车床每转进给不是一回事；不要记成“G99一定更低、更快或绝对安全”。',
      warning: 'R平面是否适合作为孔间返回高度必须结合当前程序状态、障碍物和本机规则判断；车床侧G99会改变F地址解释。必须核对当前CNC和机床厂原厂手册，并按现场工艺做受控验证。',
      example: '教学语义示意：部分铣床/加工中心中G99表示固定循环返回R平面；部分车床中G99表示每转进给。实际R平面、单位与进给值必须以本机原厂手册为准。',
      risk: '高',
      tags: ['G99','车铣差异','固定循环','R平面','每转进给','原厂手册']
    });
  }

'''
alias = alias.replace(marker, insert + marker, 1)
alias = alias.replace('return value.map(function (entry) { return normalizeG94(normalizeG92(normalizeG53(normalizeG28(normalizeG10(entry))))); });', 'return value.map(function (entry) { return normalizeG99(normalizeG98(normalizeG94(normalizeG92(normalizeG53(normalizeG28(normalizeG10(entry))))))); });')
alias = alias.replace("version: '" + GUARD_OLD + "'", "version: '" + GUARD_NEW + "'")
alias = alias.replace('    normalizeG94: normalizeG94,\n    normalizeCatalog: normalizeCatalog', '    normalizeG94: normalizeG94,\n    normalizeG98: normalizeG98,\n    normalizeG99: normalizeG99,\n    normalizeCatalog: normalizeCatalog')
alias = alias.replace('保持G10/G28/G53/G92/G94边界一致', '保持G10/G28/G53/G92/G94/G98/G99边界一致')
for required in ['function normalizeG98', 'function normalizeG99', GUARD_NEW, 'normalizeG98: normalizeG98', 'normalizeG99: normalizeG99']:
    if required not in alias:
        raise SystemExit(f'运行时安全归一化迁移失败：{required}')
alias_path.write_text(alias, encoding='utf-8')

# 正规升级离线核心版本与内容阶段。
info_path = ROOT / 'cnc/build-info.json'
info = json.loads(info_path.read_text(encoding='utf-8'))
if info.get('pwaBuild') != PWA_OLD or info.get('cacheRevision') != CACHE_OLD:
    raise SystemExit(f'build-info基线漂移：{info.get("pwaBuild")}/{info.get("cacheRevision")}')
info['pwaBuild'] = PWA_NEW
info['cacheRevision'] = CACHE_NEW
if STAGE not in str(info.get('contentStage', '')):
    info['contentStage'] = str(info.get('contentStage', '')).rstrip() + '，' + STAGE
info['generatedAt'] = '2026-08-10T09:31:15+08:00'
info_path.write_text(json.dumps(info, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

sw_path = ROOT / 'cnc/sw.js'
sw = sw_path.read_text(encoding='utf-8')
sw = sw.replace("const BUILD = '" + PWA_OLD + "';", "const BUILD = '" + PWA_NEW + "';")
sw = sw.replace("const CACHE_REVISION = '" + CACHE_OLD + "';", "const CACHE_REVISION = '" + CACHE_NEW + "';")
if PWA_NEW not in sw or CACHE_NEW not in sw:
    raise SystemExit('Service Worker版本迁移失败')
sw_path.write_text(sw, encoding='utf-8')

# 状态页和自检页公开解释双语义边界。
note = '  <p class="pwa-note" data-contract="g98-g99-dual-semantic-boundary"><strong>G98/G99车铣双语义适用范围：</strong>G98/G99不是跨机型统一含义。部分铣床/加工中心在固定循环中分别用于返回循环初始平面或R平面；部分车床控制器则分别用于每分钟进给或每转进给。不能把“G98一定更高”或“G99一定更低、更快、更安全”当成通用口诀。真实机床必须先确认机型、当前CNC、G代码组别、固定循环/进给模式、初始平面、R平面、单位制、F含义、主轴状态及完整运动空间，并核对机床厂原厂手册和现场工艺，先做图形检查、仿真、单段或其它受控验证。</p>\n'
for rel in ['cnc/pwa-status.html', 'cnc/pwa-self-test.html']:
    p = ROOT / rel
    text = p.read_text(encoding='utf-8')
    if 'data-contract="g98-g99-dual-semantic-boundary"' not in text:
        anchor = re.search(r'(^\s*<p class="pwa-note" data-contract="g94-dual-semantic-boundary".*?</p>\s*$)', text, re.M)
        if not anchor:
            raise SystemExit(f'{rel}缺少G94安全说明插入点')
        text = text[:anchor.end()] + '\n' + note.rstrip('\n') + text[anchor.end():]
    p.write_text(text, encoding='utf-8')

# 永久可信度门禁：同时验证基础源、运行时第二层、安全文案、PWA版本与离线核心。
test_path = ROOT / 'cnc/tests/g98-g99-dual-semantic-boundary-trust-smoke.cjs'
test_path.write_text(r'''const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const aliasesText = fs.readFileSync(path.join(root, 'search-aliases.js'), 'utf8');
const gmText = fs.readFileSync(path.join(root, 'gm-code-complete.js'), 'utf8');
const swText = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const info = JSON.parse(fs.readFileSync(path.join(root, 'build-info.json'), 'utf8'));
const status = fs.readFileSync(path.join(root, 'pwa-status.html'), 'utf8');
const selfTest = fs.readFileSync(path.join(root, 'pwa-self-test.html'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const errors = [];

if (info.pwaBuild !== '20260810-pwa33' || info.cacheRevision !== '20260810-learning33') errors.push(`构建版本错误：${info.pwaBuild}/${info.cacheRevision}`);
if (!String(info.contentStage || '').includes('G98/G99车铣双语义适用范围')) errors.push('build-info缺少G98/G99内容可信度阶段');
if (!swText.includes("const BUILD = '20260810-pwa33'") || !swText.includes("const CACHE_REVISION = '20260810-learning33'")) errors.push('Service Worker未对齐PWA33/learning33');
for (const core of ["'./search-aliases.js'", "'./gm-code-complete.js'"]) if (!swText.includes(core)) errors.push(`首次安装离线核心缺少：${core}`);
const aliasPos = index.indexOf('search-aliases.js');
const gmPos = index.indexOf('gm-code-complete.js');
if (aliasPos < 0 || gmPos < 0 || aliasPos >= gmPos) errors.push('安全归一化器必须先于G/M基础目录加载');

for (const forbidden of ['G98比G99退得更高', 'G99效率高，但要求R平面绝对安全', 'G99效率高', 'R平面绝对安全']) {
  if (gmText.includes(forbidden)) errors.push(`基础源仍含误导性通用口诀：${forbidden}`);
}
for (const token of ['G98不是跨机型同一含义', 'G99不是跨机型同一含义', '初始Z平面', 'R平面', '每分钟进给', '每转进给', '原厂手册', '完整计划运动空间']) {
  if (!gmText.includes(token)) errors.push(`基础源缺少G98/G99安全边界：${token}`);
}
for (const token of ['g98-g99-dual-semantic-boundary', '不能把“G98一定更高”', 'G99一定更低、更快、更安全', '原厂手册']) {
  if (!status.includes(token)) errors.push(`PWA状态页缺少边界：${token}`);
  if (!selfTest.includes(token)) errors.push(`PWA自检页缺少边界：${token}`);
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
if (!guard || guard.version !== 'g10-g28-g53-g92-g94-g98-g99-boundary-6') errors.push(`运行时安全守卫版本错误：${guard?.version}`);
if (typeof guard?.normalizeG98 !== 'function' || typeof guard?.normalizeG99 !== 'function') errors.push('运行时缺少normalizeG98/normalizeG99');
for (const code of ['G98', 'G99']) {
  const entry = (sandbox.window.CNC_GM_CODES || []).find(item => item.code === code);
  if (!entry) { errors.push(`运行时缺少${code}`); continue; }
  if (entry.risk !== '高') errors.push(`${code}风险等级必须为高`);
  for (const token of ['车铣差异', '原厂手册']) if (!(entry.tags || []).includes(token)) errors.push(`${code}缺少标签：${token}`);
  if (!entry.summary.includes('不是跨机型同一含义')) errors.push(`${code}运行时摘要未区分车铣语义`);
  if (!entry.warning.includes('原厂手册')) errors.push(`${code}运行时警告未要求核对原厂手册`);
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('CNC G98/G99车铣双语义可信度门禁通过：铣削固定循环返回初始平面/R平面与车床每分钟/每转进给被明确分开，不再使用“G98一定更高、G99一定更低或绝对安全”的通用口诀；真实机床须核对当前CNC和机床厂原厂手册并做受控验证；PWA33首次安装离线核心继续保护该边界。');
''', encoding='utf-8')

workflow_path = ROOT / '.github/workflows/cnc-g98-g99-dual-semantic-boundary-trust-smoke.yml'
workflow_path.write_text('''name: CNC G98 G99 dual semantic boundary trust smoke\n\non:\n  pull_request:\n    paths:\n      - 'cnc/**'\n      - '.github/workflows/cnc-g98-g99-dual-semantic-boundary-trust-smoke.yml'\n  push:\n    branches: [main]\n    paths:\n      - 'cnc/**'\n      - '.github/workflows/cnc-g98-g99-dual-semantic-boundary-trust-smoke.yml'\n\npermissions:\n  contents: read\n\njobs:\n  g98-g99-dual-semantic-boundary-trust:\n    runs-on: ubuntu-latest\n    timeout-minutes: 10\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: '20'\n      - name: Validate G98 G99 mill-lathe semantic boundary\n        run: node cnc/tests/g98-g99-dual-semantic-boundary-trust-smoke.cjs\n''', encoding='utf-8')

# 最终静态自检：不允许通过弱化测试/跳过来迁移。
for rel in ACTIVE_PIN_FILES + ['cnc/search-aliases.js', 'cnc/gm-code-complete.js', 'cnc/build-info.json', 'cnc/sw.js', 'cnc/tests/g98-g99-dual-semantic-boundary-trust-smoke.cjs', '.github/workflows/cnc-g98-g99-dual-semantic-boundary-trust-smoke.yml']:
    text = (ROOT / rel).read_text(encoding='utf-8')
    for forbidden in ['test.skip(', 'describe.skip(', 'it.skip(']:
        if forbidden in text and rel.endswith(('g98-g99-dual-semantic-boundary-trust-smoke.cjs', 'cnc-g98-g99-dual-semantic-boundary-trust-smoke.yml')):
            raise SystemExit(f'新门禁出现跳过：{rel} / {forbidden}')

print('G98/G99 + PWA33 受控迁移完成。')
