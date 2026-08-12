'use strict';
const fs=require('fs');
const path=require('path');
const {execFileSync}=require('child_process');
const ROOT=path.resolve(__dirname,'..','..');
const FROM_PWA='20260812-pwa40';
const TO_PWA='20260812-pwa41';
const FROM_CACHE='20260812-learning40';
const TO_CACHE='20260812-learning41';
const TRANSITION_FILES=[
  'cnc/tests/pages-ai-teacher-offline-core-deployment-smoke.cjs',
  'cnc/tests/pages-beginner-placement-offline-deployment-smoke.cjs',
  'cnc/tests/pages-training-camp-route-handoff-deployment-smoke.cjs'
];
function walk(dir){if(!fs.existsSync(dir))return[];return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{const full=path.join(dir,entry.name);if(entry.isDirectory()){if(['node_modules','test-results','.git','docs'].includes(entry.name))return[];return walk(full)}return /\.(?:cjs|js|html|json|md|ya?ml)$/.test(entry.name)?[full]:[]})}
function rel(file){return path.relative(ROOT,file).replaceAll(path.sep,'/')}
const files=[...walk(path.join(ROOT,'cnc')),...walk(path.join(ROOT,'.github','workflows')).filter(file=>path.basename(file).startsWith('cnc-'))];
const changed=[];
for(const file of files){let source=fs.readFileSync(file,'utf8'),next=source.replaceAll(FROM_PWA,TO_PWA).replaceAll(FROM_CACHE,TO_CACHE);const relative=rel(file);if(TRANSITION_FILES.includes(relative))next=next.replace(/(const\s+currentMainPwaBuild\s*=\s*['"])20260812-pwa39(['"])/,'$1'+FROM_PWA+'$2');if(next!==source){fs.writeFileSync(file,next);changed.push(relative)}}
const required=[
  'cnc/tests/mobile-pwa-offline-cache-smoke.cjs',
  'cnc/tests/mobile-pwa-profile-bfcache-smoke.cjs',
  'cnc/tests/mobile-pwa-upgrade-data-smoke.cjs',
  ...TRANSITION_FILES,
  '.github/workflows/cnc-pwa-offline-cache-smoke.yml',
  '.github/workflows/cnc-pwa-self-test-smoke.yml',
  '.github/workflows/cnc-pwa-upgrade-data-smoke.yml',
  '.github/workflows/cnc-training-camp-route-handoff-pages-smoke.yml'
];
for(const file of required)if(!changed.includes(file))throw new Error(`PWA41同步缺少预期文件：${file}`);
for(const file of TRANSITION_FILES){const source=fs.readFileSync(path.join(ROOT,file),'utf8');if(!source.includes(`currentMainPwaBuild='${FROM_PWA}'`)&&!source.includes(`currentMainPwaBuild=\"${FROM_PWA}\"`))throw new Error(`当前main过渡构建未锁定PWA40：${file}`)}
const audit=fs.readFileSync(path.join(ROOT,'cnc/tests/pwa-build-reference-audit-smoke.cjs'),'utf8');if(audit.includes(TO_PWA))throw new Error('禁止通过把PWA41写进治理脚本绕过审计');
const diff=execFileSync('git',['diff','--name-only'],{cwd:ROOT,encoding:'utf8'}).trim().split('\n').filter(Boolean);
const outside=diff.filter(file=>!(file.startsWith('cnc/')||file.startsWith('.github/workflows/cnc-')));if(outside.length)throw new Error(`发现非CNC范围改动：${outside.join('、')}`);
const report={fromPwa:FROM_PWA,toPwa:TO_PWA,fromCache:FROM_CACHE,toCache:TO_CACHE,changedFiles:diff,changedCount:diff.length,transitionFiles:TRANSITION_FILES};
fs.mkdirSync(path.join(ROOT,'artifacts/pwa41-pin-sync'),{recursive:true});fs.writeFileSync(path.join(ROOT,'artifacts/pwa41-pin-sync/report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
