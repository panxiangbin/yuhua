'use strict';
const fs=require('fs');

function replaceOnce(source,from,to,label){
  if(!source.includes(from)) throw new Error(`缺少补丁锚点：${label}`);
  return source.replace(from,to);
}

const campPath='cnc/training-camp.html';
let camp=fs.readFileSync(campPath,'utf8');
const oldHelpers=`function safeParse(key,fallback){try{const v=JSON.parse(localStorage.getItem(key)||'null');return v&&typeof v==='object'?v:fallback}catch{return fallback}}
function getScores(profile){return profile.courseScores&&typeof profile.courseScores==='object'?profile.courseScores:{}}
function isDone(profile,id){const done=Array.isArray(profile.completedStages)?profile.completedStages:[];return done.includes(id)||Number(getScores(profile)[id]||0)>=80}
function countWrong(practice){const wrong=practice.wrongQuestions||practice.wrong||[];return Array.isArray(wrong)?wrong.length:Object.keys(wrong||{}).length}
function countSimulatorPassed(simulator){const source=simulator.simulators&&typeof simulator.simulators==='object'?simulator.simulators:simulator;return Object.values(source||{}).filter(item=>item&&typeof item==='object'&&(item.passed===true||Number(item.bestScore||item.score||0)>=80)).length}`;
const newHelpers=`const COURSE_ID_SET=new Set(COURSES.map(course=>course.id));
const SIMULATOR_IDS=['homing','workholding-check','tool-installation','tool-length-offset-check','work-offset-setting','program-dry-run','single-block-first-approach','graphics-segment-prediction','first-piece-inspection','alarm-troubleshooting','cutter-comp-risk','hole-cycle-troubleshooting','measurement-vs-machining-error'];
function isRecord(value){return !!value&&typeof value==='object'&&!Array.isArray(value)}
function strictScore(value){return typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100?value:null}
function safeParse(key,fallback){try{const value=JSON.parse(localStorage.getItem(key)||'null');return isRecord(value)?value:fallback}catch{return fallback}}
function getScores(profile){return isRecord(profile.courseScores)?profile.courseScores:{}}
function completedStageIds(profile){return new Set((Array.isArray(profile.completedStages)?profile.completedStages:[]).filter(id=>typeof id==='string'&&COURSE_ID_SET.has(id)))}
function courseScore(profile,id){const value=strictScore(getScores(profile)[id]);return value===null?0:value}
function isDone(profile,id){const done=completedStageIds(profile);if(done.has(id))return true;const value=strictScore(getScores(profile)[id]);return value!==null&&value>=80}
function countWrong(practice){const wrong=practice.wrongQuestions??practice.wrong??[];if(Array.isArray(wrong))return wrong.filter(isRecord).length;if(isRecord(wrong))return Object.values(wrong).filter(isRecord).length;return 0}
function simulatorCandidates(simulator,id){return [isRecord(simulator.records)&&isRecord(simulator.records[id])?simulator.records[id]:null,isRecord(simulator.simulators)&&isRecord(simulator.simulators[id])?simulator.simulators[id]:null,isRecord(simulator[id])?simulator[id]:null].filter(isRecord)}
function simulatorRecordPassed(record){if(record.passed===true)return true;const best=strictScore(record.bestScore??record.best??record.score);return best!==null&&best>=80}
function countSimulatorPassed(simulator){return SIMULATOR_IDS.filter(id=>simulatorCandidates(simulator,id).some(simulatorRecordPassed)).length}`;
camp=replaceOnce(camp,oldHelpers,newHelpers,'训练营数据读取函数');
camp=replaceOnce(camp,"const average=done.length?Math.round(done.reduce((s,c)=>s+Number(scores[c.id]||80),0)/done.length):0;","const average=done.length?Math.round(done.reduce((sum,course)=>sum+(courseScore(profile,course.id)||80),0)/done.length):0;",'平均分严格数值');
camp=replaceOnce(camp,"document.getElementById('course-list').innerHTML=COURSES.map((c,i)=>{const doneFlag=isDone(profile,c.id),score=Number(scores[c.id]||0),current=c.id===next.id&&!doneFlag;return `<a class=\"course ${doneFlag?'done':''} ${current?'current':''}\" href=\"./${c.file}\" data-stage=\"${c.id}\"><span class=\"number\">${String(i+1).padStart(2,'0')}</span><span><h2>${c.title}</h2><p>${c.reason}</p></span><span class=\"status\">${doneFlag?`已通过 ${score||80}分`:current?'继续学习':'未开始'}</span></a>`}).join('');","document.getElementById('course-list').innerHTML=COURSES.map((c,i)=>{const doneFlag=isDone(profile,c.id),score=courseScore(profile,c.id),current=c.id===next.id&&!doneFlag;return `<a class=\"course ${doneFlag?'done':''} ${current?'current':''}\" href=\"./${c.file}\" data-stage=\"${c.id}\"><span class=\"number\">${String(i+1).padStart(2,'0')}</span><span><h2>${c.title}</h2><p>${c.reason}</p></span><span class=\"status\">${doneFlag?`已通过 ${score||80}分`:current?'继续学习':'未开始'}</span></a>`}).join('');",'课程状态严格分数');
fs.writeFileSync(campPath,camp);

