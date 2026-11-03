/* OC Shimeji v4.1 · 繪畫工作室（工坊核心）
   筆刷／橡皮擦／油漆桶／滴管／直線／方形／圓形、左右對稱、色輪＋色票＋最近使用、5 個圖層、復原重做、縮放、匯入圖片、動畫洋蔥皮。
   Studio.open({w,h,base,onion,guide,title}) → Promise<dataURL|null> */
(function(OC){'use strict';
const {U,Icons}=OC;const {$,esc}=U;const ic=(n,s=22)=>Icons.svg(n,s);
const SW=['#2E2A2E','#6B5A52','#FFFFFF','#F4E8D7','#F6E9E9','#E8B9BB','#F08D9F','#E8574C','#F7A35C','#FFD36E','#B7D46B','#7FC27A','#4E9E68','#9FD7F2','#6FA8E6','#5D7DE6','#B79CF0','#8E73D9','#C99B6D','#8B6A4E'];
const Studio={
 open(o={}){return new Promise(res=>{this.res=res;this.o=o;this.W=o.w||384;this.H=o.h||384;this.tool='brush';this.size=o.size||10;this.alpha=1;this.color=o.color||'#6B5A52';this.mirror=false;this.undo=[];this.redo=[];this.zoom=1;this.pan={x:0,y:0};
  this.recent=(OC.S.ui&&OC.S.ui.recentColors)||[];
  this.layers=[this.mk()];this.cur=0;this.vis=[true];
  const el=U.el(`<div class="studio" id="studio"><div class="st-top"><button class="rb" data-x>${ic('close',20)}</button><b>${esc(o.title||'繪畫')}</b><span class="sp"></span><button class="rb" data-undo>${ic('undo',20)}</button><button class="rb" data-redo>${ic('redo',20)}</button><button class="btn primary sm" data-done>${ic('check',18)}完成</button></div>
   <div class="st-stage nodrag" id="stStage"><canvas id="stCv"></canvas></div>
   <div class="st-bar">
    <div class="st-tools">${[['brush','brush','筆刷'],['eraser','eraser','橡皮擦'],['fill','bucket','填色'],['pick','drop','滴管'],['line','minus','直線'],['rect','box','方形'],['ellipse','eye','圓形']].map(([k,i,t])=>`<button class="tl ${k==='brush'?'on':''}" data-tool="${k}" aria-label="${t}">${ic(i,22)}</button>`).join('')}<button class="tl" data-mirror aria-label="左右對稱">${ic('layers',22)}<small>對稱</small></button></div>
    <div class="st-row"><button class="st-col" id="stCol" style="background:${this.color}"></button><div class="st-sw" id="stSw"></div></div>
    <div class="st-row"><label>粗細<input type="range" min="1" max="60" value="${this.size}" data-size></label><label>透明度<input type="range" min="10" max="100" value="100" data-alpha></label><label>縮放<input type="range" min="100" max="300" value="100" data-zoom></label></div>
    <div class="st-row st-lay" id="stLay"></div>
    <div class="st-row"><button class="btn sm" data-imp>${ic('image',18)}匯入圖片</button><button class="btn sm ghost" data-clear>${ic('trash',18)}清除圖層</button>${o.onion?'<button class="btn sm ghost on" data-onion>洋蔥皮</button>':''}</div>
   </div></div>`);
  document.getElementById('app').appendChild(el);this.el=el;this.cv=$('#stCv',el);this.g=this.cv.getContext('2d');this.onionOn=!!o.onion;
  if(o.base)this.loadImg(o.base,0);if(o.onion){this.onionImg=new Image();this.onionImg.src=o.onion}
  this.renderSw();this.renderLayers();this.fit();this.bind();requestAnimationFrame(()=>el.classList.add('open'));this.draw()})},
 mk(){const c=document.createElement('canvas');c.width=this.W;c.height=this.H;return c},
 loadImg(src,li){const img=new Image();img.onload=()=>{const L=this.layers[li];const g=L.getContext('2d');const k=Math.min(this.W/img.width,this.H/img.height,1);const w=img.width*k,h=img.height*k;g.drawImage(img,(this.W-w)/2,(this.H-h)/2,w,h);this.draw()};img.src=src},
 fit(){const st=$('#stStage',this.el).getBoundingClientRect();const k=Math.min((st.width-16)/this.W,(st.height-16)/this.H);this.base=k;const dpr=Math.min(2,devicePixelRatio||1);
  this.cv.width=Math.round(st.width*dpr);this.cv.height=Math.round(st.height*dpr);this.cv.style.width=st.width+'px';this.cv.style.height=st.height+'px';this.dpr=dpr;this.sw=st.width;this.sh=st.height},
 view(){const k=this.base*this.zoom;return{k,ox:(this.sw-this.W*k)/2+this.pan.x,oy:(this.sh-this.H*k)/2+this.pan.y}},
 draw(){const g=this.g,v=this.view();g.setTransform(this.dpr,0,0,this.dpr,0,0);g.fillStyle='#EFE9DF';g.fillRect(0,0,this.sw,this.sh);
  g.save();g.translate(v.ox,v.oy);g.scale(v.k,v.k);
  /* 棋盤格表示透明 */const cs=16;for(let y=0;y<this.H;y+=cs)for(let x=0;x<this.W;x+=cs){g.fillStyle=((x+y)/cs)%2?'#FFFFFF':'#F2EEE8';g.fillRect(x,y,cs,cs)}
  if(this.o.guide){g.globalAlpha=.18;this.o.guide(g,this.W,this.H);g.globalAlpha=1}
  if(this.onionOn&&this.onionImg&&this.onionImg.complete){g.globalAlpha=.25;g.drawImage(this.onionImg,0,0,this.W,this.H);g.globalAlpha=1}
  this.layers.forEach((L,i)=>{if(this.vis[i]){g.globalAlpha=L._op??1;g.drawImage(L,0,0)}});g.globalAlpha=1;
  if(this.preview)this.preview(g);
  if(this.mirror){g.strokeStyle='rgba(93,125,230,.5)';g.setLineDash([6,6]);g.lineWidth=1/v.k;g.beginPath();g.moveTo(this.W/2,0);g.lineTo(this.W/2,this.H);g.stroke();g.setLineDash([])}
  g.restore();g.strokeStyle='rgba(0,0,0,.08)';g.strokeRect(v.ox,v.oy,this.W*v.k,this.H*v.k)},
 renderSw(){U.setHTML($('#stSw',this.el),[...new Set([...this.recent,...SW])].slice(0,22).map(c=>`<button class="sw-c" data-c="${c}" style="background:${c}"></button>`).join(''))},
 renderLayers(){U.setHTML($('#stLay',this.el),this.layers.map((L,i)=>`<button class="ly ${i===this.cur?'on':''}" data-ly="${i}"><span>圖層 ${i+1}</span><i data-vis="${i}">${ic(this.vis[i]?'eye':'close',16)}</i></button>`).reverse().join('')+(this.layers.length<5?`<button class="ly add" data-addly>${ic('plus',16)}</button>`:'')+(this.layers.length>1?`<button class="ly" data-upl>${ic('back',14)}上移</button><button class="ly" data-dell>${ic('trash',14)}</button>`:''))},
 pt(e){const r=this.cv.getBoundingClientRect(),v=this.view();return{x:(e.clientX-r.left-v.ox)/v.k,y:(e.clientY-r.top-v.oy)/v.k}},
 snap(){const L=this.layers[this.cur];this.undo.push({i:this.cur,d:L.getContext('2d').getImageData(0,0,this.W,this.H)});if(this.undo.length>30)this.undo.shift();this.redo.length=0},
 setCol(c){this.color=c;$('#stCol',this.el).style.background=c;this.recent=[c,...this.recent.filter(x=>x!==c)].slice(0,8);if(OC.S.ui){OC.S.ui.recentColors=this.recent}this.renderSw()},
 bind(){const el=this.el,cv=this.cv;let drawing=null;const ptrs=new Map();
  el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
   if(b.hasAttribute('data-x')){this.close(null);return}if(b.hasAttribute('data-done')){this.close(this.export());return}
   if(b.hasAttribute('data-undo')){const u=this.undo.pop();if(u){const g=this.layers[u.i].getContext('2d');this.redo.push({i:u.i,d:g.getImageData(0,0,this.W,this.H)});g.putImageData(u.d,0,0);this.draw()}return}
   if(b.hasAttribute('data-redo')){const u=this.redo.pop();if(u){const g=this.layers[u.i].getContext('2d');this.undo.push({i:u.i,d:g.getImageData(0,0,this.W,this.H)});g.putImageData(u.d,0,0);this.draw()}return}
   if(b.dataset.tool){this.tool=b.dataset.tool;el.querySelectorAll('[data-tool]').forEach(x=>U.toggle(x,'on',x===b));return}
   if(b.hasAttribute('data-mirror')){this.mirror=!this.mirror;U.toggle(b,'on',this.mirror);this.draw();return}
   if(b.dataset.c){this.setCol(b.dataset.c);return}
   if(b.id==='stCol'){this.wheel();return}
   if(e.target.closest('[data-vis]')){const i=+e.target.closest('[data-vis]').dataset.vis;this.vis[i]=!this.vis[i];this.renderLayers();this.draw();return}
   if(b.dataset.ly){this.cur=+b.dataset.ly;this.renderLayers();return}
   if(b.hasAttribute('data-addly')){this.layers.push(this.mk());this.vis.push(true);this.cur=this.layers.length-1;this.renderLayers();return}
   if(b.hasAttribute('data-dell')){if(this.layers.length<2)return;this.layers.splice(this.cur,1);this.vis.splice(this.cur,1);this.cur=Math.max(0,this.cur-1);this.renderLayers();this.draw();return}
   if(b.hasAttribute('data-upl')){const i=this.cur;if(i<this.layers.length-1){[this.layers[i],this.layers[i+1]]=[this.layers[i+1],this.layers[i]];[this.vis[i],this.vis[i+1]]=[this.vis[i+1],this.vis[i]];this.cur=i+1;this.renderLayers();this.draw()}return}
   if(b.hasAttribute('data-clear')){this.snap();this.layers[this.cur].getContext('2d').clearRect(0,0,this.W,this.H);this.draw();return}
   if(b.hasAttribute('data-onion')){this.onionOn=!this.onionOn;U.toggle(b,'on',this.onionOn);this.draw();return}
   if(b.hasAttribute('data-imp')){OC.Pages.pickFile('image/*',true).then(u=>{if(!u)return;this.snap();this.loadImg(u,this.cur)});return}});
  el.addEventListener('input',e=>{const t=e.target;if(t.hasAttribute('data-size'))this.size=+t.value;else if(t.hasAttribute('data-alpha'))this.alpha=+t.value/100;else if(t.hasAttribute('data-zoom')){this.zoom=+t.value/100;if(this.zoom===1)this.pan={x:0,y:0};this.draw()}});
  /* 繪圖：單指畫、雙指平移縮放 */
  cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});if(ptrs.size>1){drawing=null;this.preview=null;this.draw();return}
   const p=this.pt(e);if(this.tool==='pick'){this.pickAt(p);return}if(this.tool==='fill'){this.snap();this.fillAt(p);this.draw();return}
   this.snap();drawing={pts:[p],start:p};if(this.tool==='brush'||this.tool==='eraser')this.stroke(drawing,true)});
  cv.addEventListener('pointermove',e=>{const prev=ptrs.get(e.pointerId);if(!prev)return;ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
   if(ptrs.size>1){const [a,b]=[...ptrs.values()];if(!this._pd)this._pd={d:Math.hypot(a.x-b.x,a.y-b.y),z:this.zoom};else{this.zoom=U.clamp(this._pd.z*Math.hypot(a.x-b.x,a.y-b.y)/this._pd.d,1,4);this.pan.x+=(e.clientX-prev.x)/2;this.pan.y+=(e.clientY-prev.y)/2;this.draw()}return}
   if(!drawing)return;const p=this.pt(e);drawing.pts.push(p);
   if(this.tool==='brush'||this.tool==='eraser')this.stroke(drawing);else{const s=drawing.start;this.preview=g=>this.shape(g,s,p);this.draw()}});
  const end=e=>{ptrs.delete(e.pointerId);if(ptrs.size<2)this._pd=null;if(!drawing)return;if(['line','rect','ellipse'].includes(this.tool)){const g=this.layers[this.cur].getContext('2d');this.shape(g,drawing.start,drawing.pts[drawing.pts.length-1]);this.preview=null;this.draw()}drawing=null};
  cv.addEventListener('pointerup',end);cv.addEventListener('pointercancel',end);
  this._rs=()=>{this.fit();this.draw()};window.addEventListener('resize',this._rs)},
 ctxStyle(g){g.lineCap='round';g.lineJoin='round';g.lineWidth=this.size;g.strokeStyle=this.color;g.fillStyle=this.color;g.globalAlpha=this.alpha;g.globalCompositeOperation=this.tool==='eraser'?'destination-out':'source-over'},
 stroke(d,first){const g=this.layers[this.cur].getContext('2d');const P=d.pts,n=P.length;const seg=(m)=>{this.ctxStyle(g);g.beginPath();if(n<3){g.moveTo(P[0].x*m.a+m.b,P[0].y);g.lineTo(P[n-1].x*m.a+m.b+.01,P[n-1].y)}else{const a=P[n-3],b=P[n-2],c=P[n-1];g.moveTo((a.x+b.x)/2*m.a+m.b,(a.y+b.y)/2);g.quadraticCurveTo(b.x*m.a+m.b,b.y,(b.x+c.x)/2*m.a+m.b,(b.y+c.y)/2)}g.stroke();g.globalAlpha=1;g.globalCompositeOperation='source-over'};
  seg({a:1,b:0});if(this.mirror)seg({a:-1,b:this.W});this.draw()},
 shape(g,s,p){this.ctxStyle(g);if(this.tool==='eraser')g.globalCompositeOperation='destination-out';const one=(ax,bx)=>{g.beginPath();if(this.tool==='line'){g.moveTo(ax,s.y);g.lineTo(bx,p.y);g.stroke()}else if(this.tool==='rect'){g.rect(Math.min(ax,bx),Math.min(s.y,p.y),Math.abs(bx-ax),Math.abs(p.y-s.y));g.fill()}else{g.ellipse((ax+bx)/2,(s.y+p.y)/2,Math.abs(bx-ax)/2,Math.abs(p.y-s.y)/2,0,0,Math.PI*2);g.fill()}};
  one(s.x,p.x);if(this.mirror)one(this.W-s.x,this.W-p.x);g.globalAlpha=1;g.globalCompositeOperation='source-over'},
 pickAt(p){const c=document.createElement('canvas');c.width=this.W;c.height=this.H;const g=c.getContext('2d');this.layers.forEach((L,i)=>{if(this.vis[i])g.drawImage(L,0,0)});const d=g.getImageData(p.x|0,p.y|0,1,1).data;if(d[3]>10)this.setCol('#'+[d[0],d[1],d[2]].map(v=>v.toString(16).padStart(2,'0')).join(''));this.tool='brush';this.el.querySelectorAll('[data-tool]').forEach(x=>U.toggle(x,'on',x.dataset.tool==='brush'))},
 /* 油漆桶：掃描線填色（容差 32） */
 fillAt(p){const L=this.layers[this.cur],g=L.getContext('2d'),W=this.W,H=this.H;const x0=p.x|0,y0=p.y|0;if(x0<0||y0<0||x0>=W||y0>=H)return;const im=g.getImageData(0,0,W,H),d=im.data;const i0=(y0*W+x0)*4;const t=[d[i0],d[i0+1],d[i0+2],d[i0+3]];
  const [r,gg,b]=U.hex(this.color),a=Math.round(this.alpha*255);if(Math.abs(t[0]-r)+Math.abs(t[1]-gg)+Math.abs(t[2]-b)+Math.abs(t[3]-a)<8)return;const tol=32;
  const same=i=>Math.abs(d[i]-t[0])+Math.abs(d[i+1]-t[1])+Math.abs(d[i+2]-t[2])+Math.abs(d[i+3]-t[3])<=tol;const st=[[x0,y0]];const seen=new Uint8Array(W*H);
  while(st.length){const [x,y]=st.pop();let lx=x;while(lx>=0&&!seen[y*W+lx]&&same((y*W+lx)*4))lx--;lx++;let rx=x;while(rx<W&&!seen[y*W+rx]&&same((y*W+rx)*4))rx++;rx--;
   for(let k=lx;k<=rx;k++){const i=(y*W+k)*4;seen[y*W+k]=1;d[i]=r;d[i+1]=gg;d[i+2]=b;d[i+3]=a;if(y>0&&!seen[(y-1)*W+k]&&same(((y-1)*W+k)*4))st.push([k,y-1]);if(y<H-1&&!seen[(y+1)*W+k]&&same(((y+1)*W+k)*4))st.push([k,y+1])}}
  g.putImageData(im,0,0)},
 wheel(){const s=OC.UI.dialog(`<h2 class="dl-t">選擇顏色</h2><div class="wheel"><canvas width="240" height="240" id="whC"></canvas><i id="whK"></i></div><div class="opt"><span>明度</span><input type="range" min="0" max="100" value="100" id="whV"></div><div class="row end"><button class="btn primary" data-ok>完成</button></div>`);
  const cv=$('#whC',s.el),g=cv.getContext('2d'),R=120;const img=g.createImageData(240,240);for(let y=0;y<240;y++)for(let x=0;x<240;x++){const dx=x-R,dy=y-R,dd=Math.hypot(dx,dy);if(dd>R)continue;const h=(Math.atan2(dy,dx)/Math.PI*180+360)%360;const [rr,gg,bb]=hsv(h,dd/R,1);const i=(y*240+x)*4;img.data[i]=rr;img.data[i+1]=gg;img.data[i+2]=bb;img.data[i+3]=255}g.putImageData(img,0,0);
  let H=0,S=0,V=1;const k=$('#whK',s.el);const upd=()=>{const a=H*Math.PI/180;k.style.transform=`translate(${120+Math.cos(a)*S*R-10}px,${120+Math.sin(a)*S*R-10}px)`;const c='#'+hsv(H,S,V).map(v=>v.toString(16).padStart(2,'0')).join('');k.style.background=c;this.color=c;$('#stCol',this.el).style.background=c};
  const pick=e=>{const r=cv.getBoundingClientRect();const x=(e.clientX-r.left)/r.width*240-R,y=(e.clientY-r.top)/r.height*240-R;H=(Math.atan2(y,x)/Math.PI*180+360)%360;S=Math.min(1,Math.hypot(x,y)/R);upd()};let dn=false;
  cv.addEventListener('pointerdown',e=>{dn=true;cv.setPointerCapture(e.pointerId);pick(e)});cv.addEventListener('pointermove',e=>{if(dn)pick(e)});cv.addEventListener('pointerup',()=>dn=false);$('#whV',s.el).oninput=e=>{V=+e.target.value/100;upd()};
  s.el.querySelector('[data-ok]').onclick=()=>{this.setCol(this.color);s.close()}},
 /* 匯出：合併可見圖層並裁掉透明邊 */
 export(){const c=document.createElement('canvas');c.width=this.W;c.height=this.H;const g=c.getContext('2d');this.layers.forEach((L,i)=>{if(this.vis[i])g.drawImage(L,0,0)});
  if(this.o.noTrim)return c.toDataURL('image/png');const d=g.getImageData(0,0,this.W,this.H).data;let x0=this.W,y0=this.H,x1=-1,y1=-1;for(let y=0;y<this.H;y++)for(let x=0;x<this.W;x++)if(d[(y*this.W+x)*4+3]>6){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}
  if(x1<0)return null;const pad=4;x0=Math.max(0,x0-pad);y0=Math.max(0,y0-pad);x1=Math.min(this.W-1,x1+pad);y1=Math.min(this.H-1,y1+pad);const o=document.createElement('canvas');o.width=x1-x0+1;o.height=y1-y0+1;o.getContext('2d').drawImage(c,-x0,-y0);return o.toDataURL('image/png')},
 close(v){if(v===null&&this.undo.length&&!confirm('放棄這張畫嗎？'))return;window.removeEventListener('resize',this._rs);this.el.classList.remove('open');const el=this.el;setTimeout(()=>el.remove(),250);OC.Store.save();const r=this.res;this.res=null;r&&r(v)}};
function hsv(h,s,v){const f=n=>{const k=(n+h/60)%6;return Math.round(255*(v-v*s*Math.max(0,Math.min(k,4-k,1))))};return[f(5),f(3),f(1)]}
OC.Studio=Studio;
})(window.OC);
