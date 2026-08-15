from pathlib import Path
import json
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
TARGET_PWA = '20260815-pwa47'
TARGET_CACHE = '20260815-learning47'
CURRENT_MAIN_PWA = '20260815-pwa46'
CURRENT_MAIN_CACHE = '20260815-learning46'
OLD_TARGET_PWA = '20260815-pwa46'
OLD_TARGET_CACHE = '20260815-learning46'
OLD_MAIN_PWA = '20260815-pwa45'
OLD_MAIN_CACHE = '20260815-learning45'

TRANSITION_FILES = [
    'cnc/tests/pages-ai-teacher-offline-core-deployment-smoke.cjs',
    'cnc/tests/pages-beginner-placement-offline-deployment-smoke.cjs',
    'cnc/tests/pages-training-camp-route-handoff-deployment-smoke.cjs',
]

ALLOWED_SUFFIXES = {'.cjs', '.js', '.html', '.json', '.md', '.yml', '.yaml'}

def read(rel):
    return (ROOT / rel).read_text(encoding='utf-8')

def write(rel, text):
    (ROOT / rel).write_text(text, encoding='utf-8')

def must_replace(text, old, new, label, count=None):
    actual = text.count(old)
    if actual == 0:
        raise RuntimeError(f'{label}: 未找到待替换内容')
    if count is not None and actual != count:
        raise RuntimeError(f'{label}: 期望{count}处，实际{actual}处')
    return text.replace(old, new)

def patch_training_camp():
    rel = 'cnc/training-camp.html'
    src = read(rel)
    old = """const COURSE_ID_SET=new Set(COURSES.map(course=>course.id));
const SIMULATOR_IDS=['homing','workholding-check','tool-installation','tool-length-offset-check','work-offset-setting','program-dry-run','single-block-first-approach','graphics-segment-prediction','first-piece-inspection','alarm-troubleshooting','cutter-comp-risk','hole-cycle-troubleshooting','measurement-vs-machining-error'];
function isRecord(value){return !!value&&typeof value==='object'&&!Array.isArray(value)}
function strictScore(value){return typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100?value:null}
function safeParse(key,fallback){try{const value=JSON.parse(localStorage.getItem(key)||'null');return isRecord(value)?value:fallback}catch{return fallback}}
function getScores(profile){return isRecord(profile.courseScores)?profile.courseScores:{}}
function completedStageIds(profile){return new Set((Array.isArray(profile.completedStages)?profile.completedStages:[]).filter(id=>typeof id==='string'&&COURSE_ID_SET.has(id)))}
function courseScore(profile,id){const value=strictScore(getScores(profile)[id]);return value===null?0:value}
function isDone(profile,id){const done=completedStageIds(profile);if(done.has(id))return true;const value=strictScore(getScores(profile)[id]);return value!==null&&value>=80}
function countWrong(practice){const wrong=practice.wrongQuestions??practice.wrong??[];if(Array.isArray(wrong))return wrong.filter(isRecord).length;if(isRecord(wrong))return Object.values(wrong).filter(isRecord).length;return 0}
"""
    new = """const COURSE_ID_SET=new Set(COURSES.map(course=>course.id));
const STUDY_KEY='cnc_study_completed_v1';
const PRACTICE_IDS=['safety-coordinate','advanced-verification','drawing-setup-process','program-fill-sort-debug','alarm-parameter-first-piece'];
const WRONG_SOURCE_PREFIXES=[['sc-','safety-coordinate'],['av-','advanced-verification'],['dsp-','drawing-setup-process'],['pfsd-','program-fill-sort-debug'],['apf-','alarm-parameter-first-piece']];
const SIMULATOR_IDS=['homing','workholding-check','tool-installation','tool-length-offset-check','work-offset-setting','program-dry-run','single-block-first-approach','graphics-segment-prediction','first-piece-inspection','alarm-troubleshooting','cutter-comp-risk','hole-cycle-troubleshooting','measurement-vs-machining-error'];
function isRecord(value){return !!value&&typeof value==='object'&&!Array.isArray(value)}
function strictScore(value){return typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100?value:null}
function safeParse(key,fallback){try{const value=JSON.parse(localStorage.getItem(key)||'null');return isRecord(value)?value:fallback}catch{return fallback}}
function listValues(value){return Array.isArray(value)?value:isRecord(value)?Object.values(value):[]}
function scalarText(value){return ['string','number','boolean'].includes(typeof value)?String(value).trim():''}
function stageLevel(value){if(typeof value==='number'&&Number.isInteger(value)&&value>=1&&value<=12)return value;if(typeof value==='string'){const match=value.match(/^stage-(\\d{1,2})$/i),level=Number(match?.[1]);if(Number.isInteger(level)&&level>=1&&level<=12)return level}return null}
function getScores(profile){return isRecord(profile.courseScores)?profile.courseScores:{}}
function completedStageIds(profile){const raw=localStorage.getItem(STUDY_KEY),levels=new Set();if(raw!==null){try{const rows=JSON.parse(raw);if(Array.isArray(rows))rows.map(stageLevel).filter(Boolean).forEach(level=>levels.add(level))}catch{}return new Set([...levels].map(level=>`stage-${level}`))}[...listValues(profile.completed),...listValues(profile.completedStages)].map(stageLevel).filter(Boolean).forEach(level=>levels.add(level));return new Set([...levels].map(level=>`stage-${level}`))}
function courseScore(profile,id){const value=strictScore(getScores(profile)[id]);return value===null?0:value}
function isDone(profile,id){return completedStageIds(profile).has(id)}
function wrongQuestionId(row){return scalarText(row.questionId??row.id??row.key)}
function wrongSourceId(row){const hint=scalarText(row.practiceId??row.source??row.setId??row.practice??row.redoUrl).toLowerCase();const direct=PRACTICE_IDS.find(id=>hint.includes(id));if(direct)return direct;const id=wrongQuestionId(row).toLowerCase(),mapped=WRONG_SOURCE_PREFIXES.find(([prefix])=>id.startsWith(prefix));return mapped?mapped[1]:''}
function wrongRows(practice){const map=new Map();[...listValues(practice.wrongQuestions),...listValues(practice.wrongItems),...listValues(practice.wrong)].forEach(row=>{if(!isRecord(row))return;const source=wrongSourceId(row),id=wrongQuestionId(row);if(!source||!id)return;const key=`${source}:${id}`;if(!map.has(key))map.set(key,row)});return [...map.values()]}
function countWrong(practice){return wrongRows(practice).length}
"""
    if old not in src:
        raise RuntimeError('training-camp 数据语义旧块未精确匹配')
    src = src.replace(old, new, 1)
    write(rel, src)


