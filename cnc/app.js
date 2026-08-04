// === 开发模式：禁用访问控制 ===
const DEV_MODE = true;
if (DEV_MODE) {
  window.__FORCE_ACCESS_GRANTED__ = true;
}

const FAVORITES_KEY = "cnc_app_favorites_v2";
const RECENTS_KEY = "cnc_app_recents_v2";
const ACCESS_KEY = "cnc_app_access_code_v1";
const STUDY_PROGRESS_KEY = "cnc_study_progress_v1";
const ACCESS_PUBLIC_URL = "https://panxiangbin.github.io/yuhua/cnc/";
const MAX_STUDY_LEVEL = 12;

// ⚠️ 安全边界说明（非真实后端控制，仅前端演示层/分发便利层）：
// 下面的邀请码机制只是"发链接的人自己知道口令"这类轻量分发过滤，不是访问控制。
// 明文邀请码（code 字段）和它的 SHA-256 哈希（hash 字段）都打包在这份公开的前端脚本里，
// 任何人打开浏览器 DevTools 或直接看这个 .js 文件源码，都能直接读到明文邀请码——
// 哈希校验挡不住"看源码"这种最基础的绕过方式，不能当作真实的权限边界使用。
// 真正的访问控制需要后端校验（服务端 session / Cloudflare Access 等），当前版本明确不做这一层，
// 这里保留只是为了给站长一个"生成/复制分享链接"的自用小工具，不代表内容已被保护。
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
  dashboard: { kicker: "总览面板", title: "数控工程师工作平台" },
  study: { kicker: "新手路线", title: "先按顺序学，再单点深入" },
  workspace: { kicker: "快速查询", title: "左边找条目，右边看详情" },
  "learning-map": { kicker: "知识地图", title: "可视化知识结构与学习路径" },
  gallery: { kicker: "图片图库", title: "125张专业教学图片资料" },
  calculator: { kicker: "参数换算", title: "把常用计算做成独立工作区" },
  library: { kicker: "知识库管理", title: "逐步把本地数据库接进网页" },
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

const KB_CONTENT_CHUNK_URL = (chunkNo) => `./kb-content-${String(chunkNo).padStart(2, "0")}.js`;

const state = {
  entries: [],
  baseEntries: [],
  archiveEntries: [],
  activeView: "study",
  activeFilter: "all",
  selectedCategory: "全部栏目",
  keyword: "",
  workspaceMode: "visual",
  onlyWithImages: false,
  selectedId: null,
  favorites: [],
  recents: [],
  studyProgress: {
    completedLevels: []
  },
  accessGranted: window.__FORCE_ACCESS_GRANTED__ || false,
  accessProfileLabel: "",
  loadedScripts: new Set(),
  loadedContentChunks: new Set(),
  treeOpen: {
    study: true,
    workspace: true,
    tools: true
  },
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
  homeButton: document.querySelector("#home-btn"),
  sidebarMask: document.querySelector("#sidebar-mask"),
  sidebarOpen: document.querySelector("#sidebar-open"),
  sidebarClose: document.querySelector("#sidebar-close"),
  topbarKicker: document.querySelector("#topbar-kicker"),
  topbarTitle: document.querySelector("#topbar-title"),
  heroMetrics: document.querySelector("#launchpad-stats"),
  dashboardGalleryGrid: document.querySelector("#dashboard-gallery-grid"),
  categorySelect: document.querySelector("#category-select"),
  presetChipRow: document.querySelector("#preset-chip-row"),
  knowledgeChipRow: document.querySelector("#knowledge-chip-row"),
  workspaceModeRow: document.querySelector("#workspace-mode-row"),
  searchInput: document.querySelector("#search-input"),
  searchClearBtn: document.querySelector("#search-clear-btn"),
  searchMeta: document.querySelector("#search-meta"),
  resultList: document.querySelector("#result-list"),
  workspaceStatus: document.querySelector("#workspace-status-text"),
  detailTitle: document.querySelector("#detail-title"),
  detailCategory: document.querySelector("#detail-category"),
  detailCode: document.querySelector("#detail-code"),
  detailPrev: document.querySelector("#detail-prev"),
  detailNextButton: document.querySelector("#detail-next-button"),
  detailSummary: document.querySelector("#detail-summary"),
  detailBeginner: document.querySelector("#detail-beginner"),
  detailUsage: document.querySelector("#detail-usage"),
  detailWarning: document.querySelector("#detail-warning"),
  detailExample: document.querySelector("#detail-example"),
  detailNext: document.querySelector("#detail-next"),
  detailPreviewStatus: document.querySelector("#detail-preview-status"),
  detailPreview: document.querySelector("#detail-preview"),
  loadPreviewButton: document.querySelector("#load-preview-button"),
  detailRisk: document.querySelector("#detail-risk-badge"),
  detailSource: document.querySelector("#detail-category"),
  detailImageCard: document.querySelector("#detail-image-card"),
  detailImageTitle: document.querySelector("#detail-title"),
  detailImageCaption: document.querySelector("#detail-summary"),
  detailImageStage: document.querySelector("#detail-image-stage"),
  relatedLinks: document.querySelector("#related-links"),
  detailQuickCheck: document.querySelector("#detail-quick-check"),
  detailTools: document.querySelector("#detail-tools"),
  detailParams: document.querySelector("#detail-params"),
  detailSmartRecommend: document.querySelector("#detail-smart-recommend"),
  favoriteToggle: document.querySelector("#favorite-toggle"),
  recentLinks: document.querySelector("#recent-links"),
  favoriteLinks: document.querySelector("#favorite-links"),
  baseCount: document.querySelector("#base-count"),
  coreCount: document.querySelector("#core-count"),
  archiveCount: document.querySelector("#archive-count"),
  libraryBrowser: document.querySelector("#library-browser"),
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

function readStudyProgress() {
  try {
    const raw = JSON.parse(localStorage.getItem(STUDY_PROGRESS_KEY) || "{}");
    const levels = [];
    const source = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.completedLevels) ? raw.completedLevels : []);
    const unique = new Set();

    source.forEach((item) => {
      const level = parseInt(item, 10);
      if (level >= 1 && level <= MAX_STUDY_LEVEL && Number.isInteger(level)) {
        unique.add(level);
      }
    });

    return {
      completedLevels: [...unique].sort((a, b) => a - b)
    };
  } catch {
    return {
      completedLevels: []
    };
  }
}

function writeStudyProgress(progress) {
  const normalized = normalizeStudyProgress(progress);
  state.studyProgress = normalized;
  localStorage.setItem(STUDY_PROGRESS_KEY, JSON.stringify(normalized));
}

function normalizeStudyProgress(progress) {
  const normalized = {
    completedLevels: []
  };
  if (!progress || typeof progress !== "object") {
    return normalized;
  }
  const source = Array.isArray(progress.completedLevels) ? progress.completedLevels : [];
  const unique = new Set();
  source.forEach((item) => {
    const level = parseInt(item, 10);
    if (level >= 1 && level <= MAX_STUDY_LEVEL && Number.isInteger(level)) {
      unique.add(level);
    }
  });
  normalized.completedLevels = [...unique].sort((a, b) => a - b);
  return normalized;
}

function getStudyProgress() {
  return state.studyProgress && Array.isArray(state.studyProgress.completedLevels)
    ? state.studyProgress
    : { completedLevels: [] };
}

function isStudyLevelCompleted(level) {
  const target = parseInt(level, 10);
  if (!target || !Number.isInteger(target)) return false;
  const progress = getStudyProgress();
  return progress.completedLevels.includes(target);
}

