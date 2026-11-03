/* OC Shimeji v4.1 · 商店介面：分店頁籤、店員招呼、今日精選、商品卡、數量、購買飛入背包動畫、回收 */
(function(OC){'use strict';
const {U,Content:C,Icons}=OC;const {$,esc}=U;
const ShopUI={cur:'general',
 page(tab){if(tab)this.cur=tab;const k=this.cur;const SH=OC.Shop.SHOPS;
  const tabs=Object.entries(SH).map(([id,s])=>`<button class="shop-t ${id===k?'on':''}" data-st="${id}" style="--c:${s.c};--bg:${s.bg}">${Icons.svg(s.ic,30)}<b>${s.t}</b></button>`).join('')+`<button class="shop-t ${k==='sell'?'on':''}" data-st="sell" style="--c:#B48C55;--bg:#F6EEDC">${Icons.svg('coin',30)}<b>回收</b></button>`;
  let body='';
  if(k==='sell'){const L=OC.Bag.list(null).filter(i=>i.sell);body=`<div class="shop-b" style="--c:#B48C55;--bg:#F6EEDC"><span class="shop-k">${Icons.svg('coin',44)}</span><div><b>回收站</b><p>把撿到的貝殼、魚和昆蟲換成星幣吧！</p></div></div>
   <div class="shop-g">${L.length?L.map(i=>`<div class="pc"><span class="pc-i">${Icons.item(i,52)}</span><b>${esc(i.name)}</b><small>擁有 ${i.q}</small><div class="pc-row"><button class="btn sm" data-sell="${i.id}">賣 1 個 · ${i.sell}</button>${i.q>1?`<button class="btn sm ghost" data-sellall="${i.id}">全部</button>`:''}</div></div>`).join(''):'<p class="empty">還沒有可以回收的東西。去海灘或森林找找吧！</p>'}</div>`}
  else{const S=SH[k],st=OC.Shop.stock(k);const items=st.items.map(id=>OC.Shop.item(id)).filter(Boolean);const feat=st.sale&&OC.Shop.item(st.sale);
   body=`<div class="shop-b" style="--c:${S.c};--bg:${S.bg}"><span class="shop-k">${Icons.svg(S.ic,44)}</span><div><b>${S.t}</b><p>「${esc(S.hi)}」</p></div></div>
    ${feat?`<button class="feat" data-pi="${feat.id}" style="--c:${S.c};--bg:${S.bg}"><span class="ft-i">${Icons.item(feat,72)}</span><span><small>今日精選・7 折</small><b>${esc(feat.name)}</b><em><s>${feat.price}</s> ${Icons.svg('coin',16)} ${OC.Shop.price(k,feat.id)}</em></span></button>`:''}
    <div class="shop-g">${items.length?items.map(it=>{const p=OC.Shop.price(k,it.id),q=OC.Items.qty(it.id);return`<button class="pc" data-pi="${it.id}"><span class="pc-i" style="--bg:${OC.Bag.CAT_BG[it.cat]||'#F4EEE6'}">${Icons.item(it,52)}</span><b>${esc(it.name)}</b><small>${esc(it.desc||C.CATNAME[it.cat]||'')}</small><em class="price">${Icons.svg('coin',15)} ${p}</em>${st.sale===it.id?'<i class="sale">特價</i>':''}${q?`<i class="own">${q}</i>`:''}</button>`}).join(''):(S.creations?`<p class="empty">市集還沒有作品。<br>到「工坊」創作物品、家具或建築，就會在這裡上架。</p><button class="btn primary wide" data-ws>${Icons.svg('palette',20)}前往工坊</button>`:'<p class="empty">今天賣完了</p>')}</div>
    <p class="hint">商品每天更換。${S.creations?'作品需要用星幣購買才會進入背包。':''}</p>`}
  return`<header class="ph"><span class="ph-i">${Icons.svg('shop',40)}</span><div><h1>商店街</h1><p>${Icons.svg('coin',16)} <b id="shopCoin">${OC.S.coins.toLocaleString()}</b> 星幣</p></div></header><div class="shop-tabs">${tabs}</div>${body}`},
 click(t){if(t.dataset.st){this.cur=t.dataset.st;OC.Pages.render();return true}
  if(t.dataset.pi){this.detail(t.dataset.pi);return true}
  if(t.dataset.sell||t.dataset.sellall){const id=t.dataset.sell||t.dataset.sellall,n=t.dataset.sellall?OC.Items.qty(id):1;const it=OC.Shop.item(id);if(OC.Shop.sell(id,n)){OC.UI.toast(`賣出 ${it.name} ×${n}・+${it.sell*n} 星幣`,'coin');this.fly(t,'coin');OC.Pages.render()}return true}
  if(t.hasAttribute('data-ws')){OC.Pages.close();OC.Workshop.open();return true}return false},
 detail(id){const k=this.cur,it=OC.Shop.item(id);if(!it)return;let n=1;const unit=OC.Shop.price(k,id);const tags=(it.tags||[]).map(t=>(C.TASTES.find(x=>x[0]===t)||[])[1]).filter(Boolean);
  const draw=()=>`<div class="it-h"><span class="it-big" style="--bg:${OC.Bag.CAT_BG[it.cat]||'#F4EEE6'}">${Icons.item(it,84)}</span><div><h2 class="dl-t">${esc(it.name)}</h2><p><em class="cat">${C.CATNAME[it.cat]||'創作'}</em>${it.by?` 作者：${esc(it.by)}`:''}</p>${tags.length?`<div class="trs">${tags.map(t=>`<span class="tr">${t}</span>`).join('')}</div>`:''}</div></div>
   ${it.desc?`<p class="lead">${esc(it.desc)}</p>`:''}<div class="qty"><button class="rb" data-q="-1">${Icons.svg('minus',20)}</button><b>${n}</b><button class="rb" data-q="1">${Icons.svg('plus',20)}</button></div>
   <button class="btn primary wide big" data-buy ${OC.S.coins<unit*n?'disabled':''}>${Icons.svg('coin',20)} ${unit*n} 購買</button><p class="hint" style="text-align:center">擁有 ${OC.Items.qty(id)}・持有星幣 ${OC.S.coins}</p>`;
  const s=OC.UI.sheet(draw(),{cls:'it-s'});s.el.addEventListener('click',e=>{const b=e.target.closest('[data-q],[data-buy]');if(!b)return;
   if(b.dataset.q){n=U.clamp(n+ +b.dataset.q,1,20);s.body.innerHTML=draw();return}
   if(OC.Shop.buy(k,id,n)){U.buzz(12);this.fly(b,id);OC.UI.toast(`買了 ${it.name} ×${n}`,'check');s.close();OC.Pages.render()}})},
 /* 購買動畫：物品沿弧線飛進背包按鈕 */
 fly(from,id){try{const r=from.getBoundingClientRect(),dst=document.querySelector('#nav [data-p=bag]')||document.querySelector('#hTray');const d=dst.getBoundingClientRect();const it=OC.Shop.item(id);
  const f=U.el(`<div class="fly">${it?Icons.item(it,40):Icons.svg(id,40)}</div>`);document.body.appendChild(f);const x0=r.left+r.width/2-20,y0=r.top+r.height/2-20,x1=d.left+d.width/2-20,y1=d.top+d.height/2-20;
  f.animate([{transform:`translate(${x0}px,${y0}px) scale(.6)`,opacity:0},{transform:`translate(${(x0+x1)/2}px,${Math.min(y0,y1)-90}px) scale(1.2)`,opacity:1,offset:.45},{transform:`translate(${x1}px,${y1}px) scale(.4)`,opacity:.3}],{duration:720,easing:'cubic-bezier(.3,.7,.4,1)'}).onfinish=()=>{f.remove();dst.animate([{transform:'scale(1)'},{transform:'scale(1.18)'},{transform:'scale(1)'}],{duration:300})}}catch(e){}}};
OC.ShopUI=ShopUI;
})(window.OC);
