/* 新手课程图片稳定归位：按图片标题分类，重复执行结果保持一致 */
(function(){
  'use strict';
  var BUILD='20260720h';
  function lesson(n){var c=window.CNC_LEARNING_CONTENT;return c&&c.lessons&&(c.lessons[n]||c.lessons[String(n)])}
  function cards(n){var l=lesson(n);return l&&Array.isArray(l.imageCards)?l.imageCards:[]}
  function clone(list){return list.map(function(x){return Object.assign({},x)})}
  function title(card){return String(card&&card.title||'')+' '+String(card&&card.desc||'')}
  function select(pool,re){return pool.filter(function(card){return re.test(title(card))}).slice(0,2)}
  function signature(list){return list.map(function(x){return String(x.title||'')}).join('|')}
  function align(){
    if(!window.CNC_LEARNING_CONTENT)return false;
    var pool=[];
    [7,8,9,11].forEach(function(n){cards(n).forEach(function(card){if(!pool.some(function(x){return x.src===card.src&&x.title===card.title}))pool.push(card)})});
    var map={
      7:select(pool,/顺铣|逆铣|G41|G42|左刀补|右刀补/),
      8:select(pool,/S、F|S\/F|转速和进给|M03|M05|主轴转速/),
      9:select(pool,/G00|G01|安全走刀|快速定位|直线切削/),
      11:select(pool,/G90|G91|终点位置|绝对坐标|增量坐标/)
    };
    var ok=true,changed=false;
    Object.keys(map).forEach(function(k){
      if(map[k].length<2){ok=false;return}
      var l=lesson(Number(k));
      if(l&&signature(cards(Number(k)))!==signature(map[k])){l.imageCards=clone(map[k]);changed=true}
    });
    if(!ok)return false;
    window.__CNC_LEARNING_ALIGNED__=BUILD;
    if(changed){
      var open=document.querySelector('#study-detail-content .lesson-detail-v2');
      if(open&&typeof window.openStudyDetail==='function'){
        var n=Number(open.getAttribute('data-level')||0);
        if([7,8,9,11].indexOf(n)!==-1){var marker=open.querySelector('.lesson-image-flow');if(marker)marker.remove();window.openStudyDetail(n)}
      }
    }
    return true;
  }
  var tries=0;
  var timer=setInterval(function(){
    tries+=1;
    align();
    if(tries>=60)clearInterval(timer);
  },100);
  window.addEventListener('load',function(){
    [50,150,300,600,900,1300,1700,2500,4000].forEach(function(delay){setTimeout(align,delay)});
  });
  document.addEventListener('visibilitychange',function(){if(!document.hidden)align()});
  window.CNC_ALIGN_LEARNING_IMAGES=align;
})();
