/* OC Shimeji v4 · 多角色社交：聊天、玩耍、安慰、送禮、吵架、道歉、絕交、和好、告白 */
(function(OC){'use strict';
const {U,Content:C,Chars,Env}=OC;
const key=(a,b)=>a<b?a+'|'+b:b+'|'+a;
const LBL={stranger:'陌生',acq:'認識',friend:'朋友',good:'好友',best:'摯友',bad:'不合',broken:'絕交',lovers:'戀人',family:'家人',rival:'競爭對手'};
const Social={LBL,
 rel(a,b){const k=key(a,b);let r=OC.S.rel[k];if(!r){r=OC.S.rel[k]={f:0,r:0,trust:20,conf:0,fam:0,mem:[],last:0,broken:false,lovers:false,tag:null,noRomance:false,greet:''}}return r},
 status(r){if(r.broken)return'broken';if(r.lovers)return'lovers';if(r.tag)return r.tag;if(r.f<=-30)return'bad';if(r.f>=70)return'best';if(r.f>=40)return'good';if(r.f>=15)return'friend';return r.fam>=3?'acq':'stranger'},
 label(r){return LBL[this.status(r)]},
 change(a,b,df,o={}){const r=this.rel(a.c?a.c.id:a,b.c?b.c.id:b);const before=this.status(r);r.f=U.clamp(r.f+df,-100,100);if(o.conf)r.conf=U.clamp(r.conf+o.conf,0,100);if(o.trust)r.trust=U.clamp(r.trust+o.trust,0,100);if(o.r)r.r=U.clamp(r.r+o.r,0,100);r.fam++;r.last=Date.now();
  const after=this.status(r);if(after!==before&&!['acq','stranger'].includes(after)){const A=nameOf(a),B=nameOf(b);if(['friend','good','best'].includes(after)&&rank(after)>rank(before)){OC.Sim.log(null,`${A}和${B}的關係變成了「${LBL[after]}」！`,'heart');OC.UI&&OC.UI.toast(`${A} ♥ ${B}：${LBL[after]}`,'heart');addMem(r,`成為${LBL[after]}`,.8)}else if(after==='bad'){OC.Sim.log(null,`${A}和${B}的關係變差了…`,'cloud')}}
  U.emit('rel');return r},
 bond(a,b,n,why){const r=this.change(a,b,n,{trust:n*.5});if(why)addMem(r,why,.5)},
 offline(H){for(const r of Object.values(OC.S.rel)){if(r.broken)continue;r.conf=Math.max(0,r.conf-H*10);if(r.f>10)r.f=Math.min(100,r.f+Math.min(4,H*.6))}},

 /* ============ 是否要找人互動 ============ */
 maybe(a){if(OC.S.settings.autoSocial===false)return;const c=a.c;if(a.task&&(a.task.def.ex||a.task.def.pose==='sleep'))return;if(a.inside||a.away)return;
  const near=[...OC.Sim.agents.values()].filter(o=>o!==a&&o.loc===a.loc&&!o.away&&!o.busy()&&!(o.task&&o.task.def.pose==='sleep')&&Math.hypot(o.x-a.x,o.z-a.z)<(a.loc==='house'?9:7.5));
  if(!near.length)return;
  const want=(1-c.needs.social/100)*.75+Chars.sl(c,'social')*.35+(Chars.has(c,'chatty')?.2:0)-(Chars.has(c,'loner')?.25:0)+(c.emo.anger>.4?.25:0);
  if(Math.random()>want)return;
  /* 選對象：偏好喜歡的人；生氣時可能找麻煩 */
  const tgt=U.weighted(near.map(o=>{const r=this.rel(c.id,o.id);let w=1+Math.max(0,r.f)/40;if(r.broken)w=Chars.soc(c,'forgive')>1.2&&Date.now()-r.brokenAt>20*60e3?.6:.05;if(o.c.health.sick||o.mood==='sad')w+=Chars.soc(c,'comfort')*1.2;if(c.wishes.some(x=>x.k==='talk'&&x.with===o.id))w+=3;return{o,w}}));
  if(tgt)this.start(a,tgt.o)},
 /* ============ 互動類型挑選 ============ */
 choose(a,b){const c=a.c,d=b.c,r=this.rel(c.id,d.id),neg=OC.S.settings.negEvents!==false;const grumpy=(x)=>(x.needs.hunger<22||x.needs.energy<18?1.8:1)*(1+x.emo.anger*2.5);
  const shared=c.traits.filter(t=>d.traits.includes(t)&&['int'].includes(C.TRAIT[t]?.c)).length+(c.profile.interests||[]).filter(x=>(d.profile.interests||[]).includes(x)).length;
  const W=[];const add=(k,w)=>{if(w>0)W.push({k,w})};
  if(r.broken){add('cold',3);add('reconcile',Chars.soc(c,'forgive')*(Date.now()-(r.brokenAt||0)>20*60e3?.8:.05));return U.weighted(W).k}
  const today=U.dayKey();add('greet',r.greet!==today?4:0);
  add('chat',1.4);add('joke',.5+Chars.sl(c,'lively')*.6-(Chars.has(c,'serious')?.4:0));add('compliment',.3+Chars.sl(c,'friendly')*.6);
  add('share',shared?.8+shared*.5:0);add('play',(c.needs.fun<60&&d.needs.fun<70?.9:.2)*(.4+Chars.sl(c,'lively')));
  add('comfort',(d.health.sick||d.mood==='sad'||d.emo.sad>.4)?2.2*Chars.soc(c,'comfort'):0);
  add('gift',r.f>25&&Math.random()<.3?.5:0);
  add('apology',r.conf>35?1.6*Chars.soc(c,'forgive'):0);
  if(neg){const base=.06*Chars.soc(c,'argue')*grumpy(c)*(r.f<0?2.2:r.f>60?.4:1)*(r.conf>30?1.8:1)*(Chars.has(c,'jealous')&&d.bond>c.bond+20?2:1);add('argue',base);add('tease',Chars.has(c,'prank')||Chars.has(c,'sharp')?.4:0)}
  if(OC.S.settings.romance!==false&&!r.noRomance&&!r.lovers&&r.f>55&&!c.noRomance&&!d.noRomance)add('flirt',.25*(Chars.has(c,'romantic')?2.5:1));
  if(r.lovers)add('date',.9);
  return(U.weighted(W)||{k:'chat'}).k},
 /* ============ 開始互動：走近、面對面、輪流說話 ============ */
 start(a,b,forced){const k=forced||this.choose(a,b);const I={k,a,b,step:0,t:0,lines:[],done:false};a.inter=I;b.inter=I;
  if(a.task)OC.Sim.finish(a,false);if(b.task)OC.Sim.finish(b,false);
  /* 走到彼此身邊 */
  const sc=OC.Scenes.get(a.loc);const mx=(a.x+b.x)/2,mz=(a.z+b.z)/2;const side=a.x<b.x?-1:1;const pa=sc.ok(mx+side*.55,mz)?{x:mx+side*.55,z:mz}:sc.near(mx,mz,1),pb=sc.ok(mx-side*.55,mz)?{x:mx-side*.55,z:mz}:sc.near(mx,mz,1);
  if(k==='cold'){I.phase='talk'}else{a.goal={x:pa.x,z:pa.z};b.goal=Math.hypot(b.x-pb.x,b.z-pb.z)>1.5?{x:pb.x,z:pb.z}:null;I.phase='meet';I.timeout=8}
  this.list.add(I);return I},
 list:new Set(),
 tick(dt){for(const I of this.list){I.t+=dt;const {a,b}=I;
   if(a.held||b.held||a.away||b.away||a.loc!==b.loc){this.end(I);continue}
   if(I.phase==='meet'){I.timeout-=dt;if((!a.goal&&!b.goal)||I.timeout<=0){a.goal=b.goal=null;I.phase='talk';I.t=0;a.facing=b.x>a.x?1:-1;b.facing=-a.facing;a.pose=b.pose='talk';this.script(I)}continue}
   if(I.phase==='talk'){if(!I.seq||!I.seq.length){if(I.t>(I.wait||0))this.end(I);continue}
    if(I.t>=I.next){const s=I.seq.shift();I.t=0;I.next=s.d??Math.min(3.2,1.2+(s.text?s.text.length*.09:0));try{s.fn&&s.fn()}catch(e){console.error(e)}if(s.who&&s.text)s.who.say(s.text,{tone:s.tone});if(s.who&&s.emo)s.who.feel(s.emo);if(s.face)(s.who||a).face=s.face}}
   if(I.phase==='run'){I.timeout-=dt;if(I.timeout<=0)this.end(I)}}},
 end(I){if(I.done)return;I.done=true;this.list.delete(I);for(const x of [I.a,I.b]){if(x.inter===I)x.inter=null;x.face=null;if(x.pose==='talk'||x.pose==='angry'||x.pose==='cheer'||x.pose==='sad')x.pose='stand'}if(I.after)I.after()},
 /* ============ 台詞腳本 ============ */
 script(I){const {a,b,k}=I,c=a.c,d=b.c,S=[],r=this.rel(c.id,d.id),vis=OC.Sim.visible(a);const L=C.LINES;const say=(who,text,o={})=>S.push(Object.assign({who,text:Chars.say(who.c,text)},o));const act=(fn,dly=.6)=>S.push({fn,d:dly});
  const pickTopic=()=>{const r0=Math.random();if(r0<.33)return U.pick(L.chatTopic.weather[Env.wid]||L.chatTopic.weather.sunny);if(r0<.6)return U.pick(L.chatTopic.time[Env.tod()]);if(r0<.8)return U.pick(L.chatTopic.place[a.loc]||['這裡好舒服。']);
   /* 回憶話題：記得一起做過的事 */
   const m=c.memories.find(m=>m.with&&m.with.includes(d.id)&&m.val>0);if(m)return`還記得我們${m.text}嗎？`;const it=(d.profile.interests||[])[0];return it?`最近${it}怎麼樣？`:U.pick(L.chatTopic.time[Env.tod()])};
  const gain=(n,o)=>act(()=>{this.change(a,b,n,o);c.needs.social=Math.min(100,c.needs.social+12);d.needs.social=Math.min(100,d.needs.social+12);OC.Sim.skill(c,'social',.5);c.counters._chat=(c.counters._chat||0)+1;OC.Sim.checkWish(a,'talk',d.id);OC.Sim.checkWish(b,'talk',c.id)},.2);
  switch(k){
   case'greet':{const g={wave:'揮揮手',bow:'鞠躬',hop:'跳起來',hug:'抱抱',nod:'點點頭',peek:'偷看'}[c.quirks.greet];r.greet=U.dayKey();
    act(()=>{if(c.quirks.greet==='hop')a.hop(2);else if(c.quirks.greet==='bow')a.squash(.85);else if(c.quirks.greet==='hug'){a.feel('heart')}else if(c.quirks.greet==='peek'){a.face='soft'}},.3);
    say(a,U.pick(L.greet)+(Chars.has(c,'polite')?' 今天也請多指教。':''));say(b,Chars.has(d,'shy')?'啊…你、你好。':U.pick(L.greet),{emo:Chars.has(d,'shy')?'blush':null});gain(2);break}
   case'chat':{const t=pickTopic();say(a,t);const agree=Math.random()<.5+Chars.sl(d,'friendly')*.4;say(b,agree?U.pick(['對啊對啊！','真的耶～','我也這麼覺得。','嗯嗯！']):U.pick(['是嗎？','我倒是覺得還好。','嗯…']),{emo:agree?'note':null});
    if(Math.random()<.5)say(a,U.pick(['嘿嘿。','下次一起去吧！','跟你聊天好開心。']));gain(agree?4:2);break}
   case'joke':{say(a,U.pick(L.joke));const laugh=!Chars.has(d,'serious')&&!Chars.has(d,'quiet')&&Math.random()<.75;act(()=>{if(laugh){b.face='joy';b.pose='cheer';b.hop(1.4);d.needs.fun=Math.min(100,d.needs.fun+15)}else b.face='pout'},.4);
    say(b,laugh?U.pick(['哈哈哈！','噗——你好好笑！','笑到肚子痛了～']):U.pick(['……這好笑嗎？','冷笑話警報。']),{emo:laugh?'note':'sweat'});gain(laugh?5:-1);break}
   case'compliment':{say(a,U.pick(L.compliment));act(()=>{b.face='soft';b.blushK=2},.3);say(b,Chars.has(d,'tsun')?'才、才沒有呢！…謝謝。':U.pick(['真的嗎？好開心！','嘿嘿，謝謝你～']),{emo:'blush'});gain(5,{trust:3});break}
   case'share':{const it=c.traits.find(t=>d.traits.includes(t));const tn=it?C.TRAIT[it].t:'';say(a,tn?`你也${tn.includes('喜歡')||tn.includes('熱愛')?'':'很'}${tn}對吧！`:'我們好像有很多共同點！');say(b,'對呀！我們好合得來～',{emo:'heart'});act(()=>{a.face=b.face='joy';OC.Fx.hearts(a.x,1.3,a.z,1)},.4);gain(7,{trust:4});act(()=>{OC.Sim.remember(c,'share',`和${d.name}聊共同興趣`,.6,[d.id]);OC.Sim.remember(d,'share',`和${c.name}聊共同興趣`,.6,[c.id])},.1);break}
   case'play':{say(a,'來玩鬼抓人！');say(b,'好呀！看你抓不抓得到我～',{emo:'note'});act(()=>{I.phase='run';I.timeout=7;const sc=OC.Scenes.get(a.loc);const p=sc.near(b.x,b.z,4);b.goal={x:p.x,z:p.z,fast:1};a.goal={x:p.x,z:p.z,fast:1};
     I.after=()=>{if(OC.Sim.visible(a)){a.say('抓到了！');b.say('哈哈哈～');OC.Fx.hearts(a.x,1.2,a.z,2)}for(const x of [c,d]){x.needs.fun=Math.min(100,x.needs.fun+22);x.needs.energy=Math.max(0,x.needs.energy-6)}this.change(a,b,6);OC.Sim.remember(c,'play',`和${d.name}玩鬼抓人`,.7,[d.id]);OC.Sim.remember(d,'play',`和${c.name}玩鬼抓人`,.7,[c.id]);OC.Sim.skill(c,'fitness',1)}},.2);break}
   case'comfort':{const sick=d.health.sick;say(a,sick?'你還好嗎？要多休息喔。':U.pick(L.comfort));act(()=>{a.feel('heart');OC.Fx.hearts(b.x,1.2,b.z,2);d.emo.sad=Math.max(0,d.emo.sad-.4);d.needs.comfort=Math.min(100,d.needs.comfort+20);if(sick)OC.Sim.heal(b,.6,`${c.name}的照顧`)},.5);
    say(b,U.pick(['謝謝你…','有你在真好。','嗚…我好多了。']),{emo:'blush'});gain(9,{trust:8});act(()=>{c.counters._comfort=(c.counters._comfort||0)+1;OC.Sim.remember(d,'comfort',`${c.name}在我難過時安慰我`,.9,[c.id]);OC.Sim.remember(c,'comfort',`安慰了${d.name}`,.5,[d.id]);OC.Quests&&OC.Quests.on('comfort',c)},.1);break}
   case'gift':{const g=U.pick(['flower','acorn','shell','berry']);const it=C.ITEM[g];say(a,`這個${it.em}${it.name}送你！`);act(()=>{b.face='joy';OC.Fx.hearts(b.x,1.2,b.z,3);b.hop(1.6)},.4);say(b,U.pick(L.gift),{emo:'heart'});gain(8,{trust:4});act(()=>OC.Sim.remember(d,'gift',`收到${c.name}送的${it.name}`,.8,[c.id]),.1);break}
   case'tease':{say(a,U.pick(['你的尾巴好像掃把喔～','又在發呆啦？','嘿嘿，你剛剛的表情好好笑！']));const mad=Chars.soc(d,'hurt')*Math.random()>.6;act(()=>{if(mad){b.face='angry';b.feel('anger')}else{b.face='pout'}},.3);say(b,mad?'你很討厭耶！':'哼，你才是！',{tone:mad?'angry':null});act(()=>this.change(a,b,mad?-4:1,{conf:mad?12:0}),.2);break}
   case'argue':this.argue(I,say,act);break;
   case'apology':{say(a,U.pick(L.apology),{tone:'sad'});act(()=>{a.face='worry';a.pose='sad'},.2);const ok=Math.random()<.45*Chars.soc(d,'forgive')/Chars.soc(d,'hurt')+(r.f+100)/400;
    act(()=>{if(ok){b.face='soft';a.face='joy';a.pose=b.pose='cheer';OC.Fx.hearts((a.x+b.x)/2,1.3,a.z,3);this.change(a,b,10,{conf:-40,trust:6});c.emo.anger=d.emo.anger=0;OC.Sim.remember(c,'makeup',`和${d.name}和好了`,.8,[d.id]);OC.Sim.remember(d,'makeup',`原諒了${c.name}`,.6,[c.id]);OC.Sim.log(null,`${c.name}向${d.name}道歉，兩人和好了。`,'heart')}else{b.face='angry';b.feel('anger');a.face='worry';a.feel('gloom');c.emo.sad=Math.min(1,c.emo.sad+.25);this.change(a,b,-2)}},.4);
    S.push({who:b,text:'',fn:()=>b.say(Chars.say(d,ok?U.pick(L.forgive):U.pick(L.refuse)),{tone:ok?null:'angry'})});break}
   case'cold':{act(()=>{a.face='angry';b.face='angry';a.facing=b.x>a.x?-1:1;b.facing=-a.facing},.1);say(a,'……哼。',{tone:'angry',emo:'anger'});act(()=>{const sc=OC.Scenes.get(a.loc);const p=sc.near(a.x+(a.x>b.x?3:-3),a.z,2);a.goal={x:p.x,z:p.z}},.6);act(()=>{d.emo.sad=Math.min(1,d.emo.sad+.1)},.5);break}
   case'reconcile':{say(a,`${d.name}…我們可以好好談談嗎？`,{tone:'sad'});const ok=Math.random()<.35*Chars.soc(d,'forgive')+(r.trust/300);act(()=>{a.face='worry'},.2);
    S.push({who:b,fn:()=>{if(ok){b.say('…其實我也一直很想你。',{});this.makeUp(a,b,`${c.name}主動找${d.name}和好`)}else{b.say('……我還沒準備好。',{tone:'sad'});a.feel('gloom');c.emo.sad=Math.min(1,c.emo.sad+.3)}}});break}
   case'flirt':{say(a,U.pick(['跟你在一起的時候，心跳得好快…','今天的你…特別好看。','以後也想一直跟你在一起。']));act(()=>{a.blushK=3;b.blushK=3;a.feel('blush');b.face='soft'},.3);
    const back=Math.random()<.4+r.r/200;say(b,back?'我…我也是…':'欸？你、你在說什麼啦！',{emo:back?'heart':'sweat'});act(()=>{this.change(a,b,3,{r:back?14:4});const rr=this.rel(c.id,d.id);if(rr.r>=70&&!rr.lovers&&!OC.S.pending.some(p=>p.k==='lovers'&&p.a===c.id&&p.b===d.id)){OC.S.pending.push({id:U.uid('p'),k:'lovers',a:c.id,b:d.id,t:Date.now()});OC.Sim.log(null,`${c.name}好像想向${d.name}告白…`,'heart');U.emit('pending')}},.2);break}
   case'date':{say(a,'要不要一起去散步？');say(b,'好呀～',{emo:'heart'});act(()=>{OC.Fx.hearts((a.x+b.x)/2,1.4,a.z,4);this.change(a,b,4,{r:3});OC.Sim.remember(c,'date',`和${d.name}約會`,.9,[d.id]);OC.Sim.remember(d,'date',`和${c.name}約會`,.9,[c.id])},.3);break}}
  I.seq=S;I.next=.1;I.t=0;I.wait=1},
 /* ============ 吵架（可能升級成大吵、絕交） ============ */
 argue(I,say,act){const {a,b}=I,c=a.c,d=b.c,L=C.LINES;
  act(()=>{a.face='angry';a.pose='angry'},.1);say(a,U.pick(L.argueStart),{tone:'angry',emo:'anger'});
  const backDown=Chars.soc(d,'argue')<.8&&Math.random()<.6;
  if(backDown){say(b,U.pick(['對不起，我不是故意的…','好啦好啦，別生氣。']),{tone:'sad',emo:'sweat'});act(()=>{b.face='worry';this.change(a,b,-2,{conf:8});c.emo.anger=Math.max(0,c.emo.anger-.3)},.3);say(a,'…哼，下次注意點。');return}
  act(()=>{b.face='angry';b.pose='angry'},.1);say(b,U.pick(L.argueBack),{tone:'angry',emo:'anger'});
  const big=Math.random()<.35*Chars.soc(c,'argue')*Chars.soc(d,'argue')+(this.rel(c.id,d.id).conf>50?.25:0);
  if(big){say(a,U.pick(['你每次都這樣！','我受夠了！','我再也不想理你了！']),{tone:'angry'});say(b,U.pick(['好啊！我也不想理你！','隨便你！']),{tone:'angry'});
   act(()=>{OC.R.cam.shake=.2;c.emo.anger=Math.min(1,c.emo.anger+.7);d.emo.anger=Math.min(1,d.emo.anger+.7);c.emo.sad=Math.min(1,c.emo.sad+.3*Chars.soc(c,'hurt'));d.emo.sad=Math.min(1,d.emo.sad+.3*Chars.soc(d,'hurt'));
    const r=this.change(a,b,-U.rnd(14,22),{conf:35,trust:-12});OC.Sim.remember(c,'fight',`和${d.name}大吵一架`,-.9,[d.id]);OC.Sim.remember(d,'fight',`和${c.name}大吵一架`,-.9,[c.id]);OC.Sim.log(null,`${c.name}和${d.name}大吵了一架！`,'anger');OC.UI&&OC.UI.toast(`${c.name}和${d.name}吵架了…`,'anger');
    if(Chars.soc(c,'hurt')>1.2&&Math.random()<.35)OC.Sim.getSick(a,'blue');if(Chars.soc(d,'hurt')>1.2&&Math.random()<.35)OC.Sim.getSick(b,'blue');
    if(r.f<-40&&r.conf>60&&!r.broken&&!OC.S.pending.some(p=>p.k==='breakup'&&((p.a===c.id&&p.b===d.id)||(p.a===d.id&&p.b===c.id)))){OC.S.pending.push({id:U.uid('p'),k:'breakup',a:c.id,b:d.id,t:Date.now()});U.emit('pending')}
    /* 生氣地走開 */
    const sc=OC.Scenes.get(a.loc);for(const [x,y] of [[a,b],[b,a]]){const p=sc.near(x.x+(x.x>y.x?4:-4),x.z,2);x.goal={x:p.x,z:p.z}}},.4)}
  else{act(()=>{this.change(a,b,-U.rnd(5,9),{conf:16});c.emo.anger=Math.min(1,c.emo.anger+.35);d.emo.anger=Math.min(1,d.emo.anger+.35);OC.Sim.remember(c,'argue',`和${d.name}拌嘴`,-.4,[d.id]);OC.Sim.remember(d,'argue',`和${c.name}拌嘴`,-.4,[c.id]);OC.Sim.log(null,`${c.name}和${d.name}拌了幾句嘴。`,'cloud')},.3);say(a,'哼！',{tone:'angry'})}},
 /* 玩家確認的重大關係變化 */
 breakUp(aid,bid){const r=this.rel(aid,bid);r.broken=true;r.brokenAt=Date.now();r.lovers=false;const A=OC.S.chars.find(c=>c.id===aid),B=OC.S.chars.find(c=>c.id===bid);
  OC.Sim.log(null,`${A.name}和${B.name}絕交了…`,'anger');for(const [x,y] of [[A,B],[B,A]])OC.Sim.remember(x,'breakup',`和${y.name}絕交`,-1,[y.id]);U.emit('rel')},
 makeUp(a,b,why){const c=a.c||a,d=b.c||b;const r=this.rel(c.id,d.id);r.broken=false;r.conf=0;r.f=Math.max(r.f,10);c.emo.anger=d.emo.anger=0;
  OC.Sim.log(null,`${c.name}和${d.name}和好了！${why?'（'+why+'）':''}`,'heart');for(const [x,y] of [[c,d],[d,c]])OC.Sim.remember(x,'makeup',`和${y.name}和好`,.9,[y.id]);
  const A=OC.Sim.get(c.id),B=OC.Sim.get(d.id);if(A&&OC.Sim.visible(A)){OC.Fx.hearts((A.x+(B?B.x:A.x))/2,1.4,A.z,5);A.face='joy';if(B)B.face='joy';setTimeout(()=>{A.face=null;if(B)B.face=null},2500)}
  OC.UI&&OC.UI.celebrate&&OC.UI.celebrate(c,`${c.name} 與 ${d.name} 和好了`,'關係修復');U.emit('rel')},
 /* 玩家調解：成功率取決於兩人的個性與過去的回憶 */
 mediate(aid,bid){const A=OC.S.chars.find(c=>c.id===aid),B=OC.S.chars.find(c=>c.id===bid);const r=this.rel(aid,bid);
  const good=[...A.memories,...B.memories].filter(m=>m.with&&(m.with.includes(aid)||m.with.includes(bid))&&m.val>0).length;
  const p=U.clamp(.3+(Chars.soc(A,'forgive')+Chars.soc(B,'forgive')-2)*.25+good*.05+r.trust/250-(r.conf/400),.12,.9);
  const ok=Math.random()<p;if(ok){this.makeUp(A,B,'你的調解');OC.Quests&&OC.Quests.on('mediate')}else{r.conf=Math.max(0,r.conf-15);r.f+=3;OC.Sim.log(null,`你試著讓${A.name}和${B.name}和好，但兩人還需要一點時間。`,'cloud')}return{ok,p}}};
function rank(s){return['bad','stranger','acq','friend','good','best'].indexOf(s)}
function addMem(r,text,val){r.mem.unshift({t:Date.now(),text,val});if(r.mem.length>20)r.mem.length=20}
function nameOf(x){return(x.c||OC.S.chars.find(c=>c.id===x)||{}).name||'？'}
OC.Social=Social;
})(window.OC);
