/* OC Shimeji v4 · 主迴圈、輸入、相機跟隨、啟動流程 */
(function(OC){'use strict';
const {U,R,Env,Sim}=OC;
const Loop={timeScale:1,raf:0,last:0,acc:0,paused:false,renderOn:true,fpsN:0,fpsT:0,fps:0,
 start(){if(this.raf)return;this.last=performance.now();this.raf=requestAnimationFrame(t=>this.frame(t))},
 stop(){cancelAnimationFrame(this.raf);this.raf=0},
 frame(t){this.raf=requestAnimationFrame(n=>this.frame(n));const perf=OC.Store.perf();const minDt=1000/perf.fps-1.5;const el=t-this.last;if(el<minDt)return;
  const dt=Math.min(.1,el/1000);this.last=t;this.fpsN++;this.fpsT+=el;if(this.fpsT>1000){this.fps=Math.round(this.fpsN*1000/this.fpsT);this.fpsN=0;this.fpsT=0}
  Env.update();/* 模擬以固定小步長前進，避免卡頓時角色穿過障礙物 */let sdt=dt*(this.timeScale||1);while(sdt>1e-4){const st=Math.min(.05,sdt);sdt-=st;Sim.tick(st);OC.Social.tick(st)}OC.Cine&&OC.Cine.tick(dt);Cam.update(dt);
  if(this.renderOn){try{R.frame(dt)}catch(e){console.error('[render]',e);this.err=(this.err||0)+1}}
  OC.UI&&OC.UI.frame&&OC.UI.frame(dt)}};

/* ---------- 相機：平移、縮放、跟隨（v4.1 重寫：以螢幕位移換算，不會跳動） ---------- */
const Cam={follow:true,focus:null,goal:{tx:0,tz:0,D:16},vel:{x:0,z:0},lock:0,
 set(tx,tz,D,instant){this.goal={tx,tz,D:D??this.goal.D};this.vel.x=this.vel.z=0;if(instant){R.cam.tx=tx;R.cam.tz=tz;R.cam.D=this.goal.D}},
 limits(){const sc=R.sc;return sc.kind==='room'?{D:[7,13],b:[-1.6,-1,1.6,1.4]}:{D:[9,30],b:[sc.bounds[0]+2,sc.bounds[1]+2,sc.bounds[2]-2,sc.bounds[3]-1]}},
 /* 目前地面上每公尺對應幾像素（x、z 各自） */
 scale(){const c=R.cam;c.update();const a=c.p(c.tx,0,c.tz),bx=c.p(c.tx+1,0,c.tz),bz=c.p(c.tx,0,c.tz+1);return{x:Math.max(4,bx.x-a.x),z:Math.max(2,bz.y-a.y)}},
 pan(dx,dy){const k=this.scale();this.goal.tx-=dx/k.x;this.goal.tz-=dy/k.z;this.clamp();R.cam.tx=this.goal.tx;R.cam.tz=this.goal.tz},
 clamp(){const L=this.limits();this.goal.D=U.clamp(this.goal.D,L.D[0],L.D[1]);this.goal.tx=U.clamp(this.goal.tx,L.b[0],L.b[2]);this.goal.tz=U.clamp(this.goal.tz,L.b[1],L.b[3])},
 followA(a){this.focus=a;this.follow=!!a;OC.UI&&OC.UI.followChanged&&OC.UI.followChanged()},
 update(dt){const c=R.cam;
  if(this.follow&&this.focus&&!this.focus.away&&this.focus.loc===R.sc.id&&!Input.drag&&!Input.pinch){const f=this.focus;
   /* 連續平滑跟隨（沒有死區跳格） */const k=1-Math.exp(-dt*2.6);this.goal.tx+=(f.x-this.goal.tx)*k;this.goal.tz+=(f.z+.6-this.goal.tz)*k}
  if(!Input.drag&&(this.vel.x||this.vel.z)){this.goal.tx+=this.vel.x*dt;this.goal.tz+=this.vel.z*dt;const d=Math.pow(.02,dt);this.vel.x*=d;this.vel.z*=d;if(Math.hypot(this.vel.x,this.vel.z)<.03)this.vel.x=this.vel.z=0}
  this.clamp();
  const k=Input.drag?1:1-Math.exp(-dt*7);c.tx+=(this.goal.tx-c.tx)*k;c.tz+=(this.goal.tz-c.tz)*k;c.D+=(this.goal.D-c.D)*(1-Math.exp(-dt*9));
  if(Math.abs(c.tx-this.goal.tx)<.0015)c.tx=this.goal.tx;if(Math.abs(c.tz-this.goal.tz)<.0015)c.tz=this.goal.tz;if(Math.abs(c.D-this.goal.D)<.002)c.D=this.goal.D}};

/* ---------- 觸控輸入 ---------- */
const Input={ptrs:new Map(),drag:null,pinch:null,press:null,
 init(cv){this.cv=cv;cv.addEventListener('pointerdown',e=>this.down(e));window.addEventListener('pointermove',e=>this.move(e),{passive:false});window.addEventListener('pointerup',e=>this.up(e));window.addEventListener('pointercancel',e=>this.up(e,true));
  cv.addEventListener('wheel',e=>{e.preventDefault();Cam.goal.D*=Math.exp(e.deltaY*.0012);Cam.clamp()},{passive:false});cv.addEventListener('contextmenu',e=>e.preventDefault())},
 pos(e){const r=this.cv.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}},
 /* 寬鬆的點擊範圍：手指比滑鼠粗，角色外圍多留一些 */
 hitActor(x,y,pad=14){let best=null,bd=1e9;for(const a of R.actors){if(a.visible===false||!a.ss||a.away)continue;const w=(a.hitW||a.ss*.8)*.55+pad,h=(a.hitH||a.ss)+pad;
   if(x>a.sx-w&&x<a.sx+w&&y>a.sy-h&&y<a.sy+pad){const d=Math.hypot(x-a.sx,y-(a.sy-h*.45));if(d<bd){bd=d;best=a}}}return best},
 hitObj(x,y){let best=null;for(const p of R.pick){if(x>p.x+p.w*.12&&x<p.x+p.w*.88&&y>p.y+p.h*.12&&y<p.y+p.h){if(!best||p.o.z>best.o.z)best=p}}return best&&best.o},
 down(e){if(OC.UI&&OC.UI.blockWorld)return;if(OC.Cine&&OC.Cine.on){OC.Cine.skip();return}const p=this.pos(e);this.ptrs.set(e.pointerId,p);try{this.cv.setPointerCapture(e.pointerId)}catch(_){}
  OC.UI&&OC.UI.closeFloating&&OC.UI.closeFloating();
  if(this.ptrs.size===2){const [a,b]=[...this.ptrs.values()];this.pinch={d:Math.hypot(a.x-b.x,a.y-b.y),D:Cam.goal.D,mx:(a.x+b.x)/2,my:(a.y+b.y)/2};this.cancelPress();this.drag=null;return}
  if(OC.UI&&OC.UI.placing){OC.UI.placing.down(p);return}
  const a=this.hitActor(p.x,p.y);
  if(a){this.press={a,x:p.x,y:p.y,t:performance.now(),mode:null,lx:p.x,ly:p.y,id:e.pointerId};this.press.timer=setTimeout(()=>{if(this.press&&!this.press.mode){this.press.mode='hold';OC.Play.pick(a);OC.UI&&OC.UI.select(a,true)}},380);return}
  this.drag={x:p.x,y:p.y,sx:p.x,sy:p.y,t:performance.now(),t0:performance.now(),moved:0};Cam.vel.x=Cam.vel.z=0},
 move(e){if(!this.ptrs.has(e.pointerId))return;const p=this.pos(e);const prev=this.ptrs.get(e.pointerId);this.ptrs.set(e.pointerId,p);
  if(this.pinch&&this.ptrs.size>=2){const [a,b]=[...this.ptrs.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);Cam.goal.D=U.clamp(this.pinch.D*this.pinch.d/Math.max(20,d),...Cam.limits().D);
   /* 雙指同時拖動也能平移 */const mx=(a.x+b.x)/2,my=(a.y+b.y)/2;Cam.pan(mx-this.pinch.mx,my-this.pinch.my);this.pinch.mx=mx;this.pinch.my=my;if(Cam.follow){Cam.follow=false;OC.UI&&OC.UI.followChanged()}return}
  if(OC.UI&&OC.UI.placing){OC.UI.placing.move(p);return}
  const P=this.press;if(P&&P.id===e.pointerId){const dx=p.x-P.x,dy=p.y-P.y;
   if(!P.mode&&Math.hypot(dx,dy)>10){clearTimeout(P.timer);
    /* 上下為主 → 摸摸；明顯橫向拖曳 → 抱起移動 */
    if(Math.abs(dy)>=Math.abs(dx)*.7){P.mode='pet';OC.Play.petStart(P.a);OC.UI&&OC.UI.select(P.a,true)}else{P.mode='hold';OC.Play.pick(P.a);OC.UI&&OC.UI.select(P.a,true)}}
   if(P.mode==='pet'){OC.Play.petMove(P.a,p.y-P.ly,p.x-P.lx);P.lx=p.x;P.ly=p.y;e.preventDefault()}
   else if(P.mode==='hold'){OC.Play.holdMove(P.a,p,prev);e.preventDefault()}return}
  const D=this.drag;if(D){D.moved=Math.max(D.moved,Math.hypot(p.x-D.sx,p.y-D.sy));if(D.moved<8)return;const dx=p.x-prev.x,dy=p.y-prev.y;Cam.pan(dx,dy);
   const now=performance.now(),dt=Math.max(8,now-D.t)/1000,k=Cam.scale();Cam.vel.x=U.lerp(Cam.vel.x,-dx/k.x/dt,.5);Cam.vel.z=U.lerp(Cam.vel.z,-dy/k.z/dt,.5);D.t=now;
   if(Cam.follow){Cam.follow=false;OC.UI&&OC.UI.followChanged&&OC.UI.followChanged()}if(D.moved>40)U.emit('tut','pan')}},
 cancelPress(){if(this.press){clearTimeout(this.press.timer);if(this.press.mode==='pet')OC.Play.petEnd(this.press.a);if(this.press.mode==='hold')OC.Play.release(this.press.a);this.press=null}},
 up(e,cancel){if(!this.ptrs.has(e.pointerId))return;const p=this.ptrs.get(e.pointerId);this.ptrs.delete(e.pointerId);if(this.ptrs.size<2&&this.pinch){this.pinch=null;this.drag=null;return}
  if(OC.UI&&OC.UI.placing){OC.UI.placing.up(p);return}
  const P=this.press;if(P&&P.id===e.pointerId){clearTimeout(P.timer);if(!P.mode&&!cancel){OC.UI&&OC.UI.select(P.a);OC.UI&&OC.UI.actorTap(P.a)}else this.cancelPress();this.press=null;return}
  const D=this.drag;if(D){this.drag=null;if(performance.now()-D.t>90)Cam.vel.x=Cam.vel.z=0;
   if(D.moved<8&&!cancel&&performance.now()-D.t0<450){const o=this.hitObj(p.x,p.y);if(o)OC.UI&&OC.UI.objTap(o);else{const now=performance.now();if(this.lastTap&&now-this.lastTap<330){const w=R.cam.unproject(p.x,p.y);const a=Sim.active();if(a&&a.loc===R.sc.id)OC.Play.call(a,w.x,w.z)}this.lastTap=now}}}}};

/* ---------- 地點切換（含柔和轉場） ---------- */
const World={go(id,{instant,focus}={}){const C=OC.Content;if(!C.LOC[id])return;OC.S.world.loc=id;if(OC.Pages&&OC.Pages.cur)OC.Pages.close();
  const doIt=()=>{R.setScene(id);Sim.refreshActors();const sc=R.sc;const a=focus||[...R.actors].find(x=>x.id===OC.S.activeId)||R.actors[0];Cam.focus=a||null;Cam.follow=!!a;
   if(a&&sc.kind!=='room')Cam.set(a.x,a.z+.6,sc.cam.D,true);else Cam.set(sc.cam.tx,sc.cam.tz,sc.kind==='room'?sc.cam.D:19,true);OC.Quests.on('loc:'+id);U.emit('scene',id);U.emit('tut',id==='house'?'house':'map');OC.Store.save()};
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
 await OC.Creations.load();OC.Scenes.syncHouse();OC.Scenes.syncFurn();OC.Scenes.syncBuilds();
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
