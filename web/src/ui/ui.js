/* OC Shimeji v4 · 介面核心：HUD、底部抽屜、提示、快捷背包、角色選單、決策卡
   原則：DOM 只在資料改變時更新（diff 寫入），不使用 backdrop-filter，不在每格改樣式。 */
(function(OC){'use strict';
const {U,Content:C,Chars,Items,Sim,Env}=OC;const {$,$$,esc}=U;
/* ---------- 圖示（原創線條圖示） ---------- */
const P={home:'M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z',users:'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 4.5a3.3 3.3 0 0 1 0 6.4M18 14.5c1.9.8 3 2.8 3 5.5',map:'M9 4L3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5zM9 4v13.5M15 6.5V20',life:'M12 3l2.4 5.2 5.6.6-4.2 3.8 1.2 5.6L12 15.4 7 18.2l1.2-5.6L4 8.8l5.6-.6z',more:'M5 12h.01M12 12h.01M19 12h.01',close:'M6 6l12 12M18 6L6 18',back:'M15 5l-7 7 7 7',plus:'M12 5v14M5 12h14',check:'M5 12.5l4.5 4.5L19 7.5',heart:'M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z',
 bag:'M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2',locate:'M12 3v3M12 18v3M3 12h3M18 12h3M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',chat:'M4 5h16v11H9l-5 4z',gift:'M4 9h16v4H4zM6 13v7h12v-7M12 9v11M12 9S10.5 4 8 5s1 4 4 4zm0 0s1.5-5 4-4-1 4-4 4z',star:'M12 4l2.2 4.8 5.3.5-4 3.6 1.2 5.2L12 15.4l-4.7 2.7 1.2-5.2-4-3.6 5.3-.5z',gear:'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM19 12l2-1-1-3-2.2.3-1.3-1.3.3-2.2-3-1-1 2h-1.6l-1-2-3 1 .3 2.2L6.2 7.3 4 7l-1 3 2 1v1.6l-2 1 1 3 2.2-.3 1.3 1.3-.3 2.2 3 1 1-2h1.6l1 2 3-1-.3-2.2 1.3-1.3 2.2.3 1-3-2-1z',
 edit:'M5 19h4L19 9l-4-4L5 15zM13 7l4 4',trash:'M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13',hand:'M8 13V6.5a1.5 1.5 0 0 1 3 0V12M11 11V5a1.5 1.5 0 0 1 3 0v6M14 11V6.5a1.5 1.5 0 0 1 3 0V14c0 4-2.5 6.5-6 6.5-2.5 0-4-1.3-5.3-3.3L4 14.5a1.5 1.5 0 0 1 2.4-1.8L8 15',walk:'M13 4.5a1.5 1.5 0 1 0 0-.01M10 21l2-6 3 2v4M9 11l3-3 3 3 3 1M12 8l-2 6',door:'M6 20V4h12v16M4 20h16M14 12h.01',sparkle:'M12 3v5M12 16v5M3 12h5M16 12h5M6 6l3 3M15 15l3 3M18 6l-3 3M9 15l-3 3',bell:'M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0',
 sun:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.4 1.4M17.6 17.6L19 19M5 19l1.4-1.4M17.6 6.4L19 5',moon:'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z',shop:'M4 9l1.5-5h13L20 9M4 9h16v11H4zM9 20v-6h6v6',book:'M5 4h9a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM17 7h2v13',quest:'M7 4h10v16l-5-3-5 3z',camera:'M4 8h3l2-3h6l2 3h3v11H4zM12 10a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z',brush:'M14 4l6 6-8 8H6v-6z',pet:'M12 21c-4 0-6-2-6-4.5S8.5 12 12 12s6 2 6 4.5S16 21 12 21zM6.5 9.5a1.8 2.2 0 1 0 .1 0M17.5 9.5a1.8 2.2 0 1 0 .1 0M9.5 5a1.8 2.2 0 1 0 .1 0M14.5 5a1.8 2.2 0 1 0 .1 0',coin:'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 8v8'};
const ic=(n,s=20)=>`<svg class="ic" viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true"><path d="${P[n]||P.star}"/></svg>`;
const COIN='<svg viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="12" r="9" fill="#F6C65B"/><circle cx="12" cy="12" r="6.2" fill="none" stroke="#E2A43A" stroke-width="1.6"/><path d="M12 8.6v6.8" stroke="#E2A43A" stroke-width="1.7" stroke-linecap="round"/></svg>';
const TOAST_IC={check:'✓',warn:'!',info:'i',star:'★',heart:'♥',coin:'◎',quest:'✦',sick:'✚',anger:'⚡',gift:'❀'};

const UI={ic,COIN,sheets:[],blockWorld:false,placing:null,
 init(){if(this.ready)return;this.ready=true;this.buildHUD();this.bag.init();
  U.on('coins',()=>this.hudCoins());U.on('inv',()=>this.bag.render());U.on('pending',()=>this.hudPending());U.on('quests',()=>this.hudQuest());U.on('scene',()=>this.hudLoc());U.on('weather',()=>this.hudTime(true));
  U.on('mood',c=>{if(c.id===OC.S.activeId)this.hudChar()});
  setInterval(()=>{if(!document.hidden){this.hudTime();this.hudChar();if(this.qsOpen)this.renderQS()}},1000);
  this.hudCoins();this.hudTime(true);this.hudChar();this.hudLoc();this.hudPending();this.hudQuest();
  document.addEventListener('keydown',e=>{if(e.key==='Escape')this.back()});
  window.OCBack=()=>this.back()},
 /* ================= HUD ================= */
 buildHUD(){const h=$('#hud');h.innerHTML=`
  <button class="hud-char" id="hChar" aria-label="夥伴狀態"><span class="hav" id="hAv"></span><span class="hc-t"><b id="hName"></b><small id="hMood"></small></span><span class="hc-ring" id="hRing"></span></button>
  <div class="hud-tr"><button class="pill coin" id="hCoin" aria-label="星幣">${COIN}<b id="hCoinN">0</b></button>
   <button class="pill clock" id="hClock" aria-label="時間與天氣"><span id="hWx"></span><span class="ct"><b id="hTime"></b><small id="hDate"></small></span></button></div>
  <button class="pill loc" id="hLoc"><span id="hLocIc"></span><b id="hLocN"></b></button>
  <button class="fab bell" id="hBell" aria-label="待決定的事件" hidden>${ic('bell')}<i class="dot"></i></button>
  <div class="dock" id="hDock">
   <button class="dk" data-d="call" aria-label="呼喚">${ic('locate')}<span>呼喚</span></button>
   <button class="dk" data-d="follow" aria-label="跟隨鏡頭">${ic('camera')}<span>跟隨</span></button>
   <button class="dk" data-d="quest" aria-label="任務">${ic('quest')}<span>任務</span><i class="dot" id="hQDot" hidden></i></button>
  </div>
  <div class="qs" id="qs" hidden></div>`;
  $('#hChar').onclick=()=>this.toggleQS();$('#hClock').onclick=()=>OC.Pages.timeWeather();$('#hCoin').onclick=()=>OC.Pages.open('life','shop');$('#hLoc').onclick=()=>OC.Pages.open('map');$('#hBell').onclick=()=>this.pending();
  $('#hDock').onclick=e=>{const b=e.target.closest('[data-d]');if(!b)return;const a=Sim.active();U.buzz(6);
   if(b.dataset.d==='call'){if(!a)return;if(a.loc!==OC.R.sc.id){OC.Sim.sendTo(a,OC.R.sc.id);this.toast(`${a.c.name}正在趕過來`,'info');return}OC.Play.call(a)}
   else if(b.dataset.d==='follow'){OC.Cam.follow=true;OC.Cam.focus=a&&a.loc===OC.R.sc.id?a:OC.R.actors[0];this.followChanged()}
   else if(b.dataset.d==='quest')OC.Pages.open('life','quest')};
  this.followChanged()},
 followChanged(){U.toggle($('[data-d=follow]'),'on',OC.Cam.follow)},
 hudCoins(){const n=$('#hCoinN');const v=OC.S.coins;if(+n.textContent!==v){const from=+n.textContent||0;n.textContent=v;if(this.ready&&v>from){const p=$('#hCoin');p.classList.remove('bump');void p.offsetWidth;p.classList.add('bump')}}},
 hudTime(force){const L=Env.label();U.setText($('#hTime'),L.time);U.setText($('#hDate'),L.ph+' · '+L.wx.t);if(force||this._wx!==Env.wid+Env.phase){this._wx=Env.wid+Env.phase;U.setHTML($('#hWx'),`<span class="wxe">${L.wx.ic}</span>`)}},
 hudChar(){const a=Sim.active();if(!a){U.setText($('#hName'),'—');return}const c=a.c;const avk=c.id+(c.img||'')+JSON.stringify(c.look);if(this._av!==avk){this._av=avk;U.setHTML($('#hAv'),OC.Rig.avatarHTML(c));OC.Rig.fillImgs($('#hAv'))}
  U.setText($('#hName'),c.name);const m=C.MOODS[c.mood]||C.MOODS.content;U.setText($('#hMood'),m.t+(a.loc!==OC.R.sc.id?' · 在'+C.LOC[a.loc].t:''));
  const sc=Sim.score(c);const ring=$('#hRing');const deg=Math.round(sc*3.6);const col=sc>65?'#8CC3A0':sc>35?'#F2B860':'#E57B72';const k=deg+col;if(ring._k!==k){ring._k=k;ring.style.background=`conic-gradient(${col} ${deg}deg, rgba(0,0,0,.08) 0)`}},
 hudLoc(){const l=C.LOC[OC.R.sc.id];U.setText($('#hLocN'),l.t);U.setText($('#hLocIc'),l.ic)},
 hudPending(){const n=OC.S.pending.length;const b=$('#hBell');b.hidden=!n;U.toggle(b,'pulse',n>0)},
 hudQuest(){$('#hQDot').hidden=!OC.Quests.ready()},
 /* 角色快速狀態卡 */
 toggleQS(){this.qsOpen=!this.qsOpen;U.emit('tut','qs');const q=$('#qs');if(this.qsOpen){this.renderQS();q.hidden=false;requestAnimationFrame(()=>q.classList.add('open'))}else{q.classList.remove('open');setTimeout(()=>{if(!this.qsOpen)q.hidden=true},220)}},
 renderQS(){const q=$('#qs');const list=[...Sim.agents.values()];const act=OC.S.activeId;
  const html=list.map(a=>{const c=a.c,m=C.MOODS[c.mood]||C.MOODS.content;const T=a.task?(a.task.phase==='leave'||a.task.phase==='away'?`前往${C.LOC[a.task.loc].t}`:a.task.def.t):a.inter?'和朋友互動中':'閒晃';
   const bars=C.NEEDS.map(([k,t,col])=>`<div class="nb"><span>${t}</span><i><b style="width:${c.needs[k]|0}%;background:${col}"></b></i></div>`).join('');
   const w=c.wishes[0]?`<div class="wish">💭 ${esc(Sim.wishText(c,c.wishes[0]))}</div>`:'';
   return`<div class="qs-c ${c.id===act?'on':''}" data-id="${c.id}"><div class="qs-h"><span class="hav sm">${OC.Rig.avatarHTML(c)}</span><b>${esc(c.name)}</b><em style="background:${m.c}">${m.t}</em>${c.health.sick?'<em class="sick">'+C.SICK[c.health.sick].t+'</em>':''}<small>${esc(T)} · ${C.LOC[c.loc].t}</small></div><div class="nbs">${bars}</div>${w}</div>`}).join('')||'<p class="empty">還沒有夥伴在島上</p>';
  if(q._h!==html){q._h=html;q.innerHTML=html;OC.Rig.fillImgs(q);q.onclick=e=>{const el=e.target.closest('.qs-c');if(!el)return;this.setActive(el.dataset.id,true)}}},
 setActive(id,go){OC.S.activeId=id;OC.Store.save();const a=Sim.get(id);this.hudChar();if(this.qsOpen)this.renderQS();if(a){if(go&&a.loc!==OC.R.sc.id)OC.World.go(a.loc,{focus:a});else{OC.Cam.focus=a;OC.Cam.follow=true;this.followChanged()}}},
 select(a,quiet){if(OC.S.activeId!==a.id){OC.S.activeId=a.id;this.hudChar()}a.nameT=2.5;for(const x of OC.R.actors)x.focus=x===a},
 /* 點角色：跟你打招呼＋行動選單 */
 actorTap(a){const c=a.c;U.buzz(8);U.emit('tut','tap');if(!a.bubble&&!(a.task&&a.task.def.pose==='sleep')){const l=Chars.line(c,'idle');a.say(l||U.pick(C.LINES.greet));a.face='soft';setTimeout(()=>{if(a.face==='soft')a.face=null},1200)}
  const sleeping=a.task&&a.task.def.pose==='sleep';
  this.menu(`<div class="am-h"><span class="hav">${OC.Rig.avatarHTML(c)}</span><div><b>${esc(c.name)}</b><small>${esc((C.MOODS[c.mood]||{}).t||'')}${c.health.sick?' · '+C.SICK[c.health.sick].t:''} · ${esc(a.task?a.task.def.t:'自由活動')}</small></div></div>
   <div class="am-g">
   <button data-m="talk">${ic('chat')}<span>聊天</span></button>
   <button data-m="feed">${ic('bag')}<span>給東西</span></button>
   <button data-m="${sleeping?'wake':'sleep'}">${ic('moon')}<span>${sleeping?'叫醒':'去休息'}</span></button>
   <button data-m="go">${ic('walk')}<span>一起去…</span></button>
   <button data-m="profile">${ic('book')}<span>檔案</span></button>
   <button data-m="pet">${ic('hand')}<span>摸摸</span></button></div>
   <p class="am-tip">在夥伴身上<b>上下滑動</b>就能摸摸頭；<b>長按</b>可以抱起來移動。</p>`,m=>{
   if(m==='talk'){const w=c.wishes[0];const lines=[c.health.sick?U.pick(C.LINES.sick[c.health.sick]):null,w?'其實我'+Sim.wishText(c,w)+'…':null,c.mood==='hungry'?U.pick(C.LINES.hungry):null,c.mood==='lonely'?U.pick(C.LINES.lonely):null,c.mood==='bored'?U.pick(C.LINES.bored):null,Chars.line(c,'idle')].filter(Boolean);
    const mem=c.memories.find(m=>Math.abs(m.val)>.5&&Date.now()-m.t<864e5*2);if(mem&&Math.random()<.5)lines.unshift(mem.val>0?`我還記得${mem.text}，好開心！`:`${mem.text}…我還有點難過。`);a.say(Chars.say(c,lines[0]||'嘿嘿。'));c.needs.social=Math.min(100,c.needs.social+6);c.bond++}
   else if(m==='feed'){this.bag.open(true)}
   else if(m==='sleep'){const A=OC.Acts.ACT;Sim.start(a,OC.S.world.house&&OC.S.world.house.placed?A.sleep:A.nap,{cmd:1});a.say('好，我去睡一下～')}
   else if(m==='wake'){Sim.finish(a,false);a.say(Chars.line(c,'wake')||U.pick(C.LINES.wake));a.feel('!')}
   else if(m==='go')OC.Pages.goWith(a);else if(m==='profile')OC.Pages.profile(c.id);else if(m==='pet'){this.toast('在夥伴身上上下滑動就能摸摸','info')}})},
 /* 點場景物件 */
 objTap(o){const a=Sim.active();U.buzz(6);
  if(o.type==='house'){OC.World.go('house');return}
  if(o.act==='shop'||o.act==='boutique'||o.act==='market'||o.act==='cafe'){OC.Pages.shop(o.shop||(o.act==='market'?'general':o.act==='cafe'?'cafe':'gift'));return}
  if(o.act==='sign'){this.sheet(`<h2>📜 小島告示牌</h2><p class="lead">${esc(Env.label().date)}　${Env.label().wx.ic} ${Env.label().wx.t}</p>${(OC.S.log.slice(0,5).map(l=>`<p class="log">${esc(l.text)}</p>`).join(''))||'<p class="empty">今天還很平靜。</p>'}`);return}
  if(o.act==='garden'){const g=OC.S.world.garden[o.plot]||{g:0};if(Items.qty('seed')>0&&!g.g){Items.take('seed');OC.S.world.garden[o.plot]={g:1,t:Date.now()};this.toast('種下了花種子','check');OC.R.invalidate()}else this.toast(g.g?`花圃成長中（${g.g}/4）·夥伴照顧時會長大`:'可以在雜貨店買花種子來種','info')}
  if(o.act==='enter'){OC.World.go('house');return}
  if(!a||a.loc!==OC.R.sc.id)return;const A=OC.Acts.ACTS.find(d=>d.obj===o.act||(Array.isArray(d.obj)&&d.obj.includes(o.act)));
  if(A){if(a.task)Sim.finish(a,false);if(a.inter)OC.Social.end(a.inter);Sim.start(a,A,{cmd:1});a.task&&(a.task.obj=o,(()=>{const p=Sim.useSpot(OC.R.sc,o,a);a.task.gx=p.x;a.task.gz=p.z;a.goal={x:p.x,z:p.z}})());a.say(U.pick(['好呀！','我去我去～','嗯！']),{life:1.4})}},
 /* ================= 共用元件 ================= */
 toast(msg,icon='check'){const host=$('#toasts');const t=U.el(`<div class="toast t-${icon}"><i>${TOAST_IC[icon]||'✓'}</i><span>${esc(msg)}</span></div>`);host.appendChild(t);while(host.children.length>3)host.firstElementChild.remove();
  requestAnimationFrame(()=>t.classList.add('in'));setTimeout(()=>{t.classList.remove('in');t.classList.add('out');setTimeout(()=>t.remove(),320)},2600)},
 sheet(html,{cls='',onClose,full}={}){const L=$('#layer');const scrim=U.el('<div class="scrim"></div>'),sh=U.el(`<section class="sheet ${cls} ${full?'full':''}" role="dialog"><div class="grab"></div><button class="sh-x" aria-label="關閉">${ic('close')}</button><div class="sh-b">${html}</div></section>`);
  L.append(scrim,sh);const api={el:sh,body:$('.sh-b',sh),closed:false,close:()=>{if(api.closed)return;api.closed=true;sh.classList.remove('open');scrim.classList.remove('open');this.sheets=this.sheets.filter(x=>x!==api);setTimeout(()=>{sh.remove();scrim.remove()},300);onClose&&onClose();this.syncBlock()}};
  scrim.onclick=api.close;$('.sh-x',sh).onclick=api.close;this.sheets.push(api);this.syncBlock();
  /* 下拉關閉 */
  let y0=null,dy=0;$('.grab',sh).addEventListener('pointerdown',e=>{y0=e.clientY;sh.style.transition='none';$('.grab',sh).setPointerCapture(e.pointerId)});$('.grab',sh).addEventListener('pointermove',e=>{if(y0==null)return;dy=Math.max(0,e.clientY-y0);sh.style.transform=`translateY(${dy}px)`});$('.grab',sh).addEventListener('pointerup',()=>{sh.style.transition='';sh.style.transform='';if(dy>90)api.close();y0=null;dy=0});
  requestAnimationFrame(()=>{scrim.classList.add('open');sh.classList.add('open')});return api},
 syncBlock(){this.blockWorld=this.sheets.length>0||!!OC.Pages&&OC.Pages.cur!=null},
 menu(html,on){const s=this.sheet(html,{cls:'menu'});s.el.addEventListener('click',e=>{const b=e.target.closest('[data-m]');if(!b)return;s.close();on(b.dataset.m)});OC.Rig.fillImgs(s.el);return s},
 confirm({title,msg,ok='確定',cancel='取消',danger}){return new Promise(res=>{const s=this.sheet(`<h2>${esc(title)}</h2><p class="lead">${msg}</p><div class="row end"><button class="btn ghost" data-v="0">${esc(cancel)}</button><button class="btn ${danger?'danger':'primary'}" data-v="1">${esc(ok)}</button></div>`,{cls:'dialog',onClose:()=>res(false)});s.el.addEventListener('click',e=>{const b=e.target.closest('[data-v]');if(!b)return;const v=b.dataset.v==='1';s.close();res(v)})})},
 back(){if(this.placing){this.placing.cancel();return true}if(this.sheets.length){this.sheets[this.sheets.length-1].close();return true}if(this.qsOpen){this.toggleQS();return true}if(OC.Pages.cur){OC.Pages.close();return true}if(OC.R.sc.id!=='home'&&OC.R.sc.id==='house'){OC.World.go('home');return true}return false},
 /* 柔和轉場（遮罩淡入→切換→淡出） */
 fade(fn){const f=$('#fade');f.classList.add('on');setTimeout(()=>{try{fn()}finally{requestAnimationFrame(()=>requestAnimationFrame(()=>f.classList.remove('on')))}},280)},
 /* 慶祝演出：任務、技能、和好等 */
 celebrate(c,title,sub){const host=$('#celebrate');const n=U.el(`<div class="cel"><span class="hav">${c?OC.Rig.avatarHTML(c):'✨'}</span><div><small>${esc(sub||'')}</small><b>${esc(title)}</b></div></div>`);host.appendChild(n);OC.Rig.fillImgs(n);requestAnimationFrame(()=>n.classList.add('in'));U.buzz(20);setTimeout(()=>{n.classList.remove('in');setTimeout(()=>n.remove(),400)},3000)},
 welcomeBack(r){if(!r.lines.length)return;this.sheet(`<h2>歡迎回來！</h2><p class="lead">你離開了大約 ${r.hours<1?Math.round(r.hours*60)+' 分鐘':Math.round(r.hours)+' 小時'}，大家過得很好：</p>${r.lines.slice(0,6).map(l=>`<p class="log">🌿 ${esc(l)}</p>`).join('')}`,{cls:'dialog'})},
 /* ================= 待決定事件（玩家擁有最終決定權） ================= */
 pending(){const p=OC.S.pending[0];if(!p)return;const byId=id=>OC.S.chars.find(c=>c.id===id);const done=()=>{OC.S.pending=OC.S.pending.filter(x=>x!==p);OC.Store.save();this.hudPending();if(OC.S.pending.length)setTimeout(()=>this.pending(),350)};
  if(p.k==='trait'){const c=byId(p.cid),t=C.TRAIT[p.trait];if(!c||!t){done();return}const conflict=c.traits.filter(x=>C.EXCL(x,p.trait)).map(x=>C.TRAIT[x].t);
   const s=this.sheet(`<div class="dec"><span class="hav lg">${OC.Rig.avatarHTML(c)}</span><h2>${esc(c.name)}好像改變了</h2><p class="lead">因為「${esc(p.why)}」，${esc(c.name)}漸漸變得<b>${t.em} ${esc(t.t)}</b>（${esc(t.d)}）。</p>${conflict.length?`<p class="warn">接受後會取代：${conflict.join('、')}</p>`:''}
    <div class="col"><button class="btn primary" data-v="ok">接受新特質</button><button class="btn" data-v="later">稍後再決定</button><button class="btn ghost" data-v="no">拒絕（一段時間內不再提議）</button><button class="btn ghost" data-v="lock">鎖定目前的性格</button><button class="btn ghost" data-v="off">關閉這位夥伴的性格建議</button></div></div>`,{cls:'dialog'});OC.Rig.fillImgs(s.el);
   s.el.addEventListener('click',e=>{const b=e.target.closest('[data-v]');if(!b)return;const v=b.dataset.v;s.close();
    if(v==='ok'){c.traits=c.traits.filter(x=>!C.EXCL(x,p.trait));c.traits.push(p.trait);c.traits=c.traits.slice(-8);Sim.log(c,`${c.name}有了新特質：${t.t}`,'star');this.celebrate(c,`${t.em} ${t.t}`,'新的性格特質');done()}
    else if(v==='later'){OC.S.pending.push(OC.S.pending.shift());OC.Store.save()}
    else{if(v==='no')c.declined[p.trait]=Date.now()+7*864e5;if(v==='lock')c.lockedTraits=['*'];if(v==='off')c.noSuggest=true;done()}});return}
  if(p.k==='breakup'){const A=byId(p.a),B=byId(p.b);if(!A||!B){done();return}
   const s=this.sheet(`<div class="dec"><div class="pair"><span class="hav lg">${OC.Rig.avatarHTML(A)}</span><span class="vs">⚡</span><span class="hav lg">${OC.Rig.avatarHTML(B)}</span></div><h2>${esc(A.name)}和${esc(B.name)}鬧翻了</h2><p class="lead">兩人吵得很兇，${esc(A.name)}說：「我們絕交吧！」這會讓兩人互相迴避、不再一起玩。</p>
    <div class="col"><button class="btn primary" data-v="mediate">介入調解</button><button class="btn" data-v="cool">讓他們先冷靜一下</button><button class="btn ghost danger-t" data-v="ok">讓絕交發生</button></div></div>`,{cls:'dialog'});OC.Rig.fillImgs(s.el);
   s.el.addEventListener('click',e=>{const b=e.target.closest('[data-v]');if(!b)return;const v=b.dataset.v;s.close();
    if(v==='ok')OC.Social.breakUp(A.id,B.id);else if(v==='cool'){const r=OC.Social.rel(A.id,B.id);r.conf=Math.max(0,r.conf-30);Sim.log(null,`${A.name}和${B.name}各自冷靜了一下。`,'cloud')}else{const r=OC.Social.mediate(A.id,B.id);this.toast(r.ok?'調解成功！兩人和好了':'兩人還需要一點時間…',r.ok?'heart':'info')}done()});return}
  if(p.k==='lovers'){const A=byId(p.a),B=byId(p.b);if(!A||!B){done();return}
   const s=this.sheet(`<div class="dec"><div class="pair"><span class="hav lg">${OC.Rig.avatarHTML(A)}</span><span class="vs">💗</span><span class="hav lg">${OC.Rig.avatarHTML(B)}</span></div><h2>${esc(A.name)}想向${esc(B.name)}告白</h2><p class="lead">兩人感情越來越好。要讓他們成為戀人嗎？</p>
    <div class="col"><button class="btn primary" data-v="ok">成為戀人</button><button class="btn" data-v="friend">維持好朋友</button><button class="btn ghost" data-v="never">不允許這兩位發展戀愛</button></div></div>`,{cls:'dialog'});OC.Rig.fillImgs(s.el);
   s.el.addEventListener('click',e=>{const b=e.target.closest('[data-v]');if(!b)return;const v=b.dataset.v;s.close();const r=OC.Social.rel(A.id,B.id);
    if(v==='ok'){r.lovers=true;Sim.log(null,`${A.name}和${B.name}成為了戀人！`,'heart');for(const [x,y] of [[A,B],[B,A]])Sim.remember(x,'lovers',`和${y.name}成為戀人`,1,[y.id]);this.celebrate(A,`${A.name} 💗 ${B.name}`,'成為戀人')}else{r.r=Math.min(r.r,40);if(v==='never')r.noRomance=true}done()});return}
  done()},
 frame(){}};

/* ================= 快捷背包：可拖曳位置、展開收合、拖物品給角色 ================= */
UI.bag={init(){const el=$('#qbag');el.innerHTML=`<button class="qb-h" id="qbH" aria-label="背包">${ic('bag',22)}<b id="qbN"></b></button><div class="qb-p" id="qbP"><div class="qb-tabs" id="qbT"></div><div class="qb-l" id="qbL"></div></div>`;
  const st=OC.S.ui||(OC.S.ui={bagY:.62,bagOpen:false,bagTab:'food'});this.st=st;this.apply();
  /* 拖曳把手：上下移動位置；點一下展開 */
  const h=$('#qbH');let d=null;h.addEventListener('pointerdown',e=>{d={y:e.clientY,y0:st.bagY,m:0};h.setPointerCapture(e.pointerId)});
  h.addEventListener('pointermove',e=>{if(!d)return;const dy=e.clientY-d.y;d.m=Math.max(d.m,Math.abs(dy));if(d.m>6){st.bagY=U.clamp(d.y0+dy/innerHeight,.18,.82);this.apply()}});
  h.addEventListener('pointerup',()=>{if(d&&d.m<=6){st.bagOpen=!st.bagOpen;this.apply();U.buzz(6)}d=null;OC.Store.save()});
  $('#qbT').onclick=e=>{const b=e.target.closest('[data-t]');if(!b)return;st.bagTab=b.dataset.t;this.render()};
  $('#qbL').addEventListener('pointerdown',e=>this.dragStart(e));this.render()},
 apply(){const el=$('#qbag');el.style.top=(this.st.bagY*100)+'%';U.toggle(el,'open',this.st.bagOpen)},
 open(v){this.st.bagOpen=v;this.apply()},
 TABS:[['food','食物',['food','drink']],['care','照顧',['medicine','care','toy']],['gift','禮物',['gift','col','fish','bug']]],
 render(){const tabs=this.TABS.map(([k,t])=>`<button data-t="${k}" class="${this.st.bagTab===k?'on':''}">${t}</button>`).join('');U.setHTML($('#qbT'),tabs);
  const T=this.TABS.find(t=>t[0]===this.st.bagTab)||this.TABS[0];const list=Items.list().filter(i=>T[2].includes(i.cat));
  U.setHTML($('#qbL'),list.length?list.map(i=>`<button class="qi" data-id="${i.id}" title="${esc(i.name)}"><span>${i.em}</span><b>${i.q}</b></button>`).join(''):'<p class="qb-e">空空的<br><small>去商店逛逛吧</small></p>');
  U.setText($('#qbN'),Object.values(OC.S.inv).reduce((a,b)=>a+b,0)||'')},
 /* 拖物品到角色身上 */
 dragStart(e){const b=e.target.closest('.qi');if(!b)return;e.preventDefault();const id=b.dataset.id,it=C.ITEM[id];const g=$('#dghost');g.textContent=it.em;g.style.transform=`translate(${e.clientX-24}px,${e.clientY-40}px) scale(1.15)`;g.classList.add('on');let over=null,moved=false;const sx=e.clientX,sy=e.clientY;
  const mv=ev=>{if(Math.hypot(ev.clientX-sx,ev.clientY-sy)>6)moved=true;g.style.transform=`translate(${ev.clientX-24}px,${ev.clientY-40}px) scale(1.15)`;const r=$('#world').getBoundingClientRect();const a=OC.Input.hitActor(ev.clientX-r.left,ev.clientY-r.top);if(over&&over!==a){over.focus=false}over=a;if(a){a.focus=true;a.nameT=1}U.toggle(g,'hot',!!a)};
  const up=ev=>{window.removeEventListener('pointermove',mv);window.removeEventListener('pointerup',up);g.classList.remove('on','hot');
   if(over){over.focus=false;if(OC.Play.give(over,id)){U.buzz(12)}}else if(!moved){const a=Sim.active();if(a&&a.loc===OC.R.sc.id){if(OC.Play.give(a,id))U.buzz(12)}else UI.toast(`${it.em}${it.name}：拖到夥伴身上就能使用`,'info')}};
  window.addEventListener('pointermove',mv);window.addEventListener('pointerup',up)}};
OC.UI=UI;
})(window.OC);
