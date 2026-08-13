from pathlib import Path
import json

ROOT=Path(__file__).resolve().parents[2]
OLD_PWA='20260813-pwa43'; NEW_PWA='20260813-pwa44'
OLD_CACHE='20260813-learning43'; NEW_CACHE='20260813-learning44'

changed=[]
for path in list((ROOT/'cnc').rglob('*')) + list((ROOT/'.github'/'workflows').glob('cnc-*.yml')):
    if not path.is_file():
        continue
    rel=path.relative_to(ROOT).as_posix()
    if rel.startswith(('cnc/docs/','cnc/test-results/','cnc/test-artifacts/','cnc/tools/')) or rel=='cnc/MOBILE_HOME_REFACTOR_PROGRESS.md':
        continue
    if path.suffix.lower() not in {'.js','.cjs','.html','.json','.md','.yml','.yaml'}:
        continue
    text=path.read_text(encoding='utf-8')
    updated=text.replace(OLD_PWA,NEW_PWA).replace(OLD_CACHE,NEW_CACHE)
    if updated!=text:
        path.write_text(updated,encoding='utf-8')
        changed.append(rel)

pages=[
'cnc/tests/pages-ai-teacher-offline-core-deployment-smoke.cjs',
'cnc/tests/pages-beginner-placement-offline-deployment-smoke.cjs',
'cnc/tests/pages-training-camp-route-handoff-deployment-smoke.cjs'
]
for rel in pages:
    path=ROOT/rel
    text=path.read_text(encoding='utf-8')
    text=text.replace("const currentMainPwaBuild = '20260813-pwa42';","const currentMainPwaBuild = '20260813-pwa43';")
    text=text.replace("const currentMainCacheRevision = '20260813-learning42';","const currentMainCacheRevision = '20260813-learning43';")
    if NEW_PWA not in text or OLD_PWA not in text or NEW_CACHE not in text or OLD_CACHE not in text:
        raise SystemExit(f'PWA44/PWA43 transition pins missing: {rel}')
    path.write_text(text,encoding='utf-8')
    if rel not in changed: changed.append(rel)

info_path=ROOT/'cnc'/'build-info.json'
info=json.loads(info_path.read_text(encoding='utf-8'))
info['pwaBuild']=NEW_PWA
info['cacheRevision']=NEW_CACHE
info['generatedAt']='2026-08-13T13:30:00+08:00'
phrase='共享训练档案异常学习数据严格语义'
stage=str(info.get('contentStage',''))
if phrase not in stage: info['contentStage']=stage.rstrip('，')+'、'+phrase
info_path.write_text(json.dumps(info,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
if 'cnc/build-info.json' not in changed: changed.append('cnc/build-info.json')

print('\n'.join(sorted(set(changed))))
