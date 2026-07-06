const fs=require('fs');
const path='F:/AI工作台/cnc_param_quickfinder';
const files=[
  'dashboard-launch-pads.json',
  'beginner-study-packs.json',
  'visual-topic-clusters.json',
  'alarm-diagnosis-flows.json',
  'quick-lookup-collections.json',
  'software-recommendation-zones.json',
  'image-gap-plan.json'
];
for(const file of files){
  const data=JSON.parse(fs.readFileSync(`${path}/${file}`,'utf8'));
  const arr=Array.isArray(data)?data:(Array.isArray(data.items)?data.items:(Array.isArray(data.pads)?data.pads:(Array.isArray(data.packs)?data.packs:(Array.isArray(data.clusters)?data.clusters:(Array.isArray(data.flows)?data.flows:(Array.isArray(data.collections)?data.collections:(Array.isArray(data.zones)?data.zones:(Array.isArray(data.entries)?data.entries:[]))))))));
  console.log(file+'\t'+arr.length+'\t'+Object.keys(data).slice(0,8).join(','));
  if(arr[0]) console.log('FIRST\t'+file+'\t'+Object.keys(arr[0]).join(','));
}
