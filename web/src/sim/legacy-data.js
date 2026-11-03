/* 移植自 3.2：性格滑桿、特質、小怪癖、性格類型與台詞資料（保留原有內容） */
(function(OC){'use strict';
const SLIDERS=[
  {k:'lively',t:'活潑程度',a:'沉穩',b:'活潑',hi:'活力滿滿',lo:'沉穩安靜'},
  {k:'social',t:'外向程度',a:'內向',b:'外向',hi:'外向愛熱鬧',lo:'內向愛獨處'},
  {k:'expr',t:'情緒表達',a:'含蓄',b:'豐富',hi:'情緒外露',lo:'含蓄內斂'},
  {k:'pace',t:'行動速度',a:'慢條斯理',b:'風風火火',hi:'動作俐落',lo:'慢條斯理'},
  {k:'indep',t:'獨立性',a:'愛黏人',b:'很獨立',hi:'獨立自主',lo:'愛黏人'},
  {k:'friendly',t:'友善程度',a:'有點高冷',b:'親切友善',hi:'親切友善',lo:'有點高冷'}];
const TRAITS=[
 {id:'lazy',em:'😴',t:'懶散',d:'愛坐著、動作慢',fx:{lively:-22,pace:-22},w:{sit:1.5,sleep:1.4,dash:.5,bounce:.6},idle:['再躺五分鐘就好…','動一下好累喔。','今天的目標：什麼都不做。'],pet:['嗯…繼續，不要停。']},
 {id:'sleepy',em:'💤',t:'貪睡',d:'很容易打瞌睡',fx:{pace:-8},w:{sleep:2.2,sit:1.3},idle:['呼啊…好睏。','眼睛自己閉起來了…','夢裡有好吃的。'],pet:['嗯嗯…還想睡…']},
 {id:'curious',em:'🔍',t:'好奇',d:'東張西望、愛探索',fx:{lively:8},w:{look:2.4,visit:1.8,stroll:1.3},idle:['那邊是什麼？','咦，那朵雲形狀好特別。','我去看看喔！'],pet:['咦？你的手好暖。']},
 {id:'clingy',em:'🥺',t:'愛撒嬌',d:'黏人、需要陪伴',fx:{indep:-26,expr:14,friendly:8},w:{},idle:['你在哪裡呀～','摸摸我嘛～','不要丟下我一個人喔。'],pet:['再抱一下下～','最喜歡了！不要放開～']},
 {id:'tsun',em:'😤',t:'傲嬌',d:'嘴硬心軟',fx:{friendly:-16,expr:10,indep:16},w:{},idle:['才、才不是在等你。','哼，隨便你啦。','別誤會，我只是剛好經過。'],pet:['只、只能一下喔！','才沒有很舒服！']},
 {id:'shy',em:'🙈',t:'害羞',d:'怕生、容易臉紅',fx:{social:-26,expr:-8},w:{visit:1.6},idle:['那個…你在看我嗎？','我、我在這裡就好。','不要一直盯著我看啦…'],pet:['呀！突、突然碰我…']},
 {id:'hot',em:'🔥',t:'熱血',d:'幹勁十足',fx:{lively:24,pace:16,expr:14},w:{dash:1.6,bounce:1.5},idle:['今天也要全力以赴！','衝啊——！','沒有做不到的事！'],pet:['充滿力量了！！']},
 {id:'gentle',em:'🌸',t:'溫柔',d:'體貼、說話輕輕的',fx:{friendly:20,pace:-8},w:{},idle:['你今天還好嗎？','累了就休息一下吧。','我會一直陪著你。'],pet:['謝謝你，好溫柔的手。']},
 {id:'sharp',em:'🌶️',t:'毒舌',d:'講話直接',fx:{friendly:-12,expr:8,social:6},w:{},idle:['又在發呆？真閒。','別問，問就是不想理你。','我只是實話實說。'],pet:['手拿開…好吧，不用拿開。']},
 {id:'chatty',em:'💬',t:'話癆',d:'停不下來的嘴',fx:{social:16,expr:16},w:{},tk:.5,idle:['欸欸欸，你知道嗎！','我跟你說喔～','對了對了還有一件事！'],pet:['哇～我正好有好多話想說！']},
 {id:'quiet',em:'🤫',t:'沉默寡言',d:'話很少',fx:{social:-12},w:{},tk:2,idle:['……','（安靜地看著遠方）'],pet:['……嗯。']},
 {id:'sporty',em:'🏃',t:'愛運動',d:'精力旺盛',fx:{lively:20,pace:16},w:{dash:1.6,bounce:1.5,hop:1.4},idle:['來比賽跑步吧！','身體要動一動才舒服。','跳跳跳！'],pet:['等我跑完再讓你摸！']},
 {id:'homebody',em:'🏠',t:'宅宅',d:'喜歡待在家',fx:{social:-18,indep:8},w:{visit:1.6,stroll:.7},idle:['外面太吵了，這裡剛好。','今天也不想出門。','待在家最舒適。'],pet:['在家被摸，最幸福。']},
 {id:'dreamer',em:'🌙',t:'夢想家',d:'愛幻想、慢悠悠',fx:{pace:-10,expr:10},w:{look:1.6,sit:1.3},idle:['如果雲是棉花糖就好了。','我昨天夢到會飛。','星星是不是在對我眨眼？'],pet:['像在夢裡一樣溫暖。']},
 {id:'prank',em:'😈',t:'搗蛋',d:'愛惡作劇',fx:{lively:14,friendly:-4},w:{wiggle:1.7,bounce:1.5,dash:1.4},idle:['嘿嘿，我有個壞主意。','偷偷把你的東西藏起來～','被發現了嗎？'],pet:['哈哈！被你抓到了！']},
 {id:'foodie',em:'🍙',t:'貪吃',d:'滿腦子好吃的',fx:{},w:{},idle:['肚子咕嚕咕嚕叫了。','好想吃點心喔。','今天的晚餐吃什麼？'],pet:['摸摸會餓得更快喔。']}
];
const TONES=[{v:'',t:'自然'},{v:'soft',t:'溫柔'},{v:'lively',t:'活潑'},{v:'cold',t:'冷淡'},{v:'formal',t:'正式'}];
const LINE_KINDS=[['idle','待機'],['pet','撫摸'],['wake','睡醒'],['drop','被抱起'],['greet','登場問候'],['call','呼喚']];
const TONE_LINES={
  idle:{lively:[['今天精神好到睡不著！','好想動一動～','我們來跑跑跳跳吧！'],['…慢慢來就好。','今天也安安靜靜的。','再發呆一下下。']],
    social:[['陪我聊聊天嘛～','今天有什麼好玩的事嗎？'],['有點想一個人待著。','這裡的角落最安心。']],
    expr:[['哇！！好開心！','我的心情全寫在臉上了吧？'],['……還好。','沒什麼，只是在想事情。']],
    pace:[['快快快，下一個！','等不及要出發了！'],['不急，慢慢來。','一步一步就好。']],
    indep:[['我自己可以的。','不用擔心我啦。'],['你去哪裡了…？','可以待在我旁邊嗎？']],
    friendly:[['今天也遇見你，真好。','謝謝你一直陪著我。'],['…別靠太近。','哼，有事嗎？']]},
  pet:{friendly:[['好溫暖，最喜歡你了！','謝謝你～'],['…只准一下。','別、別得寸進尺。']],
    expr:[['呀～好癢好癢！','開心到想轉圈圈！'],['……嗯。','（微微瞇起眼睛）']],
    indep:[[],['再多摸一下嘛～','不要停～']],social:[[],['突、突然碰我會害羞啦…']]},
  drop:{expr:[['哇啊啊啊！！','救命啊～'],['……！','（僵住）']]},
  wake:{lively:[[],['…再五分鐘。']]}};
const L29={};
L29.CATS=[['pers','性格'],['soc','社交'],['emo','情緒'],['int','興趣'],['abi','能力'],['hab','生活習慣'],['spc','特殊']];
L29.TRAITS=[
 /* 性格 */
 {id:'introvert',c:'pers',em:'🌙',t:'內向',d:'獨處能充電，人多會累',fx:{social:-20},ai:{chat:.6,read:1.4,daydream:1.3,fish:1.2},nd:{social:.6},x:['extrovert'],idle:['一個人的時間剛剛好。','安靜一點比較自在。']},
 {id:'extrovert',c:'pers',em:'☀️',t:'外向',d:'越熱鬧越有精神',fx:{social:22,expr:8},ai:{chat:1.8,stroll:1.5,campfire:1.5,dance:1.4,read:.7},nd:{social:1.5},x:['introvert','shy','loner'],idle:['有沒有人要一起玩？','大家都在哪裡呀～']},
 {id:'cheerful',c:'pers',em:'🌼',t:'活潑',d:'笑容多、步伐輕快',fx:{lively:18,expr:12},ai:{butterfly:1.4,dance:1.5,tag:1.3},nd:{fun:1.2},idle:['今天也要開開心心！','啦啦啦～']},
 {id:'optimist',c:'pers',em:'🌈',t:'樂觀',d:'總能看到好的一面',fx:{expr:6,friendly:6},ai:{},nd:{},mood:'happy',x:['pessimist'],idle:['明天一定會更好！','下雨也沒關係，可以聽雨聲。']},
 {id:'pessimist',c:'pers',em:'🌧️',t:'悲觀',d:'容易往壞處想',fx:{expr:-6},ai:{daydream:1.3},nd:{},mood:'calm',x:['optimist'],idle:['萬一等一下下雨怎麼辦…','好事應該不會輪到我吧。']},
 {id:'stubborn',c:'pers',em:'🪨',t:'固執',d:'決定的事不輕易改變',fx:{indep:14},ai:{},nd:{},stay:1.6,idle:['我說要這樣就要這樣。','嗯，我還是覺得我是對的。']},
 {id:'carefree',c:'pers',em:'🍃',t:'隨性',d:'想到什麼做什麼',fx:{pace:-6},ai:{wander:1.5,daydream:1.3},nd:{},x:['perfectionist','serious'],idle:['隨便走走好了。','計畫什麼的，晚點再說～']},
 {id:'serious',c:'pers',em:'📏',t:'認真',d:'做事一絲不苟',fx:{expr:-8},ai:{read:1.4,tidy:1.4,garden:1.2},nd:{},x:['carefree','childish'],idle:['做事要有始有終。','我再確認一次。']},
 {id:'childish',c:'pers',em:'🍭',t:'孩子氣',d:'天真愛玩，情緒直接',fx:{lively:12,expr:16},ai:{butterfly:1.6,tag:1.5,dance:1.3},nd:{fun:1.4},x:['serious','mature'],idle:['我也要玩！','嘿嘿，抓不到我～']},
 {id:'mature',c:'pers',em:'🍵',t:'成熟穩重',d:'冷靜可靠的大人感',fx:{lively:-10,expr:-6,friendly:6},ai:{read:1.3,bench:1.3,chat:1.1},nd:{},x:['childish'],idle:['慢慢來，不急。','大家玩得開心就好。']},
 {id:'brave',c:'pers',em:'🦁',t:'勇敢',d:'不怕新事物與黑夜',fx:{indep:10},ai:{explore:1.6,stargaze:1.2},nd:{},x:['timid'],idle:['交給我吧！','黑漆漆的也不怕。']},
 {id:'timid',c:'pers',em:'🐭',t:'膽小',d:'容易被嚇到',fx:{indep:-10,social:-6},ai:{explore:.6,home:1.3,shelter:1.6},nd:{comfort:1.3},x:['brave'],idle:['剛剛那是什麼聲音…','我、我才沒有在發抖。']},
 {id:'perfectionist',c:'pers',em:'💎',t:'完美主義',d:'追求一切都剛剛好',fx:{pace:-6},ai:{tidy:1.8,garden:1.3},nd:{comfort:1.2},x:['carefree','messy'],idle:['這裡歪了一點點…','再調整一下就完美了。']},
 /* 社交 */
 {id:'friendlyhost',c:'soc',em:'🤗',t:'熱情好客',d:'喜歡招呼大家',fx:{friendly:18,social:12},ai:{chat:1.6,campfire:1.6,stroll:1.3},nd:{social:1.3},idle:['大家快來這邊坐！','要不要喝杯茶？']},
 {id:'loner',c:'soc',em:'🐺',t:'獨行俠',d:'習慣一個人行動',fx:{social:-18,indep:20},ai:{chat:.4,explore:1.5,fish:1.4,stroll:.5},nd:{social:.5},x:['clingy','extrovert','friendlyhost'],idle:['一個人走走也不錯。','不用等我。']},
 {id:'caring',c:'soc',em:'🩹',t:'會照顧人',d:'看到別人累了會關心',fx:{friendly:16},ai:{chat:1.4},care:1,nd:{},idle:['大家都還好嗎？','累了要說喔。']},
 {id:'jealous',c:'soc',em:'💚',t:'愛吃醋',d:'看到別人被摸會在意',fx:{expr:10},ai:{},jealous:1,nd:{},idle:['…為什麼只摸牠。','我也要。']},
 {id:'leader',c:'soc',em:'🚩',t:'領袖氣質',d:'喜歡帶頭找大家玩',fx:{social:12,indep:10},ai:{stroll:1.5,tag:1.3,campfire:1.3},lead:1,nd:{},idle:['跟我來！','大家集合～']},
 {id:'polite',c:'soc',em:'🎩',t:'有禮貌',d:'說話客氣、會道謝',fx:{friendly:8},ai:{},nd:{},idle:['謝謝你。','不好意思，打擾了。']},
 /* 情緒 */
 {id:'sensitive',c:'emo',em:'🫧',t:'敏感',d:'情緒起伏比較大，容易被影響',fx:{expr:12},ai:{shelter:1.4,daydream:1.2},nd:{comfort:1.3},emo:1.5,idle:['剛剛那句話是不是在說我…','下雨天心情也濕濕的。']},
 {id:'calm',c:'emo',em:'🧘',t:'冷靜',d:'不太會慌張',fx:{expr:-10,pace:-4},ai:{fish:1.3,read:1.2},nd:{},emo:.6,x:['moody','hot'],idle:['沒什麼好緊張的。','深呼吸。']},
 {id:'moody',c:'emo',em:'🎢',t:'情緒化',d:'心情說變就變',fx:{expr:16},ai:{},nd:{},emo:1.6,x:['calm'],idle:['現在心情超好！…等等又不好了。','哼，不想說話。']},
 {id:'crybaby',c:'emo',em:'😢',t:'愛哭鬼',d:'感動或難過都會掉眼淚',fx:{expr:14},ai:{},nd:{},emo:1.4,idle:['嗚…好感動。','我才沒有哭…']},
 {id:'romantic',c:'emo',em:'💗',t:'浪漫',d:'喜歡夕陽、星星與小驚喜',fx:{expr:8},ai:{sunset:1.8,stargaze:1.6,flowers:1.4},nd:{},idle:['夕陽好美，像在作夢。','要是有流星就好了。']},
 /* 興趣 */
 {id:'nature',c:'int',em:'🌿',t:'喜歡自然',d:'花草樹木最療癒',fx:{},ai:{flowers:1.8,garden:1.7,shade:1.4,explore:1.2,home:.8},nd:{},idle:['聞到青草的味道了。','樹葉的聲音好舒服。']},
 {id:'bookworm',c:'int',em:'📚',t:'熱愛閱讀',d:'有空就想翻書',fx:{lively:-6},ai:{read:2.6},nd:{},idle:['這本書的結局好想知道。','再讀一章就好。']},
 {id:'music',c:'int',em:'🎵',t:'熱愛音樂',d:'走路都在哼歌',fx:{expr:8},ai:{dance:1.8},hum:1,nd:{},idle:['啦～啦啦～','這首歌好好聽。']},
 {id:'artsy',c:'int',em:'🎨',t:'創意豐富',d:'腦中充滿點子',fx:{expr:8},ai:{daydream:1.6,observe:1.4,flowers:1.2},nd:{fun:1.2},idle:['我想到一個點子！','如果把雲畫成魚會怎樣？']},
 {id:'stargazer',c:'int',em:'🔭',t:'星空迷',d:'夜晚最期待看星星',fx:{},ai:{stargaze:2.4,campfire:1.2},nd:{},idle:['今晚會有流星嗎？','那是天鵝座喔。']},
 {id:'sealover',c:'int',em:'🐚',t:'海洋迷',d:'喜歡海浪與碼頭',fx:{},ai:{fish:2.4,sunset:1.3},nd:{},idle:['海浪在跟我說話。','碼頭邊最舒服了。']},
 {id:'gourmet',c:'int',em:'🍳',t:'美食家',d:'對吃很講究',fx:{},ai:{eat:1.6},nd:{hunger:1.2},idle:['今天想吃點特別的。','這個香味…是可可！']},
 {id:'collector',c:'int',em:'💠',t:'收藏家',d:'喜歡撿小東西收藏',fx:{},ai:{explore:1.4,fish:1.2},collect:1,nd:{},idle:['這顆石頭好漂亮，帶回家。','我的收藏又多一件了。']},
 {id:'fashion',c:'int',em:'👗',t:'時尚達人',d:'在意穿搭與外表',fx:{expr:6},ai:{},nd:{},idle:['今天的穿搭還可以吧？','這個顏色跟我很配。']},
 /* 能力 */
 {id:'smart',c:'abi',em:'🧠',t:'聰明',d:'學什麼都快',fx:{},ai:{read:1.5,observe:1.3},nd:{},idle:['原來是這樣運作的！','我算過了，沒問題。']},
 {id:'clumsy',c:'abi',em:'🌀',t:'冒失鬼',d:'常常不小心跌倒',fx:{pace:6},ai:{},clumsy:1,nd:{},idle:['哎呀，又絆到了。','剛剛什麼都沒發生喔！']},
 {id:'athletic',c:'abi',em:'🏅',t:'運動神經好',d:'跑得快、跳得高',fx:{pace:14,lively:10},ai:{tag:1.8,butterfly:1.4},speed:1.15,nd:{fat:.8},x:['lazy']},
 {id:'handy',c:'abi',em:'🔧',t:'手巧',d:'喜歡整理與修東西',fx:{},ai:{tidy:1.6,observe:1.3,furniture:1.3},nd:{},idle:['這個我來修修看。','整理好了！']},
 {id:'cook',c:'abi',em:'🧁',t:'料理高手',d:'喜歡在營火邊做點心',fx:{friendly:4},ai:{eat:1.3,campfire:1.6},nd:{},idle:['我來烤棉花糖給大家！','這次加了一點蜂蜜。']},
 /* 生活習慣 */
 {id:'hardworking',c:'hab',em:'🐝',t:'勤奮',d:'閒不下來，總想做點事',fx:{pace:10},ai:{tidy:1.6,garden:1.6,nap:.6,daydream:.6},nd:{},x:['lazy'],idle:['來做點有用的事吧。','休息？等等再說。']},
 {id:'tidy',c:'hab',em:'🧹',t:'愛乾淨',d:'看到落葉就想掃',fx:{},ai:{tidy:2.6},nd:{},x:['messy'],idle:['地上有落葉…我來掃。','乾乾淨淨心情好。']},
 {id:'messy',c:'hab',em:'🧦',t:'不拘小節',d:'亂一點也沒關係',fx:{},ai:{tidy:.3,wander:1.2},nd:{},x:['tidy','perfectionist'],idle:['亂中有序嘛～','東西放哪了？算了。']},
 {id:'picky',c:'hab',em:'🥄',t:'挑食',d:'對食物很挑剔',fx:{},ai:{eat:.8},picky:1,nd:{},x:['foodie','bigeater'],idle:['這個…我不太想吃。','只吃喜歡的。']},
 {id:'bigeater',c:'hab',em:'🍱',t:'大胃王',d:'吃很多、餓得快',fx:{},ai:{eat:1.8},nd:{hunger:1.6},x:['picky'],idle:['再來一碗！','肚子又在叫了。']},
 {id:'earlybird',c:'hab',em:'🐓',t:'早起',d:'清晨最有精神',fx:{},ai:{},chrono:-1.6,nd:{},x:['nightowl'],idle:['早安！清晨的空氣最棒了。','早起的鳥兒有蟲吃。']},
 {id:'nightowl',c:'hab',em:'🦉',t:'夜貓子',d:'越晚越有精神',fx:{},ai:{stargaze:1.5,campfire:1.3},chrono:1.8,nd:{},x:['earlybird','sleepy'],idle:['夜晚才剛開始呢。','睡覺？還早吧。']},
 {id:'napper',c:'hab',em:'🛌',t:'午睡控',d:'中午一定要睡一下',fx:{},ai:{nap:1.6},nap:1,nd:{},idle:['午餐後最適合睡覺了。']},
 {id:'walker',c:'hab',em:'👣',t:'愛散步',d:'飯後一定要走走',fx:{pace:4},ai:{wander:1.6,stroll:1.4,explore:1.2},nd:{},idle:['去散散步吧。']},
 /* 特殊 */
 {id:'mysterious',c:'spc',em:'🔮',t:'神秘',d:'總說些意味深長的話',fx:{expr:-10},ai:{daydream:1.4,stargaze:1.3},nd:{},idle:['命運的齒輪開始轉動了…','你相信預感嗎？']},
 {id:'lucky',c:'spc',em:'🍀',t:'幸運兒',d:'常常撿到好東西',fx:{},ai:{explore:1.2},lucky:1,nd:{},idle:['今天好像會有好事。','又撿到了耶！']},
 {id:'weather',c:'spc',em:'⛅',t:'天氣通',d:'總能猜中天氣變化',fx:{},ai:{},nd:{},idle:['等一下好像會下雨喔。','明天會是好天氣。']},
 {id:'scaredark',c:'spc',em:'🕯️',t:'怕黑',d:'夜晚喜歡待在有光的地方',fx:{},ai:{campfire:1.8,stargaze:.5,home:1.4,explore:.5},nd:{comfort:1.2},x:['brave'],idle:['火光旁邊比較安心。','天黑了…要點燈嗎？']}
];
/* 性格類型（活力 × 外向，十六型） */
L29.TYPES=[
 ['安靜觀察家','喜歡在角落安靜看著世界，觀察力一流。'],['慢活詩人','步調悠閒，對小事物很有感觸。'],['溫柔陪伴者','話不多但很溫暖，總在身邊陪著大家。'],['慵懶開心果','懶洋洋卻很愛笑，讓人放鬆。'],
 ['細心工匠','專注又仔細，喜歡把事情做好。'],['穩健思考者','冷靜理性，凡事想清楚再行動。'],['可靠好鄰居','親切穩重，大家有事都會找牠。'],['和氣調停者','擅長讓氣氛變好，朋友很多。'],
 ['獨行探險家','精力充沛卻喜歡自己行動，常有新發現。'],['好奇研究員','充滿好奇心，看到新東西就要研究。'],['熱心小幫手','活力滿滿又愛幫忙，是島上的開心來源。'],['人氣交際家','喜歡熱鬧與聊天，總是在人群中心。'],
 ['一匹狼冒險王','動作快、主意多，喜歡挑戰未知。'],['行動派挑戰者','想到就做，停不下來的衝勁。'],['元氣運動員','永遠充滿精神，跑跳是日常。'],['派對超級巨星','越熱鬧越興奮，走到哪都是派對。']];
/* 小怪癖：每個選項都有實際的遊戲參數 */
L29.Q={
 walk:{t:'走路方式',o:[['normal','普通',{sp:1}],['bouncy','蹦蹦跳跳',{sp:1.06}],['shuffle','慢吞吞拖步',{sp:.8}],['strut','抬頭挺胸',{sp:1}],['tiptoe','踮腳小碎步',{sp:1.12}],['sway','搖搖擺擺',{sp:.92}]]},
 stance:{t:'站姿',o:[['normal','普通'],['proud','挺胸'],['shy','縮著身子'],['relaxed','放鬆搖晃'],['restless','靜不下來']]},
 sit:{t:'坐姿',o:[['normal','普通'],['curl','縮成一團'],['sprawl','攤平'],['proper','端正']]},
 sleep:{t:'睡相',o:[['normal','普通'],['curl','捲成一團'],['starfish','大字型'],['toss','翻來覆去'],['snore','會打呼'],['talk','說夢話']]},
 eat:{t:'進食速度',o:[['normal','普通',{d:7}],['slow','細嚼慢嚥',{d:11}],['fast','狼吞虎嚥',{d:4}]]},
 appetite:{t:'食量',o:[['normal','普通',{k:1}],['small','小鳥胃',{k:.7}],['big','大胃王',{k:1.45}]]},
 greet:{t:'打招呼',o:[['wave','揮揮手'],['bow','鞠躬'],['hop','跳起來'],['hug','抱抱'],['nod','點點頭'],['peek','躲著偷看']]},
 volume:{t:'說話音量',o:[['normal','普通'],['soft','輕聲細語'],['loud','大嗓門']]},
 nervous:{t:'緊張時',o:[['fidget','扭來扭去'],['freeze','僵住不動'],['sweat','冒冷汗'],['hide','遮住臉']]},
 happy:{t:'開心時',o:[['hop','跳一跳'],['spin','轉圈圈'],['sparkle','閃閃發亮'],['dance','小舞步'],['blush','臉紅紅']]}
};
L29.HABITS=[['hum','哼歌','走路或發呆時會哼歌'],['skygaze','看天空','常常抬頭看雲'],['stretch','伸懶腰','動不動就伸懶腰'],['selftalk','自言自語','會小聲跟自己說話'],['snack','偷吃點心','發呆時會掏出小點心'],['collect','撿小東西','看到漂亮的小石頭就撿'],['tidyup','順手整理','經過時會把東西擺好'],['nap','隨地打盹','累了就地睡著']];
L29.TRIG=[['morning','早上'],['eat','吃東西後'],['happy','開心時'],['bored','無聊時'],['rain','下雨時'],['night','夜晚'],['meet','遇到朋友'],['idle','發呆時']];
L29.ACTN=[['say','說一句話'],['hum','哼歌'],['spin','轉圈'],['hop','跳一跳'],['sparkle','閃閃發亮'],['stretch','伸懶腰'],['look','東張西望'],['hearts','冒愛心']];
L29.QDEF={walk:'normal',stance:'normal',sit:'normal',sleep:'normal',eat:'normal',appetite:'normal',greet:'wave',volume:'normal',nervous:'fidget',happy:'hop'};
/* 需求 */
L29.NEEDS=[['hunger','飽足','#F4A65B'],['thirst','解渴','#5DB3E0'],['energy','精力','#86BC4E'],['sleep','睡眠','#9585DD'],['fun','娛樂','#E884AE'],['social','社交','#EC7878'],['comfort','舒適','#45B596']];
OC.Legacy={SLIDERS,TRAITS,TONES,TONE_LINES,L29};
})(window.OC);
