from pathlib import Path
import json, re
from datetime import datetime, timezone, timedelta

gm_path = Path('cnc/gm-code-complete.js')
search_path = Path('cnc/search-aliases.js')
build_path = Path('cnc/build-info.json')

gm = gm_path.read_text(encoding='utf-8')
pattern = re.compile(r'''  \{\n    "id": "kb-gcode-g95",.*?\n  \},\n  \{\n  "id": "kb-gcode-g96"''', re.S)
replacement = '''  {
    "id": "kb-gcode-g95",
    "category": "G代码",
    "title": "G95 铣床每转进给/部分车床动力刀具刚性攻丝",
    "code": "G95",
    "aliases": ["每转进给", "Feed per revolution", "动力刀具刚性攻丝", "车铣差异"],
    "summary": "G95不是跨机型同一含义：在部分铣床/加工中心控制器中用于每转进给模式；在部分带动力刀具的车床控制器中则可能用于端面刚性攻丝循环。具体语义、G代码组别、地址格式和可用选项必须按当前CNC与机床厂原厂手册确认。",
    "usage": "先确认机床类型、当前CNC和G95组别。铣削每转进给模式需核对单位制、F的单位与含义、主轴状态及与其它进给模式的关系；车床动力刀具刚性攻丝需核对机床是否具备对应选项、动力刀具/主轴同步、刀具与螺纹规格、起始位置、孔深、退刀路径以及F/S等地址的本机解释。",
    "beginner": "看到G95先问：这是哪台机床、哪种控制器？是铣床/加工中心的每转进给模式，还是带动力刀具车床上的刚性攻丝功能？不能只背‘G95=每转进给’，也不能把某台车床的攻丝格式照搬到别的机床。",
    "warning": "把不同机型上的G95语义混用，可能让F地址含义、进给模式或攻丝循环动作完全改变。真实机床执行前必须核对当前CNC和机床厂原厂手册，确认G代码组别、单位制、F/S与位置地址、主轴或动力刀具同步、刀具工件夹具间隙及完整计划运动空间，并按现场规程先做仿真、图形检查、单段或其它受控验证。教学内容不提供可直接照抄的固定进给、转速或位置数值。",
    "example": "教学语义示意：部分铣床/加工中心中G95表示每转进给；部分带动力刀具的车床中G95可能表示端面刚性攻丝循环。两类语义不能互抄，实际F/S、位置地址、螺纹参数、同步条件和退刀规则必须逐项以本机原厂手册为准。",
    "risk": "高",
    "tags": ["G95", "车铣差异", "每转进给", "动力刀具", "刚性攻丝", "当前CNC", "原厂手册"]
  },
  {
  "id": "kb-gcode-g96"'''
gm2, count = pattern.subn(replacement, gm, count=1)
if count != 1:
    raise SystemExit(f'G95 block replacement count={count}, expected 1')
if 'G95 F0.2' in gm2 or 'F0.2这类每转进给' in gm2:
    raise SystemExit('unsafe fixed G95 teaching value remains')
gm_path.write_text(gm2, encoding='utf-8')

s = search_path.read_text(encoding='utf-8')
s = s.replace('作为第二层防御保持G10/G28/G53/G92/G94/G96/G97/G98/G99边界一致；',
              '作为第二层防御保持G10/G28/G53/G92/G94/G95/G96/G97/G98/G99边界一致；')
