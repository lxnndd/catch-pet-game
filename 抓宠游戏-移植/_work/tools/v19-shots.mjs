/* v19 截图 + HUD/徽章 验证 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { WebSocket } from 'ws';
const SHOT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/shots-v19';
mkdirSync(SHOT, { recursive: true });
let seq = 0;
const c = await (await fetch('http://127.0.0.1:9335/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(c.webSocketDebuggerUrl);
const pend = new Map(); const errs = [];
ws.on('message', d => { const m = JSON.parse(String(d)); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); return; } if (m.method === 'Runtime.exceptionThrown') errs.push(String(m.params.exceptionDetails?.exception?.description || '').slice(0, 150)); });
await new Promise((r, j) => { ws.on('open', r); ws.on('error', j); });
const send = (mm, p = {}) => new Promise((res, rej) => { const id = ++seq; pend.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method: mm, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) return { __err: String(r.exceptionDetails.exception?.description || '').slice(0, 170) }; return r.result?.value; };
const wait = ms => new Promise(r => setTimeout(r, ms));
const shot = async n => { try { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(SHOT + '/' + n + '.png', Buffer.from(r.data, 'base64')); } catch (e) { } };
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await send('Page.navigate', { url: 'http://127.0.0.1:8727/?t=' + Date.now() });
for (let i = 0; i < 40; i++) { await wait(1000); if (await ev("(typeof MW!=='undefined'&&typeof S!=='undefined'&&!!S)?1:0") === 1) break; }
await ev('(function(){ try{ localStorage.clear(); }catch(e){} return 1; })()');
await send('Page.navigate', { url: 'http://127.0.0.1:8727/?t=' + Date.now() });
for (let i = 0; i < 40; i++) { await wait(1000); if (await ev("(typeof MW!=='undefined'&&typeof S!=='undefined'&&!!S)?1:0") === 1) break; }
await ev("document.getElementById('btn-start').click()"); await wait(2800);
await ev("(function(){ document.querySelector('#starter-grid .st-card').click(); return 1; })()"); await wait(3500);
/* HUD 徽章 */
console.log('HUD 徽章显示：' + JSON.stringify(await ev("(function(){ var e=document.getElementById('hud-badges'); return e? e.textContent : '元素不存在'; })()")));
/* 各城镇截图 */
const spots = [
  ['平原镇', "TOWNS[0]"],
  ['林间镇', "TOWNS.find(function(t){return t.region==='forest';})||TOWNS[1]"],
  ['海洋镇', "TOWNS.find(function(t){return t.region==='ocean';})||TOWNS[4]"],
  ['火山镇', "TOWNS.find(function(t){return t.region==='volcano';})||TOWNS[5]"],
  ['雪原镇', "TOWNS.find(function(t){return t.region==='snow';})||TOWNS[6]"],
];
for (const [name, expr] of spots) {
  const r = await ev(`(function(){ var t=${expr}; if(!t) return 'no town'; S.pos={x:t.x,y:t.y}; draw(); return t.name+' @'+t.x+','+t.y; })()`);
  await wait(900);
  await shot('v19-town-' + name);
  console.log('  截图 ' + name + '：' + JSON.stringify(r));
}
/* 道馆弹窗截图 */
await ev("(function(){ ['panel-gym','panel-hosp'].forEach(function(id){var e=document.getElementById(id);if(e)e.classList.add('hidden');}); var t=TOWNS.find(function(x){return x.region==='volcano';}); S.pos={x:t.gym.x,y:t.gym.y-2}; move(0,1); return 1; })()");
await wait(1200); await shot('v19-02-gym-panel');
console.log('道馆弹窗：' + JSON.stringify(await ev("(function(){ return { title:(document.getElementById('gym-title')||{}).textContent, sub:(document.getElementById('gym-sub')||{}).textContent, note:(document.getElementById('gym-note')||{}).textContent.replace(/\\s+/g,' ').slice(0,70) }; })()")));
/* 联盟截图 */
await ev("(function(){ var e=document.getElementById('panel-gym'); if(e)e.classList.add('hidden'); var lp=LEAGUE_POS; S.pos={x:lp.x,y:lp.y+2}; move(0,-1); return 1; })()");
await wait(1200); await shot('v19-03-league');
console.log('联盟弹窗：' + JSON.stringify(await ev("(function(){ return { title:(document.getElementById('gym-title')||{}).textContent, sub:(document.getElementById('gym-sub')||{}).textContent }; })()")));
/* 雪原地形确认（应为白色 SNOW） */
const snow = await ev("(function(){ return { snowTiles: map.filter(function(v){return v===T.SNOW;}).length, gymTiles: map.filter(function(v){return v===T.GYM;}).length, hospTiles: map.filter(function(v){return v===T.HOSP;}).length, leagueTiles: map.filter(function(v){return v===T.LEAGUE;}).length }; })()");
console.log('地形统计：' + JSON.stringify(snow));
console.log('异常 ' + errs.length + ' 条'); errs.slice(0, 3).forEach(e => console.log('  ' + e));
ws.close();
