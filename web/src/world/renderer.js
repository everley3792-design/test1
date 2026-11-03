/* OC Shimeji v4 · 2.5D Canvas 渲染器
   ─ 單一 canvas、單一迴圈：所有場景、角色、天氣、光影、對話泡泡都在這裡繪製，
     DOM 每格零寫入 → 根除 3.x 版因多個動畫迴圈互相覆寫造成的閃爍與破圖。
   ─ 透視相機＋「滾筒世界」彎曲（遠處地面往下彎，露出天空與地平線）。
   ─ 靜態地面圖層快取：相機沒動、光線沒變時只做一次 drawImage。 */
(function(OC){'use strict';
const {U,Env,Sprites:SP}=OC;
const TAU=Math.PI*2;
const GROUND={sand:'#EBDDB5',grass:'#86BE64',forest:'#6FA85A',stone:'#DCD3C2',dirt:'#D9C49B',cliff:'#A79C88',floor:'#C8A47C'};

/* ---------- 相機 ---------- */
class Camera{constructor(){this.tx=0;this.tz=0;this.D=16;this.W=390;this.H=844;this.bend=.011;this.v={tx:0,tz:0,D:0};this.goal=null;this.shake=0}
 setView(W,H){this.W=W;this.H=H}
 update(){const D=this.D;this.ph=this.room?.72:U.clamp(.5+(D-8)*.012,.5,.78);this.sin=Math.sin(this.ph);this.cos=Math.cos(this.ph);
  this.cy=D*this.sin;this.cz=this.tz+D*this.cos;const fov=1.0;this.f=this.H/2/Math.tan(fov/2);this.oy=this.H*(this.room?.55:.57)}
 /* 世界座標 → 螢幕 */
 p(x,y,z,o){const d=this.tz-z;y-=d>0?this.bend*d*d:this.bend*.25*d*d;
  const ry=y-this.cy,rz=z-this.cz;const zc=-ry*this.sin-rz*this.cos;const yc=ry*this.cos-rz*this.sin;const k=this.f/Math.max(.1,zc);
  o=o||{};o.x=this.W/2+(x-this.tx)*k;o.y=this.oy-yc*k;o.s=k;o.d=zc;return o}
 /* 螢幕 → 地面（y=0），迭代修正彎曲 */
 unproject(sx,sy){let z=this.tz,x=this.tx;for(let i=0;i<6;i++){const a=this.p(x,0,z);const b=this.p(x,0,z-.05);const dzdy=-.05/((b.y-a.y)||-1e-3);z+=(sy-a.y)*dzdy;x+=(sx-a.x)/a.s}return{x,z}}
 key(){return(this.tx*100|0)+':'+(this.tz*100|0)+':'+(this.D*100|0)+':'+this.W+':'+this.H}}

/* ---------- 粒子 ---------- */
const Fx={list:[],
 add(p){if(this.list.length>260)return;this.list.push(Object.assign({t:0,life:1,vx:0,vy:0,vz:0,y:0,g:0},p))},
 hearts(x,y,z,n=3){for(let i=0;i<n;i++)this.add({k:'heart',x:x+U.rnd(-.25,.25),z,y:y+U.rnd(0,.2),vy:U.rnd(.6,.9),vx:U.rnd(-.15,.15),life:U.rnd(1.1,1.6),sz:U.rnd(.12,.18),delay:i*.12})},
 sparkle(x,y,z,n=6,col='#FFE7A0'){for(let i=0;i<n;i++)this.add({k:'spark',x,z,y,vx:U.rnd(-.9,.9),vy:U.rnd(.4,1.4),vz:U.rnd(-.4,.4),g:2.2,life:U.rnd(.5,.9),sz:U.rnd(.04,.07),col})},
 dust(x,z,n=4){for(let i=0;i<n;i++)this.add({k:'dust',x:x+U.rnd(-.2,.2),z:z+U.rnd(-.05,.05),y:.02,vx:U.rnd(-.5,.5),vy:U.rnd(.1,.3),life:U.rnd(.35,.6),sz:U.rnd(.06,.11)})},
 note(x,y,z){this.add({k:'note',x:x+U.rnd(-.2,.2),z,y,vy:.5,vx:U.rnd(-.2,.2),life:1.6,sz:.16})},
 splash(x,z,n=6){for(let i=0;i<n;i++)this.add({k:'spark',x,z,y:.05,vx:U.rnd(-.7,.7),vy:U.rnd(.8,1.6),vz:U.rnd(-.3,.3),g:4,life:.6,sz:.05,col:'#E6F6FF'})},
 smoke(x,y,z){this.add({k:'smoke',x:x+U.rnd(-.05,.05),z,y,vy:.45,vx:.12,life:2.4,sz:.18})},
 tick(dt){const L=this.list;for(let i=L.length-1;i>=0;i--){const p=L[i];if(p.delay>0){p.delay-=dt;continue}p.t+=dt;if(p.t>=p.life){L.splice(i,1);continue}p.vy-=p.g*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;if(p.g&&p.y<0){p.y=0;p.vy*=-.3}}}};

/* ---------- 預烘焙的小圖：光暈、雲、雲影 ---------- */
function glowImg(col,size=128){const c=document.createElement('canvas');c.width=c.height=size;const g=c.getContext('2d');const gr=g.createRadialGradient(size/2,size/2,0,size/2,size/2,size/2);const C=U.hex(col);gr.addColorStop(0,U.rgb(C,.9));gr.addColorStop(.35,U.rgb(C,.35));gr.addColorStop(1,U.rgb(C,0));g.fillStyle=gr;g.fillRect(0,0,size,size);return c}
function cloudImg(seed){const r=U.rng(seed);const w=420,h=170,c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');
 const puffs=[];for(let i=0;i<9;i++){const x=U.lerp(70,w-70,i/8)+U.rnd(-12,12),rr=U.lerp(36,70,Math.sin(i/8*Math.PI))+r()*14;puffs.push([x,h-38-rr*.55,rr])}
 /* 底部陰影 → 本體 → 頂部亮面：柔和的立體積雲 */
 g.fillStyle='rgba(176,196,222,1)';puffs.forEach(([x,y,rr])=>{g.beginPath();g.arc(x,y+8,rr,0,TAU);g.fill()});g.fillRect(60,h-60,w-120,30);
 g.fillStyle='#F4F8FC';puffs.forEach(([x,y,rr])=>{g.beginPath();g.arc(x,y,rr*.94,0,TAU);g.fill()});
 g.fillStyle='rgba(255,255,255,.9)';puffs.forEach(([x,y,rr])=>{g.beginPath();g.arc(x-rr*.22,y-rr*.25,rr*.55,0,TAU);g.fill()});
 g.globalCompositeOperation='destination-out';g.fillRect(0,h-40,w,40);return c}
function blobShadow(){const s=128,c=document.createElement('canvas');c.width=c.height=s;const g=c.getContext('2d');const gr=g.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);gr.addColorStop(0,'rgba(0,0,0,1)');gr.addColorStop(.6,'rgba(0,0,0,.6)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,s,s);return c}

const R={cv:null,ctx:null,cam:new Camera(),sc:null,static:null,sctx:null,skey:'',actors:[],t:0,dpr:1,
 W:0,H:0,ui:[],pick:[],stars:null,
 init(cv){this.cv=cv;this.ctx=cv.getContext('2d',{alpha:false});this.static=document.createElement('canvas');this.sctx=this.static.getContext('2d',{alpha:false});
  this.glow={warm:glowImg('#FFC46B'),fire:glowImg('#FF9A3C'),cool:glowImg('#BFE3FF'),sun:glowImg('#FFF3C8',256),moon:glowImg('#DDE6FF',256)};
  this.clouds=[1,2,3,4,5].map(cloudImg);this.shadow=blobShadow();
  this.cloudPos=[0,1,2,3,4,5,6].map(i=>({x:U.rnd(-1,1),y:U.rnd(.02,.2),s:U.rnd(.5,1),sp:U.rnd(.004,.012),img:i%5}));
  this.resize()},
 resize(){const r=this.cv.getBoundingClientRect();const W=Math.max(200,r.width|0),H=Math.max(200,r.height|0);const perf=OC.Store.perf();
  const dpr=Math.min(window.devicePixelRatio||1,perf.scale);if(W===this.W&&H===this.H&&dpr===this.dpr)return;this.W=W;this.H=H;this.dpr=dpr;
  for(const c of [this.cv,this.static]){c.width=Math.round(W*dpr);c.height=Math.round(H*dpr)}this.cam.setView(W,H);this.skey='';this.stars=null},
 setScene(id){this.sc=OC.Scenes.get(id);const c=this.sc.cam;const cam=this.cam;cam.room=this.sc.kind==='room';cam.tx=c.tx;cam.tz=c.tz;cam.D=c.D;cam.bend=cam.room?0:.011;this.skey='';this.sorted=null;Fx.list.length=0},
 invalidate(){this.skey='';this.sorted=null},

 /* =================== 每格繪製 =================== */
 frame(dt){const ctx=this.ctx,cam=this.cam,perf=OC.Store.perf();this.t+=dt;this.perf=perf;cam.update();
  if(cam.shake>0){cam.shake=Math.max(0,cam.shake-dt*2)}
  const key=cam.key()+':'+Env.ver+':'+this.sc.id+':'+(this.sc.ver||0);
  if(key!==this.skey){this.skey=key;this.drawStatic()}
  ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(this.static,0,0);ctx.setTransform(this.dpr,0,0,this.dpr,0,0);
  if(this.sc.kind!=='room'){this.drawSkyLive(ctx);this.drawWater(ctx);if(perf.cloudShadow&&!Env.isNight())this.drawCloudShadows(ctx)}
  this.drawWorld(ctx,dt);
  Fx.tick(dt);this.drawFx(ctx);
  this.drawGrade(ctx);
  this.drawWeather(ctx,dt);
  this.drawOverlay(ctx)},

 /* ---------- 靜態層：天空、遠山、海、地面、懸崖、池塘、道路 ---------- */
 drawStatic(){const g=this.sctx,cam=this.cam,W=this.W,H=this.H,P=Env.pal;g.setTransform(this.dpr,0,0,this.dpr,0,0);
  if(this.sc.kind==='room'){this.drawRoom(g);return}
  const hz=cam.p(cam.tx,0,cam.tz-90).y;this.hz=hz;
  /* 天空 */
  let gr=g.createLinearGradient(0,0,0,Math.max(10,hz));gr.addColorStop(0,U.rgb(P.skyTop));gr.addColorStop(1,U.rgb(P.skyBot));g.fillStyle=gr;g.fillRect(0,0,W,Math.max(0,hz)+2);
  if(P.star>.05){if(!this.stars){const r=U.rng(9);this.stars=[...Array(70)].map(()=>[r()*W,r()*Math.max(40,hz*.95),r()*1.3+.3,r()])}g.fillStyle='#FFFFFF';for(const [x,y,s,a] of this.stars){g.globalAlpha=P.star*(.4+a*.6);g.fillRect(x,y,s,s)}g.globalAlpha=1}
  /* 太陽／月亮 */
  const h=Env.h;const sunT=(h-6)/12,moonT=((h+6)%24)/12;
  if(sunT>0&&sunT<1){const x=W*(.12+.76*sunT),y=hz-Math.sin(sunT*Math.PI)*hz*.85+10;g.globalAlpha=Math.min(1,P.sun+.2);g.drawImage(this.glow.sun,x-90,y-90,180,180);g.fillStyle='#FFF8E1';g.beginPath();g.arc(x,y,14,0,TAU);g.fill();g.globalAlpha=1}
  else if(moonT>0&&moonT<1){const x=W*(.12+.76*moonT),y=hz-Math.sin(moonT*Math.PI)*hz*.8+12;g.globalAlpha=.8;g.drawImage(this.glow.moon,x-70,y-70,140,140);g.globalAlpha=1;g.fillStyle='#F4F1E4';g.beginPath();g.arc(x,y,11,0,TAU);g.fill();g.fillStyle=U.rgb(P.skyTop);g.beginPath();g.arc(x+5,y-3,9.5,0,TAU);g.fill()}
  /* 遠方島嶼與山脈：越遠越被霧氣吃掉（曠野之息式空氣透視） */
  const hazeC=P.haze;const layers=[[.62,.055,7,'#6E8FA8'],[.4,.035,3,'#5E8A86'],[.22,.022,11,'#4F7C6E']];
  layers.forEach(([hz2,amp,seed,col],li)=>{const c=U.mixc(U.mulc(U.hex(col),P.tint),hazeC,hz2);g.fillStyle=U.rgb(c);g.beginPath();g.moveTo(0,hz+1);
   for(let x=0;x<=W;x+=8){const n=U.noise1((x+cam.tx*12*(li+1))*.006+seed);const isl=Math.max(0,n-.42)*2.2;const y=hz-isl*H*amp*2.2-Math.max(0,U.noise1(x*.02+seed*3)-.5)*H*amp*.6;g.lineTo(x,y)}g.lineTo(W,hz+1);g.closePath();g.fill()});
  /* 海 */
  gr=g.createLinearGradient(0,hz,0,H);const sea=U.mulc(P.sea,[255,255,255]);gr.addColorStop(0,U.rgb(U.mixc(sea,hazeC,.6)));gr.addColorStop(.25,U.rgb(sea));gr.addColorStop(1,U.rgb(U.shade(sea,-.12)));g.fillStyle=gr;g.fillRect(0,hz,W,H-hz);
  /* 淺灘（島嶼外圍兩圈） */
  const sc=this.sc;const outer=sc.land[0];
  if(outer){const cx=sc.cam.tx,cz=sc.cam.tz;for(const [k,a] of [[1.16,.18],[1.07,.3]]){const pts=outer.pts.map(([x,z])=>[cx+(x-cx)*k,cz+(z-cz)*k]);this.fillPoly(g,pts,0,U.rgb(U.mixc(sea,[160,230,225],.55),a))}}
  /* 地面 */
  for(const L of sc.land)this.drawLand(g,L);
  for(const p of sc.paths)this.drawPath(g,p);
  for(const p of sc.ponds)this.drawPond(g,p);
  /* 懸崖：遠的先畫 */
  for(const c of [...sc.cliffs].sort((a,b)=>Math.min(...a.pts.map(p=>p[1]))-Math.min(...b.pts.map(p=>p[1]))))this.drawCliff(g,c);
  /* 平鋪擺設（花圃、野餐墊、碼頭、橋）屬於地面 */
  for(const o of sc.objs)if(o.flat)this.drawObj(g,o,true);
  g.setTransform(1,0,0,1,0,0)},
 proj(pts,y=0){const cam=this.cam,o=[];for(const [x,z] of pts){const q=cam.p(x,y,z);o.push([q.x,q.y])}return o},
 fillPoly(g,pts,y,fill){const q=this.proj(pts,y);g.beginPath();q.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fillStyle=fill;g.fill();return q},
 tinted(hex,k=0){const P=Env.pal;return U.rgb(U.shade(U.hex(hex),k))},
 drawLand(g,L){const col=GROUND[L.col]||GROUND.grass;const raise=L.col==='grass'||L.col==='forest'?.12:L.col==='stone'?.03:0;
  if(raise){/* 草地比沙灘高一點：畫出前緣側面，產生 2.5D 厚度 */
   this.extrude(g,L.pts,0,raise,U.rgb(U.shade(U.hex(col),-.32)))}
  const q=this.fillPoly(g,L.pts,raise,col);
  if(this.perf.shadows&&L.col!=='sand'){/* Low-Poly 地面色塊：在多邊形內以世界格線切三角形，依雜訊微調明暗 */
   g.save();g.clip();const cam=this.cam,b=this.sc.bounds,C=U.hex(col);const step=L.col==='stone'?1.2:1.7;
   const x0=Math.floor((b[0]-3)/step)*step,z0=Math.floor((b[1]-4)/step)*step;
   for(let z=z0;z<b[3]+3;z+=step)for(let x=x0;x<b[2]+3;x+=step){const n1=U.noise2(x*.21,z*.21),n2=U.noise2(x*.21+7,z*.21+3);
    const a=cam.p(x,raise,z),bb=cam.p(x+step,raise,z),c=cam.p(x+step,raise,z+step),d=cam.p(x,raise,z+step);
    if(c.y<0||a.y>this.H||c.x<-60||d.x>this.W+60&&a.x>this.W+60)continue;
    g.fillStyle=U.rgb(U.shade(C,(n1-.5)*.16));g.beginPath();g.moveTo(a.x,a.y);g.lineTo(bb.x,bb.y);g.lineTo(d.x,d.y);g.fill();
    g.fillStyle=U.rgb(U.shade(C,(n2-.5)*.16-.02));g.beginPath();g.moveTo(bb.x,bb.y);g.lineTo(c.x,c.y);g.lineTo(d.x,d.y);g.fill()}
   g.restore()}
  if(L.col==='sand'){/* 沙灘濕潤邊 */g.strokeStyle='rgba(205,190,150,.55)';g.lineWidth=3;g.beginPath();q.forEach(([x,y],i)=>i?g.lineTo(x,y+1.5):g.moveTo(x,y+1.5));g.closePath();g.stroke()}},
 extrude(g,pts,y0,h,fill){const cam=this.cam,n=pts.length;const faces=[];
  for(let i=0;i<n;i++){const a=pts[i],b=pts[(i+1)%n];const ex=b[0]-a[0],ez=b[1]-a[1];/* 外法線（多邊形逆時針→右手）判斷面向相機 */
   const nz=-ex,nx=ez;const area=this.area||0;faces.push({a,b,nz,nx,z:(a[1]+b[1])/2})}
  const ccw=polyArea(pts)>0;g.fillStyle=fill;
  for(const f of faces.sort((p,q)=>p.z-q.z)){const nz=ccw?f.nz:-f.nz;if(nz<=0)continue;
   const A=cam.p(f.a[0],y0,f.a[1]),B=cam.p(f.b[0],y0,f.b[1]),C=cam.p(f.b[0],y0+h,f.b[1]),D=cam.p(f.a[0],y0+h,f.a[1]);
   g.beginPath();g.moveTo(A.x,A.y);g.lineTo(B.x,B.y);g.lineTo(C.x,C.y);g.lineTo(D.x,D.y);g.closePath();g.fill();g.strokeStyle=fill;g.lineWidth=.6;g.stroke()}},
 drawCliff(g,c){const cam=this.cam,n=c.pts.length,ccw=polyArea(c.pts)>0;const rock=U.hex('#A99C86');
  const faces=[];for(let i=0;i<n;i++){const a=c.pts[i],b=c.pts[(i+1)%n];const nz=(ccw?-1:1)*(b[0]-a[0]),nx=(ccw?1:-1)*(b[1]-a[1]);if(nz<=0)continue;faces.push({a,b,nx,nz,z:(a[1]+b[1])/2})}
  faces.sort((p,q)=>p.z-q.z);
  for(const f of faces){const L=Math.hypot(f.nx,f.nz)||1;const k=(-f.nx/L)*.22+(f.nz/L)*.05+(U.noise1(f.a[0]*.7)-.5)*.12;
   const A=cam.p(f.a[0],0,f.a[1]),B=cam.p(f.b[0],0,f.b[1]),C=cam.p(f.b[0],c.h,f.b[1]),D=cam.p(f.a[0],c.h,f.a[1]);
   g.fillStyle=U.rgb(U.shade(rock,k-.05));g.beginPath();g.moveTo(A.x,A.y);g.lineTo(B.x,B.y);g.lineTo(C.x,C.y);g.lineTo(D.x,D.y);g.closePath();g.fill();g.strokeStyle=g.fillStyle;g.lineWidth=.8;g.stroke();
   /* 岩層紋理 */
   const m=cam.p((f.a[0]+f.b[0])/2,c.h*.45,(f.a[1]+f.b[1])/2);g.strokeStyle=U.rgb(U.shade(rock,k-.2),.4);g.lineWidth=1;g.beginPath();g.moveTo(A.x+(D.x-A.x)*.45,A.y+(D.y-A.y)*.45);g.lineTo(B.x+(C.x-B.x)*.5,B.y+(C.y-B.y)*.5);g.stroke()}
  /* 頂面草地＋邊緣草皮垂落 */
  this.fillPoly(g,c.pts,c.h,GROUND.grass);
  g.save();g.clip();const C=U.hex(GROUND.grass);for(const [x,z] of c.pts){if(U.noise2(x,z)>.55){}}g.restore();
  for(const f of faces){const A=cam.p(f.a[0],c.h,f.a[1]),B=cam.p(f.b[0],c.h,f.b[1]);const drop=A.s*(.12+U.noise1(f.a[0]*1.3)*.14);g.fillStyle=U.rgb(U.shade(C,-.12));g.beginPath();g.moveTo(A.x,A.y);g.lineTo(B.x,B.y);g.lineTo(B.x,B.y+drop);g.lineTo(A.x,A.y+drop*.7);g.closePath();g.fill()}},
 drawPath(g,p){const cam=this.cam,col=p.col==='stone'?GROUND.stone:GROUND.dirt;const L=[],Rr=[];const pts=densify(p.pts,.5);
  for(let i=0;i<pts.length;i++){const a=pts[Math.max(0,i-1)],b=pts[Math.min(pts.length-1,i+1)];const dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz)||1;const w=p.w/2*(1+(U.noise1(i*.7)-.5)*.3);L.push([pts[i][0]-dz/l*w,pts[i][1]+dx/l*w]);Rr.push([pts[i][0]+dz/l*w,pts[i][1]-dx/l*w])}
  const poly=[...L,...Rr.reverse()];const y=p.col==='stone'?.13:.125;
  g.globalAlpha=.55;this.fillPoly(g,poly.map(([x,z],i)=>[x,z]),y,U.rgb(U.shade(U.hex(col),-.1)));g.globalAlpha=1;
  const inner=[...L.map((q,i)=>[U.lerp(q[0],pts[i][0],.18),U.lerp(q[1],pts[i][1],.18)]),...[...Rr].reverse().map((q,i)=>[U.lerp(q[0],pts[i][0],.18),U.lerp(q[1],pts[i][1],.18)]).reverse()];
  this.fillPoly(g,inner,y,col)},
 drawPond(g,p){const pts=p.pts;const q=this.fillPoly(g,pts,.12,U.rgb(U.shade(U.hex(GROUND.grass),-.3)));
  const P=Env.pal,sea=U.mixc(P.sea,[120,200,210],.35);const inner=p.stream?pts:pts.map(([x,z])=>{const c=centroid(pts);return[U.lerp(x,c[0],.08),U.lerp(z,c[1],.08)]});
  const qq=this.fillPoly(g,inner,.02,U.rgb(sea));g.save();g.clip();const b=qq.reduce((a,[x,y])=>[Math.min(a[0],x),Math.min(a[1],y),Math.max(a[2],x),Math.max(a[3],y)],[1e9,1e9,-1e9,-1e9]);
  const gr=g.createLinearGradient(0,b[1],0,b[3]);gr.addColorStop(0,U.rgb(U.shade(sea,-.15)));gr.addColorStop(1,U.rgb(U.shade(sea,.15)));g.fillStyle=gr;g.fillRect(b[0],b[1],b[2]-b[0],b[3]-b[1]);g.restore();this.pondsQ=(this.pondsQ||[]);},
 /* 屋內：地板、三面牆、窗外天色 */
 drawRoom(g){const cam=this.cam,W=this.W,H=this.H,P=Env.pal,R=this.sc.room;const w=R.w/2,d=R.d/2,h=R.h;
  g.fillStyle='#3B2F2A';g.fillRect(0,0,W,H);
  const quad=(pts,fill)=>{g.beginPath();pts.forEach(([x,y,z],i)=>{const q=cam.p(x,y,z);i?g.lineTo(q.x,q.y):g.moveTo(q.x,q.y)});g.closePath();g.fillStyle=fill;g.fill()};
  const wall=U.hex('#F2E4CC'),wall2=U.hex('#E6D3B4');
  quad([[-w,0,-d],[w,0,-d],[w,h,-d],[-w,h,-d]],U.rgb(wall));
  for(let i=-w+.5;i<w;i+=.5)quad([[i,0,-d+.001],[i+.25,0,-d+.001],[i+.25,h,-d+.001],[i,h,-d+.001]],U.rgb(U.shade(wall,-.04)));
  quad([[-w,0,-d],[-w,0,d],[-w,h,d],[-w,h,-d]],U.rgb(wall2));quad([[w,0,-d],[w,0,d],[w,h,d],[w,h,-d]],U.rgb(U.shade(wall2,-.05)));
  /* 窗戶 */
  const wx=1.6,wy=1.2;quad([[wx-.85,wy-.05,-d+.01],[wx+.85,wy-.05,-d+.01],[wx+.85,wy+1.15,-d+.01],[wx-.85,wy+1.15,-d+.01]],'#A27A50');
  const sky=g.createLinearGradient(0,cam.p(0,wy+1.1,-d).y,0,cam.p(0,wy,-d).y);sky.addColorStop(0,U.rgb(P.skyTop));sky.addColorStop(1,U.rgb(P.skyBot));
  quad([[wx-.75,wy,-d+.02],[wx+.75,wy,-d+.02],[wx+.75,wy+1.05,-d+.02],[wx-.75,wy+1.05,-d+.02]],sky);
  quad([[wx-.02,wy,-d+.03],[wx+.02,wy,-d+.03],[wx+.02,wy+1.05,-d+.03],[wx-.02,wy+1.05,-d+.03]],'#A27A50');
  quad([[-2.4,1.6,-d+.01],[-1.2,1.6,-d+.01],[-1.2,2.3,-d+.01],[-2.4,2.3,-d+.01]],'#C99B6D');quad([[-2.32,1.68,-d+.02],[-1.28,1.68,-d+.02],[-1.28,2.22,-d+.02],[-2.32,2.22,-d+.02]],'#9CC7A8');
  /* 地板 */
  quad([[-w,0,-d],[w,0,-d],[w,0,d],[-w,0,d]],'#C8A47C');
  for(let i=0;i<14;i++){const z=-d+i*(R.d/14);quad([[-w,0,z],[w,0,z],[w,0,z+.02],[-w,0,z+.02]],'rgba(120,85,55,.35)')}
  for(let i=0;i<14;i++)for(let j=0;j<5;j++){const z=-d+i*(R.d/14),x=-w+((j*1.7+i*.9)%R.w);quad([[x,0,z],[x+.02,0,z],[x+.02,0,z+R.d/14],[x,0,z+R.d/14]],'rgba(120,85,55,.25)')}
  quad([[-w,0,-d],[w,0,-d],[w,.12,-d],[-w,.12,-d]],'#B08A60');
  /* 平鋪家具（地毯） */
  for(const o of this.sc.objs)if(o.flat)this.drawObj(g,o,true)},

 /* ---------- 動態：天空雲朵 ---------- */
 drawSkyLive(ctx){const hz=this.hz,W=this.W,P=Env.pal;if(hz<20)return;
  const n=Env.wid==='sunny'?3:Env.wid==='cloudy'?6:7;ctx.save();ctx.beginPath();ctx.rect(0,0,W,hz);ctx.clip();
  const tint=U.mixc(P.tint,[255,255,255],.25);for(let i=0;i<n;i++){const c=this.cloudPos[i];c.x+=c.sp*(1+Env.wind)*.016;if(c.x>1.3)c.x=-1.3;
   const w=W*.5*c.s,h=w*.4;const x=(c.x*.5+.5)*W*1.4-W*.2-w/2,y=Math.min(hz*(.1+c.y*1.6),hz-h*1.1)-h/2;
   ctx.globalAlpha=Env.isNight()?.25:Env.rainy()?.95:.92;ctx.drawImage(this.clouds[c.img],x,y,w,h)}
  ctx.globalAlpha=1;ctx.restore()},
 /* 海浪泡沫、水面閃光 */
 drawWater(ctx){const sc=this.sc,cam=this.cam,t=this.t,amb=this.perf.ambient;const outer=sc.land[0];if(!outer)return;
  const q=this.proj(outer.pts,0);ctx.lineJoin='round';
  ctx.strokeStyle='rgba(255,255,255,.75)';ctx.lineWidth=2.2;ctx.setLineDash([14,9]);ctx.lineDashOffset=-t*8;ctx.beginPath();q.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.stroke();
  if(amb){const k=1.03+Math.sin(t*.8)*.012;const cx=sc.cam.tx,cz=sc.cam.tz;const q2=this.proj(outer.pts.map(([x,z])=>[cx+(x-cx)*k,cz+(z-cz)*k]),0);ctx.strokeStyle='rgba(255,255,255,.35)';ctx.lineWidth=1.4;ctx.setLineDash([6,14]);ctx.lineDashOffset=t*5;ctx.beginPath();q2.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.stroke()}
  ctx.setLineDash([]);
  /* 海面閃光 */
  if(amb&&!Env.rainy()){const r=U.rng(5);ctx.fillStyle='rgba(255,255,255,.55)';for(let i=0;i<26*amb;i++){const x=r()*this.W,y=this.hz+8+r()*(this.H-this.hz);const ph=(t*.6+r()*6)%3;if(ph>1)continue;const p=this.cam.unproject(x,y);if(OC.Scenes.inside(outer.pts,p.x,p.z))continue;const a=Math.sin(ph*Math.PI);ctx.globalAlpha=a*.6;ctx.fillRect(x-4,y,8*a+2,1.4)}ctx.globalAlpha=1}
  for(const p of sc.ponds){if(!amb)break;const c=centroid(p.pts);for(let i=0;i<3;i++){const ph=(t*.5+i/3)%1;const s=cam.p(c[0]+Math.sin(i*2.1)*.6,.03,c[1]+Math.cos(i*1.7)*.3);ctx.strokeStyle=`rgba(255,255,255,${(1-ph)*.5})`;ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(s.x,s.y,s.s*ph*.5,s.s*ph*.18,0,0,TAU);ctx.stroke()}}},
 drawCloudShadows(ctx){const cam=this.cam,t=this.t;ctx.globalCompositeOperation='multiply';ctx.globalAlpha=.16;
  for(let i=0;i<3;i++){const x=((t*.25*(1+Env.wind)+i*11)%34)-17,z=-6+i*5.5;const q=cam.p(x,0,z);const w=q.s*7,h=w*.35;ctx.drawImage(this.shadow,q.x-w/2,q.y-h/2,w,h)}
  ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over'},

 /* ---------- 物件與角色（深度排序） ---------- */
 drawWorld(ctx,dt){const sc=this.sc,cam=this.cam;this.pick.length=0;
  const list=[];for(const o of sc.objs){if(o.flat)continue;list.push(o)}for(const a of this.actors)if(a.visible!==false)list.push(a);
  list.sort((a,b)=>(a.z+(a.zb||0))-(b.z+(b.zb||0)));
  /* 角色陰影先畫在地面上 */
  for(const a of this.actors){if(a.visible===false)continue;const q=cam.p(a.x,a.gy||0,a.z);const k=1/(1+(a.y||0)*.9);const w=q.s*.8*a.c.scale*k*(a.shadowW||1),h=w*.32;ctx.globalAlpha=.28*k;ctx.drawImage(this.shadow,q.x-w/2,q.y-h/2,w,h)}ctx.globalAlpha=1;
  for(const o of list){if(o.isActor)this.drawActor(ctx,o,dt);else this.drawObj(ctx,o,false)}},
 drawObj(ctx,o,flat){const cam=this.cam,t=this.t;const q=cam.p(o.x,o.y||0,o.z);if(q.d<.5)return;let spr=this.spriteOf(o);if(!spr)return;
  const s=q.s*(o.s||1);const w=spr.cv.width/SP.PPM/ (spr.res||1)*s,h=spr.cv.height/SP.PPM/(spr.res||1)*s;const x=q.x-w*spr.ax,y=q.y-h*spr.ay;
  if(x>this.W+40||x+w<-40||y>this.H+40||y+h<-40)return;
  const sway=(o.type==='tree'||o.type==='tuft'||o.type==='flowers'||o.type==='bush')&&this.perf.ambient?Math.sin(t*(o.type==='tree'?.9:1.6)+o.x*.7+o.z*.3)*(o.type==='tree'?.018:.06)*(.6+Env.wind):0;
  const near=!flat&&y+h>this.H*.86&&h>this.H*.22&&o.type!=='house'&&o.type!=='shop';if(near)ctx.globalAlpha=.42;
  if(sway){ctx.save();ctx.translate(q.x,q.y);ctx.transform(1,0,sway,1,0,0);ctx.drawImage(spr.cv,-w*spr.ax,-h*spr.ay,w,h);ctx.restore()}else ctx.drawImage(spr.cv,x,y,w,h);if(near)ctx.globalAlpha=1;
  if(!flat&&(o.act||o.type==='house'))this.pick.push({o,x,y,w,h,d:q.d});
  /* 營火火焰、煙囪炊煙 */
  if(o.type==='campfire'&&this.fireOn(o)){const f=Math.sin(t*14)*.08+Math.sin(t*23)*.05;ctx.save();ctx.translate(q.x,q.y-s*.12);const fs=s*(.38+f*.2);
   const fl=(c,k,ox)=>{ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(-fs*.32*k+ox,0);ctx.quadraticCurveTo(-fs*.3*k+ox,-fs*.6*k,ox+Math.sin(t*9)*fs*.06,-fs*1.15*k);ctx.quadraticCurveTo(fs*.3*k+ox,-fs*.6*k,fs*.32*k+ox,0);ctx.fill()};
   fl('#F4703C',1,0);fl('#FFB347',.72,fs*.03);fl('#FFF0A8',.4,0);ctx.restore();if(Math.random()<.05)Fx.smoke(o.x,.6,o.z)}
  if(o.type==='house'&&this.perf.ambient&&Math.random()<.035){Fx.smoke(o.x+.95,3.3,o.z-1.2)}
  if(o.type==='fountain'&&this.perf.ambient){const top=cam.p(o.x,1.45,o.z);ctx.fillStyle='rgba(225,245,255,.8)';for(let i=0;i<6;i++){const ph=(t*1.2+i/6)%1;const a=i/6*TAU;const xx=top.x+Math.cos(a)*ph*s*.55,yy=top.y-Math.sin(ph*Math.PI)*s*.4+ph*s*.7;ctx.globalAlpha=1-ph;ctx.beginPath();ctx.arc(xx,yy,s*.03,0,TAU);ctx.fill()}ctx.globalAlpha=1}},
 fireOn(o){return Env.isNight()||Env.phase==='dusk'||Env.phase==='dawn'||o.lit},
 spriteOf(o){if(o._spr&&o._sv===o.style)return o._spr;let s=null;
  switch(o.type){case'tree':s=SP.tree(o.kind,o.col,o.v);break;case'bush':s=SP.bush(o.col,o.fl,o.v);break;case'rock':s=SP.rock(o.size,o.v);break;case'flowers':s=SP.flowers(o.cols||['#FFF'],o.v);break;case'tuft':s=SP.tuft(o.col||(this.sc.id==='forest'?'#5C9A4C':'#6FAE5A'),o.v);break;
   case'house':s=SP.house(o.style);break;case'shop':s=SP.PROPS.shop(o.c,o.name,o.awn);break;case'stall':s=SP.PROPS.stall(o.c);break;case'furn':s=SP.FURN[o.k]&&SP.FURN[o.k]();break;
   case'bridge':s=SP.PROPS.bridge();break;default:s=SP.PROPS[o.type]&&SP.PROPS[o.type]()}
  o._spr=s;o._sv=o.style;return s},
 drawActor(ctx,a,dt){const cam=this.cam;const q=cam.p(a.x,(a.gy||0)+(a.y||0),a.z);if(q.d<.5)return;const s=q.s;a.sx=q.x;a.sy=q.y;a.ss=s;
  OC.Rig.draw(ctx,a,q.x,q.y,s,dt)},
 /* ---------- 粒子 ---------- */
 drawFx(ctx){const cam=this.cam;for(const p of Fx.list){if(p.delay>0)continue;const q=cam.p(p.x,p.y,p.z);const a=1-p.t/p.life;const s=q.s*p.sz;
  if(p.k==='heart'){ctx.globalAlpha=Math.min(1,a*1.6);const k=s*(1+Math.sin(p.t*8)*.06);heart(ctx,q.x+Math.sin(p.t*4)*s*.4,q.y,k,'#F27C9B')}
  else if(p.k==='spark'){ctx.globalAlpha=a;ctx.fillStyle=p.col;star4(ctx,q.x,q.y,s*(.6+a*.4))}
  else if(p.k==='dust'){ctx.globalAlpha=a*.5;ctx.fillStyle='#E9E2D2';ctx.beginPath();ctx.arc(q.x,q.y,s*(1.4-a*.6),0,TAU);ctx.fill()}
  else if(p.k==='smoke'){ctx.globalAlpha=a*.35;ctx.fillStyle='#E8E8EC';ctx.beginPath();ctx.arc(q.x,q.y,s*(1+p.t*.8),0,TAU);ctx.fill()}
  else if(p.k==='note'){ctx.globalAlpha=Math.min(1,a*1.5);ctx.fillStyle='#7A6CC8';ctx.font=`600 ${Math.max(8,s*1.6)|0}px sans-serif`;ctx.fillText('♪',q.x,q.y)}
  else if(p.k==='zz'){ctx.globalAlpha=Math.min(1,a*1.4);ctx.fillStyle='#7C88C8';ctx.font=`700 ${Math.max(8,s*1.5)|0}px "Nunito",sans-serif`;ctx.fillText('z',q.x,q.y)}
  else if(p.k==='drop'){ctx.globalAlpha=a;ctx.fillStyle='#8FC8F0';drop(ctx,q.x,q.y,s)}
  else if(p.k==='anger'){ctx.globalAlpha=Math.min(1,a*1.6);anger(ctx,q.x,q.y,s)}
  else if(p.k==='leaf'){ctx.globalAlpha=a;ctx.fillStyle=p.col;ctx.save();ctx.translate(q.x,q.y);ctx.rotate(p.t*3);ctx.beginPath();ctx.ellipse(0,0,s,s*.5,0,0,TAU);ctx.fill();ctx.restore()}}
  ctx.globalAlpha=1},
 /* ---------- 色調（時段）、燈光、霧氣 ---------- */
 drawGrade(ctx){const P=Env.pal,W=this.W,H=this.H,cam=this.cam;
  /* 空氣透視霧氣：靠近地平線的物件淡入天色 */
  if(this.sc.kind!=='room'){const hz=this.hz;const gr=ctx.createLinearGradient(0,hz-H*.05,0,hz+H*.3);gr.addColorStop(0,U.rgb(P.haze,.0));gr.addColorStop(.15,U.rgb(P.haze,.4));gr.addColorStop(1,U.rgb(P.haze,0));ctx.fillStyle=gr;ctx.fillRect(0,hz-H*.05,W,H*.35)}
  const tint=this.sc.kind==='room'?U.mixc(P.tint,[255,236,210],.55):P.tint;
  if(tint[0]+tint[1]+tint[2]<760){ctx.globalCompositeOperation='multiply';ctx.fillStyle=U.rgb(tint);ctx.fillRect(0,0,W,H);ctx.globalCompositeOperation='source-over'}
  /* 夜間燈光：窗戶、路燈、營火 */
  const night=this.sc.kind==='room'?.6:P.night;
  if(night>.05){ctx.globalCompositeOperation='lighter';for(const o of this.sc.objs){if(!o.light)continue;
   if(o.type==='house'){for(const [lx,ly,r] of SP.HOUSE_LIGHTS){const q=cam.p(o.x+lx,ly,o.z+.02);const w=q.s*r*3.4;ctx.globalAlpha=night*.75;ctx.drawImage(this.glow.warm,q.x-w/2,q.y-w/2,w,w)}continue}
   const fire=o.type==='campfire';if(fire&&!this.fireOn(o))continue;const q=cam.p(o.x,fire?.4:o.type==='furn'?1.5:2.05,o.z);const w=q.s*(fire?4.2:2.8)*(1+(fire?Math.sin(this.t*11)*.05:0));
   ctx.globalAlpha=night*(fire?.9:.7);ctx.drawImage(fire?this.glow.fire:this.glow.warm,q.x-w/2,q.y-w/2,w,w)}
   ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over'}
  /* 太陽光暈（逆光、柔和） */
  if(this.sc.kind!=='room'&&P.sun>.3&&(Env.phase==='dawn'||Env.phase==='dusk')){ctx.globalCompositeOperation='screen';const gr=ctx.createLinearGradient(0,0,0,H*.6);gr.addColorStop(0,U.rgb([255,190,140],.22));gr.addColorStop(1,U.rgb([255,190,140],0));ctx.fillStyle=gr;ctx.fillRect(0,0,W,H*.6);ctx.globalCompositeOperation='source-over'}
  /* 暗角 */
  if(!this.vig||this.vig.w!==W||this.vig.h!==H){const c=document.createElement('canvas');c.width=W/2|0;c.height=H/2|0;const g=c.getContext('2d');const gr=g.createRadialGradient(c.width/2,c.height*.55,Math.min(c.width,c.height)*.35,c.width/2,c.height*.55,Math.max(c.width,c.height)*.75);gr.addColorStop(0,'rgba(40,30,50,0)');gr.addColorStop(1,'rgba(40,30,50,.22)');g.fillStyle=gr;g.fillRect(0,0,c.width,c.height);this.vig={c,w:W,h:H}}
  ctx.drawImage(this.vig.c,0,0,W,H)},
 /* ---------- 天氣粒子（螢幕空間） ---------- */
 drawWeather(ctx,dt){const W=this.W,H=this.H,t=this.t,amt=this.perf.particles;if(this.sc.kind==='room'){if(Env.rainy()&&amt>0){/* 窗戶上的雨 */}return}
  if(!this.wx)this.wx=[...Array(160)].map(()=>({x:Math.random(),y:Math.random(),s:Math.random()}));
  if(Env.rainy()&&amt>0){const n=Math.floor((Env.wid==='storm'?150:100)*amt);ctx.strokeStyle='rgba(220,232,245,.5)';ctx.lineWidth=1.1;ctx.beginPath();
   for(let i=0;i<n;i++){const p=this.wx[i];p.y+=dt*(1.6+p.s*.8);p.x+=dt*.18*Env.wind;if(p.y>1){p.y-=1;p.x=Math.random()}const x=p.x*W,y=p.y*H,l=10+p.s*8;ctx.moveTo(x,y);ctx.lineTo(x-l*.22*Env.wind,y-l)}ctx.stroke();
   if(Env.wid==='storm'){this.flash=(this.flash||0)-dt;if(this.flash<-6-Math.random()*8&&!this.perf.reduce){this.flash=.5}if(this.flash>0){ctx.fillStyle=`rgba(230,235,255,${this.flash*.25})`;ctx.fillRect(0,0,W,H)}}}
  else if(Env.wid==='snow'&&amt>0){const n=Math.floor(110*amt);ctx.fillStyle='rgba(255,255,255,.9)';for(let i=0;i<n;i++){const p=this.wx[i];p.y+=dt*(.05+p.s*.06);p.x+=Math.sin(t+i)*dt*.02;if(p.y>1){p.y-=1;p.x=Math.random()}ctx.beginPath();ctx.arc(p.x*W,p.y*H,1+p.s*2,0,TAU);ctx.fill()}}
  else if(amt>0&&this.perf.ambient){/* 晴天的花瓣／夜晚的螢火蟲 */
   const night=Env.isNight();const n=Math.floor((night?18:10)*amt);for(let i=0;i<n;i++){const p=this.wx[i];
    if(night){p.x+=Math.sin(t*.7+i)*dt*.01;p.y+=Math.cos(t*.5+i*1.3)*dt*.008;const a=(Math.sin(t*2+i*1.7)+1)/2;if(p.y<.35)p.y=.35+Math.random()*.6;const x=p.x*W,y=p.y*H;ctx.globalAlpha=a*.85;ctx.drawImage(this.glow.warm,x-7,y-7,14,14);ctx.fillStyle='#FFF6B0';ctx.fillRect(x-1,y-1,2,2)}
    else{p.x+=dt*(.03+p.s*.03)*(1+Env.wind);p.y+=dt*.02+Math.sin(t+i)*dt*.01;if(p.x>1.05){p.x=-.05;p.y=Math.random()*.7}const x=p.x*W,y=p.y*H;ctx.globalAlpha=.75;ctx.fillStyle=i%3?'#F7C6D3':'#FFFFFF';ctx.save();ctx.translate(x,y);ctx.rotate(t*2+i);ctx.beginPath();ctx.ellipse(0,0,3.2,1.6,0,0,TAU);ctx.fill();ctx.restore()}}
   ctx.globalAlpha=1}},
 /* ---------- 名字、對話泡泡、情緒符號（畫在色調之後，保持清晰） ---------- */
 drawOverlay(ctx){const showNames=OC.S.settings.names!==false;for(const a of this.actors){if(a.visible===false||!a.ss)continue;const s=a.ss,c=a.c;const top=a.sy-s*1.12*c.scale-(a.headOff||0);
  if(a.emote)drawEmote(ctx,a,a.sx+s*.34,top+s*.12,s,this.t);
  if(a.bubble&&OC.S.settings.bubbles!==false)drawBubble(ctx,a.bubble,a.sx,top-4,this.t);
  else if(showNames&&(a.focus||a.nameT>0)){const al=a.focus?1:Math.min(1,a.nameT);ctx.globalAlpha=al*.92;const txt=c.name;ctx.font='600 11px "Nunito","Noto Sans TC",sans-serif';const w=ctx.measureText(txt).width+14;
   const y=a.sy+8;rrect(ctx,a.sx-w/2,y,w,18,9);ctx.fillStyle='rgba(255,252,244,.92)';ctx.fill();ctx.fillStyle='#5B4B45';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(txt,a.sx,y+9.5);ctx.textAlign='start';ctx.textBaseline='alphabetic';ctx.globalAlpha=1}}
  /* 地點提示環（佈置、放置房子） */
  if(this.ghost)this.ghost(ctx)}};

/* ---------- 小工具 ---------- */
function polyArea(p){let a=0;for(let i=0,j=p.length-1;i<p.length;j=i++)a+=(p[j][0]+p[i][0])*(p[j][1]-p[i][1]);return a}
function centroid(p){let x=0,z=0;for(const q of p){x+=q[0];z+=q[1]}return[x/p.length,z/p.length]}
function densify(pts,step){const o=[];for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1];const n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/step));for(let k=0;k<n;k++)o.push([U.lerp(a[0],b[0],k/n),U.lerp(a[1],b[1],k/n)])}o.push(pts[pts.length-1]);return o}
function rrect(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
function heart(ctx,x,y,s,col){ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(x,y+s*.35);ctx.bezierCurveTo(x-s*1.1,y-s*.35,x-s*.45,y-s*1.05,x,y-s*.45);ctx.bezierCurveTo(x+s*.45,y-s*1.05,x+s*1.1,y-s*.35,x,y+s*.35);ctx.fill()}
function star4(ctx,x,y,s){ctx.beginPath();ctx.moveTo(x,y-s);ctx.quadraticCurveTo(x,y,x+s,y);ctx.quadraticCurveTo(x,y,x,y+s);ctx.quadraticCurveTo(x,y,x-s,y);ctx.quadraticCurveTo(x,y,x,y-s);ctx.fill()}
function drop(ctx,x,y,s){ctx.beginPath();ctx.moveTo(x,y-s);ctx.quadraticCurveTo(x+s*.7,y,x,y+s*.5);ctx.quadraticCurveTo(x-s*.7,y,x,y-s);ctx.fill()}
function anger(ctx,x,y,s){ctx.strokeStyle='#E25B4E';ctx.lineWidth=Math.max(1.5,s*.18);ctx.lineCap='round';for(let i=0;i<4;i++){ctx.save();ctx.translate(x,y);ctx.rotate(i*Math.PI/2);ctx.beginPath();ctx.moveTo(s*.2,-s*.6);ctx.quadraticCurveTo(s*.2,-s*.2,s*.6,-s*.2);ctx.stroke();ctx.restore()}}
/* 情緒符號：小而精緻、帶彈性出現，不使用巨大 emoji */
function drawEmote(ctx,a,x,y,s,t){const e=a.emote;const k=Math.min(1,e.t/.25),pop=U.ease.back(k),fade=e.life-e.t<.3?(e.life-e.t)/.3:1;const sz=Math.max(9,s*.2)*pop;ctx.globalAlpha=fade;
 const bob=Math.sin(t*5)*sz*.08;
 switch(e.k){case'heart':heart(ctx,x,y+bob,sz,'#F27C9B');break;
  case'!':ctx.fillStyle='#F2A93B';ctx.font=`800 ${sz*1.6|0}px "Nunito",sans-serif`;ctx.textAlign='center';ctx.fillText('!',x,y+bob+sz*.5);ctx.textAlign='start';break;
  case'?':ctx.fillStyle='#7B8FD9';ctx.font=`800 ${sz*1.5|0}px "Nunito",sans-serif`;ctx.textAlign='center';ctx.fillText('?',x,y+bob+sz*.5);ctx.textAlign='start';break;
  case'sweat':ctx.fillStyle='#8FC8F0';drop(ctx,x,y+bob,sz*.7);break;
  case'anger':anger(ctx,x,y+bob,sz*.9);break;
  case'note':ctx.fillStyle='#8A7BD8';ctx.font=`700 ${sz*1.4|0}px sans-serif`;ctx.fillText('♪',x-sz*.4,y+bob+sz*.4);break;
  case'spark':ctx.fillStyle='#F6C84B';star4(ctx,x,y+bob,sz*.8);star4(ctx,x+sz*.7,y+bob-sz*.6,sz*.4);break;
  case'gloom':ctx.strokeStyle='#7F8EB2';ctx.lineWidth=Math.max(1,sz*.12);for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(x-sz*.5+i*sz*.5,y-sz*.6);ctx.lineTo(x-sz*.5+i*sz*.5,y+sz*.2);ctx.stroke()}break;
  case'sick':ctx.fillStyle='#9DB07A';ctx.beginPath();for(let i=0;i<3;i++){ctx.moveTo(x+i*sz*.4,y);ctx.arc(x+i*sz*.4-sz*.2,y-i*sz*.3+bob,sz*.18,0,TAU)}ctx.fill();break;
  case'idea':ctx.fillStyle='#FFD86B';ctx.beginPath();ctx.arc(x,y+bob,sz*.55,0,TAU);ctx.fill();ctx.fillStyle='#D9B24A';ctx.fillRect(x-sz*.22,y+bob+sz*.45,sz*.44,sz*.3);break;
  case'blush':ctx.fillStyle='rgba(242,124,155,.85)';for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(x-sz*.3+i*sz*.3,y+bob,sz*.08,sz*.3,.4,0,TAU);ctx.fill()}break}
 ctx.globalAlpha=1}
