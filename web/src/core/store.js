/* OC Shimeji v4.2 · 存檔核心
   ─ 單一存檔物件 OC.S（localStorage 'ocs4.save'），大型素材（圖片、動畫格）放 IndexedDB 'ocs4'/kv
   ─ 版本遷移（MIGRATIONS）、載入時驗證與修復（validate）、主存檔→備援→每日快照的復原鏈
   ─ 完整備份與角色包一定包含實際素材（不會只有 JSON 或失效路徑）
   詳見 docs/ARCHITECTURE.md「資料與存檔」 */
(function(OC){'use strict';
const {U}=OC;
const KEY='ocs4.save',BAK='ocs4.save.bak',CORRUPT='ocs4.corrupt',VER=42;

/* ---------- IndexedDB：素材（kv）與每日快照（snap） ---------- */
const Assets={db:null,mem:new Map(),
 open(){if(this.db)return Promise.resolve(this.db);if(this._p)return this._p;return this._p=new Promise(res=>{try{const r=indexedDB.open('ocs4',2);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains('kv'))d.createObjectStore('kv');if(!d.objectStoreNames.contains('snap'))d.createObjectStore('snap')};
  r.onsuccess=()=>{this.db=r.result;this.db.onversionchange=()=>{try{this.db.close()}catch(e){}this.db=null;this._p=null};res(this.db)};r.onerror=()=>res(null);r.onblocked=()=>res(null)}catch(e){res(null)}})},
 tx(store,mode,fn){return this.open().then(d=>new Promise(res=>{if(!d){res(null);return}try{const t=d.transaction(store,mode);const s=t.objectStore(store);const q=fn(s);t.oncomplete=()=>res(q&&q.result!==undefined?q.result:true);t.onerror=()=>res(null);t.onabort=()=>res(null)}catch(e){res(null)}}))},
 async get(k){if(k==null)return null;if(this.mem.has(k))return this.mem.get(k);const v=await this.tx('kv','readonly',s=>s.get(k));if(v!=null&&v!==true)this.mem.set(k,v);return v===true?null:v??null},
 /* 同步讀取（已載入記憶體的素材），讓介面不必等待、不會閃一下 */
 peek(k){return this.mem.get(k)||null},
 async put(k,v){this.mem.set(k,v);await this.tx('kv','readwrite',s=>s.put(v,k))},
 async del(k){this.mem.delete(k);await this.tx('kv','readwrite',s=>s.delete(k))},
 async keys(){const r=await this.tx('kv','readonly',s=>s.getAllKeys());return Array.isArray(r)?r:[...this.mem.keys()]},
 async preload(keys){for(const k of keys)if(k&&!this.mem.has(k))await this.get(k)}};

/* ---------- 效能預設（見 Settings → 畫質與效能） ---------- */
const PERF={
 quality:{fps:60,scale:2.5,shadows:2,particles:1,weather:1,ambient:2,cloudShadow:1,animDetail:2,maxChars:12,bgTick:1},
 balanced:{fps:60,scale:1.75,shadows:1,particles:.6,weather:1,ambient:1,cloudShadow:1,animDetail:1,maxChars:10,bgTick:1},
 battery:{fps:30,scale:1.15,shadows:0,particles:.2,weather:1,ambient:0,cloudShadow:0,animDetail:0,maxChars:6,bgTick:.25}};
const defaults=()=>({v:VER,created:Date.now(),lastSeen:Date.now(),
 settings:{theme:'system',motion:'system',perf:'balanced',custom:Object.assign({},PERF.balanced),bubbles:true,haptics:true,names:true,negEvents:true,romance:true,autoSocial:true,cine:'full',petSize:100,petMax:2,petBattery:false,pet:null},
 flags:{introSeen:false,started:false,tutorial:0,tutorialDone:false,houseChosen:false},
 world:{loc:'home',house:null,houseFurn:null,builds:[],props:{},unlocked:['home','house','plaza','beach','forest'],timeOffset:0,weather:null,garden:{}},
 chars:[],activeId:null,petIds:[],
 rel:{},
 inv:{},coins:120,gems:0,xp:0,
 codex:{},quests:{day:'',list:[],weekly:null,streak:0,last:''},
 creations:[],events:[],eventLog:[],
 log:[],pending:[],ui:{},shop:null,migrated:null});

