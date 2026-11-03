/* OC Shimeji v4.1 · 工坊：創作（畫＋屬性）、我的作品、動畫工作室、自製事件 */
(function(OC){'use strict';
const {U,Content:C,Icons}=OC;const {$,esc}=U;const ic=(n,s=22)=>Icons.svg(n,s);
const CR=()=>OC.Creations,EV=()=>OC.Events;
/* 繪畫參考線 */
const GUIDE={item:(g,W,H)=>{g.strokeStyle='#5D7DE6';g.lineWidth=3;g.setLineDash([10,8]);g.beginPath();g.arc(W/2,H/2,W*.38,0,Math.PI*2);g.stroke();g.setLineDash([])},
 furn:(g,W,H)=>{g.strokeStyle='#5D7DE6';g.lineWidth=3;g.beginPath();g.ellipse(W/2,H*.86,W*.4,H*.08,0,0,Math.PI*2);g.stroke();g.strokeRect(W*.15,H*.3,W*.7,H*.55)},
 build:(g,W,H)=>{g.strokeStyle='#5D7DE6';g.lineWidth=3;g.beginPath();g.moveTo(W*.12,H*.92);g.lineTo(W*.12,H*.45);g.lineTo(W*.5,H*.12);g.lineTo(W*.88,H*.45);g.lineTo(W*.88,H*.92);g.closePath();g.stroke();g.strokeRect(W*.43,H*.68,W*.14,H*.24)},
 acc:(g,W,H)=>{g.fillStyle='#5D7DE6';g.beginPath();g.ellipse(W/2,H*.62,W*.4,H*.3,0,0,Math.PI*2);g.fill();g.beginPath();g.moveTo(W*.18,H*.45);g.lineTo(W*.24,H*.12);g.lineTo(W*.42,H*.34);g.fill();g.beginPath();g.moveTo(W*.82,H*.45);g.lineTo(W*.76,H*.12);g.lineTo(W*.58,H*.34);g.fill()},
 charart:(g,W,H)=>{g.fillStyle='#5D7DE6';g.beginPath();g.ellipse(W/2,H*.36,W*.32,H*.24,0,0,Math.PI*2);g.fill();g.beginPath();g.roundRect?g.roundRect(W*.32,H*.55,W*.36,H*.36,30):g.rect(W*.32,H*.55,W*.36,H*.36);g.fill();g.strokeStyle='#E07F5F';g.lineWidth=3;g.beginPath();g.moveTo(0,H*.94);g.lineTo(W,H*.94);g.stroke()}};
const ICAT=[['food','食物'],['drink','飲料'],['toy','玩具'],['gift','禮物'],['care','清潔'],['col','收藏品']];
const FUSE=[['decor','裝飾'],['seat','可以坐'],['bed','可以躺'],['table','餐桌'],['light','燈光'],['shelf','書櫃（閱讀）']];
const Workshop={tab:'make',
 open(tab){this.tab=tab||this.tab||'make';if(this.s&&!this.s.closed)this.s.close();this.s=OC.UI.sheet('<div id="wsBody"></div>',{full:true,title:'工坊',icon:'palette',cls:'ws'});this.s.el.addEventListener('click',e=>this.click(e));this.s.el.addEventListener('change',e=>this.change(e));this.render()},
 render(){if(!this.s||this.s.closed)return;const T=[['make','創作'],['mine','我的作品'],['anim','動畫工作室'],['events','自製事件']];let b='';
  if(this.tab==='make')b=`<p class="lead">畫出你想要的東西，設定好屬性後會在<b>創作市集</b>上架；用星幣買下才會進到背包（家具、建築可在佈置中擺放）。</p><div class="ws-types">${Object.entries(CR().TYPES).map(([k,t])=>`<button class="ws-t" data-new="${k}"><span>${ic(t.ic,44)}</span><b>${t.t}</b><small>${t.d}</small></button>`).join('')}</div>
   <div class="row"><button class="btn" data-imppack>${ic('import',18)}匯入作品包</button><button class="btn ghost" data-exppack>${ic('export',18)}匯出全部作品</button></div>`;
  else if(this.tab==='mine'){const L=CR().all();b=L.length?`<div class="ws-g">${L.map(c=>`<div class="ws-c"><span class="ws-img">${c.img&&CR().imgs.get(c.id)?`<img src="${CR().imgs.get(c.id)}" alt="">`:ic(CR().TYPES[c.type].ic,48)}</span><b>${esc(c.name)}</b><small>${CR().TYPES[c.type].t}${c.listed===false?'・未上架':['item','furn','build'].includes(c.type)?'・'+c.price+' 星幣':''}</small>
    <div class="ws-a"><button data-edit="${c.id}" aria-label="編輯">${ic('edit',18)}</button>${c.type==='acc'?`<button data-wear="${c.id}" aria-label="穿戴">${ic('ribbon',18)}</button>`:''}${c.type==='charart'?`<button data-tochar="${c.id}" aria-label="做成夥伴">${ic('users',18)}</button>`:''}${['item','furn','build'].includes(c.type)?`<button data-list="${c.id}" aria-label="上架">${ic(c.listed===false?'shop':'check',18)}</button>`:''}<button data-dup="${c.id}" aria-label="複製">${ic('plus',18)}</button><button data-exp1="${c.id}" aria-label="匯出">${ic('export',18)}</button><button data-del="${c.id}" aria-label="刪除">${ic('trash',18)}</button></div></div>`).join('')}</div>`:'<p class="empty">還沒有作品。到「創作」開始畫第一件吧！</p>'}
  else if(this.tab==='anim')b=this.animPanel();
  else b=this.eventsPanel();
  U.setHTML($('#wsBody',this.s.el),`<div class="tabs">${T.map(([k,t])=>`<button data-wt="${k}" class="${this.tab===k?'on':''}">${t}</button>`).join('')}</div>${b}`)},
 click(e){const t=e.target.closest('button');if(!t)return;const d=t.dataset;
  if(d.wt){this.tab=d.wt;this.render();return}
  if(d.new){this.create(d.new);return}if(d.edit){this.create(CR().get(d.edit).type,d.edit);return}
  if(d.del){OC.UI.confirm({title:'刪除作品？',msg:'背包中的這件物品與擺放的家具也會一起移除。',ok:'刪除',danger:true}).then(ok=>{if(ok)CR().remove(d.del).then(()=>this.render())});return}
  if(d.dup){const c=JSON.parse(JSON.stringify(CR().get(d.dup)));c.id=U.uid('cr');c.name+=' 2';CR().save(c,CR().imgs.get(d.dup)).then(()=>this.render());return}
  if(d.list){const c=CR().get(d.list);c.listed=c.listed===false;OC.Store.save();this.render();OC.UI.toast(c.listed?'已在創作市集上架':'已下架','check');return}
  if(d.exp1){CR().exportPack([d.exp1]).then(j=>OC.Pages.download(j,`${CR().get(d.exp1).name}.ocs-creation.json`));return}
  if(t.hasAttribute('data-exppack')){CR().exportPack().then(j=>OC.Pages.download(j,`oc-shimeji-creations-${U.dayKey()}.json`));return}
  if(t.hasAttribute('data-imppack')){OC.Pages.pickFile('.json,application/json').then(async txt=>{if(!txt)return;try{const n=await CR().importPack(txt);OC.UI.toast(`匯入了 ${n} 件作品`,'check');this.tab='mine';this.render()}catch(err){OC.UI.toast(err.message,'warn')}});return}
  if(d.wear){this.wearUI(d.wear);return}
  if(d.tochar){CR().toChar(d.tochar).then(ch=>{if(!ch)return;OC.UI.toast(`${ch.name}加入了小島！`,'heart');this.s.close();OC.Sim.sync();OC.Intro.arrive([ch.id])});return}
  if(this.animClick(t))return;if(this.eventsClick(t))return},
 change(e){},
 /* ---------- 創作：畫圖 → 屬性 ---------- */
 async create(type,editId){const T=CR().TYPES[type];const old=editId?CR().get(editId):null;
  const img=await OC.Studio.open({w:T.w,h:T.h,title:`${old?'編輯':'畫'}${T.t}`,guide:GUIDE[type],base:old?CR().imgs.get(old.id):null,size:type==='build'?14:8});
  if(!img){if(old)return;else return}
  const c=old?JSON.parse(JSON.stringify(old)):{id:U.uid('cr'),type,name:'',desc:'',price:type==='build'?600:type==='furn'?300:120,listed:true,by:'我',t:Date.now()};
  if(type==='item')Object.assign(c,{cat:c.cat||'gift',tags:c.tags||[],fx:c.fx||{hunger:0,fun:10,comfort:5},gift:c.gift||2});
  if(type==='furn')Object.assign(c,{size:c.size||1.2,use:c.use||'decor'});if(type==='build')Object.assign(c,{size:c.size||3});
  if(type==='acc')Object.assign(c,{anchor:c.anchor||'head',size:c.size||60});
  this.props(c,img)},
 props(c,img){const T=CR().TYPES[c.type];const F={hunger:'飽足',fun:'娛樂',comfort:'舒適',energy:'精力',social:'社交',hygiene:'清潔'};
  const body=()=>`<div class="it-h"><span class="it-big"><img src="${img}" alt=""></span><div><h2 class="dl-t">${T.t}屬性</h2><p class="hint">取個名字，設定它的用途與價格。</p></div></div>
   <div class="fld"><span>名稱</span><input data-f="name" maxlength="14" value="${esc(c.name)}" placeholder="例如：星空棉花糖"></div><div class="fld"><span>介紹</span><input data-f="desc" maxlength="60" value="${esc(c.desc||'')}"></div>
   ${c.type==='item'?`<div class="og"><span>種類</span><div class="chips">${ICAT.map(([k,t])=>`<button class="chip ${c.cat===k?'on':''}" data-cat="${k}">${t}</button>`).join('')}</div></div>
    ${['food','drink'].includes(c.cat)?`<div class="og"><span>口味（影響夥伴喜不喜歡）</span><div class="chips">${C.TASTES.map(([k,t])=>`<button class="chip ${c.tags.includes(k)?'on':''}" data-tag="${k}">${t}</button>`).join('')}</div></div>`:''}
    <h3 class="sec">效果</h3>${Object.entries(F).map(([k,t])=>`<div class="opt"><span>${t} <b data-fv="${k}">${c.fx[k]||0}</b></span><input type="range" min="-20" max="60" value="${c.fx[k]||0}" data-fx="${k}"></div>`).join('')}
    ${c.cat==='toy'?`<label class="sw"><span><b>可重複使用</b></span><input type="checkbox" data-reuse ${c.reuse?'checked':''}><i></i></label>`:''}`:''}
   ${c.type==='furn'?`<div class="og"><span>用途</span><div class="chips">${FUSE.map(([k,t])=>`<button class="chip ${c.use===k?'on':''}" data-use="${k}">${t}</button>`).join('')}</div></div><div class="opt"><span>大小（公尺）<b data-sv>${c.size}</b></span><input type="range" min="0.5" max="3" step="0.1" value="${c.size}" data-size></div>`:''}
   ${c.type==='build'?`<div class="opt"><span>大小（公尺）<b data-sv>${c.size}</b></span><input type="range" min="1.5" max="6" step="0.1" value="${c.size}" data-size></div>`:''}
   ${c.type==='acc'?`<div class="og"><span>戴在</span><div class="chips"><button class="chip ${c.anchor==='head'?'on':''}" data-anchor="head">頭上</button><button class="chip ${c.anchor==='face'?'on':''}" data-anchor="face">臉上</button><button class="chip ${c.anchor==='body'?'on':''}" data-anchor="body">身上</button></div></div><div class="opt"><span>大小</span><input type="range" min="20" max="140" value="${c.size}" data-size></div>`:''}
   ${['item','furn','build'].includes(c.type)?`<div class="opt"><span>售價 <b data-pv>${c.price}</b> 星幣</span><input type="range" min="10" max="2000" step="10" value="${c.price}" data-price></div><label class="sw"><span><b>在創作市集上架</b><small>購買後才會進入背包</small></span><input type="checkbox" data-listed ${c.listed!==false?'checked':''}><i></i></label>`:''}
   ${c.type==='charart'?`<p class="hint">完成後可在「我的作品」按「做成夥伴」，或到動畫工作室加上走路、睡覺等動畫。</p>`:''}
   <div class="row end"><button class="btn ghost" data-redraw>重畫</button><button class="btn primary" data-save>${ic('check',18)}完成</button></div>`;
  const s=OC.UI.sheet(body(),{cls:'it-s'});const re=()=>{const y=s.body.scrollTop;s.body.innerHTML=body();s.body.scrollTop=y};
  s.el.addEventListener('input',e=>{const t=e.target,d=t.dataset;if(d.f)c[d.f]=t.value;else if(d.fx){c.fx[d.fx]=+t.value;s.el.querySelector(`[data-fv=${d.fx}]`).textContent=t.value}else if(t.hasAttribute('data-price')){c.price=+t.value;s.el.querySelector('[data-pv]').textContent=t.value}else if(t.hasAttribute('data-size')){c.size=+t.value;const v=s.el.querySelector('[data-sv]');if(v)v.textContent=t.value}});
  s.el.addEventListener('change',e=>{const t=e.target;if(t.hasAttribute('data-listed'))c.listed=t.checked;if(t.hasAttribute('data-reuse'))c.reuse=t.checked});
  s.el.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;const d=b.dataset;
   if(d.cat){c.cat=d.cat;re()}else if(d.tag){const i=c.tags.indexOf(d.tag);i>=0?c.tags.splice(i,1):c.tags.push(d.tag);re()}else if(d.use){c.use=d.use;re()}else if(d.anchor){c.anchor=d.anchor;re()}
   else if(b.hasAttribute('data-redraw')){s.close();const img2=await OC.Studio.open({w:CR().TYPES[c.type].w,h:CR().TYPES[c.type].h,title:'重畫',base:img,guide:GUIDE[c.type]});if(img2)img=img2;this.props(c,img)}
   else if(b.hasAttribute('data-save')){c.name=(c.name||'').trim()||'無名作品';await CR().save(c,img);s.close();OC.Items.xp(10);OC.UI.celebrate(null,c.name,'作品完成！','palette');this.tab='mine';this.render();
    if(c.type==='acc')setTimeout(()=>this.wearUI(c.id),400)}})},
 /* ---------- 飾品穿戴 ---------- */
 wearUI(cid){const c=CR().get(cid);const chars=OC.S.chars;OC.UI.menu(`<h2 class="dl-t">要給誰戴上「${esc(c.name)}」？</h2><div class="am-g">${chars.map(ch=>{const on=(ch.wear||[]).some(w=>w.id===cid);return`<button data-m="${ch.id}" class="${on?'on':''}"><span class="hav">${OC.Rig.avatarHTML(ch)}</span><span>${esc(ch.name)}${on?'（脫下）':''}</span></button>`}).join('')}</div>`,id=>{const ch=chars.find(x=>x.id===id);const on=(ch.wear||[]).some(w=>w.id===cid);
   CR().wear(id,cid,on?null:{anchor:c.anchor,s:c.size/100,x:0,y:0,r:0});OC.UI.toast(on?'已脫下':`${ch.name}戴上了${c.name}`,'check');if(!on)this.adjustWear(id,cid)})},
 adjustWear(charId,cid){const ch=OC.S.chars.find(c=>c.id===charId);const w=(ch.wear||[]).find(x=>x.id===cid);if(!w)return;
  const s=OC.UI.sheet(`<p class="hint">調整位置、大小與角度，夥伴會立刻換上。</p>${[['x','左右',-80,80],['y','上下',-80,80],['s','大小',.2,2,.05],['r','角度',-60,60]].map(([k,t,a,b,st])=>`<div class="opt"><span>${t}</span><input type="range" min="${a}" max="${b}" step="${st||1}" value="${w[k]}" data-w="${k}"></div>`).join('')}<div class="row end"><button class="btn primary" data-ok>完成</button></div>`,{title:'調整飾品',icon:'ribbon'});
  s.el.addEventListener('input',e=>{const k=e.target.dataset.w;if(k){w[k]=+e.target.value;OC.Store.save()}});s.el.querySelector('[data-ok]').onclick=()=>s.close()},
 /* ---------- 動畫工作室 ---------- */
 STATES:[['idle','待機'],['walk','走路'],['happy','開心'],['sleep','睡覺']],
 animPanel(){const L=CR().all().filter(c=>c.type==='charart');const cur=this.animId&&CR().get(this.animId);
  if(!cur)return`<p class="lead">為「角色素材」作品加上逐格動畫：待機、走路、開心、睡覺。每個狀態最多 12 格，可開洋蔥皮對照前一格。</p>${L.length?`<div class="ws-g">${L.map(c=>`<button class="ws-c" data-anim="${c.id}"><span class="ws-img"><img src="${CR().imgs.get(c.id)||''}" alt=""></span><b>${esc(c.name)}</b><small>${Object.values(c.frames||{}).reduce((a,b)=>a+b.length,0)} 格</small></button>`).join('')}</div>`:`<p class="empty">先在「創作」畫一個角色素材吧</p><button class="btn primary wide" data-new="charart">${ic('brush',20)}畫角色素材</button>`}`;
  cur.frames=cur.frames||{};const st=this.animSt||'idle';const F=cur.frames[st]||[];
  return`<div class="row"><button class="btn sm ghost" data-animback>${ic('back',16)}返回</button><b>${esc(cur.name)}</b></div><div class="chips">${this.STATES.map(([k,t])=>`<button class="chip ${st===k?'on':''}" data-ast="${k}">${t}（${(cur.frames[k]||[]).length}）</button>`).join('')}</div>
   <div class="an-pv"><canvas id="anCv" width="240" height="240"></canvas></div><div class="opt"><span>速度 ${cur.fps||8} 格／秒</span><input type="range" min="2" max="16" value="${cur.fps||8}" data-fps></div>
   <div class="an-strip">${F.map((k,i)=>`<button class="an-f" data-af="${i}"><img data-ak="${k}" alt=""><small>${i+1}</small></button>`).join('')}${F.length<12?`<button class="an-f add" data-afadd>${ic('plus',22)}<small>新增</small></button>`:''}</div>
   <p class="hint">點格子可以重畫或刪除。沒有動畫的狀態會使用角色素材本身的圖。</p>`},
 animClick(t){const d=t.dataset;const cur=this.animId&&CR().get(this.animId);
  if(d.anim){this.animId=d.anim;this.animSt='idle';this.render();this.animPlay();return true}
  if(t.hasAttribute('data-animback')){this.animId=null;this.render();return true}
  if(d.ast){this.animSt=d.ast;this.render();this.animPlay();return true}
  if(!cur)return false;cur.frames=cur.frames||{};const st=this.animSt||'idle';const F=cur.frames[st]=cur.frames[st]||[];
  if(t.hasAttribute('data-afadd')){(async()=>{const prev=F.length?await OC.Store.Assets.get(F[F.length-1]):CR().imgs.get(cur.id);const img=await OC.Studio.open({w:384,h:448,title:`${this.STATES.find(s=>s[0]===st)[1]} 第 ${F.length+1} 格`,base:prev,onion:prev,noTrim:true});if(!img)return;const k=U.uid('fr');await OC.Store.Assets.put(k,img);F.push(k);await CR().save(cur);this.render();this.animPlay()})();return true}
  if(d.af!=null){const i=+d.af;OC.UI.menu(`<h2 class="dl-t">第 ${i+1} 格</h2><div class="am-g"><button data-m="edit">${ic('edit',28)}<span>重畫</span></button><button data-m="copy">${ic('plus',28)}<span>複製一格</span></button><button data-m="del">${ic('trash',28)}<span>刪除</span></button></div>`,async m=>{
   if(m==='del'){await OC.Store.Assets.del(F[i]);F.splice(i,1)}else if(m==='copy'){if(F.length>=12)return;const k=U.uid('fr');await OC.Store.Assets.put(k,await OC.Store.Assets.get(F[i]));F.splice(i+1,0,k)}
   else{const base=await OC.Store.Assets.get(F[i]);const onion=i?await OC.Store.Assets.get(F[i-1]):null;const img=await OC.Studio.open({w:384,h:448,title:`重畫第 ${i+1} 格`,base,onion,noTrim:true});if(img){await OC.Store.Assets.put(F[i],img);OC.Rig.dropImg&&OC.Rig.dropImg(F[i])}}
   await CR().save(cur);this.render();this.animPlay()});return true}
  return false},
 async animPlay(){cancelAnimationFrame(this.ar);const cur=CR().get(this.animId);if(!cur||!this.s||this.s.closed)return;const st=this.animSt||'idle';const keys=(cur.frames&&cur.frames[st])||[];
  const imgs=[];for(const k of keys){const u=await OC.Store.Assets.get(k);const im=new Image();im.src=u;imgs.push(im)}if(!imgs.length){const im=new Image();im.src=CR().imgs.get(cur.id)||'';imgs.push(im)}
  this.s.el.querySelectorAll('img[data-ak]').forEach(async n=>{n.src=await OC.Store.Assets.get(n.dataset.ak)});
  const fpsIn=this.s.el.querySelector('[data-fps]');if(fpsIn)fpsIn.oninput=()=>{cur.fps=+fpsIn.value;OC.Store.save();fpsIn.previousElementSibling.textContent=`速度 ${cur.fps} 格／秒`};
  const t0=performance.now();const loop=t=>{const cv=this.s&&!this.s.closed&&this.s.el.querySelector('#anCv');if(!cv)return;const g=cv.getContext('2d');g.clearRect(0,0,240,240);const i=Math.floor((t-t0)/1000*(cur.fps||8))%imgs.length;const im=imgs[i];
   if(im.complete&&im.naturalWidth){const k=Math.min(220/im.width,220/im.height);g.drawImage(im,(240-im.width*k)/2,236-im.height*k,im.width*k,im.height*k)}this.ar=requestAnimationFrame(loop)};this.ar=requestAnimationFrame(loop)},
 /* ---------- 自製事件 ---------- */
 eventsPanel(){const R=EV().rules(),L=EV().log();return`<p class="lead">設計夥伴的專屬反應：例如「星夢收到小花束時會轉圈圈並說一句話」。內建事件會照常發生，這些是你額外加入的。</p>
  <button class="btn primary wide" data-evnew>${ic('plus',20)}新增事件</button>
  ${R.map(r=>`<div class="ev-r ${r.enabled?'':'off'}"><span class="ev-i">${ic('event',30)}</span><div><b>${esc(r.title)}</b><small>${EV().TRIG[r.trigger]}${r.charId?'・'+esc((OC.S.chars.find(c=>c.id===r.charId)||{}).name||''):'・任何夥伴'}・${EV().ANIM[r.anim||'none']}</small></div><div class="ev-a"><button data-evprev="${r.id}">${ic('play',18)}</button><button data-evedit="${r.id}">${ic('edit',18)}</button><button data-evtog="${r.id}">${ic(r.enabled?'check':'close',18)}</button></div></div>`).join('')||'<p class="empty">還沒有自製事件</p>'}
  ${L.length?`<h3 class="sec">最近觸發</h3>${L.slice(0,12).map(l=>`<p class="log">${ic('sparkle',18)}<span>${esc(l.title)}・${esc((OC.S.chars.find(c=>c.id===l.cid)||{}).name||'')}${l.line?'：「'+esc(l.line)+'」':''}<small>${OC.UI.ago(l.t)}</small></span></p>`).join('')}`:''}`},
 eventsClick(t){const d=t.dataset;const R=EV().rules();
  if(t.hasAttribute('data-evnew')){this.eventForm();return true}
  if(d.evedit){this.eventForm(d.evedit);return true}
  if(d.evtog){const r=R.find(x=>x.id===d.evtog);r.enabled=!r.enabled;OC.Store.save();this.render();return true}
  if(d.evprev){const r=R.find(x=>x.id===d.evprev);const a=OC.Sim.agents.get(r.charId)||OC.Sim.active();if(!a)return true;this.s.close();if(a.loc!==OC.R.sc.id)OC.World.go(a.loc,{focus:a});setTimeout(()=>EV().run(r,a,{item:r.itemId?OC.Shop.item(r.itemId):null},true),600);return true}
  return false},
 eventForm(id){const R=EV().rules();const r=id?JSON.parse(JSON.stringify(R.find(x=>x.id===id))):{id:U.uid('ev'),title:'',enabled:true,trigger:'item',charId:'',itemId:'',from:20,to:23,weather:'rain',place:'beach',friend:'',mood:'happy',lines:'',anim:'hop',chance:100,cd:30,needs:{},coins:0,give:'',rel:0,memory:'',cine:true,text:''};
  const items=[...C.ITEMS.filter(i=>!['furn'].includes(i.cat)),...CR().listed().filter(i=>i.cat!=='furn'&&i.cat!=='build')];
  const sel=(k,opts,v)=>`<select data-e="${k}">${opts.map(([a,b])=>`<option value="${a}" ${String(v)===String(a)?'selected':''}>${esc(b)}</option>`).join('')}</select>`;
  const body=()=>`<div class="fld"><span>事件名稱</span><input data-e="title" maxlength="20" value="${esc(r.title)}" placeholder="例如：收到花束轉圈圈"></div>
   <div class="ev-f"><label>觸發條件${sel('trigger',Object.entries(EV().TRIG),r.trigger)}</label><label>哪位夥伴${sel('charId',[['','任何夥伴'],...OC.S.chars.map(c=>[c.id,c.name])],r.charId)}</label>
   ${r.trigger==='item'?`<label>物品${sel('itemId',[['','任何物品'],...items.map(i=>[i.id,i.name])],r.itemId)}</label>`:''}
   ${r.trigger==='time'?`<label>從幾點${sel('from',[...Array(24).keys()].map(h=>[h,h+':00']),r.from)}</label><label>到幾點${sel('to',[...Array(24).keys()].map(h=>[h,h+':00']),r.to)}</label>`:''}
   ${r.trigger==='weather'?`<label>天氣${sel('weather',Object.entries(OC.Env.WX).map(([k,v])=>[k,v.t]),r.weather)}</label>`:''}
   ${r.trigger==='place'?`<label>地點${sel('place',C.LOCS.map(l=>[l.id,l.t]),r.place)}</label>`:''}
   ${r.trigger==='meet'?`<label>遇到誰${sel('friend',[['','任何夥伴'],...OC.S.chars.map(c=>[c.id,c.name])],r.friend)}</label>`:''}
   ${r.trigger==='mood'?`<label>心情${sel('mood',Object.entries(C.MOODS).map(([k,v])=>[k,v.t]),r.mood)}</label>`:''}
   <label>動作${sel('anim',Object.entries(EV().ANIM),r.anim)}</label><label>機率 %<input type="number" data-e="chance" min="1" max="100" value="${r.chance}"></label><label>冷卻（分鐘）<input type="number" data-e="cd" min="0" max="1440" value="${r.cd}"></label></div>
   <div class="fld"><span>台詞（每行一句，隨機選；可用 {name} {item} {friend} {time}）</span><textarea data-e="lines" rows="3">${esc(r.lines)}</textarea></div>
   <div class="fld"><span>大字效果（可留空）</span><input data-e="text" maxlength="8" value="${esc(r.text||'')}" placeholder="例如：好幸福！"></div>
   <div class="ev-f"><label>心情變化${sel('moodfx',[['','不變'],['happy','變開心'],['sad','變難過'],['angry','變生氣']],r.moodfx||'')}</label><label>獎勵星幣<input type="number" data-e="coins" min="0" max="500" value="${r.coins||0}"></label>
   <label>附贈物品${sel('give',[['','無'],...items.map(i=>[i.id,i.name])],r.give)}</label>${r.trigger==='meet'?`<label>好感變化<input type="number" data-e="rel" min="-30" max="30" value="${r.rel||0}"></label>`:''}</div>
   <div class="fld"><span>留下回憶（可留空）</span><input data-e="memory" maxlength="30" value="${esc(r.memory||'')}" placeholder="例如：在雨天和{friend}一起躲雨"></div>
   <label class="sw"><span><b>電影式演出</b><small>鏡頭拉近、上下黑邊</small></span><input type="checkbox" data-ecine ${r.cine?'checked':''}><i></i></label>
   <div class="row end">${id?`<button class="btn ghost danger-t" data-edel>刪除</button>`:''}<button class="btn" data-eprev>${ic('play',16)}預覽</button><button class="btn primary" data-esave>儲存</button></div>`;
  const s=OC.UI.sheet(body(),{title:id?'編輯事件':'新增事件',icon:'event'});
  const read=()=>{s.el.querySelectorAll('[data-e]').forEach(n=>{const k=n.dataset.e;let v=n.value;if(['chance','cd','coins','rel','from','to'].includes(k))v=+v;if(k==='moodfx')r.moodfx=v;else r[k]=v});r.mood=r.trigger==='mood'?r.mood:r.mood;const c=s.el.querySelector('[data-ecine]');if(c)r.cine=c.checked};
  s.el.addEventListener('change',e=>{if(e.target.dataset.e==='trigger'){read();const y=s.body.scrollTop;s.body.innerHTML=body();s.body.scrollTop=y}});
  s.el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;read();const fx=Object.assign({},r,{mood:r.moodfx});
   if(b.hasAttribute('data-eprev')){const a=OC.Sim.agents.get(r.charId)||OC.Sim.active();if(a){s.close();this.s&&this.s.close();if(a.loc!==OC.R.sc.id)OC.World.go(a.loc,{focus:a});setTimeout(()=>EV().run(fx,a,{item:r.itemId?OC.Shop.item(r.itemId):null},true),600)}}
   else if(b.hasAttribute('data-edel')){OC.S.events=R.filter(x=>x.id!==r.id);OC.Store.save();s.close();this.render()}
   else if(b.hasAttribute('data-esave')){r.title=(r.title||'').trim()||'未命名事件';const i=R.findIndex(x=>x.id===r.id);const save=Object.assign(r,{});if(i>=0)R[i]=save;else R.unshift(save);OC.Store.save();s.close();this.tab='events';this.render();OC.UI.toast('事件已儲存','check')}})}};
OC.Workshop=Workshop;
})(window.OC);
