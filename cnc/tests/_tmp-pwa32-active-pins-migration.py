from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[2]
info = json.loads((ROOT / 'cnc/build-info.json').read_text(encoding='utf-8'))
CURRENT_PWA = str(info['pwaBuild'])
CURRENT_CACHE = str(info['cacheRevision'])
OLD_CURRENT_PWA = '20260809-' + 'pwa31'
OLD_CURRENT_CACHE = '20260809-' + 'learning31'
OLD_PREVIOUS_PWA = '20260809-' + 'pwa30'
OLD_PREVIOUS_CACHE = '20260809-' + 'learning30'

if CURRENT_PWA != '20260810-' + 'pwa32' or CURRENT_CACHE != '20260810-' + 'learning32':
    raise SystemExit(f'当前构建不是预期PWA32：{CURRENT_PWA}/{CURRENT_CACHE}')

TARGETS = [
    'cnc/pwa-status.html',
    'cnc/pwa-self-test.html',
    'cnc/tests/mobile-pwa-offline-cache-smoke.cjs',
    'cnc/tests/mobile-pwa-profile-bfcache-smoke.cjs',
    'cnc/tests/mobile-pwa-upgrade-data-smoke.cjs',
    'cnc/tests/pages-ai-teacher-offline-core-deployment-smoke.cjs',
    'cnc/tests/pages-beginner-placement-offline-deployment-smoke.cjs',
    'cnc/tests/pages-training-camp-route-handoff-deployment-smoke.cjs',
]

G94_NOTE = '<p class="pwa-note" data-contract="g94-dual-semantic-boundary"><strong>G94车铣双语义适用范围：</strong>G94不是跨机型同一含义。部分铣床/加工中心控制器把它作为每分钟进给模式，需结合G93/G94/G95、当前公制/英制状态核对F的单位与含义；部分车床控制器则可能把G94作为端面/直线车削循环，X/Z或U/W、K/F等地址、起始位置、返回/退刀路径和模态行为没有跨系统统一保证。两类程序不能直接互抄；必须核对当前CNC与机床厂原厂手册、刀补和主轴状态，并确认刀具、刀柄、工件、夹具在完整计划运动空间内有安全间隙，教学示意不得直接作为真实机床参数。</p>'

changed = []
for rel in TARGETS:
    path = ROOT / rel
    text = path.read_text(encoding='utf-8')
    before = text
    text = text.replace(OLD_CURRENT_PWA, CURRENT_PWA)
    text = text.replace(OLD_CURRENT_CACHE, CURRENT_CACHE)

    # 只有升级/Pages部署测试需要把“上一正式版本”从PWA30推进到PWA31。
    if rel.endswith('mobile-pwa-upgrade-data-smoke.cjs') or rel.startswith('cnc/tests/pages-'):
        text = text.replace(OLD_PREVIOUS_PWA, OLD_CURRENT_PWA)
        text = text.replace(OLD_PREVIOUS_CACHE, OLD_CURRENT_CACHE)

    if rel in {'cnc/pwa-status.html', 'cnc/pwa-self-test.html'} and 'data-contract="g94-dual-semantic-boundary"' not in text:
        anchor = '</main>'
        if anchor not in text:
            raise SystemExit(f'{rel}: 缺少</main>锚点')
        text = text.replace(anchor, f'  {G94_NOTE}\n{anchor}', 1)

    if rel.endswith('mobile-pwa-offline-cache-smoke.cjs') and "stage = 'cold-offline-g94-directory';" not in text:
        anchor = "    stage = 'cold-offline-main-learning-content';"
        if anchor not in text:
            raise SystemExit('冷离线门禁缺少G94插入锚点')
        block = '''    stage = 'cold-offline-g94-directory';
    const offlineG94Trust = await page.evaluate(async () => {
      const response = await fetch('./gm-code-complete.js');
      return { ok: response.ok, text: await response.text() };
    });
    if (!offlineG94Trust.ok) throw new Error('G94可信目录首次安装后冷离线读取失败');
    for (const token of ['车铣差异', '部分铣床/加工中心', '部分车床', '当前CNC与机床厂原厂手册', 'G93/G94/G95', '公制/英制', 'F的单位', 'X/Z或U/W', 'K/F', '起始位置', '返回/退刀路径', '完整计划运动空间', '两类程序不能直接互抄']) {
      if (!offlineG94Trust.text.includes(token)) throw new Error(`G94冷离线源目录缺少双语义安全边界：${token}`);
    }
    for (const forbidden of ['铣床：G94（配合F）；车床示例：G94 X... Z... F...（系统相关）', 'G94 X30.0 Z-10.0 F0.2', 'G94就是每分钟进给', 'G94就是端面车削循环']) {
      if (offlineG94Trust.text.includes(forbidden)) throw new Error(`G94冷离线源目录仍含无适用范围或可直接照抄表述：${forbidden}`);
    }

'''
        text = text.replace(anchor, block + anchor, 1)

    if text == before:
        raise SystemExit(f'{rel}: 没有发生预期迁移')
    if CURRENT_PWA not in text:
        raise SystemExit(f'{rel}: 缺少当前PWA32构建针')
    for bypass in ['test.skip(', 'describe.skip(', 'it.skip(', 'process.exit(0)']:
        if bypass in text:
            raise SystemExit(f'{rel}: 出现门禁绕过模式 {bypass}')
    path.write_text(text, encoding='utf-8')
    changed.append(rel)

if set(changed) != set(TARGETS):
    raise SystemExit(f'迁移文件不完整：{changed}')
print('PWA32主动构建针受控迁移完成：')
for rel in changed:
    print('-', rel)
