const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

(async()=>{
  const base=process.env.CNC_BASE_URL||'http://127.0.0.1:4173';
  const out=process.env.CNC_ARTIFACT_DIR||path.join(process.cwd(),'artifacts','advanced-verification-practice');
  fs.mkdirSync(out,{recursive:true});
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  try{
    await page.goto(`${base}/cnc/practice-advanced-verification.html`,{waitUntil:'networkidle'});
    await page.waitForFunction(()=>window.__CNC_ADVANCED_PRACTICE__?.questions?.length===15);
    const meta=await page.evaluate(()=>window.__CNC_ADVANCED_PRACTICE__.questions.map(q=>({id:q.id,type:q.type,course:q.course,ability:q.ability,risk:q.risk,system:q.system,answer:q.answer,explain:q.explain,redoUrl:'./practice-advanced-verification.html'})));
    assert.equal(meta.length,15);
    assert.ok(new Set(meta.map(x=>x.id)).size===15,'duplicate question id');
    assert.ok(new Set(meta.map(x=>x.type)).size>=4,'need at least four question types');
    for(const q of meta){
      assert.ok(q.course&&q.ability&&q.risk&&q.system&&q.explain,'missing metadata');
      assert.ok(Array.isArray(q.answer)&&q.answer.length,'missing answer');
    }
    const body=await page.locator('body').innerText();
    for(const text of ['程序段','报警排查','参数风险','首件检查','80','原厂手册']) assert.ok(body.includes(text),`missing ${text}`);
    for(let i=0;i<15;i++){
      const q=meta[i];
      const active=page.locator('.question.active');
      await active.waitFor();
      for(const index of q.answer) await active.locator(`input[value="${index}"]`).check();
      await active.getByRole('button',{name:'提交答案'}).click();
      await active.locator('.feedback.show').waitFor();
      await active.getByRole('button',{name:i===14?'查看成绩':'下一题'}).click();
    }
    await page.locator('#result.show').waitFor();
    assert.equal(await page.locator('#score').innerText(),'100');
    assert.match(await page.locator('#result-title').innerText(),/已通过/);
    let stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('cnc_training_practice_v1')));
    assert.equal(stored.bestScores.advancedVerification,100);
    assert.equal(stored.history.at(-1).answered,15);
    assert.equal(stored.wrongQuestions.filter(x=>/^av-/.test(x.id)).length,0);
    await page.screenshot({path:path.join(out,'pass-390x844.png'),fullPage:true});

    await page.getByRole('button',{name:'全部重练'}).click();
    for(let i=0;i<15;i++){
      const q=meta[i];
      const active=page.locator('.question.active');
      await active.waitFor();
      const wrongIndex=q.answer.includes(0)?1:0;
      if(i<4) await active.locator(`input[value="${wrongIndex}"]`).check();
      else for(const index of q.answer) await active.locator(`input[value="${index}"]`).check();
      await active.getByRole('button',{name:'提交答案'}).click();
      await active.getByRole('button',{name:i===14?'查看成绩':'下一题'}).click();
    }
    await page.locator('#result.show').waitFor();
    assert.equal(await page.locator('#score').innerText(),'73');
    assert.match(await page.locator('#result-title').innerText(),/未达到80分/);
    stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('cnc_training_practice_v1')));
    const wrong=stored.wrongQuestions.filter(x=>/^av-/.test(x.id));
    assert.equal(wrong.length,4);
    assert.ok(wrong.every(x=>x.redoUrl&&x.course&&x.ability&&x.risk&&x.system&&x.explain));
    await page.getByRole('button',{name:'只重做错题'}).click();
    assert.match(await page.locator('.meta').innerText(),/1\/4/);
    const targets=await page.locator('a:visible,button:visible,label.option:visible').evaluateAll(nodes=>nodes.map(n=>({text:n.textContent.trim(),h:n.getBoundingClientRect().height})).filter(x=>x.text));
    assert.ok(targets.every(x=>x.h>=44),JSON.stringify(targets.filter(x=>x.h<44)));
    assert.deepEqual(errors,[]);
    await page.screenshot({path:path.join(out,'fail-redo-390x844.png'),fullPage:true});
    fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({questions:meta.length,types:[...new Set(meta.map(x=>x.type))],passScore:100,failScore:73,wrong:4,consoleErrors:errors},null,2));
    console.log('advanced verification practice smoke passed');
  }catch(error){
    await page.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});
    fs.writeFileSync(path.join(out,'failure.txt'),String(error&&error.stack||error));
    throw error;
  }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exit(1)});
