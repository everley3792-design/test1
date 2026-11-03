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

/* ---------- 房屋（v4.1：比例重做——門約 1.8m、牆 2.4m；屋瓦、藤蔓、門燈、石階、門廊） ---------- */
function house(styleId){const H=OC.Content.HOUSES.find(h=>h.id===styleId)||OC.Content.HOUSES[0];return make('house2:'+H.id,6.2,6.2,(P,r)=>{
 const w=3.8,hw=2.45,d=2.8,dv=[.42*d,.46*d],o=.3,hr=1.75;const C=U.hex;const wall=C(H.wall),roofA=C(H.roof),roofB=C(H.roof2);
 P.ell(.7,.3,3,.6,'#1E2E22',.2);
 /* 地基與石階 */
 P.poly([[-w/2-.08,0],[w/2+.08,0],[w/2+.08+dv[0],dv[1]],[w/2+.08+dv[0],dv[1]+.24],[w/2+.08,.24],[-w/2-.08,.24]],H.stone);
 for(let i=0;i<9;i++)P.poly([[-w/2+i*.44,.02],[-w/2+i*.44+.4,.02],[-w/2+i*.44+.4,.2],[-w/2+i*.44,.2]],U.shade(C(H.stone),(r()-.5)*.14));
 /* 側牆、正牆（含柔和漸層陰影） */
 P.poly([[w/2,.22],[w/2+dv[0],.22+dv[1]],[w/2+dv[0],hw+dv[1]],[w/2,hw]],U.shade(wall,-.2));
 P.poly([[-w/2,.22],[w/2,.22],[w/2,hw],[-w/2,hw]],wall);P.poly([[-w/2,hw-.35],[w/2,hw-.35],[w/2,hw],[-w/2,hw]],U.shade(wall,-.08));
 if(H.id==='cabin'){for(let y=.42;y<hw;y+=.26){P.line([[-w/2,y],[w/2,y]],U.shade(wall,-.25),.025,.55);P.line([[w/2,y],[w/2+dv[0],y+dv[1]]],U.shade(wall,-.4),.025,.45)}for(const sx of [-1,1])for(let y=.42;y<hw;y+=.26)P.ell(sx*w/2,y,.07,.07,U.shade(wall,-.05))}
 if(H.id==='cottage'){for(const sx of [-1,1])for(let y=.3;y<hw-.12;y+=.32){const x=sx>0?w/2-.32:-w/2;P.poly([[x,y],[x+.32,y],[x+.32,y+.27],[x,y+.27]],U.shade(C(H.stone),(r()-.5)*.16))}}
 if(H.id==='garden'){P.poly([[-w/2,.22],[w/2,.22],[w/2,.62],[-w/2,.62]],U.shade(C(H.trim),.1));for(let x=-w/2+.15;x<w/2;x+=.3)P.line([[x,.24],[x,.6]],U.shade(C(H.trim),-.15),.02,.5)}
 /* 側窗 */
 const sw=(t,y,ww,hh)=>{const x0=w/2+dv[0]*t,y0=y+dv[1]*t;P.poly([[x0,y0],[x0+dv[0]*ww,y0+dv[1]*ww],[x0+dv[0]*ww,y0+dv[1]*ww+hh],[x0,y0+hh]],'#3E5266');P.poly([[x0+.03,y0+.04],[x0+dv[0]*ww-.03,y0+dv[1]*ww],[x0+dv[0]*ww-.03,y0+dv[1]*ww+hh*.45],[x0+.03,y0+hh*.45]],'#6E8BA3',.6)};sw(.32,1.1,.32,.72);
 /* 門（1.8m）、門框、門牌、門燈 */
 P.poly([[-.5,.22],[.5,.22],[.5,1.85],[0,2.05],[-.5,1.85]],H.trim);P.poly([[-.4,.22],[.4,.22],[.4,1.8],[0,1.96],[-.4,1.8]],H.door);
 P.poly([[0,.22],[.4,.22],[.4,1.8],[0,1.96]],U.shade(C(H.door),-.12));for(const yy of [.6,1.15])P.line([[-.32,yy],[.32,yy]],U.shade(C(H.door),-.2),.02,.6);P.ell(.26,1,.045,.045,'#F2D27A');
 P.ell(-.75,1.55,.12,.16,'#3E4650');P.ell(-.75,1.55,.08,.11,'#FFE7A8');P.line([[-.75,1.72],[-.75,1.85],[-.6,1.85]],'#3E4650',.03);
 P.box(-.7,0,1.4,.12,.55,'#C9BBA4',{edge:false});P.box(-.58,.12,1.16,.1,.38,'#D8CCB6',{edge:false});
 /* 正面窗（亮光由燈光圖層疊加） */
 const win=(x,y,ww,hh,round)=>{if(round){P.ell(x,y,ww*.62,ww*.62,H.trim);P.ell(x,y,ww*.5,ww*.5,'#3E5266');P.ell(x-.06,y+.06,ww*.25,ww*.25,'#7E9BB2',.6);P.line([[x-ww*.5,y],[x+ww*.5,y]],H.trim,.04);P.line([[x,y-ww*.5],[x,y+ww*.5]],H.trim,.04);return}
  P.poly([[x-ww/2-.06,y-.06],[x+ww/2+.06,y-.06],[x+ww/2+.06,y+hh+.06],[x-ww/2-.06,y+hh+.06]],H.trim);P.poly([[x-ww/2,y],[x+ww/2,y],[x+ww/2,y+hh],[x-ww/2,y+hh]],'#3E5266');
  P.poly([[x-ww/2,y+hh*.5],[x-ww/2,y+hh],[x+ww/2*.15,y+hh]],'#7E9BB2',.5);P.line([[x,y],[x,y+hh]],H.trim,.035);P.line([[x-ww/2,y+hh/2],[x+ww/2,y+hh/2]],H.trim,.035);
  P.box(x-ww/2-.1,y-.2,ww+.2,.12,.22,H.trim,{edge:false});for(let i=0;i<5;i++){P.ell(x-ww/2+.04+i*(ww/4),y-.05,.08,.07,['#F08FA5','#FFD36E','#F6F0E6','#B79CF0','#F08FA5'][i]);P.ell(x-ww/2+.06+i*(ww/4),y-.11,.05,.035,'#7FB65A')}};
 win(-1.2,1.05,.74,.74,H.id==='garden');win(1.2,1.05,.74,.74,H.id==='garden');
 /* 屋頂：右斜面、屋瓦列、正面山牆 */
 P.poly([[0,hw+hr],[w/2+o,hw-.12],[w/2+o+dv[0],hw-.12+dv[1]],[dv[0],hw+hr+dv[1]]],roofB);
 for(let i=1;i<8;i++){const t=i/8;const a=[U.lerp(0,w/2+o,t),U.lerp(hw+hr,hw-.12,t)],b=[U.lerp(dv[0],w/2+o+dv[0],t),U.lerp(hw+hr+dv[1],hw-.12+dv[1],t)];P.line([a,b],U.shade(roofB,-.2),.03,.7);
  for(let k=0;k<6;k++){const u=(k+(i%2)*.5)/6;P.line([[U.lerp(a[0],b[0],u),U.lerp(a[1],b[1],u)],[U.lerp(a[0],b[0],u)-.12,U.lerp(a[1],b[1],u)+.14]],U.shade(roofB,-.18),.018,.5)}}
 P.poly([[-w/2,hw],[w/2,hw],[0,hw+hr-.08]],U.shade(wall,.05));
 if(H.id==='garden'){P.ell(0,hw+.6,.3,.3,H.trim);P.ell(0,hw+.6,.22,.22,'#3E5266');P.ell(-.05,hw+.65,.1,.1,'#7E9BB2',.6)}else win(0,hw+.3,.46,.42,false);
 P.poly([[-w/2-o,hw-.12],[0,hw+hr],[0,hw+hr+.2],[-w/2-o-.03,hw+.08]],roofA);
 P.poly([[w/2+o,hw-.12],[0,hw+hr],[0,hw+hr+.2],[w/2+o+.03,hw+.08]],U.shade(roofA,-.08));
 P.poly([[0,hw+hr+.2],[dv[0],hw+hr+dv[1]+.2],[dv[0],hw+hr+dv[1]],[0,hw+hr]],U.shade(roofA,.16));
 for(let i=0;i<7;i++){const t=(i+.5)/7;P.ell(U.lerp(-w/2-o,0,t),U.lerp(hw-.02,hw+hr+.1,t),.06,.05,U.shade(roofA,.22))}
 /* 煙囪 */
 const cx=w*.27+dv[0]*.55,cy=hw+hr*.48+dv[1]*.55;P.box(cx-.17,cy-.1,.34,.8,.26,H.id==='cabin'?'#9C8F80':'#B9775F');P.box(cx-.21,cy+.7,.42,.1,.3,H.id==='cabin'?'#8A7D70':'#A5664F');
 /* 門廊遮陽（紅瓦屋）／前廊欄杆（原木屋）／藤蔓（白牆屋） */
 if(H.id==='cottage'){P.poly([[-.75,2.1],[.75,2.1],[.95,1.8],[-.95,1.8]],'#F3EBDD');for(let i=0;i<6;i++)P.poly([[-.95+i*.32,1.8],[-.79+i*.32,1.8],[-.87+i*.32,1.68]],i%2?'#E8B9A3':'#F7E8D8');P.line([[-.9,1.8],[-.9,.24]],'#8A5A44',.05);P.line([[.9,1.8],[.9,.24]],'#8A5A44',.05)}
 if(H.id==='cabin'){P.box(-w/2-.05,.22,w+.1,.08,.7,'#A9773F',{edge:false});for(let x=-w/2;x<=w/2+.01;x+=.38){if(Math.abs(x)<.55)continue;P.line([[x,.3],[x,.85]],'#8C5E36',.04)}P.line([[-w/2,.85],[-.55,.85]],'#8C5E36',.05);P.line([[.55,.85],[w/2,.85]],'#8C5E36',.05)}
 const vine=(x0,dir)=>{let x=x0,y=.25;for(let i=0;i<14;i++){const nx=x+dir*(r()-.3)*.18,ny=y+.17;P.line([[x,y],[nx,ny]],'#5E8F4E',.035);P.ell(nx+(r()-.5)*.12,ny,.08,.06,i%3?'#7FB65A':'#6FA85A');if(i%3===1)P.ell(nx+.05,ny+.04,.045,.045,i%2?'#FFFFFF':'#F6B8C8');x=nx;y=ny}};
 vine(-w/2+.08,1);if(H.id==='garden')vine(w/2-.12,-1);
 /* 屋前小花叢、信箱 */
 P.ell(-1.85,.08,.26,.12,'#2E4A2E',.15);P.line([[-1.8,0],[-1.8,.85]],'#8B6A4E',.06);P.box(-1.98,.85,.36,.24,.24,roofA);
 for(let i=0;i<10;i++)P.ell(U.lerp(.75,1.9,r()),U.lerp(.04,.2,r()),.08,.07,['#F08FA5','#FFD36E','#FFFFFF','#B79CF0'][i%4])},{pad:.35})}
