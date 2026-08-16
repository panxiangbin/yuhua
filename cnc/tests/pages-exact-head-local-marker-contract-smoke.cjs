const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const resultsDir = path.resolve(root, 'cnc/test-results');
fs.mkdirSync(resultsDir, { recursive: true });

const publicRoot = (process.env.CNC_PAGES_URL || 'https://panxiangbin.github.io/yuhua').replace(/\/+$/, '');
const mainMarkerUrl = process.env.CNC_MAIN_BUILD_URL || 'https://raw.githubusercontent.com/panxiangbin/yuhua/main/cnc/build-info.json';
const eventName = process.env.GITHUB_EVENT_NAME || '';
const ref = process.env.GITHUB_REF || '';
const mustMatchLocal = eventName === 'push' || (eventName === 'workflow_dispatch' && ref === 'refs/heads/main');
const localMarker = JSON.parse(fs.readFileSync(path.join(root, 'cnc/build-info.json'), 'utf8').replace(/^\uFEFF/, ''));
const diagnostics = {
  checkedAt: new Date().toISOString(),
  eventName,
  ref,
  mustMatchLocal,
  localMarker,
  attempts: []
};

function cacheBusted(url) {
  const target = new URL(url);
  target.searchParams.set('verify-exact-head', `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  return target.toString();
}

async function fetchMarker(url, label) {
  const response = await fetch(cacheBusted(url), {
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache, no-store, max-age=0',
      Pragma: 'no-cache',
      'User-Agent': 'cnc-pages-exact-head-local-marker-contract'
    },
    redirect: 'follow'
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${label} HTTP ${response.status}: ${text.slice(0, 180)}`);
  let marker;
  try {
    marker = JSON.parse(text.replace(/^\uFEFF/, ''));
  } catch (error) {
    throw new Error(`${label}不是有效JSON：${error.message}`);
  }
  assert.equal(marker?.app, 'cnc-training-platform', `${label} app标记必须可信`);
  return marker;
}

function exactMarkerMatch(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

(async () => {
  const attempts = Number(process.env.CNC_PAGES_VERIFY_ATTEMPTS || 18);
  const intervalMs = Number(process.env.CNC_PAGES_VERIFY_INTERVAL_MS || 10000);
  let lastMain = null;
  let lastPages = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      lastMain = await fetchMarker(mainMarkerUrl, 'main构建标记');
      lastPages = await fetchMarker(`${publicRoot}/cnc/build-info.json`, 'Pages公网构建标记');
      const mainMatchesPages = exactMarkerMatch(lastMain, lastPages);
      const localMatchesMain = exactMarkerMatch(localMarker, lastMain);
      const branchDeploymentPending = !localMatchesMain;
      const passed = mainMatchesPages && (!mustMatchLocal || localMatchesMain);
      diagnostics.attempts.push({
        attempt,
        at: new Date().toISOString(),
        mainMarker: lastMain,
        pagesMarker: lastPages,
        mainMatchesPages,
        localMatchesMain,
        branchDeploymentPending,
        passed
      });
      if (passed) {
        diagnostics.verified = {
          mainMatchesPages: true,
          localMatchesMain,
          branchDeploymentPending,
          pushExactHeadPublished: mustMatchLocal ? true : null
        };
        fs.writeFileSync(path.join(resultsDir, 'pages-exact-head-local-marker-contract.json'), JSON.stringify(diagnostics, null, 2));
        console.log(JSON.stringify(diagnostics.verified));
        return;
      }
    } catch (error) {
      diagnostics.attempts.push({ attempt, at: new Date().toISOString(), error: error.message });
    }
    if (attempt < attempts) await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  diagnostics.error = `Pages exact-head传播未收口：local=${localMarker.pwaBuild}/${localMarker.cacheRevision} main=${lastMain?.pwaBuild || '未读取'}/${lastMain?.cacheRevision || '未读取'} pages=${lastPages?.pwaBuild || '未读取'}/${lastPages?.cacheRevision || '未读取'}`;
  fs.writeFileSync(path.join(resultsDir, 'pages-exact-head-local-marker-contract.json'), JSON.stringify(diagnostics, null, 2));
  throw new Error(diagnostics.error);
})().catch(error => {
  console.error(error);
  process.exit(1);
});
