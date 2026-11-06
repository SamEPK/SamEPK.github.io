(function(){
"use strict";
var P=window.PORTFOLIO.projects, SK=window.PORTFOLIO.skills;
var ALL=[];Object.keys(SK).forEach(function(k){ALL=ALL.concat(SK[k])});

function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function link(p){return p.r?'<a class="repo" href="'+p.r+'">Voir le code sur GitHub</a>':p.l?'<a class="repo" href="'+p.l+'">Voir le site en ligne</a>':'<span class="repo muted">Code privé, détails sur demande</span>'}

/* Reading mode */
document.getElementById('plist').innerHTML=P.map(function(p){return '<li><span class="k">'+esc(p.k)+'</span><h3>'+esc(p.n)+'</h3><span class="t">'+esc(p.t)+'</span><p>'+esc(p.d)+'</p><ul class="gear">'+p.s.map(function(x){return '<li>'+esc(x)+'</li>'}).join('')+'</ul>'+link(p)+'</li>'}).join('');
document.getElementById('pcount').textContent=P.length+' projets';
document.getElementById('skills').innerHTML=Object.keys(SK).map(function(k){return '<div><h3>'+esc(k)+'</h3><ul class="chips">'+SK[k].map(function(x){return '<li data-sk="'+esc(x)+'">'+esc(x)+'</li>'}).join('')+'</ul></div>'}).join('')+'<p class="note">Les compétences ramassées dans le jeu s\'allument ici.</p>';
function icount(n){document.getElementById('icount').textContent=n+' / '+ALL.length+' ramassées'}
icount(0);

/* Logo letters */
var logo=document.getElementById('logo'), idx=0;
logo.innerHTML=['Samuel','Atlani'].map(function(w){return '<span class="row" aria-hidden="true">'+w.split('').map(function(c){return '<span class="ch" style="--i:'+(idx++)+'">'+c+'</span>'}).join('')+'</span>'}).join('');

/* ---------- Game ---------- */
var game=document.getElementById('game'), cv=document.getElementById('cv'), ctx=cv.getContext('2d');
var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
var touchUI=matchMedia('(hover:none) and (pointer:coarse)').matches;
var W=0,H=0,DPR=1,GROUND=0;
function size(){DPR=Math.min(2,window.devicePixelRatio||1);W=game.clientWidth;H=game.clientHeight;cv.width=W*DPR;cv.height=H*DPR;ctx.setTransform(DPR,0,0,DPR,0,0);GROUND=H-78;}
size(); addEventListener('resize',size);

var C={void:'#0B161C',bone:'#EDE6D4',ash:'#9FB0B5',gold:'#E2B95A',jade:'#6FC9A9',line:'#28404C'};
var FD='"Big Shoulders Display","Arial Narrow",Impact,sans-serif', FH='"Barlow Condensed","Arial Narrow",sans-serif';

/* World layout */
var signs=[{x:620,y:'PRO',t:'Groupe Astek · 2024 – 2026'},{x:2150,y:'ÉQUIPE',t:'Projets ESGI'},{x:5780,y:'SOLO',t:'Projet perso'},{x:6720,y:'2026',t:'Diplômé · Disponible'}];
var portals=P.map(function(p,i){return {x:1050+i*560+(i>=2?300:0)+(i>=8?300:0),p:p,i:i}});
var WORLD=portals[portals.length-1].x+1500;
var gate={x:WORLD-520};
var orbs=ALL.map(function(name,i){var seg=(WORLD-1200)/ALL.length;return {x:760+i*seg+((i*137)%90),h:(i%3===0)?150:(i%3===1?62:100),name:name,got:false,ph:i*1.7}});
document.getElementById('tot').textContent=orbs.length;

/* Map markers */
var map=document.getElementById('map');
portals.forEach(function(o){var e=document.createElement('em');e.style.left=(o.x/WORLD*100)+'%';map.appendChild(e)});

/* Background layers (generated once, deterministic) */
function rnd(seed){return function(){seed=(seed*16807)%2147483647;return (seed-1)/2147483646}}
var r1=rnd(7),r2=rnd(42),far=[],mid=[],stars=[],flies=[];
for(var i=0;i<60;i++){far.push({x:i*180+r1()*80,h:80+r1()*160,w:120+r1()*160})}
for(i=0;i<90;i++){mid.push({x:i*140+r2()*60,h:60+r2()*180,w:46+r2()*70,win:r2()})}
for(i=0;i<120;i++){stars.push({x:r1()*4000,y:r1(),r:r1()*1.3+.3,t:r1()*6})}
for(i=0;i<40;i++){flies.push({x:r2()*WORLD,y:r2(),s:r2()*2+1,ph:r2()*6})}

/* Player */
var pl={x:200,y:0,vx:0,vy:0,face:1,ground:true,run:0}, cam=0;
var scarf=[];for(i=0;i<9;i++)scarf.push({x:pl.x,y:GROUND-60,px:pl.x,py:GROUND-60});
var keys={},playing=false,paused=false,near=null,got=0,t0=performance.now(),T=0;

function drawBG(t){
  var g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#08121A');g.addColorStop(.6,'#13303A');g.addColorStop(1,'#1D3B3F');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  // moon
  var mx=W*.78-cam*.03, my=H*.22;
  var mg=ctx.createRadialGradient(mx,my,10,mx,my,140);mg.addColorStop(0,'rgba(237,230,212,.22)');mg.addColorStop(1,'rgba(237,230,212,0)');
  ctx.fillStyle=mg;ctx.beginPath();ctx.arc(mx,my,140,0,7);ctx.fill();
  ctx.fillStyle='#EDE6D4';ctx.beginPath();ctx.arc(mx,my,34,0,7);ctx.fill();
  ctx.fillStyle='#13303A';ctx.beginPath();ctx.arc(mx+12,my-8,30,0,7);ctx.fill();
  // stars
  stars.forEach(function(s){var x=((s.x-cam*.05)%4000+4000)%4000;if(x>W)return;ctx.globalAlpha=.35+.35*Math.sin(t*1.5+s.t);ctx.fillStyle='#EDE6D4';ctx.fillRect(x,s.y*H*.55,s.r,s.r)});
  ctx.globalAlpha=1;
  // far ridge
  ctx.fillStyle='#16313A';ctx.beginPath();ctx.moveTo(0,H);
  far.forEach(function(m){var x=m.x-cam*.2;if(x<-300||x>W+300)return;ctx.lineTo(x-m.w/2,GROUND);ctx.lineTo(x,GROUND-m.h-60);ctx.lineTo(x+m.w/2,GROUND)});
  ctx.lineTo(W,H);ctx.fill();
  // mid towers (city)
  mid.forEach(function(b){var x=b.x-cam*.45;if(x<-120||x>W+120)return;ctx.fillStyle='#0F242C';ctx.fillRect(x,GROUND-b.h,b.w,b.h+4);
    if(b.win>.35){ctx.fillStyle='rgba(226,185,90,.55)';for(var yy=GROUND-b.h+14;yy<GROUND-10;yy+=18){for(var xx=x+8;xx<x+b.w-8;xx+=12){if(((xx*7+yy*3)|0)%5===0)ctx.fillRect(xx,yy,4,6)}}}});
  // ground
  ctx.fillStyle='#0B161C';ctx.fillRect(0,GROUND,W,H-GROUND);
  ctx.fillStyle='#E2B95A';ctx.fillRect(0,GROUND,W,2);
  ctx.strokeStyle='rgba(237,230,212,.08)';ctx.lineWidth=1;
  for(var gx=-(cam%60);gx<W;gx+=60){ctx.beginPath();ctx.moveTo(gx,GROUND+2);ctx.lineTo(gx-30,H);ctx.stroke()}
}
function wx(x){return x-cam}
function drawSign(s){
  var x=wx(s.x);if(x<-200||x>W+200)return;
  ctx.fillStyle=C.line;ctx.fillRect(x-2,GROUND-110,4,110);
  ctx.save();ctx.translate(x,GROUND-120);
  ctx.font='900 34px '+FD;var pw=Math.max(110,ctx.measureText(s.y).width+28);
  ctx.fillStyle=C.bone;ctx.beginPath();ctx.moveTo(-6,-46);ctx.lineTo(pw,-46);ctx.lineTo(pw+14,-23);ctx.lineTo(pw,0);ctx.lineTo(-6,0);ctx.closePath();ctx.fill();
  ctx.fillStyle=C.void;ctx.textBaseline='middle';ctx.fillText(s.y,4,-22);
  ctx.restore();
  ctx.fillStyle=C.ash;ctx.font='500 15px '+FH;ctx.textBaseline='alphabetic';ctx.fillText(s.t.toUpperCase(),x-6,GROUND-128-54);
}
function drawPortal(o,t){
  var x=wx(o.x);if(x<-220||x>W+220)return;
  var isNear=near===o, glow=isNear?1:.35+.15*Math.sin(t*2+o.i);
  var h=Math.max(120,Math.min(190,GROUND-150)),w=120,top=GROUND-h;
  // light pillar
  var lg=ctx.createLinearGradient(0,top,0,GROUND);lg.addColorStop(0,'rgba(226,185,90,0)');lg.addColorStop(1,'rgba(226,185,90,'+(.28*glow)+')');
  ctx.fillStyle=lg;ctx.fillRect(x-w/2+14,top-60,w-28,h+60);
  // frame
  ctx.strokeStyle=isNear?C.gold:'rgba(226,185,90,.75)';ctx.lineWidth=isNear?5:3;
  ctx.beginPath();ctx.moveTo(x-w/2,GROUND);ctx.lineTo(x-w/2,top+w/2);ctx.arc(x,top+w/2,w/2,Math.PI,0);ctx.lineTo(x+w/2,GROUND);ctx.stroke();
  // inner swirl
  ctx.save();ctx.beginPath();ctx.moveTo(x-w/2+8,GROUND);ctx.lineTo(x-w/2+8,top+w/2);ctx.arc(x,top+w/2,w/2-8,Math.PI,0);ctx.lineTo(x+w/2-8,GROUND);ctx.closePath();ctx.clip();
  for(var k=0;k<6;k++){ctx.strokeStyle='rgba(111,201,169,'+(.12+.1*glow)+')';ctx.lineWidth=2;ctx.beginPath();
    var rr=(k*14+t*30*(reduce?0:1))%84;ctx.ellipse(x,top+h*.55,rr*.7,rr,0,0,7);ctx.stroke()}
  ctx.restore();
  // label
  ctx.textAlign='center';ctx.fillStyle=isNear?C.gold:C.bone;ctx.font='900 '+(isNear?34:28)+'px '+FD;ctx.fillText(o.p.n.toUpperCase(),x,top-18);
  ctx.fillStyle=C.ash;ctx.font='500 14px '+FH;ctx.fillText((o.p.k+' · '+o.p.t).toUpperCase(),x,top-56+ (isNear?-4:0));
  ctx.textAlign='left';
}
function drawGate(t){
  var x=wx(gate.x);if(x<-300||x>W+300)return;
  var isNear=near===gate;
  ctx.fillStyle=C.line;ctx.fillRect(x-4,GROUND-230,8,230);
  var wave=reduce?0:Math.sin(t*3);
  ctx.fillStyle=isNear?C.gold:C.jade;ctx.beginPath();ctx.moveTo(x+4,GROUND-228);
  for(var k=0;k<=10;k++){ctx.lineTo(x+4+k*12,GROUND-228+Math.sin(k*.7+t*4)*4*(reduce?0:1))}
  for(k=10;k>=0;k--){ctx.lineTo(x+4+k*12,GROUND-176+Math.sin(k*.7+t*4)*4*(reduce?0:1))}
  ctx.fill();
  ctx.textAlign='center';ctx.fillStyle=C.bone;ctx.font='900 40px '+FD;ctx.fillText('ME RECRUTER',x+40,GROUND-250+wave*2);ctx.textAlign='left';
}
function drawOrb(o,t){
  if(o.got)return;var x=wx(o.x);if(x<-40||x>W+40)return;
  var y=GROUND-o.h+Math.sin(t*2.4+o.ph)*6*(reduce?0:1);
  var g=ctx.createRadialGradient(x,y,2,x,y,26);g.addColorStop(0,'rgba(226,185,90,.55)');g.addColorStop(1,'rgba(226,185,90,0)');
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,26,0,7);ctx.fill();
  ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI/4+(reduce?0:t));ctx.fillStyle=C.gold;ctx.fillRect(-7,-7,14,14);ctx.restore();
}
function drawFlies(t){
  flies.forEach(function(f){var x=wx(f.x)+Math.sin(t*.7+f.ph)*30;if(x<-10||x>W+10)return;var y=GROUND-40-f.y*(GROUND*.6)+Math.cos(t*.9+f.ph)*14;
    ctx.globalAlpha=.4+.4*Math.sin(t*3+f.ph);ctx.fillStyle=C.jade;ctx.beginPath();ctx.arc(x,y,f.s,0,7);ctx.fill()});ctx.globalAlpha=1;
}
function drawPlayer(t){
  var x=wx(pl.x), y=pl.y, f=pl.face, sw=pl.ground?Math.sin(pl.run)*(Math.abs(pl.vx)>20?1:0):0;
  // shadow
  ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.ellipse(x,GROUND+3,18*(1-(GROUND-y)/400),4,0,0,7);ctx.fill();
  // scarf
  ctx.strokeStyle=C.gold;ctx.lineWidth=4.5;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(wx(scarf[0].x),scarf[0].y);
  for(var k=1;k<scarf.length;k++){ctx.lineTo(wx(scarf[k].x),scarf[k].y)}ctx.stroke();
  ctx.strokeStyle=C.bone;ctx.lineWidth=5;
  // legs
  var hip={x:x,y:y-34};
  [[1,0],[-1,Math.PI]].forEach(function(L){var a=pl.ground?Math.sin(pl.run+L[1])*.7*(Math.abs(pl.vx)>20?1:0):(L[0]>0?.5:-.3);
    var kx=hip.x+Math.sin(a)*14*f, ky=hip.y+14, fx=kx+Math.sin(a*.6)*10*f, fy=y-2;
    if(!pl.ground){ky=hip.y+12;fy=y-8}
    ctx.beginPath();ctx.moveTo(hip.x,hip.y);ctx.lineTo(kx,ky);ctx.lineTo(fx,fy);ctx.stroke()});
  // body
  var lean=Math.min(.25,Math.abs(pl.vx)/1400)*f;
  ctx.save();ctx.translate(hip.x,hip.y);ctx.rotate(lean);
  ctx.fillStyle=C.bone;ctx.beginPath();ctx.moveTo(-9,0);ctx.lineTo(9,0);ctx.lineTo(11,-30);ctx.lineTo(-11,-30);ctx.closePath();ctx.fill();
  // arms
  ctx.strokeStyle=C.bone;ctx.lineWidth=4.5;
  [1,-1].forEach(function(s){var a=pl.ground?Math.sin(pl.run+(s>0?Math.PI:0))*.8*(Math.abs(pl.vx)>20?1:.1):-1.2*s*.5;
    ctx.beginPath();ctx.moveTo(0,-26);ctx.lineTo(Math.sin(a)*12*f,-26+12);ctx.lineTo(Math.sin(a)*12*f+6*f,-26+22);ctx.stroke()});
  // head
  ctx.beginPath();ctx.arc(0,-42,10,0,7);ctx.fill();
  ctx.fillStyle=C.void;ctx.fillRect(f>0?2:-8,-45,6,3);
  ctx.restore();
}
function updateScarf(dt){
  var ax=pl.x-4*pl.face, ay=pl.y-64;
  scarf[0].x=ax;scarf[0].y=ay;
  var wind=reduce?0:Math.sin(T*1.7)*120;
  var push=-pl.vx*1.6;
  for(var k=1;k<scarf.length;k++){var s=scarf[k],vx=(s.x-s.px)*.94,vy=(s.y-s.py)*.94;s.px=s.x;s.py=s.y;s.x+=vx+(push+wind)*dt*dt;s.y+=vy+1300*dt*dt;}
  for(var it=0;it<4;it++){for(k=1;k<scarf.length;k++){var a=scarf[k-1],b=scarf[k],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1,diff=(d-7)/d;
    if(k===1){b.x-=dx*diff;b.y-=dy*diff}else{a.x+=dx*diff*.5;a.y+=dy*diff*.5;b.x-=dx*diff*.5;b.y-=dy*diff*.5}}scarf[0].x=ax;scarf[0].y=ay;}
}

