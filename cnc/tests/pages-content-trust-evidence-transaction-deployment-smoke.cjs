const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const resultsDir = path.resolve(root, 'cnc/test-results');
fs.mkdirSync(resultsDir, { recursive: true });

const publicRoot = (process.env.CNC_PAGES_URL || 'https://panxiangbin.github.io/yuhua').replace(/\/+$/, '');
const mainRoot = (process.env.CNC_MAIN_RAW_ROOT || 'https://raw.githubusercontent.com/panxiangbin/yuhua/main').replace(/\/+$/, '');
const requireLocalMainMatch = process.env.GITHUB_EVENT_NAME === 'push' && process.env.GITHUB_REF_NAME === 'main';
const resources = [
  {
    path: 'cnc/content-trust-evidence-transaction.schema.json',
    kind: 'schema'
  },
  {
    path: 'cnc/content-trust-evidence-transaction-template.json',
    kind: 'template'
  }
];
const resultPath = path.join(resultsDir, 'pages-deployment-status-evidence-transaction.json');
const errorPath = path.join(resultsDir, 'pages-deployment-status-evidence-transaction-error.txt');
const diagnostics = {
  checkedAt: new Date().toISOString(),
  requireLocalMainMatch,
  resources: []
};

const ROOT_FIELDS = [
  'schemaVersion',
  'transactionId',
  'expectedBaseLedgerSha256',
  'nextLedgerSha256',
  'committedAt',
  'actor',
  'changeReason',
  'operationSummary'
];
const SUMMARY_FIELDS = [
  'datasetsChanged',
  'sourceRecordsAdded',
  'itemReviewRecordsAdded',
  'reviewedItemsAdded',
  'stateTransitions'
];

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function sortedKeys(value) {
  return Object.keys(value || {}).sort();
}

function assertExactKeys(value, expected, label) {
  const actual = sortedKeys(value);
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    throw new Error(`${label}字段不受控：期望 ${wanted.join(', ')}，实际 ${actual.join(', ')}`);
  }
}

function parseJson(buffer, label) {
  try {
    return JSON.parse(buffer.toString('utf8').replace(/^\uFEFF/, ''));
  } catch (error) {
    throw new Error(`${label}不是有效 JSON：${error.message}`);
  }
}

function assertSchemaContract(schema, label) {
  if (schema.$schema !== 'https://json-schema.org/draft/2020-12/schema') {
    throw new Error(`${label}JSON Schema 草案不一致`);
  }
  if (schema.$id !== 'cnc/content-trust-evidence-transaction.schema.json') {
    throw new Error(`${label}$id 不一致`);
  }
  if (schema.type !== 'object' || schema.additionalProperties !== false) {
    throw new Error(`${label}必须禁止未受控根字段`);
  }
  if (!String(schema.description || '').includes('不代表任何 CNC 技术内容已经核实')) {
    throw new Error(`${label}缺少技术内容未核实边界`);
  }
  assertExactKeys(schema.properties, ROOT_FIELDS, `${label}根 properties`);
  if (JSON.stringify([...schema.required].sort()) !== JSON.stringify([...ROOT_FIELDS].sort())) {
    throw new Error(`${label}根 required 与受控字段不一致`);
  }
  if (schema.properties.schemaVersion.const !== 1) throw new Error(`${label}schemaVersion 必须固定为 1`);
  if (schema.properties.expectedBaseLedgerSha256.pattern !== '^[a-f0-9]{64}$') {
    throw new Error(`${label}基线 SHA-256 格式不受控`);
  }
  if (schema.properties.nextLedgerSha256.pattern !== '^[a-f0-9]{64}$') {
    throw new Error(`${label}目标 SHA-256 格式不受控`);
  }
  if (schema.properties.committedAt.format !== 'date-time') throw new Error(`${label}提交时间必须为 date-time`);
  if (schema.properties.actor.minLength < 2) throw new Error(`${label}执行人最小长度过低`);
  if (schema.properties.changeReason.minLength < 12) throw new Error(`${label}变更原因最小长度过低`);

  const summary = schema.properties.operationSummary;
  if (!summary || summary.type !== 'object' || summary.additionalProperties !== false) {
    throw new Error(`${label}必须禁止未受控汇总字段`);
  }
  assertExactKeys(summary.properties, SUMMARY_FIELDS, `${label}汇总 properties`);
  if (JSON.stringify([...summary.required].sort()) !== JSON.stringify([...SUMMARY_FIELDS].sort())) {
    throw new Error(`${label}汇总 required 与受控字段不一致`);
  }
  for (const field of SUMMARY_FIELDS) {
    const definition = summary.properties[field];
    if (definition.type !== 'integer' || definition.minimum !== 0) {
      throw new Error(`${label}汇总字段 ${field} 必须为非负整数`);
    }
  }
  return {
    rootFields: ROOT_FIELDS.length,
    summaryFields: SUMMARY_FIELDS.length,
    additionalPropertiesBlocked: true,
    unverifiedTechnicalBoundaryPresent: true
  };
}

