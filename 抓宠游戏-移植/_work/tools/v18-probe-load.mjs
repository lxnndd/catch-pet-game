/* 探测：新地图生成是否偶发卡住/超时 */
import { WebSocket } from 'ws';
let seq = 0;
const created = await (await fetch('http://127.0.0.1:9335/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(created.webSocketDebuggerUrl);
const pending = new Map(); const errs = [];
ws.on('message', d => { const m = JSON.parse(String(d)); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); return; } if (m.method === 'Runtime.exceptionThrown') errs.push(String(m.params.exceptionDetails?.exception?.description || '').slice(0, 200)); });
await new Promise((r, j) => { ws.on('open', r); ws.on('error', j); });
const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async (expr) => { const rr = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true, timeout: 30000 }); if (rr.exceptionDetails) return { __err: String(rr.exceptionDetails.exception?.description || '').slice(0, 180) }; return rr.result?.value; };
const wait = ms => new Promise(r => setTimeout(r, ms));
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
for (let round = 1; round <= 3; round++) {
  const t0 = Date.now();
  await send('Page.navigate', { url: 'http://47.105.123.182:8727/?t=' + Date.now() });
  let ok = false, info = null;
  for (let i = 0; i < 24; i++) {          /* 最多等 24 秒 */
    await wait(1000);
    const r = await ev("(typeof MW!=='undefined') ? {mw:MW, mh:MH, cells:map.length, booted:(typeof S!=='undefined'&&!!S)} : null");
    if (r && r.mw) { ok = true; info = r; break; }
  }
  console.log('第 ' + round + ' 轮：' + (ok ? ('✅ ' + ((Date.now() - t0) / 1000).toFixed(1) + 's 就绪 ' + JSON.stringify(info)) : '❌ 24 秒内没就绪'));
  if (!ok) console.log('   异常：' + JSON.stringify(errs.slice(0, 3)));
}
ws.close();
