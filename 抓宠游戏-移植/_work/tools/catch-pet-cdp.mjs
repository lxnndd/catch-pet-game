// 用 CDP 打开千问分享预览页：捕获网络响应，直接拿到游戏 HTML 的本体
import { WebSocket } from 'ws';
import { writeFileSync, mkdirSync } from 'node:fs';

const TARGET = process.argv[2];
const CDP = 'http://127.0.0.1:' + (process.argv[3] ?? '9335');
const OUT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植';
mkdirSync(OUT, { recursive: true });

const pages = await (await fetch(CDP + '/json')).json();
const page = pages.find(p => p.type === 'page');
if (!page) throw new Error('无 page 目标');
const ws = new WebSocket(page.webSocketDebuggerUrl);
let seq = 0;
const pending = new Map();
const events = [];
ws.on('message', d => {
  const m = JSON.parse(String(d));
  if (m.id && pending.has(m.id)) {
    const p = pending.get(m.id); pending.delete(m.id);
    m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result);
  } else if (m.method) events.push(m);
});
await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++seq; pending.set(id, { resolve, reject });
  ws.send(JSON.stringify({ id, method, params }));
});
const js = (code) => ({ expression: code, awaitPromise: true, returnByValue: true });

await send('Page.enable');
await send('Network.enable', { maxTotalBufferSize: 200 * 1024 * 1024, maxResourceBufferSize: 100 * 1024 * 1024 });
await send('Runtime.enable');
await send('Page.navigate', { url: TARGET });

// 等待渲染 + 文件下载完成
await new Promise(r => setTimeout(r, 15000));

// 收集所有响应
const respByReq = new Map();
for (const e of events) {
  if (e.method === 'Network.responseReceived') respByReq.set(e.params.requestId, e.params);
}
const hits = [];
for (const [rid, p] of respByReq) {
  const u = p.response.url;
  if (/uzone|workspace|\.html|html_fid|clobber|download/i.test(u) || p.type === 'Document' || p.type === 'Fetch' || p.type === 'XHR') {
    hits.push({ rid, url: u, type: p.type, mime: p.response.mimeType, status: p.response.status, len: p.response.encodedDataLength });
  }
}
console.log('=== 候选响应 ===');
for (const h of hits) console.log(` ${h.status} ${h.type} ${h.mime} ${h.len}B ${h.url.slice(0, 150)}`);

// 逐个取 body
const saved = [];
for (const h of hits) {
  try {
    const b = await send('Network.getResponseBody', { requestId: h.rid });
    const body = b.base64Encoded ? Buffer.from(b.body, 'base64').toString('utf8') : b.body;
    if (/抓宠|canvas|catchTarget|宠物|battle/i.test(body) || /\.html/.test(h.url)) {
      const name = `grabbed-${saved.length}-${(h.url.split('/').pop() || 'x').replace(/[^\w.\-]/g, '_').slice(0, 40)}`;
      writeFileSync(`${OUT}/${name}`, body, 'utf8');
      saved.push({ file: name, url: h.url, len: body.length, hasGame: /抓宠/.test(body) });
      console.log(`[saved] ${name} ${body.length}B ${h.url.slice(0, 120)}`);
    }
  } catch (e) { /* body 可能已释放 */ }
}

// 页面内 DOM + 资源表（含 iframe）
const frameTree = await send('Page.getFrameTree');
const fids = []; (function walk(n) { fids.push(n.frame.id); (n.childFrames || []).forEach(walk); })(frameTree.frameTree);
const frames = [];
for (const fid of fids) {
  try {
    const ctx = await send('Page.createIsolatedWorld', { frameId: fid, worldName: 'grab' });
    const r = await send('Runtime.evaluate', {
      contextId: ctx.executionContextId, returnByValue: true,
      expression: `JSON.stringify({href:location.href,title:document.title,len:document.documentElement.outerHTML.length,text:document.body?document.body.innerText.slice(0,200):'',res:performance.getEntriesByType('resource').map(x=>x.name),ifr:[...document.querySelectorAll('iframe')].map(f=>f.src)})`
    });
    frames.push({ fid, d: JSON.parse(r.result.value) });
  } catch (e) { frames.push({ fid, err: String(e).slice(0, 150) }); }
}
console.log('=== frames ===');
for (const f of frames) console.log(' ', f.fid, JSON.stringify(f.d || f.err).slice(0, 800));

// 游戏 iframe 完整 DOM
for (const [i, f] of frames.entries()) {
  if (f.d && /抓宠/.test(f.d.title + f.d.text)) {
    const ctx = await send('Page.createIsolatedWorld', { frameId: f.fid, worldName: 'grab2' });
    const dom = await send('Runtime.evaluate', { contextId: ctx.executionContextId, returnByValue: true, expression: 'document.documentElement.outerHTML' });
    writeFileSync(`${OUT}/grabbed-frame${i}.html`, dom.result.value, 'utf8');
    console.log(`[saved] grabbed-frame${i}.html ${dom.result.value.length}B`);
  }
}
writeFileSync(`${OUT}/grab-result.json`, JSON.stringify({ hits, saved, frames }, null, 2), 'utf8');
console.log('DONE');
process.exit(0);
