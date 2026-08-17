from pathlib import Path

src = Path(__file__).with_name('apply_practice_score_integrity_fix.py')
code = src.read_text(encoding='utf-8')
old = "\"addCheck('错题结构',wrongShape?'warn':'ok',wrongShape?`${wrongShape}个对象型错题兼容字段可转换为数组；wrongQuestions / wrongItems / wrong 会分别保留，不会互相覆盖`:'错题字段结构正常');addCheck('模拟记录结构'\""
new = "\"addCheck('错题结构',wrongShape?'warn':'ok',wrongShape?`发现${wrongShape}个对象型错题兼容字段，可分别规范为数组`:'wrongQuestions / wrongItems / wrong 错题结构均可读取');addCheck('模拟记录结构'\""
if code.count(old) != 1:
    raise SystemExit(f'旧生成器错题检查锚点数量异常：{code.count(old)}')
code = code.replace(old, new, 1)
exec(compile(code, str(src), 'exec'), {'__file__': str(src), '__name__': '__main__'})
