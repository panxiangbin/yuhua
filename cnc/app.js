// === 开发模式：禁用访问控制 ===
const DEV_MODE = true;
if (DEV_MODE) {
  window.__FORCE_ACCESS_GRANTED__ = true;
}

const FAVORITES_KEY = "cnc_app_favorites_v2";
const RECENTS_KEY = "cnc_app_recents_v2";
const ACCESS_KEY = "cnc_app_access_code_v1";
const ACCESS_PUBLIC_URL = "https://panxiangbin.github.io/yuhua/cnc/";

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
  dashboard: { kicker: "", title: "数控学习工作台" },
  study: { kicker: "新手学习路线", title: "先按顺序学，再单点深入" },
  workspace: { kicker: "快速查询", title: "左边找条目，右边看详情" },
  "learning-map": { kicker: "知识地图", title: "可视化知识结构与学习路径" },
  gallery: { kicker: "图片图库", title: "125张专业教学图片资料" },
  calculator: { kicker: "换算工具", title: "转速、线速度、进给、螺距快速计算" },
  library: { kicker: "知识库管理", title: "逐步把本地数据库接进网页" },
  favorites: { kicker: "学习记录", title: "最近查看和收藏会保留下来" },
  balloon: { kicker: "质检工具", title: "图纸气泡标注与检测记录" },
  access: { kicker: "访问控制", title: "只让你授权的人看到完整资料" }
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

