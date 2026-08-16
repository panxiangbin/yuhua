from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

def replace_once(rel, old, new):
    path = ROOT / rel
    text = path.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{rel}: expected exactly one match, got {count}: {old[:80]!r}')
    path.write_text(text.replace(old, new, 1), encoding='utf-8')

# data-health: invalid badge entries/root shape must be visible risk, never silently ignored.
replace_once(
    'cnc/data-health.html',
    "rewardRisk=0,wrongShape=0",
    "rewardRisk=0,badgeInvalid=0,badgeShapeBad=0,wrongShape=0",
)
replace_once(
    'cnc/data-health.html',
    "const badgeRows=Array.isArray(d.badges)?d.badges.filter(v=>typeof v==='string'&&v.trim()).map(v=>v.trim()):[];const duplicateBadges=new Set(badgeRows).size!==badgeRows.length;rewardRisk+=Number(duplicateTrainingDays)+Number(duplicateBadges);if(duplicateTrainingDays||duplicateBadges)state.issues.push(`${k}: 奖励相关记录重复`)",
    "let badgeRows=[];if(Object.prototype.hasOwnProperty.call(d,'badges')){if(!Array.isArray(d.badges)){badgeShapeBad++;state.issues.push(`${k}: badges 根结构不是数组`)}else{badgeInvalid+=d.badges.filter(v=>typeof v!=='string'||!v.trim()).length;if(badgeInvalid)state.issues.push(`${k}: ${badgeInvalid}个徽章条目无法确认`);badgeRows=d.badges.filter(v=>typeof v==='string'&&v.trim()).map(v=>v.trim())}}const duplicateBadges=new Set(badgeRows).size!==badgeRows.length;rewardRisk+=Number(duplicateTrainingDays)+Number(duplicateBadges)+Number(badgeInvalid>0)+Number(badgeShapeBad>0);if(duplicateTrainingDays||duplicateBadges||badgeInvalid||badgeShapeBad)state.issues.push(`${k}: 奖励相关记录存在风险`)",
)
replace_once(
    'cnc/data-health.html',
    "addCheck('奖励重复风险',rewardRisk?'warn':'ok',rewardRisk?`发现${rewardRisk}类重复训练日/徽章记录，请先备份并人工核对；本页不会自动删除奖励记录`:'未发现重复训练日或徽章记录');",
    "addCheck('奖励记录风险',rewardRisk?'warn':'ok',rewardRisk?`发现${rewardRisk}类奖励记录风险${badgeShapeBad?'，badges 根结构不是数组':''}${badgeInvalid?`，其中${badgeInvalid}个徽章条目无法确认`:''}；请先备份并人工核对；本页不会自动删除奖励记录`:'未发现重复训练日、重复徽章或无法确认的徽章条目');",
)

# data-backup: malformed badge evidence must block automatic profile restore while preserving the backup.
replace_once(
    'cnc/data-backup.html',
    "if(Array.isArray(profile.badges)){const badgeRows=profile.badges.filter(v=>typeof v==='string'&&v.trim()).map(v=>v.trim());if(new Set(badgeRows).size!==badgeRows.length)risks.push('发现重复徽章记录')}",
    "if(Object.prototype.hasOwnProperty.call(profile,'badges')){if(!Array.isArray(profile.badges))risks.push('badges 不是数组');else{const invalidBadges=profile.badges.filter(v=>typeof v!=='string'||!v.trim()).length;if(invalidBadges)risks.push(`发现${invalidBadges}个无法确认的徽章条目`);const badgeRows=profile.badges.filter(v=>typeof v==='string'&&v.trim()).map(v=>v.trim());if(new Set(badgeRows).size!==badgeRows.length)risks.push('发现重复徽章记录')}}",
)

