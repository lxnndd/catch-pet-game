// 全流程验收：进草丛 → 选初始伙伴 → 进入主循环（canvas 真实绘制）→ 方向键移动
import { WebSocket } from 'ws';
import { writeFileSync } from 'node:fs';

const URL_ = process.argv[2];
const CDP = 'http://127.0.0.1:' + (process.argv[3] ?? '9335');
const created = await (await fetch(`${CDP}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(created.webSocketDebuggerUrl);
let seq = 0; const pending = new Map(); const errors = [];
ws.on('message', d => {
  const m = JSON.parse(String(d));
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); }
  else if (m.method === 'Runtime.exceptionThrown') errors.push(String(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text).slice(0, 200));
});
await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.value;
const shot = async (p) => { const s = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(p, Buffer.from(s.data, 'base64')); };
const nonEmpty = `(()=>{const c=document.querySelector("canvas");if(!c||!c.width)return "无canvas";try{const g=c.getContext("2d");const d=g.getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i]!==0)n++;return n+"/"+(d.length/4)+" 非透明像素";}catch(e){return "读取失败:"+e.message}})()`;

await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 900, height: 700, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: URL_ });
await new Promise(r => setTimeout(r, 5000));

await ev(`[...document.querySelectorAll("button")].find(x=>/进入草丛/.test(x.textContent)).click()`);
await new Promise(r => setTimeout(r, 1500));

console.log('=== starter-grid 结构 ===');
console.log(await ev(`document.getElementById("starter-grid").innerHTML.slice(0,400)`));

console.log('\n=== 点击第一只初始伙伴 ===');
console.log(await ev(`(()=>{const g=document.getElementById("starter-grid");if(!g)return "无grid";
const cands=[...g.querySelectorAll("button,[onclick],.starter,.card,[data-id]")];
if(cands.length){cands[0].click();return "点击了: "+cands[0].tagName+" "+cands[0].textContent.trim().slice(0,20)+" (共"+cands.length+"个候选)";}
const all=[...g.children]; if(all.length){all[0].click();return "点击了子元素: "+all[0].className+" 文案:"+all[0].textContent.trim().slice(0,20);}
return "无候选元素, children="+g.children.length;})()`));
await new Promise(r => setTimeout(r, 2500));

console.log('\n=== 主循环状态 ===');
console.log(' 可见屏幕:', await ev(`[...document.querySelectorAll('[id]')].filter(e=>e.offsetParent!==null).map(e=>e.id).join(",")`));
console.log(' canvas 显示尺寸:', await ev(`[...document.querySelectorAll("canvas")].map(c=>c.width+"x"+c.height+" 显示:"+c.offsetWidth+"x"+c.offsetHeight).join(",")`));
console.log(' canvas 绘制:', await ev(nonEmpty));
console.log(' 界面文本:', (await ev(`document.body.innerText.slice(0,260)`))?.replace(/\n+/g, ' / '));
await shot('C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/verify-gameplay.png');
console.log('[screenshot] verify-gameplay.png');

// 方向键移动
for (const k of ['ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowUp']) {
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: k, windowsVirtualKeyCode: k === 'ArrowRight' ? 39 : k === 'ArrowDown' ? 40 : 38 });
  await new Promise(r => setTimeout(r, 400));
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: k, windowsVirtualKeyCode: k === 'ArrowRight' ? 39 : k === 'ArrowDown' ? 40 : 38 });
}
await new Promise(r => setTimeout(r, 1200));
console.log('\n=== 移动后 ===');
console.log(' canvas 绘制:', await ev(nonEmpty));
console.log(' 界面文本:', (await ev(`document.body.innerText.slice(0,200)`))?.replace(/\n+/g, ' / '));
await shot('C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/verify-gameplay.png');
console.log('\n=== 全程错误 ===');
console.log(errors.length ? errors.map(e => ' ' + e).join('\n') : ' （无错误）');
process.exit(0);
