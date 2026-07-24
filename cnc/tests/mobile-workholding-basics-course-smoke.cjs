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

  const correctChoices=[0,[0,1,2],1,0,[0,1,2,3],1,0,[0,1,2,3],1,0];
  const answerQuiz=async choices=>{
    for(let i=0;i<choices.length;i++){
      const current=await page.locator('#question').innerText();
      if(!current.includes(`第${i+1}题`)) throw new Error(`question index mismatch: ${current}`);
      const answer=Array.isArray(choices[i])?choices[i]:[choices[i]];
      for(const index of answer) await page.locator('#options .option').nth(index).click();
      await page.locator('#submit').click();
      await page.locator('#feedback').waitFor({state:'visible'});
      await page.locator('#next').click();
    }
    await page.locator('#result').waitFor({state:'visible'});
  };

  try{
    await page.goto('http://127.0.0.1:4173/cnc/course-workholding-basics.html',{waitUntil:'networkidle'});
    await page.evaluate(()=>localStorage.clear());
    await page.reload({waitUntil:'networkidle'});
    const body=await page.locator('body').innerText();
    for(const text of ['工件装夹基础','预计 40 分钟','定位','夹紧','自由度','3-2-1定位','刀具通道','原厂手册','现场条件']){
      if(!body.includes(text)) throw new Error(`missing ${text}`);
    }
    const steps=await page.locator('.step').count();
    if(steps<10) throw new Error(`expected course steps >=10, got ${steps}`);

    await answerQuiz(correctChoices);
    if((await page.locator('#finalScore').innerText())!=='100分') throw new Error('final score is not 100');
    if(!(await page.locator('#resultText').innerText()).includes('已通过第6关')) throw new Error('100-point pass message missing');
    const passedStorage=await page.evaluate(()=>({
      profile:JSON.parse(localStorage.getItem('cnc_training_profile_v1')||'{}'),
      practice:JSON.parse(localStorage.getItem('cnc_training_practice_v1')||'{}')
    }));
    if(!passedStorage.profile.completedLessons?.includes('workholding-basics')) throw new Error('course completion missing');
    if(passedStorage.profile.lessonScores?.['workholding-basics']!==100) throw new Error('best score missing');
    if(passedStorage.profile.xp!==100) throw new Error(`unexpected xp ${passedStorage.profile.xp}`);
    if(passedStorage.practice.answers?.length!==10) throw new Error('practice answers missing');
    if((passedStorage.practice.wrong||[]).length!==0) throw new Error('unexpected wrong answers');

    await page.evaluate(()=>localStorage.clear());
    await page.reload({waitUntil:'networkidle'});
    const seventyPointChoices=[...correctChoices.slice(0,7),[0,1],0,1];
    await answerQuiz(seventyPointChoices);
    if((await page.locator('#finalScore').innerText())!=='70分') throw new Error('70-point threshold scenario score mismatch');
    if(!(await page.locator('#resultText').innerText()).includes('未达到80分')) throw new Error('80-point threshold message missing');
    const failedStorage=await page.evaluate(()=>({
      profile:JSON.parse(localStorage.getItem('cnc_training_profile_v1')||'{}'),
      practice:JSON.parse(localStorage.getItem('cnc_training_practice_v1')||'{}')
    }));
    if(failedStorage.profile.completedLessons?.includes('workholding-basics')) throw new Error('70-point attempt incorrectly completed course');
    if(failedStorage.profile.lessonScores?.['workholding-basics']!==70) throw new Error('70-point best score missing');
    if((failedStorage.profile.xp||0)!==0) throw new Error(`70-point attempt incorrectly awarded xp ${failedStorage.profile.xp}`);
    if(failedStorage.practice.answers?.length!==10) throw new Error('70-point practice answers missing');
    if((failedStorage.practice.wrong||[]).length!==3) throw new Error(`expected 3 wrong answers, got ${(failedStorage.practice.wrong||[]).length}`);

    const visible=await page.locator('a:visible,button:visible').evaluateAll(nodes=>nodes.map(n=>({text:n.textContent.trim(),height:n.getBoundingClientRect().height,width:n.getBoundingClientRect().width})));
    const undersized=visible.filter(x=>x.height>0&&x.width>0&&x.height<44);
    if(undersized.length) throw new Error(`touch targets under 44px: ${JSON.stringify(undersized)}`);
    if(errors.length) throw new Error(`console errors: ${errors.join(' | ')}`);
    await page.screenshot({path:'artifacts/workholding-basics-success.png',fullPage:true});
    console.log('CNC workholding basics course smoke passed: 100-point pass and 70-point fail paths verified');
  }catch(error){
    await page.screenshot({path:'artifacts/workholding-basics-failure.png',fullPage:true});
    fs.writeFileSync(path.join('artifacts','workholding-basics-error.txt'),`${error.stack||error}\n\nConsole errors:\n${errors.join('\n')}`);
    throw error;
  }finally{await browser.close()}
})();
