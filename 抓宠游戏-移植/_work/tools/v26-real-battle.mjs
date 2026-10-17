/* v26 真实战斗实测：走游戏真实 applyMove，测不同等级差的伤害与回合数 */
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
for (let i = 0; i < 80; i++) { await wait(250); if (await ev("(typeof MW!=='undefined'&&typeof SPECIES!=='undefined')?1:0") === 1) break; }

/* 真实战斗：玩家 A(lvA) 用 mvId 打 野生 D(lvD)，重复 5 次取中位 */
const CASE = `(function(Aid,Did,lvA,lvD,mvId,rounds){
  var out=[];
  for(var k=0;k<(rounds||6);k++){
    var a=newPet(Aid); a.lv=lvA; a.hp=maxHpOf(a); ensureMoves(a);
    S.party=[a]; S.box=[]; S.lead=0;
    var d={sp:byId(Did), lv:lvD, hp:maxHpAt(byId(Did),lvD), trait:0};
    try{ startWildBattle(d); }catch(e){ return {err:'startWildBattle:'+String(e.message)}; }
    var before=B.ehp, aHpBefore=maxHpOf(a);
    var mv=MOVES[mvId];
    var lines=applyMove(mv, leadSp(), B.esp, true);
    out.push({dmg:before-B.ehp, emax:B.emax, fainted:B.ehp<=0, myMax:aHpBefore});
  }
  var dmg=out.map(function(o){return o.dmg;}).sort(function(x,y){return x-y;});
  var med=dmg[Math.floor(dmg.length/2)], emax=out[0].emax;
  return {foe:byId(Did).name, foeMaxHp:emax, dmgMin:dmg[0], dmgMed:med, dmgMax:dmg[dmg.length-1],
          pctMed:Math.round(med/emax*100), turnsToKill:+(emax/med).toFixed(2), myMaxHp:out[0].myMax};
})`;

const cases = [
  ['pk-025', 'pk-001', 20, 20, 'mv1', '20级撞击 20级'],
  ['pk-025', 'pk-001', 20, 56, 'mv1', '20级撞击 56级'],
  ['pk-025', 'pk-001', 56, 20, 'mv1', '56级撞击 20级'],
  ['pk-025', 'pk-001', 56, 56, 'mv1', '56级撞击 56级'],
  ['pk-005', 'pk-319', 20, 56, 'mv17', '20级火恐龙喷射火焰 56级巨牙鲨'],
  ['pk-005', 'pk-319', 56, 56, 'mv17', '56级火恐龙喷射火焰 56级巨牙鲨'],
  ['kz-025', 'kz-001', 20, 20, 'mv1', '20级洛克撞击 20级洛克'],
];
for (const [a, d, la, ld, mv, label] of cases) {
  const r = await ev(`${CASE}('${a}','${d}',${la},${ld},'${mv}',6)`);
  console.log(label + ' → ' + (typeof r === 'string' ? r : JSON.stringify(r)));
}
ws.close();
