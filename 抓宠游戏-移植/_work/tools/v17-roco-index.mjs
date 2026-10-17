/* v17 洛克「名字 → dvg 编号」表（续抓，输出到游戏项目安全目录）
   输出: 抓宠游戏-移植/_work/v17-data/roco-name-no.json
   用法: node v17-roco-index.mjs */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { WebSocket } from 'ws';

const DIR = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/_work/v17-data';
const OUT = DIR + '/roco-name-no.json';
const PROG = DIR + '/_roco_index_progress.json';
mkdirSync(DIR, { recursive: true });

let map = {}, fromPage = 1;
if (existsSync(PROG)) {
  try {
    const p = JSON.parse(readFileSync(PROG, 'utf8'));
    if (p && p.map && Object.keys(p.map).length > 20) {
      map = p.map; fromPage = (p.page || 0) + 1;
      console.log('续抓：从第 ' + fromPage + ' 页继续（已有 ' + Object.keys(map).length + ' 个名字）');
    }
  } catch (e) { }
}

let ws = null, seq = 0;
const created = await (await fetch('http://127.0.0.1:9335/json/new?about:blank', { method: 'PUT' })).json();
ws = new WebSocket(created.webSocketDebuggerUrl);
const pending = new Map();
ws.on('message', d => { const m = JSON.parse(String(d)); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); } });
await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.value;
const wait = ms => new Promise(r => setTimeout(r, ms));
await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });

const MAXPAGE = 112;
const t0 = Date.now();
for (let p = fromPage; p <= MAXPAGE; p++) {
  await send('Page.navigate', { url: 'https://roco.dvg.cn/spirits.php?type=&p=' + p });
  await wait(950);
  const rows = await ev(`(function(){
    var out=[];
    document.querySelectorAll('a[href*="spirit_info"]').forEach(function(a){
      var m=(a.getAttribute('href')||'').match(/id=(\\d+)/);
      var nm=(a.textContent||'').trim();
      var img=a.querySelector('img'); var imgNo=null;
      if(img){ var mm=(img.getAttribute('src')||'').match(/spirit\\/\\d+\\/(\\d+)-/); if(mm) imgNo=Number(mm[1]); }
      if(nm && nm.length<20) out.push({name:nm, id:m?Number(m[1]):null, imgNo:imgNo});
    });
    return out;
  })()`);
  (rows || []).forEach(r => { const no = r.imgNo || r.id; if (no && !map[r.name]) map[r.name] = no; });
  if (p % 5 === 0) {
    writeFileSync(PROG, JSON.stringify({ page: p, map: map }), 'utf8');
    console.log('  第 ' + p + ' / ' + MAXPAGE + ' 页，累计 ' + Object.keys(map).length + ' 个（' + ((Date.now() - t0) / 1000).toFixed(0) + 's）');
  }
}
writeFileSync(OUT, JSON.stringify(map, null, 1), 'utf8');
writeFileSync(PROG, JSON.stringify({ page: MAXPAGE, map: map }), 'utf8');
console.log('\n完成：' + Object.keys(map).length + ' 个「名字→编号」');
const CHECK = ['喵喵', '火花', '水蓝蓝', '大尾鱼', '小翼龙', '冰龙宝宝', '迪莫', '上古战龙', '小帕尔萨斯', '阿布', '超能阿布', '圣龙阿布', '喵呜', '魔力猫', '格兰种子'];
console.log('关键宠核对：');
CHECK.forEach(n => console.log('  ' + n.padEnd(9) + (map[n] ? ('编号 ' + map[n] + ' ✅') : '❌ 图鉴没有此名字')));
ws.close();
