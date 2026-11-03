/* OC Shimeji v4 · 地點場景定義（固定種子生成，地形、擺設、活動點） */
(function(OC){'use strict';
const {U}=OC;
/* 不規則輪廓 */
function outline(cx,cz,rx,rz,seed,n=96,amp=.12,freq=3){const pts=[];for(let i=0;i<n;i++){const a=i/n*Math.PI*2;const k=1+(U.noise2(Math.cos(a)*freq+seed,Math.sin(a)*freq+seed*.7)-.5)*2*amp;pts.push([cx+Math.cos(a)*rx*k,cz+Math.sin(a)*rz*k])}return pts}
function inside(pts,x,z){let c=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){const [xi,zi]=pts[i],[xj,zj]=pts[j];if(((zi>z)!==(zj>z))&&(x<(xj-xi)*(z-zi)/(zj-zi)+xi))c=!c}return c}
function shrink(pts,cx,cz,k){return pts.map(([x,z])=>[cx+(x-cx)*k,cz+(z-cz)*k])}
/* 擺設 → 帶碰撞半徑的物件 */
const S=(type,x,z,o={})=>Object.assign({type,x,z,r:o.r??.4,s:o.s??1},o);
function scatter(rng,n,fn){const a=[];for(let i=0;i<n;i++){const v=fn(rng,i);if(v)a.push(v)}return a}

function base(id,o){return Object.assign({id,kind:'island',land:[],cliffs:[],ponds:[],paths:[],objs:[],spots:{},sea:true,cam:{tx:0,tz:0,D:15},walkPoly:null},o)}
function finalize(sc){sc.walk=(x,z)=>{if(sc.walkPoly&&!inside(sc.walkPoly,x,z))return false;for(const p of sc.ponds)if(inside(p.pts,x,z))return false;for(const c of sc.cliffs)if(inside(c.pts,x,z))return false;return true};
 sc.blocked=(x,z,ign)=>{for(const o of sc.objs){if(o===ign||!o.r||o.flat)continue;const dx=x-o.x,dz=(z-o.z)*1.25;if(dx*dx+dz*dz<o.r*o.r)return o}return null};
 sc.ok=(x,z,ign)=>sc.walk(x,z)&&!sc.blocked(x,z,ign);
 sc.randomPoint=(rng=Math.random,tries=40)=>{const b=sc.bounds;for(let i=0;i<tries;i++){const x=U.lerp(b[0],b[2],rng()),z=U.lerp(b[1],b[3],rng());if(sc.ok(x,z))return{x,z}}return{x:sc.cam.tx,z:sc.cam.tz}};
 sc.near=(x,z,rad=1.2,tries=24)=>{for(let i=0;i<tries;i++){const a=Math.random()*Math.PI*2,r=rad*(.4+Math.random()*.6);const px=x+Math.cos(a)*r,pz=z+Math.sin(a)*r*.8;if(sc.ok(px,pz))return{x:px,z:pz}}return sc.randomPoint()};
 return sc}

/* ================= 家園小島 ================= */
function home(){const rng=U.rng(4021);const sc=base('home',{cam:{tx:0,tz:.5,D:16},bounds:[-12,-8,12,9]});
 const outer=outline(0,.5,13.2,9.6,1.7,120,.1,2.4);sc.land.push({pts:outer,col:'sand'});
 const grass=outline(0,0,11.6,8.2,5.2,120,.09,2.8);sc.land.push({pts:grass,col:'grass'});
 sc.walkPoly=shrink(outer,0,.5,.93);
 /* 後方高台（2.5D 立體懸崖） */
 const cliff=outline(-6,-7.3,5.6,2.3,9.1,64,.12,2.2);sc.cliffs.push({pts:cliff,h:1.4,col:'grass'});
 const cliff2=outline(7,-7.2,4,1.8,3.3,56,.14,2.4);sc.cliffs.push({pts:cliff2,h:.9,col:'grass'});
 sc.ponds.push({pts:outline(7.4,-.6,1.9,1.2,2.2,48,.12,2)});
 /* 小徑 */
 sc.paths.push({pts:[[-1,-1.6],[-.6,0],[-1,1.8],[1.5,3],[4,3.6],[6.5,4.4]],w:1.1});
 sc.paths.push({pts:[[-1,1.8],[-4.5,2.6],[-7.5,2.4]],w:.9});
 const O=sc.objs;
 /* 高台上的樹 */
 for(let i=0;i<9;i++){const x=U.lerp(-10,-1.5,i/8)+rng()*.6,z=-7.2+rng()*1.4;if(inside(cliff,x,z))O.push(S('tree',x,z,{kind:i%3?'round':'pine',col:i%4===0?'cherry':i%2?'green':'deep',y:1.4,r:0,v:i}))}
 for(let i=0;i<5;i++){const x=U.lerp(4,9.5,i/4),z=-7.3+rng();if(inside(cliff2,x,z))O.push(S('tree',x,z,{kind:'pine',col:'deep',y:.9,r:0,v:i+3}))}
 /* 島邊樹木 */
 [[-10.6,-1.2,'round','green'],[-11,2.4,'fruit','green'],[-9.2,5.4,'round','spring'],[10.2,1.8,'round','autumn'],[10.8,5,'pine','deep'],[9.8,-3.4,'round','green'],[-6.8,6.9,'pine','deep'],[4.2,7.4,'round','spring']].forEach(([x,z,k,c],i)=>O.push(S('tree',x,z,{kind:k,col:c,r:.55,v:i})));
 O.push(S('tree',4.4,-3.4,{kind:'fruit',col:'green',r:.55,v:7,act:'shade',name:'大樹',s:1.25}));
 [[-8.6,-2.8],[8.6,6.4],[-4.2,6.8],[1.6,6.4],[11,-.4]].forEach(([x,z],i)=>O.push(S('bush',x,z,{col:['#6FAE5A','#5C9A4C','#86B85C'][i%3],fl:i%2?'#F08FA5':'#FFFFFF',r:.45,v:i})));
 [[-7.8,4.2,1],[9.4,-1.6,.8],[5.2,6.8,.6],[-11.2,.5,.7]].forEach(([x,z,s],i)=>O.push(S('rock',x,z,{size:s,r:.5*s,v:i})));
 /* 互動擺設 */
 O.push(S('campfire',3.4,1.3,{r:.45,act:'campfire',name:'營火',light:1}));
 O.push(S('bench',-5.8,2.6,{r:.7,act:'bench',name:'長椅',seat:1}));
 O.push(S('bench',5.4,-1.6,{r:.7,act:'bench',name:'池邊長椅',seat:1}));
 O.push(S('well',-9.2,1.6,{r:.55,act:'drink',name:'飲水井'}));
 O.push(S('sign',-1.4,4.6,{r:.3,act:'sign',name:'告示牌'}));
 O.push(S('lamp',1.9,.3,{r:.2,light:2}));O.push(S('lamp',5.6,3.2,{r:.2,light:2}));
 O.push(S('picnic',-3.6,4.4,{r:0,flat:1,act:'picnic',name:'野餐墊'}));
 for(let i=0;i<4;i++)O.push(S('plot',-8.4+i*1.45,-1.4,{r:0,flat:1,act:'garden',plot:i,name:'花圃'}));
 for(let i=0;i<5;i++)O.push(S('fence',-9+i*1.18,-2.4,{r:.3}));
 /* 裝飾小花、草叢 */
 O.push(...scatter(rng,26,(r,i)=>{const p=[U.lerp(-11,11,r()),U.lerp(-4.5,7.8,r())];if(!inside(grass,...p))return null;return S('flowers',p[0],p[1],{cols:[['#F08FA5','#FFFFFF'],['#FFD36E','#F6F0E6'],['#B79CF0','#FFFFFF'],['#F2A65A','#FFD36E']][i%4],r:0,deco:1,v:i%6})}));
 O.push(...scatter(rng,60,(r,i)=>{const p=[U.lerp(-11.5,11.5,r()),U.lerp(-5,8.5,r())];if(!inside(grass,...p))return null;return S('tuft',p[0],p[1],{r:0,deco:1,v:i%5})}));
 sc.spots={door:{x:-1,z:-1.6},stargaze:{x:1,z:5.6},sunset:{x:-1,z:7.4},view:{x:-9.6,z:3.6}};
 sc.houseDefault={x:-1,z:-2.6};
 sc.houseZone=(x,z)=>inside(grass,x,z)&&!inside(cliff,x,z)&&!inside(cliff2,x,z);
 return finalize(sc)}

/* ================= 中央廣場 ================= */
function plaza(){const rng=U.rng(77);const sc=base('plaza',{cam:{tx:0,tz:.5,D:15},bounds:[-11,-6,11,8]});
 const outer=outline(0,.5,12.6,8.8,3.1,120,.07,2.2);sc.land.push({pts:outer,col:'sand'});
 sc.land.push({pts:outline(0,0,11.2,7.8,2.4,120,.06,2.6),col:'grass'});
 sc.land.push({pts:outline(0,.6,5.4,3.6,8.8,72,.03,2),col:'stone'});
 sc.walkPoly=shrink(outer,0,.5,.93);
 sc.paths.push({pts:[[-10,2.4],[-5,1.2]],w:1.2,col:'stone'});sc.paths.push({pts:[[5,1.2],[10,2.6]],w:1.2,col:'stone'});sc.paths.push({pts:[[0,4],[0,8]],w:1.4,col:'stone'});
 const O=sc.objs;
 O.push(S('fountain',0,.4,{r:1.4,act:'fountain',name:'噴水池',splash:1}));
 O.push(S('shop',-5.6,-3.6,{r:1.7,act:'shop',name:'雜貨店',c:'#F3E6CF',awn:'#7FB65A',shop:'general'}));
 O.push(S('shop',0,-4.6,{r:1.7,act:'cafe',name:'咖啡館',c:'#E8D3B8',awn:'#C8664F',shop:'cafe'}));
 O.push(S('shop',5.8,-3.6,{r:1.7,act:'boutique',name:'禮品店',c:'#F6E3EA',awn:'#B79CF0',shop:'gift'}));
 O.push(S('stall',-8,3.2,{r:1,act:'market',name:'今日市集',c:'#E58C7A'}));
 O.push(S('bench',-3.4,3.6,{r:.7,act:'bench',name:'長椅',seat:1}));O.push(S('bench',3.4,3.6,{r:.7,act:'bench',name:'長椅',seat:1}));
 [[-4.6,1.4],[4.6,1.4],[-2.8,-1.8],[2.8,-1.8]].forEach(([x,z])=>O.push(S('lamp',x,z,{r:.2,light:2})));
 [[-10,-2],[10,-1.5],[-8.8,5.6],[8.8,5.8],[-2.4,7.3],[2.6,7.4]].forEach(([x,z],i)=>O.push(S('tree',x,z,{kind:i%3===0?'pine':'round',col:i%2?'spring':'green',r:.55,v:i})));
 [[-6.8,6.2],[6.4,6.6],[9.6,2.4]].forEach(([x,z],i)=>O.push(S('bush',x,z,{col:'#6FAE5A',fl:['#F08FA5','#FFD36E','#B79CF0'][i],r:.45,v:i})));
 O.push(...scatter(rng,30,(r,i)=>{const p=[U.lerp(-10.5,10.5,r()),U.lerp(-5,8,r())];if(inside(sc.land[2].pts,...p)||!inside(sc.land[1].pts,...p))return null;return S(i%3?'tuft':'flowers',p[0],p[1],{cols:[['#F08FA5','#FFF'],['#FFD36E','#FFF']][i%2],r:0,deco:1,v:i%5})}));
 sc.spots={cafeDoor:{x:0,z:-2.6},shopDoor:{x:-5.6,z:-1.6},giftDoor:{x:5.8,z:-1.6},stage:{x:0,z:5}};
 return finalize(sc)}

/* ================= 星砂海灘 ================= */
function beach(){const rng=U.rng(919);const sc=base('beach',{cam:{tx:0,tz:-.5,D:15.5},bounds:[-12,-7,12,4]});
 const outer=[];for(let i=0;i<=60;i++){const x=U.lerp(-14,14,i/60);outer.push([x,2.6+Math.sin(x*.5)*.6+U.noise1(x*.3)*.8])}
 outer.push([14,-9],[-14,-9]);sc.land.push({pts:outer,col:'sand'});
 const grassBack=[];for(let i=0;i<=40;i++){const x=U.lerp(-14,14,i/40);grassBack.push([x,-5.2+U.noise1(x*.4+3)*1.4])}grassBack.push([14,-9],[-14,-9]);sc.land.push({pts:grassBack,col:'grass'});
 sc.walkPoly=outer.map(([x,z])=>[x*.96,z>0?z-.5:z]);
 const O=sc.objs;
 O.push(S('pier',6.4,3.2,{r:0,flat:1}));O.push(S('pier',6.4,4.4,{r:0,flat:1}));O.push(S('pier',6.4,5.6,{r:0,flat:1,act:'fish',name:'碼頭'}));
 sc.pierZone=[[5.2,2],[7.6,2],[7.6,6.4],[5.2,6.4]];
 O.push(S('umbrella',-3.6,-.6,{r:.5}));O.push(S('mat',-3.2,0,{r:0,flat:1,act:'sunbathe',name:'沙灘墊'}));
 [[-9.6,-3],[-6.6,-4.2],[9.8,-3.4],[2.4,-4.6],[-12,-1]].forEach(([x,z],i)=>O.push(S('tree',x,z,{kind:'palm',r:.4,v:i})));
 [[-7.6,1.4,.8],[10.6,.8,1.1],[0,-3.2,.6]].forEach(([x,z,s],i)=>O.push(S('rock',x,z,{size:s,r:.5*s,v:i})));
 O.push(S('log',3,-2,{r:.7,act:'bench',name:'漂流木',seat:1}));
 O.push(S('campfire',-.6,-1.6,{r:.45,act:'campfire',name:'營火',light:1}));
 sc.spots={fish:{x:6.4,z:5.9},sunset:{x:-1,z:1.6},shells:{x:-5,z:1.8}};
 sc.walk0=sc.walk;
 const r=finalize(sc);const w=r.walk;r.walk=(x,z)=>w(x,z)||inside(sc.pierZone,x,z);return r}

/* ================= 微風森林 ================= */
function forest(){const rng=U.rng(313);const sc=base('forest',{cam:{tx:0,tz:.5,D:15},bounds:[-11,-6,11,8],sea:true});
 const outer=outline(0,.5,12.8,9,6.6,120,.1,2.6);sc.land.push({pts:outer,col:'sand'});
 sc.land.push({pts:outline(0,0,11.8,8.2,1.2,120,.08,3),col:'forest'});
 sc.walkPoly=shrink(outer,0,.5,.9);
 sc.ponds.push({pts:[[3.5,-8],[4.6,-4],[5.4,-1.5],[6.8,1.4],[8.6,4.2],[10,8],[9,8.3],[7.5,4.6],[5.8,1.8],[4.4,-1],[3.6,-3.6],[2.6,-8]],stream:1});
 sc.paths.push({pts:[[-9,4],[-4,2],[0,1.5],[3.6,0],[7,-.5],[10,-.6]],w:1});
 const bridge=S('bridge',6.4,0,{r:0,flat:1});sc.objs.push(bridge);sc.bridgeZone=[[5,-1],[8,-1],[8,.8],[5,.8]];
 const O=sc.objs;const clear=(x,z)=>Math.hypot(x+1,(z-.5)*1.3)<4.2;
 for(let i=0;i<46;i++){const x=U.lerp(-11.5,11.5,rng()),z=U.lerp(-7.5,8,rng());if(clear(x,z)||!inside(sc.land[1].pts,x,z))continue;let bad=false;for(const p of sc.ponds)if(inside(p.pts,x,z)||inside(p.pts,x+.8,z)||inside(p.pts,x-.8,z))bad=true;if(bad||Math.abs(z-(1.5-(x+9)*.15))<1&&x<7)continue;
  O.push(S('tree',x,z,{kind:rng()<.45?'pine':'round',col:rng()<.15?'autumn':rng()<.5?'deep':'green',r:.5,v:i%6,s:U.lerp(.9,1.25,rng())}))}
 [[-3,-1.8],[1.4,3.2],[-6,4.8],[2.2,-2.6]].forEach(([x,z])=>O.push(S('mushrooms',x,z,{r:0,act:'forage',name:'蘑菇叢',deco:0})));
 O.push(S('stump',-1,.4,{r:.35,act:'bench',name:'樹墩',seat:1}));O.push(S('log',-3.8,3,{r:.7,act:'bench',name:'倒木',seat:1}));
 [[-5.2,-.8],[2.6,2.2],[-2.2,5.6]].forEach(([x,z],i)=>O.push(S('bush',x,z,{col:'#5C9A4C',fl:i===1?'#3E5BA8':null,r:.4,v:i,act:i===1?'berries':null,name:'莓果叢'})));
 O.push(...scatter(rng,40,(r,i)=>{const p=[U.lerp(-11,11,r()),U.lerp(-6,8,r())];if(!inside(sc.land[1].pts,...p))return null;for(const q of sc.ponds)if(inside(q.pts,...p))return null;return S(i%4?'tuft':'flowers',p[0],p[1],{col:'#5C9A4C',cols:[['#B79CF0','#FFF'],['#FFD36E','#FFF']][i%2],r:0,deco:1,v:i%5})}));
 sc.spots={shade:{x:-1,z:-.6},clearing:{x:-1,z:1},stream:{x:4.2,z:2.4}};
 const r=finalize(sc);const w=r.walk;r.walk=(x,z)=>w(x,z)||(inside(sc.bridgeZone,x,z)&&inside(sc.walkPoly,x,z));return r}

/* ================= 屋內 ================= */
function room(){const sc=base('house',{kind:'room',sea:false,cam:{tx:0,tz:.2,D:13.5},bounds:[-3.6,-2.4,3.6,2.4]});
 sc.walkPoly=[[-3.7,-2.5],[3.7,-2.5],[3.7,2.5],[-3.7,2.5]];sc.room={w:8,d:5.4,h:3};
 sc.spots={door:{x:0,z:2.3}};return finalize(sc)}

const Scenes={cache:{},get(id){return this.cache[id]||(this.cache[id]=({home,plaza,beach,forest,house:room})[id]())},inside,outline,S,
 /* 房子作為擺設加入家園 */
 syncHouse(){const sc=this.get('home'),H=OC.S.world.house;sc.objs=sc.objs.filter(o=>o.type!=='house');
  if(H&&H.placed){sc.objs.push(S('house',H.x,H.z,{style:H.style,r:0,box:[-2,-2.9,2,.25],act:'enter',name:'我的家',light:3}));sc.spots.door={x:H.x,z:H.z+.9};
   /* 擋到房子的花草移開 */
   sc.objs=sc.objs.filter(o=>!(o.deco&&Math.abs(o.x-H.x)<2.2&&o.z<H.z+.6&&o.z>H.z-3))}
  /* 房子的碰撞為矩形 */
  const b=sc.blocked;sc.blocked=(x,z,ign)=>{for(const o of sc.objs)if(o.box&&o!==ign&&x>o.x+o.box[0]&&x<o.x+o.box[2]&&z>o.z+o.box[1]&&z<o.z+o.box[3])return o;return b(x,z,ign)};
  sc.ok=(x,z,ign)=>sc.walk(x,z)&&!sc.blocked(x,z,ign)},
 /* 屋內家具 */
 syncFurn(){const sc=this.get('house'),F=OC.S.world.houseFurn||[];
  sc.objs=F.map(f=>{if(String(f.k).startsWith('cr')){const c=OC.Creations&&OC.Creations.get(f.k);if(!c)return null;const U2={seat:['sofa',1],bed:['sleep',1],table:['eat',1],light:[null,0],shelf:['read',0],decor:[null,0]}[c.use||'decor']||[null,0];
    return S('cfurn',f.x,f.z,{k:f.k,cid:f.k,id:f.id,r:(c.size||1)*.42,act:U2[0],seat:U2[1],name:c.name,light:c.use==='light'?2:0,creation:1})}
   return S('furn',f.x,f.z,{k:f.k,id:f.id,r:FR[f.k]??.6,flat:f.k==='rug',act:FA[f.k],name:FN[f.k],seat:['sofa','bed','table','chair'].includes(f.k)?1:0,light:['lamp','lantern','fireplace'].includes(f.k)?2:0})}).filter(Boolean);
  /* 屋內的門：玩家與夥伴都從這裡出去 */
  sc.objs.push(S('rdoor',-2.7,-2.62,{r:0,act:'exit',name:'出門',zb:-.5}))},
 syncBuilds(){const sc=this.get('home');sc.objs=sc.objs.filter(o=>o.type!=='cbuild');for(const b of (OC.S.world.builds||[])){const c=OC.Creations&&OC.Creations.get(b.cid);if(!c)continue;sc.objs.push(S('cbuild',b.x,b.z,{cid:b.cid,id:b.id,r:(c.size||3)*.38,name:c.name,creation:1}))}OC.R&&OC.R.invalidate&&OC.R.invalidate()},
 canPlaceHouse(x,z){const sc=this.get('home');if(!sc.houseZone(x,z)||!sc.houseZone(x-1.6,z)||!sc.houseZone(x+1.6,z)||!sc.houseZone(x-1.4,z-2)||!sc.houseZone(x+1.4,z-2))return false;
  for(const o of sc.objs){if(o.type==='house'||o.deco)continue;if(o.x>x-2.6&&o.x<x+2.6&&o.z>z-3.2&&o.z<z+1.3)return false}
  for(const p of sc.ponds)if(inside(p.pts,x,z)||inside(p.pts,x+1.5,z))return false;return true}};
const FR={bed:.9,table:.75,kitchen:.8,shelf:.6,lamp:.25,plant:.3,rug:0,sofa:.85,radio:.35,bath:.7,chair:.35,wardrobe:.6,desk:.6,fireplace:.7,clock:.3,bowl:.35,piano:.8,lantern:.2,flowerbed:.5};
const FA={bed:'sleep',table:'eat',kitchen:'cook',shelf:'read',sofa:'sofa',radio:'music',bath:'bathe',plant:'water',lamp:null,rug:null,chair:'sofa',desk:'read',piano:'music',fireplace:'campfire',bowl:null,clock:null,wardrobe:null,lantern:null,flowerbed:null};
const FN={bed:'床',table:'餐桌',kitchen:'廚房',shelf:'書櫃',sofa:'沙發',radio:'收音機',bath:'浴桶',plant:'植物',lamp:'立燈',rug:'地毯',chair:'木椅',wardrobe:'衣櫃',desk:'書桌',fireplace:'壁爐',clock:'落地鐘',bowl:'金魚缸',piano:'小鋼琴',lantern:'提燈',flowerbed:'花箱'};
OC.Scenes=Scenes;
})(window.OC);
