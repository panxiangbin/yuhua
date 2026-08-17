from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

def replace_once(path, old, new):
    p = ROOT / path
    text = p.read_text(encoding='utf-8')
    if text.count(old) != 1:
        raise SystemExit(f'{path}: expected exactly one match, got {text.count(old)}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')

# 1) 数据健康页：新增 lessonScores 嵌套结构/条目检查，不自动修复。
path = 'cnc/data-health.html'
replace_once(path,
"let valid=0,parseBad=0,shapeBad=0,versionMissing=0,dateBad=0,trainingDayShapeBad=0,trainingDayInvalid=0,rewardRisk=0,badgeInvalid=0,badgeShapeBad=0,wrongShape=0,simShape=0;",
"let valid=0,parseBad=0,shapeBad=0,versionMissing=0,dateBad=0,trainingDayShapeBad=0,trainingDayInvalid=0,rewardRisk=0,badgeInvalid=0,badgeShapeBad=0,wrongShape=0,practiceScoreShapeBad=0,practiceScoreInvalid=0,simShape=0;")
replace_once(path,
"if(k.includes('practice')){['wrongQuestions','wrongItems','wrong'].forEach(field=>{const w=d[field];if(w&&!Array.isArray(w)&&typeof w==='object'){wrongShape++;addRepair(k,`wrong-array:${field}`,`${k}：把对象型错题字段 ${field} 转换为数组`,x=>({...x,[field]:Object.values(x[field]||{})}))}})}if(k.includes('simulator')&&!d.simulators)",
"if(k.includes('practice')){['wrongQuestions','wrongItems','wrong'].forEach(field=>{const w=d[field];if(w&&!Array.isArray(w)&&typeof w==='object'){wrongShape++;addRepair(k,`wrong-array:${field}`,`${k}：把对象型错题字段 ${field} 转换为数组`,x=>({...x,[field]:Object.values(x[field]||{})}))}});if(Object.prototype.hasOwnProperty.call(d,'lessonScores')){const scores=d.lessonScores;if(!scores||typeof scores!=='object'||Array.isArray(scores)){practiceScoreShapeBad++;state.issues.push(`${k}: lessonScores 根结构不是对象`)}else{const invalidScores=Object.entries(scores).filter(([level,score])=>{const n=Number(level);return !Number.isInteger(n)||n<1||n>12||typeof score!=='number'||!Number.isFinite(score)||score<0||score>100}).length;practiceScoreInvalid+=invalidScores;if(invalidScores)state.issues.push(`${k}: ${invalidScores}个课程练习成绩无法确认`)}}}if(k.includes('simulator')&&!d.simulators)")
replace_once(path,
"addCheck('错题结构',wrongShape?'warn':'ok',wrongShape?`${wrongShape}个对象型错题兼容字段可转换为数组；wrongQuestions / wrongItems / wrong 会分别保留，不会互相覆盖`:'错题字段结构正常');addCheck('模拟记录结构'",
"addCheck('练习成绩结构',practiceScoreShapeBad?'bad':practiceScoreInvalid?'warn':'ok',practiceScoreShapeBad?'lessonScores 必须为对象，请先备份并人工核对；本页不会自动重写练习成绩':practiceScoreInvalid?`发现${practiceScoreInvalid}个无法确认的课程练习成绩；仅接受1-12关的有限0-100数字，本页不会自动修改成绩`:'课程练习成绩结构正常');addCheck('错题结构',wrongShape?'warn':'ok',wrongShape?`${wrongShape}个对象型错题兼容字段可转换为数组；wrongQuestions / wrongItems / wrong 会分别保留，不会互相覆盖`:'错题字段结构正常');addCheck('模拟记录结构'")
replace_once(path, '<section class="panel"><h2>10项健康检查</h2>', '<section class="panel"><h2>11项健康检查</h2>')

# 2) 备份恢复：高风险 lessonScores 禁止自动恢复 practice，但不影响健康 sibling 数据。
path = 'cnc/data-backup.html'
replace_once(path,
"if(risks.length)warnings.cnc_training_profile_v1=`${risks.join('；')}，禁止自动恢复学习档案；请保留备份原件并先在数据健康页核对。`}return warnings}",
"if(risks.length)warnings.cnc_training_profile_v1=`${risks.join('；')}，禁止自动恢复学习档案；请保留备份原件并先在数据健康页核对。`}const practice=data&&data.cnc_training_practice_v1;if(practice&&Object.prototype.hasOwnProperty.call(practice,'lessonScores')){const scores=practice.lessonScores,practiceRisks=[];if(!scores||typeof scores!=='object'||Array.isArray(scores))practiceRisks.push('lessonScores 不是对象');else{const invalidScores=Object.entries(scores).filter(([level,score])=>{const n=Number(level);return !Number.isInteger(n)||n<1||n>12||typeof score!=='number'||!Number.isFinite(score)||score<0||score>100}).length;if(invalidScores)practiceRisks.push(`发现${invalidScores}个无法确认的课程练习成绩`)}if(practiceRisks.length)warnings.cnc_training_practice_v1=`${practiceRisks.join('；')}，禁止自动恢复练习档案；请保留备份原件并先在数据健康页核对。`}return warnings}")
replace_once(path,
"课程完成数组、训练日证据含无法确认条目，或学习档案存在重复训练日/徽章奖励证据时保留备份原件，但禁止对应高风险数据项自动恢复，可继续恢复其他安全数据。",
"课程完成数组、训练日证据、课程练习成绩含无法确认条目，或学习档案存在重复训练日/徽章奖励证据时保留备份原件，但禁止对应高风险数据项自动恢复，可继续恢复其他安全数据。")

