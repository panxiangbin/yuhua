const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const out = path.join(process.cwd(),'artifacts','simulator-homing');
fs.mkdirSync(out,{recursive:true});
const URL='http://127.0.0.1:4173/cnc/simulator-homing.html';
async function runScenario(name,wrongIndexes){
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const errors=[];page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('pageerror',e=>errors.push(e.message));
  await page.goto(URL,{waitUntil:'networkidle'});
  await page.evaluate(()=>localStorage.clear());
  await page.reload({waitUntil:'networkidle'});
  await assertVisibleText(page,'回零不是“按一下就走”');
  await assertVisibleText(page,'8');await assertVisibleText(page,'3');
  for(let i=0;i<8;i++){
    const step=page.locator('.step.active');
    await assertVisibleText(step,`步骤 ${i+1}/8`);
    const correct=[1,1,1,0,0,1,1,1][i];
    const pick=wrongIndexes.includes(i)?(correct===0?1:0):correct;
    await step.locator('.choice').nth(pick).click();
    await step.locator('.feedback.show').waitFor();
  }
  await page.locator('#result.show').waitFor();
  const expected=Math.round((8-wrongIndexes.length)*12.5);
  assert.strictEqual(Number(await page.locator('#score').textContent()),expected);
  const sim=await page.evaluate(()=>JSON.parse(localStorage.getItem('cnc_training_simulator_v1')));
  assert.strictEqual(sim.version,1);assert.strictEqual(sim.simulators.homing.lastScore,expected);assert.strictEqual(sim.simulators.homing.attempts,1);assert.strictEqual(sim.simulators.homing.mistakes.length,wrongIndexes.length);
  const profile=await page.evaluate(()=>JSON.parse(localStorage.getItem('cnc_training_profile_v1')));
  assert.strictEqual(profile.version,1);assert.strictEqual(profile.simulators.homing.bestScore,expected);
  if(wrongIndexes.length===0){assert.strictEqual(sim.simulators.homing.passed,true);assert.strictEqual(profile.simulators.homing.passed,true);assert.strictEqual(profile.xp,80)}else{assert.strictEqual(Boolean(sim.simulators.homing.passed),false);assert.strictEqual(Boolean(profile.simulators.homing.passed),false);assert.strictEqual(profile.xp,0)}
  const visible=page.locator('a:visible,button:visible');
  for(let i=0;i<await visible.count();i++){const b=await visible.nth(i).boundingBox();assert(b&&b.height>=44,`touch target below 44px: ${b&&b.height}`)}
  assert.deepStrictEqual(errors,[]);
  await page.screenshot({path:path.join(out,`${name}.png`),fullPage:true});
  await browser.close();
}
async function assertVisibleText(scope,text){const loc=scope.locator(`text=${text}`).first();await loc.waitFor({state:'visible'});}
(async()=>{try{await runScenario('homing-pass',[]);await runScenario('homing-three-errors',[0,2,7]);fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({ok:true,viewport:'390x844',scenarios:2},null,2));console.log('homing simulator smoke passed')}catch(e){fs.writeFileSync(path.join(out,'error.txt'),e.stack||String(e));console.error(e);process.exit(1)}})();