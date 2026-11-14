/* Tavo Fourth Wall: direct native chat history, one window, selectable cast. */
(function () {
  'use strict';
  const root = document.getElementById('fourthwall-chat-root');
  if (!root || root.dataset.ready) return;
  root.dataset.ready = 'true';
  const $ = id => root.querySelector('#'+id);
  const ui = {open:$('fwc-launch'),box:$('fwc-box'),close:$('fwc-close'),actor:$('fwc-actor'),sync:$('fwc-sync'),info:$('fwc-info'),log:$('fwc-log'),form:$('fwc-form'),input:$('fwc-input'),send:$('fwc-send')};
  const STORE = 'fourthwall_direct_v11.json';
  const known = [
    ['德克萨斯','Texas','Cellinia Texas','切利尼娜·德克萨斯'],
    ['拉普兰德','Lappland','Lappland Saluzzo','拉普兰德·萨卢佐'],
    ['能天使','Exusiai','Lemuel','蕾缪乐'],['莫斯提马','Mostima'],
    ['空','Sora'],['可颂','Croissant'],['大帝','Emperor'],['陈','Ch’en','Chen'],['阿米娅','Amiya']
  ];
  const st = {chat:null,cards:[],people:[],selected:'',items:[],memory:[],threads:{},busy:false};
  const clip = (s,n)=>String(s??'').slice(0,n);
  function aliases(name){const low=String(name||'').trim().toLowerCase(); return known.find(a=>a.some(v=>v.toLowerCase()===low)) || [String(name||'')];}
  function normalize(name){return aliases(name)[0].trim();}
  const exclude = /^(?:Raymond|{{user}}|user|you|assistant|system|npc|NAME|TITLE|EPIGRAPH|CHAPTER|角色|人物|名字|姓名|我|玩家)$/i;
  function add(map,name,priority=1){const n=normalize(String(name||'').replace(/[「」“”]/g,'').trim());if(!n||n.length>35||exclude.test(n)||/\d{2}/.test(n))return;const v=map.get(n);if(!v||v.priority<priority)map.set(n,{name:n,priority});}
  function castFromTitle(map,title){const left=String(title||'').split(/[;；(（]/)[0];if(!/[&、，+\/]|\s(?:and|与|和)\s/i.test(left))return;left.split(/\s*&\s*|[、，+\/]|\s+(?:and|与|和)\s+/i).forEach(n=>add(map,n,2));}
  function castFromHeader(map,txt){for(const m of String(txt||'').matchAll(/(?:^|\n)\s*NAME\s*[:：]\s*([^\n<]{2,120})/gim)){m[1].split(/\s*[/、，|;；]\s*|\s+and\s+/i).forEach(n=>add(map,n,1));}}
  function toText(v){return typeof v==='string'?v:typeof v?.content==='string'?v.content:typeof v?.mes==='string'?v.mes:'';}
  // The cleanup regex ONLY transforms excerpts sent to this plugin's own generator;
  // it NEVER edits the main Tavo chat, native regex entries or saved messages.
  function tidy(text){return String(text||'')
    .replace(/<\s*think\b[^>]*>[\s\S]*?<\/\s*think\s*>/gi,'')
    .replace(/<\s*novel_header\b[^>]*>[\s\S]*?<\/\s*novel_header\s*>/gi,'')
    .replace(/<\s*details\b[^>]*>[\s\S]*?<\/\s*details\s*>/gi,'')
    .replace(/<\s*(?:style|script)\b[^>]*>[\s\S]*?<\/\s*(?:style|script)\s*>/gi,'')
    .replace(/:::affection[^\n]*:::/gi,'')
    .replace(/\|\|\|[^\n]*\|\|\|/g,'')
    .replace(/<\/?(?:context|status_format|summary|p|span|div|br)\b[^>]*>/gi,'')
    .replace(/<[^>\n]+>/g,'')
    .replace(/^\s*【(?:PIN|近期动态|伏笔|待办事项)】[\s\S]*$/im,'')
    .replace(/\n{3,}/g,'\n\n').trim();}
  function say(cls,text){const el=document.createElement('div');el.className='fwc-msg '+cls;el.textContent=text;ui.log.appendChild(el);ui.log.scrollTop=ui.log.scrollHeight;}
  function active(){return st.people.find(p=>p.name===st.selected);}
  function render(){ui.log.textContent='';for(const row of (st.threads[st.selected]||[]))say(row.role==='user'?'user':'ai',row.text);if(!ui.log.children.length)say('notice','已进入第四面墙。选择人物后可直接询问她/他对原剧情的看法。');}
  function status(text){ui.info.textContent=text;}
  async function save(){try{await tavo.file.save(STORE,JSON.stringify(st.threads),{scope:'chat',encoding:'utf8'});}catch(e){console.warn('[FourthWall] save',e);}}
  async function load(){try{st.threads=JSON.parse(await tavo.file.load(STORE,{scope:'chat',encoding:'utf8'})||'{}');}catch{st.threads={};}}
  async function ingest(){
    st.chat=await tavo.chat.current();if(!st.chat)throw Error('请先进入一段聊天');
    // Read ACTUAL saved Tavo conversation, not exported files or browser DOM.
    // Assistant messages are generated text from current chat, even for a multi-character card.
    const rows=await tavo.message.find([], {role:'assistant'});
    st.items=(Array.isArray(rows)?rows:[]).filter(r=>r&&!r.hidden).map((r,i)=>({id:r.id,index:i,characterId:r.characterId||null,text:tidy(toText(r))})).filter(r=>r.text);
    st.cards=[];
    for(const c of (st.chat.characters||[])){
      try{st.cards.push(await tavo.character.get(c.id||c)||c);}catch{st.cards.push(c);}
    }
    st.memory=[];
    try{const m=await tavo.memory.current();if(Array.isArray(m?.memories))st.memory.push(...m.memories.filter(x=>typeof x==='string'));}catch(e){console.warn('[FourthWall] memory',e);}
    try{if(tavo.vector?.collection){const col=tavo.vector.collection('_memories');if(await col.info()){const r=await col.list({limit:100});for(const x of r?.items||[])if(typeof x.text==='string')st.memory.push(x.text);}}}catch(e){console.warn('[FourthWall] archived memory',e);}
    st.memory=[...new Set(st.memory)];
    const map=new Map();
    for(const c of st.cards){if(st.cards.length>1)add(map,c.name,4);else castFromTitle(map,c.name);}
    for(const m of st.items.slice(-24))castFromHeader(map,m.text);
    // Headers may have been stripped by tidy; also inspect raw recent messages below.
    const recent=await tavo.message.find([-25,-1],{role:'assistant'}).catch(()=>[]);
    for(const m of recent||[])castFromHeader(map,toText(m));
    // When one non-composite card: offer the single card as fallback.
    if(!map.size&&st.cards[0])add(map,st.cards[0].name,1);
    st.people=[...map.values()].slice(0,18);
    if(!st.people.some(p=>p.name===st.selected))st.selected=st.people[0]?.name||'';
    ui.actor.textContent='';for(const p of st.people){const o=document.createElement('option');o.value=p.name;o.textContent=p.name;ui.actor.appendChild(o);}
    ui.actor.value=st.selected;
    status(`已直接读取 ${st.items.length} 条 AI 回复、${st.memory.length} 条记忆 · ${st.people.length} 位人物`);
  }
  function chooseHistory(query){
    const a=active();if(!a)return [];
    const keys=aliases(a.name).concat([a.name]).filter(Boolean);
    const q=(query||'').match(/[\p{Script=Han}]{2,4}|[A-Za-z]{4,}/gu)||[];
    return st.items.map((m,i)=>{let score=i/st.items.length*2;for(const k of keys)if(m.text.toLowerCase().includes(k.toLowerCase()))score+=5;for(const word of q)if(m.text.includes(word))score+=3;return {...m,score};})
      .sort((x,y)=>y.score-x.score).slice(0,9).sort((x,y)=>x.index-y.index);
  }
  function profile(){const a=active();if(!a)return '';
    return st.cards.map(c=>[c.name,c.description,c.personality,c.scenario,c.firstMes,c.first_mes].filter(Boolean).join('\n')).join('\n').slice(0,13000);
  }
  function makePrompt(message){
    const p=active();const hist=chooseHistory(message);
    const latest=st.items.slice(-2).map(m=>clip(m.text,3500)).join('\n\n');
    const excerpt=hist.map(m=>'【历史 AI 回复 #'+(m.id||m.index)+'】\n'+clip(m.text,2200)).join('\n\n');
    const mem=st.memory.map(x=>clip(x,1600)).join('\n').slice(0,12000);
    const dialog=(st.threads[st.selected]||[]).slice(-12).map(x=>(x.role==='user'?'用户':'角色')+'：'+clip(x.text,1300)).join('\n');
    // Standalone prompt: deliberately ignore the novel-writing preset and its formatting/regex.
    return `【模式：第四面墙直聊。以下是只读的 Tavo 当前聊天资料。】
你现在只扮演「${p.name}」，与现实中的玩家直接对话。你知道自己来自角色扮演故事，能讨论故事里发生的事，但不要声称具有现实世界的自主意识。禁止代替其他角色发言或混用他们的经历。
必须首先依据下列真实聊天资料回答，不可只重复你是谁。你可以回忆资料中已发生的共同经历、关系和当前进度；资料不足就明确说不确定，不得编造“记忆”。你的身份和核心人格以角色卡为准，原本的关系也依然存在。
这里不是小说续写：不要章节、旁白、状态栏、好感度、NOTES、HTML/XML、思维链或 GodOfNovel 格式。只输出角色自然的中文直接对话；可幽默、拒绝、反驳或承认不知道。禁止自动恋爱化、感谢成瘾、占有欲失控。不要代替玩家行动或虚构玩家的心理。
【角色卡与设定】\n${profile()}
【Tavo 长期记忆】\n${mem||'（没有可读的记忆条目）'}
【整个当前聊天中检索的相关 AI 回复】\n${excerpt||'（暂无 AI 回复）'}
【最近主线剧情】\n${latest||'（暂无）'}
【当前人物的会客厅对话】\n${dialog||'（初次会面）'}
【用户此刻直接对 ${p.name} 说】\n${message}
请仅以 ${p.name} 本人的口吻回复，保持连续记忆且只回答现在的问题。`;
  }
  async function send(ev){ev.preventDefault();if(st.busy)return;const content=ui.input.value.trim();if(!content||!active())return;
    st.busy=true;ui.send.disabled=true;ui.input.disabled=true;say('user',content);ui.input.value='';status('正在调用 Tavo 当前模型……');
    const log=st.threads[st.selected]||(st.threads[st.selected]=[]);log.push({role:'user',text:content});
    try{const resp=await tavo.generate(makePrompt(content),{context:false,settings:{maxCompletionTokens:1100}});
      const answer=tidy(resp)||String(resp||'').trim()||'（没有收到回复）';log.push({role:'ai',text:answer});say('ai',answer);await save();status(`直接读取 ${st.items.length} 条主线 AI 回复和 ${st.memory.length} 条记忆`);
    }catch(err){log.pop();say('notice','生成失败：'+(err?.message||err));status('生成失败，可重新发送');}
    finally{st.busy=false;ui.send.disabled=false;ui.input.disabled=false;ui.input.focus();}
  }
  ui.open.onclick=()=>{ui.box.hidden=!ui.box.hidden;if(!ui.box.hidden)ui.input.focus();};ui.close.onclick=()=>ui.box.hidden=true;
  ui.actor.onchange=()=>{st.selected=ui.actor.value;render();};ui.form.addEventListener('submit',send);
  ui.input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();ui.form.requestSubmit();}});
  ui.sync.onclick=async()=>{ui.sync.disabled=true;status('正在读取当前 Tavo 聊天……');try{await ingest();render();}catch(e){status('读取失败：'+e.message);}finally{ui.sync.disabled=false;}};
  (async()=>{try{await load();await ingest();render();}catch(e){status('初始化失败：'+e.message);console.warn('[FourthWall]',e);}})();
})();