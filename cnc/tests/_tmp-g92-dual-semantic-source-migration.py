from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
GM = ROOT / "cnc" / "gm-code-complete.js"
text = GM.read_text(encoding="utf-8-sig")

start_marker = '  {\n    "id": "kb-gcode-g92",'
next_marker = '  {\n    "id": "kb-gcode-g93",'
start = text.find(start_marker)
end = text.find(next_marker, start + 1)
if start < 0 or end < 0:
    raise SystemExit("无法唯一定位 G92/G93 条目边界")
if text.find(start_marker, start + 1) >= 0:
    raise SystemExit("检测到多个 G92 条目，拒绝迁移")

current = text[start:end]
target = '''  {\n    "id": "kb-gcode-g92",\n    "category": "G代码",\n    "title": "G92 坐标偏移/车床螺纹循环",\n    "code": "G92",\n    "aliases": [\n      "坐标偏移",\n      "坐标设定",\n      "Thread cycle",\n      "G92"\n    ],\n    "summary": "G92不是跨机型同一含义：在部分铣床/加工中心控制器中用于工作坐标系偏移或坐标设定相关功能；在部分车床控制器中则是螺纹车削循环。具体语义、模态状态和地址格式必须按当前CNC与机床厂原厂手册确认。",\n    "usage": "只有先确认当前机型、控制器和G92组别后再使用。铣削坐标类用法需核对当前工件坐标系、已有G52/G54-G59等偏移以及设定/清除规则；车床螺纹循环需核对起始位置、X/Z或U/W、I/Q/F等地址解释、主轴与进给同步、退刀或倒角设置及完整运动空间。",\n    "beginner": "看到G92先问：这是哪台机床、哪种控制器，当前是铣削坐标功能还是车床螺纹循环？两类程序不能直接互抄。",\n    "warning": "G92在不同CNC上可能改变后续坐标解释，也可能直接进入螺纹切削循环；组别、模态性、清除方式和地址含义并不统一。上机前必须核对当前CNC和机床厂原厂手册，确认坐标偏移、刀补与现有G52/G54-G59状态，或确认螺纹参数、起始位置、主轴同步和安全退刀空间；先在仿真、图形检查或受控单段条件下验证，教学示例不得直接作为真实机床参数。",\n    "example": "教学格式示意：部分车床系统中G92 X... Z... F...可表示简单螺纹循环；部分铣床/加工中心系统中G92 X...则用于坐标偏移或设定相关功能。两者语义不同，X/Z/U/W/I/Q/F、模态状态和清除方式必须逐项以本机原厂手册为准。",\n    "risk": "高",\n    "tags": [\n      "G92",\n      "车铣差异",\n      "坐标偏移",\n      "螺纹循环",\n      "原厂手册",\n      "主轴同步"\n    ]\n  },\n'''

old_tokens = [
    '加工中心/旧系统可用于坐标设定，车床常用于简单螺纹循环。',
    '车床：G92 X20. Z-30. F1.5 表示螺纹循环。',
]
if current == target:
    print("G92基础源已经处于目标安全状态，无需修改")
elif all(token in current for token in old_tokens):
    text = text[:start] + target + text[end:]
    GM.write_text(text, encoding="utf-8")
    print("已将G92基础源迁移为车铣双语义安全边界")
else:
    raise SystemExit("G92基础源既不是已知旧状态也不是目标状态，拒绝覆盖未知改动")

check = GM.read_text(encoding="utf-8")
required = ["车铣差异", "当前CNC和机床厂原厂手册", "G52/G54-G59", "X/Z或U/W", "I/Q/F", "主轴同步", "安全退刀空间", "两类程序不能直接互抄"]
for token in required:
    if token not in check:
        raise SystemExit(f"迁移后缺少G92安全边界：{token}")
for token in old_tokens:
    if token in check:
        raise SystemExit(f"迁移后仍残留G92旧表述：{token}")
