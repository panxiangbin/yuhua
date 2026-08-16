from pathlib import Path
import re

root = Path(__file__).resolve().parents[2]
page_path = root / 'cnc' / 'data-backup.html'
test_path = root / 'cnc' / 'tests' / 'mobile-data-backup-history-migration-smoke.cjs'

page = page_path.read_text(encoding='utf-8')
old_paragraph = '课程完成数组或训练日证据含无法确认条目时保留备份原件，但禁止对应高风险数据项自动恢复，可继续恢复其他安全数据。'
new_paragraph = '课程完成数组、训练日证据含无法确认条目，或学习档案存在重复训练日/徽章奖励证据时保留备份原件，但禁止对应高风险数据项自动恢复，可继续恢复其他安全数据。'
if old_paragraph not in page:
    raise SystemExit('data-backup paragraph marker not found')
page = page.replace(old_paragraph, new_paragraph, 1)

pattern = re.compile(r"function backupWarnings\(data\)\{.*?return warnings\}")
match = pattern.search(page)
if not match:
    raise SystemExit('backupWarnings function not found')
replacement = "function backupWarnings(data){const warnings={},rows=data&&data[STUDY_COMPLETED_KEY];if(Array.isArray(rows)){const invalid=rows.filter(v=>stageLevel(v)===null).length;if(invalid)warnings[STUDY_COMPLETED_KEY]=`发现${invalid}个无法确认的课程完成项，禁止自动恢复该项；请保留备份原件并先在数据健康页核对。`}const profile=data&&data.cnc_training_profile_v1;if(profile){const risks=[];if(Object.prototype.hasOwnProperty.call(profile,'trainingDays')){if(!Array.isArray(profile.trainingDays))risks.push('trainingDays 不是数组');else{const invalidDays=profile.trainingDays.filter(v=>!validTrainingDay(v)).length;if(invalidDays)risks.push(`发现${invalidDays}个无法确认的训练日条目`);const dayRows=profile.trainingDays.filter(v=>typeof v==='string');if(new Set(dayRows).size!==dayRows.length)risks.push('发现重复训练日记录')}}if(Array.isArray(profile.badges)){const badgeRows=profile.badges.filter(v=>typeof v==='string'&&v.trim());if(new Set(badgeRows).size!==badgeRows.length)risks.push('发现重复徽章记录')}if(risks.length)warnings.cnc_training_profile_v1=`${risks.join('；')}，禁止自动恢复学习档案；请保留备份原件并先在数据健康页核对。`}return warnings}"
page = page[:match.start()] + replacement + page[match.end():]
page_path.write_text(page, encoding='utf-8')

test = test_path.read_text(encoding='utf-8')
marker = "assert.equal(state.profile.xp,881);assert.deepEqual(state.completed,[7,8]);const invalid="
if marker not in test:
    raise SystemExit('backup test insertion marker not found')
scenario = "assert.equal(state.profile.xp,881);assert.deepEqual(state.completed,[7,8]);const riskyRewards=await page.evaluate(()=>{const data={cnc_training_profile_v1:{version:1,xp:883,trainingDays:['2026-08-14','2026-08-14'],badges:['连续训练3天','连续训练3天']},cnc_study_completed_v1:[9,10]};return {format:'cnc-training-backup',version:2,createdAt:new Date().toISOString(),source:'重复奖励证据高风险恢复测试',digestAlgorithm:'fnv1a-32-stable-json',digest:digest(data),data}});await page.locator('#import-input').fill(JSON.stringify(riskyRewards));await page.locator('#preview-btn').click();await page.waitForFunction(()=>document.querySelector('#import-status')?.textContent.includes('高风险'));const riskyRewardProfile=page.locator('input[data-restore-key=\"cnc_training_profile_v1\"]');assert(await riskyRewardProfile.isDisabled());assert.equal(await riskyRewardProfile.isChecked(),false);const rewardText=await page.locator('#preview-grid').textContent();assert(rewardText.includes('重复训练日'));assert(rewardText.includes('重复徽章'));const safeCompletedWithDuplicateRewards=page.locator('input[data-restore-key=\"cnc_study_completed_v1\"]');assert.equal(await safeCompletedWithDuplicateRewards.isDisabled(),false);assert.equal(await safeCompletedWithDuplicateRewards.isChecked(),true);await page.locator('#confirm-check').check();await page.locator('#restore-btn').click();await page.waitForFunction(()=>document.querySelector('#recovery-status')?.textContent.includes('已写入1个'));state=await page.evaluate(()=>({profile:JSON.parse(localStorage.getItem('cnc_training_profile_v1')),completed:JSON.parse(localStorage.getItem('cnc_study_completed_v1'))}));assert.equal(state.profile.xp,881);assert.deepEqual(state.completed,[9,10]);const invalid="
test = test.replace(marker, scenario, 1)
report_marker = "profileTrainingDaysInvalidEntriesBlocked:true,healthyBackupItemsStillRestorable:true,healthyCompletedStillRestorableWithRiskyProfile:true,minTouch:min"
if report_marker not in test:
    raise SystemExit('backup test report marker not found')
report_new = "profileTrainingDaysInvalidEntriesBlocked:true,profileRewardDuplicateEntriesBlocked:true,healthyBackupItemsStillRestorable:true,healthyCompletedStillRestorableWithRiskyProfile:true,healthyCompletedStillRestorableWithDuplicateRewards:true,minTouch:min"
test = test.replace(report_marker, report_new, 1)
test_path.write_text(test, encoding='utf-8')

print('patched:', page_path.relative_to(root), test_path.relative_to(root))
