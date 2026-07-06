const fs = require("fs");
const path = require("path");

const baseDir = __dirname;

function loadWindowData() {
  global.window = {};
  require(path.join(baseDir, "featured-images.js"));
  require(path.join(baseDir, "gallery-library.js"));
  require(path.join(baseDir, "knowledge-core-01.js"));
  require(path.join(baseDir, "knowledge-core-02.js"));
  require(path.join(baseDir, "knowledge-core-03.js"));

  return {
    legacyFeatured: window.CNC_FEATURED_IMAGES || {},
    galleryLibrary: (window.CNC_GALLERY_LIBRARY || []).filter((item) => String(item.src || "").endsWith(".webp")),
    entries: [
      ...(window.CNC_KB_CORE_CHUNK_01 || []),
      ...(window.CNC_KB_CORE_CHUNK_02 || []),
      ...(window.CNC_KB_CORE_CHUNK_03 || [])
    ]
  };
}

function norm(value) {
  return String(value || "").toLowerCase();
}

function entryText(entry) {
  return [
    entry.title,
    entry.code,
    entry.category,
    entry.source,
    ...(entry.tags || []),
    ...(entry.aliases || [])
  ].join(" ").toLowerCase();
}

function titleText(entry) {
  return [entry.title, entry.code].join(" ").toLowerCase();
}

function imageFilename(ref) {
  return String(ref || "").split("/").pop();
}

function makeGalleryIndex(galleryLibrary) {
  const byId = new Map();
  const byWord = new Map();

  galleryLibrary.forEach((image) => {
    byId.set(image.id, image);
    byId.set(imageFilename(image.src), image);

    String(image.id || "")
      .split("-")
      .filter((part) => part && !/^\d+$/.test(part))
      .forEach((part) => {
        const key = part.toLowerCase();
        if (!byWord.has(key)) byWord.set(key, []);
        byWord.get(key).push(image);
      });
  });

  return { byId, byWord };
}

function scoreEntry(entry, categoryKey) {
  const text = entryText(entry);
  const title = titleText(entry);
  let score = 0;

  if (entry.id.startsWith("kb-root-")) score -= 4;
  if (title.includes("总览")) score -= 4;

  if (categoryKey === "gm") {
    if (/\b[gm]\d{2,3}\b/.test(text)) score += 10;
    if (/g代码|m代码|宏程序|子程序|固定循环|编程/.test(text)) score += 5;
    if (/g90|g91|g54|g55|g56|g57|g58|g59|g00|g01|g02|g03|g17|g18|g19|g41|g42|g43|g44|g49|g81|g82|g83|g84|g94|g95|g98|g99|g20|g21/.test(text)) score += 8;
    if (/刀补|刀长补偿|坐标系|工件坐标|绝对|增量/.test(text)) score += 3;
  }

  if (categoryKey === "tool") {
    if (/刀具|刀片|刀柄|刀塔|刀库|刀号|刀补|刀尖/.test(text)) score += 8;
    if (/钻头|丝锥|铰刀|铣刀|球刀|平刀|立铣刀|车刀|镗刀/.test(text)) score += 9;
    if (/bt|er|夹头|holder|insert|endmill|drill|tap/.test(text)) score += 7;
    if (/tool|刀具工艺/.test(text)) score += 3;
  }

  if (categoryKey === "system") {
    if (/fanuc|siemens|三菱|发那科|哈斯|haas|新代|广数|0i|31i|32i|840d|828d/.test(text)) score += 9;
    if (/参数|备份|电池|pmc|plc|报警|报警代码|回零|归零|参考点|手轮|面板|mdi|auto/.test(text)) score += 8;
    if (/机床|维护|保养|润滑|暖机|急停|安全门|电气|伺服|主轴|接地|屏蔽/.test(text)) score += 6;
    if (/操作|系统/.test(text)) score += 2;
  }

  if (categoryKey === "process") {
    if (/车削|铣削|钻孔|攻丝|镗孔|切槽|切断|倒角|薄壁|深孔|螺纹|夹具|装夹|粗加工|精加工|工艺/.test(text)) score += 9;
    if (/线速度|转速|进给|切削|加工参数|表面粗糙度|毛刺|余量/.test(text)) score += 7;
    if (/材料|铝合金|不锈钢|铸铁|钢件/.test(text)) score += 5;
    if (/加工|案例|milling|turning|pocket|contour/.test(text)) score += 4;
  }

  if (categoryKey === "cam") {
    if (/cam|cad\/cam|后处理|刀路|刀轨|编程软件/.test(text)) score += 8;
    if (/ug|nx|mastercam|powermill|fusion ?360|hypermill|cimatron|solidcam|vericut/.test(text)) score += 12;
    if (/二维|三维|型腔|轮廓|开粗|清角|仿真|出程序/.test(text)) score += 5;
  }

  return score;
}

