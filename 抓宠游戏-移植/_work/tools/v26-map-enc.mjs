/* v26 地图地形统计：各地区 TALL(遇敌草丛) / WATER(遇敌水域) 占比 + 平均遇敌步数 */
import { WebSocket } from 'ws';
let seq = 0;
const c = await (await fetch('http://127.0.0.1:9335/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(c.webSocketDebuggerUrl);
const pend = new Map();
ws.on('message', d => { const m = JSON.parse(String(d)); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); } });
await new Promise((r, j) => { ws.on('open', r); ws.on('error', j); });
const send = (mm, p = {}) => new Promise((res, rej) => { const id = ++seq; pend.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method: mm, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) return { __err: String(r.exceptionDetails.exception?.description || '').slice(0, 300) }; return r.result?.value; };
const wait = ms => new Promise(r => setTimeout(r, ms));
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Page.navigate', { url: 'http://127.0.0.1:8727/?t=' + Date.now() });
for (let i = 0; i < 100; i++) { await wait(250); if (await ev("(typeof MW!=='undefined'&&typeof map!=='undefined'&&map&&map.length)") === true) break; }

console.log('地形常量 T = ' + await ev("JSON.stringify(T)"));
console.log('\n== 全图地形分布 ==');
console.log(await ev(`(function(){
  var names=Object.keys(T).reduce(function(a,k){a[T[k]]=k;return a;},{});
  var cnt={}; for(var y=0;y<MH;y++) for(var x=0;x<MW;x++){ var v=map[y*MW+x]; cnt[v]=(cnt[v]||0)+1; }
  var tot=MW*MH, out=[];
  Object.keys(cnt).sort(function(a,b){return cnt[b]-cnt[a];}).forEach(function(k){ out.push(names[k]+' '+cnt[k]+'('+(cnt[k]/tot*100).toFixed(2)+'%)'); });
  return out.join(' | ');
})()`));
console.log('\n== 各地区 TALL / WATER 占比（决定该地区能不能遇到怪）==');
console.log(await ev(`(function(){
  var res={}, tot={};
  for(var y=0;y<MH;y++) for(var x=0;x<MW;x++){
    var v=map[y*MW+x], reg=regionAt(x,y);
    if(!res[reg]){ res[reg]={all:0,tall:0,water:0,grass:0,tree:0}; }
    res[reg].all++;
    if(v===T.TALL) res[reg].tall++;
    else if(isWaterTile(v)) res[reg].water++;
    else if(v===T.GRASS) res[reg].grass++;
    else if(v===T.TREE) res[reg].tree++;
  }
  var out=[];
  Object.keys(res).forEach(function(r){
    var o=res[r];
    var encRate=o.tall/o.all*0.20 + o.water/o.all*0.16;
    out.push(r+' 总'+o.all+' | 高草 '+o.tall+'('+(o.tall/o.all*100).toFixed(1)+'%) 水域 '+o.water+'('+(o.water/o.all*100).toFixed(1)+'%) 草地 '+o.grass+' 树 '+o.tree
      +' | 随机游走平均遇敌 '+(encRate>0?(1/encRate).toFixed(0)+' 步':'永不遇敌'));
  });
  return out.join('\\n');
})()`));
/* 出生点周边实际采样：模拟随机游走 3000 步统计遇敌次数 */
console.log('\n== 出生点(平原)随机游走 3000 步的遇敌统计 ==');
console.log(await ev(`(function(){
  var dirs=[[0,-1],[0,1],[-1,0],[1,0]];
  var hits=0, steps=0, x=SPAWN.x, y=SPAWN.y, tiles={};
  for(var i=0;i<3000;i++){
    var d=dirs[Math.floor(Math.random()*4)];
    var nx=x+d[0], ny=y+d[1];
    if(nx<0||ny<0||nx>=MW||ny>=MH||blocked(nx,ny)) continue;
    x=nx; y=ny; steps++;
    var v=tileAt(x,y); tiles[v]=(tiles[v]||0)+1;
    if(v===T.TALL && Math.random()<0.20) hits++;
    else if(isWaterTile(v) && Math.random()<0.16) hits++;
  }
  return '走了 '+steps+' 步，遇敌 '+hits+' 次 → 平均 '+(hits?(steps/hits).toFixed(1):'∞')+' 步一次';
})()`));
ws.close();
