const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const htmlPath = path.resolve(__dirname, '../training-achievements.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const start = html.indexOf('function validDay(v){');
const end = html.indexOf('\n    function stageLevel', start);

assert.ok(start >= 0 && end > start, '成长成果页必须保留独立 validDay 日历校验函数');
const source = html.slice(start, end);
const validDay = new Function(`${source}; return validDay;`)();

assert.equal(validDay('2026-02-28'), '2026-02-28');
assert.equal(validDay('2024-02-29'), '2024-02-29');
assert.equal(validDay('2026-02-30'), null, '不存在的日期不得计入累计训练天数');
assert.equal(validDay('2026-13-01'), null, '不存在的月份不得计入累计训练天数');
assert.equal(validDay('2026-2-08'), null, '非 YYYY-MM-DD 格式不得计入累计训练天数');
assert.equal(validDay(20260814), null, '非字符串日期不得计入累计训练天数');

console.log('成长成果训练日期严格日历校验契约通过');