var promptEl=document.getElementById('prompt'), ptxt=document.getElementById('ptxt'), toast=document.getElementById('toast'), gotEl=document.getElementById('got'), dot=document.getElementById('dot');
function say(s){toast.textContent=s;toast.classList.remove('show');void toast.offsetWidth;toast.classList.add('show')}

function step(dt){
  var dir=(keys.r?1:0)-(keys.l?1:0);
  var target=dir*380;pl.vx+=(target-pl.vx)*Math.min(1,dt*(pl.ground?12:5));
  if(dir)pl.face=dir;
  if(keys.j&&pl.ground){pl.vy=-760;pl.ground=false;keys.j=false}
  pl.vy+=2300*dt;pl.x+=pl.vx*dt;pl.y+=pl.vy*dt;
  if(pl.y>=GROUND){pl.y=GROUND;pl.vy=0;pl.ground=true}
  pl.x=Math.max(60,Math.min(WORLD-60,pl.x));
  pl.run+=Math.abs(pl.vx)*dt*.045;
  var want=pl.x-W*.38+pl.face*40;cam+=(want-cam)*Math.min(1,dt*4);cam=Math.max(0,Math.min(WORLD-W,cam));
  // orbs
  orbs.forEach(function(o){if(o.got)return;var oy=GROUND-o.h;if(Math.abs(o.x-pl.x)<26&&Math.abs(oy-(pl.y-30))<44){o.got=true;got++;gotEl.textContent=got;say('+ '+o.name);var ch=document.querySelector('.chips li[data-sk="'+o.name+'"]');if(ch)ch.classList.add('on');icount(got)}});
  // nearest interactive
  near=null;portals.forEach(function(o){if(Math.abs(o.x-pl.x)<70)near=o});if(Math.abs(gate.x+40-pl.x)<90)near=gate;
  dot.style.left=(pl.x/WORLD*100)+'%';
}
function placePrompt(){
  if(!near||paused||!playing){promptEl.hidden=true;return}
  promptEl.hidden=false;var x=wx(near===gate?gate.x+40:near.x);
  ptxt.textContent=near===gate?'Me contacter':'Ouvrir '+near.p.n;
  var ph=Math.max(120,Math.min(190,GROUND-150));
  promptEl.style.left=Math.max(110,Math.min(W-110,x))+'px';promptEl.style.top=Math.max(64,GROUND-(near===gate?290:ph+110))+'px';
}
function frame(now){
  var dt=Math.min(.033,(now-t0)/1000);t0=now;T+=dt;
  if(playing&&!paused)step(dt);
  updateScarf(dt);
  drawBG(T);signs.forEach(drawSign);portals.forEach(function(o){drawPortal(o,T)});drawGate(T);orbs.forEach(function(o){drawOrb(o,T)});drawPlayer(T);drawFlies(T);
  placePrompt();
  requestAnimationFrame(frame);
}
pl.y=GROUND;
(document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve()).then(function(){requestAnimationFrame(function(n){t0=n;requestAnimationFrame(frame)})});