# certificate: invalid badge entries are integrity risks, not silently discarded evidence.
replace_once(
    'cnc/training-certificate.html',
    "badgeRows=Array.isArray(profile.badges)?profile.badges.filter(function(v){return typeof v==='string'&&v.trim();}).map(function(v){return v.trim();}):[],rewardIssues=[];if(new Set(validTrainingDays).size!==validTrainingDays.length)rewardIssues.push(PROFILE+':trainingDays:duplicate');if(new Set(badgeRows).size!==badgeRows.length)rewardIssues.push(PROFILE+':badges:duplicate');",
    "badgeIssues=[];if(Object.prototype.hasOwnProperty.call(profile,'badges')){if(!Array.isArray(profile.badges))badgeIssues.push(PROFILE+':badges');else profile.badges.forEach(function(v){if(typeof v!=='string'||!v.trim())badgeIssues.push(PROFILE+':badges:entry');});}badgeIssues=Array.from(new Set(badgeIssues));var badgeRows=Array.isArray(profile.badges)?profile.badges.filter(function(v){return typeof v==='string'&&v.trim();}).map(function(v){return v.trim();}):[],rewardIssues=badgeIssues.slice();if(new Set(validTrainingDays).size!==validTrainingDays.length)rewardIssues.push(PROFILE+':trainingDays:duplicate');if(new Set(badgeRows).size!==badgeRows.length)rewardIssues.push(PROFILE+':badges:duplicate');",
)
replace_once(
    'cnc/training-certificate.html',
    "if(!rewardIntegrity)issueParts.push('奖励记录存在重复证据');",
    "if(!rewardIntegrity)issueParts.push('奖励记录存在重复或无法确认的证据');",
)

# data-health browser regression: malformed badge entries must warn and remain byte-for-byte untouched.
replace_once(
    'cnc/tests/mobile-data-health-smoke.cjs',
    "badges:['连续训练3天',' 连续训练3天 ']",
    "badges:['连续训练3天',' 连续训练3天 ',null,{}]",
)
replace_once(
    'cnc/tests/mobile-data-health-smoke.cjs',
    "filter({hasText:'奖励重复风险'})",
    "filter({hasText:'奖励记录风险'})",
)
replace_once(
    'cnc/tests/mobile-data-health-smoke.cjs',
    "assert(rewardText.includes('2类重复训练日/徽章记录'),'必须同时识别重复训练日和重复徽章');",
    "assert(rewardText.includes('3类奖励记录风险'),'必须同时识别重复训练日、重复徽章和非法徽章条目');assert(rewardText.includes('2个徽章条目无法确认'),'null 与对象型徽章必须明确告警');",
)
replace_once(
    'cnc/tests/mobile-data-health-smoke.cjs',
    "assert.deepEqual(fixed.profile.badges,['连续训练3天',' 连续训练3天 '],'数据健康页不得自动删除空白变体重复徽章');",
    "assert.deepEqual(fixed.profile.badges,['连续训练3天',' 连续训练3天 ',null,{}],'数据健康页不得自动删除重复或非法徽章证据');",
)
replace_once(
    'cnc/tests/mobile-data-health-smoke.cjs',
    "assert.deepEqual(rolled.profile.badges,['连续训练3天',' 连续训练3天 ']);",
    "assert.deepEqual(rolled.profile.badges,['连续训练3天',' 连续训练3天 ',null,{}]);",
)
replace_once(
    'cnc/tests/mobile-data-health-smoke.cjs',
    "rewardWhitespaceDuplicateWarns:true,wrongCompatFields:true",
    "rewardWhitespaceDuplicateWarns:true,badgeInvalidEntryWarns:true,wrongCompatFields:true",
)

# backup browser regression: invalid badge evidence must block profile auto-restore but keep safe sibling data restorable.
replace_once(
    'cnc/tests/mobile-data-backup-history-migration-smoke.cjs',
    "badges:['连续训练3天',' 连续训练3天 ']",
    "badges:['连续训练3天',' 连续训练3天 ',null,{}]",
)
replace_once(
    'cnc/tests/mobile-data-backup-history-migration-smoke.cjs',
    "assert(rewardText.includes('重复徽章'));",
    "assert(rewardText.includes('重复徽章'));assert(rewardText.includes('2个无法确认的徽章条目'),'非法徽章条目必须阻断 profile 自动恢复');",
)
replace_once(
    'cnc/tests/mobile-data-backup-history-migration-smoke.cjs',
    "profileRewardWhitespaceDuplicateEntriesBlocked:true,healthyBackupItemsStillRestorable:true",
    "profileRewardWhitespaceDuplicateEntriesBlocked:true,profileBadgeInvalidEntriesBlocked:true,healthyBackupItemsStillRestorable:true",
)