function wrap(ctx,txt,maxW){const out=[];let line='';for(const ch of [...txt]){const tt=line+ch;if(ctx.measureText(tt).width>maxW&&line){out.push(line);line=ch}else line=tt}if(line)out.push(line);return out.slice(0,3)}
function drawBubble(ctx,b,x,y,t){const k=Math.min(1,b.t/.22),e=U.ease.back(k),fade=b.life-b.t<.35?Math.max(0,(b.life-b.t)/.35):1;if(fade<=0)return;
 ctx.font='600 13px "Nunito","Noto Sans TC",sans-serif';const lines=b._l||(b._l=wrap(ctx,b.text,170));const w=Math.min(190,Math.max(...lines.map(l=>ctx.measureText(l).width))+24),h=lines.length*18+14;
 const bx=U.clamp(x-w/2,8,R.W-w-8),by=y-h-12;ctx.save();ctx.globalAlpha=fade;ctx.translate(x,y);ctx.scale(.7+.3*e,.7+.3*e);ctx.translate(-x,-y);
 ctx.shadowColor='rgba(70,50,40,.18)';ctx.shadowBlur=8;ctx.shadowOffsetY=2;rrect(ctx,bx,by,w,h,13);ctx.fillStyle=b.tone==='angry'?'#FFF1EC':b.tone==='sad'?'#EEF3FB':'#FFFCF4';ctx.fill();ctx.shadowColor='transparent';
 ctx.beginPath();const tx=U.clamp(x,bx+16,bx+w-16);ctx.moveTo(tx-7,by+h-1);ctx.lineTo(tx,by+h+8);ctx.lineTo(tx+6,by+h-1);ctx.fill();
 if(b.who){ctx.fillStyle='#B08F7E';ctx.font='700 9px "Nunito","Noto Sans TC",sans-serif';}
 ctx.fillStyle='#4E3F3A';ctx.font='600 13px "Nunito","Noto Sans TC",sans-serif';ctx.textBaseline='top';const shown=Math.floor(Math.min(b.text.length,b.t*28));let used=0;
 lines.forEach((l,i)=>{const n=Math.max(0,Math.min(l.length,shown-used));used+=l.length;ctx.fillText(l.slice(0,n),bx+12,by+9+i*18)});ctx.textBaseline='alphabetic';ctx.restore()}
R.Fx=Fx;R.helpers={rrect,heart,star4,drop,anger,polyArea,centroid};
OC.R=R;OC.Fx=Fx;
})(window.OC);
