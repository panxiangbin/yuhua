/* 数控小潘：异常排查卡片语义与键盘操作。 */
(function(){
'use strict';
var BUILD='20260722f';
function decorate(){
  var panel=document.getElementById('tool-tab3');
  var list=document.getElementById('tool-diagList');
  var search=document.getElementById('tool-diagSearch');
  if(!panel||!list)return false;
  if(document.body)document.body.classList.add('cnc-industrial-diagnosis');
  panel.dataset.industrialDiagnosis='ready';
  if(search){search.setAttribute('aria-label','搜索加工异常');search.setAttribute('autocomplete','off');}
  list.setAttribute('role','list');
  Array.from(list.querySelectorAll('.diag-item')).forEach(function(item){
    item.setAttribute('role','listitem');
    var header=item.querySelector('.diag-item-header');
    var detail=item.querySelector('.diag-detail');
    if(!header||!detail)return;
    var title=(item.querySelector('.diag-item-title')||{}).textContent||'异常排查';
    header.setAttribute('role','button');
    header.setAttribute('tabindex','0');
    header.setAttribute('aria-label','查看'+title+'的原因和检查顺序');
    header.setAttribute('aria-controls',detail.id||'');
    var open=detail.style.display!=='none';
    header.setAttribute('aria-expanded',open?'true':'false');
    item.dataset.expanded=open?'true':'false';
  });
  return true;
}
function syncSoon(){[0,40,120,320].forEach(function(delay){setTimeout(decorate,delay);});}
function toggleFromKeyboard(event){
  var header=event.target&&event.target.closest&&event.target.closest('#tool-tab3 .diag-item-header');
  if(!header||!(event.key==='Enter'||event.key===' '))return;
  event.preventDefault();
  header.click();
  setTimeout(decorate,0);
}
document.addEventListener('keydown',toggleFromKeyboard,true);
document.addEventListener('click',function(event){
  if(event.target&&event.target.closest&&event.target.closest('[data-tool-tab="tool-tab3"],#tool-tab3 .cat-btn,#tool-tab3 .diag-item-header'))syncSoon();
},true);
document.addEventListener('input',function(event){if(event.target&&event.target.id==='tool-diagSearch')syncSoon();},true);
function boot(){decorate();syncSoon();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.CNC_INDUSTRIAL_DIAGNOSIS={build:BUILD,polling:false,observer:false,refresh:decorate,runCheck:function(){var panel=document.getElementById('tool-tab3'),items=document.querySelectorAll('#tool-diagList .diag-item'),header=document.querySelector('#tool-diagList .diag-item-header');return{passed:Boolean(panel&&panel.dataset.industrialDiagnosis==='ready'&&items.length>=20&&header&&header.getAttribute('role')==='button'),build:BUILD,items:items.length,polling:false,observer:false};}};
})();
