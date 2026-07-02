const FAVORITES_KEY = "cnc_app_favorites_v2";
const RECENTS_KEY = "cnc_app_recents_v2";
const ACCESS_KEY = "cnc_app_access_code_v1";
const ACCESS_PUBLIC_URL = "https://panxiangbin.github.io/yuhua/cnc/";

const ACCESS_PROFILES = [
  {
    id: "follower",
    label: "粉丝通道",
    note: "适合发给短视频、私信和直播间来的用户。",
    code: "xp-cnc-follower-2026",
    hash: "777e786b45a748acbc713590faef41adc4ebf63b4909c1d2572230ceed968d11"
  },
  {
    id: "vip",
    label: "深度资料通道",
    note: "适合发给老客户、学员或需要长期复看的人。",
    code: "xp-cnc-vip-2026",
    hash: "6da79cd92ce1b9aa57bc55e1e7d34b392092cf5415ddc55dff10c471b1b445c6"
  },
  {
    id: "legacy",
    label: "旧版通行码",
    note: "兼容你之前已经发出去的老链接，不影响旧用户继续打开。",
    code: "XIAOPAN-CNC-2026",
    hash: "223082a7d8f14cc5a31a3c01d5b25909209f2b5fd99941ac0b4e61b3791113b1"
  }
];

const ACCESS_HASHES = new Set([
  "1b6770645ff5c012ec4f8188e03612031eb55f651610df4a818924c0c6d2239e",
  ...ACCESS_PROFILES.map((item) => item.hash)
]);

const VIEW_META = {
  dashboard: { kicker: "总览面板", title: "把网页改成像软件一样用" },
  study: { kicker: "新手路线", title: "先按顺序学，再单点深入" },
  workspace: { kicker: "快速查询", title: "左边找条目，右边看详情" },
  gallery: { kicker: "Gemini 图卡", title: "先把图片真正接进网页" },
  calculator: { kicker: "参数换算", title: "把常用计算做成独立工作区" },
  library: { kicker: "本地知识库", title: "逐步把本地数据库接进网页" },
  favorites: { kicker: "学习记录", title: "最近查看和收藏会保留下来" },
  access: { kicker: "访问控制", title: "只让你想让进的人进入资料区" }
};

const FILTER_META = {
  all: { label: "全部条目" },
  gcode: { label: "G代码 / M代码" },
  params: { label: "参数 / 报警 / 故障" },
  operation: { label: "机床操作 / 回零 / 对刀" },
  tooling: { label: "刀具 / 工艺 / 材料" },
  drawing: { label: "图纸 / 量具 / 质量" },
  cases: { label: "案例 / 实战" }
};

const QUICK_TERMS = ["G02", "G54", "1815", "回零", "对刀", "报警", "G83", "G84", "螺距"];

const KNOWLEDGE_SOURCES = [
  { id: "knowledge-core-01", src: "./knowledge-core-01.js", label: "核心包 01" },
  { id: "knowledge-core-02", src: "./knowledge-core-02.js", label: "核心包 02" },
  { id: "knowledge-core-03", src: "./knowledge-core-03.js", label: "核心包 03" }
];

const FULL_ARCHIVE_SOURCES = [
  { id: "knowledge-full-01", src: "./knowledge-full-01.js", label: "完整索引 01" },
  { id: "knowledge-full-02", src: "./knowledge-full-02.js", label: "完整索引 02" },
  { id: "knowledge-full-03", src: "./knowledge-full-03.js", label: "完整索引 03" },
  { id: "knowledge-full-04", src: "./knowledge-full-04.js", label: "完整索引 04" },
  { id: "knowledge-full-05", src: "./knowledge-full-05.js", label: "完整索引 05" },
  { id: "knowledge-full-06", src: "./knowledge-full-06.js", label: "完整索引 06" },
  { id: "knowledge-full-07", src: "./knowledge-full-07.js", label: "完整索引 07" },
  { id: "knowledge-full-08", src: "./knowledge-full-08.js", label: "完整索引 08" }
];

const state = {
  entries: [],
  baseEntries: [],
  archiveEntries: [],
  activeView: "dashboard",
  activeFilter: "all",
  selectedCategory: "全部栏目",
  keyword: "",
  selectedId: null,
  favorites: [],
  recents: [],
  accessGranted: false,
  accessProfileLabel: "",
  loadedScripts: new Set(),
  coreLoaded: false,
  fullLocalLoaded: false,
  libraryLogs: []
};

