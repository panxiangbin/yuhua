const { chromium } = require('playwright');

(async () => {
  const base = process.env.CNC_URL || 'http://127.0.0.1:4173';
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(err.message));

  await page.goto(base + '/cnc/', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.CNC_PERSONAL_HOME && window.CNC_PERSONAL_HOME.recordsBuild === '20260722e');
  const home = await page.locator('#view-dashboard').evaluate(el => el.classList.contains('active'));
  if (!home) throw new Error('根网址启动后没有稳定停留在首页');

  const ids = await page.evaluate(() => {
    const list = Array.isArray(window.CNC_DATA) ? window.CNC_DATA.filter(item => item && item.id) : [];
    return list.slice(0, 3).map(item => item.id);
  });
  if (ids.length < 2) throw new Error('基础知识条目不足，无法建立收藏回归数据');

  await page.evaluate(ids => {
    localStorage.setItem('cnc_app_recents_v2', JSON.stringify(ids.slice(0, 2)));
    localStorage.setItem('cnc_app_favorites_v2', JSON.stringify(ids.slice(1, 3)));
  }, ids);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.CNC_PERSONAL_HOME && window.CNC_PERSONAL_HOME.recordsBuild === '20260722e');

  const nav = page.locator('.xp-bottom-nav [data-xp-route="favorites"]:visible');
  await nav.click();
  await page.waitForFunction(() => document.querySelector('#view-favorites.view.active') && document.querySelector('#view-favorites[data-industrial-records="ready"]'));

  const metrics = await page.evaluate(() => {
    const view = document.querySelector('#view-favorites');
    const cards = [...view.querySelectorAll('.favorites-grid > .detail-card')];
    const buttons = [...view.querySelectorAll('.link-cloud [data-link-entry]')];
    const first = cards[0] && cards[0].getBoundingClientRect();
    const second = cards[1] && cards[1].getBoundingClientRect();
    const firstButton = buttons[0];
    const buttonStyle = firstButton ? getComputedStyle(firstButton) : null;
    return {
      cards: cards.length,
      buttons: buttons.length,
      singleColumn: Boolean(first && second && second.top > first.bottom),
      buttonHeight: firstButton ? firstButton.getBoundingClientRect().height : 0,
      radius: buttonStyle ? buttonStyle.borderRadius : '',
      backgroundImage: buttonStyle ? buttonStyle.backgroundImage : '',
      countBadges: view.querySelectorAll('.xp-record-count').length,
      codeLabels: view.querySelectorAll('.xp-record-code').length,
      ariaLabels: buttons.every(button => Boolean(button.getAttribute('aria-label')))
    };
  });

  if (metrics.cards !== 2 || metrics.buttons < 4 || !metrics.singleColumn || metrics.buttonHeight < 52 || metrics.radius !== '10px' || metrics.backgroundImage !== 'none' || metrics.countBadges !== 2 || metrics.codeLabels < 4 || !metrics.ariaLabels) {
    throw new Error('收藏记录页工业卡片规范失败: ' + JSON.stringify(metrics));
  }

  await page.locator('#recent-links [data-link-entry]').first().click();
  await page.waitForFunction(() => document.querySelector('#view-workspace.view.active'));
  if (errors.length) throw new Error('控制台错误: ' + errors.join(' | '));
  console.log(JSON.stringify({ passed: true, metrics, ids }));
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
