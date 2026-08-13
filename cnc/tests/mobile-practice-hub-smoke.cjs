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
      {id:'sc-malformed-1',practiceId:'safety-coordinate',ability:'安全与坐标'},
      {id:'av-malformed-1',practiceId:'advanced-verification',ability:'程序验证'}
    ]});
    await page.evaluate(raw=>localStorage.setItem('cnc_training_practice_v1',raw),malformedRaw);
    await page.reload({waitUntil:'networkidle'});
    assert.equal(await page.locator('#passed-count').textContent(),'1','只有真实数字82分应通过；字符串100、120、负分和Infinity字符串都应归零');
    assert.equal(await page.locator('#wrong-count').textContent(),'2','损坏错题项应忽略，只统计可确定来源和题目ID的有效对象');
    assert.equal(await page.locator('#avg-score').textContent(),'82','异常分数不得夹取或强制转换，平均分只应包含真实合法数字82');
    assert.equal(await page.locator('.weak').count(),2,'损坏错题不应破坏薄弱项分析');
    const malformedText=await page.locator('body').innerText();
    assert(!/NaN|Infinity/.test(malformedText),'损坏数据不得在页面显示NaN或Infinity');
    assert.equal(await page.evaluate(()=>localStorage.getItem('cnc_training_practice_v1')),malformedRaw,'练习中心只读，不得静默改写损坏数据');

    const dedupeRaw=JSON.stringify({version:1,history:[{practiceId:'advanced-verification',score:70}],wrongQuestions:[
      {id:'av-q1',practiceId:'advanced-verification',ability:'程序检查'},
      {id:'dsp-q1',practiceId:'drawing-setup-process',ability:'图纸识读'}
    ],wrongItems:[
      {id:'av-q1',practiceId:'advanced-verification',ability:'程序检查'},
      {id:'pfsd-q2',ability:'程序验证'}
    ],wrong:[
      {id:'av-q1',ability:'程序检查'},
      {id:'apf-q3',ability:'报警与首件'},
      null,'损坏错题',{id:'unknown-q1',practiceId:'unknown-set',ability:'待分类'}
    ]});
    await page.evaluate(raw=>localStorage.setItem('cnc_training_practice_v1',raw),dedupeRaw);
    await page.goto(`${BASE}/cnc/practice.html`,{waitUntil:'networkidle'});
    assert.equal(await page.locator('#wrong-count').textContent(),'4','三个兼容字段应按来源专项+题目ID去重，同一道av-q1只能计1道');
    assert((await page.locator('#recommended-entry').getAttribute('href')).includes('advanced-verification'),'去重后仍应优先推荐首个真实有错题专项');
    const advancedCard=await page.locator('.practice').filter({hasText:'程序验证与异常排查15题'}).innerText();
    const programCard=await page.locator('.practice').filter({hasText:'程序补空、排序与找错15题'}).innerText();
    assert(advancedCard.includes('错题1道'),'跨三个字段重复的av-q1不能虚增专项错题数');
    assert(programCard.includes('错题1道'),'仅存在wrongItems且可由题号前缀识别的错题必须被统计');
    assert.equal(await page.locator('.weak').count(),4,'四道去重错题应形成四个有效能力维度');
    assert.equal(await page.evaluate(()=>localStorage.getItem('cnc_training_practice_v1')),dedupeRaw,'兼容字段去重只能只读汇总，不得改写源记录');

    await page.goto(`${BASE}/cnc/practice-wrong-review.html`,{waitUntil:'networkidle'});
    assert.equal(await page.locator('#wrong-total').textContent(),'4','跨专项错题页应与专项中心保持4道去重错题');
    assert.equal(await page.evaluate(()=>localStorage.getItem('cnc_training_practice_v1')),dedupeRaw,'跨专项错题页不得改写源记录');

    await page.goto(`${BASE}/cnc/profile.html`,{waitUntil:'networkidle'});
    assert.equal(await page.locator('#wrong-count').textContent(),'4','成长档案应与专项中心保持4道去重错题');
    assert.equal(await page.evaluate(()=>localStorage.getItem('cnc_training_practice_v1')),dedupeRaw,'成长档案不得改写专项错题源记录');

    await page.goto(`${BASE}/cnc/practice.html`,{waitUntil:'networkidle'});
    const arrayRootRaw=JSON.stringify([{practiceId:'safety-coordinate',score:100}]);
    await page.evaluate(raw=>localStorage.setItem('cnc_training_practice_v1',raw),arrayRootRaw);
    await page.reload({waitUntil:'networkidle'});
    assert.equal(await page.locator('#passed-count').textContent(),'0','数组根数据应安全降级为空状态');
    assert.equal(await page.locator('#wrong-count').textContent(),'0');
    assert.equal(await page.locator('#avg-score').textContent(),'0');
    assert.equal(await page.locator('.practice').count(),5,'数组根数据降级后仍应完整显示5个专项');
    assert.equal(await page.evaluate(()=>localStorage.getItem('cnc_training_practice_v1')),arrayRootRaw,'数组根数据不得被页面静默改写');

    const bodyText=await page.locator('body').innerText();
    assert(!/NaN|Infinity/.test(bodyText),'页面最终状态不得显示NaN或Infinity');
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    assert(overflow<=1,`390px页面不得横向溢出: ${overflow}`);
    const small = await page.locator('a:visible,button:visible,select:visible').evaluateAll(nodes=>nodes.filter(n=>{const r=n.getBoundingClientRect();return r.width>0&&r.height>0&&r.height<44}).map(n=>({text:n.textContent.trim(),height:n.getBoundingClientRect().height})));
    assert.deepEqual(small,[],'可见交互控件高度不得小于44px');
    assert.deepEqual(errors,[],'控制台不应报错');
    await page.screenshot({path:path.join(OUT,'practice-hub-390x844.png'),fullPage:true});
    fs.writeFileSync(path.join(OUT,'result.json'),JSON.stringify({passed:true,viewport:'390x844',practices:5,filters:3,normalWrong:3,strictNumericScores:true,compatibilityWrong:4,dedupeAcrossWrongFields:true,crossPageWrongCountConsistent:true,wrongItemsSupported:true,malformedReadOnly:true,arrayRootReadOnly:true,noNaNInfinity:true},null,2));
  }catch(err){
    await page.screenshot({path:path.join(OUT,'failure.png'),fullPage:true}).catch(()=>{});
    fs.writeFileSync(path.join(OUT,'error.txt'),String(err.stack||err));
    throw err;
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});