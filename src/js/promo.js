/* InnerVerse promo box (assets/promo.js). Carried over from the Squarespace Code Injection
   block iv-promo (live 2026-10-28) on 2026-10-28; the stylesheet is src/css/63-promo.css.
   Only change: the page path comes from ivPath(), so the test address works. Doc: claude/iv-promo.md
   Free episode pages: under the Plus card. Members' /plus pages: above Get Tuned (a signed-out
   visitor sees the join screen and no box). Homepage: its own slot before the Plus section. */
(function(){
  if(window.__ivPromoStarted) return; window.__ivPromoStarted=true;
  var SRC='https://raw.githubusercontent.com/chance-garton/innerverse-data/main/promo.json';
  var path=(window.ivPath?window.ivPath():location.pathname).replace(/\/+$/,'');
  var isFree=/^\/episodes\/[^\/]+$/.test(path), isPlus=/^\/plus\/[^\/]+$/.test(path), isHome=(path==='');
  function slots(){return document.querySelectorAll('[data-iv-promo-slot]');}
  if(!isFree&&!isPlus&&!isHome&&!slots().length) return;
  function hideSlots(){[].forEach.call(slots(),function(s){s.hidden=true;});}
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function chicagoToday(){try{return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago'}).format(new Date());}catch(e){return new Date().toISOString().slice(0,10);}}
  function daysLeft(end){var a=Date.parse(chicagoToday()+'T00:00:00Z'),b=Date.parse(end+'T00:00:00Z');return Math.round((b-a)/86400000);}
  function niceDate(end){try{return new Date(end+'T12:00:00Z').toLocaleDateString('en-US',{month:'long',day:'numeric',timeZone:'UTC'});}catch(e){return end;}}
  function imgUrl(u){if(window.ivImg){try{return window.ivImg(u,500);}catch(e){}}return u+(u.indexOf('?')<0?'?format=500w':'');}
  function card(p){
    var d=p.endsOn?daysLeft(p.endsOn):null;
    var clock=d==null?'':(d>1?'Closes '+niceDate(p.endsOn)+', '+d+' days left':(d===1?'Closes tomorrow':'Last day to enroll'));
    var title=esc(p.headline).replace(/\*([^*]+)\*/g,'<em>$1</em>');
    var fine=esc(p.fine);
    if(p.linkLabel&&p.linkUrl){fine=fine.replace(esc(p.linkLabel),'<a href="'+esc(p.linkUrl)+'" target="_blank" rel="noopener">'+esc(p.linkLabel)+'</a>');}
    var el=document.createElement('aside');el.className='iv-promo'+(p.image?'':' iv-promo-noart');el.setAttribute('aria-label','Featured');
    el.innerHTML='<div class="iv-promo-in">'+
      (p.image?'<div class="iv-promo-art"><img loading="lazy" src="'+esc(imgUrl(p.image))+'" alt=""></div>':'')+
      '<div class="iv-promo-body"><div class="iv-promo-top">'+
        (p.eyebrow?'<span class="iv-promo-eyebrow">'+esc(p.eyebrow)+'</span>':'')+
        (clock?'<span class="iv-promo-clock">'+clock+'</span>':'')+'</div>'+
      '<h2 class="iv-promo-title">'+title+'</h2>'+
      (p.body?'<p class="iv-promo-sub">'+esc(p.body)+'</p>':'')+
      ((p.bullets||[]).length?'<ul class="iv-promo-list">'+p.bullets.map(function(b){return '<li>'+esc(b)+'</li>';}).join('')+'</ul>':'')+
      '<div class="iv-promo-actions">'+
        (p.buttonUrl?'<a class="iv-promo-cta" href="'+esc(p.buttonUrl)+'" target="_blank" rel="noopener">'+esc(p.buttonLabel||'Learn more')+'</a>':'')+
        (p.code?'<div class="iv-promo-code"><span>'+esc(p.codeLabel||'Code')+'</span><button type="button" aria-label="Copy coupon code '+esc(p.code)+'">'+esc(p.code)+' <small>Copy</small></button></div>':'')+
      '</div>'+(fine?'<p class="iv-promo-fine">'+fine+'</p>':'')+'</div></div>';
    var btn=el.querySelector('.iv-promo-code button');
    if(btn){btn.addEventListener('click',function(){var s=btn.querySelector('small');
      var done=function(){s.textContent='Copied';setTimeout(function(){s.textContent='Copy';},1600);};
      try{navigator.clipboard.writeText(p.code).then(done,done);}catch(e){done();}});}
    return el;
  }
  function after(ref,el){ref.parentNode.insertBefore(el,ref.nextSibling);}
  function mountEpisode(p){
    if(document.querySelector('.iv-promo[data-ep]')) return true;
    var c=card(p);c.setAttribute('data-ep','');
    if(isFree){
      var root=document.getElementById('iv-episode-root');if(!root) return false;
      var pc=root.querySelector('#iv-plus-card'),ch=root.querySelector('#iv-chapters-acc'),it=root.querySelector('.iv-intro-text');
      if(pc&&pc.parentNode){after(pc,c);return true;}
      if(ch&&ch.parentNode){ch.parentNode.insertBefore(c,ch);return true;}
      if(it&&it.parentNode&&root.querySelector('.iv-sticky-sidebar')){after(it,c);return true;}
      return false;
    }
    var tr=document.querySelector('.iv-plus-colmain .iv-plus-tuned-row'),sec=document.querySelector('.iv-plus-colmain .iv-plus-sections');
    if(tr&&tr.parentNode){tr.parentNode.insertBefore(c,tr);c.classList.add('iv-promo-plus');return true;}
    if(sec&&sec.parentNode){sec.parentNode.insertBefore(c,sec);c.classList.add('iv-promo-plus');return true;}
    return false;
  }
  function mountHome(p){
    if(document.querySelector('.iv-promo-slot[data-iv-promo-home]')) return true;
    var plus=document.getElementById('ivh-plus');
    if(!plus||!plus.parentNode) return false;
    var s=document.createElement('section');s.className='iv-promo-slot';s.setAttribute('data-iv-promo-slot','');s.setAttribute('data-iv-promo-home','');
    try{s.style.order=getComputedStyle(plus).order;}catch(e){}
    s.appendChild(card(p));plus.parentNode.insertBefore(s,plus);return true;
  }
  function watch(fn){
    if(fn()) return;
    var mo=new MutationObserver(function(){if(fn()) mo.disconnect();});
    mo.observe(document.documentElement,{childList:true,subtree:true});
    setTimeout(function(){mo.disconnect();},20000);
  }
  function run(p){
    if(!p||!p.active||(p.endsOn&&daysLeft(p.endsOn)<0)){hideSlots();return;}
    [].forEach.call(slots(),function(s){if(!s.querySelector('.iv-promo')){s.appendChild(card(p));}s.hidden=false;});
    if((isFree&&p.onFree!==false)||(isPlus&&p.onPlus!==false)) watch(function(){return mountEpisode(p);});
    if(isHome) watch(function(){return mountHome(p);});
  }
  function load(){
    try{var c=JSON.parse(sessionStorage.getItem('iv_promo')||'null');if(c&&Date.now()-c.t<600000){run(c.p);return;}}catch(e){}
    fetch(SRC,{cache:'no-store'}).then(function(r){return r.ok?r.json():null;}).then(function(p){
      try{sessionStorage.setItem('iv_promo',JSON.stringify({t:Date.now(),p:p}));}catch(e){}
      run(p);
    }).catch(hideSlots);
  }
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',load);}else{load();}
})();
