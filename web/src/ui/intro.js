/* OC Shimeji v4 · 開場動畫、新遊戲流程、房屋選擇與擺放、角色登場、互動式新手引導 */
(function(OC){'use strict';
const {U,Content:C,UI,Sim}=OC;const {$,esc}=U;
const CAPS=['在遙遠的海上，有一座小小的島。','島上有花、有樹、有海浪，也有星空。','這裡住著一群很有個性的夥伴——\n他們會吃飯、睡覺、交朋友，也會吵架、和好。','現在，輪到你和你的 OC 一起在這裡生活了。'];
const Intro={
 el(){return $('#intro')},
 /* ---------- 1. 歡迎畫面 + 電影式開場 ---------- */
 start(replay){const S=OC.S;this.replaying=!!replay;OC.Env.cine={h:9.2,w:'sunny'};OC.World.go('home',{instant:true});OC.R.actors=replay?OC.R.actors:[];
  const cam=OC.Cam;cam.follow=false;cam.set(2,-10,30,true);cam.goal={tx:2,tz:-10,D:30};
  const el=this.el();el.hidden=false;el.className='intro on';el.innerHTML=`<div class="in-title"><div class="logo"><b>OC</b><span>Shimeji</span></div><p>我的夥伴小島</p><button class="btn primary big" data-go>開始</button><button class="link" data-skip>${replay?'關閉':'跳過開場'}</button></div><div class="in-cap" hidden><p id="inCap"></p><div class="in-ctl"><button class="link" data-pause>暫停</button><button class="link" data-skip>跳過</button></div></div>`;
  OC.UI.blockWorld=true;$('#hud').classList.add('hide');$('#nav').classList.add('hide');
  /* 標題畫面時鏡頭緩慢飄移 */
  this.drift=true;const drift=()=>{if(!this.drift)return;cam.goal.tx=2+Math.sin(performance.now()/6000)*3;requestAnimationFrame(drift)};drift();
  el.onclick=e=>{const b=e.target.closest('button');if(!b){if(this.capOn)this.nextCap();return}if(b.hasAttribute('data-go')){this.drift=false;this.cinema()}else if(b.hasAttribute('data-skip')){this.drift=false;this.endCinema()}else if(b.hasAttribute('data-pause')){this.paused=!this.paused;b.textContent=this.paused?'繼續':'暫停'}}},
 replay(){this.start(true)},
 cinema(){const el=this.el();$('.in-title',el).classList.add('out');const cap=$('.in-cap',el);setTimeout(()=>{cap.hidden=false;this.capOn=true;this.ci=-1;this.nextCap()},500);
  /* 鏡頭從高空滑入小島 */
  OC.Cam.goal={tx:0,tz:0,D:22}},
 nextCap(){clearTimeout(this.ct);this.ci++;const p=$('#inCap');if(this.ci>=CAPS.length){this.endCinema();return}
  p.classList.remove('in');setTimeout(()=>{p.textContent=CAPS[this.ci];p.classList.add('in')},260);
  const shots=[{tx:0,tz:0,D:22},{tx:5,tz:2,D:15},{tx:-4,tz:1,D:13},{tx:0,tz:1,D:17}];OC.Cam.goal=Object.assign({},shots[this.ci]);
  const tick=()=>{if(this.paused){this.ct=setTimeout(tick,300);return}this.nextCap()};this.ct=setTimeout(tick,3600)},
 endCinema(){clearTimeout(this.ct);this.capOn=false;const el=this.el();if(this.replaying){this.finishIntro();return}OC.S.flags.introSeen=true;this.newGame()},
 finishIntro(){OC.Env.cine=null;const el=this.el();el.className='intro';setTimeout(()=>{el.hidden=true;el.innerHTML=''},400);OC.UI.blockWorld=false;$('#hud').classList.remove('hide');$('#nav').classList.remove('hide');Sim.refreshActors();const a=Sim.active();OC.Cam.focus=a;OC.Cam.follow=!!a;if(a)OC.Cam.set(a.x,a.z+.5,16)},
 /* ---------- 2. 新遊戲：選擇角色建立方式 ---------- */
 newGame(){const el=this.el();this.pick=new Set();el.innerHTML=`<div class="in-card"><h2>和誰一起生活？</h2><p class="lead">可以選示範夥伴、創造自己的 OC，或兩者都要。之後隨時能再新增、編輯或移除。</p>
  <div class="demo-row">${OC.DEMOS.map(d=>`<button class="demo" data-demo="${d.id}"><span class="hav lg">${OC.ocSVG(d)}</span><b>${esc(d.name)}</b><small>${esc(d.sub)}</small><i>✓</i></button>`).join('')}</div>
  <div class="col"><button class="btn primary" data-opt="demo" disabled>和選擇的夥伴一起開始</button><button class="btn" data-opt="create">${UI.ic('brush')}從零創造我的 OC</button><button class="btn" data-opt="both" disabled>選擇的夥伴＋創造我的 OC</button><button class="btn ghost" data-opt="import">匯入角色檔／完整備份</button></div>
  <label class="sw"><span><b>跳過新手引導</b><small>熟悉玩法的話可以直接開始</small></span><input type="checkbox" id="skipTut"><i></i></label></div>`;
  el.onclick=async e=>{const b=e.target.closest('button');if(!b)return;U.buzz(6);
   if(b.dataset.demo){const id=b.dataset.demo;this.pick.has(id)?this.pick.delete(id):this.pick.add(id);U.toggle(b,'on',this.pick.has(id));el.querySelectorAll('[data-opt=demo],[data-opt=both]').forEach(x=>x.disabled=!this.pick.size);return}
   const skip=$('#skipTut').checked;OC.S.flags.tutorialDone=skip;
   const addDemos=()=>{for(const id of this.pick){const d=OC.DEMOS.find(x=>x.id===id);if(!OC.S.chars.some(c=>c.id===id))OC.S.chars.push(OC.Chars.make({id,kind:'cat',name:d.name,look:d.look,demo:id,traits:OC.Chars.demoTraits(id)}))}};
   if(b.dataset.opt==='demo'){addDemos();this.house()}
   else if(b.dataset.opt==='create'||b.dataset.opt==='both'){if(b.dataset.opt==='both')addDemos();el.classList.add('dim');OC.Editor.create(c=>{el.classList.remove('dim');this.house()})}
   else if(b.dataset.opt==='import'){const t=await OC.Pages.pickFile('.json,application/json');if(!t)return;try{const o=JSON.parse(t);if(o.kind==='backup'){await OC.Store.importAll(t);return}const c=await OC.Store.importChar(t);OC.S.chars.push(OC.Chars.ensure(c));UI.toast(`匯入了 ${c.name}`,'check');this.house()}catch(err){UI.toast('檔案格式不正確','warn')}}}},
 /* ---------- 3. 選房子 ---------- */
 house(again){const el=this.el();el.hidden=false;el.className='intro on';OC.UI.blockWorld=true;$('#hud').classList.add('hide');$('#nav').classList.add('hide');
  el.innerHTML=`<div class="in-card"><h2>${again?'換一棟房子':'選一棟你們的家'}</h2><p class="lead">房子會放在家園小島上，裡面已經有床、餐桌、小廚房、書櫃和沙發。</p><div class="houses">${C.HOUSES.map((h,i)=>`<button class="hs ${i===0?'on':''}" data-h="${h.id}"><canvas width="220" height="200" data-hc="${h.id}"></canvas><b>${esc(h.t)}</b><small>${esc(h.d)}</small></button>`).join('')}</div>
   <button class="btn primary big" data-place>放到小島上</button>${again?'<button class="link" data-cancel>取消</button>':OC.S.flags.started?'<button class="link" data-cancel>稍後再選</button>':''}</div>`;
  this.style=C.HOUSES[0].id;
  el.querySelectorAll('[data-hc]').forEach(cv=>{const s=OC.Sprites.house(cv.dataset.hc);const g=cv.getContext('2d');const k=Math.min(cv.width/s.cv.width,cv.height/s.cv.height);g.drawImage(s.cv,(cv.width-s.cv.width*k)/2,(cv.height-s.cv.height*k),s.cv.width*k,s.cv.height*k)});
  el.onclick=e=>{const b=e.target.closest('button');if(!b)return;U.buzz(6);if(b.dataset.h){this.style=b.dataset.h;el.querySelectorAll('[data-h]').forEach(x=>U.toggle(x,'on',x===b))}else if(b.hasAttribute('data-place'))this.place();else if(b.hasAttribute('data-cancel'))this.finishIntro()}},
 houseOnly(again){this.house(again)},
 /* ---------- 4. 在小島上擺放房子 ---------- */
 place(){const el=this.el();el.className='intro place';el.innerHTML=`<div class="pl-tip"><b>拖曳房子到喜歡的位置</b><small>綠色代表可以放置</small></div><div class="pl-bar"><button class="btn ghost" data-back>返回</button><button class="btn primary" data-ok>就決定是這裡！</button></div>`;
  OC.World.go('home',{instant:true});const sc=OC.Scenes.get('home');const H=OC.S.world.house;const old=H&&H.placed?{x:H.x,z:H.z}:null;
  OC.S.world.house=null;OC.Scenes.syncHouse();OC.R.invalidate();
  const pos={x:old?old.x:sc.houseDefault.x,z:old?old.z:sc.houseDefault.z};OC.Cam.follow=false;OC.Cam.set(pos.x,pos.z+1.5,17);
  const spr=OC.Sprites.house(this.style);const cam=OC.R.cam;let ok=OC.Scenes.canPlaceHouse(pos.x,pos.z),drag=null;
  OC.R.ghost=ctx=>{const q=cam.p(pos.x,0,pos.z);const s=q.s;const w=spr.cv.width/OC.Sprites.PPM*s,h=spr.cv.height/OC.Sprites.PPM*s;
   ctx.save();ctx.globalAlpha=.25;ctx.fillStyle=ok?'#7FD08A':'#E57B72';ctx.beginPath();const a=cam.p(pos.x-1.8,0,pos.z+.3),b=cam.p(pos.x+1.8,0,pos.z+.3),c=cam.p(pos.x+1.8,0,pos.z-2.7),d=cam.p(pos.x-1.8,0,pos.z-2.7);ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(c.x,c.y);ctx.lineTo(d.x,d.y);ctx.fill();
   ctx.globalAlpha=.88+Math.sin(performance.now()/260)*.06;ctx.drawImage(spr.cv,q.x-w*spr.ax,q.y-h*spr.ay-(drag?8:0),w,h);ctx.restore()};
  OC.UI.blockWorld=false;OC.UI.placing={down:p=>{drag={x:p.x,y:p.y,ox:pos.x,oz:pos.z,w0:cam.unproject(p.x,p.y)}},move:p=>{if(!drag)return;const w=cam.unproject(p.x,p.y);pos.x=drag.ox+(w.x-drag.w0.x);pos.z=drag.oz+(w.z-drag.w0.z);ok=OC.Scenes.canPlaceHouse(pos.x,pos.z)},up:()=>{drag=null;U.buzz(6)},cancel:()=>{}};
  el.onclick=e=>{const b=e.target.closest('button');if(!b)return;
   if(b.hasAttribute('data-back')){OC.UI.placing=null;OC.R.ghost=null;if(old){OC.S.world.house=Object.assign({},H);OC.Scenes.syncHouse();OC.R.invalidate()}this.house(!!old);return}
   if(b.hasAttribute('data-ok')){if(!ok){UI.toast('這裡放不下，換個平坦的草地吧','warn');return}OC.UI.placing=null;OC.R.ghost=null;this.build(pos.x,pos.z)}}},
 build(x,z){const W=OC.S.world;W.house={style:this.style,x:+x.toFixed(2),z:+z.toFixed(2),placed:true};if(!W.houseFurn)W.houseFurn=C.BASE_FURN.map(f=>({id:U.uid('f'),k:f.k,x:f.x,z:f.z}));
  OC.S.flags.houseChosen=true;OC.Scenes.syncHouse();OC.Scenes.syncFurn();OC.R.invalidate();OC.Store.flush();
  /* 落地演出：房子從上方輕輕落下、擠壓、揚起塵土與光點 */
  const o=OC.Scenes.get('home').objs.find(o=>o.type==='house');if(o&&!OC.Store.perf().reduce){o.y=4;const t0=performance.now();const fall=t=>{const k=Math.min(1,(t-t0)/700);o.y=4*(1-U.ease.in(k));o.s=1;if(k<1)requestAnimationFrame(fall);else{o.y=0;OC.R.cam.shake=.15;OC.Fx.dust(x-1,z,6);OC.Fx.dust(x+1,z,6);OC.Fx.sparkle(x,1.5,z,16);U.buzz(30);const t1=performance.now();const bounce=t=>{const k2=Math.min(1,(t-t1)/380);o.s=1+Math.sin(k2*Math.PI)*.06*(1-k2);if(k2<1)requestAnimationFrame(bounce);else o.s=1};requestAnimationFrame(bounce)}};requestAnimationFrame(fall)}
  setTimeout(()=>{if(OC.S.flags.started){this.finishIntro();UI.toast('新家完成了！點房子可以進屋','check');Sim.sync()}else this.begin()},1500)},
 /* ---------- 5. 正式開始：角色從家門走出來 ---------- */
 begin(){const S=OC.S;S.flags.started=true;if(!S.chars.length){S.chars.push(OC.Chars.make({id:'mochi',kind:'cat',name:OC.DEMOS[0].name,look:OC.DEMOS[0].look,demo:'mochi',traits:OC.Chars.demoTraits('mochi')}))}
  S.activeId=S.activeId&&S.chars.some(c=>c.id===S.activeId)?S.activeId:S.chars[0].id;
  /* 新手物資 */
  for(const [id,n] of [['apple',3],['cookie',2],['cocoa',2],['soap',1],['yarn',1],['medicine',1],['seed',2],['bouquet',1]])OC.Items.add(id,n);
  for(const c of S.chars){c.loc='home';c.x=null}
  OC.Quests.ensure();OC.Store.flush();this.finishIntro();this.arrive(S.chars.map(c=>c.id),true)},
 arrive(ids,first){Sim.sync();const sc=OC.Scenes.get('home');const door=sc.spots.door||{x:0,z:0};if(OC.R.sc.id!=='home')OC.World.go('home',{instant:true});
  OC.Cam.follow=false;OC.Cam.set(door.x,door.z+1.2,15);
  ids.forEach((id,i)=>{const a=Sim.get(id);if(!a)return;a.c.loc='home';a.x=door.x;a.z=door.z-.2;a.alpha=0;a.task={def:{id:'_arrive',pose:'stand',gain:{},dur:[9,9]},lock:1,phase:'hold'};
   setTimeout(()=>{a.alpha=1;a.fadeIn=0;const p=sc.near(door.x+(i-(ids.length-1)/2)*1.1,door.z+1.6,.6);a.goal={x:p.x,z:p.z};a.pose='walk';
    setTimeout(()=>{/* 觀察新環境 → 依個性打招呼 */a.lookAt=-1;setTimeout(()=>{a.lookAt=1},700);setTimeout(()=>{a.lookAt=null;a.facing=1;const c=a.c;const greet=c.quirks.greet;
      if(greet==='hop'||OC.Chars.has(c,'cheerful')||OC.Chars.has(c,'hot'))a.hop(2.4);else if(greet==='bow')a.squash(.84);else if(greet==='peek'||OC.Chars.has(c,'shy')){a.blushK=2.5;a.feel('blush')}else a.feel('heart');
      a.say(OC.Chars.line(c,'greet')||(OC.Chars.has(c,'shy')?'那、那個…你好…':OC.Chars.has(c,'tsun')?'哼，這裡還不錯嘛。':OC.Chars.has(c,'sleepy')?'呼啊…這就是新家嗎…':`嗨！我是${c.name}，請多指教！`),{life:3.4});a.task=null;
      OC.Sim.remember(c,'arrive','來到這座小島',.8,ids.filter(x=>x!==id),'home')},1500)},1200)},600+i*1300)});
  setTimeout(()=>{const a=Sim.get(ids[0]);OC.Cam.focus=a;OC.Cam.follow=true;UI.followChanged();if(first&&!OC.S.flags.tutorialDone)OC.Tutorial.start()},1800+ids.length*1300)},
 /* 屋內家具移動 */
 moveFurn(fid){const F=(OC.S.world.houseFurn||[]).find(f=>f.id===fid);if(!F)return;const cam=OC.R.cam;const el=this.el();el.hidden=false;el.className='intro place';el.innerHTML=`<div class="pl-tip"><b>拖曳家具到新位置</b></div><div class="pl-bar"><button class="btn ghost" data-store>收進背包</button><button class="btn primary" data-ok>完成</button></div>`;
  let drag=null;OC.UI.placing={down:p=>{drag={w0:cam.unproject(p.x,p.y),x:F.x,z:F.z}},move:p=>{if(!drag)return;const w=cam.unproject(p.x,p.y);F.x=U.clamp(drag.x+w.x-drag.w0.x,-3.4,3.4);F.z=U.clamp(drag.z+w.z-drag.w0.z,-2.3,2.2);OC.Scenes.syncFurn();OC.R.invalidate()},up:()=>{drag=null},cancel:()=>{}};
  el.onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.hasAttribute('data-store')){const it=C.ITEMS.find(i=>i.furn===F.k);OC.S.world.houseFurn=OC.S.world.houseFurn.filter(f=>f!==F);if(it)OC.Items.add(it.id,1);OC.Scenes.syncFurn();OC.R.invalidate()}
   OC.UI.placing=null;OC.Store.flush();el.className='intro';el.hidden=true;el.innerHTML=''}}};

