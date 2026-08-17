from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, got {count}')
    return text.replace(old, new, 1)

# 1) data-health: field exists but null/scalar is malformed, matching training-profile runtime semantics.
health_path = ROOT / 'cnc/data-health.html'
health = health_path.read_text(encoding='utf-8')
health = replace_once(
    health,
    "function wrongInvalidCount(value){if(Array.isArray(value))return value.filter(item=>!wrongRecordId(item,null)).length;if(isPlainObject(value))return Object.entries(value).filter(([key,item])=>!isPlainObject(item)||!wrongRecordId(item,key)).length;return value==null?0:1}",
    "function wrongInvalidCount(value){if(Array.isArray(value))return value.filter(item=>!wrongRecordId(item,null)).length;if(isPlainObject(value))return Object.entries(value).filter(([key,item])=>!isPlainObject(item)||!wrongRecordId(item,key)).length;return 1}",
    'data-health wrongInvalidCount',
)
health_path.write_text(health, encoding='utf-8')

# 2) data-backup: reject automatic restore when wrongQuestions/wrongItems/wrong contains malformed structures/entries.
backup_path = ROOT / 'cnc/data-backup.html'
backup = backup_path.read_text(encoding='utf-8')
backup = replace_once(
    backup,
    '课程完成数组、训练日证据、课程练习成绩含无法确认条目，或学习档案存在重复训练日/徽章奖励证据时保留备份原件',
    '课程完成数组、训练日证据、课程练习成绩或错题记录含无法确认条目，或学习档案存在重复训练日/徽章奖励证据时保留备份原件',
    'backup help copy',
)
anchor = "function validTrainingDay(v){if(typeof v!=='string'||!v)return false;const m=v.match(/^(\\d{4})-(\\d{2})-(\\d{2})$/);if(!m)return false;const y=Number(m[1]),mo=Number(m[2]),d=Number(m[3]),dt=new Date(Date.UTC(y,mo-1,d));return dt.getUTCFullYear()===y&&dt.getUTCMonth()===mo-1&&dt.getUTCDate()===d}\n"
helpers = anchor + "function isPlainObject(v){return !!v&&typeof v==='object'&&!Array.isArray(v)}\nfunction wrongRecordId(item,fallbackKey){if(typeof item==='string'){const text=item.trim();return text||null}if(!isPlainObject(item))return null;for(const v of [item.questionId,item.id,item.key,fallbackKey]){if(typeof v==='string'&&v.trim())return v.trim()}return null}\nfunction wrongInvalidCount(value){if(Array.isArray(value))return value.filter(item=>!wrongRecordId(item,null)).length;if(isPlainObject(value))return Object.entries(value).filter(([key,item])=>!isPlainObject(item)||!wrongRecordId(item,key)).length;return 1}\n"
backup = replace_once(backup, anchor, helpers, 'backup wrong helpers')
old_practice = "const practice=data&&data.cnc_training_practice_v1;if(practice&&Object.prototype.hasOwnProperty.call(practice,'lessonScores')){const scores=practice.lessonScores,practiceRisks=[];if(!scores||typeof scores!=='object'||Array.isArray(scores))practiceRisks.push('lessonScores 不是对象');else{const invalidScores=Object.entries(scores).filter(([level,score])=>{const n=Number(level);return !Number.isInteger(n)||n<1||n>12||typeof score!=='number'||!Number.isFinite(score)||score<0||score>100}).length;if(invalidScores)practiceRisks.push(`发现${invalidScores}个无法确认的课程练习成绩`)}if(practiceRisks.length)warnings.cnc_training_practice_v1=`${practiceRisks.join('；')}，禁止自动恢复练习档案；请保留备份原件并先在数据健康页核对。`}return warnings}"
new_practice = "const practice=data&&data.cnc_training_practice_v1;if(practice){const practiceRisks=[];['wrongQuestions','wrongItems','wrong'].forEach(field=>{if(!Object.prototype.hasOwnProperty.call(practice,field))return;const invalidWrong=wrongInvalidCount(practice[field]);if(invalidWrong)practiceRisks.push(`${field} 发现${invalidWrong}个无法确认的错题条目`)});if(Object.prototype.hasOwnProperty.call(practice,'lessonScores')){const scores=practice.lessonScores;if(!scores||typeof scores!=='object'||Array.isArray(scores))practiceRisks.push('lessonScores 不是对象');else{const invalidScores=Object.entries(scores).filter(([level,score])=>{const n=Number(level);return !Number.isInteger(n)||n<1||n>12||typeof score!=='number'||!Number.isFinite(score)||score<0||score>100}).length;if(invalidScores)practiceRisks.push(`发现${invalidScores}个无法确认的课程练习成绩`)}}if(practiceRisks.length)warnings.cnc_training_practice_v1=`${practiceRisks.join('；')}，禁止自动恢复练习档案；请保留备份原件并先在数据健康页核对。`}return warnings}"
backup = replace_once(backup, old_practice, new_practice, 'backup practice warnings')
backup_path.write_text(backup, encoding='utf-8')

