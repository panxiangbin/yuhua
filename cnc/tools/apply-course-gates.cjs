const fs = require('fs');

const practicePath = 'cnc/training-practice.js';
const mobilePath = 'cnc/tests/mobile-training-practice-smoke.cjs';
const advancedPath = 'cnc/tests/mobile-training-advanced-practice-smoke.cjs';
const docPath = 'cnc/docs/course-gate-specificity-audit.md';

const additions = `
{id:'safety-door-authorization',type:'judge',stage:'安全操作',title:'只要程序没有报警，新手就可以绕过防护门联锁继续加工。',options:['正确','错误'],answer:1,explain:'不得绕过防护门、急停或其他安全联锁。上机必须经过授权，并按企业制度和机床原厂手册确认防护装置有效。',risk:'高',system:'通用安全原则，联锁逻辑和授权流程以企业制度及机床原厂手册为准'},
{id:'machine-spindle-function',type:'single',stage:'机床结构',title:'加工中心主轴的主要作用是什么？',options:['夹持并带动刀具旋转','储存全部程序','测量工件尺寸','控制冷却液颜色'],answer:0,explain:'主轴用于安装刀柄或刀具，并按指令提供旋转运动。主轴接口、转速范围和换刀条件因机型而异。',risk:'低',system:'立式或卧式加工中心通用概念，接口与能力以机床铭牌和原厂手册为准'},
{id:'machine-tool-magazine-role',type:'single',stage:'机床结构',title:'加工中心刀库最主要的用途是什么？',options:['存放可供自动换刀的刀具组件','固定工件毛坯','建立工件坐标系','测量主轴跳动'],answer:0,explain:'刀库保存刀柄与刀具组件，并配合换刀机构完成自动换刀。刀位数量、重量和长度限制必须核对具体机床要求。',risk:'中',system:'配有自动换刀装置的加工中心，刀具限制以原厂手册为准'},
{id:'home-reference-purpose',type:'single',stage:'坐标与回零',title:'开机后执行参考点返回（回零）的主要目的是什么？',options:['建立机床坐标参考并确认各轴位置基准','自动测量全部刀具长度','自动完成工件找正','自动修复所有报警'],answer:0,explain:'参考点返回用于建立或确认机床坐标参考。执行前要检查运动通道，并按授权流程、现场条件和原厂手册操作。',risk:'高',system:'需要参考点返回的数控机床，顺序和动作方向以原厂手册及现场制度为准'},
{id:'drawing-datum-reading',type:'single',stage:'图纸基础',title:'阅读零件图时，尺寸基准主要用来说明什么？',options:['尺寸从哪个基准要素出发确定','刀库有多少刀位','主轴采用什么颜色','程序必须使用哪个编号'],answer:0,explain:'尺寸基准是确定尺寸位置与相互关系的起点。编程和检测前应先识别设计、工艺与测量基准是否一致。',risk:'低',system:'机械零件图通用原则，具体标注按采用的制图标准和图纸技术要求解释'},
{id:'drawing-tolerance-meaning',type:'single',stage:'图纸基础',title:'图纸尺寸标注为20±0.02 mm，正确理解是什么？',options:['允许尺寸在19.98至20.02 mm范围内','尺寸必须正好20.02 mm','尺寸可以任意变化','只要外观相似即可'],answer:0,explain:'对称公差20±0.02表示尺寸上下极限为19.98 mm和20.02 mm。还要结合测量方法、温度和图纸其他要求判断。',risk:'中',system:'采用毫米和对称尺寸公差的图纸，最终判定以图纸、检验规范和量具能力为准'},
{id:'g54-independent-check',type:'single',stage:'工件坐标',title:'写入G54后，首件运行前最可靠的做法是什么？',options:['独立复核零点、刀具与安全高度，再受控验证','只看屏幕数值位数是否整齐','直接把快速倍率调到100%','删除所有其他坐标系'],answer:0,explain:'工件坐标值写入后应由独立方法复核，并结合刀长、装夹高度进行空运行、单段或低倍率验证。',risk:'高',system:'工件坐标设定通用原则，测量方式与验证步骤以机床原厂手册、现场工艺和企业制度为准'},
{id:'workholding-location-first',type:'single',stage:'装夹基础',title:'虎钳装夹前，最先应重点确认什么？',options:['定位面、支撑面清洁且贴合','把夹紧力直接调到最大','先启动主轴再放工件','只确认工件颜色'],answer:0,explain:'切屑、毛刺或脏污会破坏定位与贴合。装夹前应清洁定位面和支撑面，再按工艺要求定位夹紧。',risk:'高',system:'常见虎钳和夹具装夹，定位方案、夹紧力与支撑方式以现场工艺和夹具说明为准'},
{id:'workholding-support-check',type:'judge',stage:'装夹基础',title:'薄壁或悬伸工件只要夹得很紧，就不需要检查变形和支撑。',options:['正确','错误'],answer:1,explain:'过大夹紧力可能使薄壁件变形，悬伸部位还可能振动。必须按现场工艺检查定位、支撑、夹紧力和刀具通道。',risk:'高',system:'薄壁、长悬伸或刚性不足工件，装夹方案必须经现场工艺确认和受控验证'},
{id:'tool-holder-match',type:'single',stage:'刀具基础',title:'安装刀具前，刀柄与主轴接口最重要的要求是什么？',options:['接口规格、拉钉和夹持方式匹配','刀柄颜色与机床一致','刀具越长越好','只要能够勉强装入即可'],answer:0,explain:'刀柄锥度、拉钉规格、夹持组件和允许转速必须与主轴及机床要求一致，禁止混用不匹配组件。',risk:'高',system:'加工中心刀柄系统，接口、拉钉和允许转速必须核对机床及刀柄原厂手册'},
{id:'tool-overhang-risk',type:'single',stage:'刀具基础',title:'在能够避让工件和夹具的前提下，刀具伸出量通常应怎样选择？',options:['尽量短并满足加工可达性','越长越能提高刚性','与刀具直径无关，随意选择','始终伸出刀柄长度的两倍'],answer:0,explain:'过长伸出会降低刚性并增加振动、偏摆和折断风险。应按加工深度、避让和刀具厂家建议选择最短可用伸出。',risk:'高',system:'旋转刀具通用原则，具体伸出、转速和夹持长度以刀具刀柄原厂资料及现场工艺为准'},
{id:'tool-length-h-register',type:'single',stage:'刀长补偿',title:'程序调用G43 H05时，最需要确认哪项对应关系？',options:['当前刀具与H05中的刀长数据正确对应','H05等于主轴转速500','H05代表第五个工件坐标系','H05会自动测量刀具直径'],answer:0,explain:'H地址通常选择刀长补偿寄存器，必须确认当前刀具号与对应H号及测量数据一致，避免错误补偿造成碰撞。',risk:'高',system:'常见FANUC风格刀长补偿，H号规则、正负方向和调用方式必须核对原厂手册及现场刀具表'},
{id:'tool-length-safe-approach',type:'judge',stage:'刀长补偿',title:'刀长补偿刚写入后，可以直接快速移动到工件深处验证。',options:['正确','错误'],answer:1,explain:'新刀长数据应在安全位置独立复核，再用单段、低倍率或空运行观察补偿方向和安全高度，禁止直接深入工件。',risk:'高',system:'刀长补偿验证通用原则，安全位置和验证动作以机床原厂手册、现场条件及企业制度为准'},
{id:'arc-plane-selection',type:'single',stage:'圆弧插补',title:'在常见FANUC风格程序中，XY平面圆弧通常先确认哪个平面指令？',options:['G17','G18','G19','G80'],answer:0,explain:'G17通常选择XY加工平面，G18和G19对应其他平面。圆弧方向必须结合当前平面和观察方向判断。',risk:'高',system:'常见FANUC风格系统，平面选择、圆弧方向和默认模态必须核对原厂手册'},
{id:'arc-center-command',type:'single',stage:'圆弧插补',title:'用I、J编写XY平面圆弧时，通常应怎样理解I、J？',options:['从圆弧起点到圆心的增量分量','圆弧终点的绝对坐标','主轴转速和进给速度','刀具长度与半径编号'],answer:0,explain:'在许多FANUC风格系统中，I、J表示从圆弧起点到圆心的增量分量，但也必须确认系统设置和编程规则。',risk:'高',system:'常见FANUC风格XY平面圆弧，I/J模式、整圆写法和方向以原厂手册及后处理规则为准'},
{id:'canned-cycle-r-plane',type:'single',stage:'孔加工循环',title:'固定循环中的R平面通常表示什么？',options:['循环接近或退回的参考平面','刀具半径补偿值','主轴最高转速','工件坐标系编号'],answer:0,explain:'R平面常用于定义孔循环的接近或退回参考位置。设置前要确认工件表面、夹具高度和快速移动通道。',risk:'高',system:'常见FANUC风格固定循环，R值含义、绝对增量方式和退回动作以原厂手册为准'},
{id:'canned-cycle-g80-cancel',type:'judge',stage:'孔加工循环',title:'孔加工固定循环结束后，通常应确认已用G80取消循环模态。',options:['正确','错误'],answer:0,explain:'固定循环可能保持模态；若未按程序逻辑取消，后续坐标块可能再次执行钻孔动作。应核对G80位置并受控验证。',risk:'高',system:'常见FANUC风格固定循环，取消方式和模态范围以原厂手册及具体程序结构为准'},`;

