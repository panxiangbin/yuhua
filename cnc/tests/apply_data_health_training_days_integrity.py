from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HTML = ROOT / 'cnc' / 'data-health.html'
TEST = ROOT / 'cnc' / 'tests' / 'mobile-data-health-smoke.cjs'


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly 1 match, got {count}')
    return text.replace(old, new, 1)


html = HTML.read_text(encoding='utf-8')
html = replace_once(
    html,
    '日期格式、奖励标记、错题结构、模拟记录、课程完成记录和备份新鲜度。',
    '日期格式、训练日记录、奖励标记、错题结构、模拟记录、课程完成记录和备份新鲜度。',
    'hero copy',
)
html = replace_once(html, '<h2>9项健康检查</h2>', '<h2>10项健康检查</h2>', 'check count heading')
html = replace_once(
    html,
    'let valid=0,parseBad=0,shapeBad=0,versionMissing=0,dateBad=0,rewardRisk=0,wrongShape=0,simShape=0;',
    'let valid=0,parseBad=0,shapeBad=0,versionMissing=0,dateBad=0,trainingDayShapeBad=0,trainingDayInvalid=0,rewardRisk=0,wrongShape=0,simShape=0;',
    'scan counters',
)
old_profile = "if(k==='cnc_training_profile_v1'){const duplicateTrainingDays=Array.isArray(d.trainingDays)&&d.trainingDays.some((v,i,a)=>typeof v==='string'&&a.indexOf(v)!==i);const duplicateBadges=Array.isArray(d.badges)&&d.badges.some((v,i,a)=>typeof v==='string'&&a.indexOf(v)!==i);rewardRisk+=Number(duplicateTrainingDays)+Number(duplicateBadges);if(duplicateTrainingDays||duplicateBadges)state.issues.push(`${k}: 奖励相关记录重复`)}"
new_profile = "if(k==='cnc_training_profile_v1'){if('trainingDays'in d){if(!Array.isArray(d.trainingDays)){trainingDayShapeBad++;state.issues.push(`${k}: trainingDays 根结构不是数组`)}else{const invalidRows=d.trainingDays.filter(v=>!validDate(v)).length;trainingDayInvalid+=invalidRows;if(invalidRows)state.issues.push(`${k}: ${invalidRows}个训练日条目无法确认`)}}const duplicateTrainingDays=Array.isArray(d.trainingDays)&&d.trainingDays.some((v,i,a)=>typeof v==='string'&&a.indexOf(v)!==i);const duplicateBadges=Array.isArray(d.badges)&&d.badges.some((v,i,a)=>typeof v==='string'&&a.indexOf(v)!==i);rewardRisk+=Number(duplicateTrainingDays)+Number(duplicateBadges);if(duplicateTrainingDays||duplicateBadges)state.issues.push(`${k}: 奖励相关记录重复`)}"
html = replace_once(html, old_profile, new_profile, 'trainingDays scan')
html = replace_once(
    html,
    "addCheck('日期格式',dateBad?'warn':'ok',dateBad?`${dateBad}个日期无效，可移除异常字段`:'已检查常用训练日期字段');addCheck('奖励重复风险'",
    "addCheck('日期格式',dateBad?'warn':'ok',dateBad?`${dateBad}个日期无效，可移除异常字段`:'已检查常用训练日期字段');addCheck('训练日记录',trainingDayShapeBad?'bad':trainingDayInvalid?'warn':'ok',trainingDayShapeBad?'trainingDays 必须为数组，请先备份并人工核对；本页不会自动重写训练日记录':trainingDayInvalid?`发现${trainingDayInvalid}个无法确认的训练日条目，请先备份并人工核对；本页不会自动删除或改写训练日记录`:'trainingDays 结构与日期条目可读取');addCheck('奖励重复风险'",
    'trainingDays health check',
)
HTML.write_text(html, encoding='utf-8')


test = TEST.read_text(encoding='utf-8')
original_rows = "trainingDays:['2026-08-12','2026-08-12']"
expanded_rows = "trainingDays:['2026-08-12','2026-08-12','2026-02-30',null,7,{},[]]"
test = replace_once(test, original_rows, expanded_rows, 'trainingDays fixture')
test = test.replace("querySelectorAll('#checks .check').length===9", "querySelectorAll('#checks .check').length===10")
if "length===9" in test:
    raise SystemExit('stale 9-check wait remains')
