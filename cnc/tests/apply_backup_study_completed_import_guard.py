from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PAGE = ROOT / 'cnc' / 'data-backup.html'
TEST = ROOT / 'cnc' / 'tests' / 'mobile-data-backup-history-migration-smoke.cjs'


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, got {count}')
    return text.replace(old, new, 1)


page = PAGE.read_text(encoding='utf-8')
page = replace_once(
    page,
    '未知键、非法数据结构、损坏JSON与摘要不一致都会拒绝。',
    '未知键、非法数据结构、损坏JSON与摘要不一致都会拒绝；课程完成数组含无法确认条目时保留备份原件，但禁止该项自动恢复，可继续恢复其他安全数据。',
    'backup import help text',
)
page = replace_once(
    page,
    "META_KEY='cnc_training_backup_meta_v1',HISTORY_KEY='cnc_training_backup_history_v1';let previewPayload=null,downloadUrl='';",
    "META_KEY='cnc_training_backup_meta_v1',HISTORY_KEY='cnc_training_backup_history_v1';let previewPayload=null,previewWarnings={},downloadUrl='';",
    'preview warning state',
)
page = replace_once(
    page,
    "function validBackupValue(key,value){if(key===STUDY_COMPLETED_KEY)return Array.isArray(value);return !!(value&&typeof value==='object'&&!Array.isArray(value))}",
    "function validBackupValue(key,value){if(key===STUDY_COMPLETED_KEY)return Array.isArray(value);return !!(value&&typeof value==='object'&&!Array.isArray(value))}\nfunction stageLevel(v){if(typeof v==='number'&&Number.isInteger(v)&&v>=1&&v<=12)return v;if(typeof v==='string'){const m=v.match(/^stage-(\\d{1,2})$/i),n=Number(m&&m[1]);if(Number.isInteger(n)&&n>=1&&n<=12)return n}return null}\nfunction backupWarnings(data){const warnings={},rows=data&&data[STUDY_COMPLETED_KEY];if(Array.isArray(rows)){const invalid=rows.filter(v=>stageLevel(v)===null).length;if(invalid)warnings[STUDY_COMPLETED_KEY]=`发现${invalid}个无法确认的课程完成项，禁止自动恢复该项；请保留备份原件并先在数据健康页核对。`}return warnings}",
    'study completed warning helpers',
)
page = replace_once(
    page,
    "function normalize(payload){if(!payload||typeof payload!=='object'||Array.isArray(payload))return {error:'备份根对象无效'};if(payload.format!=='cnc-training-backup')return {error:'不是CNC学习档案备份'};if(payload.version===1){const error=validateData(payload.data);if(error)return {error};const migrated={format:'cnc-training-backup',version:2,createdAt:payload.createdAt||new Date().toISOString(),source:payload.source||'旧版CNC学习档案',migratedFrom:1,digestAlgorithm:'fnv1a-32-stable-json',digest:digest(payload.data),data:payload.data};return {payload:migrated,migrated:true}}if(payload.version!==2)return {error:`不支持的备份版本：${payload.version}`};const error=validateData(payload.data);if(error)return {error};if(payload.digestAlgorithm!=='fnv1a-32-stable-json'||typeof payload.digest!=='string')return {error:'缺少受支持的备份摘要'};if(digest(payload.data)!==payload.digest)return {error:'备份摘要不一致，文件可能损坏或被修改'};return {payload,migrated:false}}",
    "function normalize(payload){if(!payload||typeof payload!=='object'||Array.isArray(payload))return {error:'备份根对象无效'};if(payload.format!=='cnc-training-backup')return {error:'不是CNC学习档案备份'};if(payload.version===1){const error=validateData(payload.data);if(error)return {error};const migrated={format:'cnc-training-backup',version:2,createdAt:payload.createdAt||new Date().toISOString(),source:payload.source||'旧版CNC学习档案',migratedFrom:1,digestAlgorithm:'fnv1a-32-stable-json',digest:digest(payload.data),data:payload.data};return {payload:migrated,migrated:true,warnings:backupWarnings(payload.data)}}if(payload.version!==2)return {error:`不支持的备份版本：${payload.version}`};const error=validateData(payload.data);if(error)return {error};if(payload.digestAlgorithm!=='fnv1a-32-stable-json'||typeof payload.digest!=='string')return {error:'缺少受支持的备份摘要'};if(digest(payload.data)!==payload.digest)return {error:'备份摘要不一致，文件可能损坏或被修改'};return {payload,migrated:false,warnings:backupWarnings(payload.data)}}",
    'normalize warnings',
)
page = replace_once(
    page,
    "function renderPreview(payload){const rows=Object.entries(payload.data),grid=document.getElementById('preview-grid');grid.hidden=false;grid.innerHTML=rows.length?rows.map(([key,value])=>{const d=describe(key,value);return `<article><label><input type=\"checkbox\" data-restore-key=\"${key}\" checked><span><strong>${key}</strong><span class=\"delta\"><b>${d.changed?'有差异':'内容相同'}</b><br>当前：${d.currentFields}字段 · ${d.currentBytes}字节<br>备份：${d.backupFields}字段 · ${d.backupBytes}字节</span></span></label></article>`}).join(''):'<article><strong>空备份</strong><span>没有可恢复的数据项</span></article>';grid.querySelectorAll('input[data-restore-key]').forEach(el=>el.addEventListener('change',syncRestoreState))}",
    "function renderPreview(payload,warnings={}){const rows=Object.entries(payload.data),grid=document.getElementById('preview-grid');grid.hidden=false;grid.innerHTML=rows.length?rows.map(([key,value])=>{const d=describe(key,value),warning=warnings[key]||'';return `<article><label><input type=\"checkbox\" data-restore-key=\"${key}\" ${warning?'disabled':'checked'}><span><strong>${key}</strong><span class=\"delta\"><b>${warning?'禁止自动恢复':d.changed?'有差异':'内容相同'}</b><br>当前：${d.currentFields}字段 · ${d.currentBytes}字节<br>备份：${d.backupFields}字段 · ${d.backupBytes}字节${warning?`<br><b>高风险：${warning}</b>`:''}</span></span></label></article>`}).join(''):'<article><strong>空备份</strong><span>没有可恢复的数据项</span></article>';grid.querySelectorAll('input[data-restore-key]').forEach(el=>el.addEventListener('change',syncRestoreState))}",
    'render preview warnings',
)
page = replace_once(
    page,
    "function preview(){previewPayload=null;const confirm=document.getElementById('confirm-check');confirm.checked=false;confirm.disabled=true;document.getElementById('restore-btn').disabled=true;document.getElementById('preview-grid').hidden=true;const raw=document.getElementById('import-input').value.trim();if(!raw){setStatus('import-status','请先粘贴JSON或选择备份文件。','warn');return}const parsed=safeParse(raw);if(!parsed.ok){setStatus('import-status',`JSON语法错误：${parsed.error}`,'bad');return}const normalized=normalize(parsed.value);if(normalized.error){setStatus('import-status',normalized.error,'bad');addHistory('导入校验','拒绝',normalized.error);return}previewPayload=normalized.payload;renderPreview(previewPayload);confirm.disabled=false;const message=normalized.migrated?`旧版v1备份已安全迁移为v2预览，摘要 ${previewPayload.digest}。确认前不会写入。`:`校验通过：摘要 ${previewPayload.digest}，共 ${Object.keys(previewPayload.data).length} 个数据项。`;setStatus('import-status',message,normalized.migrated?'warn':'ok');if(normalized.migrated)addHistory('旧版迁移预览','成功',`v1 → v2，共${Object.keys(previewPayload.data).length}项`) }",
    "function preview(){previewPayload=null;previewWarnings={};const confirm=document.getElementById('confirm-check');confirm.checked=false;confirm.disabled=true;document.getElementById('restore-btn').disabled=true;document.getElementById('preview-grid').hidden=true;const raw=document.getElementById('import-input').value.trim();if(!raw){setStatus('import-status','请先粘贴JSON或选择备份文件。','warn');return}const parsed=safeParse(raw);if(!parsed.ok){setStatus('import-status',`JSON语法错误：${parsed.error}`,'bad');return}const normalized=normalize(parsed.value);if(normalized.error){setStatus('import-status',normalized.error,'bad');addHistory('导入校验','拒绝',normalized.error);return}previewPayload=normalized.payload;previewWarnings=normalized.warnings||{};renderPreview(previewPayload,previewWarnings);confirm.disabled=false;const warningCount=Object.keys(previewWarnings).length,baseMessage=normalized.migrated?`旧版v1备份已安全迁移为v2预览，摘要 ${previewPayload.digest}。确认前不会写入。`:`校验通过：摘要 ${previewPayload.digest}，共 ${Object.keys(previewPayload.data).length} 个数据项。`,message=warningCount?`${baseMessage} 其中${warningCount}个数据项存在高风险，已禁止自动恢复，可继续恢复其他安全数据。`:baseMessage;setStatus('import-status',message,normalized.migrated||warningCount?'warn':'ok');if(normalized.migrated)addHistory('旧版迁移预览','成功',`v1 → v2，共${Object.keys(previewPayload.data).length}项`) }",
    'preview warnings behavior',
)
page = replace_once(
    page,
    "document.getElementById('import-input').value='';previewPayload=null;document.getElementById('preview-grid').hidden=true;",
    "document.getElementById('import-input').value='';previewPayload=null;previewWarnings={};document.getElementById('preview-grid').hidden=true;",
    'clear warning state',
)
PAGE.write_text(page, encoding='utf-8')


