const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const outDir = path.join(root, 'cnc/test-results/ai-teacher-handoff-accessibility-pages');
fs.mkdirSync(outDir, { recursive: true });

const publicRoot = (process.env.CNC_PAGES_URL || 'https://panxiangbin.github.io/yuhua').replace(/\/+$/, '');
const mainRoot = (process.env.CNC_MAIN_RAW_ROOT || 'https://raw.githubusercontent.com/panxiangbin/yuhua/main').replace(/\/+$/, '');
const resourcePath = 'cnc/ai-teacher-explainability.html';
const attempts = Number(process.env.CNC_PAGES_VERIFY_ATTEMPTS || 18);
const intervalMs = Number(process.env.CNC_PAGES_VERIFY_INTERVAL_MS || 10000);

if (!Number.isInteger(attempts) || attempts < 1) throw new Error('CNC_PAGES_VERIFY_ATTEMPTS 必须是大于 0 的整数');
if (!Number.isFinite(intervalMs) || intervalMs < 0) throw new Error('CNC_PAGES_VERIFY_INTERVAL_MS 不能为负数');

const report = {
  checkedAt: new Date().toISOString(),
  publicRoot,
  mainRoot,
  resourcePath,
  attempts: []
};

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function cacheBusted(url) {
  const target = new URL(url);
  target.searchParams.set('verify-handoff-accessibility', `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  return target.toString();
}

async function fetchResource(url, label) {
  const response = await fetch(cacheBusted(url), {
    cache: 'no-store',
    redirect: 'follow',
    headers: {
      'Cache-Control': 'no-cache, no-store, max-age=0',
      Pragma: 'no-cache',
      'User-Agent': 'cnc-ai-teacher-handoff-accessibility-pages-smoke'
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
  if (!body) throw new Error('判断说明页缺少 body');
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
    if (!attribute.test(tag)) throw new Error(`${label}元素 #${id} 缺少无障碍部署属性：${attribute}`);
  }
}

