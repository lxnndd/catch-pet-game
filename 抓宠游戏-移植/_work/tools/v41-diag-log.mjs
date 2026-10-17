/* v41 诊断：战斗日志是否串场（新战斗里出现上一场的记录）
   用法：node v41-diag-log.mjs [url] [cdpPort] */
import { WebSocket } from 'ws';
const URL_BASE = process.argv[2] || 'http://127.0.0.1:8728/';
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
for (let i = 0; i < 200; i++) { await wait(250); if (await ev("(typeof SPECIES!=='undefined'&&SPECIES.length>1000&&typeof openBattle==='function')")) break; }

const r = await ev(`(function(){
  try{
    var out={steps:[]};
    localStorage.removeItem(SAVE_KEY); S=freshSave();
    var p=newPet('pk-006'); p.lv=50; p.hp=maxHpOf(p); ensureMoves(p);
    S.party=[p]; S.lead=p.uid; S.pos={x:SPAWN.x,y:SPAWN.y}; enterWorld();
    /* 造一场"上一场战斗"的日志 */
    var e1=rollEnemy();
    startWildBattle(e1);
    var n1=document.querySelectorAll('#battle-log .blog-line').length;
    out.steps.push({t:'第一场开战后', dom:n1, arr:_battleLog.slice(0,3)});
    if(B) closeBattle();
    out.steps.push({t:'closeBattle 后', dom:document.querySelectorAll('#battle-log .blog-line').length, arr:_battleLog.slice(0,3)});
    clearBattleLog();
    out.steps.push({t:'显式 clearBattleLog 后', dom:document.querySelectorAll('#battle-log .blog-line').length, arr:_battleLog.slice()});
    var esp=byId('pk-004'); var foe=initFighter(esp,30,null,''); foe.hp=maxHpOf(foe);
    openBattle('wild',{sp:esp, fighter:foe});
    out.steps.push({t:'openBattle 后', dom:document.querySelectorAll('#battle-log .blog-line').length, arr:_battleLog.slice()});
    B.ehp=foe.hp; B.emax=maxHpOf(foe); B.foe.hp=B.ehp;
    for(var i=0;i<6;i++) log('第'+(i+1)+'条测试记录');
    out.steps.push({t:'写 6 条测试记录后', dom:document.querySelectorAll('#battle-log .blog-line').length, arr:_battleLog.slice()});
    var dom=[];
    document.querySelectorAll('#battle-log .blog-line').forEach(function(d){ dom.push(d.textContent); });
    out.domFirst3=dom.slice(0,3);
    if(B) closeBattle();
    return out;
  }catch(e){ return {__err:String(e.message)}; }
})()`);
console.log(JSON.stringify(r, null, 1));
ws.close();
process.exit(0);
