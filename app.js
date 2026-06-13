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

  function render() {
    var q = (searchInput.value || "").trim().toLowerCase();
    var rows = PRODUCTS.filter(function (p) {
      if (activeKey !== "all" && p.key !== activeKey) return false;
      if (!q) return true;
      var hay = (p["型号"] + " " + p["产品名称"] + " " + p["类别"]).toLowerCase();
      return hay.indexOf(q) >= 0;
    });

    resultCount.textContent = rows.length;
    if (!rows.length) {
      body.innerHTML = ""; emptyTip.hidden = false; return;
    }
    emptyTip.hidden = true;

    var html = rows.map(function (p) {
      var name = p["产品名称"] || keyName[p.key] || "";
      return "<tr>" +
        '<td class="model">' + cell(p["型号"]) + "</td>" +
        '<td class="pname">' + (name ? name : '<span class="muted">—</span>') +
          '<br><span class="ptag">' + (keyName[p.key] || p["类别"]) + "</span></td>" +
        "<td>" + cell(p["材质"]) + "</td>" +
        "<td>" + cell(p["容量"]) + "</td>" +
        "<td>" + cell(p["功率"]) + "</td>" +
        "<td>" + cell(p["控温范围"]) + "</td>" +
        "<td>" + cell(p["电源"]) + "</td>" +
        "</tr>";
    }).join("");
    body.innerHTML = html;
  }

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

  // ---------- 返回顶部 ----------
  var toTop = document.getElementById("toTop");
  window.addEventListener("scroll", function () {
    toTop.classList.toggle("show", window.scrollY > 600);
  });
  toTop.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
})();
