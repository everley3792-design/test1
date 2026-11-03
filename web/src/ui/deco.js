/* OC Shimeji v4.1 · 佈置（房子、屋內家具、小島建築）、拍照模式、桌寵設定 */
(function(OC){'use strict';
const {U,Content:C,Icons,Items}=OC;const {$,esc}=U;const ic=(n,s=22)=>Icons.svg(n,s);
const furnIt=k=>C.ITEMS.find(i=>i.furn===k)||(OC.Creations&&OC.Creations.item(k));
const Deco={
 panel(){const W=OC.S.world,H=W.house;const furn=W.houseFurn||[],builds=W.builds||[];const inv=OC.Bag.list(['furn','build']);
  return`<div class="qrow"><span class="q-i">${ic('house',30)}</span><div><b>${H&&H.placed?esc(C.HOUSES.find(h=>h.id===H.style)?.t||''):'還沒有房子'}</b><small>${H&&H.placed?'在家園小島上':'選一棟房子放在小島上吧'}</small></div><button class="btn sm primary" data-house>${H&&H.placed?'搬家／換房子':'選擇房子'}</button></div>
   ${inv.length?`<h3 class="sec">背包裡可以擺放的</h3><div class="cx">${inv.map(i=>`<button class="cxi" data-dplace="${i.id}">${Icons.item(i,36)}<small>${esc(i.name)} ×${i.q}</small></button>`).join('')}</div>`:''}
   <h3 class="sec">屋內家具（${furn.length}）</h3><div class="cx">${furn.map(f=>{const it=furnIt(f.k);return`<button class="cxi" data-fmove="${f.id}">${it?Icons.item(it,36):ic('chair',36)}<small>${it?esc(it.name):f.k}</small></button>`}).join('')||'<p class="empty">屋內空空的</p>'}</div>
   <h3 class="sec">小島上的建築（${builds.length}）</h3><div class="cx">${builds.map(b=>{const it=OC.Creations.item(b.cid);return`<button class="cxi" data-bmove="${b.id}">${it?Icons.item(it,36):ic('house',36)}<small>${it?esc(it.name):'建築'}</small></button>`}).join('')||'<p class="empty">可以在工坊設計建築，再到創作市集購買</p>'}</div>
   <p class="hint">點已擺放的東西可以拖曳移動或收回背包。家具店與創作市集有更多家具。</p>`},
 click(t){const d=t.dataset;if(t.hasAttribute('data-house')){OC.Pages.close();OC.Intro.houseOnly(true);return true}
  if(d.dplace){OC.Pages.close();this.placeItem(d.dplace);return true}
  if(d.fmove){OC.Pages.close();OC.World.go('house');setTimeout(()=>this.move('furn',d.fmove),500);return true}
  if(d.bmove){OC.Pages.close();OC.World.go('home');setTimeout(()=>this.move('build',d.bmove),500);return true}return false},
 placeItem(id){const it=OC.Shop.item(id);if(!it)return;if(!Items.take(id))return;const W=OC.S.world;
  if(it.cat==='furn'){if(!(W.house&&W.house.placed)){Items.add(id,1);OC.UI.toast('先在家園放一棟房子','info');return}const F=W.houseFurn||(W.houseFurn=[]);const k=it.furn||it.furnCr||id;
   let p={x:0,z:.4};for(let i=0;i<40;i++){const q={x:U.rnd(-3,3),z:U.rnd(-1.8,1.8)};if(!F.some(f=>Math.hypot(f.x-q.x,f.z-q.z)<1.4)){p=q;break}}
   const f={id:U.uid('f'),k,x:+p.x.toFixed(2),z:+p.z.toFixed(2)};F.push(f);OC.Scenes.syncFurn();OC.Store.flush();const go=()=>this.move('furn',f.id);if(OC.R.sc.id!=='house'){OC.World.go('house');setTimeout(go,500)}else go()}
  else if(it.cat==='build'){const B=W.builds||(W.builds=[]);const c=OC.R.cam;const b={id:U.uid('b'),cid:it.buildCr||id,x:+(OC.R.sc.id==='home'?c.tx:2).toFixed(2),z:+(OC.R.sc.id==='home'?c.tz:2).toFixed(2)};B.push(b);OC.Scenes.syncBuilds();OC.Store.flush();const go=()=>this.move('build',b.id);if(OC.R.sc.id!=='home'){OC.World.go('home');setTimeout(go,500)}else go()}},
 /* 拖曳擺放（家具在屋內、建築在小島） */
 move(kind,id){const W=OC.S.world;const L=kind==='furn'?W.houseFurn:W.builds;const F=(L||[]).find(f=>f.id===id);if(!F)return;const cam=OC.R.cam;const el=$('#intro');el.hidden=false;el.className='intro place';
  const it=kind==='furn'?furnIt(F.k):OC.Creations.item(F.cid);el.innerHTML=`<div class="pl-tip"><b>拖曳${esc(it?it.name:'')}到新位置</b><small>點完成即可儲存</small></div><div class="pl-bar"><button class="btn ghost" data-store>${ic('bag',18)}收回背包</button><button class="btn primary" data-ok>${ic('check',18)}完成</button></div>`;
  const sync=()=>{kind==='furn'?OC.Scenes.syncFurn():OC.Scenes.syncBuilds();OC.R.invalidate()};let drag=null;
  OC.UI.placing={down:p=>{drag={w0:cam.unproject(p.x,p.y),x:F.x,z:F.z}},move:p=>{if(!drag)return;const w=cam.unproject(p.x,p.y);const b=kind==='furn'?[-3.4,-2.3,3.4,2.2]:OC.R.sc.bounds;F.x=+U.clamp(drag.x+w.x-drag.w0.x,b[0],b[2]).toFixed(2);F.z=+U.clamp(drag.z+w.z-drag.w0.z,b[1],b[3]).toFixed(2);sync()},up:()=>{drag=null;U.buzz(5)},cancel:()=>{done()}};
  OC.Cam.follow=false;OC.UI.followChanged();
  const done=()=>{OC.UI.placing=null;OC.Store.flush();el.className='intro';el.hidden=true;el.innerHTML=''};
  el.onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.hasAttribute('data-store')){const idx=L.indexOf(F);L.splice(idx,1);Items.add(kind==='furn'?(C.ITEMS.find(i=>i.furn===F.k)||{id:F.k}).id:F.cid,1);sync();OC.UI.toast('已收回背包','check')}done()}}};

