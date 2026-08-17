from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def replace_once(path, old, new):
    p = ROOT / path
    text = p.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected exactly one match, got {count}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')


replace_once(
    'cnc/data-health.html',
    '只提供低风险、可逆修复：补齐缺失的版本字段；把对象型错题集合转换为数组；移除无效日期字段；规范缺失的模拟容器。不会推测成绩、修改XP、删除错题或改写课程完成记录。',
    '只提供低风险、可逆修复：补齐缺失的版本字段；移除无效日期字段；规范缺失的模拟容器。不会推测成绩、修改XP、删除错题、改写合法对象型错题记录或改写课程完成记录。'
)

old_stage = "function stageLevel(v){if(typeof v==='number'&&Number.isInteger(v)&&v>=1&&v<=12)return v;if(typeof v==='string'){const m=v.match(/^stage-(\\d{1,2})$/i),n=Number(m&&m[1]);if(Number.isInteger(n)&&n>=1&&n<=12)return n}return null}"
new_stage = old_stage + "\nfunction isPlainObject(v){return !!v&&typeof v==='object'&&!Array.isArray(v)}\nfunction wrongRecordId(item,fallbackKey){if(typeof item==='string'){const text=item.trim();return text||null}if(!isPlainObject(item))return null;for(const v of [item.questionId,item.id,item.key,fallbackKey]){if(typeof v==='string'&&v.trim())return v.trim()}return null}\nfunction wrongInvalidCount(value){if(Array.isArray(value))return value.filter(item=>!wrongRecordId(item,null)).length;if(isPlainObject(value))return Object.entries(value).filter(([key,item])=>!isPlainObject(item)||!wrongRecordId(item,key)).length;return value==null?0:1}"
replace_once('cnc/data-health.html', old_stage, new_stage)

replace_once(
    'cnc/data-health.html',
    'badgeShapeBad=0,wrongShape=0,practiceScoreShapeBad=0',
    'badgeShapeBad=0,wrongInvalid=0,practiceScoreShapeBad=0'
)

replace_once(
    'cnc/data-health.html',
    "['wrongQuestions','wrongItems','wrong'].forEach(field=>{const w=d[field];if(w&&!Array.isArray(w)&&typeof w==='object'){wrongShape++;addRepair(k,`wrong-array:${field}`,`${k}：把对象型错题字段 ${field} 转换为数组`,x=>({...x,[field]:Object.values(x[field]||{})}))}});",
    "['wrongQuestions','wrongItems','wrong'].forEach(field=>{if(!Object.prototype.hasOwnProperty.call(d,field))return;const invalid=wrongInvalidCount(d[field]);wrongInvalid+=invalid;if(invalid)state.issues.push(`${k}.${field}: ${invalid}个错题条目无法确认`)});"
)

replace_once(
    'cnc/data-health.html',
    "addCheck('错题结构',wrongShape?'warn':'ok',wrongShape?`${wrongShape}个对象型错题兼容字段可转换为数组；wrongQuestions / wrongItems / wrong 会分别保留，不会互相覆盖`:'错题字段结构正常');",
    "addCheck('错题结构',wrongInvalid?'warn':'ok',wrongInvalid?`发现${wrongInvalid}个无法确认的错题条目；支持字符串ID、带 questionId/id/key 的记录和“题目ID→记录对象”结构，本页不会自动改写错题证据`:'wrongQuestions / wrongItems / wrong 兼容结构正常；合法对象型错题记录无需转换');"
)

replace_once(
    'cnc/tests/mobile-data-health-smoke.cjs',
    "wrong:{d:{id:'w4'}},lessonScores:{1:100,2:'80',13:90,3:120}",
    "wrong:{d:{id:'w4'},e:42},lessonScores:{1:100,2:'80',13:90,3:120}"
)
replace_once(
    'cnc/tests/mobile-data-health-smoke.cjs',
    "assert(wrongText.includes('3个对象型错题兼容字段'),'wrongQuestions / wrongItems / wrong 三类对象字段必须全部识别');",
    "assert(wrongText.includes('1个无法确认的错题条目'),'合法对象型错题字段必须保留，只有无法识别的条目才告警');assert(wrongText.includes('不会自动改写错题证据'),'错题完整性风险只能提示，不得自动转换合法对象结构');"
)
replace_once('cnc/tests/mobile-data-health-smoke.cjs', "assert.equal(await page.locator('[data-repair]').count(),7);", "assert.equal(await page.locator('[data-repair]').count(),4);")
replace_once('cnc/tests/mobile-data-health-smoke.cjs', "textContent.includes('已安全修复7项')", "textContent.includes('已安全修复4项')")
replace_once(
    'cnc/tests/mobile-data-health-smoke.cjs',
    "assert(Array.isArray(fixed.practice.wrongQuestions));assert(Array.isArray(fixed.practice.wrongItems));assert(Array.isArray(fixed.practice.wrong));assert.equal(fixed.practice.wrongQuestions.length,2);assert.equal(fixed.practice.wrongItems.length,1);assert.equal(fixed.practice.wrong.length,1);",
    "assert.deepEqual(fixed.practice.wrongQuestions,{a:{id:'w1'},b:{id:'w2'}},'合法对象型 wrongQuestions 不得被自动转换');assert.deepEqual(fixed.practice.wrongItems,{c:{id:'w3'}},'合法对象型 wrongItems 不得被自动转换');assert.deepEqual(fixed.practice.wrong,{d:{id:'w4'},e:42},'错题字段含风险条目时也必须保持原始证据，不能自动改写');"
)
replace_once(
    'cnc/tests/mobile-data-health-smoke.cjs',
    "assert(!Array.isArray(rolled.practice.wrongQuestions));assert(!Array.isArray(rolled.practice.wrongItems));assert(!Array.isArray(rolled.practice.wrong));",
    "assert.deepEqual(rolled.practice.wrongQuestions,{a:{id:'w1'},b:{id:'w2'}});assert.deepEqual(rolled.practice.wrongItems,{c:{id:'w3'}});assert.deepEqual(rolled.practice.wrong,{d:{id:'w4'},e:42});"
)
replace_once(
    'cnc/tests/mobile-data-health-smoke.cjs',
    'wrongCompatFields:true,practiceScoreWarns:true',
    'wrongObjectCompatPreserved:true,wrongInvalidEntryWarns:true,practiceScoreWarns:true'
)

replace_once(
    'cnc/tests/data-health-transaction-smoke.cjs',
    "await arm(p,'set-throw',PRACTICE);await repair(p);",
    "await arm(p,'set-throw',SIM);await repair(p);"
)
replace_once(
    'cnc/tests/data-health-transaction-smoke.cjs',
    "textContent.includes('已安全修复5项')",
    "textContent.includes('已安全修复4项')"
)
replace_once(
    'cnc/tests/data-health-transaction-smoke.cjs',
    "await arm(p,'set-throw',PRACTICE);await p.locator('#rollback-btn').click();",
    "await arm(p,'set-throw',SIM);await p.locator('#rollback-btn').click();"
)

print('data-health wrong compatibility fix prepared')