const dom = {
  gate: document.querySelector("#access-gate"),
  accessForm: document.querySelector("#access-form"),
  accessInput: document.querySelector("#access-code-input"),
  accessMessage: document.querySelector("#access-message"),
  accessShareStatus: document.querySelector("#access-share-status"),
  accessPublicUrl: document.querySelector("#access-public-url"),
  copyPublicUrl: document.querySelector("#copy-public-url"),
  accessShareLinks: document.querySelector("#access-share-links"),
  lockPill: document.querySelector("#lock-pill"),
  knowledgePill: document.querySelector("#knowledge-pill"),
  treeNav: document.querySelector("#tree-nav"),
  sidebar: document.querySelector("#sidebar"),
  sidebarMask: document.querySelector("#sidebar-mask"),
  sidebarOpen: document.querySelector("#sidebar-open"),
  sidebarClose: document.querySelector("#sidebar-close"),
  topbarKicker: document.querySelector("#topbar-kicker"),
  topbarTitle: document.querySelector("#topbar-title"),
  heroMetrics: document.querySelector("#hero-metrics"),
  dashboardGalleryGrid: document.querySelector("#dashboard-gallery-grid"),
  categorySelect: document.querySelector("#category-select"),
  presetChipRow: document.querySelector("#preset-chip-row"),
  knowledgeChipRow: document.querySelector("#knowledge-chip-row"),
  searchInput: document.querySelector("#search-input"),
  searchMeta: document.querySelector("#search-meta"),
  resultList: document.querySelector("#result-list"),
  workspaceStatus: document.querySelector("#workspace-status"),
  detailTitle: document.querySelector("#detail-title"),
  detailCategory: document.querySelector("#detail-category"),
  detailCode: document.querySelector("#detail-code"),
  detailSummary: document.querySelector("#detail-summary"),
  detailBeginner: document.querySelector("#detail-beginner"),
  detailUsage: document.querySelector("#detail-usage"),
  detailWarning: document.querySelector("#detail-warning"),
  detailExample: document.querySelector("#detail-example"),
  detailNext: document.querySelector("#detail-next"),
  detailRisk: document.querySelector("#detail-risk"),
  detailSource: document.querySelector("#detail-source"),
  detailImageCard: document.querySelector("#detail-image-card"),
  detailImageTitle: document.querySelector("#detail-image-title"),
  detailImageCaption: document.querySelector("#detail-image-caption"),
  detailImageStage: document.querySelector("#detail-image-stage"),
  relatedLinks: document.querySelector("#related-links"),
  galleryGrid: document.querySelector("#gallery-grid"),
  favoriteToggle: document.querySelector("#favorite-toggle"),
  recentLinks: document.querySelector("#recent-links"),
  favoriteLinks: document.querySelector("#favorite-links"),
  baseCount: document.querySelector("#base-count"),
  coreCount: document.querySelector("#core-count"),
  archiveCount: document.querySelector("#archive-count"),
  loadCoreButton: document.querySelector("#load-core-library"),
  loadFullButton: document.querySelector("#load-full-library"),
  libraryLog: document.querySelector("#library-log")
};

function readStorage(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

function writeStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeText(value = "") {
  return String(value)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/g0?2/g, "g02")
    .replace(/g0?3/g, "g03")
    .replace(/\s+/g, " ")
    .trim();
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function logLibrary(message) {
  state.libraryLogs = [message, ...state.libraryLogs].slice(0, 10);
  renderLibraryLog();
}

function renderLibraryLog() {
  dom.libraryLog.innerHTML = state.libraryLogs.length
    ? state.libraryLogs.map((item) => `<div class="library-log-item">${escapeHtml(item)}</div>`).join("")
    : `<div class="library-log-item">还没有开始加载，当前先使用基础条目。</div>`;
}

function getPublicBaseUrl() {
  if (window.location.protocol === "file:") {
    return ACCESS_PUBLIC_URL;
  }

  const url = new URL(window.location.href);
  url.hash = "";
  url.search = "";
  return url.toString();
}

function buildInviteUrl(code) {
  const url = new URL(getPublicBaseUrl());
  url.searchParams.set("invite", code);
  return url.toString();
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    const input = document.createElement("textarea");
    input.value = text;
    input.setAttribute("readonly", "readonly");
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.appendChild(input);
    input.select();
    const ok = document.execCommand("copy");
    input.remove();
    return ok;
  }
}

function renderAccessCenter() {
  if (!dom.accessPublicUrl || !dom.accessShareLinks || !dom.copyPublicUrl || !dom.accessShareStatus) return;

  const publicUrl = getPublicBaseUrl();
  dom.accessPublicUrl.textContent = publicUrl;
  dom.accessShareStatus.textContent = state.accessGranted
    ? "当前设备已经授权，可以直接查看完整资料。下面这些链接现在可以直接发给别人。"
    : "正式公网入口已经固定好。别人先打开这个网址，再通过你给的邀请码或授权链接进入。";

  dom.accessShareLinks.innerHTML = ACCESS_PROFILES.map((profile) => {
    const inviteUrl = buildInviteUrl(profile.code);
    return `
      <article class="share-link-card">
        <div>
          <h4>${escapeHtml(profile.label)}</h4>
          <p>${escapeHtml(profile.note)}</p>
        </div>
        <div class="share-link-meta">
          <span class="badge">${escapeHtml(profile.id)}</span>
          <span class="badge level">已预设授权入口</span>
        </div>
        <code>${escapeHtml(inviteUrl)}</code>
        <div class="share-link-actions">
          <button class="ghost-button" data-copy-link="${escapeHtml(inviteUrl)}" type="button">复制授权链接</button>
          <button class="ghost-button" data-copy-code="${escapeHtml(profile.code)}" type="button">复制邀请码</button>
        </div>
      </article>
    `;
  }).join("");

  dom.copyPublicUrl.onclick = async () => {
    const ok = await copyText(publicUrl);
    dom.accessShareStatus.textContent = ok ? "正式公网地址已复制。" : "复制失败，请手动复制正式公网地址。";
  };

  dom.accessShareLinks.querySelectorAll("[data-copy-link]").forEach((button) => {
    button.addEventListener("click", async () => {
      const ok = await copyText(button.dataset.copyLink || "");
      dom.accessShareStatus.textContent = ok ? "授权链接已复制，可以直接发给别人。" : "复制失败，请手动复制授权链接。";
    });
  });

  dom.accessShareLinks.querySelectorAll("[data-copy-code]").forEach((button) => {
    button.addEventListener("click", async () => {
      const ok = await copyText(button.dataset.copyCode || "");
      dom.accessShareStatus.textContent = ok ? "邀请码已复制。" : "复制失败，请手动复制邀请码。";
    });
  });
}

