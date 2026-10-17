/* 追查：训练师战打倒一只后为何不换下一只 */
import { WebSocket } from 'ws';
const URL_ = process.argv[2] || 'http://127.0.0.1:8727/';
const CDP = 'http://127.0.0.1:' + (process.argv[3] ?? '9335');
const created = await (await fetch(`${CDP}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(created.webSocketDebuggerUrl);
let seq = 0; const pending = new Map(); const errs = [];
ws.on('message', d => {
  const m = JSON.parse(String(d));
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); }
  else if (m.method === 'Runtime.exceptionThrown') errs.push(String(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text).slice(0, 300));
});
await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) return 'JS_ERROR: ' + String(r.exceptionDetails.exception?.description || r.exceptionDetails.text).slice(0, 300); return r.result?.value; };
const wait = ms => new Promise(r => setTimeout(r, ms));

await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Page.navigate', { url: URL_ + '?t=' + Date.now() }); await wait(4500);
await ev('localStorage.clear()');
await send('Page.navigate', { url: URL_ + '?t=' + Date.now() }); await wait(4000);
await ev('document.querySelector("#btn-start").click()'); await wait(900);
await ev('document.querySelectorAll("#starter-grid .st-card")[0].click()'); await wait(1500);

/* 起训练师战 */
console.log('版本自检 enemyFainted:', String(await ev('enemyFainted.toString().slice(0,200)')).replace(/\s+/g, ' '));
console.log('版本自检 renderItemRow:', String(await ev('renderItemRow.toString().slice(0,120)')).replace(/\s+/g, ' '));
console.log('开战:', await ev(`(()=>{try{ beginTrainerBattle(TRAINERS[3]); return "mode="+B.mode+" ehp="+B.ehp+" idx="+TB.idx; }catch(e){ return "ERR:"+e.message; }})()`));
await wait(600);
console.log('开战后 B.mode:', await ev('B?B.mode:"null"'), '| TB:', await ev('TB?TB.t.name+"/"+TB.team.length+"/idx"+TB.idx:"null"'));

/* 给关键函数打点 */
console.log('打点:', await ev(`(()=>{
  window.__ev=[];
  ['playerStrike','enemyFainted','nextTrainerFoe','closeBattle','tickBoard','applyMove'].forEach(function(n){
    var orig=window[n];
    if(typeof orig!=="function"){ window.__ev.push("MISSING:"+n); return; }
    window[n]=function(){ window.__ev.push(n+"("+Array.prototype.slice.call(arguments).map(function(a){return typeof a==="object"?(a&&a.name?a.name:"obj"):String(a);}).join(",")+")"); return orig.apply(this,arguments); };
  });
  return "ok "+window.__ev.length;
})()`));

console.log('压到 1 HP 并出手:', await ev(`(()=>{ B.busy=false; B.ehp=1; var mid=leadSp().moves[0]; B.sPP[mid]=99; window.__mid=mid; playerStrike(mid); return "struck "+mid; })()`));
await wait(2000);
console.log(' 1s 后 ehp:', await ev('B?B.ehp:"null"'), '| idx:', await ev('TB?TB.idx:"null"'));
await wait(3000);
console.log(' 4s 后 ehp:', await ev('B?B.ehp:"null"'), '| idx:', await ev('TB?TB.idx:"null"'));
console.log(' 事件序列:', await ev('JSON.stringify(window.__ev)'));
console.log(' 日志文本:', String(await ev('document.getElementById("battle-log").textContent')).replace(/\n/g, ' | '));
console.log(' 再手动调一次 enemyFainted:', await ev(`(()=>{try{ B.busy=false; enemyFainted(); return "ok idx="+TB.idx; }catch(e){ return "ERR:"+e.message; }})()`));
await wait(1200);
console.log(' 之后 idx:', await ev('TB?TB.idx:"null"'), '| ehp:', await ev('B?B.ehp:"null"'), '| 事件:', await ev('JSON.stringify(window.__ev.slice(-6))'));
console.log('异常:', errs.length ? errs.join(' ;; ') : '（无）');
process.exit(0);