const HOUSE_LIGHTS=[[-1.2,1.42,.62],[1.2,1.42,.62],[0,2.75,.42],[-.75,1.55,.3]];

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
 lily:(v=0)=>make('lily:'+v,.9,.3,(P,r)=>{for(let i=0;i<3;i++){const x=(r()-.5)*.5,y=.08+r()*.1,s=.12+r()*.08;P.ell(x,y,s,s*.45,'#6FAE55');P.poly([[x,y],[x+s,y+.01],[x+s*.8,y-s*.2]],'#5C9A4C')}if(v%2===0){P.ell(.05,.16,.06,.04,'#FFF4F6');P.ell(.05,.18,.03,.025,'#F6B8C8')}}),
 cattail:(v=0)=>make('cattail:'+v,.6,1.2,(P,r)=>{for(let i=0;i<5;i++){const x=(r()-.5)*.4,h=.6+r()*.4;P.line([[x,0],[x+(r()-.5)*.08,h]],'#6FA85A',.025);if(i%2===0)P.poly([[x-.03,h-.05],[x+.03,h-.05],[x+.03,h+.15],[x-.03,h+.15]],'#8B5A3C');else P.poly([[x,0],[x+.05,0],[x+(r()-.5)*.3,h*.8]],'#86BE64')}}),
 stones:(v=0)=>make('stones:'+v,1.4,.3,(P,r)=>{for(let i=0;i<3;i++){const x=-.45+i*.45+(r()-.5)*.1,y=.1+(r()-.5)*.05;P.ell(x,y-.02,.17,.07,'#9A9488',.5);P.ell(x,y,.16,.07,'#CFC9BC');P.ell(x-.04,y+.02,.07,.03,'#E4DFD4')}}),
 boat:()=>make('boat',2.2,.9,P=>{P.ell(0,.05,1,.18,'#1E3A4A',.18);P.poly([[-1,.4],[1,.4],[.75,.05],[-.75,.05]],'#9C6B46');P.poly([[-1,.4],[1,.4],[.92,.48],[-.92,.48]],'#B98455');P.poly([[-.85,.4],[.85,.4],[.7,.18],[-.7,.18]],'#7A5236');P.box(-.1,.25,.2,.12,.5,'#C99B6D');P.line([[.2,.45],[.9,.75]],'#C99B6D',.04)}),
 lampost:()=>make('lampost2',.5,1.6,P=>{P.ell(0,.03,.2,.06,'#222',.2);P.box(-.04,0,.08,1.2,.05,'#6E5A4A');P.box(-.13,1.2,.26,.3,.2,'#5B4D54');P.box(-.09,1.24,.18,.22,.05,'#FFE7A8');P.poly([[-.18,1.5],[.18,1.5],[0,1.62]],'#4E4148')}),
 rdoor:()=>make('rdoor',1.4,2.3,P=>{P.poly([[-.6,0],[.6,0],[.6,1.95],[0,2.15],[-.6,1.95]],'#8C5E36');P.poly([[-.48,0],[.48,0],[.48,1.88],[0,2.04],[-.48,1.88]],'#B07A47');P.poly([[0,0],[.48,0],[.48,1.88],[0,2.04]],'#A06D3F');P.ell(.33,1,.05,.05,'#FFD36E');P.ell(0,1.6,.18,.18,'#FFE7A8',.7);P.poly([[-.55,.02],[.55,.02],[.7,-.08],[-.7,-.08]],'#9BC4A2')}),
 mat:()=>make('mat',1.6,.4,P=>{P.poly([[-.7,0],[.6,0],[.85,.28],[-.45,.28]],'#9BC4E2');P.poly([[-.5,.04],[.4,.04],[.6,.24],[-.3,.24]],'#BFDBEF')})};