function assertAccessibilityContract(text, label) {
  const required = [
    '<title>AI老师判断说明｜数控小潘</title>',
    "const EXPLAINABILITY_VERSION = '20260802-v2'",
    "const EXPECTED_CLASSIFICATION_VERSION = '20260802-v2'",
    "const HANDOFF_KEY = 'cnc_ai_teacher_explainability_handoff_v1'",
    'class="engine" id="teacher-engine"',
    'teacherApi.classifyQuestion',
    'function focusNode(id)',
    "focusNode('result-title')",
    "focusNode('handoff-note')",
    "clearConsumedHandoffView({focusStatus:false})",
    "clearConsumedHandoffView({focusStatus:true})",
    "document.documentElement.dataset.handoffState='consumed-cleared'",
    'sessionStorage.getItem(HANDOFF_KEY)',
    'sessionStorage.removeItem(HANDOFF_KEY)',
    'localOnly:true',
    'externalModel:false',
    '本页不提供固定上机值',
    '必须核对相同版本原厂手册',
    '未逐条复核内容不可直接上机'
  ];
  for (const token of required) {
    if (!text.includes(token)) throw new Error(`${label}缺少无障碍或安全部署契约：${token}`);
  }

  requireTagAttributes(text, 'handoff-note', [
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
    /\baria-describedby=["']result-reason["']/i
  ], label);
  requireTagAttributes(text, 'result-title', [/\btabindex=["']-1["']/i], label);
  requireTagAttributes(text, 'question', [/\baria-describedby=["']question-help["']/i], label);

  if (!/\.handoff-note:focus,#result-title:focus\{[^}]*outline:3px solid [^;}]+;[^}]*outline-offset:4px/i.test(text)) {
    throw new Error(`${label}缺少清晰可见的程序化焦点轮廓`);
  }
  if (!/window\.addEventListener\(['"]pagehide['"],\(\)=>clearConsumedHandoffView\(\{focusStatus:false\}\)\)/.test(text)) {
    throw new Error(`${label}pagehide 必须只清理，不得抢焦点`);
  }
  if (!/window\.addEventListener\(['"]pageshow['"],event=>\{if\(event\.persisted\)clearConsumedHandoffView\(\{focusStatus:true\}\)\}\)/.test(text)) {
    throw new Error(`${label}真实 BFCache 返回必须清理并聚焦恢复状态`);
  }

  const visible = visibleBody(text);
  for (const token of [
    '不调用外部模型',
    '不提供固定上机值',
    '必须核对相同版本原厂手册',
    '未逐条复核内容不可直接上机'
  ]) {
    if (!visible.includes(token)) throw new Error(`${label}缺少可见边界：${token}`);
  }

  for (const forbidden of [
    /fetch\s*\(/,
    /XMLHttpRequest/,
    /WebSocket/,
    /EventSource/,
    /localStorage\.(?:setItem|removeItem)\(HANDOFF_KEY/,
    /indexedDB/i,
    /allowOperationalUse\s*:\s*true/,
    /test\.skip\(/,
    /describe\.skip\(/,
    /it\.skip\(/
  ]) {
    if (forbidden.test(text)) throw new Error(`${label}出现站外联网、长期交接存储、直接上机或门禁绕过声明：${forbidden}`);
  }

  return {
    explainabilityVersion: '20260802-v2',
    classificationVersion: '20260802-v2',
    statusLiveRegion: true,
    resultNamedRegion: true,
    resultReasonAssociation: true,
    programmaticFocusTargets: ['result-title', 'handoff-note'],
    visibleFocusOutline: true,
    noFocusStealOnPagehide: true,
    bfcacheRecoveryFocus: true,
    sessionStorageOnly: true,
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
        fetchResource(`${mainRoot}/${resourcePath}`, 'main 判断说明页'),
        fetchResource(`${publicRoot}/${resourcePath}`, 'Pages 公网判断说明页')
      ]);
      const matched = exact(lastMain, lastPages);
      report.attempts.push({
        attempt,
        at: new Date().toISOString(),
        matched,
        main: summary(lastMain),
        pages: summary(lastPages)
      });
      if (matched) return { main: lastMain, pages: lastPages };
    } catch (error) {
      report.attempts.push({ attempt, at: new Date().toISOString(), error: error.message });
    }
    if (attempt < attempts) await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  throw new Error('AI老师交接无障碍页面尚未与 main 在 Pages 公网逐字节一致');
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
    const localContract = assertAccessibilityContract(localBuffer.toString('utf8').replace(/^\uFEFF/, ''), '当前分支');
    const deployed = await waitForMainAndPages();
    const mainContract = assertAccessibilityContract(deployed.main.buffer.toString('utf8').replace(/^\uFEFF/, ''), 'main');
    const pagesContract = assertAccessibilityContract(deployed.pages.buffer.toString('utf8').replace(/^\uFEFF/, ''), 'Pages 公网');

    if (!exact(local, deployed.main)) {
      throw new Error('当前分支判断说明页与 main 不一致，不能用旧页面冒充无障碍正式验收');
    }

    report.local = { resource: summary(local), contract: localContract };
    report.main = { resource: summary(deployed.main), contract: mainContract };
    report.pages = { resource: summary(deployed.pages), contract: pagesContract };
    report.verified = {
      publicReachable: true,
      exactBytesMatch: true,
      exactSha256Match: true,
      localMatchesMain: true,
      statusLiveRegionPresent: true,
      resultNamedRegionPresent: true,
      resultReasonAssociationPresent: true,
      focusTargetsPresent: true,
      visibleFocusOutlinePresent: true,
      noFocusStealOnPagehide: true,
      bfcacheRecoveryFocusPresent: true,
      sessionStorageOnly: true,
      noExternalNetworking: true,
      originalManualBoundaryPresent: true
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    fs.writeFileSync(findingsPath, [
      'AI老师交接无障碍页面公网可达：是',
      '当前分支、main 与 Pages 逐字节一致：是',
      `资源字节：${deployed.pages.bytes}`,
      `SHA-256：${deployed.pages.sha256}`,
      '恢复状态 role=status 与 polite 播报：已部署',
      '判断结果命名区域与理由关联：已部署',
      '判断标题与恢复状态程序化焦点：已部署',
      '3px 可见焦点轮廓：已部署',
      'pagehide 只清理不抢焦点：已部署',
      '真实 BFCache 返回恢复焦点：已部署',
      'SessionStorage 一次性交接：保持',
      '站外联网调用：0',
      '原厂手册与逐条复核边界：保留'
    ].join('\n') + '\n');
    console.log(`CNC AI teacher handoff accessibility Pages verified: ${deployed.pages.bytes} bytes / ${deployed.pages.sha256}`);
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