insert_after = "assert((await page.locator('#checks').textContent()).includes('备份时间无效'),'不存在的备份日期必须提示重新导出');"
training_assert = "const trainingDayCheck=page.locator('#checks .check').filter({hasText:'训练日记录'});assert.equal(await trainingDayCheck.count(),1);const trainingDayText=await trainingDayCheck.textContent();assert(trainingDayText.includes('5个无法确认的训练日条目'),'必须识别不存在日期、null、数字、对象与数组等5个异常训练日条目');assert(trainingDayText.includes('不会自动删除或改写训练日记录'),'训练日异常只能提示，不得静默清洗');"
test = replace_once(test, insert_after, insert_after + training_assert, 'trainingDays assertions')
old_fixed = "assert.deepEqual(fixed.profile.trainingDays,['2026-08-12','2026-08-12'],'数据健康页不得自动删除重复训练日');"
new_fixed = "assert.deepEqual(fixed.profile.trainingDays,['2026-08-12','2026-08-12','2026-02-30',null,7,{},[]],'数据健康页不得自动删除或改写异常训练日证据');"
test = replace_once(test, old_fixed, new_fixed, 'fixed trainingDays read-only')
old_rolled = "assert.deepEqual(rolled.profile.trainingDays,['2026-08-12','2026-08-12']);"
new_rolled = "assert.deepEqual(rolled.profile.trainingDays,['2026-08-12','2026-08-12','2026-02-30',null,7,{},[]]);"
test = replace_once(test, old_rolled, new_rolled, 'rolled trainingDays read-only')
insert_shape_after = "assert.equal(await page.evaluate(()=>localStorage.getItem('cnc_study_completed_v1')),badDone,'根结构诊断不得改写 canonical 课程完成记录');"
shape_test = "const badTrainingDays=JSON.stringify({version:1,trainingDays:{a:'2026-08-12'},badges:[]});await page.evaluate(v=>localStorage.setItem('cnc_training_profile_v1',v),badTrainingDays);await page.reload();await page.waitForFunction(()=>document.querySelectorAll('#checks .check').length===10);const badTrainingDayCheck=page.locator('#checks .check').filter({hasText:'训练日记录'});const badTrainingDayText=await badTrainingDayCheck.textContent();assert(badTrainingDayText.includes('损坏'),'trainingDays 非数组必须标为损坏');assert(badTrainingDayText.includes('trainingDays 必须为数组'),'trainingDays 根结构必须保持数组');assert.equal(await page.evaluate(()=>localStorage.getItem('cnc_training_profile_v1')),badTrainingDays,'trainingDays 根结构诊断不得改写学习档案');"
test = replace_once(test, insert_shape_after, insert_shape_after + shape_test, 'trainingDays shape regression')
old_report = "JSON.stringify({checks:9,repairs:7,snapshot:true,rollback:true,strictCalendarDate:true,invalidBackupDateWarns:true,futureBackupWarns:true,rewardDuplicateRiskWarns:true,wrongCompatFields:true,canonicalCompletionWarns:true,canonicalCompletionRootRejects:true,preservedCanonicalCompletion:true,preservedRewardRecords:true,preservedUnrelated:true,minTouch:min},null,2)"
new_report = "JSON.stringify({checks:10,repairs:7,snapshot:true,rollback:true,strictCalendarDate:true,trainingDayEntryWarns:true,trainingDayShapeRejects:true,preservedTrainingDayEvidence:true,invalidBackupDateWarns:true,futureBackupWarns:true,rewardDuplicateRiskWarns:true,wrongCompatFields:true,canonicalCompletionWarns:true,canonicalCompletionRootRejects:true,preservedCanonicalCompletion:true,preservedRewardRecords:true,preservedUnrelated:true,minTouch:min},null,2)"
test = replace_once(test, old_report, new_report, 'diagnostic report')
TEST.write_text(test, encoding='utf-8')

print('patched data-health trainingDays integrity checks')
