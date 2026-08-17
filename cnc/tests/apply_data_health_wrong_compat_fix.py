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

replace_once(
    'cnc/data-health.html',
    "function stageLevel(v){if(typeof v==='number'&&Number.isInteger(v)&&v>=1&&v<=12)return v;if(typeof v==='string'){const m=v.match(/^(\\d{1,2})$/i),n=Number(m&&m[1]);if(Number.isInteger(n)&&n>=1&&n<=12)return n}return null}",
    "function stageLevel(v){if(typeof v==='number'&&Number.isInteger(v)&&v>=1&&v<=12)return v;if(typeof v==='string'){const m=v.match(/^stage-(\\d{1,2})$/i),n=Number(m&&m[1]);if(Number.isInteger(n)&&n>=1&&n<=12)return n}return null}"
)
