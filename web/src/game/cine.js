/* OC Shimeji v4.1 · 電影式互動演出（餵食、送禮、玩具、藥、清潔、摸頭、聊天）
   鏡頭推近、上下黑邊、HUD 淡出、物品登場、角色預備動作、反應依口味／個性／心情而不同；點一下即可略過。 */
(function(OC){'use strict';
const {U,Content:C,Chars,Icons}=OC;
const Cine={on:false,t:0,ev:[],fx:{},lb:0,
 /* ---------- 演出框架 ---------- */
 begin(a,{zoom=8.6,dur=4}={}){if(this.on)this.finish(true);const Cam=OC.Cam;this.on=true;this.a=a;this.t=0;this.ev=[];this.fx={};this.dur=dur;this.skipped=false;
  this.saved={follow:Cam.follow,focus:Cam.focus,D:Cam.goal.D};Cam.focus=a;Cam.follow=true;Cam.goal.D=Math.min(Cam.goal.D,zoom);
  if(a.task)OC.Sim.finish(a,false);if(a.inter)OC.Social.end(a.inter);a.goal=null;a.vx=a.vz=0;a.task={def:{id:'_cine',t:'和你互動',pose:'stand',gain:{},dur:[dur,dur]},lock:1,phase:'hold'};a.lookAt=0;a.facing=1;
  document.body.classList.add('cine');OC.UI.closeFloating&&OC.UI.closeFloating();return this},
 at(s,fn){this.ev.push({s,fn});return this},
 tick(dt){if(!this.on)return;this.t+=dt;this.lb=Math.min(1,this.lb+dt*3);for(const e of this.ev){if(!e.done&&this.t>=e.s){e.done=1;try{e.fn()}catch(err){console.error('[cine]',err)}}}
  if(this.t>=this.dur)this.finish()},
 skip(){if(!this.on)return;for(const e of this.ev){if(!e.done){e.done=1;try{e.fn(true)}catch(err){}}}this.finish()},
 finish(silent){if(!this.on)return;const a=this.a,Cam=OC.Cam;this.on=false;const af=this.afterFn;this.afterFn=null;if(af)setTimeout(af,350);document.body.classList.remove('cine');Cam.goal.D=this.saved.D;Cam.follow=this.saved.follow;Cam.focus=this.saved.focus||a;
  if(a&&a.task&&a.task.def.id==='_cine'){a.task=null;a.pose='stand';a.lookAt=null;a.hold=null}this.fx={};OC.UI.followChanged&&OC.UI.followChanged();OC.Store.save()},
 /* ---------- 畫面效果（在 renderer.drawOverlay 中呼叫） ---------- */
 draw(ctx,W,H){const lbv=this.on?this.lb:Math.max(0,this.lb-=.06);if(lbv<=0)return;const bar=H*.085*U.ease.out(lbv);ctx.fillStyle='rgba(28,22,26,.92)';ctx.fillRect(0,0,W,bar);ctx.fillRect(0,H-bar,W,bar);if(!this.on)return;
  const a=this.a,fx=this.fx,t=this.t;if(!a||!a.ss)return;const hx=a.sx,hy=a.sy-a.ss*1.25;
  /* 背景光芒（最愛＝粉色、喜歡＝金色、禮物＝彩虹） */
  if(fx.rays){const k=Math.min(1,(t-fx.rays.t0)/.4),fade=fx.rays.until?Math.max(0,1-(t-fx.rays.until)/.4):1;if(k>0&&fade>0){ctx.save();ctx.translate(hx,a.sy-a.ss*.6);ctx.rotate(t*.35);ctx.globalAlpha=.32*k*fade;
    for(let i=0;i<14;i++){ctx.rotate(Math.PI*2/14);ctx.fillStyle=i%2?fx.rays.c1:fx.rays.c2;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-W*.06,-H);ctx.lineTo(W*.06,-H);ctx.fill()}ctx.restore();ctx.globalAlpha=1}}
  /* 憂鬱線條（討厭的東西） */
  if(fx.gloom){ctx.save();ctx.globalAlpha=.55*Math.min(1,(t-fx.gloom)/.3);ctx.strokeStyle='#7F8EB2';ctx.lineWidth=2.4;for(let i=0;i<7;i++){const x=hx-a.ss*.5+i*a.ss*.16;ctx.beginPath();ctx.moveTo(x,hy-a.ss*.35);ctx.lineTo(x,hy+a.ss*.05+Math.sin(t*3+i)*4);ctx.stroke()}ctx.restore()}
  /* 物品登場：上方彈出＋光環，之後落入手中 */
  if(fx.item){const it=fx.item,img=Icons.itemImg(it.it),p=it.p();if(img){const s=a.ss*.55*p.s;ctx.save();if(p.glow){ctx.globalAlpha=.5*p.glow;const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,s*1.1);g.addColorStop(0,'rgba(255,248,200,.95)');g.addColorStop(1,'rgba(255,248,200,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y,s*1.1,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1}
   ctx.translate(p.x,p.y);ctx.rotate(p.r||0);ctx.drawImage(img,-s/2,-s/2,s,s);ctx.restore()}}
  /* 禮物盒 */
  if(fx.box){const b=fx.box,img=Icons.img('gift');if(img&&!b.open){const s=a.ss*.62,sh=Math.sin(t*38)*(b.shake||0);ctx.save();ctx.translate(hx+sh*s*.08,hy-s*.15);ctx.rotate(sh*.08);ctx.drawImage(img,-s/2,-s/2,s,s);ctx.restore()}}
  /* 摸頭的手 */
  if(fx.hand){const img=Icons.img('wave');if(img){const k=t-fx.hand;const s=a.ss*.5;const x=hx+Math.sin(k*9)*a.ss*.16,y=hy-a.ss*.05+Math.abs(Math.cos(k*9))*a.ss*.05;ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI+Math.sin(k*9)*.25);ctx.drawImage(img,-s/2,-s/2,s,s);ctx.restore()}}
  /* 大字反應（有描邊、彈出） */
  if(fx.text){const T=fx.text,k=t-T.t0;if(k<1.8){const e=U.ease.back(Math.min(1,k/.3)),fade=k>1.4?1-(k-1.4)/.4:1;ctx.save();ctx.globalAlpha=fade;ctx.translate(W/2,H*.2);ctx.scale(e,e);ctx.rotate(-.04);
    ctx.font='900 34px "Nunito","Noto Sans TC",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';ctx.lineWidth=9;ctx.strokeStyle='#fff';ctx.strokeText(T.s,0,0);ctx.fillStyle=T.c;ctx.fillText(T.s,0,0);ctx.restore()}}
  /* 跳過提示 */
  ctx.globalAlpha=.7;ctx.fillStyle='#fff';ctx.font='600 11px "Nunito","Noto Sans TC",sans-serif';ctx.textAlign='right';ctx.fillText('點一下略過',W-14,H-H*.085*lbv+(H*.085*lbv)/2+4);ctx.textAlign='start';ctx.globalAlpha=1},
 text(s,c='#F27C9B'){this.fx.text={s,c,t0:this.t}},
 rays(c1,c2,dur=1.6){this.fx.rays={c1,c2,t0:this.t,until:this.t+dur}},
 /* 物品從空中出現，再落到嘴邊 */
 reveal(a,it,{hold=true}={}){const t0=this.t;this.fx.item={it,p:()=>{const k=this.t-t0;const hx=a.sx,top=a.sy-a.ss*1.55;
   if(k<.35){const e=U.ease.back(k/.35);return{x:hx,y:top-10*(1-e),s:e,glow:e,r:Math.sin(k*20)*.1}}
   if(k<1){return{x:hx,y:top+Math.sin(k*6)*4,s:1,glow:1-((k-.35)/.65)*.3,r:Math.sin(k*5)*.08}}
   const d=Math.min(1,(k-1)/.3),e=U.ease.in(d);return{x:hx,y:U.lerp(top,a.sy-a.ss*.62,e),s:1-e*.35,glow:.6*(1-d),r:0}}};
  this.at(this.t+.05,()=>{a.face='wow';a.lookAt=0;a.squash(1.06);OC.Fx.sparkle(a.x,1.8,a.z,8)});
  this.at(this.t+.6,()=>{a.squash(.9);a.hop(1.2)});
  if(hold)this.at(this.t+1.3,()=>{this.fx.item=null;a.hold=it.id;a.holdK=1;a.face=null;a.pose='eat'})},

 /* ================= 餵食 ================= */
 eat(a,it,v,onDone){const c=a.c,L=C.LINES.eat;const bites=c.quirks.eat==='fast'?4:c.quirks.eat==='slow'?2:3;const gap=c.quirks.eat==='fast'?.28:c.quirks.eat==='slow'?.6:.42;
  this.begin(a,{dur:3.4+bites*gap+1.6});this.reveal(a,it);let T=1.45;
  for(let i=0;i<bites;i++){this.at(T+i*gap,()=>{a.holdK=1-(i+1)/bites;a.squash(.92);a.face=i%2?'joy':'talk';OC.Fx.sparkle(a.x+.15,1.05,a.z,3,'#E8C69A');U.buzz(4)})}
  T+=bites*gap+.2;
  this.at(T,()=>{a.hold=null;a.pose='stand';
   if(v>=2){a.face='joy';this.rays('#FFC1D3','#FFE6EE');this.text('最愛！','#F27C9B');OC.Fx.hearts(a.x,1.4,a.z,5);a.hop(2.8);let n=0;const iv=setInterval(()=>{a.facing*=-1;if(++n>=4)clearInterval(iv)},120);U.buzz(25)}
   else if(v===1){a.face='joy';this.rays('#FFE9A8','#FFF6D6',1.2);this.text('好吃！','#F2A93B');OC.Fx.hearts(a.x,1.3,a.z,2);a.hop(1.8)}
   else if(v===0){a.face='soft';a.feel('note');a.squash(.94)}
   else if(v===-1){a.face='worry';this.fx.gloom=this.t;a.feel('sweat');a.squash(1.04)}
   else{a.face='angry';this.fx.gloom=this.t;this.text('噁…','#7F8EB2');let n=0;const iv=setInterval(()=>{a.squash(n%2?.86:1.1);if(++n>=6)clearInterval(iv)},90);a.feel('anger')}
   a.say(Chars.say(c,U.pick(L[v])),{tone:v<0?'sad':null,life:2.6})});
  this.at(T+1.5,()=>{a.face=null;onDone&&onDone()})},
 /* ================= 禮物 ================= */
 gift(a,it,like,onDone){this.begin(a,{dur:5.2});this.fx.box={shake:0};
  this.at(.2,()=>{a.face='wow';a.feel('!');a.squash(1.05)});this.at(.7,()=>{this.fx.box.shake=1;U.buzz(6)});this.at(1.4,()=>{this.fx.box.shake=2;a.squash(.9)});
  this.at(1.9,()=>{this.fx.box.open=true;OC.Fx.sparkle(a.x,1.7,a.z,16,'#FFD36E');OC.Fx.sparkle(a.x,1.7,a.z,10,'#FFB8C9');this.rays('#FFF0B5','#E6F1FF',2);this.reveal(a,it,{hold:false});U.buzz(18)});
  this.at(3.1,()=>{this.fx.item=null;a.hold=it.id;a.holdK=1;a.face='joy';a.hop(2.2);this.text(like>=4?'超喜歡！':like>=2?'謝謝你！':'嗯…謝謝。',like>=2?'#F27C9B':'#9A8FC8');OC.Fx.hearts(a.x,1.4,a.z,Math.min(6,like+1));a.say(U.pick(C.LINES.gift),{life:2.4})});
  this.at(4.6,()=>{a.hold=null;onDone&&onDone()})},
 /* ================= 玩具 ================= */
 toy(a,it,onDone){this.begin(a,{dur:5});this.reveal(a,it,{hold:false});
  this.at(1.3,()=>{this.fx.item=null;a.hold=it.id;a.holdK=1;a.pose='cheer';a.face='joy'});
  [1.6,2.2,2.8,3.4].forEach((s,i)=>this.at(s,()=>{a.hop(2+i*.2);a.facing*=-1;OC.Fx.sparkle(a.x,.4,a.z,4,'#FFFFFF');U.buzz(5)}));
  this.at(3.9,()=>{this.text('好好玩！','#7FB089');a.say('再玩一次嘛～',{life:2.2})});this.at(4.6,()=>{a.hold=null;a.pose='stand';onDone&&onDone()})},
 /* ================= 藥 ================= */
 medicine(a,it,onDone){this.begin(a,{dur:4.4});this.reveal(a,it);
  this.at(1.5,()=>{a.face='worry';a.say('好苦…',{life:1.6});a.feel('sweat')});
  this.at(2,()=>{let n=0;const iv=setInterval(()=>{a.squash(n%2?.9:1.08);if(++n>=5)clearInterval(iv)},80);a.hold=null;a.pose='stand'});
  this.at(2.9,()=>{a.face='soft';OC.Fx.sparkle(a.x,1.2,a.z,14,'#DDF3C8');this.text('感覺好多了','#7FB089')});this.at(3.9,()=>onDone&&onDone())},
 /* ================= 清潔 ================= */
 bath(a,it,onDone){this.begin(a,{dur:4.4});
  this.at(.3,()=>{a.pose='sit';a.face='soft';for(let i=0;i<5;i++)setTimeout(()=>OC.Fx.sparkle(a.x+U.rnd(-.4,.4),U.rnd(.4,1.4),a.z,6,'#E6F4FF'),i*220)});
  this.at(1.8,()=>{a.squash(.85)});this.at(2.4,()=>{a.pose='stand';a.squash(1.1);a.hop(1.6);this.text('香噴噴！','#6FA8E6');OC.Fx.sparkle(a.x,1,a.z,16,'#FFFFFF')});
  this.at(3.8,()=>{onDone&&onDone()})},
 /* ================= 摸頭（選單） ================= */
 pat(a){const c=a.c;this.begin(a,{dur:3.6});this.at(.2,()=>{this.fx.hand=this.t;a.face='joy';a.pose='pet';a.petDir=1});
  [.6,1.2,1.8].forEach(s=>this.at(s,()=>{OC.Fx.hearts(a.x,1.4,a.z,1);a.squash(.95);U.buzz(5)}));
  this.at(2.3,()=>{this.fx.hand=0;a.pose='stand';OC.Play.happy(a);a.say(Chars.line(c,'pet')||'嘿嘿～',{life:2.4});c.needs.comfort=Math.min(100,c.needs.comfort+8);c.needs.social=Math.min(100,c.needs.social+8);c.emo.joy=Math.min(1,c.emo.joy+.2);c.bond+=3;OC.Items.xp(6);OC.Quests.on('pet',c);OC.Sim.checkWish(a,'pet')})},
 /* ================= 聊天選項 ================= */
 talk(a,k){const c=a.c,S=Chars.say.bind(null,c),has=t=>Chars.has(c,t);this.begin(a,{dur:4.2});const done=(bond=2,soc=10)=>{c.bond+=bond;c.needs.social=Math.min(100,c.needs.social+soc);OC.Items.xp(4);OC.Store.save()};
  if(k==='greet'){this.at(.3,()=>{a.hop(1.6);a.face='joy';a.say(S(Chars.line(c,'greet')||U.pick(C.LINES.greet)))});done(1,6)}
  else if(k==='chat'){this.dur=60;this.at(.3,()=>{const q=U.pick(QUESTIONS);a.face='talk';a.say(S(q.q),{life:60});this.choice(q.a,i=>{const good=q.good==null||q.good===i||Math.random()<.5;a.bubble=null;
     if(good){a.face='joy';a.hop(1.6);this.text('嘿嘿','#F2A93B');a.say(S(U.pick(q.r[i]||['我也這麼覺得！','真的嗎？好開心～'])));OC.Fx.hearts(a.x,1.4,a.z,2);done(3,14)}else{a.face='pout';a.feel('sweat');a.say(S(U.pick(q.r[i]||['是、是這樣嗎…'])));done(1,8)}
     this.dur=this.t+2.4})})}
  else if(k==='praise'){this.at(.3,()=>{if(has('tsun')){a.face='angry';a.blushK=3;this.text('才沒有！','#E57B72');a.say('才、才沒有那麼好啦！…不過謝謝。')}else if(has('shy')){a.blushK=3;a.feel('blush');a.say('欸…被稱讚了…好害羞。')}else{a.face='joy';this.rays('#FFE9A8','#FFF6D6',1.2);this.text('嘿嘿～','#F2A93B');a.hop(2);a.say(S('真的嗎？我好開心！'))}done(3,10)})}
  else if(k==='joke'){this.at(.3,()=>{a.face='talk';a.say('嗯？你要說什麼？',{life:1.2})});this.at(1.5,()=>{const funny=!has('serious')&&!has('quiet')&&Math.random()<.75;
     if(funny){a.face='joyTalk';this.text('哈哈哈！','#F2A93B');let n=0;const iv=setInterval(()=>{a.squash(n%2?.9:1.06);if(++n>=8)clearInterval(iv)},110);a.say(S(U.pick(['噗——好好笑！','哈哈哈，肚子好痛～'])));c.needs.fun=Math.min(100,c.needs.fun+15);done(2,8)}
     else{a.face='pout';this.fx.gloom=this.t;a.say(S(U.pick(['……','這是冷笑話嗎？'])));done(0,4)}})}
  else if(k==='hug'){this.at(.3,()=>{a.face='wow';a.squash(1.05)});this.at(.9,()=>{a.face='joy';this.rays('#FFC1D3','#FFE6EE',1.8);OC.Fx.hearts(a.x,1.3,a.z,6);a.blushK=3;a.hop(1.4);a.say(S(Chars.has(c,'tsun')?'只、只能一下下喔！':U.pick(['好溫暖…','最喜歡你了！'])))});
   this.at(1.2,()=>{c.emo.sad=Math.max(0,c.emo.sad-.3);c.emo.joy=Math.min(1,c.emo.joy+.25);done(4,16);if(c.health.sick==='blue')OC.Sim.heal(a,1,'你的擁抱')})}
  else if(k==='comfort'){this.dur=5;this.at(.3,()=>{a.face='worry';a.say(c.health.sick?U.pick(C.LINES.sick[c.health.sick]):'今天有點難過…',{tone:'sad'});OC.Fx.add({k:'drop',x:a.x-.15,z:a.z,y:1.15,vy:-.4,life:.9,sz:.08})});
   this.at(2.1,()=>{this.fx.hand=this.t});this.at(3.2,()=>{this.fx.hand=0;a.face='soft';a.say('謝謝你，我好多了。');OC.Fx.hearts(a.x,1.3,a.z,3);c.emo.sad=Math.max(0,c.emo.sad-.45);if(c.health.sick)OC.Sim.heal(a,.6,'你的安慰');done(4,14)})}
  else if(k==='wish'){this.at(.3,()=>{const w=c.wishes[0];a.face='soft';a.say(w?`其實…我${OC.Sim.wishText(c,w)}！`:'現在已經很幸福了～',{life:3});if(w)a.feel('idea');done(1,6)})}},
 /* Tomodachi 式的回答選項（DOM） */
 choice(opts,on){const el=U.el(`<div class="choice">${opts.map((o,i)=>`<button data-i="${i}">${U.esc(o)}</button>`).join('')}</div>`);document.getElementById('app').appendChild(el);requestAnimationFrame(()=>el.classList.add('in'));
  el.onclick=e=>{const b=e.target.closest('[data-i]');if(!b)return;e.stopPropagation();el.remove();on(+b.dataset.i)};const prev=this.finish.bind(this);this.finish=(s)=>{el.remove();this.finish=prev;prev(s)}}};
const QUESTIONS=[
 {q:'你覺得我今天的樣子怎麼樣？',a:['超可愛的！','跟平常一樣呀'],good:0,r:[['嘿嘿，我就知道！'],['哼…好吧。']]},
 {q:'如果可以去旅行，你想去哪裡？',a:['去海邊！','去森林探險'],r:[['我也最喜歡海浪的聲音了！'],['森林裡一定有好多秘密～']]},
 {q:'晚餐要吃什麼好呢？',a:['甜甜的點心','熱騰騰的湯'],r:[['點心當晚餐！好主意！'],['暖呼呼的最棒了～']]},
 {q:'你喜歡下雨天嗎？',a:['喜歡，很療癒','不太喜歡'],r:[['我也喜歡聽雨聲～'],['嗯…會淋濕對吧。']]},
 {q:'我們算是好朋友嗎？',a:['當然是！','還要再努力'],good:0,r:[['太好了！最喜歡你了！'],['我、我會努力的！']]},
 {q:'你覺得星星會說話嗎？',a:['會喔，在眨眼','不會吧'],r:[['對吧！它剛剛跟我打招呼了！'],['說不定只是你沒聽見呢～']]},
 {q:'明天要一起做什麼？',a:['一起去釣魚','一起睡午覺'],r:[['好！我會釣到最大的！'],['呼…光想就好舒服。']]}];
Cine.QUESTIONS=QUESTIONS;
OC.Cine=Cine;
})(window.OC);
