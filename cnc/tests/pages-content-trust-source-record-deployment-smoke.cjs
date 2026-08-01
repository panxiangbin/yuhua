'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const resultsDir = path.join(root, 'cnc/test-results');
fs.mkdirSync(resultsDir, { recursive: true });

const REQUIRED_NOTICE = '教学参考，需按机床说明书、现场工艺和空运行验证';
const EXPECTED_DATASETS = [
  'cnc/alarm-data.js',
  'cnc/gm-code-complete.js',
  'cnc/diagnosis-data.js',
  'cnc/weak-category-data.js',
  'cnc/learning-content-data.js'
];
const EXPECTED_SOURCE_TYPES = [
  'oem_manual',
  'machine_builder_manual',
  'official_standard',
  'supplier_technical_data',
  'controlled_site_record'
];
const EXPECTED_DECISIONS = [
  'supported_for_stated_scope',
  'conflicts_with_source',
  'insufficient_evidence',
  'not_applicable'
];
const EXPECTED_REQUIRED_FIELDS = [
  'datasetPath',
  'itemKey',
  'sourceType',
  'publisher',
  'documentTitle',
  'documentCodeOrRevision',
  'applicableSystemOrMachine',
  'pageOrSection',
  'evidenceLocation',
  'reviewedAt',
  'reviewer',
  'verificationNotes',
  'applicabilityNotes',
  'decision',
  'onMachineValidationRequired'
];
const RESOURCES = [
  {
    id: 'source-record-schema',
    path: 'cnc/content-trust-source-record.schema.json',
    assertContract: assertSchemaContract
  },
  {
    id: 'source-record-template',
    path: 'cnc/content-trust-source-record-template.json',
    assertContract: assertTemplateContract
  }
];