def patch_training_test():
    rel = 'cnc/tests/mobile-training-camp-hub-smoke.cjs'
    src = read(rel)
    src = src.replace("assert.strictEqual(await malformed.page.locator('#passed-count').textContent(), '2', '只有合法完成记录与合法90分应计为通过');", "assert.strictEqual(await malformed.page.locator('#passed-count').textContent(), '1', '只有真实完成记录可计为通过，90分成绩不能冒充课程完成');")
    src = src.replace("assert.strictEqual(await malformed.page.locator('#avg-score').textContent(), '85');", "assert.strictEqual(await malformed.page.locator('#avg-score').textContent(), '80');")
    src = src.replace("assert.strictEqual(await malformed.page.locator('#wrong-count').textContent(), '2', '损坏错题不得计数');", "assert.strictEqual(await malformed.page.locator('#wrong-count').textContent(), '0', '缺少可确认专项来源的错题不得污染统计');")
    src = src.replace("assert.match(await malformed.page.locator('#next-title').textContent(), /第3关/);", "assert.match(await malformed.page.locator('#next-title').textContent(), /第2关/);")

    marker = """    const completeProfile = { completedStages: Array.from({length:12},(_,i)=>`stage-${i+1}`), courseScores: Object.fromEntries(Array.from({length:12},(_,i)=>[`stage-${i+1}`,80+(i%3)*10])) };
"""
    extra = """    const canonicalWins = await openPage(browser, {
      cnc_study_completed_v1: [1, 2, 'stage-3', '4', 99, null],
      cnc_training_profile_v1: { completed: [1,2,3,4,5,6], completedStages: ['stage-1','stage-2','stage-3','stage-4','stage-5','stage-6'], courseScores: {'stage-4':100,'stage-5':100,'stage-6':100} },
      cnc_training_practice_v1: { wrongQuestions: [] }
    });
    assert.strictEqual(await canonicalWins.page.locator('#passed-count').textContent(), '3', 'canonical存在时只能认canonical真实整数与stage-N，旧profile不得抬高完成数');
    assert.match(await canonicalWins.page.locator('#next-title').textContent(), /第4关/);
    await assertMobile(canonicalWins); report.cases.canonicalCompletionWins = true;
    await canonicalWins.page.close();

    const legacyFallback = await openPage(browser, {
      cnc_training_profile_v1: { completed: [1,'2','stage-3'], completedStages: ['stage-4','5','stage-6'], courseScores: {'stage-2':100,'stage-5':100} },
      cnc_training_practice_v1: { wrongQuestions: [] }
    });
    assert.strictEqual(await legacyFallback.page.locator('#passed-count').textContent(), '4', 'canonical缺失时才兼容旧profile，纯数字字符串与单独高分不得冒充完成');
    assert.match(await legacyFallback.page.locator('#next-title').textContent(), /第2关/);
    await assertMobile(legacyFallback); report.cases.legacyCompletionFallback = true;
    await legacyFallback.page.close();

    const wrongCompat = await openPage(browser, {
      cnc_study_completed_v1: Array.from({length:12},(_,i)=>i+1),
      cnc_training_profile_v1: { courseScores: {} },
      cnc_training_practice_v1: {
        wrongQuestions: [{practiceId:'safety-coordinate',id:'sc-1'},{practiceId:'advanced-verification',id:'av-1'}],
        wrongItems: [{practiceId:'safety-coordinate',id:'sc-1'},{id:'dsp-1'}],
        wrong: [{id:'apf-1'},{id:'dsp-1'},null,[]]
      }
    });
    assert.strictEqual(await wrongCompat.page.locator('#passed-count').textContent(), '12');
    assert.strictEqual(await wrongCompat.page.locator('#wrong-count').textContent(), '4', '三类兼容错题字段必须按专项来源+题目ID去重');
    assert.match(await wrongCompat.page.locator('#route-title').textContent(), /先清掉4道错题/);
    assert.match(await wrongCompat.page.locator('#route-cta').getAttribute('href'), /practice-wrong-review\\.html/);
    await assertMobile(wrongCompat); report.cases.wrongThreeFieldDedup = true;
    await wrongCompat.page.close();

"""
    if marker not in src:
        raise RuntimeError('training-camp 测试插入点未找到')
    src = src.replace(marker, extra + marker, 1)
    write(rel, src)


