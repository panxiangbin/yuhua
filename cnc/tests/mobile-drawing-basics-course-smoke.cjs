const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async()=>{
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await page.goto('http://127.0.0.1:4173/cnc/course-drawing-basics.html',{waitUntil:'networkidle'});
  await page.evaluate(()=>localStorage.clear());
  await page.reload({waitUntil:'networkidle'});
  assert.match(await page.title(),/图纸、尺寸与基准/);
  await page.getByText('训练营第4关 · 完整课程').waitFor();
  assert.equal(await page.getByText('通关练习 · 10题').count(),1);
  assert.equal(await page.locator('.question').count(),1);
  const bodyText=await page.locator('body').innerText();
  for(const text of ['学习目标','尺寸基准','工艺基准','公差','加工余量','孔距','统一安全','原厂手册']) assert.ok(bodyText.includes(text),`missing ${text}`);
  const visibleButtons=await page.locator('button:visible,a.back:visible').evaluateAll(nodes=>nodes.map(n=>({h:n.getBoundingClientRect().height,w:n.getBoundingClientRect().width})));
  assert.ok(visibleButtons.every(x=>x.h>=44&&x.w>0),'visible touch targets must be at least 44px high');
  const answers=[1,1,[0,1,2],1,0,3,[0,1,2],1,1,[0,1,3]];
  assert.equal(answers.length,10,'answer fixture must cover all 10 questions');
  for(let i=0;i<10;i++){
    const answer=answers[i];
    const indexes=Array.isArray(answer)?answer:[answer];
    for(const idx of indexes) await page.locator('.option').nth(idx).click();
    await page.locator('#next').click();
    await page.locator('#feedback').waitFor();
    assert.match(await page.locator('#feedback').innerText(),/回答正确/);
    if(i<9) await page.locator('#next').click();
  }
  await page.getByText('第4关通过').waitFor();
  assert.equal(await page.locator('#finalScore').innerText(),'100');
  const profile=await page.evaluate(()=>JSON.parse(localStorage.getItem('cnc_training_profile_v1')));
  assert.equal(profile.lessonScores['drawing-basics'],100);
  assert.ok(profile.completedLessons.includes('drawing-basics'));
  assert.ok(profile.rewardedCourses.includes('drawing-basics'));
  assert.equal(profile.xp,100);
  const practice=await page.evaluate(()=>JSON.parse(localStorage.getItem('cnc_training_practice_v1')));
  assert.equal(practice.wrongQuestions.length,0);
  assert.equal(Object.keys(practice.attempts).length,10);
  const resultTargets=await page.locator('#result a:visible,#result button:visible').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().height));
  assert.ok(resultTargets.every(h=>h>=44));
  assert.deepEqual(errors,[]);
  await browser.close();
  console.log('drawing basics course smoke passed');
})().catch(err=>{console.error(err);process.exit(1)});
