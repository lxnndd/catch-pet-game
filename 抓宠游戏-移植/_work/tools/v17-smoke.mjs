/* v17 游戏实测：无头浏览器打开本地站点，检查加载、报错、头像、4 技能、图鉴规模
   用法: node v17-smoke.mjs [url] [cdpPort] [shotDir] */
import { writeFileSync, mkdirSync } from 'node:fs';
import { WebSocket } from 'ws';

const URL_ = process.argv[2] || 'http://127.0.0.1:8727/';
const PORT = process.argv[3] || '9335';
const SHOT = process.argv[4] || 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/shots-v17';
mkdirSync(SHOT, { recursive: true });

let seq = 0;
const created = await (await fetch('http://127.0.0.1:' + PORT + '/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(created.webSocketDebuggerUrl);
const pending = new Map();
const errors = [], logs = [];
ws.on('message', d => {
  const m = JSON.parse(String(d));
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); return; }
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push((m.params.args || []).map(a => a.value || a.description || '').join(' ').slice(0, 160));
  if (m.method === 'Runtime.exceptionThrown') errors.push('EXC: ' + String(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || '').slice(0, 200));
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'log') logs.push((m.params.args || []).map(a => a.value || '').join(' ').slice(0, 120));
});
await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async (expr) => {
  const rr = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (rr.exceptionDetails) return { __err: String(rr.exceptionDetails.exception?.description || '').slice(0, 200) };
  return rr.result?.value;
};
const wait = ms => new Promise(r => setTimeout(r, ms));
const shot = async (name) => {
  try {
    const r = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(SHOT + '/' + name + '.png', Buffer.from(r.data, 'base64'));
    return true;
  } catch (e) { return false; }
};
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
/* 必须禁缓存，否则会命中旧版本出现假故障 */
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: 480, height: 900, deviceScaleFactor: 2, mobile: true });

const t0 = Date.now();
console.log('打开 ' + URL_);
await send('Page.navigate', { url: URL_ + (URL_.includes('?') ? '&' : '?') + 't=' + Date.now() });
await wait(9000);   /* 7MB 单文件，给足加载时间 */

const info = await ev(`(function(){
  var out = {};
  out.title = document.title;
  out.htmlBytes = document.documentElement.outerHTML.length;
  out.hasBoot = typeof boot === 'function';
  out.speciesCount = (typeof SPECIES !== 'undefined') ? SPECIES.length : -1;
  out.movesCount = (typeof MOVES !== 'undefined') ? Object.keys(MOVES).length : -1;
  out.evoCount = (typeof EVO !== 'undefined') ? Object.keys(EVO).length : -1;
  out.avatars = (typeof AVATARS !== 'undefined') ? Object.keys(AVATARS).length : -1;
  out.trainers = (typeof TRAINERS !== 'undefined') ? TRAINERS.length : -1;
  out.skillSlots = (typeof SKILL_SLOTS !== 'undefined') ? SKILL_SLOTS : -1;
  out.learnNodes = (typeof LEARN_NODES !== 'undefined') ? LEARN_NODES.join('/') : '-';
  /* 头像内联情况 */
  var imgs = document.querySelectorAll('img.pet-avatar');
  out.avatarImgs = imgs.length;
  /* 帕鲁是否清干净 */
  if (typeof SPECIES !== 'undefined') {
    out.palLeft = SPECIES.filter(function(s){ return s.pal; }).length;
    out.pk = SPECIES.filter(function(s){ return s.pk; }).length;
    out.kz = SPECIES.filter(function(s){ return s.kz; }).length;
    out.withPools = SPECIES.filter(function(s){ return s.pools && Object.keys(s.pools).length; }).length;
    out.noSkill = SPECIES.filter(function(s){ var t=0; var p=s.pools||{}; Object.keys(p).forEach(function(k){ t+=(p[k]||[]).length; }); return t===0; }).length;
    /* TRAINERS 里是否还引用帕鲁 id */
    var palIds = {};
    SPECIES.forEach(function(s){ if(s.pal) palIds[s.id]=1; });
    var used = 0;
    if (typeof TRAINERS !== 'undefined') TRAINERS.forEach(function(t){ (t.team||[]).forEach(function(id){ if(!byId(id)) used++; }); });
    out.trainerBrokenRefs = used;
  }
  out.screens = ['screen-title','screen-starter','screen-world','screen-battle'].map(function(id){ var e=$(id); return id + ':' + (e ? (e.classList.contains('hidden')?'hidden':'shown') : 'MISSING'); });
  return out;
})()`);
console.log('\n=== 加载结果（' + ((Date.now() - t0) / 1000).toFixed(1) + 's）===');
if (info && info.__err) console.log('❌ 页面脚本异常：' + info.__err);
else console.log(JSON.stringify(info, null, 1));
await shot('v17-01-title');

/* 点「开始」→ 进初始伙伴屏 */
await ev(`(function(){ var b=$('btn-start'); if(b){ b.click(); return true; } return false; })()`);
await wait(2500);
const starter = await ev(`(function(){
  var cards = document.querySelectorAll('#starter-grid .st-card, #starter-grid button');
  var avs = document.querySelectorAll('#starter-grid img.pet-avatar');
  return { cards: cards.length, avatars: avs.length, first: cards[0] ? cards[0].textContent.slice(0,60) : '', screen: $('screen-starter') ? !$('screen-starter').classList.contains('hidden') : null };
})()`);
console.log('\n=== 初始伙伴屏 ===');
console.log(JSON.stringify(starter, null, 1));
await shot('v17-02-starter');

console.log('\n=== 控制台错误 ' + errors.length + ' 条 ===');
errors.slice(0, 8).forEach(e => console.log('  ❌ ' + e));
if (!errors.length) console.log('  ✅ 零错误');
ws.close();
