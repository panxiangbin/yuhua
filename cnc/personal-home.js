/* 数控小潘：个性化首页、继续学习、学习进度与本地记录。 */
(function(){
  'use strict';
  var BUILD='20260720p';
  var VISITED_KEY='cnc_study_visited_v1';
  var DONE_KEY='cnc_study_completed_v1';
  var CURRENT_KEY='cnc_study_current_v1';
  var FAVORITES_KEY='cnc_app_favorites_v2';
  var RECENTS_KEY='cnc_app_recents_v2';
  var mounted=false;

  function read(key, fallback){
    try{var value=JSON.parse(localStorage.getItem(key));return value==null?fallback:value;}catch(e){return fallback;}
  }
  function write(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch(e){}}
  function uniqueNumbers(list){return Array.from(new Set((Array.isArray(list)?list:[]).map(Number).filter(function(n){return n>=1&&n<=12;}))).sort(function(a,b){return a-b;});}
  function escapeHtml(value){return String(value||'').replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];});}
  function getCards(){return Array.from(document.querySelectorAll('#view-study .study-card[data-level]'));}
  function lessonInfo(level){
    var card=document.querySelector('#view-study .study-card[data-level="'+level+'"]');
    return {level:Number(level)||1,title:card&&card.querySelector('h4')?card.querySelector('h4').textContent.trim():'第 '+level+' 关',desc:card&&card.querySelector('p')?card.querySelector('p').textContent.trim():'继续完成数控入门学习'};
  }
  function state(){
    var visited=uniqueNumbers(read(VISITED_KEY,[]));
    var done=uniqueNumbers(read(DONE_KEY,[]));
    var current=read(CURRENT_KEY,null);
    if(!current||!current.level){var next=done.length<12?Array.from({length:12},function(_,i){return i+1;}).find(function(n){return done.indexOf(n)===-1;})||1:12;current=lessonInfo(next);}
    return {visited:visited,done:done,current:current,favorites:read(FAVORITES_KEY,[]),recents:read(RECENTS_KEY,[])};
  }
  function injectStyles(){
    if(document.getElementById('xp-personal-home-style'))return;
    var style=document.createElement('style');style.id='xp-personal-home-style';
    style.textContent=[
      '.xp-personal-home{margin:0 0 18px;display:grid;gap:12px}',
      '.xp-personal-hero{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(260px,.7fr);gap:12px;padding:18px;border-radius:22px;background:linear-gradient(135deg,#1464f4 0%,#7048e8 58%,#ef5da8 100%);color:#fff;box-shadow:0 18px 42px rgba(20,100,244,.22)}',
      '.xp-personal-kicker{margin:0 0 5px;font-size:12px;font-weight:900;letter-spacing:.08em;opacity:.86}',
      '.xp-personal-hero h2{margin:0;font-size:clamp(24px,4vw,36px);line-height:1.15;font-weight:950}',
      '.xp-personal-hero p{margin:8px 0 0;color:rgba(255,255,255,.88);line-height:1.65}',
      '.xp-progress-box{align-self:stretch;padding:14px;border-radius:18px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.25);backdrop-filter:blur(10px)}',
      '.xp-progress-number{display:flex;align-items:flex-end;justify-content:space-between;gap:8px}',
      '.xp-progress-number strong{font-size:34px;line-height:1;font-weight:950}',
      '.xp-progress-number span{font-size:13px;font-weight:800}',
      '.xp-progress-track{height:10px;margin-top:12px;border-radius:999px;background:rgba(255,255,255,.22);overflow:hidden}',
      '.xp-progress-fill{height:100%;border-radius:inherit;background:#ffe066;transition:width .28s ease}',
      '.xp-personal-grid{display:grid;grid-template-columns:minmax(0,1.45fr) repeat(3,minmax(115px,.55fr));gap:10px}',
      '.xp-continue-card,.xp-stat-card{border:1px solid rgba(20,100,244,.12);background:#fff;border-radius:18px;padding:15px;box-shadow:0 8px 24px rgba(32,48,80,.07)}',
      '.xp-continue-card{display:flex;align-items:center;justify-content:space-between;gap:14px;background:linear-gradient(135deg,#fff7e6,#fff)}',
      '.xp-continue-card small,.xp-stat-card small{display:block;color:#687386;font-size:12px;font-weight:800}',
      '.xp-continue-card strong{display:block;margin-top:4px;font-size:19px;line-height:1.35;color:#17233c;font-weight:950}',
      '.xp-continue-card p{margin:5px 0 0;color:#687386;font-size:13px;line-height:1.5}',
      '.xp-continue-btn{flex:0 0 auto;border:0;border-radius:13px;padding:11px 14px;background:#ff7a00;color:#fff;font-weight:950;cursor:pointer;box-shadow:0 8px 18px rgba(255,122,0,.24)}',
      '.xp-stat-card{display:flex;flex-direction:column;justify-content:center;min-height:92px}',
      '.xp-stat-card strong{display:block;margin-top:5px;font-size:27px;line-height:1;color:#17233c;font-weight:950}',
      '.xp-complete-bar{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:14px 0 0;padding:12px 14px;border-radius:16px;background:#eff8ff;border:1px solid #cfe8ff}',
      '.xp-complete-bar strong{font-weight:950;color:#14335d}',
      '.xp-complete-btn{border:0;border-radius:12px;padding:10px 13px;background:#15a46d;color:#fff;font-weight:950;cursor:pointer}',
      '.xp-complete-btn.done{background:#dce9e3;color:#2f6d55}',
      '#view-study .study-card.xp-visited{outline:2px solid rgba(20,100,244,.20)}',
      '#view-study .study-card.xp-completed{outline:2px solid rgba(21,164,109,.42);background:linear-gradient(180deg,#f4fff9,#fff)}',
      '#view-study .study-card.xp-completed:after{content:"已完成";position:absolute;right:12px;bottom:12px;padding:5px 9px;border-radius:999px;background:#15a46d;color:#fff;font-size:11px;font-weight:950}',
      '#view-study .study-card{position:relative}',
      '@media(max-width:760px){.xp-personal-hero{grid-template-columns:1fr;padding:16px}.xp-personal-grid{grid-template-columns:1fr}.xp-continue-card{align-items:flex-start;flex-direction:column}.xp-continue-btn{width:100%;min-height:46px}.xp-stat-card{min-height:76px}.xp-personal-home{margin-bottom:14px}}'
    ].join('');
    document.head.appendChild(style);
  }
  function render(){
    var dashboard=document.getElementById('view-dashboard');
    var launch=dashboard&&dashboard.querySelector('.launchpad-grid');
    if(!dashboard||!launch)return false;
    var s=state();
    var panel=document.getElementById('xp-personal-home');
    if(!panel){panel=document.createElement('section');panel.id='xp-personal-home';panel.className='xp-personal-home';launch.parentNode.insertBefore(panel,launch);}
    var percent=Math.round((s.done.length/12)*100);
    var current=lessonInfo(s.current.level||1);
    panel.innerHTML=''
      +'<div class="xp-personal-hero"><div><p class="xp-personal-kicker">数控小潘 · 今日学习</p><h2>'+(s.done.length?'接着学，别从头再找':'从第 1 关开始，稳稳入门')+'</h2><p>学习记录只保存在你的手机浏览器里，不登录也能继续。</p></div>'
      +'<div class="xp-progress-box"><div class="xp-progress-number"><strong>'+percent+'%</strong><span>已完成 '+s.done.length+' / 12 关</span></div><div class="xp-progress-track"><div class="xp-progress-fill" style="width:'+percent+'%"></div></div></div></div>'
      +'<div class="xp-personal-grid"><article class="xp-continue-card"><div><small>继续学习 · 第 '+current.level+' 关</small><strong>'+escapeHtml(current.title)+'</strong><p>'+escapeHtml(current.desc)+'</p></div><button class="xp-continue-btn" type="button" data-xp-continue="'+current.level+'">继续学习</button></article>'
      +'<article class="xp-stat-card"><small>已看关卡</small><strong>'+s.visited.length+'</strong></article>'
      +'<article class="xp-stat-card"><small>我的收藏</small><strong>'+(Array.isArray(s.favorites)?s.favorites.length:0)+'</strong></article>'
      +'<article class="xp-stat-card"><small>最近查看</small><strong>'+(Array.isArray(s.recents)?s.recents.length:0)+'</strong></article></div>';
    markCards(s);
    return true;
  }
  function markCards(s){getCards().forEach(function(card){var level=Number(card.dataset.level);card.classList.toggle('xp-visited',s.visited.indexOf(level)!==-1);card.classList.toggle('xp-completed',s.done.indexOf(level)!==-1);});}
  function openLesson(level){
    var card=document.querySelector('#view-study .study-card[data-level="'+level+'"]');
    if(!card)return;
    var info=lessonInfo(level);var s=state();
    s.visited=uniqueNumbers(s.visited.concat([level]));write(VISITED_KEY,s.visited);write(CURRENT_KEY,info);
    if(typeof window.navigate==='function')window.navigate('study');else{var nav=document.querySelector('[data-route="study"]');if(nav)nav.click();}
    setTimeout(function(){card.click();card.scrollIntoView({behavior:'smooth',block:'start'});render();},80);
  }
  function mountCompleteButton(){
    var content=document.getElementById('study-detail-content');if(!content)return;
    var detail=content.querySelector('.lesson-detail-v2[data-level]');if(!detail)return;
    var level=Number(detail.dataset.level);if(!level)return;
    var bar=detail.querySelector('.xp-complete-bar');
    if(!bar){bar=document.createElement('div');bar.className='xp-complete-bar';var target=detail.querySelector('.lesson-pass-box')||detail.firstElementChild; if(target)target.insertAdjacentElement('afterend',bar);else detail.prepend(bar);}
    var done=state().done.indexOf(level)!==-1;
    bar.innerHTML='<strong>'+(done?'这一关已完成，可以继续下一关':'学完并练习后，记得标记完成')+'</strong><button type="button" class="xp-complete-btn'+(done?' done':'')+'" data-xp-complete="'+level+'">'+(done?'✓ 已完成':'标记完成')+'</button>';
  }
  function toggleComplete(level){
    var s=state();var exists=s.done.indexOf(level)!==-1;
    s.done=exists?s.done.filter(function(n){return n!==level;}):uniqueNumbers(s.done.concat([level]));
    s.visited=uniqueNumbers(s.visited.concat([level]));write(DONE_KEY,s.done);write(VISITED_KEY,s.visited);
    if(!exists){var next=Array.from({length:12},function(_,i){return i+1;}).find(function(n){return s.done.indexOf(n)===-1;});if(next)write(CURRENT_KEY,lessonInfo(next));}
    render();mountCompleteButton();
  }
  function bind(){
    if(mounted)return;mounted=true;
    document.addEventListener('click',function(event){
      var cont=event.target.closest&&event.target.closest('[data-xp-continue]');if(cont){openLesson(Number(cont.dataset.xpContinue));return;}
      var complete=event.target.closest&&event.target.closest('[data-xp-complete]');if(complete){toggleComplete(Number(complete.dataset.xpComplete));return;}
      var card=event.target.closest&&event.target.closest('#view-study .study-card[data-level]');if(card){var level=Number(card.dataset.level);var s=state();s.visited=uniqueNumbers(s.visited.concat([level]));write(VISITED_KEY,s.visited);write(CURRENT_KEY,lessonInfo(level));setTimeout(function(){render();mountCompleteButton();},80);}
      var fav=event.target.closest&&event.target.closest('#favorite-toggle');if(fav)setTimeout(render,60);
    },true);
    window.addEventListener('storage',render);
    var detail=document.getElementById('study-detail-content');if(detail){new MutationObserver(function(){mountCompleteButton();}).observe(detail,{childList:true});}
  }
  function boot(){injectStyles();bind();render();mountCompleteButton();setTimeout(render,900);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.CNC_PERSONAL_HOME={build:BUILD,render:render,getState:state,runCheck:function(){var panel=document.getElementById('xp-personal-home');var single=window.innerWidth>760||getComputedStyle(panel.querySelector('.xp-personal-grid')).gridTemplateColumns.split(' ').length===1;return {passed:Boolean(panel&&document.querySelector('[data-xp-continue]')&&single),build:BUILD,panel:Boolean(panel),mobileSingleColumn:single,state:state()};}};
})();
