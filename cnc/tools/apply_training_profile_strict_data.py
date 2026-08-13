from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PROFILE = ROOT / 'cnc' / 'training-profile.js'
TEST = ROOT / 'cnc' / 'tests' / 'mobile-daily-training-plan-smoke.cjs'


def once(text, old, new, label):
    if text.count(old) != 1:
        raise SystemExit(f'{label}: expected one match, got {text.count(old)}')
    return text.replace(old, new, 1)

text = PROFILE.read_text(encoding='utf-8')
text = once(text, "var BUILD='20260808b'", "var BUILD='20260813c'", 'build marker')
text = once(text,
"function practice(){var value=read(PRACTICE_KEY,null);return value&&(value.version===1||value.version===2)?value:{version:2,gateVersion:2,attempts:{},wrong:[],correct:[],lessonScores:{},legacyLessonScores:{}};}\nfunction profile(){var value=read(PROFILE_KEY,null);return value&&value.version===1?value:{version:1,xp:0,badges:[],completed:[],trainingDays:[],currentStreak:0,bestStreak:0,lastTrainingDate:null};}\nfunction normalizeProfile(user){user=user||profile();user.badges=Array.isArray(user.badges)?user.badges:[];user.completed=Array.isArray(user.completed)?user.completed:[];user.trainingDays=Array.isArray(user.trainingDays)?user.trainingDays:[];user.currentStreak=Number(user.currentStreak)||0;user.bestStreak=Number(user.bestStreak)||0;return user;}\nfunction abilityState(lessons,done,scores){var attempted=lessons.filter(function(level){return Number(scores[level]||0)>0||done.indexOf(level)!==-1;});var total=lessons.reduce(function(sum,level){return sum+Math.max(Number(scores[level]||0),done.indexOf(level)!==-1?80:0);},0);var score=Math.round(total/lessons.length);var status=score>=80?'已掌握':score>=60?'接近达标':score>0?'需要加强':'尚未训练';var weakCandidates=attempted.filter(function(level){return Number(scores[level]||0)<80;});var candidates=weakCandidates.length?weakCandidates:attempted.length?attempted:lessons;var weakLesson=candidates.slice().sort(function(a,b){var diff=Number(scores[a]||0)-Number(scores[b]||0);return diff||a-b;})[0];return{score:score,status:status,attempted:attempted.length,total:lessons.length,weakLesson:weakLesson};}",
"function isPlainObject(value){return Boolean(value)&&typeof value==='object'&&!Array.isArray(value);}\nfunction validLessonId(value){return Number.isInteger(value)&&value>=1&&value<=12?value:null;}\nfunction validScore(value){return typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100?value:0;}\nfunction validNonNegative(value){return typeof value==='number'&&Number.isFinite(value)&&value>=0?value:0;}\nfunction validNonNegativeInteger(value){return Number.isInteger(value)&&value>=0?value:0;}\nfunction uniqueStrings(value){return Array.isArray(value)?Array.from(new Set(value.filter(function(item){return typeof item==='string'&&item.trim();}).map(function(item){return item.trim();}))):[];}\nfunction validDate(value){if(typeof value!=='string'||!/^\\d{4}-\\d{2}-\\d{2}$/.test(value))return null;var parts=value.split('-').map(Number),date=new Date(parts[0],parts[1]-1,parts[2]);return date.getFullYear()===parts[0]&&date.getMonth()===parts[1]-1&&date.getDate()===parts[2]?value:null;}\nfunction validDates(value){return Array.isArray(value)?Array.from(new Set(value.map(validDate).filter(Boolean))):[];}\nfunction validLessons(value){return Array.isArray(value)?Array.from(new Set(value.map(validLessonId).filter(Boolean))):[];}\nfunction practice(){var value=read(PRACTICE_KEY,null);return isPlainObject(value)&&(value.version===1||value.version===2)?value:{version:2,gateVersion:2,attempts:{},wrong:[],correct:[],lessonScores:{},legacyLessonScores:{}};}\nfunction profile(){var value=read(PROFILE_KEY,null);return isPlainObject(value)&&value.version===1?value:{version:1,xp:0,badges:[],completed:[],trainingDays:[],currentStreak:0,bestStreak:0,lastTrainingDate:null};}\nfunction normalizeProfile(user){user=isPlainObject(user)?user:profile();return Object.assign({},user,{xp:validNonNegative(user.xp),badges:uniqueStrings(user.badges),completed:validLessons(user.completed),trainingDays:validDates(user.trainingDays),currentStreak:validNonNegativeInteger(user.currentStreak),bestStreak:validNonNegativeInteger(user.bestStreak),lastTrainingDate:validDate(user.lastTrainingDate)});}\nfunction scoreFor(scores,level){return isPlainObject(scores)?validScore(scores[level]):0;}\nfunction abilityState(lessons,done,scores){var attempted=lessons.filter(function(level){return scoreFor(scores,level)>0||done.indexOf(level)!==-1;});var total=lessons.reduce(function(sum,level){return sum+Math.max(scoreFor(scores,level),done.indexOf(level)!==-1?80:0);},0);var score=Math.round(total/lessons.length);var status=score>=80?'已掌握':score>=60?'接近达标':score>0?'需要加强':'尚未训练';var weakCandidates=attempted.filter(function(level){return scoreFor(scores,level)<80;});var candidates=weakCandidates.length?weakCandidates:attempted.length?attempted:lessons;var weakLesson=candidates.slice().sort(function(a,b){var diff=scoreFor(scores,a)-scoreFor(scores,b);return diff||a-b;})[0];return{score:score,status:status,attempted:attempted.length,total:lessons.length,weakLesson:weakLesson};}", 'strict helper block')
text = once(text,
"function resolveDailyFocus(fallbackLevel){var today=dateKey(),stored=read(DAILY_PLAN_KEY,null),storedLevel=stored&&Number(stored.lesson);if(stored&&stored.version===1&&stored.date===today&&Number.isInteger(storedLevel)&&storedLevel>=1&&storedLevel<=12)return storedLevel;var level=Number(fallbackLevel);if(!Number.isInteger(level)||level<1||level>12)level=1;write(DAILY_PLAN_KEY,{version:1,date:today,lesson:level});return level;}",
"function resolveDailyFocus(fallbackLevel){var today=dateKey(),stored=read(DAILY_PLAN_KEY,null),storedLevel=isPlainObject(stored)?validLessonId(stored.lesson):null;if(stored&&stored.version===1&&stored.date===today&&storedLevel)return storedLevel;var level=validLessonId(fallbackLevel)||1;write(DAILY_PLAN_KEY,{version:1,date:today,lesson:level});return level;}", 'daily focus')
text = once(text,
"function snapshot(){var p=practice(),user=normalizeProfile(profile()),done=(read(DONE_KEY,[])||[]).map(Number),scores=p.lessonScores||{};var lessons=Array.from({length:12},function(_,i){var level=i+1,score=Number(scores[level]||0),completed=done.indexOf(level)!==-1;return{level:level,title:lessonTitle(level),score:score,completed:completed,status:completed?'已通过':score>=80?'待记录通关':score>0?'继续练习':'尚未开始'};});var weak=lessons.filter(function(item){return item.score>0&&item.score<80;}),next=lessons.find(function(item){return !item.completed;})||lessons[11],wrong=Array.isArray(p.wrong)?p.wrong:[];var abilities=ABILITIES.map(function(item){return Object.assign({},item,abilityState(item.lessons,done,scores));});var suggested=weak.slice().sort(function(a,b){return a.score-b.score||a.level-b.level;})[0]||next,focusLevel=resolveDailyFocus(suggested.level),focus=lessons.find(function(item){return item.level===focusLevel;})||suggested;var weakest=abilities.find(function(item){return item.lessons.indexOf(focus.level)!==-1;})||abilities[0];var data={xp:Number(user.xp)||0,badges:user.badges,completed:done.length,wrong:wrong.length,wrongIds:wrong.slice(),lessons:lessons,weak:weak,next:next,current:read(CURRENT_KEY,null),abilities:abilities,weakest:weakest,streak:streakSnapshot(user)};data.dailyPlan=buildDailyPlan(data,focus.level);return data;}",
"function snapshot(){var p=practice(),user=normalizeProfile(profile()),done=validLessons(read(DONE_KEY,[])),scores=isPlainObject(p.lessonScores)?p.lessonScores:{};var lessons=Array.from({length:12},function(_,i){var level=i+1,score=scoreFor(scores,level),completed=done.indexOf(level)!==-1;return{level:level,title:lessonTitle(level),score:score,completed:completed,status:completed?'已通过':score>=80?'待记录通关':score>0?'继续练习':'尚未开始'};});var weak=lessons.filter(function(item){return item.score>0&&item.score<80;}),next=lessons.find(function(item){return !item.completed;})||lessons[11],wrong=uniqueStrings(p.wrong);var abilities=ABILITIES.map(function(item){return Object.assign({},item,abilityState(item.lessons,done,scores));});var suggested=weak.slice().sort(function(a,b){return a.score-b.score||a.level-b.level;})[0]||next,focusLevel=resolveDailyFocus(suggested.level),focus=lessons.find(function(item){return item.level===focusLevel;})||suggested;var weakest=abilities.find(function(item){return item.lessons.indexOf(focus.level)!==-1;})||abilities[0];var data={xp:user.xp,badges:user.badges,completed:done.length,wrong:wrong.length,wrongIds:wrong.slice(),lessons:lessons,weak:weak,next:next,current:read(CURRENT_KEY,null),abilities:abilities,weakest:weakest,streak:streakSnapshot(user)};data.dailyPlan=buildDailyPlan(data,focus.level);return data;}", 'snapshot')
text = once(text, "user.xp=(Number(user.xp)||0)+20", "user.xp=validNonNegative(user.xp)+20", 'xp increment')
PROFILE.write_text(text, encoding='utf-8')

