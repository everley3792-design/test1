/* OC Shimeji v4 · 存檔、版本遷移、素材資料庫、舊版 3.2 匯入 */
(function(OC){'use strict';
const {U}=OC;
const KEY='ocs4.save',BAK='ocs4.save.bak',VER=4;

/* ---------- 素材資料庫（IndexedDB；匯入圖片等大型資料不放 localStorage） ---------- */
const Assets={db:null,mem:new Map(),
 open(){if(this.db)return Promise.resolve(this.db);return new Promise(res=>{try{const r=indexedDB.open('ocs4',1);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains('kv'))d.createObjectStore('kv')};r.onsuccess=()=>{this.db=r.result;res(this.db)};r.onerror=()=>res(null);r.onblocked=()=>res(null)}catch(e){res(null)}})},
 async get(k){if(this.mem.has(k))return this.mem.get(k);const d=await this.open();if(!d)return null;return new Promise(res=>{try{const q=d.transaction('kv').objectStore('kv').get(k);q.onsuccess=()=>{if(q.result!=null)this.mem.set(k,q.result);res(q.result??null)};q.onerror=()=>res(null)}catch(e){res(null)}})},
 async put(k,v){this.mem.set(k,v);const d=await this.open();if(!d)return;return new Promise(res=>{try{const t=d.transaction('kv','readwrite');t.objectStore('kv').put(v,k);t.oncomplete=res;t.onerror=res}catch(e){res()}})},
 async del(k){this.mem.delete(k);const d=await this.open();if(!d)return;return new Promise(res=>{try{const t=d.transaction('kv','readwrite');t.objectStore('kv').delete(k);t.oncomplete=res;t.onerror=res}catch(e){res()}})}};

/* ---------- 預設值 ---------- */
const PERF={
 quality:{fps:60,scale:2.5,shadows:2,particles:1,ambient:2,cloudShadow:1,maxChars:12,bgTick:1},
 balanced:{fps:60,scale:1.75,shadows:1,particles:.6,ambient:1,cloudShadow:1,maxChars:10,bgTick:1},
 battery:{fps:30,scale:1.15,shadows:1,particles:.2,ambient:0,cloudShadow:0,maxChars:6,bgTick:.5}};
const defaults=()=>({v:VER,created:Date.now(),lastSeen:Date.now(),
 settings:{theme:'system',motion:'system',perf:'balanced',custom:Object.assign({},PERF.balanced),bubbles:true,haptics:true,names:true,negEvents:true,romance:true,autoSocial:true,petSize:100,petMax:2,petBattery:false},
 flags:{introSeen:false,started:false,tutorial:0,tutorialDone:false,houseChosen:false},
 world:{loc:'home',house:null,houseFurn:null,props:{},unlocked:['home','house','plaza','beach','forest'],timeOffset:0,weather:null,garden:{}},
 chars:[],activeId:null,petIds:[],
 rel:{},
 inv:{},coins:120,gems:0,
 codex:{},quests:{day:'',list:[],weekly:null,streak:0,last:''},
 log:[],pending:[],migrated:null});

