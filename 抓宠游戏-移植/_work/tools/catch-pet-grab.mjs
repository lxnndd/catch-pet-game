// 抓取千问分享页里的真实文件：CDP 打开预览页，捕获网络请求 + 各 frame 资源表 + DOM
// 用法：node tools/catch-pet-grab.mjs <url> [cdpPort]
import { WebSocket } from 'ws';
import { writeFileSync } from 'node:fs';

const URL_ = process.argv[2];
const CDP = 'http://127.0.0.1:' + (process.argv[3] ?? '9333');
const OUT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植';

async function cdp() {
  let pages = [];
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(CDP + '/json');
      pages = await r.json();
      if (pages.length) break;
    } catch { /* retry */ }
    await new Promise(r => setTimeout(r, 500));
  }
  const page = pages.find(p => p.type === 'page');
  if (!page) throw new Error('无调试页面');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let seq = 0;
  const pending = new Map();
  const events = [];
  ws.on('message', d => {
    const m = JSON.parse(String(d));
    if (m.id && pending.has(m.id)) {
      const p = pending.get(m.id);
      pending.delete(m.id);
      m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result);
    } else if (m.method) {
      events.push(m);
    }
  });
  await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
  return {
    events,
    send: (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++seq;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    })
  };
}

const js = (code) => ({ expression: code, awaitPromise: true, returnByValue: true });

const c = await cdp();
await c.send('Page.enable');
await c.send('Network.enable');
await c.send('Runtime.enable');
// 新标签页打开目标（避开初始 about:blank 的时序问题）
await c.send('Page.navigate', { url: URL_ });

// 等渲染 + 等预览器把文件拉下来
await new Promise(r => setTimeout(r, 12000));

const reqs = c.events
  .filter(e => e.method === 'Network.requestWillBeSent')
  .map(e => e.params.request.url);
const resps = c.events
  .filter(e => e.method === 'Network.responseReceived')
  .map(e => ({ url: e.params.response.url, type: e.params.type, mime: e.params.response.mimeType, status: e.params.response.status }));

// 各 frame 的资源表 + DOM 摘要
const frames = await c.send('Page.getFrameTree');
const frameIds = [];
(function walk(n) { frameIds.push(n.frame.id); (n.childFrames || []).forEach(walk); })(frames.frameTree);

const report = { url: URL_, requests: reqs, responses: resps, frames: [] };
for (const fid of frameIds) {
  try {
    const ctx = await c.send('Page.createIsolatedWorld', { frameId: fid, worldName: 'grab' });
    const executionContextId = ctx.executionContextId;
    const r = await c.send('Runtime.evaluate', {
      expression: `JSON.stringify({
        href: location.href,
        title: document.title,
        htmlLen: document.documentElement.outerHTML.length,
        resources: performance.getEntriesByType('resource').map(x => x.name),
        bodyText: document.body ? document.body.innerText.slice(0, 300) : '',
        iframes: [...document.querySelectorAll('iframe,embed,object')].map(f => f.src || f.data || '')
      })`,
      contextId: executionContextId,
      returnByValue: true
    });
    report.frames.push({ frameId: fid, data: JSON.parse(r.result.value) });
  } catch (e) {
    report.frames.push({ frameId: fid, error: String(e).slice(0, 200) });
  }
}

// 主 frame 完整 DOM
try {
  const mainId = frameIds[0];
  const ctx = await c.send('Page.createIsolatedWorld', { frameId: mainId, worldName: 'grab2' });
  const dom = await c.send('Runtime.evaluate', {
    expression: 'document.documentElement.outerHTML',
    contextId: ctx.executionContextId,
    returnByValue: true
  });
  writeFileSync(`${OUT}/preview-dom.html`, dom.result.value, 'utf8');
  console.log('[saved] preview-dom.html', dom.result.value.length, 'bytes');
} catch (e) { console.log('[dom] 失败', String(e).slice(0, 200)); }

// 游戏正文（若有 frame 含游戏 HTML）单独存
for (const [i, f] of report.frames.entries()) {
  const d = f.data;
  if (!d) continue;
  if (d.title && /抓宠/.test(d.title)) {
    try {
      const ctx = await c.send('Page.createIsolatedWorld', { frameId: f.frameId, worldName: 'grab3' });
      const dom = await c.send('Runtime.evaluate', {
        expression: 'document.documentElement.outerHTML',
        contextId: ctx.executionContextId, returnByValue: true
      });
      writeFileSync(`${OUT}/frame${i}-game.html`, dom.result.value, 'utf8');
      console.log('[saved] frame' + i + '-game.html', dom.result.value.length, 'bytes');
    } catch { /* ignore */ }
  }
}

writeFileSync(`${OUT}/grab-report.json`, JSON.stringify(report, null, 2), 'utf8');
console.log('=== 请求 URL（含 html/cdn 关键项）===');
for (const u of [...new Set(reqs)]) {
  if (/uzone|workspace|html|file|claw|oss|cdn/i.test(u)) console.log(' ', u);
}
console.log('=== frames ===');
for (const f of report.frames) {
  console.log(' ', f.frameId, JSON.stringify(f.data ? {
    href: f.data.href, title: f.data.title, htmlLen: f.data.htmlLen, iframes: f.data.iframes
  } : f.error));
}
process.exit(0);
