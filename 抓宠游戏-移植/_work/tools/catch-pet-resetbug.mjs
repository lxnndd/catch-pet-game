// 复现「重开存档无响应」：模拟两次点击，观察每次点击后的状态变化
import { WebSocket } from 'ws';

const URL_ = process.argv[2];
const CDP = 'http://127.0.0.1:' + (process.argv[3] ?? '9335');
const created = await (await fetch(`${CDP}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(created.webSocketDebuggerUrl);
let seq = 0; const pending = new Map(); const errors = [];
ws.on('message', d => {
  const m = JSON.parse(String(d));
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); }
  else if (m.method === 'Runtime.exceptionThrown') errors.push(String(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text).slice(0, 300));
});
await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.value;

await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 900, height: 700, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: URL_ });
await new Promise(r => setTimeout(r, 4500));

// 进入游戏（选初始宠），才能看到重开按钮
await ev(`[...document.querySelectorAll("button")].find(x=>/进入草丛/.test(x.textContent)).click()`);
await new Promise(r => setTimeout(r, 1200));
await ev(`document.getElementById("starter-grid").children[0].click()`);
await new Promise(r => setTimeout(r, 1500));

console.log('=== 进入世界后 ===');
console.log(' 重开按钮存在:', await ev(`!!document.getElementById("btn-reset")`));
console.log(' 重开按钮文案:', await ev(`document.getElementById("btn-reset").textContent`));
console.log(' 重开按钮可见:', await ev(`(()=>{const b=document.getElementById("btn-reset");const r=b.getBoundingClientRect();const el=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return JSON.stringify({w:Math.round(r.width),h:Math.round(r.height),top:Math.round(r.top),点击命中元素:el?el.id||el.className||el.tagName:"null"})})()`));
console.log(' localStorage 存档:', await ev(`(localStorage.getItem(Object.keys(localStorage)[0])||"").length`));
console.log(' 所有 localStorage keys:', await ev(`Object.keys(localStorage).join(",")`));

console.log('\n=== 第 1 次点击 ===');
await ev(`document.getElementById("btn-reset").click()`);
await new Promise(r => setTimeout(r, 400));
console.log(' 按钮文案:', await ev(`document.getElementById("btn-reset").textContent`));

console.log('\n=== 等 3.2 秒看是否自动复位 ===');
await new Promise(r => setTimeout(r, 3200));
console.log(' 按钮文案:', await ev(`document.getElementById("btn-reset").textContent`));

console.log('\n=== 第 2 次点击（连点两次）===');
await ev(`document.getElementById("btn-reset").click()`);
await new Promise(r => setTimeout(r, 300));
await ev(`document.getElementById("btn-reset").click()`);
await new Promise(r => setTimeout(r, 900));
console.log(' 当前可见屏:', await ev(`[...document.querySelectorAll("[id^=screen-]")].filter(e=>!e.classList.contains("hidden")).map(e=>e.id).join(",")`));
console.log(' localStorage keys:', await ev(`Object.keys(localStorage).join(",")`));
console.log(' 存档长度:', await ev(`(localStorage.getItem(Object.keys(localStorage)[0])||"").length`));
console.log(' 按钮文案:', await ev(`document.getElementById("btn-reset").textContent`));

console.log('\n=== 运行期错误 ===');
console.log(errors.length ? errors.map(e => ' ' + e).join('\n') : ' （无）');
process.exit(0);
