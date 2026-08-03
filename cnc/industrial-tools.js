/* 数控小潘：换算工具页视觉与可访问性增强，不改写计算公式。 */
(function(){
'use strict';
var BUILD='20260722d';
var DIAG_BUILD='20260722f';
var mounted=false;
var apiPublished=false;
function ensureDiagnosisAssets(){
  if(!document.querySelector('link[data-cnc-industrial-diagnosis]')){var link=document.createElement('link');link.rel='stylesheet';link.href='./industrial-diagnosis.css?v='+DIAG_BUILD;link.dataset.cncIndustrialDiagnosis='1';document.head.appendChild(link);}
  if(!document.querySelector('script[data-cnc-industrial-diagnosis-script]')){var script=document.createElement('script');script.src='./industrial-diagnosis.js?v='+DIAG_BUILD;script.async=true;script.dataset.cncIndustrialDiagnosisScript='1';document.head.appendChild(script);}
}
function ensureMobileDirectoryAccess(){
  if(document.querySelector('style[data-cnc-mobile-directory-access]'))return;
  var style=document.createElement('style');
  style.dataset.cncMobileDirectoryAccess='1';
  style.textContent='@media(max-width:760px){body.cnc-game-home-enabled.cnc-game-query-home-active .topbar{display:flex!important;position:absolute!important;z-index:18!important;top:14px!important;left:14px!important;width:44px!important;height:44px!important;padding:0!important;border:0!important;border-radius:12px!important;background:transparent!important;box-shadow:none!important;backdrop-filter:none!important}body.cnc-game-home-enabled.cnc-game-query-home-active .topbar-left{display:block!important;width:44px!important;height:44px!important}body.cnc-game-home-enabled.cnc-game-query-home-active .topbar-left>:not(#sidebar-open),body.cnc-game-home-enabled.cnc-game-query-home-active .topbar-right{display:none!important}body.cnc-game-home-enabled.cnc-game-query-home-active #sidebar-open{display:inline-flex!important;align-items:center!important;justify-content:center!important;width:44px!important;height:44px!important;border:1px solid rgba(255,255,255,.28)!important;border-radius:12px!important;background:rgba(4,27,60,.82)!important;color:#fff!important;box-shadow:0 8px 20px rgba(0,0,0,.22)!important}body.cnc-game-home-enabled.cnc-game-query-home-active .xp-game-topline{padding-left:52px!important}}';
  document.head.appendChild(style);
}
function ensureGameHomeEntry(){
  var home=document.getElementById('xp-game-home');
  if(!home)return false;
  if(!document.querySelector('style[data-cnc-industrial-tools-entry]')){
    var style=document.createElement('style');
    style.dataset.cncIndustrialToolsEntry='1';
    style.textContent='@media(max-width:768px){#xp-game-home .xp-game-tools-entry{display:grid;grid-template-columns:42px minmax(0,1fr) auto;align-items:center;gap:10px;width:calc(100% - 24px);min-height:64px;margin:12px 12px 0;padding:10px 12px;border:1px solid rgba(132,187,255,.38);border-radius:14px;background:linear-gradient(180deg,#183e72,#0d2a50);color:#fff;box-shadow:0 10px 24px rgba(0,0,0,.18);font:inherit;text-align:left;cursor:pointer}.xp-game-tools-entry .xp-game-tools-icon{display:grid;place-items:center;width:42px;height:42px;border-radius:11px;background:#1577ff;color:#fff;font-size:20px;font-weight:1000}.xp-game-tools-entry strong{display:block;font-size:15px;line-height:1.3;font-weight:1000}.xp-game-tools-entry small{display:block;margin-top:3px;color:#c5d9f1;font-size:10px;line-height:1.35;font-weight:750}.xp-game-tools-entry .xp-game-tools-arrow{font-size:24px;font-weight:900}.xp-game-tools-entry:active{transform:translateY(1px);background:linear-gradient(180deg,#204d86,#12335f)}}';
    document.head.appendChild(style);
  }
  var existing=home.querySelector('[data-route="calculator"]');
  if(existing)return true;
  var button=document.createElement('button');
  button.type='button';
  button.className='xp-game-tools-entry';
  button.dataset.route='calculator';
  button.dataset.cncIndustrialToolsEntry='true';
  button.setAttribute('aria-label','进入换算工具，计算转速、进给、锥度和直径');
  button.innerHTML='<span class="xp-game-tools-icon" aria-hidden="true">ƒ</span><span><strong>换算工具</strong><small>转速 · 进给 · 锥度 · 直径</small></span><span class="xp-game-tools-arrow" aria-hidden="true">›</span>';
  var bottomNav=home.querySelector('.xp-game-bottom-nav');
  if(bottomNav)bottomNav.insertAdjacentElement('beforebegin',button);else home.appendChild(button);
  return true;
}
function decorate(){
  var view=document.getElementById('view-calculator');
  ensureGameHomeEntry();
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
    if(route){
      if(route.dataset.cncIndustrialToolsEntry==='true'){
        var guard=window.CNC_STARTUP_HOME_GUARD;
        if(guard&&typeof guard.acceptTrustedRouteEvent==='function')guard.acceptTrustedRouteEvent(event);
        event.preventDefault();
        if(typeof window.navigate==='function')window.navigate('calculator');
        else if(typeof navigate==='function')navigate('calculator');
      }
      window.setTimeout(decorate,40);
    }
    var header=event.target.closest&&event.target.closest('#view-calculator .calc-card-header');
    if(header)syncHeader(header);
  },true);
  document.addEventListener('keydown',function(event){
    var header=event.target.closest&&event.target.closest('#view-calculator .calc-card-header');
    if(header&&(event.key==='Enter'||event.key===' ')){event.preventDefault();activateHeader(header);}
  });
  window.addEventListener('hashchange',function(){if(location.hash==='#calculator')window.setTimeout(decorate,40);});
  window.addEventListener('pageshow',function(){ensureGameHomeEntry();window.setTimeout(decorate,40);});
}
var api={build:BUILD,diagnosisBuild:DIAG_BUILD,polling:false,observer:false,refresh:decorate,ensureGameHomeEntry:ensureGameHomeEntry,runCheck:function(){
  var view=document.getElementById('view-calculator');
  var cards=view?Array.from(view.querySelectorAll('.calc-card')):[];
  var accessible=cards.every(function(card){var h=card.querySelector('.calc-card-header'),r=card.querySelector('.calc-result');return h&&h.getAttribute('role')==='button'&&h.hasAttribute('aria-expanded')&&r&&r.getAttribute('aria-live')==='polite';});
  return{passed:Boolean(document.body.classList.contains('cnc-industrial-tools')&&cards.length===6&&accessible),build:BUILD,diagnosisBuild:DIAG_BUILD,cards:cards.length,accessible:accessible,gameHomeEntry:Boolean(document.querySelector('#xp-game-home [data-route="calculator"]')),mobileDirectoryAccess:Boolean(document.querySelector('style[data-cnc-mobile-directory-access]')),polling:false,observer:false};
}};
function publishApiWhenStable(){
  if(apiPublished)return;
  ensureGameHomeEntry();
  var entry=document.querySelector('#xp-game-home [data-route="calculator"]');
  if(!entry||!entry.isConnected){window.setTimeout(publishApiWhenStable,120);return;}
  apiPublished=true;
  window.CNC_INDUSTRIAL_TOOLS=api;
}
function boot(){
  ensureDiagnosisAssets();
  ensureMobileDirectoryAccess();
  bind();
  decorate();
  [80,220,500,900].forEach(function(delay){window.setTimeout(ensureGameHomeEntry,delay);});
  // 首页启动链在900ms执行一次有限兜底重绘。入口在此之前虽可见，仍可能被替换。
  // 等兜底重绘结束并确认按钮仍连接DOM后再发布工具API就绪，避免快速点击拿到失效节点。
  window.setTimeout(publishApiWhenStable,1120);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();