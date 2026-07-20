/* CNC 手机端 G/M 代码现场速查稳定版：无全局 DOM 监听，避免手机循环重绘 */
(function () {
  'use strict';

  var BUILD = '20260720h';
  var STORAGE_MACHINE = 'cnc_gcode_machine_v2';
  var STORAGE_SCOPE = 'cnc_gcode_scope_v2';
  var STORAGE_CUSTOM = 'cnc_gcode_custom_v2';
  var QUICK_CODES = ['G00','G01','G02','G03','G43','G54','G83','G84','G90','M03','M08','M30'];
  var COMMON_CODES = new Set([
    'G00','G01','G02','G03','G04','G09','G10','G15','G16','G17','G18','G19','G20','G21',
    'G28','G30','G31','G32','G40','G41','G42','G43','G44','G49','G50','G51','G52','G53',
    'G54','G55','G56','G57','G58','G59','G60','G61','G64','G65','G68','G69','G73','G74',
    'G75','G76','G80','G81','G82','G83','G84','G85','G86','G87','G88','G89','G90','G91',
    'G92','G94','G95','G96','G97','G98','G99','G05.1','G07.1','G43.4','G43.5','G54.1',
    'G68.2','M00','M01','M02','M03','M04','M05','M06','M07','M08','M09','M19','M30',
    'M41','M42','M48','M49','M60','M98','M99'
  ]);
  var FORMAT_MAP = {
    G00:'G00 X_ Y_ Z_',
    G01:'G01 X_ Y_ Z_ F_',
    G02:'G17 G02 X_ Y_ I_ J_ F_\n或：G17 G02 X_ Y_ R_ F_',
    G03:'G17 G03 X_ Y_ I_ J_ F_\n或：G17 G03 X_ Y_ R_ F_',
    G43:'G00 G43 H_ Z_',
    G54:'G54\nG00 X_ Y_',
    G73:'G98/G99 G73 X_ Y_ Z_ R_ Q_ F_',
    G80:'G80',
    G81:'G98/G99 G81 X_ Y_ Z_ R_ F_',
    G82:'G98/G99 G82 X_ Y_ Z_ R_ P_ F_',
    G83:'G98/G99 G83 X_ Y_ Z_ R_ Q_ F_',
    G84:'刚性攻丝常见结构：\nS_ M03（部分系统需M29）\nG98/G99 G84 X_ Y_ Z_ R_ F_\nF值必须结合G94/G95和本机说明书确认',
    G90:'加工中心：G90 X_ Y_ Z_\n数控车床：G90 X_ Z_ F_（外径/内径循环，依系统）',
    G91:'G91 X_ Y_ Z_（从当前位置增量移动）',
    G94:'加工中心常见：G94 F_（每分钟进给）',
    G95:'加工中心常见：G95 F_（每转进给）',
    G98:'加工中心固定循环：返回初始平面\n车床常见：每分钟进给',
    G99:'加工中心固定循环：返回R平面\n车床常见：每转进给',
    M03:'S_ M03',M04:'S_ M04',M05:'M05',M06:'T_ M06',M08:'M08',M09:'M09',
    M30:'M30',M98:'M98 P_ L_',M99:'M99'
  };

  var EXTENSIONS = [
    {id:'kb-gcode-g05-1',category:'G代码',title:'G05.1 AI轮廓控制/高速高精度控制',code:'G05.1',aliases:['AI轮廓控制','高速高精度','AICC'],summary:'用于高速、小线段和复杂曲面加工的预读与轮廓控制，属于FANUC选项功能。',usage:'模具曲面精加工、高速小线段程序使用。',beginner:'它不是移动指令，而是让控制系统更聪明地处理后续轨迹。',warning:'不同系统代数、选项和参数差异很大，未开通功能会报警，必须以本机说明书为准。',example:'常见形式：G05.1 Q1开启；G05.1 Q0取消。',risk:'中',tags:['加工中心','选项功能','高速加工']},
    {id:'kb-gcode-g07-1',category:'G代码',title:'G07.1 圆柱插补',code:'G07.1',aliases:['圆柱插补'],summary:'把旋转轴与直线轴联动，使圆柱表面的槽、孔或文字可按展开轨迹编程。',usage:'圆柱表面铣槽、刻字、孔阵列使用。',beginner:'先确定旋转轴、圆柱半径和展开方向。',warning:'半径、轴名或单位错误会使轨迹比例完全错误。',example:'常见形式：G07.1 C_开启，G07.1 C0取消。',risk:'高',tags:['加工中心','旋转轴','选项功能']},
    {id:'kb-gcode-g43-4',category:'G代码',title:'G43.4 刀具中心点控制（TCP）',code:'G43.4',aliases:['TCP','刀尖点控制'],summary:'五轴联动中补偿旋转轴运动造成的刀尖位置变化。',usage:'五轴联动、曲面加工、摆头或转台运动。',beginner:'机床转轴在动，但系统尽量让刀尖按编程轨迹走。',warning:'运动学参数、刀长和后处理必须完全匹配，禁止照搬程序。',example:'常见形式：G43.4 H_；取消方式以本机说明书为准。',risk:'高',tags:['加工中心','五轴','TCP','选项功能']},
    {id:'kb-gcode-g43-5',category:'G代码',title:'G43.5 刀具中心点/刀轴方向控制相关',code:'G43.5',aliases:['TCP type II','刀轴矢量控制'],summary:'部分FANUC五轴系统中用于另一类刀具中心点或刀轴方向控制。',usage:'五轴联动和刀轴矢量编程中可能使用。',beginner:'G43.4和G43.5不能只按编号猜含义。',warning:'属于高风险五轴选项功能，必须按机床厂家资料确认。',example:'出现G43.5时应核对后处理、刀长和旋转中心。',risk:'高',tags:['加工中心','五轴','选项功能']},
    {id:'kb-gcode-g54-1',category:'G代码',title:'G54.1 扩展工件坐标系',code:'G54.1',aliases:['扩展坐标系','P坐标系'],summary:'在G54-G59之外调用更多工件坐标偏置，常配合P号选择。',usage:'多工位夹具、多零件排版和自动化生产线。',beginner:'它相当于把G54-G59扩展成更多组工件零点。',warning:'P号对应错误会整体加工错位。',example:'常见形式：G54.1 P1。',risk:'高',tags:['加工中心','工件坐标','多工位']},
    {id:'kb-gcode-g68-2',category:'G代码',title:'G68.2 倾斜工作平面指令',code:'G68.2',aliases:['倾斜平面','3D坐标旋转'],summary:'建立空间倾斜坐标平面，让后续程序可在倾斜面上按平面思路编程。',usage:'五面体加工、3+2定位加工和倾斜孔。',beginner:'先把坐标系转到倾斜面，再按新的平面坐标加工。',warning:'旋转中心、角度顺序和取消指令错误都可能造成严重碰撞。',example:'参数格式随系统与后处理而异，必须使用经过验证的机床专用格式。',risk:'高',tags:['加工中心','五轴','3+2','选项功能']}
  ];

  var originals = {};
  var globalEventsBound = false;

  function arr(value) { return Array.isArray(value) ? value : []; }
  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function getState() {
    try { return state; } catch (error) { return null; }
  }
  function canon(value) {
    return String(value == null ? '' : value)
      .normalize('NFKC')
      .replace(/\b([gGmM])\s*0*(\d{1,2})(\.\d+)?\b/g, function (_, letter, digits, decimal) {
        return letter.toUpperCase() + String(Number(digits)).padStart(2,'0') + (decimal || '');
      })
      .replace(/\s+/g,' ')
      .trim();
  }
  function exactCode(value) {
    var normalized = canon(value).toUpperCase();
    return /^[GM]\d{2}(?:\.\d+)?$/.test(normalized) ? normalized : '';
  }
  function entryCode(entry) { return canon(entry && entry.code).toUpperCase(); }
  function entryText(entry) {
    return canon([
      entry && entry.code, entry && entry.title, entry && entry.category,
      entry && entry.summary, entry && entry.usage, entry && entry.beginner,
      entry && entry.warning, arr(entry && entry.tags).join(' '),
      arr(entry && entry.aliases).join(' ')
    ].join(' ')).toLowerCase();
  }
  function isGM(entry) {
    return !!entry && (
      entry.category === 'G代码' ||
      entry.category === 'M代码' ||
      /^[GM]\d/i.test(String(entry.code || ''))
    );
  }
  function isCustom(entry) {
    return /厂家自定义|备用|没有统一标准|无统一标准|machine m-code|厂家定义|保留代码/.test(entryText(entry));
  }
  function machineFlags(entry) {
    var text = entryText(entry);
    var lathe = /车床|车削|粗车|精车|外圆|端面|恒线速|车螺纹|车铣差异|每转进给/.test(text);
    var mill = /加工中心|铣床|铣削|钻孔|镗孔|攻丝|孔加工|xy平面|g17|刀长|工件坐标|五轴|旋转轴/.test(text);
    if (!lathe && !mill) { lathe = true; mill = true; }
    return { lathe: lathe, mill: mill };
  }
  function machineMatches(entry, machine) {
    if (machine === 'all') return true;
    var flags = machineFlags(entry);
    return machine === 'lathe' ? flags.lathe : flags.mill;
  }

  function patchEntry(code, patch) {
    if (!Array.isArray(window.CNC_GM_CODES)) return;
    var entry = window.CNC_GM_CODES.find(function (item) { return entryCode(item) === code; });
    if (entry) Object.assign(entry, patch);
  }

  function patchData() {
    if (!Array.isArray(window.CNC_GM_CODES)) return false;
    patchEntry('G00', {
      summary:'让刀具以机床快速速度定位到目标坐标。快移轨迹通常不保证是一条直线，各轴到位时间可能不同。',
      beginner:'G00只负责快速到位，不用于正式切削；多轴快移前先把Z抬到安全高度。',
      warning:'不要在低位用G00同时移动多个轴。必须确认整条路径不会穿过工件、压板、虎钳或刀库。',
      example:'更安全的思路：G00 Z50.；再执行 G00 X100. Y50.。'
    });
    patchEntry('G84', {
      summary:'右旋攻丝固定循环。F值含义取决于G94/G95、主轴转速和机床刚性攻丝方式。',
      beginner:'先确认底孔、螺距、转速和进给模式，再写G84；不要把F值想当然地直接写成螺距。',
      warning:'G94下F通常按“转速×导程”理解；G95下F通常可按每转导程理解。部分系统还需要M29等指令，必须按本机说明书确认。',
      example:'结构示例：G95；S500 M03；G84 X0 Y0 Z-15. R2. F1.25。实际格式以机床为准。'
    });
    patchEntry('G90', { warning:'加工中心常表示绝对坐标；FANUC车床中也可能表示外径/内径切削循环。必须先确认机型。' });
    patchEntry('G98', { beginner:'加工中心钻孔循环中G98返回初始平面；车床中常表示每分钟进给。先选机型再理解。' });
    patchEntry('G99', { beginner:'加工中心钻孔循环中G99返回R平面；车床中常表示每转进给。先选机型再理解。' });

    EXTENSIONS.forEach(function (entry) {
      if (!window.CNC_GM_CODES.some(function (item) {
        return item.id === entry.id || entryCode(item) === entry.code;
      })) {
        window.CNC_GM_CODES.push(entry);
      }
    });
    return true;
  }

  function loadPreferences() {
    var current = getState();
    if (!current) return;
    current.gcodeMachine = localStorage.getItem(STORAGE_MACHINE) || current.gcodeMachine || 'mill';
    current.gcodeScope = localStorage.getItem(STORAGE_SCOPE) || current.gcodeScope || 'common';
    current.gcodeShowCustom = localStorage.getItem(STORAGE_CUSTOM) === '1';
  }

  function filterRows(rows) {
    var current = getState();
    if (!current || current.activeFilter !== 'gcode') return rows;
    var exact = exactCode(current.keyword);
    return rows.filter(function (entry) {
      if (exact && entryCode(entry) === exact) return true;
      if (!current.gcodeShowCustom && isCustom(entry)) return false;
      if ((current.gcodeScope || 'common') === 'common' && !COMMON_CODES.has(entryCode(entry))) return false;
      return machineMatches(entry, current.gcodeMachine || 'mill');
    }).sort(function (a,b) {
      if (exact) {
        if (entryCode(a) === exact && entryCode(b) !== exact) return -1;
        if (entryCode(b) === exact && entryCode(a) !== exact) return 1;
      }
      var aCommon = COMMON_CODES.has(entryCode(a)) ? 1 : 0;
      var bCommon = COMMON_CODES.has(entryCode(b)) ? 1 : 0;
      if (aCommon !== bCommon) return bCommon - aCommon;
      return entryCode(a).localeCompare(entryCode(b),'zh-CN',{numeric:true});
    });
  }

  function controlsHtml(current) {
    function active(value, target) { return value === target ? ' active' : ''; }
    return '<div class="gcode-mobile-controls" id="gcode-mobile-controls">' +
      '<div class="gcode-control-row"><span class="gcode-control-label">机型</span>' +
      '<button class="gcode-filter-chip'+active('mill',current.gcodeMachine)+'" data-gcode-machine="mill">加工中心</button>' +
      '<button class="gcode-filter-chip'+active('lathe',current.gcodeMachine)+'" data-gcode-machine="lathe">数控车床</button>' +
      '<button class="gcode-filter-chip'+active('all',current.gcodeMachine)+'" data-gcode-machine="all">全部</button></div>' +
      '<div class="gcode-control-row"><span class="gcode-control-label">范围</span>' +
      '<button class="gcode-filter-chip'+active('common',current.gcodeScope)+'" data-gcode-scope="common">现场常用</button>' +
      '<button class="gcode-filter-chip'+active('all',current.gcodeScope)+'" data-gcode-scope="all">全部标准</button>' +
      '<button class="gcode-filter-chip warning'+(current.gcodeShowCustom?' active':'')+'" data-gcode-custom="1">厂家扩展</button></div>' +
      '<div class="gcode-control-row gcode-quick-row"><span class="gcode-control-label">常查</span>' +
      QUICK_CODES.map(function (code) {
        return '<button class="gcode-quick-chip" data-gcode-quick="'+code+'">'+code+'</button>';
      }).join('') + '</div>' +
      '<div class="gcode-exact-hint" id="gcode-exact-hint"></div></div>';
  }

  function updateControls() {
    var current = getState();
    var host = document.getElementById('gcode-mobile-controls');
    if (!host || !current) return;
    host.querySelectorAll('[data-gcode-machine]').forEach(function (button) {
      button.classList.toggle('active', button.dataset.gcodeMachine === current.gcodeMachine);
    });
    host.querySelectorAll('[data-gcode-scope]').forEach(function (button) {
      button.classList.toggle('active', button.dataset.gcodeScope === current.gcodeScope);
    });
    var custom = host.querySelector('[data-gcode-custom]');
    if (custom) custom.classList.toggle('active', !!current.gcodeShowCustom);
    var hint = host.querySelector('#gcode-exact-hint');
    var exact = exactCode(current.keyword);
    if (hint) {
      hint.classList.toggle('visible', !!exact);
      hint.textContent = exact ? '已识别为 '+exact+'；按回车可直接打开详情。' : '';
    }
  }

  function bindControlEvents(host) {
    if (!host || host.__cncStableBound) return;
    host.__cncStableBound = true;
    host.addEventListener('click', function (event) {
      var button = event.target.closest('button');
      if (!button) return;
      var current = getState();
      if (!current) return;

      if (button.dataset.gcodeMachine) {
        current.gcodeMachine = button.dataset.gcodeMachine;
        localStorage.setItem(STORAGE_MACHINE,current.gcodeMachine);
        renderWorkspace();
        return;
      }
      if (button.dataset.gcodeScope) {
        current.gcodeScope = button.dataset.gcodeScope;
        localStorage.setItem(STORAGE_SCOPE,current.gcodeScope);
        renderWorkspace();
        return;
      }
      if (button.dataset.gcodeCustom) {
        current.gcodeShowCustom = !current.gcodeShowCustom;
        localStorage.setItem(STORAGE_CUSTOM,current.gcodeShowCustom?'1':'0');
        renderWorkspace();
        return;
      }
      if (button.dataset.gcodeQuick) {
        current.keyword = button.dataset.gcodeQuick;
        var input = document.getElementById('search-input');
        if (input) input.value = current.keyword;
        renderWorkspace();
        setTimeout(openExact,0);
      }
    });
  }

  function decorateWorkspace() {
    var current = getState();
    var view = document.getElementById('view-workspace');
    if (!current || !view) return;

    var active = current.activeFilter === 'gcode';
    view.classList.toggle('gcode-pro-mode',active);
    var existing = document.getElementById('gcode-mobile-controls');
    if (!active) {
      if (existing) existing.hidden = true;
      return;
    }

    current.workspaceMode = 'list';
    current.listRenderLimit = Math.min(Number(current.listRenderLimit || 50),30);

    var list = document.getElementById('result-list');
    if (list) list.classList.remove('visual-mode');
    var title = document.getElementById('workspace-title');
    if (title) title.textContent = 'G/M代码现场速查';
    var eyebrow = document.getElementById('workspace-eyebrow');
    if (eyebrow) eyebrow.textContent = 'FANUC STYLE · MOBILE QUICK LOOKUP';
    var input = document.getElementById('search-input');
    if (input) input.placeholder = '输入 G1、G01、M3、啄钻、攻牙…';

    var toolbar = view.querySelector('.search-toolbar');
    if (!existing && toolbar) {
      toolbar.insertAdjacentHTML('afterend',controlsHtml(current));
      existing = document.getElementById('gcode-mobile-controls');
      bindControlEvents(existing);
    }
    if (existing) {
      existing.hidden = false;
      updateControls();
    }

    if (list) {
      list.querySelectorAll('.result-card').forEach(function (card) {
        card.tabIndex = 0;
        card.setAttribute('role','button');
      });
    }
  }

  function openMobileDetail() {
    var panel = document.getElementById('detail-panel');
    if (!panel || window.innerWidth > 768) return;
    window.__CNC_STABLE_LIST_SCROLL__ = window.scrollY;
    panel.classList.add('mobile-open');
    panel.scrollTop = 0;
    document.body.classList.add('cnc-detail-open');
  }

  function closeMobileDetail() {
    var panel = document.getElementById('detail-panel');
    if (panel) panel.classList.remove('mobile-open','show-secondary');
    document.body.classList.remove('cnc-detail-open');
    setTimeout(function () {
      if (typeof window.__CNC_STABLE_LIST_SCROLL__ === 'number') {
        window.scrollTo(0,window.__CNC_STABLE_LIST_SCROLL__);
      }
    },0);
  }

  function quickFormat(entry) {
    return FORMAT_MAP[entryCode(entry)] || entry.example || '请以本机床说明书中的格式为准。';
  }

  function machineBadges(entry) {
    var flags = machineFlags(entry);
    var html = '';
    if (flags.mill) html += '<span class="cnc-pro-machine-badge">加工中心</span>';
    if (flags.lathe) html += '<span class="cnc-pro-machine-badge lathe">数控车床</span>';
    if (isCustom(entry) || /选项功能/.test(entryText(entry))) {
      html += '<span class="cnc-pro-machine-badge option">系统/厂家确认</span>';
    }
    return html;
  }

  function addBottomNav(panel) {
    var nav = panel.querySelector('.cnc-mobile-bottom-nav');
    if (nav) return;
    nav = document.createElement('div');
    nav.className = 'cnc-mobile-bottom-nav';
    nav.innerHTML = '<button data-cnc-bottom="prev">← 上一条</button>' +
      '<button class="primary" data-cnc-bottom="back">返回列表</button>' +
      '<button data-cnc-bottom="next">下一条 →</button>';
    panel.appendChild(nav);
    nav.querySelector('[data-cnc-bottom="back"]').onclick = closeMobileDetail;
    nav.querySelector('[data-cnc-bottom="prev"]').onclick = function () {
      var button = document.getElementById('detail-prev');
      if (button) button.click();
      panel.scrollTop = 0;
    };
    nav.querySelector('[data-cnc-bottom="next"]').onclick = function () {
      var button = document.getElementById('detail-next-button');
      if (button) button.click();
      panel.scrollTop = 0;
    };
  }

  function decorateDetail() {
    var current = getState();
    var panel = document.getElementById('detail-panel');
    if (!current || !panel || current.activeFilter !== 'gcode') return;
    var entry = current.entries.find(function (item) { return item.id === current.selectedId; });
    if (!entry || !isGM(entry)) return;

    var primary = panel.querySelector('.detail-card-primary');
    if (primary) {
      var badges = primary.querySelector('.cnc-pro-machine-badges');
      if (!badges) {
        badges = document.createElement('div');
        badges.className = 'cnc-pro-machine-badges';
        primary.appendChild(badges);
      }
      badges.innerHTML = machineBadges(entry);
    }

    var oldQuick = panel.querySelector('.cnc-pro-quick-card');
    if (oldQuick) oldQuick.remove();
    if (primary) {
      var quick = document.createElement('article');
      quick.className = 'detail-card cnc-pro-quick-card';
      quick.innerHTML = '<h4>⚡ 现场先看这四件事</h4>' +
        '<div class="cnc-pro-format">'+esc(quickFormat(entry))+'</div>' +
        '<p><strong>用途：</strong>'+esc(entry.usage || entry.summary || '')+'</p>' +
        '<p><strong>危险点：</strong>'+esc(entry.warning || '先空运行、单段和低倍率验证。')+'</p>' +
        '<div class="cnc-pro-source-note">适用范围：FANUC风格速查。不同机床厂家、系统代数和选项可能不同；高风险指令必须以本机说明书为准。</div>';
      primary.insertAdjacentElement('afterend',quick);
    }

    panel.querySelectorAll('.detail-card').forEach(function (card) {
      var heading = card.querySelector('h4');
      var text = heading ? heading.textContent : '';
      card.classList.toggle('cnc-mobile-secondary',/关联工具|参数联动|智能推荐|下一步学什么|知识库原文摘录|相关推荐/.test(text));
    });

    var grid = panel.querySelector('.detail-content-grid');
    var more = panel.querySelector('.cnc-detail-more');
    if (!more && grid) {
      more = document.createElement('button');
      more.type = 'button';
      more.className = 'cnc-detail-more';
      more.textContent = '展开更多资料与相关推荐';
      more.onclick = function () {
        panel.classList.toggle('show-secondary');
        more.textContent = panel.classList.contains('show-secondary') ? '收起扩展资料' : '展开更多资料与相关推荐';
      };
      grid.appendChild(more);
    } else if (more) {
      panel.classList.remove('show-secondary');
      more.textContent = '展开更多资料与相关推荐';
    }
    addBottomNav(panel);
  }

  function openExact() {
    var current = getState();
    var code = current && exactCode(current.keyword);
    if (!code) return false;
    var entry = current.entries.find(function (item) { return isGM(item) && entryCode(item) === code; });
    if (!entry) return false;
    current.selectedId = entry.id;
    renderWorkspace();
    renderDetail();
    openMobileDetail();
    return true;
  }

  function bindGlobalEvents() {
    if (globalEventsBound) return;
    globalEventsBound = true;

    document.addEventListener('keydown',function (event) {
      if (event.key !== 'Enter') return;
      if (event.target && event.target.id === 'search-input') {
        setTimeout(openExact,0);
      }
    },true);

    document.addEventListener('click',function (event) {
      var current = getState();
      if (!current || current.activeFilter !== 'gcode') return;

      var back = event.target.closest('#detail-back-btn,[data-cnc-bottom="back"]');
      if (back) {
        event.preventDefault();
        closeMobileDetail();
        return;
      }

      var card = event.target.closest('.result-card');
      if (card && !event.target.closest('button')) {
        var openButton = card.querySelector('[data-open-entry]');
        if (openButton) openButton.click();
        return;
      }

      var open = event.target.closest('[data-open-entry]');
      if (open) setTimeout(openMobileDetail,0);
    });
  }

  function patchFunctions() {
    if (typeof normalizeText !== 'function' ||
        typeof getFilteredEntries !== 'function' ||
        typeof renderWorkspace !== 'function' ||
        typeof renderDetail !== 'function' ||
        typeof navigate !== 'function') {
      return false;
    }

    originals.normalizeText = normalizeText;
    normalizeText = function (value) { return originals.normalizeText(canon(value)); };

    originals.getFilteredEntries = getFilteredEntries;
    getFilteredEntries = function () { return filterRows(originals.getFilteredEntries()); };

    originals.renderWorkspace = renderWorkspace;
    renderWorkspace = function () {
      var current = getState();
      if (current && current.activeFilter === 'gcode') current.workspaceMode = 'list';
      var result = originals.renderWorkspace.apply(this,arguments);
      decorateWorkspace();
      return result;
    };

    originals.renderDetail = renderDetail;
    renderDetail = function () {
      var result = originals.renderDetail.apply(this,arguments);
      decorateDetail();
      return result;
    };

    originals.navigate = navigate;
    navigate = function (view) {
      var current = getState();
      if (view === 'workspace' && current && current.activeFilter === 'gcode') {
        current.workspaceMode = 'list';
        current.listRenderLimit = 30;
      }
      var result = originals.navigate.apply(this,arguments);
      setTimeout(decorateWorkspace,0);
      return result;
    };
    return true;
  }

  function deepLink() {
    var current = getState();
    if (!current || typeof navigate !== 'function') return;
    var query = new URLSearchParams(window.location.search).get('q');
    if (!query) return;
    current.keyword = canon(query);
    current.activeFilter = 'gcode';
    current.selectedCategory = '全部栏目';
    current.workspaceMode = 'list';
    var input = document.getElementById('search-input');
    if (input) input.value = current.keyword;
    navigate('workspace');
    renderWorkspace();
    setTimeout(openExact,30);
  }

  function install() {
    if (window.__CNC_GM_STABLE_INSTALLED__) return true;
    if (!patchData()) return false;
    if (!getState()) return false;
    if (!patchFunctions()) return false;

    loadPreferences();
    bindGlobalEvents();
    window.__CNC_GM_STABLE_INSTALLED__ = BUILD;
    window.__CNC_GM_PRO_INSTALLED__ = BUILD;

    if (typeof renderAll === 'function') renderAll();
    decorateWorkspace();
    deepLink();
    return true;
  }

  var tries = 0;
  var timer = setInterval(function () {
    tries += 1;
    if (install() || tries > 120) clearInterval(timer);
  },100);

  window.addEventListener('load',function () {
    install();
    setTimeout(decorateWorkspace,100);
  });
})();
