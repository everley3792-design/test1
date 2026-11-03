/* OC Shimeji v4 · 原創 Low-Poly 場景素材（程式繪製，預先烘焙成點陣圖快取，渲染時只做 drawImage） */
(function(OC){'use strict';
const {U}=OC;
const PPM=120;               // 每公尺像素（烘焙解析度）
const LIGHT=[-.62,-.78];     // 光源：左上
const cache=new Map();
function make(key,wM,hM,paint,opt={}){
 if(cache.has(key))return cache.get(key);
 const pad=opt.pad??.15,R=opt.res||1;const W=Math.ceil((wM+pad*2)*PPM*R),H=Math.ceil((hM+pad*2)*PPM*R);
 const cv=document.createElement('canvas');cv.width=W;cv.height=H;const g=cv.getContext('2d');
 const bx=W/2,by=H-pad*PPM*R;const k=PPM*R;
 /* 繪圖座標：公尺，原點為底部中心、y 向上 */
 const p=(x,y)=>[bx+x*k,by-y*k];
 const P={g,k,p,
  poly(pts,fill,alpha){g.beginPath();pts.forEach(([x,y],i)=>{const q=p(x,y);i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1])});g.closePath();if(alpha!=null)g.globalAlpha=alpha;g.fillStyle=typeof fill==='string'?fill:U.rgb(fill);g.fill();g.globalAlpha=1},
  line(pts,stroke,w,alpha){g.beginPath();pts.forEach(([x,y],i)=>{const q=p(x,y);i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1])});g.strokeStyle=typeof stroke==='string'?stroke:U.rgb(stroke);g.lineWidth=w*k;g.lineCap='round';g.lineJoin='round';if(alpha!=null)g.globalAlpha=alpha;g.stroke();g.globalAlpha=1},
  ell(x,y,rx,ry,fill,alpha){const q=p(x,y);g.beginPath();g.ellipse(q[0],q[1],rx*k,ry*k,0,0,Math.PI*2);if(alpha!=null)g.globalAlpha=alpha;g.fillStyle=typeof fill==='string'?fill:U.rgb(fill);g.fill();g.globalAlpha=1},
  /* 多面體色塊：從中心切成三角形，依光線方向給每一面不同明暗（Low-Poly 寶石感） */
  facet(cx,cy,pts,base,opt={}){const b=typeof base==='string'?U.hex(base):base,r=opt.rng||Math.random,str=opt.str??.2,lx=cx+(opt.off??.18)*LIGHT[0]*-(-1),ly=cy;
   const c=[cx+LIGHT[0]*(opt.off??.12),cy-LIGHT[1]*(opt.off??.12)];
   for(let i=0;i<pts.length;i++){const a=pts[i],d=pts[(i+1)%pts.length];const mx=(a[0]+d[0])/2-cx,my=(a[1]+d[1])/2-cy;const L=Math.hypot(mx,my)||1;
    const dot=(mx/L)*LIGHT[0]+(-my/L)*LIGHT[1];const kk=dot*str+(r()-.5)*(opt.jit??.06);P.poly([c,a,d],U.shade(b,kk))}
   if(opt.rim!==false){const q=pts.map(([x,y])=>p(x,y));g.beginPath();q.forEach((v,i)=>i?g.lineTo(v[0],v[1]):g.moveTo(v[0],v[1]));g.closePath();g.strokeStyle=U.rgb(U.shade(b,-.28),.35);g.lineWidth=Math.max(1,.012*k);g.stroke()}},
  blob(cx,cy,rx,ry,n,rng,jit=.16){const pts=[];for(let i=0;i<n;i++){const a=i/n*Math.PI*2+rng()*.3,rr=1-jit/2+rng()*jit;pts.push([cx+Math.cos(a)*rx*rr,cy+Math.sin(a)*ry*rr])}return pts},
  /* 斜投影方塊：正面＋上面＋右側面（家具、建築共用） */
  box(x,y,w,h,d,col,opt={}){const dv=[.42*d,.46*d],C=typeof col==='string'?U.hex(col):col;
   const top=opt.top?U.hex(opt.top):U.shade(C,.16),side=opt.side?U.hex(opt.side):U.shade(C,-.2);
   P.poly([[x+w,y],[x+w+dv[0],y+dv[1]],[x+w+dv[0],y+h+dv[1]],[x+w,y+h]],side);
   P.poly([[x,y+h],[x+w,y+h],[x+w+dv[0],y+h+dv[1]],[x+dv[0],y+h+dv[1]]],top);
   P.poly([[x,y],[x+w,y],[x+w,y+h],[x,y+h]],C);
   if(opt.edge!==false)P.line([[x,y+h],[x+w,y+h]],U.shade(C,.32),.012,.7)}};
 paint(P,opt.seed!=null?U.rng(opt.seed):U.rng(U.hash(key)));
 const s={cv,wM:W/k,hM:H/k,ax:bx/W,ay:by/H,key};cache.set(key,s);return s}

