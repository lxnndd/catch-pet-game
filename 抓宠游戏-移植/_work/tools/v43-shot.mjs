/* v43 出图：宠物详情（含官方捕获率）+ 图鉴（属性标签配色）
   用法：node v43-shot.mjs [url] [cdpPort] */
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
for (let i = 0; i < 200; i++) { await wait(250); if (await ev("(typeof SPECIES!=='undefined'&&SPECIES.length>1000&&typeof openPetInfo==='function')")) break; }

console.log('① 宠物详情面板（超梦 · 传说档 · 超能力属性 · 官方捕获率 3）');
const r1 = await ev(`(function(){
  try{
    localStorage.removeItem(SAVE_KEY); S=freshSave();
    var p=newPet('pk-150'); p.trait='fierce'; p.lv=50; p.hp=maxHpOf(p); ensureMoves(p);
    S.party=[p]; S.lead=p.uid; S.pos={x:SPAWN.x,y:SPAWN.y}; enterWorld(); S.discovered['pk-150']=1;
    openPetInfo(p);
    var rows=[]; document.querySelectorAll('#petinfo-body .stat-line').forEach(function(d){ rows.push(d.textContent.trim()); });
    return {rows:rows.slice(0,8), cap:byId('pk-150').cap, rate:+(catchProb(byId('pk-150'),100,100,1,1)*100).toFixed(2)};
  }catch(e){ return {__err:String(e.message)}; }
})()`);
console.log('   ' + JSON.stringify(r1));
await wait(400); await shot('v43-01-petinfo-catchrate');

console.log('② 图鉴（18 属性标签配色）');
const r2 = await ev(`(function(){
  try{
    ['pk-150','pk-006','pk-009','pk-025','pk-003','pk-094','pk-149','pk-448','pk-445','pk-700','pk-212','pk-142'].forEach(function(id){ S.discovered[id]=1; });
    ['panel-petinfo','panel-battle','panel-learn','panel-hosp','panel-gym','panel-swap'].forEach(function(k){ var e=$(k); if(e) e.classList.add('hidden'); });
    DEX_PAGE=0; DEX_FILTER='all'; openDex(0);
    return {cards:document.querySelectorAll('#dex-grid .dex-card').length};
  }catch(e){ return {__err:String(e.message)}; }
})()`);
console.log('   ' + JSON.stringify(r2));
await wait(600); await shot('v43-02-dex-types');

console.log('③ 技能面板（技能卡上的属性标签配色）');
const r3 = await ev(`(function(){
  try{
    document.querySelectorAll('.overlay').forEach(function(o){ o.classList.add('hidden'); });
    var p=S.party[0]||newPet('pk-150');
    openSkillEditor(p);
    var tags=[]; document.querySelectorAll('#panel-learn .type-tag').forEach(function(t){ tags.push(t.textContent+'='+getComputedStyle(t).backgroundColor); });
    return {n:tags.length, sample:tags.slice(0,6)};
  }catch(e){ return {__err:String(e.message)}; }
})()`);
console.log('   ' + JSON.stringify(r3));
await wait(500); await shot('v43-03-skill-panel');
ws.close();
process.exit(0);
