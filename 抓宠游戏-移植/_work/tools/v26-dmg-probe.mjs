/* v26 战斗数值探针：复现「20级火恐龙 喷射火焰 → 56级利牙鱼」并列出公式各因子 */
import { WebSocket } from 'ws';
let seq = 0;
const c = await (await fetch('http://127.0.0.1:9335/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(c.webSocketDebuggerUrl);
const pend = new Map();
ws.on('message', d => { const m = JSON.parse(String(d)); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); } });
await new Promise((r, j) => { ws.on('open', r); ws.on('error', j); });
const send = (mm, p = {}) => new Promise((res, rej) => { const id = ++seq; pend.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method: mm, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) return { __err: String(r.exceptionDetails.exception?.description || '').slice(0, 200) }; return r.result?.value; };
const wait = ms => new Promise(r => setTimeout(r, ms));
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Page.navigate', { url: 'http://127.0.0.1:8727/?t=' + Date.now() });
for (let i = 0; i < 80; i++) { await wait(250); if (await ev("(typeof MW!=='undefined'&&typeof SPECIES!=='undefined')?1:0") === 1) break; }

console.log('— 利牙鱼（pk-319）基础 —');
console.log(await ev("JSON.stringify((function(){var D=byId('pk-319');return {name:D.name,types:typesOf(D),hpRace:hpBaseOf(D),a:D.a,d:D.d,s:D.s,hp56:maxHpAt(D,56),hp44:maxHpAt(D,44),hp40:maxHpAt(D,40)};})())"));

console.log('\n— 用户那场：20级火恐龙 喷射火焰 → 56级利牙鱼 —');
console.log(await ev(`JSON.stringify((function(){
  var A=byId('pk-005'), D=byId('pk-319'), atkLv=20, defLv=56;
  var mv=MOVES['mv17'];
  var e=eff(mv.type,D);
  var statMul=clamp(atkOf(A,atkLv)/Math.max(1,defOf(D,defLv)),0.9,1.6)*0.75;
  var lvB=clamp(0.55+0.055*(atkLv-1),0.55,3.2);
  var fS=0.55+0.45*Math.min(1,Math.max(0,(atkLv-1)/12));
  lvB*=fS;
  var base=mv.power*e*lvB*statMul;
  var dHp=maxHpAt(D,defLv);
  return {atk:A.name,atkLv:atkLv,def:D.name,defLv:defLv,move:mv.name,power:mv.power,e:e,
    atkOf:atkOf(A,atkLv),defOf:defOf(D,defLv),statMul:statMul.toFixed(3),lvBonus:lvB.toFixed(3),
    normal:Math.round(base),normalMax:Math.round(base*1.15),crit:Math.round(base*1.6),critMax:Math.round(base*1.6*1.15),
    defHp:dHp,pctNormal:Math.round(base/dHp*100),pctCrit:Math.round(base*1.6/dHp*100),cap:Math.round(dHp*0.85)};
})())`));

console.log('\n— 反向：56级利牙鱼 打 20级火恐龙 —');
console.log(await ev(`JSON.stringify((function(){
  var A=byId('pk-319'), D=byId('pk-005'), atkLv=56, defLv=20;
  var mv=MOVES['mv31'];
  var e=eff(mv.type,D);
  var statMul=clamp(atkOf(A,atkLv)/Math.max(1,defOf(D,defLv)),0.9,1.6)*0.75;
  var lvB=clamp(0.55+0.055*(atkLv-1),0.55,3.2)*(0.55+0.45*Math.min(1,Math.max(0,(atkLv-1)/12)));
  var base=mv.power*e*lvB*statMul; var dHp=maxHpAt(D,defLv);
  return {move:mv.name,power:mv.power,e:e,statMul:statMul.toFixed(3),lvBonus:lvB.toFixed(3),
    normal:Math.round(base),crit:Math.round(base*1.6),defHp:dHp,pctNormal:Math.round(base/dHp*100)};
})())`));

console.log('\n— 同级基准（20 vs 20 / 56 vs 56）看现有节奏 —');
console.log(await ev(`JSON.stringify((function(){
  function sim(A,D,lv,mvId){var mv=MOVES[mvId];var e=eff(mv.type,D);
    var sm=clamp(atkOf(A,lv)/Math.max(1,defOf(D,lv)),0.9,1.6)*0.75;
    var lb=clamp(0.55+0.055*(lv-1),0.55,3.2)*(0.55+0.45*Math.min(1,Math.max(0,(lv-1)/12)));
    var base=mv.power*e*lb*sm;var dHp=maxHpAt(D,lv);return Math.round(base)+'/'+dHp+'='+Math.round(base/dHp*100)+'%（约'+(dHp/base).toFixed(1)+'回合）';}
  return {L20_火恐龙打利牙鱼:sim(byId('pk-005'),byId('pk-319'),20,'mv17'),
          L56_火恐龙打利牙鱼:sim(byId('pk-005'),byId('pk-319'),56,'mv17'),
          L20_撞击对打:sim(byId('pk-025'),byId('pk-001'),20,'mv1'),
          L56_撞击对打:sim(byId('pk-025'),byId('pk-001'),56,'mv1')};
})())`));

ws.close();
