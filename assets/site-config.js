// 予华仪器网站统一配置
// 销售联系方式变化时，只修改本文件，不要在各页面重复替换。
window.YUHUA_SITE = {
  company: "巩义市予华仪器有限责任公司",
  phone: "15517593858",
  wechat: "15517593858",
  address: "巩义市英峪工业区",
  officialSite: "https://www.gyyuhua.cn/"
};

// 产品数据运行时保护：保留简介供全文搜索，但不让简介里的章节号、年份、功率等数字
// 参与“温度能力”解析。data.js 随后给 window.PRODUCTS 赋值时会自动经过这里。
(function installProductDataGuard() {
  var productStore = [];
  Object.defineProperty(window, "PRODUCTS", {
    configurable: true,
    enumerable: true,
    get: function () { return productStore; },
    set: function (value) {
      productStore = Array.isArray(value) ? value.map(function (product) {
        if (!product || typeof product !== "object") return product;
        var introduction = String(product["简介"] || "").trim();
        if (introduction) {
          product["搜索简介"] = introduction;
          product["简介"] = "";
        }
        return product;
      }) : [];
    }
  });
})();
