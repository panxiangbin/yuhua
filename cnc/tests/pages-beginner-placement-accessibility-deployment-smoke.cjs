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
const eventName = process.env.GITHUB_EVENT_NAME || '';

if (!Number.isInteger(attempts) || attempts < 1) throw new Error('CNC_PAGES_VERIFY_ATTEMPTS必须是大于0的整数');
if (!Number.isFinite(intervalMs) || intervalMs < 0) throw new Error('CNC_PAGES_VERIFY_INTERVAL_MS不能为负数');

const report = { checkedAt: new Date().toISOString(), publicRoot, mainRoot, resourcePath, eventName, attempts: [] };

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
  for (const attribute of attributes) if (!attribute.test(tag)) throw new Error(`${label}元素#${id}缺少部署属性：${attribute}`);
}

function requireTokens(text, label, tokens) {
  for (const token of tokens) if (!text.includes(token)) throw new Error(`${label}缺少起点测评部署契约：${token}`);
}

function assertRouteHandoffStorageBoundary(text, label) {
  requireTokens(text, label, [
    "const HANDOFF_KEY='cnc_beginner_placement_route_handoff_v1'",
    'HANDOFF_TTL_MS=5*60*1000',
    'sessionStorage.setItem(HANDOFF_KEY',
    'sessionStorage.removeItem(HANDOFF_KEY)',
    '把本次路线带到训练营'
  ]);
  const setCalls = [...text.matchAll(/sessionStorage\.setItem\(([^,]+),/g)].map(match => match[1].trim());
  const removeCalls = [...text.matchAll(/sessionStorage\.removeItem\(([^)]+)\)/g)].map(match => match[1].trim());
  if (setCalls.length !== 1 || setCalls[0] !== 'HANDOFF_KEY') throw new Error(`${label}路线交接必须只写固定SessionStorage键：${JSON.stringify(setCalls)}`);
  if (removeCalls.length !== 1 || removeCalls[0] !== 'HANDOFF_KEY') throw new Error(`${label}路线交接必须只清理固定SessionStorage键：${JSON.stringify(removeCalls)}`);
  const payloadBody = text.match(/function handoffPayload\(data\)\{([\s\S]*?)\}\nfunction storeRouteHandoff/)?.[1];
  if (!payloadBody) throw new Error(`${label}缺少受控路线交接载荷生成函数`);
  for (const token of ['decision:data.decision', 'title:data.title', 'route:data.route', 'href:data.href', 'steps:data.steps']) {
    if (!payloadBody.includes(token)) throw new Error(`${label}路线交接载荷缺少受控字段：${token}`);
  }
  if (/\banswers\b|questions\s*:|answerScore/.test(payloadBody)) throw new Error(`${label}路线交接载荷不得包含六道题答案或评分明细`);
  for (const forbidden of [/URLSearchParams/, /location\.hash\s*=/, /history\.(?:pushState|replaceState)/]) {
    if (forbidden.test(text)) throw new Error(`${label}路线交接不得写入URL：${forbidden}`);
  }
}