function collectSources() {
  const merged = [
    ...safeArray(window.CNC_DATA),
    ...safeArray(window.CNC_KB_EXTRA),
    ...safeArray(window.CNC_KB_CORE_CHUNK_01),
    ...safeArray(window.CNC_KB_CORE_CHUNK_02),
    ...safeArray(window.CNC_KB_CORE_CHUNK_03),
    ...safeArray(window.CNC_KB_FULL_CHUNK_01),
    ...safeArray(window.CNC_KB_FULL_CHUNK_02),
    ...safeArray(window.CNC_KB_FULL_CHUNK_03),
    ...safeArray(window.CNC_KB_FULL_CHUNK_04),
    ...safeArray(window.CNC_KB_FULL_CHUNK_05),
    ...safeArray(window.CNC_KB_FULL_CHUNK_06),
    ...safeArray(window.CNC_KB_FULL_CHUNK_07),
    ...safeArray(window.CNC_KB_FULL_CHUNK_08),
    ...safeArray(window.CNC_KB_README_INDEX)
  ];

  const map = new Map();
  merged.forEach((entry) => {
    if (!entry || !entry.id) return;
    map.set(entry.id, normalizeEntry(entry));
  });
  return [...map.values()];
}

function normalizeEntry(entry) {
  return {
    id: entry.id,
    category: entry.category || "未分类",
    title: entry.title || entry.code || entry.id,
    code: entry.code || entry.title || entry.id,
    summary: entry.summary || "这条内容当前只有入口索引，后续会继续补更完整说明。",
    usage: entry.usage || "适合从关键词进入，再继续细看。",
    beginner: entry.beginner || "先理解它是干什么的，再去记参数或代码。",
    warning: entry.warning || "先判断风险，再决定是否动参数、改程序或继续运行。",
    example: entry.example || inferExample(entry),
    nextLearn: entry.nextLearn || inferNextLearn(entry),
    risk: entry.risk || "中",
    source: entry.source || "站内整理",
    tags: safeArray(entry.tags).filter(Boolean),
    aliases: safeArray(entry.aliases).filter(Boolean)
  };
}

function inferExample(entry) {
  const code = String(entry.code || "");
  const title = String(entry.title || "");
  if (code.includes("G00") || code.includes("G01")) return "G00 X50 Z5\nG01 Z0 F0.2\nG01 X30";
  if (code.includes("G02") || code.includes("G03")) return "G01 X20 Z0\nG02 X30 Z-10 R10";
  if (code.includes("G54")) return "G54\nG00 X0 Y0\nG43 H01 Z50";
  if (code.includes("G81") || code.includes("G83")) return "G98 G83 Z-25 R2 Q3 F120";
  if (code.includes("G84")) return "G84 Z-20 R2 F1.5";
  if (title.includes("对刀")) return "回零 → 找基准 → 录工件坐标 → 空运行检查";
  if (title.includes("回零")) return "开机后先确认状态，再执行回参考点";
  if (title.includes("报警")) return "先看报警发生在什么动作之后，再看编号和类别";
  return "先看它在现场解决什么问题，再继续看公式、代码或参数。";
}

function inferNextLearn(entry) {
  const code = String(entry.code || "");
  const title = String(entry.title || "");
  if (code.includes("G00") || code.includes("G01")) return "下一步建议继续看 G02 / G03。";
  if (code.includes("G02") || code.includes("G03")) return "下一步建议继续看 G17/G18/G19 与 G41/G42。";
  if (code.includes("G54")) return "下一步建议继续看对刀和刀长补偿。";
  if (title.includes("对刀")) return "下一步建议继续看工件坐标和刀补。";
  if (title.includes("报警")) return "下一步建议继续看伺服、主轴、限位、换刀几个具体入口。";
  return "下一步建议继续看同一栏目下最常用、最容易出问题的高频内容。";
}

function getFeaturedImages(entryId) {
  const source = window.CNC_FEATURED_IMAGES || {};
  const images = source[entryId];
  return Array.isArray(images) ? images : [];
}

function getGalleryLibrary() {
  return Array.isArray(window.CNC_GALLERY_LIBRARY) ? window.CNC_GALLERY_LIBRARY : [];
}

function getEntryText(entry) {
  return [
    entry.id,
    entry.category,
    entry.title,
    entry.code,
    entry.summary,
    entry.usage,
    entry.beginner,
    entry.warning,
    entry.source,
    ...entry.tags,
    ...entry.aliases
  ]
    .filter(Boolean)
    .join(" ");
}

function filterKeyMatches(entry, key) {
  if (key === "all") return true;
  const hay = normalizeText(getEntryText(entry));
  if (key === "gcode") return /g\d+|m\d+/.test(hay) || hay.includes("编程") || hay.includes("代码");
  if (key === "params") return hay.includes("参数") || hay.includes("报警") || hay.includes("故障") || hay.includes("维修");
  if (key === "operation") return hay.includes("回零") || hay.includes("对刀") || hay.includes("机床操作") || hay.includes("坐标");
  if (key === "tooling") return hay.includes("刀具") || hay.includes("工艺") || hay.includes("材料") || hay.includes("切削");
  if (key === "drawing") return hay.includes("图纸") || hay.includes("量具") || hay.includes("检测") || hay.includes("质量");
  if (key === "cases") return hay.includes("案例") || hay.includes("实战");
  return true;
}

