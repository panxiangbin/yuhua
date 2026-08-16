from pathlib import Path


def replace_exact(path: str, old: str, new: str, expected: int = 1) -> None:
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    count = text.count(old)
    if count != expected:
        raise SystemExit(f'{path}: expected {expected} occurrences, found {count}: {old[:120]}')
    p.write_text(text.replace(old, new), encoding='utf-8')


# 数据健康：徽章重复风险按 trim 后的语义值比较，但不改写原始数据。
replace_exact(
    'cnc/data-health.html',
    "const duplicateBadges=Array.isArray(d.badges)&&d.badges.some((v,i,a)=>typeof v==='string'&&a.indexOf(v)!==i);",
    "const badgeRows=Array.isArray(d.badges)?d.badges.filter(v=>typeof v==='string'&&v.trim()).map(v=>v.trim()):[];const duplicateBadges=new Set(badgeRows).size!==badgeRows.length;",
)

# 备份恢复：与数据健康使用同一徽章语义，空白变体也必须阻断高风险 profile 自动恢复。
replace_exact(
    'cnc/data-backup.html',
    "if(Array.isArray(profile.badges)){const badgeRows=profile.badges.filter(v=>typeof v==='string'&&v.trim());if(new Set(badgeRows).size!==badgeRows.length)risks.push('发现重复徽章记录')}",
    "if(Array.isArray(profile.badges)){const badgeRows=profile.badges.filter(v=>typeof v==='string'&&v.trim()).map(v=>v.trim());if(new Set(badgeRows).size!==badgeRows.length)risks.push('发现重复徽章记录')}",
)

# 数据健康真实浏览器回归：用前后空白变体，而不是完全相同字符串，证明风险检测是语义级。
replace_exact(
    'cnc/tests/mobile-data-health-smoke.cjs',
    "badges:['连续训练3天','连续训练3天']",
    "badges:['连续训练3天',' 连续训练3天 ']",
)
replace_exact(
    'cnc/tests/mobile-data-health-smoke.cjs',
    "assert.deepEqual(fixed.profile.badges,['连续训练3天','连续训练3天'],'数据健康页不得自动删除重复徽章');",
    "assert.deepEqual(fixed.profile.badges,['连续训练3天',' 连续训练3天 '],'数据健康页不得自动删除空白变体重复徽章');",
)
replace_exact(
    'cnc/tests/mobile-data-health-smoke.cjs',
    "assert.deepEqual(rolled.profile.badges,['连续训练3天','连续训练3天']);",
    "assert.deepEqual(rolled.profile.badges,['连续训练3天',' 连续训练3天 ']);",
)
replace_exact(
    'cnc/tests/mobile-data-health-smoke.cjs',
    "rewardDuplicateRiskWarns:true,wrongCompatFields:true",
    "rewardDuplicateRiskWarns:true,rewardWhitespaceDuplicateWarns:true,wrongCompatFields:true",
)

# 备份恢复真实浏览器回归：空白变体徽章与重复训练日共同构成高风险 profile，健康课程完成项仍可恢复。
replace_exact(
    'cnc/tests/mobile-data-backup-history-migration-smoke.cjs',
    "badges:['连续训练3天','连续训练3天']",
    "badges:['连续训练3天',' 连续训练3天 ']",
)
replace_exact(
    'cnc/tests/mobile-data-backup-history-migration-smoke.cjs',
    "profileRewardDuplicateEntriesBlocked:true,healthyBackupItemsStillRestorable:true",
    "profileRewardDuplicateEntriesBlocked:true,profileRewardWhitespaceDuplicateEntriesBlocked:true,healthyBackupItemsStillRestorable:true",
)

print('reward whitespace duplicate guard patch applied')
