const fs=require('fs');
const base='F:/AI工作台/cnc_param_quickfinder';
const cards=JSON.parse(fs.readFileSync(base+'/entry-teaching-cards.json','utf8'));
const arr=Array.isArray(cards)?cards:(Object.values(cards).find(v=>Array.isArray(v))||[]);
const sampleIds=['kb-00003','kb-00009','kb-00315','kb-00424','kb-01000'];
for(const id of sampleIds){ const item=arr.find(x=>x.id===id); console.log('ID='+id); console.log(JSON.stringify(item, null, 2)); }