const test=`const { chromium } = require('playwright');
const fs = require('fs');
const assert = require('assert');

const BASE = process.env.CNC_BASE_URL || 'http://127.0.0.1:4173';
const ARTIFACT_DIR = 'artifacts/training-camp-hub';
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

async function openPage(browser, storage = {}) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const consoleErrors = [], pageErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.addInitScript(seed => {
    localStorage.clear();
    for (const [key, value] of Object.entries(seed)) localStorage.setItem(key, JSON.stringify(value));
  }, storage);
  await page.goto(\`${BASE}/cnc/training-camp.html\`, { waitUntil: 'networkidle' });
  const before = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])));
  return { page, consoleErrors, pageErrors, before };
}

async function assertReadOnly(caseData) {
  const after = await caseData.page.evaluate(() => Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])));
  assert.deepStrictEqual(after, caseData.before, '训练营不得清理、迁移或静默改写localStorage');
}
async function assertMobile(caseData) {
  const { page, consoleErrors, pageErrors } = caseData;
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 1, \`390px页面横向溢出：${overflow}\`);
  const text = await page.locator('body').innerText();
  assert.ok(!/NaN|Infinity/.test(text), '页面不得出现NaN/Infinity');
  const targets = await page.locator('a:visible').evaluateAll(nodes => nodes.map(node => { const r=node.getBoundingClientRect(); return {text:node.textContent.trim().replace(/\\s+/g,' '),height:r.height,width:r.width}; }));
  const invalid = targets.filter(item => item.width > 0 && item.height > 0 && item.height < 44);
  assert.deepStrictEqual(invalid, [], \`触控区不足44px: ${JSON.stringify(invalid)}\`);
  assert.deepStrictEqual(consoleErrors, [], \`控制台错误: ${consoleErrors.join(' | ')}\`);
  assert.deepStrictEqual(pageErrors, [], \`页面错误: ${pageErrors.join(' | ')}\`);
  await assertReadOnly(caseData);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const report = { viewport: '390x844', cases: {} };
  try {
    const empty = await openPage(browser);
    assert.strictEqual(await empty.page.locator('#passed-count').textContent(), '0');
    assert.strictEqual(await empty.page.locator('#wrong-count').textContent(), '0');
    assert.strictEqual(await empty.page.locator('#simulator-status').textContent(), '已通过 0/13 项');
    assert.match(await empty.page.locator('#next-title').textContent(), /第1关.*安全基础/);
    await assertMobile(empty); report.cases.empty = true;
    await empty.page.close();

    const malformed = await openPage(browser, {
      cnc_training_profile_v1: { completedStages: ['stage-1','unknown',null,['stage-6']], courseScores: {'stage-2':90,'stage-3':'999','stage-4':120,'stage-5':-1,'stage-6':'Infinity',unknown:100} },
      cnc_training_practice_v1: { wrongQuestions: [{id:'q1'},null,'bad',[],{id:'q2'}] },
      cnc_training_simulator_v1: { records: { homing:{passed:true},'workholding-check':{bestScore:90},'tool-installation':{bestScore:'999'},'tool-length-offset-check':{bestScore:120},'work-offset-setting':{bestScore:-1},'program-dry-run':{passed:'true'},unknown:{passed:true} }, simulators: {'workholding-check':{bestScore:100}} }
    });
    assert.strictEqual(await malformed.page.locator('#passed-count').textContent(), '2', '只有合法完成记录与合法90分应计为通过');
    assert.strictEqual(await malformed.page.locator('#avg-score').textContent(), '85');
    assert.strictEqual(await malformed.page.locator('#wrong-count').textContent(), '2', '损坏错题不得计数');
    assert.strictEqual(await malformed.page.locator('#simulator-status').textContent(), '已通过 2/13 项', '损坏模拟成绩/字符串passed/未知ID不得计通过');
    assert.match(await malformed.page.locator('#next-title').textContent(), /第3关/);
    await assertMobile(malformed); report.cases.malformedReadOnly = true;
    await malformed.page.screenshot({ path: \`${ARTIFACT_DIR}/malformed-data.png\`, fullPage: true });
    await malformed.page.close();

    const completeProfile = { completedStages: Array.from({length:12},(_,i)=>\`stage-${i+1}\`), courseScores: Object.fromEntries(Array.from({length:12},(_,i)=>[\`stage-${i+1}\`,80+(i%3)*10])) };
    const complete = await openPage(browser, {
      cnc_training_profile_v1: completeProfile,
      cnc_training_practice_v1: { wrongQuestions: [null,'bad',[]] },
      cnc_training_simulator_v1: { records: { homing:{passed:true},'workholding-check':{bestScore:90},'tool-installation':{bestScore:'999'},'tool-length-offset-check':{bestScore:120} } }
    });
    assert.strictEqual(await complete.page.locator('#passed-count').textContent(), '12');
    assert.strictEqual(await complete.page.locator('#wrong-count').textContent(), '0');
    assert.strictEqual(await complete.page.locator('#simulator-status').textContent(), '已通过 2/13 项');
    assert.match(await complete.page.locator('#route-title').textContent(), /继续模拟训练（2\/13）/);
    assert.match(await complete.page.locator('#route-cta').getAttribute('href'), /simulator-hub\\.html/);
    await assertMobile(complete); report.cases.completeRoute = true;
    await complete.page.close();

    const arrayRoots = await openPage(browser, { cnc_training_profile_v1: [], cnc_training_practice_v1: [], cnc_training_simulator_v1: [] });
    assert.strictEqual(await arrayRoots.page.locator('#passed-count').textContent(), '0');
    assert.strictEqual(await arrayRoots.page.locator('#wrong-count').textContent(), '0');
    assert.strictEqual(await arrayRoots.page.locator('#simulator-status').textContent(), '已通过 0/13 项');
    await assertMobile(arrayRoots); report.cases.arrayRoots = true;
    await arrayRoots.page.close();

    report.passed = true;
    fs.writeFileSync(\`${ARTIFACT_DIR}/report.json\`, JSON.stringify(report, null, 2));
    console.log('CNC training camp hub data integrity smoke passed');
  } catch (error) {
    report.passed = false; report.error = String(error.stack || error);
    fs.writeFileSync(\`${ARTIFACT_DIR}/report.json\`, JSON.stringify(report, null, 2));
    fs.writeFileSync(\`${ARTIFACT_DIR}/error.txt\`, \`${error.stack || error}\\n\`);
    throw error;
  } finally { await browser.close(); }
})();
`;
fs.writeFileSync('cnc/tests/mobile-training-camp-hub-smoke.cjs',test);

