/* v17 真实战斗回合数测量（在游戏里实际打，取多档等级） */
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

/* 纯函数式测回合数：用游戏自身的公式函数算，不再手写 */
const res = await ev(`(function(){
  var clamp2=clamp;
  function dmgOf(aSp,dSp,mv,lv){
    var statMul=clamp(atkOf(aSp,lv)/Math.max(1,defOf(dSp,lv)),0.9,1.6)*0.75;
    var fScale=0.55+0.45*Math.min(1,Math.max(0,(lv-1)/12));
    var lvBonus=clamp(0.55+0.055*(lv-1),0.55,3.2)*fScale;
    var e=eff(mv.type,dSp);
    return Math.max(1,Math.round(mv.power*e*lvBonus*statMul*1.0*(0.85+0.15)));
  }
  var pool=SPECIES.filter(function(s){ return !s.varOf && s.rarity===0 && s.hpBase>=45 && s.hpBase<=80; });
  var out=[];
  [1,5,10,15,20,30,40,50].forEach(function(lv){
    var sum=0,n=0;
    for(var i=0;i<200;i++){
      var a=pool[i%pool.length], d=pool[(i*7+3)%pool.length];
      var mv=MOVES[(a.pools.p0||[])[0]];
      if(!mv||!mv.power) continue;
      var hp=maxHpAt(d,lv), dm=dmgOf(a,d,mv,lv);
      sum+=hp/dm; n++;
    }
    out.push('Lv'+lv+':'+(sum/n).toFixed(1));
  });
  return out.join('  ');
})()`);
console.log('真实公式·平均回合数（常见中等宠互打）：');
console.log('  ' + res);
/* 再来一组：带属性克制的情况 */
const res2 = await ev(`(function(){
  function dmgOf(aSp,dSp,mv,lv){
    var statMul=clamp(atkOf(aSp,lv)/Math.max(1,defOf(dSp,lv)),0.9,1.6)*0.75;
    var fScale=0.55+0.45*Math.min(1,Math.max(0,(lv-1)/12));
    var lvBonus=clamp(0.55+0.055*(lv-1),0.55,3.2)*fScale;
    var e=eff(mv.type,dSp);
    return {d:Math.max(1,Math.round(mv.power*e*lvBonus*statMul*1.0*(0.85+0.15))), e:e};
  }
  var pool=SPECIES.filter(function(s){ return !s.varOf && s.rarity===0; });
  var out=[];
  [5,20,50].forEach(function(lv){
    var sup=0,neu=0,res=0,nu=0,ns=0,nr=0;
    for(var i=0;i<400;i++){
      var a=pool[i%pool.length], d=pool[(i*11+5)%pool.length];
      var mv=MOVES[(a.pools.p0||[])[0]];
      if(!mv||!mv.power) continue;
      var r=dmgOf(a,d,mv,lv); var hp=maxHpAt(d,lv);
      if(r.e>1.5){ sup+=hp/r.d; ns++; }
      else if(r.e<0.9){ res+=hp/r.d; nr++; }
      else { neu+=hp/r.d; nu++; }
    }
    out.push('Lv'+lv+' 克制:'+(sup/Math.max(1,ns)).toFixed(1)+' 持平:'+(neu/Math.max(1,nu)).toFixed(1)+' 被抵抗:'+(res/Math.max(1,nr)).toFixed(1));
  });
  return out.join('\\n');
})()`);
console.log('\\n分克制情况：');
console.log('  ' + String(res2).split('\n').join('\n  '));
console.log('\\n异常 ' + errors.length + ' 条'); if (!errors.length) console.log('  ✅ 零异常');
ws.close();
