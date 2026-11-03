/* OC Shimeji v4 · 主迴圈、輸入、相機跟隨、啟動流程 */
(function(OC){'use strict';
const {U,R,Env,Sim}=OC;
const Loop={timeScale:1,raf:0,last:0,acc:0,paused:false,renderOn:true,fpsN:0,fpsT:0,fps:0,
 start(){if(this.raf)return;this.last=performance.now();this.raf=requestAnimationFrame(t=>this.frame(t))},
 stop(){cancelAnimationFrame(this.raf);this.raf=0},
 frame(t){this.raf=requestAnimationFrame(n=>this.frame(n));const perf=OC.Store.perf();const minDt=1000/perf.fps-1.5;const el=t-this.last;if(el<minDt)return;
  const dt=Math.min(.1,el/1000);this.last=t;this.fpsN++;this.fpsT+=el;if(this.fpsT>1000){this.fps=Math.round(this.fpsN*1000/this.fpsT);this.fpsN=0;this.fpsT=0}
  Env.update();/* 模擬以固定小步長前進，避免卡頓時角色穿過障礙物 */let sdt=dt*(this.timeScale||1);while(sdt>1e-4){const st=Math.min(.05,sdt);sdt-=st;Sim.tick(st);OC.Social.tick(st)}Cam.update(dt);
  if(this.renderOn){try{R.frame(dt)}catch(e){console.error('[render]',e);this.err=(this.err||0)+1}}
  OC.UI&&OC.UI.frame&&OC.UI.frame(dt)}};

/* ---------- 相機：跟隨、平移、縮放，全部有慣性 ---------- */
const Cam={follow:true,focus:null,goal:{tx:0,tz:0,D:16},vel:{x:0,z:0},
 set(tx,tz,D,instant){this.goal={tx,tz,D:D??this.goal.D};if(instant){R.cam.tx=tx;R.cam.tz=tz;R.cam.D=this.goal.D}},
 limits(){const sc=R.sc;return sc.kind==='room'?{D:[7,13],b:[-1.6,-1,1.6,1.4]}:{D:[9,30],b:[sc.bounds[0]+2,sc.bounds[1]+2,sc.bounds[2]-2,sc.bounds[3]-1]}},
 update(dt){const c=R.cam,L=this.limits();
  if(this.follow&&this.focus&&!this.focus.away&&this.focus.loc===R.sc.id&&!Input.drag){const f=this.focus;const dx=f.x-this.goal.tx,dz=f.z-this.goal.tz;const dead=OC.Store.perf().fps<40?1.6:.9;
   if(Math.abs(dx)>dead)this.goal.tx+=dx-Math.sign(dx)*dead;if(Math.abs(dz)>dead*.7)this.goal.tz+=dz-Math.sign(dz)*dead*.7}
  if(!Input.drag&&(this.vel.x||this.vel.z)){this.goal.tx+=this.vel.x*dt;this.goal.tz+=this.vel.z*dt;this.vel.x*=Math.pow(.04,dt);this.vel.z*=Math.pow(.04,dt);if(Math.hypot(this.vel.x,this.vel.z)<.05)this.vel.x=this.vel.z=0}
  this.goal.D=U.clamp(this.goal.D,L.D[0],L.D[1]);this.goal.tx=U.clamp(this.goal.tx,L.b[0],L.b[2]);this.goal.tz=U.clamp(this.goal.tz,L.b[1],L.b[3]);
  const k=Input.drag?1:1-Math.exp(-dt*(Input.pinch?14:5));const nx=U.lerp(c.tx,this.goal.tx,k),nz=U.lerp(c.tz,this.goal.tz,k),nD=U.lerp(c.D,this.goal.D,k);
  /* 小於 0.002 的移動直接忽略：避免地面快取每格重畫 */
  if(Math.abs(nx-c.tx)>.002)c.tx=nx;else c.tx=this.goal.tx;if(Math.abs(nz-c.tz)>.002)c.tz=nz;else c.tz=this.goal.tz;if(Math.abs(nD-c.D)>.003)c.D=nD;else c.D=this.goal.D}};

/* ---------- 觸控輸入 ---------- */
const Input={ptrs:new Map(),drag:null,pinch:null,press:null,
 init(cv){this.cv=cv;cv.addEventListener('pointerdown',e=>this.down(e));window.addEventListener('pointermove',e=>this.move(e),{passive:false});window.addEventListener('pointerup',e=>this.up(e));window.addEventListener('pointercancel',e=>this.up(e,true));
  cv.addEventListener('wheel',e=>{e.preventDefault();Cam.goal.D*=Math.exp(e.deltaY*.0012)},{passive:false});cv.addEventListener('contextmenu',e=>e.preventDefault())},
 pos(e){const r=this.cv.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}},
 hitActor(x,y){let best=null;for(const a of R.actors){if(a.visible===false||!a.ss||a.away)continue;const w=(a.hitW||a.ss*.8)*.55,h=a.hitH||a.ss;if(x>a.sx-w&&x<a.sx+w&&y>a.sy-h*.95&&y<a.sy+6){if(!best||a.z>best.z)best=a}}return best},
 hitObj(x,y){let best=null;for(const p of R.pick){if(x>p.x+p.w*.15&&x<p.x+p.w*.85&&y>p.y+p.h*.15&&y<p.y+p.h){if(!best||p.o.z>best.o.z)best=p}}return best&&best.o},
 down(e){if(OC.UI&&OC.UI.blockWorld)return;const p=this.pos(e);this.ptrs.set(e.pointerId,p);try{this.cv.setPointerCapture(e.pointerId)}catch(_){}
  if(this.ptrs.size===2){const [a,b]=[...this.ptrs.values()];this.pinch={d:Math.hypot(a.x-b.x,a.y-b.y),D:Cam.goal.D};this.cancelPress();this.drag=null;return}
  if(OC.UI&&OC.UI.placing){OC.UI.placing.down(p);return}
  const a=this.hitActor(p.x,p.y);
  if(a){this.press={a,x:p.x,y:p.y,t:performance.now(),mode:null,lx:p.x,ly:p.y,id:e.pointerId};this.press.timer=setTimeout(()=>{if(this.press&&!this.press.mode){this.press.mode='hold';OC.Play.pick(a);Cam.focus=a;OC.UI&&OC.UI.select(a)}},430);return}
  this.drag={x:p.x,y:p.y,sx:p.x,sy:p.y,t:performance.now(),moved:0,w0:R.cam.unproject(p.x,p.y),tx:Cam.goal.tx,tz:Cam.goal.tz};Cam.vel.x=Cam.vel.z=0},
 move(e){if(!this.ptrs.has(e.pointerId))return;const p=this.pos(e);const prev=this.ptrs.get(e.pointerId);this.ptrs.set(e.pointerId,p);
  if(this.pinch&&this.ptrs.size>=2){const [a,b]=[...this.ptrs.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);Cam.goal.D=this.pinch.D*this.pinch.d/Math.max(20,d);return}
  if(OC.UI&&OC.UI.placing){OC.UI.placing.move(p);return}
  const P=this.press;if(P&&P.id===e.pointerId){const dx=p.x-P.x,dy=p.y-P.y;
   if(!P.mode&&Math.hypot(dx,dy)>9){clearTimeout(P.timer);P.mode='pet';OC.Play.petStart(P.a);Cam.focus=P.a;OC.UI&&OC.UI.select(P.a,true)}
   if(P.mode==='pet'){OC.Play.petMove(P.a,p.y-P.ly,p.x-P.lx);P.lx=p.x;P.ly=p.y;e.preventDefault()}
   else if(P.mode==='hold'){const w=R.cam.unproject(p.x,p.y+R.cam.p(P.a.x,0,P.a.z).s*.5);P.a.x=w.x;P.a.z=w.z;P.a.y=.45+Math.sin(performance.now()/180)*.03;P.a.facing=(p.x-prev.x)>1?1:(p.x-prev.x)<-1?-1:P.a.facing;e.preventDefault()}return}
  const D=this.drag;if(D){D.moved=Math.max(D.moved,Math.hypot(p.x-D.sx,p.y-D.sy));if(D.moved<6)return;const w=R.cam.unproject(p.x,p.y);const dx=w.x-D.w0.x,dz=w.z-D.w0.z;
   Cam.goal.tx-=dx;Cam.goal.tz-=dz;R.cam.tx=Cam.goal.tx;R.cam.tz=Cam.goal.tz;const now=performance.now(),dt=Math.max(1,now-D.t)/1000;Cam.vel.x=-dx/dt*.6;Cam.vel.z=-dz/dt*.6;D.t=now;D.w0=R.cam.unproject(p.x,p.y);Cam.follow=false;if(D.moved>40)U.emit('tut','pan');OC.UI&&OC.UI.followChanged&&OC.UI.followChanged()}},
 cancelPress(){if(this.press){clearTimeout(this.press.timer);if(this.press.mode==='pet')OC.Play.petEnd(this.press.a);if(this.press.mode==='hold'){const a=this.press.a;OC.Play.drop(a,a.x,a.z)}this.press=null}},
 up(e,cancel){if(!this.ptrs.has(e.pointerId))return;const p=this.ptrs.get(e.pointerId);this.ptrs.delete(e.pointerId);if(this.ptrs.size<2)this.pinch=null;
  if(OC.UI&&OC.UI.placing){OC.UI.placing.up(p);return}
  const P=this.press;if(P&&P.id===e.pointerId){clearTimeout(P.timer);if(!P.mode&&!cancel){Cam.focus=P.a;Cam.follow=true;OC.UI&&OC.UI.select(P.a);OC.UI&&OC.UI.actorTap(P.a)}else this.cancelPress();this.press=null;return}
  const D=this.drag;if(D){this.drag=null;if(D.moved<6&&!cancel&&performance.now()-D.t<500){const o=this.hitObj(p.x,p.y);if(o)OC.UI&&OC.UI.objTap(o);else{const now=performance.now();if(this.lastTap&&now-this.lastTap<330){const w=R.cam.unproject(p.x,p.y);const a=Sim.active();if(a&&a.loc===R.sc.id)OC.Play.call(a,w.x,w.z)}this.lastTap=now}}}}};

/* ---------- 地點切換（含柔和轉場） ---------- */
const World={go(id,{instant,focus}={}){const C=OC.Content;if(!C.LOC[id])return;OC.S.world.loc=id;if(OC.Pages&&OC.Pages.cur)OC.Pages.close();
  const doIt=()=>{R.setScene(id);Sim.refreshActors();const sc=R.sc;const a=focus||[...R.actors].find(x=>x.id===OC.S.activeId)||R.actors[0];Cam.focus=a||null;Cam.follow=!!a;
   if(a&&sc.kind!=='room')Cam.set(a.x,a.z+.5,sc.cam.D,true);else Cam.set(sc.cam.tx,sc.cam.tz,sc.kind==='room'?sc.cam.D:19,true);OC.Quests.on('loc:'+id);U.emit('scene',id);U.emit('tut',id==='house'?'house':'map');OC.Store.save()};
  if(instant||!OC.UI){doIt();return}OC.UI.fade(doIt)}};

/* ---------- 前景／背景：背景時停止繪製、只在回來時補算 ---------- */
document.addEventListener('visibilitychange',()=>{if(document.hidden){OC.Store.flush();Loop.stop();Loop.hiddenAt=Date.now()}else{const away=(Date.now()-(Loop.hiddenAt||Date.now()))/1000;if(away>60){const r=Sim.offline(away);if(r&&r.lines.length&&OC.UI)OC.UI.welcomeBack(r)}Loop.start();OC.Native&&OC.Native.pullPetEvents&&OC.Native.pullPetEvents()}});
window.addEventListener('pagehide',()=>OC.Store.flush());
window.addEventListener('resize',()=>{R.resize()});

/* ---------- 啟動 ---------- */
async function boot(){const S=OC.Store.load();OC.Pages.applyTheme();OC.Pages.init();
 /* 舊存檔處理：若沒有 v4 存檔但有 3.2 存檔 → 自動匯入（不覆蓋、不刪除舊資料） */
 let migrated=0;if(OC.Store.isNew()&&OC.Store.hasLegacy()){try{migrated=await OC.Store.importLegacy();S.flags.introSeen=true;S.flags.started=true;S.flags.tutorialDone=true}catch(e){console.error('legacy',e)}}
 for(const c of S.chars)OC.Chars.ensure(c);
 if(!S.activeId&&S.chars[0])S.activeId=S.chars[0].id;
 OC.Scenes.syncHouse();OC.Scenes.syncFurn();
 Env.update();R.init(OC.U.$('#world'));Input.init(OC.U.$('#world'));
 const loc=S.flags.started?S.world.loc:'home';R.setScene(OC.Content.LOC[loc]?loc:'home');
 Sim.init();
 if(S.flags.started){const away=(Date.now()-(S.lastSeen||Date.now()))/1000;const r=Sim.offline(away);OC.Quests.ensure();World.go(R.sc.id,{instant:true});OC.UI.init();if(r&&r.lines.length)setTimeout(()=>OC.UI.welcomeBack(r),900);
  if(migrated)setTimeout(()=>OC.UI.toast(`已從 3.2 版匯入 ${migrated} 位夥伴與存檔`,'check'),600);
  if(!S.flags.houseChosen)setTimeout(()=>OC.Intro.houseOnly(),1400)}
 else{OC.UI.init();OC.Intro.start()}
 Loop.start();OC.Native&&OC.Native.init&&OC.Native.init();
 const sp=OC.U.$('#splash');if(sp){sp.classList.add('out');setTimeout(()=>sp.remove(),600)}}
OC.Loop=Loop;OC.Cam=Cam;OC.Input=Input;OC.World=World;OC.boot=boot;
})(window.OC);