function matchesKeyword(entry, keyword) {
  if (!keyword) return true;
  const parts = normalizeText(keyword).split(/\s+/).filter(Boolean);
  const hay = normalizeText(getEntryText(entry));
  return parts.every((part) => hay.includes(part));
}

function scoreEntry(entry, keyword) {
  const q = normalizeText(keyword);
  if (!q) return 0;
  const title = normalizeText(entry.title);
  const code = normalizeText(entry.code);
  const tags = entry.tags.map(normalizeText);
  const aliases = entry.aliases.map(normalizeText);
  let score = 0;
  if (code === q) score += 140;
  if (title === q) score += 120;
  if (aliases.includes(q)) score += 100;
  if (tags.includes(q)) score += 90;
  if (code.includes(q)) score += 70;
  if (title.includes(q)) score += 60;
  if (normalizeText(entry.summary).includes(q)) score += 20;
  return score;
}

function getFilteredEntries() {
  const keyword = state.keyword.trim();
  return state.entries
    .filter((entry) => filterKeyMatches(entry, state.activeFilter))
    .filter((entry) => state.selectedCategory === "全部栏目" || entry.category === state.selectedCategory)
    .filter((entry) => matchesKeyword(entry, keyword))
    .sort((a, b) => scoreEntry(b, keyword) - scoreEntry(a, keyword));
}

function touchRecent(id) {
  state.recents = [id, ...state.recents.filter((item) => item !== id)].slice(0, 10);
  writeStorage(RECENTS_KEY, state.recents);
  renderProgressLinks();
}

function toggleFavorite() {
  const id = state.selectedId;
  if (!id) return;
  if (state.favorites.includes(id)) {
    state.favorites = state.favorites.filter((item) => item !== id);
  } else {
    state.favorites = [id, ...state.favorites.filter((item) => item !== id)].slice(0, 20);
  }
  writeStorage(FAVORITES_KEY, state.favorites);
  renderFavoriteButton();
  renderProgressLinks();
}

function levelLabel(entry) {
  const hay = normalizeText(getEntryText(entry));
  if (hay.includes("高风险") || entry.risk === "高") return "高风险";
  if (hay.includes("新手") || hay.includes("入门")) return "新手优先";
  return "常用";
}

