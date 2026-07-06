const fs=require('fs');
const base='F:/AI工作台/cnc_param_quickfinder';
const audit=JSON.parse(fs.readFileSync(base+'/existing-image-coverage-audit.json','utf8'));
console.log(JSON.stringify({count:audit.length, sections:audit.map(x=>x.section), sample:audit[0]}, null, 2));
