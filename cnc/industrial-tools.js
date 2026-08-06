/* 数控小潘：换算工具页视觉与可访问性增强，不改写计算公式。 */
(function(){
'use strict';
var BUILD='20260722d';
var DIAG_BUILD='20260722f';
var mounted=false;

function ensureDiagnosisAssets(){
  if(!document.querySelector('link[data-cnc-industrial-diagnosis]')){
    var link=document.createElement('link');
    link.rel='stylesheet';
    link.href='./industrial-diagnosis.css?v='+DIAG_BUILD;
    link.dataset.cncIndustrialDiagnosis='1';
    document.head.appendChild(link);
  }
  if(!document.querySelector('script[data-cnc-industrial-diagnosis-script]')){
    var script=document.createElement('script');
    script.src='./industrial-diagnosis.js?v='+DIAG_BUILD;
    script.async=true;
    script.dataset.cncIndustrialDiagnosisScript='1';
    document.head.appendChild(script);
  }
}

function ensureSingleHomeEntryStyle(){
  if(document.querySelector('style[data-cnc-single-home-tools-entry]'))return;
  var style=document.createElement('style');
  style.dataset.cncSingleHomeToolsEntry='1';
  style.textContent='@media(max-width:768px){body:has(#view-dashboard.active) #view-dashboard .launchpad-search{position:relative!important}body:has(#view-dashboard.active) #view-dashboard .launchpad-search-header{padding-right:52px!important}body:has(#view-dashboard.active) #view-dashboard .cnc-mobile-tools-entry{position:absolute;z-index:3;top:8px;right:10px;display:inline-flex!important;width:44px!important;min-width:44px!important;height:44px!important;min-height:44px!important;align-items:center;justify-content:center;padding:0!important;border:1px solid #c5d7ea!important;border-radius:11px!important;background:#eef5ff!important;color:#176fe5!important;box-shadow:0 4px 12px rgba(24,91,172,.12)!important;font:950 17px/1 system-ui,-apple-system,"Segoe UI",sans-serif!important;cursor:pointer}.cnc-mobile-tools-entry:focus-visible{outline:3px solid rgba(23,111,229,.28)!important;outline-offset:2px!important}}@media(min-width:769px){.cnc-mobile-tools-entry{display:none!important}}';
  document.head.appendChild(style);
}

function ensureSingleHomeEntry(){
  ensureSingleHomeEntryStyle();
  var dashboard=document.getElementById('view-dashboard');
  if(!dashboard)return false;
  var entry=dashboard.querySelector('.cnc-mobile-tools-entry');
  if(!entry){
    var searchPanel=dashboard.querySelector('.launchpad-search');
    if(!searchPanel)return Boolean(dashboard.querySelector('[data-route="calculator"]'));
    entry=document.createElement('button');
    entry.type='button';
    entry.className='cnc-mobile-tools-entry';
    entry.dataset.route='calculator';
    entry.dataset.cncIndustrialToolsEntry='true';
    entry.setAttribute('aria-label','进入换算工具，计算转速、进给、锥度和直径');
    entry.title='换算工具';
    entry.textContent='ƒ';
    searchPanel.appendChild(entry);
  }
  return entry.isConnected;
}

function decorate(){
  var view=document.getElementById('view-calculator');
  ensureSingleHomeEntry();
  if(!view)return false;
  document.body.classList.add('cnc-industrial-tools');
  ensureDiagnosisAssets();
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
    if(result){
      result.setAttribute('role','status');
      result.setAttribute('aria-live','polite');
    }
  });
  return headers.length===6;
}

function syncHeader(header){
  var card=header&&header.closest('.calc-card');
  var body=card&&card.querySelector('.calc-card-body');
  if(header&&body){
    window.setTimeout(function(){
      header.setAttribute('aria-expanded',body.classList.contains('hidden')?'false':'true');
    },0);
  }
}

function activateHeader(header){
  if(!header)return;
  header.click();
  syncHeader(header);
}

function openCalculatorFromSingleHome(event,entry){
  var canonical=document.querySelector('#view-dashboard .launchpad-card[data-route="calculator"]');
  if(canonical&&canonical!==entry){
    event.preventDefault();
    canonical.click();
    return true;
  }
  var guard=window.CNC_STARTUP_HOME_GUARD;
  if(guard&&typeof guard.acceptTrustedRouteEvent==='function')guard.acceptTrustedRouteEvent(event);
  if(typeof window.navigate==='function'){
    event.preventDefault();
    window.navigate('calculator');
    return true;
  }
  return false;
}

function bind(){
  if(mounted)return;
  mounted=true;
  document.addEventListener('click',function(event){
    var route=event.target.closest&&event.target.closest('[data-route="calculator"]');
    if(route){
      if(route.dataset.cncIndustrialToolsEntry==='true')openCalculatorFromSingleHome(event,route);
      window.setTimeout(decorate,40);
    }
    var header=event.target.closest&&event.target.closest('#view-calculator .calc-card-header');
    if(header)syncHeader(header);
  },true);
  document.addEventListener('keydown',function(event){
    var header=event.target.closest&&event.target.closest('#view-calculator .calc-card-header');
    if(header&&(event.key==='Enter'||event.key===' ')){
      event.preventDefault();
      activateHeader(header);
    }
  });
  window.addEventListener('hashchange',function(){
    if(location.hash==='#calculator')window.setTimeout(decorate,40);
  });
  window.addEventListener('pageshow',function(){
    ensureSingleHomeEntry();
    window.setTimeout(decorate,40);
  });
  document.addEventListener('cnc:route-changed',function(){
    window.setTimeout(decorate,40);
  });
}

var api={
  build:BUILD,
  diagnosisBuild:DIAG_BUILD,
  polling:false,
  observer:false,
  refresh:decorate,
  ensureGameHomeEntry:ensureSingleHomeEntry,
  ensureSingleHomeEntry:ensureSingleHomeEntry,
  runCheck:function(){
    var view=document.getElementById('view-calculator');
    var cards=view?Array.from(view.querySelectorAll('.calc-card')):[];
    var accessible=cards.every(function(card){
      var header=card.querySelector('.calc-card-header');
      var result=card.querySelector('.calc-result');
      return header&&header.getAttribute('role')==='button'&&header.hasAttribute('aria-expanded')&&result&&result.getAttribute('aria-live')==='polite';
    });
    var entry=document.querySelector('#view-dashboard .cnc-mobile-tools-entry');
    var singleHomeEntry=Boolean(entry&&entry.isConnected);
    var singleHomeEntryVisible=Boolean(entry&&entry.getClientRects().length);
    var legacyHomeAbsent=!document.querySelector('#xp-game-home,#xp-personal-home');
    return{
      passed:Boolean(document.body.classList.contains('cnc-industrial-tools')&&cards.length===6&&accessible&&singleHomeEntry&&legacyHomeAbsent),
      build:BUILD,
      diagnosisBuild:DIAG_BUILD,
      cards:cards.length,
      accessible:accessible,
      singleHomeEntry:singleHomeEntry,
      singleHomeEntryVisible:singleHomeEntryVisible,
      gameHomeEntry:singleHomeEntry,
      legacyHomeAbsent:legacyHomeAbsent,
      polling:false,
      observer:false
    };
  }
};

function boot(){
  ensureDiagnosisAssets();
  ensureSingleHomeEntry();
  bind();
  decorate();
  window.CNC_INDUSTRIAL_TOOLS=api;
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