/* ---------- 版本遷移：每一步只做那個版本需要的補欄位 ---------- */
const MIGRATIONS={
 4:s=>{s.creations=s.creations||[];s.events=s.events||[];s.eventLog=s.eventLog||[];s.xp=s.xp||0;s.gems=s.gems||0;s.ui=s.ui||{};s.world.builds=s.world.builds||[]},
 41:s=>{for(const c of s.chars||[]){c.wear=c.wear||[];if(c.anim===undefined)c.anim=null}s.settings.cine=s.settings.cine||'full'}};

const Store={S:null,_t:0,VER,KEY,PERF,defaults,Assets,loadInfo:{src:'new',fixes:[]},
 /* 讀取：主存檔 → 備援；兩者都壞時保留原文到 ocs4.corrupt，開機後再嘗試從快照復原 */
 load(){let s=null,src='new';const raw=localStorage.getItem(KEY);
  if(raw){try{s=JSON.parse(raw);src='main'}catch(e){try{localStorage.setItem(CORRUPT,raw)}catch(_){}}}
  if(!s){const b=localStorage.getItem(BAK);if(b){try{s=JSON.parse(b);src='backup'}catch(e){}}}
  if(s&&typeof s!=='object')s=null;
  this.S=s?this.migrate(s):defaults();this.loadInfo={src:s?src:(raw?'corrupt':'new'),fixes:[]};OC.S=this.S;return this.S},
 migrate(s){const d=defaults();
  for(const k of ['settings','flags','world','quests'])s[k]=Object.assign({},d[k],s[k]&&typeof s[k]==='object'?s[k]:{});
  s.settings.custom=Object.assign({},PERF.balanced,s.settings.custom||{});
  for(const k of Object.keys(d))if(s[k]===undefined||s[k]===null&&d[k]!==null)s[k]=d[k];
  const from=+s.v||4;for(const v of Object.keys(MIGRATIONS).map(Number).sort((a,b)=>a-b))if(from<=v)MIGRATIONS[v](s);
  s.v=VER;return s},
 /* 驗證與修復（開機、匯入、匯出前執行）；回傳修正清單 */
 validate(S=this.S){const fix=[];const C=OC.Content;const arr=k=>{if(!Array.isArray(S[k])){S[k]=[];fix.push(k+' 不是陣列')}};
  ['chars','petIds','log','pending','creations','events','eventLog'].forEach(arr);
  /* 角色：唯一 ID、欄位完整 */
  const ids=new Set();S.chars=S.chars.filter(c=>c&&typeof c==='object');
  for(const c of S.chars){if(!c.id||typeof c.id!=='string'||ids.has(c.id)){const old=c.id;c.id=U.uid('c');fix.push(`角色 ID 重複或缺少（${old}）→ ${c.id}`)}ids.add(c.id);if(typeof c.name!=='string'||!c.name.trim())c.name='夥伴';OC.Chars.ensure(c);c.wear=Array.isArray(c.wear)?c.wear:[]}
  if(!ids.has(S.activeId))S.activeId=S.chars[0]?S.chars[0].id:null;
  S.petIds=[...new Set(S.petIds.filter(id=>ids.has(id)))];
  /* 關係：兩端都要存在 */
  for(const k of Object.keys(S.rel||{})){const [a,b]=k.split('|');if(!ids.has(a)||!ids.has(b)){delete S.rel[k];fix.push('移除失效關係 '+k)}}
  S.pending=S.pending.filter(p=>p&&(p.k==='trait'?ids.has(p.cid):ids.has(p.a)&&ids.has(p.b)));
  /* 經濟與背包：不得負數、非整數或未知物品 */
  const coins=Math.floor(+S.coins);if(!(coins>=0)){fix.push('星幣異常 '+S.coins);S.coins=0}else S.coins=coins;S.gems=Math.max(0,Math.floor(+S.gems)||0);S.xp=Math.max(0,Math.floor(+S.xp)||0);
  const crIds=new Set(S.creations.map(c=>c&&c.id));
  for(const [id,q] of Object.entries(S.inv||{})){const n=Math.floor(+q);if(!(C.ITEM[id]||crIds.has(id))||!(n>0)){delete S.inv[id];if(!(n>0)&&(C.ITEM[id]||crIds.has(id)))continue;fix.push('移除未知物品 '+id)}else S.inv[id]=Math.min(999,n)}
  /* 家具、建築 */
  const W=S.world;if(W.houseFurn)W.houseFurn=W.houseFurn.filter(f=>f&&f.id&&Number.isFinite(+f.x)&&Number.isFinite(+f.z)&&(!String(f.k).startsWith('cr')||crIds.has(f.k)));
  W.builds=(W.builds||[]).filter(b=>b&&crIds.has(b.cid)&&Number.isFinite(+b.x)&&Number.isFinite(+b.z));
  if(W.house&&!(Number.isFinite(+W.house.x)&&Number.isFinite(+W.house.z)))W.house=null;
  for(const ch of S.chars)ch.wear=ch.wear.filter(w=>w&&crIds.has(w.id));
  /* 日誌長度 */
  if(S.log.length>240)S.log.length=240;if(S.eventLog.length>80)S.eventLog.length=80;
  if(fix.length)console.info('[store] 修復',fix);return fix},
 isNew(){return !localStorage.getItem(KEY)&&!localStorage.getItem(BAK)},
 save(){clearTimeout(this._t);this._t=setTimeout(()=>this.flush(),400)},
 flush(){clearTimeout(this._t);if(!this.S||this.locked)return false;this.S.lastSeen=Date.now();let j;try{j=JSON.stringify(this.S)}catch(e){console.error('[store] 序列化失敗',e);return false}
  const write=()=>{localStorage.setItem(KEY,j);const now=Date.now();if(!this._bk||now-this._bk>6e5){this._bk=now;localStorage.setItem(BAK,j)}};
  try{write()}catch(e){/* 空間不足：先精簡日誌與回憶再試一次 */this.shrink();try{j=JSON.stringify(this.S);write()}catch(e2){console.warn('save failed',e2);OC.UI&&OC.UI.toast&&OC.UI.toast('儲存空間不足，請到設定匯出備份','warn');return false}}
  try{OC.Native&&OC.Native.syncPets&&OC.Native.syncPets()}catch(e){}return true},
 shrink(){const S=this.S;S.log.length=Math.min(S.log.length,80);S.eventLog.length=Math.min(S.eventLog.length,20);for(const c of S.chars){if(c.memories.length>30)c.memories.length=30}for(const r of Object.values(S.rel))if(r.mem&&r.mem.length>8)r.mem.length=8;try{localStorage.removeItem(CORRUPT)}catch(e){}},
 /* 寫入新存檔後重新載入：先鎖住，避免 pagehide 時把舊的記憶體狀態寫回去 */
 reload(){this.locked=true;clearTimeout(this._t);location.reload()},
 reset(){localStorage.removeItem(KEY);localStorage.removeItem(BAK);this.reload()},
 perf(){const st=this.S.settings;const p=Object.assign({},PERF.balanced,st.perf==='custom'?st.custom:PERF[st.perf]||PERF.balanced);const reduce=st.motion==='reduce'||(st.motion==='system'&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  if(reduce){p.particles=Math.min(p.particles,.25);p.ambient=Math.min(p.ambient,1)}p.reduce=reduce;return p},

 /* ---------- 每日快照（IndexedDB，保留 7 份） ---------- */
 async snapshot(tag='auto'){if(!this.S)return;const k=new Date().toISOString().slice(0,10)+(tag==='auto'?'':'_'+tag+'_'+Date.now());await Assets.tx('snap','readwrite',s=>s.put({at:Date.now(),tag,v:VER,chars:this.S.chars.length,save:JSON.stringify(this.S)},k));
  const keys=(await Assets.tx('snap','readonly',s=>s.getAllKeys()))||[];if(Array.isArray(keys)&&keys.length>7){keys.sort();for(const old of keys.slice(0,keys.length-7))await Assets.tx('snap','readwrite',s=>s.delete(old))}},
 async snapshots(){const keys=(await Assets.tx('snap','readonly',s=>s.getAllKeys()))||[];const out=[];if(!Array.isArray(keys))return out;for(const k of keys.sort().reverse()){const v=await Assets.tx('snap','readonly',s=>s.get(k));if(v&&v!==true)out.push({k,at:v.at,tag:v.tag,chars:v.chars})}return out},
 async restoreSnapshot(k){const v=await Assets.tx('snap','readonly',s=>s.get(k));if(!v||v===true||!v.save)throw new Error('找不到這份快照');JSON.parse(v.save);await this.snapshot('before-restore');localStorage.setItem(BAK,localStorage.getItem(KEY)||'');localStorage.setItem(KEY,v.save);this.reload()},
 /* 開機時：若主存檔損毀而備援也沒有，從最新快照復原 */
 async recover(){if(this.loadInfo.src!=='corrupt')return false;const list=await this.snapshots();if(!list.length)return false;const v=await Assets.tx('snap','readonly',s=>s.get(list[0].k));if(!v||!v.save)return false;try{this.S=this.migrate(JSON.parse(v.save));OC.S=this.S;this.loadInfo.src='snapshot';return true}catch(e){return false}},

 /* ---------- 素材參照：存檔中所有用到的圖片／動畫格 ---------- */
 refs(S=this.S){const set=new Set();for(const c of S.chars){if(c.img)set.add(c.img);if(c.anim&&c.anim.frames)for(const L of Object.values(c.anim.frames))(L||[]).forEach(k=>set.add(k))}
  for(const c of S.creations||[]){if(c.img)set.add(c.img);if(c.frames)for(const L of Object.values(c.frames))(L||[]).forEach(k=>set.add(k))}return[...set]},
 /* 清除沒有被任何存檔或快照使用的素材 */
 async gc(){const used=new Set(this.refs());for(const s of await this.snapshots()){const v=await Assets.tx('snap','readonly',st=>st.get(s.k));try{this.refs(JSON.parse(v.save)).forEach(k=>used.add(k))}catch(e){}}
  let n=0;for(const k of await Assets.keys()){if(!used.has(k)){await Assets.del(k);n++}}return n},

 /* ---------- 完整備份（存檔＋所有素材） ---------- */
 async exportAll(){this.validate();const S=JSON.parse(JSON.stringify(this.S));const assets={},missing=[];for(const k of this.refs(S)){const v=await Assets.get(k);if(v)assets[k]=v;else missing.push(k)}
  return JSON.stringify({app:'oc-shimeji',kind:'backup',v:VER,at:Date.now(),save:S,assets,missing})},
 async importAll(text){const o=JSON.parse(text);if(!o||o.app!=='oc-shimeji'||o.kind!=='backup'||!o.save||typeof o.save!=='object')throw new Error('不是 OC Shimeji 完整備份檔');
  if(!Array.isArray(o.save.chars))throw new Error('備份內容不完整（沒有角色資料）');
  for(const [k,v] of Object.entries(o.assets||{}))if(typeof k==='string'&&k.length<80&&typeof v==='string'&&/^data:image\//.test(v))await Assets.put(k,v);
  await this.snapshot('before-import');const s=this.migrate(o.save);const keep=this.S;this.S=s;OC.S=s;this.validate(s);this.S=keep;OC.S=keep;
  localStorage.setItem(BAK,localStorage.getItem(KEY)||'');localStorage.setItem(KEY,JSON.stringify(s));this.reload()},
 /* ---------- 角色包：角色＋圖片＋動畫格＋穿戴中的工坊飾品 ---------- */
 async exportChar(id){const c=this.S.chars.find(c=>c.id===id);if(!c)return null;const ch=JSON.parse(JSON.stringify(c));ch.memories=[];ch.counters={};ch.wishes=[];
  const o={app:'oc-shimeji',kind:'char',v:VER,char:ch,assets:{},creations:[]};const keys=[];if(c.img)keys.push(c.img);if(c.anim&&c.anim.frames)for(const L of Object.values(c.anim.frames))keys.push(...(L||[]));
  for(const w of c.wear||[]){const cr=(this.S.creations||[]).find(x=>x.id===w.id);if(cr){o.creations.push(JSON.parse(JSON.stringify(cr)));if(cr.img)keys.push(cr.img)}}
  for(const k of keys){const v=await Assets.get(k);if(v)o.assets[k]=v}return JSON.stringify(o)},
 /* 匯入角色包：一律給新 ID、新素材鍵，不會覆蓋現有角色 */
 async importChar(text){const o=JSON.parse(text);if(!o||o.app!=='oc-shimeji'||o.kind!=='char'||!o.char||typeof o.char!=='object')throw new Error('不是角色檔');
  const A=o.assets||{};const remap=async k=>{if(!k||typeof A[k]!=='string'||!/^data:image\//.test(A[k]))return null;const nk='img_'+U.uid('a');await Assets.put(nk,A[k]);return nk};
  const c=o.char;c.id=U.uid('c');c.img=await remap(c.img);if(c.kind==='image'&&!c.img)c.kind='cat';
  if(c.anim&&c.anim.frames){const F={};for(const [st,L] of Object.entries(c.anim.frames)){F[st]=[];for(const k of L||[]){const nk=await remap(k);if(nk)F[st].push(nk)}}c.anim.frames=F}
  const crMap={};for(const cr of o.creations||[]){if(!cr||!cr.id)continue;const n=Object.assign({},cr,{id:U.uid('cr'),by:cr.by||'匯入'});n.img=await remap(cr.img);if(n.img){OC.S.creations.unshift(n);OC.Creations&&OC.Creations.imgs.set(n.id,Assets.peek(n.img));crMap[cr.id]=n.id}}
  c.wear=(c.wear||[]).map(w=>crMap[w.id]?Object.assign({},w,{id:crMap[w.id]}):null).filter(Boolean);c.memories=[];c.loc='home';c.x=null;return OC.Chars.ensure(c)},

 /* ---------- 舊版 3.2 存檔匯入（不刪除舊資料，可重複執行） ---------- */
 hasLegacy(){try{return !!localStorage.getItem('ocs.v1')}catch(e){return false}},
 async readLegacy(){const J=k=>{try{return JSON.parse(localStorage.getItem(k)||'null')}catch(e){return null}};
  const cfg=J('ocs.v1')||{},eco=J('ocs.eco.v1')||{},items=J('ocs.items.v1')||{},l29=cfg.l29&&cfg.l29.ch||{},comm=cfg.community||{};
  const recs=await new Promise(res=>{try{const r=indexedDB.open('oc-shimeji');r.onsuccess=()=>{const db=r.result;if(!db.objectStoreNames.contains('chars')){db.close();res([]);return}try{const q=db.transaction('chars').objectStore('chars').getAll();q.onsuccess=()=>{res(q.result||[]);db.close()};q.onerror=()=>{res([]);db.close()}}catch(e){res([]);db.close()}};r.onerror=()=>res([]);r.onupgradeneeded=()=>{}}catch(e){res([])}});
  return {cfg,eco,items,l29,comm,recs}},
 async importLegacy(){const L=await this.readLegacy(),S=this.S,C=OC.Content,out=[];
  const pers=d=>{const sl=(d&&d.pers&&d.pers.sl)||{};return{sliders:Object.fromEntries(C.SLIDERS.map(s=>[s.k,Number.isFinite(+sl[s.k])?+sl[s.k]:50])),traits:((d&&d.pers&&d.pers.traits)||[]).filter(t=>C.TRAIT[t]).slice(0,6)}};
  for(const d of OC.DEMOS){const o=(L.cfg.overrides||{})[d.id]||{};const look=Object.assign({},d.look,o.look||{});if(o.body)look.body=o.body;
   const p=pers(o.data);const x=L.l29[d.id]||{};
   out.push(OC.Chars.make({id:d.id,kind:'cat',name:o.name||d.name,look,demo:d.id,profile:Object.assign({},o.data||{}),sliders:p.sliders,traits:(p.traits.length?p.traits:OC.Chars.demoTraits(d.id)).concat((x.traits||[]).filter(t=>C.TRAIT[t])),quirks:x.quirks}))}
  for(const r of L.recs){if(!r||!r.id)continue;let img=null;
   if(r.blob instanceof Blob){try{const u=await new Promise((res,rej)=>{const f=new FileReader();f.onload=()=>res(f.result);f.onerror=rej;f.readAsDataURL(r.blob)});img='img_'+r.id;await Assets.put(img,u)}catch(e){img=null}}
   const p=pers(r.data);const x=L.l29[r.id]||{};
   out.push(OC.Chars.make({id:r.id,kind:img?'image':'cat',name:r.name||'夥伴',look:r.look||{},img,facing:r.facing||'right',profile:Object.assign({},r.data||{}),sliders:p.sliders,traits:p.traits.concat((x.traits||[]).filter(t=>C.TRAIT[t])),quirks:x.quirks}))}
  for(const c of out)if(!S.chars.some(x=>x.id===c.id))S.chars.push(c);
  const sel=Array.isArray(L.comm.selected)?L.comm.selected:null;if(sel)S.chars.forEach(c=>{if(out.includes(c))c.onIsland=sel.includes(c.id)||sel.length===0});
  S.coins=Math.max(S.coins,Math.floor(+L.eco.coins||0));S.gems=Math.max(S.gems,Math.floor(+L.eco.gems||0));
  for(const it of (L.items.items||[])){const id=OC.Items.matchLegacy(it);if(id&&it.qty>0)S.inv[id]=Math.max(S.inv[id]||0,Math.min(99,Math.floor(it.qty)))}
  if(L.cfg.active&&S.chars.some(c=>c.id===L.cfg.active))S.activeId=L.cfg.active;
  S.migrated={from:'3.2',at:Date.now(),chars:out.length};
  for(const c of S.chars)OC.Chars.ensure(c);
  this.flush();return out.length}};
OC.Store=Store;
})(window.OC);
