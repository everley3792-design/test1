/* OC Shimeji v4.1 · 背包：快捷背包（首頁，可拖曳給角色）＋完整背包（分類、搜尋、詳細資訊、物品記憶） */
(function(OC){'use strict';
const {U,Content:C,Items,Icons}=OC;const {$,esc}=U;
const CATS=[['all','全部'],['food','食物'],['drink','飲料'],['care','照顧',['medicine','care']],['toy','玩具'],['gift','禮物'],['col','收藏',['col','fish','bug']],['seed','種子'],['furn','家具',['furn','build']],['custom','創作',null,true]];
const TRAY=[['fav','常用'],['food','食物',['food','drink']],['care','照顧',['medicine','care','toy']],['gift','禮物',['gift','col','fish','bug','custom']]];
const CAT_BG={food:'#FFE8D6',drink:'#DDF0FB',medicine:'#E4F4DA',care:'#E7F0FF',toy:'#FFE3EC',gift:'#FCE4EF',col:'#E2F6F2',fish:'#DDEFFB',bug:'#EEF5DA',seed:'#EAF4DC',furn:'#F4EADB',build:'#F4EADB',custom:'#EFE8FF'};
const get=id=>C.ITEM[id]||(OC.Creations&&OC.Creations.item(id));
const Bag={trayOpen:false,target:null,
 initTray(){const el=U.el(`<div class="tray" id="tray" hidden><div class="tr-tabs" id="trTabs"></div><div class="tr-list" id="trList"></div><button class="tr-all" id="trAll">${Icons.svg('bag',22)}<small>全部</small></button></div>`);document.getElementById('app').appendChild(el);
  $('#trTabs').onclick=e=>{const b=e.target.closest('[data-t]');if(!b)return;OC.S.ui.bagTab=b.dataset.t;this.renderTray()};$('#trAll').onclick=()=>{this.closeTray();OC.Pages.open('bag')};
  $('#trList').addEventListener('pointerdown',e=>this.dragStart(e));U.on('inv',()=>{if(this.trayOpen)this.renderTray();if(OC.Pages.cur==='bag')OC.Pages.render()})},
 toggleTray(){this.trayOpen?this.closeTray():this.openTray()},
 openTray(target){this.target=target||null;this.trayOpen=true;const t=$('#tray');t.hidden=false;this.renderTray();requestAnimationFrame(()=>t.classList.add('open'));U.toggle($('#hTray'),'on',true)},
 closeTray(){if(!this.trayOpen)return;this.trayOpen=false;const t=$('#tray');t.classList.remove('open');setTimeout(()=>{if(!this.trayOpen)t.hidden=true},220);U.toggle($('#hTray'),'on',false)},
 list(cats,custom){return Object.entries(OC.S.inv).filter(([id,q])=>q>0&&get(id)).map(([id,q])=>Object.assign({q},get(id))).filter(i=>custom?i.custom:(!cats||cats.includes(i.cat)))},
 renderTray(){const S=OC.S.ui;const tab=S.bagTab||'fav';U.setHTML($('#trTabs'),TRAY.map(([k,t])=>`<button data-t="${k}" class="${tab===k?'on':''}">${t}</button>`).join(''));
  let L;if(tab==='fav'){const pins=S.pins||[];L=this.list(['food','drink','medicine','care','toy','gift','custom']).sort((a,b)=>(pins.includes(b.id)-pins.includes(a.id))||(b.q-a.q)).slice(0,14)}else L=this.list(TRAY.find(t=>t[0]===tab)[2]);
  U.setHTML($('#trList'),L.length?L.map(i=>`<button class="ti ${(S.pins||[]).includes(i.id)?'pin':''}" data-id="${i.id}" style="--bg:${CAT_BG[i.cat]||'#F4EEE6'}">${Icons.item(i,34)}<b>${i.q}</b></button>`).join(''):'<p class="tr-e">這裡空空的・去商店逛逛吧</p>')},
 /* 拖曳物品給角色；點一下直接給目前的夥伴；長按加入／移除常用 */
 dragStart(e){const b=e.target.closest('.ti');if(!b)return;e.preventDefault();const id=b.dataset.id,it=get(id);const g=$('#dghost');let over=null,moved=false,lp=false;const sx=e.clientX,sy=e.clientY;
  const lpT=setTimeout(()=>{if(moved)return;lp=true;const P=OC.S.ui.pins=OC.S.ui.pins||[];const i=P.indexOf(id);if(i>=0)P.splice(i,1);else P.push(id);U.buzz(15);OC.UI.toast(i>=0?'已從常用移除':'已加入常用','check');this.renderTray();OC.Store.save()},520);
  const mv=ev=>{if(!moved&&Math.hypot(ev.clientX-sx,ev.clientY-sy)>8){moved=true;clearTimeout(lpT);g.innerHTML=Icons.item(it,48);g.classList.add('on')}if(!moved)return;
   g.style.transform=`translate(${ev.clientX-26}px,${ev.clientY-56}px) scale(1.1)`;const r=$('#world').getBoundingClientRect();const a=OC.Input.hitActor(ev.clientX-r.left,ev.clientY-r.top,24);if(over&&over!==a)over.focus=false;over=a;if(a){a.focus=true;a.nameT=1;a.lookAt=0}U.toggle(g,'hot',!!a)};
  const up=()=>{clearTimeout(lpT);window.removeEventListener('pointermove',mv);window.removeEventListener('pointerup',up);g.classList.remove('on','hot');if(lp)return;
   if(moved){if(over){over.focus=false;if(OC.Play.give(over,id)){U.buzz(12);this.closeTray()}}}
   else{const a=this.target&&this.target.loc===OC.R.sc.id?this.target:OC.Sim.active();if(a&&a.loc===OC.R.sc.id){if(OC.Play.give(a,id)){U.buzz(12);this.closeTray()}}else OC.UI.toast('拖到夥伴身上就能使用','info')}};
  window.addEventListener('pointermove',mv);window.addEventListener('pointerup',up)},
 frame(){},
 /* ================= 完整背包頁 ================= */
 page(){const S=OC.S.ui;const cat=this.cat||'all',q=(this.q||'').trim();const def=CATS.find(c=>c[0]===cat)||CATS[0];
  let L=this.list(cat==='all'?null:(def[2]||[cat]),def[3]);if(q)L=L.filter(i=>i.name.includes(q)||(i.tags||[]).some(t=>(C.TASTES.find(x=>x[0]===t)||[])[1]===q));
  const total=Object.values(OC.S.inv).reduce((a,b)=>a+b,0);
  return`<header class="ph"><span class="ph-i">${Icons.svg('bag',40)}</span><div><h1>背包</h1><p>${total} 件物品 · ${Icons.svg('coin',16)} ${OC.S.coins.toLocaleString()}</p></div></header>
   <label class="search">${Icons.svg('search',18)}<input id="bagQ" placeholder="搜尋物品或口味（例如：甜）" value="${esc(q)}"></label>
   <div class="chips sc">${CATS.map(([k,t])=>`<button class="chip ${cat===k?'on':''}" data-bc="${k}">${t}</button>`).join('')}</div>
   <div class="bag-g">${L.length?L.map(i=>`<button class="bi" data-bi="${i.id}"><span class="bi-ic" style="--bg:${CAT_BG[i.cat]||'#F4EEE6'}">${Icons.item(i,44)}</span><b>${esc(i.name)}</b><em>×${i.q}</em>${(S.pins||[]).includes(i.id)?`<i class="bi-pin">${Icons.svg('star',14)}</i>`:''}</button>`).join(''):'<p class="empty">沒有符合的物品</p>'}</div>`},
 bindPage(pg){const qi=$('#bagQ',pg);if(qi){qi.oninput=()=>{this.q=qi.value;clearTimeout(this._qt);this._qt=setTimeout(()=>{const pos=qi.selectionStart;OC.Pages.render();const n=$('#bagQ');n.focus();n.setSelectionRange(pos,pos)},250)}}},
 click(t){if(t.dataset.bc){this.cat=t.dataset.bc;OC.Pages.render();return true}if(t.dataset.bi){this.detail(t.dataset.bi);return true}return false},
 /* 物品詳細：效果、口味、誰喜歡（物品記憶）、使用／送給／常用／賣出／擺放 */
 detail(id){const it=get(id);if(!it)return;const q=Items.qty(id);const pins=OC.S.ui.pins=OC.S.ui.pins||[];
  const tags=(it.tags||[]).map(t=>(C.TASTES.find(x=>x[0]===t)||[])[1]).filter(Boolean);const FX={hunger:'飽足',energy:'精力',fun:'娛樂',social:'社交',hygiene:'清潔',comfort:'舒適'};
  const fx=Object.entries(it.fx||{}).map(([k,v])=>`<div class="nb"><span>${FX[k]||k} ${v>0?'+':''}${v}</span><i><b style="width:${Math.min(100,Math.abs(v))}%;background:${v>0?'#8CC3A0':'#E57B72'}"></b></i></div>`).join('');
  const mem=OC.S.chars.map(c=>{const v=(c.foodSeen||{})[id];if(v==null)return'';const P=C.PREF.find(p=>p[0]===v);return`<span class="pf" style="--c:${P[2]}"><span class="hav xs">${OC.Rig.avatarHTML(c)}</span>${esc(c.name)}<b>${P[1]}</b></span>`}).join('');
  const usable=['food','drink','medicine','care','toy','gift','col','fish','bug','custom'].includes(it.cat);const place=it.cat==='furn'||it.cat==='build';
  const s=OC.UI.sheet(`<div class="it-h"><span class="it-big" style="--bg:${CAT_BG[it.cat]||'#F4EEE6'}">${Icons.item(it,84)}</span><div><h2 class="dl-t">${esc(it.name)}</h2><p><em class="cat">${C.CATNAME[it.cat]||'創作'}</em> 擁有 ${q}</p>${tags.length?`<div class="trs">${tags.map(t=>`<span class="tr">${t}</span>`).join('')}</div>`:''}</div></div>
   ${it.desc?`<p class="lead">${esc(it.desc)}</p>`:''}${fx?`<h3 class="sec">效果</h3><div class="nbs">${fx}</div>`:''}${mem?`<h3 class="sec">夥伴的感想</h3><div class="pfs">${mem}</div>`:''}
   <div class="it-act">${usable?`<button class="btn primary" data-a="use">${Icons.svg('gift',20)}給夥伴</button>`:''}${place?`<button class="btn primary" data-a="place">${Icons.svg('hammer',20)}擺放</button>`:''}
    <button class="btn" data-a="pin">${Icons.svg('star',20)}${pins.includes(id)?'移出常用':'加入常用'}</button>${it.sell?`<button class="btn ghost" data-a="sell">${Icons.svg('coin',18)}賣出 ${it.sell}</button>`:''}</div>`,{cls:'it-s'});OC.Rig.fillImgs(s.el);
  s.el.addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(!b)return;const a=b.dataset.a;
   if(a==='pin'){const i=pins.indexOf(id);if(i>=0)pins.splice(i,1);else pins.push(id);OC.Store.save();s.close();this.detail(id)}
   else if(a==='sell'){if(OC.Shop.sell(id)){OC.UI.toast(`賣出 +${it.sell} 星幣`,'coin');s.close();if(Items.qty(id))this.detail(id);OC.Pages.render()}}
   else if(a==='place'){s.close();OC.Pages.close();OC.Deco.placeItem(id)}
   else if(a==='use'){s.close();this.chooseChar(ch=>{OC.Pages.close();setTimeout(()=>{const ag=OC.Sim.get(ch.id);if(!ag)return;if(ag.loc!==OC.R.sc.id)OC.World.go(ag.loc,{focus:ag});setTimeout(()=>OC.Play.give(ag,id),ag.loc!==OC.R.sc.id?700:200)},250)})}})},
 chooseChar(on){const L=[...OC.Sim.agents.values()];if(L.length===1){on(L[0].c);return}
  OC.UI.menu(`<h2 class="dl-t">要給誰？</h2><div class="am-g">${L.map(a=>`<button data-m="${a.id}"><span class="hav">${OC.Rig.avatarHTML(a.c)}</span><span>${esc(a.c.name)}</span></button>`).join('')}</div>`,id=>on(OC.S.chars.find(c=>c.id===id)))}};
Bag.CAT_BG=CAT_BG;
OC.Bag=Bag;
})(window.OC);
