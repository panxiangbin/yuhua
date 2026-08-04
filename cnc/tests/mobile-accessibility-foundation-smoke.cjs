const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const OUTPUT_DIR = path.join('artifacts', 'mobile-accessibility-foundation');
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function seconds(value) {
  return String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
    .map(item => item.endsWith('ms') ? Number.parseFloat(item) / 1000 : Number.parseFloat(item))
    .filter(Number.isFinite);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    reducedMotion: 'reduce'
  });
  const page = await context.newPage();
  const browserErrors = [];
  const findings = [];

  page.on('pageerror', error => browserErrors.push(`pageerror: ${String(error.message || error)}`));
  page.on('console', message => {
    if (message.type() === 'error') browserErrors.push(`console: ${message.text()}`);
  });

  try {
    await page.goto('http://127.0.0.1:4173/cnc/?smoke=mobile-accessibility-foundation', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    await page.waitForFunction(() => window.CNC_TRUST_NAV && (window.__CNC_TRUST_READY_AT__ || 0) > 0, null, { timeout: 30000 });
    await page.waitForFunction(() => {
      const nav = document.querySelector('body > .xp-bottom-nav');
      return nav && nav.getClientRects().length > 0 && nav.getAttribute('aria-hidden') === 'false' && !nav.hasAttribute('inert');
    }, null, { timeout: 30000 });
    await page.waitForFunction(() => window.CNC_GAME_QUERY_NAV?.runCheck().utilityHidden === true, null, { timeout: 20000 });

    const audit = await page.evaluate(() => {
      function visible(node) {
        if (!(node instanceof Element)) return false;
        const style = getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) !== 0 && rect.width > 0 && rect.height > 0;
      }

      function labelText(node) {
        const ariaLabel = (node.getAttribute('aria-label') || '').trim();
        if (ariaLabel) return ariaLabel;
        const labelledBy = (node.getAttribute('aria-labelledby') || '').trim();
        if (labelledBy) {
          const value = labelledBy.split(/\s+/).map(id => document.getElementById(id)?.textContent || '').join(' ').trim();
          if (value) return value;
        }
        if (node.id) {
          const explicit = document.querySelector(`label[for="${CSS.escape(node.id)}"]`);
          if (explicit && explicit.textContent.trim()) return explicit.textContent.trim();
        }
        const wrapping = node.closest('label');
        if (wrapping && wrapping.textContent.trim()) return wrapping.textContent.trim();
        const title = (node.getAttribute('title') || '').trim();
        if (title) return title;
        return (node.textContent || '').replace(/\s+/g, ' ').trim();
      }

      function describe(node) {
        const id = node.id ? `#${node.id}` : '';
        const classes = node.classList && node.classList.length ? `.${Array.from(node.classList).slice(0, 3).join('.')}` : '';
        return `${node.tagName.toLowerCase()}${id}${classes}`;
      }

      const issues = [];
      const html = document.documentElement;
      if (html.lang.toLowerCase() !== 'zh-cn') issues.push(`文档语言必须为 zh-CN，当前为 ${html.lang || '空'}`);

      const visibleMains = Array.from(document.querySelectorAll('main')).filter(visible);
      if (visibleMains.length !== 1) issues.push(`可见 main 地标必须且只能有 1 个，当前为 ${visibleMains.length}`);
      if (!visibleMains[0]?.id) issues.push('主内容 main 缺少稳定 id，跳转链接无法可靠定位');

      const skipLinks = Array.from(document.querySelectorAll('a[href^="#"]')).filter(node => /跳到|跳过|主内容/.test(node.textContent || ''));
      if (!skipLinks.length) issues.push('页面缺少键盘可用的“跳到主内容”链接');

      const visibleControls = Array.from(document.querySelectorAll('button,a[href],input,select,textarea,[role="button"],[tabindex]')).filter(visible);
      const unnamed = visibleControls.filter(node => !labelText(node)).map(describe);
      if (unnamed.length) issues.push(`存在 ${unnamed.length} 个可见交互控件缺少可访问名称：${unnamed.slice(0, 8).join('、')}`);

      const formControls = Array.from(document.querySelectorAll('input:not([type="hidden"]),select,textarea')).filter(visible);
      const unlabelled = formControls.filter(node => {
        const ariaLabel = (node.getAttribute('aria-label') || '').trim();
        const labelledBy = (node.getAttribute('aria-labelledby') || '').trim();
        const explicit = node.id && document.querySelector(`label[for="${CSS.escape(node.id)}"]`);
        const wrapping = node.closest('label');
        return !ariaLabel && !labelledBy && !explicit && !wrapping;
      }).map(describe);
      if (unlabelled.length) issues.push(`存在 ${unlabelled.length} 个可见表单控件只靠占位文字或完全无标签：${unlabelled.slice(0, 8).join('、')}`);

      const positiveTabindex = Array.from(document.querySelectorAll('[tabindex]')).filter(node => visible(node) && Number(node.getAttribute('tabindex')) > 0).map(describe);
      if (positiveTabindex.length) issues.push(`禁止使用正数 tabindex：${positiveTabindex.join('、')}`);

      const hiddenFocusable = Array.from(document.querySelectorAll('[aria-hidden="true"]')).flatMap(host => {
        return Array.from(host.querySelectorAll('button,a[href],input,select,textarea,[tabindex]')).filter(node => !node.disabled && Number(node.getAttribute('tabindex') || 0) >= 0).map(describe);
      });
      if (hiddenFocusable.length) issues.push(`aria-hidden 区域仍含可聚焦控件：${hiddenFocusable.slice(0, 8).join('、')}`);

      const overflow = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth;
      if (overflow > 1) issues.push(`390px 手机宽度出现 ${overflow}px 横向溢出`);

      const menuButton = document.getElementById('sidebar-open');
      if (!menuButton?.getAttribute('aria-controls')) issues.push('目录按钮缺少 aria-controls');
      if (!menuButton?.hasAttribute('aria-expanded')) issues.push('目录按钮缺少 aria-expanded 状态');

      const accessMessage = document.getElementById('access-message');
      if (accessMessage && !accessMessage.getAttribute('aria-live') && accessMessage.getAttribute('role') !== 'status') {
        issues.push('邀请码校验提示缺少 aria-live 或 role=status，读屏无法及时获知错误');
      }

      const loading = document.getElementById('loading-screen');
      if (loading && !loading.getAttribute('role') && loading.getAttribute('aria-hidden') !== 'true') {
        issues.push('加载层既未声明状态角色，也未标记为纯装饰');
      }

      const motionSamples = ['.loading-ring', '.xp-game-primary', '.xp-game-secondary', 'body > .xp-bottom-nav [data-xp-route]']
        .map(selector => document.querySelector(selector))
        .filter(Boolean)
        .map(node => {
          const style = getComputedStyle(node);
          return {
            selector: describe(node),
            animationDuration: style.animationDuration,
            transitionDuration: style.transitionDuration
          };
        });

      return {
        issues,
        visibleControlCount: visibleControls.length,
        formControlCount: formControls.length,
        overflow,
        motionSamples,
        main: visibleMains[0] ? describe(visibleMains[0]) : null,
        skipLinkCount: skipLinks.length
      };
    });
    findings.push(...audit.issues);

    const motionDurations = audit.motionSamples.flatMap(sample => [
      ...seconds(sample.animationDuration),
      ...seconds(sample.transitionDuration)
    ]);
    if (motionDurations.some(value => value > 0.01)) {
      findings.push(`系统设置“减少动态效果”后仍存在动画或过渡：${audit.motionSamples.map(item => `${item.selector}(${item.animationDuration}/${item.transitionDuration})`).join('、')}`);
    }

    const menuButton = page.locator('#sidebar-open');
    await menuButton.focus();
    const focusStyle = await menuButton.evaluate(node => {
      const style = getComputedStyle(node);
      return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth, boxShadow: style.boxShadow };
    });
    if ((focusStyle.outlineStyle === 'none' || focusStyle.outlineWidth === '0px') && focusStyle.boxShadow === 'none') {
      findings.push('键盘聚焦目录按钮时没有可见焦点指示');
    }

    await page.keyboard.press('Enter');
    await page.waitForTimeout(250);
    const opened = await page.evaluate(() => {
      const sidebar = document.getElementById('sidebar');
      const open = document.getElementById('sidebar-open');
      return {
        visible: Boolean(sidebar && sidebar.getClientRects().length),
        activeId: document.activeElement?.id || '',
        expanded: open?.getAttribute('aria-expanded') || '',
        controls: open?.getAttribute('aria-controls') || ''
      };
    });
    if (!opened.visible) findings.push('键盘 Enter 未能打开目录');
    if (opened.visible && opened.activeId !== 'sidebar-close') findings.push(`目录打开后焦点未进入关闭按钮，当前焦点为 ${opened.activeId || '未知节点'}`);
    if (opened.visible && opened.expanded !== 'true') findings.push(`目录打开后 aria-expanded 未更新为 true，当前为 ${opened.expanded || '空'}`);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
    const closed = await page.evaluate(() => {
      const sidebar = document.getElementById('sidebar');
      const open = document.getElementById('sidebar-open');
      return {
        visible: Boolean(sidebar && sidebar.getClientRects().length),
        activeId: document.activeElement?.id || '',
        expanded: open?.getAttribute('aria-expanded') || ''
      };
    });
    if (closed.visible) findings.push('按 Escape 后目录没有关闭');
    if (!closed.visible && closed.activeId !== 'sidebar-open') findings.push(`目录关闭后焦点未返回打开按钮，当前焦点为 ${closed.activeId || '未知节点'}`);
    if (!closed.visible && closed.expanded && closed.expanded !== 'false') findings.push(`目录关闭后 aria-expanded 未恢复为 false，当前为 ${closed.expanded}`);

    await page.screenshot({ path: path.join(OUTPUT_DIR, 'mobile-home-390x844.png'), fullPage: true });

    const report = {
      checkedAt: new Date().toISOString(),
      url: page.url(),
      viewport: { width: 390, height: 844 },
      reducedMotion: true,
      build: await page.evaluate(() => window.CNC_TRUST_NAV?.build || null),
      audit,
      focusStyle,
      sidebarOpened: opened,
      sidebarClosed: closed,
      browserErrors,
      findings
    };
    fs.writeFileSync(path.join(OUTPUT_DIR, 'report.json'), JSON.stringify(report, null, 2));
    fs.writeFileSync(path.join(OUTPUT_DIR, 'findings.txt'), findings.length ? findings.map((item, index) => `${index + 1}. ${item}`).join('\n') : '未发现阻断项\n');

    assert.deepEqual(browserErrors, [], `浏览器出现错误：\n${browserErrors.join('\n')}`);
    assert.deepEqual(findings, [], `移动端无障碍基础审计发现 ${findings.length} 项阻断：\n${findings.map((item, index) => `${index + 1}. ${item}`).join('\n')}`);
    console.log('CNC 手机端无障碍基础审计通过', report);
  } finally {
    await browser.close();
  }
})().catch(error => {
  fs.writeFileSync(path.join(OUTPUT_DIR, 'error.txt'), `${error.stack || error}\n`);
  console.error(error);
  process.exit(1);
});