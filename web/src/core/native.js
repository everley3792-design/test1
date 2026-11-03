/* OC Shimeji v4 · Android 原生橋接（只開放必要功能；資料單向序列化，不讓匯入內容直接呼叫系統能力） */
(function(OC){'use strict';
const {U}=OC;
const N={
 has(){return !!(window.OCNative&&typeof window.OCNative.setPets==='function')},
 call(n,...a){try{if(!this.has()||typeof window.OCNative[n]!=='function')return null;return window.OCNative[n](...a.map(x=>typeof x==='string'?x:JSON.stringify(x)))}catch(e){console.warn('native',n,e);return null}},
 init(){if(!this.has())return;window.OCNativeEvent=s=>{try{this.onEvent(JSON.parse(s))}catch(e){}};this.syncPets(true);this.pullPetEvents()},
 vibrate(ms){this.call('vibrate',String(ms|0))},
 saveFile(name,text){this.call('saveFile',String(name).replace(/[^\w一-鿿.\-]/g,'_'),text)},
 settings(){this.call('openPetSettings')},
 overlayAllowed(){return this.call('canDrawOverlays')==='true'},
 onEvent(e){if(e.type==='overlay'){OC.UI&&OC.UI.toast(e.ok?'已允許懸浮視窗':'未允許懸浮視窗，桌寵無法顯示',e.ok?'check':'warn');if(e.ok)this.syncPets(true)}
  if(e.type==='petEvents')this.applyEvents(e.list||[])},
 /* 桌寵：把角色的部位點陣圖、支點、台詞與狀態交給原生服務繪製 */
 async syncPets(force){if(!this.has())return;const S=OC.S;const ids=S.petIds.filter(id=>S.chars.some(c=>c.id===id));
  if(!ids.length){this.call('stopPets');this._sig='';return}
  const chars=ids.map(id=>S.chars.find(x=>x.id===id));
  const sig=U.hash(JSON.stringify([chars.map(c=>[c.id,c.name,c.kind,c.img,c.look,c.scale]),S.settings.petSize,S.settings.pet]));
  const lines=c=>({idle:[...new Set([0,1,2].map(()=>OC.Chars.line(c,'idle')).filter(Boolean))],pet:[...new Set([0,1].map(()=>OC.Chars.line(c,'pet')).filter(Boolean))].concat(['好舒服～']),drop:[OC.Chars.line(c,'drop')||'哇啊！']});
  if(!force&&sig===this._sig){this.call('updatePetState',chars.map(c=>({id:c.id,mood:c.mood,sick:c.health.sick,lines:lines(c)})));return}
  const pets=[];for(const c of chars){let r=OC.Rig.get(c);for(let i=0;!r&&i<40;i++){await new Promise(res=>setTimeout(res,100));r=OC.Rig.get(c)}if(!r)continue;
   const layers={};if(r.kind==='image')layers.whole={png:r.image.cv.toDataURL('image/png'),ox:0,oy:0,w:r.image.w,h:r.image.h};else for(const [k,L] of Object.entries(r.L)){if(k.startsWith('head_')&&!['head_neutral','head_blink','head_joy','head_sleep','head_wow','head_worry'].includes(k))continue;layers[k]={png:L.cv.toDataURL('image/png'),ox:L.ox,oy:L.oy}}
   pets.push({id:c.id,name:c.name,kind:r.kind,rs:OC.Rig.RS,piv:r.piv||null,layers,scale:(c.scale||1)*((S.settings.pet&&S.settings.pet.size)||S.settings.petSize||100)/100,quirks:c.quirks,mood:c.mood,sick:c.health.sick,lines:lines(c)})}
  const P=Object.assign({roam:true,climb:true,appAware:false,talk:'normal'},S.settings.pet||{});const cfg={battery:!!P.battery,fps:P.battery?20:30,roam:!!P.roam,climb:!!P.climb,appAware:!!P.appAware,talk:P.talk};
  this._sig=sig;this.call('setPets',{pets,cfg})},
 pullPetEvents(){if(!this.has())return;const s=this.call('pullPetEvents');if(!s)return;try{this.applyEvents(JSON.parse(s))}catch(e){}},
 applyEvents(list){let n=0;for(const e of list){const c=OC.S.chars.find(x=>x.id===e.id);if(!c)continue;if(e.type==='pet'){c.needs.comfort=Math.min(100,c.needs.comfort+2);c.needs.social=Math.min(100,c.needs.social+2);c.bond+=1;n++}else if(e.type==='drop'){c.emo.joy=Math.min(1,c.emo.joy+.02)}}
  if(n){OC.Sim.log(null,`你在桌面上摸了夥伴 ${n} 次`,'hand');OC.Store.save()}}};
OC.Native=N;
})(window.OC);
