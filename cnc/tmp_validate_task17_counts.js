const fs=require('fs');
const base='F:/AI工作台/cnc_param_quickfinder';
const files=['entry-teaching-cards.json','scenario-playbooks.json','calculator-recipes.json','alarm-action-cards.json','machine-panel-guides.json','tooling-decision-cards.json','entry-priority-index.json'];
function arrOf(data){return Array.isArray(data)?data:(Object.values(data).find(v=>Array.isArray(v))||[])}
for(const file of files){ const data=JSON.parse(fs.readFileSync(base+'/'+file,'utf8')); const arr=arrOf(data); console.log(file+'\t'+arr.length+'\t'+Object.keys(arr[0]||{}).join(',')); }