const mapping = "var LESSON_REQUIREMENTS={1:['safe-stop-first','safety-door-authorization'],2:['machine-spindle-function','machine-tool-magazine-role'],3:['axis-z-direction','home-reference-purpose'],4:['drawing-datum-reading','drawing-tolerance-meaning'],5:['work-offset','g54-independent-check'],6:['workholding-location-first','workholding-support-check'],7:['tool-holder-match','tool-overhang-risk'],8:['tool-length-h-register','tool-length-safe-approach'],9:['g00-cutting','find-error-g00'],10:['arc-plane-selection','arc-center-command'],11:['canned-cycle-r-plane','canned-cycle-g80-cancel'],12:['order-first-run','dry-run']};";

function replaceExact(text, oldValue, newValue, label) {
  if (text.includes(newValue)) return text;
  if (!text.includes(oldValue)) throw new Error(`无法定位${label}，拒绝静默修改`);
  return text.replace(oldValue, newValue);
}

let practice = fs.readFileSync(practicePath, 'utf8');
practice = practice.replace(/var BUILD='[^']+';/, "var BUILD='20260806b';");
if (!practice.includes("id:'machine-spindle-function'")) {
  const anchor = "\n{id:'g00-cutting'";
  if (!practice.includes(anchor)) throw new Error('无法定位题库插入点');
  practice = practice.replace(anchor, additions + anchor);
}
practice = replaceExact(
  practice,
  "explain:'G00用于快速定位，轨迹通常不保证为直线，也不应承担正常切削进给。接近工件时必须考虑多轴快移碰撞风险。',risk:'高',system:'FANUC风格通用'",
  "explain:'G00用于快速定位，实际合成轨迹可能因系统而异，不应承担正常切削进给。接近工件前必须核对原厂手册、现场安全平面和多轴快移碰撞风险。',risk:'高',system:'常见FANUC风格系统，G00轨迹特性和倍率行为以原厂手册为准'",
  'G00安全边界'
);
practice = practice.replace(/var LESSON_REQUIREMENTS=\{[^\n]+\};/, mapping);
practice = practice.replace('QUESTIONS.length>=9', 'QUESTIONS.length>=24');
fs.writeFileSync(practicePath, practice);

