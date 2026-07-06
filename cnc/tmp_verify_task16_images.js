const fs=require('fs');
const path=require('path');
const base='F:/AI工作台/cnc_param_quickfinder';
const files=['dashboard-launch-pads.json','visual-topic-clusters.json'];
function getArray(data){return Array.isArray(data)?data:(Object.values(data).find(v=>Array.isArray(v))||[])}
for(const file of files){
 const data=JSON.parse(fs.readFileSync(base+'/'+file,'utf8'));
 const arr=getArray(data);
 let total=0, missing=[];
 for(const item of arr){
   for(const field of ['imageHint','coverImage']){
     if(typeof item[field]==='string' && item[field]){
       total++;
       const rel=item[field].replace(/^\.\//,'');
       const p=path.join(base, rel);
       if(!fs.existsSync(p)) missing.push({id:item.id,field,rel});
     }
   }
 }
 console.log(JSON.stringify({file,total,missingCount:missing.length,missing},null,2));
}
