/* v27 遇敌频率验证：九地区内部随机游走，实测平均遇敌步数 + 各地区地形构成 */
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

console.log('ENC_RATE = ' + await ev("JSON.stringify(ENC_RATE)"));
const raw = await ev(`(function(){
  var names=Object.keys(REGION_NAME), res={};
  var tnames=Object.keys(T).reduce(function(a,k){a[T[k]]=k;return a;},{});
  names.forEach(function(reg){
    var sx=-1, sy=-1;
    for(var y=2;y<MH-2&&sx<0;y++) for(var x=2;x<MW-2;x++){ if(regionAt(x,y)===reg && !blocked(x,y)){ sx=x; sy=y; break; } }
    if(sx<0){ res[reg]={steps:0,hits:0,walkable:0,tiles:{},note:'找不到起点'}; return; }
    var x=sx,y=sy,steps=0,hits=0,tiles={},walkable=0;
    for(var yy=0;yy<MH;yy++) for(var xx=0;xx<MW;xx++){ if(regionAt(xx,yy)===reg && !blocked(xx,yy)) walkable++; }
    var dirs=[[0,-1],[0,1],[-1,0],[1,0]];
    for(var i=0;i<200000 && steps<6000;i++){
      var d=dirs[Math.floor(Math.random()*4)];
      var nx=x+d[0], ny=y+d[1];
      if(nx<1||ny<1||nx>=MW-1||ny>=MH-1) continue;
      if(regionAt(nx,ny)!==reg) continue;
      if(blocked(nx,ny)) continue;
      x=nx; y=ny; steps++;
      var v=tileAt(x,y); tiles[v]=(tiles[v]||0)+1;
      if(Math.random()<encRateOf(v)) hits++;
    }
    var tl=[]; Object.keys(tiles).sort(function(a,b){return tiles[b]-tiles[a];}).forEach(function(k){ tl.push(tnames[k]+':'+(tiles[k]/steps*100).toFixed(1)+'%'); });
    res[reg]={steps:steps,hits:hits,walkable:walkable,tl:tl.join(' ')};
  });
  return JSON.stringify(res);
})()`);
if (raw && raw.__err) { console.log('ERR: ' + raw.__err); process.exit(1); }
const R = JSON.parse(raw);
console.log('\n== 九地区遇敌实测（地区内随机游走 6000 步）==');
const rows = [];
for (const reg of Object.keys(R)) {
  const o = R[reg];
  const per = o.hits ? (o.steps / o.hits) : Infinity;
  rows.push({ reg, per, o });
}
rows.sort((a, b) => a.per - b.per);
for (const { reg, per, o } of rows) {
  const tag = per === Infinity ? '❌ 永不遇敌' : (per >= 10 && per <= 20 ? '✅' : (per < 10 ? '⚠ 太频繁' : '⚠ 太稀疏'));
  console.log('  ' + reg.padEnd(8) + (isFinite(per) ? String(per.toFixed(1)).padStart(6) + ' 步/次' : '   ∞     ') + ' ' + tag + '  可走格 ' + String(o.walkable).padStart(5) + ' | ' + o.tl);
}
console.log('\n目标区间：10~20 步/次');
ws.close();