/* ================= 拍照模式 ================= */
const FILTERS=[['none','自然',''],['warm','暖陽','sepia(.25) saturate(1.2) brightness(1.04)'],['film','底片','contrast(1.08) saturate(.85) sepia(.15)'],['cool','清晨','hue-rotate(-10deg) saturate(1.1) brightness(1.05)'],['mono','黑白','grayscale(1) contrast(1.1)']];
const Photo={on:false,f:'none',
 open(){if(this.on)return;this.on=true;document.body.classList.add('photo');OC.UI.closeFloating();const el=U.el(`<div class="photo-ui" id="photoUi"><div class="ph-frame"></div><div class="ph-top"><button class="rb" data-pc>${ic('close',20)}</button><b>拍照模式</b><button class="rb" data-pn>${ic('users',22)}</button></div>
   <div class="ph-bot"><div class="chips sc">${FILTERS.map(([k,t])=>`<button class="chip ${k===this.f?'on':''}" data-pf="${k}">${t}</button>`).join('')}</div><button class="shutter" data-shot aria-label="拍照"><i></i></button></div><div class="ph-flash"></div></div>`);
  document.getElementById('app').appendChild(el);this.el=el;this.applyF();this.names=OC.S.settings.names;
  el.onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.hasAttribute('data-pc'))this.close();else if(b.dataset.pf){this.f=b.dataset.pf;el.querySelectorAll('[data-pf]').forEach(x=>U.toggle(x,'on',x===b));this.applyF()}else if(b.hasAttribute('data-pn')){OC.S.settings.names=!OC.S.settings.names;U.toggle(b,'on',!OC.S.settings.names)}else if(b.hasAttribute('data-shot'))this.shot()}},
 applyF(){$('#world').style.filter=(FILTERS.find(f=>f[0]===this.f)||[])[2]||''},
 shot(){U.buzz(30);const fl=$('.ph-flash',this.el);fl.classList.remove('go');void fl.offsetWidth;fl.classList.add('go');
  const src=$('#world');const c=document.createElement('canvas');c.width=src.width;c.height=src.height;const g=c.getContext('2d');g.filter=(FILTERS.find(f=>f[0]===this.f)||[])[2]||'none';g.drawImage(src,0,0);g.filter='none';
  const k=c.width/src.getBoundingClientRect().width;g.fillStyle='rgba(255,255,255,.9)';g.font=`700 ${13*k}px "Nunito","Noto Sans TC",sans-serif`;g.textAlign='right';g.fillText('OC Shimeji · '+OC.Env.label().date,c.width-14*k,c.height-16*k);
  const url=c.toDataURL('image/jpeg',.9);const s=OC.UI.dialog(`<img class="ph-prev" src="${url}" alt=""><div class="row end"><button class="btn ghost" data-x>不要了</button><button class="btn primary" data-save>${ic('export',18)}儲存照片</button></div>`);
  s.el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.hasAttribute('data-save')){const name=`oc-shimeji-${Date.now()}.jpg`;if(OC.Native.has())OC.Native.call('saveImage',name,url);else{const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove()}OC.UI.toast('照片已儲存','check');OC.Items.xp(3)}s.close()})},
 close(){if(!this.on)return;this.on=false;OC.S.settings.names=this.names;document.body.classList.remove('photo');$('#world').style.filter='';this.el.remove()}};