/* ---------- 樹木 ---------- */
const TREE_COL={green:['#6FAE5A','#5C9A4C'],deep:['#4F8F5A','#3F7A4E'],spring:['#9CCB6A','#86B85C'],autumn:['#E39A4A','#D07F3A'],cherry:['#F2B8C6','#E79FB3'],gold:['#E8C35A','#D4AA44']};
function tree(kind,col='green',v=0){return make(`tree:${kind}:${col}:${v}`,kind==='pine'?2.2:2.6,kind==='pine'?4.4:3.8,(P,r)=>{
 const [a,b]=TREE_COL[col]||TREE_COL.green,trunk='#8B6A4E';
 P.ell(0,.02,.9,.18,'#2E4A2E',.18);
 if(kind==='pine'){P.poly([[-.14,0],[.14,0],[.08,.9],[-.08,.9]],trunk);P.poly([[0,0],[.14,0],[.08,.9],[0,.9]],U.shade(U.hex(trunk),-.18));
  const tiers=[[.55,1.15,1.05],[1.35,1.8,.82],[2.15,2.35,.6],[2.9,2.8,.38]];
  tiers.forEach(([y0,y1,w],i)=>{const top=y0+1.25+i*.05;const pts=[[-w,y0],[-w*.55,y0-.12],[0,y0-.06],[w*.55,y0-.12],[w,y0],[w*.2,top-.35],[0,top],[-w*.2,top-.35]];
   P.facet(0,y0+.45,pts,i%2?b:a,{rng:r,str:.28});P.poly([[-w*.18,top-.35],[0,top],[-w*.62,y0+.05]],'#FFFFFF',.08)});
  if(col==='snow'||OC.Env&&OC.Env.wid==='snow'){} return}
 if(kind==='palm'){const pts=[];for(let i=0;i<=8;i++){const t=i/8;pts.push([Math.sin(t*1.6)*.35,t*2.6])}
  for(let i=0;i<8;i++){const [x0,y0]=pts[i],[x1,y1]=pts[i+1];P.poly([[x0-.13+t(i)*.02,y0],[x0+.13,y0],[x1+.11,y1],[x1-.11,y1]],i%2?'#B08A60':'#C29B6E')}
  function t(i){return 0}
  const top=pts[8];for(let i=0;i<7;i++){const ang=-Math.PI*.95+i*Math.PI*.95/6*1.05,L=1.25+r()*.25;const ex=top[0]+Math.cos(ang)*L,ey=top[1]+Math.sin(ang)*L*.55+.15;const mx=top[0]+Math.cos(ang)*L*.5,my=top[1]+Math.sin(ang)*L*.3+.42;
   P.poly([[top[0],top[1]+.05],[mx-.12,my+.08],[ex,ey],[mx+.1,my-.1]],i%2?'#5FA65A':'#4E9450')}
  P.ell(top[0]-.08,top[1]-.05,.12,.1,'#7A5A3A');P.ell(top[0]+.1,top[1]-.08,.11,.1,'#6E5034');return}
 /* 闊葉樹 / 果樹 */
 P.poly([[-.16,0],[.16,0],[.1,1.25],[-.1,1.25]],trunk);P.poly([[0,0],[.16,0],[.1,1.25],[0,1.25]],U.shade(U.hex(trunk),-.18));
 P.poly([[-.09,1],[-.38,1.5],[-.3,1.55],[-.02,1.15]],trunk);P.poly([[.06,1.05],[.42,1.55],[.34,1.6],[.02,1.2]],U.shade(U.hex(trunk),-.1));
 const blobs=[[-.55,1.85,.72,.62],[.55,1.9,.7,.6],[0,2.5,.86,.75],[0,1.75,.7,.5]];
 blobs.forEach(([x,y,rx,ry],i)=>P.facet(x,y,P.blob(x,y,rx,ry,9,r),i===2?a:i===3?b:a,{rng:r,str:.3}));
 P.ell(0,1.42,.5,.12,'#1F3A22',.18);
 /* 高光小面 */
 P.poly([[-.6,2.75],[-.2,3.1],[-.35,2.65]],'#FFFFFF',.14);P.poly([[-1,2.05],[-.78,2.4],[-.7,2.0]],'#FFFFFF',.12);
 if(kind==='fruit')for(let i=0;i<7;i++)P.ell(U.lerp(-.9,.9,r()),U.lerp(1.6,2.8,r()),.075,.075,'#E0533F');
 if(col==='cherry')for(let i=0;i<10;i++)P.ell(U.lerp(-1,1,r()),U.lerp(1.4,3,r()),.05,.04,'#FFF0F4',.9)})}
