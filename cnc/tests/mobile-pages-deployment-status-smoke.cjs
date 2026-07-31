const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const resultsDir = path.resolve(root, 'cnc/test-results');
fs.mkdirSync(resultsDir, { recursive: true });

const publicRoot = (process.env.CNC_PAGES_URL || 'https://panxiangbin.github.io/yuhua').replace(/\/+$/, '');
const publicCncRoot = `${publicRoot}/cnc`;
const mainMarkerUrl = process.env.CNC_MAIN_BUILD_URL || 'https://raw.githubusercontent.com/panxiangbin/yuhua/main/cnc/build-info.json';
const expectedApp = 'cnc-training-platform';
const diagnostics = {
  checkedAt: new Date().toISOString(),
  publicRoot,
  mainMarkerUrl,
  attempts: [],
  consoleErrors: []
};

function assertMarker(marker, label) {
  if (!marker || marker.app !== expectedApp) throw new Error(`${label} app标记无效`);
  if (!/^\d{8}-[a-z0-9-]+$/i.test(String(marker.build || ''))) throw new Error(`${label}站点构建格式无效：${marker.build || '缺失'}`);
  if (!/^\d{8}-pwa\d+$/i.test(String(marker.pwaBuild || ''))) throw new Error(`${label} PWA构建格式无效：${marker.pwaBuild || '缺失'}`);
}

function cacheBusted(url) {
  const target = new URL(url);
  target.searchParams.set('verify', `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  return target.toString();
}

async function fetchMarker(url, label) {
  const requestUrl = cacheBusted(url);
  const response = await fetch(requestUrl, {
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache, no-store, max-age=0',
      Pragma: 'no-cache',
      'User-Agent': 'cnc-pages-deployment-status-smoke'
    },
    redirect: 'follow'
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${label} HTTP ${response.status}：${text.slice(0, 180)}`);
  let marker;
  try {
    marker = JSON.parse(text.replace(/^\uFEFF/, ''));
  } catch (error) {
    throw new Error(`${label}不是有效JSON：${error.message}`);
  }
  assertMarker(marker, label);
  return {
    marker,
    status: response.status,
    finalUrl: response.url,
    age: response.headers.get('age'),
    cacheControl: response.headers.get('cache-control'),
    etag: response.headers.get('etag')
  };
}

function samePublishedBuild(main, pages) {
  return main.marker.build === pages.marker.build && main.marker.pwaBuild === pages.marker.pwaBuild;
}

async function waitForPagesToMatchMain() {
  let lastMain;
  let lastPages;
  const attempts = Number(process.env.CNC_PAGES_VERIFY_ATTEMPTS || 18);
  const intervalMs = Number(process.env.CNC_PAGES_VERIFY_INTERVAL_MS || 10000);
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      lastMain = await fetchMarker(mainMarkerUrl, 'main构建标记');
      lastPages = await fetchMarker(`${publicCncRoot}/build-info.json`, 'Pages公网构建标记');
      const matched = samePublishedBuild(lastMain, lastPages);
      diagnostics.attempts.push({
        attempt,
        at: new Date().toISOString(),
        main: lastMain,
        pages: lastPages,
        matched
      });
      if (matched) return { main: lastMain, pages: lastPages };
    } catch (error) {
      diagnostics.attempts.push({ attempt, at: new Date().toISOString(), error: error.message });
    }
    if (attempt < attempts) await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  const mainBuild = lastMain ? `${lastMain.marker.build}/${lastMain.marker.pwaBuild}` : '未读取';
  const pagesBuild = lastPages ? `${lastPages.marker.build}/${lastPages.marker.pwaBuild}` : '未读取';
  throw new Error(`Pages公网构建未与main一致：main=${mainBuild}，Pages=${pagesBuild}`);
}

(async () => {
  let browser;
  try {
    const localMarker = JSON.parse(fs.readFileSync(path.join(root, 'cnc/build-info.json'), 'utf8').replace(/^\uFEFF/, ''));
    assertMarker(localMarker, '当前分支本地构建标记');
    diagnostics.localBranchMarker = localMarker;

    const published = await waitForPagesToMatchMain();
    diagnostics.mainMarker = published.main;
    diagnostics.publicMarker = published.pages;

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
    page.on('console', message => {
      if (message.type() === 'error') diagnostics.consoleErrors.push(message.text());
    });
    page.on('pageerror', error => diagnostics.consoleErrors.push(error.message));

    const pageUrl = cacheBusted(`${publicCncRoot}/pages-status.html`);
    const response = await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    if (!response || !response.ok()) throw new Error(`Pages状态页HTTP ${response ? response.status() : '无响应'}`);
    await page.waitForFunction(build => document.querySelector('#build')?.textContent === build, published.pages.marker.build, { timeout: 30000 });
    await page.waitForFunction(pwa => document.querySelector('#pwa')?.textContent === pwa, published.pages.marker.pwaBuild, { timeout: 30000 });
    await page.waitForFunction(() => document.querySelector('#status')?.textContent.includes('已读取公网构建标记'), null, { timeout: 30000 });

    const rendered = await page.evaluate(() => {
      const visible = element => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      };
      const targets = [...document.querySelectorAll('a,button')]
        .filter(visible)
        .map(element => {
          const rect = element.getBoundingClientRect();
          return { text: element.textContent.trim(), width: rect.width, height: rect.height };
        });
      return {
        url: location.href,
        build: document.querySelector('#build')?.textContent || '',
        pwa: document.querySelector('#pwa')?.textContent || '',
        source: document.querySelector('#source')?.textContent || '',
        stage: document.querySelector('#stage')?.textContent || '',
        status: document.querySelector('#status')?.textContent || '',
        targets
      };
    });

    if (rendered.build !== published.pages.marker.build) throw new Error('Pages状态页站点构建与公网标记不一致');
    if (rendered.pwa !== published.pages.marker.pwaBuild) throw new Error('Pages状态页PWA构建与公网标记不一致');
    if (!rendered.status.includes('已读取公网构建标记')) throw new Error('Pages状态页未确认公网构建标记');
    const tooSmall = rendered.targets.filter(target => target.width < 44 || target.height < 44);
    if (tooSmall.length) throw new Error(`Pages公网状态页触控目标不足44px：${JSON.stringify(tooSmall)}`);
    if (diagnostics.consoleErrors.length) throw new Error(`Pages公网状态页控制台错误：${diagnostics.consoleErrors.join(' | ')}`);

    diagnostics.rendered = rendered;
    diagnostics.verified = {
      publicReachable: true,
      mainMatchesPages: true,
      statusPageMatchesMarker: true
    };
    await page.screenshot({ path: path.join(resultsDir, 'pages-deployment-status-390x844.png'), fullPage: true });
    fs.writeFileSync(path.join(resultsDir, 'pages-deployment-status-result.json'), JSON.stringify(diagnostics, null, 2));
    console.log(`CNC Pages public deployment verified: ${rendered.build} / ${rendered.pwa}`);
  } catch (error) {
    diagnostics.error = String(error && error.stack || error);
    fs.writeFileSync(path.join(resultsDir, 'pages-deployment-status-result.json'), JSON.stringify(diagnostics, null, 2));
    fs.writeFileSync(path.join(resultsDir, 'pages-deployment-status-error.txt'), diagnostics.error);
    throw error;
  } finally {
    if (browser) await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