def sync_pwa_pins():
    targets = []
    for root_rel in ['cnc', '.github/workflows']:
        root = ROOT / root_rel
        for p in root.rglob('*'):
            if not p.is_file() or p.suffix.lower() not in ALLOWED_SUFFIXES:
                continue
            rel = p.relative_to(ROOT).as_posix()
            if rel.startswith('cnc/test-results/') or rel.startswith('cnc/docs/') or rel == 'cnc/MOBILE_HOME_REFACTOR_PROGRESS.md':
                continue
            if rel.startswith('.github/workflows/') and not p.name.startswith('cnc-'):
                continue
            targets.append(rel)
    for rel in targets:
        src = read(rel)
        updated = src.replace(OLD_TARGET_PWA, TARGET_PWA).replace(OLD_TARGET_CACHE, TARGET_CACHE)
        if updated != src:
            write(rel, updated)

    for rel in TRANSITION_FILES:
        src = read(rel)
        src2 = re.sub(r"(const\s+currentMainPwaBuild\s*=\s*['\"])20260815-pwa45(['\"])", rf"\g<1>{CURRENT_MAIN_PWA}\2", src)
        src2 = src2.replace("[currentMainPwaBuild]: '20260815-learning45'", "[currentMainPwaBuild]: '20260815-learning46'")
        if src2 == src:
            raise RuntimeError(f'{rel}: 当前main过渡针未更新')
        write(rel, src2)

    info_path = ROOT / 'cnc/build-info.json'
    info = json.loads(info_path.read_text(encoding='utf-8'))
    tag = '训练营课程完成canonical优先级、严格ID与三类错题去重'
    if tag not in info.get('contentStage',''):
        info['contentStage'] = info.get('contentStage','').rstrip('、， ') + ' · ' + tag
    info['generatedAt'] = '2026-08-15T08:30:00+08:00'
    info_path.write_text(json.dumps(info, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def run(cmd):
    print('+', ' '.join(cmd))
    subprocess.run(cmd, cwd=ROOT, check=True)


def audit_scope():
    allowed_prefixes = ('cnc/', '.github/workflows/cnc-')
    changed = subprocess.check_output(['git','diff','--name-only','HEAD'], cwd=ROOT, text=True).splitlines()
    bad = [p for p in changed if not p.startswith(allowed_prefixes)]
    if bad:
        raise RuntimeError('发现非CNC范围改动: ' + ', '.join(bad))
    if any(p.startswith('cnc/test-results/') for p in changed):
        raise RuntimeError('自动诊断产物不得进入正式变更')
    print('受控修改文件数:', len(changed))
    for p in changed: print(' -', p)


def main():
    patch_training_camp()
    patch_training_test()
    sync_pwa_pins()
    run(['node','--check','cnc/tests/mobile-training-camp-hub-smoke.cjs'])
    run(['node','cnc/tests/pwa-build-reference-audit-smoke.cjs'])
    report = ROOT / 'cnc/test-results/pwa-build-reference-audit/report.json'
    if report.exists(): report.unlink()
    audit_scope()

if __name__ == '__main__':
    main()
