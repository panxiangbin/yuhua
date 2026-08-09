from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TARGETS = {
    ROOT / 'cnc' / 'pwa-status.html',
    ROOT / 'cnc' / 'pwa-self-test.html',
    ROOT / 'cnc' / 'tests' / 'mobile-pwa-upgrade-data-smoke.cjs',
}

G92_NOTE = '  <p class="pwa-note" data-contract="g92-dual-semantic-boundary"><strong>G92车铣双语义适用范围：</strong>G92不是跨机型同一含义。部分铣床/加工中心控制器用于工作坐标系偏移或坐标设定相关功能，部分车床控制器则用于螺纹车削循环；两类程序不能直接互抄。坐标类用法须核对当前工件坐标系、G52/G54-G59等偏移、模态状态及设定/清除规则；车床螺纹循环须核对X/Z或U/W、I/Q/F等地址解释、起始位置、主轴同步、退刀或倒角设置和完整运动空间。必须以当前CNC和机床厂原厂手册、现场工艺及受控验证为准，教学格式示意不得直接作为真实机床参数。</p>\n'


def require_known(text: str, old: str, new: str, label: str) -> str:
    if new in text:
        return text
    if old not in text:
        raise SystemExit(f'{label}: 既不是已知旧状态也不是目标状态')
    return text.replace(old, new)


def migrate_status_page(path: Path) -> None:
    text = path.read_text(encoding='utf-8-sig')
    text = require_known(text, '20260809-pwa30', '20260809-pwa31', f'{path.name} pwa')
    text = require_known(text, '20260809-learning30', '20260809-learning31', f'{path.name} cache')
    if 'data-contract="g92-dual-semantic-boundary"' not in text:
        marker = '</main>'
        if marker not in text:
            raise SystemExit(f'{path.name}: 找不到main结束标记')
        text = text.replace(marker, G92_NOTE + marker, 1)
    for token in ['G92车铣双语义适用范围', '部分铣床/加工中心', '部分车床', '两类程序不能直接互抄', '当前CNC和机床厂原厂手册', 'G52/G54-G59', 'X/Z或U/W', 'I/Q/F', '主轴同步', '教学格式示意不得直接作为真实机床参数']:
        if token not in text:
            raise SystemExit(f'{path.name}: 缺少G92边界 {token}')
    path.write_text(text, encoding='utf-8')


def migrate_upgrade_test(path: Path) -> None:
    text = path.read_text(encoding='utf-8-sig')
    replacements = [
        ("const CURRENT_PWA_BUILD = '20260809-pwa30';", "const CURRENT_PWA_BUILD = '20260809-pwa31';"),
        ("const PREVIOUS_PWA_BUILD = '20260809-pwa29';", "const PREVIOUS_PWA_BUILD = '20260809-pwa30';"),
        ("const CURRENT_CACHE_REVISION = '20260809-learning30';", "const CURRENT_CACHE_REVISION = '20260809-learning31';"),
        ("const PREVIOUS_CACHE_REVISION = '20260809-learning29';", "const PREVIOUS_CACHE_REVISION = '20260809-learning30';"),
    ]
    for old, new in replacements:
        text = require_known(text, old, new, f'{path.name}: {old}')

    if "stage = 'cold-offline-g92-directory-after-upgrade';" not in text:
        marker = "    stage = 'cold-offline-main-learning-content-after-upgrade';"
        if marker not in text:
            raise SystemExit('upgrade test: 找不到G92插入位置')
        block = """    stage = 'cold-offline-g92-directory-after-upgrade';\n    const offlineG92Trust = await page.evaluate(async () => {\n      const response = await fetch('./gm-code-complete.js');\n      return { ok: response.ok, text: await response.text() };\n    });\n    assert(offlineG92Trust.ok, '升级后G92可信目录冷离线读取失败');\n    for (const token of ['车铣差异', '部分铣床/加工中心', '部分车床', '当前CNC与机床厂原厂手册', 'G52/G54-G59', 'X/Z或U/W', 'I/Q/F', '主轴同步', '安全退刀空间', '两类程序不能直接互抄']) {\n      assert(offlineG92Trust.text.includes(token), `G92冷离线源目录缺少双语义安全边界：${token}`);\n    }\n    for (const forbidden of ['加工中心/旧系统可用于坐标设定，车床常用于简单螺纹循环。', '车床：G92 X20. Z-30. F1.5 表示螺纹循环。', 'G92就是螺纹循环', 'G92就是坐标设定']) {\n      assert(!offlineG92Trust.text.includes(forbidden), `G92冷离线源目录仍含无适用范围表述：${forbidden}`);\n    }\n\n"""
        text = text.replace(marker, block + marker, 1)

    required = ["CURRENT_PWA_BUILD = '20260809-pwa31'", "PREVIOUS_PWA_BUILD = '20260809-pwa30'", "CURRENT_CACHE_REVISION = '20260809-learning31'", "PREVIOUS_CACHE_REVISION = '20260809-learning30'", "cold-offline-g92-directory-after-upgrade", 'G92冷离线源目录缺少双语义安全边界']
    for token in required:
        if token not in text:
            raise SystemExit(f'upgrade test: 缺少 {token}')
    path.write_text(text, encoding='utf-8')


for target in TARGETS:
    if not target.exists():
        raise SystemExit(f'目标文件不存在: {target}')

migrate_status_page(ROOT / 'cnc' / 'pwa-status.html')
migrate_status_page(ROOT / 'cnc' / 'pwa-self-test.html')
migrate_upgrade_test(ROOT / 'cnc' / 'tests' / 'mobile-pwa-upgrade-data-smoke.cjs')
print('PWA31状态页、自检页与PWA30→PWA31升级数据测试迁移完成')
