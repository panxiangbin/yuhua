from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

def replace_once(path, old, new):
    p = ROOT / path
    text = p.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected exactly one match, got {count}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')

ai = 'cnc/ai-teacher.html'
old = """  function inspectLearningData(){
    const invalid=[];
    for(const item of MANAGED_KEYS){
      const raw=localStorage.getItem(item.key);
      if(raw===null)continue;
      try{
        const parsed=JSON.parse(raw);
        const valid=item.kind==='array'?Array.isArray(parsed):Boolean(parsed&&typeof parsed==='object'&&!Array.isArray(parsed));
        if(!valid)invalid.push({key:item.key,reason:item.kind==='array'?'根结构不是数组':'根结构不是对象'});
      }catch{
        invalid.push({key:item.key,reason:'JSON无法解析'});
      }
    }
    return {ok:invalid.length===0,invalid};
  }
"""
new = """  function isPlainObject(value){return Boolean(value)&&typeof value==='object'&&!Array.isArray(value)}
  function validLessonId(value){return Number.isInteger(value)&&value>=1&&value<=12?value:null}
  function stageLevel(value){
    const direct=validLessonId(value);if(direct!==null)return direct;
    if(typeof value==='string'){
      const match=value.match(/^stage-(\\d{1,2})$/i),level=Number(match&&match[1]);
      if(Number.isInteger(level)&&level>=1&&level<=12)return level;
    }
    return null;
  }
  function validDate(value){
    if(typeof value!=='string'||!/^\\d{4}-\\d{2}-\\d{2}$/.test(value))return null;
    const parts=value.split('-').map(Number),date=new Date(parts[0],parts[1]-1,parts[2]);
    return date.getFullYear()===parts[0]&&date.getMonth()===parts[1]-1&&date.getDate()===parts[2]?value:null;
  }
  function wrongRecordId(item,fallbackKey){
    if(typeof item==='string'){const text=item.trim();return text||null;}
    if(!isPlainObject(item))return null;
    for(const value of [item.questionId,item.id,item.key,fallbackKey])if(typeof value==='string'&&value.trim())return value.trim();
    return null;
  }
  function wrongFieldIssues(value,field,add){
    if(Array.isArray(value)){value.forEach(item=>{if(!wrongRecordId(item,null))add(`.${field}:entry`)});return;}
    if(isPlainObject(value)){Object.entries(value).forEach(([key,item])=>{if(!isPlainObject(item)||!wrongRecordId(item,key))add(`.${field}:entry`)});return;}
    add(`.${field}:shape`);
  }
  function profileNestedIssues(value){
    const issues=[],add=suffix=>{const key=KEYS.profile+suffix;if(!issues.includes(key))issues.push(key)},has=key=>Object.prototype.hasOwnProperty.call(value,key);
    const inspectCompleted=field=>{if(!has(field))return;if(!Array.isArray(value[field])){add(`.${field}:shape`);return;}const seen=new Set();value[field].forEach(item=>{const id=stageLevel(item);if(id===null)add(`.${field}:entry`);else if(seen.has(id))add(`.${field}:duplicate`);else seen.add(id)});};
    if(value.version!==1)add(':version');
    if(has('xp')&&!(typeof value.xp==='number'&&Number.isFinite(value.xp)&&value.xp>=0))add('.xp:entry');
    if(has('currentStreak')&&(!Number.isInteger(value.currentStreak)||value.currentStreak<0))add('.currentStreak:entry');
    if(has('bestStreak')&&(!Number.isInteger(value.bestStreak)||value.bestStreak<0))add('.bestStreak:entry');
    if(has('lastTrainingDate')&&value.lastTrainingDate!==null&&!validDate(value.lastTrainingDate))add('.lastTrainingDate:entry');
    inspectCompleted('completed');inspectCompleted('completedStages');
    if(has('badges')){if(!Array.isArray(value.badges))add('.badges:shape');else{const seen=new Set();value.badges.forEach(item=>{if(typeof item!=='string'||!item.trim()){add('.badges:entry');return;}const v=item.trim();if(seen.has(v))add('.badges:duplicate');else seen.add(v)});}}
    if(has('trainingDays')){if(!Array.isArray(value.trainingDays))add('.trainingDays:shape');else{const seen=new Set();value.trainingDays.forEach(item=>{const day=validDate(item);if(!day){add('.trainingDays:entry');return;}if(seen.has(day))add('.trainingDays:duplicate');else seen.add(day)});}}
    return issues;
  }
  function practiceNestedIssues(value){
    const issues=[],add=suffix=>{const key=KEYS.practice+suffix;if(!issues.includes(key))issues.push(key)},has=key=>Object.prototype.hasOwnProperty.call(value,key);
    if(!(value.version===1||value.version===2))add(':version');
    ['wrongQuestions','wrongItems','wrong'].forEach(field=>{if(has(field))wrongFieldIssues(value[field],field,add)});
    if(has('lessonScores')){if(!isPlainObject(value.lessonScores))add('.lessonScores:shape');else Object.entries(value.lessonScores).forEach(([level,score])=>{const n=Number(level);if(!Number.isInteger(n)||n<1||n>12||typeof score!=='number'||!Number.isFinite(score)||score<0||score>100)add('.lessonScores:entry')});}
    return issues;
  }
  function inspectLearningData(){
    const invalid=[],add=(key,reason)=>{if(!invalid.some(item=>item.key===key))invalid.push({key,reason})};
    for(const item of MANAGED_KEYS){
      const raw=localStorage.getItem(item.key);if(raw===null)continue;
      try{
        const parsed=JSON.parse(raw);
        const valid=item.kind==='array'?Array.isArray(parsed):isPlainObject(parsed);
        if(!valid){add(item.key,item.kind==='array'?'根结构不是数组':'根结构不是对象');continue;}
        if(item.key===KEYS.study){for(const value of parsed)if(stageLevel(value)===null){add(`${item.key}:entry`,'课程完成条目无法确认');break;}}
        if(item.key===KEYS.profile)for(const key of profileNestedIssues(parsed))add(key,'成长档案嵌套证据异常');
        if(item.key===KEYS.practice)for(const key of practiceNestedIssues(parsed))add(key,'练习档案嵌套证据异常');
      }catch{add(item.key,'JSON无法解析');}
    }
    return {ok:invalid.length===0,invalid};
  }
"""
replace_once(ai, old, new)