function bush(col='#6FAE5A',flowers=null,v=0){return make(`bush:${col}:${flowers}:${v}`,1.4,.9,(P,r)=>{P.ell(0,.02,.65,.14,'#2E4A2E',.2);
 [[-.32,.32,.4,.32],[.3,.34,.42,.34],[0,.52,.48,.4]].forEach(([x,y,rx,ry])=>P.facet(x,y,P.blob(x,y,rx,ry,8,r),col,{rng:r,str:.3}));
 if(flowers)for(let i=0;i<9;i++){const x=U.lerp(-.6,.6,r()),y=U.lerp(.25,.85,r());P.ell(x,y,.06,.05,flowers);P.ell(x,y,.022,.02,'#FFF4C8')}})}
function rock(size=1,v=0){return make(`rock:${size}:${v}`,1.2*size,.9*size,(P,r)=>{P.ell(0,.02,.55*size,.12*size,'#2B3A2E',.2);
 const pts=[[-.55,0],[-.5,.3],[-.22,.62],[.18,.7],[.5,.42],[.56,0]].map(([x,y])=>[x*size*(1+(r()-.5)*.15),y*size*(1+(r()-.5)*.2)]);P.facet(0,.3*size,pts,'#B9B4A8',{rng:r,str:.35});
 P.poly([[-.2*size,.6*size],[.15*size,.68*size],[-.05*size,.4*size]],'#FFFFFF',.18);if(r()<.6)P.poly([[-.5*size,.05],[-.45*size,.22*size],[-.2*size,.08]],'#7FAE6A',.8)})}
function flowers(cols,v=0){return make(`flw:${cols.join()}:${v}`,1,.45,(P,r)=>{for(let i=0;i<9;i++){const x=U.lerp(-.45,.45,r()),h=U.lerp(.12,.32,r());P.line([[x,0],[x+.02,h]],'#5E9A4E',.025);
 P.poly([[x-.05,h],[x+.02,h+.05],[x+.07,h-.01]],'#6FAE5A');const c=cols[i%cols.length];for(let j=0;j<5;j++){const a=j/5*Math.PI*2;P.ell(x+.02+Math.cos(a)*.04,h+.02+Math.sin(a)*.035,.032,.028,c)}P.ell(x+.02,h+.02,.022,.02,'#FFE08A')}})}
function tuft(col='#6FAE5A',v=0){return make(`tuft:${col}:${v}`,.5,.35,(P,r)=>{const b=U.hex(col);for(let i=0;i<7;i++){const x=U.lerp(-.2,.2,r()),h=U.lerp(.14,.3,r()),lean=U.lerp(-.1,.1,r());P.poly([[x-.03,0],[x+.03,0],[x+lean,h]],U.shade(b,(r()-.4)*.3))}})}

