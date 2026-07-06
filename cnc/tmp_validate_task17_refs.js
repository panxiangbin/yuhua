const fs=require('fs');
const base='F:/AI工作台/cnc_param_quickfinder';
const master=JSON.parse(fs.readFileSync(base+'/knowledge-index-master.json','utf8'));
const entries=master.entries||master.items||master;
const idSet=new Set(entries.map(x=>x.id));
const flows=JSON.parse(fs.readFileSync(base+'/alarm-diagnosis-flows.json','utf8')); const flowArr=Array.isArray(flows)?flows:(Object.values(flows).find(v=>Array.isArray(v))||[]); const flowSet=new Set(flowArr.map(x=>x.id));
const lookups=JSON.parse(fs.readFileSync(base+'/quick-lookup-collections.json','utf8')); const lookupArr=Array.isArray(lookups)?lookups:(Object.values(lookups).find(v=>Array.isArray(v))||[]); const lookupSet=new Set(lookupArr.map(x=>x.id));
const files=['entry-teaching-cards.json','scenario-playbooks.json','calculator-recipes.json','alarm-action-cards.json','machine-panel-guides.json','tooling-decision-cards.json','entry-priority-index.json'];
function arrOf(data){return Array.isArray(data)?data:(Object.values(data).find(v=>Array.isArray(v))||[])}
for(const file of files){
 const data=JSON.parse(fs.readFileSync(base+'/'+file,'utf8')); const arr=arrOf(data); let missing=[];
 for(const item of arr){
   for(const field of ['relatedEntryIds','nextLearningIds','recommendedEntryIds']) if(Array.isArray(item[field])) for(const id of item[field]) if(!idSet.has(id)) missing.push(field+':'+id);
   if(Array.isArray(item.relatedFlowIds)) for(const id of item.relatedFlowIds) if(!flowSet.has(id)) missing.push('relatedFlowIds:'+id);
   if(typeof item.relatedFlowId==='string' && !flowSet.has(item.relatedFlowId)) missing.push('relatedFlowId:'+item.relatedFlowId);
   if(Array.isArray(item.recommendedLookupIds)) for(const id of item.recommendedLookupIds) if(!lookupSet.has(id)) missing.push('recommendedLookupIds:'+id);
 }
 console.log(file+'\tmissingRefs='+missing.length+(missing[0]?('\tfirst='+missing[0]):''));
}