/* ---------- 家具（屋內，v4.1：統一斜投影、木紋、軟墊細節） ---------- */
const wood=(P,x,y,w,h,col)=>{for(let i=1;i<4;i++)P.line([[x+.03,y+h*i/4],[x+w-.03,y+h*i/4+.01]],U.shade(U.hex(col),-.12),.008,.6)};
const FURN={
 bed:()=>make('f:bed2',2.2,1.5,P=>{P.ell(.3,.04,1.05,.22,'#223',.15);P.box(-.9,0,1.8,.36,1.05,'#B98455');wood(P,-.9,0,1.8,.36,'#B98455');P.box(-.86,.36,1.72,.18,1,'#FBF6EE',{top:'#FFFFFF'});
  P.box(.05,.4,.8,.2,1,'#8EB6E0',{top:'#A9CBEE'});for(let i=0;i<4;i++)P.line([[.12+i*.2,.6],[.12+i*.2+.4,1.05]],'#C2D9F1',.025,.8);P.box(-.82,.54,.5,.14,.72,'#FFFFFF',{top:'#FFFDF8'});P.ell(-.57,.75,.2,.06,'#EFE9F7',.8);
  P.box(-1,0,.16,1.15,1.05,'#A27A50');P.ell(-.92,1.12,.12,.08,'#C99B6D')}),
 table:()=>make('f:table2',2,1.3,P=>{P.ell(.25,.04,.95,.22,'#223',.15);for(const x of [-.8,.55])P.box(x,0,.26,.5,.26,'#C7A97F',{top:'#E8C98F'});
  P.box(-.55,0,.07,.78,.07,'#8B6A4E');P.box(.48,0,.07,.78,.07,'#8B6A4E');P.box(-.7,.78,1.4,.09,.75,'#B98455',{top:'#D2A673'});wood(P,-.7,.87,1.4,.0,'#C99B6D');
  P.ell(.05,.95,.18,.06,'#FFFFFF');P.ell(.05,.99,.1,.05,'#E0533F');P.ell(-.35,.93,.1,.04,'#FFFFFF');P.box(.32,.87,.08,.16,.08,'#9FD7F2')}),
 kitchen:()=>make('f:kitchen2',2,2,P=>{P.box(-.9,0,1.8,.9,.6,'#EDE6D9');P.box(-.92,.9,1.84,.07,.62,'#9C8F80',{top:'#B5A897'});for(const x of [-.8,0])P.box(x,.12,.72,.62,.02,'#DCD3C4');
  P.ell(-.44,.45,.035,.035,'#8B6A4E');P.ell(.36,.45,.035,.035,'#8B6A4E');P.ell(.5,1,.2,.07,'#3E3E3E');P.ell(.05,1,.16,.06,'#3E3E3E');P.box(-.9,1.35,1.8,.45,.32,'#C99B6D');wood(P,-.9,1.35,1.8,.45,'#C99B6D');
  P.box(-.55,1.02,.3,.2,.2,'#E8E1D4',{top:'#F6F1E8'});P.ell(-.75,1.08,.15,.09,'#B85C4A');P.line([[-.62,1.1],[-.48,1.22]],'#8B6A4E',.03);for(let i=0;i<3;i++)P.ell(-.6+i*.35,1.62,.06,.08,['#F2D27A','#E0533F','#7FB65A'][i])}),
 shelf:()=>make('f:shelf2',1.5,2.2,P=>{P.box(-.65,0,1.3,1.95,.38,'#A27A50');wood(P,-.65,0,1.3,1.95,'#A27A50');for(let y=.12;y<1.8;y+=.46){P.box(-.58,y,1.16,.38,.02,'#6E5038');
  for(let i=0;i<7;i++){const h=.26+((i*7+y*13)|0)%3*.03;P.box(-.54+i*.16,y,.12,h,.02,['#D96C6C','#6C9AD9','#E8C35A','#7FB65A','#B79CF0','#F2A65A','#8EB6E0'][(i+(y*10|0))%7])}}P.box(-.3,1.95,.6,.12,.3,'#C99B6D');P.ell(-.1,2.12,.12,.06,'#7FB65A')}),
 lamp:()=>make('f:lamp2',.7,1.9,P=>{P.ell(0,.03,.25,.07,'#222',.2);P.ell(0,.06,.18,.05,'#6E5A4A');P.box(-.03,0,.06,1.35,.04,'#6E5A4A');P.poly([[-.28,1.32],[.28,1.32],[.17,1.72],[-.17,1.72]],'#F6E3B8');P.poly([[0,1.32],[.28,1.32],[.17,1.72],[0,1.72]],'#E8D09E');P.line([[-.28,1.32],[.28,1.32]],'#D9BC84',.02)}),
 plant:()=>make('f:plant2',.9,1.4,(P,r)=>{P.box(-.22,0,.44,.4,.32,'#D9825F',{top:'#7A5236'});P.box(-.25,.36,.5,.06,.36,'#C9704E');for(let i=0;i<9;i++){const a=-Math.PI/2+(i-4)*.32;const L=.45+r()*.3;P.poly([[0,.4],[Math.cos(a)*-.12,.62],[Math.sin(a)*L,.95+r()*.3],[Math.cos(a)*.12,.58]],i%2?'#5C9A4C':'#7FB65A')}}),
 rug:()=>make('f:rug2',2.4,.7,P=>{P.ell(0,.28,1.15,.3,'#E8A87C');P.ell(0,.28,.92,.24,'#F6CFA3');P.ell(0,.28,.6,.15,'#E8A87C');P.ell(0,.28,.32,.08,'#F9E2C4');for(let i=0;i<16;i++){const a=i/16*Math.PI*2;P.line([[Math.cos(a)*1.15,.28+Math.sin(a)*.3],[Math.cos(a)*1.22,.28+Math.sin(a)*.32]],'#D98D62',.02)}}),
 sofa:()=>make('f:sofa2',2.2,1.3,P=>{P.ell(.25,.04,1.05,.22,'#223',.15);P.box(-.95,0,1.9,.42,.75,'#7FA7C9');P.box(-.95,.42,1.9,.52,.16,'#6E96B8');for(const x of [-.8,.05])P.box(x,.42,.8,.12,.6,'#8DB4D6',{top:'#A2C3E0'});
  P.box(-1.08,0,.22,.68,.75,'#6E96B8',{top:'#86AED2'});P.box(.86,0,.22,.68,.75,'#6E96B8',{top:'#86AED2'});P.box(-.7,.54,.42,.3,.14,'#F3D9A0');P.box(.3,.54,.42,.3,.14,'#F6B8C8');for(const x of [-.9,.82])P.box(x,-.04,.06,.06,.06,'#5A4636')}),
 radio:()=>make('f:radio2',1,1.2,P=>{P.box(-.35,0,.7,.5,.38,'#B58A5E');P.box(-.33,.5,.66,.4,.32,'#C99B6D');P.ell(-.12,.7,.12,.12,'#5A4636');P.ell(-.12,.7,.07,.07,'#8B6A4E');P.box(.08,.66,.18,.14,.02,'#F2D27A');P.line([[.25,.92],[.42,1.15]],'#6E5A4A',.025)}),
 bath:()=>make('f:bath2',1.8,1.1,P=>{P.box(-.8,0,1.6,.62,.85,'#C99B6D',{top:'#8FD0E6'});for(let i=0;i<5;i++)P.line([[-.8+i*.4,0],[-.8+i*.4,.62]],'#8B6A4E',.03);P.line([[-.8,.18],[.8,.18]],'#6E5038',.04);P.line([[-.8,.48],[.8,.48]],'#6E5038',.04);for(let i=0;i<5;i++)P.ell(-.3+i*.18,.82+i%2*.05,.12,.07,'#FFFFFF',.9);P.ell(.45,.9,.08,.06,'#FFD36E')}),
 chair:()=>make('f:chair2',.9,1.3,P=>{P.ell(.1,.03,.4,.1,'#223',.15);for(const x of [-.3,.2])P.box(x,0,.07,.48,.07,'#8B6A4E');P.box(-.33,.48,.66,.08,.5,'#C99B6D',{top:'#E3B783'});P.box(-.33,.56,.66,.6,.06,'#B98455');P.box(-.22,.75,.44,.28,.02,'#D9AF7E')}),
 wardrobe:()=>make('f:wardrobe2',1.5,2.3,P=>{P.box(-.65,0,1.3,2.05,.6,'#C99B6D');wood(P,-.65,0,1.3,2.05,'#C99B6D');P.line([[0,.08],[0,1.95]],'#A27A50',.03);P.ell(-.08,1,.035,.035,'#FFD36E');P.ell(.08,1,.035,.035,'#FFD36E');P.box(-.7,2.05,1.4,.1,.64,'#A27A50');for(let i=0;i<3;i++)P.box(-.5+i*.38,2.15,.3,.2,.3,['#F6B8C8','#9FC3EE','#FFE08A'][i])}),
 desk:()=>make('f:desk2',1.6,1.5,P=>{P.box(-.7,0,.5,.72,.55,'#B98455');for(let y=.1;y<.7;y+=.22)P.ell(-.45,y+.1,.03,.03,'#FFD36E');P.box(.55,0,.08,.72,.08,'#A27A50');P.box(-.72,.72,1.44,.07,.6,'#C99B6D',{top:'#DDB07B'});P.box(-.2,.79,.5,.36,.04,'#9FC3EE');P.box(-.2,.79,.5,.04,.25,'#6E5A4A');P.poly([[.35,.79],[.52,.79],[.47,1.05],[.4,1.05]],'#F6E3B8')}),
 fireplace:()=>make('f:fire2',1.8,2,P=>{P.box(-.8,0,1.6,1.5,.5,'#C9B7A3');for(let y=.1;y<1.4;y+=.24)for(let x=-.8;x<.8;x+=.4)P.poly([[x+(y*10|0)%2*.2,y],[x+.38+(y*10|0)%2*.2,y],[x+.38+(y*10|0)%2*.2,y+.2],[x+(y*10|0)%2*.2,y+.2]],'#BFAE99');
  P.poly([[-.45,0],[.45,0],[.45,.85],[0,1.05],[-.45,.85]],'#3E3430');P.box(-.95,1.5,1.9,.12,.6,'#A89684');P.ell(-.5,1.72,.1,.12,'#9FD7F2');P.box(.25,1.62,.3,.25,.05,'#C99B6D')}),
 clock:()=>make('f:clock2',.8,2.2,P=>{P.box(-.28,0,.56,1.9,.3,'#B98455');wood(P,-.28,0,.56,1.9,'#B98455');P.ell(0,1.6,.2,.2,'#FFF8EA');P.line([[0,1.6],[0,1.72]],'#6E5038',.02);P.line([[0,1.6],[.09,1.56]],'#6E5038',.02);P.box(-.15,.4,.3,.7,.02,'#8B6A4E');P.ell(0,.6,.08,.08,'#FFD36E')}),
 bowl:()=>make('f:bowl2',.9,1.2,P=>{P.box(-.25,0,.5,.55,.3,'#C99B6D');P.ell(0,.85,.32,.3,'#CFEFFB');P.ell(0,.85,.32,.3,'#9FD7F2',.35);P.ell(-.05,.8,.1,.05,'#F7913C');P.ell(.1,.92,.06,.03,'#F7913C');P.ell(-.1,1,.08,.03,'#FFFFFF',.7)}),
 piano:()=>make('f:piano2',2,1.6,P=>{P.box(-.85,0,1.7,1.25,.5,'#3A3438',{top:'#4A4448'});P.box(-.8,.7,1.6,.12,.32,'#FFFFFF');for(let i=0;i<11;i++)P.box(-.75+i*.15,.76,.06,.06,.18,'#2E2A2E');P.box(-.3,1.25,.6,.2,.04,'#F6E3B8');P.ell(.55,1.3,.1,.06,'#F08FA5')}),
 lantern:()=>make('f:lantern2',.5,1.1,P=>{P.box(-.18,0,.36,.08,.2,'#4E4148');P.box(-.15,.08,.3,.5,.18,'#5B4D54');P.box(-.1,.12,.2,.4,.02,'#FFE7A8');P.poly([[-.2,.58],[.2,.58],[0,.78]],'#4E4148');P.line([[0,.78],[0,.95]],'#4E4148',.03)}),
 flowerbed:()=>make('f:fbed2',1.6,1,(P,r)=>{P.box(-.7,0,1.4,.4,.42,'#C99B6D');wood(P,-.7,0,1.4,.4,'#C99B6D');for(let i=0;i<8;i++){const x=-.6+i*.17;P.line([[x,.4],[x,.62+r()*.1]],'#5E9A4E',.025);P.ell(x,.68+r()*.08,.07,.06,['#F08FA5','#FFD36E','#B79CF0','#FFFFFF'][i%4])}})};
/* 玩家作品圖片 → 場景素材（寬度以公尺計） */
function fromImg(key,src,wM){if(cache.has(key))return cache.get(key);const img=new Image();const ent={pending:true};cache.set(key,null);img.onload=()=>{const k=PPM;const W=Math.max(8,Math.round(wM*k)),H=Math.max(8,Math.round(wM*k*img.height/img.width));const cv=document.createElement('canvas');cv.width=W;cv.height=H+Math.round(.1*k);const g=cv.getContext('2d');
 g.globalAlpha=.18;g.fillStyle='#223';g.beginPath();g.ellipse(W/2,H,W*.42,.08*k,0,0,Math.PI*2);g.fill();g.globalAlpha=1;g.drawImage(img,0,0,W,H);cache.set(key,{cv,wM:W/k,hM:cv.height/k,ax:.5,ay:H/cv.height,key});OC.R&&OC.R.invalidate&&OC.R.invalidate()};img.src=src;return null}
OC.Sprites={make,tree,bush,rock,flowers,tuft,house,HOUSE_LIGHTS,PROPS,FURN,cache,PPM,fromImg};
})(window.OC);