# certificate regression: fully completed learning data with malformed badges must not be signable.
cert = ROOT / 'cnc/tests/mobile-training-certificate-smoke.cjs'
text = cert.read_text(encoding='utf-8')
marker = "  const malformedRootBefore = await page.evaluate(() => {\n"
if text.count(marker) != 1:
    raise SystemExit('certificate test insertion marker mismatch')
insert = r'''  const invalidBadgeEntriesBefore = await page.evaluate(() => {
    const lessonScores = {};
    for (let level = 1; level <= 12; level += 1) lessonScores[level] = 90;
    localStorage.setItem('cnc_training_practice_v1', JSON.stringify({ version: 1, lessonScores }));
    localStorage.setItem('cnc_training_profile_v1', JSON.stringify({ version: 1, trainingDays: ['2026-07-20', '2026-07-21'], badges: ['迈出第一步', null, {}, '成绩达标'] }));
    localStorage.setItem('cnc_study_completed_v1', JSON.stringify([1,2,3,4,5,6,7,8,9,10,11,12]));
    const before = {
      practice: localStorage.getItem('cnc_training_practice_v1'),
      profile: localStorage.getItem('cnc_training_profile_v1'),
      done: localStorage.getItem('cnc_study_completed_v1')
    };
    sessionStorage.setItem('certificate-invalid-badges-before', JSON.stringify(before));
    location.reload();
    return before;
  });
  await page.waitForFunction(() => window.CNC_TRAINING_CERTIFICATE?.build === '20260724c');
  const invalidBadgeEntries = await page.evaluate(() => ({
    snapshot: window.CNC_TRAINING_CERTIFICATE.snapshot(),
    before: JSON.parse(sessionStorage.getItem('certificate-invalid-badges-before')),
    after: {
      practice: localStorage.getItem('cnc_training_practice_v1'),
      profile: localStorage.getItem('cnc_training_profile_v1'),
      done: localStorage.getItem('cnc_study_completed_v1')
    },
    status: document.querySelector('#certificate-status').textContent,
    integrityHidden: document.querySelector('#data-integrity').hidden,
    integrityText: document.querySelector('#data-integrity').innerText,
    shareDisabled: document.querySelector('#share-certificate').disabled,
    printDisabled: document.querySelector('#print-certificate').disabled,
    text: document.body.innerText
  }));
  assert.deepEqual(invalidBadgeEntries.before, invalidBadgeEntriesBefore);
  assert.deepEqual(invalidBadgeEntries.after, invalidBadgeEntries.before, '非法徽章证据不得被阶段证书自动改写');
  assert.equal(invalidBadgeEntries.snapshot.integrity, true);
  assert.equal(invalidBadgeEntries.snapshot.completionIntegrity, true);
  assert.equal(invalidBadgeEntries.snapshot.trainingIntegrity, true);
  assert.equal(invalidBadgeEntries.snapshot.rewardIntegrity, false);
  assert.equal(invalidBadgeEntries.snapshot.certificateReady, false);
  assert.ok(invalidBadgeEntries.snapshot.invalid.includes('cnc_training_profile_v1:badges:entry'));
  assert.equal(invalidBadgeEntries.snapshot.passed, 12);
  assert.equal(invalidBadgeEntries.snapshot.average, 90);
  assert.equal(invalidBadgeEntries.snapshot.days, 2);
  assert.equal(invalidBadgeEntries.snapshot.badges, 2);
  assert.equal(invalidBadgeEntries.snapshot.graduated, false);
  assert.equal(invalidBadgeEntries.status, '奖励记录异常');
  assert.equal(invalidBadgeEntries.integrityHidden, false);
  assert.match(invalidBadgeEntries.integrityText, /奖励记录/);
  assert.equal(invalidBadgeEntries.shareDisabled, true);
  assert.equal(invalidBadgeEntries.printDisabled, true);
  assert.doesNotMatch(invalidBadgeEntries.text, /NaN|Infinity/);

'''
cert.write_text(text.replace(marker, insert + marker, 1), encoding='utf-8')

print('badge entry integrity patch applied')
