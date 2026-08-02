const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const resultsDir = path.resolve(root, 'cnc/test-results/ai-teacher-explainability-pages');
fs.mkdirSync(resultsDir, { recursive: true });

const publicRoot = (process.env.CNC_PAGES_URL || 'https://panxiangbin.github.io/yuhua').replace(/\/+$/, '');
const mainRoot = (process.env.CNC_MAIN_RAW_ROOT || 'https://raw.githubusercontent.com/panxiangbin/yuhua/main').replace(/\/+$/, '');
const eventName = String(process.env.GITHUB_EVENT_NAME || 'local');
const attempts = Number(process.env.CNC_PAGES_VERIFY_ATTEMPTS || 18);
const intervalMs = Number(process.env.CNC_PAGES_VERIFY_INTERVAL_MS || 10000);
const expectedLocalExplainabilityVersion = '20260802-v2';
const previousExplainabilityVersion = '20260802-v1';
const expectedClassificationVersion = '20260802-v2';

if (!Number.isInteger(attempts) || attempts < 1) throw new Error('CNC_PAGES_VERIFY_ATTEMPTS 必须是大于 0 的整数');
if (!Number.isFinite(intervalMs) || intervalMs < 0) throw new Error('CNC_PAGES_VERIFY_INTERVAL_MS 不能为负数');

const diagnostics = {
  checkedAt: new Date().toISOString(),
  eventName,
  publicRoot,
  mainRoot,
  expectedLocalExplainabilityVersion,
  previousExplainabilityVersion,
  expectedClassificationVersion,
  attempts: []
};

