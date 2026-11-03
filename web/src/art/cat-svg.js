/* 移植自 OC Shimeji 3.2：原創 Low-Poly 貓咪造型產生器（保留原樣，確保既有角色外觀不變） */
(function(G){'use strict';
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));const pick=a=>a[Math.floor(Math.random()*a.length)];
const hex2rgb=h=>{h=h.replace('#','');return[0,2,4].map(i=>parseInt(h.substr(i,2),16))};
const rgb2hex=a=>'#'+a.map(v=>Math.round(clamp(v,0,255)).toString(16).padStart(2,'0')).join('');
const mix=(a,b,t)=>{const x=hex2rgb(a),y=hex2rgb(b);return rgb2hex(x.map((v,i)=>v+(y[i]-v)*t))};
const DEMOS=[
 {id:'mochi',name:'Starlet 星夢',sub:'閃亮亮的奶油星夢貓',look:{body:'#F6E9E9',accent:'#B8A5DC',ears:'upright',head:'wide',eye:'droop',brow:'none',cheekStyle:'blush',mouth:'caret',pattern:'none',acc:'starlet',tail:'fluffy',tailSide:'left',cheeks:34,eyeSize:108,eyeSpace:100,earSize:106,headSize:103,eyeY:0,mouthY:0},lines:{idle:['今天星星也在閃閃發光耶。','唔……想蒐集漂亮的夢。','陪我一起看星星嘛！'],pet:['嘿嘿，星光都變得暖暖的。','再摸一下下好不好？'],wake:['嗯？我剛剛夢到流星！'],drop:['哇——星星都在轉圈圈！']}},
 {id:'yuzu',name:'Leafy 葉風',sub:'總是帶著小花的森林貓',look:{body:'#F4E6D6',accent:'#A6B88E',ears:'upright',head:'wide',eye:'smile',brow:'none',cheekStyle:'blush',mouth:'caret',pattern:'none',acc:'leafy',tail:'fluffy',tailSide:'right',cheeks:54,eyeSize:111,eyeSpace:100,earSize:99,headSize:103,eyeY:0,mouthY:0},lines:{idle:['葉子在跟我說悄悄話。','聽……今天的風很輕。','想出去找一朵小花嗎？'],pet:['呼嚕嚕……好像春天喔。','小花也喜歡你！'],wake:['咦？森林已經醒來了嗎？'],drop:['呼……像葉子一樣落地。']}},
 {id:'sora',name:'Snoozy 暖眠',sub:'喜歡窩著打盹的藍紫貓',look:{body:'#BDC8E6',accent:'#C6AFCF',ears:'upright',head:'wide',eye:'sleepy',brow:'none',cheekStyle:'none',mouth:'caret',pattern:'none',acc:'snoozy',tail:'fluffy',tailSide:'right',cheeks:22,eyeSize:103,eyeSpace:100,earSize:105,headSize:103,eyeY:0,mouthY:0},lines:{idle:['嗯……再窩五分鐘就好。','這裡好暖和喔……','你有沒有聽見雲朵在打呼？'],pet:['唔……暖暖的，好安心。','就這樣摸著我吧……'],wake:['啊……再睡一下下……'],drop:['慢一點……我還在作夢呢。']}}
];
const SWATCH=['#F6E8E7','#E5DBC2','#B7C1E1','#F8E7D3','#E8B9BB','#C7B8DE','#BDCFB4','#D6D1CE'];
const CAT_OPT={
 head:[['pebble','鵝卵石'],['puff','雲朵圓'],['tall','小方臉'],['wide','寬臉頰']],
 ears:[['upright','直立耳'],['soft','柔軟耳'],['wide','外張耳'],['tuft','小毛尖']],
 eye:[['bean','豆豆眼'],['round','圓眼'],['sleepy','慵懶眼'],['spark','亮晶晶'],['droop','柔柔垂眼'],['smile','笑彎眼']],
 brow:[['none','自然'],['flat','平直'],['soft','柔弧'],['arched','挑眉'],['sad','八字眉']],
 cheekStyle:[['blush','淡腮紅'],['stripes','害羞線'],['heart','愛心'],['spark','閃光'],['paw','貓掌'],['none','無']],
 mouth:[['w','小貓嘴'],['smile','微笑'],['tiny','小點嘴'],['caret','小三角嘴'],['open','小驚訝']],
 pattern:[['none','純色'],['cap','額頂色塊'],['mask','面罩'],['patch','單側斑'],['tabby','虎斑'],['calico','三花'],['socks','白手套']],
 tail:[['curl','捲尾'],['straight','長尾'],['fluffy','蓬鬆尾']],
 tailSide:[['left','左側'],['right','右側']],
 smallAcc:[['none','不佩戴'],['collar','頸圈'],['bandana','領巾'],['bell','鈴鐺'],['leaf','小葉芽'],['glasses','眼鏡'],['crescent','月牙'],['kerchief','頭巾'],['flower','花朵'],['ribbon','蝴蝶結'],['crown','小皇冠'],['pom','毛球帽'],['satchel','側背包']],
 acc:[['none','無裝飾'],['collar','頸圈'],['bandana','領巾'],['bell','鈴鐺'],['leaf','小葉子'],['glasses','圓眼鏡'],['crescent','月牙'],['kerchief','頭巾'],['flower','小花'],['ribbon','蝴蝶結'],['crown','小皇冠'],['pom','毛球帽'],['satchel','小包包'],['starlet','星夢披肩'],['leafy','花葉斗篷'],['snoozy','暖眠圍巾']]
};
const CAT_BASE={smallAcc:'none',accX:0,accY:0,accScale:100,accRot:0,ears:'upright',head:'wide',eye:'droop',brow:'none',cheekStyle:'blush',mouth:'caret',pattern:'none',tail:'curl',tailSide:'right',acc:'none',body:'#F4E8D7',accent:'#C9A9A1',cheeks:35,eyeSize:100,eyeSpace:100,earSize:100,headSize:100,eyeY:2,mouthY:0};
const CAT_RANGES={accX:[-94,94],accY:[-80,75],accScale:[65,170],accRot:[-80,80],cheeks:[0,100],eyeSize:[70,140],eyeSpace:[75,125],earSize:[78,128],headSize:[85,115],eyeY:[-6,10],mouthY:[-5,9]};
const CAT_COLOR=v=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v);
const CAT_NORM=l=>{l=l&&typeof l==='object'?l:{};const o={...CAT_BASE};Object.keys(CAT_OPT).forEach(k=>{let v=l[k];if(k==='ears'){v=({pointy:'upright',round:'soft',long:'wide'})[v]||v}if(k==='acc'){v=({sprout:'leaf',star:'crescent',scarf:'bandana'})[v]||v}if(CAT_OPT[k].some(x=>x[0]===v))o[k]=v});for(const k of ['body','accent'])if(CAT_COLOR(l[k]))o[k]=l[k];for(const [k,[mn,mx]] of Object.entries(CAT_RANGES))if(Number.isFinite(+l[k])&&l[k]!==null&&l[k]!==undefined&&l[k]!=='')o[k]=Math.max(mn,Math.min(mx,Math.round(+l[k])));return o};
const CAT_RAND=()=>{const a=pick(SWATCH),b=pick(['#D38E89','#C7B7D8','#9DA9C5','#8FAE97','#D2B282']);return CAT_NORM({body:a,accent:b,...Object.fromEntries(Object.entries(CAT_OPT).map(([k,v])=>[k,pick(v)[0]])),eyeSize:90+Math.floor(Math.random()*30),eyeSpace:90+Math.floor(Math.random()*20),cheeks:20+Math.floor(Math.random()*50),eyeY:Math.round(Math.random()*8),mouthY:0})};
const CAT_ACC_ANCHORS={collar:[120,186],bandana:[120,185],bell:[120,186],leaf:[120,58],glasses:[120,143],crescent:[173,94],kerchief:[120,109],flower:[171,88],ribbon:[66,90],crown:[120,80],pom:[120,90],satchel:[165,209]};
const catSmallKind=l=>l&&l.smallAcc&&l.smallAcc!=='none'?l.smallAcc:l&&CAT_ACC_ANCHORS[l.acc]?l.acc:'none';
const catPlaceable=l=>!!(l&&CAT_ACC_ANCHORS[catSmallKind(l)]);
const catAccTransform=l=>{const p=CAT_ACC_ANCHORS[catSmallKind(l)];if(!p)return'';const dx=Math.max(-94,Math.min(94,+l.accX||0)),dy=Math.max(-80,Math.min(75,+l.accY||0)),scale=Math.max(.65,Math.min(1.7,(+l.accScale||100)/100)),rot=Math.max(-80,Math.min(80,+l.accRot||0));return`translate(${dx} ${dy}) translate(${p[0]} ${p[1]}) rotate(${rot}) scale(${scale}) translate(${-p[0]} ${-p[1]})`};
let ocToySequence=0;
function ocSVG(c){
 const l=CAT_NORM(c.look||c),b=l.body,a=l.accent,theme=l.acc,
  id='softcat-'+(++ocToySequence)+'-',url=n=>'url(#'+id+n+')',
  light=mix(b,'#FFFFFF',.38),cream=mix(b,'#FFF8F3',.7),shadow=mix(b,'#938093',.28),dark=mix(b,'#817184',.24),
  iris=mix('#67546F',a,.22),eyelight=mix(a,'#FFF2F9',.36),blush=mix('#E4A0A3',b,.25),
  trim=mix(a,'#FDF7EE',.52),shade=mix(a,'#686179',.2),size=l.headSize/100,earSz=l.earSize/100,
  ex=l.eyeSize/100,es=l.eyeSpace/100,x1=120-39*es,x2=120+39*es;
 const poly=(pts,col,extra='')=>`<polygon points="${pts}" fill="${col}" ${extra}/>`;
 const headShapes={
  pebble:'M38 93 L43 74 71 65 103 59 142 60 173 66 199 80 211 105 211 141 195 165 160 180 80 180 47 166 30 143 30 115Z',
  puff:'M37 93 L46 73 75 61 103 60 143 58 175 66 201 84 214 110 208 143 190 167 154 183 84 183 48 166 28 143 27 113Z',
  tall:'M42 77 L63 63 98 59 141 59 183 68 202 85 208 118 205 146 185 170 149 180 87 180 49 168 33 139 33 100Z',
  wide:'M30 99 L42 76 67 64 107 60 144 58 179 67 207 88 215 114 211 143 193 166 157 182 82 182 45 163 25 140 25 114Z'};
 const hp=headShapes[l.head]||headShapes.pebble;
 const defs=`<defs><clipPath id="${id}headclip"><path d="${hp}"/></clipPath>
  <linearGradient id="${id}face" x1="0" y1="0" x2=".78" y2="1"><stop stop-color="${cream}"/><stop offset=".53" stop-color="${b}"/><stop offset="1" stop-color="${shadow}"/></linearGradient>
  <linearGradient id="${id}tail" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${cream}"/><stop offset=".62" stop-color="${b}"/><stop offset="1" stop-color="${shadow}"/></linearGradient>
  <linearGradient id="${id}coat" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${trim}"/><stop offset=".55" stop-color="${a}"/><stop offset="1" stop-color="${shade}"/></linearGradient></defs>`;
 const ears={
  upright:['42,87 51,18 109,80','48,76 54,34 86,73'],
  soft:['42,88 49,23 104,82','49,78 57,42 83,75'],
  wide:['39,92 27,27 106,82','43,75 38,45 83,76'],
  tuft:['41,91 46,45 51,18 63,33 101,80','49,76 55,38 83,74']}[l.ears]||['42,87 51,18 109,80','48,76 54,34 86,73'];
 const ear=(flipped=false)=>`${flipped?'<g transform="translate(240 0) scale(-1 1)">':''}<g class="ear ${flipped?'er':'el'}"><g transform="translate(51 82) scale(${earSz}) translate(-51 -82)">
  ${poly(ears[0],shadow)}${poly(ears[0],cream,'opacity=".82"')}${poly(ears[1],mix('#F2B1BC',b,.56))}${poly('50,24 69,51 77,70 54,61',light,'opacity=".50"')}${poly('42,87 75,70 109,80',shadow,'opacity=".24"')}</g></g>${flipped?'</g>':''}`;
 /* 2.4L: 一條連續的貓尾（單一脊線；無根部/尾端拼接）。
    固定根部在角色臀側 (146, 220)，左右使用同一骨架鏡像。 */
 const tailBase=(dir=1)=>{
  const styles={
   straight:{d:'M146 220 C164 222 182 218 196 202 C210 186 214 164 209 145',thick:15},
   fluffy:{d:'M146 220 C161 225 182 222 199 207 C216 192 225 167 218 146',thick:22},
   curl:{d:'M146 220 C166 226 185 215 196 196 C206 178 205 157 193 153 C183 150 178 158 181 165 C183 170 189 170 193 167',thick:16}
  };
  const t=styles[l.tail]||styles.curl;
  /* 共用同一條路徑，以漸層填色的圓端粗筆畫形成真正的一整條尾巴。 */
  return `<g class="tail-side" ${dir===-1?'transform="translate(240 0) scale(-1 1)"':''}>
   <g class="tail">
    <path class="cat-tail-single" d="${t.d}" fill="none" stroke="${url('tail')}" stroke-width="${t.thick}" stroke-linecap="round" stroke-linejoin="round"/>
    <path class="cat-tail-sheen" d="${t.d}" fill="none" stroke="${light}" stroke-width="${Math.max(2.4,t.thick*.2)}" stroke-linecap="round" opacity=".22"/>
   </g>
  </g>`;
 };
 const tail=tailBase(l.tailSide==='left'?-1:1);
 const legs=`<g class="foot fl">${poly('94,220 117,220 119,250 113,255 93,255 90,248',shadow)}${poly('94,222 114,221 115,250 109,254 93,254',cream)}${poly('94,223 101,226 98,253 93,253',light,'opacity=".65"')}</g>
  <g class="foot fr">${poly('121,220 145,219 149,249 144,255 124,255 121,249',shadow)}${poly('124,221 143,222 144,252 138,254 123,252',cream)}${poly('126,223 134,222 129,253 123,252',light,'opacity=".56"')}</g>`;
 const torso=`<path class="torso" d="M104 169 L140 169 151 184 154 219 145 240 99 240 88 220 92 187Z" fill="${url('face')}"/>
  ${poly('92,189 107,170 122,181 105,235 91,220',cream,'opacity=".48"')}${poly('122,181 141,171 152,187 153,218 145,240 136,235',shadow,'opacity=".24"')}`;
 const arms=`<g class="arm al">${poly('106,181 92,182 75,210 80,228 96,227 109,197',light)}${poly('92,182 77,209 84,216 100,187',cream,'opacity=".60"')}${poly('80,214 92,220 95,228 82,225',shadow,'opacity=".22"')}</g>
  <g class="arm ar">${poly('134,181 149,182 166,210 161,228 145,227 131,197',shadow)}${poly('136,186 149,186 160,212 151,219',light,'opacity=".70"')}${poly('151,218 163,212 161,228 145,227',a,'opacity=".12"')}</g>`;
 const outfit={
 starlet:`<g class="acc costume costume-starlet"><path d="M94 175 L84 184 71 219 82 235 163 235 174 220 157 183 145 176 122 184Z" fill="${url('coat')}"/>
 ${poly('91,186 74,220 83,233 104,233 110,193',mix(a,'#B8A2E5',.32))}${poly('148,183 164,189 172,220 161,234 142,233 132,195',shade,'opacity=".50"')}
 ${poly('109,189 131,188 150,231 137,241 100,241 92,234',mix('#FFF9F1',b,.2))}${poly('99,236 108,195 112,239 104,241',mix('#E5D6E6',a,.16),'opacity=".48"')}${poly('121,191 128,241 135,239 133,198',mix('#EEE4F0',b,.15),'opacity=".55"')}
 ${poly('102,191 85,193 79,226 100,230 104,206',mix(a,'#BAAAE0',.34))}${poly('143,191 159,196 164,226 145,231 137,203',mix(a,'#B4A2DA',.38))}
 <path d="M89 179 L108 171 121 185 136 171 155 178 146 200 124 195 120 213 114 195 96 199Z" fill="${mix(a,'#B8A2DE',.35)}"/>
 ${poly('90,179 104,174 115,186 101,190',trim,'opacity=".70"')}${poly('139,174 153,179 142,192 127,186',light,'opacity=".36"')}
 <path d="M121 188 L126 201 139 204 128 211 129 224 120 217 108 223 112 210 102 203 115 201Z" fill="#D5AD70"/>
 <path d="M121 187 L126 199 138 203 126 208 128 221 120 214 109 221 112 208 104 203 116 200Z" fill="#F9DB91"/>
 ${poly('121,191 120,212 111,219 113,208 105,204 116,200', '#FFF0BF','opacity=".75"')}
 ${poly('118,220 121,225 118,229 115,225',mix(a,'#8D81AF',.28))}${poly('117,227 123,235 117,241 112,235',light,'opacity=".70"')}
 </g>`,
 leafy:`<g class="acc costume costume-leafy">
 <path d="M91 181 L76 196 68 222 83 239 162 240 176 221 160 192 144 180 119 191Z" fill="${mix('#92A97D',a,.42)}"/>
 ${poly('90,185 72,222 83,237 103,228 107,192',mix(a,'#C3CCA5',.48))}${poly('141,189 164,189 174,222 162,239 139,229',mix('#7B9773',a,.50))}
 ${poly('108,187 132,189 150,235 135,244 104,242 92,234',mix('#FFF9EF',b,.16))}${poly('112,190 105,239 119,244 117,196',cream,'opacity=".66"')}
 ${poly('84,196 91,207 78,222 73,219',cream,'opacity=".25"')}${poly('150,198 159,215 162,232 150,225',shade,'opacity=".20"')}
 <path d="M99 177 Q121 192 143 177" fill="none" stroke="#F2E6C9" stroke-width="5"/>
 <path d="M121 184 Q97 171 101 189 L118 192 Q120 195 121 190 Q143 171 142 190 L125 192Z" fill="#F9F3DF"/><path d="M120 190 L110 207 121 199 132 207 125 190Z" fill="#FFF7EA"/><circle cx="122" cy="191" r="4" fill="#DCC68A"/>
 ${poly('120,207 124,214 120,220 116,214',mix(a,'#879D7A',.38))}${poly('120,222 125,230 120,236 115,230',mix(a,'#879D7A',.38))}
 <g transform="translate(158 216)"><path d="M0 0 L27-5 29 23 1 25Z" fill="#AD8C77"/>${poly('2,1 25,-3 25,20 4,24','#C7A48C')}${poly('3,1 18,-2 24,4 11,8','#E6C4A6','opacity=".74"')}<path d="M8 1 Q8-11 20-9 Q27-7 25-2" fill="none" stroke="#BDA48F" stroke-width="4"/><path d="M15 8 l4 5 -4 5 -4-5Z" fill="#FFF1E7"/></g>
 </g>`,
 snoozy:`<g class="acc costume costume-snoozy">
 <path d="M88 182 L151 181 167 197 167 235 155 241 87 240 77 232 79 197Z" fill="${mix('#A9B8DB',b,.5)}"/>
 ${poly('81,199 92,187 102,192 93,235 79,231',light,'opacity=".52"')}${poly('146,185 163,196 167,230 155,241 146,233',mix('#8E9AC6',a,.3),'opacity=".54"')}
 ${poly('110,188 132,187 142,237 99,238',mix('#FFF7F1',b,.25))}${poly('110,191 120,191 119,235 109,236',light,'opacity=".46"')}
 <path d="M90 216 L110 213 110 233 92 235Z" fill="#FFF8F0" opacity=".82"/><path d="M139 215 L156 213 155 234 139 234Z" fill="#FFF6EF" opacity=".76"/>
 <path d="M107 192 L107 218 M136 191 L136 217" stroke="${mix('#938EB3',a,.36)}" stroke-width="2" fill="none" opacity=".6"/>
 <path d="M147 225 q6 -9 12 0 q-6 8 -12 0Z" fill="${mix(a,'#8E9FD0',.28)}"/><circle cx="150" cy="222" r="1.6" fill="${trim}"/><circle cx="157" cy="222" r="1.6" fill="${trim}"/>
 <path d="M96 179 Q122 167 149 178 L158 187 152 201 123 204 90 199 83 189Z" fill="${mix('#D5A6BE',a,.42)}"/>
 ${poly('90,180 126,174 152,180 139,184 98,187',mix('#F3CED6',a,.28),'opacity=".86"')}${poly('85,190 93,198 124,203 150,198 158,188 147,199 123,208 94,204',mix('#B99BAE',a,.5),'opacity=".50"')}
 ${poly('90,190 78,194 63,223 73,229 89,207',mix('#E2BDCE',a,.42))}${poly('76,209 70,235 77,238 86,214',mix('#DFC1D2',a,.32))}
 <g stroke="${mix(a,'#978FA9',.35)}" stroke-width="1.2" opacity=".65"><path d="M68 222 L61 235 M73 226 L68 241 M79 227 L76 241"/></g>
 <g transform="translate(89 194)"><circle r="11" fill="#F7E7E7"/><circle cx="-6" cy="-5" r="5.5" fill="#FFF8F5" opacity=".68"/><circle cx="5" cy="7" r="3.5" fill="#EDCFD9"/></g>
 <rect x="143" y="208" width="13" height="7" rx="2" fill="#A18EA8"/><rect x="146" y="209" width="8" height="4" rx="1" fill="#E9D8C6"/>
 </g>`};
 const gloves=theme==='starlet'?`<g class="arm al">${poly('77,198 92,201 87,221 78,228 66,216',mix('#B9A2DD',a,.42))}${poly('69,208 86,215 80,227 69,221',trim,'opacity=".46"')}</g><g class="arm ar">${poly('148,201 165,201 175,218 160,229 150,219',mix('#AD9BD7',a,.38))}${poly('166,207 175,218 160,229 159,218',trim,'opacity=".37"')}</g>`:
 theme==='leafy'?`<g class="arm al">${poly('83,196 95,202 88,223 73,222 70,215',mix(a,'#A6BA8E',.45))}</g><g class="arm ar">${poly('151,198 163,198 170,220 156,224 151,218',mix(a,'#B1C49F',.45))}</g>`:
 theme==='snoozy'?`<g class="arm al">${poly('80,196 92,202 91,230 77,231 69,214',mix(b,'#D8D0ED',.28))}</g><g class="arm ar">${poly('154,198 166,202 174,222 158,233 150,226',mix(b,'#A3AAD3',.3))}</g>`:'';
 const mark={
  none:'',
  cap:`${poly('54,74 84,64 120,67 157,64 187,77 180,95 151,87 118,92 86,86 58,94',a,'opacity=".26"')}${poly('81,67 118,72 151,68 142,82 119,87 93,82',mix(a,'#fff5f0',.18),'opacity=".18"')}`,
  mask:`${poly('47,118 77,110 122,116 164,109 192,118 185,144 160,158 82,159 55,144',a,'opacity=".22"')}${poly('74,115 121,120 166,114 156,134 122,139 84,134',mix(a,'#ffffff',.12),'opacity=".15"')}`,
  patch:`${poly('44,88 79,72 103,92 99,123 72,138 44,124',a,'opacity=".28"')}${poly('56,87 77,79 90,94 88,114 72,125 55,115',mix(a,'#fff9f3',.12),'opacity=".16"')}`,
  tabby:`${poly('84,65 97,62 95,89 86,98',a,'opacity=".28"')}${poly('114,62 122,63 120,98 113,99',a,'opacity=".22"')}${poly('144,66 157,70 148,97 140,90',a,'opacity=".28"')}${poly('70,95 84,101 77,117 63,111',a,'opacity=".18"')}${poly('157,100 174,94 180,111 165,118',a,'opacity=".18"')}`,
  calico:`${poly('43,95 73,72 97,81 91,109 63,126 38,118',a,'opacity=".26"')}${poly('154,70 185,84 193,118 167,128 146,108',mix(a,'#C9A28D',.48),'opacity=".30"')}${poly('84,136 107,126 121,139 112,159 88,158',mix(a,'#ffffff',.08),'opacity=".16"')}`,
  socks:`${poly('42,147 68,164 92,174 149,174 176,164 198,146 185,159 150,169 92,169 58,159',cream,'opacity=".24"')}${poly('61,165 92,173 148,173 176,164 168,173 148,179 90,179 68,173',cream,'opacity=".14"')}`
 }[l.pattern]||'';
 // Triangulated facet system: crisp geometric boundaries, no oversized soft-edged blobs.
 const facets=`<g clip-path="${url('headclip')}">
  ${poly('28,106 63,71 103,62 92,104 52,134 29,126',cream,'opacity=".54"')}
  ${poly('103,62 143,60 188,74 146,101 93,103',light,'opacity=".60"')}
  ${poly('187,73 210,104 207,136 176,122 145,102',shadow,'opacity=".27"')}
  ${poly('29,127 51,133 86,166 81,183 49,167 27,145',shadow,'opacity=".24"')}
  ${poly('52,132 90,104 145,104 176,124 163,175 82,179',cream,'opacity=".38"')}
  ${poly('176,123 212,135 196,168 160,182 166,156',shadow,'opacity=".34"')}
  ${poly('93,102 121,78 145,104 128,150',light,'opacity=".22"')}
  ${poly('80,179 121,159 161,180 116,190',mix(b,'#D0C0C6',.26),'opacity=".14"')}
  ${mark}</g>`;
 function eyeShape(){
  const options={
   droop:`<path d="M-15 -7 Q0-10 15-6 L13 0 Q12 12 1 13 Q-12 14-14 2Z" fill="${iris}"/><path d="M-14 -3 Q-12 10 1 12 Q10 10 13-2" fill="${eyelight}" opacity=".43"/><path d="M-16-9 Q0-14 16-9" stroke="${mix('#524B66',a,.24)}" stroke-width="4.1" stroke-linecap="round" fill="none"/><path d="M-4-4 l5-4 5 4-5 5Z" fill="${cream}" opacity=".83"/>`,
   sleepy:`<path d="M-15-6 Q0-10 15-7 L10 4 Q0 13-12 4Z" fill="${iris}"/><path d="M-15-8 L15-9" stroke="${mix('#504B60',a,.28)}" stroke-width="4" stroke-linecap="round"/><path d="M-10 6 Q0 11 9 5" fill="${eyelight}" opacity=".4"/>`,
   smile:`<path d="M-16 7 Q-1-15 14 6" fill="none" stroke="${iris}" stroke-width="4.1" stroke-linecap="round"/>`,
   bean:`<path d="M-11-10 Q7-16 11-1 L9 9 Q0 16-10 7Z" fill="${iris}"/><ellipse cx="-3" cy="-4" rx="3.5" ry="4.4" fill="${cream}" opacity=".8"/>`,
   round:`<ellipse cx="0" cy="0" rx="11.5" ry="13.5" fill="${iris}"/><ellipse cx="-3" cy="-5" rx="4" ry="4" fill="${cream}"/>`,
   spark:`<path d="M-11-9 Q4-14 11-2 L10 9 Q1 15-10 7Z" fill="${iris}"/><path d="M-3-9 l3 5 6 2 -6 3-2 5-3-5-5-3 5-2Z" fill="#FFF8F8"/>`
  };return options[l.eye]||options.droop;
 }
 const eyeAt=x=>`<g transform="translate(${x} 143) scale(${ex})">${eyeShape()}</g>`;
 const mouthPaths={caret:'M115 160 L120 154 L125 160',w:'M112 156 Q116 163 120 157 Q124 163 128 156',smile:'M112 158 Q120 168 128 158',tiny:'M117 160 Q120 157 123 160',open:'M116 154 Q120 150 124 154 Q127 165 120 166 Q113 165 116 154Z'};
 const isDefault=('mochi yuzu sora'.split(' ').includes(c.id));
 const topWear=()=>{
  const kind=catSmallKind(l);
  const generic=()=>{
   if(kind==='none')return '';
   if(kind==='collar')return `<g class="acc acc-collar"><path d="M90 176 Q120 168 150 176 L145 186 Q120 181 95 186Z" fill="${mix(a,'#E8C8B6',.32)}"/><circle cx="120" cy="186" r="7" fill="${trim}"/><circle cx="120" cy="186" r="3" fill="${mix(a,'#D89B76',.26)}"/></g>`;
   if(kind==='bandana')return `<g class="acc acc-bandana"><path d="M92 176 Q121 168 149 176 L141 194 Q120 189 99 194Z" fill="${mix(a,'#E9C5C7',.28)}"/><path d="M112 190 L120 206 128 190Z" fill="${mix(a,'#D7A0AC',.34)}"/></g>`;
   if(kind==='bell')return `<g class="acc acc-bell"><path d="M97 178 Q120 171 143 178" stroke="${mix(a,'#9E8891',.24)}" stroke-width="7" stroke-linecap="round" fill="none"/><circle cx="120" cy="187" r="9" fill="#F0CF82"/><circle cx="120" cy="190" r="2.5" fill="#B98A45"/></g>`;
   if(kind==='leaf')return `<g class="acc acc-leaf"><path d="M120 58 Q106 35 86 36 Q94 56 120 58" fill="#94B07B"/><path d="M120 58 Q135 34 155 30 Q150 54 120 58" fill="#AFC28F"/><path d="M120 58 L120 72" stroke="#82956B" stroke-width="4"/></g>`;
   if(kind==='glasses')return `<g class="acc acc-glasses" fill="none" stroke="${mix(a,'#6F6773',.26)}" stroke-width="3"><circle cx="80" cy="143" r="16"/><circle cx="160" cy="143" r="16"/><path d="M96 143 H144"/><path d="M64 142 H52 M176 142 H188"/></g>`;
   if(kind==='crescent')return `<g class="acc acc-crescent"><path d="M173 79 A15 15 0 1 0 173 109 A11 15 0 1 1 173 79Z" fill="#F7DB98"/></g>`;
   if(kind==='kerchief')return `<g class="acc acc-kerchief"><path d="M48 102 Q120 78 194 102 L185 118 Q120 98 57 120Z" fill="${mix(a,'#C9B7A5',.22)}"/><path d="M58 110 L49 129 63 140 71 120Z" fill="${mix(a,'#BCA89B',.2)}"/></g>`;
   if(kind==='flower')return `<g class="acc acc-flower">${[0,72,144,216,288].map(r=>`<ellipse cx="171" cy="88" rx="8" ry="12" transform="rotate(${r} 171 88)" fill="#FFF6EC"/>`).join('')}<circle cx="171" cy="88" r="7" fill="#EDD5A5"/></g>`;
   if(kind==='ribbon')return `<g class="acc acc-ribbon"><path d="M59 87 L37 75 34 96 52 103Z" fill="${mix(a,'#C8A2C8',.35)}"/><path d="M73 87 L95 75 98 96 80 103Z" fill="${mix(a,'#C8A2C8',.42)}"/><circle cx="66" cy="90" r="8" fill="${trim}"/></g>`;
   if(kind==='crown')return `<g class="acc acc-crown"><path d="M93 66 L107 84 121 60 135 84 149 66 154 88 88 88Z" fill="#F2D287"/>${poly('95,69 106,84 121,62 136,84 147,69 147,83 95,83','#FFF1C2','opacity=".72"')}</g>`;
   if(kind==='pom')return `<g class="acc acc-pom"><path d="M61 93 Q91 59 134 62 Q163 64 188 86" stroke="${mix(a,'#B1AAC8',.36)}" stroke-width="12" stroke-linecap="round" fill="none"/><circle cx="52" cy="101" r="13" fill="#F7E4E7"/></g>`;
   if(kind==='satchel')return `<g class="acc acc-satchel"><path d="M155 199 L181 193 184 222 157 225Z" fill="#B8957D"/>${poly('158,197 179,194 180,219 160,222','#D2B299','opacity=".8"')}<path d="M126 170 Q146 179 160 198" stroke="#A68873" stroke-width="4" fill="none" stroke-linecap="round"/></g></g>`;
   return '';
  };
  const placed=catPlaceable(l)?`<g class="accessory-placed" transform="${catAccTransform(l)}">${generic()}</g>`:'';
  if(theme==='starlet')return `<g class="acc head-accessory starlet-accessory">
   <g transform="translate(176 73)"><path d="M0-20 L6-6 21-5 9 4 13 19 0 11-14 19-10 4-21-5-7-7Z" fill="#EEC780"/>${poly('0,-18 5,-5 19,-4 8,3 11,18 0,10 -10,18 -8,3 -18,-4 -6,-6','#FFE4A3','opacity=".95"')}${poly('-17,-4 -7,-6 0,-18 0,10 -10,18 -8,3','#FFF4CB','opacity=".78"')}</g>
   <g transform="translate(56 86)">${poly('-5,-8 -19,-20 -32,-16 -28,4 -14,7',mix(a,'#AD91D3',.34))}${poly('3,-9 26,-20 34,-12 26,8 8,6',mix(a,'#B79EDC',.43))}<circle cx="0" cy="0" r="8" fill="${trim}"/><circle cx="0" cy="0" r="4" fill="#F5D4E1"/></g>
   <path d="M46 91 L38 113 L53 124 65 99Z" fill="${shade}" opacity=".78"/><path d="M38 113 L55 128 59 114 46 102Z" fill="${light}" opacity=".6"/>
   <path d="M57 94 L57 134" stroke="#CAAFE1" stroke-width="2"/><path d="M57 130 L66 143 57 155 48 143Z" fill="${shade}"/>${poly('57,132 65,143 57,154 56,144',trim,'opacity=".9"')}
   <path d="M198 109 l3 5-3 5-4-5Z" fill="#FFF1CE" opacity=".78"/></g>${placed}`;
  if(theme==='leafy')return `<g class="acc head-accessory leafy-accessory">
   <path d="M34 116 L39 85 66 62 102 49 145 47 182 66 203 86 211 112 196 146 178 150 184 126 164 109 146 100 120 97 91 101 67 112 48 138Z" fill="${mix(a,'#A7B68A',.35)}"/>
   ${poly('41,97 64,72 103,53 133,50 94,78 59,112',mix(a,'#D4D8B5',.55))}${poly('146,49 183,66 202,86 207,113 187,124 171,94',mix('#93A97D',a,.4))}
   <path d="M44 115 Q76 75 120 77 Q171 76 193 116" stroke="${mix('#D8D7AF',a,.35)}" stroke-width="7" stroke-linecap="round" fill="none"/>
   <path d="M52 102 L71 87 M82 79 L102 72" stroke="#EEE9CD" stroke-width="2.3" opacity=".78" stroke-linecap="round" stroke-dasharray="5 11"/>
   <g transform="translate(123 52)"><path d="M0 0 Q-15-24-32-22 Q-24-3 0 0" fill="#91A56A"/><path d="M0 0 Q14-22 33-26 Q28-2 0 0" fill="#A9B98B"/><path d="M0 0 L0 16" stroke="#82936E" stroke-width="4"/></g>
   <g transform="translate(171 91)"><path d="M0 0 Q-18-18-27-15 Q-24-5-7 2Z" fill="#92AD81"/><path d="M0 0 Q11-23 24-18 Q22-1 1 4Z" fill="#AABF97"/>
   ${[0,72,144,216,288].map(r=>`<ellipse cy="-12" rx="8" ry="12" transform="rotate(${r})" fill="#FFFAEC"/>`).join('')}<circle r="7" fill="#EDD5A5"/></g>
   <path d="M47 122 L35 146 51 167 63 139Z" fill="${mix('#92A97E',a,.43)}"/><path d="M198 122 L207 146 190 163 184 141Z" fill="${mix('#879F79',a,.36)}"/>
 </g>${placed}`;
  if(theme==='snoozy')return `<g class="acc head-accessory snoozy-accessory">
   <path d="M43 100 Q47 53 96 42 157 36 196 77 L206 108 190 132 171 111 136 103 97 103 58 115Z" fill="${mix('#9E99C6',a,.37)}"/>
   ${poly('47,89 68,59 113,43 150,44 107,71 62,104',mix('#CCD0EC',b,.4))}${poly('149,44 188,67 204,100 182,113 169,77',mix(a,'#9F99C0',.26))}
   <path d="M44 105 Q117 73 203 107 L196 124 Q123 94 54 127Z" fill="${mix('#B7AECF',a,.40)}"/>
   <path d="M55 108 Q127 82 197 109" fill="none" stroke="${mix('#E1D4E8',a,.5)}" stroke-width="3.6"/>
   <g transform="translate(139 45)"><path d="M-18-1 Q-26-18-9-22 Q-2-33 9-24 Q26-26 26-11 Q37-2 23 10 Q19 23 4 18 Q-8 26-18 13 Q-32 10-18-1Z" fill="#F6E5E9"/>${poly('-15,-8 -5,-23 10,-20 20,-10 9,-9','#FFF9F6','opacity=".66"')}<circle cx="-12" cy="7" r="8" fill="#F5E6E6"/><circle cx="16" cy="4" r="7" fill="#F8EDEB"/></g>
   <g transform="translate(177 88)"><circle r="8" fill="#FDF5EF"/><path d="M-2-13 L2-13 2 14 -2 14ZM-13 -2 L14 -2 14 2 -13 2Z" fill="#F8F1ED" transform="rotate(39)"/><circle r="3" fill="#E4C6D6"/></g>
   <g transform="translate(48 126)"><circle r="15" fill="#F7E3E4"/><circle cx="-6" cy="-5" r="6" fill="#FFF9F4" opacity=".65"/></g>
 </g>${placed}`;
  return placed;
 };
 const face=`<g class="head-g"><g transform="translate(120 176) scale(${size}) translate(-120 -176)">${ear(false)}${ear(true)}
  <path d="${hp}" fill="${url('face')}"/><path d="${hp}" stroke="${shadow}" stroke-width="1.2" stroke-opacity=".13" fill="none"/>${facets}
  <g class="cheek" opacity="${l.cheeks/100}">${(()=>{const one=x=>{
   if(l.cheekStyle==='none')return '';
   if(l.cheekStyle==='stripes')return `<g transform="translate(${x} 160)" stroke="${blush}" stroke-width="4" stroke-linecap="round"><path d="M-11 -2 l-4 7 M-3 -3 l-4 8 M5 -4 l-4 8"/></g>`;
   if(l.cheekStyle==='heart')return `<path transform="translate(${x-8} 153)" d="M8 14 Q-5 6 2 1 Q7 -2 8 4 Q14 -3 18 2 Q23 9 8 14Z" fill="${blush}"/>`;
   if(l.cheekStyle==='spark')return `<path transform="translate(${x} 158)" d="M0-11 L3-3 12 0 3 3 0 11-3 3-12 0-3-3Z" fill="#F7E0A6"/>`;
   if(l.cheekStyle==='paw')return `<g transform="translate(${x} 160)" fill="${blush}"><ellipse cx="0" cy="5" rx="6" ry="4"/><circle cx="-8" cy="-3" r="2.5"/><circle cx="-3" cy="-7" r="2.5"/><circle cx="4" cy="-7" r="2.5"/><circle cx="9" cy="-3" r="2.5"/></g>`;
   return `<ellipse cx="${x}" cy="158" rx="18" ry="8" fill="${blush}" opacity=".86"/>`;
  };return one(53)+one(187);})()}</g>
  <g class="eyebrows" transform="translate(0 ${l.eyeY})" stroke="${iris}" stroke-width="2.6" stroke-linecap="round" fill="none" opacity=".76">${(()=>{const bw={none:'',flat:'M-11 0 L11 0',soft:'M-11 1 Q0-6 11 1',arched:'M-11 3 Q-2-7 11-2',sad:'M-11-4 L11 3'}[l.brow]||'';return bw?`<path d="${bw}" transform="translate(${x1} 122)"/><path d="${bw}" transform="translate(${x2} 122) scale(-1 1)"/>`:'';})()}</g>
  <g class="eye-o" transform="translate(0 ${l.eyeY})">${eyeAt(x1)}${eyeAt(x2)}</g>
  <g class="eye-c" transform="translate(0 ${l.eyeY})" fill="none" stroke="${iris}" stroke-width="4.2" stroke-linecap="round"><path d="M${x1-14} 150 Q${x1} 128 ${x1+14} 150 M${x2-14} 150 Q${x2} 128 ${x2+14} 150"/></g>
  <g class="eye-h" transform="translate(0 ${l.eyeY})" fill="none" stroke="${iris}" stroke-width="3.8" stroke-linecap="round"><path d="M${x1-13} 150 Q${x1} 137 ${x1+13} 150 M${x2-13} 150 Q${x2} 137 ${x2+13} 150"/></g>
  <path class="mouth-n" d="${mouthPaths[l.mouth]||mouthPaths.caret}" transform="translate(0 ${l.mouthY})" stroke="${iris}" stroke-width="3.3" stroke-linecap="round" stroke-linejoin="round" fill="${l.mouth==='open'?iris:'none'}"/>
  <path class="mouth-h" d="M113 157 Q120 175 127 157Z" fill="${iris}" transform="translate(0 ${l.mouthY})"/><ellipse class="mouth-o" cx="120" cy="159" rx="5.6" ry="7" fill="${iris}" transform="translate(0 ${l.mouthY})"/>
  <g class="eye-extra eye-wow" fill="${iris}"><ellipse cx="${x1}" cy="141" rx="10" ry="15"/><ellipse cx="${x2}" cy="141" rx="10" ry="15"/></g>
  <g class="eye-extra eye-soft" fill="none" stroke="${iris}" stroke-width="3" stroke-linecap="round"><path d="M${x1-13} 144 q13 13 26 0 M${x2-13} 144 q13 13 26 0"/></g>
  <g class="eye-extra eye-worry" fill="${iris}"><ellipse cx="${x1}" cy="143" rx="9" ry="10"/><ellipse cx="${x2}" cy="143" rx="9" ry="10"/></g>
  <g class="eye-extra eye-tsun" fill="${iris}"><path d="M${x1-14} 139 h28 l-4 13 q-13 9-21-2Z M${x2-14} 139 h28 l-4 13 q-13 9-21-2Z"/></g>
  <path class="mouth-extra mouth-pout" d="M115 163 Q120 154 125 163" stroke="${iris}" stroke-width="2.8" fill="none" stroke-linecap="round"/>
  ${topWear()}</g></g>`;
 return `<svg class="oc-svg toy-svg cat-poly cat-ref-v2" data-doll="kitty" viewBox="0 0 240 260" preserveAspectRatio="xMidYMax meet" aria-hidden="true">${defs}
  <g class="body-g">${tail}${legs}${torso}${outfit[theme]||''}${theme==='starlet'||theme==='leafy'||theme==='snoozy'?gloves:arms}</g>${face}</svg>`;
}