function chooseImages(entry, categoryKey) {
  const text = entryText(entry);
  const lower = text.toLowerCase();

  const rules = [
    { test: /g02|g03|圆弧|圆插补/, images: ["gcode-g02-g03-001.webp", "arc-r-vs-ik-001.webp"], priority: 1 },
    { test: /g00|g01|快移|直线插补/, images: ["gcode-g00-g01-001.webp"], priority: 1 },
    { test: /g17|g18|g19|平面选择/, images: ["gcode-g17-g18-g19-001.webp"], priority: 1 },
    { test: /g41|g42|刀补|刀尖半径补偿/, images: ["gcode-g41-g42-001.webp", "tool-nose-radius-basic-001.webp"], priority: 1 },
    { test: /g43|g44|g49|刀长补偿/, images: ["gcode-g43-g49-001.webp", "tool-offset-table-001.webp"], priority: 1 },
    { test: /g54|g55|g56|g57|g58|g59|工件坐标/, images: ["gcode-g54-g59-001.webp", "work-offset-setting-001.webp"], priority: 1 },
    { test: /g81/, images: ["cycle-g81-001.webp", "canned-cycle-overview-001.webp"], priority: 1 },
    { test: /g83|啄钻/, images: ["cycle-g83-001.webp", "canned-cycle-overview-001.webp"], priority: 1 },
    { test: /g84|攻丝循环/, images: ["cycle-g84-001.webp", "tap-types-overview-001.webp"], priority: 1 },
    { test: /g98|g99/, images: ["cycle-g98-g99-001.webp", "canned-cycle-overview-001.webp"], priority: 1 },
    { test: /g94|g95|每分钟进给|每转进给/, images: ["feed-g94-g95-001.webp"], priority: 1 },
    { test: /g90|g91|绝对|增量/, images: ["beginner-g90-g91-001.webp"], priority: 1 },
    { test: /g20|g21|英制|公制|单位/, images: ["unit-g20-g21-001.webp"], priority: 1 },
    { test: /回零|归零|参考点/, images: ["zero-return-sequence-001.webp", "home-safe-path-001.webp"], priority: 1 },
    { test: /对刀|工件坐标设定/, images: ["work-offset-setting-001.webp", "beginner-touchoff-flow-001.webp"], priority: 1 },
    { test: /参数|备份/, images: ["parameter-backup-001.webp", "battery-loss-parameter-risk-001.webp"], priority: 1 },
    { test: /电池/, images: ["battery-loss-parameter-risk-001.webp", "parameter-backup-001.webp"], priority: 1 },
    { test: /fanuc|31i|0i|32i/, images: ["panel-control-overview-001.webp", "screen-coordinate-reading-001.webp"], priority: 1 },
    { test: /siemens|840d|828d|三菱|哈斯|haas|新代|广数/, images: ["panel-control-overview-001.webp", "machine-init-flow-001.webp"], priority: 2 },
    { test: /手轮|jog/, images: ["panel-jog-handle-001.webp", "screen-coordinate-reading-001.webp"], priority: 1 },
    { test: /mdi|auto|模式/, images: ["mdi-vs-auto-mode-001.webp", "single-block-dry-run-001.webp"], priority: 1 },
    { test: /暖机/, images: ["machine-warmup-flow-001.webp", "machine-init-flow-001.webp"], priority: 1 },
    { test: /润滑|保养|维护/, images: ["daily-maintenance-001.webp", "weekly-maintenance-001.webp"], priority: 1 },
    { test: /伺服/, images: ["alarm-servo-001.webp", "alarm-category-overview-001.webp"], priority: 1 },
    { test: /主轴/, images: ["alarm-spindle-001.webp", "machine-warmup-flow-001.webp"], priority: 1 },
    { test: /超程|限位/, images: ["alarm-limit-overtravel-001.webp", "emergency-stop-chain-001.webp"], priority: 1 },
    { test: /报警|故障/, images: ["alarm-category-overview-001.webp", "atc-alarm-flow-001.webp"], priority: 2 },
    { test: /刀柄|bt|er|夹头/, images: ["bt-er-holder-overview-001.webp", "tool-holder-reach-rigidity-001.webp"], priority: 1 },
    { test: /刀片|可转位|刀尖/, images: ["insert-shape-overview-001.webp", "tool-nose-radius-basic-001.webp"], priority: 1 },
    { test: /钻头|钻削|中心钻/, images: ["drill-types-overview-001.webp", "turning-center-drill-001.webp"], priority: 1 },
    { test: /丝锥|攻丝/, images: ["tap-types-overview-001.webp", "milling-drill-ream-tap-001.webp"], priority: 1 },
    { test: /铣刀|球刀|平刀|立铣刀/, images: ["ballnose-vs-flat-endmill-001.webp", "endmill-2f-vs-4f-001.webp"], priority: 1 },
    { test: /刀具选择|选刀/, images: ["tool-selection-beginner-001.webp", "tool-holder-reach-rigidity-001.webp"], priority: 1 },
    { test: /刀库|换刀|atc/, images: ["atc-alarm-flow-001.webp", "safe-tool-approach-001.webp"], priority: 2 },
    { test: /车削|车工/, images: ["lathe-process-overview-001.webp", "turning-od-roughing-001.webp"], priority: 1 },
    { test: /端面/, images: ["turning-facing-001.webp"], priority: 1 },
    { test: /外圆粗车|粗车/, images: ["turning-od-roughing-001.webp", "turning-allowance-flow-001.webp"], priority: 1 },
    { test: /外圆精车|精车/, images: ["turning-od-finishing-001.webp", "turning-surface-finish-001.webp"], priority: 1 },
    { test: /镗孔|内孔/, images: ["turning-boring-001.webp"], priority: 1 },
    { test: /切槽|槽加工/, images: ["turning-grooving-001.webp", "retaining-ring-groove-001.webp"], priority: 1 },
    { test: /切断/, images: ["turning-parting-off-001.webp"], priority: 1 },
    { test: /倒角/, images: ["turning-chamfer-001.webp"], priority: 1 },
    { test: /圆角|r角|圆弧过渡/, images: ["turning-fillet-001.webp"], priority: 1 },
    { test: /深孔/, images: ["turning-deep-hole-001.webp", "cycle-g83-001.webp"], priority: 1 },
    { test: /薄壁/, images: ["turning-thin-wall-001.webp"], priority: 1 },
    { test: /长轴/, images: ["turning-long-shaft-001.webp", "tailstock-support-001.webp"], priority: 1 },
    { test: /螺纹/, images: ["turning-thread-od-001.webp", "drawing-thread-pitch-tapdrill-001.webp"], priority: 1 },
    { test: /内螺纹/, images: ["turning-thread-id-001.webp", "tap-types-overview-001.webp"], priority: 1 },
    { test: /毛刺/, images: ["turning-burr-control-001.webp", "burr-in-milling-001.webp"], priority: 1 },
    { test: /表面粗糙度|光洁度/, images: ["turning-surface-finish-001.webp", "drawing-tolerance-roughness-001.webp"], priority: 1 },
    { test: /铣削|铣床/, images: ["milling-process-overview-001.webp", "milling-contour-001.webp"], priority: 1 },
    { test: /轮廓/, images: ["milling-contour-001.webp", "milling-side-milling-001.webp"], priority: 1 },
    { test: /型腔|pocket|挖槽/, images: ["milling-pocket-001.webp", "milling-rough-vs-finish-001.webp"], priority: 1 },
    { test: /平面铣|面铣/, images: ["milling-face-milling-001.webp"], priority: 1 },
    { test: /侧铣/, images: ["milling-side-milling-001.webp"], priority: 1 },
    { test: /开槽|槽铣/, images: ["milling-slot-001.webp"], priority: 1 },
    { test: /清角/, images: ["milling-corner-cleanup-001.webp"], priority: 1 },
    { test: /螺旋下刀|斜坡下刀|helical/, images: ["milling-helical-entry-001.webp"], priority: 1 },
    { test: /步距|步深|stepover|stepdown/, images: ["milling-stepdown-stepover-001.webp"], priority: 1 },
    { test: /开粗|粗加工策略/, images: ["milling-rough-vs-finish-001.webp", "turning-od-roughing-001.webp"], priority: 1 },
    { test: /精加工策略|精加工/, images: ["milling-rough-vs-finish-001.webp", "turning-od-finishing-001.webp"], priority: 1 },
    { test: /夹具|基准|定位/, images: ["fixture-plate-datum-001.webp", "fixture-basics-001.webp"], priority: 1 },
    { test: /装夹|虎钳|软爪|卡盘/, images: ["vise-clamping-basic-001.webp", "soft-jaw-clamping-001.webp"], priority: 1 },
    { test: /材料|铝合金/, images: ["material-aluminum-cutting-001.webp"], priority: 1 },
    { test: /不锈钢/, images: ["material-stainless-cutting-001.webp"], priority: 1 },
    { test: /钢件|铸铁/, images: ["material-steel-castiron-001.webp"], priority: 1 },
    { test: /图纸|公差|粗糙度/, images: ["drawing-tolerance-roughness-001.webp", "drawing-gdt-basic-001.webp"], priority: 1 },
    { test: /配合|h7|h6/, images: ["drawing-fit-h7-h6-001.webp"], priority: 1 },
    { test: /螺纹底孔|牙距/, images: ["drawing-thread-pitch-tapdrill-001.webp"], priority: 1 },
    { test: /测量|检验|首件/, images: ["first-piece-inspection-001.webp", "measure-reading-set-001.webp"], priority: 1 },
    { test: /卡尺/, images: ["vernier-caliper-detail-001.webp"], priority: 1 },
    { test: /千分尺/, images: ["micrometer-detail-001.webp"], priority: 1 },
    { test: /百分表/, images: ["dial-indicator-detail-001.webp"], priority: 1 },
    { test: /内径表|缸径表/, images: ["bore-gauge-detail-001.webp"], priority: 1 },
    { test: /cam|ug|nx|mastercam|powermill|fusion ?360|hypermill|cimatron|solidcam|vericut/, images: ["milling-process-overview-001.webp", "milling-contour-001.webp"], priority: 2 },
    { test: /后处理|出程序/, images: ["program-structure-basic-001.webp", "single-block-dry-run-001.webp"], priority: 2 },
    { test: /仿真/, images: ["single-block-dry-run-001.webp", "milling-process-overview-001.webp"], priority: 2 }
  ];

  for (const rule of rules) {
    if (rule.test.test(lower)) {
      return {
        images: rule.images,
        priority: rule.priority
      };
    }
  }

  const fallbackByCategory = {
    gm: { images: ["program-structure-basic-001.webp", "gcode-g00-g01-001.webp"], priority: 3 },
    tool: { images: ["tool-selection-beginner-001.webp", "tool-holder-reach-rigidity-001.webp"], priority: 3 },
    system: { images: ["panel-control-overview-001.webp", "machine-init-flow-001.webp"], priority: 3 },
    process: { images: ["milling-process-overview-001.webp", "lathe-process-overview-001.webp"], priority: 3 },
    cam: { images: ["milling-process-overview-001.webp", "milling-pocket-001.webp"], priority: 3 }
  };

  return fallbackByCategory[categoryKey];
}

