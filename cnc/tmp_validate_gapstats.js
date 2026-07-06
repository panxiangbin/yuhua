const fs=require('fs');
const base='F:/AI工作台/cnc_param_quickfinder';
const data=JSON.parse(fs.readFileSync(base+'/image-gap-plan.json','utf8'));
const arr=Array.isArray(data)?data:(Object.values(data).find(v=>Array.isArray(v))||[]);
const byType={}; const byPriority={};
for(const item of arr){ byType[item.recommendedImageType]=(byType[item.recommendedImageType]||0)+1; byPriority[item.priority]=(byPriority[item.priority]||0)+1; }
console.log(JSON.stringify({count:arr.length, byType, byPriority}, null, 2));
