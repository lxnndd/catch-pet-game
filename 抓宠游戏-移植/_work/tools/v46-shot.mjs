/* v46 出图：宠物详情面板（能看到「💫 性格」及其效果）
   用法：node v46-shot.mjs [url] [cdpPort] */
import { WebSocket } from 'ws';
import { mkdirSync, writeFileSync } from 'node:fs';
const URL_BASE = process.argv[2] || 'http://127.0.0.1:8728/';
const CDP_PORT = process.argv[3] || '9335';
const DIR = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/shots-v46';
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
for (let i = 0; i < 200; i++) { await wait(250); if (await ev("(typeof SPECIES!=='undefined'&&SPECIES.length>1000&&typeof openPetInfo==='function'&&typeof traitDesc==='function')")) break; }

const r1 = await ev(`(function(){
  try{
    localStorage.removeItem(SAVE_KEY); S=freshSave();
    var p=newPet('pk-661'); p.trait='brute'; p.lv=7; p.hp=maxHpOf(p); ensureMoves(p);
    S.party=[p]; S.lead=p.uid; S.pos={x:SPAWN.x,y:SPAWN.y}; enterWorld(); S.discovered['pk-661']=1;
    ['panel-battle','panel-trainer','panel-learn','panel-hosp','panel-gym','panel-swap'].forEach(function(k){ var e=$(k); if(e) e.classList.add('hidden'); });
    openPetInfo(p);
    var rows=[]; document.querySelectorAll('#petinfo-body .stat-line').forEach(function(x){ rows.push(x.textContent.trim()); });
    return {name:byId(p.sp).name, trait:trOf(p.trait).name, rows:rows};
  }catch(e){ return {__err:String(e.message)}; }
})()`);
console.log('① 宠物详情（' + r1.name + ' · ' + r1.trait + '）');
(r1.rows || []).forEach(x => console.log('     · ' + x));
await wait(400); await shot('v46-01-petinfo-trait');
ws.close();
process.exit(0);
