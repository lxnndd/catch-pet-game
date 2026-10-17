/* v43c 出图：图鉴筛选条（默认全部 / 排除若干属性后）
   用法：node v43c-shot.mjs [url] [cdpPort] */
import { WebSocket } from 'ws';
import { mkdirSync, writeFileSync } from 'node:fs';
const URL_BASE = process.argv[2] || 'http://127.0.0.1:8728/';
const CDP_PORT = process.argv[3] || '9335';
const DIR = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/shots-v43';
let seq = 0;
const c = await (await fetch('http://127.0.0.1:' + CDP_PORT + '/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(c.webSocketDebuggerUrl);
const pend = new Map();
ws.on('message', d => { const m = JSON.parse(String(d)); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); } });
await new Promise((r, j) => { ws.on('open', r); ws.on('error', j); });
const send = (mm, p = {}) => new Promise((res, rej) => { const id = ++seq; pend.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method: mm, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) return { __err: String(r.exceptionDetails.exception?.description || '').slice(0, 300) }; return r.result?.value; };
const wait = ms => new Promise(r => setTimeout(r, ms));
const shot = async (n) => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(DIR + '/' + n + '.png', Buffer.from(r.data, 'base64')); console.log('  → ' + n + '.png'); };
mkdirSync(DIR, { recursive: true });
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Page.navigate', { url: URL_BASE + '?t=' + Date.now() });
for (let i = 0; i < 200; i++) { await wait(250); if (await ev("(typeof SPECIES!=='undefined'&&SPECIES.length>1000&&typeof dexList==='function')")) break; }

const r1 = await ev(`(function(){
  try{
    localStorage.removeItem(SAVE_KEY); S=freshSave();
    var p=newPet('pk-001'); p.hp=maxHpOf(p); ensureMoves(p);
    S.party=[p]; S.lead=p.uid; S.pos={x:SPAWN.x,y:SPAWN.y}; enterWorld();
    /* 解锁一批宠，让图鉴有内容 */
    ['pk-001','pk-004','pk-006','pk-007','pk-025','pk-094','pk-149','pk-150','pk-448'].forEach(function(id){ S.discovered[id]=1; });
    ['panel-petinfo','panel-battle','panel-learn','panel-hosp','panel-gym','panel-swap'].forEach(function(k){ var e=$(k); if(e) e.classList.add('hidden'); });
    DEX_EXCLUDE={}; openDex(0);
    var tb=$('dex-toolbar'), bs=tb.querySelectorAll('button'), tops={};
    bs.forEach(function(b){ tops[b.offsetTop]=1; });
    return {n:bs.length, rows:Object.keys(tops).length, total:dexList().length};
  }catch(e){ return {__err:String(e.message)}; }
})()`);
console.log('① 默认（全部）: ' + JSON.stringify(r1));
await wait(400); await shot('v43-04-dex-filter-all');

const r2 = await ev(`(function(){
  try{
    DEX_EXCLUDE={fire:1,water:1,grass:1,electric:1};
    openDex(0);
    return {total:dexList().length, excl:Object.keys(DEX_EXCLUDE).length, allText:$('dex-toolbar').querySelector('button').textContent};
  }catch(e){ return {__err:String(e.message)}; }
})()`);
console.log('② 排除 火/水/草/电: ' + JSON.stringify(r2));
await wait(400); await shot('v43-05-dex-filter-excluded');
ws.close();
process.exit(0);
