/* v41 出图：宠物详情面板（种族值 vs 官方实际值）+ 经验条
   用法：node v41-shot-petinfo.mjs [url] [cdpPort] */
import { WebSocket } from 'ws';
import { mkdirSync, writeFileSync } from 'node:fs';

const URL_BASE = process.argv[2] || 'http://127.0.0.1:8728/';
const CDP_PORT = process.argv[3] || '9335';
const DIR = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/shots-v41';
let seq = 0;
const c = await (await fetch('http://127.0.0.1:' + CDP_PORT + '/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(c.webSocketDebuggerUrl);
const pend = new Map();
ws.on('message', d => { const m = JSON.parse(String(d)); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); } });
await new Promise((r, j) => { ws.on('open', r); ws.on('error', j); });
const send = (mm, p = {}) => new Promise((res, rej) => { const id = ++seq; pend.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method: mm, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) return { __err: String(r.exceptionDetails.exception?.description || '').slice(0, 300) }; return r.result?.value; };
const wait = ms => new Promise(r => setTimeout(r, ms));
mkdirSync(DIR, { recursive: true });

await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Page.navigate', { url: URL_BASE + '?t=' + Date.now() });
for (let i = 0; i < 200; i++) { await wait(250); if (await ev("(typeof SPECIES!=='undefined'&&SPECIES.length>1000&&typeof enterWorld==='function')")) break; }

const setup = await ev(`(function(){
  try{
    localStorage.removeItem(SAVE_KEY); S=freshSave();
    var p=newPet('pk-025'); p.lv=50; p.exp=Math.round(expNeed(50,byId('pk-025'))*0.35); p.hp=maxHpOf(p); ensureMoves(p);
    S.party=[p]; S.lead=p.uid; S.pos={x:SPAWN.x,y:SPAWN.y}; enterWorld();
    openPetInfo(p);
    var rows=[];
    document.querySelectorAll('#petinfo-body .stat-line, #petinfo-body div').forEach(function(d){
      var t=(d.textContent||'').trim();
      if(/种族/.test(t)&&t.length<60) rows.push(t);
    });
    return {rows:rows.slice(0,10), lv:p.lv, hp:p.hp, exp:p.exp, need:expNeed(50,byId('pk-025'))};
  }catch(e){ return {__err:String(e.message)}; }
})()`);
console.log('面板内容:', JSON.stringify(setup, null, 1));
await wait(500);
const r = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync(DIR + '/v41-03-petinfo-formula.png', Buffer.from(r.data, 'base64'));
console.log('已截图 → ' + DIR + '/v41-03-petinfo-formula.png');
ws.close();
process.exit(0);
