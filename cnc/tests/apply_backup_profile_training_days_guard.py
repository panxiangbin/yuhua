from pathlib import Path

backup = Path('cnc/data-backup.html')
test = Path('cnc/tests/mobile-data-backup-history-migration-smoke.cjs')

backup_text = backup.read_text(encoding='utf-8')
test_text = test.read_text(encoding='utf-8')

old_desc = '未知键、非法数据结构、损坏JSON与摘要不一致都会拒绝；课程完成数组含无法确认条目时保留备份原件，但禁止该项自动恢复，可继续恢复其他安全数据。'
new_desc = '未知键、非法数据结构、损坏JSON与摘要不一致都会拒绝；课程完成数组或训练日证据含无法确认条目时保留备份原件，但禁止对应高风险数据项自动恢复，可继续恢复其他安全数据。'
if old_desc in backup_text:
    backup_text = backup_text.replace(old_desc, new_desc, 1)
elif new_desc not in backup_text:
    raise SystemExit('data-backup description sentinel missing')

old_block = "function stageLevel(v){if(typeof v==='number'&&Number.isInteger(v)&&v>=1&&v<=12)return v;if(typeof v==='string'){const m=v.match(/^stage-(\\d{1,2})$/i),n=Number(m&&m[1]);if(Number.isInteger(n)&&n>=1&&n<=12)return n}return null}\nfunction backupWarnings(data){const warnings={},rows=data&&data[STUDY_COMPLETED_KEY];if(Array.isArray(rows)){const invalid=rows.filter(v=>stageLevel(v)===null).length;if(invalid)warnings[STUDY_COMPLETED_KEY]=`发现${invalid}个无法确认的课程完成项，禁止自动恢复该项；请保留备份原件并先在数据健康页核对。`}return warnings}"
new_block = "function stageLevel(v){if(typeof v==='number'&&Number.isInteger(v)&&v>=1&&v<=12)return v;if(typeof v==='string'){const m=v.match(/^stage-(\\d{1,2})$/i),n=Number(m&&m[1]);if(Number.isInteger(n)&&n>=1&&n<=12)return n}return null}\nfunction validTrainingDay(v){if(typeof v!=='string'||!v)return false;const m=v.match(/^(\\d{4})-(\\d{2})-(\\d{2})$/);if(!m)return false;const y=Number(m[1]),mo=Number(m[2]),d=Number(m[3]),dt=new Date(Date.UTC(y,mo-1,d));return dt.getUTCFullYear()===y&&dt.getUTCMonth()===mo-1&&dt.getUTCDate()===d}\nfunction backupWarnings(data){const warnings={},rows=data&&data[STUDY_COMPLETED_KEY];if(Array.isArray(rows)){const invalid=rows.filter(v=>stageLevel(v)===null).length;if(invalid)warnings[STUDY_COMPLETED_KEY]=`发现${invalid}个无法确认的课程完成项，禁止自动恢复该项；请保留备份原件并先在数据健康页核对。`}const profile=data&&data.cnc_training_profile_v1;if(profile&&Object.prototype.hasOwnProperty.call(profile,'trainingDays')){if(!Array.isArray(profile.trainingDays))warnings.cnc_training_profile_v1='trainingDays 不是数组，禁止自动恢复学习档案；请保留备份原件并先在数据健康页核对。';else{const invalidDays=profile.trainingDays.filter(v=>!validTrainingDay(v)).length;if(invalidDays)warnings.cnc_training_profile_v1=`发现${invalidDays}个无法确认的训练日条目，禁止自动恢复学习档案；请保留备份原件并先在数据健康页核对。`}}return warnings}"
if old_block in backup_text:
    backup_text = backup_text.replace(old_block, new_block, 1)
elif new_block not in backup_text:
    raise SystemExit('backupWarnings sentinel missing')

insert_after = "assert.equal(state.profile.xp,881);assert.deepEqual(state.completed,[4,5,'stage-6']);"
scenario = "const riskyTrainingDays=await page.evaluate(()=>{const data={cnc_training_profile_v1:{version:1,xp:882,trainingDays:['2026-08-14','2026-02-30',null,{}]},cnc_study_completed_v1:[7,8]};return {format:'cnc-training-backup',version:2,createdAt:new Date().toISOString(),source:'训练日证据高风险恢复测试',digestAlgorithm:'fnv1a-32-stable-json',digest:digest(data),data}});await page.locator('#import-input').fill(JSON.stringify(riskyTrainingDays));await page.locator('#preview-btn').click();await page.waitForFunction(()=>document.querySelector('#import-status')?.textContent.includes('高风险'));const riskyProfileDays=page.locator('input[data-restore-key=\"cnc_training_profile_v1\"]');assert(await riskyProfileDays.isDisabled());assert.equal(await riskyProfileDays.isChecked(),false);assert((await page.locator('#preview-grid').textContent()).includes('训练日'));const safeCompleted=page.locator('input[data-restore-key=\"cnc_study_completed_v1\"]');assert.equal(await safeCompleted.isDisabled(),false);assert.equal(await safeCompleted.isChecked(),true);await page.locator('#confirm-check').check();await page.locator('#restore-btn').click();await page.waitForFunction(()=>document.querySelector('#recovery-status')?.textContent.includes('已写入1个'));state=await page.evaluate(()=>({profile:JSON.parse(localStorage.getItem('cnc_training_profile_v1')),completed:JSON.parse(localStorage.getItem('cnc_study_completed_v1'))}));assert.equal(state.profile.xp,881);assert.deepEqual(state.completed,[7,8]);"
if scenario not in test_text:
    if insert_after not in test_text:
        raise SystemExit('test insertion sentinel missing')
    test_text = test_text.replace(insert_after, insert_after + scenario, 1)

old_preserved = "assert.deepEqual(preserved.completed,[4,5,'stage-6']);"
new_preserved = "assert.deepEqual(preserved.completed,[7,8]);"
if old_preserved in test_text:
    test_text = test_text.replace(old_preserved, new_preserved, 1)
elif new_preserved not in test_text:
    raise SystemExit('preserved completed sentinel missing')

old_report = "studyCompletedInvalidEntriesBlocked:true,healthyBackupItemsStillRestorable:true,minTouch:min"
new_report = "studyCompletedInvalidEntriesBlocked:true,profileTrainingDaysInvalidEntriesBlocked:true,healthyBackupItemsStillRestorable:true,healthyCompletedStillRestorableWithRiskyProfile:true,minTouch:min"
if old_report in test_text:
    test_text = test_text.replace(old_report, new_report, 1)
elif new_report not in test_text:
    raise SystemExit('report sentinel missing')

backup.write_text(backup_text, encoding='utf-8')
test.write_text(test_text, encoding='utf-8')
print('backup profile trainingDays guard applied')