const QUICK_TERMS = ["G02", "G54", "1815", "回零", "对刀", "报警", "G83", "G84", "螺距", "SV0401", "PS0001", "OT0500"];

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
  activeView: "dashboard",
  activeFilter: "all",
  selectedCategory: "全部栏目",
  keyword: "",
  workspaceMode: "visual",
  onlyWithImages: false,
  selectedId: null,
  favorites: [],
  recents: [],
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
  libraryLogs: [],
  listRenderLimit: 50,
  _lastFilterKey: ""
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
    ...safeArray(window.CNC_KB_README_INDEX),
    ...safeArray(window.CNC_ALARM_FAQ),
    ...safeArray(window.CNC_WEAK_CATEGORY),
    ...safeArray(window.CNC_GM_CODES)
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
  if (["gallery", "calculator", "library", "favorites", "access", "balloon"].includes(view)) {
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
  if (dom.topbarKicker) {
    dom.topbarKicker.textContent = meta.kicker;
    dom.topbarKicker.style.display = meta.kicker ? "" : "none";
  }
  if (dom.topbarTitle) dom.topbarTitle.textContent = meta.title;

  // 根据 workspace 的 filter 参数设置不同标题
  if (view === "workspace" && state.activeFilter) {
    var filterTitles = {
      "gcode": { kicker: "G/M代码查询", title: "查代码含义、用法和易错点" },
      "params": { kicker: "参数速查", title: "查常见参数含义和注意事项" },
      "tooling": { kicker: "工艺刀具", title: "查看刀具、材料和工艺经验" },
      "all": { kicker: "快速查询", title: "左边找条目，右边看详情" }
    };
    var ft = filterTitles[state.activeFilter];
    if (ft) {
      if (dom.topbarKicker) {
        dom.topbarKicker.textContent = ft.kicker;
        dom.topbarKicker.style.display = ft.kicker ? "" : "none";
      }
      if (dom.topbarTitle) dom.topbarTitle.textContent = ft.title;
    }
  }

  const homeBtn = document.getElementById("home-btn");
  if (homeBtn) homeBtn.classList.toggle("visible", view !== "dashboard");

  document.querySelectorAll(".tree-parent, .tree-item").forEach((button) => {
    const isSameView = button.dataset.route === view;
    const sameFilter = !button.dataset.filter || button.dataset.filter === state.activeFilter;
    button.classList.toggle("active", isSameView && sameFilter);
  });

  if (view === "workspace") {
    if (dom.searchInput) dom.searchInput.value = state.keyword;

    // 动态设置 workspace 内部标题
    var wsEyebrow = document.getElementById("workspace-eyebrow");
    var wsTitle = document.getElementById("workspace-title");
    var wsTitles = {
      "gcode": { eyebrow: "G/M CODE", title: "G/M代码查询" },
      "params": { eyebrow: "PARAMS & ALARM", title: "参数速查" },
      "tooling": { eyebrow: "TOOL & PROCESS", title: "工艺刀具" },
      "all": { eyebrow: "KNOWLEDGE BASE", title: "知识库工作区" }
    };
    var wsT = wsTitles[state.activeFilter] || wsTitles["all"];
    if (wsEyebrow) wsEyebrow.textContent = wsT.eyebrow;
    if (wsTitle) wsTitle.textContent = wsT.title;

    // 动态修改搜索框 placeholder
    if (dom.searchInput) {
      var wsPlaceholders = {
        "gcode": "搜索 G代码 / M代码，例如 G02、G43、M08、M30",
        "params": "搜索报警号、参数名，例如 1815、EX1020、主轴参数",
        "tooling": "搜索刀具、材料、工艺，例如 铝合金、球刀、粗加工",
        "all": "G代码 · 报警 · 对刀 · 刀具..."
      };
      dom.searchInput.placeholder = wsPlaceholders[state.activeFilter] || wsPlaceholders["all"];
    }

    // 特定 filter 时隐藏分类下拉
    var filterGroup = document.getElementById("workspace-filter-group");
    if (filterGroup) {
      filterGroup.style.display = (state.activeFilter === "all" || !state.activeFilter) ? "" : "none";
    }

    renderWorkspace();
  }

  if (view === "dashboard") renderDashboardRecent();
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
    dom.sidebarMask.hidden = window.innerWidth > 760;
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
  var filterKey = (state.keyword || "") + "|" + (state.selectedCategory || "") + "|" + (state.activeFilter || "");
  if (filterKey !== state._lastFilterKey) {
    state.listRenderLimit = 50;
    state._lastFilterKey = filterKey;
  }
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
    dom.searchMeta.textContent = `共 ${filtered.length} 条 · ${activeFilterLabel} · ${categoryLabel}`;
  }

  if (dom.resultList) {
    dom.resultList.classList.toggle("visual-mode", state.workspaceMode === "visual");
  }

  if (filtered.length && !filtered.some((entry) => entry.id === state.selectedId)) {
    state.selectedId = filtered[0].id;
  }

  if (dom.resultList) {
    var renderLimit = Math.min(state.listRenderLimit, filtered.length);
    dom.resultList.innerHTML = filtered.length
    ? filtered.slice(0, renderLimit).map((entry) => {
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
    + (filtered.length > renderLimit ? '<div style="text-align:center;padding:16px 0;"><button class="load-more-btn" data-load-more type="button">加载更多（还有 ' + (filtered.length - renderLimit) + ' 条）</button></div>' : "")
    : `<article class="result-card result-empty-state">
        <h4>没有找到匹配项</h4>
        <p>换个关键词试试，或者点击下方热门搜索：</p>
        <div class="empty-state-grid">
          <div class="empty-state-group">
            <span class="empty-state-label">编程基础</span>
            <button class="empty-state-chip" data-open-search="G02">G02</button>
            <button class="empty-state-chip" data-open-search="G54">G54</button>
            <button class="empty-state-chip" data-open-search="G84">G84</button>
          </div>
          <div class="empty-state-group">
            <span class="empty-state-label">操作技能</span>
            <button class="empty-state-chip" data-open-search="对刀">对刀</button>
            <button class="empty-state-chip" data-open-search="回零">回零</button>
            <button class="empty-state-chip" data-open-search="刀具">刀具</button>
          </div>
          <div class="empty-state-group">
            <span class="empty-state-label">报警排查</span>
            <button class="empty-state-chip" data-open-search="SV0401">SV0401</button>
            <button class="empty-state-chip" data-open-search="PS0001">PS0001</button>
            <button class="empty-state-chip" data-open-search="报警">全部报警</button>
          </div>
        </div>
      </article>`;

    dom.resultList.querySelectorAll("[data-open-entry]").forEach((button) => {
      button.addEventListener("click", () => {
        state.selectedId = button.dataset.openEntry;
        renderWorkspace();
        renderDetail();
        const dp = document.getElementById("detail-panel");
        if (dp && window.innerWidth <= 768) {
          dp.classList.add("mobile-open");
          dp.scrollTop = 0;
        }
      });
    });

    dom.resultList.querySelectorAll("[data-open-search]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.keyword = btn.dataset.openSearch;
        if (dom.searchInput) dom.searchInput.value = state.keyword;
        renderWorkspace();
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
  dom.favoriteToggle.textContent = active ? "★" : "☆";
  dom.favoriteToggle.title = active ? "取消收藏" : "收藏这条内容";
  dom.favoriteToggle.setAttribute("aria-label", active ? "取消收藏" : "收藏这条内容");
  dom.favoriteToggle.classList.toggle("active", active);
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
    var imageCountBadge = document.getElementById("image-count-badge");
    if (imageCountBadge) imageCountBadge.textContent = images.length + " 张";
  } else {
    dom.detailImageCard.hidden = true;
    dom.detailImageStage.innerHTML = "";
    var imageCountBadge = document.getElementById("image-count-badge");
    if (imageCountBadge) imageCountBadge.textContent = "0 张";
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
  dom.archiveCount.textContent = state.fullLocalLoaded ? `${state.archiveEntries.length} 条索引已并入` : "按需加载";
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
  var ls = document.getElementById('loading-screen');
  if (ls) ls.style.display = 'none';
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

function toNum(v) {
  var n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function bindCalculators() {
  var cards = document.querySelectorAll("#view-calculator .calc-card");

  cards.forEach(function (card) {
    var body = card.querySelector(".calc-card-body");
    var header = card.querySelector(".calc-card-header");
    body.classList.add("hidden");
    header.classList.add("collapsed");
    card.classList.add("calc-collapsed");
  });

  cards.forEach(function (card) {
    var header = card.querySelector(".calc-card-header");
    header.addEventListener("click", function (e) {
      if (e.target.closest(".calc-btn")) return;
      var body = card.querySelector(".calc-card-body");
      var isAlreadyOpen = !body.classList.contains("hidden");
      cards.forEach(function (other) {
        var ob = other.querySelector(".calc-card-body");
        var oh = other.querySelector(".calc-card-header");
        if (other !== card) {
          ob.classList.add("hidden");
          ob.classList.remove("open");
          oh.classList.add("collapsed");
          other.classList.add("calc-collapsed");
        }
      });
      if (isAlreadyOpen) {
        body.classList.add("hidden");
        body.classList.remove("open");
        header.classList.add("collapsed");
        card.classList.add("calc-collapsed");
      } else {
        body.classList.remove("hidden");
        body.classList.add("open");
        header.classList.remove("collapsed");
        card.classList.remove("calc-collapsed");
      }
    });
  });

  document.querySelectorAll("#view-calculator .calc-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var card = this.closest(".calc-card");
      var calcId = card.dataset.calc;
      var inputs = card.querySelectorAll(".calc-input");
      var resultEl = card.querySelector(".calc-result");
      var a = toNum(inputs[0] ? inputs[0].value : null);
      var b = toNum(inputs[1] ? inputs[1].value : null);
      var c = toNum(inputs[2] ? inputs[2].value : null);
      var val, unit;

      switch (calcId) {
        case "calc1":
          if (a === null || b === null || b <= 0) { resultEl.textContent = "请输入正确的正数参数"; return; }
          val = Math.round((1000 * a) / (Math.PI * b));
          unit = "rpm";
          break;
        case "calc2":
          if (a === null || b === null || b <= 0) { resultEl.textContent = "请输入正确的正数参数"; return; }
          val = (Math.PI * b * a) / 1000;
          unit = "m/min";
          break;
        case "calc3":
          if (a === null || b === null || c === null || b <= 0) { resultEl.textContent = "请输入正确的正数参数"; return; }
          val = Math.round(a * b * c);
          unit = "mm/min";
          break;
        case "calc4":
          if (a === null || b === null) { resultEl.textContent = "请输入正确的正数参数"; return; }
          val = Math.round(a * b);
          unit = "mm/min";
          break;
        case "calc5":
          if (a === null || a <= 0) { resultEl.textContent = "请输入正确的正数参数"; return; }
          val = (25.4 / a).toFixed(3);
          unit = "mm";
          break;
        case "calc6":
          if (a === null || a < 0) { resultEl.textContent = "请输入正确的正数参数"; return; }
          val = (2 * a).toFixed(1);
          unit = "mm";
          break;
        default:
          resultEl.textContent = "未知计算器";
          return;
      }

      resultEl.textContent = val + " " + unit;
    });
  });
}

// ===== 3-in-1 Tool: Data Constants =====
var MATERIAL_RULES = {
  aluminum: { name: "铝合金", hardnessRange: "HB 50–120", carbide: { vc: [200, 400], fzBase: 0.05 }, coated: { vc: [250, 500], fzBase: 0.06 }, hss: { vc: [80, 150], fzBase: 0.04 }, insert: { vc: [300, 600], fzBase: 0.08 }, al_tool: { vc: [350, 700], fzBase: 0.08 }, ball: { vc: [150, 300], fzBase: 0.04 }, drill_bit: { vc: [60, 120], fzBase: 0.03 }, tap_tool: { vc: [8, 20], fzBase: 0.02 } },
  steel_45: { name: "45钢", hardnessRange: "HB 160–220", carbide: { vc: [120, 200], fzBase: 0.04 }, coated: { vc: [150, 250], fzBase: 0.05 }, hss: { vc: [22, 35], fzBase: 0.025 }, insert: { vc: [140, 220], fzBase: 0.06 }, al_tool: { vc: [80, 140], fzBase: 0.03 }, ball: { vc: [80, 140], fzBase: 0.03 }, drill_bit: { vc: [18, 35], fzBase: 0.02 }, tap_tool: { vc: [5, 10], fzBase: 0.01 } },
  steel_40cr: { name: "40Cr", hardnessRange: "HB 200–280", carbide: { vc: [100, 180], fzBase: 0.035 }, coated: { vc: [120, 220], fzBase: 0.045 }, hss: { vc: [18, 30], fzBase: 0.02 }, insert: { vc: [120, 200], fzBase: 0.05 }, al_tool: { vc: [70, 120], fzBase: 0.025 }, ball: { vc: [70, 120], fzBase: 0.025 }, drill_bit: { vc: [15, 28], fzBase: 0.015 }, tap_tool: { vc: [4, 8], fzBase: 0.008 } },
  steel_42crmo: { name: "42CrMo", hardnessRange: "HB 280–350", carbide: { vc: [80, 150], fzBase: 0.03 }, coated: { vc: [100, 180], fzBase: 0.04 }, hss: { vc: [14, 25], fzBase: 0.018 }, insert: { vc: [100, 170], fzBase: 0.045 }, al_tool: { vc: [55, 100], fzBase: 0.02 }, ball: { vc: [55, 100], fzBase: 0.02 }, drill_bit: { vc: [12, 22], fzBase: 0.012 }, tap_tool: { vc: [3, 6], fzBase: 0.006 } },
  die_steel: { name: "模具钢", hardnessRange: "HRC 30–52", carbide: { vc: [50, 120], fzBase: 0.025 }, coated: { vc: [70, 160], fzBase: 0.035 }, hss: { vc: [10, 18], fzBase: 0.015 }, insert: { vc: [60, 140], fzBase: 0.04 }, al_tool: { vc: [35, 70], fzBase: 0.015 }, ball: { vc: [40, 80], fzBase: 0.02 }, drill_bit: { vc: [8, 15], fzBase: 0.01 }, tap_tool: { vc: [2, 5], fzBase: 0.005 } },
  stainless: { name: "不锈钢", hardnessRange: "HB 180–280", carbide: { vc: [60, 120], fzBase: 0.03 }, coated: { vc: [80, 160], fzBase: 0.04 }, hss: { vc: [12, 22], fzBase: 0.018 }, insert: { vc: [80, 150], fzBase: 0.045 }, al_tool: { vc: [40, 80], fzBase: 0.02 }, ball: { vc: [40, 80], fzBase: 0.02 }, drill_bit: { vc: [8, 18], fzBase: 0.012 }, tap_tool: { vc: [3, 6], fzBase: 0.005 } },
  cast_iron: { name: "铸铁", hardnessRange: "HB 150–250", carbide: { vc: [100, 200], fzBase: 0.04 }, coated: { vc: [120, 250], fzBase: 0.055 }, hss: { vc: [18, 30], fzBase: 0.025 }, insert: { vc: [120, 220], fzBase: 0.06 }, al_tool: { vc: [60, 120], fzBase: 0.03 }, ball: { vc: [60, 120], fzBase: 0.03 }, drill_bit: { vc: [15, 28], fzBase: 0.02 }, tap_tool: { vc: [4, 8], fzBase: 0.008 } },
  copper: { name: "铜", hardnessRange: "HB 40–80", carbide: { vc: [200, 400], fzBase: 0.06 }, coated: { vc: [250, 500], fzBase: 0.07 }, hss: { vc: [60, 120], fzBase: 0.04 }, insert: { vc: [250, 450], fzBase: 0.08 }, al_tool: { vc: [300, 550], fzBase: 0.07 }, ball: { vc: [150, 300], fzBase: 0.05 }, drill_bit: { vc: [40, 80], fzBase: 0.03 }, tap_tool: { vc: [6, 12], fzBase: 0.015 } },
  titanium: { name: "钛合金", hardnessRange: "HRC 30–40", carbide: { vc: [30, 60], fzBase: 0.02 }, coated: { vc: [40, 80], fzBase: 0.025 }, hss: { vc: [8, 15], fzBase: 0.012 }, insert: { vc: [35, 65], fzBase: 0.03 }, al_tool: { vc: [20, 40], fzBase: 0.015 }, ball: { vc: [20, 45], fzBase: 0.015 }, drill_bit: { vc: [6, 12], fzBase: 0.008 }, tap_tool: { vc: [2, 4], fzBase: 0.003 } },
  custom: { name: "自定义", hardnessRange: "—", carbide: { vc: [80, 150], fzBase: 0.035 }, coated: { vc: [100, 200], fzBase: 0.045 }, hss: { vc: [15, 25], fzBase: 0.02 }, insert: { vc: [100, 180], fzBase: 0.05 }, al_tool: { vc: [60, 120], fzBase: 0.025 }, ball: { vc: [50, 100], fzBase: 0.02 }, drill_bit: { vc: [10, 20], fzBase: 0.015 }, tap_tool: { vc: [3, 6], fzBase: 0.006 } }
};

var TOOL_NAMES = { carbide: "钨钢铣刀", coated: "涂层刀", hss: "高速钢刀具", insert: "机夹刀片", al_tool: "铝用刀", ball: "球刀", drill_bit: "钻头", tap_tool: "丝锥" };

var PROCESS_ADJUST = { face: 1.0, side: 0.85, slot: 0.70, drill: 0.50, tap: 0.30, finish: 1.10, rough: 0.70 };

var RIGIDITY_ADJUST = { good: 1.0, normal: 0.85, poor: 0.65 };

var CLAMP_ADJUST = { stable: 1.0, overhang: 0.80, slender: 0.65, chatter: 0.50 };

function fmtNum(n, decimals) {
  if (decimals === undefined) decimals = n >= 100 ? 0 : n >= 10 ? 1 : 2;
  return n.toFixed(decimals);
}

function fmtRange(min, max, unit) {
  return fmtNum(min) + " – " + fmtNum(max) + " " + unit;
}

function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

function getMaterialRule(mat, tool) {
  var matData = MATERIAL_RULES[mat];
  if (!matData) return null;
  var toolData = matData[tool];
  if (!toolData) return null;
  return { matData: matData, toolData: toolData };
}

function applyHardnessAdjust(mat, hType, hValue, baseVc) {
  if (hType === "unknown" || hValue === null) return { vcMin: baseVc[0], vcMax: baseVc[1] };
  var rangeMap = { aluminum: 85, steel_45: 190, steel_40cr: 240, steel_42crmo: 315, die_steel: 40, stainless: 230, cast_iron: 200, copper: 60, titanium: 35, custom: 200 };
  var typical = rangeMap[mat] || 200;
  var ratio;
  if (hType === "hrc") {
    ratio = Math.pow(0.85, (hValue - typical) / 5);
  } else {
    ratio = Math.pow(0.88, (hValue - typical) / 50);
  }
  ratio = clamp(ratio, 0.3, 1.5);
  return { vcMin: baseVc[0] * ratio, vcMax: baseVc[1] * ratio };
}

function getFzBase(toolData, dia, mat) {
  var base = toolData.fzBase;
  if (dia && dia > 0) {
    base = base * Math.pow(dia / 10, 0.3);
  }
  var matFactor = { titanium: 0.75, stainless: 0.85, die_steel: 0.85 };
  var mf = matFactor[mat];
  if (mf) base *= mf;
  return base;
}

function getToolDirection(mat, process) {
  if (process === "finish") return "climb";
  if (process === "rough") return "conventional";
  if (mat === "cast_iron" && process !== "finish") return "conventional";
  if (mat === "aluminum" || mat === "copper") return "climb";
  if (process === "drill" || process === "tap") return "—";
  return "climb";
}

function getRiskLevel(mat, process, rigidity, clampVal, tool, hardness) {
  var score = 0;
  var matRisk = { titanium: 3, stainless: 2, die_steel: 2, steel_42crmo: 1 };
  if (matRisk[mat]) score += matRisk[mat];
  var processRisk = { tap: 3, slot: 2, drill: 1, rough: 1, side: 1 };
  if (processRisk[process]) score += processRisk[process];
  if (rigidity === "poor") score += 2;
  else if (rigidity === "normal") score += 1;
  var clampRisk = { chatter: 3, slender: 2, overhang: 1 };
  if (clampRisk[clampVal]) score += clampRisk[clampVal];
  if (hardness !== null) {
    if (hardness > 350) score += 2;
    else if (hardness > 280) score += 1;
  }
  if (score >= 7) return "high";
  if (score >= 4) return "mid";
  return "low";
}

var RISK_LABELS = { low: { text: "低风险", cls: "risk-low" }, mid: { text: "中风险", cls: "risk-mid" }, high: { text: "高风险", cls: "risk-high" } };

var RISK_WARNINGS = {
  low: "当前条件风险不高，可以按推荐范围的中低值试切。仍需观察声音、铁屑、刀具磨损和工件表面。",
  mid: "当前条件有一定风险，建议先从推荐范围的低值开始试切，重点观察震刀、崩刃、发热和尺寸稳定性。",
  high: "当前条件风险较高，不建议直接按高参数加工。请优先确认刀具牌号、装夹刚性、切深切宽、冷却方式，并从保守参数小余量试切。"
};

function generateToolRecommendation() {
  var mat = document.getElementById("tool-material").value;
  var hType = document.getElementById("tool-hardness_type").value;
  var hVal = toNum(document.getElementById("tool-hardness_value").value);
  var process = document.getElementById("tool-process").value;
  var tool = document.getElementById("tool-tool").value;
  var dia = toNum(document.getElementById("tool-tool_dia").value);
  var teeth = toNum(document.getElementById("tool-tool_teeth").value);
  var rigidity = document.getElementById("tool-rigidity").value;
  var clampVal = document.getElementById("tool-clamp").value;
  if (!dia || dia <= 0) { showToolResult("error", "请输入有效的刀具直径（正数）"); return; }
  if (!teeth || teeth <= 0) { showToolResult("error", "请输入有效的刀具刃数（正整数）"); return; }
  var rule = getMaterialRule(mat, tool);
  if (!rule) { showToolResult("error", "该材料与刀具组合暂不支持，请选择其他组合"); return; }
  var baseVc = rule.toolData.vc;
  var adjVc = applyHardnessAdjust(mat, hType, hVal, baseVc);
  var procFactor = PROCESS_ADJUST[process] || 1.0;
  var vcMin = adjVc.vcMin * procFactor;
  var vcMax = adjVc.vcMax * procFactor;
  var rigFactor = RIGIDITY_ADJUST[rigidity] || 1.0;
  vcMin *= rigFactor;
  vcMax *= rigFactor;
  var clampFactor = CLAMP_ADJUST[clampVal] || 1.0;
  vcMin *= clampFactor;
  vcMax *= clampFactor;
  var sMin = Math.round((1000 * vcMin) / (Math.PI * dia));
  var sMax = Math.round((1000 * vcMax) / (Math.PI * dia));
  var fzBase = getFzBase(rule.toolData, dia, mat);
  var fzFactor = clamp(procFactor * rigFactor * clampFactor, 0.3, 1.2);
  var fzMin = fzBase * fzFactor * 0.6;
  var fzMax = fzBase * fzFactor * 1.2;
  var fMin = Math.round(sMin * teeth * fzMin);
  var fMax = Math.round(sMax * teeth * fzMax);
  var risk = getRiskLevel(mat, process, rigidity, clampVal, tool, hVal);
  var riskInfo = RISK_LABELS[risk];
  var riskWarning = RISK_WARNINGS[risk];
  var dir = getToolDirection(mat, process);
  var dirLabels = { climb: { text: "推荐顺铣", cls: "dir-climb" }, conventional: { text: "推荐逆铣", cls: "dir-conventional" }, "—": { text: "—", cls: "" } };
  var dirInfo = dirLabels[dir] || { text: "—", cls: "" };
  var adjTips = [];
  if (rigFactor < 0.9) adjTips.push("机床刚性偏低，建议降低切深和切宽");
  if (clampFactor < 0.8) adjTips.push("装夹条件受限，建议增加支撑或减少悬伸");
  if (mat === "titanium" || mat === "stainless") adjTips.push("难加工材料，务必确保充分冷却");
  if (process === "slot") adjTips.push("槽铣排屑困难，建议使用啄铣或螺旋下刀");
  if (hVal !== null && hVal > 280) adjTips.push("材料硬度偏高，建议使用耐磨涂层刀具");
  if (risk === "high") adjTips.push("⚠ 高风险加工，强烈建议先试切确认再批量加工");
  if (adjTips.length === 0) adjTips.push("当前条件较理想，按推荐参数试切即可");
  var matName = MATERIAL_RULES[mat].name;
  var toolName = TOOL_NAMES[tool] || tool;
  var html = '<div class="result-header fade-in" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;"><h3 style="font-size:1.05rem;font-weight:700;color:#202124;">📊 推荐结果</h3><span class="risk-badge ' + riskInfo.cls + '" style="padding:3px 14px;border-radius:999px;font-weight:700;font-size:0.82rem;">' + riskInfo.text + '</span></div><div class="tool-dir-card fade-in" style="background:#ECFDF5;border-radius:12px;padding:14px 16px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;border:1px solid #A7F3D0;"><span style="font-size:0.85rem;color:#64748B;">推荐刀具方向</span><span style="font-size:0.9rem;font-weight:700;color:#0F766E;padding:4px 14px;border-radius:999px;background:#CCFBF1;">' + dirInfo.text + '</span></div><div style="font-size:0.82rem;color:#64748B;margin-bottom:12px;text-align:center;">' + matName + ' · ' + toolName + '</div><div class="result-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">' +
    '<div class="result-data-card" style="background:#F1F7FF;border-radius:12px;padding:14px;border:1px solid #DBEAFE;"><div style="font-size:0.78rem;color:#64748B;font-weight:500;margin-bottom:4px;">⚡ 推荐线速度 Vc</div><div style="font-size:1.1rem;font-weight:800;color:#0F172A;">' + fmtRange(vcMin, vcMax, "") + '</div><span style="font-size:0.75rem;font-weight:400;color:#94A3B8;margin-left:2px;">m/min</span></div>' +
    '<div class="result-data-card" style="background:#F1F7FF;border-radius:12px;padding:14px;border:1px solid #DBEAFE;"><div style="font-size:0.78rem;color:#64748B;font-weight:500;margin-bottom:4px;">🔄 推荐主轴转速 S</div><div style="font-size:1.1rem;font-weight:800;color:#0F172A;">' + fmtRange(sMin, sMax, "") + '</div><span style="font-size:0.75rem;font-weight:400;color:#94A3B8;margin-left:2px;">rpm</span></div>' +
    '<div class="result-data-card" style="background:#F1F7FF;border-radius:12px;padding:14px;border:1px solid #DBEAFE;"><div style="font-size:0.78rem;color:#64748B;font-weight:500;margin-bottom:4px;">⚙️ 推荐每齿进给 Fz</div><div style="font-size:1.1rem;font-weight:800;color:#0F172A;">' + fmtRange(fzMin, fzMax, "") + '</div><span style="font-size:0.75rem;font-weight:400;color:#94A3B8;margin-left:2px;">mm/tooth</span></div>' +
    '<div class="result-data-card" style="background:#F1F7FF;border-radius:12px;padding:14px;border:1px solid #DBEAFE;"><div style="font-size:0.78rem;color:#64748B;font-weight:500;margin-bottom:4px;">📈 推荐每分钟进给 F</div><div style="font-size:1.1rem;font-weight:800;color:#0F172A;">' + fmtRange(fMin, fMax, "") + '</div><span style="font-size:0.75rem;font-weight:400;color:#94A3B8;margin-left:2px;">mm/min</span></div>' +
  '</div>';
  var riskBg = risk === "low" ? "#ECFDF5" : risk === "mid" ? "#FFF7ED" : "#FEF2F2";
  var riskBorder = risk === "low" ? "#16A34A" : risk === "mid" ? "#F97316" : "#DC2626";
  html += '<div class="risk-card" style="border-radius:12px;padding:16px;margin-bottom:16px;border-left:4px solid ' + riskBorder + ';background:' + riskBg + ';"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;"><span style="font-size:0.85rem;font-weight:600;">⚠ 风险提醒</span><span class="risk-badge ' + riskInfo.cls + '" style="padding:3px 14px;border-radius:999px;font-weight:700;font-size:0.82rem;">' + riskInfo.text + '</span></div><div style="font-size:0.82rem;color:#64748B;line-height:1.6;">' + riskWarning + '</div></div>';
  var tipHtml = adjTips.map(function(t) { return '<li style="font-size:0.83rem;color:#78350F;line-height:1.7;padding:3px 0 3px 18px;position:relative;">' + t + '</li>'; }).join("");
  html += '<div class="tips-card" style="background:#FFFBEB;border-radius:12px;padding:16px;margin-bottom:16px;border:1px solid #FDE68A;"><div style="font-size:0.9rem;font-weight:700;margin-bottom:8px;color:#92400E;">💡 老师傅调整建议</div><ul style="list-style:none;padding:0;margin:0;">' + tipHtml + '</ul></div>';
  document.getElementById("tool-resultArea").innerHTML = html;
}

function showToolResult(type, msg) {
  var cls = type === "error" ? "color:#DC2626;font-size:0.9rem;" : "color:#0F766E;font-size:0.9rem;";
  document.getElementById("tool-resultArea").innerHTML = '<div class="risk-card high fade-in" style="text-align:center;border-radius:12px;padding:16px;border-left:4px solid #DC2626;background:#FEF2F2;"><div style="' + cls + 'font-weight:500;margin-top:8px;">' + msg + '</div></div>';
}

function setupToolTabs() {
  document.querySelectorAll(".tool-tab-btn").forEach(function(btn) {
    btn.addEventListener("click", function() {
      var tabId = this.dataset.toolTab;
      document.querySelectorAll(".tool-tab-btn").forEach(function(b) {
        b.classList.remove("active");
        b.setAttribute("aria-selected", "false");
      });
      this.classList.add("active");
      this.setAttribute("aria-selected", "true");
      document.querySelectorAll(".tool-tab-panel").forEach(function(p) {
        p.classList.remove("active");
      });
      document.getElementById(tabId).classList.add("active");
    });
  });

  document.getElementById("tool-btnGenerate").addEventListener("click", generateToolRecommendation);

  document.getElementById("tool-btnClear").addEventListener("click", function() {
    document.querySelectorAll("#tool-tab1 select").forEach(function(s) { s.selectedIndex = 0; });
    document.querySelectorAll("#tool-tab1 input").forEach(function(i) { i.value = ""; });
    document.getElementById("tool-resultArea").innerHTML = "";
    document.getElementById("tool-hardness_type").value = "hb";
  });

  document.getElementById("tool-btnExample").addEventListener("click", function() {
    document.getElementById("tool-material").value = "steel_45";
    document.getElementById("tool-hardness_type").value = "hb";
    document.getElementById("tool-hardness_value").value = "220";
    document.getElementById("tool-process").value = "side";
    document.getElementById("tool-tool").value = "coated";
    document.getElementById("tool-tool_dia").value = "10";
    document.getElementById("tool-tool_teeth").value = "4";
    document.getElementById("tool-rigidity").value = "normal";
    document.getElementById("tool-clamp").value = "stable";
  });

  document.getElementById("tool-hardness_type").addEventListener("change", function() {
    var valInput = document.getElementById("tool-hardness_value");
    if (this.value === "unknown") {
      valInput.value = "";
      valInput.placeholder = "未知，可不填";
    } else {
      valInput.placeholder = "如 220";
    }
  });
}

function bindDiagnosisUI() {
  var data = window.CNC_DIAGNOSIS_DATA || [];
  var container = document.getElementById("tool-diagList");
  var searchInput = document.getElementById("tool-diagSearch");
  var countEl = document.getElementById("tool-diagCount");
  if (!container || !data.length) return;

  var currentCat = "all";
  var searchTimer = null;
  var searchTerm = "";

  function render() {
    var filtered = data.filter(function(item) {
      if (currentCat !== "all" && item.category !== currentCat) return false;
      if (searchTerm) {
        var q = searchTerm.toLowerCase();
        var matchTitle = item.title.toLowerCase().indexOf(q) !== -1;
        var matchKw = (item.keywords || []).some(function(kw) { return kw.toLowerCase().indexOf(q) !== -1; });
        if (!matchTitle && !matchKw) return false;
      }
      return true;
    });

    countEl.textContent = filtered.length + " / " + data.length + " 条";

    if (!filtered.length) {
      container.innerHTML = '<div style="text-align:center;padding:32px 16px;color:#64748B;">未找到匹配的问题</div>';
      return;
    }

    container.innerHTML = filtered.map(function(item, idx) {
      var riskClass = item.risk || "low";
      var riskColor = riskClass === "high" ? "#DC2626" : riskClass === "medium" ? "#F97316" : "#16A34A";
      var riskBg = riskClass === "high" ? "#FEE2E2" : riskClass === "medium" ? "#FFEDD5" : "#DCFCE7";
      var isMaster = item.risk === "high";
      return '<div class="diag-item' + (isMaster ? ' diag-master' : '') + '" data-diag-idx="' + idx + '">'
        + '<div class="diag-item-header">'
        + '<span class="diag-item-title">' + item.title + '</span>'
        + '<span class="diag-risk" style="background:' + riskBg + ';color:' + riskColor + ';">' + (riskClass === "high" ? "高" : riskClass === "medium" ? "中" : "低") + '</span>'
        + '<span class="diag-cat-tag">' + item.category + '</span>'
        + '<span class="arrow-icon" style="color:#64748B;font-size:1.1rem;">›</span>'
        + '</div>'
        + '<div class="diag-detail" id="tool-diagDetail-' + idx + '" style="display:none;">'
        + '<h4 style="font-size:0.88rem;font-weight:700;color:#202124;margin:14px 0 6px;">📌 可能原因</h4>'
        + '<ul style="padding-left:20px;font-size:0.85rem;color:#202124;line-height:1.8;">'
        + item.causes.map(function(c) { return '<li>' + c + '</li>'; }).join("") + '</ul>'
        + '<h4 style="font-size:0.88rem;font-weight:700;color:#202124;margin:14px 0 6px;">🔍 优先检查顺序</h4>'
        + '<ol style="padding-left:20px;font-size:0.85rem;color:#202124;line-height:1.8;">'
        + item.checkOrder.map(function(c) { return '<li>' + c + '</li>'; }).join("") + '</ol>'
        + '<h4 style="font-size:0.88rem;font-weight:700;color:#202124;margin:14px 0 6px;">💡 现场处理建议</h4>'
        + '<div class="highlight-box" style="background:#fff;border-left:3px solid #1a73e8;padding:10px 14px;border-radius:0 8px 8px 0;font-size:0.85rem;margin-top:8px;line-height:1.7;">' + item.advice + '</div>'
        + '<h4 style="font-size:0.88rem;font-weight:700;color:#202124;margin:14px 0 6px;">🛡 下次预防方法</h4>'
        + '<div class="highlight-box" style="background:rgba(15,118,110,0.06);border-left:3px solid #0F766E;padding:10px 14px;border-radius:0 8px 8px 0;font-size:0.85rem;margin-top:8px;line-height:1.7;">' + item.prevention + '</div>'
        + '</div></div>';
    }).join("");

    container.querySelectorAll(".diag-item").forEach(function(el) {
      el.addEventListener("click", function() {
        var idx = this.dataset.diagIdx;
        var detail = document.getElementById("tool-diagDetail-" + idx);
        if (!detail) return;
        var isOpen = detail.style.display !== "none";
        container.querySelectorAll(".diag-detail").forEach(function(d) { d.style.display = "none"; });
        if (!isOpen) {
          detail.style.display = "block";
        }
      });
    });
  }

  render();

  searchInput.addEventListener("input", function() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function() {
      searchTerm = searchInput.value.trim();
      render();
    }, 300);
  });

  document.addEventListener("click", function(e) {
    var target = e.target.closest(".cat-btn");
    if (!target || !target.dataset.cat) return;
    document.querySelectorAll(".cat-btn").forEach(function(b) { b.classList.remove("active"); });
    target.classList.add("active");
    currentCat = target.dataset.cat;
    searchTerm = searchInput.value.trim();
    render();
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
    "study-map": "learning-map",
    "workspace": "workspace",
    "study": "study",
    "gallery": "gallery",
    "calculator": "calculator",
    "library": "library",
    "favorites": "favorites",
    "access": "access",
    "balloon": "balloon"
  };

  const view = routeMap[hash] || "dashboard";
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

  if (dom.resultList) {
    dom.resultList.addEventListener("click", (event) => {
      const loadMoreBtn = event.target.closest("[data-load-more]");
      if (loadMoreBtn) {
        state.listRenderLimit += 50;
        renderWorkspace();
      }
    });
  }

  const detailBackBtn = document.getElementById("detail-back-btn");
  if (detailBackBtn) {
    detailBackBtn.addEventListener("click", () => {
      const dp = document.getElementById("detail-panel");
      if (dp) dp.classList.remove("mobile-open");
    });
  }
}

function bindSidebarEvents() {
  const homeBtn = document.getElementById("home-btn");
  if (homeBtn) {
    homeBtn.addEventListener("click", () => navigate("dashboard"));
  }
  if (dom.sidebarOpen) {
    dom.sidebarOpen.addEventListener("click", openSidebar);
  }
  if (dom.sidebarClose) {
    dom.sidebarClose.addEventListener("click", closeSidebar);
  }
  if (dom.sidebarMask) {
    dom.sidebarMask.addEventListener("click", closeSidebar);
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

  bindRouteButtons();
  bindWorkspaceEvents();
  bindSidebarEvents();
  bindTreeEvents();
  bindLibraryEvents();
  bindDetailEvents();
  bindAccessEvents();
  bindCalculators();
  setupToolTabs();
  bindDiagnosisUI();
  if (typeof CNC_BALLOON_TOOL !== 'undefined' && CNC_BALLOON_TOOL.init) {
    CNC_BALLOON_TOOL.init();
  }
  bindEnhancedUI();

  syncTreeState();
  renderLibraryLog();
  renderAll();
  renderProgressLinks();
  initHashRouting();
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

  // 全局键盘快捷键
  document.addEventListener("keydown", (e) => {
    const tag = document.activeElement?.tagName;
    const isInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

    // Ctrl+K / Cmd+K → 跳转工作区并聚焦搜索
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      navigate("workspace");
      if (dom.searchInput) {
        dom.searchInput.focus();
        dom.searchInput.select();
      }
      return;
    }

    if (isInput) return;

    // Escape → 关闭移动端详情 / 侧边栏
    if (e.key === "Escape") {
      const dp = document.getElementById("detail-panel");
      if (dp && dp.classList.contains("mobile-open")) {
        dp.classList.remove("mobile-open");
        return;
      }
      closeSidebar();
      return;
    }

    // 工作区内：左右箭头切换条目
    if (state.activeView === "workspace" && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
      stepVisibleEntry(e.key === "ArrowLeft" ? -1 : 1);
    }
  });
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

function openStudyDetail(level) {
  var panel = document.getElementById("study-detail-panel");
  var content = document.getElementById("study-detail-content");
  var stagesList = document.querySelector("#view-study .learning-stages");
  var studyHead = document.querySelector("#view-study .section-head");

  if (!panel || !content) {
    console.error('[openStudyDetail] 找不到详情面板容器');
    return;
  }

  // 尝试用 CNC_LEARNING_UI 渲染详情
  var html = "";
  if (window.CNC_LEARNING_UI && typeof window.CNC_LEARNING_UI.renderLessonDetail === "function") {
    html = window.CNC_LEARNING_UI.renderLessonDetail(level);
  }

  if (!html) {
    // 如果没有详情数据，显示占位内容
    html = '<div style="padding:20px;text-align:center;color:#64748B;">';
    html += '<h3>第 ' + level + ' 关</h3>';
    html += '<p>详细内容正在准备中，敬请期待...</p>';
    html += '</div>';
  }

  // 添加导航按钮（上一关/下一关）
  html += '<div style="display:flex;justify-content:space-between;padding:16px 0;margin-top:16px;border-top:1px solid #E2E8F0;">';
  if (level > 1) {
    html += '<button class="sub-nav-btn" onclick="openStudyDetail(' + (level - 1) + ')">← 上一关</button>';
  } else {
    html += '<span></span>';
  }
  if (level < 12) {
    html += '<button class="sub-nav-btn" onclick="openStudyDetail(' + (level + 1) + ')" style="background:#1a73e8;color:#fff;border-color:#1a73e8;">下一关 →</button>';
  } else {
    html += '<span></span>';
  }
  html += '</div>';

  content.innerHTML = html;

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

/**
 * 绑定 12 张学习卡片点击事件
 */
function bindStudyCards() {
  const cardSelector = [
    '.study-card',
    '.level-card',
    '.lesson-card',
    '.checkpoint-card',
    '[data-study-card]'
  ].join(',');

  const cards = document.querySelectorAll(cardSelector);

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
      if (!level) {
        console.warn('[学习卡片] 没有 data-level 属性', card);
        return;
      }
      openStudyDetail(level);
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

// 回到顶部按钮
(function() {
  var btn = document.getElementById('scroll-top-btn');
  if (!btn) return;
  function toggle() {
    btn.style.display = window.scrollY > 300 ? 'flex' : 'none';
  }
  toggle();
  document.addEventListener('scroll', toggle, { passive: true });
  btn.addEventListener('click', function() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();

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