function selectMappings(entries, categoryConfig, usedTitles) {
  const rows = entries
    .map((entry) => {
      const score = scoreEntry(entry, categoryConfig.key);
      if (score <= 0) return null;
      if (!entry.title || usedTitles.has(entry.title)) return null;

      const chosen = chooseImages(entry, categoryConfig.key);
      if (!chosen?.images?.length) return null;

      return {
        entry,
        score,
        chosen
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.entry.title.length - b.entry.title.length;
    });

  const picked = [];
  for (const row of rows) {
    if (picked.length >= categoryConfig.target) break;
    if (usedTitles.has(row.entry.title)) continue;
    usedTitles.add(row.entry.title);
    picked.push(row);
  }
  return picked;
}

function buildStats(allMappings) {
  const counts = {};
  allMappings.forEach((item) => {
    counts[item.category] = (counts[item.category] || 0) + 1;
  });
  return counts;
}

function buildMarkdownReport(reportRows, counts, totalAdded) {
  const md = [
    "# 精准图片映射统计",
    "",
    `- 新增精准映射：${totalAdded}`,
    `- 分类数量：${Object.keys(counts).length}`,
    "",
    "## 分类分布",
    ""
  ];

  Object.entries(counts).forEach(([label, count]) => {
    md.push(`- ${label}：${count}`);
  });

  md.push("", "## 样例映射", "", "| 分类 | 标题 | 图片 | 优先级 |", "|---|---|---|---|");
  reportRows.slice(0, 30).forEach((row) => {
    md.push(`| ${row.category} | ${row.title.replace(/\|/g, "／")} | ${row.images.join("<br>")} | ${row.priority} |`);
  });
  return `${md.join("\n")}\n`;
}

function buildCsvReport(reportRows) {
  const csv = [
    "category,title,priority,images"
  ];
  reportRows.forEach((row) => {
    const line = [
      row.category,
      `"${row.title.replace(/"/g, '""')}"`,
      row.priority,
      `"${row.images.join(" | ").replace(/"/g, '""')}"`
    ].join(",");
    csv.push(line);
  });
  return `${csv.join("\n")}\n`;
}

function buildArtifacts() {
  const { legacyFeatured, galleryLibrary, entries } = loadWindowData();
  const galleryIndex = makeGalleryIndex(galleryLibrary);

  const categoryConfigs = [
    { key: "gm", label: "G代码/M代码", target: 120 },
    { key: "tool", label: "刀具相关", target: 90 },
    { key: "system", label: "机床系统", target: 100 },
    { key: "process", label: "加工工艺", target: 140 },
    { key: "cam", label: "CAM软件", target: 70 }
  ];

  const usedTitles = new Set();
  const selectedRows = [];

  categoryConfigs.forEach((config) => {
    const picked = selectMappings(entries, config, usedTitles).map((row) => ({
      id: row.entry.id,
      title: row.entry.title,
      category: config.label,
      priority: row.chosen.priority,
      images: row.chosen.images.filter((name) => galleryIndex.byId.has(name) || galleryIndex.byId.has(name.replace(/\.webp$/, "")))
    })).filter((row) => row.images.length);

    selectedRows.push(...picked.slice(0, config.target));
  });

  const generatedFeatured = { ...legacyFeatured };
  selectedRows.forEach((row) => {
    generatedFeatured[row.title] = {
      images: row.images,
      category: row.category,
      priority: row.priority
    };
  });

  const output = `window.CNC_FEATURED_IMAGES = ${JSON.stringify(generatedFeatured, null, 2)};\n`;
  const counts = buildStats(selectedRows);
  const part2Rows = selectedRows.map((row) => [row.title, row.category, row.priority, row.images]);
  const part2Script = [
    "window.CNC_FEATURED_IMAGES_EXTENDED = window.CNC_FEATURED_IMAGES_EXTENDED || {};",
    `JSON.parse(${JSON.stringify(JSON.stringify(part2Rows))}).forEach(([title, category, priority, images]) => {`,
    "  window.CNC_FEATURED_IMAGES_EXTENDED[title] = { images, category, priority };",
    "});",
    ""
  ].join("\n");
  return {
    featuredJs: output,
    part2Js: part2Script,
    part2Rows,
    reportMd: buildMarkdownReport(selectedRows, counts, selectedRows.length),
    reportCsv: buildCsvReport(selectedRows),
    stats: {
      legacyCount: Object.keys(legacyFeatured).length,
      addedCount: selectedRows.length,
      totalKeys: Object.keys(generatedFeatured).length,
      counts
    }
  };
}

const artifacts = buildArtifacts();

if (process.argv.includes("--emit-js")) {
  process.stdout.write(artifacts.featuredJs);
} else if (process.argv.includes("--emit-part2-js")) {
  process.stdout.write(artifacts.part2Js);
} else if (process.argv.includes("--emit-part2-chunk")) {
  const index = Number(process.argv[process.argv.indexOf("--emit-part2-chunk") + 1] || 0);
  const size = Number(process.argv[process.argv.indexOf("--emit-part2-chunk") + 2] || 100);
  const rows = artifacts.part2Rows.slice(index * size, index * size + size);
  const lines = [];
  if (index === 0) {
    lines.push("window.CNC_FEATURED_IMAGES_EXTENDED = window.CNC_FEATURED_IMAGES_EXTENDED || {};");
  }
  lines.push(`JSON.parse(${JSON.stringify(JSON.stringify(rows))}).forEach(([title, category, priority, images]) => {`);
  lines.push("  window.CNC_FEATURED_IMAGES_EXTENDED[title] = { images, category, priority };");
  lines.push("});");
  lines.push("");
  process.stdout.write(lines.join("\n"));
} else if (process.argv.includes("--emit-md")) {
  process.stdout.write(artifacts.reportMd);
} else if (process.argv.includes("--emit-csv")) {
  process.stdout.write(artifacts.reportCsv);
} else {
  console.log(JSON.stringify(artifacts.stats, null, 2));
}
