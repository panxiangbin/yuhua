/* 数控小潘：换算工具页视觉与可访问性增强，不改写计算公式。 */
(function(){
'use strict';
var BUILD='20260722d';
var mounted=false;
function decorate(){
  var view=document.getElementById('view-calculator');
  if(!view)return false;
  document.body.classList.add('cnc-industrial-tools');
  var headers=Array.from(view.querySelectorAll('.calc-card-header'));
  headers.forEach(function(header,index){
    var card=header.closest('.calc-card');
    var body=card&&card.querySelector('.calc-card-body');
    if(!card||!body)return;
    header.setAttribute('role','button');
    header.setAttribute('tabindex','0');
    header.setAttribute('aria-controls','cnc-calc-body-'+(index+1));
    body.id='cnc-calc-body-'+(index+1);
    header.setAttribute('aria-expanded',body.classList.contains('hidden')?'false':'true');
    var icon=header.querySelector('.tile-icon');
    if(icon)icon.textContent=String(index+1).padStart(2,'0');
    var result=card.querySelector('.calc-result');
    if(result){result.setAttribute('role','status');result.setAttribute('aria-live','polite');}
  });
  return headers.length===6;
}
function syncHeader(header){
  var card=header&&header.closest('.calc-card');
  var body=card&&card.querySelector('.calc-card-body');
  if(header&&body)window.setTimeout(function(){header.setAttribute('aria-expanded',body.classList.contains('hidden')?'false':'true');},0);
}
function activateHeader(header){if(!header)return;header.click();syncHeader(header);}
function bind(){
  if(mounted)return;mounted=true;
  document.addEventListener('click',function(event){
    var route=event.target.closest&&event.target.closest('[data-route="calculator"]');
    if(route)window.setTimeout(decorate,40);
    var header=event.target.closest&&event.target.closest('#view-calculator .calc-card-header');
    if(header)syncHeader(header);
  },true);
  document.addEventListener('keydown',function(event){
    var header=event.target.closest&&event.target.closest('#view-calculator .calc-card-header');
    if(header&&(event.key==='Enter'||event.key===' ')){event.preventDefault();activateHeader(header);}
  });
  window.addEventListener('hashchange',function(){if(location.hash==='#calculator')window.setTimeout(decorate,40);});
}
function boot(){bind();decorate();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.CNC_INDUSTRIAL_TOOLS={build:BUILD,polling:false,observer:false,refresh:decorate,runCheck:function(){
  var view=document.getElementById('view-calculator');
  var cards=view?Array.from(view.querySelectorAll('.calc-card')):[];
  var accessible=cards.every(function(card){var h=card.querySelector('.calc-card-header'),r=card.querySelector('.calc-result');return h&&h.getAttribute('role')==='button'&&h.hasAttribute('aria-expanded')&&r&&r.getAttribute('aria-live')==='polite';});
  return{passed:Boolean(document.body.classList.contains('cnc-industrial-tools')&&cards.length===6&&accessible),build:BUILD,cards:cards.length,accessible:accessible,polling:false,observer:false};
}};
})();
