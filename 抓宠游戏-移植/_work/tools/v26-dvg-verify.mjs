/* v26 最终验证：dvg 站的官方编号 ↔ 名字 对照（用 CDP 渲染 Vue 页面并拦截接口） */
import { WebSocket } from 'ws';
let seq = 0;
const c = await (await fetch('http://127.0.0.1:9335/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(c.webSocketDebuggerUrl);
const pend = new Map();
const xhr = [];
ws.on('message', d => {
  const m = JSON.parse(String(d));
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); return; }
  if (m.method === 'Network.responseReceived') { const u = m.params.response.url; if (/\.(php|json)|api|spirit/i.test(u) && !/\.(png|jpg|webp|css|js|woff|ico)/i.test(u)) xhr.push(m.params.response.status + ' ' + u); }
});
await new Promise((r, j) => { ws.on('open', r); ws.on('error', j); });
const send = (mm, p = {}) => new Promise((res, rej) => { const id = ++seq; pend.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method: mm, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) return { __err: String(r.exceptionDetails.exception?.description || '').slice(0, 200) }; return r.result?.value; };
const wait = ms => new Promise(r => setTimeout(r, ms));
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');

await send('Page.navigate', { url: 'https://roco.dvg.cn/spirits.php' });
await wait(6000);
console.log('== 网络请求 ==');
console.log([...new Set(xhr)].slice(0, 20).join('\n'));
const body = await ev("document.body.innerText.replace(/\\n{2,}/g,'\\n').slice(0, 1500)");
console.log('\n== 页面文本（前 1500 字）==');
console.log(body);
const has = await ev("(function(){var t=document.body.innerText;return {遁鼠:t.indexOf('遁鼠'), 喵喵:t.indexOf('喵喵'), 火苗龙:t.indexOf('火苗龙'), len:t.length};})()");
console.log('\n关键词命中: ' + JSON.stringify(has));
/* 找 vue 实例数据 */
const vdata = await ev(`(function(){
  try{
    var el=document.querySelector('#app')||document.body;
    var v=el.__vue_app__ || (el.__vue__ && el.__vue__.$data);
    if(!v) return 'no vue handle';
    var s=JSON.stringify(v).slice(0,800); return s;
  }catch(e){ return 'err '+e.message; }
})()`);
console.log('\nvue 数据: ' + String(vdata).slice(0, 800));
ws.close();
