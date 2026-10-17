/* v20 诊断：为什么 TOWNS 空了 */
import { WebSocket } from 'ws';
let seq = 0;
const c = await (await fetch('http://127.0.0.1:9335/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(c.webSocketDebuggerUrl);
const pend = new Map(); const errs = [];
ws.on('message', d => { const m = JSON.parse(String(d)); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); return; } if (m.method === 'Runtime.exceptionThrown') errs.push(String(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || '').slice(0, 300)); });
await new Promise((r, j) => { ws.on('open', r); ws.on('error', j); });
const send = (mm, p = {}) => new Promise((res, rej) => { const id = ++seq; pend.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method: mm, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) return { __err: String(r.exceptionDetails.exception?.description || '').slice(0, 260) }; return r.result?.value; };
const wait = ms => new Promise(r => setTimeout(r, ms));
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Page.navigate', { url: 'http://127.0.0.1:8727/?t=' + Date.now() });
for (let i = 0; i < 45; i++) { await wait(1000); if (await ev("(typeof MW!=='undefined'&&typeof S!=='undefined'&&!!S)?1:0") === 1) break; }
console.log('【加载期异常】' + errs.length + ' 条');
errs.slice(0, 5).forEach(e => console.log('  ❌ ' + e));
console.log('\nTOWNS：' + JSON.stringify(await ev('TOWNS.length')));
console.log('LEAGUE_POS：' + JSON.stringify(await ev('LEAGUE_POS')));
console.log('T.TOWN=' + await ev('T.TOWN') + ' ROCKFLOOR=' + await ev('T.ROCKFLOOR'));
console.log('map 里 TOWN 格数：' + await ev("map.filter(function(v){return v===T.TOWN;}).length"));
console.log('map 里 ROCKFLOOR 格数：' + await ev("map.filter(function(v){return v===T.ROCKFLOOR;}).length"));
console.log('\n【直接重跑一次 genMap 看会不会报错】');
const r = await ev("(function(){ try{ var old=map; var nm=genMap(); return { ok:true, len:nm.length, towns:TOWNS.length }; }catch(e){ return { err:String(e.message).slice(0,200) }; } })()");
console.log(JSON.stringify(r));
console.log('\n【区域采样：矿洞/火山地面是不是 ROCKFLOOR】');
console.log(JSON.stringify(await ev(`(function(){
  var out={};
  [['mine',1],['volcano',1]].forEach(function(it){
    for(var y=2;y<MH-2;y+=3)for(var x=2;x<MW-2;x+=3){
      if(regionAt(x,y)!==it[0]) continue;
      var v=map[y*MW+x];
      var name=Object.keys(T).find(function(k){return T[k]===v;})||v;
      out[it[0]]=out[it[0]]||{};
      out[it[0]][name]=(out[it[0]][name]||0)+1;
    }
  });
  return out;
})()`)));
ws.close();
