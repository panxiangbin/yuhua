const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const cncRoot = path.join(root, 'cnc');
const resultDir = path.join(root, 'cnc', 'test-results');
const resultPath = path.join(resultDir, 'course-visible-placeholder-audit.json');
const errorPath = path.join(resultDir, 'course-visible-placeholder-audit-error.txt');

fs.mkdirSync(resultDir, { recursive: true });

const patterns = [
  { id: 'image-animation-slot', label: '图片或动画开发占位标题', regex: /图片\s*[\/／]\s*动画位/giu },
  { id: 'suggest-add-later', label: '建议后续加入或补充', regex: /建议后续(?:加入|补充)/gu },
  { id: 'content-waiting', label: '正式内容待制作或待完善', regex: /(?:图片|动画|内容)(?:仍)?(?:待|需)(?:补充|制作|完善)/gu },
  { id: 'development-marker', label: '开发阶段标记', regex: /(?:TODO|FIXME|TBD|COMING\s+SOON|页面开发中|功能开发中|课程开发中|页面建设中)/giu }
];

function preserveNewlines(match) {
  return match.replace(/[^\n]/g, ' ');
}

function visibleSource(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, preserveNewlines)
    .replace(/<script\b[\s\S]*?<\/script>/gi, preserveNewlines)
    .replace(/<style\b[\s\S]*?<\/style>/gi, preserveNewlines);
}

function lineNumberAt(text, index) {
  return text.slice(0, index).split('\n').length;
}

function lineExcerpt(source, lineNumber) {
  return String(source.split('\n')[lineNumber - 1] || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 220);
}

const courseFiles = fs.readdirSync(cncRoot, { withFileTypes: true })
  .filter(entry => entry.isFile() && /^course-.*\.html$/i.test(entry.name))
  .map(entry => entry.name)
  .sort((a, b) => a.localeCompare(b, 'zh-CN'));

const diagnostics = {
  checkedAt: new Date().toISOString(),
  scope: 'cnc/course-*.html',
  scannedFileCount: courseFiles.length,
  scannedFiles: courseFiles,
  patternIds: patterns.map(pattern => pattern.id),
  findings: [],
  passed: false
};

for (const file of courseFiles) {
  const absolutePath = path.join(cncRoot, file);
  const source = fs.readFileSync(absolutePath, 'utf8');
  const visible = visibleSource(source);

  for (const pattern of patterns) {
    pattern.regex.lastIndex = 0;
    for (const match of visible.matchAll(pattern.regex)) {
      const line = lineNumberAt(visible, match.index || 0);
      diagnostics.findings.push({
        file: `cnc/${file}`,
        line,
        rule: pattern.id,
        label: pattern.label,
        match: match[0],
        excerpt: lineExcerpt(source, line)
      });
    }
  }
}

const errors = [];
if (courseFiles.length < 12) {
  errors.push(`主线及兼容课程文件数量异常：仅扫描到 ${courseFiles.length} 个 cnc/course-*.html`);
}
if (diagnostics.findings.length > 0) {
  errors.push(`正式课程页仍存在 ${diagnostics.findings.length} 处面向开发阶段的可见占位文案`);
}

diagnostics.errors = errors;
diagnostics.passed = errors.length === 0;
fs.writeFileSync(resultPath, `${JSON.stringify(diagnostics, null, 2)}\n`, 'utf8');

if (!diagnostics.passed) {
  const detail = diagnostics.findings
    .map(item => `${item.file}:${item.line} [${item.rule}] ${item.excerpt || item.match}`)
    .join('\n');
  fs.writeFileSync(errorPath, `${errors.join('\n')}${detail ? `\n\n${detail}` : ''}\n`, 'utf8');
  console.error(errors.join('\n'));
  if (detail) console.error(detail);
  process.exitCode = 1;
} else {
  fs.rmSync(errorPath, { force: true });
  console.log(`课程可见占位审计通过：扫描 ${courseFiles.length} 个正式课程页，未发现开发阶段占位文案`);
}
