/* OC Shimeji v4 · 角色資料模型 */
(function(OC){'use strict';
const {U}=OC,C=OC.Content;
const DEMO_TRAITS={mochi:['dreamer','romantic','stargazer','chatty'],yuzu:['nature','gentle','curious','tidy'],sora:['sleepy','calm','homebody','clingy']};
const DEMO_QUIRKS={mochi:{walk:'bouncy',happy:'spin',greet:'wave',sleep:'talk'},yuzu:{walk:'tiptoe',happy:'dance',greet:'bow',eat:'slow'},sora:{walk:'shuffle',happy:'blush',greet:'nod',sleep:'curl',volume:'soft'}};
const DEMO_SL={mochi:{lively:68,social:72,expr:80,pace:60,indep:45,friendly:75},yuzu:{lively:55,social:55,expr:55,pace:45,indep:60,friendly:85},sora:{lively:22,social:40,expr:40,pace:20,indep:35,friendly:65}};
const DEMO_PHRASE={mochi:'閃閃～',yuzu:'呢',sora:'…呼啊'};
const Chars={
 demoTraits:id=>(DEMO_TRAITS[id]||[]).slice(),
 make(o){const id=o.id||U.uid('c');const demo=o.demo||null;
  const c={id,kind:o.kind||'cat',name:o.name||'新夥伴',demo,look:OC.CAT_NORM(o.look||{}),img:o.img||null,facing:o.facing||'right',scale:o.scale||1,
   profile:Object.assign({nick:'',birthday:'',age:'',gender:'',pronoun:'',species:'貓咪',height:'',bio:'',story:'',likes:[],dislikes:[],interests:[],fields:[]},sanitizeProfile(o.profile)),
   sliders:Object.assign(Object.fromEntries(C.SLIDERS.map(s=>[s.k,50])),demo&&DEMO_SL[demo]||{},o.sliders||{}),
   traits:[...new Set((o.traits||[]).filter(t=>C.TRAIT[t]))].slice(0,8),
   quirks:Object.assign({},C.QDEF,demo&&DEMO_QUIRKS[demo]||{},o.quirks||{}),
   phrase:o.phrase??(demo?DEMO_PHRASE[demo]:''),voice:o.voice||'normal',
   lockedTraits:[],declined:{},noSuggest:false,
   foodPref:o.foodPref||null,
   needs:{hunger:80,energy:85,fun:70,social:65,hygiene:90,comfort:75},
   health:{sick:null,since:0,until:0,immune:0},
   mood:'content',moodT:0,emo:{anger:0,sad:0,joy:.3},
   skills:{cooking:0,gardening:0,fishing:0,reading:0,social:0,explore:0,fitness:0,creativity:0},
   counters:{},memories:[],habits:[],wishes:[],
   loc:'home',x:null,z:null,
   onIsland:o.onIsland!==false,isPet:false,
   bond:0,created:Date.now()};
  return this.ensure(c)},
 /* 舊資料補欄位、修正異常值 */
 ensure(c){
  c.look=OC.CAT_NORM(c.look||{});c.needs=Object.assign({hunger:80,energy:85,fun:70,social:65,hygiene:90,comfort:75},c.needs||{});
  for(const k in c.needs)c.needs[k]=U.clamp(+c.needs[k]||0,0,100);
  c.health=Object.assign({sick:null,since:0,until:0,immune:0},c.health||{});
  c.quirks=Object.assign({},C.QDEF,c.quirks||{});c.traits=(c.traits||[]).filter(t=>C.TRAIT[t]);
  c.skills=Object.assign({cooking:0,gardening:0,fishing:0,reading:0,social:0,explore:0,fitness:0,creativity:0},c.skills||{});
  c.counters=c.counters||{};c.memories=c.memories||[];c.habits=c.habits||[];c.wishes=c.wishes||[];c.lockedTraits=c.lockedTraits||[];c.declined=c.declined||{};
  c.emo=Object.assign({anger:0,sad:0,joy:.3},c.emo||{});
  if(!c.foodPref)c.foodPref=Chars.genPref(c);
  if(!C.LOC[c.loc])c.loc='home';
  return c},
 /* 依角色 ID 與特質產生固定的口味偏好（玩家可在編輯器修改） */
 genPref(c){const r=U.rng(U.hash(c.id+'taste'));const p={};for(const [k] of C.TASTES){const v=r();p[k]=v<.1?-2:v<.25?-1:v<.72?0:v<.92?1:2}
  const T=new Set(c.traits||[]);if(T.has('foodie')||T.has('gourmet'))for(const k in p)if(p[k]<0&&r()<.6)p[k]++;if(T.has('picky'))for(const k in p)if(p[k]===0&&r()<.35)p[k]=-1;
  if(c.demo==='mochi'){p.sweet=2;p.spicy=-1}if(c.demo==='yuzu'){p.veg=2;p.fruit=1;p.bitter=1}if(c.demo==='sora'){p.hot=2;p.dairy=1;p.cold=-1}return p},
 taste(c,item){if(!item||!item.tags)return 0;let s=0,n=0;for(const t of item.tags){if(c.foodPref[t]!=null){s+=c.foodPref[t];n++}}if(!n)return 0;const v=s/Math.sqrt(n);return v>=1.6?2:v>=.6?1:v<=-1.6?-2:v<=-.6?-1:0},
 has:(c,t)=>c.traits.includes(t),
 sl:(c,k)=>(c.sliders[k]??50)/100,
 /* 特質加權：行動偏好 */
 aiW(c,act){let w=1;for(const t of c.traits){const d=C.TRAIT[t];if(d&&d.ai&&d.ai[act])w*=d.ai[act]}return w},
 needW(c,need){let w=1;for(const t of c.traits){const d=C.TRAIT[t];if(d&&d.nd&&d.nd[need])w*=d.nd[need]}return w},
 soc(c,k){let w=1;for(const t of c.traits){const d=C.TRAIT[t];if(d&&d.soc)w*=d.soc[k]||1}return w},
 chrono(c){let v=0;for(const t of c.traits){const d=C.TRAIT[t];if(d&&d.chrono)v+=d.chrono}return v},
 typeName(c){const a=Chars.sl(c,'lively'),b=Chars.sl(c,'social'),f=Chars.sl(c,'friendly'),i=Chars.sl(c,'indep');const idx=Math.min(3,Math.floor(a*4))*4+Math.min(3,Math.floor((b*.6+f*.2+(1-i)*.2)*4));return C.TYPES[idx]||C.TYPES[0]},
 sub(c){const T=c.traits.slice(0,2).map(t=>C.TRAIT[t]?.t).filter(Boolean);return T.length?T.join('・'):Chars.typeName(c)[0]},
 line(c,kind){/* 角色專屬台詞：特質台詞 > 性格滑桿語氣 > 共用 */
  const pool=[];for(const t of c.traits){const d=C.TRAIT[t];if(d&&d[kind])pool.push(...d[kind])}
  const TL=C.TONE_LINES[kind];if(TL)for(const [k,[hi,lo]] of Object.entries(TL)){const v=Chars.sl(c,k);if(v>.68&&hi)pool.push(...hi);else if(v<.32&&lo)pool.push(...lo)}
  if(c.demo){const d=OC.DEMOS.find(x=>x.id===c.demo);if(d&&d.lines&&d.lines[kind])pool.push(...d.lines[kind])}
  if(c.customLines&&c.customLines[kind])pool.push(...c.customLines[kind],...c.customLines[kind]);
  return pool.length?Chars.say(c,U.pick(pool)):null},
 /* 口癖與音量 */
 say(c,s){if(!s)return s;if(c.phrase&&Math.random()<.32&&!s.includes(c.phrase))s=/[～！!?？…]$/.test(c.phrase)?s.replace(/[。！!～?？…]*$/,c.phrase):s.replace(/([。！!～?？…]*)$/,c.phrase+'$1');
  if(c.quirks.volume==='loud')s=s.replace(/[。]$/,'！');return s},
 thumbSVG:c=>c.kind==='image'?null:OC.ocSVG({look:c.look})};
function sanitizeProfile(p){p=p&&typeof p==='object'?p:{};const S=(v,n)=>typeof v==='string'?v.slice(0,n):'';const A=v=>Array.isArray(v)?v.filter(x=>typeof x==='string').slice(0,24):[];
 return{nick:S(p.nick,16),birthday:S(p.birthday,12),age:S(p.age,12),gender:S(p.gender,12),pronoun:S(p.pronoun,10),species:S(p.species,16)||'貓咪',height:S(p.height,12),bio:S(p.bio||p.tagline,400),story:S(p.story,1200),likes:A(p.likes),dislikes:A(p.dislikes),interests:A(p.interests),fields:Array.isArray(p.fields)?p.fields.slice(0,30).map(f=>({k:S(f&&f.k,16),v:S(f&&f.v,120)})):[]}}
Chars.sanitizeProfile=sanitizeProfile;

/* ---------- 背包與物品 ---------- */
const Items={
 get:id=>C.ITEM[id],
 qty:id=>OC.S.inv[id]||0,
 add(id,n=1){if(!C.ITEM[id]||!(n>0))return;OC.S.inv[id]=Math.min(999,(OC.S.inv[id]||0)+Math.floor(n));Items.seen(id);OC.Store.save();U.emit('inv')},
 take(id,n=1){const q=OC.S.inv[id]||0;if(q<n)return false;const r=q-n;if(r>0)OC.S.inv[id]=r;else delete OC.S.inv[id];OC.Store.save();U.emit('inv');return true},
 seen(id){const it=C.ITEM[id];if(!it)return;const cx=OC.S.codex;if(!cx[id]){cx[id]={t:Date.now(),n:0};U.emit('codex',id);if(['col','fish','bug'].includes(it.cat)&&OC.UI)OC.UI.toast(`新收藏：${it.em} ${it.name}`,'star')}cx[id].n++},
 list(cat){return Object.entries(OC.S.inv).filter(([id,q])=>q>0&&C.ITEM[id]&&(!cat||C.ITEM[id].cat===cat)).map(([id,q])=>Object.assign({q},C.ITEM[id]))},
 /* 3.2 背包物品名稱對應 */
 matchLegacy(it){const map={'蘋果':'apple','草莓蛋糕':'cake','熱可可':'cocoa','氣泡水':'soda','小毛線球':'yarn','手寫卡片':'card','小花束':'bouquet','緞帶髮飾':'ribbon'};return map[it&&it.name]||null},
 coins(n){if(n<0&&OC.S.coins+n<0)return false;OC.S.coins=Math.max(0,Math.floor(OC.S.coins+n));OC.Store.save();U.emit('coins',n);return true}};
OC.Chars=Chars;OC.Items=Items;
})(window.OC);