/* ================= 互動式新手引導（融入遊戲，不一次塞滿說明） ================= */
const STEPS=[
 {t:'點一下夥伴',d:'夥伴會跟你打招呼，還會跳出可以做的事。',ev:'tap',at:'actor'},
 {t:'在夥伴身上上下滑動',d:'就像真的在摸頭一樣，來回滑幾次——夥伴會很開心！',ev:'pet',at:'actor'},
 {t:'打開右側的背包',d:'點一下背包把手，然後把 🍎 蘋果「拖」到夥伴身上。',ev:'feed',at:'#qbag'},
 {t:'移動與縮放鏡頭',d:'單指拖曳畫面移動，雙指縮放。按右下角「跟隨」可以回到夥伴身邊。',ev:'pan',at:null,next:1},
 {t:'看看夥伴的狀態',d:'點左上角的頭像，就能看到心情、需求和願望。',ev:'qs',at:'#hChar'},
 {t:'你的房子',d:'點房子可以進屋。夥伴會在裡面睡覺、做飯、看書。',ev:'house',at:null,next:1},
 {t:'到處去看看',d:'點下方「地圖」可以去廣場、海灘和森林。夥伴們也會自己出門喔！',ev:'map',at:'[data-p=map]',next:1}];
const Tutorial={i:-1,start(){this.i=-1;this.off&&this.off();this.off=U.on('tut',k=>{const s=STEPS[this.i];if(s&&s.ev===k)setTimeout(()=>this.next(),600)});this.next()},
 next(){this.i++;const host=$('#coach');if(this.i>=STEPS.length){host.className='coach';host.innerHTML='';OC.S.flags.tutorialDone=true;OC.Items.coins(100);UI.celebrate(OC.Sim.active()?.c,'新手引導完成！+100 星幣','歡迎來到小島');OC.Store.save();this.off&&this.off();return}
  const s=STEPS[this.i];host.innerHTML=`<div class="co-c"><small>${this.i+1} / ${STEPS.length}</small><b>${esc(s.t)}</b><p>${esc(s.d)}</p><div class="row end">${s.next?'<button class="btn primary" data-n>下一步</button>':''}<button class="link" data-x>跳過引導</button></div></div><i class="co-ring" hidden></i>`;host.className='coach on';
  host.onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.hasAttribute('data-n'))this.next();else{this.i=STEPS.length-1;this.next()}};
  if(s.at==='#qbag')OC.UI.bag.open(false);this.ring(s.at)},
 ring(at){const r=$('.co-ring','#coach'.length?$('#coach'):document);if(!r)return;clearInterval(this.rt);if(!at){r.hidden=true;return}
  const place=()=>{let x,y,w,h;if(at==='actor'){const a=OC.Sim.active();if(!a||!a.ss){r.hidden=true;return}w=a.ss*.9;h=a.ss*1.15;x=a.sx-w/2;y=a.sy-h}else{const n=$(at);if(!n){r.hidden=true;return}const b=n.getBoundingClientRect();x=b.left-6;y=b.top-6;w=b.width+12;h=b.height+12}
   r.hidden=false;r.style.transform=`translate(${x|0}px,${y|0}px)`;r.style.width=(w|0)+'px';r.style.height=(h|0)+'px'};place();this.rt=setInterval(place,250)}};
OC.Intro=Intro;OC.Tutorial=Tutorial;
})(window.OC);
