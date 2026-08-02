'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const PLACEMENT_PATH = path.join(ROOT, 'cnc', 'beginner-placement.html');
const CAMP_PATH = path.join(ROOT, 'cnc', 'training-camp.html');
const OUTPUT_DIR = path.join(ROOT, 'cnc', 'test-results', 'beginner-placement-route-catalog-drift');
const REPORT_PATH = path.join(OUTPUT_DIR, 'report.json');

const report = {
  generatedAt: new Date().toISOString(),
  commitSha: process.env.GITHUB_SHA || null,
  passed: false,
  producer: {},
  consumer: {},
  checks: {},
  errors: []
};

function sha256(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

function fail(message) {
  throw new Error(message);
}

function expect(condition, message) {
  if (!condition) fail(message);
}

function readUtf8(file) {
  return fs.readFileSync(file, 'utf8');
}

function extractQuotedConst(source, name) {
  const match = source.match(new RegExp(`const\\s+${name}\\s*=\\s*'([^']+)'\\s*;`));
  if (!match) fail(`缺少字符串常量：${name}`);
  return match[1];
}

function extractTtlExpression(source, name) {
  const match = source.match(new RegExp(`const\\s+${name}\\s*=\\s*([^;]+);`));
  if (!match) fail(`缺少有效期常量：${name}`);
  return match[1].replace(/\s+/g, '');
}

function extractProducerRoutes(source) {
  const routes = {};
  const returnPattern = /return\s+\{decision:'([^']+)'([\s\S]*?)\};/g;
  let match;
  while ((match = returnPattern.exec(source))) {
    const decision = match[1];
    const body = match[2];
    const title = body.match(/(?:^|,)title:'([^']+)'/);
    const route = body.match(/(?:^|,)route:'([^']+)'/);
    const href = body.match(/(?:^|,)href:'([^']+)'/);
    const stepsBlock = body.match(/(?:^|,)steps:\[([\s\S]*?)\]\s*$/);
    expect(title, `生产端 ${decision} 缺少 title`);
    expect(route, `生产端 ${decision} 缺少 route`);
    expect(href, `生产端 ${decision} 缺少 href`);
    expect(stepsBlock, `生产端 ${decision} 缺少 steps`);
    const steps = [];
    const stepPattern = /\['([^']+)','([^']+)'\]/g;
    let stepMatch;
    while ((stepMatch = stepPattern.exec(stepsBlock[1]))) {
      steps.push({ title: stepMatch[1], href: stepMatch[2] });
    }
    expect(steps.length > 0, `生产端 ${decision} 没有可验证的路线步骤`);
    expect(!routes[decision], `生产端 decision 重复：${decision}`);
    routes[decision] = {
      title: title[1],
      route: route[1],
      href: href[1],
      steps
    };
  }
  return routes;
}

function extractConsumerCatalog(source) {
  const startToken = 'const PLACEMENT_ROUTE_CATALOG=Object.freeze(';
  const endToken = ');\nconst PLACEMENT_DECISIONS=';
  const start = source.indexOf(startToken);
  expect(start >= 0, '消费端缺少 PLACEMENT_ROUTE_CATALOG');
  const objectStart = start + startToken.length;
  const end = source.indexOf(endToken, objectStart);
  expect(end > objectStart, '无法定位消费端 PLACEMENT_ROUTE_CATALOG 结束位置');
  const literal = source.slice(objectStart, end);
  let catalog;
  try {
    catalog = Function(`"use strict"; return (${literal});`)();
  } catch (error) {
    fail(`消费端路线目录无法解析：${error.message}`);
  }
  expect(catalog && typeof catalog === 'object' && !Array.isArray(catalog), '消费端路线目录不是对象');
  return Object.fromEntries(Object.entries(catalog).map(([decision, route]) => [decision, {
    title: route.title,
    route: route.route,
    href: route.href,
    steps: route.steps.map(step => ({ title: step.title, href: step.href }))
  }]));
}

function stableRoute(route) {
  return JSON.stringify({
    title: route.title,
    route: route.route,
    href: route.href,
    steps: route.steps
  });
}

function validateRouteTextAndLinks(routes) {
  const hrefs = new Set();
  for (const [decision, route] of Object.entries(routes)) {
    expect(/^[a-z0-9-]+$/.test(decision), `decision 格式不受控：${decision}`);
    for (const [field, value] of [['title', route.title], ['route', route.route]]) {
      expect(typeof value === 'string' && value.trim() === value && value.length > 0, `${decision}.${field} 为空或包含首尾空白`);
      expect(!/[<>]/.test(value), `${decision}.${field} 不得包含 HTML 尖括号`);
    }
    expect(Array.isArray(route.steps) && route.steps.length >= 1 && route.steps.length <= 3, `${decision}.steps 数量必须为 1 到 3`);
    for (const item of [{ title: route.title, href: route.href }, ...route.steps]) {
      expect(/^\.\/[a-z0-9-]+\.html$/.test(item.href), `${decision} 包含非受控站内链接：${item.href}`);
      const target = path.join(ROOT, 'cnc', item.href.slice(2));
      expect(fs.existsSync(target), `${decision} 指向不存在的 CNC 页面：${item.href}`);
      hrefs.add(item.href);
    }
    route.steps.forEach((step, index) => {
      expect(typeof step.title === 'string' && step.title.trim() === step.title && step.title.length > 0, `${decision}.steps[${index}].title 无效`);
      expect(!/[<>]/.test(step.title), `${decision}.steps[${index}].title 不得包含 HTML 尖括号`);
    });
  }
  return [...hrefs].sort();
}

