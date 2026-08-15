from pathlib import Path
import json

HTML = Path('cnc/training-achievements.html')
TEST = Path('cnc/tests/mobile-training-achievements-smoke.cjs')
ARTIFACT = Path('cnc/test-artifacts/training-achievements/fix-manifest.json')

html = HTML.read_text(encoding='utf-8')
old_completed = "function completedCourses(study,profile){var set=new Set();if(study.valid&&study.present){study.value.forEach(function(v){var n=stageLevel(v);if(n!==null)set.add(n);});return set;}if(!study.present&&profile.valid){[].concat(Array.isArray(profile.value.completed)?profile.value.completed:[],Array.isArray(profile.value.completedStages)?profile.value.completedStages:[]).forEach(function(v){var n=stageLevel(v);if(n!==null)set.add(n);});}return set;}"
new_completed = "function addCompleted(set,values,source){values.forEach(function(v){var n=stageLevel(v);if(n===null){invalid.push(source+':entry');return;}set.add(n);});}\n    function completedCourses(study,profile){var set=new Set();if(study.valid&&study.present){addCompleted(set,study.value,'cnc_study_completed_v1');return set;}if(!study.present&&profile.valid){if(Array.isArray(profile.value.completed))addCompleted(set,profile.value.completed,'cnc_training_profile_v1.completed');if(Array.isArray(profile.value.completedStages))addCompleted(set,profile.value.completedStages,'cnc_training_profile_v1.completedStages');}return set;}"
if html.count(old_completed) != 1:
    raise SystemExit(f'成长成果 completedCourses 目标片段数量异常：{html.count(old_completed)}')
html = html.replace(old_completed, new_completed, 1)
HTML.write_text(html, encoding='utf-8')

test = TEST.read_text(encoding='utf-8')
old_snapshot = """    integrity: true,\n    invalid: [],\n    nextKind: 'course',\n    nextLevel: 3\n"""
new_snapshot = """    integrity: false,\n    invalid: ['cnc_study_completed_v1:entry'],\n    nextKind: 'integrity',\n    nextLevel: null\n"""
if test.count(old_snapshot) != 1:
    raise SystemExit(f'成长成果异常快照目标片段数量异常：{test.count(old_snapshot)}')
test = test.replace(old_snapshot, new_snapshot, 1)

old_route = """  assert.match(await page.locator('#next-title').textContent(), /第 3 关/);\n  assert.equal(await page.locator('#data-integrity').isHidden(), true);\n  const bodyText = await page.locator('body').textContent();\n"""
new_route = """  assert.match(await page.locator('#next-title').textContent(), /检查学习数据/);\n  assert.equal(await page.locator('#data-integrity').isHidden(), false);\n  assert.match(await page.locator('#data-integrity-copy').textContent(), /cnc_study_completed_v1:entry/);\n  assert.match(await page.locator('#next-link').getAttribute('href'), /data-health\\.html/);\n  const bodyText = await page.locator('body').textContent();\n"""
if test.count(old_route) != 1:
    raise SystemExit(f'成长成果异常路线目标片段数量异常：{test.count(old_route)}')
test = test.replace(old_route, new_route, 1)
test = test.replace('// 嵌套记录损坏时只读降级：数值字符串、越界分数、未知ID、数组和重复记录都不能抬高成长成果。', '// 嵌套记录损坏时只读阻断：非法课程完成项不得被静默忽略后继续生成个性化路线。', 1)
TEST.write_text(test, encoding='utf-8')

ARTIFACT.parent.mkdir(parents=True, exist_ok=True)
ARTIFACT.write_text(json.dumps({
    'productionFile': str(HTML),
    'browserTest': str(TEST),
    'invalidMarker': 'cnc_study_completed_v1:entry',
    'expectedBehavior': 'canonical 中非法课程完成项只读保留，但标记数据异常并阻断个性化路线',
    'changedFiles': [str(HTML), str(TEST)]
}, ensure_ascii=False, indent=2), encoding='utf-8')
print('成长成果非法课程完成项严格阻断补丁已生成')