function findRelated(entry) {
  if (!entry) return [];
  return state.entries
    .filter((item) => item.id !== entry.id)
    .map((item) => {
      const sharedTags = item.tags.filter((tag) => entry.tags.includes(tag)).length;
      const sameCategory = item.category === entry.category ? 2 : 0;
      return { item, score: sharedTags + sameCategory };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((item) => item.item);
}

function navigate(view, options = {}) {
  state.activeView = view;
  if (options.filter) {
    state.activeFilter = options.filter;
    state.selectedCategory = "全部栏目";
  }
  if (options.keyword !== undefined) {
    state.keyword = options.keyword;
    state.selectedCategory = "全部栏目";
  }

  document.querySelectorAll(".view").forEach((node) => {
    node.classList.toggle("active", node.id === `view-${view}`);
  });

  const meta = VIEW_META[view] || VIEW_META.dashboard;
  dom.topbarKicker.textContent = meta.kicker;
  dom.topbarTitle.textContent = meta.title;

  document.querySelectorAll(".tree-parent, .tree-item").forEach((button) => {
    const isSameView = button.dataset.route === view;
    const sameFilter = !button.dataset.filter || button.dataset.filter === state.activeFilter;
    button.classList.toggle("active", isSameView && sameFilter);
  });

  if (view === "workspace") {
    dom.searchInput.value = state.keyword;
    renderWorkspace();
  }

  if (view === "gallery") renderGalleryRich();
  if (view === "library") renderLibraryStats();
  if (view === "favorites") renderProgressLinks();
  closeSidebar();
}

function closeSidebar() {
  dom.sidebar.classList.remove("open");
  dom.sidebarMask.hidden = true;
}

function openSidebar() {
  dom.sidebar.classList.add("open");
  dom.sidebarMask.hidden = false;
}

function buildCategorySelect() {
  const categories = ["全部栏目", ...new Set(state.entries.map((entry) => entry.category))];
  dom.categorySelect.innerHTML = categories
    .map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
    .join("");
  dom.categorySelect.value = state.selectedCategory;
}

function renderPresetChips() {
  dom.presetChipRow.innerHTML = [
    { value: "all", label: "全部" },
    ...Object.entries(FILTER_META).filter(([key]) => key !== "all").map(([value, item]) => ({ value, label: item.label }))
  ]
    .map((item) => `<button class="chip${item.value === state.activeFilter ? " active" : ""}" data-filter-chip="${item.value}" type="button">${escapeHtml(item.label)}</button>`)
    .join("");
}

function renderKnowledgeChips() {
  dom.knowledgeChipRow.innerHTML = QUICK_TERMS
    .map((term) => `<button class="chip soft" data-quick-term="${escapeHtml(term)}" type="button">${escapeHtml(term)}</button>`)
    .join("");
}

function renderHeroMetrics() {
  const total = state.entries.length;
  const withImages = Object.keys(window.CNC_FEATURED_IMAGES || {}).length;
  const base = state.baseEntries.length;
  const archive = state.archiveEntries.length;

  dom.heroMetrics.innerHTML = `
    <article class="hero-metric">
      <span class="card-kicker">当前可查</span>
      <strong>${total}</strong>
      <p>已经进入网页可查的条目总数。</p>
    </article>
    <article class="hero-metric">
      <span class="card-kicker">基础结构化条目</span>
      <strong>${base}</strong>
      <p>来自速查表与补充条目的初始数据。</p>
    </article>
    <article class="hero-metric">
      <span class="card-kicker">带图条目</span>
      <strong>${withImages}</strong>
      <p>首批 Gemini 图片已经直接绑定到对应知识点。</p>
    </article>
    <article class="hero-metric">
      <span class="card-kicker">扩展知识包</span>
      <strong>${archive || "待并入"}</strong>
      <p>本地大知识库会按包和按块继续接入。</p>
    </article>
  `;
}

function renderWorkspace() {
  const filtered = getFilteredEntries();
  const activeFilterLabel = FILTER_META[state.activeFilter]?.label || "全部条目";
  const categoryLabel = state.selectedCategory === "全部栏目" ? "全部栏目" : state.selectedCategory;
  const archiveNote = state.fullLocalLoaded
    ? `已接入完整本地索引 ${state.archiveEntries.length} 条。`
    : state.coreLoaded
      ? `已接入核心知识包 ${state.archiveEntries.length} 条。`
      : "当前先使用基础条目，超大知识包可按需继续加载。";

  dom.workspaceStatus.textContent = archiveNote;
  dom.searchMeta.textContent = `当前命中 ${filtered.length} 条，模块为：${activeFilterLabel}；栏目为：${categoryLabel}。基础条目 ${state.baseEntries.length} 条，扩展知识条目 ${state.archiveEntries.length} 条。`;

  if (filtered.length && !filtered.some((entry) => entry.id === state.selectedId)) {
    state.selectedId = filtered[0].id;
  }

  dom.resultList.innerHTML = filtered.length
    ? filtered.slice(0, 120).map((entry) => `
      <article class="result-card${entry.id === state.selectedId ? " selected" : ""}">
        <div class="result-top">
          <div class="result-badges">
            <span class="badge">${escapeHtml(entry.category)}</span>
            <span class="badge level">${escapeHtml(levelLabel(entry))}</span>
          </div>
          <strong>${escapeHtml(entry.code)}</strong>
        </div>
        <h4>${escapeHtml(entry.title)}</h4>
        <p>${escapeHtml(entry.summary)}</p>
        <div class="result-tags">${entry.tags.slice(0, 6).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
        <button class="result-button" data-open-entry="${escapeHtml(entry.id)}" type="button">查看详情</button>
      </article>
    `).join("")
    : `<article class="result-card"><h4>没有找到匹配项</h4><p>可以试试搜：G02、1815、回零、对刀、报警、G84、螺距。</p></article>`;

  dom.resultList.querySelectorAll("[data-open-entry]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedId = button.dataset.openEntry;
      renderWorkspace();
      renderDetail();
    });
  });

  renderFavoriteButton();
  renderDetail();
  renderPresetChips();
  renderKnowledgeChips();
  dom.categorySelect.value = state.selectedCategory;
}

function renderFavoriteButton() {
  const active = state.favorites.includes(state.selectedId);
  dom.favoriteToggle.textContent = active ? "取消收藏这条内容" : "收藏这条内容";
}

function renderDetail() {
  const entry = state.entries.find((item) => item.id === state.selectedId);
  if (!entry) {
    dom.detailTitle.textContent = "点左边条目进入详情";
    dom.detailCategory.textContent = "学习条目";
    dom.detailCode.textContent = "请选择左侧内容";
    dom.detailSummary.textContent = "这里会告诉你它是什么、什么时候查、最容易错在哪。";
    dom.detailBeginner.textContent = "先把概念和场景看懂，再去记参数和代码。";
    dom.detailUsage.textContent = "碰到不懂的代码、参数、报警或工艺词时，先来这里定位方向。";
    dom.detailWarning.textContent = "很多问题不是不会查，而是查到之后不知道怎么判断风险。";
    dom.detailExample.textContent = "先从简单直线、圆弧、对刀、回零这些主题开始。";
    dom.detailNext.textContent = "学完这一条，再进入和它最相关的下一组内容。";
    dom.detailRisk.textContent = "未选择";
    dom.detailSource.textContent = "等待选择";
    dom.detailImageCard.hidden = true;
    dom.relatedLinks.innerHTML = "";
    return;
  }

  touchRecent(entry.id);
  dom.detailTitle.textContent = entry.title;
  dom.detailCategory.textContent = entry.category;
  dom.detailCode.textContent = entry.code;
  dom.detailSummary.textContent = entry.summary;
  dom.detailBeginner.textContent = entry.beginner;
  dom.detailUsage.textContent = entry.usage;
  dom.detailWarning.textContent = entry.warning;
  dom.detailExample.textContent = entry.example || inferExample(entry);
  dom.detailNext.textContent = entry.nextLearn || inferNextLearn(entry);
  dom.detailRisk.textContent = entry.risk;
  dom.detailSource.textContent = entry.source;

  const images = getFeaturedImages(entry.id);
  if (images.length) {
    dom.detailImageCard.hidden = false;
    dom.detailImageTitle.textContent = `${entry.title} 对应图卡`;
    dom.detailImageCaption.textContent = "首批 Gemini 图已经直接挂到知识点详情里。";
    dom.detailImageStage.innerHTML = images.map((image) => `
      <article class="image-card">
        <img src="${image.src}" alt="${escapeHtml(image.title || entry.title)}" loading="lazy">
        <div class="image-copy">
          <h5>${escapeHtml(image.title || entry.title)}</h5>
          <p>${escapeHtml(image.caption || "这张图卡对应当前知识点。")}</p>
        </div>
      </article>
    `).join("");
  } else {
    dom.detailImageCard.hidden = true;
    dom.detailImageStage.innerHTML = "";
  }

  const related = findRelated(entry);
  dom.relatedLinks.innerHTML = related.length
    ? related.map((item) => `<button type="button" data-related-id="${escapeHtml(item.id)}">${escapeHtml(item.title)}</button>`).join("")
    : `<button type="button">当前没有更多相关条目</button>`;

  dom.relatedLinks.querySelectorAll("[data-related-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedId = button.dataset.relatedId;
      renderWorkspace();
    });
  });
}

