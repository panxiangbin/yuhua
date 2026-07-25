const { chromium } = require('playwright');
const fs=require('fs'),path=require('path');
const OUT=path.join(process.cwd(),'artifacts/simulator-workholding-check');fs.mkdirSync(OUT,{recursive:true});
function assert(v,m){if(!v)throw new Error(m)}
async function choose(page,index){const step=page.locator('.step.active');await step.locator('.choice').nth(index).click();await step.locator('.feedback.show').waitFor();await step.locator('#next-step').click()}
(async()=>{const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});try{
await page.goto('http://127.0.0.1:4173/cnc/simulator-workholding-check.html',{waitUntil:'networkidle'});
assert(await page.locator('.step').count()===8,'必须包含8个装夹检查步骤');
const visible=page.locator('a:visible,button:visible');for(let i=0;i<await visible.count();i++){const b=await visible.nth(i).boundingBox();assert(b&&b.height>=44,`触控区不足44px: ${i}`)}
for(const answer of [1,0,1,0,1,1,1,1])await choose(page,answer);
await page.locator('#result.show').waitFor();assert((await page.locator('#score').textContent()).trim()==='100','正确路径应得100分');
let sim=await page.evaluate(()=>JSON.parse(localStorage.getItem('cnc_training_simulator_v1')));let profile=await page.evaluate(()=>JSON.parse(localStorage.getItem('cnc_training_profile_v1')));assert(sim.records.workholdingCheck.passed===true,'通过状态未记录');assert(sim.records.workholdingCheck.attempts===1,'尝试次数错误');assert(profile.xp===80,'首次通过应奖励80 XP');
await page.locator('#restart-main').click();for(const answer of [0,1,0,1,1,1,1,1])await choose(page,answer);await page.locator('#result.show').waitFor();assert((await page.locator('#score').textContent()).trim()==='50','4个错误应得50分');sim=await page.evaluate(()=>JSON.parse(localStorage.getItem('cnc_training_simulator_v1')));profile=await page.evaluate(()=>JSON.parse(localStorage.getItem('cnc_training_profile_v1')));assert(sim.records.workholdingCheck.attempts===2,'第二次尝试未记录');assert(sim.records.workholdingCheck.lastErrors.length===4,'错误步骤应为4个');assert(profile.xp===80,'重复或失败练习不得重复发XP');assert(errors.length===0,`控制台错误: ${errors.join(' | ')}`);
await page.screenshot({path:path.join(OUT,'workholding-check-result.png'),fullPage:true});fs.writeFileSync(path.join(OUT,'result.json'),JSON.stringify({passed:true,score:50,errors:sim.records.workholdingCheck.lastErrors},null,2));console.log('workholding simulator smoke passed');
}catch(e){await page.screenshot({path:path.join(OUT,'workholding-check-failure.png'),fullPage:true}).catch(()=>{});fs.writeFileSync(path.join(OUT,'error.txt'),String(e.stack||e));throw e}finally{await browser.close()}})();