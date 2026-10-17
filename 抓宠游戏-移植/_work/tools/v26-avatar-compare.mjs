/* v26 生成头像修复前后对照图（修复前 / 修复后游戏用 / 官方编号图） */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { WebSocket } from 'ws';
const ROOT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植';
const OUT = ROOT + '/shots-v26';
mkdirSync(OUT, { recursive: true });
const OLD = ROOT + '/_work/v17-avatars-OLD-bad';
const NEW = ROOT + '/_work/v17-avatars';
const OFF = ROOT + '/_work/v17-avatars-fix';
const WEBP = ROOT + '/_work/v17-avatars-webp';
const items = [
  ['kz-029', '遁鼠'], ['kz-013', '火苗龙'], ['kz-001', '喵喵'],
  ['kz-021', '化蝶'], ['kz-050', '电圈怪'], ['kz-100', '（第100只）'],
];
const b64 = p => existsSync(p) ? readFileSync(p).toString('base64') : null;
let rows = '';
for (const [id, name] of items) {
  const a = b64(OLD + '/' + id + '.png'), b = b64(WEBP + '/' + id + '.webp'), c = b64(OFF + '/' + id + '.png');
  rows += `<tr><td class="lb">${id}<br><span>${name}</span></td>
    <td>${a ? '<img src="data:image/png;base64,' + a + '">' : '<i>无</i>'}</td>
    <td>${b ? '<img src="data:image/webp;base64,' + b + '">' : '<i>无</i>'}</td>
    <td>${c ? '<img src="data:image/png;base64,' + c + '">' : '<i>无</i>'}</td></tr>`;
}
const html = `<!doctype html><meta charset="utf-8"><style>
body{margin:0;padding:18px;background:#f5f7f3;font-family:"Microsoft YaHei",sans-serif}
h1{font-size:20px;margin:0 0 4px}p{font-size:13px;color:#667;margin:0 0 12px}
table{border-collapse:collapse;background:#fff;box-shadow:0 2px 10px #0002}
th,td{border:1px solid #e0e4dd;padding:8px;text-align:center;vertical-align:middle}
th{background:#eef2ea;font-size:13px}
img{width:118px;height:118px;image-rendering:auto;background:#fafbf9;border-radius:8px}
.lb{font-size:13px;font-weight:700;color:#334}.lb span{font-weight:400;color:#778;font-size:12px}
.bad{color:#c33}.good{color:#2a7}
</style><h1>洛克头像修复对照（v26）</h1>
<p>修复前后逐张比对：编号 29 的官方图确为「遁鼠」（dvg 图鉴 19~24 号已验证：毛毛/爬爬/化蝶/卷尾虫/独角虫/紫雾虫）</p>
<table><tr><th>物种</th><th>修复前 <span class="bad">（错位）</span></th><th>修复后 <span class="good">（游戏现用，128px WebP）</span></th><th>官方编号图（dvg 原始）</th></tr>${rows}</table>`;
const data = 'data:text/html;base64,' + Buffer.from(html, 'utf8').toString('base64');

let seq = 0;
const c = await (await fetch('http://127.0.0.1:9335/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(c.webSocketDebuggerUrl);
const pend = new Map();
ws.on('message', d => { const m = JSON.parse(String(d)); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); } });
await new Promise((r, j) => { ws.on('open', r); ws.on('error', j); });
const send = (mm, p = {}) => new Promise((res, rej) => { const id = ++seq; pend.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method: mm, params: p })); });
const wait = ms => new Promise(r => setTimeout(r, ms));
await send('Runtime.enable'); await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 560, height: 900, deviceScaleFactor: 2, mobile: false });
await send('Page.navigate', { url: data });
await wait(3000);
const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
writeFileSync(OUT + '/v26-03-avatar-compare.png', Buffer.from(r.data, 'base64'));
const h = await send('Runtime.evaluate', { expression: 'document.body.scrollHeight', returnByValue: true });
console.log('对照图已生成 shots-v26/v26-03-avatar-compare.png · 页面高 ' + h.result.value + 'px');
ws.close();
