/* Fourth Wall dual-mode edition: in-character & backstage partner. */
(function(){
'use strict';
const root=document.getElementById('fourthwall-chat-root');
if(!root || root.dataset.fwReady) return;
root.dataset.fwReady='1';
const $=id=>root.querySelector('#'+id);
const ui={
 launch:$('fw-launch'),panel:$('fw-panel'),close:$('fw-close'),mode:$('fw-mode'),actor:$('fw-actor'),session:$('fw-session'),
 sync:$('fw-sync'),info:$('fw-info'),log:$('fw-log'),form:$('fw-compose'),input:$('fw-input'),send:$('fw-send'),
 newSession:$('fw-new'),rename:$('fw-rename'),removeSession:$('fw-remove-session'),regenerate:$('fw-regenerate'),
 comment:$('fw-comment'),clear:$('fw-clear'),memory:$('fw-memory'),memoryStats:$('fw-memory-stats'),
 memorySave:$('fw-memory-save'),memorySummary:$('fw-memory-summary'),memoryClear:$('fw-memory-clear'),
 promptTop:$('fw-prompt-top'),promptProtocol:$('fw-prompt-protocol'),promptBottom:$('fw-prompt-bottom'),
 promptSave:$('fw-prompt-save'),promptReset:$('fw-prompt-reset'),
 layers:$('fw-layers'),directLayers:$('fw-direct-layers'),autoSummary:$('fw-auto-summary'),
 live:$('fw-live'),liveProb:$('fw-live-prob'),images:$('fw-images'),voice:$('fw-voice'),
 settingsSave:$('fw-settings-save'),export:$('fw-export')
};
const STORE='fourthwall_backstage_v2.json',LEGACY='fourthwall_direct_v11.json';
const DEFAULT_TEMPLATES={
top:'这里是主线故事之外的语C皮下私聊。你与现实玩家曾共同扮演角色、创作剧情。现在脱离小说正文，用社交软件的口吻随意交流。',
protocol:[
'你的交流身份是【负责演绎 {{CHAR_NAME}} 的语C搭档／中之人】，不是故事世界中的 {{CHAR_NAME}} 本人。',
'你与用户是一起写过对手戏的合作伙伴；用户是屏幕外的玩家。{{USER_NAME}} 是玩家在主线故事中扮演的身份，并不等于现实里站在你面前的人。',
'主线中发生的事件只是你们共同写出的剧情：可以拿来讨论、吐槽演技、复盘人物决定，也可以聊剧情外的事情。',
'你可以拥有独立的喜好、看法和表达方式，像平时聊天的网友一样说话，不必模仿 {{CHAR_NAME}} 的台词，但应了解这个角色的设定与自己负责的表演。',
'保持自然的皮下交流氛围：日常打字，轻松、有来有往，有时会调侃剧情或自己的演绎，不要把每句私聊写成小说。',
'不要把主线中某角色的身体位置、受伤、关系、旅行时间直接转为现实玩家的状态；现实时间与剧情时间是两个时钟。',
'历史资料是只读证据，不能凭空捏造自己从未演过的主线经历。多角色卡中的其他人物由其他搭档负责，不要替他们讲话。',
'对话不要自动变成恋爱、控制欲或病娇；也不要机械感谢或奉承。能有自己的判断和不同意见。',
'回复以1—4段自然简短的中文聊天为主；不输出章节、状态栏、NOTES、角色行动旁白、好感度或隐藏推理。',
'输出仅使用 <msg>聊天正文</msg>，允许在其中用简单括号表达聊天语气，但不要添加 <thinking>。'
].join('\n'),
bottom:'请回应现实玩家当前的新消息：{{USER_INPUT}}。只以 {{CHAR_NAME}} 的皮下语C搭档口吻回复，输出单个 <msg>...</msg>。'
};
const DEFAULT_ROLE_TEMPLATES={
 top:'现在进入第四面墙角色直聊。你以角色本人的性格和口吻同屏幕外的玩家交流，主线剧情暂时冻结。',
 protocol:[
 '你现在是故事里的 {{CHAR_NAME}} 本人，不是中之人、作者、旁白或语C搭档。',
 '你知道眼前是剧情外的玩家，而玩家在主线里可能使用 {{USER_NAME}} 这一代入身份。不要把屏幕外的玩家当作一个新闯进故事的人物，也不要假装对方此刻站在你身边。',
 '你可以回忆自己确实经历过的主线事件，并对这些情节发表个人看法、质疑或吐槽。你知道自己的故事来自共同创作，但保持自己独立的性格、语气、关系、兴趣和判断。',
 '本次交流不推进剧情、不会让角色瞬移、改变物品或关系状态；不要编造主线未记载的过往。现实中的聊天间隔与主线时间相互独立。',
 '保持人物原本的表达方式。不要机械感谢、过度恋爱化、表现病态依赖或替其他人物发言。',
 '正常社交聊天即可，不写章节、动作旁白、好感度、NOTES、状态栏，不输出思维链。回复可以是1—4段自然的中文口语。',
 '只输出 <msg>你的回答</msg>，不要夹杂其他标记。'
 ].join('\n'),
 bottom:'你正在直接与故事外的玩家对话。回应玩家说的话：{{USER_INPUT}}。只以 {{CHAR_NAME}} 的本人身份输出一个 <msg>...</msg>。'
};
const DEFAULT_CONFIG={mainLayers:20,directLayers:24,autoSummary:false,live:false,liveProbability:30,images:false,voice:false};
const initial=()=>({schema:3,mode:'backstage',config:{...DEFAULT_CONFIG},templates:{...DEFAULT_TEMPLATES},roleTemplates:{...DEFAULT_ROLE_TEMPLATES},actors:{},selected:''});
const runtime={chat:null,cards:[],main:[],nativeMemory:[],people:[],data:initial(),busy:false,runId:0,seenMain:'',poll:null};
const now=()=>Date.now();
const clip=(v,n)=>String(v==null?'':v).slice(0,n);
const txt=x=>typeof x==='string'?x:typeof x?.content==='string'?x.content:typeof x?.mes==='string'?x.mes:typeof x?.text==='string'?x.text:'';
const getId=x=>typeof x==='object' && x!==null?x.id:x;
function status(s){ui.info.textContent=String(s||'');}
function safeName(n){return String(n||'').replace(/[「」“”【】]/g,'').trim();}
function cleanMain(value){
return String(value||'')
 .replace(/<\s*(?:think|thinking)\b[^>]*>[\s\S]*?<\/\s*(?:think|thinking)\s*>/gi,'')
 .replace(/<\s*(?:novel_header|details|style|script)\b[^>]*>[\s\S]*?<\/\s*(?:novel_header|details|style|script)\s*>/gi,'')
 .replace(/:::affection[^\n]*:::/gi,'')
 .replace(/\|\|\|[^\n]*\|\|\|/g,'')
 .replace(/<\s*\/?\s*(?:context|status_format|p|span|summary|div)\b[^>]*>/gi,'')
 .replace(/^\s*【(?:PIN|近期动态|伏笔|待办事项)】[\s\S]*$/im,'')
 .replace(/\n{3,}/g,'\n\n').trim();
}
function cleanReply(value){
const raw=String(value||'').replace(/<\s*(?:think|thinking)\b[^>]*>[\s\S]*?<\/\s*(?:think|thinking)\s*>/gi,'').trim();
const match=raw.match(/<msg\b[^>]*>([\s\S]*?)<\/msg\s*>/i);
return (match?match[1]:raw).replace(/<\/?(?:msg|meta_protocol)\b[^>]*>/gi,'').trim();
}
function time(ts){
const d=new Date(Number(ts)||now());const pad=n=>String(n).padStart(2,'0');
return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+' '+pad(d.getHours())+':'+pad(d.getMinutes());
}
function gap(ms){if(ms<=0)return '0分钟';const m=Math.floor(ms/60000);if(m<60)return m+'分钟';if(m<1440)return Math.floor(m/60)+'小时'+(m%60)+'分钟';return Math.floor(m/1440)+'天'+(Math.floor(m%1440/60))+'小时';}
function formatMeta(history){
let lastAi=0;return history.map(x=>{
let prefix='['+time(x.ts)+(x.role==='user'&&lastAi?'｜距上次回复'+gap(x.ts-lastAi):'')+']';
if(x.role==='ai')lastAi=x.ts;
return prefix+(x.role==='user'?'对方(你)':'自己(我)')+':\n'+clip(x.content,2400);
}).join('\n\n');
}
function currentMode(){return runtime.data.mode==='role'?'role':'backstage';}
function modeLabel(){return currentMode()==='role'?'角色本人':'皮下搭档';}
function templates(){return currentMode()==='role'?runtime.data.roleTemplates:runtime.data.templates;}
function applyModeUI(){
 ui.mode.value=currentMode();
 ui.input.placeholder=currentMode()==='role'?'直接对选中角色说话……':'对扮演选中人物的语C搭档说话……';
 const small=root.querySelector('.fw-title small');
 if(small)small.textContent=currentMode()==='role'?'角色本人 · 故事外直聊':'皮下语C · 独立会客厅';
}
function ensureActor(name){
const key=currentMode()==='role'?'role::'+name:name;
if(!runtime.data.actors[key])runtime.data.actors[key]={active:'default',sessions:[{id:'default',name:'默认记录',history:[],memory:'',archivedCount:0}]};
return runtime.data.actors[key];
}
function actorName(){return runtime.data.selected||runtime.people[0]||'';}
function actor(){return ensureActor(actorName());}
function session(){const a=actor();return a.sessions.find(s=>s.id===a.active)||a.sessions[0];}
function switchView(page){
root.querySelectorAll('.fw-view').forEach(e=>e.hidden=e.dataset.page!==page);
root.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.view===page)));
if(page==='memory')renderMemory();if(page==='prompt')renderPrompt();if(page==='settings')renderSettings();
}
function redrawActors(){
const before=ui.actor.value;ui.actor.textContent='';
for(const name of runtime.people){const option=document.createElement('option');option.value=name;option.textContent=name;ui.actor.append(option);}
if(!runtime.data.selected||!runtime.people.includes(runtime.data.selected))runtime.data.selected=runtime.people[0]||'';
ui.actor.value=runtime.data.selected||before;
redrawSessions();
}
function redrawSessions(){
const a=actor();ui.session.textContent='';
a.sessions.forEach(s=>{const o=document.createElement('option');o.value=s.id;o.textContent=s.name;ui.session.append(o);});
if(!a.sessions.some(s=>s.id===a.active))a.active=a.sessions[0].id;
ui.session.value=a.active;render();
}
function notice(message){const el=document.createElement('div');el.className='fw-bubble notice';el.textContent=message;ui.log.append(el);ui.log.scrollTop=ui.log.scrollHeight;}
function render(){
ui.log.textContent='';
const s=session();
for(let i=0;i<s.history.length;i++){
const m=s.history[i];const wrap=document.createElement('article');wrap.className='fw-bubble '+(m.role==='user'?'user':'ai');
const info=document.createElement('div');info.className='fw-meta';
const label=document.createElement('span');label.textContent=(m.role==='user'?'我':actorName()+' · '+modeLabel())+'  '+time(m.ts);
const tools=document.createElement('div');tools.className='fw-meta-buttons';
const edit=document.createElement('button');edit.type='button';edit.title='编辑';edit.textContent='✎';
edit.onclick=()=>editMessage(i);
const del=document.createElement('button');del.type='button';del.title='删除';del.textContent='×';
del.onclick=()=>deleteMessage(i);
tools.append(edit,del);info.append(label,tools);wrap.append(info);
const body=document.createElement('div');body.textContent=m.content;wrap.append(body);
if(Array.isArray(m.images)){for(const url of m.images){const img=document.createElement('img');img.src=url;img.style.cssText='display:block;max-width:100%;margin-top:8px;border-radius:9px;cursor:pointer';img.onclick=()=>{try{tavo.utils.preview(img);}catch{}};wrap.append(img);}}
if(m.role==='ai'&&runtime.data.config.images){
 const match=m.content.match(/\[img:\s*([^\]\n]{5,300})\]/i);
 if(match){const btn=document.createElement('button');btn.type='button';btn.className='fw-small';btn.style.marginTop='7px';btn.textContent='生成这张模拟图片';btn.onclick=()=>generatePicture(i,match[1]);wrap.append(btn);}
}
if(m.role==='ai'&&runtime.data.config.voice){
 const match=m.content.match(/\[voice:\s*([^:\]\n]{0,25}):([^\]\n]+)\]/i);
 if(match){const btn=document.createElement('button');btn.type='button';btn.className='fw-small';btn.style.marginTop='7px';btn.textContent='播放语音';btn.onclick=()=>playVoice(match[2]);wrap.append(btn);}
}
ui.log.append(wrap);
}
if(!s.history.length)notice(currentMode()==='role'?'现在可以直接和角色本人交流。主线故事不会因此改变。':'这里是皮下私聊。我们可以讨论共同写过的剧情，也能随便聊些剧情之外的事。');
ui.log.scrollTop=ui.log.scrollHeight;
ui.regenerate.disabled=runtime.busy||!s.history.some(x=>x.role==='user');
}
async function save(){
await tavo.file.save(STORE,JSON.stringify(runtime.data),{scope:'chat',encoding:'utf8'});
}
async function load(){
const raw=await tavo.file.load(STORE,{scope:'chat',encoding:'utf8'}).catch(()=>null);
if(raw){try{const parsed=JSON.parse(raw);if((parsed?.schema===2||parsed?.schema===3)&&parsed.actors){
 runtime.data={...initial(),...parsed,schema:3,mode:parsed.mode==='role'?'role':'backstage',config:{...DEFAULT_CONFIG,...parsed.config},templates:{...DEFAULT_TEMPLATES,...parsed.templates},roleTemplates:{...DEFAULT_ROLE_TEMPLATES,...parsed.roleTemplates}};
 return;
}}catch(e){console.warn('[FourthWall] saved state invalid',e);}}
const legacy=await tavo.file.load(LEGACY,{scope:'chat',encoding:'utf8'}).catch(()=>null);
if(legacy){try{const old=JSON.parse(legacy);runtime.data=initial();for(const [name,history] of Object.entries(old)){
if(!Array.isArray(history))continue;const a=ensureActor(name);
a.sessions[0].history=history.map(m=>({role:m.role==='user'?'user':'ai',content:txt(m)||String(m.text||''),ts:Number(m.ts)||now()})).filter(m=>m.content);
}
await save();}catch(e){console.warn('[FourthWall] legacy import',e);}}
}
function addPerson(map,candidate,weight=1){
const name=safeName(candidate);const persona=String(runtime.chat?.persona?.name||'').trim();
if(!name||name.length>35||/[<>]/.test(name)||/^(?:user|you|assistant|system|npc|NAME|TITLE|CHAPTER|EPIGRAPH|{{user}}|玩家|我)$/i.test(name)||persona.toLowerCase()===name.toLowerCase())return;
const prev=map.get(name);if(!prev||weight>prev)map.set(name,weight);
}
function fromTitle(map,title){
const head=String(title||'').split(/[;；(（]/)[0].trim();
const parts=head.split(/\s*(?:&|＆|\+|\/|、|，|\band\b|与|和)\s*/i).filter(Boolean);
if(parts.length>1&&parts.length<9)parts.forEach(n=>addPerson(map,n,4));else if(head&&head.length<30)addPerson(map,head,1);
}
function fromHeaders(map,s){
for(const m of String(s||'').matchAll(/(?:^|\n)\s*NAME\s*[:：]\s*([^\n<]{2,140})/gim)){
m[1].split(/\s*[/、，|;；]\s*|\s+and\s+/i).forEach(n=>addPerson(map,n,2));}
}
function distinctActors(){
const map=new Map(),cards=runtime.cards;
for(const c of cards){if(cards.length>1)addPerson(map,c.name,5);else fromTitle(map,c.name);}
// When multiple named protagonists are already known from the card, do not treat a chapter's user-avatar name as a new speaking role.
if(map.size<2){
  for(const m of runtime.main.slice(-80)){if(m.role==='assistant')fromHeaders(map,m.raw);}
  // Generic card titles are not speaking characters when multiple explicit chapter NAME entries exist.
  if([...map.values()].filter(w=>w>=2).length>=2){for(const [name,weight] of map)if(weight===1)map.delete(name);}
}
if(!map.size&&cards[0])addPerson(map,cards[0].name,1);
runtime.people=[...map.entries()].sort((a,b)=>b[1]-a[1]).map(x=>x[0]).slice(0,24);
if(runtime.data.selected&&!runtime.people.includes(runtime.data.selected))runtime.people.unshift(runtime.data.selected);
}
function mainKey(m){return String(m?.id??'')+'|'+String(m?.content||'').slice(-120);}
async function ingest(){
runtime.chat=await tavo.chat.current();if(!runtime.chat)throw Error('请先打开一个 Tavo 聊天');
const raw=await tavo.message.find([]);
runtime.main=(Array.isArray(raw)?raw:[]).filter(m=>m&&!m.hidden&&(m.role==='assistant'||m.role==='user')).map((m,i)=>({
role:m.role==='assistant'?'assistant':'user',
raw:txt(m),content:cleanMain(txt(m)),id:m.id??i,ts:Number(m.timestamp||m.createdAt||m.ts||now())
})).filter(m=>m.content);
runtime.cards=[];
for(const item of(runtime.chat.characters||[])){
try{const itemId=getId(item);runtime.cards.push((itemId?await tavo.character.get(itemId):null)||item);}catch{runtime.cards.push(item);}
}
runtime.nativeMemory=[];
try{const memory=await tavo.memory.current();if(Array.isArray(memory?.memories))runtime.nativeMemory.push(...memory.memories.filter(x=>typeof x==='string'));}catch(e){console.warn('[FourthWall] memory read',e);}
distinctActors();redrawActors();
const ai=runtime.main.filter(m=>m.role==='assistant');
runtime.seenMain=ai.length?mainKey(ai[ai.length-1]):'';
status('读取主线 '+runtime.main.length+' 层 · 长期记忆 '+runtime.nativeMemory.length+' 条 · 人物 '+runtime.people.length+' 位');
}
function formatMain(question){
const count=Number(runtime.data.config.mainLayers)||20;
const recent=runtime.main.slice(-count),actor=actorName();
const q=String(question||'').match(/[\p{Script=Han}]{2,5}|[A-Za-z]{4,}/gu)||[];
const ranked=runtime.main.slice(0,-count).map((m,i)=>{
let score=0;
if(m.content.includes(actor))score+=4;
for(const w of q.slice(0,12))if(m.content.includes(w))score+=3;
return {...m,score,i};}).filter(m=>m.score>=3).sort((a,b)=>b.score-a.score).slice(0,4).sort((a,b)=>a.i-b.i);
return [...ranked,...recent].map(m=>(m.role==='user'?'玩家提供的剧情指令':'共同编写的主线AI段落')+' ['+time(m.ts)+']:\n'+clip(m.content,950)).join('\n\n').slice(-14000);
}
function profile(){
const name=actorName();
const candidates=runtime.cards.filter(c=>String(c.name||'').includes(name));
const source=(candidates.length?candidates:runtime.cards).map(c=>[c.name,c.description,c.personality,c.scenario,c.firstMes,c.first_mes].filter(Boolean).join('\n')).join('\n');
return clip(source,7000);
}
function fill(template,input){
const persona=String(runtime.chat?.persona?.name||'主线玩家化身');
return String(template||'').replace(/{{CHAR_NAME}}/g,actorName()).replace(/{{USER_NAME}}/g,persona).replace(/{{USER_INPUT}}/g,input);
}
function promptFor(input,kind){
const s=session(),c=runtime.data.config,entries=s.history.slice(Math.max(s.archivedCount,s.history.length-c.directLayers));
const meta=formatMeta(entries),name=actorName(),role=currentMode()==='role',template=templates();
const tailInput=kind==='commentary'?
 (role?'请以人物本人的性格简短评论最近一段主线经历，不要推进剧情。':'请用语C搭档身份对最近主线表演即兴吐槽一句。'):input;
const extras=[];
if(c.images)extras.push('如想发模拟照片，可用 [img: 1girl, smile]，仅玩家点击生图按钮后实际调用生图 API。');
if(c.voice)extras.push('语音可写 [voice:happy:内容]，仅玩家点击播放时调用 TTS。');
const framing=role?
[
 '【模式：角色本人直聊｜第四面墙】',
 '你只能以「'+name+'」本人进行对话，不是配音者、作者、中之人或语C搭档。你知道当前正面对屏幕外的玩家，而不是主线故事里的人物。',
 '当前主线已暂停；你可以讨论或评价自己的经历，但不能宣称这些剧情真的发生在现实玩家身上。保留角色卡确定的人格、世界观、关系及已发生的情节。',
 '故事里 {{user}} 对应玩家的代入身份；不要把对话中的“你”理解为一个凭空进入场景的新角色。绝不替现实玩家决定行动。',
 '不要机械表达爱情或感谢。不要为制造情绪而OOC，不要越过已知记忆捏造事情。只输出一个 <msg>...</msg>，不要旁白、思维链或小说格式。'
]:[
 '【模式：皮下语C搭档｜第四面墙】',
 '你扮演负责演绎「'+name+'」的幕后语C搭档，而不是故事里「'+name+'」本人。你和屏幕外玩家曾一起写过这些剧情。',
 '主线是共同创作的剧本；可以讨论演绎、吐槽剧情、随意闲聊。不要把主线角色的生活经历误称为现实中你或玩家亲身发生的事。',
 '自然使用社交软件口吻，保持自主看法与聊天关系。只输出一个 <msg>...</msg>，不继续小说、不输出思维链。'
];
return [
...framing,
'【附加聊天约定】\n'+fill(template.top,tailInput),
'【身份协议】\n'+fill(template.protocol,tailInput),
'【人物设定资料】\n'+profile(),
'【Tavo 可读长期记忆（主线事实，不等于现实生活）】\n'+clip(runtime.nativeMemory.join('\n'),6000),
'【当前模式独立记忆】\n'+clip(s.memory,6000),
'【已保存主线片段（只读）】\n'+formatMain(input),
'【当前模式独立聊天历史】\n'+(meta||'（首次交流）'),
'【可选媒体协议】\n'+extras.join('\n'),
'【本轮玩家消息】\n'+fill(template.bottom,tailInput)
].join('\n\n');
}
function lock(flag){
runtime.busy=!!flag;
ui.send.disabled=flag;ui.input.disabled=flag;
[ui.mode,ui.actor,ui.session,ui.newSession,ui.rename,ui.removeSession,ui.sync,ui.clear,ui.comment,ui.memorySave,ui.memorySummary,ui.promptSave,ui.settingsSave,ui.regenerate].forEach(el=>{if(el)el.disabled=flag;});
}
async function callGenerator(prompt,maxTokens=1000){
const reply=await tavo.generate(prompt,{context:false,settings:{maxCompletionTokens:maxTokens}});
if(typeof reply!=='string')throw Error('模型没有返回文本');
return cleanReply(reply);
}
async function answer(input,{appendUser=true,commentary=false}={}){
if(runtime.busy||!actorName())return;
const s=session();const selected=actorName(),selectedMode=currentMode();
if(appendUser){s.history.push({role:'user',content:input,ts:now()});await save();}
const run=++runtime.runId;lock(true);status(commentary?'正在生成评价……':currentMode()==='role'?'正在等待角色回复……':'正在等待皮下搭档回复……');render();
try{
const value=await callGenerator(promptFor(input,commentary?'commentary':'normal'),1100);
if(run!==runtime.runId||selected!==actorName()||selectedMode!==currentMode())return;
if(!value)throw Error('生成结果为空');
s.history.push({role:'ai',content:value,ts:now(),type:commentary?'commentary':'normal'});
await save();render();status('已保存'+modeLabel()+'的独立记录');
}catch(e){status('生成失败：'+(e?.message||e));console.warn('[FourthWall] generate',e);}
finally{if(run===runtime.runId){lock(false);render();if(ui.input)ui.input.focus();}}
if(runtime.data.config.autoSummary&&s.history.length-s.archivedCount>46)await summarize(false).catch(e=>console.warn(e));
}
async function send(event){
event?.preventDefault();const input=ui.input.value.trim();
if(!input||runtime.busy||!actorName())return;
ui.input.value='';await answer(input);
}
async function regenerate(){
if(runtime.busy)return;const s=session();
const lastUser=[...s.history].reverse().find(m=>m.role==='user');
if(!lastUser){status('没有可重新回答的用户消息');return;}
while(s.history.length && s.history[s.history.length-1].role==='ai')s.history.pop();
await save();await answer(lastUser.content,{appendUser:false});
}
async function editMessage(i){
if(runtime.busy)return;const s=session(),m=s.history[i];if(!m)return;
if(i<s.archivedCount&&!confirm('这条消息已经归入皮下记忆。修改原文不会自动更新记忆，仍要继续吗？'))return;
const v=prompt('修改私聊内容：',m.content);
if(v===null||!v.trim())return;
m.content=v.trim();await save();render();status('已修改私聊消息');
}
async function deleteMessage(i){
if(runtime.busy)return;const s=session(),m=s.history[i];if(!m)return;
const warning=i<s.archivedCount?'这条消息已经总结进皮下记忆，删除原文不会自动清除记忆。\n':'';
if(!confirm(warning+'确定删除这条私聊消息吗？'))return;
s.history.splice(i,1);if(i<s.archivedCount)s.archivedCount=Math.max(0,s.archivedCount-1);
await save();render();status('已删除私聊消息，未改动主线');
}
async function clearChat(){
if(runtime.busy||!confirm('清空当前人物当前记录的全部私聊消息？默认保留皮下记忆，主线剧情完全不变。'))return;
const s=session();s.history=[];s.archivedCount=0;await save();render();status('已清空当前私聊记录，皮下记忆保留');
}
function renderMemory(){
const s=session();ui.memory.value=s.memory;
ui.memoryStats.textContent='记录 '+s.history.length+' 条消息 · 已归档 '+s.archivedCount+' 条；保存只影响当前人物当前记录。';
}
async function summarize(manual=true){
if(runtime.busy)return;const s=session();
const boundary=Math.max(s.archivedCount,s.history.length-12);
const batch=s.history.slice(s.archivedCount,boundary);
if(batch.length<3){status('没有足够的较早私聊可总结');return;}
lock(true);status('正在整理皮下记忆……');
try{
const p=(currentMode()==='role'?'请把以下角色本人直聊整理成简明的长期记忆，保留本角色明确表达的想法、对玩家的看法、提过的事情与未完成话题；不要修改主线事实或虚构现实生活。':'请将以下语C搭档私聊整理为简明的长期记忆。保留双方真实约定、重要偏好、长期关系、未完成话题和人物演绎习惯；不要把共同创作的虚构剧情当现实事实。')+'请结合旧记忆，输出800至1200汉字以内的中文摘要，不要任何额外解释。\n【旧记忆】\n'+clip(s.memory,5500)+'\n【新增私聊】\n'+formatMeta(batch);
const answer=await callGenerator(p,1800);
if(!answer)throw Error('总结没有返回内容');
s.memory=answer;s.archivedCount=boundary;await save();renderMemory();status('皮下记忆已更新，较早的聊天仍保留在记录中');
}catch(e){status('总结失败：'+(e?.message||e));}
finally{lock(false);}
}
async function manualComment(){
const last=runtime.main.filter(m=>m.role==='assistant').slice(-1)[0];
if(!last){status('当前主线暂无 AI 回复');return;}
await answer((currentMode()==='role'?'以角色本人口吻评价刚才发生的主线剧情。段落：':'对最近这段演绎发表一句私下吐槽。段落：')+clip(last.content,1000),{appendUser:false,commentary:true});
}
function renderPrompt(){
const t=templates();
ui.promptTop.value=t.top;
ui.promptProtocol.value=t.protocol;
ui.promptBottom.value=t.bottom;
}
async function savePrompt(){
const t={top:ui.promptTop.value,protocol:ui.promptProtocol.value,bottom:ui.promptBottom.value};
if(currentMode()==='role')runtime.data.roleTemplates=t;else runtime.data.templates=t;
await save();status(modeLabel()+'提示词已保存（不影响另一模式）');
}
async function resetPrompt(){
if(!confirm('确定恢复当前模式的默认提示词？本模式的自定义提示词将被覆盖。'))return;
if(currentMode()==='role')runtime.data.roleTemplates={...DEFAULT_ROLE_TEMPLATES};else runtime.data.templates={...DEFAULT_TEMPLATES};
await save();renderPrompt();status('已恢复'+modeLabel()+'默认提示词');
}
function renderSettings(){
const c=runtime.data.config;
ui.layers.value=c.mainLayers;ui.directLayers.value=c.directLayers;ui.autoSummary.checked=c.autoSummary;
ui.live.checked=c.live;ui.liveProb.value=c.liveProbability;ui.images.checked=c.images;ui.voice.checked=c.voice;
}
async function saveSettings(){
const c=runtime.data.config;
c.mainLayers=Math.min(200,Math.max(1,Number(ui.layers.value)||20));
c.directLayers=Math.min(100,Math.max(4,Number(ui.directLayers.value)||24));
c.autoSummary=ui.autoSummary.checked;c.live=ui.live.checked;
c.liveProbability=Math.min(100,Math.max(1,Number(ui.liveProb.value)||30));
c.images=ui.images.checked;c.voice=ui.voice.checked;
await save();status('会客厅设置已保存');startPolling();
}
async function generatePicture(index,tags){
if(runtime.busy)return;
const s=session(),m=s.history[index];if(!m)return;
status('正在使用当前生图 API 生成模拟照片……');
try{
const name='fw-img-'+String(now())+'.png';
const url=await tavo.image.generate(tags,{saveAs:name,scope:'chat'});
if(!url)throw Error('生图无返回值');
m.images=Array.isArray(m.images)?m.images:[];m.images.push(url);
await save();render();status('模拟照片已生成');
}catch(e){status('模拟图片失败：'+(e?.message||e));}
}
async function playVoice(value){
const person=runtime.cards.find(c=>String(c.name||'')===actorName());
if(!person?.id){status('未找到当前人物的 TTS 绑定');return;}
try{const worked=await tavo.tts.play(value,{voice:{character:person.id},queue:false,applyPlaybackRules:false});if(!worked)status('此人物尚未绑定可用 TTS');}
catch(e){status('语音失败：'+(e?.message||e));}
}
async function exportCurrent(){
const a=actor(),s=session();
try{await tavo.file.export('fourthwall-'+Date.now()+'.json',JSON.stringify({mode:currentMode(),actor:actorName(),session:s,config:runtime.data.config},null,2));status('已打开分享/保存界面');}
catch(e){status('导出失败：'+(e?.message||e));}
}
function uniqueId(){return 's'+now().toString(36)+'-'+Math.random().toString(36).slice(2,7);}
async function createSession(){
const name=prompt('新记录名称：','新记录');if(!name?.trim())return;
const a=actor(),id=uniqueId();a.sessions.push({id,name:name.trim().slice(0,80),history:[],memory:'',archivedCount:0});a.active=id;await save();redrawSessions();
}
async function renameSession(){
const s=session(),name=prompt('重命名记录：',s.name);if(!name?.trim())return;s.name=name.trim().slice(0,80);await save();redrawSessions();
}
async function removeSession(){
const a=actor(),s=session();
if(a.sessions.length<2){status('至少保留一份会客厅记录，可选择清空消息');return;}
if(!confirm('删除记录“'+s.name+'”及其皮下记忆？不可撤销。'))return;
a.sessions=a.sessions.filter(x=>x.id!==s.id);a.active=a.sessions[0].id;await save();redrawSessions();
}
async function poll(){
if(!runtime.data.config.live||ui.panel.hidden||runtime.busy)return;
try{
const messages=await tavo.message.find([],{role:'assistant'});
const last=messages?.filter(m=>m&&!m.hidden).slice(-1)[0];if(!last)return;
const stamp=String(last.id||'')+'|'+clip(txt(last),120);
if(stamp!==runtime.seenMain&&runtime.seenMain){
runtime.seenMain=stamp;
if(Math.random()*100<runtime.data.config.liveProbability){
await ingest();await manualComment();
}else await ingest();
}
}catch(e){console.warn('[FourthWall] polling',e);}
}
function startPolling(){
if(runtime.poll)clearInterval(runtime.poll);
if(runtime.data.config.live)runtime.poll=setInterval(poll,23000);
}
ui.launch.onclick=()=>{ui.panel.hidden=!ui.panel.hidden;if(!ui.panel.hidden){ui.input.focus();}};
ui.close.onclick=()=>ui.panel.hidden=true;
root.querySelectorAll('[data-view]').forEach(el=>el.onclick=()=>switchView(el.dataset.view));
ui.actor.onchange=async()=>{runtime.data.selected=ui.actor.value;await save();redrawSessions();renderMemory();};
ui.mode.onchange=async()=>{if(runtime.busy)return;runtime.data.mode=ui.mode.value==='role'?'role':'backstage';applyModeUI();await save();redrawSessions();renderMemory();renderPrompt();status('已切换到'+modeLabel()+'模式；聊天记录和记忆分开保存');};
ui.session.onchange=async()=>{actor().active=ui.session.value;await save();render();renderMemory();};
ui.form.addEventListener('submit',send);
ui.input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();ui.form.requestSubmit();}});
ui.sync.onclick=async()=>{if(runtime.busy)return;status('正在同步主线……');try{await ingest();}catch(e){status('同步失败：'+(e?.message||e));}};
ui.newSession.onclick=createSession;ui.rename.onclick=renameSession;ui.removeSession.onclick=removeSession;
ui.regenerate.onclick=regenerate;ui.comment.onclick=manualComment;ui.clear.onclick=clearChat;
ui.memorySave.onclick=async()=>{session().memory=ui.memory.value.trim();await save();renderMemory();status('皮下记忆已保存');};
ui.memorySummary.onclick=()=>summarize(true);
ui.memoryClear.onclick=async()=>{if(!confirm('清空当前记录的皮下记忆？聊天原文保留，但已归档内容将不再有总结。'))return;session().memory='';session().archivedCount=0;await save();renderMemory();status('皮下记忆已清空');};
ui.promptSave.onclick=savePrompt;ui.promptReset.onclick=resetPrompt;
ui.settingsSave.onclick=saveSettings;ui.export.onclick=exportCurrent;
(async()=>{
try{await load();applyModeUI();await ingest();switchView('chat');startPolling();}
catch(e){status('初始化失败：'+(e?.message||e));console.warn('[FourthWall] init',e);}
})();
})();