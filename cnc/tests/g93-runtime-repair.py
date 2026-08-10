from pathlib import Path
import json

root = Path('cnc')
gm_path = root / 'gm-code-complete.js'
alias_path = root / 'search-aliases.js'

old_g93 = '''  {
    "id": "kb-gcode-g93",
    "category": "G代码",
    "title": "G93 反时间进给",
    "code": "G93",
    "aliases": [
      "倒数时间进给",
      "Inverse time feed"
    ],
    "summary": "F值表示完成当前段所需时间的倒数，常用于多轴联动。",
    "usage": "五轴联动、复杂曲面或后处理输出中可能使用。",
    "beginner": "普通三轴加工很少手写G93。",
    "warning": "G93下F含义和G94完全不同，误用会导致进给异常。",
    "example": "G93 G01 X10. A30. F2. 表示按反时间进给执行。",
    "risk": "中",
    "tags": [
      "G93",
      "反时间进给",
      "五轴"
    ]
  },'''

new_g93 = '''  {
    "id": "kb-gcode-g93",
    "category": "G代码",
    "title": "G93 反时间进给（按当前CNC确认）",
    "code": "G93",
    "aliases": [
      "倒数时间进给",
      "Inverse time feed",
      "多轴进给",
      "CAM后处理"
    ],
    "summary": "在部分铣床/加工中心CNC中，G93用于反时间进给模式；F地址按该控制器规定描述当前插补段的时间关系。不同CNC的组别、单位和逐段要求可能不同，必须核对当前CNC与机床厂原厂手册。",
    "usage": "常见于4/5轴联动和CAM后处理输出。使用前先确认本机是否支持G93、G93/G94/G95的模式或组别关系、F地址单位与逐段要求，并验证CAM后处理、机床运动学、轴行程、刀具/刀柄/工件/夹具及完整碰撞空间。",
    "beginner": "把G93理解成一种会改变F地址解释方式的高风险进给模式，不要背固定F值或固定轴位置。看到G93先确认机床类型、当前CNC、单位制和原厂手册，再判断这一段程序。",
    "warning": "G93、G94、G95的含义、模态关系、F地址单位以及每个插补段是否必须重新给F，必须以当前CNC与机床厂原厂手册为准。4/5轴程序还受CAM后处理和本机运动学影响；真实机床执行前必须检查全部轴运动与碰撞空间，并按现场规程进行图形检查、仿真、单段、低倍率或其它受控验证。",
    "example": "教学语义示意：部分铣床/加工中心CNC中G93表示反时间进给模式；具体F地址单位、逐段要求、轴位置和切换回G94/G95的规则必须逐项以当前CNC和机床厂原厂手册为准，不提供可直接照抄的固定F或轴位置。",
    "risk": "高",
    "tags": [
      "G93",
      "反时间进给",
      "4/5轴",
      "CAM",
      "运动学",
      "碰撞空间",
      "当前CNC",
      "原厂手册"
    ]
  },'''

gm = gm_path.read_text(encoding='utf-8')
if old_g93 not in gm:
    raise SystemExit('expected unsafe G93 source block not found')
gm_path.write_text(gm.replace(old_g93, new_g93, 1), encoding='utf-8')

alias = alias_path.read_text(encoding='utf-8')
if 'function normalizeG93(entry)' in alias:
    raise SystemExit('normalizeG93 already exists; refusing duplicate repair')
marker = '  function normalizeG94(entry) {'
if marker not in alias:
    raise SystemExit('normalizeG94 insertion marker missing')
