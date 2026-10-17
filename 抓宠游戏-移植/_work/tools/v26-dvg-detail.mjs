/* v26 用 dvg 详情页参数查「编号 → 名字」 */
import { WebSocket } from 'ws';
let seq = 0;
const c = await (await fetch('http://127.0.0.1:9335/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(c.webSocketDebuggerUrl);
const pend = new Map();
ws.on('message', d => { const m = JSON.parse(String(d)); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); } });
await new Promise((r, j) => { ws.on('open', r); ws.on('error', j); });
const send = (mm, p = {}) => new Promise((res, rej) => { const id = ++seq; pend.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method: mm, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) return { __err: String(r.exceptionDetails.exception?.description || '').slice(0, 200) }; return r.result?.value; };
const wait = ms => new Promise(r => setTimeout(r, ms));
await send('Runtime.enable'); await send('Page.enable');

async function look(qs, label) {
  await send('Page.navigate', { url: 'https://roco.dvg.cn/spirits.php?' + qs });
  await wait(5000);
  const t = await ev("document.body.innerText.replace(/\\n{2,}/g,'\\n').slice(0,420)");
  console.log('\n=== ' + label + ' (' + qs + ') ===');
  console.log(String(t).replace(/\n+/g, ' | ').slice(0, 420));
}
await look('spiritid=29', 'spiritid=29');
await look('spiritid=13', 'spiritid=13');
await look('spiritid=3385', 'spiritid=3385');
await look('sx=1', '属性筛选 sx=1');
ws.close();
