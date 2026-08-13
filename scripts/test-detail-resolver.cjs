#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");

function runFile(relativePath, sandbox) {
  const code = fs.readFileSync(path.join(root, relativePath), "utf8");
  vm.runInContext(code, sandbox, { filename: relativePath });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// 真实数据验证：排除 pages.js 已覆盖的产品后，只接受上一轮审计确认的5条新增映射。
const realSandbox = vm.createContext({ window: {} });
runFile("assets/data.js", realSandbox);
runFile("assets/pages.js", realSandbox);
runFile("assets/specs.js", realSandbox);
runFile("assets/detail-resolver.js", realSandbox);

const resolved = (realSandbox.window.PRODUCTS || []).filter((product) => product.detailSource === "exact-spec-model");
const resolvedModels = resolved.map((product) => String(product["型号"] || "").trim()).sort();
const expectedModels = ["CCA-20", "FMD-150C", "GSZ-10L", "GSZ-10L", "ZYDF-100LEX"].sort();

assert(resolved.length === 5, `精确详情页解析数量异常：期望5条，实际${resolved.length}条`);
assert(JSON.stringify(resolvedModels) === JSON.stringify(expectedModels), `精确详情页型号集合异常：${resolvedModels.join(", ")}`);

resolved.forEach((product) => {
  const page = String(product.detail || "").trim();
  assert(page, `${product["型号"]} 未写入详情页路径`);
  assert(fs.existsSync(path.join(root, page)), `${product["型号"]} 指向不存在的页面：${page}`);
});

// 合成数据验证：已有详情、前缀覆盖、歧义规格书和分类不一致都不可被新增解析覆盖。
const syntheticSandbox = vm.createContext({
  window: {
    PRODUCTS: [
      { "型号": "ABC-1", key: "rotary" },
      { "型号": "PRE-9", key: "rotary" },
      { "型号": "DUP-2", key: "rotary" },
      { "型号": "KEEP-3", key: "rotary", detail: "product/existing.html" },
      { "型号": "WRONG-4", key: "vacuum" }
    ],
    PAGES: [
      { key: "rotary", prefixes: ["PRE"], page: "product/pre.html" }
    ],
    SPECS: [
      { model: "ABC-1", key: "rotary", page: "product/abc-1.html" },
      { model: "PRE-9", key: "rotary", page: "product/pre-9.html" },
      { model: "DUP-2", key: "rotary", page: "product/dup-2-a.html" },
      { model: "DUP-2", key: "rotary", page: "product/dup-2-b.html" },
      { model: "KEEP-3", key: "rotary", page: "product/keep-3.html" },
      { model: "WRONG-4", key: "rotary", page: "product/wrong-4.html" }
    ]
  }
});
runFile("assets/detail-resolver.js", syntheticSandbox);

const [exact, prefixCovered, ambiguous, existing, wrongCategory] = syntheticSandbox.window.PRODUCTS;
assert(exact.detail === "product/abc-1.html", "唯一精确匹配没有绑定");
assert(exact.detailSource === "exact-spec-model", "唯一精确匹配缺少来源标记");
assert(!prefixCovered.detail, "已有前缀详情映射的产品被重复绑定");
assert(!ambiguous.detail, "同型号多页面歧义记录被错误绑定");
assert(existing.detail === "product/existing.html", "已有详情页被错误覆盖");
assert(!wrongCategory.detail, "分类不一致记录被错误绑定");

console.log(`安全详情页解析测试通过：真实数据新增${resolved.length}条，前缀覆盖/歧义/已有详情/分类不一致保护均正常`);
