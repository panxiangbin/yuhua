#!/usr/bin/env node
"use strict";

const fs = require("fs");
const vm = require("vm");
const path = require("path");

const code = fs.readFileSync(path.resolve(__dirname, "../assets/site-config.js"), "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function createItem(model) {
  return {
    hidden: false,
    textContent: model,
    querySelector() {
      return { textContent: model };
    }
  };
}

const inputListeners = {};
const input = {
  value: "",
  addEventListener(type, handler) { inputListeners[type] = handler; }
};
const rows = [createItem("YSF-20L"), createItem("TGYF-2L")];
const cards = [createItem("YSF-20L"), createItem("TGYF-2L")];
const tableBody = { querySelectorAll() { return rows; } };
const mobileList = { querySelectorAll() { return cards; } };
const resultCount = { textContent: "2" };
const emptyTip = { hidden: true };
const resultLimit = { hidden: false };
const domReady = [];

const elements = {
  searchInput: input,
  tableBody,
  mobileProductList: mobileList,
  resultCount,
  emptyTip,
  resultLimit
};

class MutationObserverMock {
  constructor(callback) { this.callback = callback; }
  observe() {}
}

const sandbox = {
  window: {},
  document: {
    readyState: "loading",
    addEventListener(type, handler) {
      if (type === "DOMContentLoaded") domReady.push(handler);
    },
    getElementById(id) { return elements[id] || null; }
  },
  MutationObserver: MutationObserverMock,
  setTimeout(callback) { callback(); return 1; },
  clearTimeout() {},
  console
};
sandbox.window.window = sandbox.window;
vm.createContext(sandbox);
vm.runInContext(code, sandbox, { filename: "assets/site-config.js" });

sandbox.window.VIDEOS = [
  {
    title: "缺失封面视频",
    file: "assets/videos/img_1672.mp4",
    poster: "assets/videos/img_1672.jpg"
  },
  {
    title: "无效空文件名视频",
    file: "assets/videos/.mp4",
    poster: "assets/videos/.jpg"
  },
  {
    title: "有效封面视频",
    file: "assets/videos/yre_2010a.mp4",
    poster: "assets/videos/yre_2010a.jpg"
  }
];
assert(sandbox.window.VIDEOS.length === 2, "无效空文件名视频没有被隐藏");
assert(sandbox.window.VIDEOS[0].poster === "", "已确认缺失的视频封面没有被清空");
assert(sandbox.window.VIDEOS[1].poster === "assets/videos/yre_2010a.jpg", "有效视频封面被错误清空");
assert(sandbox.window.VIDEOS.every((video) => video.file !== "assets/videos/.mp4"), "无效视频记录仍然保留在前台数据中");

sandbox.window.PRODUCTS = [
  {
    "型号": "YSF-20L",
    "产品名称": "双层玻璃反应釜",
    "容量": "20L",
    "材质": "高硼硅玻璃",
    "控温范围": "-80～300℃",
    "简介": "2026年第1.2章安全说明",
    specs: { "工作温度": "-80～300℃" }
  },
  {
    "型号": "TGYF-2L",
    "产品名称": "高压反应釜",
    "容量": "2L",
    "材质": "316L不锈钢",
    "控温范围": "室温～350℃",
    specs: { "工作压力": "10MPa" }
  }
];

assert(sandbox.window.PRODUCTS[0]["简介"] === "", "产品简介没有从温度解析字段中移出");
assert(sandbox.window.PRODUCTS[0]["搜索简介"].includes("2026"), "产品简介没有保留给全文搜索");

domReady.forEach((handler) => handler());
assert(typeof inputListeners.input === "function", "精确搜索输入监听器未安装");

input.value = "20L反应釜";
inputListeners.input();
assert(input.value === "20L 反应釜", "复合查询没有自动拆分容量与设备名称");
assert(rows[0].hidden === false, "20L反应釜被错误隐藏");
assert(rows[1].hidden === true, "2L高压釜被错误纳入20L反应釜结果");
assert(resultCount.textContent === 1, "20L反应釜结果数量不正确");

input.value = "316L高压釜";
inputListeners.input();
assert(input.value === "316L 高压釜", "复合查询没有自动拆分材质与设备名称");
assert(rows[0].hidden === true, "玻璃反应釜被错误纳入316L高压釜结果");
assert(rows[1].hidden === false, "316L高压釜被错误隐藏");
assert(resultCount.textContent === 1, "316L高压釜结果数量不正确");

input.value = "";
inputListeners.input();
assert(rows.every((row) => row.hidden === false), "清空搜索后产品没有全部恢复显示");
assert(cards.every((card) => card.hidden === false), "清空搜索后手机卡片没有全部恢复显示");

console.log("site-config 视频、产品数据与复合搜索运行时保护测试通过");
