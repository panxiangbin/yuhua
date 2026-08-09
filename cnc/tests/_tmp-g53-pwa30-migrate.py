from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[2]


def read(path, encoding='utf-8'):
    return (ROOT / path).read_text(encoding=encoding)


def write(path, text, encoding='utf-8'):
    (ROOT / path).write_text(text, encoding=encoding)


def replace_once(path, old, new, encoding='utf-8'):
    text = read(path, encoding)
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected exactly one old block, found {count}')
    write(path, text.replace(old, new, 1), encoding)


def rotate_versions(path):
    text = read(path)
    pwa_tmp = '__PWA30_CURRENT__'
    learning_tmp = '__LEARNING30_CURRENT__'
    text = text.replace('20260809-pwa29', pwa_tmp)
    text = text.replace('20260809-pwa28', '20260809-pwa29')
    text = text.replace(pwa_tmp, '20260809-pwa30')
    text = text.replace('20260809-learning29', learning_tmp)
    text = text.replace('20260809-learning28', '20260809-learning29')
    text = text.replace(learning_tmp, '20260809-learning30')
    write(path, text)


# 1) 基础 G/M 目录：直接修正 G53 源条目，不能只靠运行时覆盖掩盖旧危险文本。
gm_path = 'cnc/gm-code-complete.js'
gm = read(gm_path, 'utf-8-sig')
old_g53 = '''  {
    "id": "kb-gcode-g53",
    "category": "G代码",
    "title": "G53 机床坐标系定位",
    "code": "G53",
    "aliases": [
      "机械坐标",
      "Machine coordinate"
    ],
    "summary": "在当前段使用机床坐标进行定位，不受G54等工件坐标影响。",
    "usage": "安全回换刀点、回固定机械位置时使用。",
    "beginner": "G53通常是非模态，只影响当前段。",
    "warning": "G53坐标是机械坐标，写错可能直接撞到行程端或夹具。",
    "example": "G53 G00 Z0 表示以机床坐标快速移动到Z0。",
    "risk": "高",
    "tags": [
      "G53",
      "机械坐标",
      "安全回退"
    ]
  },'''
new_g53 = '''  {
    "id": "kb-gcode-g53",
    "category": "G代码",
    "title": "G53 机床坐标系定位",
    "code": "G53",
    "aliases": [
      "机械坐标",
      "Machine coordinate"
    ],
    "summary": "G53常用于在当前程序段按机床坐标解释定位，通常属于非模态的高风险运动；具体对工件坐标偏置、刀补或其它补偿的影响取决于当前CNC和机床厂实现。",
    "usage": "只有在已经核对本机原厂手册、机床坐标零点、目标机械坐标、刀补状态、轴行程和完整计划运动空间后，才可按现场工艺受控使用。",
    "beginner": "把G53理解成“按本机规定使用机床坐标的高风险定位”，不是自动安全退刀。不能把Z0、换刀点或任何固定机械坐标当成跨机床通用安全点。",
    "warning": "机床坐标零点、G53是否忽略或取消刀补/其它补偿以及各轴可达范围会因控制器和机床配置不同而变化。执行前必须核对当前CNC和机床厂原厂手册，确认刀具、刀柄、工件、夹具在完整计划运动空间内都有安全间隙，并按现场规程先做单段、低倍率或空运行验证。",
    "example": "教学格式示意：部分控制器程序中可见G53 G00 Z...按机床坐标定位；实际目标值、运动方式和刀补影响必须逐项以本机原厂手册为准，不能把Z0直接当成安全位置复制到真实机床。",
    "risk": "高",
    "tags": [
      "G53",
      "机械坐标",
      "高风险运动",
      "机床坐标零点",
      "原厂手册",
      "空运行"
    ]
  },'''
if gm.count(old_g53) != 1:
    raise SystemExit(f'{gm_path}: G53 old block count={gm.count(old_g53)}')
gm = gm.replace(old_g53, new_g53, 1)
write(gm_path, gm, 'utf-8-sig')

