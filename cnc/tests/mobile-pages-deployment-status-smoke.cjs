const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const resultsDir = path.resolve(root, 'cnc/test-results');
const expectedMarker = JSON.parse(fs.readFileSync(path.join(root, 'cnc/build-info.json'), 'utf8'));
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
    if(expectedMarker.app!=='cnc-training-platform')throw new Error('invalid expected app marker');
    if(!/^\d{8}-pages\d+$/.test(expectedMarker.build||''))throw new Error('invalid expected Pages build');
    if(!/^\d{8}-pwa\d+$/.test(expectedMarker.pwaBuild||''))throw new Error('invalid expected PWA build');

    await listen();
    browser=await chromium.launch({headless:true});
    const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
    page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text());});
    page.on('pageerror',err=>errors.push(err.message));

    // pages-status.html registers the Service Worker and performs its own no-store
    // build marker request. Waiting for global "networkidle" is the wrong contract:
    // Service Worker lifecycle/update traffic may remain active even after the page
    // is fully usable. Wait for DOM readiness and the actual product state instead.
    await page.goto('http://127.0.0.1:4173/cnc/pages-status.html',{waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForFunction(expected=>document.querySelector('#build')?.textContent===expected,expectedMarker.build,{timeout:30000});
    await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('已读取公网构建标记'),{timeout:30000});

    const data=await page.evaluate(async()=>{
      const response=await fetch('./build-info.json',{cache:'no-store'});
      if(!response.ok)throw new Error(`build marker HTTP ${response.status}`);
      const marker=await response.json();
      const targets=[...document.querySelectorAll('a,button')].filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0;}).map(el=>({text:el.textContent.trim(),width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height}));
      return {marker,build:document.querySelector('#build').textContent,pwa:document.querySelector('#pwa').textContent,status:document.querySelector('#status').textContent,targets};
    });
    if(data.marker.app!==expectedMarker.app)throw new Error('app marker mismatch');
    if(data.marker.build!==expectedMarker.build)throw new Error(`Pages build mismatch: expected ${expectedMarker.build}, got ${data.marker.build}`);
    if(data.marker.pwaBuild!==expectedMarker.pwaBuild)throw new Error(`PWA build mismatch: expected ${expectedMarker.pwaBuild}, got ${data.marker.pwaBuild}`);
    if(data.build!==expectedMarker.build)throw new Error('rendered Pages build mismatch');
    if(data.pwa!==expectedMarker.pwaBuild)throw new Error('rendered PWA build mismatch');
    if(!data.status.includes('已读取公网构建标记'))throw new Error('status did not confirm marker');
    const tooSmall=data.targets.filter(x=>x.height<44||x.width<44);
    if(tooSmall.length)throw new Error(`touch targets below 44px: ${JSON.stringify(tooSmall)}`);
    if(errors.length)throw new Error(`console errors: ${errors.join(' | ')}`);
    await page.screenshot({path:path.join(resultsDir,'pages-deployment-status-390x844.png'),fullPage:true});
    fs.writeFileSync(path.join(resultsDir,'pages-deployment-status-result.json'),JSON.stringify({...data,expectedMarker,consoleErrors:errors},null,2));
    console.log('CNC Pages deployment status smoke passed');
  }catch(error){
    fs.writeFileSync(path.join(resultsDir,'pages-deployment-status-error.txt'),String(error&&error.stack||error));
    throw error;
  }finally{
    if(browser)await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
})();