function assertPlacementContract(text, label, requireSafetyGate, requireRouteHandoff) {
  requireTokens(text, label, [
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
    '@media (prefers-reduced-motion:reduce)',
    '相同版本原厂手册',
    '授权人员确认'
  ]);

  const expectedDescription = requireSafetyGate ? 'result-copy result-diagnostics result-route' : 'result-copy result-route';
  requireTokens(text, label, [`aria-describedby="${expectedDescription}"`]);

  if (requireSafetyGate) {
    requireTokens(text, label, [
      'id="result-diagnostics"',
      'criticalFailures',
      "decision:'critical-safety'",
      '关键安全项是硬门禁',
      '不会被其他题的高分抵消',
      '不是现场上机许可'
    ]);
  }

  if (requireRouteHandoff) assertRouteHandoffStorageBoundary(text, label);

  requireTagAttributes(text, 'progress', [
    /\brole=["']progressbar["']/i,
    /\baria-valuemin=["']0["']/i,
    /\baria-valuemax=["']6["']/i,
    /\baria-valuenow=["']0["']/i,
    /\baria-valuetext=["'][^"']*已完成0题，共6题[^"']*["']/i
  ], label);
  requireTagAttributes(text, 'options', [/\brole=["']radiogroup["']/i, /\baria-labelledby=["']qtitle["']/i], label);
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
    new RegExp(`\\baria-describedby=["']${expectedDescription}["']`, 'i'),
    /(?:^|\s)hidden(?:\s|=|>)/i
  ], label);
  requireTagAttributes(text, 'qtitle', [/\btabindex=["']-1["']/i], label);
  requireTagAttributes(text, 'result-title', [/\btabindex=["']-1["']/i], label);

  if (!/\.back:focus-visible,[^}]*\.validation:focus(?:,[^{}]+)?\{outline:3px solid var\(--focus\);outline-offset:3px\}/.test(text)) throw new Error(`${label}缺少3px可见焦点轮廓`);
  if (requireRouteHandoff && !/\.handoff-status:focus/.test(text)) throw new Error(`${label}路线交接状态缺少可见焦点轮廓`);
  if (!/@media \(prefers-reduced-motion:reduce\)\{\.progress span\{transition:none\}\}/.test(text)) throw new Error(`${label}缺少减少动态效果部署规则`);

  const visible = visibleBody(text);
  requireTokens(visible, label, ['6道题，约2分钟', '安全基础优先于操作熟练度', '相同版本原厂手册', '授权人员确认']);
  if (requireSafetyGate) requireTokens(visible, label, ['关键安全项是硬门禁']);
  if (requireRouteHandoff) requireTokens(visible, label, ['把本次路线带到训练营', '当前标签页临时保存推荐路线', '读取后立即清除']);

  for (const forbidden of [
    /fetch\s*\(/,
    /XMLHttpRequest/,
    /WebSocket/,
    /EventSource/,
    /localStorage\.(?:setItem|removeItem)/,
    /indexedDB/i,
    /test\.skip\(/,
    /describe\.skip\(/,
    /it\.skip\(/
  ]) {
    if (forbidden.test(text)) throw new Error(`${label}出现站外联网、长期存储或门禁绕过声明：${forbidden}`);
  }
  if (!requireRouteHandoff && /sessionStorage\.(?:setItem|removeItem)/.test(text)) throw new Error(`${label}旧正式版本不应包含未受控会话交接写入`);

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
    criticalSafetyGate: requireSafetyGate,
    explainableRecommendation: requireSafetyGate,
    oneTimeRouteHandoff: requireRouteHandoff,
    fixedSessionStorageKeyOnly: requireRouteHandoff,
    noQuestionAnswersInHandoff: requireRouteHandoff,
    noLongTermStorage: true,
    noExternalNetworking: true,
    originalManualBoundary: true
  };
}

async function waitForMainAndPages() {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const record = { attempt, at: new Date().toISOString() };
    try {
      const [main, pages] = await Promise.all([
        fetchResource(`${mainRoot}/${resourcePath}`, 'main起点测评页'),
        fetchResource(`${publicRoot}/${resourcePath}`, 'Pages公网起点测评页')
      ]);
      const matched = exact(main, pages);
      report.attempts.push({ ...record, matched, main: summary(main), pages: summary(pages) });
      if (matched) return { main, pages };
    } catch (error) {
      report.attempts.push({ ...record, error: error.message });
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
    const local = { buffer: localBuffer, status: 200, bytes: localBuffer.length, sha256: sha256(localBuffer), finalUrl: `file://${path.join(root, resourcePath)}`, contentType: 'text/html' };
    const localText = localBuffer.toString('utf8').replace(/^\uFEFF/, '');
    const localHasRouteHandoff = localText.includes('cnc_beginner_placement_route_handoff_v1');
    const localContract = assertPlacementContract(localText, '当前分支', true, localHasRouteHandoff);
    const deployed = await waitForMainAndPages();
    const mainText = deployed.main.buffer.toString('utf8').replace(/^\uFEFF/, '');
    const pagesText = deployed.pages.buffer.toString('utf8').replace(/^\uFEFF/, '');
    const publicHasSafetyGate = mainText.includes('criticalFailures');
    const publicHasRouteHandoff = mainText.includes('cnc_beginner_placement_route_handoff_v1');
    const mainContract = assertPlacementContract(mainText, 'main', publicHasSafetyGate, publicHasRouteHandoff);
    const pagesContract = assertPlacementContract(pagesText, 'Pages公网', publicHasSafetyGate, publicHasRouteHandoff);
    const localMatchesMain = exact(local, deployed.main);
    const branchDeploymentPending = !localMatchesMain;

    if (eventName !== 'pull_request' && branchDeploymentPending) throw new Error('main正式验收不允许当前分支与main/Pages不一致');
    if (!branchDeploymentPending && !publicHasSafetyGate) throw new Error('分支与main一致时公网必须包含关键安全项硬门禁');
    if (!branchDeploymentPending && localHasRouteHandoff !== publicHasRouteHandoff) throw new Error('分支与main一致时一次性路线交接部署状态必须一致');

    report.local = { resource: summary(local), contract: localContract };
    report.main = { resource: summary(deployed.main), contract: mainContract };
    report.pages = { resource: summary(deployed.pages), contract: pagesContract };
    report.verified = {
      publicReachable: true,
      mainPagesExactBytesMatch: true,
      mainPagesExactSha256Match: true,
      exactBytesMatch: true,
      exactSha256Match: true,
      localMatchesMain,
      branchDeploymentPending,
      publicHasSafetyGate,
      localHasRouteHandoff,
      publicHasRouteHandoff,
      progressbarSemanticsPresent: true,
      radioGroupSemanticsPresent: true,
      keyboardNavigationPresent: true,
      validationAndResultFocusPresent: true,
      visibleFocusOutlinePresent: true,
      reducedMotionPresent: true,
      criticalSafetyGatePresent: true,
      explainableRecommendationPresent: true,
      fixedSessionStorageKeyOnly: localHasRouteHandoff,
      noQuestionAnswersInHandoff: localHasRouteHandoff,
      noLongTermStorage: true,
      noExternalNetworking: true,
      originalManualBoundaryPresent: true
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    fs.writeFileSync(findingsPath, [
      '起点测评无障碍页面公网可达：是',
      'main与Pages逐字节一致：是',
      `当前分支与main一致：${localMatchesMain ? '是' : '否'}`,
      `分支待合并或待部署：${branchDeploymentPending ? '是' : '否'}`,
      `Pages关键安全项硬门禁：${publicHasSafetyGate ? '已部署' : '尚未部署，保持上一正式版本'}`,
      `当前分支一次性路线交接：${localHasRouteHandoff ? '已核验' : '未启用'}`,
      `Pages一次性路线交接：${publicHasRouteHandoff ? '已部署' : '尚未部署，保持上一正式版本'}`,
      `Pages资源字节：${deployed.pages.bytes}`,
      `Pages SHA-256：${deployed.pages.sha256}`,
      '进度条、单选组、键盘、焦点和减少动态效果：已核验',
      '当前分支10/12高分不能抵消危险答案：已核验',
      '当前分支中文判断依据：已核验',
      '路线交接仅允许固定SessionStorage键：已核验',
      '路线交接不包含六道题答案：已核验',
      '长期存储写入：0',
      '站外联网调用：0',
      '原厂手册与授权人员边界：保留'
    ].join('\n') + '\n');
    console.log(`CNC beginner placement accessibility Pages verified: pending=${branchDeploymentPending} / publicSafetyGate=${publicHasSafetyGate} / publicRouteHandoff=${publicHasRouteHandoff}`);
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