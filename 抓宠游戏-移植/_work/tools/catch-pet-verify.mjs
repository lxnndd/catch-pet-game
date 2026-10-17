// 渲染验收：打开页面 → 收集 console 错误 / 截图 / DOM 证据
import { WebSocket } from 'ws';
import { writeFileSync } from 'node:fs';

const URL_ = process.argv[2];
const SHOT = process.argv[3];
const CDP = 'http://127.0.0.1:' + (process.argv[4] ?? '9335');

// 新建标签页，避免复用旧页
const created = await (await fetch(`${CDP}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(created.webSocketDebuggerUrl);
let seq = 0;
const pending = new Map();
const errors = [];
const logs = [];
ws.on('message', d => {
  const m = JSON.parse(String(d));
  if (m.id && pending.has(m.id)) {
    const p = pending.get(m.id); pending.delete(m.id);
    m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result);
  } else if (m.method === 'Runtime.exceptionThrown') {
    errors.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || 'unknown');
  } else if (m.method === 'Runtime.consoleAPICalled') {
    logs.push(`${m.params.type}: ` + m.params.args.map(a => a.value ?? a.description ?? '').join(' ').slice(0, 200));
  }
});
await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++seq; pending.set(id, { resolve, reject });
  ws.send(JSON.stringify({ id, method, params }));
});

await send('Page.enable');
await send('Runtime.enable');
await send('Network.enable');
await send('Page.navigate', { url: URL_ });
await new Promise(r => setTimeout(r, 6000));

const ev = async (expr, awaitPromise = false) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise });
  return r.result?.value;
};

const info = {
  title: await ev('document.title'),
  bodyText: (await ev('document.body ? document.body.innerText.slice(0,400) : ""')),
  canvasCount: await ev('document.querySelectorAll("canvas").length'),
  canvasSizes: await ev('[...document.querySelectorAll("canvas")].map(c=>c.width+"x"+c.height).join(",")'),
  scriptCount: await ev('document.querySelectorAll("script").length'),
  externalSrc: await ev('[...document.querySelectorAll("script[src]")].map(s=>s.src).join(",")'),
  buttons: await ev('[...document.querySelectorAll("button")].length'),
  visibleEls: await ev('document.querySelectorAll("body *").length'),
  htmlLen: await ev('document.documentElement.outerHTML.length'),
  hiddenScreens: await ev('[...document.querySelectorAll(".hidden")].length')
};

console.log('=== 渲染结果 ===');
for (const [k, v] of Object.entries(info)) console.log(` ${k}: ${v}`);
console.log('=== 控制台错误 ===');
console.log(errors.length ? errors.slice(0, 8).map(e => ' ' + String(e).slice(0, 300)).join('\n') : ' （无）');
console.log('=== console 输出 ===');
console.log(logs.length ? logs.slice(0, 10).map(l => ' ' + l).join('\n') : ' （无）');

if (SHOT) {
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(SHOT, Buffer.from(shot.data, 'base64'));
  console.log('[screenshot]', SHOT);
}
process.exit(0);