function markStudyLevelCompleted(level) {
  const target = parseInt(level, 10);
  if (!target || target < 1 || target > MAX_STUDY_LEVEL) return false;
  const current = getStudyProgress();
  if (!current.completedLevels.includes(target)) {
    current.completedLevels.push(target);
    current.completedLevels = current.completedLevels.sort((a, b) => a - b);
    writeStudyProgress(current);
    renderStudyProgressPanel();
    syncStudyCardCompletion();
    return true;
  }
  return false;
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

/**
 * 文本标准化（用于学习卡片匹配）：去空格、去标点、转小写
 */
function normalizeCompactText(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[：:，,。.!！?？"""'''（）()【】\[\]-]/g, '');
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

function getGalleryLibrary() {
  return Array.isArray(window.CNC_GALLERY_LIBRARY) ? window.CNC_GALLERY_LIBRARY : [];
}

function getContentManifest() {
  return window.CNC_KB_CONTENT_MANIFEST || { entryToChunk: {} };
}

function keywordTokens(entry) {
  const raw = [
    entry.title,
    entry.code,
    entry.category,
    entry.source,
    ...(entry.tags || []),
    ...(entry.aliases || [])
  ]
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, " ");

  return [...new Set(raw.split(/\s+/).filter((item) => item && item.length >= 2))];
}

function getEntryImages(entry) {
  const direct = getFeaturedImages(entry.id);
  if (direct.length) return direct;

  const tokens = keywordTokens(entry);
  if (!tokens.length) return [];

  const ranked = getGalleryLibrary()
    .filter((image) => String(image.src || "").toLowerCase().endsWith(".webp"))
    .map((image) => {
      const hay = `${image.title || ""} ${image.caption || ""} ${image.batch || ""} ${image.src || ""}`.toLowerCase();
      let score = tokens.reduce((sum, token) => (hay.includes(token) ? sum + 1 : sum), 0);
      if (entry.category.includes("刀具") && hay.includes("tool")) score += 2;
      if (entry.category.includes("工艺") && (hay.includes("process") || hay.includes("milling") || hay.includes("turning"))) score += 2;
      if (entry.category.includes("图纸") && (hay.includes("drawing") || hay.includes("gdt") || hay.includes("measure"))) score += 2;
      if (entry.category.includes("报警") && hay.includes("alarm")) score += 2;
      if (entry.category.includes("案例") && hay.includes("case")) score += 2;
      return { image, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => ({
      src: item.image.src,
      title: item.image.title || entry.title,
      caption: item.image.caption || "图库图片已自动匹配到当前知识点。"
    }));

  return ranked;
}

function getFeaturedSource() {
  return {
    ...(window.CNC_FEATURED_IMAGES || {}),
    ...(window.CNC_FEATURED_IMAGES_EXTENDED || {}),
    ...(window.CNC_FEATURED_IMAGES_SUPPLEMENT || {})
  };
}

function findEntryByFeaturedKey(entryKey) {
  return state.entries.find((entry) => entry.id === entryKey || entry.title === entryKey) || null;
}

function getGalleryImageLookup() {
  const lookup = new Map();
  getGalleryLibrary().forEach((image) => {
    if (!image?.src) return;
    lookup.set(image.src, image);
    if (image.id) lookup.set(image.id, image);

    const filename = String(image.src).split("/").pop();
    if (filename) lookup.set(filename, image);
    if (image.id && !String(image.id).endsWith(".webp")) {
      lookup.set(`${image.id}.webp`, image);
    }
  });
  return lookup;
}

function normalizeFeaturedImages(entryKey, value) {
  if (Array.isArray(value)) return safeArray(value).filter((image) => image?.src);
  if (!value || !Array.isArray(value.images)) return [];

  const lookup = getGalleryImageLookup();
  const entry = findEntryByFeaturedKey(entryKey);

  return value.images
    .map((ref) => {
      const image = lookup.get(ref) || lookup.get(String(ref).split("/").pop()) || null;
      if (!image?.src) return null;
      return {
        src: image.src,
        title: image.title || entry?.title || entryKey,
        caption: `${value.category || "精选配图"} · 优先级 ${value.priority || 2}`
      };
    })
    .filter(Boolean);
}

function getFeaturedImages(entryOrKey) {
  const source = getFeaturedSource();
  const entryId = typeof entryOrKey === "string" ? entryOrKey : entryOrKey?.id;
  const entry = typeof entryOrKey === "object"
    ? entryOrKey
    : state.entries.find((item) => item.id === entryOrKey) || null;
  const entryTitle = entry?.title || null;

  if (entryId && source[entryId] !== undefined) {
    return normalizeFeaturedImages(entryId, source[entryId]);
  }

  if (entryTitle && source[entryTitle] !== undefined) {
    return normalizeFeaturedImages(entryTitle, source[entryTitle]);
  }

  return [];
}

async function ensureContentChunk(chunkNo) {
  const scriptId = `kb-content-${String(chunkNo).padStart(2, "0")}`;
  if (state.loadedContentChunks.has(scriptId)) return true;
  const ok = await ensureScript(scriptId, KB_CONTENT_CHUNK_URL(chunkNo));
  if (ok) state.loadedContentChunks.add(scriptId);
  return ok;
}

async function loadDetailPreview(entry) {
  if (!entry || !dom.detailPreview || !dom.detailPreviewStatus) return;

  const builtIn = entry.contentPreview || entry.preview || "";
  if (builtIn) {
    dom.detailPreview.textContent = builtIn;
    dom.detailPreviewStatus.textContent = "当前正在显示并入网页的正文摘录。";
    return;
  }

  const manifest = getContentManifest();
  const chunkNo = manifest.entryToChunk?.[entry.id];
  if (!chunkNo) {
    dom.detailPreview.textContent = "这个条目当前还没有并入原文摘录，先看上面的结构化速查内容。";
    dom.detailPreviewStatus.textContent = "后续还会继续补更多正文内容。";
    return;
  }

  dom.detailPreview.textContent = "正在加载这条知识点的原文摘录……";
  dom.detailPreviewStatus.textContent = "这部分内容来自本地知识库原文整理。";

  const ok = await ensureContentChunk(chunkNo);
  const chunkKey = `CNC_KB_CONTENT_${String(chunkNo).padStart(2, "0")}`;
  const payload = ok ? window[chunkKey] || {} : {};
  const content = payload[entry.id];

  if (content) {
    dom.detailPreview.textContent = content;
    dom.detailPreviewStatus.textContent = "已并入当前知识点的原文摘录。";
  } else {
    dom.detailPreview.textContent = "这条知识点对应的原文摘录暂时还没取到，先看上面的结构化速查内容。";
    dom.detailPreviewStatus.textContent = "当前条目原文未命中，后续继续补齐。";
  }
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


/**
 * 扩展搜索词（支持别名映射）
 * @param {string} keyword - 用户输入的关键词
 * @returns {Array<string>} 扩展后的关键词数组
 */
function expandSearchTerm(keyword) {
  if (!keyword || !window.CNC_SEARCH_ALIASES) return [keyword];

  const normalized = normalizeText(keyword);
  const match = window.CNC_SEARCH_ALIASES.find(
    alias => normalizeText(alias.term) === normalized
  );

  const expandedTerms = match ? [keyword, ...match.expands] : [keyword];

  // 记录扩展日志（如果调试模块已加载）
  if (window.CNC_SEARCH_DEBUG) {
    window.CNC_SEARCH_DEBUG.logExpansion(keyword, expandedTerms);
  }

  return expandedTerms;
}

/**
 * 检查条目是否匹配关键词
 * @param {Object} entry - 知识条目
 * @param {string} keyword - 搜索关键词
 * @returns {boolean} 是否匹配
 */
function matchesKeyword(entry, keyword) {
  if (!keyword) return true;

  // 1. 扩展用户输入的搜索词（支持别名）
  const expandedTerms = expandSearchTerm(keyword);
  const parts = expandedTerms.flatMap(term =>
    normalizeText(term).split(/\s+/)
  ).filter(Boolean);

  const hay = normalizeText(getEntryText(entry));

  // 2. 用扩展后的词进行匹配（只要任意一个词匹配即可）
  const aliasMatched = parts.some((part) => hay.includes(part));
  if (aliasMatched) {
    // 记录匹配日志（如果调试模块已加载）
    if (window.CNC_SEARCH_DEBUG) {
      window.CNC_SEARCH_DEBUG.logMatch(entry, keyword, {
        type: 'alias',
        expandedTerms
      });
    }
    return true;
  }

  // 3. 保留前端索引补充匹配能力（兼容frontend-data-layer）
  if (window.CNC_FRONTEND && window.CNC_FRONTEND.getIndexMatches) {
    const indexItems = window.CNC_FRONTEND.getIndexMatches(keyword);
    if (indexItems.length) {
      const eid = normalizeText(entry.id);
      const etitle = normalizeText(entry.title);
      const indexMatched = indexItems.some(function (item) {
        return normalizeText(item.id) === eid || normalizeText(item.title) === etitle;
      });

      if (indexMatched) {
        // 记录索引匹配日志
        if (window.CNC_SEARCH_DEBUG) {
          window.CNC_SEARCH_DEBUG.logMatch(entry, keyword, {
            type: 'frontend_index'
          });
        }
        return true;
      }
    }
  }

  return false;
}

function scoreEntry(entry, keyword) {
  if (!keyword) return 0;
  const q = normalizeText(keyword);
  const code = normalizeText(entry.code);
  const title = normalizeText(entry.title);
  const aliases = entry.aliases.map(normalizeText);
  const tags = entry.tags.map(normalizeText);

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
    .filter((entry) => !state.onlyWithImages || getEntryImages(entry).length > 0)
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

function getVisibleEntries() {
  return getFilteredEntries();
}

function stepVisibleEntry(direction) {
  const visible = getVisibleEntries();
  if (!visible.length) return;
  const currentIndex = Math.max(0, visible.findIndex((entry) => entry.id === state.selectedId));
  const targetIndex = Math.min(visible.length - 1, Math.max(0, currentIndex + direction));
  state.selectedId = visible[targetIndex].id;
  renderWorkspace();
}

function syncTreeState() {
  document.querySelectorAll("[data-tree-panel]").forEach((panel) => {
    const key = panel.dataset.treePanel;
    const open = !!state.treeOpen[key];
    panel.classList.toggle("open", open);
  });

  document.querySelectorAll("[data-tree-toggle]").forEach((button) => {
    const key = button.dataset.treeToggle;
    button.setAttribute("aria-expanded", state.treeOpen[key] ? "true" : "false");
  });
}

function openTreeGroupForView(view) {
  if (view === "study") state.treeOpen.study = true;
  if (view === "workspace") state.treeOpen.workspace = true;
  if (["gallery", "calculator", "library", "favorites", "access"].includes(view)) {
    state.treeOpen.tools = true;
  }
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

  openTreeGroupForView(view);
  syncTreeState();

  document.querySelectorAll(".view").forEach((node) => {
    node.classList.toggle("active", node.id === `view-${view}`);
  });

  const meta = VIEW_META[view] || VIEW_META.dashboard;
  if (dom.topbarKicker) dom.topbarKicker.textContent = meta.kicker;
  if (dom.topbarTitle) dom.topbarTitle.textContent = meta.title;

  document.querySelectorAll(".tree-parent, .tree-item").forEach((button) => {
    const isSameView = button.dataset.route === view;
    const sameFilter = !button.dataset.filter || button.dataset.filter === state.activeFilter;
    button.classList.toggle("active", isSameView && sameFilter);
  });

  if (view === "workspace") {
    if (dom.searchInput) dom.searchInput.value = state.keyword;
    renderWorkspace();
  }

  if (view === "dashboard") renderDashboardRecent();
  if (view === "study") renderStudyProgressPanel();
  // 图库视图由 gallery-featured.js 独立管理 #cncGalleryGrid，此处不再重复渲染（旧的 #gallery-grid 容器已废弃）
  if (view === "library") renderLibraryStats();
  if (view === "favorites") renderProgressLinks();
  closeSidebar();

  if (!options.skipHash) {
    // 视图名称到URL hash的映射
    const viewToHashMap = {
      "learning-map": "study-map",
      "dashboard": "",
      "workspace": "workspace",
      "study": "study",
      "gallery": "gallery",
      "calculator": "calculator",
      "library": "library",
      "favorites": "favorites",
      "access": "access"
    };
    const hash = viewToHashMap[view] !== undefined ? viewToHashMap[view] : view;
    if (location.hash.slice(1) !== hash) {
      location.hash = hash;
    }
  }
}

function closeSidebar() {
  if (dom.sidebar) {
    dom.sidebar.classList.remove("open");
  }
  if (dom.sidebarMask) {
    dom.sidebarMask.hidden = true;
  }
}

function openSidebar() {
  if (dom.sidebar) {
    dom.sidebar.classList.add("open");
  }
  if (dom.sidebarMask) {
    dom.sidebarMask.hidden = false;
  }
}

function buildCategorySelect() {
  if (!dom.categorySelect) return;
  const categories = ["全部栏目", ...new Set(state.entries.map((entry) => entry.category))];
  dom.categorySelect.innerHTML = categories
    .map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
    .join("");
  dom.categorySelect.value = state.selectedCategory;
}

function renderPresetChips() {
  if (!dom.presetChipRow) return;
  dom.presetChipRow.innerHTML = [
    { value: "all", label: "全部" },
    ...Object.entries(FILTER_META).filter(([key]) => key !== "all").map(([value, item]) => ({ value, label: item.label }))
  ]
    .map((item) => `<button class="chip${item.value === state.activeFilter ? " active" : ""}" data-filter-chip="${item.value}" type="button">${escapeHtml(item.label)}</button>`)
    .join("");
}

function renderKnowledgeChips() {
  if (!dom.knowledgeChipRow) return;
  dom.knowledgeChipRow.innerHTML = QUICK_TERMS
    .map((term) => `<button class="chip soft" data-quick-term="${escapeHtml(term)}" type="button">${escapeHtml(term)}</button>`)
    .join("");
}

function renderWorkspaceModes() {
  if (!dom.workspaceModeRow) return;
  dom.workspaceModeRow.querySelectorAll("[data-workspace-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.workspaceMode === state.workspaceMode);
  });
  dom.workspaceModeRow.querySelectorAll("[data-workspace-flag]").forEach((button) => {
    const active = button.dataset.workspaceFlag === "with-images" && state.onlyWithImages;
    button.classList.toggle("active", active);
  });
}

function renderHeroMetrics() {
  const total = state.entries.length;
  const featured = Object.keys(window.CNC_FEATURED_IMAGES || {}).length;
  const extended = Object.keys(window.CNC_FEATURED_IMAGES_EXTENDED || {}).length;
  const withImages = featured + extended;

  const statEntries = document.getElementById('stat-entries');
  const statImages = document.getElementById('stat-images');
  const statRecents = document.getElementById('stat-recents');

  if (statEntries) statEntries.textContent = total;
  if (statImages) statImages.textContent = withImages;
  if (statRecents) statRecents.textContent = state.recents.length;
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

  const workspaceStatusText = document.getElementById('workspace-status-text');
  if (workspaceStatusText) {
    workspaceStatusText.textContent = archiveNote;
  }

  if (dom.searchMeta) {
    dom.searchMeta.textContent = `当前命中 ${filtered.length} 条，模块为：${activeFilterLabel}；栏目为：${categoryLabel}。基础条目 ${state.baseEntries.length} 条，扩展知识条目 ${state.archiveEntries.length} 条。`;
  }

  if (dom.resultList) {
    dom.resultList.classList.toggle("visual-mode", state.workspaceMode === "visual");
  }

  if (filtered.length && !filtered.some((entry) => entry.id === state.selectedId)) {
    state.selectedId = filtered[0].id;
  }

  if (dom.resultList) {
    dom.resultList.innerHTML = filtered.length
    ? filtered.slice(0, 120).map((entry) => {
      const thumb = getEntryImages(entry)[0];
      return `
      <article class="result-card${entry.id === state.selectedId ? " selected" : ""}${thumb ? " has-thumb" : ""}">
        ${thumb ? `<div class="result-thumb"><img src="${thumb.src}" alt="${escapeHtml(thumb.title || entry.title)}" loading="lazy"></div>` : ""}
        <div class="result-main">
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
        </div>
      </article>
    `;
    }).join("")
    : `<article class="result-card"><h4>没有找到匹配项</h4><p>可以试试搜：G02、1815、回零、对刀、报警、G84、螺距。</p></article>`;

    dom.resultList.querySelectorAll("[data-open-entry]").forEach((button) => {
      button.addEventListener("click", () => {
        state.selectedId = button.dataset.openEntry;
        renderWorkspace();
        renderDetail();
      });
    });
  }

  renderFavoriteButton();
  renderDetail();
  renderPresetChips();
  renderKnowledgeChips();
  renderWorkspaceModes();
  dom.categorySelect.value = state.selectedCategory;
}

function renderFavoriteButton() {
  const active = state.favorites.includes(state.selectedId);
  dom.favoriteToggle.textContent = active ? "取消收藏这条内容" : "收藏这条内容";
}


function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function getItemText(entry) {
  return normalizeText([
    entry.id,
    entry.title,
    entry.code,
    entry.category,
    entry.summary,
    entry.beginner,
    entry.usage,
    entry.warning,
    entry.example,
    entry.tags
  ].join(" "));
}

const DETAIL_TOOL_DEFINITIONS = [
  {
    id: "speed",
    title: "转速计算器",
    desc: "根据刀具直径和线速度计算主轴转速",
    keywords: ["转速", "主轴", "线速度", "vc", "s值", "切削速度"]
  },
  {
    id: "feed",
    title: "进给计算器",
    desc: "根据每齿进给、刃数、转速计算进给速度",
    keywords: ["进给", "每齿进给", "fz", "刃数", "f值", "mm/min"]
  },
  {
    id: "surface-speed",
    title: "线速度计算器",
    desc: "根据刀具直径和转速反推线速度",
    keywords: ["线速度", "vc", "切削速度"]
  },
  {
    id: "unit",
    title: "英制 / 公制换算",
    desc: "inch、mm、分数英寸快速换算",
    keywords: ["英制", "公制", "inch", "mm", "分数英寸"]
  },
  {
    id: "roughness",
    title: "Ra / Rz 粗糙度换算",
    desc: "粗糙度 Ra、Rz 近似参考换算",
    keywords: ["ra", "rz", "粗糙度", "表面粗糙"]
  }
];

function getQuickCheckList(entry) {
  const explicit = entry.quickCheck || entry.checklist || entry.checkPoints || entry.beforeUseCheck;
  if (explicit) return toArray(explicit).slice(0, 5);

  const text = getItemText(entry);
  if (text.includes("坐标") || text.includes("g54")) {
    return [
      "当前坐标系是否正确？",
      "工件零点是否和图纸基准一致？",
      "Z 零点是否单独确认过？",
      "程序起点是否在安全位置？",
      "首件前是否做过单段或空运行？"
    ];
  }
  if (text.includes("刀补") || text.includes("g41") || text.includes("g42") || text.includes("g43")) {
    return [
      "刀号和补偿号是否对应？",
      "H 值或 D 值是否调用正确？",
      "补偿方向是否判断正确？",
      "换刀后是否重新确认刀长？",
      "首件尺寸是否留有调整余地？"
    ];
  }
  if (text.includes("转速") || text.includes("进给") || text.includes("线速度")) {
    return [
      "刀具直径是否输入正确？",
      "材料类型是否考虑？",
      "单位是否确认无误？",
      "机床刚性和装夹是否允许该参数？",
      "首件是否保守试切？"
    ];
  }
  return [
    "这个知识点适用场景是否和当前加工一致？",
    "关键参数是否逐项检查？",
    "坐标、刀具、工件基准是否确认？",
    "是否存在撞刀、过切、尺寸异常风险？",
    "正式加工前是否做过模拟或单段检查？"
  ];
}

function getRelatedTools(entry) {
  const explicitToolIds = toArray(entry.toolIds || entry.relatedTools);
  const text = getItemText(entry);
  return DETAIL_TOOL_DEFINITIONS.filter((tool) => {
    if (explicitToolIds.includes(tool.id)) return true;
    return tool.keywords.some((keyword) => text.includes(normalizeText(keyword)));
  }).slice(0, 3);
}

function openCalculatorTool(toolId, params = {}, fromEntry = null) {
  localStorage.setItem("cnc_calculator_prefill", JSON.stringify({
    toolId,
    params,
    fromId: fromEntry?.id || "",
    fromTitle: fromEntry?.title || "",
    time: Date.now()
  }));
  navigate("calculator");
  renderAll();
}

function renderQuickCheckSection(entry) {
  if (!dom.detailQuickCheck) return;
  const checks = getQuickCheckList(entry);
  dom.detailQuickCheck.innerHTML = checks.map((text) => `
    <label class="detail-check-item">
      <input type="checkbox">
      <span>${escapeHtml(text)}</span>
    </label>
  `).join("");
}

function renderRelatedToolsSection(entry) {
  if (!dom.detailTools) return;
  const tools = getRelatedTools(entry);
  dom.detailTools.innerHTML = tools.length
    ? tools.map((tool) => `
      <button type="button" class="detail-tool-button" data-detail-tool="${escapeHtml(tool.id)}">
        <strong>${escapeHtml(tool.title)}</strong>
        <span>${escapeHtml(tool.desc)}</span>
      </button>
    `).join("")
    : `<p class="detail-soft-empty">暂无强关联工具，后续可在数据中补充 toolIds。</p>`;

  dom.detailTools.querySelectorAll("[data-detail-tool]").forEach((button) => {
    button.addEventListener("click", () => openCalculatorTool(button.dataset.detailTool, {}, entry));
  });
}

function renderDetailParamsSection(entry) {
  if (!dom.detailParams) return;
  const params = entry.params || entry.parameters || entry.formulaParams || [];
  if (!Array.isArray(params) || !params.length) {
    dom.detailParams.innerHTML = `<p class="detail-soft-empty">暂无可联动参数。后续补充 params 字段后可自动带入计算器。</p>`;
    return;
  }

  dom.detailParams.innerHTML = params.map((param) => `
    <button type="button" class="detail-param-chip" data-tool-id="${escapeHtml(param.toolId || "speed")}" data-param-name="${escapeHtml(param.name || param.key || "")}" data-param-value="${escapeHtml(param.value || "")}">
      ${escapeHtml(param.label || param.name || param.key || "参数")}：${escapeHtml(param.value || "")}${escapeHtml(param.unit || "")}
    </button>
  `).join("");

  dom.detailParams.querySelectorAll(".detail-param-chip").forEach((button) => {
    button.addEventListener("click", () => {
      openCalculatorTool(button.dataset.toolId || "speed", {
        [button.dataset.paramName || "value"]: button.dataset.paramValue || ""
      }, entry);
    });
  });
}

function getSmartRecommendations(entry) {
  const relatedById = toArray(entry.relatedIds || entry.related || entry.links)
    .map((id) => state.entries.find((item) => String(item.id) === String(id)))
    .filter(Boolean);
  const existingIds = new Set([entry.id, ...relatedById.map((item) => item.id)]);
  const tagText = getItemText(entry);
  const bySimilar = state.entries.filter((item) => {
    if (!item || existingIds.has(item.id)) return false;
    const text = getItemText(item);
    return text.includes(normalizeText(entry.category)) || tagText.includes(normalizeText(item.category));
  }).slice(0, 4);
  const history = state.recents
    .filter((id) => id !== entry.id)
    .map((id) => state.entries.find((item) => item.id === id))
    .filter(Boolean)
    .slice(0, 3);
  const nextById = entry.nextId ? state.entries.find((item) => item.id === entry.nextId) : null;
  return {
    next: nextById,
    items: [...relatedById, ...bySimilar, ...history].filter((item, index, arr) => arr.findIndex((x) => x.id === item.id) === index).slice(0, 6)
  };
}

function renderSmartRecommendSection(entry) {
  if (!dom.detailSmartRecommend) return;
  const recommendations = getSmartRecommendations(entry);
  const nextHtml = recommendations.next ? `
    <button type="button" class="detail-next-card" data-smart-entry="${escapeHtml(recommendations.next.id)}">
      <span>建议下一步</span>
      <strong>${escapeHtml(recommendations.next.title)}</strong>
    </button>
  ` : "";
  const itemsHtml = recommendations.items.length
    ? recommendations.items.map((item) => `
      <button type="button" class="detail-recommend-button" data-smart-entry="${escapeHtml(item.id)}">
        <strong>${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(item.summary || item.category || "相关知识点")}</span>
      </button>
    `).join("")
    : `<p class="detail-soft-empty">暂无更多智能推荐，后续可通过 relatedIds 增强。</p>`;

  dom.detailSmartRecommend.innerHTML = nextHtml + itemsHtml;
  dom.detailSmartRecommend.querySelectorAll("[data-smart-entry]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedId = button.dataset.smartEntry;
      renderWorkspace();
    });
  });
}

function renderDetailEnhancements(entry) {
  renderQuickCheckSection(entry);
  renderRelatedToolsSection(entry);
  renderDetailParamsSection(entry);
  renderSmartRecommendSection(entry);
}

function clearDetailEnhancements() {
  if (dom.detailQuickCheck) dom.detailQuickCheck.innerHTML = "";
  if (dom.detailTools) dom.detailTools.innerHTML = "";
  if (dom.detailParams) dom.detailParams.innerHTML = "";
  if (dom.detailSmartRecommend) dom.detailSmartRecommend.innerHTML = "";
}

function renderFrontendRiskWarning(entry) {
  var card = document.getElementById('detail-frontend-risk-card');
  var body = document.getElementById('detail-frontend-risk-body');
  if (!card || !body) return;
  if (!entry || !window.CNC_FRONTEND || !window.CNC_FRONTEND.getRiskFor) {
    card.hidden = true;
    return;
  }
  var text = (entry.title || '') + ' ' + (entry.code || '') + ' ' + (entry.summary || '') + ' ' + (entry.warning || '');
  var risk = window.CNC_FRONTEND.getRiskFor(text);
  if (risk) {
    card.hidden = false;
    body.innerHTML = '<p class="risk-message">' + escapeHtml(risk.riskMessage) + '</p><p class="risk-guard"><strong>建议防护：</strong>' + escapeHtml(risk.recommendedGuard || '无') + '</p>';
  } else {
    card.hidden = true;
  }
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
    dom.detailPreviewStatus.textContent = "当前先显示结构化速查内容。打开大型知识库条目后，这里会继续并入原文摘录。";
    dom.detailPreview.textContent = "还没有加载原文摘录。";
    if (dom.detailPrev) dom.detailPrev.disabled = true;
    if (dom.detailNextButton) dom.detailNextButton.disabled = true;
    if (dom.detailRisk) dom.detailRisk.textContent = "未选择";
    dom.detailImageCard.hidden = true;
    dom.relatedLinks.innerHTML = "";
    clearDetailEnhancements();
    renderFrontendRiskWarning(null);
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
  dom.detailPreviewStatus.textContent = "当前先显示结构化速查内容，正文摘录会继续补进来。";
  dom.detailPreview.textContent = "正在检查这条知识点有没有可直接并入的原文摘录……";
  if (dom.detailRisk) dom.detailRisk.textContent = entry.risk;
  renderFrontendRiskWarning(entry);

  const visible = getVisibleEntries();
  const currentIndex = visible.findIndex((item) => item.id === entry.id);
  if (dom.detailPrev) dom.detailPrev.disabled = currentIndex <= 0;
  if (dom.detailNextButton) dom.detailNextButton.disabled = currentIndex === -1 || currentIndex >= visible.length - 1;

  const images = getEntryImages(entry);
  if (images.length) {
    dom.detailImageCard.hidden = false;
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

  renderDetailEnhancements(entry);
  loadDetailPreview(entry);
}

// renderGallery() / renderGalleryRich()：旧版图库渲染逻辑已删除。
// 图库视图当前完全由 gallery-featured.js 独立管理 #cncGalleryGrid / #cncGalleryCount，
// 这两个函数原先操作的 #gallery-grid 容器在 index.html 里已不存在，属于历史遗留死代码。

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

function renderDashboardRecent() {
  const section = document.getElementById('dashboard-recent-section');
  const container = document.getElementById('dashboard-recent-list');
  if (!section || !container) return;

  const recentEntries = state.recents
    .map((id) => state.entries.find((entry) => entry.id === id))
    .filter(Boolean)
    .slice(0, 6);

  if (recentEntries.length === 0) {
    section.style.display = 'block';
    container.innerHTML = '<div class="recent-empty">这里干干净净的，像刚打扫过一样呢~ 快去逛逛，把喜欢的页面装进来吧！</div>';
    return;
  }

  section.style.display = 'block';
  container.innerHTML = recentEntries.map((entry) => `
    <article class="recent-card" data-entry-id="${escapeHtml(entry.id)}">
      <div class="recent-card-icon">${entry.category.includes('G代码') || entry.code.match(/^[GM]\d/) ? '📘' : '📄'}</div>
      <div>
        <div class="recent-card-meta">
          <span class="badge">${escapeHtml(entry.category)}</span>
          <strong>${escapeHtml(entry.code)}</strong>
        </div>
        <h4>${escapeHtml(entry.title)}</h4>
        <p>${escapeHtml(entry.summary.slice(0, 50))}${entry.summary.length > 50 ? '...' : ''}</p>
      </div>
    </article>
  `).join('');

  container.querySelectorAll('[data-entry-id]').forEach((card) => {
    card.addEventListener('click', () => {
      const entryId = card.dataset.entryId;
      state.selectedId = entryId;
      navigate('workspace');
    });
  });
}

function renderFAQPreview() {
  var container = document.getElementById('faq-list');
  var tabsContainer = document.getElementById('faq-tabs');
  if (!container) return;
  if (!window.CNC_FRONTEND || !window.CNC_FRONTEND.faq) {
    container.innerHTML = '<p class="faq-placeholder">FAQ 数据尚未加载，请稍后刷新页面。</p>';
    return;
  }
  var activeType = 'alarm';
  if (tabsContainer) {
    var activeTab = tabsContainer.querySelector('.faq-tab.active');
    if (activeTab) activeType = activeTab.dataset.faqType;
  }
  var faqs = window.CNC_FRONTEND.getFAQs(activeType, 5);
  if (!faqs.length) {
    container.innerHTML = '<p class="faq-placeholder">该分类暂无 FAQ。</p>';
    return;
  }
  container.innerHTML = faqs.map(function (faq) {
    var riskClass = faq.riskNote ? 'faq-item-has-risk' : '';
    var riskBadge = faq.riskNote ? '<span class="faq-risk-badge">高危</span>' : '';
    return '<details class="faq-item ' + riskClass + '"><summary>' + riskBadge + '<span class="faq-item-title">' + escapeHtml(faq.title) + '</span></summary><div class="faq-item-body"><p>' + escapeHtml(faq.shortAnswer || faq.fullAnswer || '') + '</p></div></details>';
  }).join('');

  if (tabsContainer) {
    tabsContainer.querySelectorAll('.faq-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabsContainer.querySelectorAll('.faq-tab').forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
        renderFAQPreview();
      });
    });
    var toggleBtn = document.getElementById('faq-toggle-btn');
    if (toggleBtn) {
      toggleBtn.onclick = function () {
        container.querySelectorAll('.faq-item').forEach(function (item) {
          item.open = !item.open;
        });
      };
    }
  }
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

function renderLibraryBrowser() {
  if (!dom.libraryBrowser) return;
  const categoryMap = new Map();
  state.entries.forEach((entry) => {
    const key = entry.category || "未分类";
    if (!categoryMap.has(key)) categoryMap.set(key, []);
    categoryMap.get(key).push(entry);
  });

  const groups = [...categoryMap.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 18);

  dom.libraryBrowser.innerHTML = groups.map(([category, entries]) => `
    <article class="library-browser-group">
      <h4>${escapeHtml(category)}</h4>
      <p>当前已并入 ${entries.length} 条。可以直接按这组分类进入工作区继续看。</p>
      <div class="library-browser-links">
        <button type="button" data-library-category="${escapeHtml(category)}">进入这组</button>
        ${entries.slice(0, 3).map((entry) => `<button type="button" data-library-entry="${escapeHtml(entry.id)}">${escapeHtml(entry.title)}</button>`).join("")}
      </div>
    </article>
  `).join("");

  dom.libraryBrowser.querySelectorAll("[data-library-category]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedCategory = button.dataset.libraryCategory || "全部栏目";
      state.activeFilter = "all";
      navigate("workspace");
    });
  });

  dom.libraryBrowser.querySelectorAll("[data-library-entry]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedId = button.dataset.libraryEntry;
      navigate("workspace");
    });
  });
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
  renderDashboardGallery();
  renderDashboardRecent();
  renderFAQPreview();
  renderLibraryStats();
  renderLibraryBrowser();
  renderAccessCenter();
  initRuntimeLayers();
  initSearchEngine();
}

function initRuntimeLayers() {
  if (!window.CNC_RUNTIME) return;
  if (window.CNC_RUNTIME._runtimeInitialized) return;

  var Runtime = window.CNC_RUNTIME;

  if (Runtime.ImageLayer && !Runtime.imageLayer) {
    try {
      Runtime.imageLayer = new Runtime.ImageLayer({
        featuredImages: window.CNC_FEATURED_IMAGES || {},
        featuredImagesExtended: window.CNC_FEATURED_IMAGES_EXTENDED || {},
        featuredImagesSupplement: window.CNC_FEATURED_IMAGES_SUPPLEMENT || {},
        galleryLibrary: window.CNC_GALLERY_LIBRARY || [],
        galleryLibraryEnhanced: window.CNC_GALLERY_LIBRARY_ENHANCED || [],
        entryToImagesMap: window.ENTRY_TO_IMAGES_MAP || {}
      });
      Runtime.DataLoader.log('info', 'initRuntimeLayers', 'ImageLayer initialized: ' + Runtime.imageLayer.getStatus().totalImages + ' images');
    } catch (e) {
      Runtime.DataLoader.log('error', 'initRuntimeLayers', 'ImageLayer init failed: ' + e.message);
    }
  }

  Runtime._runtimeInitialized = true;
}

function initSearchEngine() {
  if (!window.CNC_RUNTIME) return;
  var Runtime = window.CNC_RUNTIME;
  if (!Runtime.SearchEngine) return;
  if (Runtime.searchEngine) return;

  try {
    Runtime.searchEngine = new Runtime.SearchEngine({
      entries: state.entries || [],
      indexLight: (window.CNC_FRONTEND && window.CNC_FRONTEND.index) || [],
      suggestions: (window.CNC_FRONTEND && window.CNC_FRONTEND.suggestions) || [],
      faqs: (window.CNC_FRONTEND && window.CNC_FRONTEND.faq) || [],
      riskKeywords: (window.CNC_FRONTEND && window.CNC_FRONTEND.riskKeywords) || [],
      aliases: window.CNC_SEARCH_ALIASES || []
    });
    Runtime.DataLoader.log('info', 'initSearchEngine', 'SearchEngine initialized: ' + Runtime.searchEngine.getSourceStats().length + ' sources');
  } catch (e) {
    Runtime.DataLoader.log('error', 'initSearchEngine', 'SearchEngine init failed: ' + e.message);
  }
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

function setGateVisibility(visible) {
  if (!dom.gate) return;
  dom.gate.hidden = !visible;
  dom.gate.setAttribute("aria-hidden", visible ? "false" : "true");
  dom.gate.style.display = visible ? "grid" : "none";
}

// 注意：这是纯前端字符串比对，不是安全校验——源码里就能直接读到明文邀请码（见文件顶部 ACCESS_PROFILES 说明）。
async function grantAccess(code) {
  const trimmed = code.trim();
  const hash = await sha256Hex(trimmed);
  if (ACCESS_HASHES.has(hash)) {
    const profile = ACCESS_PROFILES.find((item) => item.hash === hash);
    state.accessGranted = true;
    state.accessProfileLabel = profile?.label || "已授权";
    localStorage.setItem(ACCESS_KEY, trimmed);
    setGateVisibility(false);
    if (dom.lockPill) dom.lockPill.textContent = state.accessProfileLabel;
    if (dom.accessMessage) dom.accessMessage.textContent = "授权成功，正在进入资料区。";
    renderAccessCenter();
    return true;
  }
  return false;
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

async function loadKnowledgeCore(silent) {
  if (state.coreLoaded) {
    logLibrary("核心知识库包已经加载过，不再重复加载。");
    if (!silent) navigate("library");
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
  if (!silent) navigate("library");
}

function bindRouteButtons() {
  // 路由按钮（带过滤器）
  document.querySelectorAll("[data-route]").forEach((button) => {
    button.addEventListener("click", () => {
      const view = button.dataset.route;
      const filter = button.dataset.filter;
      console.log('[路由跳转]', view, filter ? `(过滤: ${filter})` : '');
      navigate(view, { filter });
    });
  });

  // 直接跳转到指定条目
  document.querySelectorAll("[data-entry-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const entryId = button.dataset.entryId;
      console.log('[条目跳转]', entryId);
      state.selectedId = entryId;
      navigate("workspace");
    });
  });

  // 快捷搜索跳转（热门词按钮、quick-pill）
  document.querySelectorAll("[data-jump-keyword]").forEach((button) => {
    button.addEventListener("click", () => {
      const keyword = button.dataset.jumpKeyword || "";
      console.log('[快捷搜索]', keyword);
      state.keyword = keyword;
      state.activeFilter = "all";
      state.selectedCategory = "全部栏目";
      navigate("workspace", { keyword });
      // 确保工作区搜索框同步
      if (dom.searchInput) {
        dom.searchInput.value = keyword;
      }
      renderAll();
    });
  });
}

function handleHashChange() {
  const hash = location.hash.slice(1);
  // 路由映射：hash -> 实际视图名称
  const routeMap = {
    "dashboard": "dashboard",
    "study-map": "learning-map",
    "workspace": "workspace",
    "study": "study",
    "gallery": "gallery",
    "calculator": "calculator",
    "library": "library",
    "favorites": "favorites",
    "access": "access"
  };

  const view = routeMap[hash] || "study";
  navigate(view, { skipHash: true });
}

function initHashRouting() {
  window.addEventListener("hashchange", handleHashChange);
  handleHashChange();
}

function bindWorkspaceEvents() {
  if (dom.searchInput) {
    dom.searchInput.addEventListener("input", () => {
      state.keyword = dom.searchInput.value;
      renderWorkspace();
    });
  }

  if (dom.searchClearBtn) {
    dom.searchClearBtn.addEventListener("click", () => {
      state.keyword = "";
      if (dom.searchInput) dom.searchInput.value = "";
      renderWorkspace();
      if (dom.searchInput) dom.searchInput.focus();
    });
  }

  if (window.CNC_FRONTEND && window.CNC_FRONTEND.renderSuggestionBox) {
    var suggestionBox = document.getElementById('search-suggestions');
    window.CNC_FRONTEND.renderSuggestionBox(dom.searchInput, suggestionBox);
  }

  if (dom.categorySelect) {
    dom.categorySelect.addEventListener("change", () => {
      state.selectedCategory = dom.categorySelect.value;
      renderWorkspace();
    });
  }

  if (dom.presetChipRow) {
    dom.presetChipRow.addEventListener("click", (event) => {
      const button = event.target.closest("[data-filter-chip]");
      if (!button) return;
      state.activeFilter = button.dataset.filterChip;
      state.selectedCategory = "全部栏目";
      renderWorkspace();
    });
  }

  if (dom.knowledgeChipRow) {
    dom.knowledgeChipRow.addEventListener("click", (event) => {
      const button = event.target.closest("[data-quick-term]");
      if (!button) return;
      state.keyword = button.dataset.quickTerm;
      if (dom.searchInput) dom.searchInput.value = state.keyword;
      state.selectedCategory = "全部栏目";
      renderWorkspace();
    });
  }

  dom.workspaceModeRow?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-workspace-mode]");
    if (button) {
      state.workspaceMode = button.dataset.workspaceMode || "list";
      renderWorkspace();
      return;
    }

    const flagButton = event.target.closest("[data-workspace-flag]");
    if (!flagButton) return;
    if (flagButton.dataset.workspaceFlag === "with-images") {
      state.onlyWithImages = !state.onlyWithImages;
      renderWorkspace();
    }
  });

  if (dom.favoriteToggle) {
    dom.favoriteToggle.addEventListener("click", toggleFavorite);
  }
}

function bindSidebarEvents() {
  if (dom.sidebarOpen) {
    dom.sidebarOpen.addEventListener("click", openSidebar);
  }
  if (dom.sidebarClose) {
    dom.sidebarClose.addEventListener("click", closeSidebar);
  }
  if (dom.sidebarMask) {
    dom.sidebarMask.addEventListener("click", closeSidebar);
  }
  if (dom.homeButton) {
    dom.homeButton.addEventListener("click", () => {
      navigate("study");
    });
  }
}

function bindTreeEvents() {
  document.querySelectorAll("[data-tree-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.treeToggle;
      state.treeOpen[key] = !state.treeOpen[key];
      syncTreeState();
    });
  });
}

function bindLibraryEvents() {
  if (dom.loadCoreButton) {
    dom.loadCoreButton.addEventListener("click", () => loadKnowledgeCore());
  }
  if (dom.loadFullButton) {
    dom.loadFullButton.addEventListener("click", () => loadFullLocalArchive());
  }
}

function bindDetailEvents() {
  if (dom.loadPreviewButton) {
    dom.loadPreviewButton.addEventListener("click", async () => {
      const entry = state.entries.find((item) => item.id === state.selectedId);
      await loadDetailPreview(entry);
    });
  }

  if (dom.detailPrev) {
    dom.detailPrev.addEventListener("click", () => stepVisibleEntry(-1));
  }

  if (dom.detailNextButton) {
    dom.detailNextButton.addEventListener("click", () => stepVisibleEntry(1));
  }
}

function bindAccessEvents() {
  if (dom.accessForm) {
    dom.accessForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const code = dom.accessInput ? dom.accessInput.value : "";
      const ok = await grantAccess(code);
      if (ok && !state.coreLoaded) {
        await loadKnowledgeCore();
      }
      if (dom.accessMessage) {
        dom.accessMessage.textContent = ok
          ? "授权成功，已经进入资料区。"
          : "邀请码不对。你可以换一个邀请码或通过私密链接进入。";
      }
    });
  }
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

function isLocalTrustedEnvironment() {
  const { protocol, hostname } = window.location;
  return (
    protocol === "file:" ||
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "[::1]"
  );
}

async function initAccess() {
  if (window.__FORCE_ACCESS_GRANTED__) {
    state.accessGranted = true;
    state.accessProfileLabel = "开发免密模式";
    setGateVisibility(false);
    if (dom.lockPill) dom.lockPill.style.display = "none";
    const accessBtn = document.querySelector('button[data-route="access"]');
    if (accessBtn) accessBtn.style.display = "none";
    localStorage.setItem(ACCESS_KEY, "dev-mode");
    renderAccessCenter();
    return;
  }

  if (isLocalTrustedEnvironment()) {
    state.accessGranted = true;
    state.accessProfileLabel = "本地调试访问";
    setGateVisibility(false);
    if (dom.lockPill) dom.lockPill.textContent = state.accessProfileLabel;
    if (dom.accessMessage) dom.accessMessage.textContent = "当前是本地打开，已自动放行。";
    localStorage.setItem(ACCESS_KEY, "dev-mode");
    renderAccessCenter();
    return;
  }

  const stored = localStorage.getItem(ACCESS_KEY);
  const urlCode = new URLSearchParams(window.location.search).get("invite");
  const candidate = urlCode || stored || "";

  if (candidate) {
    const ok = await grantAccess(candidate);
    if (ok) return;
  }

  state.accessGranted = false;
  setGateVisibility(true);
  if (dom.lockPill) dom.lockPill.textContent = "访问受控";
  renderAccessCenter();
}

async function bootstrap() {
  state.favorites = readStorage(FAVORITES_KEY);
  state.recents = readStorage(RECENTS_KEY);
  state.studyProgress = readStudyProgress();

  bindRouteButtons();
  bindWorkspaceEvents();
  bindSidebarEvents();
  bindTreeEvents();
  bindLibraryEvents();
  bindDetailEvents();
  bindAccessEvents();
  bindCalculators();
  bindEnhancedUI();

  syncTreeState();
  renderLibraryLog();
  renderAll();
  renderProgressLinks();
  initHashRouting();
  calculateRpm();
  calculateVc();
  calculateFeed();
  calculatePitch();
  calculateDiameter();
  await initAccess();
  if (window.CNC_FRONTEND && window.CNC_FRONTEND.init) {
    window.CNC_FRONTEND.init().then(function () {
      renderFAQPreview();
      initSearchEngine();
      initRuntimeLayers();
    });
  }
  if (state.accessGranted && !state.coreLoaded) {
    await loadKnowledgeCore(true);
  }
  await initEnhancedFeatures();
}

// ============================================
// 增强功能初始化
// ============================================

let knowledgeTreeUI = null;
let recommendationsUI = null;

function bindEnhancedUI() {
  // 快速搜索 - 首页搜索框
  const quickSearchInput = document.getElementById('quick-search-input');
  const quickSearchBtn = document.getElementById('quick-search-btn');

  if (quickSearchBtn) {
    quickSearchBtn.addEventListener('click', () => {
      if (quickSearchInput && quickSearchInput.value.trim()) {
        const keyword = quickSearchInput.value.trim();
        console.log('[快速搜索] 触发搜索:', keyword);
        state.keyword = keyword;
        state.activeFilter = 'all';
        state.selectedCategory = '全部栏目';
        navigate('workspace', { keyword });
        // 确保工作区搜索框同步
        if (dom.searchInput) {
          dom.searchInput.value = keyword;
        }
        renderAll();
      }
    });
  }

  if (quickSearchInput) {
    quickSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && quickSearchInput.value.trim()) {
        const keyword = quickSearchInput.value.trim();
        console.log('[快速搜索] Enter触发搜索:', keyword);
        state.keyword = keyword;
        state.activeFilter = 'all';
        state.selectedCategory = '全部栏目';
        navigate('workspace', { keyword });
        // 确保工作区搜索框同步
        if (dom.searchInput) {
          dom.searchInput.value = keyword;
        }
        renderAll();
      }
    });
  }

  // 知识地图视图切换
  const mapViewButtons = document.querySelectorAll('[data-map-view]');
  mapViewButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.mapView;
      mapViewButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      if (knowledgeTreeUI) {
        knowledgeTreeUI.switchView(view);
      }
    });
  });

  // 启动台统计更新
  updateLaunchpadStats();

  // 学习卡片交互绑定
  bindStudyCards();
}

// ============================================
// 学习卡片点击跳转详情
// ============================================

/**
 * 兼容不同 data.js 命名
 */
function getKnowledgeList() {
  return state.entries || [];
}

/**
 * 从学习卡片中提取标题
 */
function getStudyCardTitle(card) {
  const titleEl =
    card.querySelector('.card-title') ||
    card.querySelector('.study-card-title') ||
    card.querySelector('h3') ||
    card.querySelector('h4') ||
    card.querySelector('.title');

  return titleEl ? titleEl.textContent.trim() : card.textContent.trim();
}

/**
 * 根据卡片标题找到匹配规则（使用统一的规则模块）
 */
function findStudyRuleByCardTitle(cardTitle) {
  // 优先使用外部规则模块
  if (window.CNC_STUDY_ENTRY_RULES) {
    return window.CNC_STUDY_ENTRY_RULES.findRuleByCardTitle(cardTitle);
  }

  // 降级：使用内部规则（保持兼容性）
  if (!STUDY_CARD_MATCH_RULES || !Array.isArray(STUDY_CARD_MATCH_RULES)) {
    console.warn('[findStudyRuleByCardTitle] 规则未加载');
    return null;
  }

  const normalizedCardTitle = normalizeCompactText(cardTitle);
  return STUDY_CARD_MATCH_RULES.find(rule => {
    const normalizedRuleTitle = normalizeCompactText(rule.cardTitle);
    return (
      normalizedCardTitle.includes(normalizedRuleTitle) ||
      normalizedRuleTitle.includes(normalizedCardTitle)
    );
  });
}

/**
 * 根据规则从 data.js 中找到知识点
 */
function findKnowledgeItemByRule(rule) {
  const list = getKnowledgeList();
  if (!Array.isArray(list) || !rule) return null;

  // 优先使用外部规则模块的查找逻辑
  if (window.CNC_STUDY_ENTRY_RULES) {
    return window.CNC_STUDY_ENTRY_RULES.findKnowledgeItem(rule, list);
  }

  // 降级：使用内部逻辑
  // 1. 优先按 id 精确匹配
  if (rule.id) {
    const itemById = list.find(item => item.id === rule.id);
    if (itemById) return itemById;
  }

  // 2. 再按关键词匹配
  const keywords = rule.keywords || [];
  return list.find(item => {
    const searchableText = normalizeCompactText([
      item.id,
      item.title,
      item.name,
      item.subtitle,
      item.desc,
      item.description,
      item.content,
      Array.isArray(item.tags) ? item.tags.join(' ') : item.tags,
      item.category
    ].join(' '));

    return keywords.some(keyword => searchableText.includes(normalizeCompactText(keyword)));
  });
}

/**
 * 跳转到详情页
 */
function goToKnowledgeDetail(item) {
  if (!item || !item.id) return;

  // 使用项目现有的路由机制
  state.selectedId = item.id;
  navigate('workspace');
  renderAll();
}

function openStudyDetail(level) {
  var panel = document.getElementById("study-detail-panel");
  var content = document.getElementById("study-detail-content");
  var stagesList = document.querySelector("#view-study .learning-stages");
  var studyHead = document.querySelector("#view-study .section-head");
  var title = parseInt(level, 10);

  if (!panel || !content) {
    console.error('[openStudyDetail] 找不到详情面板容器');
    return;
  }
  if (!title || title < 1 || title > MAX_STUDY_LEVEL) {
    content.innerHTML = '<div style="padding:20px;text-align:center;color:#64748B;">'
      + '<h3>关卡参数无效</h3>'
      + '<p>请从左侧第 1-12 关卡卡片进入。</p>'
      + '</div>';
    panel.style.display = "block";
    return;
  }

  var html = "";
  if (window.CNC_LEARNING_UI && typeof window.CNC_LEARNING_UI.renderLessonDetail === "function") {
    html = window.CNC_LEARNING_UI.renderLessonDetail(title);
  }

  if (!html) {
    html = '<div style="padding:20px;text-align:center;color:#64748B;">'
      + '<h3>第 ' + title + ' 关</h3>'
      + '<p>详细内容正在准备中，敬请期待...</p>'
      + '</div>';
  }

  content.innerHTML = html;
  if (typeof window.CNC_LEARNING_UI.initNavigation === "function") {
    window.CNC_LEARNING_UI.initNavigation();
  }
  if (typeof window.CNC_LEARNING_UI.hydrateLessonImages === "function") {
    window.CNC_LEARNING_UI.hydrateLessonImages(title);
  }
  bindStudyLessonNavigation();

  // 隐藏关卡列表，显示详情
  if (stagesList) stagesList.style.display = "none";
  if (studyHead) studyHead.style.display = "none";
  panel.style.display = "block";

  // 滚动到顶部
  panel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeStudyDetail() {
  var panel = document.getElementById("study-detail-panel");
  var stagesList = document.querySelector("#view-study .learning-stages");
  var studyHead = document.querySelector("#view-study .section-head");

  if (panel) panel.style.display = "none";
  if (stagesList) stagesList.style.display = "";
  if (studyHead) studyHead.style.display = "";
}

function getStudyCardElements() {
  const cardSelector = [
    '.study-card',
    '.level-card',
    '.lesson-card',
    '.checkpoint-card',
    '[data-study-card]'
  ].join(',');

  return document.querySelectorAll(cardSelector);
}

function syncStudyCardCompletion() {
  const cards = getStudyCardElements();
  const completed = new Set(getStudyProgress().completedLevels);

  cards.forEach((card) => {
    const level = parseInt(card.dataset.level, 10);
    if (!level) return;
    if (completed.has(level)) {
      card.classList.add("is-complete");
      card.setAttribute("aria-complete", "true");
      card.dataset.studyCompleted = "1";
    } else {
      card.classList.remove("is-complete");
      card.setAttribute("aria-complete", "false");
      card.dataset.studyCompleted = "0";
    }
  });
}

function renderStudyProgressPanel() {
  var container = document.getElementById("study-progress-panel");
  if (!container) return;

  var progress = getStudyProgress();
  var total = MAX_STUDY_LEVEL;
  var done = progress.completedLevels.length;
  var percent = Math.round((done / total) * 100);
  var stageOne = (Math.max(0, Math.min(done, 4)));
  var stageTwo = (Math.max(0, Math.min(done - 4, 3)));
  var stageThree = (Math.max(0, Math.min(done - 7, 4)));
  var stageFour = Math.max(0, done - 11);

  container.innerHTML = ""
    + '<div class="study-progress-overview">'
    + '  <div>学习进度：<strong>' + done + '</strong> / ' + total + ' 关</div>'
    + '  <span>' + percent + '%</span>'
    + '</div>'
    + '<div class="study-progress-track"><div class="study-progress-fill" style="width:' + percent + '%"></div></div>'
    + '<div class="study-progress-stage">'
    + '  <span>阶段一（4）</span>' + stageOne + '/4、'
    + '  <span>阶段二（3）</span>' + stageTwo + '/3、'
    + '  <span>阶段三（4）</span>' + stageThree + '/4、'
    + '  <span>阶段四（1）</span>' + stageFour + '/1'
    + '</div>'
    + '<div class="study-progress-items">'
    + Array.from({ length: total }, function (_, idx) {
      var lv = idx + 1;
      return '<span class="study-progress-item' + (progress.completedLevels.includes(lv) ? " completed" : "") + '" title="第 ' + lv + ' 关">' + lv + '</span>';
    }).join("")
    + '</div>';
}

function bindStudyLessonNavigation() {
  var nav = document.getElementById("lesson-nav");
  if (!nav) return;

  if (!nav.dataset.bound) {
    nav.addEventListener("click", function(event) {
      var target = event.target.closest(".lesson-nav-btn");
      if (!target || !nav.contains(target)) return;
      var level = parseInt(target.dataset.level, 10);
      if (!level) return;

      if (target.classList.contains("mark-complete")) {
        markStudyLevelCompleted(level);
        return;
      }

      if (!Number.isNaN(level)) {
        openStudyDetail(level);
      }
    });
    nav.dataset.bound = "true";
  }

  var currentLevel = window.CNC_LEARNING_UI && typeof window.CNC_LEARNING_UI.getCurrentLevel === "function"
    ? parseInt(window.CNC_LEARNING_UI.getCurrentLevel(), 10)
    : -1;
  var completeBtn = nav.querySelector(".mark-complete");
  if (completeBtn) {
    var isCurrentDone = currentLevel >= 1 && currentLevel <= MAX_STUDY_LEVEL
      ? getStudyProgress().completedLevels.includes(currentLevel)
      : false;
    completeBtn.textContent = isCurrentDone ? "已标记完成 ✓" : "标记完成 ✓";
  }
}

/**
 * 绑定 12 张学习卡片点击事件
 */
function bindStudyCards() {
  const cards = getStudyCardElements();

  if (!cards.length) {
    console.warn('[bindStudyCards] 没找到学习卡片，请检查卡片 class。');
    return;
  }

  console.log(`[bindStudyCards] 找到 ${cards.length} 个学习卡片`);

  cards.forEach(card => {
    // 防止重复绑定
    if (card.dataset.studyBound === 'true') return;
    card.dataset.studyBound = 'true';

    card.style.cursor = 'pointer';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');

    const handleOpen = () => {
      const level = parseInt(card.dataset.level, 10);
      if (level) {
        openStudyDetail(level);
        return;
      }

      const cardTitle = getStudyCardTitle(card);
      const rule = findStudyRuleByCardTitle(cardTitle);

      if (!rule) {
        console.warn('[学习卡片未配置匹配规则]', cardTitle);
        return;
      }

      const item = findKnowledgeItemByRule(rule);
      if (!item) {
        console.warn('[未在 data.js 中找到对应知识点]', {
          cardTitle,
          rule
        });
        return;
      }

      console.log('[学习卡片跳转]', cardTitle, '→', item.title);
      goToKnowledgeDetail(item);
    };

    card.addEventListener('click', handleOpen);

    // 支持键盘 Enter / Space 打开
    card.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleOpen();
      }
    });
  });

  syncStudyCardCompletion();
  renderStudyProgressPanel();
}

async function initEnhancedFeatures() {
  // 初始化知识树UI
  if (typeof KnowledgeTreeUI !== 'undefined') {
    try {
      knowledgeTreeUI = new KnowledgeTreeUI('knowledgeTreeContainer');
      const loaded = await knowledgeTreeUI.loadTree();
      knowledgeTreeUI.render();
      knowledgeTreeUI.setNodeClickHandler((node) => {
        // 根据节点ID跳转到对应内容
        if (node.id && node.id.startsWith('cat-')) {
          const filter = node.id.replace('cat-', '');
          state.activeFilter = filter;
          navigate('workspace');
          renderAll();
        }
      });
    } catch (err) {
      console.error('知识树初始化失败:', err);
    }
  }

  // 初始化推荐系统UI
  if (typeof RecommendationsUI !== 'undefined') {
    recommendationsUI = new RecommendationsUI();
    await recommendationsUI.loadRecommendations();
  }

  // 渲染首页精选图片
  renderFeaturedImagesPreview();
}

function updateLaunchpadStats() {
  const statEntries = document.getElementById('stat-entries');
  const statImages = document.getElementById('stat-images');
  const statRecents = document.getElementById('stat-recents');

  if (statEntries) {
    statEntries.textContent = state.entries.length;
  }

  if (statImages) {
    const imageCount = (window.CNC_GALLERY_LIBRARY_ENHANCED || []).length;
    statImages.textContent = imageCount;
  }

  if (statRecents) {
    statRecents.textContent = state.recents.length;
  }
}

function renderFeaturedImagesPreview() {
  const container = document.getElementById('featuredImagesPreview');
  if (!container) return;

  const images = (window.CNC_GALLERY_LIBRARY_ENHANCED || []).slice(0, 8);

  if (images.length === 0) {
    container.innerHTML = '<div class="empty-state">暂无图片数据</div>';
    return;
  }

  container.innerHTML = images.map(img => `
    <div class="featured-image-card" data-image-id="${img.id || ''}">
      <img src="${img.path || './assets/images/batch01_core/' + (img.id || 'placeholder') + '.svg'}"
           alt="${img.title || '图片'}"
           loading="lazy"
           onerror="this.style.display='none'">
      <div class="featured-image-info">
        <h5>${img.title || '未命名'}</h5>
      </div>
    </div>
  `).join('');

  // 绑定点击事件
  container.querySelectorAll('.featured-image-card').forEach(card => {
    card.addEventListener('click', () => {
      navigate('gallery');
    });
  });
}

// 增强详情页推荐
function renderEnhancedRecommendations(entryId) {
  if (!recommendationsUI) return;

  const recommendations = recommendationsUI.getRecommendationsFor(entryId, {
    category: state.selectedCategory
  });

  recommendationsUI.renderRecommendations('related-links', recommendations);
}

// 导出全局方法供其他模块使用
window.app = {
  selectEntry: (id) => {
    const entry = state.entries.find(e => e.id === id);
    if (entry) {
      state.selectedId = id;
      navigate('workspace');
      renderDetail();
    }
  },
  navigate: navigate,
  updateLaunchpadStats: updateLaunchpadStats
};

bootstrap();