normalize_g93 = '''  function normalizeG93(entry) {
    if (!entry || entry.id !== 'kb-gcode-g93') return entry;
    return Object.assign({}, entry, {
      title: 'G93 反时间进给（按当前CNC确认）',
      summary: '在部分铣床/加工中心CNC中，G93用于反时间进给模式；F地址按该控制器规定描述当前插补段的时间关系。不同CNC的组别、单位和逐段要求可能不同，必须核对当前CNC与机床厂原厂手册。',
      usage: '常见于4/5轴联动和CAM后处理输出。使用前先确认本机是否支持G93、G93/G94/G95的模式或组别关系、F地址单位与逐段要求，并验证CAM后处理、机床运动学、轴行程、刀具/刀柄/工件/夹具及完整碰撞空间。',
      beginner: '把G93理解成一种会改变F地址解释方式的高风险进给模式，不要背固定F值或固定轴位置。看到G93先确认机床类型、当前CNC、单位制和原厂手册，再判断这一段程序。',
      warning: 'G93、G94、G95的含义、模态关系、F地址单位以及每个插补段是否必须重新给F，必须以当前CNC与机床厂原厂手册为准。4/5轴程序还受CAM后处理和本机运动学影响；真实机床执行前必须检查全部轴运动与碰撞空间，并按现场规程进行图形检查、仿真、单段、低倍率或其它受控验证。',
      example: '教学语义示意：部分铣床/加工中心CNC中G93表示反时间进给模式；具体F地址单位、逐段要求、轴位置和切换回G94/G95的规则必须逐项以当前CNC和机床厂原厂手册为准，不提供可直接照抄的固定F或轴位置。',
      risk: '高',
      tags: ['G93','反时间进给','4/5轴','CAM','运动学','碰撞空间','当前CNC','原厂手册']
    });
  }

'''
alias = alias.replace(marker, normalize_g93 + marker, 1)
old_catalog = "return value.map(function (entry) { return normalizeG99(normalizeG98(normalizeG97(normalizeG96(normalizeG95(normalizeG94(normalizeG92(normalizeG53(normalizeG28(normalizeG10(entry)))))))))); });"
new_catalog = "return value.map(function (entry) { return normalizeG99(normalizeG98(normalizeG97(normalizeG96(normalizeG95(normalizeG94(normalizeG93(normalizeG92(normalizeG53(normalizeG28(normalizeG10(entry))))))))))); });"
if old_catalog not in alias:
    raise SystemExit('normalizeCatalog boundary-8 chain not found')
alias = alias.replace(old_catalog, new_catalog, 1)
old_version = "version: 'g10-g28-g53-g92-g94-g95-g96-g97-g98-g99-boundary-8',"
new_version = "version: 'g10-g28-g53-g92-g93-g94-g95-g96-g97-g98-g99-boundary-9',"
if old_version not in alias:
    raise SystemExit('boundary-8 version marker not found')
alias = alias.replace(old_version, new_version, 1)
export_marker = '    normalizeG92: normalizeG92,\n    normalizeG94: normalizeG94,'
if export_marker not in alias:
    raise SystemExit('G92/G94 export marker not found')
alias = alias.replace(export_marker, '    normalizeG92: normalizeG92,\n    normalizeG93: normalizeG93,\n    normalizeG94: normalizeG94,', 1)
alias_path.write_text(alias, encoding='utf-8')

text_suffixes = {'.js','.cjs','.html','.json','.md','.css','.txt'}
for path in root.rglob('*'):
    if not path.is_file() or path.suffix.lower() not in text_suffixes:
        continue
    try:
        text = path.read_text(encoding='utf-8')
    except UnicodeDecodeError:
        # 仓库中存在少量 UTF-16/BOM 诊断产物；它们不是运行时构建针，保持字节不动。
        continue
    updated = text.replace('20260810-pwa35', '20260811-pwa36').replace('20260810-learning35', '20260811-learning36')
    if updated != text:
        path.write_text(updated, encoding='utf-8')

upgrade = root / 'tests' / 'mobile-pwa-upgrade-data-smoke.cjs'
upgrade_text = upgrade.read_text(encoding='utf-8')
upgrade_text = upgrade_text.replace("const PREVIOUS_PWA_BUILD = '20260810-pwa34'", "const PREVIOUS_PWA_BUILD = '20260810-pwa35'")
upgrade_text = upgrade_text.replace("const PREVIOUS_CACHE_REVISION = '20260810-learning34'", "const PREVIOUS_CACHE_REVISION = '20260810-learning35'")
upgrade.write_text(upgrade_text, encoding='utf-8')

info_path = root / 'build-info.json'
info = json.loads(info_path.read_text(encoding='utf-8'))
stage = str(info.get('contentStage') or '')
if 'G93反时间进给适用范围' not in stage:
    info['contentStage'] = stage + '，G93反时间进给适用范围'
info['generatedAt'] = '2026-08-11T05:30:00+08:00'
info_path.write_text(json.dumps(info, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
