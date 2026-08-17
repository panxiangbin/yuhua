from pathlib import Path

ROOT = Path('.')


def replace_once(path, old, new, label):
    p = ROOT / path
    text = p.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}:{label}: expected exactly one match, got {count}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')


def replace_span(path, start, end, new, label):
    p = ROOT / path
    text = p.read_text(encoding='utf-8')
    start_count = text.count(start)
    end_count = text.count(end)
    if start_count != 1 or end_count != 1:
        raise SystemExit(
            f'{path}:{label}: expected unique anchors, start={start_count}, end={end_count}'
        )
    i = text.index(start)
    j = text.index(end, i)
    if j <= i:
        raise SystemExit(f'{path}:{label}: invalid anchor order')
    p.write_text(text[:i] + new + text[j:], encoding='utf-8')


# 成长档案：保留对象映射的 key，作为缺失 questionId/id/key 时的题目 ID 回退。
replace_span(
    'cnc/profile.html',
    'function listValues(',
    'function scalarText(',
    "function listValues(v){return Array.isArray(v)?v:record(v)?Object.values(v):[]}function wrongEntries(v){return Array.isArray(v)?v.map(row=>['',row]):record(v)?Object.entries(v):[]}",
    'wrong-entry-reader',
)
replace_span(
    'cnc/profile.html',
    'function wrongQuestionId(',
    'function history(',
    "function wrongQuestionId(w,fallback=''){return scalarText(w.questionId??w.id??w.key??fallback)}function wrongSourceId(w,fallback=''){const hint=scalarText(w.practiceId??w.source??w.setId??w.practice??w.redoUrl).toLowerCase();const direct=SETS.find(id=>hint.includes(id));if(direct)return direct;const id=wrongQuestionId(w,fallback).toLowerCase(),mapped=SOURCE_PREFIXES.find(([prefix])=>id.startsWith(prefix));return mapped?mapped[1]:''}function wrongRows(d){const map=new Map;[...wrongEntries(d.wrongQuestions),...wrongEntries(d.wrongItems),...wrongEntries(d.wrong)].forEach(([fallback,w])=>{if(!record(w))return;const sid=wrongSourceId(w,fallback),id=wrongQuestionId(w,fallback);if(!sid||!id)return;const key=`${sid}:${id}`,old=map.get(key)||{};map.set(key,{...old,...w,practiceId:sid,questionId:id})});return [...map.values()]}",
    'wrong-normalization',
)

# 跨专项错题页：对象 key 也是正式兼容的题目 ID 来源，不能 Object.values 后丢失。
replace_span(
    'cnc/practice-wrong-review.html',
    'function listValues(',
    'function scalarText(',
    "function listValues(v){if(Array.isArray(v))return v;if(isRecord(v))return Object.values(v);return []}function wrongEntries(v){if(Array.isArray(v))return v.map(row=>['',row]);if(isRecord(v))return Object.entries(v);return []}function rawWrong(d){return [...wrongEntries(d.wrongQuestions),...wrongEntries(d.wrongItems),...wrongEntries(d.wrong)]}",
    'wrong-entry-reader',
)
replace_span(
    'cnc/practice-wrong-review.html',
    'function questionId(',
    'function fillSelect(',
    "function questionId(w,fallback=''){return scalarText(w.questionId??w.id??w.key??fallback,'')}function sourceId(w,fallback=''){const hint=scalarText(w.practiceId??w.source??w.setId??w.practice??w.redoUrl,'').toLowerCase();const direct=Object.keys(SOURCES).find(id=>hint.includes(id));if(direct)return direct;const id=questionId(w,fallback).toLowerCase(),mapped=SOURCE_PREFIXES.find(([prefix])=>id.startsWith(prefix));return mapped?mapped[1]:''}function normalize(d){const map=new Map;rawWrong(d).forEach(([fallback,w])=>{if(!isRecord(w))return;const sid=sourceId(w,fallback),id=questionId(w,fallback);if(!sid||!id)return;const k=`${sid}:${id}`,old=map.get(k)||{};map.set(k,{sourceId:sid,questionId:id,title:scalarText(w.question??w.title??w.prompt,`错题 ${id}`),ability:scalarText(w.ability??w.dimension??w.category,'待分类'),risk:scalarText(w.risk??w.riskLevel,'待核验'),explanation:scalarText(w.explanation??w.explain??w.analysis??w.reason,'请返回来源专项查看完整解析。'),mergedRecords:Number(old.mergedRecords||0)+1,lastAt:scalarText(w.updatedAt??w.createdAt??w.time??old.lastAt,'')})});return [...map.values()]}",
    'wrong-normalization',
)

# 成长档案回归：对象 key 本身就是真实题目 ID，值中不再重复放 id。
replace_once(
    'cnc/tests/mobile-profile-practice-analytics-smoke.cjs',
    "        wrong: {\n          safetyMirror: { id: 'sc-05', ability: '安全基础', risk: '高' },\n          drawingDuplicate: { id: 'dsp-02', practice: 'drawing-setup-process', ability: '图纸识读', risk: '中' }\n        }",
    "        wrong: {\n          'sc-05': { ability: '安全基础', risk: '高' },\n          'dsp-02': { practice: 'drawing-setup-process', ability: '图纸识读', risk: '中' }\n        }",
    'key-only-fixture',
)
replace_once(
    'cnc/tests/mobile-profile-practice-analytics-smoke.cjs',
    "    '...listValues(d.wrong)',",
    "    '...wrongEntries(d.wrong)',\n    \"function wrongQuestionId(w,fallback='')\",",
    'contract-tokens',
)

# 跨专项复习回归：安全专项记录只在对象 key 中保存题目 ID。
replace_once(
    'cnc/tests/mobile-practice-wrong-review-smoke.cjs',
    "wrong:{'sc-01':{id:'sc-01',course:'第1关 安全基础',ability:'安全操作',risk:'高',title:'异常运动时先做什么？',explain:'先停止危险运动，再按现场制度和原厂手册确认恢复条件。'}}",
    "wrong:{'sc-01':{course:'第1关 安全基础',ability:'安全操作',risk:'高',title:'异常运动时先做什么？',explain:'先停止危险运动，再按现场制度和原厂手册确认恢复条件。'}}",
    'key-only-fixture',
)

print('ok: profile and wrong-review preserve object-map question IDs; tests cover key-only records')
