const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  await page.goto('http://127.0.0.1:4173/cnc/index.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => {
    const home = window.CNC_PERSONAL_HOME?.runCheck?.();
    const nav = document.querySelector('body > .xp-bottom-nav');
    return home?.legacyHomeRemoved === true
      && home?.bottomNavReady === true
      && nav?.getClientRects().length > 0
      && nav.getAttribute('aria-hidden') === 'false'
      && !nav.hasAttribute('inert');
  }, null, { timeout: 20000 });
  await page.waitForFunction(() => window.CNC_TRAINING_PROFILE?.build === '20260818a', null, { timeout: 20000 });
  await page.waitForFunction(() => document.body.getAttribute('data-cnc-startup-home') === 'stable', null, { timeout: 15000 });

  const startup = await page.evaluate(() => ({
    activeView: (document.querySelector('.view.active') || {}).id || '',
    stable: document.body.getAttribute('data-cnc-startup-home'),
    oldHomes: Array.from(document.querySelectorAll('#xp-game-home,#xp-personal-home')).map(node => node.id),
    api: window.CNC_PERSONAL_HOME.runCheck(),
    profileApi: {
      build: window.CNC_TRAINING_PROFILE?.build || '',
      snapshot: typeof window.CNC_TRAINING_PROFILE?.snapshot === 'function',
      render: typeof window.CNC_TRAINING_PROFILE?.render === 'function'
    },
    homeProgress: document.querySelector('#view-dashboard .cnc-home-capabilities li:first-child strong')?.textContent.trim() || '',
    primaryHref: document.querySelector('#view-dashboard .cnc-home-primary')?.getAttribute('href') || ''
  }));
  console.log('training startup', JSON.stringify(startup));
  assert.equal(startup.activeView, 'view-dashboard', 'CNC 根网址必须稳定停留首页');
  assert.equal(startup.stable, 'stable', '启动守卫必须确认首页稳定');
  assert.deepEqual(startup.oldHomes, [], '单层手机首页不得恢复已删除的双首页节点');
  assert.equal(startup.api.legacyHomeRemoved, true, '旧手机首页必须保持移除');
  assert.equal(startup.api.bottomNavReady, true, '真实五项底栏必须完成就绪');
  assert.equal(startup.profileApi.build, '20260818a', '成长档案公开构建契约漂移');
  assert.equal(startup.profileApi.snapshot, true, '成长档案快照接口必须存在');
  assert.equal(startup.profileApi.render, true, '成长档案渲染接口必须存在');
  assert.equal(startup.homeProgress, '0/12', '零记录新手首页不得伪造课程进度');
  assert.match(startup.primaryHref, /course-safety-foundation\.html$/, '零记录新手必须从第1关安全基础开始');

  const studyNav = page.locator('body > .xp-bottom-nav [data-xp-route="study"]');
  await studyNav.waitFor({ state: 'visible', timeout: 15000 });
  const studyTarget = await studyNav.evaluate(node => {
    const rect = node.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
      label: node.getAttribute('aria-label') || node.querySelector('span')?.textContent.trim() || node.textContent.trim()
    };
  });
  assert.ok(studyTarget.width >= 44, `学习底栏入口宽度不得小于44px：${studyTarget.width}`);
  assert.ok(studyTarget.height >= 48, `学习底栏入口高度不得小于48px：${studyTarget.height}`);
  assert.match(studyTarget.label, /学习/, '学习底栏入口必须有明确中文名称');
  await studyNav.click();
  await page.waitForSelector('#view-study.active', { state: 'visible', timeout: 15000 });
  await page.waitForFunction(() => {
    const cards = Array.from(document.querySelectorAll('#view-study .study-card[data-level]'));
    const images = Array.from(document.querySelectorAll('#view-study .study-card-thumb'));
    return cards.length === 12
      && images.length === 12
      && cards.every(card => card.dataset.courseFile && card.getAttribute('aria-label'))
      && images.every(image => image.alt.trim());
  }, null, { timeout: 20000 });

  // 课程缩略图采用原生懒加载。逐卡滚动到真实可视区域后再验证全部12张图解码，
  // 避免把“尚未触发懒加载”误判为资源损坏，同时不放宽任何图片完整性断言。
  const studyImages = page.locator('#view-study .study-card-thumb');
  for (let index = 0; index < 12; index += 1) {
    const image = studyImages.nth(index);
    await image.scrollIntoViewIfNeeded();
    await image.evaluate(async node => {
      if (!node.complete) {
        await new Promise((resolve, reject) => {
          const timer = window.setTimeout(() => reject(new Error(`课程图片加载超时：${node.src}`)), 15000);
          node.addEventListener('load', () => { window.clearTimeout(timer); resolve(); }, { once: true });
          node.addEventListener('error', () => { window.clearTimeout(timer); reject(new Error(`课程图片加载失败：${node.src}`)); }, { once: true });
        });
      }
      if (typeof node.decode === 'function') await node.decode();
    });
    const decoded = await image.evaluate(node => node.complete && node.naturalWidth > 0 && Boolean(node.alt.trim()));
    assert.equal(decoded, true, `第${index + 1}关课程图片必须在滚动到可视区域后成功解码`);
  }

  const study = await page.locator('#view-study').evaluate(view => {
    const cards = Array.from(view.querySelectorAll('.study-card[data-level]'));
    const rects = cards.map(card => card.getBoundingClientRect());
    return {
      cards: cards.map(card => ({
        level: Number(card.dataset.level || 0),
        courseFile: card.dataset.courseFile || '',
        ariaLabel: card.getAttribute('aria-label') || '',
        title: card.querySelector('h4')?.textContent.trim() || '',
        imageAlt: card.querySelector('.study-card-thumb')?.alt.trim() || '',
        imageDecoded: Boolean(card.querySelector('.study-card-thumb')?.complete && card.querySelector('.study-card-thumb')?.naturalWidth > 0)
      })),
      singleColumn: rects.slice(1).every((rect, index) => Math.abs(rect.left - rects[index].left) < 2 && rect.top > rects[index].top),
      minCardHeight: rects.length ? Math.min(...rects.map(rect => rect.height)) : 0
    };
  });
  assert.equal(study.cards.length, 12, '固定12关必须全部进入手机学习列表');
  assert.deepEqual(study.cards.map(card => card.level), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], '固定12关等级不得缺失、重复或改序');
  assert.equal(new Set(study.cards.map(card => card.courseFile)).size, 12, '12关正式课程文件不得重复');
  assert.match(study.cards[0].courseFile, /course-safety-foundation\.html$/, '第1关必须指向安全基础正式课程');
  assert.match(study.cards[11].courseFile, /course-complete-program-first-piece\.html$/, '第12关必须指向完整程序与首件验证正式课程');
  assert.ok(study.cards.every(card => card.ariaLabel && card.title && card.imageAlt && card.imageDecoded), '每关必须具备中文可访问名称、标题和成功解码的教学图片');
  assert.equal(study.singleColumn, true, '手机学习列表必须保持单列');
  assert.ok(study.minCardHeight >= 44, '课程卡片触控高度不得小于44px');

  // 完整训练路线已经从已删除的第二套首页迁移到独立训练营页。
  // 通过真实公开页面核验十二关主线、专项练习、现场模拟、成长档案和安全边界。
  await page.goto('http://127.0.0.1:4173/cnc/training-camp.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => document.querySelectorAll('#course-list .course').length === 12, null, { timeout: 15000 });

  const hub = await page.evaluate(() => {
    const routes = Array.from(document.querySelectorAll('.route-grid .route-card'));
    const courses = Array.from(document.querySelectorAll('#course-list .course'));
    const stats = Array.from(document.querySelectorAll('.hero .stat'));
    const visibleTargets = Array.from(document.querySelectorAll('a,button')).filter(node => node.getClientRects().length > 0);
    const smallTargets = visibleTargets.map(node => {
      const rect = node.getBoundingClientRect();
      return {
        text: (node.getAttribute('aria-label') || node.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80),
        width: Math.round(rect.width * 10) / 10,
        height: Math.round(rect.height * 10) / 10
      };
    }).filter(item => item.width < 44 || item.height < 44);
    return {
      title: document.querySelector('h1')?.textContent.trim() || '',
      routes: routes.map(node => ({
        text: node.textContent.trim().replace(/\s+/g, ' '),
        href: node.getAttribute('href') || ''
      })),
      stats: stats.map(node => node.textContent.trim().replace(/\s+/g, ' ')),
      progress: document.getElementById('progress-copy')?.textContent.trim() || '',
      nextTitle: document.getElementById('next-title')?.textContent.trim() || '',
      nextHref: document.getElementById('continue-main')?.getAttribute('href') || '',
      courses: courses.map(node => ({
        stage: node.dataset.stage || '',
        title: node.querySelector('h2')?.textContent.trim() || '',
        href: node.getAttribute('href') || '',
        status: node.querySelector('.status')?.textContent.trim() || ''
      })),
      safety: document.querySelector('.panel.notice')?.textContent.trim().replace(/\s+/g, ' ') || '',
      navLabels: Array.from(document.querySelectorAll('.bottom-nav a')).map(node => node.textContent.trim()),
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      smallTargets
    };
  });
  console.log('training hub', JSON.stringify(hub));

  assert.match(hub.title, /独立完成首件验证/, '训练营必须面向零基础并明确首件验证目标');
  assert.equal(hub.routes.length, 4, '训练营必须提供主线课程、专项练习、现场模拟和成长档案四条真实路径');
  assert.match(hub.routes.map(item => item.text).join(' '), /学主线课程/);
  assert.match(hub.routes.map(item => item.text).join(' '), /做专项练习/);
  assert.match(hub.routes.map(item => item.text).join(' '), /练现场模拟/);
  assert.match(hub.routes.map(item => item.text).join(' '), /看成长档案/);
  assert.equal(hub.stats.length, 3, '训练营必须展示已通过关卡、平均分和待重做错题三项真实统计');
  assert.match(hub.stats.join(' '), /已通过关卡/);
  assert.match(hub.stats.join(' '), /当前平均分/);
  assert.match(hub.stats.join(' '), /待重做错题/);
  assert.match(hub.progress, /已通过0\/12关/, '零记录新手必须明确显示0/12关，不能伪造进度');
  assert.match(hub.nextTitle, /第1关\s*安全基础/, '零记录新手下一关必须是安全基础');
  assert.match(hub.nextHref, /course-safety-foundation\.html$/, '训练营继续入口必须指向第1关正式课程');
  assert.equal(hub.courses.length, 12, '训练营必须完整展示固定12关');
  assert.equal(new Set(hub.courses.map(item => item.stage)).size, 12, '12关阶段标识不得重复或缺失');
  assert.match(hub.courses[0].title, /^安全基础(?:：|$)/, '第1关必须保留安全基础主标题与顺序');
  assert.match(hub.courses[0].href, /course-safety-foundation\.html$/);
  assert.equal(hub.courses[11].title, '完整程序与首件验证', '第12关名称和顺序不得漂移');
  assert.match(hub.courses[11].href, /course-complete-program-first-piece\.html$/);
  assert.ok(hub.courses.every(item => item.status === '未开始' || item.status === '继续学习'), '零记录课程状态不得伪造为已通过');
  assert.match(hub.safety, /机床原厂手册/);
  assert.match(hub.safety, /企业安全制度/);
  assert.match(hub.safety, /上机授权/);
  assert.match(hub.safety, /现场监护/);
  assert.deepEqual(hub.navLabels, ['首页', '训练营', '练习', '查代码', '我的'], '独立训练营页必须保留五项中文主导航');
  assert.ok(hub.scrollWidth <= hub.clientWidth + 1, `390px训练营不得横向溢出：${hub.scrollWidth}/${hub.clientWidth}`);
  assert.deepEqual(hub.smallTargets, [], `训练营可见操作目标不得小于44px：${JSON.stringify(hub.smallTargets)}`);
  assert.deepEqual(errors, []);

  console.log('CNC单层首页、真实十二关课程卡、独立训练营四路径、真实零进度与安全边界通过', {
    profileBuild: startup.profileApi.build,
    studyCards: study.cards.length,
    routeCount: hub.routes.length,
    courseCount: hub.courses.length,
    studyTarget
  });
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