/* ================= 桌寵設定 ================= */
const PetUI={
 cfg(){return OC.S.settings.pet=Object.assign({size:100,battery:false,climb:true,roam:true,appAware:false,talk:'normal',max:2},OC.S.settings.pet||{})},
 open(){const P=this.cfg();const has=OC.Native.has();const ov=has&&OC.Native.overlayAllowed(),ua=has&&OC.Native.call('hasUsageAccess')==='true';
  const body=()=>`${has?'':`<p class="warn">系統懸浮桌寵需要安裝 Android App。你仍可先在這裡選好夥伴與設定。</p>`}
   <h3 class="sec">要出現在桌面的夥伴（最多 ${P.max} 位）</h3><div class="am-g">${OC.S.chars.map(c=>`<button class="${OC.S.petIds.includes(c.id)?'on':''}" data-pp="${c.id}"><span class="hav">${OC.Rig.avatarHTML(c)}</span><span>${esc(c.name)}</span></button>`).join('')}</div>
   <div class="opt"><span>大小 ${P.size}%</span><input type="range" min="60" max="160" step="5" value="${P.size}" data-ps></div>
   <div class="opt"><span>說話頻率</span><div class="seg">${[['quiet','安靜'],['normal','普通'],['chatty','愛聊天']].map(([v,t])=>`<button data-pt="${v}" class="${P.talk===v?'on':''}">${t}</button>`).join('')}</div></div>
   ${[['roam','在整個螢幕上走動','關閉時只在底部活動'],['climb','爬上螢幕邊緣','像 Shimeji 一樣攀爬、懸掛'],['appAware','根據正在使用的 App 互動','看影片會一起看、聽音樂會跳舞（需要「使用情況存取」權限，只在手機上判斷）'],['battery','省電模式','降低更新頻率']].map(([k,t,d])=>`<label class="sw"><span><b>${t}</b><small>${d}</small></span><input type="checkbox" data-pk="${k}" ${P[k]?'checked':''}><i></i></label>`).join('')}
   ${has?`<h3 class="sec">權限</h3><div class="perm"><span>${ic(ov?'check':'warn',20)}懸浮視窗</span>${ov?'<em>已允許</em>':'<button class="btn sm" data-povl>前往允許</button>'}</div><div class="perm"><span>${ic(ua?'check':'info',20)}使用情況存取（App 互動）</span>${ua?'<em>已允許</em>':'<button class="btn sm" data-pusage>前往允許</button>'}</div>`:''}
   <div class="col" style="margin-top:12px"><button class="btn primary" data-pstart>${ic('paw',20)}${OC.S.petIds.length?'更新桌寵':'開始桌寵'}</button>${OC.S.petIds.length?'<button class="btn ghost" data-pstop>收起所有桌寵</button>':''}</div>
   <p class="hint">在桌面上：點一下打招呼、上下滑動摸摸、拖曳抱起甩出、長按打開小選單、點兩下回到小島。通知列可以暫時隱藏。</p>`;
  const s=OC.UI.sheet(body(),{title:'桌寵設定',icon:'paw',full:true});const re=()=>{const y=s.body.scrollTop;s.body.innerHTML=body();OC.Rig.fillImgs(s.el);s.body.scrollTop=y};OC.Rig.fillImgs(s.el);
  s.el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const d=b.dataset;
   if(d.pp){const L=OC.S.petIds;const i=L.indexOf(d.pp);if(i>=0)L.splice(i,1);else{L.push(d.pp);while(L.length>P.max)L.shift()}re()}else if(d.pt){P.talk=d.pt;re()}
   else if(b.hasAttribute('data-povl'))OC.Native.settings();else if(b.hasAttribute('data-pusage'))OC.Native.call('openUsageAccess');
   else if(b.hasAttribute('data-pstart')){OC.Store.flush();OC.Native.syncPets(true);OC.UI.toast(has?'桌寵出發囉！回到桌面就能看到':'已儲存設定（需要 Android App）','check');s.close()}
   else if(b.hasAttribute('data-pstop')){OC.S.petIds=[];OC.Store.flush();OC.Native.syncPets(true);s.close()}OC.Store.save()});
  s.el.addEventListener('input',e=>{if(e.target.hasAttribute('data-ps')){P.size=+e.target.value;e.target.previousElementSibling.textContent=`大小 ${P.size}%`;OC.S.settings.petSize=P.size}});
  s.el.addEventListener('change',e=>{const k=e.target.dataset.pk;if(k){P[k]=e.target.checked;if(k==='battery')OC.S.settings.petBattery=P.battery;OC.Store.save()}})}};
OC.Deco=Deco;OC.Photo=Photo;OC.PetUI=PetUI;
})(window.OC);