function renderGallery() {
  const galleryData = Object.entries(window.CNC_FEATURED_IMAGES || {});
  dom.galleryGrid.innerHTML = galleryData.length
    ? galleryData.map(([entryId, images]) => {
      const entry = state.entries.find((item) => item.id === entryId);
      const hero = images[0];
      return `
        <article class="gallery-card">
          <img src="${hero.src}" alt="${escapeHtml(hero.title || entry?.title || entryId)}" loading="lazy">
          <h4>${escapeHtml(entry?.title || entryId)}</h4>
          <p>${escapeHtml(hero.caption || entry?.summary || "首批 Gemini 图卡。")}</p>
          <div class="gallery-actions">
            <button class="ghost-button" data-gallery-entry="${escapeHtml(entryId)}" type="button">查看对应知识点</button>
          </div>
        </article>
      `;
    }).join("")
    : `<article class="gallery-card"><h4>暂时还没有图片图卡</h4><p>等首批图片接入后，这里会直接显示。</p></article>`;

  dom.galleryGrid.querySelectorAll("[data-gallery-entry]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedId = button.dataset.galleryEntry;
      navigate("workspace");
    });
  });
}

function renderGalleryRich() {
  const featuredLookup = new Map();
  Object.entries(window.CNC_FEATURED_IMAGES || {}).forEach(([entryId, images]) => {
    safeArray(images).forEach((image) => {
      if (image?.src) featuredLookup.set(image.src, entryId);
    });
  });

  const galleryLibrary = getGalleryLibrary();
  const galleryData = galleryLibrary.length
    ? galleryLibrary.map((image) => ({
      entryId: featuredLookup.get(image.src) || "",
      image
    }))
    : Object.entries(window.CNC_FEATURED_IMAGES || {}).flatMap(([entryId, images]) =>
      safeArray(images).map((image) => ({ entryId, image }))
    );

  dom.galleryGrid.innerHTML = galleryData.length
    ? galleryData.map(({ entryId, image }) => {
      const entry = state.entries.find((item) => item.id === entryId);
      const batchLabel = image.batch || "Gemini 图库";
      return `
        <article class="gallery-card">
          <img src="${image.src}" alt="${escapeHtml(image.title || entry?.title || entryId || "CNC Gallery Image")}" loading="lazy">
          <div class="result-badges">
            <span class="badge">${escapeHtml(batchLabel)}</span>
            ${entry ? `<span class="badge level">已关联知识点</span>` : `<span class="badge level">图库素材</span>`}
          </div>
          <h4>${escapeHtml(entry?.title || image.title || entryId || "图库图片")}</h4>
          <p>${escapeHtml(image.caption || entry?.summary || "这张图片已经并入站内图库，可作为学习时的直观参考。")}</p>
          <div class="gallery-actions">
            ${entry
              ? `<button class="ghost-button" data-gallery-entry="${escapeHtml(entryId)}" type="button">查看对应知识点</button>`
              : `<button class="ghost-button" type="button" disabled>正在补充关联知识点</button>`}
          </div>
        </article>
      `;
    }).join("")
    : `<article class="gallery-card"><h4>暂时还没有图库图片</h4><p>图片资源正在接入，稍后这里会直接展示。</p></article>`;

  dom.galleryGrid.querySelectorAll("[data-gallery-entry]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedId = button.dataset.galleryEntry;
      navigate("workspace");
    });
  });
}

function renderDashboardGallery() {
  if (!dom.dashboardGalleryGrid) return;
  const galleryLibrary = getGalleryLibrary().slice(0, 6);
  dom.dashboardGalleryGrid.innerHTML = galleryLibrary.length
    ? galleryLibrary.map((image) => `
      <article class="gallery-card actionable" data-route="gallery">
        <img src="${image.src}" alt="${escapeHtml(image.title || "CNC Gallery Image")}" loading="lazy">
        <div class="result-badges">
          <span class="badge">${escapeHtml(image.batch || "Gemini 图库")}</span>
        </div>
        <h4>${escapeHtml(image.title || "图库图片")}</h4>
        <p>这张图已经接进网站图库，点进去可以继续看更多图卡。</p>
      </article>
    `).join("")
    : `<article class="gallery-card"><h4>图库正在准备中</h4><p>首批图片接入后，这里会直接显示预览。</p></article>`;

  dom.dashboardGalleryGrid.querySelectorAll("[data-route='gallery']").forEach((card) => {
    card.addEventListener("click", () => navigate("gallery"));
  });
}

