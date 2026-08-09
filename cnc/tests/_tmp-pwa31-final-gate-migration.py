from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BF = ROOT / 'cnc' / 'tests' / 'mobile-pwa-profile-bfcache-smoke.cjs'
PLACEMENT = ROOT / 'cnc' / 'tests' / 'pages-beginner-placement-offline-deployment-smoke.cjs'


def replace_known(text, old, new, label):
    if new in text:
        return text
    if old not in text:
        raise SystemExit(f'{label}: 既不是已知旧状态也不是目标状态')
    return text.replace(old, new)


def migrate_bfcache(path):
    text = path.read_text(encoding='utf-8-sig')
    text = replace_known(text, "const PWA_BUILD = '20260809-pwa30';", "const PWA_BUILD = '20260809-pwa31';", 'BFCache PWA')
    text = replace_known(text, "const CACHE_REVISION = '20260809-learning30';", "const CACHE_REVISION = '20260809-learning31';", 'BFCache cache')
    for token in ["PWA_BUILD = '20260809-pwa31'", "CACHE_REVISION = '20260809-learning31'", 'pageshowPersisted: true', 'bfcacheRestore: true']:
        if token not in text:
            raise SystemExit(f'BFCache缺少目标契约: {token}')
    path.write_text(text, encoding='utf-8')


def migrate_placement(path):
    text = path.read_text(encoding='utf-8-sig')
    for old, new in [
        ("const branchTargetPwaBuild = '20260809-pwa30';", "const branchTargetPwaBuild = '20260809-pwa31';"),
        ("const previousPublicPwaBuild = '20260809-pwa29';", "const previousPublicPwaBuild = '20260809-pwa30';"),
        ("[branchTargetPwaBuild]: '20260809-learning30'", "[branchTargetPwaBuild]: '20260809-learning31'"),
        ("[previousPublicPwaBuild]: '20260809-learning29'", "[previousPublicPwaBuild]: '20260809-learning30'"),
        ("'G/M代码首次安装离线核心','G28参考点返回适用范围']);", "'G/M代码首次安装离线核心','G28参考点返回适用范围','G53机床坐标定位适用范围','G92车铣双语义适用范围']);")
    ]:
        text = replace_known(text, old, new, f'placement {old}')
    for token in ["branchTargetPwaBuild = '20260809-pwa31'", "previousPublicPwaBuild = '20260809-pwa30'", "[branchTargetPwaBuild]: '20260809-learning31'", "[previousPublicPwaBuild]: '20260809-learning30'", 'G53机床坐标定位适用范围', 'G92车铣双语义适用范围', 'process.exit(1)']:
        if token not in text:
            raise SystemExit(f'placement缺少目标契约: {token}')
    path.write_text(text, encoding='utf-8')

for p in [BF, PLACEMENT]:
    if not p.exists():
        raise SystemExit(f'目标文件不存在: {p}')
migrate_bfcache(BF)
migrate_placement(PLACEMENT)
print('PWA31 BFCache与起点测评Pages部署测试迁移完成')
