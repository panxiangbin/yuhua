from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[2]
old_pwa='20260813-pwa43'; new_pwa='20260813-pwa44'
old_cache='20260813-learning43'; new_cache='20260813-learning44'
changed=[]
for path in list((ROOT/'cnc').rglob('*'))+list((ROOT/'.github'/'workflows').glob('cnc-*.yml')):
    if not path.is_file(): continue
    rel=path.relative_to(ROOT).as_posix()
    if rel.startswith(('cnc/docs/','cnc/test-results/','cnc/test-artifacts/','cnc/tools/')) or rel=='cnc/MOBILE_HOME_REFACTOR_PROGRESS.md': continue
    if path.suffix.lower() not in {'.js','.cjs','.html','.json','.md','.yml','.yaml'}: continue
    text=path.read_text(encoding='utf-8')
    updated=text.replace(old_pwa,new_pwa).replace(old_cache,new_cache)
    if updated!=text:
        path.write_text(updated,encoding='utf-8'); changed.append(rel)
for rel in ['cnc/tests/pages-ai-teacher-offline-core-deployment-smoke.cjs','cnc/tests/pages-beginner-placement-offline-deployment-smoke.cjs','cnc/tests/pages-training-camp-route-handoff-deployment-smoke.cjs']:
    path=ROOT/rel; text=path.read_text(encoding='utf-8')
    text=text.replace('20260813-pwa42','20260813-pwa43').replace('20260813-learning42','20260813-learning43')
    if not all(token in text for token in (new_pwa,old_pwa,new_cache,old_cache)): raise SystemExit('transition pins missing: '+rel)
    path.write_text(text,encoding='utf-8'); changed.append(rel)
info_path=ROOT/'cnc'/'build-info.json'; info=json.loads(info_path.read_text(encoding='utf-8'))
info['pwaBuild']=new_pwa; info['cacheRevision']=new_cache; info['generatedAt']='2026-08-13T13:30:00+08:00'
phrase='共享训练档案异常学习数据严格语义'; stage=str(info.get('contentStage',''))
if phrase not in stage: info['contentStage']=stage.rstrip('，')+'、'+phrase
info_path.write_text(json.dumps(info,ensure_ascii=False,indent=2)+'\n',encoding='utf-8'); changed.append('cnc/build-info.json')
print('\n'.join(sorted(set(changed))))