# 2) 运行时防御：在基础源正确的前提下再给 G53 加第二层安全归一化。
alias_path = 'cnc/search-aliases.js'
aliases = read(alias_path)
insert_anchor = '''  function normalizeCatalog(value) {
    if (!Array.isArray(value)) return value;
    return value.map(function (entry) { return normalizeG28(normalizeG10(entry)); });
  }
'''
g53_guard = '''  function normalizeG53(entry) {
    if (!entry || entry.id !== 'kb-gcode-g53') return entry;
    return Object.assign({}, entry, {
      summary: 'G53常用于在当前程序段按机床坐标解释定位，通常属于非模态的高风险运动；具体对工件坐标偏置、刀补或其它补偿的影响取决于当前CNC和机床厂实现。',
      usage: '只有在已经核对本机原厂手册、机床坐标零点、目标机械坐标、刀补状态、轴行程和完整计划运动空间后，才可按现场工艺受控使用。',
      beginner: '把G53理解成“按本机规定使用机床坐标的高风险定位”，不是自动安全退刀。不能把Z0、换刀点或任何固定机械坐标当成跨机床通用安全点。',
      warning: '机床坐标零点、G53是否忽略或取消刀补/其它补偿以及各轴可达范围会因控制器和机床配置不同而变化。执行前必须核对当前CNC和机床厂原厂手册，确认刀具、刀柄、工件、夹具在完整计划运动空间内都有安全间隙，并按现场规程先做单段、低倍率或空运行验证。',
      example: '教学格式示意：部分控制器程序中可见G53 G00 Z...按机床坐标定位；实际目标值、运动方式和刀补影响必须逐项以本机原厂手册为准，不能把Z0直接当成安全位置复制到真实机床。',
      risk: '高',
      tags: ['G53','机械坐标','高风险运动','机床坐标零点','原厂手册','空运行']
    });
  }

  function normalizeCatalog(value) {
    if (!Array.isArray(value)) return value;
    return value.map(function (entry) { return normalizeG53(normalizeG28(normalizeG10(entry))); });
  }
'''
if aliases.count(insert_anchor) != 1:
    raise SystemExit(f'{alias_path}: normalizeCatalog anchor count={aliases.count(insert_anchor)}')
aliases = aliases.replace(insert_anchor, g53_guard, 1)
if aliases.count("version: 'g10-g28-boundary-2'") != 1:
    raise SystemExit('search-aliases: guard version anchor missing')
aliases = aliases.replace("version: 'g10-g28-boundary-2'", "version: 'g10-g28-g53-boundary-3'", 1)
if aliases.count('    normalizeG28: normalizeG28,\n    normalizeCatalog: normalizeCatalog') != 1:
    raise SystemExit('search-aliases: guard exports anchor missing')
aliases = aliases.replace('    normalizeG28: normalizeG28,\n    normalizeCatalog: normalizeCatalog', '    normalizeG28: normalizeG28,\n    normalizeG53: normalizeG53,\n    normalizeCatalog: normalizeCatalog', 1)
write(alias_path, aliases)

# 3) PWA30：G/M可信目录属于首次安装核心，内容变化必须换缓存版本。
replace_once('cnc/sw.js', "const BUILD = '20260809-pwa29';\nconst CACHE_REVISION = '20260809-learning29';", "const BUILD = '20260809-pwa30';\nconst CACHE_REVISION = '20260809-learning30';")

info_path = ROOT / 'cnc/build-info.json'
info = json.loads(info_path.read_text(encoding='utf-8'))
if info.get('pwaBuild') != '20260809-pwa29' or info.get('cacheRevision') != '20260809-learning29':
    raise SystemExit(f'build-info unexpected source: {info.get("pwaBuild")}/{info.get("cacheRevision")}')
info['pwaBuild'] = '20260809-pwa30'
info['cacheRevision'] = '20260809-learning30'
stage = str(info.get('contentStage') or '')
if 'G53机床坐标定位适用范围' not in stage:
    info['contentStage'] = stage + ' · G53机床坐标定位适用范围'
