const fs=require('fs');
const base='F:/AI工作台/cnc_param_quickfinder';
const cards=JSON.parse(fs.readFileSync(base+'/entry-teaching-cards.json','utf8'));
const arr=Array.isArray(cards)?cards:(Object.values(cards).find(v=>Array.isArray(v))||[]);
const buckets={};
for(const item of arr){ const key=[item.beginnerSummary,item.whyItMatters,item.whenToUse,item.commonMistake,item.quickCheck].join('||'); buckets[key]=(buckets[key]||0)+1; }
const dup=Object.entries(buckets).sort((a,b)=>b[1]-a[1]).slice(0,10);
console.log(JSON.stringify({count:arr.length, topDuplicateBundles:dup}, null, 2));