# Update the existing AI-teacher integrity regression to require blocking for nested practice corruption.
test = ROOT / 'cnc/tests/ai-teacher-data-integrity-smoke.cjs'
text = test.read_text(encoding='utf-8')
repls = {
"report.nestedWrongFiltered = nested.summary?.wrong === 2 && visibleNested.wrong === '2';":"report.nestedWrongFiltered = nested.summary?.integrity === 'blocked' && visibleNested.wrong === '--';",
"report.nestedSimulatorFiltered = nested.summary?.simulations === 3 && visibleNested.simulations === '3/13';":"report.nestedSimulatorFiltered = nested.summary?.integrity === 'blocked' && visibleNested.simulations === '--';",
"report.nestedScoreStrict = nested.summary?.weakest === '机床与坐标' && nested.summary?.weakestScore === 26 && visibleNested.weakest === '机床与坐标';":"report.nestedScoreStrict = nested.summary?.integrity === 'blocked' && visibleNested.weakest === '暂停判断';",
"report.nestedIntegrityRemainsUsable = nested.alertHidden === true;":"report.nestedIntegrityRemainsUsable = nested.alertHidden === false;",
"根结构正常时嵌套坏记录只读降级、不误触发全局阻断":"practice嵌套坏记录触发全局可信度阻断",
"数组/null/字符串错题不得污染AI老师错题数量":"损坏错题结构必须阻断AI老师可信错题数量",
"固定13项模拟ID必须合并新版records与旧simulators，90分、未知ID、字符串passed、字符串/越界/负数成绩或数组记录不得冒充模拟通过":"practice嵌套损坏时不得继续暴露可信模拟进度",
"字符串或超出0-100范围的课程成绩不得污染AI老师能力画像":"字符串或超出0-100范围的课程成绩必须阻断AI老师能力画像",
"根结构合法时应忽略嵌套坏记录，而不是把整个学习档案误判为损坏":"practice根对象合法但嵌套证据损坏时必须进入完整性阻断",
"const completionStudyRaw = JSON.stringify([1, '2', 'stage-3', 4, 99, null, [], {}]);":"const completionStudyRaw = JSON.stringify([1, 'stage-3', 4]);",
"completed: ['5', 'stage-6', 7],":"completed: ['stage-6', 7],",
"completedStages: ['8', 'stage-9', 10]":"completedStages: ['stage-9', 10]"
}
for old_text,new_text in repls.items():
    if old_text not in text: raise SystemExit(f'ai-teacher-data-integrity: missing {old_text[:60]}')
    text=text.replace(old_text,new_text,1)
