const { chromium } = require('playwright');
const assert = require('assert');

(async()=>{
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text())});
  await page.goto('http://127.0.0.1:4173/cnc/course-coordinate-axes.html',{waitUntil:'networkidle'});
  assert.match(await page.title(),/坐标轴与运动方向/);
  assert.strictEqual(await page.locator('.option').count(),4);
  const body=await page.locator('body').innerText();
  for(const text of ['学习目标','机床坐标系','工件坐标系','绝对方式 G90','增量方式 G91','真实场景','统一安全提示','10题']) assert.ok(body.includes(text),`missing ${text}`);
  assert.ok(body.includes('原厂手册'));
  const answerSets=[[1],[0,1,2,3],[1],[0],[1],[0,1,2,3],[0],[1],[1],[0,1,2,3]];
  for(let q=0;q<answerSets.length;q++){
    const options=page.locator('.option');
    for(const i of answerSets[q]) await options.nth(i).click();
    if(answerSets[q].length>1) await page.getByRole('button',{name:'确认答案'}).click();
    await page.getByRole('button',{name:q===9?'下一题':'下一题'}).click();
  }
  await page.waitForSelector('#result:not(.hidden)');
  assert.strictEqual((await page.locator('#finalScore').innerText()).trim(),'100');
  const profile=await page.evaluate(()=>JSON.parse(localStorage.getItem('cnc_training_profile_v1')));
  assert.ok(profile.completedLessons.includes('coordinate-axes'));
  assert.strictEqual(profile.lessonScores['coordinate-axes'],100);
  assert.ok(profile.rewarded.includes('coordinate-axes-pass'));
  assert.strictEqual(profile.xp,100);
  const visible=page.locator('button:visible,a.back:visible');
  for(let i=0;i<await visible.count();i++){
    const box=await visible.nth(i).boundingBox();
    assert.ok(box&&box.height>=44,`touch target ${i} height ${box&&box.height}`);
  }
  assert.strictEqual(errors.length,0,errors.join('\n'));
  await browser.close();
  console.log('coordinate axes course mobile smoke passed');
})().catch(err=>{console.error(err);process.exit(1)});
