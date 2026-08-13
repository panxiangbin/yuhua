const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const BASE = process.env.CNC_BASE_URL || 'http://127.0.0.1:4173';
const OUT = process.env.CNC_ARTIFACT_DIR || 'artifacts/practice-hub';
fs.mkdirSync(OUT, { recursive: true });

(async()=>{
  const browser = await chromium.launch({headless:true});
  const page = await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
  const errors=[];
  page.on('console',m=>{if(m.type()==='error') errors.push(`console:${m.text()}`)});
  page.on('pageerror',e=>errors.push(`pageerror:${e.message}`));
  try{
    await page.goto(`${BASE}/cnc/practice.html`,{waitUntil:'networkidle'});
    assert.equal(await page.locator('.practice').count(),5,'应显示5个专项');
    assert.equal(await page.locator('#practice-count').textContent(),'5');
    assert.equal(await page.locator('#passed-count').textContent(),'0');
    assert.equal(await page.locator('#wrong-count').textContent(),'0');
    assert((await page.locator('#recommended-entry').getAttribute('href')).includes('practice-safety-coordinate'));

    await page.evaluate(()=>localStorage.setItem('cnc_training_practice_v1',JSON.stringify({version:1,history:[
      {practiceId:'safety-coordinate',score:100},{practiceId:'advanced-verification',score:73},{practiceId:'advanced-verification',score:87},{practiceId:'drawing-setup-process',score:67}
    ],wrongQuestions:[
      {id:'advanced-verification-q1',practiceId:'advanced-verification',ability:'程序检查'},
      {id:'advanced-verification-q2',practiceId:'advanced-verification',ability:'程序检查'},
      {id:'drawing-setup-process-q1',practiceId:'drawing-setup-process',ability:'图纸识读'}
    ]})));
    await page.reload({waitUntil:'networkidle'});
    assert.equal(await page.locator('#passed-count').textContent(),'2','100和87应算2项通过');
    assert.equal(await page.locator('#wrong-count').textContent(),'3');
    assert.equal(await page.locator('#avg-score').textContent(),'85','100、87、67平均为85');
    assert((await page.locator('#recommended-entry').getAttribute('href')).includes('advanced-verification'),'应优先推荐有错题专项');
    assert.equal(await page.locator('.weak').count(),2);
    assert((await page.locator('.weak').first().innerText()).includes('程序检查'));

    await page.selectOption('#ability-filter','程序验证');
    assert.equal(await page.locator('.practice').count(),2,'程序验证筛选应显示2项');
    await page.selectOption('#type-filter','程序实战');
    assert.equal(await page.locator('.practice').count(),1,'程序实战筛选应显示1项');
    assert((await page.locator('.practice h2').innerText()).includes('程序补空'));
    await page.selectOption('#ability-filter','all');
    await page.selectOption('#type-filter','all');
    await page.selectOption('#status-filter','passed');
    assert.equal(await page.locator('.practice').count(),2,'已通过筛选应显示2项');
    await page.selectOption('#status-filter','retry');
    assert.equal(await page.locator('.practice').count(),1,'未通过或有错题筛选应显示1项');

    const malformedRaw = JSON.stringify({version:1,history:[
      null,'损坏记录',
      {practiceId:'safety-coordinate',score:'100'},
      {practiceId:'safety-coordinate',score:120},
      {practiceId:'advanced-verification',score:-5},
      {practiceId:'advanced-verification',score:'Infinity'},
      {practiceId:'drawing-setup-process',score:82}
    ],wrongQuestions:[
      null,'损坏错题',
      {practiceId:'safety-coordinate',ability:'安全与坐标'},
      {practiceId:'advanced-verification',ability:'程序验证'}
    ]});
    await page.evaluate(raw=>localStorage.setItem('cnc_training_practice_v1',raw),malformedRaw);
    await page.reload({waitUntil:'networkidle'});
    assert.equal(await page.locator('#passed-count').textContent(),'1','只有真实数字82分应通过；字符串100、120、负分和Infinity字符串都应归零');
    assert.equal(await page.locator('#wrong-count').textContent(),'2','损坏错题项应忽略，只统计有效对象');
    assert.equal(await page.locator('#avg-score').textContent(),'82','异常分数不得夹取或强制转换，平均分只应包含真实合法数字82');
    assert.equal(await page.locator('.weak').count(),2,'损坏错题不应破坏薄弱项分析');
    const malformedText=await page.locator('body').innerText();
    assert(!/NaN|Infinity/.test(malformedText),'损坏数据不得在页面显示NaN或Infinity');
    assert.equal(await page.evaluate(()=>localStorage.getItem('cnc_training_practice_v1')),malformedRaw,'练习中心只读，不得静默改写损坏数据');

    const arrayRootRaw=JSON.stringify([{practiceId:'safety-coordinate',score:100}]);
    await page.evaluate(raw=>localStorage.setItem('cnc_training_practice_v1',raw),arrayRootRaw);
    await page.reload({waitUntil:'networkidle'});
    assert.equal(await page.locator('#passed-count').textContent(),'0','数组根数据应安全降级为空状态');
    assert.equal(await page.locator('#wrong-count').textContent(),'0');
    assert.equal(await page.locator('#avg-score').textContent(),'0');
    assert.equal(await page.locator('.practice').count(),5,'数组根数据降级后仍应完整显示5个专项');
    assert.equal(await page.evaluate(()=>localStorage.getItem('cnc_training_practice_v1')),arrayRootRaw,'数组根数据不得被页面静默改写');

    const small = await page.locator('a:visible,button:visible,select:visible').evaluateAll(nodes=>nodes.filter(n=>{const r=n.getBoundingClientRect();return r.width>0&&r.height>0&&r.height<44}).map(n=>({text:n.textContent.trim(),height:n.getBoundingClientRect().height})));
    assert.deepEqual(small,[],'可见交互控件高度不得小于44px');
    assert.deepEqual(errors,[],'控制台不应报错');
    await page.screenshot({path:path.join(OUT,'practice-hub-390x844.png'),fullPage:true});
    fs.writeFileSync(path.join(OUT,'result.json'),JSON.stringify({passed:true,viewport:'390x844',practices:5,filters:3,normalWrong:3,strictNumericScores:true,malformedReadOnly:true,arrayRootReadOnly:true,noNaNInfinity:true},null,2));
  }catch(err){
    await page.screenshot({path:path.join(OUT,'failure.png'),fullPage:true}).catch(()=>{});
    fs.writeFileSync(path.join(OUT,'error.txt'),String(err.stack||err));
    throw err;
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});