const Store={S:null,_t:0,
 load(){let s=null;try{s=JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){}
  if(!s){try{s=JSON.parse(localStorage.getItem(BAK)||'null')}catch(e){}}
  const d=defaults();
  if(s&&typeof s==='object'){s=this.migrate(s);
   /* 深合併設定，確保新欄位存在 */
   for(const k of ['settings','flags','world','quests'])s[k]=Object.assign({},d[k],s[k]||{});
   s.settings.custom=Object.assign({},PERF.balanced,s.settings.custom||{});
   for(const k of Object.keys(d))if(s[k]===undefined)s[k]=d[k];
   this.S=s}else this.S=d;
  OC.S=this.S;return this.S},
 migrate(s){if(!s.v||s.v<VER){s.v=VER}return s},
 isNew(){return !localStorage.getItem(KEY)&&!localStorage.getItem(BAK)},
 save(){clearTimeout(this._t);this._t=setTimeout(()=>this.flush(),400)},
 flush(){clearTimeout(this._t);if(!this.S)return;this.S.lastSeen=Date.now();try{const j=JSON.stringify(this.S);localStorage.setItem(KEY,j);
  /* 每 10 分鐘另存一份備援，避免寫入中斷造成存檔損毀 */
  const now=Date.now();if(!this._bk||now-this._bk>6e5){this._bk=now;localStorage.setItem(BAK,j)}}catch(e){console.warn('save failed',e);OC.UI&&OC.UI.toast&&OC.UI.toast('儲存空間不足，請到設定匯出備份','warn')}
  try{OC.Native&&OC.Native.syncPets&&OC.Native.syncPets()}catch(e){}},
 reset(){localStorage.removeItem(KEY);localStorage.removeItem(BAK);location.reload()},
 PERF,defaults,Assets,
 perf(){const st=this.S.settings;const p=st.perf==='custom'?st.custom:PERF[st.perf]||PERF.balanced;const reduce=st.motion==='reduce'||(st.motion==='system'&&matchMedia('(prefers-reduced-motion: reduce)').matches);return Object.assign({},p,{reduce,particles:reduce?Math.min(p.particles,.25):p.particles})},

 /* ---------- 完整備份（含圖片素材） ---------- */
 async exportAll(){const S=JSON.parse(JSON.stringify(this.S));const assets={};for(const c of S.chars){if(c.img){const v=await Assets.get(c.img);if(v)assets[c.img]=v}}
  return JSON.stringify({app:'oc-shimeji',kind:'backup',v:VER,at:Date.now(),save:S,assets})},
 async importAll(text){const o=JSON.parse(text);if(!o||o.app!=='oc-shimeji'||!o.save)throw new Error('不是 OC Shimeji 備份檔');
  for(const [k,v] of Object.entries(o.assets||{}))if(typeof v==='string'&&/^data:image\//.test(v))await Assets.put(k,v);
  localStorage.setItem(BAK,localStorage.getItem(KEY)||'');localStorage.setItem(KEY,JSON.stringify(this.migrate(o.save)));location.reload()},
 async exportChar(id){const c=this.S.chars.find(c=>c.id===id);if(!c)return null;const o={app:'oc-shimeji',kind:'char',v:VER,char:JSON.parse(JSON.stringify(c)),assets:{}};
  o.char.memories=[];o.char.rel=undefined;if(c.img){const v=await Assets.get(c.img);if(v)o.assets[c.img]=v}return JSON.stringify(o)},
 async importChar(text){const o=JSON.parse(text);if(!o||o.app!=='oc-shimeji'||o.kind!=='char'||!o.char)throw new Error('不是角色檔');
  const c=o.char;const old=c.img;c.id=U.uid('c');if(old&&o.assets&&o.assets[old]){c.img='img_'+c.id;await Assets.put(c.img,o.assets[old])}else c.img=null;return c},

 /* ---------- 舊版 3.2 存檔匯入（不刪除舊資料，可重複執行） ---------- */
 hasLegacy(){try{return !!localStorage.getItem('ocs.v1')}catch(e){return false}},
 async readLegacy(){const J=k=>{try{return JSON.parse(localStorage.getItem(k)||'null')}catch(e){return null}};
  const cfg=J('ocs.v1')||{},eco=J('ocs.eco.v1')||{},items=J('ocs.items.v1')||{},l29=cfg.l29&&cfg.l29.ch||{},comm=cfg.community||{};
  /* IndexedDB 中的自創角色 */
  const recs=await new Promise(res=>{try{const r=indexedDB.open('oc-shimeji');r.onsuccess=()=>{const db=r.result;if(!db.objectStoreNames.contains('chars')){db.close();res([]);return}try{const q=db.transaction('chars').objectStore('chars').getAll();q.onsuccess=()=>{res(q.result||[]);db.close()};q.onerror=()=>{res([]);db.close()}}catch(e){res([]);db.close()}};r.onerror=()=>res([]);r.onupgradeneeded=()=>{}}catch(e){res([])}});
  return {cfg,eco,items,l29,comm,recs}},
 async importLegacy(){const L=await this.readLegacy(),S=this.S,C=OC.Content,out=[];
  const pers=d=>{const sl=(d&&d.pers&&d.pers.sl)||{};return{sliders:Object.fromEntries(C.SLIDERS.map(s=>[s.k,Number.isFinite(+sl[s.k])?+sl[s.k]:50])),traits:((d&&d.pers&&d.pers.traits)||[]).filter(t=>C.TRAIT[t]).slice(0,6)}};
  for(const d of OC.DEMOS){const o=(L.cfg.overrides||{})[d.id]||{};const look=Object.assign({},d.look,o.look||{});if(o.body)look.body=o.body;
   const p=pers(o.data);const x=L.l29[d.id]||{};
   const ch=OC.Chars.make({id:d.id,kind:'cat',name:o.name||d.name,look,demo:d.id,profile:Object.assign({},o.data||{}),sliders:p.sliders,traits:(p.traits.length?p.traits:OC.Chars.demoTraits(d.id)).concat((x.traits||[]).filter(t=>C.TRAIT[t])),quirks:x.quirks});
   out.push(ch)}
  for(const r of L.recs){if(!r||!r.id)continue;let img=null;
   if(r.blob instanceof Blob){try{const u=await new Promise((res,rej)=>{const f=new FileReader();f.onload=()=>res(f.result);f.onerror=rej;f.readAsDataURL(r.blob)});img='img_'+r.id;await Assets.put(img,u)}catch(e){img=null}}
   const p=pers(r.data);const x=L.l29[r.id]||{};
   out.push(OC.Chars.make({id:r.id,kind:img?'image':'cat',name:r.name||'夥伴',look:r.look||{},img,facing:r.facing||'right',profile:Object.assign({},r.data||{}),sliders:p.sliders,traits:p.traits.concat((x.traits||[]).filter(t=>C.TRAIT[t])),quirks:x.quirks}))}
  /* 合併：已存在的角色不覆蓋 */
  for(const c of out)if(!S.chars.some(x=>x.id===c.id))S.chars.push(c);
  const sel=Array.isArray(L.comm.selected)?L.comm.selected:null;if(sel)S.chars.forEach(c=>{if(out.includes(c))c.onIsland=sel.includes(c.id)||sel.length===0});
  S.coins=Math.max(S.coins,Math.floor(+L.eco.coins||0));S.gems=Math.max(S.gems,Math.floor(+L.eco.gems||0));
  for(const it of (L.items.items||[])){const id=OC.Items.matchLegacy(it);if(id&&it.qty>0)S.inv[id]=Math.max(S.inv[id]||0,Math.min(99,Math.floor(it.qty)))}
  if(L.cfg.active&&S.chars.some(c=>c.id===L.cfg.active))S.activeId=L.cfg.active;
  S.migrated={from:'3.2',at:Date.now(),chars:out.length};
  for(const c of S.chars)OC.Chars.ensure(c);
  this.flush();return out.length}
};
OC.Store=Store;
})(window.OC);
