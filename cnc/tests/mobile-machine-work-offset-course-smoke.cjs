const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async()=>{
  fs.mkdirSync('artifacts',{recursive:true});
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const page=await context.newPage();
  const errors=[];
  page.on('console',msg=>{if(msg.type()==='error') errors.push(msg.text())});
  page.on('pageerror',err=>errors.push(err.message));
  try{
    await page.goto('http://127.0.0.1:4173/cnc/course-machine-work-offset.html',{waitUntil:'networkidle'});
    await page.evaluate(()=>localStorage.clear());
    await page.reload({waitUntil:'networkidle'});
    const body=await page.locator('body').innerText();
    for(const text of ['机床坐标与工件坐标','预计 35 分钟','机床坐标系','参考点','工件坐标系','工件零点','坐标偏置','G54','原厂手册','现场条件','80分']){
      if(!body.includes(text)) throw new Error(`missing ${text}`);
    }
    const steps=await page.locator('.step').count();
    if(steps<10) throw new Error(`expected course steps >=10, got ${steps}`);
    const choices=[0,0,[0,1,2],1,0,[0,1,2],1,0,[0,1,2],0];
    for(let i=0;i<choices.length;i++){
      const current=await page.locator('#question').innerText();
      if(!current.includes(`第${i+1}题`)) throw new Error(`question index mismatch: ${current}`);
      const answer=Array.isArray(choices[i])?choices[i]:[choices[i]];
      for(const index of answer) await page.locator('#options .option').nth(index).click();
      await page.locator('#submit').click();
      await page.locator('#feedback').waitFor({state:'visible'});
      const feedback=await page.locator('#feedback').innerText();
      if(!feedback.includes('回答正确')) throw new Error(`question ${i+1} failed: ${feedback}`);
      await page.locator('#next').click();
    }
    await page.locator('#result').waitFor({state:'visible'});
    if((await page.locator('#finalScore').innerText())!=='100分') throw new Error('final score is not 100');
    const storage=await page.evaluate(()=>({
      profile:JSON.parse(localStorage.getItem('cnc_training_profile_v1')||'{}'),
      practice:JSON.parse(localStorage.getItem('cnc_training_practice_v1')||'{}')
    }));
    if(!storage.profile.completedLessons?.includes('machine-work-offset')) throw new Error('course completion missing');
    if(storage.profile.lessonScores?.['machine-work-offset']!==100) throw new Error('best score missing');
    if(storage.profile.xp!==100) throw new Error(`unexpected xp ${storage.profile.xp}`);
    if(storage.practice.answers?.length!==10) throw new Error('practice answers missing');
    if((storage.practice.wrong||[]).length!==0) throw new Error('unexpected wrong answers');
    const visible=await page.locator('a:visible,button:visible').evaluateAll(nodes=>nodes.map(n=>({text:n.textContent.trim(),height:n.getBoundingClientRect().height,width:n.getBoundingClientRect().width})));
    const undersized=visible.filter(x=>x.height>0&&x.width>0&&x.height<44);
    if(undersized.length) throw new Error(`touch targets under 44px: ${JSON.stringify(undersized)}`);
    if(errors.length) throw new Error(`console errors: ${errors.join(' | ')}`);
    await page.screenshot({path:'artifacts/machine-work-offset-success.png',fullPage:true});
    console.log('CNC machine/work coordinate course smoke passed');
  }catch(error){
    await page.screenshot({path:'artifacts/machine-work-offset-failure.png',fullPage:true});
    fs.writeFileSync(path.join('artifacts','machine-work-offset-error.txt'),`${error.stack||error}\n\nConsole errors:\n${errors.join('\n')}`);
    throw error;
  }finally{await browser.close()}
})();