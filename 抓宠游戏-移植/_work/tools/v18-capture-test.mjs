/* v18 验证：捕获后等级 = 遇到的野怪等级（用户报的"打的和抓的不是一个等级"） */
import { WebSocket } from 'ws';
let seq = 0;
const created = await (await fetch('http://127.0.0.1:9335/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(created.webSocketDebuggerUrl);
const pending = new Map(); const errors = [];
ws.on('message', d => { const m = JSON.parse(String(d)); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); return; } if (m.method === 'Runtime.exceptionThrown') errors.push(String(m.params.exceptionDetails?.exception?.description || '').slice(0, 150)); });
await new Promise((r, j) => { ws.on('open', r); ws.on('error', j); });
const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async (expr) => { const rr = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (rr.exceptionDetails) return null; return rr.result?.value; };
const wait = ms => new Promise(r => setTimeout(r, ms));
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await send('Page.navigate', { url: 'http://47.105.123.182:8727/?t=' + Date.now() });
for (let i = 0; i < 25; i++) { await wait(1000); if (await ev("(typeof MW!=='undefined'&&typeof S!=='undefined'&&!!S)?1:0") === 1) break; }
await ev('(function(){ try{ localStorage.clear(); }catch(e){} return 1; })()');
await send('Page.navigate', { url: 'http://47.105.123.182:8727/?t=' + Date.now() });
for (let i = 0; i < 25; i++) { await wait(1000); if (await ev("(typeof MW!=='undefined'&&typeof S!=='undefined'&&!!S)?1:0") === 1) break; }
await ev("document.getElementById('btn-start').click()"); await wait(2800);
await ev("(function(){ document.querySelector('#starter-grid .st-card').click(); return 1; })()"); await wait(3200);

/* 反复：开战 → 把野怪压到残血 → 丢球抓 → 检查新宠等级是否等于野怪等级 */
const result = await ev(`(async function(){
  var out=[];
  var p=selfPet(); p.lv=25; p.hp=maxHpOf(p);
  for(var t=0;t<6;t++){
    var sp=SPECIES.filter(function(s){ return !s.varOf && s.rarity===0 && s.hpBase<=70; })[t*3%40];
    if(!sp) continue;
    try{ startWildBattle({sp:sp.id, lv:12}); }catch(e){ out.push('开战失败 '+e.message.slice(0,40)); break; }
    await new Promise(function(r){setTimeout(r,300);});
    if(!B){ out.push('没有进入战斗'); break; }
    var foeLv=B.foe.lv, foeName=B.esp.name;
    /* 压到残血，提高捕获率 */
    B.ehp=1;
    var caught=false;
    for(var b=0;b<3 && !caught;b++){
      var before=S.party.length+S.box.length;
      try{ throwBall(b); }catch(e){ out.push('丢球失败 '+e.message.slice(0,40)); break; }
      await new Promise(function(r){setTimeout(r,700);});
      if(S.party.length+S.box.length>before) caught=true;
    }
    if(caught){
      var pet=S.party[S.party.length-1];
      var all=S.party.concat(S.box);
      var newest=all[all.length-1];
      out.push((foeName||'?')+' 遇到时 Lv'+foeLv+' → 抓到手里 Lv'+newest.lv+(newest.lv===foeLv?' ✅ 一致':' ❌ 不一致'));
    }else{
      out.push((foeName||'?')+' Lv'+foeLv+' 这次没抓到');
      try{ closeBattle(); }catch(e){}
    }
    await new Promise(function(r){setTimeout(r,400);});
    try{ if(B) closeBattle(); }catch(e){}
  }
  return out;
})()`);
console.log('=== 捕获等级验证（公网实测）===');
(result || []).forEach(l => console.log('  ' + l));
console.log('\n异常 ' + errors.length + ' 条'); if (!errors.length) console.log('  ✅ 零异常');
ws.close();
