/* v21 诊断：城镇间距（是否重叠）+ 当前地面地形 */
import { WebSocket } from 'ws';
let seq = 0;
const c = await (await fetch('http://127.0.0.1:9335/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(c.webSocketDebuggerUrl);
const pend = new Map();
ws.on('message', d => { const m = JSON.parse(String(d)); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); } });
await new Promise((r, j) => { ws.on('open', r); ws.on('error', j); });
const send = (mm, p = {}) => new Promise((res, rej) => { const id = ++seq; pend.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method: mm, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) return { __err: String(r.exceptionDetails.exception?.description || '').slice(0, 160) }; return r.result?.value; };
const wait = ms => new Promise(r => setTimeout(r, ms));
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Page.navigate', { url: 'http://127.0.0.1:8727/?t=' + Date.now() });
for (let i = 0; i < 45; i++) { await wait(1000); if (await ev("(typeof MW!=='undefined'&&typeof S!=='undefined'&&!!S)?1:0") === 1) break; }
console.log('=== 城镇坐标与两两距离（城镇区域 17×13，中心距 <18 就会重叠）===');
const rows = await ev(`(function(){
  var out=[];
  for(var i=0;i<TOWNS.length;i++){
    for(var j=i+1;j<TOWNS.length;j++){
      var a=TOWNS[i], b=TOWNS[j];
      var dx=Math.abs(a.x-b.x), dy=Math.abs(a.y-b.y);
      var overlap=(dx<18&&dy<14);
      out.push(a.name+' ↔ '+b.name+' : 距离 dx='+dx+' dy='+dy+(overlap?'  ❌ 区域重叠':''));
    }
  }
  return out;
})()`) || [];
rows.forEach(r => console.log('  ' + r));
console.log('\n=== 各城镇地面当前地形构成（取城镇 17×13 范围采样）===');
console.log(JSON.stringify(await ev(`(function(){
  var out={};
  TOWNS.forEach(function(t){
    var c={};
    for(var y=t.y-6;y<=t.y+6;y++)for(var x=t.x-8;x<=t.x+8;x++){
      if(x<0||y<0||x>=MW||y>=MH) continue;
      var v=map[y*MW+x];
      var nm=Object.keys(T).find(function(k){return T[k]===v;})||String(v);
      c[nm]=(c[nm]||0)+1;
    }
    out[t.name]=c;
  });
  return out;
})()`), null, 1));
ws.close();
