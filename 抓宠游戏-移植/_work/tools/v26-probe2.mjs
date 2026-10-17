/* v26 因子探针：定位 20→20 与 20→26 的伤害差异来源 */
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

console.log('=== 直接按公式拆解（不跑战斗） ===');
console.log(await ev(`JSON.stringify((function(){
  function factor(Aid,Did,la,lb){
    var A=byId(Aid), D=byId(Did);
    var atkO=atkOf(A,la), defO=defOf(D,lb);
    var ratio=atkO/defO, cl=clamp(ratio,0.9,1.6);
    var statMul=cl*DMG_K;
    var lvB=clamp(0.55+0.055*(la-1),0.55,4.2)*(0.75+0.25*Math.min(1,Math.max(0,(la-1)/12)));
    var lvPress=clamp(0.5+0.5*(Math.max(1,la)/Math.max(1,lb)),0.5,2.0);
    var base=50*1*lvB*statMul*lvPress;
    return {pair:Aid+'/'+Did,la:la,lb:lb,atkO:atkO,defO:defO,ratio:+ratio.toFixed(3),clamped:+cl.toFixed(3),
            statMul:+statMul.toFixed(4),lvB:+lvB.toFixed(3),lvPress:+lvPress.toFixed(3),base:+base.toFixed(1),foeHp:maxHpAt(D,lb)};
  }
  return [factor('pk-025','pk-001',20,20),factor('pk-025','pk-001',20,26),factor('pk-025','pk-001',20,35)];
})())`, ));

console.log('\n=== 真实 applyMove（各 10 次取分布，看是否受随机 trait / 暴击影响） ===');
console.log(await ev(`JSON.stringify((function(){
  function run(lb){
    var p=newPet('pk-025'); p.lv=20; p.hp=maxHpOf(p); ensureMoves(p);
    S.party=[p]; S.box=[]; S.lead=0;
    var D=byId('pk-001');
    startWildBattle({sp:D, lv:lb, hp:maxHpAt(D,lb), trait:0});
    var arr=[];
    for(var k=0;k<10;k++){ B.ehp=B.emax; var b2=B.ehp; applyMove(MOVES['mv1'], leadSp(), B.esp, true); arr.push(b2-B.ehp); }
    return {lb:lb, dmg:arr, hp:B.emax, myTrait:p.trait, myTraitObj:trOf(p.trait), myAtk:atkOf(byId(p.sp),20), eTrait:B.etrait, eTraitObj:trOf(B.etrait)};
  }
  return [run(20),run(26)];
})())`));
ws.close();
