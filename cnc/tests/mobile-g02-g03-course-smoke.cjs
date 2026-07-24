const { chromium } = require('playwright');
const fs = require('fs');
const assert = require('assert');
fs.mkdirSync('artifacts',{recursive:true});
const URL='http://127.0.0.1:4173/cnc/course-g02-g03-basics.html';
const answers=[[0],[1],[0,1,2],[1],[1],[0],[0,1,2],[1],[1],[0,1,2]];
async function answerCourse(page,wrongIndexes=[]){
  for(let i=0;i<answers.length;i++){
    await page.waitForFunction(n=>document.querySelector('#question')?.textContent.startsWith(`${n}.`),i+1);
    const chosen=wrongIndexes.includes(i)?[answers[i].includes(0)?1:0]:answers[i];
    for(const idx of chosen) await page.locator(`.option[data-i="${idx}"]`).click();
    await page.locator('#submit').click();
    await page.waitForFunction(()=>/回答正确|回答错误/.test(document.querySelector('#feedback')?.textContent||''));
    await page.locator('#submit').click();
  }
  await page.waitForSelector('#result:not(.hidden)');
}
(async()=>{
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const page=await context.newPage();
  const errors=[];page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('pageerror',e=>errors.push(e.message));
  try{
    await page.goto(URL,{waitUntil:'networkidle'});
    const text=await page.locator('body').innerText();
    for(const needle of ['G02与G03','预计 50 分钟','圆弧插补','加工平面','G17','G18','G19','I、J圆心增量','R半径','原厂手册']) assert.ok(text.includes(needle),`missing ${needle}`);
    assert.strictEqual(await page.locator('.step').count(),5);
    assert.strictEqual(await page.locator('.option').count()>0,true);
    const visibleHeights=await page.locator('button:visible,a.back:visible').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().height));
    assert.ok(visibleHeights.every(h=>h>=44),`touch target too small: ${visibleHeights}`);

    await answerCourse(page);
    assert.strictEqual(await page.locator('#finalScore').innerText(),'100分');
    assert.ok((await page.locator('#resultTitle').innerText()).includes('已通过第10关'));
    let profile=await page.evaluate(()=>JSON.parse(localStorage.getItem('cnc_training_profile_v1')));
    let practice=await page.evaluate(()=>JSON.parse(localStorage.getItem('cnc_training_practice_v1')));
    assert.ok(profile.completedLessons.includes('lesson-10'));
    assert.strictEqual(profile.lessonScores['lesson-10'],100);
    assert.strictEqual(profile.xpAwards['lesson-10'],100);
    assert.strictEqual(Object.keys(practice.answers).filter(k=>k.startsWith('g02-')).length,10);
    assert.strictEqual(practice.wrongIds.filter(k=>k.startsWith('g02-')).length,0);

    await page.evaluate(()=>localStorage.clear());
    await page.reload({waitUntil:'networkidle'});
    await answerCourse(page,[0,1,2]);
    assert.strictEqual(await page.locator('#finalScore').innerText(),'70分');
    assert.ok((await page.locator('#resultTitle').innerText()).includes('未达到80分'));
    profile=await page.evaluate(()=>JSON.parse(localStorage.getItem('cnc_training_profile_v1')));
    practice=await page.evaluate(()=>JSON.parse(localStorage.getItem('cnc_training_practice_v1')));
    assert.ok(!profile.completedLessons.includes('lesson-10'));
    assert.strictEqual(profile.lessonScores['lesson-10'],70);
    assert.strictEqual(Number(profile.xp||0),0);
    assert.strictEqual(practice.wrongIds.filter(k=>k.startsWith('g02-')).length,3);
    assert.deepStrictEqual(errors,[]);
    await page.screenshot({path:'artifacts/g02-g03-course-success.png',fullPage:true});
    console.log('G02/G03 course mobile smoke passed');
  }catch(error){
    await page.screenshot({path:'artifacts/g02-g03-course-failure.png',fullPage:true}).catch(()=>{});
    fs.writeFileSync('artifacts/g02-g03-course-error.txt',`${error.stack}\n\nConsole errors:\n${errors.join('\n')}`);
    throw error;
  }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exit(1)});