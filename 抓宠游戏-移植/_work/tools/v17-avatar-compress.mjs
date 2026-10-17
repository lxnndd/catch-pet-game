/* v17 头像压缩：无头浏览器 canvas → 128×128 WebP（约 4KB/张）
   用法: node v17-avatar-compress.mjs [--size 128] [--quality 0.85] */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { WebSocket } from 'ws';

const SRC = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/_work/v17-avatars';
const OUT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/_work/v17-avatars-webp';
mkdirSync(OUT, { recursive: true });
const SI = process.argv.indexOf('--size'); const SIZE = SI > 0 ? Number(process.argv[SI + 1]) : 128;
const QI = process.argv.indexOf('--quality'); const Q = QI > 0 ? Number(process.argv[QI + 1]) : 0.85;

const files = readdirSync(SRC).filter(f => f.endsWith('.png'));
console.log('待压缩 ' + files.length + ' 张 → ' + SIZE + 'px WebP (q=' + Q + ')');

let seq = 0;
const created = await (await fetch('http://127.0.0.1:9335/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(created.webSocketDebuggerUrl);
const pending = new Map();
ws.on('message', d => { const m = JSON.parse(String(d)); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); } });
await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async (expr) => {
  const rr = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (rr.exceptionDetails) throw new Error(rr.exceptionDetails.exception?.description?.slice(0, 200) || 'err');
  return rr.result?.value;
};
await send('Page.enable'); await send('Runtime.enable');
await send('Page.navigate', { url: 'data:text/html,<html><body></body></html>' });
await new Promise(r => setTimeout(r, 1200));

let ok = 0, fail = [], skipped = 0;
const t0 = Date.now();
for (const f of files) {
  const outPath = OUT + '/' + f.replace(/\.png$/, '.webp');
  if (existsSync(outPath)) { skipped++; ok++; continue; }
  const b64 = readFileSync(SRC + '/' + f).toString('base64');
  const res = await ev(`(async function(){
    try{
      var img=new Image();
      await new Promise(function(res,rej){ img.onload=res; img.onerror=function(){rej(new Error('load fail'));}; img.src='data:image/png;base64,${b64}'; });
      var S=${SIZE}, w=img.naturalWidth||img.width, h=img.naturalHeight||img.height;
      var k=Math.min(S/w, S/h);
      var dw=Math.max(1,Math.round(w*k)), dh=Math.max(1,Math.round(h*k));
      var c=document.createElement('canvas'); c.width=S; c.height=S;
      var g=c.getContext('2d'); g.imageSmoothingEnabled=true; g.imageSmoothingQuality='high';
      g.drawImage(img, Math.round((S-dw)/2), Math.round((S-dh)/2), dw, dh);
      var url=c.toDataURL('image/webp', ${Q});
      if(url.indexOf('data:image/webp')!==0) return {err:'no webp'};
      return {data:url.slice(url.indexOf(',')+1)};
    }catch(e){ return {err:String(e.message).slice(0,60)}; }
  })()`);
  if (res && res.data) { writeFileSync(outPath, Buffer.from(res.data, 'base64')); ok++; }
  else fail.push(f + '(' + (res && res.err ? res.err : '?') + ')');
  if (ok % 60 === 0 && ok) console.log('  已压 ' + ok + '/' + files.length + '（' + ((Date.now() - t0) / 1000).toFixed(0) + 's）');
}
const outs = readdirSync(OUT).filter(f => f.endsWith('.webp'));
const total = outs.reduce((a, f) => a + readFileSync(OUT + '/' + f).length, 0);
console.log('\n完成：' + outs.length + ' 张 WebP，合计 ' + (total / 1024 / 1024).toFixed(2) + ' MB（平均 ' + (total / Math.max(1, outs.length) / 1024).toFixed(1) + ' KB/张）· 本次新压 ' + (ok - skipped));
if (fail.length) console.log('失败 ' + fail.length + '：' + fail.slice(0, 15).join('、'));
ws.close();