if 'function normalizeG95(entry)' not in s:
    anchor = '  function normalizeG96(entry) {'
    if anchor not in s:
        raise SystemExit('normalizeG96 anchor missing')
    guard = '''  function normalizeG95(entry) {
    if (!entry || entry.id !== 'kb-gcode-g95') return entry;
    return Object.assign({}, entry, {
      title: 'G95 铣床每转进给/部分车床动力刀具刚性攻丝',
      summary: 'G95不是跨机型同一含义：在部分铣床/加工中心控制器中用于每转进给模式；在部分带动力刀具的车床控制器中则可能用于端面刚性攻丝循环。具体语义、G代码组别、地址格式和可用选项必须按当前CNC与机床厂原厂手册确认。',
      usage: '先确认机床类型、当前CNC和G95组别。铣削每转进给模式需核对单位制、F的单位与含义、主轴状态及与其它进给模式的关系；车床动力刀具刚性攻丝需核对机床是否具备对应选项、动力刀具/主轴同步、刀具与螺纹规格、起始位置、孔深、退刀路径以及F/S等地址的本机解释。',
      beginner: '看到G95先问：这是哪台机床、哪种控制器？是铣床/加工中心的每转进给模式，还是带动力刀具车床上的刚性攻丝功能？不能只背“G95=每转进给”，也不能把某台车床的攻丝格式照搬到别的机床。',
      warning: '把不同机型上的G95语义混用，可能让F地址含义、进给模式或攻丝循环动作完全改变。真实机床执行前必须核对当前CNC和机床厂原厂手册，确认G代码组别、单位制、F/S与位置地址、主轴或动力刀具同步、刀具工件夹具间隙及完整计划运动空间，并按现场规程先做仿真、图形检查、单段或其它受控验证。教学内容不提供可直接照抄的固定进给、转速或位置数值。',
      example: '教学语义示意：部分铣床/加工中心中G95表示每转进给；部分带动力刀具的车床中G95可能表示端面刚性攻丝循环。两类语义不能互抄，实际F/S、位置地址、螺纹参数、同步条件和退刀规则必须逐项以本机原厂手册为准。',
      risk: '高',
      tags: ['G95','车铣差异','每转进给','动力刀具','刚性攻丝','当前CNC','原厂手册']
    });
  }

'''
    s = s.replace(anchor, guard + anchor, 1)
old_chain = 'return value.map(function (entry) { return normalizeG99(normalizeG98(normalizeG97(normalizeG96(normalizeG94(normalizeG92(normalizeG53(normalizeG28(normalizeG10(entry))))))))); });'
new_chain = 'return value.map(function (entry) { return normalizeG99(normalizeG98(normalizeG97(normalizeG96(normalizeG95(normalizeG94(normalizeG92(normalizeG53(normalizeG28(normalizeG10(entry)))))))))); });'
if old_chain in s:
    s = s.replace(old_chain, new_chain, 1)
elif new_chain not in s:
    raise SystemExit('normalizeCatalog chain not recognized')
s = s.replace("version: 'g10-g28-g53-g92-g94-g96-g97-g98-g99-boundary-7'", "version: 'g10-g28-g53-g92-g94-g95-g96-g97-g98-g99-boundary-8'")
anchor = '    normalizeG94: normalizeG94,\n    normalizeG96: normalizeG96,'
if anchor in s:
    s = s.replace(anchor, '    normalizeG94: normalizeG94,\n    normalizeG95: normalizeG95,\n    normalizeG96: normalizeG96,', 1)
elif 'normalizeG95: normalizeG95' not in s:
    raise SystemExit('G95 exposure anchor missing')
search_path.write_text(s, encoding='utf-8')

# Shift current CNC runtime/test references. Historical docs are preserved.
suffixes = {'.js', '.cjs', '.json', '.html', '.css', '.txt'}
for path in Path('cnc').rglob('*'):
    if not path.is_file() or path.suffix.lower() not in suffixes or 'docs' in path.parts:
        continue
    text = path.read_text(encoding='utf-8')
    if '20260810-pwa34' not in text and '20260810-learning34' not in text:
        continue
    shifted = text
    if '20260810-pwa33' in shifted:
        shifted = shifted.replace('20260810-pwa33', '__PREV_PWA__')
    if '20260810-learning33' in shifted:
        shifted = shifted.replace('20260810-learning33', '__PREV_LEARNING__')
    shifted = shifted.replace('20260810-pwa34', '20260810-pwa35').replace('20260810-learning34', '20260810-learning35')
    shifted = shifted.replace('__PREV_PWA__', '20260810-pwa34').replace('__PREV_LEARNING__', '20260810-learning34')
    if shifted != text:
        path.write_text(shifted, encoding='utf-8')
        print('shifted:', path)

