'use strict';

const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'cnc', 'test-results', 'learning-depth-browser');
const PORT = Number(process.env.CNC_TEST_PORT || 4186);
const BASE = `http://127.0.0.1:${PORT}/cnc/`;
const EDGE = process.env.CNC_EDGE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const SAFETY = '教学参考，需按机床说明书、现场工艺和空运行验证。';

fs.mkdirSync(OUT, { recursive: true });
const types = { '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.cjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2' };
const server = http.createServer((req,res)=>{
  let requestPath = decodeURIComponent(req.url.split('?')[0]);
  if (requestPath.endsWith('/favicon.ico')) { res.writeHead(204); res.end(); return; }
  if (requestPath === '/' || requestPath === '/cnc' || requestPath === '/cnc/') requestPath = '/cnc/index.html';
  const file = path.normalize(path.join(ROOT, requestPath));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'}); res.end('404'); return; }
  res.setHeader('Cache-Control','no-store'); res.setHeader('Content-Type',types[path.extname(file).toLowerCase()] || 'application/octet-stream'); fs.createReadStream(file).pipe(res);
});

function fail(condition, message, failures) { if (!condition) failures.push(message); }
function watch(page, errors, failed) {
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(err.message));
  page.on('requestfailed', req => failed.push({ url:req.url(), error:req.failure()?.errorText || 'failed' }));
}

(async()=>{
  const report = { generatedAt:new Date().toISOString(), baseUrl:BASE, passed:false, failures:[], learning:null, detail:null, errors:[], failedRequests:[] };
  let browser;
  try {
    await new Promise((resolve,reject)=>{ server.once('error',reject); server.listen(PORT,'127.0.0.1',resolve); });
    const options = { headless:true };
    if (process.platform === 'win32' && fs.existsSync(EDGE)) options.executablePath = EDGE; else options.channel = 'msedge';
    browser = await chromium.launch(options);
    const context = await browser.newContext({ viewport:{ width:390, height:844 }, serviceWorkers:'block' });
    const page = await context.newPage(); watch(page, report.errors, report.failedRequests);

    await page.goto(BASE, { waitUntil:'networkidle' });
    await page.locator('.xp-bottom-nav button[data-xp-route="study"]').click();
    await page.locator('#view-study.active').waitFor();
    await page.waitForFunction(()=>document.body.dataset.cncLearningDepthBuild === '20260805-learning-depth1');
    await page.waitForFunction(()=>document.querySelectorAll('#view-study .cnc-sublesson-panel').length === 12 && document.querySelectorAll('#view-study .cnc-sublesson-link').length === 80);
    const learning = await page.evaluate(()=>{
      const panels = Array.from(document.querySelectorAll('#view-study .cnc-sublesson-panel'));
      const links = Array.from(document.querySelectorAll('#view-study .cnc-sublesson-link'));
      panels[0].open = true;
      return {
        panelCount:panels.length,
        linkCount:links.length,
        counts:panels.map(panel=>Number(panel.dataset.stage) && panel.querySelectorAll('.cnc-sublesson-link').length),
        titles:Array.from(document.querySelectorAll('#view-study .study-card[data-level] h4')).map(node=>node.textContent.trim()),
        firstHref:links[0]?.getAttribute('href') || '',
        firstPanelVisible:panels[0]?.getBoundingClientRect().height > 0
      };
    });
    report.learning = learning;
    await page.screenshot({ path:path.join(OUT,'learning-depth-mobile-390x844.png'), fullPage:true });
    fail(learning.panelCount === 12, `学习目录面板 ${learning.panelCount}/12`, report.failures);
    fail(learning.linkCount === 80, `学习小课链接 ${learning.linkCount}/80`, report.failures);
    fail(learning.counts[0] === 10 && learning.counts[1] === 10, `第1/2关数量 ${learning.counts[0]}/${learning.counts[1]}`, report.failures);
    fail(learning.counts.slice(2).every(count=>count===6), `第3—12关数量异常：${learning.counts.slice(2).join(',')}`, report.failures);
    fail(learning.firstPanelVisible && learning.firstHref.includes('learning-detail.html'), '首个小课入口不可见或链接错误', report.failures);

    await page.goto(new URL(learning.firstHref, BASE).href, { waitUntil:'networkidle' });
    await page.waitForFunction(()=>document.body.dataset.cncLearningDetail === 'ready');
    await page.waitForFunction(()=>{ const image=document.querySelector('#image'); return image && image.complete && image.naturalWidth > 0; });
    const detail = await page.evaluate(()=>({
      title:document.querySelector('#title')?.textContent.trim() || '',
      objective:document.querySelector('#objective')?.textContent.trim() || '',
      principle:document.querySelector('#principle')?.textContent.trim() || '',
      actions:document.querySelectorAll('#actions li').length,
      errors:document.querySelectorAll('#errors li').length,
      safety:document.querySelector('#safety')?.textContent.trim() || '',
      imageWidth:document.querySelector('#image')?.naturalWidth || 0,
      courseHref:document.querySelector('#course-link')?.getAttribute('href') || '',
      question:document.querySelector('#question')?.textContent.trim() || ''
    }));
    report.detail = detail;
    await page.screenshot({ path:path.join(OUT,'learning-detail-stage1-lesson1.png'), fullPage:true });
    fail(Boolean(detail.title && detail.objective && detail.principle && detail.question), '小课正文关键字段缺失', report.failures);
    fail(detail.actions === 3, `现场动作 ${detail.actions}/3`, report.failures);
    fail(detail.errors === 3, `高风险错误 ${detail.errors}/3`, report.failures);
    fail(detail.safety === SAFETY, `安全标注不一致：${detail.safety}`, report.failures);
    fail(detail.imageWidth > 0, '小课图片未解码', report.failures);
    fail(detail.courseHref.endsWith('course-safety-foundation.html'), `正式课程入口错误：${detail.courseHref}`, report.failures);
    fail(report.errors.length === 0, `控制台错误：${report.errors.join(' | ')}`, report.failures);
    fail(report.failedRequests.length === 0, `资源请求失败：${report.failedRequests.map(item=>item.url).join(' | ')}`, report.failures);

    report.passed = report.failures.length === 0;
    fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2));
    if (!report.passed) throw new Error(report.failures.join('\n'));
    console.log(JSON.stringify({ passed:true, panels:learning.panelCount, sublessons:learning.linkCount, detail:detail.title },null,2));
    await context.close();
  } catch (error) {
    report.passed = false; report.fatal = String(error && error.stack ? error.stack : error);
    fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2));
    console.error(error); process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
})();
