/* v26 翻到 dvg 最后一页，读取「编号 1~30」的官方名字 */
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

async function tryUrl(u, label) {
  await send('Page.navigate', { url: u });
  await wait(5500);
  const t = await ev("document.body.innerText.replace(/\\n+/g,'|').slice(0,700)");
  console.log('\n=== ' + label + ' ===');
  console.log(String(t).slice(0, 700));
}
await tryUrl('https://roco.dvg.cn/spirits.php?page=112', 'page=112');
await tryUrl('https://roco.dvg.cn/spirits.php?p=112', 'p=112');
await tryUrl('https://roco.dvg.cn/spirits.php?page=111', 'page=111');
ws.close();