let sw=fs.readFileSync('cnc/sw.js','utf8');
sw=replaceOnce(sw,"const BUILD = '20260812-pwa40';","const BUILD = '20260812-pwa41';",'Service Worker PWA41');
sw=replaceOnce(sw,"const CACHE_REVISION = '20260812-learning40';","const CACHE_REVISION = '20260812-learning41';",'Service Worker learning41');
fs.writeFileSync('cnc/sw.js',sw);
const infoPath='cnc/build-info.json';
const info=JSON.parse(fs.readFileSync(infoPath,'utf8'));
if(info.pwaBuild!=='20260812-pwa40'||info.cacheRevision!=='20260812-learning40') throw new Error(`build-info基线意外：${info.pwaBuild}/${info.cacheRevision}`);
info.pwaBuild='20260812-pwa41'; info.cacheRevision='20260812-learning41'; info.generatedAt='2026-08-12T19:31:42+08:00';
if(!String(info.contentStage).includes('训练营异常学习数据只读降级')) info.contentStage+=' · 训练营异常学习数据只读降级';
fs.writeFileSync(infoPath,JSON.stringify(info,null,2)+'\n');
for(const path of ['cnc/pwa-status.html','cnc/pwa-self-test.html','cnc/MOBILE_LEARNING_MEDIA_PROGRESS.md']){
  let source=fs.readFileSync(path,'utf8');
  source=source.replaceAll('20260812-pwa40','20260812-pwa41').replaceAll('20260812-learning40','20260812-learning41');
  fs.writeFileSync(path,source);
}
console.log('training-camp data integrity patch applied');