function legacyOcSVG(c){
 const b=c.body||'#FFF6EC',light=mix(b,'#ffffff',.5),shade=mix(b,'#79666c',.29),deep=mix(b,'#655158',.38),bel=mix(b,'#ffffff',.78),pink=mix(b,'#e9a6b3',.62),ink='#60414a',id='oc-doll-'+(++ocToySequence)+'-',url=n=>'url(#'+id+n+')',cat=c.ears==='pointy',rabbit=c.ears==='long';
 const defs=`<defs>
 <radialGradient id="${id}clay" cx="33%" cy="24%" r="83%"><stop stop-color="${light}"/><stop offset=".48" stop-color="${b}"/><stop offset=".8" stop-color="${mix(b,shade,.5)}"/><stop offset="1" stop-color="${shade}"/></radialGradient>
 <linearGradient id="${id}body" x1="0" y1="0" x2="1" y2=".7"><stop stop-color="${light}"/><stop offset=".4" stop-color="${b}"/><stop offset="1" stop-color="${shade}"/></linearGradient>
 <radialGradient id="${id}ear" cx="38%" cy="35%" r="70%"><stop stop-color="${light}"/><stop offset=".6" stop-color="${b}"/><stop offset="1" stop-color="${shade}"/></radialGradient>
 <radialGradient id="${id}inner"><stop stop-color="${mix(pink,'#ffffff',.45)}"/><stop offset=".65" stop-color="${pink}"/><stop offset="1" stop-color="${mix(pink,shade,.3)}"/></radialGradient>
 <radialGradient id="${id}belly" cx="38%" cy="28%" r="80%"><stop stop-color="#fffefa"/><stop offset=".65" stop-color="${bel}"/><stop offset="1" stop-color="${mix(bel,shade,.2)}"/></radialGradient>
 <radialGradient id="${id}blush"><stop stop-color="${mix(pink,'#e58e9e',.45)}" stop-opacity=".75"/><stop offset="1" stop-color="${pink}" stop-opacity="0"/></radialGradient>
 <linearGradient id="${id}eye" x2=".8" y2="1"><stop stop-color="#765059"/><stop offset=".55" stop-color="#533640"/><stop offset="1" stop-color="#432b35"/></linearGradient>
 <linearGradient id="${id}leaf" x2=".8" y2="1"><stop stop-color="#c9dc98"/><stop offset=".42" stop-color="#a2c479"/><stop offset="1" stop-color="#6b9b6f"/></linearGradient>
 <linearGradient id="${id}ribbon" x2=".5" y2="1"><stop stop-color="#b9d9c4"/><stop offset=".5" stop-color="#8ebcaa"/><stop offset="1" stop-color="#689987"/></linearGradient>
 <linearGradient id="${id}gold" x2=".8" y2="1"><stop stop-color="#fff0be"/><stop offset=".45" stop-color="#ebcc7f"/><stop offset="1" stop-color="#c49d5f"/></linearGradient>
 </defs>`;
 const ear=rabbit?`<path d="M42 43C31 34 20 35 17 45 7 46 7 55 11 61 1 68 5 80 10 84 2 92 7 103 12 106 6 117 15 127 26 125L43 116 51 60Z" fill="${url('ear')}"/><path d="M31 47C21 45 20 55 23 61 14 68 18 77 21 82 14 90 19 99 22 104 18 114 23 118 29 116L38 106 40 57Z" fill="${url('inner')}" opacity=".64"/>`
 :cat?`<path d="M26 65C20 48 21 24 27 12 31 5 48 18 64 36L70 58Z" fill="${url('ear')}"/><path d="M32 48C29 37 28 24 31 21 35 20 46 30 53 39Z" fill="${url('inner')}" opacity=".7"/>`
 :`<path d="M26 56C12 45 13 21 24 12 37 0 59 8 66 26L65 55Z" fill="${url('ear')}"/><path d="M29 42C22 32 24 20 31 17 42 12 51 22 53 34Z" fill="${url('inner')}" opacity=".55"/>`;
 const ears=`<g class="ear el">${ear}</g><g transform="translate(200 0) scale(-1 1)"><g class="ear er">${ear}</g></g>`;
 const tail=rabbit?`<circle cx="125" cy="187" r="10" fill="${url('belly')}"/>`:cat?`<path d="M112 190C133 202 145 184 131 175" fill="none" stroke="${shade}" stroke-width="11" stroke-linecap="round"/><path d="M113 187C133 197 142 183 130 177" fill="none" stroke="${url('body')}" stroke-width="10" stroke-linecap="round"/>`:`<circle cx="126" cy="190" r="9" fill="${url('body')}"/>`;
 const forelock=cat?`<g fill="${deep}" opacity=".7"><path d="M91 43Q100 55 99 72 90 64 91 43Z"/><path d="M73 47Q72 62 62 68 64 56 73 47Z"/><path d="M120 47Q133 56 136 67 125 64 120 47Z"/></g>`:`<path d="M76 42Q83 34 95 37 108 33 120 43L123 63Q118 69 111 62 106 73 99 67 88 74 84 64 75 68 76 56Z" fill="${url('body')}" opacity=".9"/>`;
 const eyes=cat?`<path d="M58 94C49 96 44 104 47 113 50 121 60 126 67 119 74 112 72 103 66 98ZM142 94C151 96 156 104 153 113 150 121 140 126 133 119 126 112 128 103 134 98Z" fill="${url('eye')}"/><path d="m51 103 9-7m-10 15 15-12m-10 20 13-10m66-6 8-7m-11 15 15-12m-10 20 13-10" stroke="#c5a0a5" stroke-width="1.5" stroke-linecap="round" opacity=".36"/>`
 :rabbit?`<path d="M52 92Q57 85 64 93C70 102 71 115 68 125Q58 130 47 124C46 113 47 100 52 92ZM136 93Q143 85 148 92C153 100 154 113 153 124Q142 130 132 125C129 115 130 102 136 93Z" fill="${url('eye')}"/><path d="m50 102 11-10m-12 20 17-15m-16 24 17-15m67-4 11-10m-13 21 17-15m-16 24 17-15" stroke="#cba3ab" stroke-width="1.6" stroke-linecap="round" opacity=".38"/><path d="m53 92-2-7m88 6-1-6" fill="none" stroke="${ink}" stroke-width="2.2" stroke-linecap="round"/>`
 :`<path d="M52 97Q59 85 67 98C73 108 72 119 70 125Q59 129 48 124C47 115 47 105 52 97ZM133 98Q141 85 148 97C153 105 153 115 152 124Q141 129 130 125C128 119 127 108 133 98Z" fill="${url('belly')}" stroke="${ink}" stroke-width="2.2"/><path d="m51 131 1 2m10-2 1 2m74-2 1 2m9-2 1 2" stroke="${ink}" stroke-width="1.5" stroke-linecap="round"/>`;
 const accessory=c.acc==='sprout'?`<g transform="translate(141 40)"><g class="acc"><path d="M0 14Q1 3-4-7" stroke="#7a9a69" stroke-width="2.8" fill="none" stroke-linecap="round"/><path d="M-2 7C-18 9-23-4-20-8-9-11-1-4-2 7Z" fill="${url('leaf')}"/><path d="M-1 10C-1-4 10-8 17-4 19 4 11 13-1 10Z" fill="${url('leaf')}"/><path d="m-18-6 14 11M1 9 14-2" stroke="#dce6b3" stroke-width="1.1" opacity=".55"/></g></g>`:c.acc==='star'?`<g transform="translate(148 51)"><g class="acc"><path d="m0-12 4 8 9 2-6 6 1 9-8-4-8 4 1-9-6-6 9-2Z" fill="${url('gold')}"/><path d="M0-12 0 3-8 13l1-9-6-6 9-2Z" fill="#fff2c5" opacity=".48"/></g></g>`:'';
 const bow=c.acc==='scarf'?`<path d="M85 154Q100 160 115 154L114 161Q100 167 86 161Z" fill="${url('ribbon')}"/><g class="acc"><path d="M100 162C87 150 77 158 85 168L98 165Z" fill="${url('ribbon')}"/><path d="M100 162C113 150 123 158 115 168L102 165Z" fill="${url('ribbon')}"/><path d="m98 164-8 13 8-4 3-9m2 0 8 13-8-4-3-9" fill="${url('ribbon')}"/><ellipse cx="100" cy="163" rx="4" ry="4.5" fill="${mix('#9fc8b4','#fffaf0',.3)}"/></g>`:'';
 return `<svg class="oc-svg toy-svg" data-doll="${rabbit?'bunny':cat?'kitty':'bear'}" viewBox="0 0 200 214" preserveAspectRatio="xMidYMax meet" aria-hidden="true">${defs}
 <g class="body-g"><g class="tail">${tail}</g>
 <g class="foot fl"><path d="M83 191Q90 187 97 194L97 204Q98 213 90 213C81 214 80 207 81 202Z" fill="${url('body')}"/><path d="M82 206Q88 202 97 206L96 210Q90 216 84 211Z" fill="${url('belly')}" opacity=".85"/></g>
 <g class="foot fr"><path d="M103 194Q110 187 117 191L119 202C120 207 119 214 110 213Q102 213 103 204Z" fill="${url('body')}"/><path d="M103 206Q112 202 118 206L116 211Q110 216 104 210Z" fill="${url('belly')}" opacity=".85"/></g>
 <path class="torso" d="M90 152Q100 148 110 152C115 158 118 170 121 181Q127 195 116 201Q108 205 100 202Q92 205 84 201 73 195 79 181C82 170 85 158 90 152Z" fill="${url('body')}"/>
 <ellipse cx="100" cy="183" rx="13" ry="15" fill="${url('belly')}" opacity=".83"/>
 <ellipse cx="100" cy="155" rx="13" ry="4" fill="${shade}" opacity=".23"/>
 <g class="arm al"><path d="M86 164C79 161 74 168 75 176Q75 186 80 188C85 190 88 184 88 180L91 171Q92 167 86 164Z" fill="${url('body')}"/><ellipse cx="80" cy="183" rx="4" ry="4.5" fill="${url('belly')}" opacity=".34"/></g>
 <g class="arm ar"><path d="M114 164C121 161 126 168 125 176Q125 186 120 188C115 190 112 184 112 180L109 171Q108 167 114 164Z" fill="${url('body')}"/><ellipse cx="120" cy="183" rx="4" ry="4.5" fill="${url('belly')}" opacity=".34"/></g>
 ${bow}</g>
 <g class="head-g">${ears}
 <path d="M26 64Q25 45 47 39Q100 29 153 39 175 45 174 64L176 125Q176 143 154 150 100 160 46 150 24 143 24 125Z" fill="${url('clay')}"/>
 <path d="M29 64Q27 47 49 42 101 32 149 41 103 37 57 47 38 51 29 64Z" fill="#fffdf4" opacity=".2"/>
 <path d="M171 62 174 125Q174 142 152 148 101 158 47 148 33 144 28 136 61 147 109 147 155 145 164 132Z" fill="${shade}" opacity=".16"/>
 ${forelock}
 <ellipse class="cheek" cx="43" cy="125" rx="15" ry="10" fill="${url('blush')}"/><ellipse class="cheek" cx="157" cy="125" rx="15" ry="10" fill="${url('blush')}"/>
 <g class="eye-o">${eyes}</g>
 <g class="eye-c" fill="none" stroke="${ink}" stroke-width="2.5" stroke-linecap="round"><path d="M48 117Q59 121 70 117M130 117Q141 121 152 117"/></g>
 <g class="eye-h" fill="none" stroke="${ink}" stroke-width="2.5" stroke-linecap="round"><path d="M48 118Q59 108 70 118M130 118Q141 108 152 118"/></g>
 <path class="mouth-n" d="M92 128Q95 134 100 128 105 134 108 128" fill="none" stroke="${ink}" stroke-width="2.1" stroke-linecap="round"/>
 <g class="mouth-h"><path d="M92 127Q100 140 108 127Z" fill="${ink}"/><path d="M96 133Q100 130 104 133Q100 137 96 133Z" fill="${pink}"/></g>
 <ellipse class="mouth-o" cx="100" cy="130" rx="4" ry="5" fill="${ink}"/>
 <g class="eye-extra eye-wow"><ellipse cx="59" cy="111" rx="12" ry="17" fill="${url('belly')}" stroke="${ink}" stroke-width="2.1"/><ellipse cx="141" cy="111" rx="12" ry="17" fill="${url('belly')}" stroke="${ink}" stroke-width="2.1"/></g>
 <g class="eye-extra eye-soft" fill="none" stroke="${ink}" stroke-width="2.4" stroke-linecap="round"><path d="M49 116Q59 122 69 116M131 116Q141 122 151 116"/></g>
 <g class="eye-extra eye-worry" fill="${url('eye')}"><ellipse cx="59" cy="116" rx="7" ry="10"/><ellipse cx="141" cy="116" rx="7" ry="10"/><path d="M47 98q13 4 23-3m60 0q10 7 23 3" fill="none" stroke="${ink}" stroke-width="2" stroke-linecap="round"/></g>
 <g class="eye-extra eye-tsun" fill="${url('eye')}"><path d="M48 109h22q0 18-9 17-10-1-13-17Zm82 0h22q-3 16-13 17-9 1-9-17Z"/><path d="m49 105 20 3m62 0 20-3" stroke="${ink}" stroke-width="2" stroke-linecap="round"/></g>
 <path class="mouth-extra mouth-pout" d="M95 132q5-4 10 0" fill="none" stroke="${ink}" stroke-width="2.2" stroke-linecap="round"/>
 ${accessory}</g></svg>`;
}


Object.assign(G,{DEMOS,SWATCH,CAT_OPT,CAT_BASE,CAT_RANGES,CAT_COLOR,CAT_NORM,CAT_RAND,ocSVG,legacyOcSVG,mix,hex2rgb,rgb2hex});
})(window.OC=window.OC||{});
