'use strict';

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const outDir = path.resolve(__dirname, '../test-results/simulator-hub-data');
fs.mkdirSync(outDir, { recursive: true });

function fail(message) {
  throw new Error(message);
}

(async () => {
  const executablePath = process.env.CNC_BROWSER_PATH || undefined;
  const browser = await chromium.launch({ headless: true, executablePath });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', error => pageErrors.push(String(error && error.stack || error)));

  await page.addInitScript(() => {
    const seedKey = 'cnc_simulator_hub_test_seeded';
    if (sessionStorage.getItem(seedKey) === '1') return;
    sessionStorage.setItem(seedKey, '1');
    const homing = { bestScore: 100, lastScore: 100, attempts: 2, passed: true, lastCompletedAt: '2026-08-07T10:00:00.000Z' };
    const cutter = { bestScore: 100, lastScore: 100, attempts: 3, passed: true, lastCompletedAt: '2026-08-07T11:00:00.000Z' };
    const hole = { bestScore: 75, lastScore: 75, attempts: 2, passed: false, lastCompletedAt: '2026-08-07T12:00:00.000Z' };
    localStorage.setItem('cnc_training_simulator_v1', JSON.stringify({
      version: 1,
      simulators: { homing, 'cutter-comp-risk': cutter },
      records: { 'cutter-comp-risk': cutter, 'hole-cycle-troubleshooting': hole }
    }));
    localStorage.setItem('cnc_training_profile_v1', JSON.stringify({
      version: 1,
      abilities: { verification: 85, offsetRisk: 90, measurementDiagnosis: 72, holeCycleTroubleshooting: 75 }
    }));
  });

  const base = process.env.CNC_BASE_URL || 'http://127.0.0.1:4173';
  const response = await page.goto(`${base}/cnc/simulator-hub.html`, { waitUntil: 'domcontentloaded' });
  if (!response || !response.ok()) fail(`simulator hub HTTP ${response && response.status()}`);
  await page.waitForFunction(() => document.body.dataset.simulatorHub === 'ready');

  const normalSnapshot = await page.evaluate(() => window.CNC_SIMULATOR_HUB && window.CNC_SIMULATOR_HUB.snapshot());
  if (!normalSnapshot) fail('CNC_SIMULATOR_HUB snapshot missing');
  if (normalSnapshot.passed !== 2) fail(`passed mismatch: ${normalSnapshot.passed}`);
  if (normalSnapshot.average !== 21) fail(`average mismatch: ${normalSnapshot.average}`);
  if (normalSnapshot.attempts !== 7) fail(`attempts mismatch: ${normalSnapshot.attempts}`);
  if (normalSnapshot.records !== 3) fail(`record coverage mismatch: ${normalSnapshot.records}`);
  if (normalSnapshot.nextId !== 'workholding-check') fail(`next training mismatch: ${normalSnapshot.nextId}`);

  const text = async selector => (await page.locator(selector).innerText()).replace(/\s+/g, ' ').trim();
  if (await text('#passed') !== '2') fail('visible passed count mismatch');
  if (await text('#attempts') !== '7') fail('visible attempts count mismatch');
  const cutterText = await text('[data-id="cutter-comp-risk"]');
  if (!cutterText.includes('最高100分 · 3次') || !cutterText.includes('已通过')) fail(`new records schema not rendered: ${cutterText}`);
  const homingText = await text('[data-id="homing"]');
  if (!homingText.includes('最高100分 · 2次') || !homingText.includes('已通过')) fail(`legacy simulators schema not rendered: ${homingText}`);
  const holeText = await text('[data-id="hole-cycle-troubleshooting"]');
  if (!holeText.includes('最高75分 · 2次') || !holeText.includes('待训练')) fail(`partial record not rendered: ${holeText}`);
  const note = await text('#data-note');
  if (!note.includes('3/13') || !note.includes('simulators') || !note.includes('records')) fail(`compatibility note mismatch: ${note}`);

  const corruptRaw = await page.evaluate(() => {
    const simulator = JSON.stringify({ version: 1, simulators: {
      homing: null,
      'workholding-check': 'bad-record',
      'tool-installation': { bestScore: 'oops', attempts: -2, passed: 'false' },
      'tool-length-offset-check': { bestScore: 120, attempts: 'bad', passed: false },
      'work-offset-setting': { bestScore: 100, attempts: 1, passed: false }
    }});
    const profile = JSON.stringify({ version: 1, abilities: {
      safety: 'oops', coordinate: 120, offsetRisk: -5, inspection: 88,
      measurementDiagnosis: 'NaN', troubleshooting: 'Infinity', holeCycleTroubleshooting: 77
    }});
    localStorage.setItem('cnc_training_simulator_v1', simulator);
    localStorage.setItem('cnc_training_profile_v1', profile);
    return { simulator, profile };
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.body.dataset.simulatorHub === 'ready');
  const corruptSnapshot = await page.evaluate(() => window.CNC_SIMULATOR_HUB.snapshot());
  if (corruptSnapshot.passed !== 1) fail(`corrupt data created false pass: ${corruptSnapshot.passed}`);
  if (corruptSnapshot.attempts !== 1) fail(`corrupt attempts not degraded: ${corruptSnapshot.attempts}`);
  if (corruptSnapshot.average !== 8) fail(`corrupt score not degraded: ${corruptSnapshot.average}`);
  const corruptBody = await text('body');
  if (/NaN|Infinity/.test(corruptBody)) fail('corrupt data leaked NaN/Infinity to UI');
  const abilityText = await text('#ability');
  if (!abilityText.includes('安全验证 0分') || !abilityText.includes('坐标与刀补 0分')) fail(`invalid ability score not degraded: ${abilityText}`);
  if (!abilityText.includes('检验诊断 88分') || !abilityText.includes('故障排查 77分')) fail(`valid fallback ability lost: ${abilityText}`);
  const corruptStored = await page.evaluate(() => ({
    simulator: localStorage.getItem('cnc_training_simulator_v1'),
    profile: localStorage.getItem('cnc_training_profile_v1')
  }));
  if (corruptStored.simulator !== corruptRaw.simulator || corruptStored.profile !== corruptRaw.profile) fail('hub silently rewrote corrupt localStorage');

  const arrayRaw = await page.evaluate(() => {
    const simulator = '[]';
    const profile = JSON.stringify({ version: 1, abilities: [] });
    localStorage.setItem('cnc_training_simulator_v1', simulator);
    localStorage.setItem('cnc_training_profile_v1', profile);
    return { simulator, profile };
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.body.dataset.simulatorHub === 'ready');
  const arraySnapshot = await page.evaluate(() => window.CNC_SIMULATOR_HUB.snapshot());
  if (arraySnapshot.passed !== 0 || arraySnapshot.attempts !== 0 || arraySnapshot.average !== 0) fail(`array root not degraded: ${JSON.stringify(arraySnapshot)}`);
  if (/NaN|Infinity/.test(await text('body'))) fail('array-root data leaked NaN/Infinity to UI');
  const arrayStored = await page.evaluate(() => ({
    simulator: localStorage.getItem('cnc_training_simulator_v1'),
    profile: localStorage.getItem('cnc_training_profile_v1')
  }));
  if (arrayStored.simulator !== arrayRaw.simulator || arrayStored.profile !== arrayRaw.profile) fail('hub silently rewrote array-root localStorage');

  const bodyWidth = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  if (bodyWidth.scrollWidth > bodyWidth.clientWidth + 1) fail(`horizontal overflow: ${JSON.stringify(bodyWidth)}`);
  if (consoleErrors.length) fail(`console errors: ${consoleErrors.join(' | ')}`);
  if (pageErrors.length) fail(`page errors: ${pageErrors.join(' | ')}`);

  await page.screenshot({ path: path.join(outDir, 'simulator-hub-390x844.png'), fullPage: true });
  const diagnostics = {
    passed: true,
    testedHead: process.env.CNC_TESTED_HEAD || null,
    eventSha: process.env.GITHUB_SHA || null,
    viewport: { width: 390, height: 844 },
    normalSnapshot,
    corruptSnapshot,
    arraySnapshot,
    readOnlyDegradation: true,
    visible: { cutterText, homingText, holeText, note },
    bodyWidth,
    consoleErrors,
    pageErrors,
    verifiedAt: new Date().toISOString()
  };
  fs.writeFileSync(path.join(outDir, 'diagnostics.json'), JSON.stringify(diagnostics, null, 2));
  await browser.close();
  console.log('CNC simulator hub mixed-schema and corrupt-data smoke passed');
})().catch(error => {
  fs.writeFileSync(path.join(outDir, 'failure.txt'), String(error && error.stack || error));
  console.error(error);
  process.exit(1);
});
