from pathlib import Path

path = Path('cnc/tools/apply-ai-teacher-completion-pwa24-v2.py')
text = path.read_text(encoding='utf-8')
old = 'pattern = re.compile(r"function completedCourses\\(study,profile,practice\\)\\{[^\\n]*?return completed;\\}")'
new = 'pattern = re.compile(r"function completedCourses\\(study,profile,practice\\)\\{.*?return completed;\\s*\\}", re.S)'
if old not in text:
    raise SystemExit('v2 regex source marker missing')
path.write_text(text.replace(old, new, 1), encoding='utf-8')
exec(compile(path.read_text(encoding='utf-8'), str(path), 'exec'), {'__name__': '__main__', '__file__': str(path)})
