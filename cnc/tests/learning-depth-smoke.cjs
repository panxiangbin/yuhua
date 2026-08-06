'use strict';
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const ROOT=path.resolve(__dirname,'..','..');
const catalogSource=fs.readFileSync(path.join(ROOT,'cnc','learning-sublesson-catalog.js'),'utf8');
const sandbox={window:{}};
vm.runInNewContext(catalogSource,sandbox,{timeout:3000});
const catalog=sandbox.window.CNC_LEARNING_SUBLESSONS;
function expect(value,message){if(!value)throw new Error(message)}
expect(catalog&&catalog.version==='20260805-learning-depth1','学习深度版本错误');
expect(catalog.courses.length===12,'固定12关数量错误');
expect(Object.keys(catalog.stages).length===12,'小课阶段数量错误');
const counts=Object.fromEntries(Object.entries(catalog.stages).map(([key,value])=>[key,value.length]));
expect(counts['1']===10&&counts['2']===10,'第1/2关必须各10课');
for(let stage=3;stage<=12;stage+=1)expect(counts[String(stage)]>=6,`第${stage}关不足6课`);
const items=Object.values(catalog.stages).flat();
expect(items.length===80,`小课总数必须为80，实际${items.length}`);
expect(new Set(items.map(item=>item.id)).size===80,'小课ID重复');
for(const item of items){
  expect(item.image.startsWith('./assets/images/'),`${item.id}图片路径错误`);
  expect(fs.existsSync(path.join(ROOT,'cnc',item.image.slice(2))),`${item.id}图片不存在`);
  expect(item.alt&&item.alt.includes('演示图'),`${item.id}替代文字不足`);
  expect(item.actions.length>=3&&item.errors.length>=3,`${item.id}动作或错误不足`);
  expect(item.safety.includes('机床说明书')&&item.safety.includes('空运行验证'),`${item.id}安全边界不足`);
  expect(fs.existsSync(path.join(ROOT,'cnc',item.courseFile)),`${item.id}完整课程不存在`);
}
const home=fs.readFileSync(path.join(ROOT,'cnc','personal-home.js'),'utf8');
const detail=fs.readFileSync(path.join(ROOT,'cnc','learning-detail.html'),'utf8');
expect(home.includes('renderLearningDepth'),'学习页缺少小课渲染');
expect(home.includes('sublessonLinks'),'学习页缺少小课检查指标');
expect(detail.includes('id="actions"')&&detail.includes('id="errors"'),'详情页缺少动作或错误区');
expect(!/[A-Za-z]:\\/.test(catalogSource+home+detail),'上线文件不得引用本地盘符');
console.log(`CNC学习深度静态验收通过：12关、80小课、80个有效图片引用和统一安全边界。`);
