/* v26 平衡扫描：各等级段同级对战回合数 + 等级差曲线 */
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

/* 用若干组常见宠对打，同一等级，取真实 applyMove 伤害 ÷ 血量 = 回合数 */
const PAIRS = [['pk-025', 'pk-001'], ['pk-006', 'pk-009'], ['pk-003', 'pk-065'], ['kz-004', 'kz-007'], ['pk-149', 'pk-143']];
for (const lv of [1, 5, 10, 20, 30, 40, 50, 60, 80, 100]) {
  const out = [];
  for (const [a, d] of PAIRS) {
    const r = await ev(`(function(){
      var A=byId('${a}'), D=byId('${d}'), lv=${lv};
      var p=newPet('${a}'); p.lv=lv; p.hp=maxHpOf(p); ensureMoves(p);
      S.party=[p]; S.box=[]; S.lead=0;
      startWildBattle({sp:D, lv:lv, hp:maxHpAt(D,lv), trait:0});
      var mv=null; for(var i=0;i<p.moves.length;i++){ var m=MOVES[p.moves[i]]; if(m&&m.power>0&&m.power<=60){ mv=m; break; } }
      if(!mv){ for(var i=0;i<p.moves.length;i++){ var m2=MOVES[p.moves[i]]; if(m2&&m2.power>0){ mv=m2; break; } } }
      if(!mv) return null;
      var before=B.ehp, dmgTot=0;
      for(var k=0;k<5;k++){ B.ehp=B.emax; var b2=B.ehp; applyMove(mv, leadSp(), B.esp, true); dmgTot+=(b2-B.ehp); }
      var avg=dmgTot/5;
      return {hp:B.emax, dmg:Math.round(avg), turns:+(B.emax/avg).toFixed(1), mv:mv.name};
    })()`);
    if (r && !r.__err) out.push(r.turns);
  }
  const avg = out.length ? (out.reduce((x, y) => x + y, 0) / out.length).toFixed(1) : '?';
  console.log('Lv' + String(lv).padEnd(4) + ' 同级回合数 ' + avg + '  （各组: ' + out.join(', ') + '）');
}
console.log('\n— 等级差曲线（攻击方 lvA 打 守方 lvB，同一物种对，看伤害/血量）—');
for (const [la, lb] of [[20, 20], [20, 26], [20, 35], [20, 56], [35, 20], [56, 20], [56, 56], [80, 56], [100, 50]]) {
  const r = await ev(`(function(){
    var A=byId('pk-025'), D=byId('pk-001');
    var p=newPet('pk-025'); p.lv=${la}; p.hp=maxHpOf(p); ensureMoves(p);
    S.party=[p]; S.box=[]; S.lead=0;
    startWildBattle({sp:D, lv:${lb}, hp:maxHpAt(D,${lb}), trait:0});
    var mv=MOVES['mv1'], tot=0;
    for(var k=0;k<8;k++){ B.ehp=B.emax; var b2=B.ehp; applyMove(mv, leadSp(), B.esp, true); tot+=(b2-B.ehp); }
    var avg=tot/8;
    return {dmg:Math.round(avg), hp:B.emax, pct:Math.round(avg/B.emax*100)+'%', turns:+(B.emax/avg).toFixed(1)};
  })()`);
  console.log('  Lv' + String(la).padEnd(4) + '→Lv' + String(lb).padEnd(4) + ' ' + JSON.stringify(r));
}
ws.close();