/* ---------- 房屋 ---------- */
function house(styleId){const H=OC.Content.HOUSES.find(h=>h.id===styleId)||OC.Content.HOUSES[0];return make('house:'+H.id,4.6,4.4,(P,r)=>{
 const w=3.2,hw=1.75,d=2.4,dv=[.42*d,.46*d],o=.22,hr=1.35;const C=U.hex;
 P.ell(.6,.25,2.5,.55,'#1E2E22',.22);
 /* 石砌地基 */
 P.poly([[-w/2-.06,0],[w/2+.06,0],[w/2+.06+dv[0],dv[1]],[w/2+.06+dv[0],dv[1]+.2],[w/2+.06,.2],[-w/2-.06,.2]],H.stone);
 /* 側牆、正面 */
 P.poly([[w/2,.18],[w/2+dv[0],.18+dv[1]],[w/2+dv[0],hw+dv[1]],[w/2,hw]],U.shade(C(H.wall),-.18));
 P.poly([[-w/2,.18],[w/2,.18],[w/2,hw],[-w/2,hw]],H.wall);
 if(H.id==='cabin'){for(let y=.35;y<hw;y+=.22){P.line([[-w/2,y],[w/2,y]],U.shade(C(H.wall),-.25),.02,.6);P.line([[w/2,y],[w/2+dv[0],y+dv[1]]],U.shade(C(H.wall),-.4),.02,.5)}
  P.ell(-w/2,1,.09,.09,U.shade(C(H.wall),-.1));P.ell(w/2,1,.09,.09,U.shade(C(H.wall),-.1))}
 if(H.id==='cottage'){for(const sx of [-1,1])for(let y=.25;y<hw-.1;y+=.3){const x=sx*(w/2)-(sx>0?.28:0);P.poly([[x,y],[x+.28,y],[x+.28,y+.24],[x,y+.24]],U.shade(C(H.stone),(r()-.5)*.15))}}
 /* 側面窗戶 */
 const sw=(t,y,ww,hh)=>{const x0=w/2+dv[0]*t,y0=y+dv[1]*t;P.poly([[x0,y0],[x0+dv[0]*ww,y0+dv[1]*ww],[x0+dv[0]*ww,y0+dv[1]*ww+hh],[x0,y0+hh]],'#3E5266');P.poly([[x0+.02,y0+.03],[x0+dv[0]*ww-.02,y0+dv[1]*ww+.0],[x0+dv[0]*ww-.02,y0+dv[1]*ww+hh*.5],[x0+.02,y0+hh*.5]],'#5F7C93',.6)};
 sw(.3,.85,.35,.55);
 /* 門與門廊 */
 P.poly([[-.36,.18],[.36,.18],[.36,1.3],[0,1.42],[-.36,1.3]],H.trim);P.poly([[-.28,.18],[.28,.18],[.28,1.24],[0,1.34],[-.28,1.24]],H.door);
 P.poly([[0,.18],[.28,.18],[.28,1.24],[0,1.34]],U.shade(C(H.door),-.12));P.ell(.18,.72,.035,.035,'#F2D27A');
 P.box(-.55,0,1.1,.14,.35,'#C9BBA4',{edge:false});
 /* 正面窗戶（夜晚另有燈光圖層） */
 const win=(x,y,ww,hh,round)=>{if(round){P.ell(x,y,ww,ww,H.trim);P.ell(x,y,ww*.8,ww*.8,'#3E5266');P.ell(x-.04,y+.04,ww*.4,ww*.4,'#6E8BA3',.6);P.line([[x-ww*.8,y],[x+ww*.8,y]],H.trim,.03);P.line([[x,y-ww*.8],[x,y+ww*.8]],H.trim,.03);return}
  P.poly([[x-ww/2-.05,y-.05],[x+ww/2+.05,y-.05],[x+ww/2+.05,y+hh+.05],[x-ww/2-.05,y+hh+.05]],H.trim);P.poly([[x-ww/2,y],[x+ww/2,y],[x+ww/2,y+hh],[x-ww/2,y+hh]],'#3E5266');
  P.poly([[x-ww/2,y+hh*.55],[x-ww/2,y+hh],[x+ww/2*.2,y+hh]],'#7E9BB2',.55);P.line([[x,y],[x,y+hh]],H.trim,.03);P.line([[x-ww/2,y+hh/2],[x+ww/2,y+hh/2]],H.trim,.03);
  P.box(x-ww/2-.08,y-.16,ww+.16,.1,.18,H.trim,{edge:false});for(let i=0;i<4;i++)P.ell(x-ww/2+.05+i*(ww/3),y-.02,.07,.06,['#F08FA5','#FFD36E','#F6F0E6','#B79CF0'][i])};
 win(-.95,.8,.6,.55,H.id==='garden');win(.95,.8,.6,.55,H.id==='garden');
 /* 屋頂：右斜面＋正面山牆 */
 const rr=U.hex(H.roof),rr2=U.hex(H.roof2);
 P.poly([[0,hw+hr],[w/2+o,hw-.1],[w/2+o+dv[0],hw-.1+dv[1]],[dv[0],hw+hr+dv[1]]],rr2);
 for(let i=1;i<6;i++){const t=i/6;P.line([[U.lerp(0,w/2+o,t),U.lerp(hw+hr,hw-.1,t)],[U.lerp(dv[0],w/2+o+dv[0],t),U.lerp(hw+hr+dv[1],hw-.1+dv[1],t)]],U.shade(rr2,-.18),.025,.7)}
 P.poly([[-w/2,hw],[w/2,hw],[0,hw+hr-.06]],U.shade(C(H.wall),.04));
 if(H.id==='garden')P.ell(0,hw+.45,.22,.22,'#3E5266'),P.ell(0,hw+.45,.16,.16,'#6E8BA3',.7);
 else win(0,hw+.22,.36,.32,false);
 P.poly([[-w/2-o,hw-.1],[0,hw+hr],[0,hw+hr+.16],[-w/2-o-.02,hw+.06]],rr);
 P.poly([[w/2+o,hw-.1],[0,hw+hr],[0,hw+hr+.16],[w/2+o+.02,hw+.06]],U.shade(rr,-.08));
 P.poly([[0,hw+hr+.16],[dv[0],hw+hr+dv[1]+.16],[dv[0],hw+hr+dv[1]],[0,hw+hr]],U.shade(rr,.15));
 /* 煙囪 */
 const cx=w*.28+dv[0]*.6,cy=hw+hr*.45+dv[1]*.6;P.box(cx-.14,cy-.1,.28,.62,.22,H.id==='cabin'?'#9C8F80':'#B9775F');
 /* 屋前小花、信箱 */
 P.ell(-1.35,.08,.22,.1,'#2E4A2E',.15);P.line([[-1.3,0],[-1.3,.62]],'#8B6A4E',.05);P.box(-1.46,.62,.32,.2,.2,H.roof);
 for(let i=0;i<6;i++)P.ell(U.lerp(.6,1.5,r()),U.lerp(.04,.16,r()),.07,.06,['#F08FA5','#FFD36E','#FFFFFF'][i%3])},{pad:.3})}