function cacheBusted(url) {
  const target = new URL(url);
  target.searchParams.set('verify-ai-teacher-explainability', `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  return target.toString();
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function fetchBytes(url, label) {
  const response = await fetch(cacheBusted(url), {
    cache: 'no-store',
    redirect: 'follow',
    headers: {
      'Cache-Control': 'no-cache, no-store, max-age=0',
      Pragma: 'no-cache',
      'User-Agent': 'cnc-ai-teacher-explainability-pages-smoke'
    }
  });
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!response.ok) throw new Error(`${label} HTTP ${response.status}：${buffer.toString('utf8', 0, 180)}`);
  return {
    buffer,
    status: response.status,
    finalUrl: response.url,
    bytes: buffer.length,
    sha256: sha256(buffer),
    contentType: response.headers.get('content-type'),
    cacheControl: response.headers.get('cache-control'),
    age: response.headers.get('age'),
    etag: response.headers.get('etag'),
    lastModified: response.headers.get('last-modified')
  };
}

function summarize(payload) {
  return {
    status: payload.status,
    finalUrl: payload.finalUrl,
    bytes: payload.bytes,
    sha256: payload.sha256,
    contentType: payload.contentType,
    cacheControl: payload.cacheControl,
    age: payload.age,
    etag: payload.etag,
    lastModified: payload.lastModified
  };
}

function bodyText(text) {
  const body = text.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1];
  if (!body) throw new Error('判断说明页缺少 body');
  return body.replace(/<script\b[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function readExplainabilityVersion(text) {
  return text.match(/const EXPLAINABILITY_VERSION = '([^']+)'/)?.[1] || '';
}

function assertExplainabilityContract(text, label, options = {}) {
  const expectedVersion = options.expectedVersion || '';
  const requireHandoff = options.requireHandoff === true;
  const required = [
    '<title>AI老师判断说明｜数控小潘</title>',
    "const EXPECTED_CLASSIFICATION_VERSION = '20260802-v2'",
    'CNC_AI_TEACHER_EXPLAINABILITY',
    'teacherApi.classifyQuestion',
    "'exact-value':'固定上机值'",
    "'parameter-write':'参数写入'",
    "'bypass-safety':'安全绕过'",
    "'blind-reset':'盲目复位'",
    '强执行意图',
    '资料清单与逐条复核记录不能互相代替',
    '未逐条复核内容不可直接上机',
    'src="./ai-teacher.html"',
    'aria-live="polite"',
    'localOnly:true',
    'externalModel:false'
  ];
  if (requireHandoff) {
    required.push(
      "const HANDOFF_KEY = 'cnc_ai_teacher_explainability_handoff_v1'",
      'const HANDOFF_SCHEMA_VERSION = 1',
      'const HANDOFF_MAX_AGE_MS = 5 * 60 * 1000',
      'sessionStorage.getItem(HANDOFF_KEY)',
      'sessionStorage.removeItem(HANDOFF_KEY)',
      'const initialHandoff=consumeHandoff()',
      'id="handoff-note" role="status" hidden',
      'document.documentElement.dataset.handoffState=initialHandoff.state'
    );
  }
  for (const token of required) {
    if (!text.includes(token)) throw new Error(`${label}缺少判断说明部署契约：${token}`);
  }

  const visible = bodyText(text);
  for (const token of [
    '本页不提供固定上机值',
    '不把用户问题转换成可直接上机的操作步骤',
    '必须核对相同版本原厂手册',
    '未逐条复核内容不可直接上机'
  ]) {
    if (!visible.includes(token)) throw new Error(`${label}缺少可见判断边界：${token}`);
  }

  for (const forbidden of [
    /https?:\/\//i,
    /fetch\s*\(/,
    /XMLHttpRequest/,
    /WebSocket/,
    /EventSource/,
    /allowOperationalUse\s*:\s*true/,
    /localStorage\.(?:setItem|removeItem)\(HANDOFF_KEY/,
    /test\.skip\(/,
    /describe\.skip\(/,
    /it\.skip\(/
  ]) {
    if (forbidden.test(text)) throw new Error(`${label}出现不允许的联网、长期写入、直接上机或门禁绕过声明：${forbidden}`);
  }

  const explainabilityVersion = readExplainabilityVersion(text);
  const classificationVersion = text.match(/const EXPECTED_CLASSIFICATION_VERSION = '([^']+)'/)?.[1];
  if (!explainabilityVersion) throw new Error(`${label}缺少判断说明版本`);
  if (expectedVersion && explainabilityVersion !== expectedVersion) {
    throw new Error(`${label}判断说明版本不一致：${explainabilityVersion} / ${expectedVersion}`);
  }
  if (classificationVersion !== expectedClassificationVersion) {
    throw new Error(`${label}分类版本不一致：${classificationVersion || 'missing'} / ${expectedClassificationVersion}`);
  }

  return {
    explainabilityVersion,
    classificationVersion,
    riskLabels: ['exact-value', 'parameter-write', 'bypass-safety', 'blind-reset'],
    visibleFixedValueBoundary: true,
    originalManualBoundary: true,
    localOnly: true,
    externalModel: false,
    handoffConsumer: requireHandoff
  };
}

function exactMatch(left, right) {
  return left.bytes === right.bytes && left.sha256 === right.sha256;
}

async function waitForDeployment() {
  let lastMain;
  let lastPages;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      lastMain = await fetchBytes(`${mainRoot}/cnc/ai-teacher-explainability.html`, 'main 判断说明页');
      lastPages = await fetchBytes(`${publicRoot}/cnc/ai-teacher-explainability.html`, 'Pages公网判断说明页');
      const matched = exactMatch(lastMain, lastPages);
      diagnostics.attempts.push({
        attempt,
        at: new Date().toISOString(),
        matched,
        main: summarize(lastMain),
        pages: summarize(lastPages)
      });
      if (matched) return { main: lastMain, pages: lastPages };
    } catch (error) {
      diagnostics.attempts.push({ attempt, at: new Date().toISOString(), error: error.message });
    }
    if (attempt < attempts) await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  throw new Error('AI老师判断说明页尚未与 main 在 Pages 公网逐字节一致');
}

(async () => {
  const reportPath = path.join(resultsDir, 'report.json');
  const findingsPath = path.join(resultsDir, 'findings.txt');
  try {
    const localBuffer = fs.readFileSync(path.join(root, 'cnc/ai-teacher-explainability.html'));
    const local = {
      buffer: localBuffer,
      status: 200,
      finalUrl: `file://${path.join(root, 'cnc/ai-teacher-explainability.html')}`,
      bytes: localBuffer.length,
      sha256: sha256(localBuffer),
      contentType: 'text/html'
    };
    const localText = local.buffer.toString('utf8').replace(/^\uFEFF/, '');
    const localContract = assertExplainabilityContract(localText, '当前分支', {
      expectedVersion: expectedLocalExplainabilityVersion,
      requireHandoff: true
    });

    const deployed = await waitForDeployment();
    const mainText = deployed.main.buffer.toString('utf8').replace(/^\uFEFF/, '');
    const pagesText = deployed.pages.buffer.toString('utf8').replace(/^\uFEFF/, '');
    const deployedVersion = readExplainabilityVersion(mainText);
    const deployedVersionSupported = deployedVersion === previousExplainabilityVersion || deployedVersion === expectedLocalExplainabilityVersion;
    if (!deployedVersionSupported) throw new Error(`main 出现未受控判断说明版本：${deployedVersion || 'missing'}`);
    const deployedRequiresHandoff = deployedVersion === expectedLocalExplainabilityVersion;
    const mainContract = assertExplainabilityContract(mainText, 'main', {
      expectedVersion: deployedVersion,
      requireHandoff: deployedRequiresHandoff
    });
    const pagesContract = assertExplainabilityContract(pagesText, 'Pages公网', {
      expectedVersion: deployedVersion,
      requireHandoff: deployedRequiresHandoff
    });
    const localMatchesMain = exactMatch(local, deployed.main);
    const branchDeploymentPending = !localMatchesMain;

    if (eventName !== 'pull_request' && branchDeploymentPending) {
      throw new Error(`非 PR 验收不允许当前分支与 main 不一致：${eventName}`);
    }
    if (localMatchesMain && deployedVersion !== expectedLocalExplainabilityVersion) {
      throw new Error(`当前分支已与 main 一致，但部署版本不是目标版本：${deployedVersion}`);
    }

    diagnostics.local = { resource: summarize(local), contract: localContract };
    diagnostics.main = { resource: summarize(deployed.main), contract: mainContract };
    diagnostics.pages = { resource: summarize(deployed.pages), contract: pagesContract };
    diagnostics.verified = {
      publicReachable: true,
      exactBytesMatch: true,
      exactSha256Match: true,
      localMatchesMain,
      branchDeploymentPending,
      localExplainabilityVersionMatch: true,
      deployedExplainabilityVersion: deployedVersion,
      classificationVersionMatch: true,
      fourRiskLabelsPresent: true,
      visibleFixedValueBoundaryPresent: true,
      originalManualBoundaryPresent: true,
      sameOriginTeacherReusePresent: true,
      handoffConsumerInBranch: true,
      handoffConsumerPublic: pagesContract.handoffConsumer,
      noExternalNetworking: true,
      noLongTermHandoffStorage: true
    };

    fs.writeFileSync(reportPath, JSON.stringify(diagnostics, null, 2));
    fs.writeFileSync(findingsPath, [
      'AI老师判断说明页公网可达：是',
      'main 与 Pages 逐字节一致：是',
      `当前分支与 main 一致：${localMatchesMain ? '是' : '否（生产页面分支待合并）'}`,
      `当前分支判断说明版本：${localContract.explainabilityVersion}`,
      `公网判断说明版本：${pagesContract.explainabilityVersion}`,
      `分类版本：${pagesContract.classificationVersion}`,
      `一次性交接消费端已在公网：${pagesContract.handoffConsumer ? '是' : '否（分支待合并）'}`,
      '四类风险标签：完整',
      '可见固定值边界：通过',
      '原厂手册与逐条复核边界：通过',
      '同源正式分类器复用：通过',
      '站外联网调用：0',
      '长期交接存储写入：0'
    ].join('\n') + '\n');
    console.log(`CNC AI teacher explainability Pages verified: branch ${localContract.explainabilityVersion}, public ${pagesContract.explainabilityVersion}, pending=${branchDeploymentPending}`);
  } catch (error) {
    diagnostics.error = String(error && error.stack || error);
    fs.writeFileSync(reportPath, JSON.stringify(diagnostics, null, 2));
    fs.writeFileSync(findingsPath, diagnostics.error + '\n');
    throw error;
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
