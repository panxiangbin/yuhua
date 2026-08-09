from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
AI_TEST = ROOT / 'cnc' / 'tests' / 'pages-ai-teacher-offline-core-deployment-smoke.cjs'
CAMP_TEST = ROOT / 'cnc' / 'tests' / 'pages-training-camp-route-handoff-deployment-smoke.cjs'


def require_known(text: str, old: str, new: str, label: str) -> str:
    if new in text:
        return text
    if old not in text:
        raise SystemExit(f'{label}: 既不是已知旧状态也不是目标状态')
    return text.replace(old, new)


def migrate_ai_pages_test(path: Path) -> None:
    text = path.read_text(encoding='utf-8-sig')
    replacements = [
        ("const branchTargetPwaBuild = '20260809-pwa30';", "const branchTargetPwaBuild = '20260809-pwa31';"),
        ("const previousPublicPwaBuild = '20260809-pwa29';", "const previousPublicPwaBuild = '20260809-pwa30';"),
        ("[branchTargetPwaBuild]: '20260809-learning30'", "[branchTargetPwaBuild]: '20260809-learning31'"),
        ("[previousPublicPwaBuild]: '20260809-learning29'", "[previousPublicPwaBuild]: '20260809-learning30'"),
        ("'G/M代码首次安装离线核心','G28参考点返回适用范围']);", "'G/M代码首次安装离线核心','G28参考点返回适用范围','G53机床坐标定位适用范围','G92车铣双语义适用范围']);"),
        ("'G/M代码首次安装离线核心','G28参考点返回适用范围');", "'G/M代码首次安装离线核心','G28参考点返回适用范围','G53机床坐标定位适用范围','G92车铣双语义适用范围');"),
        ("'G/M代码首次安装离线核心','G28参考点返回适用范围', ...VIDEO_CORE_PATHS);", "'G/M代码首次安装离线核心','G28参考点返回适用范围','G53机床坐标定位适用范围','G92车铣双语义适用范围', ...VIDEO_CORE_PATHS);"),
    ]
    for old, new in replacements:
        text = require_known(text, old, new, f'{path.name}: {old}')
    for token in [
        "branchTargetPwaBuild = '20260809-pwa31'",
        "previousPublicPwaBuild = '20260809-pwa30'",
        "[branchTargetPwaBuild]: '20260809-learning31'",
        "[previousPublicPwaBuild]: '20260809-learning30'",
        'G53机床坐标定位适用范围',
        'G92车铣双语义适用范围',
        'process.exit(1)'
    ]:
        if token not in text:
            raise SystemExit(f'{path.name}: 缺少目标契约 {token}')
    path.write_text(text, encoding='utf-8')


def migrate_training_camp_test(path: Path) -> None:
    text = path.read_text(encoding='utf-8-sig')
    replacements = [
        ("const expectedPwaBuild = '20260809-pwa30';", "const expectedPwaBuild = '20260809-pwa31';"),
        ("const previousPublicPwaBuild = '20260809-pwa29';", "const previousPublicPwaBuild = '20260809-pwa30';"),
        ("[expectedPwaBuild]: '20260809-learning30'", "[expectedPwaBuild]: '20260809-learning31'"),
        ("[previousPublicPwaBuild]: '20260809-learning29'", "[previousPublicPwaBuild]: '20260809-learning30'"),
        ("'G/M代码首次安装离线核心','G28参考点返回适用范围'", "'G/M代码首次安装离线核心','G28参考点返回适用范围','G53机床坐标定位适用范围','G92车铣双语义适用范围'"),
    ]
    for old, new in replacements:
        text = require_known(text, old, new, f'{path.name}: {old}')
    for token in [
        "expectedPwaBuild = '20260809-pwa31'",
        "previousPublicPwaBuild = '20260809-pwa30'",
        "[expectedPwaBuild]: '20260809-learning31'",
        "[previousPublicPwaBuild]: '20260809-learning30'",
        'G53机床坐标定位适用范围',
        'G92车铣双语义适用范围',
        'process.exit(1)'
    ]:
        if token not in text:
            raise SystemExit(f'{path.name}: 缺少目标契约 {token}')
    path.write_text(text, encoding='utf-8')


for target in [AI_TEST, CAMP_TEST]:
    if not target.exists():
        raise SystemExit(f'目标文件不存在: {target}')

migrate_ai_pages_test(AI_TEST)
migrate_training_camp_test(CAMP_TEST)
print('PWA31 AI老师与训练营 Pages exact-deployment 测试迁移完成')
