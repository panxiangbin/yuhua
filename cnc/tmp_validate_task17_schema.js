const fs=require('fs');
const base='F:/AI工作台/cnc_param_quickfinder';
const specs={
'entry-teaching-cards.json':['id','title','category','beginnerSummary','whyItMatters','whenToUse','commonMistake','quickCheck','relatedEntryIds','relatedImageIds','nextLearningIds','searchAliases'],
'scenario-playbooks.json':['id','title','sceneType','symptom','likelyCauses','firstAction','doNotDoFirst','stepActions','relatedEntryIds','relatedFlowIds','relatedCalculatorIds'],
'calculator-recipes.json':['id','title','calculatorType','inputMeaning','resultMeaning','typicalUseCase','commonWrongInput','afterCalculationCheck','recommendedEntryIds','recommendedLookupIds'],
'alarm-action-cards.json':['id','title','system','alarmCodes','riskLevel','oneLineDiagnosis','firstThreeChecks','stopConditions','relatedFlowId','relatedEntryIds'],
'machine-panel-guides.json':['id','title','machineActionType','targetControlArea','whatItDoes','whenToUse','wrongOperationRisk','stepGuide','relatedEntryIds','preferredImageKeywords'],
'tooling-decision-cards.json':['id','title','toolType','workMaterial','recommendedUse','avoidUse','selectionReason','commonWearSignal','relatedEntryIds','relatedImageIds'],
'entry-priority-index.json':['id','title','category','priorityScore','beginnerValue','shopfloorValue','imageReadiness','calculatorRelevance','recommendedSurface']
};
function arrOf(data){return Array.isArray(data)?data:(Object.values(data).find(v=>Array.isArray(v))||[])}
for(const [file,required] of Object.entries(specs)){
 const data=JSON.parse(fs.readFileSync(base+'/'+file,'utf8')); const arr=arrOf(data); let missing=0;
 for(const item of arr){ if(required.some(k=>!(k in item))) missing++; }
 console.log(file+'\tcount='+arr.length+'\tmissingRows='+missing);
}
