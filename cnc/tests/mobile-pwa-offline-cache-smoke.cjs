const { chromium }=require('playwright');
const http=require('http'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'cnc/test-results');
fs.mkdirSync(out,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);if(p==='/'||p==='/cnc/')p='/cnc/index.html';const file=path.normalize(path.join(root,p));if(!file.startsWith(root)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404);return res.end('404')}res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res)});
async function ensureControlled(page){
  await page.waitForFunction(async()=>{if(!('serviceWorker' in navigator))return false;const reg=await navigator.serviceWorker.getRegistration('./');return Boolean(reg);},{timeout:20000});
  await page.evaluate(()=>navigator.serviceWorker.ready);
  if(!await page.evaluate(()=>Boolean(navigator.serviceWorker.controller))){
    await Promise.race([
      page.evaluate(()=>new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',()=>resolve(true),{once:true}))),
      page.waitForTimeout(15000).then(()=>false)
    ]);
  }
  if(!await page.evaluate(()=>Boolean(navigator.serviceWorker.controller))){
    await page.reload({waitUntil:'networkidle'});
  }
  await page.waitForFunction(()=>Boolean(navigator.serviceWorker&&navigator.serviceWorker.controller),{timeout:30000});
}
(async()=>{await new Promise(r=>server.listen(4173,'127.0.0.1',r));const browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'allow'});const page=await context.newPage(),errors=[];page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});await page.goto('http://127.0.0.1:4173/cnc/index.html',{waitUntil:'networkidle'});await ensureControlled(page);const reg=await page.evaluate(()=>navigator.serviceWorker.getRegistration('./'));if(!reg)throw new Error('Service Worker未注册');const cachesBefore=await page.evaluate(()=>caches.keys());if(!cachesBefore.some(x=>x.startsWith('cnc-static-20260726-pwa2')))throw new Error('静态缓存版本缺失');await page.goto('http://127.0.0.1:4173/cnc/pwa-status.html',{waitUntil:'networkidle'});await page.waitForFunction(()=>document.querySelector('#worker').textContent.includes('已启用'));const build=await page.locator('#build').textContent();if(!build.includes('20260726-pwa2'))throw new Error('构建版本未显示');const small=await page.locator('a,button').evaluateAll(els=>els.filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&Math.min(r.width,r.height)<44}).map(e=>({text:e.textContent.trim(),w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})));if(small.length)throw new Error('触控区不足44px '+JSON.stringify(small));await context.setOffline(true);await page.goto('http://127.0.0.1:4173/cnc/training-camp.html',{waitUntil:'domcontentloaded'});if(!await page.title())throw new Error('离线训练营未打开');await page.goto('http://127.0.0.1:4173/cnc/not-cached-'+Date.now()+'.html',{waitUntil:'domcontentloaded'});if(!(await page.locator('body').innerText()).includes('网络暂时不可用'))throw new Error('离线回退页未生效');await page.screenshot({path:path.join(out,'pwa-offline-390x844.png'),fullPage:true});if(errors.length)throw new Error('控制台错误 '+errors.join(' | '));fs.writeFileSync(path.join(out,'pwa-offline-result.json'),JSON.stringify({build,caches:cachesBefore,offlineFallback:true,touchTargets:true},null,2));await browser.close();server.close();console.log('CNC PWA offline cache smoke passed');})().catch(e=>{console.error(e);server.close();process.exit(1)});