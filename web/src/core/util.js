/* OC Shimeji v4 · 共用工具 */
(function(OC){'use strict';
const U={};
U.$=(s,r=document)=>r.querySelector(s);
U.$$=(s,r=document)=>[...r.querySelectorAll(s)];
U.clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
U.lerp=(a,b,t)=>a+(b-a)*t;
U.rnd=(a,b)=>a+Math.random()*(b-a);
U.rint=(a,b)=>Math.floor(U.rnd(a,b+1));
U.pick=a=>a[Math.floor(Math.random()*a.length)];
U.chance=p=>Math.random()<p;
U.uid=(p='id')=>p+'_'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
U.esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
U.el=h=>{const t=document.createElement('template');t.innerHTML=h.trim();return t.content.firstElementChild};
U.weighted=list=>{let s=0;for(const x of list)s+=Math.max(0,x.w);if(s<=0)return null;let r=Math.random()*s;for(const x of list){r-=Math.max(0,x.w);if(r<=0)return x}return list[list.length-1]};
/* 緩動 */
U.ease={
 inOut:t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2,
 out:t=>1-Math.pow(1-t,3),
 in:t=>t*t*t,
 smooth:t=>t*t*(3-2*t),
 back:t=>{const c=1.70158,c3=c+1;return 1+c3*Math.pow(t-1,3)+c*Math.pow(t-1,2)},
 elastic:t=>t===0||t===1?t:Math.pow(2,-10*t)*Math.sin((t*10-.75)*(2*Math.PI)/3)+1
};
/* 臨界阻尼彈簧：x 追向目標，v 為速度；自然的慣性與收尾 */
U.spring=(st,target,dt,k=180,z=.75)=>{const c=2*z*Math.sqrt(k);const a=k*(target-st.x)-c*st.v;st.v+=a*dt;st.x+=st.v*dt;return st.x};
U.approach=(v,t,rate,dt)=>v+(t-v)*(1-Math.exp(-rate*dt));
/* 可重現亂數（地形、植物分佈固定，不會每次重載都不一樣） */
U.rng=seed=>{let s=seed>>>0||1;return()=>{s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296}};
U.hash=str=>{let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0};
/* 1D/2D value noise */
const P=new Uint8Array(512);{const r=U.rng(1337);const a=[...Array(256).keys()];for(let i=255;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}for(let i=0;i<512;i++)P[i]=a[i&255]}
const fade=t=>t*t*(3-2*t);
U.noise2=(x,y)=>{const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi;const h=(i,j)=>P[(P[(xi+i)&255]+yi+j)&255]/255;const u=fade(xf),v=fade(yf);return U.lerp(U.lerp(h(0,0),h(1,0),u),U.lerp(h(0,1),h(1,1),u),v)};
U.noise1=x=>U.noise2(x,.5);
/* 顏色 */
U.hex=h=>{h=String(h||'#000').replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');return[parseInt(h.slice(0,2),16)||0,parseInt(h.slice(2,4),16)||0,parseInt(h.slice(4,6),16)||0]};
U.rgb=(a,al)=>al==null||al>=1?`rgb(${a[0]|0},${a[1]|0},${a[2]|0})`:`rgba(${a[0]|0},${a[1]|0},${a[2]|0},${+al.toFixed(3)})`;
U.mixc=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
U.mulc=(a,b)=>[a[0]*b[0]/255,a[1]*b[1]/255,a[2]*b[2]/255];
U.shade=(c,k)=>k>=0?U.mixc(c,[255,255,255],k):U.mixc(c,[0,0,0],-k);
U.fmtTime=d=>String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
U.dayKey=(d=new Date())=>d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();
U.buzz=ms=>{try{if(OC.S&&OC.S.settings.haptics===false)return;if(OC.Native&&OC.Native.has())OC.Native.vibrate(ms);else navigator.vibrate&&navigator.vibrate(ms)}catch(e){}};
/* 只有在內容改變時才寫入 DOM：避免不必要的重新排版與閃爍 */
U.setText=(n,t)=>{if(n&&n.textContent!==String(t))n.textContent=t};
U.setHTML=(n,h)=>{if(n&&n._h!==h){n._h=h;n.innerHTML=h}};
U.toggle=(n,c,on)=>{if(n&&n.classList.contains(c)!==!!on)n.classList.toggle(c,!!on)};
U.attr=(n,k,v)=>{if(n&&n.getAttribute(k)!==String(v))n.setAttribute(k,v)};
/* 小型事件匯流排 */
const subs={};
U.on=(e,f)=>{(subs[e]=subs[e]||new Set()).add(f);return()=>subs[e].delete(f)};
U.emit=(e,d)=>{const s=subs[e];if(s)for(const f of [...s]){try{f(d)}catch(err){console.error('[bus]',e,err)}}};
OC.U=U;
})(window.OC=window.OC||{});
