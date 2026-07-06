const fs=require('fs');
const path=require('path');
const base='F:/AI工作台/cnc_param_quickfinder';
const files=['dashboard-launch-pads.json','visual-topic-clusters.json'];
function getArray(data){return Array.isArray(data)?data:(Object.values(data).find(v=>Array.isArray(v))||[])}
for(const file of files){
 const data=JSON.parse(fs.readFileSync(base+'/'+file,'utf8'));
 const arr=getArray(data);
 let total=0, missing=0;
 for(const item of arr){
   for(const field of ['imageHint','coverImage']){
     if(typeof item[field]==='string' && item[field]){
       total++;
       const p=path.join(base, item[field].replace(/^\.\//,''));
       if(!fs.existsSync(p)) missing++;
     }
   }
 }
 console.log(file+'\timagePaths='+total+'\tmissing='+missing);
}