test.write_text(text,encoding='utf-8')

# PWA54 current target pins in the same CNC files used by the prior AI-teacher core-resource bump.
files = [
'cnc/MOBILE_LEARNING_MEDIA_PROGRESS.md','cnc/ai-teacher.html','cnc/build-info.json','cnc/pwa-self-test.html','cnc/pwa-status.html','cnc/sw.js',
'cnc/tests/ai-teacher-data-integrity-smoke.cjs','cnc/tests/g10-programmable-data-input-trust-smoke.cjs','cnc/tests/g28-reference-return-boundary-trust-smoke.cjs','cnc/tests/g53-machine-coordinate-boundary-trust-smoke.cjs','cnc/tests/g92-dual-semantic-boundary-trust-smoke.cjs','cnc/tests/g94-dual-semantic-boundary-trust-smoke.cjs','cnc/tests/g95-cold-offline-source-trust-smoke.cjs','cnc/tests/g95-dual-semantic-boundary-trust-smoke.cjs','cnc/tests/g96-g97-cold-offline-source-trust-smoke.cjs','cnc/tests/g96-g97-spindle-mode-boundary-trust-smoke.cjs','cnc/tests/g98-g99-cold-offline-source-trust-smoke.cjs','cnc/tests/g98-g99-dual-semantic-boundary-trust-smoke.cjs','cnc/tests/mobile-pwa-offline-cache-smoke.cjs','cnc/tests/mobile-pwa-profile-bfcache-smoke.cjs','cnc/tests/mobile-pwa-upgrade-data-smoke.cjs','cnc/tests/pages-ai-teacher-offline-core-deployment-smoke.cjs','cnc/tests/pages-beginner-placement-offline-deployment-smoke.cjs','cnc/tests/pages-training-camp-route-handoff-deployment-smoke.cjs']
for rel in files:
    p=ROOT/rel
    s=p.read_text(encoding='utf-8')
    s=s.replace('20260818-pwa53','20260818-pwa54').replace('20260818-learning53','20260818-learning54')
    p.write_text(s,encoding='utf-8')
for rel in ['cnc/tests/pages-ai-teacher-offline-core-deployment-smoke.cjs','cnc/tests/pages-beginner-placement-offline-deployment-smoke.cjs','cnc/tests/pages-training-camp-route-handoff-deployment-smoke.cjs']:
    p=ROOT/rel;s=p.read_text(encoding='utf-8');s=s.replace('20260818-pwa52','20260818-pwa53').replace('20260818-learning52','20260818-learning53');p.write_text(s,encoding='utf-8')

# Record the feature in the public build marker without changing unrelated content.
p=ROOT/'cnc/build-info.json';s=p.read_text(encoding='utf-8');needle='AI老师兼容错题对象键历史结构';
if needle in s and 'AI老师嵌套学习数据完整性阻断' not in s:s=s.replace(needle,needle+'；AI老师嵌套学习数据完整性阻断',1)
p.write_text(s,encoding='utf-8')

print('PWA54 AI teacher nested-integrity CNC runtime generation completed.')
