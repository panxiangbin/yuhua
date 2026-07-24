const { chromium } = require('playwright');
const assert = require('assert');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 const page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:4173/cnc/course-machining-center-basics.html',{waitUntil:'networkidle'});
 assert.match(await page.title(),/第2关/);
 assert.strictEqual(await page.locator('.term').count(),0);
 assert.strictEqual(await page.locator('.card').count()>=10,true);
 assert.strictEqual(await page.locator('.flow li').count(),3);
 assert.strictEqual(await page.locator('.option').count(),4);
 const profile={version:1,xp:0,lessonScores:{},completedLessons:[],rewards:{}};
 await page.evaluate(v=>localStorage.setItem('cnc_training_profile_v1',JSON.stringify(v)),profile);
 for(let n=0;n<10;n++){
   const q=page.locator('.question');await q.waitFor();
   const text=await q.textContent();
   const correctMap=[1,[0,1,2],0,1,1,[0,1,2],1,1,[0,1,2],1];
   const answer=correctMap[n];
   if(Array.isArray(answer)){for(const idx of answer)await page.locator('.option').nth(idx).click();}
   else await page.locator('.option').nth(answer).click();
   await page.locator('#submit').click();
   assert.match(await page.locator('#feedback').textContent(),/回答正确/);
   await page.locator('#next').click();
 }
 await page.locator('#result:not(.hidden)').waitFor();
 assert.strictEqual(await page.locator('#finalScore').textContent(),'100');
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('cnc_training_profile_v1')));
 assert.ok(stored.completedLessons.includes('machining-center-basics'));
 assert.strictEqual(stored.lessonScores['machining-center-basics'],100);
 assert.strictEqual(stored.xp,100);
 const visible=page.locator('button:visible,a.back:visible,.button:visible');
 for(let n=0;n<await visible.count();n++){const box=await visible.nth(n).boundingBox();assert.ok(box&&box.height>=44,`touch target ${n} ${box&&box.height}`)}
 assert.deepStrictEqual(errors,[]);
 await browser.close();
 console.log('machining center basics course smoke passed');
})().catch(e=>{console.error(e);process.exit(1)});