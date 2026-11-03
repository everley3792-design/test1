/* OC Shimeji v4 · 生活行動定義（效用 AI 的「廣告」） */
(function(OC){'use strict';
const {U}=OC;
/* gain：每秒需求增加量；dur：持續秒數；obj：使用的場景物件 act；loc：可進行的地點 */
const A=(id,o)=>Object.assign({id,dur:[25,50],gain:{},pose:'stand',loc:null,obj:null,w:1},o);
const ACTS=[
 A('cook',{t:'做飯',loc:['house'],obj:'cook',gain:{hunger:2.2,fun:.3},dur:[24,36],pose:'stand',skill:'cooking',hold:'🍳',then:'eat'}),
 A('eat',{t:'吃飯',loc:['house'],obj:'eat',gain:{hunger:2.4,comfort:.3},dur:[20,32],pose:'eat',hold:'🍙'}),
 A('cafe',{t:'去咖啡館',loc:['plaza'],obj:'cafe',gain:{hunger:2,social:.8,fun:.6},dur:[30,45],pose:'eat',hold:'☕',inside:1}),
 A('picnic',{t:'野餐',loc:['home'],obj:'picnic',gain:{hunger:1.4,fun:.8,comfort:.4},dur:[30,48],pose:'sit',hold:'🥪',social:1}),
 A('forage',{t:'採集',loc:['forest'],obj:'forage',gain:{hunger:.6,fun:.9},dur:[18,30],pose:'look',skill:'explore',loot:['mushroom','berry','acorn','flower','clover']}),
 A('berries',{t:'摘莓果',loc:['forest'],obj:'berries',gain:{hunger:1.4,fun:.6},dur:[16,24],pose:'eat',hold:'🫐'}),
 A('drink',{t:'喝水',loc:['home'],obj:'drink',gain:{hunger:.4,comfort:.8},dur:[8,12],pose:'stand'}),
 A('sleep',{t:'睡覺',loc:['house'],obj:'sleep',gain:{energy:1.6,comfort:.5},dur:[120,240],pose:'sleep',ex:1}),
 A('nap',{t:'打盹',loc:['home','beach','forest','plaza','house'],obj:['shade','bench','sofa'],gain:{energy:.9,comfort:.4},dur:[40,80],pose:'sleep'}),
 A('read',{t:'看書',loc:['house'],obj:'read',gain:{fun:1.4,comfort:.3},dur:[40,70],pose:'sit',skill:'reading',hold:'📖'}),
 A('sofa',{t:'窩沙發',loc:['house'],obj:'sofa',gain:{comfort:1.8,energy:.3},dur:[30,55],pose:'sit'}),
 A('music',{t:'聽音樂',loc:['house'],obj:'music',gain:{fun:1.6},dur:[30,50],pose:'cheer',notes:1,skill:'creativity'}),
 A('bathe',{t:'洗澡',loc:['house'],obj:'bathe',gain:{hygiene:3.5,comfort:.8},dur:[20,30],pose:'sit'}),
 A('garden',{t:'照顧花圃',loc:['home'],obj:'garden',gain:{fun:1,comfort:.3,hygiene:-.2},dur:[24,40],pose:'look',skill:'gardening'}),
 A('campfire',{t:'圍著營火',loc:['home','beach'],obj:'campfire',gain:{comfort:1.3,social:.5,fun:.5},dur:[40,70],pose:'sit',night:1,social:1}),
 A('bench',{t:'坐著發呆',loc:['home','plaza','beach','forest'],obj:'bench',gain:{comfort:1.2,energy:.2},dur:[30,60],pose:'sit'}),
 A('stargaze',{t:'看星星',loc:['home'],spot:'stargaze',gain:{fun:1.3,comfort:.5},dur:[40,70],pose:'look',night:2,lookUp:1}),
 A('sunset',{t:'看夕陽',loc:['beach','home'],spot:'sunset',gain:{fun:1.1,comfort:.8},dur:[40,60],pose:'sit',dusk:1}),
 A('fish',{t:'釣魚',loc:['beach'],obj:'fish',gain:{fun:1.3},dur:[35,60],pose:'sit',skill:'fishing',loot:['fish1','fish1','fish2','fish3','fish4']}),
 A('shells',{t:'撿貝殼',loc:['beach'],spot:'shells',gain:{fun:1.1},dur:[22,36],pose:'look',wander:1,loot:['shell','shell','starfish','seaglass']}),
 A('sunbathe',{t:'曬太陽',loc:['beach'],obj:'sunbathe',gain:{comfort:1.4,energy:.4},dur:[40,70],pose:'sleep',day:1}),
 A('explore',{t:'森林探險',loc:['forest'],gain:{fun:1.3},dur:[30,50],pose:'walk',wander:1,skill:'explore',loot:['bug1','bug1','bug2','bug3','flower']}),
 A('shade',{t:'樹下乘涼',loc:['home','forest'],obj:'shade',spot:'shade',gain:{comfort:1.3,energy:.4},dur:[30,55],pose:'sit'}),
 A('stroll',{t:'散步',loc:['home','plaza','beach','forest'],gain:{fun:.6,comfort:.2},dur:[20,40],pose:'walk',wander:1,skill:'fitness'}),
 A('fountain',{t:'看噴水池',loc:['plaza'],obj:'fountain',gain:{fun:.9,comfort:.5},dur:[20,35],pose:'look'}),
 A('shop',{t:'逛商店',loc:['plaza'],obj:['shop','boutique','market'],gain:{fun:1.2},dur:[24,40],pose:'look'}),
 A('play',{t:'玩耍',loc:['home','beach','plaza'],gain:{fun:2,energy:-.4},dur:[20,34],pose:'run',wander:1,fast:1,skill:'fitness',hold:'⚽'}),
 A('tidy',{t:'打掃',loc:['home','house'],gain:{comfort:.6,fun:.3},dur:[20,32],pose:'walk',wander:1,hold:'🧹'}),
 A('observe',{t:'觀察',loc:['home','forest','beach'],gain:{fun:.8},dur:[16,26],pose:'look',skill:'creativity'}),
 A('daydream',{t:'發呆',loc:['home','house','plaza','beach','forest'],gain:{comfort:.5,fun:.3},dur:[16,30],pose:'stand'}),
 A('rest',{t:'休息',loc:['home','house','plaza','beach','forest'],gain:{energy:.5,comfort:.6},dur:[20,40],pose:'sit'}),
 A('wash',{t:'洗洗臉',loc:['home'],obj:'drink',gain:{hygiene:2.2},dur:[10,16],pose:'stand'}),
 A('drawsign',{t:'看告示牌',loc:['home'],obj:'sign',gain:{fun:.4},dur:[8,12],pose:'look'})];
/* 3.2 特質中的行動鍵 → v4 行動 */
const AI_ALIAS={chat:'_social',wander:'stroll',dance:'music',butterfly:'explore',tag:'play',flowers:'garden',home:'_home',shelter:'_home',furniture:'sofa',eat:'_eat'};
const ACT=Object.fromEntries(ACTS.map(a=>[a.id,a]));
OC.Acts={ACTS,ACT,AI_ALIAS};
})(window.OC);