info = json.loads(build_path.read_text(encoding='utf-8'))
info['pwaBuild'] = '20260810-pwa35'
info['cacheRevision'] = '20260810-learning35'
if 'G95车铣双语义适用范围' not in info.get('contentStage', ''):
    info['contentStage'] = info.get('contentStage', '') + '，G95车铣双语义适用范围'
info['generatedAt'] = datetime.now(timezone(timedelta(hours=8))).isoformat(timespec='seconds')
build_path.write_text(json.dumps(info, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

test = r'''const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const gmSource = fs.readFileSync('cnc/gm-code-complete.js', 'utf8');
const safetySource = fs.readFileSync('cnc/search-aliases.js', 'utf8');
const buildInfo = JSON.parse(fs.readFileSync('cnc/build-info.json', 'utf8'));
const swSource = fs.readFileSync('cnc/sw.js', 'utf8');
const g95Start = gmSource.indexOf('"id": "kb-gcode-g95"');
const g96Start = gmSource.indexOf('"id": "kb-gcode-g96"');
assert(g95Start >= 0 && g96Start > g95Start, '必须存在独立G95基础条目');
const g95Block = gmSource.slice(g95Start, g96Start);
for (const token of ['车铣差异','铣床/加工中心','动力刀具','刚性攻丝','当前CNC','原厂手册','"risk": "高"']) assert(g95Block.includes(token), `G95基础源缺少：${token}`);
for (const forbidden of ['G95 F0.2','F0.2这类每转进给']) assert(!g95Block.includes(forbidden), `G95基础源仍含固定值：${forbidden}`);
const context = { window: {} };
vm.createContext(context);
vm.runInContext(safetySource, context);
vm.runInContext(gmSource, context);
const safety = context.window.CNC_GM_CONTENT_SAFETY;
assert(safety && typeof safety.normalizeG95 === 'function', '缺少normalizeG95');
assert(String(safety.version).includes('g95') && String(safety.version).includes('boundary-8'), 'G95安全版本未升级');
const g95 = context.window.CNC_GM_CODES.find((e) => e && e.id === 'kb-gcode-g95');
assert(g95 && g95.risk === '高', '运行时G95必须为高风险');
const text = [g95.title,g95.summary,g95.usage,g95.beginner,g95.warning,g95.example,...(g95.tags||[])].join('\n');
for (const token of ['车铣差异','铣床/加工中心','动力刀具','刚性攻丝','当前CNC','原厂手册']) assert(text.includes(token), `运行时G95缺少：${token}`);
assert(!text.includes('F0.2'), '运行时G95不得含F0.2');
assert.strictEqual(buildInfo.pwaBuild, '20260810-pwa35');
assert.strictEqual(buildInfo.cacheRevision, '20260810-learning35');
assert(buildInfo.contentStage.includes('G95车铣双语义适用范围'));
assert(swSource.includes("const BUILD = '20260810-pwa35'"));
assert(swSource.includes("const CACHE_REVISION = '20260810-learning35'"));
assert(swSource.includes("'./search-aliases.js'") && swSource.includes("'./gm-code-complete.js'"));
console.log(JSON.stringify({ok:true,version:safety.version,pwaBuild:buildInfo.pwaBuild,cacheRevision:buildInfo.cacheRevision,title:g95.title,risk:g95.risk}, null, 2));
'''
Path('cnc/tests/g95-dual-semantics-trust-smoke.cjs').write_text(test, encoding='utf-8')

# Final proof before committing.
assert 'G95 F0.2' not in gm_path.read_text(encoding='utf-8')
assert 'function normalizeG95(entry)' in search_path.read_text(encoding='utf-8')
assert "const BUILD = '20260810-pwa35'" in Path('cnc/sw.js').read_text(encoding='utf-8')
print('G95 runtime migration prepared successfully')
