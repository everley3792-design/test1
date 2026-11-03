/* OC Shimeji v4 · 頁面：角色（卡片、檔案、編輯器）、地圖、小島日常（任務、商店、圖鑑、故事、家具）、設定 */
(function(OC){'use strict';
const {U,Content:C,Chars,Items,Sim,Env,UI}=OC;const {$,esc}=U;const ic=UI.ic;
const NAV=[['world','小島','home'],['chars','角色','users'],['bag','背包','bag'],['life','日常','quest'],['shop','商店','shop'],['more','更多','more']];
const CAT_IC={pers:'heart',soc:'chat',emo:'sparkle',int:'star',abi:'medal',hab:'home',spc:'gem'};
const Pages={cur:null,CAT_IC,
 init(){const nav=$('#nav');nav.innerHTML=NAV.map(([k,t,i])=>`<button data-p="${k}" class="${k==='world'?'on':''}" aria-label="${t}"><span class="nv">${ic(i,30)}</span><i class="dot" data-dot="${k}" hidden></i></button>`).join('');
  nav.onclick=e=>{const b=e.target.closest('[data-p]');if(!b)return;U.buzz(5);const k=b.dataset.p;if(k==='world'||k===this.cur)this.close();else this.open(k)};
  U.on('pending',()=>this.dots());U.on('quests',()=>this.dots());this.dots()},
 dots(){const q=$('[data-dot=life]');if(q)q.hidden=!OC.Quests.ready()},
 open(k,tab){const pg=$('#page');this.cur=k;if(k==='shop'){if(tab)OC.ShopUI.cur=tab}else if(k==='life')this.tab=tab||this.tab;pg.className='page on p-'+k;
  $$('#nav [data-p]').forEach(b=>U.toggle(b,'on',b.dataset.p===k||(k==='map'&&b.dataset.p==='more')));UI.closeFloating&&UI.closeFloating();UI.syncBlock();
  this.render();OC.Loop.renderOn=false;pg.scrollTop=0},
 close(){if(!this.cur)return;this.cur=null;const pg=$('#page');pg.className='page';$$('#nav [data-p]').forEach(b=>U.toggle(b,'on',b.dataset.p==='world'));OC.Loop.renderOn=true;UI.syncBlock();OC.R.skey=''},
 render(){const pg=$('#page');const k=this.cur;let h='';const y=pg.scrollTop;
  if(k==='chars')h=this.chars();else if(k==='map')h=this.map();else if(k==='life')h=this.life();else if(k==='bag')h=OC.Bag.page();else if(k==='shop')h=OC.ShopUI.page();else if(k==='more')h=this.more();
  pg.innerHTML=`<button class="pg-x" data-close aria-label="關閉">${ic('close',20)}</button><div class="pg-in">${h}</div>`;OC.Rig.fillImgs(pg);this.bind(pg);if(k==='bag')OC.Bag.bindPage(pg);pg.scrollTop=y},
 /* ================= 更多 ================= */
 more(){const T=[['map','世界地圖','map','前往不同地點'],['workshop','工坊','palette','繪畫、創作物品與動畫'],['events','自製事件','event','設計夥伴的專屬反應'],['deco','佈置','garden','家具、房子與小島擺設'],['codex','收藏圖鑑','book','發現的魚、昆蟲與收藏'],['story','生活故事','chat','島上發生的大小事'],['photo','拍照模式','camera','留下可愛的瞬間'],['settings','設定','gear','畫質、效能、資料備份']];
  return`<header class="ph"><span class="ph-i">${ic('more',40)}</span><div><h1>更多</h1><p>小島的所有功能</p></div></header><div class="hub">${T.map(([k,t,i,d])=>`<button class="hub-b" data-hub="${k}"><span>${ic(i,40)}</span><b>${t}</b><small>${d}</small></button>`).join('')}</div>`},
 hub(k){if(k==='map')this.open('map');else if(k==='workshop'){this.close();OC.Workshop.open()}else if(k==='events'){this.close();OC.Workshop.open('events')}else if(k==='deco')this.open('life','home');else if(k==='codex')this.open('life','codex');else if(k==='story')this.open('life','story');else if(k==='photo'){this.close();OC.Photo.open()}else if(k==='settings')this.settings()},
 /* ================= 角色頁 ================= */
 chars(){const list=OC.S.chars;const cards=list.map(c=>{const a=Sim.get(c.id),m=C.MOODS[c.mood]||C.MOODS.content;const st=c.onIsland===false?'休息中（不在島上）':a?(a.task?a.task.def.t:'閒晃')+' · '+C.LOC[c.loc].t:'';
   return`<article class="cc ${OC.S.activeId===c.id?'act':''}" data-cid="${c.id}"><div class="cc-art">${OC.Rig.avatarHTML(c)}</div><div class="cc-b"><b>${esc(c.name)}</b><small>${esc(Chars.sub(c))}</small>
    <div class="cc-tags"><em style="background:${m.c}">${m.t}</em>${c.health.sick?`<em class="sick">${C.SICK[c.health.sick].t}</em>`:''}${OC.S.petIds.includes(c.id)?'<em class="pet">桌寵</em>':''}${OC.S.activeId===c.id?'<em class="ctl">操控中</em>':''}</div><p>${esc(st)}</p></div>
    <div class="cc-a"><button class="chip ${c.onIsland!==false?'on':''}" data-isl="${c.id}">${c.onIsland!==false?'在島上':'加入小島'}</button><button class="chip ${OC.S.petIds.includes(c.id)?'on':''}" data-pet="${c.id}">桌寵</button></div></article>`}).join('');
  const rels=this.relSummary();
  return`<header class="ph"><span class="ph-i">${ic('users',40)}</span><div><h1>角色</h1><p>${list.length} 位夥伴 · 點卡片看完整檔案</p></div><button class="icon-btn add" data-new>${ic('plus',22)}</button></header><div class="cards">${cards}</div>
   <h3 class="sec">人際關係</h3><div class="rels">${rels||'<p class="empty">夥伴們還不太熟。讓大家一起生活吧！</p>'}</div>`},
 relSummary(){const ch=OC.S.chars;const out=[];for(let i=0;i<ch.length;i++)for(let j=i+1;j<ch.length;j++){const r=OC.S.rel[ch[i].id<ch[j].id?ch[i].id+'|'+ch[j].id:ch[j].id+'|'+ch[i].id];if(!r)continue;const s=OC.Social.status(r);
  out.push(`<button class="rel s-${s}" data-rel="${ch[i].id}|${ch[j].id}"><span class="hav sm">${OC.Rig.avatarHTML(ch[i])}</span><span class="hav sm">${OC.Rig.avatarHTML(ch[j])}</span><b>${OC.Social.LBL[s]}</b><i><u style="width:${(r.f+100)/2}%"></u></i></button>`)}return out.join('')},
 relSheet(a,b){const A=OC.S.chars.find(c=>c.id===a),B=OC.S.chars.find(c=>c.id===b),r=OC.Social.rel(a,b),s=OC.Social.status(r);
  const s2=UI.sheet(`<div class="pair"><span class="hav lg">${OC.Rig.avatarHTML(A)}</span><span class="vs">${ic(s==='broken'?'bolt':'heart',34)}</span><span class="hav lg">${OC.Rig.avatarHTML(B)}</span></div><h2>${esc(A.name)} × ${esc(B.name)}</h2><p class="lead">${OC.Social.LBL[s]}</p>
   <div class="nbs">${[['好感',(r.f+100)/2,'#F08FA5'],['信任',r.trust,'#8CC3A0'],['熟悉',Math.min(100,r.fam*2),'#9BB7E0'],['衝突',r.conf,'#E57B72']].map(([t,v,c])=>`<div class="nb"><span>${t}</span><i><b style="width:${v|0}%;background:${c}"></b></i></div>`).join('')}</div>
   <h3 class="sec">共同回憶</h3>${r.mem.length?r.mem.slice(0,8).map(m=>`<p class="log">${ic(m.val>0?'flower':'rain',18)}<span>${esc(m.text)}</span></p>`).join(''):'<p class="empty">還沒有共同回憶</p>'}
   <h3 class="sec">關係設定</h3><div class="chips">${[['','自然發展'],['family','家人'],['rival','競爭對手']].map(([k,t])=>`<button class="chip ${(r.tag||'')===k?'on':''}" data-tag="${k}">${t}</button>`).join('')}<button class="chip ${r.noRomance?'':'on'}" data-rom>${r.noRomance?'不允許戀愛':'允許戀愛發展'}</button></div>
   ${r.broken||r.conf>30?`<button class="btn primary wide" data-med>介入調解</button>`:''}${r.lovers?`<button class="btn ghost wide" data-unlove>結束戀人關係</button>`:''}`,{});OC.Rig.fillImgs(s2.el);
  s2.el.addEventListener('click',e=>{const t=e.target.closest('button');if(!t)return;if(t.dataset.tag!=null){r.tag=t.dataset.tag||null}else if(t.hasAttribute('data-rom'))r.noRomance=!r.noRomance;else if(t.hasAttribute('data-med')){const res=OC.Social.mediate(a,b);UI.toast(res.ok?'調解成功！':'還需要一點時間…',res.ok?'heart':'info')}else if(t.hasAttribute('data-unlove')){r.lovers=false;Sim.log(null,`${A.name}和${B.name}決定回到朋友關係。`,'cloud')}else return;OC.Store.save();s2.close();this.relSheet(a,b);if(this.cur==='chars')this.render()})},
 /* 角色檔案（查看用） */
 profile(id){const c=OC.S.chars.find(x=>x.id===id);if(!c)return;const tp=Chars.typeName(c);const P=c.profile;
  const field=(k,v)=>v?`<div class="kv"><span>${k}</span><b>${esc(v)}</b></div>`:'';
  const traits=c.traits.map(t=>C.TRAIT[t]).filter(Boolean).map(t=>`<span class="tr" title="${esc(t.d)}">${ic(CAT_IC[t.c]||'star',16)}${esc(t.t)}</span>`).join('');
  const quirks=Object.entries(C.Q).map(([k,q])=>{const o=q.o.find(x=>x[0]===c.quirks[k]);return`<div class="kv"><span>${q.t}</span><b>${o?o[1]:'—'}</b></div>`}).join('')+(c.phrase?`<div class="kv"><span>口癖</span><b>「${esc(c.phrase)}」</b></div>`:'');
  const prefs=C.TASTES.map(([k,t])=>{const v=c.foodPref[k]??0,p=C.PREF.find(x=>x[0]===v);return`<span class="pf" style="--c:${p[2]}">${t}<b>${p[1]}</b></span>`}).join('');
  const seen=Object.entries(c.foodSeen||{}).map(([id,v])=>{const it=C.ITEM[id];return it?`<span class="pf" style="--c:${C.PREF.find(x=>x[0]===v)[2]}">${it.em}${esc(it.name)}</span>`:''}).join('');
  const skills=Object.entries(c.skills).map(([k,v])=>{const N={cooking:'料理',gardening:'園藝',fishing:'釣魚',reading:'閱讀',social:'社交',explore:'探索',fitness:'運動',creativity:'創意'};return`<div class="nb"><span>${N[k]} Lv.${Math.floor(v/20)}</span><i><b style="width:${v%20*5}%;background:#9BB7E0"></b></i></div>`}).join('');
  const rels=OC.S.chars.filter(o=>o.id!==c.id).map(o=>{const r=OC.Social.rel(c.id,o.id);return`<button class="rel s-${OC.Social.status(r)}" data-rel="${c.id}|${o.id}"><span class="hav sm">${OC.Rig.avatarHTML(o)}</span><b>${esc(o.name)}</b><small>${OC.Social.label(r)}</small><i><u style="width:${(r.f+100)/2}%"></u></i></button>`}).join('');
  const mems=c.memories.slice(0,14).map(m=>`<p class="log">${ic(m.val>.3?'flower':m.val<-.3?'rain':'sprout',18)}<span>${esc(m.text)}<small>${new Date(m.t).toLocaleDateString('zh-TW')} · ${esc(C.LOC[m.loc]?.t||'')}</small></span></p>`).join('');
  const story=OC.S.log.filter(l=>l.id===c.id||l.text.includes(c.name)).slice(0,14).map(l=>`<p class="log">${esc(l.text)}<small>${new Date(l.t).toLocaleString('zh-TW',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}</small></p>`).join('');
  const fav=Object.entries(c.counters).filter(([k])=>!k.startsWith('_')).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k,n])=>`${OC.Acts.ACT[k]?.t||k}（${n} 次）`).join('、');
  const placeCnt={};for(const m of c.memories)placeCnt[m.loc]=(placeCnt[m.loc]||0)+1;const favLoc=Object.entries(placeCnt).sort((a,b)=>b[1]-a[1])[0];
  const tabs=[['base','基本'],['pers','性格'],['life','生活'],['rel','關係'],['mem','回憶']];
  const s=UI.sheet(`<div class="pf-h"><div class="pf-art">${OC.Rig.avatarHTML(c)}</div><div><h2>${esc(c.name)}</h2><p class="lead">${esc(tp[0])} · ${esc(tp[1])}</p><div class="row"><button class="btn primary" data-edit>${ic('edit')}編輯</button><button class="btn" data-act>${ic('locate')}操控</button><button class="btn ghost" data-more>${ic('more')}</button></div></div></div>
   <div class="tabs" data-tabs>${tabs.map(([k,t],i)=>`<button data-tab="${k}" class="${i?'':'on'}">${t}</button>`).join('')}</div>
   <div class="tab on" data-p="base">${field('暱稱',P.nick)}${field('生日',P.birthday)}${field('年齡',P.age)}${field('性別',P.gender)}${field('代稱',P.pronoun)}${field('種族',P.species)}${field('身高',P.height)}${(P.fields||[]).map(f=>field(f.k,f.v)).join('')}
    ${P.bio?`<h3 class="sec">介紹</h3><p class="txt">${esc(P.bio)}</p>`:''}${P.story?`<h3 class="sec">背景故事</h3><p class="txt">${esc(P.story)}</p>`:''}
    ${P.likes.length?`<div class="kv"><span>喜歡</span><b>${esc(P.likes.join('、'))}</b></div>`:''}${P.dislikes.length?`<div class="kv"><span>討厭</span><b>${esc(P.dislikes.join('、'))}</b></div>`:''}${P.interests.length?`<div class="kv"><span>興趣</span><b>${esc(P.interests.join('、'))}</b></div>`:''}</div>
   <div class="tab" data-p="pers"><div class="sls">${C.SLIDERS.map(sl=>`<div class="sl"><span>${sl.a}</span><i><b style="left:${c.sliders[sl.k]}%"></b></i><span>${sl.b}</span></div>`).join('')}</div><h3 class="sec">特質</h3><div class="trs">${traits||'<p class="empty">尚未設定</p>'}</div><h3 class="sec">小怪癖</h3>${quirks}</div>
   <div class="tab" data-p="life"><h3 class="sec">生活需求</h3><div class="nbs">${C.NEEDS.map(([k,t,col])=>`<div class="nb"><span>${t}</span><i><b style="width:${c.needs[k]|0}%;background:${col}"></b></i></div>`).join('')}</div>
    ${c.health.sick?`<p class="warn">目前${C.SICK[c.health.sick].t}：${C.SICK[c.health.sick].d}</p>`:''}
    <h3 class="sec">願望</h3>${c.wishes.length?c.wishes.map(w=>`<p class="log">${ic('chat',18)}<span>${esc(Sim.wishText(c,w))}</span></p>`).join(''):'<p class="empty">目前沒有特別的願望</p>'}
    <h3 class="sec">興趣技能</h3><div class="nbs">${skills}</div>
    <h3 class="sec">生活習慣</h3><p class="txt">${fav?'最常做的事：'+esc(fav):'還在探索自己的生活方式。'}${favLoc?`<br>最常待的地方：${esc(C.LOC[favLoc[0]]?.t||'')}`:''}</p>
    <h3 class="sec">飲食喜好</h3><div class="pfs">${prefs}</div>${seen?`<h3 class="sec">吃過的東西</h3><div class="pfs">${seen}</div>`:''}<p class="hint">飲食喜好可在「編輯」中修改。</p></div>
   <div class="tab" data-p="rel"><div class="rels">${rels||'<p class="empty">島上只有自己</p>'}</div></div>
   <div class="tab" data-p="mem"><h3 class="sec">回憶</h3>${mems||'<p class="empty">還沒有回憶</p>'}<h3 class="sec">生活故事</h3>${story||'<p class="empty">故事才剛開始</p>'}</div>`,{full:true});OC.Rig.fillImgs(s.el);
  s.el.addEventListener('click',async e=>{const t=e.target.closest('button');if(!t)return;
   if(t.dataset.tab){s.el.querySelectorAll('[data-tab]').forEach(b=>U.toggle(b,'on',b===t));s.el.querySelectorAll('.tab').forEach(p=>U.toggle(p,'on',p.dataset.p===t.dataset.tab))}
   else if(t.hasAttribute('data-edit')){s.close();OC.Editor.open(c.id)}
   else if(t.hasAttribute('data-act')){s.close();this.close();UI.setActive(c.id,true)}
   else if(t.dataset.rel){const [a,b]=t.dataset.rel.split('|');this.relSheet(a,b)}
   else if(t.hasAttribute('data-more')){UI.menu(`<h2>${esc(c.name)}</h2><div class="am-g"><button data-m="dup">${ic('plus')}<span>複製</span></button><button data-m="exp">${ic('book')}<span>匯出角色</span></button><button data-m="del">${ic('trash')}<span>刪除</span></button></div>`,async m=>{
     if(m==='dup'){const n=JSON.parse(JSON.stringify(c));n.id=U.uid('c');n.name=c.name+' 2';n.memories=[];n.demo=null;OC.S.chars.push(OC.Chars.ensure(n));U.emit('chars');OC.Store.flush();UI.toast('已複製角色');s.close();this.render()}
     else if(m==='exp'){const j=await OC.Store.exportChar(c.id);OC.Pages.download(j,`${c.name}.ocschar.json`)}
     else if(m==='del'){if(OC.S.chars.length<=1){UI.toast('至少要保留一位夥伴','warn');return}if(await UI.confirm({title:`刪除 ${c.name}？`,msg:'角色資料與回憶會被移除，無法復原。建議先匯出備份。',ok:'刪除',danger:true})){OC.S.chars=OC.S.chars.filter(x=>x!==c);OC.S.petIds=OC.S.petIds.filter(x=>x!==c.id);for(const k of Object.keys(OC.S.rel))if(k.split('|').includes(c.id))delete OC.S.rel[k];if(OC.S.activeId===c.id)OC.S.activeId=OC.S.chars[0].id;U.emit('chars');OC.Store.flush();s.close();if(this.cur==='chars')this.render()}}})}})},
 /* ================= 地圖 ================= */
 /* ================= 地圖 ================= */
 map(){const here=OC.R.sc.id;const pos={home:[32,60],house:[20,42],plaza:[60,34],beach:[76,72],forest:[30,18]};
  const who=id=>[...Sim.agents.values()].filter(a=>a.loc===id&&!a.away);const okLoc=id=>OC.S.world.unlocked.includes(id)&&(id!=='house'||(OC.S.world.house&&OC.S.world.house.placed));
  const pins=C.LOCS.map(l=>{const [x,y]=pos[l.id];const w=who(l.id);return`<button class="pin ${here===l.id?'here':''} ${okLoc(l.id)?'':'lock'}" style="left:${x}%;top:${y}%" data-go="${l.id}"><span class="pi">${ic(l.ic,34)}</span><b>${l.t}</b>${w.length?`<span class="pw">${w.slice(0,3).map(a=>`<span class="hav xs">${OC.Rig.avatarHTML(a.c)}</span>`).join('')}</span>`:''}</button>`}).join('');
  const list=C.LOCS.map(l=>{const w=who(l.id);return`<button class="loc-r" data-go="${l.id}"><span class="pi">${ic(l.ic,36)}</span><div><b>${l.t}${here===l.id?'<em class="here-t">你在這裡</em>':''}</b><small>${esc(l.d)}</small><small class="who">${w.length?w.map(a=>esc(a.c.name)+'・'+esc(a.task?a.task.def.t||'忙碌':'閒晃')).join('　'):'目前沒有夥伴'}</small></div></button>`}).join('');
  return`<header class="ph"><span class="ph-i">${ic('map',40)}</span><div><h1>世界地圖</h1><p>點地點即可前往；夥伴們也會自己到處去</p></div></header><div class="wmap"><svg viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M32 60 Q46 46 60 34 M60 34 Q70 54 76 72 M32 60 Q28 38 30 18 M32 60 L20 42" fill="none" stroke="#FFF6E0" stroke-width="1.4" stroke-dasharray="2 2"/></svg>${pins}</div><div class="locs">${list}</div>`},
 goWith(a){UI.menu(`<h2 class="dl-t">帶 ${esc(a.c.name)} 去哪裡？</h2><div class="am-g">${C.LOCS.filter(l=>l.id!=='house'||(OC.S.world.house&&OC.S.world.house.placed)).map(l=>`<button data-m="${l.id}">${ic(l.ic,34)}<span>${l.t}</span></button>`).join('')}</div>`,id=>{Sim.sendTo(a,id);a.say(`走吧，去${C.LOC[id].t}！`);if(id!==OC.R.sc.id)setTimeout(()=>OC.World.go(id,{focus:a}),1400)})},
 /* ================= 小島日常 ================= */
 life(){const t=this.tab||'quest';const tabs=[['quest','任務'],['codex','圖鑑'],['story','生活故事'],['home','家與佈置']];let b='';
  if(t==='quest'){const Q=OC.S.quests;const all=(Q.list||[]).length&&Q.list.every(q=>q.done);
   b=`<div class="streak">${ic('star',22)}連續生活 <b>${Q.streak||1}</b> 天${all?'　今日任務全部完成！':''}</div>`+(Q.list||[]).map((q,i)=>`<div class="qrow ${q.done?'done':''}"><span class="q-i">${ic(q.p>=q.n?'check':'quest',28)}</span><div><b>${esc(q.t)}</b><i><u style="width:${Math.min(100,q.p/q.n*100)}%"></u></i><small>${Math.min(q.p,q.n)} / ${q.n}</small></div><button class="btn sm ${q.p>=q.n&&!q.done?'primary':'ghost'}" data-claim="${i}" ${q.p>=q.n&&!q.done?'':'disabled'}>${q.done?'已領取':ic('coin',16)+' '+q.r}</button></div>`).join('')+`<p class="hint">完成全部每日任務可額外獲得 5 星鑽。</p>`}
  else if(t==='codex'){const groups=[['fish','魚類'],['bug','昆蟲'],['col','收藏'],['food','食物'],['drink','飲料'],['furn','家具']];const own=OC.S.codex;let got=0,all=0;
   b=groups.map(([k,n])=>{const L=C.ITEMS.filter(i=>i.cat===k);all+=L.length;return`<h3 class="sec">${n}</h3><div class="cx">${L.map(i=>{const o=own[i.id];if(o)got++;return`<div class="cxi ${o?'':'no'}" title="${esc(i.name)}">${o?OC.Icons.item(i,36):ic('info',30)}<small>${o?esc(i.name):'未發現'}</small></div>`}).join('')}</div>`}).join('');b=`<div class="streak">${ic('book',22)}已發現 <b>${got}</b> / ${all}</div>`+b}
  else if(t==='story'){b=OC.S.log.slice(0,80).map(l=>`<p class="log">${ic('sprout',18)}<span>${esc(l.text)}<small>${UI.ago(l.t)}</small></span></p>`).join('')||'<p class="empty">故事才剛開始</p>'}
  else if(t==='home')b=OC.Deco.panel();
  return`<header class="ph"><span class="ph-i">${ic('quest',40)}</span><div><h1>小島日常</h1><p>${ic('coin',16)} ${OC.S.coins.toLocaleString()}　${ic('gem',16)} ${OC.S.gems||0}</p></div></header><div class="tabs">${tabs.map(([k,n])=>`<button data-ltab="${k}" class="${t===k?'on':''}">${n}</button>`).join('')}</div><div class="lb">${b}</div>`},
 timeWeather(){const W=Env.WX;const off=OC.S.world.timeOffset||0;const s=UI.sheet(`<p class="lead">${Env.label().date} ${Env.label().time}</p>
  <h3 class="sec">時間</h3><div class="chips">${[['real','現在（實際時間）',0],['m','清晨 6:30',6.5],['d','中午 12:00',12],['e','黃昏 18:00',18],['n','夜晚 21:00',21]].map(([k,t,h])=>`<button class="chip" data-h="${h}">${t}</button>`).join('')}</div>
  <h3 class="sec">天氣</h3><div class="chips"><button class="chip ${!OC.S.world.weather?'on':''}" data-w="">自動</button>${Object.entries(W).map(([k,v])=>`<button class="chip ${OC.S.world.weather===k?'on':''}" data-w="${k}">${ic(v.ic,18)} ${v.t}</button>`).join('')}</div><p class="hint">調整後畫面會平順過渡，夥伴的作息也會跟著改變。</p>`,{title:'時間與天氣',icon:Env.WX[Env.wid].ic});
  s.el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.h!=null){const h=+b.dataset.h;if(!h)OC.S.world.timeOffset=0;else{const d=new Date();const cur=d.getHours()+d.getMinutes()/60;OC.S.world.timeOffset=Math.round((h-cur)*3600e3)}}
   else if(b.dataset.w!=null){OC.S.world.weather=b.dataset.w||null}else return;Env._k=-1;Env.update();OC.R.skey='';UI.hudTime(true);OC.Store.save();s.close();this.timeWeather()})},
 /* ================= 設定 ================= */
 settings(){const st=OC.S.settings,cu=st.custom;const modes=[['quality','高畫質','完整光影、粒子、環境動態'],['balanced','平衡','一般手機推薦'],['battery','省電','30 FPS、降低特效與解析度'],['custom','自訂','自己調整每一項']];
  const sw=(k,t,d)=>`<label class="sw"><span><b>${t}</b><small>${d||''}</small></span><input type="checkbox" data-s="${k}" ${st[k]!==false?'checked':''}><i></i></label>`;
  const s=UI.sheet(`
   <h3 class="sec">畫質與效能</h3><div class="modes">${modes.map(([k,t,d])=>`<button class="mode ${st.perf===k?'on':''}" data-perf="${k}"><b>${t}</b><small>${d}</small></button>`).join('')}</div>
   <div class="custom" ${st.perf==='custom'?'':'hidden'}>
    ${[['fps','FPS 上限',[[30,'30'],[60,'60']]],['scale','渲染解析度',[[1,'低'],[1.5,'中'],[2,'高'],[3,'最高']]],['shadows','地面細節',[[0,'關'],[1,'開'],[2,'高']]],['particles','粒子數量',[[0,'無'],[.3,'少'],[.6,'中'],[1,'多']]],['ambient','環境動畫',[[0,'關'],[1,'開'],[2,'豐富']]],['cloudShadow','雲影',[[0,'關'],[1,'開']]],['maxChars','同時顯示角色',[[4,'4'],[6,'6'],[10,'10'],[16,'16']]]].map(([k,t,o])=>`<div class="opt"><span>${t}</span><div class="seg">${o.map(([v,n])=>`<button data-c="${k}" data-v="${v}" class="${cu[k]==v?'on':''}">${n}</button>`).join('')}</div></div>`).join('')}</div>
   <div class="opt"><span>減少動態效果</span><div class="seg">${[['system','跟隨系統'],['full','完整'],['reduce','減少']].map(([v,n])=>`<button data-motion="${v}" class="${st.motion===v?'on':''}">${n}</button>`).join('')}</div></div>
   <div class="opt"><span>外觀主題</span><div class="seg">${[['system','跟隨系統'],['light','淺色'],['dark','深色']].map(([v,n])=>`<button data-theme="${v}" class="${st.theme===v?'on':''}">${n}</button>`).join('')}</div></div>
   <h3 class="sec">生活模擬</h3>${sw('autoSocial','夥伴自主社交','自己聊天、玩耍、拜訪')}${sw('negEvents','負面經歷','吵架、生病、心情低落等（重大變化仍會詢問你）')}${sw('romance','戀愛發展','成為戀人前一定會先問你')}
   <h3 class="sec">畫面</h3>${sw('bubbles','對話泡泡')}${sw('names','名字標籤')}${sw('haptics','觸覺回饋')}
   <div class="opt"><span>互動演出</span><div class="seg">${[['full','電影式'],['short','簡短']].map(([v,n])=>`<button data-cine="${v}" class="${(st.cine||'full')===v?'on':''}">${n}</button>`).join('')}</div></div>
   <h3 class="sec">Android 桌寵</h3><button class="btn wide" data-petset>${ic('paw',20)}桌寵設定</button>
   <h3 class="sec">資料</h3><div class="col"><button class="btn" data-exp>匯出完整備份（含圖片）</button><button class="btn" data-imp>匯入備份</button>${OC.Store.hasLegacy()?'<button class="btn" data-legacy>重新從 3.2 舊版匯入夥伴</button>':''}<button class="btn" data-intro>重看開場動畫</button><button class="btn" data-tut>重看新手引導</button><button class="btn ghost danger-t" data-reset>重新開始遊戲</button></div>
   <p class="hint ver">OC Shimeji v4.1 · FPS ${OC.Loop.fps}</p>`,{full:true,title:'設定',icon:'gear'});
  s.el.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;const re=()=>{s.close();this.settings()};
   if(b.dataset.perf){st.perf=b.dataset.perf;OC.R.resize();OC.R.skey='';OC.Store.save();re()}
   else if(b.dataset.c){cu[b.dataset.c]=+b.dataset.v;OC.R.resize();OC.R.skey='';OC.Store.save();re()}
   else if(b.dataset.motion){st.motion=b.dataset.motion;applyTheme();OC.Store.save();re()}
   else if(b.dataset.theme){st.theme=b.dataset.theme;applyTheme();OC.Store.save();re()}
   else if(b.hasAttribute('data-exp')){this.download(await OC.Store.exportAll(),`oc-shimeji-backup-${U.dayKey()}.json`)}
   else if(b.hasAttribute('data-imp')){const t=await this.pickFile('.json,application/json');if(t)try{await OC.Store.importAll(t)}catch(err){UI.toast(err.message,'warn')}}
   else if(b.hasAttribute('data-legacy')){const n=await OC.Store.importLegacy();Sim.sync();UI.toast(`匯入了 ${n} 位夥伴（已存在的不重複）`,'check')}
   else if(b.hasAttribute('data-intro')){s.close();OC.Intro.replay()}
   else if(b.hasAttribute('data-tut')){s.close();OC.Tutorial.start()}
   else if(b.hasAttribute('data-petset')){s.close();OC.PetUI.open()}
   else if(b.dataset.cine){st.cine=b.dataset.cine;OC.Store.save();re()}
   else if(b.hasAttribute('data-reset')){if(await UI.confirm({title:'重新開始？',msg:'目前的島嶼、夥伴與進度都會清除。建議先匯出備份。',ok:'清除並重新開始',danger:true}))OC.Store.reset()}});
  s.el.addEventListener('change',e=>{const k=e.target.dataset.s;if(!k)return;st[k]=e.target.checked;OC.Store.save()})},
 download(text,name){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'application/json'}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);if(OC.Native.has())OC.Native.saveFile(name,text);UI.toast('已匯出','check')},
 pickFile(accept,asData){return new Promise(res=>{const i=$('#fileIn');i.accept=accept;i.value='';i.onchange=()=>{const f=i.files[0];if(!f){res(null);return}const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>res(null);asData?r.readAsDataURL(f):r.readAsText(f)};i.click()})},
 /* ================= 事件綁定 ================= */
 bind(pg){pg.onclick=async e=>{const t=e.target.closest('button,[data-cid]');if(!t)return;U.buzz(5);
  if(t.hasAttribute('data-close')){this.close();return}
  if(this.cur==='bag'&&OC.Bag.click(t))return;if(this.cur==='shop'&&OC.ShopUI.click(t))return;if(this.cur==='life'&&this.tab==='home'&&OC.Deco.click(t))return;
  if(t.dataset.hub){this.hub(t.dataset.hub);return}
  if(t.dataset.isl){e.stopPropagation();const c=OC.S.chars.find(x=>x.id===t.dataset.isl);c.onIsland=c.onIsland===false;if(c.onIsland){c.loc='home';c.x=null;Sim.sync();UI.toast(`${c.name}回到小島了`,'heart')}else{if([...Sim.agents.keys()].length<=1){c.onIsland=true;UI.toast('島上至少要有一位夥伴','warn');return}Sim.sync()}OC.Store.save();this.render();return}
  if(t.dataset.pet){e.stopPropagation();const id=t.dataset.pet;const P=OC.S.petIds;if(P.includes(id))OC.S.petIds=P.filter(x=>x!==id);else{if(P.length>=(OC.S.settings.petMax||2))P.shift();P.push(id)}OC.Store.flush();OC.Native.syncPets(true);this.render();if(!OC.Native.has())UI.toast('已設為桌寵。安裝 Android 版即可在手機桌面上顯示','info');return}
  if(t.dataset.cid){this.profile(t.dataset.cid);return}
  if(t.hasAttribute('data-new')){OC.Editor.create();return}
  if(t.dataset.rel){const [a,b]=t.dataset.rel.split('|');this.relSheet(a,b);return}
  if(t.dataset.go){const id=t.dataset.go;if(t.classList.contains('lock')){UI.toast(id==='house'?'先在家園放一棟房子':'尚未解鎖','info');return}this.close();if(id!==OC.R.sc.id)OC.World.go(id);return}
  if(t.dataset.ltab){this.tab=t.dataset.ltab;this.render();return}
  if(t.dataset.claim!=null){const q=OC.S.quests.list[+t.dataset.claim];if(OC.Quests.claim(q)){UI.celebrate(null,`+${q.r} 星幣`,'任務完成','coin');this.render()}return}}}};
function $$(s,r=document){return[...r.querySelectorAll(s)]}
function applyTheme(){const st=OC.S.settings,r=document.documentElement;const d=st.theme==='dark'||(st.theme==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);r.dataset.theme=d?'dark':'light';r.dataset.motion=OC.Store.perf().reduce?'reduce':'full';const m=document.querySelector('meta[name=theme-color]');if(m)m.content=d?'#1F2630':'#F6F0E4'}
Pages.applyTheme=applyTheme;
OC.Pages=Pages;
})(window.OC);
