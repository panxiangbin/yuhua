/*
 * 新手学习图片接入 V5 + 手机端G/M速查升级引导
 * 第2、3关使用仓库SVG，第4～12关使用动态矢量教学图。
 */
(function(){
  'use strict';
  var BUILD='20260720g';
  var EXTENDED_SCRIPT='./learning-images-04-12.js?v='+BUILD;
  var PRO_SCRIPT='./mobile-gcode-pro.js?v='+BUILD;
  var ALIGN_SCRIPT='./learning-alignment-hotfix.js?v='+BUILD;
  var PRO_STYLE='./mobile-gcode-pro.css?v='+BUILD;
  var STATIC_CARDS={
    2:[
      {src:'./assets/images/learning/lesson-02/1.svg?v='+BUILD,title:'认识 X、Y、Z 轴与正方向',desc:'用立式加工中心示意图分清 X、Y、Z 三轴方向，重点理解 Z 轴与主轴方向的关系。',loading:'eager',fetchpriority:'high'},
      {src:'./assets/images/learning/lesson-02/2.svg?v='+BUILD,title:'刀具与工件的相对运动',desc:'编程时不要只盯着工作台移动，要始终按刀具相对工件的运动方向理解坐标。'}
    ],
    3:[
      {src:'./assets/images/learning/lesson-03/1.svg?v='+BUILD,title:'开机前先认识这些安全按钮',desc:'认识急停、复位、进给保持、单段、倍率和手轮/JOG，先学会停，再学会动。',loading:'eager',fetchpriority:'high'},
      {src:'./assets/images/learning/lesson-03/2.svg?v='+BUILD,title:'新手上机前的安全流程',desc:'按“先看、再查、再回、再试、再跑”的顺序完成开机检查和低倍率试运行。'}
    ]
  };
  function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;')}
  function lesson(n){var c=window.CNC_LEARNING_CONTENT;return c&&c.lessons&&(c.lessons[n]||c.lessons[String(n)])}
  function injectStatic(){var c=window.CNC_LEARNING_CONTENT;if(!c||!c.lessons)return false;Object.keys(STATIC_CARDS).forEach(function(k){var l=lesson(Number(k));if(l)l.imageCards=STATIC_CARDS[k].map(function(x){return Object.assign({},x)})});window.CNC_LEARNING_IMAGE_CARDS=STATIC_CARDS;return true}
  function ensureStyle(){if(document.querySelector('link[data-cnc-mobile-pro]'))return;var l=document.createElement('link');l.rel='stylesheet';l.href=PRO_STYLE;l.dataset.cncMobilePro='true';document.head.appendChild(l)}
  function loadScript(src,attr,ready){if(ready&&ready())return Promise.resolve(true);var key='__CNC_LOAD_'+attr.toUpperCase().replace(/-/g,'_')+'__';if(window[key])return window[key];window[key]=new Promise(function(resolve){var old=document.querySelector('script[data-'+attr+']');if(old){old.addEventListener('load',function(){resolve(true)},{once:true});old.addEventListener('error',function(){resolve(false)},{once:true});return}var s=document.createElement('script');s.src=src;s.async=false;s.setAttribute('data-'+attr,'true');s.onload=function(){resolve(true)};s.onerror=function(){console.error('[CNC加载失败]',src);resolve(false)};document.head.appendChild(s)});return window[key]}
  function loadAll(){ensureStyle();return loadScript(EXTENDED_SCRIPT,'learning-images-04-12',function(){return!!window.CNC_LEARNING_VECTOR_POSTERS}).then(function(){return loadScript(PRO_SCRIPT,'cnc-mobile-gcode-pro',function(){return!!window.__CNC_GM_PRO_INSTALLED__})}).then(function(){return loadScript(ALIGN_SCRIPT,'cnc-learning-alignment',function(){return window.__CNC_LEARNING_ALIGNED__===BUILD})})}
  function imageHtml(cards){return'<div class="lesson-image-flow lesson-image-flow-fallback" data-learning-images="true">'+cards.map(function(c,i){return'<section class="lesson-image-card"><div class="lesson-image-head"><span>图 '+(i+1)+'</span><h3>'+esc(c.title)+'</h3></div><img src="'+esc(c.src)+'" alt="'+esc(c.title)+'" loading="'+esc(c.loading||(i===0?'eager':'lazy'))+'" decoding="async"'+(c.fetchpriority?' fetchpriority="'+esc(c.fetchpriority)+'"':'')+'><p>'+esc(c.desc||'')+'</p></section>'}).join('')+'</div>'}
  function decorate(){var d=document.querySelector('#study-detail-content .lesson-detail-v2');if(!d)return false;var n=Number(d.getAttribute('data-level')||0),l=lesson(n),cards=l&&l.imageCards;if(!cards||!cards.length)return false;if(d.querySelector('.lesson-image-flow'))return true;var sections=d.querySelectorAll('.lesson-v2-section'),anchor=null;for(var i=0;i<sections.length;i++){var h=sections[i].querySelector('h3');if(h&&h.textContent.indexOf('学完要会什么')!==-1){anchor=sections[i];break}}if(!anchor)anchor=d.querySelector('.lesson-teacher-v2')||d.querySelector('.lesson-v2-hero');if(!anchor)return false;anchor.insertAdjacentHTML('afterend',imageHtml(cards));return true}
  function refresh(){var d=document.querySelector('#study-detail-content .lesson-detail-v2');if(!d)return;var n=Number(d.getAttribute('data-level')||0),l=lesson(n);if(l&&l.imageCards&&l.imageCards.length&&typeof window.openStudyDetail==='function'){window.openStudyDetail(n);setTimeout(decorate,0)}}
  function wrap(){var o=window.openStudyDetail;if(typeof o!=='function'||o.__lessonImagesV5Wrapped)return false;var w=function(){var r=o.apply(this,arguments);setTimeout(decorate,0);return r};w.__lessonImagesV5Wrapped=true;window.openStudyDetail=w;return true}
  function observe(){var h=document.getElementById('study-detail-content');if(!h||h.__lessonImagesV5Observed)return;h.__lessonImagesV5Observed=true;new MutationObserver(decorate).observe(h,{childList:true,subtree:true})}
  function boot(){injectStatic();wrap();observe();decorate();loadAll().then(function(){injectStatic();wrap();observe();if(typeof window.CNC_ALIGN_LEARNING_IMAGES==='function')window.CNC_ALIGN_LEARNING_IMAGES();refresh();decorate()});var a=0,t=setInterval(function(){a++;injectStatic();wrap();observe();decorate();if(a>=100||(window.openStudyDetail&&window.CNC_LEARNING_VECTOR_POSTERS&&window.__CNC_GM_PRO_INSTALLED__&&window.__CNC_LEARNING_ALIGNED__===BUILD))clearInterval(t)},100)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
  window.addEventListener('load',function(){injectStatic();loadAll().then(function(){if(typeof window.CNC_ALIGN_LEARNING_IMAGES==='function')window.CNC_ALIGN_LEARNING_IMAGES();refresh();decorate()})});
  window.CNC_IMPORT_TEST={runAll:function(){var r={passed:true,build:BUILD,lessons:{},mobileGcodePro:!!window.__CNC_GM_PRO_INSTALLED__,learningAligned:window.__CNC_LEARNING_ALIGNED__===BUILD,openLessonDecorated:!!document.querySelector('#study-detail-content .lesson-image-flow')};for(var n=2;n<=12;n++){var l=lesson(n),c=l&&Array.isArray(l.imageCards)?l.imageCards.length:0;r.lessons[n]=c;if(c<2)r.passed=false}if(!r.mobileGcodePro||!r.learningAligned)r.passed=false;console.log('[CNC综合检查 V5]',r);return r}};
})();
