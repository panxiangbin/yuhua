from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WF = ROOT / '.github' / 'workflows'
OLD_PWA = '20260817-pwa48'
NEW_PWA = '20260817-pwa49'
OLD_CACHE = '20260817-learning48'
NEW_CACHE = '20260817-learning49'
OLD_MAIN = '20260815-pwa47'
NEW_MAIN = OLD_PWA
OLD_MAIN_CACHE = '20260815-learning47'
NEW_MAIN_CACHE = OLD_CACHE
TRANSITION_FILES = {
    'cnc-ai-teacher-offline-core-pages-smoke.yml',
    'cnc-beginner-placement-offline-pages-smoke.yml',
    'cnc-training-camp-route-handoff-pages-smoke.yml',
}

changed=[]
for path in sorted(WF.glob('cnc-*.yml')):
    text=path.read_text(encoding='utf-8')
    updated=text.replace(OLD_PWA, NEW_PWA).replace(OLD_CACHE, NEW_CACHE)
    if path.name in TRANSITION_FILES:
        updated=updated.replace(OLD_MAIN, NEW_MAIN).replace(OLD_MAIN_CACHE, NEW_MAIN_CACHE)
    if updated!=text:
        path.write_text(updated,encoding='utf-8')
        changed.append(path.relative_to(ROOT).as_posix())

if not changed:
    raise SystemExit('没有发现需要同步的PWA49 CNC工作流构建针')

# 四代治理：工作流中允许PWA49当前目标；PWA48仅允许三个Pages当前main过渡；PWA37/PWA35保持历史治理。
for path in sorted(WF.glob('cnc-*.yml')):
    text=path.read_text(encoding='utf-8')
    if OLD_MAIN in text or OLD_MAIN_CACHE in text:
        raise SystemExit(f'仍存在旧PWA47当前main工作流引用：{path}')
    if OLD_PWA in text or OLD_CACHE in text:
        if path.name not in TRANSITION_FILES:
            raise SystemExit(f'PWA48只允许三个Pages当前main过渡工作流：{path}')

print('PWA49工作流同步完成：')
for item in changed:
    print(item)
