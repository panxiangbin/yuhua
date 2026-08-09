from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[2]
changed = []

def write_if_changed(path: Path, text: str):
    old = path.read_text(encoding='utf-8')
    if old == text:
        return
    path.write_text(text, encoding='utf-8')
    changed.append(str(path.relative_to(ROOT)).replace('\\', '/'))

# 1) 基础 G/M 目录：把 G94 的车铣双语义拆开，并提升为高风险可信边界。
gm_path = ROOT / 'cnc/gm-code-complete.js'
gm = gm_path.read_text(encoding='utf-8')
pattern = re.compile(r'  \{\n    "id": "kb-gcode-g94",.*?\n  \},\n  \{\n    "id": "kb-gcode-g95",', re.S)
new_g94 = '''  {
    "id": "kb-gcode-g94",
    "category": "G代码",
    "title": "G94 每分钟进给模式/车床端面循环",
    "code": "G94",
    "aliases": [
      "每分钟进给",
      "Feed per minute",
      "端面车削循环",
      "车铣差异"
    ],
    "summary": "G94不是跨机型同一含义：在部分铣床/加工中心控制器中用于每分钟进给模式；在部分车床控制器中则可能是端面/直线车削循环。具体语义、组别、模态状态和地址格式必须按当前CNC与机床厂原厂手册确认。",
    "usage": "先确认当前机型、控制器和G94组别。铣削进给模式需核对G93/G94/G95之间的模式关系、当前公制/英制状态以及F的单位与含义；车床循环需核对起始位置、X/Z或U/W、K/F等地址解释、返回/退刀路径、刀补与完整计划运动空间。",
    "beginner": "看到G94先问：这是哪台机床、哪种控制器？是铣削的每分钟进给模式，还是车床端面循环？两类程序不能直接互抄。",
    "warning": "把铣削进给模式当成车床循环，或把车床循环当成铣削进给模式，会让程序含义完全改变。上机前必须核对当前CNC与机床厂原厂手册，确认G93/G94/G95、单位制、F含义，或确认X/Z/U/W/K/F、起始位置、返回/退刀路径、主轴和刀补状态；同时确认刀具、刀柄、工件、夹具在完整计划运动空间内有安全间隙，并按现场规程先做仿真、图形检查、单段或低风险受控验证。教学示例不得直接作为真实机床参数。",
    "example": "教学语义示意：部分铣床/加工中心中G94表示每分钟进给模式；部分车床中G94表示端面/直线车削循环。两类语义不能互抄，具体F单位、循环地址、起始位置与返回路径必须逐项以本机原厂手册为准。",
    "risk": "高",
    "tags": [
      "G94",
      "车铣差异",
      "每分钟进给",
      "端面循环",
      "G93/G95",
      "原厂手册"
    ]
  },
  {
    "id": "kb-gcode-g95",'''
gm2, n = pattern.subn(new_g94, gm, count=1)
if n != 1:
    raise SystemExit(f'G94基础源替换计数异常: {n}')
write_if_changed(gm_path, gm2)

# 2) 运行时第二层归一化器：不能只靠基础源，防止后续批量数据覆盖边界。
alias_path = ROOT / 'cnc/search-aliases.js'
alias = alias_path.read_text(encoding='utf-8')
old_comment = '作为第二层防御保持G10/G28/G53/G92边界一致；基础源本身仍必须通过独立可信度门禁。'
new_comment = '作为第二层防御保持G10/G28/G53/G92/G94边界一致；基础源本身仍必须通过独立可信度门禁。'
if old_comment not in alias:
    raise SystemExit('search-aliases 安全守卫注释锚点缺失')
alias = alias.replace(old_comment, new_comment, 1)
insert_anchor = '  function normalizeCatalog(value) {\n'
if insert_anchor not in alias:
    raise SystemExit('normalizeCatalog 锚点缺失')
normalize_g94 = '''  function normalizeG94(entry) {
    if (!entry || entry.id !== 'kb-gcode-g94') return entry;
    return Object.assign({}, entry, {
      title: 'G94 每分钟进给模式/车床端面循环',
      summary: 'G94不是跨机型同一含义：在部分铣床/加工中心控制器中用于每分钟进给模式；在部分车床控制器中则可能是端面/直线车削循环。具体语义、组别、模态状态和地址格式必须按当前CNC与机床厂原厂手册确认。',
      usage: '先确认当前机型、控制器和G94组别。铣削进给模式需核对G93/G94/G95之间的模式关系、当前公制/英制状态以及F的单位与含义；车床循环需核对起始位置、X/Z或U/W、K/F等地址解释、返回/退刀路径、刀补与完整计划运动空间。',
      beginner: '看到G94先问：这是哪台机床、哪种控制器？是铣削的每分钟进给模式，还是车床端面循环？两类程序不能直接互抄。',
      warning: '把铣削进给模式当成车床循环，或把车床循环当成铣削进给模式，会让程序含义完全改变。上机前必须核对当前CNC与机床厂原厂手册，确认G93/G94/G95、单位制、F含义，或确认X/Z/U/W/K/F、起始位置、返回/退刀路径、主轴和刀补状态；同时确认刀具、刀柄、工件、夹具在完整计划运动空间内有安全间隙，并按现场规程先做仿真、图形检查、单段或低风险受控验证。教学示例不得直接作为真实机床参数。',
      example: '教学语义示意：部分铣床/加工中心中G94表示每分钟进给模式；部分车床中G94表示端面/直线车削循环。两类语义不能互抄，具体F单位、循环地址、起始位置与返回路径必须逐项以本机原厂手册为准。',
      risk: '高',
      tags: ['G94','车铣差异','每分钟进给','端面循环','G93/G95','原厂手册']
    });
  }

'''
alias = alias.replace(insert_anchor, normalize_g94 + insert_anchor, 1)
old_map = 'return value.map(function (entry) { return normalizeG92(normalizeG53(normalizeG28(normalizeG10(entry)))); });'
new_map = 'return value.map(function (entry) { return normalizeG94(normalizeG92(normalizeG53(normalizeG28(normalizeG10(entry))))); });'
if old_map not in alias:
    raise SystemExit('normalizeCatalog 旧链路锚点缺失')