/* Card */
var card=document.getElementById('card'), cbody=document.getElementById('cbody'), lastFocus=null;
function openCard(o){
  paused=true;keys.l=keys.r=false;lastFocus=document.activeElement;
  if(o===gate){
    cbody.innerHTML='<button class="close" id="cclose" type="button"><span class="key kbd">Échap</span> Fermer</button><h2 id="ctitle">Me recruter</h2><div class="tags"><span class="tag hi">Disponible immédiatement</span><span class="tag">CDI ou CDD</span><span class="tag">Île-de-France</span></div><p>Merci d\'avoir joué jusqu\'au bout. Tu as récupéré '+got+' compétence'+(got>1?'s':'')+' sur '+orbs.length+'.</p><h3>Écris-moi</h3><div class="mail"><span id="cmail">samuel.atlani1@gmail.com</span><button class="btn" id="ccopy" type="button">Copier l\'adresse</button></div><div class="links"><a href="https://www.linkedin.com/in/samuel-atlani-118638210">LinkedIn</a><a href="https://github.com/SamEPK">GitHub</a></div>';
    bindCopy(document.getElementById('ccopy'),document.getElementById('cmail'));
  } else {
    var p=o.p;
    cbody.innerHTML='<button class="close" id="cclose" type="button"><span class="key kbd">Échap</span> Fermer</button><h2 id="ctitle">'+esc(p.n)+'</h2><div class="tags"><span class="tag hi">'+esc(p.k)+'</span><span class="tag">'+esc(p.t)+'</span></div><p>'+esc(p.d)+'</p><h3>Ce que fait le projet</h3><ul class="obj">'+p.o.map(function(x){return '<li>'+esc(x)+'</li>'}).join('')+'</ul><h3>Stack</h3><ul class="gear">'+p.s.map(function(x){return '<li>'+esc(x)+'</li>'}).join('')+'</ul>'+link(p);
  }
  card.hidden=false;document.getElementById('cclose').addEventListener('click',closeCard);document.getElementById('cclose').focus();
}
function closeCard(){card.hidden=true;paused=false;(lastFocus&&lastFocus.focus)?lastFocus.focus():game.focus()}
card.addEventListener('click',function(e){if(e.target===card)closeCard()});
promptEl.addEventListener('click',function(){if(near)openCard(near)});

