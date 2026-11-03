/* OC Shimeji v4.1 · 群體生活：營火聚會、拜訪朋友、黏人跟隨、下雨躲雨、八卦聊天 */
(function(OC){'use strict';
const {U,Content:C,Chars,Env}=OC;
const Group={t:0,lastParty:0,wasRain:false,
 tick(dt){this.t+=dt;if(this.t<15)return;this.t=0;const S=OC.Sim;if(!S.agents.size)return;const A=[...S.agents.values()];
  this.rain(A);this.party(A);this.visit(A);this.follow(A)},
 free:a=>!a.busy()&&!a.away&&(!a.task||OC.Sim.casual(a)),
 /* 下雨了：在外面的夥伴跑去屋內或樹下 */
 rain(A){const r=Env.rainy();if(r&&!this.wasRain){for(const a of A){if(a.loc==='house'||!this.free(a))continue;const hasHouse=OC.S.world.house&&OC.S.world.house.placed;
   if(OC.Sim.visible(a))a.say(U.pick(['下雨了！快躲雨～','哇，好多雨！','我的尾巴要濕了！']),{life:2});
   if(a.loc==='home'&&hasHouse&&!Chars.has(a.c,'nature')){OC.Sim.start(a,OC.Acts.ACT.sofa,{cmd:1})}else OC.Sim.start(a,OC.Acts.ACT.shade,{cmd:1})}}
  this.wasRain=r},
 /* 傍晚營火聚會：外向／領袖型的夥伴邀請大家 */
 party(A){if(Date.now()-this.lastParty<12*60e3||!(Env.phase==='dusk'||Env.isNight())||Env.rainy())return;const host=A.find(a=>this.free(a)&&a.loc==='home'&&(Chars.has(a.c,'extrovert')||Chars.has(a.c,'leader')||Chars.has(a.c,'friendlyhost')||Chars.sl(a.c,'social')>.7));
  if(!host||Math.random()>.35)return;const guests=A.filter(a=>a!==host&&this.free(a)&&!OC.Social.rel(host.id,a.id).broken);if(!guests.length)return;this.lastParty=Date.now();
  const fire=OC.Scenes.get('home').objs.find(o=>o.act==='campfire');if(!fire)return;
  if(OC.Sim.visible(host))host.say(Chars.say(host.c,'大家！今晚一起圍營火吧！'),{life:3});OC.Sim.log(host.c,`${host.c.name}邀請大家晚上一起圍營火`,'star');
  const all=[host,...guests];all.forEach((a,i)=>{const T=OC.Acts.ACT.campfire;OC.Sim.start(a,T,{cmd:1,loc:'home'});if(a.task){a.task.dur=90;a.task.party=1}});
  /* 聚會中：輪流說話，結束時大家的感情都變好 */
  let n=0;const iv=setInterval(()=>{n++;const here=all.filter(a=>a.task&&a.task.party&&a.task.phase==='do');if(here.length>=2&&OC.Sim.visible(here[0])){const sp=U.pick(here);sp.say(Chars.say(sp.c,U.pick(['我們來講鬼故事吧！','火光好溫暖～','今天過得好開心。','下次也要一起喔！','棉花糖烤好了！',`${U.pick(here).c.name}，你今天做了什麼？`])),{life:2.8});if(Math.random()<.5)OC.Fx.hearts(sp.x,1.3,sp.z,1)}
   if(n>=8){clearInterval(iv);for(let i=0;i<here.length;i++)for(let j=i+1;j<here.length;j++){OC.Social.bond(here[i],here[j],5,'一起圍營火聊天')}for(const a of here)OC.Sim.remember(a.c,'party','和大家圍營火聊到很晚',.9,here.filter(x=>x!==a).map(x=>x.id),'home');if(here.length>=2)OC.Sim.log(null,`${here.map(a=>a.c.name).join('、')}一起度過了溫暖的營火夜。`,'heart')}},10000)},
 /* 想念好朋友：去朋友所在的地點 */
 visit(A){for(const a of A){if(!this.free(a)||a.c.needs.social>45||Math.random()>.3)continue;let best=null,bf=30;for(const o of A){if(o===a||o.loc===a.loc||o.away)continue;const r=OC.Social.rel(a.id,o.id);if(!r.broken&&r.f>bf){bf=r.f;best=o}}
   if(best){OC.Sim.sendTo(a,best.loc);if(OC.Sim.visible(a))a.say(`去找${best.c.name}玩～`,{life:2});OC.Sim.log(a.c,`${a.c.name}跑去${C.LOC[best.loc].t}找${best.c.name}`,'heart');return}}},
 /* 黏人的夥伴會跟著你正在操控的夥伴 */
 follow(A){const me=OC.Sim.active();if(!me||me.away)return;for(const a of A){if(a===me||a.loc!==me.loc||!this.free(a))continue;if(!(Chars.has(a.c,'clingy')||OC.Social.rel(a.id,me.id).f>60))continue;if(Math.random()>.25)continue;
   const d=Math.hypot(a.x-me.x,a.z-me.z);if(d>3){const sc=OC.Scenes.get(a.loc);const p=sc.near(me.x,me.z,1.4);a.goal={x:p.x,z:p.z};if(OC.Sim.visible(a)&&Math.random()<.4)a.say(U.pick([`等等我～${me.c.name}！`,'我也要去！','一起走嘛～']),{life:1.8})}}}};
OC.Group=Group;
})(window.OC);
