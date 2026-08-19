from pathlib import Path

path = Path('cnc/training-achievements.html')
text = path.read_text(encoding='utf-8')
old = "function wrongCount(practice){if(!practice.valid)return null;var map=new Set(),malformed=false;['wrongQuestions','wrongItems','wrong'].forEach(function(field){var value=practice.value[field];if(value===undefined)return;if(!Array.isArray(value)&&!isRecord(value)){invalid.push('cnc_training_practice_v1.'+field);malformed=true;return;}wrongEntries(value).forEach(function(pair){var fallback=pair[0],w=pair[1];if(!isRecord(w))return;var id=wrongQuestionId(w,fallback);if(!id)return;var source=wrongSourceId(w,fallback)||'legacy';map.add(source+':'+id);});});return malformed?null:map.size;}"
new = "function wrongCount(practice){if(!practice.valid)return null;var map=new Set(),malformed=false;['wrongQuestions','wrongItems','wrong'].forEach(function(field){var value=practice.value[field];if(value===undefined)return;if(!Array.isArray(value)&&!isRecord(value)){invalid.push('cnc_training_practice_v1.'+field);malformed=true;return;}var entryInvalid=false;wrongEntries(value).forEach(function(pair){var fallback=pair[0],w=pair[1];if(!isRecord(w)){entryInvalid=true;return;}var id=wrongQuestionId(w,fallback);if(!id){entryInvalid=true;return;}var source=wrongSourceId(w,fallback)||'legacy';map.add(source+':'+id);});if(entryInvalid)invalid.push('cnc_training_practice_v1.'+field+':entry');});return malformed?null:map.size;}"
count = text.count(old)
if count != 1:
    raise SystemExit(f'cnc/training-achievements.html: expected exactly one wrongCount match, got {count}')
text = text.replace(old, new, 1)
if "cnc_training_practice_v1.'+field+':entry'" not in text:
    raise SystemExit('entry-level wrong record integrity marker was not written')
path.write_text(text, encoding='utf-8')
print('通过：成长成果错题字段内部坏记录将登记 field:entry，合法错题计数保持不变。')