/* Start */
var intro=document.getElementById('intro');
function start(){if(playing)return;playing=true;intro.classList.add('gone');game.setAttribute('tabindex','-1');game.focus({preventScroll:true});}
document.getElementById('go').addEventListener('click',start);

/* Input */
var map2={ArrowLeft:'l',KeyA:'l',KeyQ:'l',ArrowRight:'r',KeyD:'r'};
function inGameView(){var r=game.getBoundingClientRect();return r.bottom>80&&r.top<innerHeight*.6}
addEventListener('keydown',function(e){
  if(!card.hidden){if(e.key==='Escape'){e.preventDefault();closeCard()}return}
  var tag=(document.activeElement&&document.activeElement.tagName)||'';
  if(!playing){if((e.key==='Enter'||e.key===' ')&&inGameView()&&tag!=='A'&&tag!=='BUTTON'){e.preventDefault();start()}return}
  if(!inGameView())return;
  var k=map2[e.code];if(k){keys[k]=true;e.preventDefault();return}
  if(e.code==='Space'||e.code==='ArrowUp'||e.code==='KeyW'||e.code==='KeyZ'){if(tag==='BUTTON'||tag==='A')return;keys.j=true;e.preventDefault();return}
  if((e.code==='KeyE'||e.key==='Enter')&&near&&tag!=='A'){e.preventDefault();openCard(near)}
});
addEventListener('keyup',function(e){var k=map2[e.code];if(k)keys[k]=false});
addEventListener('blur',function(){keys.l=keys.r=false});
function hold(id,k){var b=document.getElementById(id);
  b.addEventListener('pointerdown',function(e){e.preventDefault();start();if(k==='j')keys.j=true;else keys[k]=true;b.setPointerCapture&&b.setPointerCapture(e.pointerId)});
  ['pointerup','pointercancel','pointerleave'].forEach(function(ev){b.addEventListener(ev,function(){if(k!=='j')keys[k]=false})});}
hold('bl','l');hold('br','r');hold('bj','j');

/* Copy */
function bindCopy(btn,el){btn.addEventListener('click',function(){
  function sel(){var r=document.createRange();r.selectNodeContents(el);var s=getSelection();s.removeAllRanges();s.addRange(r);btn.textContent='Sélectionnée, fais Ctrl+C'}
  try{navigator.clipboard.writeText(el.textContent).then(function(){btn.textContent='Adresse copiée'},sel)}catch(e){sel()}})}
bindCopy(document.getElementById('copy'),document.getElementById('email'));
})();