/* 房子夜間窗光（加在燈光圖層，用 lighter 疊加） */
const HOUSE_LIGHTS=[[-.95,1.08,.5],[.95,1.08,.5],[0,1.95,.35]];

/* ---------- 擺設 ---------- */
const PROPS={
 bench:()=>make('bench',1.6,.9,P=>{P.ell(0,.04,.8,.12,'#2E3A2E',.2);P.box(-.7,.32,1.4,.08,.36,'#B5835A');P.box(-.7,.48,1.4,.32,.06,'#A8774F');for(const x of [-.6,.5])P.box(x,0,.08,.32,.3,'#6E5A4A')}),
 campfire:()=>make('campfire',1.1,.6,(P,r)=>{P.ell(0,.04,.5,.13,'#2B2B2B',.2);for(let i=0;i<8;i++){const a=i/8*Math.PI*2;P.ell(Math.cos(a)*.38,.06+Math.sin(a)*.1,.1,.07,U.shade(U.hex('#9A958C'),(r()-.5)*.3))}
  P.poly([[-.3,.06],[.25,.2],[.28,.14],[-.27,.0]],'#7A5236');P.poly([[.3,.06],[-.25,.2],[-.28,.14],[.27,.0]],'#8B6A4E')}),
 well:()=>make('well',1.2,1.6,P=>{P.ell(0,.04,.6,.14,'#2E3A2E',.2);P.box(-.45,0,.9,.55,.4,'#BDB4A3');P.ell(.17,.65,.34,.12,'#4F86A8');P.box(-.5,.55,.06,.75,.06,'#8B6A4E');P.box(.62,.7,.06,.75,.06,'#8B6A4E');P.poly([[-.6,1.25],[.2,1.6],[.95,1.4],[.16,1.08]],'#B8574A')}),
 sign:()=>make('sign',.8,1.1,P=>{P.box(-.04,0,.08,.8,.06,'#7A5A40');P.box(-.36,.5,.72,.36,.06,'#C79A6A');P.line([[-.24,.74],[.2,.74]],'#8A6444',.03);P.line([[-.24,.62],[.12,.62]],'#8A6444',.03)}),
 mailbox:()=>make('mailbox',.5,1.1,P=>{P.box(-.04,0,.08,.7,.06,'#7A5A40');P.box(-.18,.7,.36,.24,.3,'#E07A5F')}),
 lamp:()=>make('lamppost',.5,2.4,P=>{P.ell(0,.03,.2,.06,'#222',.2);P.box(-.05,0,.1,1.9,.06,'#4C5560');P.box(-.15,1.9,.3,.32,.2,'#3E4650');P.box(-.11,1.94,.22,.24,.08,'#FFE7A8');P.poly([[-.2,2.22],[.12,2.36],[.32,2.22],[0,2.12]],'#3E4650')}),
 fence:()=>make('fence',1.2,.7,P=>{for(const x of [-.5,.42])P.box(x,0,.08,.6,.06,'#D9CBB2');P.box(-.55,.38,1.1,.07,.04,'#E8DCC6');P.box(-.55,.18,1.1,.07,.04,'#E8DCC6')}),
 plot:()=>make('plot',1.4,.4,(P,r)=>{P.poly([[-.65,0],[.65,0],[.85,.25],[-.45,.25]],'#8A6A4E');P.poly([[-.6,.03],[.6,.03],[.78,.22],[-.42,.22]],'#6E5038');for(let i=0;i<6;i++)P.line([[-.5+i*.2,.06],[-.36+i*.2,.2]],'#5A402C',.02,.6)}),
 fountain:()=>make('fountain',2.6,2.2,(P,r)=>{P.ell(0,.05,1.25,.3,'#223',.18);P.ell(0,.2,1.2,.36,'#D8D2C6');P.ell(0,.28,1.05,.3,'#7CC4DE');P.ell(-.2,.32,.5,.12,'#B7E4F0',.6);P.box(-.14,.3,.28,.9,.1,'#D8D2C6');P.ell(0,1.25,.45,.13,'#D8D2C6');P.ell(0,1.3,.38,.1,'#8FD0E6')}),
 stall:(c='#E58C7A',t='')=>make('stall:'+c,2.4,2.4,P=>{P.ell(.3,.05,1.3,.25,'#223',.18);P.box(-1,0,2,.8,.8,'#C79A6A');P.box(-.95,.8,1.9,.06,.6,'#E8D7B8');for(const x of [-.98,.9])P.box(x,.8,.08,1,.06,'#8B6A4E');
  for(let i=0;i<6;i++)P.poly([[-1.15+i*.4,1.8],[-.75+i*.4,1.8],[-.75+i*.4+.3,2.15],[-1.15+i*.4+.3,2.15]],i%2?c:'#FFF6EA');for(let i=0;i<4;i++)P.ell(-.6+i*.4,.95,.1,.1,['#E0533F','#F2C14E','#7FB65A','#F08FA5'][i])}),
 shop:(c,name,awn)=>make('shop:'+name,3.4,3.6,(P,r)=>{const w=3,hw=2.2,d=1.6,dv=[.42*d,.46*d];P.ell(.4,.1,2.1,.4,'#1E2E22',.2);
  P.poly([[w/2,0],[w/2+dv[0],dv[1]],[w/2+dv[0],hw+dv[1]],[w/2,hw]],U.shade(U.hex(c),-.2));P.poly([[-w/2,0],[w/2,0],[w/2,hw],[-w/2,hw]],c);
  P.poly([[-w/2-.1,hw],[w/2+.1,hw],[w/2+.1+dv[0],hw+dv[1]],[-w/2-.1+dv[0],hw+dv[1]]],U.shade(U.hex(c),.25));P.box(-w/2-.1,hw,w+.2,.3,d,'#8A6A55');
  P.box(-1.2,.5,1.1,.9,.05,'#3E5266');P.poly([[-1.15,.95],[-1.15,1.35],[-.7,1.35]],'#8FB0C6',.6);P.box(.2,0,.7,1.4,.05,'#6E4C33');P.ell(.78,.7,.04,.04,'#F2D27A');
  for(let i=0;i<7;i++)P.poly([[-1.55+i*.44,hw-.1],[-1.11+i*.44,hw-.1],[-1.11+i*.44,hw-.45],[-1.33+i*.44,hw-.55],[-1.55+i*.44,hw-.45]],i%2?awn:'#FFF6EA');
  P.box(-.9,hw+.32,1.8,.42,.04,'#FFF6EA');}),
 pier:()=>make('pier',2.4,1,P=>{for(let i=0;i<6;i++)P.box(-1.1+i*.37,.2,.34,.08,1.2,i%2?'#B58A5E':'#C49A6C');for(const x of [-1.1,1])P.box(x,0,.1,.3,.1,'#7A5A40')}),
 umbrella:()=>make('umbrella',1.8,2.2,P=>{P.ell(0,.03,.9,.2,'#223',.15);P.line([[0,0],[.1,1.7]],'#EEE',.05);for(let i=0;i<6;i++){const a0=-Math.PI+i*Math.PI/6,a1=a0+Math.PI/6;P.poly([[.1,1.95],[.1+Math.cos(a0)*.95,1.5+Math.sin(a0)*-.2],[.1+Math.cos(a1)*.95,1.5+Math.sin(a1)*-.2]],i%2?'#F08080':'#FFF6EA')}}),
 log:()=>make('log',1.6,.6,P=>{P.ell(0,.03,.75,.12,'#223',.18);P.box(-.7,0,1.4,.36,.3,'#8B6A4E',{top:'#A27E5E'});P.ell(-.7+.06,.25,.1,.17,'#D9B98E')}),
 stump:()=>make('stump',.8,.6,P=>{P.ell(0,.03,.4,.1,'#223',.18);P.box(-.3,0,.6,.35,.4,'#8B6A4E',{top:'#D9B98E'})}),
 mushrooms:()=>make('mush',.7,.5,(P,r)=>{for(let i=0;i<4;i++){const x=U.lerp(-.25,.25,r()),h=U.lerp(.1,.25,r());P.box(x-.02,0,.04,h,.03,'#F4ECDD');P.poly([[x-.1,h],[x+.1,h],[x,h+.1]],'#D9534F');P.ell(x-.02,h+.04,.015,.015,'#FFF')}}),
 picnic:()=>make('picnic',1.8,.5,P=>{P.poly([[-.8,0],[.7,0],[.95,.32],[-.55,.32]],'#E46B6B');for(let i=0;i<5;i++)P.poly([[-.8+i*.3,0],[-.65+i*.3,0],[-.4+i*.3,.32],[-.55+i*.3,.32]],'#FFFFFF',.7);P.box(.2,.1,.32,.18,.18,'#C99B6D')}),
 bridge:()=>make('bridge',3.2,.7,P=>{for(let i=0;i<8;i++)P.box(-1.5+i*.38,.08,.36,.07,1.6,i%2?'#B58A5E':'#C49A6C');P.box(-1.6,.15,3.2,.06,.05,'#8B6A4E');P.box(-1.6+.6,.5,3.2,.06,.05,'#8B6A4E')}),
 mat:()=>make('mat',1.6,.4,P=>{P.poly([[-.7,0],[.6,0],[.85,.28],[-.45,.28]],'#9BC4E2');P.poly([[-.5,.04],[.4,.04],[.6,.24],[-.3,.24]],'#BFDBEF')})};

