'use strict';

const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const root = path.resolve(__dirname, '../..');
const out = path.resolve(__dirname, '../test-results/mobile-learning-media');
fs.mkdirSync(out, { recursive: true });
const browserPath = process.env.CNC_BROWSER_PATH || process.env.CNC_EDGE_PATH || undefined;
const browserChannel = process.env.CNC_BROWSER_CHANNEL || 'chrome';
const server = spawn('python3', ['-m','http.server','4177','--bind','127.0.0.1'], { cwd: root, stdio:['ignore','pipe','pipe'] });
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function waitServer(){for(let i=0;i<40;i++){try{await new Promise((res,rej)=>http.get('http://127.0.0.1:4177/cnc/index.html',r=>{r.resume();r.statusCode===200?res():rej()}).on('error',rej));return}catch{await sleep(250)}}throw new Error('server not ready')}
function assert(v,msg){if(!v)throw new Error(msg)}
(async()=>{
  let browser;
  const errors=[];
  try{
    await waitServer();
    const launchOptions={headless:true};
    if(browserPath) launchOptions.executablePath=browserPath;
    else launchOptions.channel=browserChannel;
    browser=await chromium.launch(launchOptions);
    const browserVersion=browser.version();
    for(const [w,h] of [[360,800],[390,844]]){
      const page=await browser.newPage({viewport:{width:w,height:h}});
      page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
      page.on('pageerror',e=>errors.push(e.message));
      await page.goto('http://127.0.0.1:4177/cnc/index.html#study',{waitUntil:'networkidle'});
      await page.waitForSelector('#view-study.active .study-card');
      const layout=await page.evaluate(()=>({innerWidth,scrollWidth:document.documentElement.scrollWidth,cards:[...document.querySelectorAll('#view-study .study-card')].filter(e=>e.getClientRects().length).length,titleSize:parseFloat(getComputedStyle(document.querySelector('#view-study .study-card>h4')).fontSize),descSize:parseFloat(getComputedStyle(document.querySelector('#view-study .study-card>p')).fontSize)}));
      assert(layout.scrollWidth<=layout.innerWidth,`study horizontal overflow ${w}: ${JSON.stringify(layout)}`);
      assert(layout.cards===12,`expected 12 visible cards, got ${layout.cards}`);
      assert(layout.titleSize>=14,`course title too small: ${layout.titleSize}`);
      assert(layout.descSize>=11.5,`course description too small: ${layout.descSize}`);
      await page.screenshot({path:path.join(out,`study-${w}x${h}.png`),fullPage:true});
      await page.close();
    }
    const page=await browser.newPage({viewport:{width:390,height:844}});
    page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:4177/cnc/learning-detail.html?stage=10&lesson=10-1',{waitUntil:'networkidle'});
    await page.waitForFunction(()=>document.body.dataset.cncLearningMedia==='20260807-media1');
    const media=await page.evaluate(async()=>{
      const imgs=[document.querySelector('#image'),...document.querySelectorAll('#media-grid img')];
      await Promise.all(imgs.map(img=>img.decode().catch(()=>{})));
      const video=document.querySelector('#video-slot video');
      const support=video?video.canPlayType('video/mp4; codecs="avc1.42E01E"'):'';
      const before=video?video.currentTime:0;
      if(video){video.muted=true;await video.play();await new Promise(r=>setTimeout(r,700));video.pause()}
      return {images:imgs.length,decoded:imgs.filter(img=>img.complete&&img.naturalWidth>0).length,video:!!video,h264Support:support,videoWidth:video?video.videoWidth:0,duration:video?video.duration:0,advanced:video?video.currentTime>before:false,demo:!!document.querySelector('#demo-stage svg'),toggle:!!document.querySelector('#demo-toggle'),scrollWidth:document.documentElement.scrollWidth,innerWidth};
    });
    assert(media.images===3,`expected 3 images, got ${media.images}`);
    assert(media.decoded===3,`expected 3 decoded images, got ${media.decoded}`);
    assert(media.video, 'actual MP4 video element missing');
    assert(media.h264Support!=='',`browser ${browserVersion} reports no H.264 MP4 support`);
    assert(media.videoWidth===320,`unexpected video width ${media.videoWidth}`);
    assert(media.duration>=5.7&&media.duration<=6.3,`unexpected video duration ${media.duration}`);
    assert(media.advanced,'video did not advance after play');
    assert(media.demo&&media.toggle,'dynamic SVG demo controls missing');
    assert(media.scrollWidth<=media.innerWidth,'detail horizontal overflow');
    await page.screenshot({path:path.join(out,'detail-stage10-390x844.png'),fullPage:true});
    assert(errors.length===0,`browser errors: ${errors.join(' | ')}`);
    fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({passed:true,browserChannel:browserPath?'custom-path':browserChannel,browserVersion,media,errors},null,2));
    console.log(JSON.stringify({passed:true,browserChannel:browserPath?'custom-path':browserChannel,browserVersion,media}));
  } finally {
    if(browser)await browser.close().catch(()=>{});
    server.kill('SIGTERM');
  }
})().catch(e=>{fs.writeFileSync(path.join(out,'error.txt'),e.stack||String(e));console.error(e);process.exit(1)});