alias = alias.replace(old_map, new_map, 1)
old_version = "version: 'g10-g28-g53-g92-boundary-4',"
new_version = "version: 'g10-g28-g53-g92-g94-boundary-5',"
if old_version not in alias:
    raise SystemExit('安全守卫旧版本锚点缺失')
alias = alias.replace(old_version, new_version, 1)
old_export = '    normalizeG92: normalizeG92,\n    normalizeCatalog: normalizeCatalog'
new_export = '    normalizeG92: normalizeG92,\n    normalizeG94: normalizeG94,\n    normalizeCatalog: normalizeCatalog'
if old_export not in alias:
    raise SystemExit('安全守卫导出锚点缺失')
alias = alias.replace(old_export, new_export, 1)
write_if_changed(alias_path, alias)

# 3) PWA 正规升版：G/M基础源和运行时守卫都是首次安装核心，不允许沿用旧缓存。
build_path = ROOT / 'cnc/build-info.json'
build = json.loads(build_path.read_text(encoding='utf-8'))
if build.get('pwaBuild') != '20260809-pwa31' or build.get('cacheRevision') != '20260809-learning31':
    raise SystemExit(f"build-info基线异常: {build.get('pwaBuild')} / {build.get('cacheRevision')}")
build['pwaBuild'] = '20260810-pwa32'
build['cacheRevision'] = '20260810-learning32'
stage = str(build.get('contentStage') or '')
if 'G94车铣双语义适用范围' not in stage:
    build['contentStage'] = stage + '，G94车铣双语义适用范围'
write_if_changed(build_path, json.dumps(build, ensure_ascii=False, indent=2) + '\n')

sw_path = ROOT / 'cnc/sw.js'
sw = sw_path.read_text(encoding='utf-8')
if "const BUILD = '20260809-pwa31';" not in sw or "const CACHE_REVISION = '20260809-learning31';" not in sw:
    raise SystemExit('Service Worker PWA31基线锚点缺失')
sw = sw.replace("const BUILD = '20260809-pwa31';", "const BUILD = '20260810-pwa32';", 1)
sw = sw.replace("const CACHE_REVISION = '20260809-learning31';", "const CACHE_REVISION = '20260810-learning32';", 1)
write_if_changed(sw_path, sw)

# 4) 学习媒体进度文档必须与当前构建标记同步，并记录G94适用范围。
doc_path = ROOT / 'cnc/MOBILE_LEARNING_MEDIA_PROGRESS.md'
doc = doc_path.read_text(encoding='utf-8')
old_target = '`20260809-pwa31 / 20260809-learning31`'
if old_target not in doc:
    raise SystemExit('学习媒体进度PWA31目标锚点缺失')
doc = doc.replace(old_target, '`20260810-pwa32 / 20260810-learning32`', 1)
if '## G94车铣双语义适用范围' not in doc:
    doc += '''\n\n## G94车铣双语义适用范围\nPWA32：G94不是跨机型同一含义。部分铣床/加工中心控制器把它作为每分钟进给模式，F的单位与含义需要结合G93/G94/G95和当前公制/英制状态确认；部分车床控制器则把G94作为端面/直线车削循环，X/Z或U/W、K/F等地址、起始位置、返回/退刀路径和模态行为没有跨系统统一保证。两类程序不能直接互抄。上机前必须核对当前CNC与机床厂原厂手册、刀补和主轴状态，并确认刀具、刀柄、工件、夹具在完整计划运动空间内有安全间隙；教学示意不得直接作为真实机床参数，首次验证按现场规程使用仿真、图形检查、单段或低风险受控方式。\n'''
write_if_changed(doc_path, doc)

allowed = {
    'cnc/gm-code-complete.js',
    'cnc/search-aliases.js',
    'cnc/build-info.json',
    'cnc/sw.js',
    'cnc/MOBILE_LEARNING_MEDIA_PROGRESS.md',
}
if set(changed) - allowed:
    raise SystemExit(f'迁移越界: {sorted(set(changed) - allowed)}')
if set(changed) != allowed:
    raise SystemExit(f'迁移文件不完整，实际: {sorted(changed)}')
print('PWA32 / G94迁移完成：')
for item in changed:
    print('-', item)