info['generatedAt'] = '2026-08-09T20:29:24+08:00'
info_path.write_text(json.dumps(info, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

for page in ['cnc/pwa-status.html', 'cnc/pwa-self-test.html']:
    text = read(page)
    if text.count('20260809-pwa29') < 1 or text.count('20260809-learning29') < 1:
        raise SystemExit(f'{page}: missing PWA29 build pins')
    text = text.replace('20260809-pwa29', '20260809-pwa30').replace('20260809-learning29', '20260809-learning30')
    g28_note = '<p class="pwa-note" data-contract="g28-reference-return-boundary"><strong>G28参考点返回适用范围：</strong>G28属于高风险自动运动；G90/G91下中间位置的绝对或增量解释、参考点状态、轴方向与顺序及安全路径必须核对当前CNC和机床厂原厂手册，并确认刀具、刀柄、工件、夹具在完整计划运动空间内都有安全间隙，按现场工艺和授权操作规程验证。不要把G91 G28 Z0或固定“先Z后XY”当成通用防撞规则。</p>'
    g53_note = g28_note + '\n  <p class="pwa-note" data-contract="g53-machine-coordinate-boundary"><strong>G53机床坐标定位适用范围：</strong>G53通常属于当前段非模态的高风险机床坐标运动，不是通用安全退刀。机床坐标零点、刀补及其它补偿影响、目标机械坐标和轴行程必须核对当前CNC与机床厂原厂手册；执行前确认刀具、刀柄、工件、夹具在完整计划运动空间内有安全间隙，并按现场规程先做单段、低倍率或空运行验证。不能把Z0、换刀点或固定机械坐标当成跨机床通用安全点。</p>'
    if text.count(g28_note) != 1:
        raise SystemExit(f'{page}: G28 note anchor count={text.count(g28_note)}')
    text = text.replace(g28_note, g53_note, 1)
    write(page, text)

progress_path = 'cnc/MOBILE_LEARNING_MEDIA_PROGRESS.md'
progress = read(progress_path)
old_target = '`20260809-pwa29 / 20260809-learning29`'
if progress.count(old_target) != 1:
    raise SystemExit(f'{progress_path}: current target anchor count={progress.count(old_target)}')
progress = progress.replace(old_target, '`20260809-pwa30 / 20260809-learning30`', 1)
progress += '\n## G53机床坐标定位适用范围\nPWA30：G53通常属于当前程序段非模态的高风险机床坐标运动，不是通用安全退刀。机床坐标零点、刀补及其它补偿影响、目标机械坐标、轴行程与完整计划运动空间必须核对当前CNC和机床厂原厂手册；执行前确认刀具、刀柄、工件、夹具有安全间隙，并按现场工艺先做单段、低倍率或空运行验证。不能把 `Z0`、换刀点或固定机械坐标当成跨机床通用安全点。\n'
write(progress_path, progress)

# 4) 当前主动 PWA 测试针迁移到 PWA30；升级门禁的上一正式版本同步从 PWA28 -> PWA29。
for path in [
    'cnc/tests/mobile-pwa-offline-cache-smoke.cjs',
    'cnc/tests/mobile-pwa-profile-bfcache-smoke.cjs',
    'cnc/tests/mobile-pwa-upgrade-data-smoke.cjs',
    'cnc/tests/pages-ai-teacher-offline-core-deployment-smoke.cjs',
    'cnc/tests/pages-beginner-placement-offline-deployment-smoke.cjs',
    'cnc/tests/pages-training-camp-route-handoff-deployment-smoke.cjs',
]:
    rotate_versions(path)

for path in ['cnc/tests/g10-programmable-data-input-trust-smoke.cjs', 'cnc/tests/g28-reference-return-boundary-trust-smoke.cjs']:
    text = read(path)
    text = text.replace('20260809-pwa29', '20260809-pwa30').replace('20260809-learning29', '20260809-learning30')
    text = text.replace("g10-g28-boundary-2", "g10-g28-g53-boundary-3")
    write(path, text)

# 最低限度的迁移后静态自检。
checks = {
    'cnc/gm-code-complete.js': ['G53通常属于', '不能把Z0', '空运行验证'],
    'cnc/search-aliases.js': ['normalizeG53', 'g10-g28-g53-boundary-3'],
    'cnc/sw.js': ['20260809-pwa30', '20260809-learning30'],
    'cnc/pwa-status.html': ['G53机床坐标定位适用范围', '20260809-pwa30'],
    'cnc/pwa-self-test.html': ['G53机床坐标定位适用范围', '20260809-pwa30'],
}
for path, tokens in checks.items():
    text = read(path, 'utf-8-sig' if path.endswith('gm-code-complete.js') else 'utf-8')
    for token in tokens:
        if token not in text:
            raise SystemExit(f'{path}: migration verification missing {token}')

print('G53基础源、运行时防御、PWA30构建标记与主动CNC测试针迁移完成。')
