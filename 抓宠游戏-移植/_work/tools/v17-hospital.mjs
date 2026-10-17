/* 医院治疗真实链路复现（不人为破坏 p.pp） */
import { WebSocket } from 'ws';
let seq = 0;
const created = await (await fetch('http://127.0.0.1:9335/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(created.webSocketDebuggerUrl);
const pending = new Map(); const errors = [];
ws.on('message', d => { const m = JSON.parse(String(d)); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); return; } if (m.method === 'Runtime.exceptionThrown') errors.push(String(m.params.exceptionDetails?.exception?.description || '').slice(0, 160)); });
await new Promise((r, j) => { ws.on('open', r); ws.on('error', j); });
const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async (expr) => { const rr = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (rr.exceptionDetails) return { __err: String(rr.exceptionDetails.exception?.description || '').slice(0, 200) }; return rr.result?.value; };
const wait = ms => new Promise(r => setTimeout(r, ms));
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Page.navigate', { url: 'http://47.105.123.182:8727/?t=' + Date.now() });
await wait(9000);
await ev(`(function(){ try{ localStorage.clear(); }catch(e){} return 1; })()`);
await send('Page.navigate', { url: 'http://47.105.123.182:8727/?t=' + Date.now() });
await wait(9000);
await ev(`document.getElementById('btn-start').click()`);
await wait(2500);
await ev(`(function(){ document.querySelector('#starter-grid .st-card').click(); return 1; })()`);
await wait(3000);

/* 1) 正常受伤（扣 HP 与 PP） */
const before = await ev(`(function(){
  var p=selfPet();
  p.hp=Math.max(1, Math.floor(maxHpOf(p)*0.3));
  Object.keys(p.pp||{}).forEach(function(k){ p.pp[k]=Math.max(0, Math.floor(p.pp[k]/2)); });
  return { hp:p.hp+'/'+maxHpOf(p), pp:JSON.stringify(p.pp), ppIsNull:(p.pp===null), ppLow: ppLow(p) };
})()`);
console.log('治疗前：' + JSON.stringify(before));
const healed = await ev(`(function(){
  try{ treatOne(selfPet()); return { ok:true, hp:selfPet().hp+'/'+maxHpOf(selfPet()), pp:JSON.stringify(selfPet().pp), ppFull:Object.keys(selfPet().pp||{}).every(function(k){ return selfPet().pp[k]===MOVES[k].pp; }) }; }
  catch(e){ return { err:String(e.message).slice(0,160) }; }
})()`);
console.log('治疗后：' + JSON.stringify(healed));
/* 2) 快捷回血（花钱） */
const quick = await ev(`(function(){
  try{
    var p=selfPet(); S.coins=200; p.hp=Math.max(1,Math.floor(maxHpOf(p)*0.4));
    var before=S.coins;
    quickHeal(p);
    return { ok:true, coins:before+'→'+S.coins, hp:p.hp+'/'+maxHpOf(p) };
  }catch(e){ return { err:String(e.message).slice(0,160) }; }
})()`);
console.log('快捷回血：' + JSON.stringify(quick));
/* 3) 满血时再治疗（应提示已满） */
const full = await ev(`(function(){
  try{ treatOne(selfPet()); return { ok:true, toast:(document.getElementById('toast')||{}).textContent||'' }; }
  catch(e){ return { err:String(e.message).slice(0,160) }; }
})()`);
console.log('满血再治疗：' + JSON.stringify(full));
console.log('\n未捕获异常 ' + errors.length + ' 条'); errors.slice(0, 4).forEach(e => console.log('  ❌ ' + e));
if (!errors.length) console.log('  ✅ 零异常 —— 医院链路正常');
ws.close();
