const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const resultsDir = path.resolve(root, 'cnc/test-results');
fs.mkdirSync(resultsDir, { recursive: true });
const mime = { '.html':'text/html; charset=utf-8','.json':'application/json; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webmanifest':'application/manifest+json; charset=utf-8' };
const server = http.createServer((req,res)=>{
  const clean = decodeURIComponent(req.url.split('?')[0]);
  let file = path.join(root, clean === '/' ? 'cnc/index.html' : clean.replace(/^\//,''));
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404).end('not found'); return; }
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
function listen(){return new Promise((resolve,reject)=>server.listen(4173,'127.0.0.1',resolve).once('error',reject));}
(async()=>{
  let browser;
  const errors=[];
  try{
    const expected=JSON.parse(fs.readFileSync(path.join(root,'cnc/build-info.json'),'utf8').replace(/^\uFEFF/,''));
    if(expected.app!=='cnc-training-platform')throw new Error('invalid local app marker');
    if(!/^\d{8}-[a-z0-9-]+$/i.test(expected.build))throw new Error('invalid local Pages build format');
    if(!/^\d{8}-pwa\d+$/i.test(expected.pwaBuild))throw new Error('invalid local PWA build format');

    await listen();
    browser=await chromium.launch({headless:true});
    const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
    page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text());});
    page.on('pageerror',err=>errors.push(err.message));

    await page.goto('http://127.0.0.1:4173/cnc/pages-status.html',{waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForFunction(build=>document.querySelector('#build')?.textContent===build,expected.build,{timeout:30000});
    await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('已读取公网构建标记'),{timeout:30000});

    const data=await page.evaluate(async()=>{
      const response=await fetch('./build-info.json',{cache:'no-store'});
      if(!response.ok)throw new Error(`build marker HTTP ${response.status}`);
      const marker=await response.json();
      const targets=[...document.querySelectorAll('a,button')].filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0;}).map(el=>({text:el.textContent.trim(),width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height}));
      return {marker,build:document.querySelector('#build').textContent,pwa:document.querySelector('#pwa').textContent,status:document.querySelector('#status').textContent,targets};
    });
    if(data.marker.app!==expected.app)throw new Error('invalid app marker');
    if(data.marker.build!==expected.build)throw new Error(`invalid Pages build: ${data.marker.build}`);
    if(data.marker.pwaBuild!==expected.pwaBuild)throw new Error(`invalid PWA build: ${data.marker.pwaBuild}`);
    if(data.build!==expected.build||data.pwa!==expected.pwaBuild)throw new Error('rendered build marker mismatch');
    if(!data.status.includes('已读取公网构建标记'))throw new Error('status did not confirm marker');
    const tooSmall=data.targets.filter(x=>x.height<44||x.width<44);
    if(tooSmall.length)throw new Error(`touch targets below 44px: ${JSON.stringify(tooSmall)}`);
    if(errors.length)throw new Error(`console errors: ${errors.join(' | ')}`);
    await page.screenshot({path:path.join(resultsDir,'pages-deployment-status-390x844.png'),fullPage:true});
    fs.writeFileSync(path.join(resultsDir,'pages-deployment-status-result.json'),JSON.stringify({...data,consoleErrors:errors},null,2));
    console.log('CNC Pages deployment status smoke passed');
  }catch(error){
    fs.writeFileSync(path.join(resultsDir,'pages-deployment-status-error.txt'),String(error&&error.stack||error));
    throw error;
  }finally{
    if(browser)await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
})();