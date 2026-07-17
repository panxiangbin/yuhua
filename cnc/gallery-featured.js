(function () {
  'use strict';

  polishPublicCopy();
  installLearningPolish();
  initGallery();

  function polishPublicCopy() {
    var copyMap = {
      'Gemini 图片图卡': '教学图片图库',
      '参数换算工具': '参数换算',
      '本地知识库并入': '知识库管理',
      '最近查看 / 收藏': '学习记录与收藏',
      '现在这版会朝正式软件界面走': '手机端数控学习与速查工作台',
      '不再是一直往下翻的超长页，而是左侧目录树、右侧工作区。点一个板块，就进入对应内容区，像软件一样继续看下一层。': '新手可以按路线逐关学习，现场遇到代码、报警、参数和工艺问题，也能直接搜索速查。',
      '直接进入查询区': '打开快速查询',
      '先看 Gemini 图卡': '先看教学图解',
      '把 Gemini 图片直接接进来': '教学图解直接在站内查看',
      '首批图卡会直接显示在站内，不再只是“已经画好了但网页里看不到”。': '坐标、对刀、循环指令和报警排查等高频知识，都可以直接点开图解查看。',
      '本地知识库逐步并入': '大型数控知识库持续整理',
      '先把核心数控知识包并进网页，再继续拆分超大档案，避免页面卡死。': '优先整理真正有用的编程、操作、刀具、故障和案例内容，并针对手机端分批加载。',
      'Gemini 图卡预览': '教学图解预览',
      '打开第一页就直接看图': '常用知识，一张图先讲明白',
      '先把已经做好的图直接摆出来，不用你再去猜图片到底有没有接进站里。': '坐标、对刀、循环指令等重点内容配合图解学习，手机上也能看清。',
      'Gemini 图片图卡': '教学图片图库',
      '这条内容对应的图卡': '这条内容对应的教学图解',
      '图卡会直接显示在这里。': '相关教学图片会直接显示在这里。',
      '首批图片直接在站内显示': '现场常用知识，一张图讲明白',
      '这部分专门解决“已经画完了，但网页里根本看不到”的问题。': '报警排查、坐标系、对刀和循环指令等高频知识，可直接点开高清查看。',
      '把本地数据库内容逐步接成网页可查': '把数控知识整理成手机端可查、可学的资料库',
      '先把核心数控知识包并入，再按需拆分超大档案，避免一打开就卡死。': '核心知识优先加载，大型资料按需分批读取，兼顾内容完整与手机端速度。'
    };

    function apply() {
      var nodes = document.querySelectorAll('h1,h2,h3,h4,h5,p,button,span');
      nodes.forEach(function (node) {
        if (node.children.length) return;
        var key = (node.textContent || '').trim();
        if (copyMap[key]) node.textContent = copyMap[key];
      });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', apply);
    } else {
      apply();
    }
  }

  function installLearningPolish() {
    function boot() {
      installLearningStyles();
      patchStudyNavigation();
      patchProgressCertificate();
      observeLessonDetails();
      decorateCurrentLesson();
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot);
    } else {
      boot();
    }
  }

  function installLearningStyles() {
    if (document.getElementById('cnc-learning-polish-style')) return;
    var style = document.createElement('style');
    style.id = 'cnc-learning-polish-style';
    style.textContent = [
      '#view-study .lesson-concept-diagram{overflow:hidden;background:linear-gradient(145deg,#f8fbff,#fffaf2)}',
      '#view-study .lesson-concept-diagram svg{display:block;width:100%;height:auto;border-radius:14px;background:#fff;border:1px solid rgba(29,38,34,.08)}',
      '#view-study .lesson-concept-note{margin:10px 0 0!important;font-size:13px;color:var(--muted);line-height:1.65}',
      '#view-study .lesson-practice-diagram{margin-top:14px;padding:12px;border-radius:16px;background:#fff;border:1px solid rgba(29,38,34,.08)}',
      '#view-study .lesson-practice-diagram svg{display:block;width:100%;height:auto}',
      '#view-study .certificate-button{border:0;border-radius:14px;padding:12px 16px;background:linear-gradient(135deg,#cf6d36,#2e6a59);color:#fff;font-weight:900;cursor:pointer;box-shadow:0 8px 20px rgba(46,106,89,.18)}',
      '#view-study .study-progress-panel.is-course-complete{grid-template-columns:minmax(0,1fr) auto auto}',
      '@media(max-width:720px){#view-study .study-progress-panel.is-course-complete{grid-template-columns:1fr}#view-study .certificate-button{width:100%}}'
    ].join('');
    document.head.appendChild(style);
  }

  function patchStudyNavigation() {
    var detailPanel = document.getElementById('study-detail-panel');
    var listPanel = document.querySelector('#view-study .section-panel');
    var topNav = document.querySelector('#view-study > .sub-nav-bar');
    if (!detailPanel || !listPanel) return;

    function sync(open) {
      listPanel.style.display = open ? 'none' : '';
      if (topNav) topNav.style.display = open ? 'none' : '';
    }

    var originalOpen = window.openStudyDetail;
    if (typeof originalOpen === 'function' && !originalOpen.__learningV2Wrapped) {
      var wrappedOpen = function (level) {
        sync(true);
        var result = originalOpen.apply(this, arguments);
        decorateCurrentLesson();
        return result;
      };
      wrappedOpen.__learningV2Wrapped = true;
      window.openStudyDetail = wrappedOpen;
    }

    var originalClose = window.closeStudyDetail;
    if (typeof originalClose === 'function' && !originalClose.__learningV2Wrapped) {
      var wrappedClose = function () {
        var result = originalClose.apply(this, arguments);
        sync(false);
        return result;
      };
      wrappedClose.__learningV2Wrapped = true;
      window.closeStudyDetail = wrappedClose;
    }

    document.addEventListener('click', function (event) {
      var routeButton = event.target.closest && event.target.closest('[data-route]');
      if (!routeButton) return;
      var route = routeButton.getAttribute('data-route');
      if (route) {
        detailPanel.style.display = 'none';
        sync(false);
      }
    });

    var observer = new MutationObserver(function () {
      sync(detailPanel.style.display !== 'none' && !detailPanel.hidden);
    });
    observer.observe(detailPanel, { attributes: true, attributeFilter: ['style', 'hidden'] });
  }

  function patchProgressCertificate() {
    var ui = window.CNC_LEARNING_UI;
    if (!ui || typeof ui.updateStudyProgressUI !== 'function' || ui.__certificatePatched) {
      renderCertificateButton();
      return;
    }
    var original = ui.updateStudyProgressUI;
    ui.updateStudyProgressUI = function () {
      var result = original.apply(this, arguments);
      renderCertificateButton();
      return result;
    };
    ui.__certificatePatched = true;
    renderCertificateButton();

    document.addEventListener('click', function (event) {
      var button = event.target.closest && event.target.closest('[data-generate-certificate]');
      if (button) generateCertificate();
    });
  }

  function renderCertificateButton() {
    var ui = window.CNC_LEARNING_UI;
    var panel = document.getElementById('study-progress-panel');
    if (!ui || !panel || typeof ui.readProgress !== 'function') return;
    var progress = ui.readProgress();
    var done = Array.isArray(progress.completed) ? progress.completed.length : 0;
    var old = panel.querySelector('[data-generate-certificate]');
    if (done < 12) {
      panel.classList.remove('is-course-complete');
      if (old) old.remove();
      return;
    }
    panel.classList.add('is-course-complete');
    if (!old) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'certificate-button';
      button.setAttribute('data-generate-certificate', 'true');
      button.textContent = '生成结业卡';
      panel.appendChild(button);
    }
  }

  function generateCertificate() {
    var canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1440;
    var ctx = canvas.getContext('2d');
    var gradient = ctx.createLinearGradient(0, 0, 1080, 1440);
    gradient.addColorStop(0, '#0b1730');
    gradient.addColorStop(0.55, '#153c4b');
    gradient.addColorStop(1, '#7f3f24');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(255,255,255,.28)';
    ctx.lineWidth = 3;
    ctx.strokeRect(70, 70, 940, 1300);
    ctx.strokeStyle = 'rgba(255,255,255,.12)';
    ctx.strokeRect(92, 92, 896, 1256);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#9fe8df';
    ctx.font = '700 34px "Microsoft YaHei",sans-serif';
    ctx.fillText('CNC LEARN HUB', 540, 190);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 60px "Microsoft YaHei",sans-serif';
    ctx.fillText('数控小潘 CNC助手', 540, 285);

    ctx.fillStyle = '#ffd8bd';
    ctx.font = '900 44px "Microsoft YaHei",sans-serif';
    ctx.fillText('零基础加工中心入门 12 关', 540, 390);

    ctx.beginPath();
    ctx.arc(540, 585, 118, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,.12)';
    ctx.fill();
    ctx.strokeStyle = '#9fe8df';
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 92px "Microsoft YaHei",sans-serif';
    ctx.fillText('完成', 540, 618);

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 34px "Microsoft YaHei",sans-serif';
    ctx.fillText('已完成图纸 · 坐标 · 对刀 · 编程 · 钻孔循环学习路线', 540, 790);

    ctx.fillStyle = 'rgba(255,255,255,.82)';
    ctx.font = '500 28px "Microsoft YaHei",sans-serif';
    ctx.fillText('贯穿练习：100 × 80 × 15 mm 铝合金练习板', 540, 865);
    ctx.fillText('完成日期：' + formatDate(new Date()), 540, 935);

    ctx.fillStyle = '#ffd8bd';
    ctx.font = '700 31px "Microsoft YaHei",sans-serif';
    ctx.fillText('先懂原理，再上机验证；先保证安全，再提高效率。', 540, 1080);

    ctx.fillStyle = 'rgba(255,255,255,.72)';
    ctx.font = '500 25px "Microsoft YaHei",sans-serif';
    ctx.fillText('本学习卡用于记录课程完成情况，不替代现场培训和上机资格。', 540, 1225);
    ctx.fillText('panxiangbin.github.io/yuhua/cnc/', 540, 1290);

    var link = document.createElement('a');
    link.download = '数控小潘_CNC入门12关结业卡.png';
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function formatDate(date) {
    return date.getFullYear() + '年' + (date.getMonth() + 1) + '月' + date.getDate() + '日';
  }

  function observeLessonDetails() {
    var content = document.getElementById('study-detail-content');
    if (!content) return;
    var observer = new MutationObserver(decorateCurrentLesson);
    observer.observe(content, { childList: true, subtree: true });
  }

  function decorateCurrentLesson() {
    var detail = document.querySelector('#study-detail-content .lesson-detail-v2');
    if (!detail) return;
    var level = Number(detail.getAttribute('data-level') || 1);
    insertConceptDiagram(detail, level);
    insertPracticePlate(detail);
  }

  function insertConceptDiagram(detail, level) {
    if (level === 1 || detail.querySelector('.lesson-concept-diagram')) return;
    var objectives = detail.querySelector('.lesson-v2-section:nth-of-type(3)') || detail.querySelector('.lesson-v2-section');
    if (!objectives) return;
    var section = document.createElement('section');
    section.className = 'lesson-v2-section lesson-concept-diagram';
    section.innerHTML = '<h3>本关核心示意</h3>' + conceptSvg(level) + '<p class="lesson-concept-note">示意图用于帮助理解运动和逻辑，具体按钮、坐标方向和系统行为仍以本机说明书为准。</p>';
    objectives.insertAdjacentElement('afterend', section);
  }

  function insertPracticePlate(detail) {
    var card = detail.querySelector('.lesson-practice-card');
    if (!card || card.querySelector('.lesson-practice-diagram')) return;
    var box = document.createElement('div');
    box.className = 'lesson-practice-diagram';
    box.innerHTML = practicePlateSvg();
    card.appendChild(box);
  }

  function conceptSvg(level) {
    var commonStart = '<svg viewBox="0 0 720 360" role="img" aria-label="本关核心示意图" xmlns="http://www.w3.org/2000/svg"><rect width="720" height="360" rx="22" fill="#f8fbff"/><style>text{font-family:Microsoft YaHei,Arial,sans-serif}.t{font-size:22px;font-weight:800;fill:#17324d}.s{font-size:17px;font-weight:600;fill:#526678}.r{stroke:#dc2626;stroke-width:6;fill:none}.g{stroke:#16845b;stroke-width:6;fill:none}.b{stroke:#2563eb;stroke-width:6;fill:none}.thin{stroke:#64748b;stroke-width:3;fill:none}</style>';
    var end = '</svg>';
    var body = '';

    if (level === 2) {
      body = '<text class="t" x="36" y="48">X / Y / Z 正方向</text><circle cx="250" cy="205" r="12" fill="#17324d"/><path class="r" d="M250 205H520"/><path class="g" d="M250 205L125 95"/><path class="b" d="M250 205V65"/><path d="M520 205l-22-12v24z" fill="#dc2626"/><path d="M125 95l25 3-15 20z" fill="#16845b"/><path d="M250 65l-12 22h24z" fill="#2563eb"/><text class="t" x="540" y="213">X+</text><text class="t" x="72" y="86">Y+</text><text class="t" x="270" y="82">Z+</text><text class="s" x="350" y="315">按刀具相对工件运动理解</text>';
    } else if (level === 3) {
      body = '<text class="t" x="36" y="48">先会停，再会动</text><rect x="60" y="105" width="150" height="105" rx="18" fill="#fee2e2" stroke="#dc2626" stroke-width="4"/><text class="t" x="135" y="160" text-anchor="middle">急停</text><rect x="285" y="105" width="150" height="105" rx="18" fill="#ffedd5" stroke="#ea580c" stroke-width="4"/><text class="t" x="360" y="160" text-anchor="middle">进给保持</text><rect x="510" y="105" width="150" height="105" rx="18" fill="#dbeafe" stroke="#2563eb" stroke-width="4"/><text class="t" x="585" y="160" text-anchor="middle">单段 / 倍率</text><path class="thin" d="M135 240H585"/><text class="s" x="360" y="290" text-anchor="middle">上机前先指出这些按钮的位置</text>';
    } else if (level === 4) {
      body = '<text class="t" x="36" y="48">机床坐标与 G54</text><rect x="55" y="95" width="250" height="190" rx="16" fill="#eef2ff" stroke="#64748b" stroke-width="3"/><text class="t" x="180" y="128" text-anchor="middle">机床坐标系</text><circle cx="95" cy="245" r="8" fill="#17324d"/><path class="b" d="M95 245H250M95 245V150"/><rect x="420" y="125" width="210" height="135" rx="12" fill="#fff7ed" stroke="#cf6d36" stroke-width="4"/><circle cx="445" cy="235" r="8" fill="#cf6d36"/><path class="r" d="M445 235H585M445 235V155"/><text class="t" x="525" y="105" text-anchor="middle">工件坐标 G54</text><path class="g" d="M305 190H410"/><path d="M410 190l-22-12v24z" fill="#16845b"/><text class="s" x="360" y="178" text-anchor="middle">偏置</text>';
    } else if (level === 5) {
      body = '<text class="t" x="36" y="48">T 号、H 号与刀尖高度</text><rect x="70" y="95" width="160" height="70" rx="14" fill="#dbeafe"/><text class="t" x="150" y="138" text-anchor="middle">T01 刀具</text><rect x="490" y="95" width="160" height="70" rx="14" fill="#dcfce7"/><text class="t" x="570" y="138" text-anchor="middle">H01 刀长</text><path class="g" d="M230 130H490"/><path d="M490 130l-22-12v24z" fill="#16845b"/><path class="thin" d="M360 175V275"/><path d="M330 275H390L360 320z" fill="#64748b"/><rect x="245" y="315" width="230" height="18" rx="4" fill="#cf6d36"/><text class="s" x="360" y="230" text-anchor="middle">G43 H01 把刀尖位置算进来</text>';
    } else if (level === 6) {
      body = '<text class="t" x="36" y="48">一行程序拆开看</text><g transform="translate(50 115)"><rect width="90" height="60" rx="10" fill="#dbeafe"/><text class="t" x="45" y="38" text-anchor="middle">G01</text><rect x="105" width="90" height="60" rx="10" fill="#dcfce7"/><text class="t" x="150" y="38" text-anchor="middle">X50.</text><rect x="210" width="90" height="60" rx="10" fill="#dcfce7"/><text class="t" x="255" y="38" text-anchor="middle">Y20.</text><rect x="315" width="90" height="60" rx="10" fill="#ffedd5"/><text class="t" x="360" y="38" text-anchor="middle">Z-2.</text><rect x="420" width="90" height="60" rx="10" fill="#fef3c7"/><text class="t" x="465" y="38" text-anchor="middle">F200</text><rect x="525" width="90" height="60" rx="10" fill="#ede9fe"/><text class="t" x="570" y="38" text-anchor="middle">M08</text></g><text class="s" x="360" y="245" text-anchor="middle">运动方式 · 坐标 · 深度 · 进给 · 辅助动作</text>';
    } else if (level === 7) {
      body = '<text class="t" x="36" y="48">G90 与 G91 的终点</text><path class="thin" d="M80 185H650"/><g fill="#64748b">' + [100,200,300,400,500,600].map(function (x, i) { return '<path d="M' + x + ' 174v22"/><text class="s" x="' + x + '" y="220" text-anchor="middle">' + (i * 10) + '</text>'; }).join('') + '</g><circle cx="300" cy="185" r="10" fill="#17324d"/><text class="s" x="300" y="150" text-anchor="middle">当前 X20</text><path class="b" d="M300 120H500"/><path d="M500 120l-20-11v22z" fill="#2563eb"/><text class="t" x="400" y="95" text-anchor="middle">G90 X40 → X40</text><path class="r" d="M300 280H500"/><path d="M500 280l-20-11v22z" fill="#dc2626"/><text class="t" x="400" y="325" text-anchor="middle">G91 X20 → X40</text>';
    } else if (level === 8) {
      body = '<text class="t" x="36" y="48">安全路径与危险路径</text><rect x="80" y="250" width="560" height="35" rx="6" fill="#d6a76b"/><rect x="400" y="180" width="110" height="70" rx="6" fill="#64748b"/><text class="s" x="455" y="218" text-anchor="middle" fill="#fff">压板</text><circle cx="140" cy="225" r="12" fill="#17324d"/><circle cx="590" cy="225" r="12" fill="#17324d"/><path class="r" d="M140 225L590 225"/><text class="s" x="350" y="210" text-anchor="middle">危险：低位快速穿过</text><path class="g" d="M140 225V100H590V225"/><text class="s" x="350" y="86" text-anchor="middle">安全：先抬 Z → 走 X/Y → 再接近</text>';
    } else if (level === 9) {
      body = '<text class="t" x="36" y="48">S 与 F 要匹配</text><circle cx="220" cy="185" r="92" fill="#dbeafe" stroke="#2563eb" stroke-width="6"/><text class="t" x="220" y="175" text-anchor="middle">S 转速</text><text class="s" x="220" y="210" text-anchor="middle">rpm</text><path class="g" d="M335 185H590"/><path d="M590 185l-24-14v28z" fill="#16845b"/><text class="t" x="470" y="160" text-anchor="middle">F 进给</text><text class="s" x="470" y="215" text-anchor="middle">结合刃数与每齿进给</text><text class="s" x="360" y="315" text-anchor="middle">参数过低也可能摩擦发热，先按厂家数据保守试切</text>';
    } else if (level === 10) {
      body = '<text class="t" x="36" y="48">G02 / G03 圆弧方向</text><circle cx="230" cy="205" r="105" fill="none" stroke="#dbeafe" stroke-width="18"/><path class="b" d="M230 100A105 105 0 0 1 335 205"/><path d="M335 205l-25-5 10-21z" fill="#2563eb"/><text class="t" x="230" y="220" text-anchor="middle">G02</text><circle cx="505" cy="205" r="105" fill="none" stroke="#dcfce7" stroke-width="18"/><path class="g" d="M505 100A105 105 0 0 0 400 205"/><path d="M400 205l25-5-10-21z" fill="#16845b"/><text class="t" x="505" y="220" text-anchor="middle">G03</text><text class="s" x="360" y="330" text-anchor="middle">先确认加工平面和观察方向</text>';
    } else if (level === 11) {
      body = '<text class="t" x="36" y="48">沿前进方向判断左补 / 右补</text><path class="thin" d="M100 190H620"/><path d="M620 190l-24-14v28z" fill="#64748b"/><text class="s" x="360" y="165" text-anchor="middle">刀具前进方向</text><path class="b" d="M100 110H620"/><text class="t" x="360" y="90" text-anchor="middle">G41 左侧</text><path class="r" d="M100 270H620"/><text class="t" x="360" y="320" text-anchor="middle">G42 右侧</text><circle cx="220" cy="110" r="22" fill="#dbeafe" stroke="#2563eb" stroke-width="4"/><circle cx="500" cy="270" r="22" fill="#fee2e2" stroke="#dc2626" stroke-width="4"/>';
    } else {
      body = '<text class="t" x="36" y="48">G81 / G83 返回高度</text><rect x="90" y="270" width="540" height="32" rx="6" fill="#d6a76b"/><rect x="430" y="210" width="100" height="60" rx="5" fill="#64748b"/><text class="s" x="480" y="245" text-anchor="middle" fill="#fff">夹具</text><path class="thin" d="M210 70V255"/><path d="M190 255H230L210 300z" fill="#17324d"/><path class="g" d="M130 120H590"/><text class="t" x="600" y="126">初始点 / G98</text><path class="r" d="M130 190H590"/><text class="t" x="600" y="196">R 平面 / G99</text><text class="s" x="300" y="340" text-anchor="middle">有障碍时，返回高度必须高于夹具</text>';
    }
    return commonStart + body + end;
  }

  function practicePlateSvg() {
    return '<svg viewBox="0 0 760 440" role="img" aria-label="100乘80毫米铝合金练习板示意" xmlns="http://www.w3.org/2000/svg"><rect width="760" height="440" rx="20" fill="#f8fbff"/><style>text{font-family:Microsoft YaHei,Arial,sans-serif}.h{font-size:23px;font-weight:800;fill:#17324d}.s{font-size:17px;font-weight:600;fill:#526678}.d{stroke:#64748b;stroke-width:2.5;fill:none}.part{fill:#e8eef2;stroke:#17324d;stroke-width:4}</style><text class="h" x="32" y="42">贯穿 12 关的统一练习零件</text><rect class="part" x="120" y="90" width="500" height="270" rx="8"/><rect x="275" y="170" width="190" height="100" rx="8" fill="#fff" stroke="#cf6d36" stroke-width="5"/><path d="M120 270Q190 355 275 270" fill="#dbeafe" stroke="#2563eb" stroke-width="5"/><g fill="#fff" stroke="#16845b" stroke-width="5"><circle cx="185" cy="145" r="18"/><circle cx="555" cy="145" r="18"/><circle cx="185" cy="310" r="18"/><circle cx="555" cy="310" r="18"/></g><circle cx="525" cy="225" r="22" fill="#fee2e2" stroke="#dc2626" stroke-width="5"/><text class="s" x="370" y="222" text-anchor="middle">矩形槽</text><text class="s" x="190" y="395">圆弧轮廓</text><text class="s" x="535" y="400">4孔 + 深孔</text><path class="d" d="M120 380H620M120 370V390M620 370V390"/><text class="s" x="370" y="418" text-anchor="middle">100 mm</text><path class="d" d="M85 90V360M75 90H95M75 360H95"/><text class="s" x="58" y="235" text-anchor="middle" transform="rotate(-90 58 235)">80 mm</text><circle cx="120" cy="360" r="8" fill="#cf6d36"/><text class="s" x="135" y="350">G54：左下角上表面</text></svg>';
  }

  function initGallery() {
    var grid = document.getElementById('cncGalleryGrid');
    if (!grid) return;
    var countEl = document.getElementById('cncGalleryCount');
    var modal = document.getElementById('cncGalleryModal');
    var closeBtn = document.getElementById('cncGalleryClose');
    var prevBtn = document.getElementById('cncGalleryPrev');
    var nextBtn = document.getElementById('cncGalleryNext');
    var previewImg = document.getElementById('cncGalleryPreviewImg');
    var previewTitle = document.getElementById('cncGalleryPreviewTitle');
    var previewDesc = document.getElementById('cncGalleryPreviewDesc');
    var previewIndex = document.getElementById('cncGalleryPreviewIndex');
    var loadMoreBtn = document.getElementById('cncGalleryLoadMore');
    var rawLibrary = Array.isArray(window.CNC_GALLERY_LIBRARY_ENHANCED) ? window.CNC_GALLERY_LIBRARY_ENHANCED : (Array.isArray(window.CNC_GALLERY_LIBRARY) ? window.CNC_GALLERY_LIBRARY : []);
    var images = rawLibrary.map(normalizeGalleryItem).filter(function (item) { return Boolean(item.src); });
    var pageSize = 20;
    var visibleCount = Math.min(pageSize, images.length);
    var currentIndex = 0;

    if (loadMoreBtn) loadMoreBtn.addEventListener('click', function () { visibleCount = Math.min(visibleCount + pageSize, images.length); renderGallery(); });
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (prevBtn) prevBtn.addEventListener('click', function () { showAt(currentIndex - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { showAt(currentIndex + 1); });
    if (modal) modal.addEventListener('click', function (event) { if (event.target && event.target.dataset.close === 'true') closeModal(); });
    document.addEventListener('keydown', function (event) {
      if (!modal || !modal.classList.contains('is-open')) return;
      if (event.key === 'Escape') closeModal();
      if (event.key === 'ArrowLeft') showAt(currentIndex - 1);
      if (event.key === 'ArrowRight') showAt(currentIndex + 1);
    });

    renderGallery();

    function normalizeGalleryItem(item, index) {
      if (typeof item === 'string') return { src: item, thumb: item, title: '数控图片资料 ' + (index + 1), desc: '点击查看高清大图。', alt: '数控图片资料 ' + (index + 1) };
      item = item || {};
      var src = item.src || item.url || item.image || item.img || item.cover || '';
      return { src: src, thumb: item.thumb || item.thumbnail || item.preview || src, title: item.title || item.name || '数控图片资料 ' + (index + 1), desc: item.desc || item.description || item.summary || '点击查看高清大图。', alt: item.alt || item.title || item.name || '数控图片资料 ' + (index + 1) };
    }

    function renderGallery() {
      if (countEl) countEl.textContent = visibleCount + ' / ' + images.length;
      if (!images.length) {
        grid.innerHTML = '<div class="cnc-gallery-empty">暂未读取到图库数据，请稍后再试。</div>';
        return;
      }
      if (loadMoreBtn) loadMoreBtn.style.display = visibleCount >= images.length ? 'none' : '';
      grid.innerHTML = images.slice(0, visibleCount).map(function (item, index) {
        return '<button class="cnc-gallery-card" type="button" data-index="' + index + '" aria-label="查看图片：' + escapeAttr(item.title) + '"><span class="cnc-gallery-img-wrap"><img data-src="' + escapeAttr(item.thumb) + '" alt="' + escapeAttr(item.alt) + '" loading="lazy"></span><span class="cnc-gallery-overlay"><h3>' + escapeHtml(item.title) + '</h3><p>' + escapeHtml(item.desc) + '</p></span></button>';
      }).join('');
      grid.querySelectorAll('.cnc-gallery-card').forEach(function (card) { card.addEventListener('click', function () { openModal(Number(card.dataset.index || 0)); }); });
      enableLazyLoad();
    }

    function enableLazyLoad() {
      var lazyImages = grid.querySelectorAll('img[data-src]');
      if (!('IntersectionObserver' in window)) { lazyImages.forEach(loadImage); return; }
      var observer = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (entry) { if (entry.isIntersecting) { loadImage(entry.target); obs.unobserve(entry.target); } });
      }, { rootMargin: '180px 0px', threshold: 0.01 });
      lazyImages.forEach(function (img) { observer.observe(img); });
    }

    function loadImage(img) {
      var src = img.getAttribute('data-src');
      if (!src) return;
      img.src = src;
      img.removeAttribute('data-src');
      img.addEventListener('load', function () { img.classList.add('is-loaded'); });
    }

    function openModal(index) {
      if (!modal || !images.length) return;
      showAt(index);
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }

    function closeModal() {
      if (!modal) return;
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      if (previewImg) { previewImg.src = ''; previewImg.alt = ''; }
    }

    function showAt(index) {
      if (!images.length) return;
      currentIndex = index < 0 ? images.length - 1 : (index >= images.length ? 0 : index);
      var item = images[currentIndex];
      if (previewImg) { previewImg.src = item.src; previewImg.alt = item.alt; }
      if (previewTitle) previewTitle.textContent = item.title;
      if (previewDesc) previewDesc.textContent = item.desc;
      if (previewIndex) previewIndex.textContent = (currentIndex + 1) + ' / ' + images.length;
    }
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }
})();
