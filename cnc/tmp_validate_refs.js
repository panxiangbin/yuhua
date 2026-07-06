const fs=require('fs');
const base='F:/AI工作台/cnc_param_quickfinder';
const master=JSON.parse(fs.readFileSync(base+'/knowledge-index-master.json','utf8'));
const entries=master.entries||master.items||master;
const idSet=new Set(entries.map(x=>x.id));
const files=[
  'dashboard-launch-pads.json',
  'beginner-study-packs.json',
  'visual-topic-clusters.json',
  'alarm-diagnosis-flows.json',
  'quick-lookup-collections.json',
  'software-recommendation-zones.json',
  'image-gap-plan.json'
];
function getArray(data){return Array.isArray(data)?data:(Object.values(data).find(v=>Array.isArray(v))||[])}
const idFields=['entryIds','mustLearnIds','relatedEntryIds','seedEntryIds','fallbackEntryIds'];
for(const file of files){
 const data=JSON.parse(fs.readFileSync(base+'/'+file,'utf8'));
 const arr=getArray(data);
 let missing=[];
 for(const item of arr){
  for(const field of idFields){
   if(Array.isArray(item[field])){
    for(const id of item[field]) if(!idSet.has(id)) missing.push(`${field}:${id}`);
   }
  }
  if(typeof item.knowledgeId==='string' && !idSet.has(item.knowledgeId)) missing.push(`knowledgeId:${item.knowledgeId}`);
 }
 console.log(file+'\tmissingRefs='+missing.length+(missing[0]?('\tfirst='+missing[0]):''));
}