test = TEST.read_text(encoding='utf-8')
test = test.replace("window.CNC_TRAINING_PROFILE?.build === '20260808b'", "window.CNC_TRAINING_PROFILE?.build === '20260813c'")
marker = '  const report = {'
if marker not in test:
    raise SystemExit('report marker missing')
scenario = r'''  // 损坏/导入异常共享数据必须只读降级；数值字符串、越界值、重复/未知课程与非法日期不能抬高进度。
  const corruptReadOnly = await page.evaluate(() => {
    const d = new Date();
    const today = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const profile = { version: 1, xp: '999', badges: ['迈出第一步', '迈出第一步', null, [], {}], completed: [1, '2', 2, 99], trainingDays: ['2026-08-13', '2026-08-13', '2026-02-30', null, [], {}], currentStreak: '99', bestStreak: '365', lastTrainingDate: '2026-02-30' };
    const practice = { version: 2, gateVersion: 2, attempts: {}, wrong: ['g00-cutting', 'g00-cutting', null, '', {}, []], correct: [], lessonScores: { 1: '100', 2: 100, 3: 120, 4: -1, 5: '80', 6: null, 7: 80 }, legacyLessonScores: {} };
    const done = [1, '2', 2, 13, 0, null, [], {}];
    localStorage.setItem('cnc_training_profile_v1', JSON.stringify(profile));
    localStorage.setItem('cnc_training_practice_v1', JSON.stringify(practice));
    localStorage.setItem('cnc_study_completed_v1', JSON.stringify(done));
    localStorage.setItem('cnc_daily_training_plan_v1', JSON.stringify({ version: 1, date: today, lesson: '12' }));
    const before = { profile: localStorage.getItem('cnc_training_profile_v1'), practice: localStorage.getItem('cnc_training_practice_v1'), done: localStorage.getItem('cnc_study_completed_v1') };
    const state = window.CNC_TRAINING_PROFILE.snapshot();
    window.CNC_TRAINING_PROFILE.render();
    const after = { profile: localStorage.getItem('cnc_training_profile_v1'), practice: localStorage.getItem('cnc_training_practice_v1'), done: localStorage.getItem('cnc_study_completed_v1') };
    return { state, before, after, dailyStored: JSON.parse(localStorage.getItem('cnc_daily_training_plan_v1')) };
  });
  assert.deepEqual(corruptReadOnly.after, corruptReadOnly.before, '读取损坏共享学习数据不得静默改写原始profile/practice/done');
  assert.equal(corruptReadOnly.state.xp, 0, '数值字符串XP不得被信任');
  assert.equal(corruptReadOnly.state.completed, 2, '字符串课程号不得计入固定12关完成数');
  assert.equal(corruptReadOnly.state.wrong, 1, '错题只接受非空字符串ID并去重');
  assert.equal(corruptReadOnly.state.badges.length, 1, '徽章字符串必须去重并过滤异常项');
  assert.equal(corruptReadOnly.state.streak.current, 0, '字符串连续天数不得被信任');
  assert.equal(corruptReadOnly.state.streak.best, 0, '字符串历史连续天数不得被信任');
  assert.equal(corruptReadOnly.state.streak.total, 1, '训练日期必须严格校验并去重');
  assert.equal(corruptReadOnly.state.lessons.find(item => item.level === 1).score, 0, '字符串100分不得被信任');
  assert.equal(corruptReadOnly.state.lessons.find(item => item.level === 2).score, 100, '合法数字100分必须保留');
  assert.equal(corruptReadOnly.state.lessons.find(item => item.level === 3).score, 0, '120分不得进入课程成绩');
  assert.equal(corruptReadOnly.state.lessons.find(item => item.level === 4).score, 0, '负分不得进入课程成绩');
  assert.equal(corruptReadOnly.state.lessons.find(item => item.level === 5).score, 0, '字符串80分不得被信任');
  assert.equal(corruptReadOnly.state.dailyPlan.lesson, 3, '字符串缓存课程号不得劫持今日推荐');
  assert.equal(corruptReadOnly.dailyStored.lesson, 3, '无效日计划只允许重建独立daily plan缓存');
  assert.doesNotMatch(JSON.stringify(corruptReadOnly.state), /NaN|Infinity/, '共享训练状态不得泄露NaN/Infinity');
  const corruptLayout = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth, text: document.body.innerText }));
  assert.ok(corruptLayout.scrollWidth <= corruptLayout.innerWidth + 1, `损坏数据场景不得产生手机横向溢出：${JSON.stringify(corruptLayout)}`);
  assert.doesNotMatch(corruptLayout.text, /NaN|Infinity/, '损坏数据场景页面不得显示NaN/Infinity');

'''
test = test.replace(marker, scenario + marker, 1)
TEST.write_text(test, encoding='utf-8')
print('shared training profile strict-data patch prepared')
