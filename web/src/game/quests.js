/* OC Shimeji v4 · 每日任務、每週目標、成就、商店輪替 */
(function(OC){'use strict';
const {U,Content:C}=OC;
const POOL=[
 {k:'pet',t:'摸摸夥伴 5 下',n:5,r:40},{k:'feed',t:'餵夥伴吃東西 2 次',n:2,r:50},{k:'loot:fish',t:'釣到 1 條魚',n:1,r:60},{k:'loot:col',t:'撿到 3 件收藏',n:3,r:60},
 {k:'loot:bug',t:'抓到 1 隻昆蟲',n:1,r:60},{k:'act:garden',t:'照顧花圃 2 次',n:2,r:45},{k:'act:cafe',t:'有夥伴去咖啡館',n:1,r:40},{k:'comfort',t:'夥伴互相安慰 1 次',n:1,r:70},
 {k:'gift',t:'送禮物給夥伴',n:1,r:50},{k:'visit',t:'造訪 3 個不同地點',n:3,r:55},{k:'act:read',t:'夥伴看書 1 次',n:1,r:40},{k:'wish',t:'實現 1 個願望',n:1,r:80},{k:'buy',t:'在商店購買 1 件物品',n:1,r:30}];
const Quests={
 ensure(){const Q=OC.S.quests,d=U.dayKey();if(Q.day===d&&Q.list.length)return false;
  /* 每日登入獎勵、連續天數 */
  const y=U.dayKey(new Date(Date.now()-864e5));Q.streak=Q.last===y?(Q.streak||0)+1:1;Q.last=d;
  const r=U.rng(U.hash(d));const pool=[...POOL];const list=[];while(list.length<4&&pool.length){const i=Math.floor(r()*pool.length);list.push(Object.assign({p:0,done:0},pool.splice(i,1)[0]))}
  Q.day=d;Q.list=list;Q.visited=[];const bonus=20+Math.min(6,Q.streak)*5;OC.Items.coins(bonus);OC.Shop.rotate();setTimeout(()=>OC.UI&&OC.UI.toast(`每日登入 +${bonus} 星幣（連續 ${Q.streak} 天）`,'star'),1800);return true},
 on(k,c){const Q=OC.S.quests;if(!Q.list)return;
  if(k.startsWith('loc:')){Q.visited=Q.visited||[];const l=k.slice(4);if(!Q.visited.includes(l))Q.visited.push(l);k='visit'}
  for(const q of Q.list){if(q.done||q.p>=q.n)continue;if(q.k===k||(k.startsWith('loot:')&&q.k==='loot:col'&&k==='loot:col')){q.p=k==='visit'?Q.visited.length:q.p+1;if(q.p>=q.n){U.emit('quest',q);OC.UI&&OC.UI.toast(`任務達成：${q.t}`,'quest')}}}
  U.emit('quests')},
 claim(q){if(q.done||q.p<q.n)return false;q.done=1;OC.Items.coins(q.r);OC.UI&&OC.UI.toast(`領取 +${q.r} 星幣`,'coin');U.buzz(14);OC.Store.save();U.emit('quests');return true},
 ready(){return(OC.S.quests.list||[]).filter(q=>!q.done&&q.p>=q.n).length}};
/* 商店：每天輪替，部分商品特價 */
const Shop={
 SHOPS:{general:{t:'雜貨店',cats:['food','drink','medicine','care','seed']},cafe:{t:'咖啡館',cats:['food','drink'],tags:['sweet','hot']},gift:{t:'禮品店',cats:['gift','toy','furn']}},
 rotate(){const d=U.dayKey(),r=U.rng(U.hash('shop'+d));const out={};for(const [k,s] of Object.entries(this.SHOPS)){let items=C.ITEMS.filter(i=>s.cats.includes(i.cat)&&i.price>0&&!i.forage);if(s.tags)items=items.filter(i=>i.tags.some(t=>s.tags.includes(t))||i.cat==='drink');
  const pick=[];const pool=[...items];const n=Math.min(pool.length,k==='general'?10:8);const must=k==='general'?['medicine','soup','apple','onigiri','soap']:[];for(const m of must){const i=pool.findIndex(x=>x.id===m);if(i>=0)pick.push(pool.splice(i,1)[0].id)}
  while(pick.length<n&&pool.length)pick.push(pool.splice(Math.floor(r()*pool.length),1)[0].id);out[k]={day:d,items:pick,sale:pick[Math.floor(r()*pick.length)]}}OC.S.shop=out;OC.Store.save()},
 stock(k){if(!OC.S.shop||!OC.S.shop[k]||OC.S.shop[k].day!==U.dayKey())this.rotate();return OC.S.shop[k]},
 price(k,id){const it=C.ITEM[id],s=this.stock(k);return s.sale===id?Math.round(it.price*.7):it.price},
 buy(k,id,n=1){const p=this.price(k,id)*n;if(OC.S.coins<p){OC.UI&&OC.UI.toast('星幣不夠喔','warn');return false}
  /* 家具不重複購買 */
  const it=C.ITEM[id];if(it.cat==='furn'&&((OC.S.world.houseFurn||[]).some(f=>f.k===it.furn)||OC.Items.qty(id))){OC.UI&&OC.UI.toast('已經有這件家具了','info');return false}
  if(!OC.Items.coins(-p))return false;OC.Items.add(id,n);OC.Quests.on('buy');OC.Store.flush();return true},
 sell(id,n=1){const it=C.ITEM[id];if(!it||!it.sell||OC.Items.qty(id)<n)return false;OC.Items.take(id,n);OC.Items.coins(it.sell*n);OC.Store.flush();return true}};
OC.Quests=Quests;OC.Shop=Shop;
})(window.OC);
