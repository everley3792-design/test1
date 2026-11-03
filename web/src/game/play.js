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
  if(P.strokes>=4)U.emit('tut','pet');if(P.strokes>=6){this.happy(a);OC.Sim.checkWish(a,'pet');OC.Sim.remember(a.c,'pet','被你摸摸頭',.5);OC.Sim.log(a.c,`你摸了摸${a.c.name}的頭`,'hand')}
  OC.Store.save()},
 /* 開心反應（小怪癖） */
 happy(a){const q=a.c.quirks.happy;a.face='joy';setTimeout(()=>{if(a.face==='joy')a.face=null},1600);
  if(q==='hop')a.hop(2.2);else if(q==='spin'){let n=0;const iv=setInterval(()=>{a.facing*=-1;if(++n>=4)clearInterval(iv)},110)}else if(q==='sparkle')OC.Fx.sparkle(a.x,1.1,a.z,10);else if(q==='dance'){a.pose='cheer';setTimeout(()=>{if(a.pose==='cheer')a.pose='stand'},1500)}else if(q==='blush'){a.blushK=2.4;a.feel('blush')}else a.feel('heart')},
 /* ---------- 給予物品 ---------- */
 give(a,id){const it=C.ITEM[id],c=a.c;if(!it||Items.qty(id)<=0)return false;
  if(a.task&&a.task.def.pose==='sleep'){a.say('呼…（睡得正熟）');return false}
  if(a.task)OC.Sim.finish(a,false);a.goal=null;a.facing=a.facing||1;
  if(it.cat==='food'||it.cat==='drink'){const v=Chars.taste(c,it);
   if(c.needs.hunger>96&&it.cat==='food'){a.say('我吃不下了…');a.feel('sweat');return false}
   Items.take(id);U.emit('tut','feed');a.hold=it.em;a.holdK=1;a.pose='eat';a.face=v<0?'worry':null;
   const dur=c.quirks.eat==='fast'?1.4:c.quirks.eat==='slow'?3.2:2.2;
   this.timed(a,dur,()=>{a.hold=null;a.pose='stand';for(const [k,n] of Object.entries(it.fx||{}))c.needs[k]=U.clamp(c.needs[k]+n*(v<0?.6:1),0,100);
    c.foodSeen=c.foodSeen||{};c.foodSeen[id]=v;
    a.say(Chars.say(c,U.pick(C.LINES.eat[v])),{tone:v<0?'sad':null});
    if(v>=1){a.face='joy';OC.Fx.hearts(a.x,1.2,a.z,v+1);c.emo.joy=Math.min(1,c.emo.joy+.15*v);c.bond+=2+v;this.happy(a)}
    else if(v<0){a.face=v===-2?'angry':'worry';a.feel(v===-2?'anger':'sweat');c.emo.anger=Math.min(1,c.emo.anger+(v===-2?.25:.05));if(v===-2&&Math.random()<.3)OC.Sim.getSick(a,'tummy')}
    if(it.heal&&c.health.sick)OC.Sim.heal(a,it.heal,`吃了${it.name}`);
    setTimeout(()=>{if(['joy','worry','angry'].includes(a.face))a.face=null},1800);
    OC.Sim.remember(c,'food',`吃了${it.name}（${C.PREF.find(p=>p[0]===v)[1]}）`,v*.3);OC.Sim.checkWish(a,'eat',id);OC.Quests.on('feed',c);OC.Sim.log(c,`${c.name}吃了${it.em}${it.name}：${C.PREF.find(p=>p[0]===v)[1]}`,'food')});return true}
  if(it.cat==='medicine'){if(!c.health.sick){a.say('我沒有生病喔～');return false}Items.take(id);a.face='worry';a.say('好苦…');this.timed(a,1.2,()=>{OC.Sim.heal(a,it.heal,'吃藥')});return true}
  if(it.cat==='care'){Items.take(id);a.pose='sit';a.face='soft';OC.Fx.sparkle(a.x,.9,a.z,12,'#DDF3FF');this.timed(a,2,()=>{a.pose='stand';c.needs.hygiene=Math.min(100,c.needs.hygiene+(it.fx.hygiene||50));a.say('洗得香香的～');a.face=null});return true}
  if(it.cat==='toy'){a.hold=it.em;a.pose='cheer';a.face='joy';this.timed(a,2.8,()=>{a.hold=null;a.pose='stand';a.face=null;for(const [k,n] of Object.entries(it.fx||{}))c.needs[k]=U.clamp(c.needs[k]+n,0,100);a.say('好好玩！');OC.Sim.remember(c,'toy',`玩了${it.name}`,.5);c.bond+=2});
   const iv=setInterval(()=>{if(!a.hold){clearInterval(iv);return}a.hop(1.8);a.facing*=-1},700);return true}
  if(it.cat==='gift'||it.cat==='col'||it.cat==='fish'||it.cat==='bug'){Items.take(id);const like=(it.gift||1)+(c.profile.likes||[]).some(l=>it.name.includes(l))*2;a.hold=it.em;a.face='joy';
   this.timed(a,1.6,()=>{a.hold=null;a.say(U.pick(C.LINES.gift));OC.Fx.hearts(a.x,1.2,a.z,Math.min(5,like+1));c.bond+=like*2;c.emo.joy=Math.min(1,c.emo.joy+.2);c.emo.sad=Math.max(0,c.emo.sad-.3);if(c.health.sick==='blue')OC.Sim.heal(a,1,'收到禮物');this.happy(a);OC.Sim.remember(c,'gift',`收到你送的${it.name}`,.8);OC.Quests.on('gift',c);OC.Sim.log(c,`你送給${c.name}${it.em}${it.name}`,'gift')});return true}
  if(it.cat==='seed'){OC.UI.toast('種子可以在家園的花圃種下','info');return false}
  return false},
 timed(a,s,fn){a.lockT=s;const T={def:{id:'_p',pose:a.pose,gain:{},dur:[s,s]},lock:1,phase:'hold'};a.task=T;setTimeout(()=>{if(a.task===T)a.task=null;try{fn()}catch(e){console.error(e)}OC.Store.save()},s*1000)},
 /* ---------- 抱起與放下 ---------- */
 pick(a){if(a.task)OC.Sim.finish(a,false);if(a.inter)OC.Social.end(a.inter);a.held=true;a.pose='held';a.goal=null;a.y=.5;U.buzz(10);
  const c=a.c;a.say(Chars.line(c,'drop')||U.pick(C.LINES.wake),{life:1.6});if(Chars.has(c,'timid'))a.feel('sweat')},
 drop(a,x,z){a.held=false;const sc=OC.Scenes.get(a.loc);if(!sc.walk(x,z)){const p=sc.near(x,z,2);x=p.x;z=p.z}a.x=x;a.z=z;a.pose='stand';a.vy=-.5;a.y=Math.max(a.y,.6);U.buzz(8);
  if(Math.random()<.4)a.say(U.pick(['咚！','到了～','呼…']),{life:1.4})},
 /* ---------- 呼喚 ---------- */
 call(a,x,z){if(a.task&&a.task.def.pose==='sleep'){OC.Sim.finish(a,false);a.say(Chars.line(a.c,'wake')||U.pick(C.LINES.wake));a.feel('!')}else if(a.task)OC.Sim.finish(a,false);
  const sc=OC.Scenes.get(a.loc);const p=x!=null?(sc.ok(x,z)?{x,z}:sc.near(x,z,1.2)):sc.near(OC.R.cam.tx,OC.R.cam.tz+1,1.5);a.goal={x:p.x,z:p.z,fast:1};a.feel('!',1.2);
  setTimeout(()=>{if(!a.goal&&!a.task){a.say(Chars.line(a.c,'call')||U.pick(['來了來了！','叫我嗎？','我在這裡！']));a.hop(1.4)}},1800)}};
OC.Play=Play;
})(window.OC);
