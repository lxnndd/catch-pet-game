/* 生成地图全貌（字符版 + 统计），用于确认九大地区布局与火山/海洋间距 */
import { WebSocket } from 'ws';
import { writeFileSync } from 'node:fs';

const URL_ = process.argv[2] || 'http://127.0.0.1:8727/';
const CDP = 'http://127.0.0.1:' + (process.argv[3] ?? '9335');
const created = await (await fetch(`${CDP}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(created.webSocketDebuggerUrl);
let seq = 0; const pending = new Map();
ws.on('message', d => { const m = JSON.parse(String(d)); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); } });
await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) return 'JS_ERROR: ' + String(r.exceptionDetails.exception?.description || r.exceptionDetails.text).slice(0, 300); return r.result?.value; };
const wait = ms => new Promise(r => setTimeout(r, ms));

await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Page.navigate', { url: URL_ + '?t=' + Date.now() }); await wait(4500);

/* 重建一张地图并导出字符画（按地区着色，另附地形符号） */
const data = await ev(`(()=>{
  const savedMap = map, savedPos = S.pos;
  map = genMap();
  const tileChar = {0:".",1:" ",2:"\\"",3:"T",4:"~",5:"+",6:"^",7:"#",8:"@",9:"*"};
  let rows = [], regionRows = [];
  const rChar = {plain:"·",forest:"F",water:"W",volcano:"V",mine:"M",ocean:"O",flower:"*",snow:"S",desert:"D"};
  for(let y=0;y<MH;y++){
    let l="", r="";
    for(let x=0;x<MW;x++){
      l += tileChar[map[y*MW+x]] || "?";
      r += rChar[regionAt(x,y)] || "?";
    }
    rows.push(l); regionRows.push(r);
  }
  const stat = {};
  for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){ const g=regionAt(x,y); stat[g]=(stat[g]||0)+1; }
  /* 火山与海洋的最近距离（全量精确计算） */
  let vol=[], sea=[];
  for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){ const g=regionAt(x,y); if(g==="volcano") vol.push([x,y]); else if(g==="ocean") sea.push([x,y]); }
  let min=9999, pair=null;
  for(const a of vol) for(const b of sea){ const d=Math.max(Math.abs(a[0]-b[0]),Math.abs(a[1]-b[1])); if(d<min){min=d;pair=a+"↔"+b;} }
  map = savedMap; S.pos = savedPos;
  return JSON.stringify({tiles:rows, regions:regionRows, stat:stat, minDist:min, pair:pair, size:MW+"x"+MH,
    trainers:TRAINERS.map(t=>t.name+"@"+t.pos.x+","+t.pos.y+"("+regionAt(t.pos.x,t.pos.y)+")")});
})()`);

const d = JSON.parse(data);
const legend = "图例：空格=草地 ·=路 T=树 ~=水 ^=岩浆 #=岩壁 @=深海 *=花 + =医院   ｜ 地区：·平原 F林间 W水畔 V火山 M矿洞 O海洋 *花海 S雪原 D荒漠";
const out = [
  '抓宠游戏 v13 · 世界地图全貌（' + d.size + '）',
  legend,
  '',
  '── 地形 ──',
  ...d.tiles,
  '',
  '── 地区分布 ──',
  ...d.regions,
  '',
  '── 统计 ──',
  Object.entries(d.stat).map(([k, v]) => k + ' ' + v + ' 格').join(' | '),
  '火山↔海洋最小距离: ' + d.minDist + ' 格 (' + d.pair + ')',
  '',
  '── 训练师站位 ──',
  ...d.trainers
].join('\n');

const P = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/v13-地图全貌.txt';
writeFileSync(P, out, 'utf8');
console.log(out.split('\n').slice(-16).join('\n'));
console.log('\n[已保存]', P);
process.exit(0);
