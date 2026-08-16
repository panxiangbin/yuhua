from pathlib import Path

CERT = Path('cnc/training-certificate.html')
TEST = Path('cnc/tests/mobile-training-certificate-smoke.cjs')

cert = CERT.read_text(encoding='utf-8')
test = TEST.read_text(encoding='utf-8')

old_integrity = "var integrity=practiceRead.valid&&profileRead.valid&&doneSourceValid,completionIntegrity=completionIssues.length===0,certificateReady=integrity&&completionIntegrity;"
new_integrity = "var integrity=practiceRead.valid&&profileRead.valid&&doneSourceValid,completionIntegrity=completionIssues.length===0,trainingDayIssues=[];if(Object.prototype.hasOwnProperty.call(profile,'trainingDays')){if(!Array.isArray(profile.trainingDays))trainingDayIssues.push(PROFILE+':trainingDays');else profile.trainingDays.forEach(function(v){if(!validDate(v))trainingDayIssues.push(PROFILE+':trainingDays:entry');});}trainingDayIssues=Array.from(new Set(trainingDayIssues));var trainingIntegrity=trainingDayIssues.length===0,certificateReady=integrity&&completionIntegrity&&trainingIntegrity;"
if cert.count(old_integrity) != 1:
    raise SystemExit(f'integrity anchor count={cert.count(old_integrity)}')
cert = cert.replace(old_integrity, new_integrity, 1)

old_ui = "if(!completionIntegrity){status.textContent='课程完成记录异常';status.classList.add('is-progress');document.getElementById('data-integrity').hidden=false;document.getElementById('data-integrity-copy').textContent='检测到课程完成记录含无法确认的条目。页面保留能够确认的统计，但已暂停证书分享和打印；请先检查学习数据或从备份恢复。';shareButton.disabled=true;printButton.disabled=true;feedback.textContent='课程完成记录异常时不生成或分享阶段证书。';}}"
new_ui = "if(!completionIntegrity||!trainingIntegrity){var issueParts=[];if(!completionIntegrity)issueParts.push('课程完成记录含无法确认的条目');if(!trainingIntegrity)issueParts.push('训练日记录含无法确认的条目');status.textContent=!completionIntegrity&&!trainingIntegrity?'学习记录异常':!completionIntegrity?'课程完成记录异常':'训练日记录异常';status.classList.add('is-progress');document.getElementById('data-integrity').hidden=false;document.getElementById('data-integrity-copy').textContent='检测到'+issueParts.join('、')+'。页面保留能够确认的统计，但已暂停证书分享和打印；请先检查学习数据或从备份恢复。';shareButton.disabled=true;printButton.disabled=true;feedback.textContent='学习记录异常时不生成或分享阶段证书。';}}"
if cert.count(old_ui) != 1:
    raise SystemExit(f'ui anchor count={cert.count(old_ui)}')
cert = cert.replace(old_ui, new_ui, 1)

old_snapshot = "window.CNC_TRAINING_CERTIFICATE={build:BUILD,snapshot:function(){return integrity?{integrity:true,completionIntegrity:completionIntegrity,certificateReady:certificateReady,invalid:completionIssues.slice(),passed:passed,average:average,days:days,badges:badges,graduated:graduated,abilities:abilities.map(function(x){return x.score;})}:{integrity:false,completionIntegrity:false,certificateReady:false,invalid:invalid.slice(),passed:null,average:null,days:null,badges:null,graduated:false,abilities:[]};},shareText:shareText};"
new_snapshot = "window.CNC_TRAINING_CERTIFICATE={build:BUILD,snapshot:function(){return integrity?{integrity:true,completionIntegrity:completionIntegrity,trainingIntegrity:trainingIntegrity,certificateReady:certificateReady,invalid:completionIssues.concat(trainingDayIssues),passed:passed,average:average,days:days,badges:badges,graduated:graduated,abilities:abilities.map(function(x){return x.score;})}:{integrity:false,completionIntegrity:false,trainingIntegrity:false,certificateReady:false,invalid:invalid.slice(),passed:null,average:null,days:null,badges:null,graduated:false,abilities:[]};},shareText:shareText};"
if cert.count(old_snapshot) != 1:
    raise SystemExit(f'snapshot anchor count={cert.count(old_snapshot)}')
cert = cert.replace(old_snapshot, new_snapshot, 1)

marker = "  const malformedRootBefore = await page.evaluate(() => {"
scenario = r'''  const invalidTrainingDaysBefore = await page.evaluate(() => {
    const lessonScores = {};
    for (let level = 1; level <= 12; level += 1) lessonScores[level] = 90;
    localStorage.setItem('cnc_training_practice_v1', JSON.stringify({ version: 1, lessonScores }));
    localStorage.setItem('cnc_training_profile_v1', JSON.stringify({ version: 1, trainingDays: ['2026-07-20', '2026-02-30', null], badges: ['迈出第一步', '成绩达标'] }));
    localStorage.setItem('cnc_study_completed_v1', JSON.stringify([1,2,3,4,5,6,7,8,9,10,11,12]));
    const before = {
      practice: localStorage.getItem('cnc_training_practice_v1'),
      profile: localStorage.getItem('cnc_training_profile_v1'),
      done: localStorage.getItem('cnc_study_completed_v1')
    };
    sessionStorage.setItem('certificate-invalid-training-days-before', JSON.stringify(before));
    location.reload();
    return before;
  });
  await page.waitForFunction(() => window.CNC_TRAINING_CERTIFICATE?.build === '20260724c');
  const invalidTrainingDays = await page.evaluate(() => ({
    snapshot: window.CNC_TRAINING_CERTIFICATE.snapshot(),
    before: JSON.parse(sessionStorage.getItem('certificate-invalid-training-days-before')),
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
  assert.deepEqual(invalidTrainingDays.before, invalidTrainingDaysBefore);
  assert.deepEqual(invalidTrainingDays.after, invalidTrainingDays.before, '异常训练日证据不得被阶段证书自动改写');
  assert.equal(invalidTrainingDays.snapshot.integrity, true);
  assert.equal(invalidTrainingDays.snapshot.completionIntegrity, true);
  assert.equal(invalidTrainingDays.snapshot.trainingIntegrity, false);
  assert.equal(invalidTrainingDays.snapshot.certificateReady, false);
  assert.ok(invalidTrainingDays.snapshot.invalid.includes('cnc_training_profile_v1:trainingDays:entry'));
  assert.equal(invalidTrainingDays.snapshot.passed, 12);
  assert.equal(invalidTrainingDays.snapshot.average, 90);
  assert.equal(invalidTrainingDays.snapshot.days, 1);
  assert.equal(invalidTrainingDays.snapshot.badges, 2);
  assert.equal(invalidTrainingDays.snapshot.graduated, false);
  assert.equal(invalidTrainingDays.status, '训练日记录异常');
  assert.equal(invalidTrainingDays.integrityHidden, false);
  assert.match(invalidTrainingDays.integrityText, /训练日记录/);
  assert.equal(invalidTrainingDays.shareDisabled, true);
  assert.equal(invalidTrainingDays.printDisabled, true);
  assert.doesNotMatch(invalidTrainingDays.text, /NaN|Infinity/);

'''
if test.count(marker) != 1:
    raise SystemExit(f'test marker count={test.count(marker)}')
test = test.replace(marker, scenario + marker, 1)

CERT.write_text(cert, encoding='utf-8')
TEST.write_text(test, encoding='utf-8')

print('patched:', CERT, TEST)
