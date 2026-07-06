const fs=require('fs');
const path='F:/AI工作台/cnc_param_quickfinder';
const specs={
'dashboard-launch-pads.json':['id','title','subtitle','description','type','priority','entryIds','imageHint','recommendedView'],
'beginner-study-packs.json':['id','title','summary','difficulty','estimatedMinutes','entryIds','mustLearnIds','relatedImageIds','nextPackIds'],
'visual-topic-clusters.json':['id','title','coverImage','clusterType','entryIds','imageDriven','description','keywords'],
'alarm-diagnosis-flows.json':['id','title','system','alarmCodes','symptomKeywords','initialChecks','stepFlow','relatedEntryIds','dangerLevel'],
'quick-lookup-collections.json':['id','title','lookupType','items','entryIds','searchTerms'],
'software-recommendation-zones.json':['id','title','zoneType','logicDescription','seedEntryIds','fallbackEntryIds'],
'image-gap-plan.json':['knowledgeId','title','category','whyNeedImage','recommendedImageType','priority','suggestedKeywords']
};
for(const [file,required] of Object.entries(specs)){
 const data=JSON.parse(fs.readFileSync(`${path}/${file}`,'utf8'));
 const arr=Array.isArray(data)?data:(Object.values(data).find(v=>Array.isArray(v))||[]);
 let missing=0;
 for(const item of arr){ for(const key of required){ if(!(key in item)) { missing++; break; } } }
 console.log(`${file}\tcount=${arr.length}\tmissingRows=${missing}`);
}
