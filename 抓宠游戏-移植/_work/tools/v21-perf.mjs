/* 性能诊断：找出卡顿根因 */
import { WebSocket } from 'ws';
let seq = 0;
const c = await (await fetch('http://127.0.0.1:9335/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(c.webSocketDebuggerUrl);
const pend = new Map(); const errs = [];
ws.on('message', d => { const m = JSON.parse(String(d)); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); return; } if (m.method === 'Runtime.exceptionThrown') errs.push(String(m.params.exceptionDetails?.exception?.description || '').slice(0, 200)); });
await new Promise((r, j) => { ws.on('open', r); ws.on('error', j); });
const send = (mm, p = {}) => new Promise((res, rej) => { const id = ++seq; pend.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method: mm, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true, timeout: 120000 }); if (r.exceptionDetails) return { __err: String(r.exceptionDetails.exception?.description || '').slice(0, 200) }; return r.result?.value; };
const wait = ms => new Promise(r => setTimeout(r, ms));
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
const t0 = Date.now();
await send('Page.navigate', { url: 'http://127.0.0.1:8727/?t=' + Date.now() });
let readyAt = 0;
for (let i = 0; i < 40; i++) {
  await wait(500);
  if (await ev("(typeof MW!=='undefined'&&typeof S!=='undefined'&&!!S)?1:0") === 1) { readyAt = Date.now(); break; }
}
console.log('【加载耗时】' + ((readyAt - t0) / 1000).toFixed(1) + ' 秒（从打开到可玩）');
console.log('地图：' + await ev('MW+"×"+MH+" = "+map.length+" 格"'));

/* genMap 重跑耗时 */
console.log('\n【genMap 重跑耗时】');
const gm = await ev("(function(){ var t=performance.now(); try{ genMap(); }catch(e){ return 'err:'+e.message; } return ((performance.now()-t)/1000).toFixed(2)+' 秒'; })()");
console.log('  genMap(): ' + gm);

/* draw 耗时 */
console.log('\n【draw 耗时】');
console.log('  ' + JSON.stringify(await ev("(function(){ var t=performance.now(); for(var i=0;i<50;i++) draw(); var ms=(performance.now()-t)/50; return { 每次draw:ms.toFixed(2)+' ms', 理论帧率:Math.round(1000/ms)+' fps', 视口:VIEW_W.toFixed(1)+'×'+VIEW_H.toFixed(1) }; })()")));

/* regionAt 耗时（关键：v20c 加了城镇遍历） */
console.log('\n【regionAt 耗时】');
console.log('  ' + JSON.stringify(await ev("(function(){ var t=performance.now(); for(var i=0;i<2000;i++) regionAt(MAP_CX+(i%50), MAP_CY+(i%40)); var ms=(performance.now()-t)/2000; return { 每次:ms.toFixed(4)+' ms', 2000次:((performance.now()-t)).toFixed(0)+' ms' }; })()")));
console.log('  ringRegion 对比：' + JSON.stringify(await ev("(function(){ var t=performance.now(); for(var i=0;i<2000;i++) ringRegion(MAP_CX+(i%50), MAP_CY+(i%40)); var ms=(performance.now()-t)/2000; return { 每次:ms.toFixed(4)+' ms' }; })()")));

/* 每帧调用了什么：hint/updateHUD 是否每帧跑 */
console.log('\n【可能的每帧开销】');
console.log('  ' + JSON.stringify(await ev("(function(){ return { TOWNS:TOWNS.length, moveIntervalMs:(typeof moveIntervalMs==='function')?moveIntervalMs():'无', TILE:TILE, 视口格数:Math.round(VIEW_W*VIEW_H) }; })()")));
/* 模拟走动 30 步耗时 */
console.log('\n【走动 30 步耗时】');
console.log('  ' + await ev("(function(){ var t=performance.now(); for(var i=0;i<30;i++){ move([0,1,0,-1][i%4],[1,0,-1,0][i%4]); } return ((performance.now()-t)/1000).toFixed(2)+' 秒 / 30 步'; })()"));
console.log('\n异常 ' + errs.length + ' 条'); errs.slice(0, 3).forEach(e => console.log('  ❌ ' + e));
ws.close();
