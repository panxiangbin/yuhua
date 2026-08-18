from pathlib import Path

path = Path('cnc/training-achievements.html')
text = path.read_text(encoding='utf-8')
start_marker = '    function listValues(v){'
end_marker = '    function simulatorCandidates(simulator,id){'
start = text.find(start_marker)
end = text.find(end_marker)
if start < 0 or end < 0 or end <= start:
    raise SystemExit(f'成长成果错题函数边界定位失败: start={start} end={end}')

replacement = '''    function wrongEntries(v){return Array.isArray(v)?v.map(function(row){return ['',row];}):isRecord(v)?Object.entries(v):[];}\n    function scalarText(v){return ['string','number','boolean'].includes(typeof v)?String(v).trim():'';}\n    function wrongQuestionId(w,fallback){return scalarText(w.questionId!==undefined?w.questionId:w.id!==undefined?w.id:w.key!==undefined?w.key:fallback);}\n    function wrongSourceId(w,fallback){var hint=scalarText(w.practiceId!==undefined?w.practiceId:w.source!==undefined?w.source:w.setId!==undefined?w.setId:w.practice!==undefined?w.practice:w.redoUrl).toLowerCase(),direct=PRACTICE_IDS.find(function(id){return hint.includes(id);});if(direct)return direct;var id=wrongQuestionId(w,fallback).toLowerCase(),mapped=WRONG_SOURCE_PREFIXES.find(function(pair){return id.startsWith(pair[0]);});return mapped?mapped[1]:'';}\n    function wrongCount(practice){if(!practice.valid)return null;var map=new Set(),malformed=false;['wrongQuestions','wrongItems','wrong'].forEach(function(field){var value=practice.value[field];if(value===undefined)return;if(!Array.isArray(value)&&!isRecord(value)){invalid.push('cnc_training_practice_v1.'+field);malformed=true;return;}wrongEntries(value).forEach(function(pair){var fallback=pair[0],w=pair[1];if(!isRecord(w))return;var id=wrongQuestionId(w,fallback);if(!id)return;var source=wrongSourceId(w,fallback)||'legacy';map.add(source+':'+id);});});return malformed?null:map.size;}\n'''

new_text = text[:start] + replacement + text[end:]
if new_text == text:
    raise SystemExit('成长成果错题对象键修复未产生变化')
if 'function listValues(v)' in new_text:
    raise SystemExit('旧 Object.values 错题读取仍残留')
required = [
    'function wrongEntries(v)',
    'Object.entries(v)',
    'wrongQuestionId(w,fallback)',
    'wrongSourceId(w,fallback)',
    'wrongEntries(value).forEach',
]
for token in required:
    if token not in new_text:
        raise SystemExit(f'修复结果缺少关键契约: {token}')
path.write_text(new_text, encoding='utf-8')
print('通过：成长成果已保留对象型错题 key，并用于题目 ID / 专项来源回退。')
