/* OC Shimeji v4 · 生活模擬核心：需求、情緒、效用 AI、移動、旅行、記憶、生病、願望、特質成長 */
(function(OC){'use strict';
const {U,Content:C,Chars,Acts,Env,Items}=OC;
const EXIT={home:{x:-8.6,z:6.6},plaza:{x:-9.4,z:3.2},beach:{x:-11.2,z:.4},forest:{x:-9.6,z:4.6},house:{x:0,z:2.3}};
const urg=n=>Math.pow(U.clamp((100-n)/100,0,1),1.5)*1.5+.04;
const scene=id=>OC.Scenes.get(id);

/* ================= Agent：模擬＋渲染共用的角色實體 ================= */
class Agent{constructor(c){this.c=c;this.isActor=true;this.id=c.id;this.y=0;this.vx=0;this.vz=0;this.vy=0;this.facing=Math.random()<.5?1:-1;this.pose='stand';this.task=null;this.goal=null;this.stuck=0;this.dcd=U.rnd(.5,3);this.nameT=0;this.alpha=1;
  const sc=scene(c.loc);if(c.x==null||!sc.ok(c.x,c.z)){const p=sc.randomPoint();c.x=p.x;c.z=p.z}this.x=c.x;this.z=c.z;this.lastAct=[];this.socT=U.rnd(8,20)}
 get loc(){return this.c.loc}
 say(text,o={}){if(!text)return;this.bubble={text,t:0,life:o.life||Math.min(6,2.2+text.length*.14),tone:o.tone};OC.Sim.heard(this,text)}
 feel(k,life=1.6){this.emote={k,t:0,life}}
 squash(v=.82){if(this.an)this.an.sq.x=v,this.an.sq.v=0}
 hop(h=1.6){if(this.y<=.001){this.vy=h;this.squash(.86)}}
 busy(){return !!(this.held||this.petting||this.inter||(this.task&&this.task.lock))}}
Agent.prototype.update=function(dt){/* 跳躍物理 */
 if(this.y>0||this.vy>0){this.vy-=9.8*dt;this.y+=this.vy*dt;if(this.y<=0){this.y=0;if(this.vy<-1.2){this.squash(U.clamp(1+this.vy*.05,.72,.95));if(OC.R.sc&&OC.R.sc.id===this.loc)OC.Fx.dust(this.x,this.z,3)}this.vy=0}}
 if(this.bubble){this.bubble.t+=dt;if(this.bubble.t>this.bubble.life)this.bubble=null}
 if(this.emote){this.emote.t+=dt;if(this.emote.t>this.emote.life)this.emote=null}
 if(this.nameT>0)this.nameT-=dt;if(this.blushK>0)this.blushK-=dt*.4};

const Sim={agents:new Map(),acc:0,t:0,
 init(){this.sync();U.on('chars',()=>this.sync())},
 sync(){const S=OC.S;for(const c of S.chars){if(c.onIsland!==false&&!this.agents.has(c.id))this.agents.set(c.id,new Agent(c))}
  for(const [id,a] of this.agents){const c=S.chars.find(x=>x.id===id);if(!c||c.onIsland===false){this.agents.delete(id)}else a.c=c}
  this.refreshActors()},
 /* 目前畫面上的角色 */
 refreshActors(){const loc=OC.R.sc?OC.R.sc.id:'home';const max=OC.Store.perf().maxChars;OC.R.actors=[...this.agents.values()].filter(a=>a.loc===loc&&!a.away).slice(0,max)},
 get(id){return this.agents.get(id)},
 active(){return this.agents.get(OC.S.activeId)||this.agents.values().next().value||null},

 /* ================= 每格 ================= */
 tick(dt){this.t+=dt;for(const a of this.agents.values()){a.update(dt);this.move(a,dt);this.runTask(a,dt)}
  this.acc+=dt;if(this.acc>=.25){const step=this.acc;this.acc=0;this.slow(step)}},
 /* 4Hz：需求、情緒、決策、社交 */
 slow(dt){const H=dt/3600;for(const a of this.agents.values()){const c=a.c;this.decay(c,H,a);this.health(a,dt);this.moodOf(c);
   if(!a.busy()&&!a.task){a.dcd-=dt;if(a.dcd<=0){a.dcd=U.rnd(1.5,4)/(.6+Chars.sl(c,'pace')*.8);this.decide(a)}}
   a.socT-=dt;if(a.socT<=0&&!a.busy()){a.socT=U.rnd(10,22)/(.5+Chars.sl(c,'social'));OC.Social&&OC.Social.maybe(a)}
   c.x=a.x;c.z=a.z}
  this.saveT=(this.saveT||0)+dt;if(this.saveT>8){this.saveT=0;OC.Store.save()}
  this.wishT=(this.wishT||0)+dt;if(this.wishT>45){this.wishT=0;for(const a of this.agents.values())this.wish(a)}
  this.growT=(this.growT||0)+dt;if(this.growT>60){this.growT=0;for(const a of this.agents.values())this.growth(a.c)}},
 decay(c,H,a){const sick=c.health.sick&&C.SICK[c.health.sick];for(const [k,r] of Object.entries(C.DECAY)){let rate=r*Chars.needW(c,k);if(sick&&sick.fx[k])rate*=sick.fx[k];
   if(k==='hunger'&&c.quirks.appetite==='big')rate*=1.35;if(k==='hunger'&&c.quirks.appetite==='small')rate*=.75;
   if(k==='energy'&&a&&(a.pose==='run'||a.task&&a.task.def.fast))rate*=2.2;
   if(k==='social'&&Chars.sl(c,'social')<.35)rate*=.65;
   if(k==='hygiene'&&Env.rainy()&&c.loc!=='house')rate*=1.6;
   c.needs[k]=U.clamp(c.needs[k]-rate*H,0,100)}
  for(const k of ['anger','sad'])c.emo[k]=Math.max(0,c.emo[k]-H*(k==='anger'?1.4:.8)*(Chars.soc(c,'forgive')));c.emo.joy=Math.max(0,c.emo.joy-H*.8)},
 moodOf(c){const n=c.needs,e=c.emo;let m='content';
  if(c.health.sick)m='sick';else if(e.anger>.45)m='angry';else if(e.sad>.45||n.fun<12&&n.social<15)m='sad';else if(n.hunger<22)m='hungry';else if(n.energy<18)m='sleepy';
  else if(n.social<22)m='lonely';else if(n.fun<22)m='bored';else if(e.joy>.75)m='loved';else{const avg=(n.hunger+n.energy+n.fun+n.social+n.comfort+n.hygiene)/6;m=avg>72?(e.joy>.4?'excited':'happy'):'content'}
  if(m!==c.mood){c.mood=m;c.moodT=Date.now();U.emit('mood',c)}const a=this.agents.get(c.id);if(a)a.mood=m,a.sick=!!c.health.sick;return m},
 score(c){const n=c.needs;return Math.round((n.hunger+n.energy+n.fun+n.social+n.comfort+n.hygiene)/6)},

 /* ================= 決策（效用 AI） ================= */
 decide(a){const c=a.c,night=Env.isNight(),dusk=Env.phase==='dusk',hasHouse=!!(OC.S.world.house&&OC.S.world.house.placed),rainy=Env.rainy(),h=Env.h;
  const chrono=Chars.chrono(c);/* 夜貓子越晚越清醒；早起型清晨特別有精神 */
  const sleepy=(night?1:0)+(h>=22||h<6?.6:0)-chrono*.25;
  const cands=[];
  for(const d of Acts.ACTS){if(d.loc.includes('house')&&d.loc.length===1&&!hasHouse)continue;
   let g=0;for(const [k,v] of Object.entries(d.gain))g+=v*urg(c.needs[k])*Chars.needW(c,k);if(g<=0)g=.02;
   let w=g*d.w*Chars.aiW(c,d.id);
   for(const [k,v] of Object.entries(Acts.AI_ALIAS))if(v===d.id)w*=Chars.aiW(c,k);
   if(d.id==='sleep'){w*=sleepy>.5&&c.needs.energy<80?4.5:c.needs.energy<20?2:.06}
   if(d.id==='nap'){w*=sleepy>.5?.4:c.needs.energy<45?1.3:.4}
   if(d.night)w*=night?(d.night===2?3.2:2):.12;if(d.dusk)w*=dusk?3.5:.18;if(d.day)w*=night?.05:1;
   if(rainy&&!d.loc.includes('house')&&!['cafe','shop'].includes(d.id))w*=Chars.has(c,'timid')?.15:.35;
   if(rainy&&d.loc.includes('house'))w*=1.6;
   if(night&&!d.loc.includes('house')&&!d.night&&d.id!=='stargaze')w*=Chars.has(c,'scaredark')?.15:.5;
   const here=d.loc.includes(c.loc);if(!here){const pace=Chars.sl(c,'pace');w*=.35+pace*.2+(Chars.has(c,'homebody')&&!d.loc.includes('home')&&!d.loc.includes('house')?-.2:0)+(Chars.has(c,'curious')?.12:0)}
   if(c.health.sick)w*=['sleep','nap','rest','sofa','eat','cook'].includes(d.id)?3:.35;
   if(a.lastAct.includes(d.id))w*=.35;
   /* 地點記憶：去過開心的地方更想去 */
   const mv=this.placeVal(c,d.loc[0]);w*=1+mv*.25;
   /* 願望 */
   if(c.wishes.some(x=>x.k==='do'&&x.act===d.id))w*=2.2;
   w*=U.rnd(.7,1.3);cands.push({d,w})}
  cands.sort((x,y)=>y.w-x.w);const top=cands.slice(0,4);const pick=U.weighted(top.map(x=>({...x,w:x.w*x.w})));if(pick)this.start(a,pick.d)},
 placeVal(c,loc){let s=0,n=0;for(const m of c.memories){if(m.loc===loc){s+=m.val;n++}}return n?U.clamp(s/n,-1,1):0},
 /* 開始行動：決定目的地（可能需要旅行到別的地點） */
 start(a,d,opt={}){const c=a.c;let loc=d.loc.includes(c.loc)?c.loc:opt.loc||U.pick(d.loc);
  if(d.loc.includes('house')&&d.loc.length===1&&!(OC.S.world.house&&OC.S.world.house.placed))return false;
  const T={def:d,loc,t:0,dur:U.rnd(...d.dur)*(c.quirks.eat==='slow'&&d.pose==='eat'?1.4:c.quirks.eat==='fast'&&d.pose==='eat'?.7:1),phase:'go',cmd:opt.cmd,with:opt.with};
  a.task=T;a.lastAct.unshift(d.id);a.lastAct.length=Math.min(a.lastAct.length,3);
  if(loc!==c.loc){this.travel(a,loc);return true}
  this.target(a,T);return true},
 target(a,T){const sc=scene(T.loc),d=T.def;let tgt=null;
  if(d.obj){const keys=Array.isArray(d.obj)?d.obj:[d.obj];const objs=sc.objs.filter(o=>keys.includes(o.act));
   const free=objs.filter(o=>this.users(o)<(o.seat?2:3));tgt=free.length?free.reduce((b,o)=>!b||Math.hypot(o.x-a.x,o.z-a.z)<Math.hypot(b.x-a.x,b.z-a.z)?o:b,null):null;
   if(!tgt&&!d.spot){a.task=null;return}}
  T.obj=tgt;let p;
  if(tgt){p=this.useSpot(sc,tgt,a)}else if(d.spot&&sc.spots[d.spot]){const s=sc.spots[d.spot];p=sc.near(s.x,s.z,1.4)}else p=sc.near(a.x,a.z,4.5);
  T.gx=p.x;T.gz=p.z;a.goal={x:p.x,z:p.z,fast:d.fast}},
 users(o){let n=0;for(const a of this.agents.values())if(a.task&&a.task.obj===o)n++;return n},
 useSpot(sc,o,a){const n=this.users(o);/* 長椅：坐在上面；其他：站在物件前方 */
  if(o.seat&&o.type!=='furn'){const off=n%2?.35:-.35;return{x:o.x+off,z:o.z+.02,sit:1}}
  if(o.type==='furn'){const F={bed:[0,.1],sofa:[n?.35:-.35,.15],table:[n?.6:-.6,.55],kitchen:[0,.75],shelf:[0,.65],radio:[0,.55],bath:[0,.2],plant:[0,.4]};const f=F[o.k]||[0,.6];return{x:o.x+f[0],z:o.z+f[1]}}
  if(o.type==='house')return sc.spots.door;
  if(o.type==='shop')return{x:o.x+(n-1)*.6,z:o.z+1.9};
  const ang=U.rnd(.3,2.8),r=(o.r||.5)+.55;const p={x:o.x+Math.cos(ang)*r,z:o.z+Math.abs(Math.sin(ang))*r*.9};return sc.ok(p.x,p.z)?p:sc.near(o.x,o.z+1,1.6)},

 /* ================= 執行行動 ================= */
 runTask(a,dt){const T=a.task;if(!T||a.held||a.petting||T.lock)return;const d=T.def,c=a.c;
  if(T.phase==='leave'){if(!a.goal){T.phase='away';a.away=true;a.awayT=(T.door?U.rnd(1,1.6):U.rnd(5,9));this.refreshActors()}return}
  if(T.phase==='away'){a.awayT-=dt;a.alpha=0;if(a.awayT<=0){const sc=scene(T.loc);c.loc=T.loc;const e=(T.loc==='home'&&a.fromLoc==='house')?sc.spots.door:EXIT[T.loc]||{x:0,z:0};const p=sc.ok(e.x,e.z)?e:sc.near(e.x,e.z,1.5);a.x=p.x;a.z=p.z;a.away=false;a.fadeIn=0;T.phase='go';this.refreshActors();this.target(a,T);U.emit('loc',a)}return}
  if(a.fadeIn!=null){a.fadeIn+=dt*2;a.alpha=Math.min(1,a.fadeIn);if(a.fadeIn>=1){a.fadeIn=null;a.alpha=1}}
  if(T.phase==='go'){if(a.goal){a.pose=a.goal.fast?'run':'walk';return}T.phase='do';T.t=0;a.pose=d.pose==='walk'||d.pose==='run'?'stand':d.pose;
   if(T.obj&&T.obj.seat||d.pose==='sit'||d.pose==='sleep'){a.squash(.88)}
   if(T.obj){a.facing=T.obj.x>a.x?1:-1;if(T.obj.type==='furn'&&['bed','sofa'].includes(T.obj.k)){a.gy=T.obj.k==='bed'?.5:.38;a.z=T.obj.z+.25}else if(T.obj.seat&&T.obj.type==='bench'){a.gy=.32}else if(T.obj.seat)a.gy=.3}
   if(d.inside){a.alpha=1;a.inside=1}
   if(d.hold)a.hold=d.hold,a.holdK=1;
   if(d.lookUp)a.lookAt=0;
   this.onStart(a,T);return}
  /* do */
  T.t+=dt;for(const [k,v] of Object.entries(d.gain))c.needs[k]=U.clamp(c.needs[k]+v*dt*(c.health.sick&&k!=='energy'?.7:1),0,100);
  if(d.wander&&!a.goal&&Math.random()<dt*.5){const sc=scene(c.loc),p=sc.near(a.x,a.z,d.fast?3.5:2.2);a.goal={x:p.x,z:p.z,fast:d.fast};a.pose=d.fast?'run':'walk'}
  if(d.wander&&!a.goal&&a.pose!==d.pose)a.pose=d.pose==='walk'||d.pose==='run'?'look':d.pose;
  if(a.hold&&d.pose==='eat')a.holdK=1-T.t/T.dur;
  if(d.notes&&Math.random()<dt*1.2&&this.visible(a))OC.Fx.note(a.x,1.3,a.z);
  if(d.pose==='sleep'&&Math.random()<dt*.6&&this.visible(a))OC.Fx.add({k:'zz',x:a.x+.2,z:a.z,y:1.1+(a.gy||0),vy:.25,vx:.12,life:2.2,sz:.12});
  if(d.id==='sleep'&&c.quirks.sleep==='talk'&&Math.random()<dt*.03)a.say(U.pick(C.LINES.sleepTalk),{life:3});
  if(d.id==='sleep'&&c.quirks.sleep==='toss'&&Math.random()<dt*.05)a.facing*=-1;
  if(d.id==='fish'&&Math.random()<dt*.08&&this.visible(a)){OC.Fx.splash(a.x+.6*a.facing,a.z+1.1,4)}
  /* 睡覺：睡飽或天亮就起床 */
  const done=T.t>=T.dur||(d.id==='sleep'&&c.needs.energy>=97&&!Env.isNight())||(d.pose==='eat'&&c.needs.hunger>=99);
  if(done)this.finish(a,true)},
 onStart(a,T){const c=a.c,d=T.def;
  if(Math.random()<.35&&this.visible(a)){const line=this.actLine(c,d);if(line)a.say(line)}
  if(d.id==='stargaze'||d.id==='sunset')a.feel('spark',2);
  if(d.id==='sleep'||d.id==='nap')a.bubble=null},
 actLine(c,d){const T={cook:['今天來做點好吃的！','聞起來好香～'],eat:['開動了！','好好吃～'],cafe:['來杯熱可可吧。','這裡的蛋糕最好吃了！'],read:['再讀一章就好…','這本書好好看。'],garden:['快快長大喔～','今天也要澆水。'],fish:['今天會釣到什麼呢？','噓…魚要上鉤了。'],shells:['這個貝殼好漂亮！','又撿到一個～'],explore:['那邊好像有什麼…','冒險出發！'],stargaze:['今晚的星星好亮。','是流星嗎？'],sunset:['夕陽好美…','今天也辛苦了。'],campfire:['火光好溫暖。','要不要烤棉花糖？'],music:['啦啦啦～','這首歌好好聽！'],play:['來玩吧！','抓到你了！'],tidy:['打掃乾淨心情好。'],bathe:['洗香香～'],sofa:['好軟喔…不想動了。'],shop:['今天有什麼新東西呢？'],forage:['蘑菇蘑菇在哪裡～']};
  const p=T[d.id];if(p)return Chars.say(c,U.pick(p));const l=Chars.line(c,'idle');return Math.random()<.4?l:null},
 finish(a,ok){const T=a.task;if(!T)return;const c=a.c,d=T.def;a.task=null;a.gy=0;a.hold=null;a.lookAt=null;a.inside=0;a.alpha=1;a.pose='stand';
  if(ok&&T.phase==='do'&&T.t>d.dur[0]*.5){c.counters[d.id]=(c.counters[d.id]||0)+1;if(Env.isNight())c.counters._night=(c.counters._night||0)+1;
   if(d.skill)this.skill(c,d.skill,1);
   this.result(a,T);
   OC.Quests&&OC.Quests.on('act:'+d.id,c);
   for(const w of c.wishes)if(w.k==='do'&&w.act===d.id)this.fulfill(a,w)}
  if(d.then&&ok)this.start(a,Acts.ACT[d.then])},
 /* 行動結果：收穫、記憶、心情 */
 result(a,T){const c=a.c,d=T.def;const lucky=Chars.has(c,'lucky')?1.6:1;
  if(d.loot&&Math.random()<.75*lucky){const sk=(c.skills[d.skill]||0);const pool=d.loot;let id=pool[Math.min(pool.length-1,Math.floor(Math.random()*(pool.length-1+Math.min(1,sk/60)+(lucky>1?.6:0))))];
   if(id){Items.add(id,1);const it=C.ITEM[id];this.log(c,`${c.name}在${C.LOC[c.loc].t}${d.t==='釣魚'?'釣到了':'找到了'}${it.em}${it.name}`,it.rare?'star':'leaf');
    if(this.visible(a)){a.say(it.rare?`哇！是${it.name}！`:`找到${it.name}了～`);a.feel(it.rare?'spark':'note');OC.Fx.sparkle(a.x,1.2,a.z,it.rare?10:5)}
    if(it.rare)this.remember(c,'find',`找到稀有的${it.name}`,.8,[],c.loc);OC.Quests&&OC.Quests.on('loot:'+it.cat,c)}}
  if(d.id==='garden'){const G=OC.S.world.garden;const k=T.obj&&T.obj.plot;if(k!=null){const p=G[k]||(G[k]={g:0});p.g=Math.min(4,(p.g||0)+1);p.t=Date.now();if(p.g>=4&&Math.random()<.5){Items.add('flower',2);p.g=1;this.log(c,`${c.name}的花圃開花了，收成了野花`,'leaf')}OC.R.invalidate()}}
  if(d.id==='cook'&&Math.random()<.25+c.skills.cooking/200){const f=U.pick(['onigiri','soup','bread','cookie']);Items.add(f,1);this.log(c,`${c.name}做了${C.ITEM[f].em}${C.ITEM[f].name}，放進了背包`,'heart')}
  if(['stargaze','sunset'].includes(d.id)&&Math.random()<.5){const others=[...this.agents.values()].filter(o=>o!==a&&o.task&&o.task.def.id===d.id);this.remember(c,'view',d.id==='stargaze'?'看到滿天星星':'看了很美的夕陽',.6,others.map(o=>o.id),c.loc);for(const o of others){OC.Social&&OC.Social.bond(a,o,4,'一起'+d.t)}}
  if(Math.random()<.2)this.remember(c,'act',d.t,.25,[],c.loc)},
 /* ================= 旅行 ================= */
 travel(a,loc){const T=a.task,c=a.c;T.phase='leave';a.fromLoc=c.loc;
  const from=c.loc;const e=from==='house'?scene('house').spots.door:(loc==='house'?scene('home').spots.door:EXIT[from]);a.goal={x:e.x,z:e.z};
  if(from==='home'&&loc==='house'||from==='house'&&loc==='home'){T.door=1}
  if(this.visible(a)&&Math.random()<.4)a.say(Chars.say(c,U.pick([`我去${C.LOC[loc].t}一下～`,`出發去${C.LOC[loc].t}！`,'我先走囉。'])))},
 sendTo(a,loc){/* 玩家指示：帶夥伴去某地 */const T={def:{id:'go',t:'前往',gain:{},dur:[3,6],pose:'stand',loc:[loc]},loc,t:0,dur:4,phase:'go'};a.task=T;if(loc!==a.c.loc)this.travel(a,loc);else this.target(a,T)},
 /* ================= 移動（避障、互相讓路） ================= */
 move(a,dt){const sc=scene(a.loc);if(a.held||a.away)return;
  if(!a.goal){a.vx=U.approach(a.vx,0,10,dt);a.vz=U.approach(a.vz,0,10,dt);if(Math.abs(a.vx)<.02&&(a.pose==='walk'||a.pose==='run'))a.pose=a.task&&a.task.phase==='do'?a.pose:'stand';return}
  const c=a.c;const dx=a.goal.x-a.x,dz=a.goal.z-a.z,dist=Math.hypot(dx,dz);
  if(dist<.12){a.goal=null;a.stuck=0;return}
  const W=c.quirks.walk;let sp=(.75+Chars.sl(c,'pace')*.55)*(W==='shuffle'?.78:W==='tiptoe'?1.05:W==='bouncy'?1.05:1)*(a.goal.fast?2.3:1)*(c.health.sick?.65:1)*(Chars.has(c,'athletic')?1.12:1);
  sp=Math.min(sp,dist*3+.3);let ang=Math.atan2(dz,dx);let ok=false,nx=a.x,nz=a.z;
  const tries=[0,.45,-.45,.9,-.9,1.35,-1.35,1.8,-1.8];if(a.avoid)tries.sort((p,q)=>Math.abs(p-a.avoid*.45)-Math.abs(q-a.avoid*.45));
  for(const off of tries){const an=ang+off;const px=a.x+Math.cos(an)*sp*dt,pz=a.z+Math.sin(an)*sp*dt;if(sc.ok(px,pz,a.task&&a.task.obj)||dist<.9&&sc.walk(px,pz)){nx=px;nz=pz;ok=true;if(off)a.avoid=Math.sign(off);break}}
  /* 和其他角色保持距離 */
  for(const o of this.agents.values()){if(o===a||o.loc!==a.loc||o.away)continue;const ex=nx-o.x,ez=nz-o.z,d2=ex*ex+ez*ez;if(d2<.28&&d2>1e-4){const d=Math.sqrt(d2);nx+=ex/d*(.53-d)*.25;nz+=ez/d*(.53-d)*.25}}
  if(!ok||!sc.walk(nx,nz)){a.stuck+=dt;if(a.stuck>1.4){a.goal=null;a.stuck=0}return}
  a.stuck=Math.max(0,a.stuck-dt);const vx=(nx-a.x)/dt,vz=(nz-a.z)/dt;a.vx=U.approach(a.vx,vx,12,dt);a.vz=U.approach(a.vz,vz,12,dt);a.x=nx;a.z=nz;
  if(Math.abs(a.vx)>.08)a.facing=a.vx>0?1:-1;if(a.pose!=='walk'&&a.pose!=='run')a.pose=a.goal.fast?'run':'walk';
  if(a.pose==='run'&&Math.random()<dt*3&&this.visible(a))OC.Fx.dust(a.x,a.z,1)},
 visible(a){return OC.R.sc&&OC.R.sc.id===a.loc&&!a.away},

 /* ================= 健康與生病 ================= */
 health(a,dt){const c=a.c,H=c.health,now=Date.now();
  if(H.sick){if(now>=H.until){this.recover(a,'自然痊癒');return}
   if(Math.random()<dt*.025&&this.visible(a)){const s=H.sick;if(s==='cold'){a.say(U.pick(C.LINES.sick.cold),{life:2});a.squash(.8);a.feel('sweat')}else{a.say(U.pick(C.LINES.sick[s]),{life:2.6,tone:'sad'});a.feel('sick',2)}}
   if(H.sick==='tired'&&a.task&&a.task.def.id==='sleep')H.until-=dt*1000*3;return}
  if(now<H.immune)return;const n=c.needs;let risk=0;
  if(n.hygiene<20)risk+=.6;if(n.energy<12)risk+=.8;if(Env.rainy()&&c.loc!=='house'&&!a.inside)risk+=.35;if(n.hunger<8)risk+=.4;if(c.emo.sad>.7)risk+=.5;
  if(!risk)return;if(Math.random()<risk*dt/1800){const k=n.energy<12?'tired':c.emo.sad>.7?'blue':n.hunger<8?'tummy':'cold';this.getSick(a,k)}},
 getSick(a,k){const c=a.c,S=C.SICK[k];if(c.health.sick||!S)return;if(!OC.S.settings.negEvents){return}
  c.health.sick=k;c.health.since=Date.now();c.health.until=Date.now()+S.dur*3600e3*U.rnd(.7,1.2);
  this.remember(c,'sick',`生病了（${S.t}）`,-.6,[],c.loc);this.log(c,`${c.name}${k==='blue'?'心情低落':'生病了'}：${S.t}。${S.d}`,'sick');
  OC.UI&&OC.UI.toast(`${c.name} ${S.t}了…`,'sick');this.moodOf(c);
  if(a.task&&!['sleep','nap','rest','sofa'].includes(a.task.def.id))this.finish(a,false);U.emit('sick',c)},
 heal(a,power,by){const c=a.c,H=c.health;if(!H.sick)return false;H.until-=power*3600e3*.6;if(Date.now()>=H.until||power>=2){this.recover(a,by);return true}a.feel('heart');a.say(by?'謝謝你照顧我…':'感覺好一點了…');return true},
 recover(a,by){const c=a.c,k=c.health.sick;if(!k)return;c.health.sick=null;c.health.immune=Date.now()+2*3600e3;c.needs.comfort=Math.min(100,c.needs.comfort+20);
  this.log(c,`${c.name}的${C.SICK[k].t}好了！${by?'（'+by+'）':''}`,'heart');this.remember(c,'recover','身體恢復了',.5,[],c.loc);
  if(this.visible(a)){a.say('我好了！完全恢復精神～');a.hop(2);OC.Fx.sparkle(a.x,1,a.z,8)}this.moodOf(c);U.emit('sick',c)},

 /* ================= 記憶、日誌、技能 ================= */
 remember(c,k,text,val,withIds=[],loc){c.memories.unshift({t:Date.now(),k,text,val,with:withIds,loc:loc||c.loc});
  if(c.memories.length>80){/* 保留重要（強烈情緒）的記憶 */c.memories.sort((a,b)=>Math.abs(b.val)*1e13+b.t-(Math.abs(a.val)*1e13+a.t));c.memories.length=70;c.memories.sort((a,b)=>b.t-a.t)}},
 log(c,text,ic='leaf'){OC.S.log.unshift({t:Date.now(),id:c&&c.id,text,ic});if(OC.S.log.length>240)OC.S.log.length=240;U.emit('log')},
 skill(c,k,n){const before=Math.floor((c.skills[k]||0)/20);c.skills[k]=Math.min(100,(c.skills[k]||0)+n*(Chars.has(c,'smart')?1.4:1));const after=Math.floor(c.skills[k]/20);
  if(after>before){const N={cooking:'料理',gardening:'園藝',fishing:'釣魚',reading:'閱讀',social:'社交',explore:'探索',fitness:'運動',creativity:'創意'};this.log(c,`${c.name}的${N[k]}技能升到 Lv.${after}！`,'star');OC.UI&&OC.UI.celebrate&&OC.UI.celebrate(c,`${N[k]}技能 Lv.${after}`,'技能升級');}},
 heard(a,text){/* 角色說話時，附近的人會注意 */},
 /* ================= 願望 ================= */
 wish(a){const c=a.c;c.wishes=c.wishes.filter(w=>Date.now()-w.t<40*60e3);if(c.wishes.length>=2||Math.random()<.5)return;
  const opts=[];const fav=Object.entries(c.foodPref).filter(([,v])=>v===2).map(([k])=>k);
  const foods=C.ITEMS.filter(i=>(i.cat==='food'||i.cat==='drink')&&i.tags.some(t=>fav.includes(t)));if(foods.length)opts.push({k:'eat',item:U.pick(foods).id,w:c.needs.hunger<60?2:1});
  const acts=['fish','stargaze','read','garden','cafe','explore','shells','music','campfire','picnic'].filter(x=>Chars.aiW(c,x)>1.1||Math.random()<.2);if(acts.length)opts.push({k:'do',act:U.pick(acts),w:1});
  const others=[...this.agents.values()].filter(o=>o!==a);if(others.length&&c.needs.social<70){const o=U.pick(others);const r=OC.Social&&OC.Social.rel(c.id,o.id);if(!r||!r.broken)opts.push({k:'talk',with:o.id,w:1})}
  opts.push({k:'pet',w:Chars.has(c,'clingy')?2:.6});
  const g=U.weighted(opts);if(!g)return;g.t=Date.now();g.id=U.uid('w');delete g.w;c.wishes.push(g);U.emit('wish',c)},
 wishText(c,w){if(w.k==='eat'){const it=C.ITEM[w.item];return`想吃${it.em}${it.name}`}if(w.k==='do')return`想${Acts.ACT[w.act]?.t||'玩'}`;if(w.k==='talk'){const o=OC.S.chars.find(x=>x.id===w.with);return`想跟${o?o.name:'朋友'}聊天`}if(w.k==='pet')return'想被摸摸頭';return'…'},
 fulfill(a,w){const c=a.c;c.wishes=c.wishes.filter(x=>x!==w);c.emo.joy=Math.min(1,c.emo.joy+.4);Items.coins(25);c.bond+=6;
  this.log(c,`${c.name}的願望實現了：${this.wishText(c,w)}（+25 星幣）`,'star');if(this.visible(a)){a.feel('spark',2);a.hop(2.2);OC.Fx.sparkle(a.x,1.1,a.z,10)}
  OC.UI&&OC.UI.toast(`${c.name}的願望實現了！+25 星幣`,'star');OC.Quests&&OC.Quests.on('wish',c);U.emit('wish',c)},
 checkWish(a,k,data){for(const w of [...a.c.wishes]){if(w.k===k&&(k!=='eat'||w.item===data)&&(k!=='talk'||w.with===data))this.fulfill(a,w)}},

 /* ================= 後天特質成長（需玩家同意） ================= */
 GROW:[['read',22,'bookworm','經常看書'],['garden',18,'nature','經常照顧花草'],['_night',30,'nightowl','常在夜晚活動'],['fish',18,'sealover','常去海邊釣魚'],['cook',14,'cook','常常下廚'],['explore',18,'curious','熱愛森林探險'],['tidy',16,'tidy','總是在打掃'],['stargaze',12,'stargazer','常常看星星'],['music',16,'music','常聽音樂'],['play',22,'athletic','常常跑跳玩耍'],['_chat',40,'extrovert','和大家聊了很多天'],['_comfort',8,'caring','常常安慰朋友'],['sofa',22,'lazy','老是窩在沙發'],['shells',18,'collector','熱衷撿貝殼']],
 growth(c){if(c.noSuggest||c.lockedTraits.includes('*')||c.traits.length>=8)return;if(OC.S.pending.some(p=>p.k==='trait'&&p.cid===c.id))return;
  for(const [k,n,t,why] of this.GROW){if((c.counters[k]||0)<n||c.traits.includes(t))continue;const dec=c.declined[t]||0;if(dec>Date.now())continue;if(c.traits.some(x=>C.EXCL(x,t)&&c.lockedTraits.includes(x)))continue;
   OC.S.pending.push({id:U.uid('p'),k:'trait',cid:c.id,trait:t,why,t:Date.now()});this.log(c,`${c.name}因為「${why}」，好像漸漸變得${C.TRAIT[t].t}了…`,'idea');U.emit('pending');return}},
 /* ================= 離線生活 ================= */
 offline(sec){if(sec<60)return null;const H=Math.min(sec/3600,48);const out=[];
  for(const c of OC.S.chars){if(c.onIsland===false)continue;
   for(const [k,r] of Object.entries(C.DECAY)){const floor=k==='energy'?45:35;c.needs[k]=Math.max(Math.min(c.needs[k],floor),c.needs[k]-r*H*.6)}
   /* 自己照顧自己：睡覺、吃飯（不懲罰長時間離線） */
   if(H>2){c.needs.energy=Math.max(c.needs.energy,70);c.needs.hunger=Math.max(c.needs.hunger,50)}
   if(c.health.sick&&Date.now()>c.health.until){c.health.sick=null;c.health.immune=Date.now()+3600e3}
   const n=Math.min(4,Math.floor(H*1.2));for(let i=0;i<n;i++){const opts=Acts.ACTS.filter(d=>d.loot||['read','garden','stargaze','cook','cafe'].includes(d.id));const d=U.weighted(opts.map(x=>({d:x,w:Chars.aiW(c,x.id)})))?.d;if(!d)continue;
    c.counters[d.id]=(c.counters[d.id]||0)+1;if(d.skill)this.skill(c,d.skill,1);let txt=`${c.name}${d.t}`;if(d.loot&&Math.random()<.6){const id=U.pick(d.loot);Items.add(id,1);txt+=`，帶回了${C.ITEM[id].em}${C.ITEM[id].name}`}out.push(txt)}}
  for(const t of out)this.log(null,'你不在的時候：'+t,'moon');
  if(OC.Social)OC.Social.offline(H);return{hours:H,lines:out}}};
Sim.EXIT=EXIT;Sim.Agent=Agent;
OC.Sim=Sim;
})(window.OC);