function assertTemplateContract(template, label) {
  assertExactKeys(template, ROOT_FIELDS, `${label}根节点`);
  assertExactKeys(template.operationSummary, SUMMARY_FIELDS, `${label}汇总节点`);
  if (template.schemaVersion !== 1) throw new Error(`${label}schemaVersion 必须为 1`);
  for (const field of [
    'transactionId',
    'expectedBaseLedgerSha256',
    'nextLedgerSha256',
    'committedAt',
    'actor',
    'changeReason'
  ]) {
    if (template[field] !== '') throw new Error(`${label}${field} 必须保持空白，禁止伪造事务元数据`);
  }
  for (const field of SUMMARY_FIELDS) {
    if (template.operationSummary[field] !== 0) throw new Error(`${label}${field} 空白基线必须为 0`);
  }
  if ('allowOperationalUse' in template || 'reviewComplete' in template) {
    throw new Error(`${label}不得携带技术内容核实或直接上机声明`);
  }
  return {
    rootFields: ROOT_FIELDS.length,
    summaryFields: SUMMARY_FIELDS.length,
    fakeDigestAbsent: true,
    directlySubmittable: false
  };
}

function assertContract(buffer, kind, label) {
  const json = parseJson(buffer, label);
  return kind === 'schema' ? assertSchemaContract(json, label) : assertTemplateContract(json, label);
}

function cacheBusted(url, resourcePath) {
  const target = new URL(url);
  target.searchParams.set('verify-evidence-transaction', `${path.basename(resourcePath)}-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  return target.toString();
}

async function fetchBytes(url, label, resourcePath) {
  const response = await fetch(cacheBusted(url, resourcePath), {
    cache: 'no-store',
    redirect: 'follow',
    headers: {
      'Cache-Control': 'no-cache, no-store, max-age=0',
      Pragma: 'no-cache',
      'User-Agent': 'cnc-evidence-transaction-pages-smoke'
    }
  });
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!response.ok) {
    throw new Error(`${label} HTTP ${response.status}：${buffer.toString('utf8', 0, 180)}`);
  }
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

async function waitForMainAndPages(resource, resourceDiagnostics) {
  const attempts = Number(process.env.CNC_PAGES_VERIFY_ATTEMPTS || 18);
  const intervalMs = Number(process.env.CNC_PAGES_VERIFY_INTERVAL_MS || 10000);
  const mainUrl = `${mainRoot}/${resource.path}`;
  const pagesUrl = `${publicRoot}/${resource.path}`;
  let lastMain;
  let lastPages;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      lastMain = await fetchBytes(mainUrl, 'main资源', resource.path);
      lastPages = await fetchBytes(pagesUrl, 'Pages公网资源', resource.path);
      const matched = lastMain.sha256 === lastPages.sha256 && lastMain.bytes === lastPages.bytes;
      resourceDiagnostics.attempts.push({
        attempt,
        at: new Date().toISOString(),
        main: { ...lastMain, buffer: undefined },
        pages: { ...lastPages, buffer: undefined },
        matched
      });
      if (matched) return { main: lastMain, pages: lastPages };
    } catch (error) {
      resourceDiagnostics.attempts.push({ attempt, at: new Date().toISOString(), error: error.message });
    }
    if (attempt < attempts) await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  const mainSummary = lastMain ? `${lastMain.sha256}/${lastMain.bytes}` : '未读取';
  const pagesSummary = lastPages ? `${lastPages.sha256}/${lastPages.bytes}` : '未读取';
  throw new Error(`${resource.path} 未与 Pages 公网逐字节一致：main=${mainSummary}，Pages=${pagesSummary}`);
}

(async () => {
  try {
    for (const resource of resources) {
      const resourceDiagnostics = {
        resourcePath: resource.path,
        kind: resource.kind,
        attempts: []
      };
      diagnostics.resources.push(resourceDiagnostics);

      const localBuffer = fs.readFileSync(path.join(root, resource.path));
      const localContract = assertContract(localBuffer, resource.kind, '当前分支本地资源');
      resourceDiagnostics.local = {
        bytes: localBuffer.length,
        sha256: sha256(localBuffer),
        contract: localContract
      };

      const published = await waitForMainAndPages(resource, resourceDiagnostics);
      const mainContract = assertContract(published.main.buffer, resource.kind, 'main资源');
      const pagesContract = assertContract(published.pages.buffer, resource.kind, 'Pages公网资源');
      const localMatchesMain = resourceDiagnostics.local.sha256 === published.main.sha256
        && resourceDiagnostics.local.bytes === published.main.bytes;
      if (requireLocalMainMatch && !localMatchesMain) {
        throw new Error(`${resource.path} 在 main push 复验中未与远程 main 一致`);
      }

      resourceDiagnostics.main = { ...published.main, buffer: undefined, contract: mainContract };
      resourceDiagnostics.pages = { ...published.pages, buffer: undefined, contract: pagesContract };
      resourceDiagnostics.verified = {
        publicReachable: true,
        exactBytesMatch: true,
        exactSha256Match: true,
        localMatchesMain,
        semanticContractMatch: JSON.stringify(mainContract) === JSON.stringify(pagesContract)
      };
      if (!resourceDiagnostics.verified.semanticContractMatch) {
        throw new Error(`${resource.path} main 与 Pages 语义契约结果不一致`);
      }
      console.log(`CNC Pages evidence transaction resource verified: ${resource.path} ${published.pages.sha256}`);
    }

    diagnostics.verified = {
      resourceCount: resources.length,
      publicReachable: true,
      exactBytesMatch: true,
      exactSha256Match: true,
      schemaTemplateFieldAlignment: true,
      noFakeTransactionMetadata: true,
      noUnverifiedContentClaim: true
    };
    fs.writeFileSync(resultPath, JSON.stringify(diagnostics, null, 2));
  } catch (error) {
    diagnostics.error = String(error && error.stack || error);
    fs.writeFileSync(resultPath, JSON.stringify(diagnostics, null, 2));
    fs.writeFileSync(errorPath, diagnostics.error);
    throw error;
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