function renderProgressLinks() {
  renderLinkCloud(dom.recentLinks, state.recents, "还没有最近查看");
  renderLinkCloud(dom.favoriteLinks, state.favorites, "还没有收藏内容");
}

function renderLinkCloud(container, ids, emptyText) {
  container.innerHTML = "";
  const items = ids.map((id) => state.entries.find((entry) => entry.id === id)).filter(Boolean);
  if (!items.length) {
    container.innerHTML = `<button type="button">${escapeHtml(emptyText)}</button>`;
    return;
  }

  container.innerHTML = items
    .map((entry) => `<button type="button" data-link-entry="${escapeHtml(entry.id)}">${escapeHtml(entry.title)}</button>`)
    .join("");

  container.querySelectorAll("[data-link-entry]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedId = button.dataset.linkEntry;
      navigate("workspace");
    });
  });
}

function renderLibraryStats() {
  dom.baseCount.textContent = String(state.baseEntries.length);
  dom.coreCount.textContent = state.coreLoaded ? `${state.archiveEntries.length} 条已并入` : "待加载";
  dom.archiveCount.textContent = state.fullLocalLoaded ? `${state.archiveEntries.length} 条索引已并入` : "待尝试";
  dom.knowledgePill.textContent = state.fullLocalLoaded
    ? "完整索引已接入"
    : state.coreLoaded
      ? "核心知识包已接入"
      : "知识库待加载";
}

function renderAll() {
  state.entries = collectSources();
  state.baseEntries = [
    ...safeArray(window.CNC_DATA).map(normalizeEntry),
    ...safeArray(window.CNC_KB_EXTRA).map(normalizeEntry)
  ];
  state.archiveEntries = state.entries.filter((entry) => !state.baseEntries.some((item) => item.id === entry.id));
  if (!state.selectedId && state.entries.length) {
    state.selectedId = state.entries[0].id;
  }
  buildCategorySelect();
  renderHeroMetrics();
  renderWorkspace();
  renderGalleryRich();
  renderDashboardGallery();
  renderProgressLinks();
  renderLibraryStats();
  renderAccessCenter();
}

function formatNumber(value, digits = 2) {
  return Number(value).toFixed(digits).replace(/\.?0+$/, "");
}

function calculateRpm() {
  const vc = Number(document.querySelector("#vc-input").value);
  const diameter = Number(document.querySelector("#diameter-input").value);
  document.querySelector("#rpm-result").textContent = vc > 0 && diameter > 0
    ? `建议转速约 ${formatNumber((1000 * vc) / (Math.PI * diameter), 0)} rpm`
    : "请输入有效线速度和直径。";
}

function calculateVc() {
  const rpm = Number(document.querySelector("#rpm-back-input").value);
  const diameter = Number(document.querySelector("#diameter-back-input").value);
  document.querySelector("#vc-result").textContent = rpm > 0 && diameter > 0
    ? `线速度约 ${formatNumber((Math.PI * diameter * rpm) / 1000)} m/min`
    : "请输入有效转速和直径。";
}

function calculateFeed() {
  const feedPerRev = Number(document.querySelector("#feed-per-rev-input").value);
  const rpm = Number(document.querySelector("#feed-rpm-input").value);
  document.querySelector("#feed-result").textContent = feedPerRev > 0 && rpm > 0
    ? `每分钟进给约 ${formatNumber(feedPerRev * rpm, 3)} mm/min`
    : "请输入有效每转进给和转速。";
}

function calculatePitch() {
  const tpi = Number(document.querySelector("#tpi-input").value);
  document.querySelector("#pitch-result").textContent = tpi > 0
    ? `对应螺距约 ${formatNumber(25.4 / tpi, 3)} mm`
    : "请输入有效 TPI。";
}

function calculateDiameter() {
  const radius = Number(document.querySelector("#radius-input").value);
  document.querySelector("#diameter-result").textContent = radius > 0
    ? `对应直径约 ${formatNumber(radius * 2)} mm`
    : "请输入有效半径。";
}

function bindCalculators() {
  document.querySelectorAll("[data-calc]").forEach((button) => {
    button.addEventListener("click", () => {
      const type = button.dataset.calc;
      if (type === "rpm") calculateRpm();
      if (type === "vc") calculateVc();
      if (type === "feed") calculateFeed();
      if (type === "pitch") calculatePitch();
      if (type === "diameter") calculateDiameter();
    });
  });
}

async function sha256Hex(input) {
  const bytes = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hashBuffer)].map((item) => item.toString(16).padStart(2, "0")).join("");
}

async function grantAccess(code) {
  const trimmed = code.trim();
  const hash = await sha256Hex(trimmed);
  if (ACCESS_HASHES.has(hash)) {
    const profile = ACCESS_PROFILES.find((item) => item.hash === hash);
    state.accessGranted = true;
    state.accessProfileLabel = profile?.label || "已授权";
    localStorage.setItem(ACCESS_KEY, trimmed);
    dom.gate.hidden = true;
    dom.lockPill.textContent = state.accessProfileLabel;
    dom.accessMessage.textContent = "授权成功，正在进入资料区。";
    renderAccessCenter();
    return true;
  }
  return false;
}

async function initAccess() {
  const stored = localStorage.getItem(ACCESS_KEY);
  const urlCode = new URLSearchParams(window.location.search).get("invite");
  const candidate = urlCode || stored || "";

  if (candidate) {
    const ok = await grantAccess(candidate);
    if (ok) return;
  }

  state.accessGranted = false;
  dom.gate.hidden = false;
  dom.lockPill.textContent = "访问受控";
  renderAccessCenter();
}

