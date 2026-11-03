/* OC Shimeji v4 · 遊戲內容資料：特質、怪癖、物品、房屋、地點、台詞 */
(function(OC){'use strict';
const L=OC.Legacy,C={};
C.SLIDERS=L.SLIDERS;
C.CATS=[...L.L29.CATS];
C.TYPES=L.L29.TYPES;
C.Q=L.L29.Q;C.QDEF=Object.assign({},L.L29.QDEF);
C.HABITS=L.L29.HABITS;
/* 3.2 早期特質的待機偏好轉換為 v4 行動權重 */
const W2AI={sit:'rest',sleep:'nap',dash:'play',bounce:'play',hop:'play',wiggle:'play',look:'observe',visit:'explore',stroll:'stroll'};
const early=L.TRAITS.map(t=>{const ai={};for(const [k,v] of Object.entries(t.w||{})){const a=W2AI[k];if(a)ai[a]=Math.max(ai[a]||1,v)}
 return Object.assign({c:['curious','dreamer','homebody','foodie','sporty'].includes(t.id)?'int':['clingy','shy','tsun','sharp','chatty','quiet','gentle'].includes(t.id)?'soc':'pers',ai,nd:{}},t)});
C.TRAITS=[...early,...L.L29.TRAITS.filter(t=>!early.some(e=>e.id===t.id))];
/* 社交傾向（v4 新增）：吵架、原諒、安慰、受傷程度 */
const SOC={tsun:{argue:1.4},sharp:{argue:1.8,hurt:.8},stubborn:{argue:1.5,forgive:.6},moody:{argue:1.5,hurt:1.3},hot:{argue:1.4,forgive:1.2},jealous:{argue:1.3,hurt:1.3},prank:{argue:1.2},
 gentle:{argue:.4,forgive:1.6,comfort:1.6},caring:{argue:.5,forgive:1.4,comfort:2},polite:{argue:.6,forgive:1.3},calm:{argue:.5,forgive:1.3},mature:{argue:.6,forgive:1.5,comfort:1.3},optimist:{forgive:1.4,hurt:.7},
 sensitive:{hurt:1.6},crybaby:{hurt:1.5},timid:{argue:.6,hurt:1.3},pessimist:{hurt:1.3},friendlyhost:{argue:.7,comfort:1.2},shy:{argue:.7}};
C.TRAITS.forEach(t=>{t.soc=Object.assign({argue:1,forgive:1,comfort:1,hurt:1},SOC[t.id]||{})});
C.TRAIT=Object.fromEntries(C.TRAITS.map(t=>[t.id,t]));
C.EXCL=(a,b)=>{const A=C.TRAIT[a],B=C.TRAIT[b];return !!((A&&A.x&&A.x.includes(b))||(B&&B.x&&B.x.includes(a)))};
C.TONE_LINES=L.TONE_LINES;

/* ---------- 需求 ---------- */
C.NEEDS=[['hunger','飽足','#E9A15B'],['energy','精力','#7FB65A'],['fun','娛樂','#E58AAE'],['social','社交','#E57B72'],['hygiene','清潔','#5DB3E0'],['comfort','舒適','#45B596']];
/* 每小時下降量（實際時間），不會把角色逼到極端：離線時另有下限 */
C.DECAY={hunger:15,energy:7,fun:16,social:11,hygiene:6,comfort:9};
C.MOODS={
 happy:{t:'開心',c:'#F4B860'},content:{t:'平靜',c:'#8CC3A0'},excited:{t:'興奮',c:'#F18A6B'},sleepy:{t:'睏睏的',c:'#9B93D8'},
 bored:{t:'無聊',c:'#B8B0A2'},lonely:{t:'寂寞',c:'#88A5D6'},sad:{t:'難過',c:'#7F9CC6'},angry:{t:'生氣',c:'#E06A5E'},
 sick:{t:'不舒服',c:'#9DB07A'},hungry:{t:'肚子餓',c:'#E9A15B'},shy:{t:'害羞',c:'#EFA2B5'},loved:{t:'被愛著',c:'#F18FB0'}};
/* ---------- 疾病 ---------- */
C.SICK={
 cold:{t:'感冒',d:'打噴嚏、想休息。喝熱湯或吃藥會好得比較快。',dur:3.5,cure:['soup','medicine','cocoa','tea'],fx:{energy:1.8,fun:1.2}},
 tummy:{t:'肚子痛',d:'吃了不喜歡或太多東西。需要休息與溫和的食物。',dur:2,cure:['medicine','tea','porridge'],fx:{hunger:.4,comfort:1.6}},
 tired:{t:'過度疲勞',d:'太久沒睡好，整隻軟趴趴。好好睡一覺就會恢復。',dur:2.5,cure:['medicine'],sleepCure:1,fx:{energy:2}},
 blue:{t:'心情低落',d:'經歷了難過的事。朋友的陪伴和摸摸最有效。',dur:3,cure:['cake','cocoa','bouquet'],petCure:1,fx:{fun:1.6,social:1.4}}};

/* ---------- 食物口味標籤 ---------- */
C.TASTES=[['sweet','甜'],['salty','鹹'],['sour','酸'],['spicy','辣'],['bitter','苦'],['savory','鮮'],['fruit','水果'],['fish','魚'],['veg','蔬菜'],['meat','肉'],['dairy','奶'],['hot','熱'],['cold','冰涼'],['crunchy','脆'],['soft','軟綿']];
C.PREF=[[-2,'最討厭','#D46A6A'],[-1,'討厭','#E39B7B'],[0,'普通','#B8B0A2'],[1,'喜歡','#8FC28A'],[2,'最愛','#F09AB8']];

/* ---------- 物品 ---------- */
const I=(id,name,em,cat,price,tags,o={})=>Object.assign({id,name,em,cat,price,tags},o);
C.ITEMS=[
 I('apple','蘋果','🍎','food',30,['fruit','sweet','crunchy'],{fx:{hunger:22},desc:'清脆多汁的小點心。'}),
 I('cake','草莓蛋糕','🍰','food',90,['sweet','soft','dairy','fruit'],{fx:{hunger:30,fun:12},desc:'鬆軟的蛋糕，大部分夥伴都喜歡。'}),
 I('onigiri','飯糰','🍙','food',50,['salty','savory','soft'],{fx:{hunger:40},desc:'鹹鹹的海苔飯糰，很有飽足感。'}),
 I('fishgrill','烤魚','🍢','food',80,['fish','salty','savory','hot'],{fx:{hunger:45},desc:'海邊現烤，香氣四溢。'}),
 I('soup','蔬菜熱湯','🍲','food',70,['veg','hot','savory','soft'],{fx:{hunger:35,comfort:15},heal:1,desc:'暖呼呼的湯，生病時最需要。'}),
 I('porridge','白粥','🥣','food',40,['soft','hot','salty'],{fx:{hunger:28,comfort:10},heal:.6,desc:'溫和的粥，腸胃不舒服時吃。'}),
 I('bread','可頌','🥐','food',60,['sweet','crunchy','dairy'],{fx:{hunger:30},desc:'奶油香的可頌。'}),
 I('curry','咖哩飯','🍛','food',110,['spicy','savory','hot','meat'],{fx:{hunger:55},desc:'香辣濃郁，有的夥伴會被辣到。'}),
 I('pudding','焦糖布丁','🍮','food',75,['sweet','soft','dairy','cold'],{fx:{hunger:20,fun:10}}),
 I('cookie','手工餅乾','🍪','food',45,['sweet','crunchy'],{fx:{hunger:15,fun:6}}),
 I('salad','田園沙拉','🥗','food',55,['veg','sour','crunchy','cold'],{fx:{hunger:25}}),
 I('lemon','檸檬塔','🍋','food',70,['sour','sweet','fruit'],{fx:{hunger:22,fun:6}}),
 I('mushroom','烤蘑菇串','🍄','food',40,['savory','veg','hot'],{fx:{hunger:25},forage:1}),
 I('berry','野莓','🫐','food',20,['fruit','sweet','sour'],{fx:{hunger:12},forage:1}),
 I('cocoa','熱可可','☕','drink',50,['sweet','hot','dairy'],{fx:{hunger:6,comfort:18},heal:.4}),
 I('soda','氣泡水','🥤','drink',35,['cold','sweet'],{fx:{fun:10}}),
 I('milk','牛奶','🥛','drink',30,['dairy','cold'],{fx:{hunger:10,energy:5}}),
 I('tea','花草茶','🍵','drink',45,['hot','bitter'],{fx:{comfort:20,energy:4},heal:.5}),
 I('juice','果汁','🧃','drink',40,['fruit','sweet','cold'],{fx:{hunger:8,fun:6}}),
 I('medicine','草本藥丸','💊','medicine',120,['bitter'],{heal:2,desc:'苦苦的，但能讓生病的夥伴快點好起來。'}),
 I('soap','香皂泡泡','🧼','care',40,[],{fx:{hygiene:60},desc:'幫夥伴洗香香。'}),
 I('yarn','毛線球','🧶','toy',100,[],{fx:{fun:30},reuse:1}),
 I('ball','彩色皮球','⚽','toy',120,[],{fx:{fun:34,energy:-6},reuse:1}),
 I('kite','風箏','🪁','toy',160,[],{fx:{fun:40},reuse:1}),
 I('bubble','泡泡棒','🫧','toy',80,[],{fx:{fun:28},reuse:1}),
 I('card','手寫卡片','💌','gift',60,['heart'],{gift:2}),
 I('bouquet','小花束','💐','gift',90,['flower'],{gift:3}),
 I('ribbon','緞帶髮飾','🎀','gift',150,['wear'],{gift:3}),
 I('shellneck','貝殼項鍊','📿','gift',180,['sea'],{gift:4}),
 I('starcharm','星星吊飾','🌟','gift',200,['star'],{gift:4}),
 /* 收藏與素材（探索取得，可賣出） */
 I('shell','扇貝殼','🐚','col',15,['sea'],{sell:15,cod:'beach'}),
 I('starfish','海星','⭐','col',30,['sea'],{sell:30,cod:'beach'}),
 I('seaglass','海玻璃','💎','col',60,['sea'],{sell:60,cod:'beach',rare:1}),
 I('fish1','小鯽魚','🐟','fish',20,['fish'],{sell:25,cod:'fish'}),
 I('fish2','熱帶魚','🐠','fish',50,['fish'],{sell:55,cod:'fish'}),
 I('fish3','河豚','🐡','fish',90,['fish'],{sell:90,cod:'fish',rare:1}),
 I('fish4','小章魚','🐙','fish',140,['fish'],{sell:140,cod:'fish',rare:2}),
 I('bug1','紋白蝶','🦋','bug',25,[],{sell:25,cod:'bug'}),
 I('bug2','瓢蟲','🐞','bug',35,[],{sell:35,cod:'bug'}),
 I('bug3','獨角仙','🪲','bug',110,[],{sell:110,cod:'bug',rare:1}),
 I('flower','野花','🌼','col',10,['flower'],{sell:10,cod:'plant'}),
 I('clover','四葉草','🍀','col',80,[],{sell:80,cod:'plant',rare:1}),
 I('acorn','橡實','🌰','col',12,[],{sell:12,cod:'plant'}),
 I('seed','花種子','🌱','seed',25,[],{desc:'種在家門前的花圃，會長出花來。'}),
 /* 家具：放在房子裡，角色會使用 */
 I('f_bed','木頭小床','🛏️','furn',0,[],{furn:'bed'}),I('f_table','圓木餐桌','🍽️','furn',0,[],{furn:'table'}),I('f_sofa','軟綿沙發','🛋️','furn',380,[],{furn:'sofa'}),
 I('f_shelf','書櫃','📚','furn',320,[],{furn:'shelf'}),I('f_lamp','立燈','💡','furn',160,[],{furn:'lamp'}),I('f_plant','觀葉植物','🪴','furn',120,[],{furn:'plant'}),
 I('f_kitchen','小廚房','🍳','furn',0,[],{furn:'kitchen'}),I('f_rug','圓形地毯','🟠','furn',140,[],{furn:'rug'}),I('f_tv','復古收音機','📻','furn',260,[],{furn:'radio'}),I('f_bath','木浴桶','🛁','furn',300,[],{furn:'bath'})];
C.ITEM=Object.fromEntries(C.ITEMS.map(i=>[i.id,i]));
C.CATNAME={food:'食物',drink:'飲料',medicine:'藥品',care:'清潔',toy:'玩具',gift:'禮物',col:'收藏',fish:'魚類',bug:'昆蟲',seed:'種子',furn:'家具'};

/* ---------- 房屋（開場選擇，放在小島家園） ---------- */
C.HOUSES=[
 {id:'cottage',t:'紅瓦石牆小屋',d:'暖紅屋瓦配石砌牆角，煙囪會冒出炊煙。',roof:'#C8664F',roof2:'#A9503F',wall:'#F3E6CF',wall2:'#E2CFAE',trim:'#8A5A44',door:'#7A4E39',stone:'#BDB4A3'},
 {id:'cabin',t:'藍頂原木屋',d:'森林風的圓木小屋，有寬大的前廊。',roof:'#5D88A8',roof2:'#4A6F8C',wall:'#C99B6D',wall2:'#B5865A',trim:'#6E4C33',door:'#5B4030',stone:'#A8A196'},
 {id:'garden',t:'白牆花園屋',d:'圓窗與鵝黃屋頂，門口長滿小花。',roof:'#E8B95A',roof2:'#CF9D45',wall:'#FBF6EC',wall2:'#EADFCB',trim:'#9BB27E',door:'#8DAE7A',stone:'#CFC6B6'}];
/* 房子內的基礎家具（初始就有） */
C.BASE_FURN=[{k:'bed',x:-2.6,z:-1.6},{k:'table',x:1.2,z:.4},{k:'kitchen',x:2.6,z:-2.1},{k:'shelf',x:-.6,z:-2.35},{k:'rug',x:-.4,z:.6},{k:'lamp',x:-3.2,z:.6},{k:'plant',x:3.3,z:1.4},{k:'sofa',x:-1.9,z:1.6}];

/* ---------- 地點 ---------- */
C.LOCS=[
 {id:'home',t:'家園小島',d:'你和夥伴們的家。房子、花圃與營火都在這裡。',ic:'🏡'},
 {id:'house',t:'我的家',d:'小屋裡面：睡覺、吃飯、看書、窩沙發。',ic:'🛋️',inside:1},
 {id:'plaza',t:'中央廣場',d:'噴水池、商店街與咖啡館，大家聚會的地方。',ic:'⛲'},
 {id:'beach',t:'星砂海灘',d:'釣魚、撿貝殼、看夕陽。',ic:'🏖️'},
 {id:'forest',t:'微風森林',d:'採蘑菇、抓昆蟲、在樹蔭下發呆。',ic:'🌲'}];
C.LOC=Object.fromEntries(C.LOCS.map(l=>[l.id,l]));

/* ---------- 對話素材（離線也有豐富內容） ---------- */
C.LINES={
 greet:['嗨！','早安～','你來啦！','哈囉哈囉','嘿！'],
 chatTopic:{weather:{sunny:['今天天氣真好耶。','陽光暖暖的，好想曬肚子。'],rain:['雨聲好好聽喔。','下雨天最適合窩著了。'],cloudy:['雲好多，像棉花糖。'],snow:['下雪了！好冷好美。'],storm:['外面風好大…有點可怕。']},
  time:{morning:['早上的空氣最清新了。','今天要做什麼呢？'],noon:['肚子有點餓了。','中午想吃什麼？'],evening:['夕陽好漂亮。','今天過得好快。'],night:['星星出來了。','好睏喔…']},
  place:{home:['家裡最舒服了。','花圃的花開了嗎？'],house:['這個沙發好軟。','房間要不要換個擺設？'],plaza:['噴水池的聲音好療癒。','商店今天有什麼新東西？'],beach:['海浪一直拍過來耶。','要不要一起撿貝殼？'],forest:['森林好安靜。','這裡好像有蘑菇喔。']}},
 joke:['你知道為什麼貓咪不玩撲克嗎？因為太多獵豹（cheetah）！','我剛剛差點被自己的尾巴絆倒。','如果我變成一朵雲，你要記得抬頭看我喔。'],
 compliment:['你今天看起來特別好看！','跟你在一起好開心。','你好厲害喔！','你的笑容好可愛。'],
 comfort:['沒事的，我在這裡。','累了就靠著我吧。','想哭也沒關係喔。','要不要一起吃點甜的？'],
 argueStart:['你剛剛是不是在笑我？','那是我先看到的！','你怎麼又這樣！','我才沒有那樣說！','你踩到我的尾巴了啦！'],
 argueBack:['明明就是你！','哼，不想理你了。','你才奇怪咧！','我又不是故意的！'],
 apology:['剛剛…對不起。','我說得太過分了，抱歉。','可以原諒我嗎？'],
 forgive:['好啦，原諒你了。','我也有不對的地方。','那…我們和好吧。'],
 refuse:['……我還在生氣。','現在不想說話。','走開啦。'],
 sick:{cold:['哈啾！','鼻子好癢…','頭有點暈暈的。'],tummy:['肚子咕嚕咕嚕好痛…','好像吃壞肚子了。'],tired:['眼睛快睜不開了…','身體好重喔。'],blue:['今天提不起勁…','好想一個人待著。']},
 hungry:['肚子好餓…','有沒有點心呀？'],sleepy:['好睏…','想睡覺了…'],bored:['好無聊喔～','有沒有好玩的事？'],lonely:['大家去哪了…','好想找人聊天。'],dirty:['身上黏黏的…想洗澡。'],
 eat:{2:['這個超好吃！我最愛了！','哇——幸福的味道！'],1:['好吃！謝謝你～','嗯嗯，很不錯！'],0:['謝謝，填飽肚子了。','嗯，還可以。'],'-1':['這個…我不太喜歡。','嗚，勉強吃完了。'],'-2':['噁…這個我真的不行！','為什麼要給我這個…']},
 gift:['送我的嗎？好開心！','謝謝你！我會好好珍惜。','哇，好漂亮！'],
 sleepTalk:['嗯…再一塊蛋糕…','呼嚕…','（夢到在飛）'],
 wake:['唔…早安。','睡得好飽～','咦？天亮了？']};
OC.Content=C;
})(window.OC);
