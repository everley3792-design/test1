/* OC Shimeji v4 · 角色編輯器（創角／捏角／性格／飲食／資料），即時動畫預覽 */
(function(OC){'use strict';
const {U,Content:C,Chars,UI}=OC;const {$,esc}=U;const ic=UI.ic;
const OPT_T={head:'臉型',ears:'耳朵',eye:'眼睛',brow:'眉毛',cheekStyle:'臉頰',mouth:'嘴巴',pattern:'花紋',tail:'尾巴',tailSide:'尾巴位置',acc:'服裝',smallAcc:'小配件'};
const RNG_T={headSize:'頭部大小',earSize:'耳朵大小',eyeSize:'眼睛大小',eyeSpace:'眼距',eyeY:'眼睛高度',mouthY:'嘴巴高度',cheeks:'腮紅濃度',accX:'配件左右',accY:'配件上下',accScale:'配件大小',accRot:'配件角度'};
const Editor={
 create(after){const c=OC.Chars.make({name:'',look:OC.CAT_RAND(),traits:[]});c._new=true;c.name=U.pick(['小栗','雪糕','麻吉','七七','團團','芝麻','布丁','小滿','可可','阿墨']);this.open(null,c,after)},
 open(id,draft,after){const src=draft||OC.S.chars.find(c=>c.id===id);if(!src)return;const c=JSON.parse(JSON.stringify(src));this.c=c;this.isNew=!!draft;this.after=after;this.tab='look';
  const s=UI.sheet(`<div class="ed"><div class="ed-pv"><canvas id="edCv"></canvas><div class="ed-test">${[['walk','走走'],['hop','跳跳'],['happy','開心'],['eat','吃東西'],['sleep','睡覺'],['angry','生氣']].map(([k,t])=>`<button data-test="${k}">${t}</button>`).join('')}</div></div>
   <div class="tabs" id="edTabs">${[['look','外觀'],['pers','性格'],['food','飲食'],['info','資料']].map(([k,t])=>`<button data-et="${k}" class="${k==='look'?'on':''}">${t}</button>`).join('')}</div><div id="edBody" class="ed-b"></div>
   <div class="ed-foot"><button class="btn ghost" data-cancel>取消</button><button class="btn primary" data-save>${this.isNew?'完成，讓夥伴登場！':'儲存'}</button></div></div>`,{full:true,cls:'ed-s',onClose:()=>this.stop()});
  this.s=s;this.body=$('#edBody',s.el);this.pv();this.render();
  s.el.addEventListener('click',e=>this.click(e));s.el.addEventListener('input',e=>this.input(e));s.el.addEventListener('change',e=>this.input(e,true))},
 /* ---------- 即時預覽（迷你舞台） ---------- */
 pv(){const cv=$('#edCv',this.s.el);const g=cv.getContext('2d');const dpr=Math.min(2,devicePixelRatio||1);const a=new OC.Sim.Agent(Object.assign({},this.c,{loc:'home',x:0,z:0}));a.c=this.c;this.a=a;a.x=0;a.z=0;let last=performance.now(),walkX=0;
  const loop=t=>{if(!this.on)return;this.raf=requestAnimationFrame(loop);const dt=Math.min(.05,(t-last)/1000);last=t;const r=cv.getBoundingClientRect();if(cv.width!==Math.round(r.width*dpr)){cv.width=Math.round(r.width*dpr);cv.height=Math.round(r.height*dpr)}
   g.setTransform(dpr,0,0,dpr,0,0);const W=r.width,H=r.height;const gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#CFE8F5');gr.addColorStop(.62,'#EAF4E4');gr.addColorStop(.63,'#A9D18E');gr.addColorStop(1,'#8DBF74');g.fillStyle=gr;g.fillRect(0,0,W,H);
   a.update(dt);if(a.test==='walk'){walkX+=dt*a.facing*60;if(Math.abs(walkX)>W*.25)a.facing*=-1;a.vx=a.facing;a.pose='walk'}else{walkX*=.9;a.vx=0}
   const s=H*.48;g.globalAlpha=.25;g.fillStyle='#2E4A2E';g.beginPath();g.ellipse(W/2+walkX,H*.86,s*.3,s*.08,0,0,Math.PI*2);g.fill();g.globalAlpha=1;
   OC.Rig.draw(g,a,W/2+walkX,H*.86-a.y*s,s,dt)};this.on=true;this.raf=requestAnimationFrame(loop)},
 stop(){this.on=false;cancelAnimationFrame(this.raf)},
 test(k){const a=this.a;a.test=null;a.pose='stand';a.face=null;a.hold=null;if(k==='walk'){a.test='walk'}else if(k==='hop'){a.hop(2.4)}else if(k==='happy'){a.face='joy';a.hop(1.6);setTimeout(()=>a.face=null,1500)}else if(k==='eat'){a.pose='eat';a.hold='🍰';a.holdK=1;let n=0;const iv=setInterval(()=>{a.holdK-=.12;if(++n>8){clearInterval(iv);a.hold=null;a.pose='stand';a.face='joy';setTimeout(()=>a.face=null,900)}},250)}else if(k==='sleep'){a.pose='sleep';setTimeout(()=>{if(a.pose==='sleep')a.pose='stand'},4000)}else if(k==='angry'){a.pose='angry';a.face='angry';a.feel('anger');setTimeout(()=>{a.pose='stand';a.face=null},1800)}},
 /* ---------- 各分頁 ---------- */
 render(){const c=this.c,t=this.tab;let h='';
  if(t==='look'){if(c.kind==='image'){h=`<p class="lead">這位夥伴使用匯入的圖片。</p><div class="row"><button class="btn" data-img>更換圖片</button><button class="btn ghost" data-tocat>改用 Low-Poly 貓咪造型</button></div><div class="opt"><span>大小</span><input type="range" min="60" max="160" value="${Math.round((c.scale||1)*100)}" data-scale></div>`}
   else{const L=c.look;h=`<div class="row"><button class="btn" data-rand>${ic('sparkle')}隨機搭配</button><button class="btn ghost" data-reset>重置</button><button class="btn ghost" data-img>匯入自己的圖片</button></div>
    <div class="colors"><button class="cw" data-cw="body"><i style="background:${L.body}"></i>身體顏色</button><button class="cw" data-cw="accent"><i style="background:${L.accent}"></i>配色</button></div>
    <div class="sw-row">${OC.SWATCH.map(x=>`<button class="swc" data-sw="${x}" style="background:${x}"></button>`).join('')}</div>
    ${Object.entries(OC.CAT_OPT).filter(([k])=>k!=='smallAcc'||true).map(([k,o])=>`<div class="og"><span>${OPT_T[k]||k}</span><div class="chips sc">${o.map(([v,n])=>`<button class="chip ${L[k]===v?'on':''}" data-o="${k}" data-v="${v}">${n}</button>`).join('')}</div></div>`).join('')}
    ${Object.entries(OC.CAT_RANGES).filter(([k])=>!k.startsWith('acc')||L.smallAcc!=='none').map(([k,[a,b]])=>`<div class="opt"><span>${RNG_T[k]||k}</span><input type="range" min="${a}" max="${b}" value="${L[k]}" data-r="${k}"></div>`).join('')}
    <div class="opt"><span>整體大小</span><input type="range" min="70" max="140" value="${Math.round((c.scale||1)*100)}" data-scale></div>`}}
  else if(t==='pers'){const tp=Chars.typeName(c);h=`<div class="ptype"><b>${esc(tp[0])}</b><small>${esc(tp[1])}</small></div>
   ${C.SLIDERS.map(s=>`<div class="psl"><div><span>${s.a}</span><b>${s.t}</b><span>${s.b}</span></div><input type="range" min="0" max="100" value="${c.sliders[s.k]}" data-sl="${s.k}"><small>${c.sliders[s.k]>66?s.hi:c.sliders[s.k]<34?s.lo:'剛剛好'}</small></div>`).join('')}
   <h3 class="sec">性格特質（最多 8 個，${c.traits.length}/8）</h3>${C.CATS.map(([k,n])=>{const L=C.TRAITS.filter(t=>t.c===k);if(!L.length)return'';return`<div class="og"><span>${n}</span><div class="chips wrap">${L.map(t=>`<button class="chip ${c.traits.includes(t.id)?'on':''} ${c.traits.some(x=>C.EXCL(x,t.id))?'x':''}" data-tr="${t.id}" title="${esc(t.d)}">${t.em} ${esc(t.t)}</button>`).join('')}</div></div>`}).join('')}
   <h3 class="sec">小怪癖</h3>${Object.entries(C.Q).map(([k,q])=>`<div class="og"><span>${q.t}</span><div class="chips sc">${q.o.map(([v,n])=>`<button class="chip ${c.quirks[k]===v?'on':''}" data-q="${k}" data-v="${v}">${n}</button>`).join('')}</div></div>`).join('')}
   <div class="fld"><span>口癖（會自然出現在對話中）</span><input data-f="phrase" maxlength="8" value="${esc(c.phrase||'')}" placeholder="例如：喵、呢、的說"></div>
   <div class="og"><span>戀愛</span><div class="chips"><button class="chip ${c.noRomance?'':'on'}" data-rom="0">可以發展戀愛</button><button class="chip ${c.noRomance?'on':''}" data-rom="1">不談戀愛</button></div></div>`}
  else if(t==='food'){h=`<p class="lead">每位夥伴的口味都不同。吃到喜歡的會很開心，最討厭的可能會鬧肚子。</p>`+C.TASTES.map(([k,n])=>`<div class="og"><span>${n}</span><div class="seg wide">${C.PREF.map(([v,t,col])=>`<button data-pref="${k}" data-v="${v}" class="${(c.foodPref[k]??0)===v?'on':''}" style="--c:${col}">${t}</button>`).join('')}</div></div>`).join('')+`<button class="btn ghost" data-prefr>依性格重新產生</button>`}
  else if(t==='info'){const P=c.profile;const f=(k,t,ph='',n=20)=>`<div class="fld"><span>${t}</span><input data-p="${k}" maxlength="${n}" value="${esc(P[k]||'')}" placeholder="${ph}"></div>`;
   h=`<div class="fld"><span>名字（必填）</span><input data-f="name" maxlength="16" value="${esc(c.name)}"></div>${f('nick','暱稱')}<div class="grid2">${f('birthday','生日','例如 3/14')}${f('age','年齡')}${f('gender','性別')}${f('pronoun','代稱','牠／她／他／祂…')}${f('species','種族')}${f('height','身高')}</div>
    <div class="fld"><span>角色介紹</span><textarea data-p="bio" maxlength="400" rows="3">${esc(P.bio)}</textarea></div><div class="fld"><span>背景故事</span><textarea data-p="story" maxlength="1200" rows="4">${esc(P.story)}</textarea></div>
    <div class="fld"><span>喜歡（用、分隔）</span><input data-pl="likes" value="${esc(P.likes.join('、'))}"></div><div class="fld"><span>討厭</span><input data-pl="dislikes" value="${esc(P.dislikes.join('、'))}"></div><div class="fld"><span>興趣</span><input data-pl="interests" value="${esc(P.interests.join('、'))}"></div>
    <h3 class="sec">自訂欄位</h3>${(P.fields||[]).map((x,i)=>`<div class="grid2 cf"><input data-cfk="${i}" value="${esc(x.k)}" placeholder="欄位名稱"><input data-cfv="${i}" value="${esc(x.v)}" placeholder="內容"></div>`).join('')}<button class="btn ghost" data-addf>${ic('plus')}新增欄位</button>
    <h3 class="sec">自訂台詞（每行一句）</h3>${[['idle','待機'],['pet','被摸'],['greet','打招呼']].map(([k,n])=>`<div class="fld"><span>${n}</span><textarea data-ln="${k}" rows="2">${esc(((c.customLines||{})[k]||[]).join('\n'))}</textarea></div>`).join('')}`}
  this.body.innerHTML=h},
 rebuild(){clearTimeout(this.rt);this.rt=setTimeout(()=>{this.c.look=OC.CAT_NORM(this.c.look);if(this.a)this.a.c=this.c},120)},
 click(e){const b=e.target.closest('button');if(!b)return;const c=this.c,L=c.look;U.buzz(4);
  if(b.dataset.et){this.tab=b.dataset.et;this.s.el.querySelectorAll('[data-et]').forEach(x=>U.toggle(x,'on',x===b));this.render();return}
  if(b.dataset.test){this.test(b.dataset.test);return}
  if(b.hasAttribute('data-save')){this.save();return}if(b.hasAttribute('data-cancel')){this.s.close();return}
  if(b.dataset.o){L[b.dataset.o]=b.dataset.v;this.rebuild();this.render();this.test('hop');return}
  if(b.dataset.sw){L.body=b.dataset.sw;this.rebuild();this.render();return}
  if(b.dataset.cw){this.wheel(b.dataset.cw);return}
  if(b.hasAttribute('data-rand')){const sm=L.smallAcc;c.look=OC.CAT_RAND();this.rebuild();this.render();this.test('happy');return}
  if(b.hasAttribute('data-reset')){c.look=OC.CAT_NORM({});this.rebuild();this.render();return}
  if(b.hasAttribute('data-img')){this.importImg();return}
  if(b.hasAttribute('data-tocat')){c.kind='cat';this.rebuild();this.render();return}
  if(b.dataset.tr){const t=b.dataset.tr;if(c.traits.includes(t))c.traits=c.traits.filter(x=>x!==t);else{c.traits=c.traits.filter(x=>!C.EXCL(x,t));if(c.traits.length>=8){UI.toast('最多 8 個特質','warn');return}c.traits.push(t)}const y=this.body.scrollTop;this.render();this.body.scrollTop=y;return}
  if(b.dataset.q){c.quirks[b.dataset.q]=b.dataset.v;const y=this.body.scrollTop;this.render();this.body.scrollTop=y;if(b.dataset.q==='walk')this.test('walk');if(b.dataset.q==='happy')this.test('happy');return}
  if(b.dataset.rom!=null){c.noRomance=b.dataset.rom==='1';this.render();return}
  if(b.dataset.pref){c.foodPref[b.dataset.pref]=+b.dataset.v;const y=this.body.scrollTop;this.render();this.body.scrollTop=y;return}
  if(b.hasAttribute('data-prefr')){c.foodPref=Chars.genPref(Object.assign({},c,{id:c.id+Date.now()}));this.render();return}
  if(b.hasAttribute('data-addf')){c.profile.fields.push({k:'',v:''});this.render();return}},
 input(e,commit){const t=e.target,c=this.c;
  if(t.dataset.r){c.look[t.dataset.r]=+t.value;this.rebuild()}
  else if(t.hasAttribute('data-scale'))c.scale=+t.value/100;
  else if(t.dataset.sl){c.sliders[t.dataset.sl]=+t.value;if(commit){const y=this.body.scrollTop;this.render();this.body.scrollTop=y}}
  else if(t.dataset.f)c[t.dataset.f]=t.value;
  else if(t.dataset.p)c.profile[t.dataset.p]=t.value;
  else if(t.dataset.pl)c.profile[t.dataset.pl]=t.value.split(/[、,，]/).map(s=>s.trim()).filter(Boolean).slice(0,24);
  else if(t.dataset.cfk!=null)c.profile.fields[+t.dataset.cfk].k=t.value;else if(t.dataset.cfv!=null)c.profile.fields[+t.dataset.cfv].v=t.value;
  else if(t.dataset.ln){c.customLines=c.customLines||{};c.customLines[t.dataset.ln]=t.value.split('\n').map(s=>s.trim()).filter(Boolean).slice(0,30)}},
 /* ---------- 色輪 ---------- */
 wheel(which){const c=this.c;const start=U.hex(c.look[which]);const hsv=rgb2hsv(start);const s=UI.sheet(`<h2>${which==='body'?'身體顏色':'配色'}</h2><div class="wheel"><canvas width="240" height="240" id="whC"></canvas><i id="whK"></i></div><div class="opt"><span>明度</span><input type="range" min="20" max="100" value="${Math.round(hsv[2]*100)}" id="whV"></div><div class="row end"><button class="btn primary" data-ok>完成</button></div>`,{cls:'dialog'});
  const cv=$('#whC',s.el),g=cv.getContext('2d');const R=120;const img=g.createImageData(240,240);for(let y=0;y<240;y++)for(let x=0;x<240;x++){const dx=x-R,dy=y-R,d=Math.hypot(dx,dy);if(d>R)continue;const h=(Math.atan2(dy,dx)/Math.PI*180+360)%360,sa=d/R;const [r,gg,b]=hsv2rgb(h,sa,1);const i=(y*240+x)*4;img.data[i]=r;img.data[i+1]=gg;img.data[i+2]=b;img.data[i+3]=255}g.putImageData(img,0,0);
  let H=hsv[0],S=hsv[1],V=hsv[2];const knob=$('#whK',s.el);const upd=()=>{const a=H*Math.PI/180;knob.style.transform=`translate(${120+Math.cos(a)*S*R-10}px,${120+Math.sin(a)*S*R-10}px)`;const col=rgb2hex(hsv2rgb(H,S,V));knob.style.background=col;c.look[which]=col;this.rebuild()};upd();
  const pick=e=>{const r=cv.getBoundingClientRect();const x=(e.clientX-r.left)/r.width*240-R,y=(e.clientY-r.top)/r.height*240-R;H=(Math.atan2(y,x)/Math.PI*180+360)%360;S=Math.min(1,Math.hypot(x,y)/R);upd()};
  let down=false;cv.addEventListener('pointerdown',e=>{down=true;cv.setPointerCapture(e.pointerId);pick(e)});cv.addEventListener('pointermove',e=>{if(down)pick(e)});cv.addEventListener('pointerup',()=>down=false);
  $('#whV',s.el).oninput=e=>{V=+e.target.value/100;upd()};s.el.querySelector('[data-ok]').onclick=()=>{s.close();this.render()}},
 /* ---------- 匯入圖片（透明 PNG／WebP，縮至 768px） ---------- */
 async importImg(){const url=await OC.Pages.pickFile('image/*',true);if(!url)return;const img=await new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.onerror=()=>r(null);i.src=url});if(!img){UI.toast('無法讀取圖片','warn');return}
  const k=Math.min(1,768/Math.max(img.width,img.height));const cv=document.createElement('canvas');cv.width=Math.round(img.width*k);cv.height=Math.round(img.height*k);cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);let data;try{data=cv.toDataURL('image/webp',.92);if(!data.startsWith('data:image/webp'))data=cv.toDataURL('image/png')}catch(e){data=url}
  const key='img_'+this.c.id+'_'+Date.now().toString(36);await OC.Store.Assets.put(key,data);this.c.kind='image';this.c.img=key;this.render();UI.toast('已匯入圖片','check')},
 save(){const c=this.c;c.name=(c.name||'').trim().slice(0,16);if(!c.name){UI.toast('請幫夥伴取個名字','warn');this.tab='info';this.render();return}
  c.look=OC.CAT_NORM(c.look);delete c._new;const S=OC.S;const i=S.chars.findIndex(x=>x.id===c.id);
  if(i>=0){OC.Rig.drop(S.chars[i]);Object.assign(S.chars[i],c);OC.Chars.ensure(S.chars[i])}else{OC.Chars.ensure(c);S.chars.push(c);if(!S.activeId)S.activeId=c.id}
  OC.Store.flush();U.emit('chars');this.stop();this.s.close();UI.toast(this.isNew?`${c.name}誕生了！`:'已儲存','check');
  if(OC.Pages.cur==='chars')OC.Pages.render();UI.hudChar();
  if(this.isNew){if(this.after)this.after(c);else{OC.Pages.close();OC.Intro.arrive([c.id])}}}};
function rgb2hsv([r,g,b]){r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;let h=0;if(d){if(mx===r)h=((g-b)/d)%6;else if(mx===g)h=(b-r)/d+2;else h=(r-g)/d+4;h*=60;if(h<0)h+=360}return[h,mx?d/mx:0,mx]}
function hsv2rgb(h,s,v){const f=n=>{const k=(n+h/60)%6;return Math.round(255*(v-v*s*Math.max(0,Math.min(k,4-k,1))))};return[f(5),f(3),f(1)]}
function rgb2hex(a){return'#'+a.map(v=>v.toString(16).padStart(2,'0')).join('')}
OC.Editor=Editor;
})(window.OC);
