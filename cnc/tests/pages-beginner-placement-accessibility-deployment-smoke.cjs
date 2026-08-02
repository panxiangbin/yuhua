const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const outDir = path.join(root, 'cnc/test-results/beginner-placement-accessibility-pages');
fs.mkdirSync(outDir, { recursive: true });

const publicRoot = (process.env.CNC_PAGES_URL || 'https://panxiangbin.github.io/yuhua').replace(/\/+$/, '');
const mainRoot = (process.env.CNC_MAIN_RAW_ROOT || 'https://raw.githubusercontent.com/panxiangbin/yuhua/main').replace(/\/+$/, '');
const resourcePath = 'cnc/beginner-placement.html';
const attempts = Number(process.env.CNC_PAGES_VERIFY_ATTEMPTS || 18);
const intervalMs = Number(process.env.CNC_PAGES_VERIFY_INTERVAL_MS || 10000);

if (!Number.isInteger(attempts) || attempts < 1) throw new Error('CNC_PAGES_VERIFY_ATTEMPTS 必须是大于0的整数');
if (!Number.isFinite(intervalMs) || intervalMs < 0) throw new Error('CNC_PAGES_VERIFY_INTERVAL_MS 不能为负数');

const report = { checkedAt: new Date().toISOString(), publicRoot, mainRoot, resourcePath, attempts: [] };

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function cacheBusted(url) {
  const target = new URL(url);
  target.searchParams.set('verify-beginner-placement-a11y', `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  return target.toString();
}

async function fetchResource(url, label) {
  const response = await fetch(cacheBusted(url), {
    cache: 'no-store',
    redirect: 'follow',
    headers: {
      'Cache-Control': 'no-cache, no-store, max-age=0',
      Pragma: 'no-cache',
      'User-Agent': 'cnc-beginner-placement-accessibility-pages-smoke'
    }
  });
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!response.ok) throw new Error(`${label} HTTP ${response.status}：${buffer.toString('utf8', 0, 180)}`);
  return {
    buffer,
    status: response.status,
    bytes: buffer.length,
    sha256: sha256(buffer),
    finalUrl: response.url,
    contentType: response.headers.get('content-type'),
    cacheControl: response.headers.get('cache-control'),
    age: response.headers.get('age'),
    etag: response.headers.get('etag'),
    lastModified: response.headers.get('last-modified')
  };
}

function summary(value) {
  return {
    status: value.status,
    bytes: value.bytes,
    sha256: value.sha256,
    finalUrl: value.finalUrl,
    contentType: value.contentType,
    cacheControl: value.cacheControl,
    age: value.age,
    etag: value.etag,
    lastModified: value.lastModified
  };
}

function exact(left, right) {
  return left.bytes === right.bytes && left.sha256 === right.sha256;
}

function visibleBody(text) {
  const body = text.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1];
  if (!body) throw new Error('起点测评页缺少body');
  return body
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tagById(text, id, label) {
  const tag = text.match(new RegExp(`<[^>]+\\bid=["']${id}["'][^>]*>`, 'i'))?.[0];
  if (!tag) throw new Error(`${label}缺少元素：#${id}`);
  return tag;
}

function requireTagAttributes(text, id, attributes, label) {
  const tag = tagById(text, id, label);
  for (const attribute of attributes) {
    if (!attribute.test(tag)) throw new Error(`${label}元素#${id}缺少部署属性：${attribute}`);
  }
}

function assertPlacementContract(text, label) {
  const required = [
    '<title>CNC新手起点测评｜数控小潘</title>',
    'role="progressbar"',
    'aria-valuemin="0"',
    'aria-valuemax="6"',
    'role="radiogroup"',
    "b.setAttribute('role','radio')",
    "b.setAttribute('aria-checked'",
    "['ArrowDown','ArrowRight']",
    "event.key==='Home'",
    "event.key==='End'",
    "focusNode('validation')",
    "focusNode('result-title')",
    "render({focusQuestion:true})",
    'aria-labelledby="result-title"',
    'aria-describedby="result-copy result-route"',
    '@media (prefers-reduced-motion:reduce)',
    '相同版本原厂手册',
    '授权人员确认'
  ];
  for (const token of required) {
    if (!text.includes(token)) throw new Error(`${label}缺少起点测评无障碍或安全部署契约：${token}`);
  }

  requireTagAttributes(text, 'progress', [
    /\brole=["']progressbar["']/i,
    /\baria-valuemin=["']0["']/i,
    /\baria-valuemax=["']6["']/i,
    /\baria-valuenow=["']0["']/i,
    /\baria-valuetext=["'][^"']*已完成0题，共6题[^"']*["']/i
  ], label);
  requireTagAttributes(text, 'options', [
    /\brole=["']radiogroup["']/i,
    /\baria-labelledby=["']qtitle["']/i
  ], label);
  requireTagAttributes(text, 'validation', [
    /\brole=["']status["']/i,
    /\baria-live=["']polite["']/i,
    /\baria-atomic=["']true["']/i,
    /\btabindex=["']-1["']/i,
    /(?:^|\s)hidden(?:\s|=|>)/i
  ], label);
  requireTagAttributes(text, 'result', [
    /\brole=["']region["']/i,
    /\baria-live=["']polite["']/i,
    /\baria-atomic=["']true["']/i,
    /\baria-labelledby=["']result-title["']/i,
    /\baria-describedby=["']result-copy result-route["']/i,
    /(?:^|\s)hidden(?:\s|=|>)/i
  ], label);
  requireTagAttributes(text, 'qtitle', [/\btabindex=["']-1["']/i], label);
  requireTagAttributes(text, 'result-title', [/\btabindex=["']-1["']/i], label);

  if (!/\.back:focus-visible,[^}]*\.validation:focus\{outline:3px solid var\(--focus\);outline-offset:3px\}/.test(text)) {
    throw new Error(`${label}缺少3px可见焦点轮廓`);
  }
  if (!/@media \(prefers-reduced-motion:reduce\)\{\.progress span\{transition:none\}\}/.test(text)) {
    throw new Error(`${label}缺少减少动态效果部署规则`);
  }

  const visible = visibleBody(text);
  for (const token of ['6道题，约2分钟', '安全基础优先于操作熟练度', '相同版本原厂手册', '授权人员确认']) {
    if (!visible.includes(token)) throw new Error(`${label}缺少可见起点测评或安全边界：${token}`);
  }

  for (const forbidden of [
    /fetch\s*\(/,
    /XMLHttpRequest/,
    /WebSocket/,
    /EventSource/,
    /localStorage\.(?:setItem|removeItem)/,
    /sessionStorage\.(?:setItem|removeItem)/,
    /indexedDB/i,
    /test\.skip\(/,
    /describe\.skip\(/,
    /it\.skip\(/
  ]) {
    if (forbidden.test(text)) throw new Error(`${label}出现站外联网、长期存储或门禁绕过声明：${forbidden}`);
  }

  return {
    progressbarSemantics: true,
    radioGroupSemantics: true,
    keyboardNavigation: true,
    validationFocus: true,
    questionFocus: true,
    resultNamedRegion: true,
    resultFocus: true,
    visibleFocusOutline: true,
    reducedMotion: true,
    noLongTermStorage: true,
    noExternalNetworking: true,
    originalManualBoundary: true
  };
}

async function waitForMainAndPages() {
  let lastMain;
  let lastPages;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      [lastMain, lastPages] = await Promise.all([
        fetchResource(`${mainRoot}/${resourcePath}`, 'main起点测评页'),
        fetchResource(`${publicRoot}/${resourcePath}`, 'Pages公网起点测评页')
      ]);
      const matched = exact(lastMain, lastPages);
      report.attempts.push({ attempt, at: new Date().toISOString(), matched, main: summary(lastMain), pages: summary(lastPages) });
      if (matched) return { main: lastMain, pages: lastPages };
    } catch (error) {
      report.attempts.push({ attempt, at: new Date().toISOString(), error: error.message });
    }
    if (attempt < attempts) await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  throw new Error('起点测评无障碍页面尚未与main在Pages公网逐字节一致');
}

(async () => {
  const reportPath = path.join(outDir, 'report.json');
  const findingsPath = path.join(outDir, 'findings.txt');
  try {
    const localBuffer = fs.readFileSync(path.join(root, resourcePath));
    const local = {
      buffer: localBuffer,
      status: 200,
      bytes: localBuffer.length,
      sha256: sha256(localBuffer),
      finalUrl: `file://${path.join(root, resourcePath)}`,
      contentType: 'text/html'
    };
    const localContract = assertPlacementContract(localBuffer.toString('utf8').replace(/^\uFEFF/, ''), '当前分支');
    const deployed = await waitForMainAndPages();
    const mainContract = assertPlacementContract(deployed.main.buffer.toString('utf8').replace(/^\uFEFF/, ''), 'main');
    const pagesContract = assertPlacementContract(deployed.pages.buffer.toString('utf8').replace(/^\uFEFF/, ''), 'Pages公网');

    if (!exact(local, deployed.main)) throw new Error('当前分支起点测评页与main不一致，不能用旧页面冒充正式验收');

    report.local = { resource: summary(local), contract: localContract };
    report.main = { resource: summary(deployed.main), contract: mainContract };
    report.pages = { resource: summary(deployed.pages), contract: pagesContract };
    report.verified = {
      publicReachable: true,
      exactBytesMatch: true,
      exactSha256Match: true,
      localMatchesMain: true,
      progressbarSemanticsPresent: true,
      radioGroupSemanticsPresent: true,
      keyboardNavigationPresent: true,
      validationAndResultFocusPresent: true,
      visibleFocusOutlinePresent: true,
      reducedMotionPresent: true,
      noLongTermStorage: true,
      noExternalNetworking: true,
      originalManualBoundaryPresent: true
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    fs.writeFileSync(findingsPath, [
      '起点测评无障碍页面公网可达：是',
      '当前分支、main与Pages逐字节一致：是',
      `资源字节：${deployed.pages.bytes}`,
      `SHA-256：${deployed.pages.sha256}`,
      '进度条语义与中文进度：已部署',
      '单选组、方向键、Home与End：已部署',
      '未选择提示、换题与结果焦点：已部署',
      '结果命名与推荐理由关联：已部署',
      '3px可见焦点：已部署',
      '减少动态效果：已部署',
      '长期存储写入：0',
      '站外联网调用：0',
      '原厂手册与授权人员边界：保留'
    ].join('\n') + '\n');
    console.log(`CNC beginner placement accessibility Pages verified: ${deployed.pages.bytes} bytes / ${deployed.pages.sha256}`);
  } catch (error) {
    report.error = String(error && error.stack || error);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    fs.writeFileSync(findingsPath, report.error + '\n');
    throw error;
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});