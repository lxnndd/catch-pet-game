/* v41 诊断：①v31「只剩 1 个技能不许再卸」为何失败 ②真实 pointer 拖拽手势是否仍能换招（验证 v41 长按不冲突）
   用法：node v41-diag-drop.mjs [url] [cdpPort] */
import { WebSocket } from 'ws';
const URL_BASE = process.argv[2] || 'http://47.105.123.182:8727/';
const CDP_PORT = process.argv[3] || '9335';
let seq = 0;
const c = await (await fetch('http://127.0.0.1:' + CDP_PORT + '/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(c.webSocketDebuggerUrl);
const pend = new Map();
ws.on('message', d => { const m = JSON.parse(String(d)); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); } });
await new Promise((r, j) => { ws.on('open', r); ws.on('error', j); });
const send = (mm, p = {}) => new Promise((res, rej) => { const id = ++seq; pend.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method: mm, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) return { __err: String(r.exceptionDetails.exception?.description || '').slice(0, 400) }; return r.result?.value; };
const wait = ms => new Promise(r => setTimeout(r, ms));
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Page.navigate', { url: URL_BASE + '?t=' + Date.now() });
for (let i = 0; i < 200; i++) { await wait(250); if (await ev("(typeof SPECIES!=='undefined'&&SPECIES.length>1000&&typeof applySkillDrop==='function')")) break; }

console.log('══ ⓪ 新宠技能数 / 卸下能否保持 / 空栏兜底 ══');
const d0 = await ev(`(function(){
  try{
    var out={};
    var p=newPet('pk-025'); ensureMoves(p);
    out.newPetMoves=p.moves.length;                        /* 期望 4（新宠照旧给满） */
    var q=newPet('pk-025'); ensureMoves(q); q.moves=q.moves.slice(0,3);
    ensureMoves(q);
    out.afterUnloadThenEnsure=q.moves.length;              /* 期望 3（不再自动补回第 4 个） */
    var r=newPet('pk-025'); ensureMoves(r); r.moves=[];
    ensureMoves(r);
    out.emptyRefill=r.moves.length;                        /* 期望 1（空栏兜底） */
    var s=newPet('pk-001'); ensureMoves(s); s.moves=['mv_nope'];
    ensureMoves(s);
    out.badIdOnly=s.moves.length;                          /* 期望 1（坏 id 被剔除后兜底） */
    return out;
  }catch(e){ return {__err:String(e.message)}; }
})()`);
console.log(JSON.stringify(d0));

console.log('\n══ ① 「只剩 1 个技能不许再卸」逐步诊断 ══');
const d1 = await ev(`(function(){
  try{
    localStorage.removeItem(SAVE_KEY); S=freshSave();
    var p=newPet('pk-025'); p.lv=50; p.hp=maxHpOf(p); ensureMoves(p);
    S.party=[p]; S.lead=p.uid; S.pos={x:SPAWN.x,y:SPAWN.y}; enterWorld();
    openSkillEditor(p);
    var steps=[];
    steps.push({t:'初始', len:p.moves.length, moves:p.moves.slice()});
    while(p.moves.length>1){ p.moves.pop(); }
    syncPP(p);
    var oneLen=p.moves.length, oneId=p.moves[0];
    steps.push({t:'削减到 1 个后', len:oneLen, moves:p.moves.slice(), oneId:oneId});
    var r;
    try { r=applySkillDrop(learnDlg,'cur',oneId,'pool',null); } catch(e){ r='EX '+e.message; }
    steps.push({t:'尝试卸下后', len:p.moves.length, moves:p.moves.slice(), ret:String(r)});
    return {steps:steps, dlgExists:!!learnDlg, oneLen:oneLen, afterLen:p.moves.length};
  }catch(e){ return {__err:String(e.message)}; }
})()`);
console.log(JSON.stringify(d1, null, 1));

console.log('\n══ ② 真实 pointer 拖拽手势（长按绑定是否干扰换招）══');
const d2 = await ev(`(function(){
  try{
    localStorage.removeItem(SAVE_KEY); S=freshSave();
    var p=newPet('pk-025'); p.lv=50; p.hp=maxHpOf(p); ensureMoves(p);
    S.party=[p]; S.lead=p.uid; S.pos={x:SPAWN.x,y:SPAWN.y}; enterWorld();
    openSkillEditor(p);
    var pool=document.querySelectorAll('#learn-pool .learn-card[data-skill]');
    var cur=document.querySelectorAll('#learn-cur .learn-card[data-skill]');
    if(!pool.length||!cur.length) return {__err:'找不到卡片'};
    var src=pool[0], dst=cur[0];
    var srcId=src.getAttribute('data-skill'), dstId=dst.getAttribute('data-skill');
    var before=p.moves.slice();
    function pe(el,type,x,y){
      el.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,clientX:x,clientY:y,pointerId:1,pointerType:'touch',isPrimary:true,button:0,buttons:type==='pointerup'?0:1}));
    }
    var a=src.getBoundingClientRect(), b=dst.getBoundingClientRect();
    var ax=a.left+a.width/2, ay=a.top+a.height/2, bx=b.left+b.width/2, by=b.top+b.height/2;
    pe(src,'pointerdown',ax,ay);
    pe(src,'pointermove',ax+6,ay);          /* 6px：还不到拖动阈值(8) */
    pe(src,'pointermove',ax+20,ay+10);      /* 超过阈值 → 进入拖动 */
    pe(src,'pointermove',bx,by);
    pe(document,'pointermove',bx,by);
    pe(src,'pointerup',bx,by);
    var ghost=document.querySelectorAll('.dragging-ghost').length;
    var moved=p.moves.indexOf(srcId)>=0;
    return {before:before, after:p.moves.slice(), srcId:srcId, dstId:dstId,
            movedInto: moved, ghostLeft:ghost, infoHidden:document.getElementById('move-info').classList.contains('hidden')};
  }catch(e){ return {__err:String(e.message)}; }
})()`);
console.log(JSON.stringify(d2, null, 1));
await wait(600);
const d3 = await ev("(function(){return {infoStillHidden:document.getElementById('move-info').classList.contains('hidden'), infoText:(document.getElementById('move-info').textContent||'').slice(0,40)};})()");
console.log('拖动后 600ms:', JSON.stringify(d3));
ws.close();
process.exit(0);
