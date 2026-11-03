/* OC Shimeji v4 · 玩家與角色的互動：摸摸（上下滑動）、餵食、送禮、抱起放下、呼喚 */
(function(OC){'use strict';
const {U,Content:C,Chars,Items}=OC;
const Play={
 /* ---------- 摸摸：在角色身上上下滑動，每次方向反轉算一下 ---------- */
 petStart(a){if(a.task&&a.task.def.pose==='sleep'){/* 睡著時輕摸：會翻身、嘟囔，不會醒 */}
  a.petting={strokes:0,last:0,acc:0,dir:0,t:0};a.pose=a.task&&a.task.def.pose==='sleep'?'sleep':'pet';a.goal=null;a.vx=a.vz=0},
 petMove(a,dy,dx){const P=a.petting;if(!P)return;P.acc+=dy;a.petY=U.clamp(P.acc/40,-1,1);a.petDir=dx>0?1:-1;
  const d=Math.sign(dy);if(Math.abs(P.acc)>18&&d&&d!==P.dir){P.dir=d;P.acc=0;this.stroke(a)}},
 stroke(a){const P=a.petting,c=a.c;P.strokes++;a.squash(P.dir>0?.94:1.04);U.buzz(6);
  const sleeping=a.task&&a.task.def.pose==='sleep';
  if(sleeping){if(P.strokes%4===0){a.say(U.pick(['唔…呼嚕…','嗯嗯…','（翻身）']),{life:2});a.facing*=-1}return}
  if(P.strokes===1&&(Chars.has(c,'shy')||Chars.has(c,'tsun'))){a.say(Chars.line(c,'pet')||'呀！');a.blushK=2.5}
  if(P.strokes%3===0){OC.Fx.hearts(a.x,1.25,a.z,1);c.needs.comfort=Math.min(100,c.needs.comfort+3);c.needs.social=Math.min(100,c.needs.social+3);c.emo.joy=Math.min(1,c.emo.joy+.08);c.bond+=1;c.emo.anger=Math.max(0,c.emo.anger-.08);c.emo.sad=Math.max(0,c.emo.sad-.08);OC.Quests.on('pet',c)}
  if(P.strokes%7===0){a.say(Chars.line(c,'pet')||U.pick(['好舒服～','再摸一下～','呼嚕呼嚕…']));if(c.quirks.happy==='hop')a.hop(1.2)}
  if(c.health.sick==='blue'&&P.strokes%9===0)OC.Sim.heal(a,.8,'你的摸摸');
  /* 太多了：怕癢、高冷的夥伴會想逃 */
  if(P.strokes>24&&Chars.sl(c,'indep')>.7&&Math.random()<.2){a.say('好了啦，夠了夠了。');this.petEnd(a);a.hop(1.4)}},
 petEnd(a){const P=a.petting;if(!P)return;a.petting=null;a.petY=0;if(!(a.task&&a.task.def.pose==='sleep'))a.pose='stand';
  if(P.strokes>=4)U.emit('tut','pet');
  /* 吃醋：愛吃醋的夥伴看到你只摸別人會不開心 */
  if(P.strokes>=8&&OC.S.settings.negEvents!==false)for(const o of OC.Sim.agents.values()){if(o===a||o.loc!==a.loc||o.busy()||!Chars.has(o.c,'jealous')&&!Chars.has(o.c,'clingy'))continue;if(Math.hypot(o.x-a.x,o.z-a.z)>8||Math.random()>.6)continue;
   setTimeout(()=>{o.face='pout';o.feel('gloom');o.say(Chars.has(o.c,'jealous')?'…為什麼只摸牠。':'我、我也想被摸摸…',{tone:'sad'});o.c.emo.sad=Math.min(1,o.c.emo.sad+.2);if(Chars.has(o.c,'jealous')){const r=OC.Social.rel(o.id,a.id);r.conf=Math.min(100,r.conf+10)}o.c.wishes.push({k:'pet',t:Date.now(),id:U.uid('w')});setTimeout(()=>o.face=null,2200)},900);break}
  if(P.strokes>=6&&OC.Events)setTimeout(()=>OC.Events.fire(a,{pet:true}),900);
  if(P.strokes>=6){this.happy(a);OC.Sim.checkWish(a,'pet');OC.Sim.remember(a.c,'pet','被你摸摸頭',.5);OC.Sim.log(a.c,`你摸了摸${a.c.name}的頭`,'hand')}
  OC.Store.save()},
 /* 開心反應（小怪癖） */
 happy(a){const q=a.c.quirks.happy;a.face='joy';setTimeout(()=>{if(a.face==='joy')a.face=null},1600);
  if(q==='hop')a.hop(2.2);else if(q==='spin'){let n=0;const iv=setInterval(()=>{a.facing*=-1;if(++n>=4)clearInterval(iv)},110)}else if(q==='sparkle')OC.Fx.sparkle(a.x,1.1,a.z,10);else if(q==='dance'){a.pose='cheer';setTimeout(()=>{if(a.pose==='cheer')a.pose='stand'},1500)}else if(q==='blush'){a.blushK=2.4;a.feel('blush')}else a.feel('heart')},
 /* ---------- 給予物品（電影式演出，效果在演出結束時套用；略過也一樣生效） ---------- */
 give(a,id){const it=C.ITEM[id]||(OC.Creations&&OC.Creations.item(id)),c=a.c;if(!it||Items.qty(id)<=0)return false;
  if(a.task&&a.task.def.pose==='sleep'){a.say('呼…（睡得正熟）');return false}
  if(OC.Cine.on)return false;OC.UI.closeFloating&&OC.UI.closeFloating();
  OC.Cine.afterFn=()=>OC.Events&&OC.Events.fire(a,{item:it});/* 演出結束後檢查自製事件 */
  if(it.cat==='food'||it.cat==='drink'){const v=Chars.taste(c,it);
   if(c.needs.hunger>96&&it.cat==='food'){a.say('我吃不下了…');a.feel('sweat');return false}
   Items.take(id);U.emit('tut','feed');
   OC.Cine.eat(a,it,v,()=>{for(const [k,n] of Object.entries(it.fx||{}))c.needs[k]=U.clamp(c.needs[k]+n*(v<0?.6:1),0,100);
    c.foodSeen=c.foodSeen||{};c.foodSeen[id]=v;if(v>=1){c.emo.joy=Math.min(1,c.emo.joy+.15*v);c.bond+=2+v}else if(v<0){c.emo.anger=Math.min(1,c.emo.anger+(v===-2?.25:.05));if(v===-2&&Math.random()<.3)OC.Sim.getSick(a,'tummy')}
    if(it.heal&&c.health.sick)OC.Sim.heal(a,it.heal,`吃了${it.name}`);const P=C.PREF.find(p=>p[0]===v);
    OC.Sim.remember(c,'food',`吃了${it.name}（${P[1]}）`,v*.3);OC.Sim.checkWish(a,'eat',id);OC.Quests.on('feed',c);Items.xp(10);OC.Sim.log(c,`${c.name}吃了${it.name}：${P[1]}`,'food')});return true}
  if(it.cat==='medicine'){if(!c.health.sick){a.say('我沒有生病喔～');return false}Items.take(id);OC.Cine.medicine(a,it,()=>OC.Sim.heal(a,it.heal||1,'吃藥'));return true}
  if(it.cat==='care'){Items.take(id);OC.Cine.bath(a,it,()=>{c.needs.hygiene=Math.min(100,c.needs.hygiene+((it.fx&&it.fx.hygiene)||50));Items.xp(5)});return true}
  if(it.cat==='toy'){if(!it.reuse)Items.take(id);OC.Cine.toy(a,it,()=>{for(const [k,n] of Object.entries(it.fx||{}))c.needs[k]=U.clamp(c.needs[k]+n,0,100);OC.Sim.remember(c,'toy',`玩了${it.name}`,.5);c.bond+=2;Items.xp(6)});return true}
  if(['gift','col','fish','bug','custom'].includes(it.cat)){Items.take(id);const like=(it.gift||1)+((c.profile.likes||[]).some(l=>it.name.includes(l))?2:0)-((c.profile.dislikes||[]).some(l=>it.name.includes(l))?3:0);
   OC.Cine.gift(a,it,like,()=>{c.bond+=Math.max(0,like*2);c.emo.joy=Math.min(1,c.emo.joy+.2);c.emo.sad=Math.max(0,c.emo.sad-.3);if(c.health.sick==='blue')OC.Sim.heal(a,1,'收到禮物');OC.Sim.remember(c,'gift',`收到你送的${it.name}`,.8);OC.Quests.on('gift',c);Items.xp(15);OC.Sim.log(c,`你送給${c.name}${it.name}`,'gift')});return true}
  if(it.cat==='seed'){OC.UI.toast('種子可以在家園的花圃種下','info');return false}
  if(it.cat==='furn'||it.cat==='build'){OC.UI.toast('家具和建築可以在「佈置」裡擺放','info');return false}
  return false},
 timed(a,s,fn){a.lockT=s;const T={def:{id:'_p',pose:a.pose,gain:{},dur:[s,s]},lock:1,phase:'hold'};a.task=T;setTimeout(()=>{if(a.task===T)a.task=null;try{fn()}catch(e){console.error(e)}OC.Store.save()},s*1000)},
 /* ---------- 抱起、晃動、甩、拋出（太用力或太高會頭暈） ---------- */
 pick(a){if(a.task)OC.Sim.finish(a,false);if(a.inter)OC.Social.end(a.inter);a.held={shake:0,lastDx:0,hist:[],sw:{x:0,v:0}};a.pose='held';a.goal=null;a.vy=0;a.dizzy=0;U.buzz(10);
  const c=a.c;a.say(Chars.line(c,'drop')||U.pick(['哇！要去哪裡？','咦咦咦？','放、放我下來啦～']),{life:1.6});if(Chars.has(c,'timid'))a.feel('sweat')},
 holdMove(a,p,prev){const H=a.held;if(!H)return;const cam=OC.R.cam;const s=cam.p(a.x,0,a.z).s;const w=cam.unproject(p.x,p.y+s*1.15);const b=OC.R.sc.bounds;a.x=U.clamp(w.x,b[0],b[2]);a.z=U.clamp(w.z,b[1],b[3]);
  const dx=p.x-prev.x,dy=p.y-prev.y,now=performance.now();H.hist.push({x:p.x,y:p.y,t:now});while(H.hist.length&&now-H.hist[0].t>140)H.hist.shift();
  /* 方向急轉計為「甩」；左右擺盪 */
  if(Math.abs(dx)>7&&Math.sign(dx)!==Math.sign(H.lastDx)&&H.lastDx){H.shake+=1;U.buzz(4);if(H.shake===5)a.say(U.pick(['不要甩啦～','頭、頭要暈了…','哇啊啊啊——']),{life:1.4});a.face='wow'}
  if(Math.abs(dx)>2)H.lastDx=dx;H.sw.v-=dx*.9;a.facing=dx>2?1:dx<-2?-1:a.facing},
 /* 放開：依手指速度拋出 */
 release(a){const H=a.held;if(!H)return;a.held=null;a.face=null;const cam=OC.R.cam,h=H.hist;let vx=0,vy=0;
  if(h.length>1){const A=h[0],B=h[h.length-1],dt=Math.max(.016,(B.t-A.t)/1000);vx=(B.x-A.x)/dt;vy=(B.y-A.y)/dt}
  const s=Math.max(10,cam.p(a.x,0,a.z).s);a.tvx=U.clamp(vx/s,-6,6)*.55;a.tvz=0;a.vy=U.clamp(-vy/s*.6,-2,9);a.y=Math.max(a.y,.9);a.pose='fall';a.shakeN=H.shake;
  a.fallFrom=a.y;U.buzz(8)},
 /* 落地（由 Agent.update 呼叫） */
 land(a,peak){const sc=OC.Scenes.get(a.loc);if(!sc.walk(a.x,a.z)){const p=sc.near(a.x,a.z,2);a.x=p.x;a.z=p.z}a.tvx=a.tvz=0;a.pose='stand';
  const dizzy=peak>1.8||(a.shakeN||0)>=5;a.shakeN=0;
  if(dizzy){this.dizzy(a,peak>3?5:3.6)}else if(peak>1.2){a.say(U.pick(['咚！','到了～','呼…嚇我一跳。']),{life:1.4})}},
 dizzy(a,sec){a.dizzy=sec;a.task={def:{id:'_dizzy',pose:'dizzy',gain:{},dur:[sec,sec]},lock:1,phase:'hold'};a.pose='dizzy';a.feel('dizzy',sec);
  a.say(U.pick(['頭好暈～','眼睛在轉圈圈…','世界在轉…']),{life:2.2});a.c.emo.joy=Math.max(0,a.c.emo.joy-.1);OC.Sim.remember(a.c,'dizzy','被甩得頭昏眼花',-.2);
  setTimeout(()=>{if(a.task&&a.task.def.id==='_dizzy'){a.task=null;a.pose='stand';a.dizzy=0;a.say(U.pick(['呼…終於不暈了。','下次輕一點啦！']),{life:2});a.squash(.9)}},sec*1000)},
 drop(a,x,z){this.release(a)},
 /* ---------- 呼喚 ---------- */
 call(a,x,z){if(a.task&&a.task.def.pose==='sleep'){OC.Sim.finish(a,false);a.say(Chars.line(a.c,'wake')||U.pick(C.LINES.wake));a.feel('!')}else if(a.task)OC.Sim.finish(a,false);
  const sc=OC.Scenes.get(a.loc);const p=x!=null?(sc.ok(x,z)?{x,z}:sc.near(x,z,1.2)):sc.near(OC.R.cam.tx,OC.R.cam.tz+1,1.5);a.goal={x:p.x,z:p.z,fast:1};a.feel('!',1.2);
  setTimeout(()=>{if(!a.goal&&!a.task){a.say(Chars.line(a.c,'call')||U.pick(['來了來了！','叫我嗎？','我在這裡！']));a.hop(1.4)}},1800)}};
OC.Play=Play;
})(window.OC);
