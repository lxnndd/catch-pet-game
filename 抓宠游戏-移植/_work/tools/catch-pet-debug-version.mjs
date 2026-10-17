/* 检查浏览器实际加载的版本是否含 resolveSp */
import { WebSocket } from 'ws';
import { readFileSync } from 'node:fs';
const URL_ = process.argv[2] || 'http://127.0.0.1:8727/';
const CDP = 'http://127.0.0.1:' + (process.argv[3] ?? '9335');
const disk = readFileSync('C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/app/site/index.html', 'utf8');
console.log('磁盘文件: ' + disk.length + ' 字符 | 含 resolveSp: ' + /resolveSp/.test(disk) + ' | 出现次数: ' + (disk.match(/resolveSp/g) || []).length);

const created = await (await fetch(`${CDP}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(created.webSocketDebuggerUrl);
let seq = 0; const pending = new Map(); const net = [];
ws.on('message', d => {
  const m = JSON.parse(String(d));
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); }
  else if (m.method === 'Network.responseReceived') net.push({ url: m.params.response.url, status: m.params.response.status, len: m.params.response.headers['content-length'] || m.params.response.headers['Content-Length'] });
});
await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) return 'JS_ERROR: ' + String(r.exceptionDetails.exception?.description || r.exceptionDetails.text).slice(0, 200); return r.result?.value; };
const wait = ms => new Promise(r => setTimeout(r, ms));

await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Page.navigate', { url: URL_ + '?v=' + Date.now() });
await wait(4500);
console.log('\n网络响应:', net.filter(n => n.url.startsWith('http://127.0.0.1')).map(n => n.url + ' ' + n.status + ' len=' + n.len).join('\n  '));
console.log('\n页面内检查:');
console.log('  typeof resolveSp =', await ev('typeof resolveSp'));
console.log('  document.outerHTML.length =', await ev('document.documentElement.outerHTML.length'));
console.log('  has resolveSp in DOM =', await ev(`document.documentElement.outerHTML.indexOf("resolveSp")>=0`));
console.log('  openBattle 前 200 字 =', String(await ev('openBattle.toString().slice(0,200)')));
process.exit(0);