function ensureScript(id, src) {
  if (state.loadedScripts.has(id)) return Promise.resolve(true);
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => {
      state.loadedScripts.add(id);
      resolve(true);
    };
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

async function loadKnowledgeCore() {
  if (state.coreLoaded) {
    logLibrary("核心知识库包已经加载过，不再重复加载。");
    navigate("library");
    return;
  }

  const results = [];
  for (const item of KNOWLEDGE_SOURCES) {
    const ok = await ensureScript(item.id, item.src);
    results.push({ ...item, ok });
  }

  const successCount = results.filter((item) => item.ok).length;
  if (successCount) {
    state.coreLoaded = true;
    logLibrary(`核心知识库包已加载 ${successCount} 个脚本，开始并入条目。`);
  } else {
    logLibrary("核心知识库包脚本暂时还没生成或还没发布，当前继续使用基础条目。");
  }

  renderAll();
  navigate("library");
}

function bindRouteButtons() {
  document.querySelectorAll("[data-route]").forEach((button) => {
    button.addEventListener("click", () => {
      const view = button.dataset.route;
      const filter = button.dataset.filter;
      navigate(view, { filter });
    });
  });

  document.querySelectorAll("[data-entry-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedId = button.dataset.entryId;
      navigate("workspace");
    });
  });

  document.querySelectorAll("[data-jump-keyword]").forEach((button) => {
    button.addEventListener("click", () => {
      state.keyword = button.dataset.jumpKeyword || "";
      state.activeFilter = "all";
      navigate("workspace");
    });
  });
}

function bindWorkspaceEvents() {
  dom.searchInput.addEventListener("input", () => {
    state.keyword = dom.searchInput.value;
    renderWorkspace();
  });

  dom.categorySelect.addEventListener("change", () => {
    state.selectedCategory = dom.categorySelect.value;
    renderWorkspace();
  });

  dom.presetChipRow.addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter-chip]");
    if (!button) return;
    state.activeFilter = button.dataset.filterChip;
    state.selectedCategory = "全部栏目";
    renderWorkspace();
  });

  dom.knowledgeChipRow.addEventListener("click", (event) => {
    const button = event.target.closest("[data-quick-term]");
    if (!button) return;
    state.keyword = button.dataset.quickTerm;
    dom.searchInput.value = state.keyword;
    state.selectedCategory = "全部栏目";
    renderWorkspace();
  });

  dom.favoriteToggle.addEventListener("click", toggleFavorite);
}

function bindSidebarEvents() {
  dom.sidebarOpen.addEventListener("click", openSidebar);
  dom.sidebarClose.addEventListener("click", closeSidebar);
  dom.sidebarMask.addEventListener("click", closeSidebar);
}

function bindLibraryEvents() {
  dom.loadCoreButton.addEventListener("click", loadKnowledgeCore);
  dom.loadFullButton.addEventListener("click", loadFullLocalArchive);
}

function bindAccessEvents() {
  dom.accessForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const code = dom.accessInput.value;
    const ok = await grantAccess(code);
    if (ok && !state.coreLoaded) {
      await loadKnowledgeCore();
    }
    dom.accessMessage.textContent = ok
      ? "授权成功，已经进入资料区。"
      : "邀请码不对。你可以换一个邀请码或通过私密链接进入。";
  });
}

async function loadFullLocalArchive() {
  if (state.fullLocalLoaded) {
    logLibrary("完整本地索引已经加载过。");
    navigate("library");
    return;
  }

  const results = [];
  for (const item of FULL_ARCHIVE_SOURCES) {
    const ok = await ensureScript(item.id, item.src);
    results.push({ ...item, ok });
  }

  const loadedCount = results.filter((item) => item.ok).length;
  const fullArchiveCount =
    safeArray(window.CNC_KB_FULL_CHUNK_01).length +
    safeArray(window.CNC_KB_FULL_CHUNK_02).length +
    safeArray(window.CNC_KB_FULL_CHUNK_03).length +
    safeArray(window.CNC_KB_FULL_CHUNK_04).length +
    safeArray(window.CNC_KB_FULL_CHUNK_05).length +
    safeArray(window.CNC_KB_FULL_CHUNK_06).length +
    safeArray(window.CNC_KB_FULL_CHUNK_07).length +
    safeArray(window.CNC_KB_FULL_CHUNK_08).length;

  if (loadedCount && fullArchiveCount) {
    state.fullLocalLoaded = true;
    logLibrary(`完整本地索引分包已接入 ${fullArchiveCount} 条入口。`);
  } else {
    logLibrary("完整本地索引分包还没全部到位，当前先使用基础条目和核心包。");
  }

  renderAll();
  navigate("library");
}

async function bootstrap() {
  state.favorites = readStorage(FAVORITES_KEY);
  state.recents = readStorage(RECENTS_KEY);

  bindRouteButtons();
  bindWorkspaceEvents();
  bindSidebarEvents();
  bindLibraryEvents();
  bindAccessEvents();
  bindCalculators();

  renderLibraryLog();
  renderAll();
  renderProgressLinks();
  calculateRpm();
  calculateVc();
  calculateFeed();
  calculatePitch();
  calculateDiameter();
  await initAccess();
  if (state.accessGranted && !state.coreLoaded) {
    await loadKnowledgeCore();
  }
}

bootstrap();
