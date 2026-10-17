/* 紧急诊断：公网页面为什么进不去 */
import { WebSocket } from 'ws';
let seq = 0;
const c = await (await fetch('http://127.0.0.1:9335/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(c.webSocketDebuggerUrl);
const pend = new Map(); const errs = []; const logs = [];
ws.on('message', d => {
  const m = JSON.parse(String(d));
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); return; }
  if (m.method === 'Runtime.exceptionThrown') errs.push(String(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || '').slice(0, 400));
  if (m.method === 'Runtime.consoleAPICalled') logs.push(m.params.type + ': ' + (m.params.args || []).map(a => a.value || a.description || '').join(' ').slice(0, 160));
});
await new Promise((r, j) => { ws.on('open', r); ws.on('error', j); });
const send = (mm, p = {}) => new Promise((res, rej) => { const id = ++seq; pend.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method: mm, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) return { __err: String(r.exceptionDetails.exception?.description || '').slice(0, 250) }; return r.result?.value; };
const wait = ms => new Promise(r => setTimeout(r, ms));
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Page.navigate', { url: 'http://47.105.123.182:8727/?t=' + Date.now() });
console.log('等待加载…');
for (let i = 0; i < 35; i++) {
  await wait(1000);
  const r = await ev("(typeof MW!=='undefined')?((typeof S!=='undefined'&&!!S)?'ready':'MW-ok-S-no'):'no-MW'");
  if (r === 'ready') { console.log('第 ' + (i + 1) + ' 秒：就绪 ✅'); break; }
  if (i === 34) console.log('35 秒仍未就绪，最后状态：' + JSON.stringify(r));
}
console.log('\n=== 关键变量 ===');
console.log('MW=' + JSON.stringify(await ev('typeof MW!==\'undefined\'?MW:"未定义"')));
console.log('T.STREET=' + JSON.stringify(await ev('typeof T!==\'undefined\'?T.STREET:"T未定义"')));
console.log('map=' + JSON.stringify(await ev('typeof map!==\'undefined\'?(map.length+\" 格\"):"map未定义"')));
console.log('TOWNS=' + JSON.stringify(await ev('typeof TOWNS!==\'undefined\'?TOWNS.length:"TOWNS未定义"')));
console.log('boot 存在=' + JSON.stringify(await ev('typeof boot')));
console.log('\n=== 控制台异常 ' + errs.length + ' 条 ===');
errs.slice(0, 8).forEach(e => console.log('  ❌ ' + e));
console.log('\n=== 控制台日志（前 6）===');
logs.slice(0, 6).forEach(l => console.log('  ' + l));
ws.close();