const publicRoot = (process.env.CNC_PAGES_URL || 'https://panxiangbin.github.io/yuhua').replace(/\/+$/, '');
const mainRoot = (process.env.CNC_MAIN_RAW_ROOT || 'https://raw.githubusercontent.com/panxiangbin/yuhua/main').replace(/\/+$/, '');
const resultPath = path.join(resultsDir, 'pages-deployment-status-source-record.json');
const errorPath = path.join(resultsDir, 'pages-deployment-status-source-record-error.txt');
const diagnostics = {
  checkedAt: new Date().toISOString(),
  requiredNotice: REQUIRED_NOTICE,
  resources: []
};

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function cacheBusted(url) {
  const target = new URL(url);
  target.searchParams.set('verify-source-record', `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  return target.toString();
}

async function fetchBytes(url, label) {
  const response = await fetch(cacheBusted(url), {
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache, no-store, max-age=0',
      Pragma: 'no-cache',
      'User-Agent': 'cnc-content-trust-source-record-pages-smoke'
    },
    redirect: 'follow'
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

function parseJson(text, label) {
  try {
    return JSON.parse(text.replace(/^\uFEFF/, ''));
  } catch (error) {
    throw new Error(`${label}不是有效 JSON：${error.message}`);
  }
}

function sameMembers(actual, expected) {
  return Array.isArray(actual)
    && actual.length === expected.length
    && expected.every(value => actual.includes(value));
}

function assertSchemaContract(text, label, options = {}) {
  const schema = parseJson(text, label);
  const record = schema.$defs && schema.$defs.sourceRecord;
  const instructions = schema.properties && schema.properties.instructions;
  if (schema.$schema !== 'https://json-schema.org/draft/2020-12/schema') {
    throw new Error(`${label}JSON Schema 版本不是 draft 2020-12`);
  }
  if (schema.type !== 'object' || schema.additionalProperties !== false) {
    throw new Error(`${label}根对象没有关闭未受控字段`);
  }
  if (schema.properties?.schemaVersion?.const !== 1) {
    throw new Error(`${label}schemaVersion 不是 1`);
  }
  if (schema.properties?.requiredNotice?.const !== REQUIRED_NOTICE) {
    throw new Error(`${label}统一教学参考提示不一致`);
  }
  if (options.requireInstructions === true
    && (instructions?.type !== 'array' || instructions?.minItems < 5 || instructions?.items?.minLength < 4)) {
    throw new Error(`${label}没有受控定义模板填写说明`);
  }
  if (schema.properties?.records?.items?.$ref !== '#/$defs/sourceRecord') {
    throw new Error(`${label}records 没有引用受控来源记录定义`);
  }
  if (!record || record.type !== 'object' || record.additionalProperties !== false) {
    throw new Error(`${label}来源记录对象没有关闭未受控字段`);
  }
  if (!sameMembers(record.required, EXPECTED_REQUIRED_FIELDS)) {
    throw new Error(`${label}来源记录必填字段不完整或被擅自改变`);
  }
  if (!sameMembers(record.properties?.datasetPath?.enum, EXPECTED_DATASETS)) {
    throw new Error(`${label}高风险数据集枚举不一致`);
  }
  if (!sameMembers(record.properties?.sourceType?.enum, EXPECTED_SOURCE_TYPES)) {
    throw new Error(`${label}来源类型枚举不一致`);
  }
  if (!sameMembers(record.properties?.decision?.enum, EXPECTED_DECISIONS)) {
    throw new Error(`${label}复核结论枚举不一致`);
  }
  if (record.properties?.onMachineValidationRequired?.const !== true) {
    throw new Error(`${label}没有强制保留上机验证要求`);
  }
  if (record.properties?.fileSha256?.pattern !== '^[a-f0-9]{64}$') {
    throw new Error(`${label}SHA-256 格式约束缺失`);
  }
  return {
    schemaVersion: 1,
    datasetCount: EXPECTED_DATASETS.length,
    sourceTypeCount: EXPECTED_SOURCE_TYPES.length,
    decisionCount: EXPECTED_DECISIONS.length,
    requiredFieldCount: EXPECTED_REQUIRED_FIELDS.length,
    instructionsSchemaPresent: instructions?.type === 'array' && instructions?.minItems >= 5,
    additionalPropertiesBlocked: true,
    onMachineValidationRequired: true,
    requiredNoticePresent: true
  };
}

function assertTemplateContract(text, label) {
  const template = parseJson(text, label);
  const allowedKeys = ['schemaVersion', 'requiredNotice', 'instructions', 'records'];
  const keys = Object.keys(template);
  if (keys.length !== allowedKeys.length || !allowedKeys.every(key => keys.includes(key))) {
    throw new Error(`${label}包含未受控顶层字段`);
  }
  if (template.schemaVersion !== 1) throw new Error(`${label}schemaVersion 不是 1`);
  if (template.requiredNotice !== REQUIRED_NOTICE) throw new Error(`${label}统一教学参考提示不一致`);
  if (!Array.isArray(template.instructions) || template.instructions.length < 5) {
    throw new Error(`${label}没有至少 5 条受控填写说明`);
  }
  for (const [index, instruction] of template.instructions.entries()) {
    if (typeof instruction !== 'string' || instruction.trim().length < 4) {
      throw new Error(`${label}instructions[${index}] 不是有效填写说明`);
    }
  }
  if (!Array.isArray(template.records)) throw new Error(`${label}records 不是数组`);
  if (template.records.length !== 0) {
    throw new Error(`${label}空白模板预填了来源记录，可能被误认为真实证据`);
  }
  return {
    schemaVersion: 1,
    instructionCount: template.instructions.length,
    recordCount: 0,
    blankTemplatePreserved: true,
    noUnverifiedSourceClaim: true,
    requiredNoticePresent: true
  };
}

async function waitForExactResource(resource) {
  const attempts = 18;
  const intervalMs = 10000;
  const mainUrl = `${mainRoot}/${resource.path}`;
  const pagesUrl = `${publicRoot}/${resource.path}`;
  const attemptLog = [];
  let lastMain;
  let lastPages;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      lastMain = await fetchBytes(mainUrl, `${resource.id} main资源`);
      lastPages = await fetchBytes(pagesUrl, `${resource.id} Pages公网资源`);
      const matched = lastMain.sha256 === lastPages.sha256 && lastMain.bytes === lastPages.bytes;
      attemptLog.push({
        attempt,
        at: new Date().toISOString(),
        main: { ...lastMain, buffer: undefined },
        pages: { ...lastPages, buffer: undefined },
        matched
      });
      if (matched) {
        return { mainUrl, pagesUrl, main: lastMain, pages: lastPages, attempts: attemptLog };
      }
    } catch (error) {
      attemptLog.push({ attempt, at: new Date().toISOString(), error: error.message });
    }
    if (attempt < attempts) await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  const mainSummary = lastMain ? `${lastMain.sha256}/${lastMain.bytes}` : '未读取';
  const pagesSummary = lastPages ? `${lastPages.sha256}/${lastPages.bytes}` : '未读取';
  throw new Error(`${resource.path} 未与 main 逐字节一致：main=${mainSummary}，Pages=${pagesSummary}`);
}

(async () => {
  try {
    for (const resource of RESOURCES) {
      const localPath = path.join(root, resource.path);
      const localBuffer = fs.readFileSync(localPath);
      const localSha256 = sha256(localBuffer);
      const isSchema = resource.id === 'source-record-schema';
      const localContract = resource.assertContract(
        localBuffer.toString('utf8'),
        `${resource.id} 当前分支资源`,
        { requireInstructions: isSchema }
      );
      const published = await waitForExactResource(resource);
      const localMatchesMain = localSha256 === published.main.sha256 && localBuffer.length === published.main.bytes;
      const requirePublishedInstructions = isSchema && localMatchesMain;
      const mainContract = resource.assertContract(
        published.main.buffer.toString('utf8'),
        `${resource.id} main资源`,
        { requireInstructions: requirePublishedInstructions }
      );
      const pagesContract = resource.assertContract(
        published.pages.buffer.toString('utf8'),
        `${resource.id} Pages公网资源`,
        { requireInstructions: requirePublishedInstructions }
      );

      diagnostics.resources.push({
        id: resource.id,
        path: resource.path,
        mainUrl: published.mainUrl,
        pagesUrl: published.pagesUrl,
        local: {
          bytes: localBuffer.length,
          sha256: localSha256,
          contract: localContract
        },
        main: { ...published.main, buffer: undefined, contract: mainContract },
        pages: { ...published.pages, buffer: undefined, contract: pagesContract },
        attempts: published.attempts,
        verified: {
          publicReachable: true,
          exactBytesMatch: true,
          exactSha256Match: true,
          localMatchesMain,
          branchDeploymentPending: !localMatchesMain,
          contractChecksPassed: true
        }
      });
      console.log(`CNC Pages source record resource verified: ${resource.path} ${published.pages.sha256}; localMatchesMain=${localMatchesMain}`);
    }

    diagnostics.result = 'success';
    diagnostics.noUnverifiedContentClaim = true;
    fs.writeFileSync(resultPath, JSON.stringify(diagnostics, null, 2));
  } catch (error) {
    diagnostics.result = 'failure';
    diagnostics.error = String(error && error.stack || error);
    fs.writeFileSync(resultPath, JSON.stringify(diagnostics, null, 2));
    fs.writeFileSync(errorPath, diagnostics.error);
    throw error;
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
