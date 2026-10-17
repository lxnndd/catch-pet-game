/* v17 进化触发验证：灌经验到阈值，看是否进化 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { WebSocket } from 'ws';
const URL_ = process.argv[2] || 'http://127.0.0.1:8727/';
const PORT = process.argv[3] || '9335';
let seq = 0;
const created = await (await fetch('http://127.0.0.1:' + PORT + '/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(created.webSocketDebuggerUrl);
const pending = new Map(); const errors = [];
ws.on('message', d => { const m = JSON.parse(String(d)); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); return; } if (m.method === 'Runtime.exceptionThrown') errors.push('EXC: ' + String(m.params.exceptionDetails?.exception?.description || '').slice(0, 160)); });
await new Promise((r, j) => { ws.on('open', r); ws.on('error', j); });
const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async (expr) => { const rr = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (rr.exceptionDetails) return { __err: String(rr.exceptionDetails.exception?.description || '').slice(0, 200) }; return rr.result?.value; };
const wait = ms => new Promise(r => setTimeout(r, ms));
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Page.navigate', { url: URL_ + '?t=' + Date.now() });
await wait(8000);
await ev(`(function(){ try{ localStorage.clear(); }catch(e){} return 1; })()`);
await send('Page.navigate', { url: URL_ + '?t=' + Date.now() });
await wait(8000);
await ev(`document.getElementById('btn-start').click()`);
await wait(2500);
await ev(`(function(){ var c=document.querySelector('#starter-grid .st-card'); if(c) c.click(); return 1; })()`);
await wait(2800);

console.log('=== 进化表演示（前 8 条）===');
console.log(await ev(`(function(){
  var out=[];
  var names=['妙蛙种子','小火龙','杰尼龟','绿毛虫','独角虫','波波','小拉达','凯西'];
  names.forEach(function(n){
    var sp=SPECIES.find(function(s){return s.name===n;});
    if(!sp) return;
    var e=EVO[sp.id];
    out.push(n+'('+sp.id+') → '+(e? (typeof e.to==='string'? (byId(e.to)||{}).name : e.to.map(function(t){return (byId(t)||{}).name;}).join('/')) + ' @Lv' + e.lv + ' how=' + e.how : '不进化'));
  });
  return out.join('\\n');
})()`));
/* 灌经验到 20 级，看是否进化 */
const evo = await ev(`(function(){
  var p=selfPet();
  var before=byId(p.sp).name;
  var steps=[];
  for(var i=0;i<200 && p.lv<20;i++){
    gainExp(p, 30);
    var cur=byId(p.sp).name;
    if(cur!==before){ steps.push('Lv'+p.lv+'：'+before+' → '+cur); before=cur; }
  }
  return { finalLv:p.lv, finalName:byId(p.sp).name, steps:steps, hp:p.hp+'/'+maxHpOf(p), moves:movesOf(p).map(function(id){return MOVES[id].name;}) };
})()`);
console.log('\n=== 灌经验到 20 级 ===');
console.log(JSON.stringify(evo, null, 1));
console.log('\n异常 ' + errors.length + ' 条'); errors.slice(0, 3).forEach(e => console.log('  ❌ ' + e));
if (!errors.length) console.log('  ✅ 零异常');
ws.close();
