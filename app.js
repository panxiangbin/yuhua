(function () {
  "use strict";
  var CATS = window.CATEGORIES || [];
  var PRODUCTS = window.PRODUCTS || [];

  // 各 key 数量
  var counts = {};
  PRODUCTS.forEach(function (p) { counts[p.key] = (counts[p.key] || 0) + 1; });

  // key -> 中文名
  var keyName = {};
  CATS.forEach(function (c) { keyName[c.key] = c.name; });
  keyName["misc"] = "其他设备";

  // ---------- 顶部统计 ----------
  document.getElementById("stat-models").textContent = PRODUCTS.length + "+";
  document.getElementById("stat-cats").textContent = CATS.length;
  document.getElementById("totalCount").textContent = PRODUCTS.length;

  // ---------- 分类卡片 ----------
  var grid = document.getElementById("catGrid");
  CATS.forEach(function (c) {
    var n = counts[c.key] || 0;
    var card = document.createElement("div");
    card.className = "cat-card";
    card.innerHTML =
      '<div class="cat-thumb"><span class="cat-count">' + n + ' 款</span>' +
      '<img loading="lazy" src="' + c.img + '" alt="' + c.name + '"></div>' +
      '<div class="cat-body"><h3>' + c.name + '</h3><p>' + c.desc + '</p>' +
      '<span class="cat-more">查看全部型号 →</span></div>';
    card.addEventListener("click", function () { filterTo(c.key); });
    grid.appendChild(card);
  });

  // ---------- 产品视频 ----------
  var VIDEOS = window.VIDEOS || [];
  var vgrid = document.getElementById("videoGrid");
  if (vgrid && VIDEOS.length) {
    VIDEOS.forEach(function (v) {
      var card = document.createElement("div");
      card.className = "video-card";
      card.innerHTML =
        '<video controls preload="none" playsinline poster="' + v.poster + '">' +
        '<source src="' + v.file + '" type="video/mp4"></video>' +
        '<div class="video-meta"><b>' + v.title + '</b><span>' + (v.sub || "") + '</span></div>';
      vgrid.appendChild(card);
    });
  } else if (vgrid) {
    var sec = document.getElementById("videos");
    if (sec) sec.style.display = "none";
  }

  // ---------- 筛选 chips ----------
  var chipsBox = document.getElementById("chips");
  var chipDefs = [{ key: "all", name: "全部" }].concat(
    CATS.map(function (c) { return { key: c.key, name: c.name }; })
  );
  if (counts["misc"]) chipDefs.push({ key: "misc", name: "其他设备" });

  var activeKey = "all";
  chipDefs.forEach(function (d) {
    var b = document.createElement("button");
    b.className = "chip" + (d.key === "all" ? " active" : "");
    b.textContent = d.name + (d.key === "all" ? "" : " (" + (counts[d.key] || 0) + ")");
    b.dataset.key = d.key;
    b.addEventListener("click", function () { setActive(d.key); render(); });
    chipsBox.appendChild(b);
  });

  function setActive(key) {
    activeKey = key;
    Array.prototype.forEach.call(chipsBox.children, function (b) {
      b.classList.toggle("active", b.dataset.key === key);
    });
  }

  // ---------- 表格渲染 ----------
  var body = document.getElementById("tableBody");
  var emptyTip = document.getElementById("emptyTip");
  var resultCount = document.getElementById("resultCount");
  var searchInput = document.getElementById("searchInput");

  function cell(v) { return v ? v : '<span class="muted">—</span>'; }
  function esc(s){ return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }

  var curRows = [];
  function render() {
    var q = (searchInput.value || "").trim().toLowerCase();
    curRows = PRODUCTS.filter(function (p) {
      if (activeKey !== "all" && p.key !== activeKey) return false;
      if (!q) return true;
      var hay = (p["型号"] + " " + p["产品名称"] + " " + p["类别"]).toLowerCase();
      return hay.indexOf(q) >= 0;
    });

    resultCount.textContent = curRows.length;
    if (!curRows.length) {
      body.innerHTML = ""; emptyTip.hidden = false; return;
    }
    emptyTip.hidden = true;

    var html = curRows.map(function (p, i) {
      var name = p["产品名称"] || keyName[p.key] || "";
      var specN = p.specs ? Object.keys(p.specs).length : 0;
      var btn = specN
        ? '<button class="spec-btn' + (p.rich ? ' rich' : '') + '" data-i="' + i + '">查看参数' +
          (p.rich ? ' ✦' : '') + '</button>'
        : '<span class="muted">—</span>';
      return '<tr data-i="' + i + '">' +
        '<td class="model">' + cell(p["型号"]) + "</td>" +
        '<td class="pname">' + (name ? esc(name) : '<span class="muted">—</span>') +
          '<br><span class="ptag">' + (keyName[p.key] || p["类别"]) + "</span></td>" +
        "<td>" + cell(p["材质"]) + "</td>" +
        "<td>" + cell(p["容量"]) + "</td>" +
        "<td>" + cell(p["控温范围"]) + "</td>" +
        "<td>" + btn + "</td>" +
        "</tr>";
    }).join("");
    body.innerHTML = html;
  }

  // ---------- 详细参数弹窗 ----------
  var mask = document.getElementById("modalMask");
  var imgByKey = {};
  CATS.forEach(function (c) { imgByKey[c.key] = c.img; });

  // 完整资料页映射: 先匹配 data.js 里的 detail 字段, 再按 PAGES 前缀匹配, 最后按分类兜底
  var _PAGES = window.PAGES || [];
  var _prefixMap = [];   // [{prefix, page}, ...]  按长度降序
  var _keyMap = {};      // key -> page (无前缀系列用分类兜底)
  _PAGES.forEach(function(pg) {
    if (pg.prefixes && pg.prefixes.length) {
      pg.prefixes.forEach(function(pf) {
        _prefixMap.push({ prefix: pf.toUpperCase(), page: pg.page });
      });
    }
    // 所有页面都参与分类兜底(有前缀的也加入, 供无法匹配前缀的同类产品使用)
    if (!_keyMap[pg.key]) _keyMap[pg.key] = pg.page;
  });
  _prefixMap.sort(function(a, b) { return b.prefix.length - a.prefix.length; });

  function getDetail(p) {
    if (p.detail) return p.detail;
    var m = (p["型号"] || "").toUpperCase();
    for (var i = 0; i < _prefixMap.length; i++) {
      if (m.indexOf(_prefixMap[i].prefix) === 0) return _prefixMap[i].page;
    }
    // 分类兜底 — 同类任意详情页均可引路
    if (p.key && _keyMap[p.key]) return _keyMap[p.key];
    return "";
  }

  function openModal(p) {
    document.getElementById("mTitle").textContent = p["型号"] || (p["产品名称"] || "产品参数");
    var dEl = document.getElementById("mDetail");
    var durl = getDetail(p);
    dEl.innerHTML = durl
      ? '<a class="full-doc-btn" href="' + durl + '" target="_blank" rel="noopener">📄 查看完整产品资料（含完整对比参数表 · 可下载 Word / PDF）</a>'
      : "";
    document.getElementById("mName").textContent = p["产品名称"] || "";
    document.getElementById("mCat").textContent = keyName[p.key] || p["类别"] || "";
    var img = document.getElementById("mImg");
    if (imgByKey[p.key]) { img.src = imgByKey[p.key]; img.style.display = ""; }
    else { img.style.display = "none"; }

    var sp = p.specs || {};
    var rows = Object.keys(sp).map(function (k) {
      return "<tr><th>" + esc(k) + "</th><td>" + esc(sp[k]) + "</td></tr>";
    }).join("");
    document.getElementById("mSpecs").innerHTML = rows ||
      '<tr><td class="muted">暂无更多参数，详情请咨询销售</td></tr>';

    var sell = p.selling || [];
    var wrap = document.getElementById("mSellingWrap");
    if (sell.length) {
      wrap.hidden = false;
      document.getElementById("mSelling").innerHTML =
        sell.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("");
    } else { wrap.hidden = true; }

    mask.hidden = false;
    document.body.style.overflow = "hidden";
  }
  function closeModal() { mask.hidden = true; document.body.style.overflow = ""; }

  body.addEventListener("click", function (e) {
    var tr = e.target.closest("tr[data-i]");
    if (!tr) return;
    var p = curRows[+tr.dataset.i];
    if (p) openModal(p);
  });
  document.getElementById("modalClose").addEventListener("click", closeModal);
  mask.addEventListener("click", function (e) { if (e.target === mask) closeModal(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeModal(); });

  function filterTo(key) {
    setActive(key);
    searchInput.value = "";
    render();
    document.getElementById("catalog").scrollIntoView({ behavior: "smooth" });
  }

  var t;
  searchInput.addEventListener("input", function () {
    clearTimeout(t); t = setTimeout(render, 120);
  });

  render();

  // ---------- 规格书查询 ----------
  var SPECS = window.SPECS || [];
  var specBody = document.getElementById("specBody");
  var specSearch = document.getElementById("specSearch");
  var specResultCount = document.getElementById("specResultCount");
  var specEmptyTip = document.getElementById("specEmptyTip");
  var specCount = document.getElementById("specCount");
  if (specCount) specCount.textContent = SPECS.length;

  // 品类筛选 chips
  var specChips = document.getElementById("specChips");
  var specKey = "all";
  var specKeyNames = {
    "all":"全部","glass_reactor":"反应釜","hilo_circ":"高低温","rotary":"旋转蒸发",
    "chiller":"低温冷却","hp_reactor":"高压釜","hi_circ":"高温循环",
    "vacuum":"真空泵","mag_stir":"磁力搅拌","elec_stir":"电动搅拌",
    "mol_dist":"分子蒸馏","bath":"恒温槽","others":"其他","misc":"其他"
  };
  if (specChips) {
    var specKeyCounts = {};
    SPECS.forEach(function(s){ specKeyCounts[s.key] = (specKeyCounts[s.key]||0)+1; });
    var specChipDefs = [["all","全部"]];
    ["glass_reactor","hilo_circ","rotary","chiller","hp_reactor","hi_circ",
     "vacuum","mag_stir","elec_stir","mol_dist","bath","others"].forEach(function(k){
      if (specKeyCounts[k]) specChipDefs.push([k, specKeyNames[k]||k]);
    });
    specChipDefs.forEach(function(d){
      var b = document.createElement("button");
      b.className = "chip" + (d[0]==="all"?" active":"");
      b.textContent = d[1] + (d[0]==="all" ? "" : " ("+( specKeyCounts[d[0]]||0)+")");
      b.dataset.key = d[0];
      b.addEventListener("click", function(){
        specKey = d[0];
        Array.prototype.forEach.call(specChips.children, function(x){
          x.classList.toggle("active", x.dataset.key===d[0]);
        });
        renderSpecs();
      });
      specChips.appendChild(b);
    });
  }

  function renderSpecs() {
    if (!specBody) return;
    var q = (specSearch ? specSearch.value || "" : "").trim().toLowerCase();
    var rows = SPECS.filter(function(s){
      if (specKey !== "all" && s.key !== specKey) return false;
      if (!q) return true;
      return (s.title+s.series+s.model).toLowerCase().indexOf(q) >= 0;
    });
    if (specResultCount) specResultCount.textContent = rows.length;
    if (!rows.length) {
      specBody.innerHTML = "";
      if (specEmptyTip) specEmptyTip.hidden = false;
      return;
    }
    if (specEmptyTip) specEmptyTip.hidden = true;
    // 只渲染前200条避免卡顿
    var show = rows.slice(0, 200);
    specBody.innerHTML = show.map(function(s){
      return '<tr>' +
        '<td class="model">' + esc(s.model || s.title.slice(0,20)) + '</td>' +
        '<td class="pname">' + esc(s.title) + '<br><span class="ptag">' + esc(s.series) + '</span></td>' +
        '<td><a class="spec-btn rich" href="' + s.page + '" target="_blank">查看</a></td>' +
        '<td><a class="spec-btn" href="' + s.dl + '" download>⬇ Word</a></td>' +
        '</tr>';
    }).join('');
    if (rows.length > 200) {
      specBody.innerHTML += '<tr><td colspan="4" style="text-align:center;color:#888;padding:12px">显示前200条，请输入关键词缩小范围（共'+(rows.length)+'条）</td></tr>';
    }
  }

  if (specSearch) {
    var st;
    specSearch.addEventListener("input", function(){ clearTimeout(st); st = setTimeout(renderSpecs, 150); });
  }
  renderSpecs();

  // ---------- 返回顶部 ----------
  var toTop = document.getElementById("toTop");
  window.addEventListener("scroll", function () {
    toTop.classList.toggle("show", window.scrollY > 600);
  });
  toTop.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
})();