function validateIntentionalAliases(routes) {
  const byFingerprint = new Map();
  for (const [decision, route] of Object.entries(routes)) {
    const fingerprint = stableRoute(route);
    if (!byFingerprint.has(fingerprint)) byFingerprint.set(fingerprint, []);
    byFingerprint.get(fingerprint).push(decision);
  }
  const duplicates = [...byFingerprint.values()].filter(group => group.length > 1).map(group => group.sort());
  expect(duplicates.length === 1, `受控路线重复组数量异常：${JSON.stringify(duplicates)}`);
  expect(JSON.stringify(duplicates[0]) === JSON.stringify(['critical-safety', 'low-score']), `只允许 critical-safety 与 low-score 共用安全基础路线，实际为：${JSON.stringify(duplicates[0])}`);
  return duplicates;
}

function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const placement = readUtf8(PLACEMENT_PATH);
  const camp = readUtf8(CAMP_PATH);
  report.producer.file = 'cnc/beginner-placement.html';
  report.producer.sha256 = sha256(placement);
  report.consumer.file = 'cnc/training-camp.html';
  report.consumer.sha256 = sha256(camp);

  const producerKey = extractQuotedConst(placement, 'HANDOFF_KEY');
  const consumerKey = extractQuotedConst(camp, 'PLACEMENT_HANDOFF_KEY');
  const producerTtl = extractTtlExpression(placement, 'HANDOFF_TTL_MS');
  const consumerTtl = extractTtlExpression(camp, 'PLACEMENT_HANDOFF_TTL_MS');
  expect(producerKey === consumerKey, `交接键漂移：生产端 ${producerKey}，消费端 ${consumerKey}`);
  expect(producerTtl === consumerTtl, `有效期漂移：生产端 ${producerTtl}，消费端 ${consumerTtl}`);
  expect(producerTtl === '5*60*1000', `交接有效期必须保持 5 分钟，实际为 ${producerTtl}`);

  const producerRoutes = extractProducerRoutes(placement);
  const consumerRoutes = extractConsumerCatalog(camp);
  const producerDecisions = Object.keys(producerRoutes).sort();
  const consumerDecisions = Object.keys(consumerRoutes).sort();
  expect(JSON.stringify(producerDecisions) === JSON.stringify(consumerDecisions), `decision 集合漂移：生产端 ${JSON.stringify(producerDecisions)}，消费端 ${JSON.stringify(consumerDecisions)}`);
  expect(JSON.stringify(producerDecisions) === JSON.stringify(['advanced-ready', 'critical-safety', 'foundation-gap', 'low-score']), `受控 decision 集合异常：${JSON.stringify(producerDecisions)}`);

  for (const decision of producerDecisions) {
    const produced = stableRoute(producerRoutes[decision]);
    const consumed = stableRoute(consumerRoutes[decision]);
    expect(produced === consumed, `${decision} 路线目录漂移：\n生产端 ${produced}\n消费端 ${consumed}`);
  }

  const producerHrefs = validateRouteTextAndLinks(producerRoutes);
  const consumerHrefs = validateRouteTextAndLinks(consumerRoutes);
  expect(JSON.stringify(producerHrefs) === JSON.stringify(consumerHrefs), '生产端与消费端站内链接集合不一致');
  const aliases = validateIntentionalAliases(consumerRoutes);

  for (const token of [
    "steps:data.steps.map(([title,href])=>({title,href}))",
    "decision:data.decision",
    "sessionStorage.setItem(HANDOFF_KEY",
    "source:'beginner-placement'"
  ]) expect(placement.includes(token), `生产端交接契约缺失：${token}`);

  for (const token of [
    'const PLACEMENT_DECISIONS=new Set(Object.keys(PLACEMENT_ROUTE_CATALOG))',
    'const PLACEMENT_HREFS=new Set(Object.values(PLACEMENT_ROUTE_CATALOG)',
    'payloadMatchesCanonicalRoute(data,canonical)',
    'title:canonical.title',
    'route:canonical.route',
    'steps:canonical.steps.map'
  ]) expect(camp.includes(token), `消费端受控目录契约缺失：${token}`);

  report.producer.handoffKey = producerKey;
  report.producer.ttlExpression = producerTtl;
  report.producer.routes = producerRoutes;
  report.consumer.handoffKey = consumerKey;
  report.consumer.ttlExpression = consumerTtl;
  report.consumer.routes = consumerRoutes;
  report.checks = {
    decisionCount: producerDecisions.length,
    decisions: producerDecisions,
    hrefCount: producerHrefs.length,
    hrefs: producerHrefs,
    intentionalAliasGroups: aliases,
    exactFieldMatch: true,
    routeTargetsExist: true,
    safeRelativeLinksOnly: true,
    handoffKeyMatch: true,
    ttlMatch: true
  };
  report.passed = true;
  console.log(`CNC 起点测评路线目录防漂移通过：${producerDecisions.length} 类决策、${producerHrefs.length} 个站内入口完全一致。`);
}

try {
  main();
} catch (error) {
  report.errors.push(error && error.stack ? error.stack : String(error));
  console.error(error);
  process.exitCode = 1;
} finally {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}
