/* OC Shimeji v4 · 角色骨架動畫
   把原創 Low-Poly 貓咪 SVG 拆成「尾巴／左右腳／身體／頭（多種表情）」點陣圖層，
   以程式驅動：呼吸、眨眼、走路步伐、重心起伏、頭部跟隨、尾巴擺動、擠壓伸展、轉身。
   所有細微動畫（呼吸、眨眼、尾巴）可與主要動作疊加；睡眠時自動切換睡眠節奏。 */
(function(OC){'use strict';
const {U}=OC;
const RS=1.6;               // 點陣化倍率（viewBox 240×260 → 384×416）
const FOOT_Y=255,CX=120,UNIT_M=1.4/246;
const FACES={
 neutral:'.eye-o,.mouth-n',blink:'.eye-c,.mouth-n',joy:'.eye-h,.mouth-h',wow:'.eye-wow,.mouth-o',soft:'.eye-soft,.mouth-n',
 worry:'.eye-worry,.mouth-pout',angry:'.eye-tsun,.mouth-pout',sleep:'.eye-c,.mouth-n',talk:'.eye-o,.mouth-o',pout:'.eye-o,.mouth-pout',joyTalk:'.eye-h,.mouth-o'};
const FACE_HIDE='.eye-o,.eye-c,.eye-h,.eye-extra,.mouth-n,.mouth-h,.mouth-o,.mouth-extra{display:none}';
const svgNS=s=>s.replace(/<svg([^>]*)>/,(m,a)=>'<svg'+(a.includes('xmlns=')?'':' xmlns="http://www.w3.org/2000/svg"')+a.replace(/\s(width|height)="[^"]*"/g,'')+' width="'+240*RS+'" height="'+260*RS+'">');
const withStyle=(svg,css)=>svgNS(svg).replace(/(<svg[^>]*>)/,'$1<style>'+css+'</style>');
function raster(svg){return new Promise(res=>{const img=new Image();img.onload=()=>res(img);img.onerror=()=>res(null);img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)})}
/* 裁掉透明邊，降低記憶體 */
function crop(img){const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(img,0,0);
 let d;try{d=g.getImageData(0,0,c.width,c.height).data}catch(e){return{cv:c,ox:0,oy:0}}
 let x0=c.width,y0=c.height,x1=-1,y1=-1;for(let y=0;y<c.height;y+=2)for(let x=0;x<c.width;x+=2){if(d[(y*c.width+x)*4+3]>8){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}}
 if(x1<0)return null;x0=Math.max(0,x0-3);y0=Math.max(0,y0-3);x1=Math.min(c.width,x1+4);y1=Math.min(c.height,y1+4);const o=document.createElement('canvas');o.width=x1-x0;o.height=y1-y0;o.getContext('2d').drawImage(c,-x0,-y0);return{cv:o,ox:x0/RS,oy:y0/RS}}
const rigs=new Map();
const Rig={RS,
 key(c){return c.kind==='image'?'img:'+c.img:'cat:'+JSON.stringify(c.look)},
 get(c){const k=this.key(c);const r=rigs.get(k);if(r)return r.ready?r:null;this.build(c,k);return null},
 async build(c,k){const entry={ready:false};rigs.set(k,entry);try{
  if(c.kind==='image'){const url=await OC.Store.Assets.get(c.img);const img=url&&await raster0(url);if(!img){entry.err=1;return}
   const cr=crop(img)||{cv:img,ox:0,oy:0};/* 匯入圖：底部對齊地面，高度 1.15m */
   entry.image={cv:cr.cv,w:cr.cv.width,h:cr.cv.height};entry.kind='image';entry.ready=true;U.emit('rig',c.id);return}
  const svg0=OC.ocSVG({look:c.look});
  /* 量測各部位位置（tail 的支點） */
  const host=document.createElement('div');host.style.cssText='position:fixed;left:-2000px;top:0;width:240px;height:260px;visibility:hidden;pointer-events:none';host.innerHTML=svg0;document.body.appendChild(host);
  const sv=host.firstElementChild,sr=sv.getBoundingClientRect(),bb=sel=>{const n=sv.querySelector(sel);if(!n)return null;const r=n.getBoundingClientRect();return r.width?{x:r.left-sr.left,y:r.top-sr.top,w:r.width,h:r.height}:null};
  const tb=bb('.tail-side'),fl=bb('.foot.fl'),fr=bb('.foot.fr'),hb=bb('.head-g');
  /* 經瀏覽器解析後重新序列化成合法 XML（舊版造型有少數未閉合標籤） */
  let svg=svg0;try{svg=new XMLSerializer().serializeToString(sv)}catch(e){}host.remove();
  const L={},jobs=[];
  const add=(name,css)=>jobs.push(raster(withStyle(svg,css)).then(img=>{if(img){const r=crop(img);if(r)L[name]=r}}));
  add('tail','.head-g{display:none}.body-g>*:not(.tail-side){display:none}');
  add('footL','.head-g{display:none}.body-g>*:not(.fl){display:none}');
  add('footR','.head-g{display:none}.body-g>*:not(.fr){display:none}');
  add('body','.head-g,.tail-side,.foot{display:none}');
  for(const [f,show] of Object.entries(FACES))add('head_'+f,'.body-g{display:none}'+FACE_HIDE+show.split(',').map(s=>'.head-g '+s).join(',')+'{display:inline}');
  await Promise.all(jobs);
  const right=tb?tb.x+tb.w/2>CX:true;
  entry.piv={head:[CX,hb?hb.y+hb.h-10:176],tail:tb?(right?[tb.x+10,tb.y+tb.h-14]:[tb.x+tb.w-10,tb.y+tb.h-14]):[150,215],footL:fl?[fl.x+fl.w/2,fl.y+4]:[104,222],footR:fr?[fr.x+fr.w/2,fr.y+4]:[134,222],tailRight:right};
  entry.L=L;entry.kind='cat';entry.ready=!!L.body;U.emit('rig',c.id)}catch(e){console.warn('rig',e);entry.err=1}},
 drop(c){rigs.delete(this.key(c))},

 /* =========== 每格更新動畫通道 =========== */
 anim(a,dt){const A=a.an||(a.an={t:Math.random()*10,br:Math.random()*6,step:0,blinkT:U.rnd(1,4),blink:0,flip:{x:a.facing||1,v:0},sq:{x:1,v:0},hy:{x:0,v:0},hx:{x:0,v:0},ht:{x:0,v:0},tl:{x:0,v:0},lean:{x:0,v:0},look:0,lookT:2,talkT:0});
  A.t+=dt;const st=a.pose||'stand',Q=a.c.quirks||{},sleeping=st==='sleep';
  /* 呼吸 */
  A.br+=dt*(sleeping?1.05:a.sick?2.2:1.7);
  /* 眨眼（睡覺、特殊表情時暫停） */
  A.blinkT-=dt;if(A.blinkT<=0){A.blink=.13;A.blinkT=Math.random()<.2?.28:U.rnd(2.2,5.5)}if(A.blink>0)A.blink-=dt;
  /* 步伐 */
  const spd=Math.hypot(a.vx||0,a.vz||0);const moving=spd>.05&&(st==='walk'||st==='run');
  const cad=st==='run'?3.1:Q.walk==='tiptoe'?3:Q.walk==='shuffle'?1.6:2.2;
  if(moving)A.step+=dt*Math.PI*2*cad*U.clamp(spd/(st==='run'?2.6:1.1),.6,1.5);else A.step=U.approach(A.step,Math.round(A.step/Math.PI)*Math.PI,10,dt);
  /* 轉身：彈簧追向朝向（穿過 0 時有輕微擠壓） */
  U.spring(A.flip,a.facing||1,dt,260,.82);
  /* 擠壓伸展：外部觸發 a.squash(v) */
  U.spring(A.sq,1,dt,200,.38);
  /* 視線：偶爾左右看看 */
  A.lookT-=dt;if(A.lookT<=0){A.lookT=U.rnd(1.8,4.5);A.look=a.lookAt!=null?a.lookAt:(Math.random()<.55?0:U.rnd(-1,1))}
  if(a.lookAt!=null)A.look=a.lookAt;
  /* 頭部目標偏移 */
  let hyT=0,htT=A.look*5,hxT=A.look*4,leanT=0,tailAmp=10,tailSpd=1.6,tailBase=0;
  const bob=moving?Math.abs(Math.sin(A.step)):0;
  if(moving){leanT=(st==='run'?5:2)*Math.sign(a.vx||0)*(a.facing||1);hyT=bob*(Q.walk==='bouncy'?6:3);if(Q.walk==='strut')htT-=2;if(Q.walk==='sway')htT+=Math.sin(A.step*.5)*6;tailSpd=2.6;tailAmp=st==='run'?16:12}
  switch(st){
   case'sit':hyT+=8;tailAmp=6;tailSpd=1;break;
   case'sleep':hyT+=14;htT=(Q.sleep==='starfish'?-10:12)+Math.sin(A.br*.5)*1.5;tailAmp=3;tailSpd=.5;tailBase=Q.sleep==='curl'?20:8;break;
   case'eat':hyT+=4+Math.max(0,Math.sin(A.t*(Q.eat==='fast'?14:Q.eat==='slow'?5:9)))*5;tailAmp=12;tailSpd=2.4;break;
   case'pet':htT=(a.petDir||1)*9+Math.sin(A.t*3)*3;hyT=2+(a.petY||0)*4;tailAmp=22;tailSpd=4.2;leanT=(a.petDir||1)*3;break;
   case'held':hyT=-4;tailAmp=20;tailSpd=3;htT=Math.sin(A.t*5)*5;break;
   case'sad':hyT+=6;htT+=8;tailAmp=4;tailSpd=.7;tailBase=-18;break;
   case'angry':htT=Math.sin(A.t*18)*2;tailAmp=18;tailSpd=5;tailBase=-6;break;
   case'cheer':hyT=-4;tailAmp=24;tailSpd=5;break;
   case'talk':hyT+=Math.max(0,Math.sin(A.t*7))*2;tailAmp=12;tailSpd=2;break;
   case'look':htT=a.lookAt!=null?a.lookAt*10:Math.sin(A.t*.8)*10;break;
   case'stretch':hyT=-6;htT=-6;tailBase=20;tailAmp=4;break}
  if(a.sick){tailBase-=10;tailAmp*=.5;hyT+=3}
  if(a.mood==='happy'||a.mood==='excited'||a.mood==='loved'){tailAmp*=1.25;tailSpd*=1.25}
  U.spring(A.hy,hyT,dt,140,.55);U.spring(A.hx,hxT,dt,90,.7);U.spring(A.ht,htT,dt,110,.6);U.spring(A.lean,leanT,dt,80,.75);
  A.tailPh=(A.tailPh||0)+dt*tailSpd*2;U.spring(A.tl,tailBase+Math.sin(A.tailPh)*tailAmp,dt,90,.5);
  /* 說話嘴型 */
  if(a.bubble&&a.bubble.t<a.bubble.text.length/28)A.talkT+=dt;else A.talkT=0;
  return A},
 face(a,A){if(a.faceOverride)return a.faceOverride;const st=a.pose;if(st==='sleep')return'sleep';
  if(A.blink>0&&!['wow','joy'].includes(a.face))return'blink';
  if(A.talkT>0&&Math.sin(A.talkT*20)>0)return a.face==='joy'?'joyTalk':'talk';
  if(a.face)return a.face;
  if(st==='pet')return'joy';if(st==='held')return'wow';if(st==='angry'||a.mood==='angry')return'angry';if(a.sick||a.mood==='sad')return'worry';if(a.mood==='happy'||a.mood==='loved')return Math.sin(A.t*.3)>.6?'soft':'neutral';return'neutral'},

 /* =========== 繪製 =========== */
 draw(ctx,a,sx,sy,s,dt){const r=this.get(a.c);const A=this.anim(a,dt);const scale=(a.c.scale||1)*(a.sizeK||1);
  if(!r){/* 素材還在烘焙：畫一個柔和的佔位影子，不出現破圖 */return}
  const k=s*UNIT_M*scale;/* 每 viewBox 單位的像素 */
  const brk=Math.sin(A.br)*(a.pose==='sleep'?.03:.015);
  const sq=A.sq.x;let sxk=1/Math.sqrt(Math.max(.4,sq)),syk=sq;
  if(a.pose==='sleep'){sxk*=a.c.quirks.sleep==='starfish'?1.16:1.1;syk*=.8}else if(a.pose==='sit'){sxk*=1.04;syk*=.9}else if(a.pose==='held'){syk*=1.08;sxk*=.95}
  const fl=A.flip.x;const fx=Math.sign(fl||1)*Math.max(.3,Math.min(1,Math.abs(fl)));const turnSq=1+(1-Math.abs(fx))*.08;
  const walkBob=(a.pose==='walk'||a.pose==='run')?-Math.abs(Math.sin(A.step))*(a.c.quirks.walk==='bouncy'?7:a.c.quirks.walk==='shuffle'?1.5:3.5):0;
  ctx.save();ctx.translate(sx,sy);
  if(a.alpha!=null&&a.alpha<1)ctx.globalAlpha=Math.max(0,a.alpha);
  const rot=(A.lean.x+(a.rot||0))*Math.PI/180*(a.pose==='sleep'?0:1)+(a.c.quirks.walk==='sway'&&a.pose==='walk'?Math.sin(A.step)*.05:0);
  ctx.rotate(rot);ctx.scale(fx*sxk*(1+brk*.4),syk*(1-brk*.15)*turnSq);
  ctx.translate(0,walkBob*k);
  if(r.kind==='image'){const I=r.image;const h=1.45*s*scale,w=h*I.w/I.h;const by=Math.sin(A.br)*.01*h;
   ctx.drawImage(I.cv,-w/2,-h+by,w,h);ctx.restore();a.hitW=w*.8;a.hitH=h;a.headOff=0;return}
  const L=r.L,P=r.piv;
  const img=(lay,x,y)=>{if(!lay)return;ctx.drawImage(lay.cv,(lay.ox-CX)*k+x,(lay.oy-FOOT_Y)*k+y,lay.cv.width/RS*k,lay.cv.height/RS*k)};
  /* 尾巴：繞支點旋轉 */
  if(L.tail){ctx.save();const px=(P.tail[0]-CX)*k,py=(P.tail[1]-FOOT_Y)*k;ctx.translate(px,py);ctx.rotate((P.tailRight?1:-1)*A.tl.x*Math.PI/180);ctx.translate(-px,-py);img(L.tail,0,0);ctx.restore()}
  /* 腳：交替抬起，往前後擺 */
  const moving=a.pose==='walk'||a.pose==='run';const st=A.step;
  const footOff=ph=>moving?[Math.cos(ph)*(a.pose==='run'?7:4)*k,-Math.max(0,Math.sin(ph))*(a.pose==='run'?10:6)*k]:a.pose==='held'?[0,Math.sin(A.t*6+ph)*2*k+4*k]:a.pose==='sit'?[0,-3*k]:[0,0];
  const [lx,ly]=footOff(st),[rx,ry]=footOff(st+Math.PI);
  if(a.pose!=='sleep'){img(L.footL,lx,ly);img(L.footR,rx,ry)}
  /* 身體：呼吸時微幅起伏 */
  const bodyDy=(a.pose==='sit'?6:a.pose==='sleep'?10:0)*k;
  ctx.save();ctx.translate(0,bodyDy);img(L.body,0,0);ctx.restore();
  if(a.pose==='sleep'){img(L.footL,-6*k,-2*k);img(L.footR,6*k,-2*k)}
  /* 頭：跟隨身體（彈簧延遲）、傾斜、視線 */
  const face=this.face(a,A);const H=L['head_'+face]||L.head_neutral;
  const hx=A.hx.x*k,hy=(A.hy.x+Math.sin(A.br)*(a.pose==='sleep'?2.2:1.1))*k+bodyDy*.6;
  ctx.save();const pvx=(P.head[0]-CX)*k,pvy=(P.head[1]-FOOT_Y)*k;ctx.translate(pvx+hx,pvy+hy);ctx.rotate(A.ht.x*Math.PI/180);ctx.translate(-pvx,-pvy);img(H,0,0);
  /* 手上的東西（吃東西、玩具） */
  if(a.hold){ctx.save();ctx.scale(1/fx,1);const hs=Math.max(10,s*.32*scale);ctx.font=`${hs|0}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
   const bite=a.holdK??1;ctx.globalAlpha*=Math.min(1,bite*3);ctx.translate(0,-(FOOT_Y-150)*k);ctx.scale(.5+bite*.5,.5+bite*.5);ctx.fillText(a.hold,0,0);ctx.restore()}
  ctx.restore();
  /* 生病：鼻水泡泡／頭上烏雲由 overlay 處理；害羞紅暈 */
  if(a.blushK>0){ctx.globalAlpha=Math.min(1,a.blushK)*.5;ctx.fillStyle='#F27C9B';ctx.beginPath();ctx.ellipse(-45*k+hx,(152-FOOT_Y)*k+hy,14*k,6*k,0,0,Math.PI*2);ctx.ellipse(45*k+hx,(152-FOOT_Y)*k+hy,14*k,6*k,0,0,Math.PI*2);ctx.fill()}
  ctx.restore();a.hitW=170*k;a.hitH=240*k;a.headOff=(A.hy.x)*k},
 /* 角色頭像（UI 用）：直接用 SVG，不需動畫 */
 avatarHTML(c){if(c.kind==='image')return`<img class="av-img" data-img="${U.esc(c.img)}" alt="">`;return OC.ocSVG({look:c.look})},
 async fillImgs(root){for(const n of root.querySelectorAll('img[data-img]')){if(n.src)continue;const u=await OC.Store.Assets.get(n.dataset.img);if(u)n.src=u}}};
function raster0(url){return new Promise(res=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>res(null);i.src=url})}
OC.Rig=Rig;
})(window.OC);
