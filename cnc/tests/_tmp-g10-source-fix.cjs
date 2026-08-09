const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, '../gm-code-complete.js');
let text = fs.readFileSync(file, 'utf8');
const oldBlock = `    "summary": "用程序写入工件坐标、刀补、参数等数据。",
    "usage": "批量设置G54、刀具补偿、夹具偏置时使用。",
    "beginner": "G10很强，也很危险，因为它会改机床数据。",
    "warning": "写错坐标系或刀补号会让后续程序整体偏移，必须备份原数据。",
    "example": "G10 L2 P1 X100. Y50. 表示写入G54坐标偏置。",
    "risk": "高",
    "tags": [
      "G10",
      "坐标写入",
      "刀补",
      "参数"
    ]`;
const newBlock = `    "summary": "G10可在程序中写入工件坐标、刀具补偿或其它受当前控制器支持的数据；可写对象与格式取决于CNC系统和机床厂配置。",
    "usage": "仅在已经确认本机支持的G10格式、目标数据区、写入方式与权限后，用于受控设置或批量初始化。",
    "beginner": "把G10理解成会改机床数据的写入指令。先确认写什么、写到哪里、当前是绝对还是增量解释，再考虑是否允许执行。",
    "warning": "L/P/轴地址、可写对象、G90/G91下的绝对或增量解释以及写入权限会因控制系统和机床厂配置不同而变化。执行前必须核对当前CNC/机床厂原厂手册和现场工艺，备份原数据，并由授权人员确认；教学示例不能直接拿到真实机床执行。",
    "example": "教学示例：在部分明确支持该格式的控制系统中，G10 L2 P1 ... 可用于工件坐标相关数据写入；L2、P1、轴地址以及G90/G91下的解释必须逐项以本机原厂手册为准。未确认前不要上机执行。",
    "risk": "高",
    "tags": [
      "G10",
      "可编程数据输入",
      "坐标写入",
      "刀补",
      "原厂手册",
      "授权操作"
    ]`;

const g10Ids = (text.match(/"id": "kb-gcode-g10"/g) || []).length;
if (g10Ids !== 1) {
  throw new Error(`G10源目录条目数量异常：${g10Ids}，拒绝自动修改。`);
}

if (text.includes(newBlock)) {
  console.log('G10源目录已经是安全版本，无需再次修改。');
  process.exit(0);
}
const oldOccurrences = text.split(oldBlock).length - 1;
if (oldOccurrences !== 1) {
  throw new Error(`预期旧G10块出现次数应为1，实际为${oldOccurrences}，拒绝模糊替换。`);
}
text = text.replace(oldBlock, newBlock);
if (text.includes('G10 L2 P1 X100. Y50. 表示写入G54坐标偏置。')) {
  throw new Error('旧的无适用范围G10示例仍然存在。');
}
fs.writeFileSync(file, text, 'utf8');
console.log('已直接修正gm-code-complete.js中的唯一G10源目录。');