test = TEST.read_text(encoding='utf-8')
marker = "const invalid=await page.evaluate(()=>{const data={cnc_study_completed_v1:{bad:true}};"
risky = "const risky=await page.evaluate(()=>{const data={cnc_training_profile_v1:{version:1,xp:881},cnc_study_completed_v1:[4,'5',13,null,[],'stage-6']};return {format:'cnc-training-backup',version:2,createdAt:new Date().toISOString(),source:'课程完成记录高风险恢复测试',digestAlgorithm:'fnv1a-32-stable-json',digest:digest(data),data}});await page.locator('#import-input').fill(JSON.stringify(risky));await page.locator('#preview-btn').click();await page.waitForFunction(()=>document.querySelector('#import-status')?.textContent.includes('高风险'));const riskyCompleted=page.locator('input[data-restore-key=\"cnc_study_completed_v1\"]');assert(await riskyCompleted.isDisabled());assert.equal(await riskyCompleted.isChecked(),false);const riskyProfile=page.locator('input[data-restore-key=\"cnc_training_profile_v1\"]');assert.equal(await riskyProfile.isDisabled(),false);assert.equal(await riskyProfile.isChecked(),true);assert((await page.locator('#preview-grid').textContent()).includes('禁止自动恢复'));await page.locator('#confirm-check').check();await page.locator('#restore-btn').click();await page.waitForFunction(()=>document.querySelector('#recovery-status')?.textContent.includes('已写入1个'));state=await page.evaluate(()=>({profile:JSON.parse(localStorage.getItem('cnc_training_profile_v1')),completed:JSON.parse(localStorage.getItem('cnc_study_completed_v1'))}));assert.equal(state.profile.xp,881);assert.deepEqual(state.completed,[4,5,'stage-6']);"
if test.count(marker) != 1:
    raise SystemExit(f'risky import marker expected 1 match, got {test.count(marker)}')
test = test.replace(marker, risky + marker, 1)
test = replace_once(test, "assert.equal(preserved.profile.xp,880);", "assert.equal(preserved.profile.xp,881);", 'preserved profile after safe partial restore')
test = replace_once(
    test,
    "studyCompletedSelectiveRestore:true,studyCompletedSchemaRejected:true,minTouch:min",
    "studyCompletedSelectiveRestore:true,studyCompletedSchemaRejected:true,studyCompletedInvalidEntriesBlocked:true,healthyBackupItemsStillRestorable:true,minTouch:min",
    'diagnostic flags',
)
TEST.write_text(test, encoding='utf-8')

print('patched data-backup study-completed import guard')