/* ---------- 家具（屋內） ---------- */
const FURN={
 bed:()=>make('f:bed',2,1.4,P=>{P.ell(.3,.04,1,.2,'#223',.15);P.box(-.85,0,1.7,.4,1,'#B58A5E');P.box(-.8,.4,1.6,.16,.95,'#F6F0E6',{top:'#FFFFFF'});P.box(.25,.4,.55,.2,.95,'#8EB6E0',{top:'#A9CBEE'});P.box(-.8,.56,.42,.12,.7,'#FFFFFF');P.box(-.92,0,.14,1.05,1,'#A27A50')}),
 table:()=>make('f:table',1.8,1.2,P=>{P.ell(.2,.04,.85,.2,'#223',.15);for(const x of [-.75,.45])P.box(x,.0,.18,.48,.18,'#C7A97F');P.box(-.55,0,.06,.72,.06,'#8B6A4E');P.box(.45,0,.06,.72,.06,'#8B6A4E');P.box(-.65,.72,1.3,.08,.7,'#B58A5E',{top:'#C99B6D'});P.ell(.05,.86,.13,.05,'#FFFFFF');P.ell(.05,.9,.06,.04,'#E0533F')}),
 kitchen:()=>make('f:kitchen',1.8,1.8,P=>{P.box(-.8,0,1.6,.85,.55,'#E8E1D4');P.box(-.8,.85,1.6,.06,.55,'#9C8F80');P.box(-.7,.15,.6,.55,.02,'#D8CFC0');P.box(.1,.15,.6,.55,.02,'#D8CFC0');P.ell(.45,.95,.18,.06,'#3E3E3E');P.box(-.8,1.25,1.6,.4,.3,'#C99B6D');P.ell(-.35,1.05,.14,.08,'#B85C4A')}),
 shelf:()=>make('f:shelf',1.4,2,P=>{P.box(-.6,0,1.2,1.75,.35,'#A27A50');for(let y=.1;y<1.7;y+=.42){P.box(-.54,y,1.08,.34,.02,'#6E5038');for(let i=0;i<6;i++)P.box(-.5+i*.17,y,.13,.26+(i%3)*.03,.02,['#D96C6C','#6C9AD9','#E8C35A','#7FB65A','#B79CF0','#F2A65A'][(i+y*10|0)%6])}}),
 lamp:()=>make('f:lamp',.6,1.8,P=>{P.ell(0,.03,.22,.06,'#222',.2);P.box(-.03,0,.06,1.3,.04,'#6E5A4A');P.poly([[-.25,1.3],[.25,1.3],[.15,1.65],[-.15,1.65]],'#F6E3B8');P.poly([[0,1.3],[.25,1.3],[.15,1.65],[0,1.65]],'#E8D09E')}),
 plant:()=>make('f:plant',.8,1.3,(P,r)=>{P.box(-.2,0,.4,.35,.3,'#C97B5A');for(let i=0;i<7;i++){const a=-Math.PI/2+(i-3)*.35;P.poly([[0,.35],[Math.cos(a)*-.1,.6],[Math.sin(a)*.45,.9+r()*.25],[Math.cos(a)*.1,.55]],i%2?'#5C9A4C':'#7FB65A')}}),
 rug:()=>make('f:rug',2.2,.6,P=>{P.ell(0,.25,1.05,.28,'#E8A87C');P.ell(0,.25,.82,.21,'#F3C99D');P.ell(0,.25,.5,.13,'#E8A87C')}),
 sofa:()=>make('f:sofa',2,1.2,P=>{P.ell(.2,.04,.95,.2,'#223',.15);P.box(-.85,0,1.7,.4,.7,'#7FA7C9');P.box(-.85,.4,1.7,.45,.15,'#6E96B8');P.box(-.95,0,.18,.62,.7,'#6E96B8');P.box(.77,0,.18,.62,.7,'#6E96B8');P.box(-.6,.4,.5,.24,.12,'#F3D9A0')}),
 radio:()=>make('f:radio',.9,1.1,P=>{P.box(-.3,0,.6,.5,.35,'#B58A5E');P.box(-.3,.5,.6,.36,.3,'#C99B6D');P.ell(-.1,.68,.1,.1,'#5A4636');P.box(.06,.6,.16,.16,.02,'#F2D27A')}),
 bath:()=>make('f:bath',1.6,1,P=>{P.box(-.7,0,1.4,.55,.8,'#C99B6D',{top:'#8FD0E6'});for(let i=0;i<4;i++)P.line([[-.7+i*.46,0],[-.7+i*.46,.55]],'#8B6A4E',.03);P.ell(.1,.75,.12,.06,'#FFFFFF',.8)})};

OC.Sprites={make,tree,bush,rock,flowers,tuft,house,HOUSE_LIGHTS,PROPS,FURN,cache,PPM};
})(window.OC);