# 3) data-health browser regression: null wrong field must be diagnosed and remain read-only.
health_test_path = ROOT / 'cnc/tests/mobile-data-health-smoke.cjs'
health_test = health_test_path.read_text(encoding='utf-8')
marker = "const min=await page.locator('a:visible,button:visible,input[type=\"checkbox\"]:visible').evaluateAll"
insert = "const nullWrong=JSON.stringify({version:1,wrongQuestions:null});await page.evaluate(v=>localStorage.setItem('cnc_training_practice_v1',v),nullWrong);await page.reload();await page.waitForFunction(()=>document.querySelectorAll('#checks .check').length===11);const nullWrongCheck=page.locator('#checks .check').filter({hasText:'错题结构'});const nullWrongText=await nullWrongCheck.textContent();assert(nullWrongText.includes('1个无法确认的错题条目'),'字段存在但为null必须视为错题结构异常');assert.equal(await page.evaluate(()=>localStorage.getItem('cnc_training_practice_v1')),nullWrong,'null错题字段诊断不得改写练习档案');"
health_test = replace_once(health_test, marker, insert + marker, 'health null wrong regression')
health_test = replace_once(health_test, "wrongInvalidEntryWarns:true,practiceScoreWarns:true", "wrongInvalidEntryWarns:true,wrongNullShapeWarns:true,practiceScoreWarns:true", 'health diagnostic flag')
health_test_path.write_text(health_test, encoding='utf-8')

# 4) backup browser regression: malformed wrong entries block practice restore while healthy sibling remains restorable.
backup_test_path = ROOT / 'cnc/tests/mobile-data-backup-history-migration-smoke.cjs'
backup_test = backup_test_path.read_text(encoding='utf-8')
marker2 = "const invalid=await page.evaluate(()=>{const data={cnc_study_completed_v1:{bad:true}};"
scenario = "const riskyPracticeWrong=await page.evaluate(()=>{const data={cnc_training_practice_v1:{version:2,gateVersion:2,wrongQuestions:{'sc-safe-01':{answer:'A'}},wrongItems:[{questionId:'av-safe-02'}],wrong:{'g54-valid':{explanation:'ok'},broken:42},lessonScores:{1:100},attempts:{},correct:[],legacyLessonScores:{}},cnc_study_completed_v1:[1,2]};return {format:'cnc-training-backup',version:2,createdAt:new Date().toISOString(),source:'错题结构高风险恢复测试',digestAlgorithm:'fnv1a-32-stable-json',digest:digest(data),data}});await page.locator('#import-input').fill(JSON.stringify(riskyPracticeWrong));await page.locator('#preview-btn').click();await page.waitForFunction(()=>document.querySelector('#import-status')?.textContent.includes('高风险'));const riskyWrongPractice=page.locator('input[data-restore-key=\"cnc_training_practice_v1\"]');assert(await riskyWrongPractice.isDisabled());assert.equal(await riskyWrongPractice.isChecked(),false);const wrongRiskText=await page.locator('#preview-grid').textContent();assert(wrongRiskText.includes('错题条目'),'损坏错题结构必须显示高风险原因');assert(wrongRiskText.includes('1个无法确认'),'必须只识别真实的1个损坏错题条目');const safeCompletedWithRiskyWrong=page.locator('input[data-restore-key=\"cnc_study_completed_v1\"]');assert.equal(await safeCompletedWithRiskyWrong.isDisabled(),false);assert.equal(await safeCompletedWithRiskyWrong.isChecked(),true);await page.locator('#confirm-check').check();await page.locator('#restore-btn').click();await page.waitForFunction(()=>document.querySelector('#recovery-status')?.textContent.includes('已写入1个'));state=await page.evaluate(()=>({practice:JSON.parse(localStorage.getItem('cnc_training_practice_v1')),completed:JSON.parse(localStorage.getItem('cnc_study_completed_v1'))}));assert.equal(state.practice.wrongQuestions.length,1,'高风险错题结构不得覆盖现有练习档案');assert.deepEqual(state.completed,[1,2]);"
backup_test = replace_once(backup_test, marker2, scenario + marker2, 'backup wrong risk regression')
backup_test = replace_once(backup_test, "assert.deepEqual(preserved.completed,[11,12]);", "assert.deepEqual(preserved.completed,[1,2]);", 'backup final completed state')
backup_test = replace_once(backup_test, "practiceLessonScoresInvalidEntriesBlocked:true,healthyBackupItemsStillRestorable:true", "practiceLessonScoresInvalidEntriesBlocked:true,practiceWrongInvalidEntriesBlocked:true,healthyCompletedStillRestorableWithRiskyWrong:true,healthyBackupItemsStillRestorable:true", 'backup diagnostic flags')
backup_test_path.write_text(backup_test, encoding='utf-8')

print('patched: data-health wrong null semantics + backup malformed wrong restore guard + browser regressions')
