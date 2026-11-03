/* OC Shimeji v4 · 時間、天氣與光線色調（單一來源） */
(function(OC){'use strict';
const {U}=OC;
/* 時段色盤：天空上/下、海、色調 multiply、環境光、霧氣 */
const KEYS=[
 {h:0,  sky:['#0E1838','#2B3A6B'],sea:'#1D3557',tint:'#6C77B8',haze:'#2E3E70',sun:0,star:1},
 {h:4.5,sky:['#1B2350','#4A4E86'],sea:'#2A4268',tint:'#7E86C4',haze:'#4F5A8C',sun:0,star:.8},
 {h:6,  sky:['#6D86C8','#F6B99A'],sea:'#5C8FB8',tint:'#E9C5B5',haze:'#F0C4AE',sun:.4,star:.1},
 {h:7.5,sky:['#7FB6E8','#FCE3C2'],sea:'#4FA3C7',tint:'#FBEBD8',haze:'#F7E3CC',sun:.8,star:0},
 {h:10, sky:['#5FA8E8','#CDE8F5'],sea:'#3E9BC4',tint:'#FFFFFF',haze:'#D8EDF6',sun:1,star:0},
 {h:15, sky:['#5AA2E2','#D2EAF4'],sea:'#3F9CC2',tint:'#FFFBF2',haze:'#DCEEF4',sun:1,star:0},
 {h:17.3,sky:['#7C9BD6','#FFC88F'],sea:'#4C8DB6',tint:'#FFE0BC',haze:'#FFD3A6',sun:.75,star:0},
 {h:18.6,sky:['#5B5DA6','#F49A7C'],sea:'#3E6E9C',tint:'#E8A99A',haze:'#E7998A',sun:.35,star:.2},
 {h:19.8,sky:['#232F63','#6B5C93'],sea:'#27426B',tint:'#8C8BC2',haze:'#4E5288',sun:0,star:.7},
 {h:24, sky:['#0E1838','#2B3A6B'],sea:'#1D3557',tint:'#6C77B8',haze:'#2E3E70',sun:0,star:1}];
const WX={sunny:{t:'晴天',ic:'☀️'},cloudy:{t:'多雲',ic:'⛅'},rain:{t:'下雨',ic:'🌧️'},storm:{t:'暴風雨',ic:'⛈️'},snow:{t:'下雪',ic:'❄️'}};
const Env={WX,t:0,h:12,phase:'day',wid:'sunny',pal:null,ver:0,wind:.3,
 now(){return new Date(Date.now()+(OC.S?OC.S.world.timeOffset||0:0))},
 hourOf(d){return d.getHours()+d.getMinutes()/60+d.getSeconds()/3600},
 /* 天氣：每 3 小時一段，依日期種子決定；玩家可手動指定 */
 autoWeather(d){const m=d.getMonth();const seed=U.hash(U.dayKey(d)+':'+Math.floor(d.getHours()/3));const r=U.rng(seed)();const winter=m===11||m<=1;
  if(winter&&r<.18)return 'snow';if(r<.42)return 'sunny';if(r<.7)return 'cloudy';if(r<.92)return 'rain';return winter?'snow':'storm'},
 update(){const d=this.now();const h=this.cine?this.cine.h:this.hourOf(d);this.h=h;
  this.phase=h<5?'night':h<8?'dawn':h<16.8?'day':h<19.5?'dusk':'night';
  const w=this.cine?this.cine.w:OC.S&&OC.S.world.weather;const wid=w&&WX[w]?w:this.autoWeather(d);
  if(wid!==this.wid){this.wid=wid;U.emit('weather',wid)}
  /* 色盤內插：每 20 秒才重算一次常數，或在改時間時強制更新 */
  const k=Math.round(h*180);if(k!==this._k||this._w!==wid){this._k=k;this._w=wid;this.pal=this.palette(h,wid);this.ver++}
  this.wind=wid==='storm'?1:wid==='rain'?.6:wid==='cloudy'?.45:.3},
 palette(h,wid){let a=KEYS[0],b=KEYS[1];for(let i=0;i<KEYS.length-1;i++){if(h>=KEYS[i].h&&h<=KEYS[i+1].h){a=KEYS[i];b=KEYS[i+1];break}}
  const t=U.ease.smooth((h-a.h)/Math.max(.001,b.h-a.h)),M=(x,y)=>U.mixc(U.hex(x),U.hex(y),t);
  const p={skyTop:M(a.sky[0],b.sky[0]),skyBot:M(a.sky[1],b.sky[1]),sea:M(a.sea,b.sea),tint:M(a.tint,b.tint),haze:M(a.haze,b.haze),sun:U.lerp(a.sun,b.sun,t),star:U.lerp(a.star,b.star,t)};
  /* 天氣讓畫面變灰、變暗 */
  const g=wid==='rain'?.38:wid==='storm'?.55:wid==='cloudy'?.16:wid==='snow'?.2:0;
  if(g){const grey=[150,160,172];p.skyTop=U.mixc(p.skyTop,U.shade(grey,-.15),g);p.skyBot=U.mixc(p.skyBot,grey,g);p.tint=U.mixc(p.tint,[196,204,214],g*.8);p.haze=U.mixc(p.haze,[190,198,206],g);p.sun*=1-g;p.star*=1-g}
  if(wid==='snow')p.tint=U.mixc(p.tint,[232,240,255],.25);
  p.night=U.clamp(1-p.sun/.6,0,1);
  return p},
 /* 地點標籤（給對話、行為使用） */
 tod(){const h=this.h;return h<11?'morning':h<14?'noon':h<19?'evening':'night'},
 isNight(){return this.h<5.6||this.h>=19.6},
 rainy(){return this.wid==='rain'||this.wid==='storm'},
 label(){const d=this.now();const W=['日','一','二','三','四','五','六'];return{time:U.fmtTime(d),date:`${d.getMonth()+1}月${d.getDate()}日（${W[d.getDay()]}）`,ph:{night:'夜晚',dawn:'清晨',day:this.h<12?'上午':'午後',dusk:'黃昏'}[this.phase],wx:WX[this.wid]}}};
OC.Env=Env;
})(window.OC);
