/* v27 遇敌面统计（面积加权，不受随机游走困城镇影响）
   口径：排除不可走地形(TREE/ROCK/LAVA)与城镇格(TOWN/STREET/GYM/HOSP/LEAGUE)，
        水域计入可走（队伍带水系宠时可达），按各地形面积加权算平均遇敌率。 */
import { WebSocket } from 'ws';
let seq = 0;
const c = await (await fetch('http://127.0.0.1:9335/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(c.webSocketDebuggerUrl);
const pend = new Map();
ws.on('message', d => { const m = JSON.parse(String(d)); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); } });
await new Promise((r, j) => { ws.on('open', r); ws.on('error', j); });
const send = (mm, p = {}) => new Promise((res, rej) => { const id = ++seq; pend.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method: mm, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) return { __err: String(r.exceptionDetails.exception?.description || '').slice(0, 400) }; return r.result?.value; };
const wait = ms => new Promise(r => setTimeout(r, ms));
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Page.navigate', { url: 'http://127.0.0.1:8727/?t=' + Date.now() });
for (let i = 0; i < 120; i++) { await wait(250); if (await ev("(typeof MW!=='undefined'&&typeof map!=='undefined'&&map&&map.length)") === true) break; }

const raw = await ev(`(function(){
  var res={}, tnames=Object.keys(T).reduce(function(a,k){a[T[k]]=k;return a;},{});
  var NOWALK={}; NOWALK[T.TREE]=1; NOWALK[T.ROCK]=1; NOWALK[T.LAVA]=1;
  var TOWNT={}; TOWNT[T.TOWN]=1; TOWNT[T.STREET]=1; TOWNT[T.GYM]=1; TOWNT[T.HOSP]=1; TOWNT[T.LEAGUE]=1;
  Object.keys(REGION_NAME).forEach(function(reg){
    var o={all:0,walk:0,wildWalk:0,townWalk:0,byTile:{},encSum:0,encTiles:0};
    for(var y=0;y<MH;y++) for(var x=0;x<MW;x++){
      if(regionAt(x,y)!==reg) continue;
      var v=tileAt(x,y); o.all++;
      if(NOWALK[v]) continue;
      o.walk++;
      if(TOWNT[v]){ o.townWalk++; continue; }
      o.wildWalk++;
      var nm=tnames[v]; o.byTile[nm]=(o.byTile[nm]||0)+1;
      var er = (typeof encRateOf==='function') ? encRateOf(v) : 0;
      if(er>0) o.encTiles++;
      o.encSum += er;
    }
    o.avg = o.wildWalk ? o.encSum/o.wildWalk : 0;
    o.encShare = o.wildWalk ? o.encTiles/o.wildWalk : 0;
    var tl=[]; Object.keys(o.byTile).sort(function(a,b){return o.byTile[b]-o.byTile[a];}).slice(0,6)
      .forEach(function(k){ tl.push(k+':'+(o.byTile[k]/o.wildWalk*100).toFixed(1)+'%'); });
    o.tl=tl.join(' ');
    delete o.byTile;
    res[reg]=o;
  });
  return JSON.stringify(res);
})()`);
if (raw && raw.__err) { console.log('ERR: ' + raw.__err); process.exit(1); }
const R = JSON.parse(raw);
console.log('== 九地区野外遇敌面（面积加权）==');
const rows = Object.keys(R).map(reg => { const o = R[reg]; return { reg, o, per: o.avg > 0 ? 1 / o.avg : Infinity }; });
rows.sort((a, b) => a.per - b.per);
for (const { reg, o, per } of rows) {
  const tag = per === Infinity ? '❌ 无遇敌地形' : (per >= 10 && per <= 20 ? '✅' : (per < 10 ? '⚠ 偏频繁' : '⚠ 偏稀疏'));
  console.log('  ' + reg.padEnd(8) + (isFinite(per) ? String(per.toFixed(1)).padStart(6) + ' 步/次' : '   ∞      ') + ' ' + tag
    + ' | 野外可走 ' + String(o.wildWalk).padStart(5) + ' · 可遇敌格占比 ' + (o.encShare * 100).toFixed(1) + '% | ' + o.tl);
}
console.log('\n目标：10~20 步/次，且每个地区「可遇敌格占比」> 30%');
ws.close();
