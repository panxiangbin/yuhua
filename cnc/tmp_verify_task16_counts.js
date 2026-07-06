const fs=require('fs');
const base='F:/AI工作台/cnc_param_quickfinder';
for(const file of ['visual-topic-clusters.json','image-gap-plan.json']){
 const data=JSON.parse(fs.readFileSync(base+'/'+file,'utf8'));
 const arr=Array.isArray(data)?data:(Object.values(data).find(v=>Array.isArray(v))||[]);
 if(file==='visual-topic-clusters.json'){
   console.log(JSON.stringify({file,count:arr.length,firstKeys:Object.keys(arr[0]||{})},null,2));
 } else {
   const byType={}; const byPriority={};
   for(const item of arr){ byType[item.recommendedImageType]=(byType[item.recommendedImageType]||0)+1; byPriority[item.priority]=(byPriority[item.priority]||0)+1; }
   console.log(JSON.stringify({file,count:arr.length,types:Object.keys(byType).length,byType,byPriority},null,2));
 }
}