for (const testPath of [mobilePath, advancedPath]) {
  let text = fs.readFileSync(testPath, 'utf8');
  text = text.replace('assert.equal(api.questions, 9);', 'assert.equal(api.questions, 26);');
  if (!text.includes('assert.equal(api.questions, 26);')) throw new Error(`${testPath}题量契约未同步`);
  fs.writeFileSync(testPath, text);
}

const doc = `# 固定12关专属闯关题审计

## 本轮交付

固定12关现已配置24道互不重复的专属门禁题，每关恰好2道；基础加练另保留2道，总题量26道。课程名称、顺序和80分通关门槛均未改变。

## 课程覆盖

1. 安全操作：异常运动处置、防护门联锁与授权；
2. 认识机床：主轴、刀库与自动换刀职责；
3. 坐标与回零：Z轴方向、参考点返回；
4. 看懂图纸：尺寸基准、公差上下限；
5. 工件坐标：G54作用、零点独立复核；
6. 装夹基础：定位面清洁、薄壁件支撑与夹紧；
7. 刀具基础：刀柄接口匹配、刀具伸出风险；
8. 刀长补偿：H号对应、安全位置验证；
9. G00/G01：快速定位用途、危险下刀行识别；
10. G02/G03：加工平面、I/J圆心增量；
11. 孔加工循环：R平面、G80取消模态；
12. 完整程序与首件：核对、仿真/空运行、单段/低倍率和放行顺序。

## 稳定交付标准

- 固定12关完整且每关不少于2道题；
- 至少24道不同门禁题，任何题不得跨关复用；
- 每题必须对应本关核心主题，带中文解析和适用范围；
- 高风险题必须明确原厂手册、企业制度、现场条件、授权或受控验证边界；
- 80分门槛保持不变。每关2题时，答对1题仅50分，两题都正确才可通关；
- 不允许删除测试、减少题量、降低断言或伪造完成记录。

## 适用范围与安全边界

题目只讲通用学习原则。不同系统、机型、参数号、报警含义、刀补方式和现场步骤可能不同，必须核对机床原厂手册、企业安全制度、现场工艺和上机授权；涉及运动、装夹、对刀、试切和首件放行时，应先进行仿真、空运行、单段或低倍率等受控验证。
`;
fs.writeFileSync(docPath, doc);

console.log('固定12关专属题生成完成：24道门禁题，2道基础加练，总计26道。');
