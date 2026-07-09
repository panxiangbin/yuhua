/*
 * ui-learning-detail.js
 * CNC新手学习详情页渲染引擎
 * 重点升级：第1关《先看懂零件图》正式课程页
 */
(function () {
  'use strict';

  var LESSON_MEDIA_BASE = './assets';
  var LESSONS = {
    1: {
      id: 1,
      title: '先看懂零件图',
      stage: '阶段一：图纸、坐标与机床基准',
      time: '10分钟',
      levelLabel: '第1关',
      subtitle: '不是先背G代码，而是先判断基准、尺寸、公差和加工重点。',
      video: LESSON_MEDIA_BASE + '/videos/learning/lesson-01-datum.mp4',
      poster: LESSON_MEDIA_BASE + '/images/learning/lesson-01-datum.png',
      image: LESSON_MEDIA_BASE + '/images/learning/lesson-01-datum.png'
    },
    2: { id: 2, title: '机床的东南西北', stage: '阶段一', time: '8分钟', subtitle: '分清X、Y、Z方向，建立编程坐标感。' },
    3: { id: 3, title: '找机床的老家', stage: '阶段一', time: '6分钟', subtitle: '理解回零和参考点，知道机床怎么找准自己的位置。' },
    4: { id: 4, title: '告诉机床活儿在哪', stage: '阶段一', time: '10分钟', subtitle: '理解G54和工件坐标系，把程序零点设清楚。' },
    5: { id: 5, title: 'Z轴对刀，保命绝招', stage: '阶段二', time: '8分钟', subtitle: '学会Z轴对刀，先避开最常见的撞刀风险。' },
    6: { id: 6, title: '认识你的武器', stage: '阶段二', time: '7分钟', subtitle: '认识刀具类型、材料和基本使用场景。' },
    7: { id: 7, title: '顺着切还是逆着切', stage: '阶段二', time: '6分钟', subtitle: '理解顺铣、逆铣和刀具补偿方向。' },
    8: { id: 8, title: 'S 和 F，谁跑得快', stage: '阶段三', time: '7分钟', subtitle: '理解转速、进给、线速度之间的关系。' },
    9: { id: 9, title: 'G00 和 G01，快慢有别', stage: '阶段三', time: '8分钟', subtitle: '分清快速定位和切削进给，避免把G00用成切削。' },
    10: { id: 10, title: '致命的小数点', stage: '阶段三', time: '5分钟', subtitle: '掌握数值格式，避免尺寸差十倍的低级事故。' },
    11: { id: 11, title: 'G90 和 G91：算总账还是算小账', stage: '阶段三', time: '9分钟', subtitle: '分清绝对值和增量值，别让轨迹越走越偏。' },
    12: { id: 12, title: 'G81：钻孔自动化', stage: '阶段四', time: '10分钟', subtitle: '理解固定循环，把重复钻孔程序写得又短又稳。' }
  };

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function lessonOneFallbackSvg() {
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1400" viewBox="0 0 900 1400">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f8fbff"/><stop offset="1" stop-color="#eef5ff"/></linearGradient></defs>' +
      '<rect width="900" height="1400" fill="url(#g)"/>' +
      '<rect x="44" y="44" width="812" height="1312" rx="36" fill="#fff" stroke="#bfdbfe" stroke-width="4"/>' +
      '<rect x="44" y="44" width="812" height="132" rx="36" fill="#0b3a78"/>' +
      '<text x="90" y="126" font-size="48" font-weight="800" fill="#fff" font-family="Microsoft YaHei,Arial">第1关｜先看懂零件图</text>' +
      '<text x="90" y="226" font-size="34" font-weight="800" fill="#0f172a" font-family="Microsoft YaHei,Arial">核心图：先找基准，再看关键尺寸</text>' +
      '<rect x="90" y="270" width="720" height="410" rx="22" fill="#f8fafc" stroke="#cbd5e1" stroke-width="3"/>' +
      '<polygon points="220,390 590,330 690,430 310,510" fill="#d9e3ef" stroke="#334155" stroke-width="5"/>' +
      '<ellipse cx="450" cy="415" rx="65" ry="42" fill="#fff" stroke="#334155" stroke-width="5"/>' +
      '<circle cx="315" cy="390" r="22" fill="#fff" stroke="#334155" stroke-width="5"/><circle cx="585" cy="382" r="22" fill="#fff" stroke="#334155" stroke-width="5"/><circle cx="350" cy="495" r="22" fill="#fff" stroke="#334155" stroke-width="5"/><circle cx="615" cy="485" r="22" fill="#fff" stroke="#334155" stroke-width="5"/>' +
      '<rect x="380" y="285" width="128" height="54" rx="12" fill="#2563eb"/><text x="402" y="322" font-size="28" font-weight="800" fill="#fff" font-family="Microsoft YaHei,Arial">基准A</text>' +
      '<rect x="105" y="430" width="128" height="54" rx="12" fill="#16a34a"/><text x="127" y="467" font-size="28" font-weight="800" fill="#fff" font-family="Microsoft YaHei,Arial">基准B</text>' +
      '<rect x="390" y="565" width="128" height="54" rx="12" fill="#64748b"/><text x="412" y="602" font-size="28" font-weight="800" fill="#fff" font-family="Microsoft YaHei,Arial">基准C</text>' +
      '<line x1="444" y1="340" x2="444" y2="380" stroke="#2563eb" stroke-width="6"/><line x1="234" y1="457" x2="305" y2="424" stroke="#16a34a" stroke-width="6"/><line x1="454" y1="565" x2="454" y2="510" stroke="#64748b" stroke-width="6"/>' +
      '<rect x="90" y="730" width="720" height="360" rx="22" fill="#fff" stroke="#cbd5e1" stroke-width="3"/>' +
      '<rect x="180" y="830" width="330" height="170" fill="none" stroke="#111827" stroke-width="5"/>' +
      '<circle cx="245" cy="875" r="22" fill="none" stroke="#111827" stroke-width="4"/><circle cx="445" cy="875" r="22" fill="none" stroke="#111827" stroke-width="4"/><circle cx="245" cy="955" r="22" fill="none" stroke="#111827" stroke-width="4"/><circle cx="445" cy="955" r="22" fill="none" stroke="#111827" stroke-width="4"/><circle cx="345" cy="915" r="42" fill="none" stroke="#111827" stroke-width="4"/>' +
      '<text x="194" y="798" font-size="28" fill="#111827" font-family="Arial">120 ±0.05</text><text x="538" y="890" font-size="28" fill="#111827" font-family="Arial">Ø30 H7</text><text x="538" y="960" font-size="28" fill="#dc2626" font-family="Arial">15 ±0.05</text>' +
      '<rect x="96" y="1135" width="708" height="140" rx="22" fill="#eff6ff" stroke="#2563eb" stroke-width="3"/>' +
      '<text x="128" y="1195" font-size="34" font-weight="800" fill="#0f172a" font-family="Microsoft YaHei,Arial">记住：先找基准，再看尺寸，最后看公差。</text>' +
      '<text x="128" y="1248" font-size="26" fill="#475569" font-family="Microsoft YaHei,Arial">这张临时SVG会在你上传PNG后自动替换。</text>' +
      '</svg>';
    return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
  }

  function injectLessonStyles() {
    if (document.getElementById('lesson-one-pro-styles')) return;
    var css = `
      .lesson-detail-pro{max-width:1180px;margin:0 auto;color:#0f172a;}
      .lesson-pro-hero{position:relative;overflow:hidden;border-radius:24px;padding:22px;background:linear-gradient(135deg,#0b3a78,#1558b0);color:#fff;box-shadow:0 18px 45px rgba(15,23,42,.18);}
      .lesson-pro-hero:after{content:"";position:absolute;right:-90px;top:-90px;width:260px;height:260px;border-radius:50%;background:rgba(255,255,255,.12);}
      .lesson-pro-kicker{display:inline-flex;gap:8px;align-items:center;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.22);border-radius:999px;padding:6px 12px;font-size:.82rem;font-weight:700;margin-bottom:12px;}
      .lesson-pro-hero h2{margin:0;font-size:clamp(1.55rem,4vw,2.45rem);line-height:1.18;font-weight:900;letter-spacing:-.03em;}
      .lesson-pro-hero p{max-width:760px;margin:12px 0 0;color:#dbeafe;line-height:1.75;font-size:.98rem;}
      .lesson-pro-chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px;}
      .lesson-pro-chip{background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.22);border-radius:999px;padding:8px 12px;font-size:.82rem;font-weight:700;}
      .lesson-media-grid{display:grid;grid-template-columns:minmax(260px,.92fr) minmax(320px,1.08fr);gap:18px;margin:20px 0;align-items:start;}
      .lesson-card-pro{background:#fff;border:1px solid #dbeafe;border-radius:22px;padding:16px;box-shadow:0 12px 34px rgba(15,23,42,.08);}
      .lesson-card-pro h3{display:flex;align-items:center;gap:8px;margin:0 0 10px;font-size:1.08rem;color:#0f172a;}
      .lesson-video-shell{position:relative;overflow:hidden;border-radius:18px;background:#020617;border:1px solid #0f172a;}
      .lesson-video-shell video{display:block;width:100%;aspect-ratio:9/16;max-height:680px;background:#020617;object-fit:contain;}
      .lesson-media-note{margin:12px 0 0;color:#475569;font-size:.88rem;line-height:1.7;}
      .lesson-media-note strong{color:#0b3a78;}
      .lesson-upload-hint{display:none;margin-top:10px;border:1px dashed #f59e0b;background:#fffbeb;color:#92400e;border-radius:14px;padding:10px 12px;font-size:.82rem;line-height:1.65;}
      .lesson-diagram-img{display:block;width:100%;border-radius:18px;border:1px solid #e2e8f0;background:#f8fafc;box-shadow:inset 0 0 0 1px rgba(255,255,255,.8);}
      .lesson-section-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:18px 0;}
      .lesson-step-card{position:relative;background:#fff;border:1px solid #e2e8f0;border-radius:18px;padding:16px;min-height:178px;box-shadow:0 8px 24px rgba(15,23,42,.06);}
      .lesson-step-no{display:inline-flex;width:34px;height:34px;align-items:center;justify-content:center;border-radius:12px;background:#0b3a78;color:#fff;font-weight:900;margin-bottom:12px;}
      .lesson-step-card h4{margin:0 0 8px;font-size:.98rem;color:#0f172a;}
      .lesson-step-card p{margin:0;color:#475569;line-height:1.7;font-size:.86rem;}
      .lesson-two-col{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin:18px 0;}
      .lesson-case-card{background:linear-gradient(180deg,#fff,#f8fafc);border:1px solid #dbeafe;border-radius:22px;padding:18px;box-shadow:0 10px 30px rgba(15,23,42,.07);}
      .lesson-case-card h3{margin:0 0 12px;font-size:1.05rem;}
      .lesson-case-list{display:grid;gap:10px;margin:0;padding:0;list-style:none;}
      .lesson-case-list li{display:flex;gap:10px;align-items:flex-start;background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:11px 12px;color:#334155;line-height:1.65;font-size:.9rem;}
      .lesson-case-list b{color:#0b3a78;white-space:nowrap;}
      .lesson-formula{background:#0f172a;color:#fff;border-radius:18px;padding:18px;}
      .lesson-formula h3{margin:0 0 12px;color:#fff;}
      .lesson-formula p{margin:0 0 10px;color:#dbeafe;line-height:1.8;font-size:.95rem;}
      .lesson-formula .big{font-size:1.25rem;font-weight:900;color:#fbbf24;}
      .lesson-check-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;}
      .lesson-check-item{display:flex;gap:10px;align-items:flex-start;border:1px solid #e2e8f0;background:#fff;border-radius:14px;padding:12px;color:#334155;line-height:1.6;font-size:.9rem;}
      .lesson-check-icon{flex:0 0 auto;width:24px;height:24px;border-radius:8px;background:#dcfce7;color:#15803d;display:inline-flex;align-items:center;justify-content:center;font-weight:900;}
      .lesson-quiz-card{border:1px solid #bfdbfe;background:#eff6ff;border-radius:20px;padding:16px;margin-top:18px;}
      .lesson-quiz-card h3{margin:0 0 10px;}
      .lesson-quiz-options{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px;}
      .lesson-answer-btn{border:1px solid #cbd5e1;background:#fff;border-radius:14px;padding:12px;text-align:left;font-weight:700;color:#0f172a;cursor:pointer;}
      .lesson-answer-btn:hover{border-color:#2563eb;box-shadow:0 8px 18px rgba(37,99,235,.13);}
      .lesson-answer-btn.correct{background:#dcfce7;border-color:#22c55e;color:#166534;}
      .lesson-answer-btn.wrong{background:#fee2e2;border-color:#ef4444;color:#991b1b;}
      .lesson-answer-feedback{display:none;margin-top:12px;border-radius:14px;padding:12px;background:#fff;color:#334155;line-height:1.7;}
      .lesson-summary-pro{margin-top:18px;background:#fff7ed;border:1px solid #fed7aa;border-left:6px solid #f97316;border-radius:20px;padding:16px;color:#7c2d12;line-height:1.8;font-weight:700;}
      .lesson-nav-placeholder{margin-top:18px;color:#64748b;font-size:.86rem;}
      @media(max-width:900px){.lesson-media-grid,.lesson-two-col{grid-template-columns:1fr}.lesson-section-grid{grid-template-columns:1fr 1fr}.lesson-video-shell video{max-height:none}.lesson-quiz-options{grid-template-columns:1fr}}
      @media(max-width:560px){.lesson-pro-hero{border-radius:18px;padding:18px}.lesson-section-grid,.lesson-check-grid{grid-template-columns:1fr}.lesson-card-pro,.lesson-case-card{border-radius:18px;padding:14px}}
    `;
    var style = document.createElement('style');
    style.id = 'lesson-one-pro-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function renderLessonOne() {
    var data = LESSONS[1];
    var fallback = lessonOneFallbackSvg();
    var videoSrc = escapeHtml(data.video);
    var posterSrc = escapeHtml(data.poster);
    var imgSrc = escapeHtml(data.image);
    var fallbackAttr = escapeHtml(fallback);

    return `
      <div class="lesson-detail lesson-detail-pro" data-level="1">
        <header class="lesson-pro-hero">
          <span class="lesson-pro-kicker">🎯 ${escapeHtml(data.stage)} · ${escapeHtml(data.time)}</span>
          <h2>${escapeHtml(data.levelLabel)}：${escapeHtml(data.title)}</h2>
          <p>${escapeHtml(data.subtitle)}</p>
          <div class="lesson-pro-chips">
            <span class="lesson-pro-chip">学会先看图纸</span>
            <span class="lesson-pro-chip">能找基准A/B/C</span>
            <span class="lesson-pro-chip">知道哪些尺寸最关键</span>
            <span class="lesson-pro-chip">上机前能做自查</span>
          </div>
        </header>

        <section class="lesson-media-grid">
          <article class="lesson-card-pro">
            <h3>▶ 视频讲解：先找基准，再看关键尺寸</h3>
            <div class="lesson-video-shell">
              <video controls preload="metadata" playsinline poster="${posterSrc}" data-lesson-video>
                <source src="${videoSrc}" type="video/mp4">
                你的浏览器不支持视频播放。
              </video>
            </div>
            <p class="lesson-media-note"><strong>建议先看视频一遍：</strong>重点看基准A、B、C出现的位置，以及哪些尺寸被高亮。</p>
            <div class="lesson-upload-hint" data-video-upload-hint>
              视频路径已接好：<code>${videoSrc}</code><br>如果这里暂时不显示视频，请把 MP4 上传到这个路径。
            </div>
          </article>

          <article class="lesson-card-pro">
            <h3>🖼 核心配图：基准、尺寸、公差一起看</h3>
            <img class="lesson-diagram-img" src="${imgSrc}" alt="第1关核心配图：先找基准，再看关键尺寸" data-fallback="${fallbackAttr}" onerror="this.onerror=null;this.src=this.dataset.fallback;">
            <p class="lesson-media-note"><strong>看图顺序：</strong>先找基准A/B/C，再看孔位、台阶、公差，最后才决定刀具、坐标和工序。</p>
          </article>
        </section>

        <section class="lesson-section-grid" aria-label="学习步骤">
          <article class="lesson-step-card"><span class="lesson-step-no">1</span><h4>先看标题栏</h4><p>确认零件名称、图号、材料、比例。材料会影响刀具、转速和加工方式。</p></article>
          <article class="lesson-step-card"><span class="lesson-step-no">2</span><h4>先找基准</h4><p>基准决定装夹方式、检测依据，也会影响你把G54零点设在哪里。</p></article>
          <article class="lesson-step-card"><span class="lesson-step-no">3</span><h4>再看关键尺寸</h4><p>优先看孔位、孔径、台阶高度、配合尺寸，不要平均用力看所有线。</p></article>
          <article class="lesson-step-card"><span class="lesson-step-no">4</span><h4>最后看技术要求</h4><p>粗糙度、倒角、热处理、公差等级，决定最后能不能交合格件。</p></article>
        </section>

        <section class="lesson-two-col">
          <article class="lesson-case-card">
            <h3>🔧 现场案例：这张板类零件应该怎么看？</h3>
            <ul class="lesson-case-list">
              <li><b>第一眼</b><span>不要急着想程序，先判断它是板类/法兰类零件，有孔、有台阶、有装配要求。</span></li>
              <li><b>找基准</b><span>基准A是上平面，基准B是侧面，基准C是底面。基准确定后，装夹和坐标方向才稳定。</span></li>
              <li><b>抓重点</b><span>中心孔、四个小孔、台阶高度、H7和±0.05这类尺寸优先标记。</span></li>
              <li><b>再编程</b><span>先定装夹和G54零点，再排工序，最后才写G00、G01、G81这些代码。</span></li>
            </ul>
          </article>

          <article class="lesson-formula">
            <h3>🧠 老师傅口诀</h3>
            <p class="big">先看图，再定基准；先抓重点，再写程序。</p>
            <p>图纸没看明白，程序写得再漂亮也没用。新手最容易错的不是G代码，而是基准找错、尺寸看漏、公差没管。</p>
            <p>这一关只要求你养成一个习惯：拿到图纸，先按顺序检查，不要凭感觉上机。</p>
          </article>
        </section>

        <section class="lesson-card-pro">
          <h3>✅ 上机前6项自查</h3>
          <div class="lesson-check-grid">
            <div class="lesson-check-item"><span class="lesson-check-icon">✓</span><span>零件名称、材料、比例是否确认？</span></div>
            <div class="lesson-check-item"><span class="lesson-check-icon">✓</span><span>基准A/B/C是否找出来？</span></div>
            <div class="lesson-check-item"><span class="lesson-check-icon">✓</span><span>孔位、孔径、台阶高度是否标记？</span></div>
            <div class="lesson-check-item"><span class="lesson-check-icon">✓</span><span>H7、±0.05等公差是否重点关注？</span></div>
            <div class="lesson-check-item"><span class="lesson-check-icon">✓</span><span>粗糙度、倒角、去毛刺等技术要求是否看过？</span></div>
            <div class="lesson-check-item"><span class="lesson-check-icon">✓</span><span>是否能说清楚装夹和G54零点大概应该怎么定？</span></div>
          </div>
        </section>

        <section class="lesson-quiz-card" data-lesson-quiz="1">
          <h3>📝 过关小测</h3>
          <p>拿到一张零件图，新手第一步最应该先做什么？</p>
          <div class="lesson-quiz-options">
            <button class="lesson-answer-btn" data-lesson-answer="wrong" type="button">直接开始想G代码</button>
            <button class="lesson-answer-btn" data-lesson-answer="correct" type="button">先看标题栏、材料、基准和关键尺寸</button>
            <button class="lesson-answer-btn" data-lesson-answer="wrong" type="button">先估一个转速进给</button>
            <button class="lesson-answer-btn" data-lesson-answer="wrong" type="button">先找一把看起来合适的刀</button>
          </div>
          <div class="lesson-answer-feedback" data-lesson-feedback></div>
        </section>

        <div class="lesson-summary-pro">
          本关过关标准：你能对着一张简单零件图说出“材料是什么、基准在哪里、关键尺寸有哪些、哪些公差必须重点控制”，就算真正入门了。
        </div>
      </div>
    `;
  }

  function renderStandardLesson(level) {
    var data = LESSONS[level];
    if (!data) return '';
    return `
      <div class="lesson-detail lesson-detail-pro" data-level="${level}">
        <header class="lesson-pro-hero">
          <span class="lesson-pro-kicker">${escapeHtml(data.stage)} · ${escapeHtml(data.time)}</span>
          <h2>第${level}关：${escapeHtml(data.title)}</h2>
          <p>${escapeHtml(data.subtitle || '详细内容正在整理中。')}</p>
          <div class="lesson-pro-chips">
            <span class="lesson-pro-chip">课程结构已接入</span>
            <span class="lesson-pro-chip">后续补图文和视频</span>
          </div>
        </header>
        <section class="lesson-card-pro" style="margin-top:18px;">
          <h3>本关内容正在按第1关模板升级</h3>
          <p class="lesson-media-note">第1关先作为样板：视频讲解、核心配图、学习步骤、现场案例、过关检查。确认效果后，后面11关按同一套结构逐关补齐。</p>
        </section>
      </div>
    `;
  }

  function renderLessonDetail(level) {
    injectLessonStyles();
    var n = parseInt(level, 10);
    if (n === 1) return renderLessonOne();
    return renderStandardLesson(n);
  }

  function polishStudyList() {
    var stageOne = document.querySelector('#view-study .stage-header h4');
    if (stageOne && stageOne.textContent.indexOf('图纸') === -1) {
      stageOne.textContent = '图纸、坐标与机床基准';
    }

    var card1 = document.querySelector('#view-study .study-card[data-level="1"]');
    if (card1) {
      var title = card1.querySelector('h4');
      var desc = card1.querySelector('p');
      var time = card1.querySelector('.study-card-time');
      if (title) title.textContent = '先看懂零件图';
      if (desc) desc.textContent = '先看标题栏、材料、基准、关键尺寸和技术要求。图纸看错，程序就容易跟着错。';
      if (time) time.textContent = '⏱ 10分钟';
      var tags = card1.querySelector('.study-card-tags');
      if (tags) {
        tags.innerHTML = '<span class="tag">图纸识读</span><span class="tag">基准</span><span class="tag">关键尺寸</span>';
      }
    }

    var intro = document.querySelector('#view-study .section-head > p');
    if (intro) {
      intro.textContent = '按顺序闯关，从看懂图纸、找基准、建坐标，到能独立判断程序和加工风险。每关都有图文、视频和过关检查。';
    }
  }

  function bindLessonInteractions() {
    if (window.__LESSON_ONE_INTERACTIONS_BOUND__) return;
    window.__LESSON_ONE_INTERACTIONS_BOUND__ = true;

    document.addEventListener('click', function (event) {
      var btn = event.target.closest && event.target.closest('[data-lesson-answer]');
      if (!btn) return;
      var card = btn.closest('[data-lesson-quiz]');
      if (!card) return;
      card.querySelectorAll('.lesson-answer-btn').forEach(function (item) {
        item.classList.remove('correct', 'wrong');
      });
      var feedback = card.querySelector('[data-lesson-feedback]');
      if (btn.dataset.lessonAnswer === 'correct') {
        btn.classList.add('correct');
        if (feedback) {
          feedback.style.display = 'block';
          feedback.innerHTML = '答对了。先看图纸信息和基准，再谈刀具、坐标、工序和程序。';
        }
      } else {
        btn.classList.add('wrong');
        if (feedback) {
          feedback.style.display = 'block';
          feedback.innerHTML = '还不稳。新手不要一上来就想G代码或刀具，第一步必须先把图纸和基准看明白。';
        }
      }
    });

    document.addEventListener('error', function (event) {
      var video = event.target && event.target.closest && event.target.closest('[data-lesson-video]');
      if (!video) return;
      var card = video.closest('.lesson-card-pro');
      var hint = card && card.querySelector('[data-video-upload-hint]');
      if (hint) hint.style.display = 'block';
    }, true);
  }

  function boot() {
    injectLessonStyles();
    polishStudyList();
    bindLessonInteractions();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.CNC_LEARNING_UI = {
    renderLessonDetail: renderLessonDetail,
    getLessonData: function (level) { return LESSONS[parseInt(level, 10)] || null; },
    polishStudyList: polishStudyList
  };
})();
