/* OC Shimeji v4.1 · 介面核心（極簡 HUD、輪盤互動、通知中心、抽屜與對話框、快捷背包）
   原則：DOM 只在資料改變時更新；不使用 backdrop-filter；所有彈出視窗都能點空白處、下滑或返回鍵關閉。 */
(function(OC){'use strict';
const {U,Content:C,Chars,Items,Sim,Env,Icons}=OC;const {$,$$,esc}=U;
const ic=(n,s=22)=>Icons.svg(n,s);
const COIN=ic('coin',20);
const TOAST_IC={check:'check',warn:'warn',info:'info',star:'star',heart:'heart',coin:'coin',quest:'quest',sick:'cross',anger:'bolt',gift:'gift'};
const XPN=L=>600+L*400;
const UI={ic,COIN,sheets:[],blockWorld:false,placing:null,
 init(){if(this.ready)return;this.ready=true;OC.S.ui=Object.assign({bagTab:'fav',pins:[],lastRead:0,tray:false},OC.S.ui||{});
  this.buildHUD();OC.Bag&&OC.Bag.initTray();
  U.on('coins',()=>this.hudStats());U.on('xp',()=>this.hudStats());U.on('pending',()=>this.hudBell());U.on('log',()=>this.hudBell());U.on('quests',()=>this.hudQuest());U.on('scene',()=>{this.hudLoc();this.closeFloating()});U.on('weather',()=>this.hudTime(true));
  U.on('mood',c=>{if(c.id===OC.S.activeId)this.hudChar()});U.on('chars',()=>this.hudChar());
  setInterval(()=>{if(!document.hidden){this.hudTime();this.hudChar()}},1000);
  this.hudStats();this.hudTime(true);this.hudChar();this.hudLoc();this.hudBell();this.hudQuest();
  document.addEventListener('keydown',e=>{if(e.key==='Escape')this.back()});
  /* 點畫面上任何非浮動選單的地方，就收起輪盤與快捷背包 */
  document.addEventListener('pointerdown',e=>{if(!e.target.closest('.radial,.tray,#hTray,.hud-av,.qs'))this.closeFloating(e.target.closest('#world')?null:'keepTray')},true);
  window.OCBack=()=>this.back()},
 /* ================= HUD ================= */
 buildHUD(){const h=$('#hud');h.innerHTML=`
  <div class="hud-tl"><button class="hud-av" id="hAv" aria-label="夥伴狀態"><span class="hav" id="hAvI"></span><i class="mdot" id="hMood"></i></button>
   <div class="hud-stats"><div class="r1"><span class="cur">${ic('coin',20)}<b id="hCoin">0</b></span><span class="cur">${ic('gem',18)}<b id="hGem">0</b></span><span class="cur">${ic('star',18)}<b id="hStar">0</b></span></div>
    <div class="r2">${ic('heart',16)}<b id="hLv">Lv.1</b><i class="xbar"><u id="hXpB"></u></i><small id="hXp"></small></div></div></div>
  <button class="hud-wx" id="hWx"><span id="hWxI"></span><span class="t"><b id="hWxT"></b><small id="hTime"></small></span></button>
  <button class="hud-loc" id="hLoc"><span id="hLocI"></span><b id="hLocN"></b></button>
  <div class="hud-tr"><button class="rb" id="hBell" aria-label="通知">${ic('bell',24)}<i class="dot" id="hBellDot" hidden></i></button><button class="rb" id="hGear" aria-label="設定">${ic('gear',24)}</button></div>
  <div class="hud-rail">
   <button class="sq" data-r="map" aria-label="地圖">${ic('map',30)}</button>
   <button class="sq" data-r="deco" aria-label="佈置">${ic('garden',30)}</button>
   <button class="sq" data-r="camera" aria-label="拍照">${ic('camera',30)}</button>
   <button class="sq" data-r="workshop" aria-label="工坊">${ic('palette',30)}</button>
   <button class="sq" data-r="exit" id="hExit" aria-label="出門" hidden>${ic('door',30)}</button>
   <button class="sq sm" data-r="follow" id="hFollow" aria-label="回到夥伴身邊" hidden>${ic('locate',24)}</button></div>
  <div class="hud-bl"><button class="rb lg" id="hWave" aria-label="和夥伴互動">${ic('wave',30)}<i class="heart-b">${ic('heart',14)}</i></button><button class="rb" id="hTray" aria-label="快捷背包">${ic('sprout',26)}</button></div>
  <button class="hud-quest" id="hQuest"><span class="qi">${ic('event',30)}</span><span class="qt"><b id="hQT">新的一天</b><small id="hQD"></small></span><i class="chev">${ic('back',14)}</i><i class="dot" id="hQDot" hidden></i></button>
  <div class="qs" id="qs" hidden></div>`;
  $('#hAv').onclick=()=>this.toggleQS();$('#hWx').onclick=()=>OC.Pages.timeWeather();$('#hLoc').onclick=()=>OC.Pages.open('map');
  $('#hBell').onclick=()=>this.notifications();$('#hGear').onclick=()=>OC.Pages.settings();$('#hQuest').onclick=()=>OC.Pages.open('life','quest');
  $('#hWave').onclick=()=>{const a=Sim.active();if(!a)return;if(a.loc!==OC.R.sc.id){Sim.sendTo(a,OC.R.sc.id);this.toast(`${a.c.name}正在趕過來`,'info');return}this.radial(a)};
  $('#hTray').onclick=()=>OC.Bag.toggleTray();
  $('.hud-rail').onclick=e=>{const b=e.target.closest('[data-r]');if(!b)return;U.buzz(5);const r=b.dataset.r;
   if(r==='map')OC.Pages.open('map');else if(r==='deco')OC.Pages.open('life','home');else if(r==='camera')OC.Photo&&OC.Photo.open();else if(r==='workshop')OC.Workshop&&OC.Workshop.open();
   else if(r==='exit')OC.World.go('home');else if(r==='follow'){const a=Sim.active();OC.Cam.followA(a&&a.loc===OC.R.sc.id?a:OC.R.actors[0])}};
  this.followChanged()},
 followChanged(){const b=$('#hFollow');if(b)b.hidden=OC.Cam.follow&&!!OC.Cam.focus},
 xpInfo(){let x=OC.S.xp||0,L=1;while(x>=XPN(L)){x-=XPN(L);L++}return{L,x,n:XPN(L)}},
 hudStats(){const S=OC.S;const n=$('#hCoin');const v=S.coins;if(+n.dataset.v!==v){const from=+n.dataset.v||v;n.dataset.v=v;this.countUp(n,from,v);if(v>from){const p=n.parentElement;p.classList.remove('bump');void p.offsetWidth;p.classList.add('bump')}}
  U.setText($('#hGem'),S.gems||0);U.setText($('#hStar'),(S.quests&&S.quests.streak)||1);const X=this.xpInfo();U.setText($('#hLv'),'Lv.'+X.L);U.setText($('#hXp'),`${X.x} / ${X.n}`);const w=Math.round(X.x/X.n*100)+'%';const b=$('#hXpB');if(b.style.width!==w)b.style.width=w},
 countUp(n,from,to){cancelAnimationFrame(n._r);const t0=performance.now();const f=t=>{const k=Math.min(1,(t-t0)/500),e=1-Math.pow(1-k,3);n.textContent=Math.round(from+(to-from)*e).toLocaleString();if(k<1)n._r=requestAnimationFrame(f)};n._r=requestAnimationFrame(f)},
 hudTime(force){const L=Env.label();const d=Env.now();const h=d.getHours(),m=d.getMinutes();U.setText($('#hTime'),`${h<12?'上午':'下午'} ${String((h%12)||12).padStart(2,'0')}:${String(m).padStart(2,'0')}`);U.setText($('#hWxT'),L.wx.t);
  if(force||this._wx!==Env.wid){this._wx=Env.wid;U.setHTML($('#hWxI'),ic(Env.isNight()&&Env.wid==='sunny'?'moon':L.wx.ic,30))}},
 hudChar(){const a=Sim.active();if(!a)return;const c=a.c;const avk=c.id+(c.img||'')+JSON.stringify(c.look);if(this._av!==avk){this._av=avk;U.setHTML($('#hAvI'),OC.Rig.avatarHTML(c));OC.Rig.fillImgs($('#hAvI'))}
  const m=C.MOODS[c.mood]||C.MOODS.content;const dot=$('#hMood');if(dot._c!==m.c){dot._c=m.c;dot.style.background=m.c}},
 hudLoc(){const l=C.LOC[OC.R.sc.id];U.setText($('#hLocN'),l.t);U.setHTML($('#hLocI'),ic(l.ic,18));const ex=$('#hExit');if(ex)ex.hidden=OC.R.sc.id!=='house'},
 hudBell(){const n=OC.S.pending.length,unread=OC.S.log.filter(l=>l.t>(OC.S.ui.lastRead||0)).length;$('#hBellDot').hidden=!(n||unread);U.toggle($('#hBell'),'pulse',n>0)},
 hudQuest(){const L=(OC.S.quests.list||[]);const q=L.find(q=>!q.done&&q.p<q.n)||L.find(q=>!q.done);$('#hQDot').hidden=!OC.Quests.ready();
  if(!q){U.setText($('#hQT'),'今天的任務都完成了');U.setText($('#hQD'),'明天見！');return}U.setText($('#hQT'),q.p>=q.n?'可以領取獎勵！':'新的一天');U.setText($('#hQD'),`${q.t}（${Math.min(q.p,q.n)}/${q.n}）`)},
 /* ================= 夥伴快速狀態卡 ================= */
 toggleQS(){this.qsOpen=!this.qsOpen;const q=$('#qs');U.emit('tut','qs');if(this.qsOpen){this.renderQS();q.hidden=false;requestAnimationFrame(()=>q.classList.add('open'))}else{q.classList.remove('open');setTimeout(()=>{if(!this.qsOpen)q.hidden=true},220)}},
 renderQS(){const q=$('#qs');const list=[...Sim.agents.values()];const act=OC.S.activeId;
  const html=list.map(a=>{const c=a.c,m=C.MOODS[c.mood]||C.MOODS.content;const T=a.task?(a.task.phase==='leave'||a.task.phase==='away'?`前往${C.LOC[a.task.loc].t}`:a.task.def.t||'忙碌中'):a.inter?'和朋友互動中':'閒晃';
   const bars=C.NEEDS.map(([k,t,col])=>`<div class="nb"><span>${t}</span><i><b style="width:${c.needs[k]|0}%;background:${col}"></b></i></div>`).join('');
   const w=c.wishes[0]?`<div class="wish">${ic('chat',16)}${esc(Sim.wishText(c,c.wishes[0]))}</div>`:'';
   return`<div class="qs-c ${c.id===act?'on':''}" data-id="${c.id}"><div class="qs-h"><span class="hav sm">${OC.Rig.avatarHTML(c)}</span><b>${esc(c.name)}</b><em style="background:${m.c}">${m.t}</em>${c.health.sick?'<em class="sick">'+C.SICK[c.health.sick].t+'</em>':''}<small>${esc(T)} · ${C.LOC[c.loc].t}</small></div><div class="nbs">${bars}</div>${w}</div>`}).join('')||'<p class="empty">還沒有夥伴在島上</p>';
  if(q._h!==html){q._h=html;q.innerHTML=html;OC.Rig.fillImgs(q);q.onclick=e=>{const el=e.target.closest('.qs-c');if(!el)return;this.setActive(el.dataset.id,true);this.toggleQS()}}},
 setActive(id,go){OC.S.activeId=id;OC.Store.save();const a=Sim.get(id);this.hudChar();if(a){if(go&&a.loc!==OC.R.sc.id)OC.World.go(a.loc,{focus:a});else OC.Cam.followA(a)}},
 select(a){if(OC.S.activeId!==a.id){OC.S.activeId=a.id;this.hudChar()}a.nameT=2.5;for(const x of OC.R.actors)x.focus=x===a},
 /* ================= 點角色：輪盤互動選單（模擬市民風格，但更極簡） ================= */
 actorTap(a){const c=a.c;U.buzz(8);U.emit('tut','tap');
  if(!a.bubble&&!(a.task&&a.task.def.pose==='sleep')){const l=Chars.line(c,'idle');a.say(l||U.pick(C.LINES.greet),{life:2.4});a.face='soft';setTimeout(()=>{if(a.face==='soft')a.face=null},1200)}
  this.radial(a)},
 radial(a,mode='main'){this.closeFloating('keepTray');const c=a.c;const sleeping=a.task&&a.task.def.pose==='sleep';
  /* 打開選單時夥伴會停下來看你 */
  if(!a.busy()&&!sleeping){if(a.task)Sim.finish(a,false);a.goal=null;a.facing=1;a.lookAt=0;a.task={def:{id:'_menu',t:'和你說話',pose:'stand',gain:{},dur:[30,30]},lock:1,phase:'hold'}}
  const MAIN=[['talk','chat','聊天'],['pet','paw','摸摸'],['give','gift','給東西'],['go','walk','一起去'],[sleeping?'wake':'rest',sleeping?'sun':'moon',sleeping?'叫醒':'休息'],['profile','book','檔案']];
  const sad=c.mood==='sad'||c.health.sick;
  const TALK=[['greet','wave','打招呼'],['chat','chat','聊聊天'],['praise','star','稱讚'],['joke','sparkle','開玩笑'],['hug','heart','抱抱'],[sad?'comfort':'wish',sad?'cross':'gift',sad?'安慰':'問願望'],['back','back','返回']];
  const list=mode==='talk'?TALK:MAIN;const R=mode==='talk'?132:118;
  const el=U.el(`<div class="radial" role="menu"><div class="rd-name"><b>${esc(c.name)}</b><small>${esc((C.MOODS[c.mood]||{}).t||'')}${c.health.sick?' · '+C.SICK[c.health.sick].t:''}</small></div>${list.map(([k,i,t],n)=>{const an=Math.PI*(1+n/(list.length-1));
   return`<button class="rd-b" data-k="${k}" style="--x:${Math.cos(an)*R|0}px;--y:${Math.sin(an)*R*.86|0}px;--d:${n*25}ms"><span>${ic(i,26)}</span><small>${t}</small></button>`}).join('')}</div>`);
  document.getElementById('app').appendChild(el);this.rd={el,a};this.placeRadial();requestAnimationFrame(()=>el.classList.add('open'));
  el.onclick=e=>{const b=e.target.closest('[data-k]');if(!b)return;U.buzz(6);this.radialAct(a,b.dataset.k)}},
 placeRadial(){const r=this.rd;if(!r)return;const a=r.a;if(!a.ss)return;const x=a.sx,y=a.sy-a.ss*.75;const k=(x|0)+','+(y|0);if(r.k!==k){r.k=k;r.el.style.transform=`translate(${x|0}px,${y|0}px)`}},
 closeFloating(keep){if(this.rd){const {el,a}=this.rd;this.rd=null;el.classList.remove('open');el.classList.add('out');setTimeout(()=>el.remove(),220);if(a.task&&a.task.def.id==='_menu'){a.task=null;a.lookAt=null}}
  if(keep!=='keepTray'&&OC.Bag)OC.Bag.closeTray();if(this.qsOpen&&keep!=='keepQS'&&keep!=='keepTray')this.toggleQS()},
 radialAct(a,k){const c=a.c;
  if(k==='talk'){this.radial(a,'talk');return}if(k==='back'){this.radial(a,'main');return}
  this.closeFloating(k==='give'?'keepTray':null);
  if(k==='pet'){OC.Cine.pat(a);return}
  if(k==='give'){OC.Bag.openTray(a);this.toast('點一下物品，或把物品拖到夥伴身上','info');return}
  if(k==='go'){OC.Pages.goWith(a);return}
  if(k==='rest'){const A=OC.Acts.ACT;Sim.start(a,OC.S.world.house&&OC.S.world.house.placed?A.sleep:A.nap,{cmd:1});a.say('好，我去休息一下～');return}
  if(k==='wake'){Sim.finish(a,false);a.say(Chars.line(c,'wake')||U.pick(C.LINES.wake));a.feel('!');return}
  if(k==='profile'){OC.Pages.profile(c.id);return}
  OC.Cine.talk(a,k)},
 /* 點場景物件 */
 objTap(o){const a=Sim.active();U.buzz(6);
  if(o.type==='house'||o.act==='enter'){OC.World.go('house');return}
  if(o.act==='exit'){OC.World.go('home');return}
  if(['shop','boutique','market','cafe'].includes(o.act)){OC.Pages.open('shop',o.shop||(o.act==='market'?'general':o.act==='cafe'?'cafe':'gift'));return}
  if(o.act==='sign'){this.notifications();return}
  if(o.act==='garden'){const g=OC.S.world.garden[o.plot]||{g:0};if(Items.qty('seed')>0&&!g.g){Items.take('seed');OC.S.world.garden[o.plot]={g:1,t:Date.now()};this.toast('種下了花種子','check');OC.Quests.on('plant');OC.R.invalidate()}else this.toast(g.g?`花圃成長中（${g.g}/4）· 夥伴照顧時會長大`:'可以在雜貨店買花種子來種','info');if(g.g)return}
  if(o.creation){this.toast(o.name||'自創擺設','info');return}
  if(!a||a.loc!==OC.R.sc.id)return;const A=OC.Acts.ACTS.find(d=>d.obj===o.act||(Array.isArray(d.obj)&&d.obj.includes(o.act)));
  if(A){if(a.task)Sim.finish(a,false);if(a.inter)OC.Social.end(a.inter);Sim.start(a,A,{cmd:1});if(a.task&&a.task.phase==='go'){a.task.obj=o;const p=Sim.useSpot(OC.R.sc,o,a);a.task.gx=p.x;a.task.gz=p.z;a.goal={x:p.x,z:p.z}}a.say(U.pick(['好呀！','我去我去～','嗯！']),{life:1.4})}},
 /* ================= 共用元件 ================= */
 toast(msg,icon='check'){const host=$('#toasts');const t=U.el(`<div class="toast t-${icon}"><i>${ic(TOAST_IC[icon]||'check',18)}</i><span>${esc(msg)}</span></div>`);host.appendChild(t);while(host.children.length>3)host.firstElementChild.remove();
  requestAnimationFrame(()=>t.classList.add('in'));setTimeout(()=>{t.classList.remove('in');t.classList.add('out');setTimeout(()=>t.remove(),320)},2600)},
 /* 底部抽屜：點空白處、下滑（內容在頂端時）、返回鍵都可關閉 */
 sheet(html,{cls='',onClose,full,title,icon}={}){const L=$('#layer');const scrim=U.el('<div class="scrim"></div>');
  const head=title?`<header class="sh-h">${icon?`<span class="sh-i">${ic(icon,28)}</span>`:''}<h2>${esc(title)}</h2></header>`:'';
  const sh=U.el(`<section class="sheet ${cls} ${full?'full':''}" role="dialog"><div class="grab"></div><button class="sh-x" aria-label="關閉">${ic('close',18)}</button>${head}<div class="sh-b">${html}</div></section>`);
  L.append(scrim,sh);const api={el:sh,body:$('.sh-b',sh),closed:false,close:()=>{if(api.closed)return;api.closed=true;sh.classList.remove('open');scrim.classList.remove('open');sh.classList.add('closing');this.sheets=this.sheets.filter(x=>x!==api);setTimeout(()=>{sh.remove();scrim.remove()},300);onClose&&onClose();this.syncBlock()}};
  scrim.addEventListener('click',api.close);$('.sh-x',sh).onclick=api.close;this.sheets.push(api);this.syncBlock();this.closeFloating();
  /* 下滑關閉 */
  let y0=null,dy=0,can=false;sh.addEventListener('pointerdown',e=>{if(e.target.closest('input,textarea,canvas,.nodrag,[type=range]'))return;can=api.body.scrollTop<=0||!!e.target.closest('.grab,.sh-h');y0=e.clientY;dy=0},{passive:true});
  sh.addEventListener('pointermove',e=>{if(y0==null||!can)return;dy=e.clientY-y0;if(dy>6){sh.style.transition='none';sh.style.transform=`translateY(${Math.max(0,dy-6)}px)`}},{passive:true});
  const end=()=>{if(y0==null)return;sh.style.transition='';sh.style.transform='';if(can&&dy>110)api.close();y0=null;dy=0};sh.addEventListener('pointerup',end);sh.addEventListener('pointercancel',end);
  requestAnimationFrame(()=>{scrim.classList.add('open');sh.classList.add('open')});return api},
 /* 置中的對話框（決定、確認） */
 dialog(html,{onClose,cls=''}={}){return this.sheet(html,{cls:'dialog '+cls,onClose})},
 syncBlock(){this.blockWorld=this.sheets.length>0||!!(OC.Pages&&OC.Pages.cur!=null)},
 menu(html,on,opt={}){const s=this.sheet(html,Object.assign({cls:'menu'},opt));s.el.addEventListener('click',e=>{const b=e.target.closest('[data-m]');if(!b)return;s.close();on(b.dataset.m)});OC.Rig.fillImgs(s.el);return s},
 confirm({title,msg,ok='確定',cancel='取消',danger}){return new Promise(res=>{let v=false;const s=this.dialog(`<h2 class="dl-t">${esc(title)}</h2><p class="lead">${msg}</p><div class="row end"><button class="btn ghost" data-v="0">${esc(cancel)}</button><button class="btn ${danger?'danger':'primary'}" data-v="1">${esc(ok)}</button></div>`,{onClose:()=>res(v)});s.el.addEventListener('click',e=>{const b=e.target.closest('[data-v]');if(!b)return;v=b.dataset.v==='1';s.close()})})},
 back(){if(OC.Cine&&OC.Cine.on){OC.Cine.skip();return true}if(OC.Photo&&OC.Photo.on){OC.Photo.close();return true}if(this.placing){this.placing.cancel();return true}if(this.rd||(OC.Bag&&OC.Bag.trayOpen)){this.closeFloating();return true}
  if(this.sheets.length){this.sheets[this.sheets.length-1].close();return true}if(this.qsOpen){this.toggleQS();return true}if(OC.Pages.cur){OC.Pages.close();return true}if(OC.R.sc.id==='house'){OC.World.go('home');return true}return false},
 fade(fn){const f=$('#fade');f.classList.add('on');setTimeout(()=>{try{fn()}finally{requestAnimationFrame(()=>requestAnimationFrame(()=>f.classList.remove('on')))}},280)},
 celebrate(c,title,sub,icon){const host=$('#celebrate');const n=U.el(`<div class="cel"><span class="hav">${c?OC.Rig.avatarHTML(c):ic(icon||'sparkle',34)}</span><div><small>${esc(sub||'')}</small><b>${esc(title)}</b></div><i class="rays"></i></div>`);host.appendChild(n);OC.Rig.fillImgs(n);requestAnimationFrame(()=>n.classList.add('in'));U.buzz(20);setTimeout(()=>{n.classList.remove('in');setTimeout(()=>n.remove(),400)},3000)},
 welcomeBack(r){if(!r.lines.length)return;this.dialog(`<div class="dec"><span class="dec-i">${ic('sun',56)}</span><h2 class="dl-t">歡迎回來！</h2><p class="lead">你離開了大約 ${r.hours<1?Math.round(r.hours*60)+' 分鐘':Math.round(r.hours)+' 小時'}，大家過得很好：</p>${r.lines.slice(0,6).map(l=>`<p class="log">${ic('sprout',18)}<span>${esc(l)}</span></p>`).join('')}</div>`)},
 /* ================= 通知中心（待決定事件＋生活動態） ================= */
 notifications(){OC.S.ui.lastRead=Date.now();this.hudBell();OC.Store.save();const P=OC.S.pending;const byId=id=>OC.S.chars.find(c=>c.id===id);
  const pend=P.map((p,i)=>{let t='有事情需要你決定',d='';if(p.k==='trait'){const c=byId(p.cid);t=`${c?c.name:''}好像改變了`;d=`因為「${p.why}」`}else if(p.k==='breakup'){t=`${byId(p.a)?.name}和${byId(p.b)?.name}鬧翻了`;d='要怎麼處理？'}else if(p.k==='lovers'){t=`${byId(p.a)?.name}想告白`;d='要讓他們成為戀人嗎？'}
   return`<button class="nt pend" data-p="${i}"><span class="nt-i">${ic(p.k==='breakup'?'bolt':p.k==='lovers'?'heart':'sparkle',24)}</span><span><b>${esc(t)}</b><small>${esc(d)}</small></span><em>決定</em></button>`}).join('');
  const IC={leaf:'sprout',star:'star',heart:'heart',moon:'moon',sick:'cross',anger:'bolt',cloud:'cloud',idea:'sparkle',hand:'paw',gift:'gift',food:'food'};
  const logs=OC.S.log.slice(0,40).map(l=>`<div class="nt"><span class="nt-i">${ic(IC[l.ic]||'sprout',22)}</span><span><b>${esc(l.text)}</b><small>${ago(l.t)}</small></span></div>`).join('');
  const s=this.sheet(`${pend?`<h3 class="sec">等你決定</h3>${pend}`:''}<h3 class="sec">小島動態</h3>${logs||'<p class="empty">今天還很平靜</p>'}`,{title:'通知',icon:'bell'});
  s.el.addEventListener('click',e=>{const b=e.target.closest('[data-p]');if(!b)return;const p=P[+b.dataset.p];s.close();setTimeout(()=>this.pending(p),250)})},
 /* 待決定事件（玩家擁有最終決定權） */
 pending(p){p=p||OC.S.pending[0];if(!p)return;const byId=id=>OC.S.chars.find(c=>c.id===id);const done=()=>{OC.S.pending=OC.S.pending.filter(x=>x!==p);OC.Store.save();this.hudBell()};
  const pair=(A,B,mid)=>`<div class="pair"><span class="hav lg">${OC.Rig.avatarHTML(A)}</span><span class="vs">${ic(mid,34)}</span><span class="hav lg">${OC.Rig.avatarHTML(B)}</span></div>`;
  const ask=(html,on)=>{const s=this.dialog(`<div class="dec">${html}</div>`);OC.Rig.fillImgs(s.el);s.el.addEventListener('click',e=>{const b=e.target.closest('[data-v]');if(!b)return;s.close();on(b.dataset.v)})};
  if(p.k==='trait'){const c=byId(p.cid),t=C.TRAIT[p.trait];if(!c||!t){done();return}const conflict=c.traits.filter(x=>C.EXCL(x,p.trait)).map(x=>C.TRAIT[x].t);
   ask(`<span class="hav lg">${OC.Rig.avatarHTML(c)}</span><h2 class="dl-t">${esc(c.name)}好像改變了</h2><p class="lead">因為「${esc(p.why)}」，${esc(c.name)}漸漸變得<b>${esc(t.t)}</b>（${esc(t.d)}）。</p>${conflict.length?`<p class="warn">接受後會取代：${conflict.join('、')}</p>`:''}
    <div class="col"><button class="btn primary" data-v="ok">接受新特質</button><button class="btn" data-v="later">稍後再決定</button><button class="btn ghost" data-v="no">拒絕（一段時間內不再提議）</button><button class="btn ghost" data-v="lock">鎖定目前的性格</button><button class="btn ghost" data-v="off">關閉這位夥伴的性格建議</button></div>`,v=>{
    if(v==='ok'){c.traits=c.traits.filter(x=>!C.EXCL(x,p.trait));c.traits.push(p.trait);c.traits=c.traits.slice(-8);Sim.log(c,`${c.name}有了新特質：${t.t}`,'star');this.celebrate(c,t.t,'新的性格特質');done()}
    else if(v==='later'){}else{if(v==='no')c.declined[p.trait]=Date.now()+7*864e5;if(v==='lock')c.lockedTraits=['*'];if(v==='off')c.noSuggest=true;done()}});return}
  if(p.k==='breakup'){const A=byId(p.a),B=byId(p.b);if(!A||!B){done();return}
   ask(`${pair(A,B,'bolt')}<h2 class="dl-t">${esc(A.name)}和${esc(B.name)}鬧翻了</h2><p class="lead">兩人吵得很兇，${esc(A.name)}說：「我們絕交吧！」這會讓兩人互相迴避、不再一起玩。</p>
    <div class="col"><button class="btn primary" data-v="mediate">介入調解</button><button class="btn" data-v="cool">讓他們先冷靜一下</button><button class="btn ghost danger-t" data-v="ok">讓絕交發生</button></div>`,v=>{
    if(v==='ok')OC.Social.breakUp(A.id,B.id);else if(v==='cool'){const r=OC.Social.rel(A.id,B.id);r.conf=Math.max(0,r.conf-30);Sim.log(null,`${A.name}和${B.name}各自冷靜了一下。`,'cloud')}else{const r=OC.Social.mediate(A.id,B.id);this.toast(r.ok?'調解成功！兩人和好了':'兩人還需要一點時間…',r.ok?'heart':'info')}done()});return}
  if(p.k==='lovers'){const A=byId(p.a),B=byId(p.b);if(!A||!B){done();return}
   ask(`${pair(A,B,'heart')}<h2 class="dl-t">${esc(A.name)}想向${esc(B.name)}告白</h2><p class="lead">兩人感情越來越好。要讓他們成為戀人嗎？</p>
    <div class="col"><button class="btn primary" data-v="ok">成為戀人</button><button class="btn" data-v="friend">維持好朋友</button><button class="btn ghost" data-v="never">不允許這兩位發展戀愛</button></div>`,v=>{const r=OC.Social.rel(A.id,B.id);
    if(v==='ok'){r.lovers=true;Sim.log(null,`${A.name}和${B.name}成為了戀人！`,'heart');for(const [x,y] of [[A,B],[B,A]])Sim.remember(x,'lovers',`和${y.name}成為戀人`,1,[y.id]);this.celebrate(A,`${A.name} 與 ${B.name}`,'成為戀人')}else{r.r=Math.min(r.r,40);if(v==='never')r.noRomance=true}done()});return}
  done()},
 frame(){if(this.rd)this.placeRadial();if(OC.Bag&&OC.Bag.frame)OC.Bag.frame()}};
function ago(t){const s=(Date.now()-t)/1000;if(s<60)return'剛剛';if(s<3600)return Math.floor(s/60)+' 分鐘前';if(s<86400)return Math.floor(s/3600)+' 小時前';return new Date(t).toLocaleDateString('zh-TW')}
UI.ago=ago;
OC.UI=UI;
})(window.OC);
