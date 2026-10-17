/* 确认战斗日志元素与多回合日志 */
import { WebSocket } from 'ws';
let seq = 0;
const created = await (await fetch('http://127.0.0.1:9335/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(created.webSocketDebuggerUrl);
const pending = new Map(); const errors = [];
ws.on('message', d => { const m = JSON.parse(String(d)); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); return; } if (m.method === 'Runtime.exceptionThrown') errors.push(String(m.params.exceptionDetails?.exception?.description || '').slice(0, 150)); });
await new Promise((r, j) => { ws.on('open', r); ws.on('error', j); });
const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async (expr) => { const rr = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (rr.exceptionDetails) return { __err: String(rr.exceptionDetails.exception?.description || '').slice(0, 180) }; return rr.result?.value; };
const wait = ms => new Promise(r => setTimeout(r, ms));
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Page.navigate', { url: 'http://47.105.123.182:8727/?t=' + Date.now() });
await wait(9000);
await ev(`(function(){ try{ localStorage.clear(); }catch(e){} return 1; })()`);
await send('Page.navigate', { url: 'http://47.105.123.182:8727/?t=' + Date.now() });
await wait(9000);
await ev(`document.getElementById('btn-start').click()`); await wait(2500);
await ev(`(function(){ document.querySelector('#starter-grid .st-card').click(); return 1; })()`); await wait(3000);
/* 用一只耐打的对手（高 HP）保证多回合 */
const setup = await ev(`(function(){
  var foe = SPECIES.filter(function(s){ return !s.varOf && s.hpBase>=120; })[0];
  try{ p=selfPet(); p.lv=30; p.hp=maxHpOf(p); startWildBattle({sp:foe.id, lv:30}); return { foe:foe.name, hp:foe.hpBase }; }catch(e){ return {err:String(e.message).slice(0,140)}; }
})()`);
await wait(2600);
console.log('对手：' + JSON.stringify(setup));
const log1 = await ev(`(function(){ var l=document.getElementById('battle-log'); return { exists:!!l, len:l?l.textContent.length:0, text:l?l.textContent.replace(/\\s+/g,' ').slice(-110):'' }; })()`);
console.log('开战日志：' + JSON.stringify(log1));
const turns = await ev(`(async function(){
  var out=[];
  for(var t=0;t<5;t++){
    var b=[...document.querySelectorAll('#move-row button')].find(function(x){return !x.disabled;});
    if(!b){ out.push('无可用技能'); break; }
    var name=b.textContent.replace(/\\s+/g,' ').trim().split(' ')[1]||'';
    b.click();
    await new Promise(function(r){setTimeout(r,2400);});
    var st=document.getElementById('screen-battle');
    if(!st||st.classList.contains('hidden')){ out.push('战斗结束'); break; }
    var l=document.getElementById('battle-log');
    out.push((l?l.textContent.replace(/\\s+/g,' ').slice(-80):'无日志'));
  }
  return out;
})()`);
console.log('\n回合日志：');
(turns || []).forEach((t, i) => console.log('  第' + (i + 1) + '回合：' + t));
console.log('\n异常 ' + errors.length + ' 条'); errors.slice(0, 3).forEach(e => console.log('  ❌ ' + e));
if (!errors.length) console.log('  ✅ 零异常');
ws.close();
