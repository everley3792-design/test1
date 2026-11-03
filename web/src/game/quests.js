/* OC Shimeji v4 · 每日任務、每週目標、成就、商店輪替 */
(function(OC){'use strict';
const {U,Content:C}=OC;
const POOL=[
 {k:'pet',t:'摸摸夥伴 5 下',n:5,r:40},{k:'feed',t:'餵夥伴吃東西 2 次',n:2,r:50},{k:'loot:fish',t:'釣到 1 條魚',n:1,r:60},{k:'loot:col',t:'撿到 3 件收藏',n:3,r:60},
 {k:'loot:bug',t:'抓到 1 隻昆蟲',n:1,r:60},{k:'act:garden',t:'照顧花圃 2 次',n:2,r:45},{k:'act:cafe',t:'有夥伴去咖啡館',n:1,r:40},{k:'comfort',t:'夥伴互相安慰 1 次',n:1,r:70},
 {k:'gift',t:'送禮物給夥伴',n:1,r:50},{k:'visit',t:'造訪 3 個不同地點',n:3,r:55},{k:'act:read',t:'夥伴看書 1 次',n:1,r:40},{k:'wish',t:'實現 1 個願望',n:1,r:80},{k:'buy',t:'在商店購買 1 件物品',n:1,r:30},{k:'plant',t:'在花圃種下 1 朵花',n:1,r:45}];
const Quests={
 ensure(){const Q=OC.S.quests,d=U.dayKey();if(Q.day===d&&Q.list.length)return false;
  /* 每日登入獎勵、連續天數 */
  const y=U.dayKey(new Date(Date.now()-864e5));Q.streak=Q.last===y?(Q.streak||0)+1:1;Q.last=d;
  const r=U.rng(U.hash(d));const pool=[...POOL];const list=[];while(list.length<4&&pool.length){const i=Math.floor(r()*pool.length);list.push(Object.assign({p:0,done:0},pool.splice(i,1)[0]))}
  Q.day=d;Q.list=list;Q.visited=[];setTimeout(()=>U.emit('quests'),0);const bonus=20+Math.min(6,Q.streak)*5;OC.Items.coins(bonus);OC.Shop.rotate();setTimeout(()=>OC.UI&&OC.UI.toast(`每日登入 +${bonus} 星幣（連續 ${Q.streak} 天）`,'star'),1800);return true},
 on(k,c){const Q=OC.S.quests;if(!Q.list)return;
  if(k.startsWith('loc:')){Q.visited=Q.visited||[];const l=k.slice(4);if(!Q.visited.includes(l))Q.visited.push(l);k='visit'}
  for(const q of Q.list){if(q.done||q.p>=q.n)continue;if(q.k===k||(k.startsWith('loot:')&&q.k==='loot:col'&&k==='loot:col')){q.p=k==='visit'?Q.visited.length:q.p+1;if(q.p>=q.n){U.emit('quest',q);OC.UI&&OC.UI.toast(`任務達成：${q.t}`,'quest')}}}
  U.emit('quests')},
 claim(q){if(q.done||q.p<q.n)return false;q.done=1;OC.Items.coins(q.r);OC.Items.xp(Math.round(q.r/2));if(OC.S.quests.list.every(x=>x.done)){OC.S.gems=(OC.S.gems||0)+5;setTimeout(()=>OC.UI&&OC.UI.celebrate(null,'+5 星鑽','今日任務全部完成','gem'),600)}OC.UI&&OC.UI.toast(`領取 +${q.r} 星幣`,'coin');U.buzz(14);OC.Store.save();U.emit('quests');return true},
 ready(){return(OC.S.quests.list||[]).filter(q=>!q.done&&q.p>=q.n).length}};
/* 商店：每天輪替，部分商品特價；創作市集販售玩家在工坊上架的作品 */
const Shop={
 SHOPS:{general:{t:'雜貨店',ic:'shop',c:'#7FB089',bg:'#E7F4E4',hi:'歡迎光臨！今天的蔬菜很新鮮喔。',cats:['food','drink','medicine','care','seed']},
  cafe:{t:'咖啡館',ic:'cocoa',c:'#C8664F',bg:'#FBE7DF',hi:'來杯熱可可，配一塊蛋糕吧～',cats:['food','drink'],tags:['sweet','hot']},
  gift:{t:'禮品店',ic:'gift',c:'#E66C8A',bg:'#FDE6EE',hi:'想送禮物給誰呢？我幫你包裝！',cats:['gift','toy']},
  furniture:{t:'家具店',ic:'sofa',c:'#6E96C2',bg:'#E3EDF8',hi:'讓家裡更溫暖的家具都在這裡。',cats:['furn']},
  market:{t:'創作市集',ic:'palette',c:'#9A78EE',bg:'#EFE8FF',hi:'這裡是大家在工坊做的作品！',creations:1}},
 rotate(){const d=U.dayKey(),r=U.rng(U.hash('shop'+d));const out={};for(const [k,s] of Object.entries(this.SHOPS)){if(s.creations)continue;let items=C.ITEMS.filter(i=>s.cats.includes(i.cat)&&i.price>0&&!i.forage);if(s.tags)items=items.filter(i=>i.tags.some(t=>s.tags.includes(t))||i.cat==='drink');
  const pick=[];const pool=[...items];const n=Math.min(pool.length,k==='general'?10:k==='furniture'?12:8);const must=k==='general'?['medicine','soup','apple','onigiri','soap','seed']:[];for(const m of must){const i=pool.findIndex(x=>x.id===m);if(i>=0)pick.push(pool.splice(i,1)[0].id)}
  while(pick.length<n&&pool.length)pick.push(pool.splice(Math.floor(r()*pool.length),1)[0].id);out[k]={day:d,items:pick,sale:pick[Math.floor(r()*pick.length)]}}OC.S.shop=out;OC.Store.save()},
 stock(k){const S=this.SHOPS[k];if(S&&S.creations){const L=OC.Creations?OC.Creations.listed():[];return{day:U.dayKey(),items:L.map(x=>x.id),sale:null}}
  if(!OC.S.shop||!OC.S.shop[k]||OC.S.shop[k].day!==U.dayKey())this.rotate();return OC.S.shop[k]||{items:[],sale:null}},
 item:id=>C.ITEM[id]||(OC.Creations&&OC.Creations.item(id)),
 price(k,id){const it=this.item(id),s=this.stock(k);if(!it)return 0;return s.sale===id?Math.round(it.price*.7):it.price},
 buy(k,id,n=1){const it=this.item(id);if(!it)return false;const p=this.price(k,id)*n;if(OC.S.coins<p){OC.UI&&OC.UI.toast('星幣不夠喔','warn');return false}
  if(!OC.Items.coins(-p))return false;OC.Items.add(id,n);OC.Quests.on('buy');OC.Items.xp(3*n);OC.Store.flush();return true},
 sell(id,n=1){const it=this.item(id);if(!it||!it.sell||OC.Items.qty(id)<n)return false;OC.Items.take(id,n);OC.Items.coins(it.sell*n);OC.Store.flush();return true}};
OC.Quests=Quests;OC.Shop=Shop;
})(window.OC);
