(function(root){
'use strict';
const Story=typeof module!=='undefined'?require('./story.js'):root.ArcStory;
const text=(ja,en)=>Object.freeze({ja,en}),pick=(value,language)=>value[language==='en'?'en':'ja'];
const introduction={
 title:text('最初の便り','The first letter'),
 lines:[text('大分断で途切れた道に、古い便りが流れ着いた。','An old letter washes ashore beside a road broken by the Great Divide.'),text('「道が開いたら、また会おう。」10機は、次の集落へ向かう。','“When the road opens, let us meet again.” Ten machines set out for the next settlement.')]
};
const acts=[
 {id:1,start:1,title:text('道はまだある','There is still a road'),body:text('閉じた道の向こうにも、誰かの仕事と暮らしが続いている。まずは、一通を隣へ届けよう。','Work and everyday life continue beyond the closed road. Start by carrying one letter to a neighbour.')},
 {id:2,start:21,title:text('見えていないもの','Beyond what we can see'),body:text('見えないことと、そこに何もないことは違う。返事のない場所へ、こちらから声を届ける。','Not seeing something does not mean it is absent. Send a voice toward the places that have not answered.')},
 {id:3,start:41,title:text('力の使い道','What strength is for'),body:text('道を開く力は、何かを残すためにも使える。進む前に、支えているものを確かめよう。','The strength to open a road can also preserve something. Before moving forward, look at what holds the way together.')},
 {id:4,start:61,title:text('任せるということ','Learning to share the load'),body:text('一機で全部を運ばなくていい。先へ行く者と、後ろを支える者が、同じ道をつくっている。','No single machine needs to carry everything. Those who lead and those who support the rear are building the same road.')},
 {id:5,start:81,title:text('これからの道','The road ahead'),body:text('危険を隠さず、選べる道を残す。旅の終わりに引く一本は、次の誰かの始まりになる。','Leave routes people can choose, with their risks visible. The line drawn at this journey’s end will begin someone else’s.')}
];
const chapterRows=[
 [1,'gun','入江から、最初の便り','A letter from the shore','漂着した便りを隣へ届ける。帰りを待つ者たちの声が、旅の始まりになる。','Carry the stranded letter to the next settlement. The voices waiting for a return become the start of the journey.','止めて守るか、動かして守るか。','Do we protect by stopping, or by moving?','便りを受け取る者がいる。それだけで、次へ向かう理由になった。','There is someone ready to receive the letter. That is reason enough to keep going.'],
 [2,'ban','門の向こうの仕事','Work beyond the gate','進む先だけでなく、帰る者の通り道も確かめる。','Check the way home as carefully as the way forward.','壊したあと、誰が通れるか。','After we clear the way, who can use it?','振り返れば、後ろにも道が続いていた。','Looking back, the road continues behind us too.'],
 [3,'hibari','霧の向こうの返事','An answer beyond the mist','長く返事のない呼出しをたどる。聞き取れない場所にも、事情がある。','Follow a call that has gone unanswered. Places we cannot hear have stories of their own.','聞こえない相手を、敵と決めてよいか。','Can silence tell us who an opponent is?','空白は、確かめに行ける場所になった。','The blank on the map is now a place we can go and ask.'],
 [4,'hana','色の違う道標','Signposts of different colours','違う色で描かれた旅の跡を読む。一つの色だけが正解ではない。','Read the traces left by travellers in different colours. No single colour tells the whole truth.','一つの正しい色で、全てを測れるか。','Can one correct colour measure everything?','次に来る誰かの色も、ここへ残していこう。','Leave room here for the next traveller’s colour.'],
 [5,'mogu','残すために掘る','Digging to preserve','新しい道と、古い仕事を支えるもの。その両方を図面に残す。','Draw both the new road and the supports that keep old work going.','近道を開く力で、何を支えるか。','What should the strength to make a shortcut support?','掘らない線も、大切な仕事の跡になった。','The lines left undug have become marks of careful work too.'],
 [6,'rin','不確かな風へ','Into uncertain winds','確かなことと、まだ分からないことを分けて伝える。答えを待つ間にも、できることはある。','Share what is known and what remains uncertain. There is work to do while an answer is still forming.','確実になるまで、黙って待つべきか。','Must we stay silent until we are certain?','不確かさを伝えれば、仲間と次の一手を選べる。','Sharing uncertainty lets us choose the next step together.'],
 [7,'koro','みんなで到着','Everyone arrives','速い一機だけでなく、後続の車列まで届く道を選ぶ。','Choose a route for the whole convoy, not only its fastest machine.','最も速い一機だけが着けばよいか。','Is the fastest machine arriving enough?','今日の記録は最短時間より、全車到着。','Today’s record is every vehicle arriving, not the shortest time.'],
 [8,'yui','つなぐ手、離す手','Holding on, letting go','助けを求める声をつなぎ直す。手を離すことも、支え方の一つ。','Reconnect the voices asking for help. Letting go can be another way to support someone.','一機で抱えることが、助けることか。','Does helping mean carrying everything alone?','必要なときに頼り合い、それぞれの場所へ進める。','We can ask for help when needed and still move toward our own places.'],
 [9,'sora','空へ送る帰り道','Sending a way home into the sky','遠くを見上げながら、自分の足元からできる仕事を探す。','Look toward the distance and find the work that begins beneath your own wheels.','遠い場所を目指す者だけが、道をつくるのか。','Are roads built only by those who travel far?','届く場所から送った合図も、誰かの帰り道になる。','A signal sent from where we stand can become someone else’s way home.'],
 [10,'rico','また、道をつくる','Building the road again','近道も、確かな主道も地図へ残す。次の旅人が、自分で選べるように。','Put both the shortcut and the reliable main road on the map, so the next traveller can choose.','危険を消すか、知った上で選べるようにするか。','Do we hide risk, or help people choose with it in view?','道は、またつくれる。','We can build the road again.']
];
const chapters=chapterRows.map(([id,character,title,enTitle,opening,enOpening,question,enQuestion,reflection,enReflection])=>Object.freeze({id,character,start:(id-1)*10+1,end:id*10,title:text(title,enTitle),opening:text(opening,enOpening),question:text(question,enQuestion),reflection:text(reflection,enReflection)}));
const machineRows=[
 ['gun','ガン','GUN',1,
  '港の作業路を直し、荷物が行き交う音を取り戻したい。','Gun wants to repair the port’s work roads and hear cargo moving again.',
  '大分断の夜、崩れる防波堤を装甲で支えた。以来、止めておく方が安全だと考えてきた。','On the night of the Great Divide, Gun braced a failing seawall with its armour. Since then, keeping things still has felt safer.',
  '優しく慎重。確かめ続けるうちに、一歩を踏み出す機会を逃してしまう。','Kind and careful, Gun sometimes checks so long that the chance to move passes.',
  '守るために前へ出る。必要なところへ力を届け、支える重さを仲間と分ける。','Gun moves forward to protect others, directing strength where it is needed and sharing the load.',
  '新しい路線の補修班をつくり、一機で抱え込まない仕事を始める。','Gun starts a road-repair team where no machine has to hold everything up alone.',
  '急がなくていい。ちゃんと、向こうへ行こう。','No need to rush. Let us get there properly.'],
 ['ban','バン','BAN',2,
  '閉ざされた道を開き、自分の力を誰かの役に立てたい。','Ban wants to open closed roads and put its strength to use for someone.',
  '救援の際、障害物と一緒に修理用の足場まで壊してしまった。今も軽口で、その失敗を隠している。','During a rescue, Ban destroyed a repair platform along with an obstruction. Jokes still cover the memory.',
  '明るく頼もしいが、先に通る誰かより目の前の障害へ気持ちが向く。','Bright and dependable, Ban can focus on the obstacle more than the people who must cross afterward.',
  'まず支えを確かめ、力を必要な幅へ絞る。開けたあとに通れるかまで見届ける。','Ban checks the supports first, uses only the force needed, and stays to see whether others can pass.',
  '先陣係から開通確認係へ。出発前に、後ろも通れるかと聞くようになる。','Ban becomes the one who checks the route, asking whether those behind can cross before racing ahead.',
  '道をあけるぞ。今度は、帰り道もな！','I will clear the way. The way back too, this time!'],
 ['hibari','ヒバリ','HIBARI',3,
  '遠くから届く古い呼出信号。その送り主を見つけたい。','Hibari wants to find the sender of an old call arriving from far away.',
  '観測機として無数の音を聞いてきた。返事のない呼出しにも、何度でも応じてきた。','As an observation machine, Hibari has listened to countless sounds and answered calls even when no reply came.',
  '気配りと好奇心が強い。情報を集めれば答えは一つになると思いがち。','Curious and considerate, Hibari sometimes expects enough information to produce one certain answer.',
  '聞くだけでなく、こちらの居場所も伝える。分からないことは空白として残し、確かめに行く。','Hibari shares its own location as well as listening, leaving unknowns marked until they can be checked.',
  '各地の声を結ぶ観測網を始める。聞き取れない場所を、存在しない場所として扱わない。','Hibari builds a listening network that never mistakes an unheard place for an empty one.',
  '聞こえたよ。今度は、こっちから届ける。','I heard you. This time, I will send something back.'],
 ['hana','ハナ','HANA',4,
  '道標を塗り直し、次に来る誰かが迷わない道を残したい。','Hana wants to repaint the signposts so the next traveller will not lose the way.',
  '工房の塗装と検品を担当していた。大分断のあとも、返事のない土地へ花の印を送り続けた。','Hana once painted and inspected workshop machines, then kept sending flower-marked signs to places that never replied.',
  '話し方は柔らかく、仕事には厳しい。見栄えを整えることに気を取られ、事情を聞きそびれる。','Gentle in speech and exacting at work, Hana can polish an appearance before asking what someone needs.',
  '一色へ揃えず、今ここを通る者の色を見る。自分の正解を重ね塗りしない。','Hana looks at the colours of those using the road now, without painting over them with a single answer.',
  '通った機体が一筋ずつ自分の色を足せる、新しい道標をつくる。','Hana makes signposts where every passing machine can add a line of its own colour.',
  'きれいに直そう。あなたの色も、残したまま。','Let us make it right, and keep your colour too.'],
 ['rin','リン','RIN',6,
  '止めてしまった予報の続きを、待つ者たちへ伝えたい。','Rin wants to resume the forecasts that others are still waiting for.',
  '不確かな予報を一度だけ断言し、輸送隊を引き返させた。以来、確実になるまで報告しなくなった。','One uncertain forecast, stated as certain, once turned a convoy back. Rin has waited for certainty ever since.',
  '寡黙で丁寧。失敗を避けようとして、助けられる機会まで逃しがち。','Quiet and precise, Rin can miss a chance to help while trying to avoid another mistake.',
  '分かる範囲と分からない範囲を、両方伝える。仲間と一緒に、次の位置を選ぶ。','Rin shares both what is known and what is not, then chooses the next position with the others.',
  '予報に確度と迂回路を添える。完璧な一言より、次の行動を助ける報告を選ぶ。','Rin adds confidence and alternate routes to every forecast, choosing useful guidance over a perfect declaration.',
  '確かじゃない。でも、通れる道はある。','I am not certain. But there is a way through.'],
 ['mogu','モグ','MOGU',5,
  '進める道と、残すべき支え。その両方を地図へ描き直したい。','Mogu wants to redraw the map with both passable routes and the supports worth preserving.',
  '近道を掘った結果、風の通りを塞いで工房を止めたことがある。','A shortcut Mogu excavated once blocked the ventilation and brought a workshop to a halt.',
  '豪快で几帳面。壁を見ると穴を開けたくなり、掘った距離で仕事を測ってしまう。','Bold and meticulous, Mogu wants to dig through every wall and can measure work only in distance excavated.',
  '先に支えを調べ、小さく必要な場所を開ける。崩さないためにも、力を使う。','Mogu examines the supports first and opens only what is needed, using strength to keep things standing.',
  '図面に「掘らない線」を書く設計士へ。新しい道と古い仕事を両方残す。','Mogu becomes a designer who draws lines not to excavate, preserving old work alongside new roads.',
  'ここは掘る。こっちは、残す。','Dig here. Leave this part standing.'],
 ['koro','コロ','KORO',7,
  '止まった貨物を動かし、待っている荷物を全部届けたい。','Koro wants to move the stranded cargo and deliver every waiting package.',
  '六輪の輸送機として最短記録を誇った。先着した荷物だけでは仕事は終わらないと、今は知っている。','Koro once prized its six-wheeled delivery records. Now it knows the job is not done when only its own cargo arrives.',
  '陽気でせっかち。誰でも通れるかより、速いかで道を選ぶ。','Cheerful and impatient, Koro can choose a road for speed before checking who else can use it.',
  '最短ではなく、後続まで届く道を選ぶ。待つ時間も、運ぶ仕事の一部にする。','Koro chooses the route that brings the convoy through, treating the wait as part of the delivery.',
  '新路線に定期便を走らせる。記録するのは最速ではなく「全車到着」。','Koro starts a regular service, recording every vehicle’s arrival instead of the fastest time.',
  '一番乗りより、みんなで到着だ！','Better than first place: everyone arriving!'],
 ['sora','ソラ','SORA',9,
  '帰ってくる者たちを迎える、遠い灯りをもう一度見たい。','Sora wants to see the distant lights welcoming travellers home again.',
  '自走する着陸誘導機。飛べない自分が、空へ向かう旅に必要なのか迷っていた。','A mobile landing-guide machine, Sora once doubted whether a machine that cannot fly belonged on a journey toward the sky.',
  '想像力があり、少し遠慮がち。遠くの答えを見上げ、足元でしている仕事を小さく見る。','Imaginative and a little reserved, Sora can look so far away that it overlooks the work beneath its wheels.',
  '追いかけるだけでなく、帰る者へ合図を送る。届く場所からでも、誰かを支えられる。','Sora sends a signal home instead of only giving chase, finding a way to support others from where it stands.',
  '車輪が届く場所から誘導灯をつなぎ、空へ帰り道を送る。','Sora links guidance lights from the places its wheels can reach, sending a way home into the sky.',
  '飛べなくても、空へ届くものはある。','Some things can reach the sky without flying.'],
 ['rico','リコ','RICO',10,
  '行き止まりとして消された道を、もう一度地図へ戻したい。','Rico wants to put roads erased as dead ends back onto the map.',
  '一度だけ通れた抜け道を、誰でも通れると案内した。そのときの地図を、今も畳んで持っている。','Rico once recommended a shortcut as safe for everyone after one successful run, and still carries the folded map.',
  '機転が利き、冗談が多い。鮮やかな成功だけを見せ、準備や失敗を隠しがち。','Quick-witted and playful, Rico can show a brilliant success while hiding the preparation and failed attempts.',
  '華やかな近道と一緒に、遅くても確かな主道を示す。危険を隠さず、選ぶ余地を残す。','Rico shows the reliable main route alongside the dazzling shortcut, leaving the risks visible and the choice open.',
  '成功例だけでなく、失敗の原因と迂回路も記す。挑戦を押し付けない案内役になる。','Rico maps the failed attempts and alternate routes too, becoming a guide who never forces a challenge on anyone.',
  '近道もある。でも、こっちならみんな通れる。','There is a shortcut. But this way can take everyone.'],
 ['yui','ユイ','YUI',8,
  '各地をつないだ自分の記録を確かめ、助けを頼めるつながりを戻したい。','Yui wants to understand its old connection records and restore a network where help can be requested.',
  '施設の保全信号を結ぶ整備機だった。全停止を伝えた記憶から、自分が道を閉じたのではと悩んでいる。','Yui once linked maintenance signals between facilities. The memory of relaying an all-stop signal still weighs heavily.',
  '困った相手を手元へ集めがち。助けることと、離さないことの境目に迷う。','Yui gathers those in trouble close, sometimes losing the boundary between helping and holding on.',
  '一機で引き受けず、仕事と判断を分ける。支える手を、必要なときに離せるようにする。','Yui shares work and decisions instead of taking them all on, learning when to release a supporting hand.',
  '工房同士が直接頼り合える網をつくる。必要なときにつなぎ、進むときには手を離す。','Yui builds links where workshops can ask each other directly, connecting when needed and letting go when it is time to move.',
  'つないでおくね。進むときは、離せるように。','I will keep us connected, with room to let go when you move.']
];
const machines=machineRows.map(([id,name,enName,chapter,desire,enDesire,past,enPast,flaw,enFlaw,choice,enChoice,ending,enEnding,line,enLine])=>Object.freeze({id,name:text(name,enName),chapter,desire:text(desire,enDesire),past:text(past,enPast),flaw:text(flaw,enFlaw),choice:text(choice,enChoice),ending:text(ending,enEnding),line:text(line,enLine)}));
const epilogue={title:text('道は、またつくれる。','We can build the road again.'),lines:[text('最初の便りを運び終えても、届くのを待つ声はまだある。10機は新しい路線図へ、一本ずつ線を足していく。','The first letter has been delivered, but other voices are still waiting. One by one, the ten machines add lines to a new route map.'),text('先頭の機体が変わっても、この旅はみんなの仕事だ。次の誰かが、自分の道を選べるように。','Whoever leads, the journey belongs to them all. Let the next traveller choose a road of their own.')]};
const ids=Object.freeze([...Story.guardians.map(g=>'guardian:'+g.stage),...Story.relations.map((r,i)=>'relation:'+i),'introduction',...acts.map(a=>'act:'+a.id),...chapters.flatMap(c=>['chapter:'+c.id+':opening','chapter:'+c.id+':cleared']),...machines.flatMap(m=>['machine:'+m.id+':profile','machine:'+m.id+':choice','machine:'+m.id+':ending']),'epilogue']);
const progress=data=>Math.max(0,Math.min(100,Number.isInteger(data?.cleared)?data.cleared:0));
function availableIds(data){const n=progress(data);return [...Story.guardians.filter(g=>n>=g.stage).map(g=>'guardian:'+g.stage),...Story.relations.map((r,i)=>'relation:'+i),'introduction',...acts.filter(a=>n>=a.start-1).map(a=>'act:'+a.id),...chapters.flatMap(c=>[...(n>=c.start-1?['chapter:'+c.id+':opening']:[]),...(n>=c.end?['chapter:'+c.id+':cleared']:[])]),...machines.flatMap(m=>['machine:'+m.id+':profile',...(n>=m.chapter*10?['machine:'+m.id+':choice']:[]),...(n===100?['machine:'+m.id+':ending']:[])]),...(n===100?['epilogue']:[])];}
function normalize(raw,data={}){return {introSeen:typeof raw?.introSeen==='boolean'?raw.introSeen:progress(data)>0||!!data.chapterRun,readIds:[...new Set((Array.isArray(raw?.readIds)?raw.readIds:[]).filter(id=>availableIds(data).includes(id)))]};}
function markRead(data,list){const journal=normalize(data.journal,data),available=availableIds(data);let changed=false;for(const id of list){if(!available.includes(id))continue;if(id==='introduction'&&!journal.introSeen){journal.introSeen=true;changed=true;}if(journal.readIds.includes(id))continue;journal.readIds.push(id);changed=true;}data.journal=journal;return changed;}
function unread(data,list=availableIds(data)){const read=normalize(data.journal,data).readIds;return list.filter(id=>!read.includes(id)).length;}
function chapterMessage(stage,language='ja'){const c=chapters.find(c=>c.end===stage);return c?pick(c.reflection,language):'';}
const api={story:Story,introduction,acts:Object.freeze(acts),chapters:Object.freeze(chapters),machines:Object.freeze(machines),epilogue,ids,pick,progress,availableIds,normalize,markRead,unread,chapterMessage};
if(typeof module!=='undefined')module.exports=api;else root.ArcJournal=api;
})(globalThis);
