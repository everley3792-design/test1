/* OC Shimeji v4.1 · 工坊作品資料（物品、家具、建築、飾品、角色素材／動畫）與自製事件引擎 */
(function(OC){'use strict';
const {U,Content:C}=OC;
const TYPES={item:{t:'物品',ic:'gift',d:'食物、飲料、玩具、禮物…可以給夥伴使用',w:256,h:256},furn:{t:'家具',ic:'sofa',d:'擺在家裡，夥伴會坐、躺或欣賞',w:320,h:320},build:{t:'建築',ic:'house',d:'放在家園小島的建築或大型擺設',w:448,h:448},acc:{t:'飾品',ic:'ribbon',d:'讓夥伴戴在頭上或身上',w:256,h:256},charart:{t:'角色素材',ic:'users',d:'畫出自己的 OC，做成可以生活的夥伴',w:384,h:448}};
const imgs=new Map();
const Creations={TYPES,imgs,
 all(){return OC.S.creations||(OC.S.creations=[])},
 /* 開機時把作品圖片從 IndexedDB 載入記憶體 */
 async load(){for(const c of this.all()){if(c.img&&!imgs.has(c.id)){const u=await OC.Store.Assets.get(c.img);if(u)imgs.set(c.id,u)}}},
 get(id){return this.all().find(c=>c.id===id)},
 /* 物品化（給背包、商店、角色使用） */
 item(id){const c=this.get(id);if(!c)return null;const cat=c.type==='item'?c.cat:c.type==='furn'?'furn':c.type==='build'?'build':'custom';
  return{id:c.id,name:c.name,desc:c.desc,cat,price:c.price||100,tags:c.tags||[],fx:c.fx||{},gift:c.gift||2,heal:c.heal||0,reuse:c.reuse,sell:Math.round((c.price||100)*.4),img:imgs.get(c.id)||'',custom:1,by:c.by||'我',furnCr:c.type==='furn'?c.id:null,buildCr:c.type==='build'?c.id:null}},
 listed(){return this.all().filter(c=>c.listed!==false&&['item','furn','build'].includes(c.type)).map(c=>this.item(c.id))},
 async save(c,dataUrl){const L=this.all();if(dataUrl){c.img='cr_img_'+c.id;await OC.Store.Assets.put(c.img,dataUrl);imgs.set(c.id,dataUrl);OC.Icons.cache.clear();if(OC.Rig&&OC.Rig.dropImg)OC.Rig.dropImg(c.img)}
  const i=L.findIndex(x=>x.id===c.id);if(i>=0)L[i]=c;else L.unshift(c);OC.Store.flush();U.emit('creations');return c},
 async remove(id){const L=this.all();const c=this.get(id);if(!c)return;OC.S.creations=L.filter(x=>x.id!==id);delete OC.S.inv[id];if(c.img)await OC.Store.Assets.del(c.img);imgs.delete(id);
  OC.S.world.houseFurn=(OC.S.world.houseFurn||[]).filter(f=>f.k!==id);OC.S.world.builds=(OC.S.world.builds||[]).filter(b=>b.cid!==id);for(const ch of OC.S.chars)ch.wear=(ch.wear||[]).filter(w=>w.id!==id);
  OC.Scenes.syncFurn();OC.Scenes.syncBuilds&&OC.Scenes.syncBuilds();OC.Store.flush();U.emit('creations')},
 /* 匯出／匯入作品包（圖片一起打包） */
 async exportPack(ids){const L=this.all().filter(c=>!ids||ids.includes(c.id));const out={app:'oc-shimeji',kind:'creations',v:41,items:[]};for(const c of L){const o=JSON.parse(JSON.stringify(c));o.data=imgs.get(c.id)||(c.img?await OC.Store.Assets.get(c.img):null);
   if(c.frames){o.frameData={};for(const [st,keys] of Object.entries(c.frames)){o.frameData[st]=[];for(const k of keys)o.frameData[st].push(await OC.Store.Assets.get(k))}}out.items.push(o)}return JSON.stringify(out)},
 async importPack(text){const o=JSON.parse(text);if(!o||o.app!=='oc-shimeji'||o.kind!=='creations')throw new Error('不是作品包');let n=0;
  for(const x of o.items||[]){if(!TYPES[x.type])continue;const c=Object.assign({},x,{id:U.uid('cr'),by:x.by||'匯入'});const data=typeof x.data==='string'&&/^data:image\//.test(x.data)?x.data:null;delete c.data;delete c.frameData;
   if(x.frameData){c.frames={};for(const [st,arr] of Object.entries(x.frameData)){c.frames[st]=[];for(const d of arr){if(typeof d==='string'&&/^data:image\//.test(d)){const k=U.uid('fr');await OC.Store.Assets.put(k,d);c.frames[st].push(k)}}}}
   await this.save(c,data);n++}return n},
 /* 飾品：穿戴到角色身上（由 rig 繪製） */
 wear(charId,cid,place){const ch=OC.S.chars.find(c=>c.id===charId);if(!ch)return;ch.wear=(ch.wear||[]).filter(w=>w.id!==cid);if(place)ch.wear.push(Object.assign({id:cid},place));OC.Store.save();U.emit('chars')},
 /* 角色素材 → 夥伴 */
 async toChar(cid){const c=this.get(cid);if(!c)return null;const key='img_'+U.uid('c');await OC.Store.Assets.put(key,imgs.get(cid));const ch=OC.Chars.make({kind:'image',name:c.name||'新夥伴',img:key,traits:[]});ch.anim=c.frames?{frames:c.frames,fps:c.fps||8}:null;
  OC.S.chars.push(ch);OC.Store.flush();U.emit('chars');return ch}};

/* ================= 自製事件引擎 ================= */
const TRIG={item:'收到指定物品',pet:'被摸摸',time:'在某個時段',weather:'遇到某種天氣',place:'到某個地點',meet:'遇到某位夥伴',mood:'處於某種心情'};
const ANIM={none:'無',hop:'跳一跳',spin:'轉圈圈',dance:'跳舞',blush:'臉紅',cry:'掉眼淚',angry:'生氣跺腳',sleep:'打瞌睡',sparkle:'閃閃發亮',hearts:'冒愛心',dizzy:'頭暈'};
const Events={TRIG,ANIM,
 rules(){return OC.S.events||(OC.S.events=[])},
 log(){return OC.S.eventLog||(OC.S.eventLog=[])},
 match(r,a,ctx){if(!r.enabled)return false;if(r.charId&&r.charId!==a.id)return false;const now=Date.now();if(r.last&&now-r.last<(r.cd||10)*60e3)return false;if(Math.random()*100>(r.chance??100))return false;
  const c=a.c;switch(r.trigger){case'item':return ctx.item&&(!r.itemId||r.itemId===ctx.item.id);case'pet':return ctx.pet;case'time':{const h=OC.Env.h;return r.from<=r.to?(h>=r.from&&h<r.to):(h>=r.from||h<r.to)}
   case'weather':return OC.Env.wid===r.weather;case'place':return c.loc===r.place;case'meet':return ctx.meet&&(!r.friend||ctx.meet===r.friend);case'mood':return c.mood===r.mood}return false},
 fill(s,a,ctx){const f=ctx.meet&&OC.S.chars.find(c=>c.id===ctx.meet);return String(s||'').replace(/\{name\}/g,a.c.name).replace(/\{item\}/g,ctx.item?ctx.item.name:'').replace(/\{friend\}/g,f?f.name:'朋友').replace(/\{time\}/g,OC.Env.label().time)},
 /* 執行：preview=true 時不改變任何資料 */
 run(r,a,ctx={},preview){const c=a.c;const lines=(r.lines||'').split('\n').map(s=>s.trim()).filter(Boolean);const line=lines.length?this.fill(U.pick(lines),a,ctx):'';
  const doAnim=()=>{const k=r.anim;if(k==='hop')a.hop(2.2);else if(k==='spin'){let n=0;const iv=setInterval(()=>{a.facing*=-1;if(++n>=6)clearInterval(iv)},110)}else if(k==='dance'){a.pose='cheer';setTimeout(()=>{if(a.pose==='cheer')a.pose='stand'},2200)}
   else if(k==='blush'){a.blushK=3;a.feel('blush')}else if(k==='cry'){a.face='worry';for(let i=0;i<4;i++)setTimeout(()=>OC.Fx.add({k:'drop',x:a.x-.15+(i%2)*.3,z:a.z,y:1.2,vy:-.5,life:.8,sz:.07}),i*300);setTimeout(()=>a.face=null,2400)}
   else if(k==='angry'){a.face='angry';a.feel('anger');let n=0;const iv=setInterval(()=>{a.squash(n%2?.88:1.06);if(++n>=6)clearInterval(iv)},100);setTimeout(()=>a.face=null,2000)}
   else if(k==='sleep'){a.pose='sleep';setTimeout(()=>{if(a.pose==='sleep')a.pose='stand'},3000)}else if(k==='sparkle')OC.Fx.sparkle(a.x,1.2,a.z,14);else if(k==='hearts')OC.Fx.hearts(a.x,1.3,a.z,5);else if(k==='dizzy')OC.Play.dizzy(a,3)};
  if(r.cine&&OC.Store.perf&&!preview){OC.Cine.begin(a,{dur:3.4});OC.Cine.at(.3,()=>{doAnim();if(line)a.say(line,{life:3});if(r.text)OC.Cine.text(r.text,'#F27C9B')})}else{doAnim();if(line)a.say(line,{life:3})}
  if(preview)return;r.last=Date.now();
  const mf=r.moodfx;if(mf==='happy')c.emo.joy=Math.min(1,c.emo.joy+.3);else if(mf==='sad')c.emo.sad=Math.min(1,c.emo.sad+.3);else if(mf==='angry')c.emo.anger=Math.min(1,c.emo.anger+.3);
  for(const [k,v] of Object.entries(r.needs||{}))if(v)c.needs[k]=U.clamp(c.needs[k]+v,0,100);
  if(r.coins)OC.Items.coins(r.coins);if(r.give&&OC.Shop.item(r.give))OC.Items.add(r.give,1);if(ctx.meet&&r.rel)OC.Social.change(a,OC.S.chars.find(x=>x.id===ctx.meet)||ctx.meet,r.rel);
  if(r.memory)OC.Sim.remember(c,'event',this.fill(r.memory,a,ctx),.6);
  const L=this.log();L.unshift({id:U.uid('el'),rid:r.id,title:r.title,cid:c.id,line,t:Date.now()});if(L.length>80)L.length=80;OC.Sim.log(c,`特殊反應「${r.title}」：${c.name}${line?'說：「'+line+'」':''}`,'idea');OC.Store.save()},
 fire(a,ctx){for(const r of this.rules())if(this.match(r,a,ctx)){this.run(r,a,ctx);return r}return null},
 onItem(a,it){return null/* 物品事件在演出結束後觸發，見 hook */},
 tick(){/* 每 20 秒檢查時段／天氣／地點／心情事件（同一角色一次一個） */
  for(const a of OC.Sim.agents.values()){if(a.busy()||a.away||!OC.Sim.visible(a))continue;for(const r of this.rules()){if(['time','weather','place','mood'].includes(r.trigger)&&this.match(r,a,{})){this.run(r,a,{});break}}}}};
setInterval(()=>{try{if(OC.S&&OC.S.flags&&OC.S.flags.started&&!document.hidden)Events.tick()}catch(e){}},20000);
OC.Creations=Creations;OC.Events=Events;
})(window.OC);