# 3) 数据健康 390x844：把 malformed lessonScores 纳入真实场景。
path = 'cnc/tests/mobile-data-health-smoke.cjs'
replace_once(path,
"wrong:{d:{id:'w4'}}}))",
"wrong:{d:{id:'w4'}},lessonScores:{1:100,2:'80',13:90,3:120}}))")
text_path = ROOT / path
text = text_path.read_text(encoding='utf-8')
text = text.replace("#checks .check').length===10", "#checks .check').length===11")
if text.count("#checks .check').length===11") < 4:
    raise SystemExit('mobile-data-health-smoke.cjs: expected four 11-check waits')
needle = "const wrongCheck=page.locator('#checks .check').filter({hasText:'错题结构'});"
insert = "const practiceScoreCheck=page.locator('#checks .check').filter({hasText:'练习成绩结构'});assert.equal(await practiceScoreCheck.count(),1);const practiceScoreText=await practiceScoreCheck.textContent();assert(practiceScoreText.includes('3个无法确认的课程练习成绩'),'必须识别数字字符串、越界关卡和越界分数等3个异常练习成绩');assert(practiceScoreText.includes('不会自动修改成绩'),'练习成绩异常只能提示，不得静默清洗');"
if needle not in text:
    raise SystemExit('mobile-data-health-smoke.cjs: score insertion anchor missing')
text = text.replace(needle, insert + needle, 1)
text = text.replace("assert.equal(fixed.practice.wrong.length,1);", "assert.equal(fixed.practice.wrong.length,1);assert.deepEqual(fixed.practice.lessonScores,{1:100,2:'80',13:90,3:120},'安全修复不得改写异常课程练习成绩');", 1)
text = text.replace("assert(!Array.isArray(rolled.practice.wrong));", "assert(!Array.isArray(rolled.practice.wrong));assert.deepEqual(rolled.practice.lessonScores,{1:100,2:'80',13:90,3:120},'回滚后异常课程练习成绩必须保持原样');", 1)
text = text.replace("canonicalCompletionWarns:true", "practiceScoreWarns:true,canonicalCompletionWarns:true", 1)
text_path.write_text(text, encoding='utf-8')

# 4) 数据健康事务门禁：健康检查数同步 10 -> 11，事务断言保持原样。
path = 'cnc/tests/data-health-transaction-smoke.cjs'
p = ROOT / path
text = p.read_text(encoding='utf-8')
count = text.count("#checks .check').length===10")
if count != 2:
    raise SystemExit(f'data-health-transaction-smoke.cjs: expected 2 count anchors, got {count}')
p.write_text(text.replace("#checks .check').length===10", "#checks .check').length===11"), encoding='utf-8')

# 5) 备份恢复 390x844：损坏 practice lessonScores 阻断，健康 completed sibling 仍可恢复。
path = 'cnc/tests/mobile-data-backup-history-migration-smoke.cjs'
p = ROOT / path
text = p.read_text(encoding='utf-8')
anchor = "const invalid=await page.evaluate(()=>{const data={cnc_study_completed_v1:{bad:true}};"
scenario = "const riskyPracticeScores=await page.evaluate(()=>{const data={cnc_training_practice_v1:{version:2,gateVersion:2,wrong:[],correct:[],attempts:{},lessonScores:{1:100,2:'80',13:90,3:120},legacyLessonScores:{}},cnc_study_completed_v1:[11,12]};return {format:'cnc-training-backup',version:2,createdAt:new Date().toISOString(),source:'练习成绩高风险恢复测试',digestAlgorithm:'fnv1a-32-stable-json',digest:digest(data),data}});await page.locator('#import-input').fill(JSON.stringify(riskyPracticeScores));await page.locator('#preview-btn').click();await page.waitForFunction(()=>document.querySelector('#import-status')?.textContent.includes('高风险'));const riskyPractice=page.locator('input[data-restore-key=\"cnc_training_practice_v1\"]');assert(await riskyPractice.isDisabled());assert.equal(await riskyPractice.isChecked(),false);const practiceRiskText=await page.locator('#preview-grid').textContent();assert(practiceRiskText.includes('课程练习成绩'));assert(practiceRiskText.includes('3个无法确认'));const safeCompletedWithRiskyPractice=page.locator('input[data-restore-key=\"cnc_study_completed_v1\"]');assert.equal(await safeCompletedWithRiskyPractice.isDisabled(),false);assert.equal(await safeCompletedWithRiskyPractice.isChecked(),true);await page.locator('#confirm-check').check();await page.locator('#restore-btn').click();await page.waitForFunction(()=>document.querySelector('#recovery-status')?.textContent.includes('已写入1个'));state=await page.evaluate(()=>({practice:JSON.parse(localStorage.getItem('cnc_training_practice_v1')),completed:JSON.parse(localStorage.getItem('cnc_study_completed_v1'))}));assert.equal(state.practice.wrongQuestions.length,1,'高风险练习成绩不得覆盖现有练习档案');assert.deepEqual(state.completed,[11,12]);"
if anchor not in text:
    raise SystemExit('mobile-data-backup-history-migration-smoke.cjs: insertion anchor missing')
text = text.replace(anchor, scenario + anchor, 1)
text = text.replace("assert.deepEqual(preserved.completed,[9,10]);", "assert.deepEqual(preserved.completed,[11,12]);", 1)
text = text.replace("profileBadgeInvalidEntriesBlocked:true,healthyBackupItemsStillRestorable:true", "profileBadgeInvalidEntriesBlocked:true,practiceLessonScoresInvalidEntriesBlocked:true,healthyBackupItemsStillRestorable:true", 1)
p.write_text(text, encoding='utf-8')

print('通过：练习成绩嵌套完整性、数据健康诊断与备份恢复阻断补丁已生成。')
