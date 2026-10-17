/* v17 深度实测：开始游戏 → 选伙伴 → 进世界 → 遇敌 → 战斗 → 4 技能 → 头像渲染 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { WebSocket } from 'ws';
const URL_ = process.argv[2] || 'http://127.0.0.1:8727/';
const PORT = process.argv[3] || '9335';
const SHOT = process.argv[4] || 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/shots-v17';
mkdirSync(SHOT, { recursive: true });
let seq = 0;
const created = await (await fetch('http://127.0.0.1:' + PORT + '/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(created.webSocketDebuggerUrl);
const pending = new Map(); const errors = [];
ws.on('message', d => {
  const m = JSON.parse(String(d));
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); return; }
  if (m.method === 'Runtime.exceptionThrown') errors.push('EXC: ' + String(m.params.exceptionDetails?.exception?.description || '').slice(0, 150));
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push((m.params.args || []).map(a => a.value || '').join(' ').slice(0, 150));
});
await new Promise((r, j) => { ws.on('open', r); ws.on('error', j); });
const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async (expr) => {
  const rr = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (rr.exceptionDetails) return { __err: String(rr.exceptionDetails.exception?.description || '').slice(0, 160) };
  return rr.result?.value;
};
const wait = ms => new Promise(r => setTimeout(r, ms));
const shot = async (n) => { try { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(SHOT + '/' + n + '.png', Buffer.from(r.data, 'base64')); } catch (e) { } };
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: 480, height: 940, deviceScaleFactor: 2, mobile: true });
await send('Page.navigate', { url: URL_ + '?t=' + Date.now() });
await wait(9000);
/* 清掉可能存在的旧存档，从零开始 */
await ev(`(function(){ try{ localStorage.clear(); }catch(e){} return true; })()`);
await send('Page.navigate', { url: URL_ + '?t=' + Date.now() });
await wait(8000);
console.log('标题屏: ' + JSON.stringify(await ev(`(function(){ var b=document.getElementById('btn-start'); return { found: !!b, text: b?b.textContent.trim():'', titleShown: !document.getElementById('screen-title').classList.contains('hidden') }; })()`)));
await ev(`document.getElementById('btn-start').click()`);
await wait(3000);
const st = await ev(`(function(){
  var g=document.getElementById('starter-grid');
  var cards=g?g.querySelectorAll('.st-card').length:0;
  var avs=g?g.querySelectorAll('img.pet-avatar').length:0;
  var firstCard=g&&g.querySelector('.st-card')?g.querySelector('.st-card').textContent.trim().slice(0,50):'';
  return { gridFound:!!g, cards:cards, avatars:avs, firstCard:firstCard, starterShown: !document.getElementById('screen-starter').classList.contains('hidden'), groups: (typeof STARTER_GROUPS!=='undefined')?STARTER_GROUPS.map(function(x){return x.key+':'+x.ids.length;}).join(','):'—' };
})()`);
console.log('\n伙伴屏: ' + JSON.stringify(st, null, 1));
await shot('v17-01-starter');
/* 选第一只伙伴 */
const picked = await ev(`(function(){ var g=document.getElementById('starter-grid'); var c=g?g.querySelector('.st-card'):null; if(!c) return 'no card'; c.click(); return c.textContent.trim().slice(0,40); })()`);
console.log('\n点击伙伴：' + picked);
await wait(2600);
const world = await ev(`(function(){
  var cv=document.getElementById('game-canvas');
  var lead=(typeof leadSp==='function')?leadSp():null;
  return { worldShown: !document.getElementById('screen-world').classList.contains('hidden'),
           canvas: cv? (cv.width+'x'+cv.height):'无', lead: lead?lead.name:'—',
           leadAvatar: lead?(!!AVATARS[lead.id]):false,
           party: (typeof S!=='undefined'&&S.party)?S.party.length:0,
           leadMoves: (typeof selfPet==='function'&&selfPet())?movesOf(selfPet()).map(function(id){return MOVES[id].name;}):[] };
})()`);
console.log('\n世界屏: ' + JSON.stringify(world, null, 1));
await shot('v17-02-world');
/* 打开队伍面板看「调整技能」与头像 */
await ev(`document.getElementById('btn-party').click()`);
await wait(1400);
const party = await ev(`(function(){
  var list=document.getElementById('party-list');
  var imgs=list?list.querySelectorAll('img.pet-avatar').length:0;
  var btns=list?[...list.querySelectorAll('button')].map(function(b){return b.textContent.trim();}):[];
  return { rows:list?list.querySelectorAll('.pet-row').length:0, avatars:imgs, buttons:btns.slice(0,6), shown: !document.getElementById('panel-party').classList.contains('hidden') };
})()`);
console.log('\n队伍面板: ' + JSON.stringify(party, null, 1));
await shot('v17-03-party');
/* 点「调整技能」看弹窗 */
await ev(`(function(){ var b=[...document.querySelectorAll('#party-list button')].find(function(x){return /调整技能/.test(x.textContent);}); if(b){ b.click(); return true;} return false; })()`);
await wait(1400);
const dlg = await ev(`(function(){
  var p=document.getElementById('panel-learn');
  var cards=p?p.querySelectorAll('.learn-card').length:0;
  var imgs=p?p.querySelectorAll('img').length:0;
  return { shown: p?!p.classList.contains('hidden'):false, title: (document.getElementById('learn-title')||{}).textContent, cards:cards, cur: (document.getElementById('learn-cur')||{}).textContent ? (document.getElementById('learn-cur').textContent.trim().slice(0,60)) : '' };
})()`);
console.log('\n技能弹窗: ' + JSON.stringify(dlg, null, 1));
await shot('v17-04-skilldialog');
/* 打开图鉴看规模与头像 */
await ev(`(function(){ var p=document.getElementById('panel-learn'); if(p) p.classList.add('hidden'); document.getElementById('btn-dex').click(); return true; })()`);
await wait(2500);
const dex = await ev(`(function(){
  var g=document.getElementById('dex-grid');
  var cards=g?g.querySelectorAll('.pet-card,.dex-card,.dex-item').length:0;
  var imgs=g?g.querySelectorAll('img.pet-avatar').length:0;
  var cnt=(document.getElementById('dex-count')||{}).textContent||'';
  return { cards:cards, avatars:imgs, count:cnt, note:(document.getElementById('dex-grid')||{}).textContent ? document.getElementById('dex-grid').textContent.slice(0,60):'' };
})()`);
console.log('\n图鉴: ' + JSON.stringify(dex, null, 1));
await shot('v17-05-dex');
console.log('\n=== 控制台错误 ' + errors.length + ' 条 ===');
errors.slice(0, 6).forEach(e => console.log('  ❌ ' + e));
if (!errors.length) console.log('  ✅ 零错误');
ws.close();
