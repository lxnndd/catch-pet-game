/* v92 调查：① 稀有度占比与权重建议 ② 洛克招式效果 ③ 变身（百变怪）
   用法：node v92-probe.mjs [url] [cdpPort] */
import { WebSocket } from 'ws';
const URL_BASE = process.argv[2] || 'http://127.0.0.1:8728/';
const CDP_PORT = process.argv[3] || '9335';
let seq = 0;
const c = await (await fetch('http://127.0.0.1:' + CDP_PORT + '/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(c.webSocketDebuggerUrl);
const pend = new Map();
ws.on('message', d => { const m = JSON.parse(String(d)); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); } });
await new Promise((r, j) => { ws.on('open', r); ws.on('error', j); });
const send = (mm, p = {}) => new Promise((res, rej) => { const id = ++seq; pend.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method: mm, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) return { __err: String(r.exceptionDetails.exception?.description || '').slice(0, 400) }; return r.result?.value; };
const wait = ms => new Promise(r => setTimeout(r, ms));
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Page.navigate', { url: URL_BASE + '?t=' + Date.now() });
for (let i = 0; i < 200; i++) { await wait(250); if (await ev("(typeof SPECIES!=='undefined'&&SPECIES.length>1000&&typeof RARITY_W!=='undefined')")) break; }

console.log('══ ① 稀有度占比与刷新权重 ══');
const r1 = await ev(`(function(){
  var c={0:0,1:0,2:0}, kz={0:0,1:0,2:0};
  SPECIES.forEach(function(s){ c[s.rarity]=(c[s.rarity]||0)+1; if(s.kz) kz[s.rarity]=(kz[s.rarity]||0)+1; });
  var tot=SPECIES.length;
  var w=RARITY_W.slice();
  /* 当前权重下，神兽占刷新池的比例 */
  var num=c[2]*w[2], den=c[0]*w[0]+c[1]*w[1]+c[2]*w[2];
  var cur = den? (num/den*100) : 0;
  /* 反推：要让神兽占 p%，权重该是多少（n0 固定 1） */
  function wFor(p){
    var n0=c[0], n2=c[2];
    return (p/100*n0)/(n2*(1-p/100));
  }
  return {c:c, kz:kz, tot:tot, w:w, cur:+cur.toFixed(2),
          pct:{p2:+(c[2]/tot*100).toFixed(2), p0:+(c[0]/tot*100).toFixed(2)},
          suggest:{ '1%':+wFor(1).toFixed(3), '0.5%':+wFor(0.5).toFixed(3), '0.2%':+wFor(0.2).toFixed(4), '0.1%':+wFor(0.1).toFixed(4) }};
})()`);
if (r1.__err) console.log('失败: ' + r1.__err);
else {
  console.log('  宠物总数 ' + r1.tot + '：普通 ' + r1.c[0] + '（' + r1.pct.p0 + '%）· 稀有 ' + r1.c[1] + ' · 传说/幻之 ' + r1.c[2] + '（' + r1.pct.p2 + '%）');
  console.log('  其中洛克宠物：普通 ' + r1.kz[0] + ' · 稀有 ' + r1.kz[1] + ' · 传说 ' + r1.kz[2]);
  console.log('  当前权重 ' + JSON.stringify(r1.w) + ' → 神兽占刷新池 **' + r1.cur + '%**');
  console.log('  要把神兽压到：');
  Object.keys(r1.suggest).forEach(k => console.log('     ' + k.padEnd(6) + ' → RARITY_W[2] = ' + r1.suggest[k]));
}

console.log('\n══ ② 洛克招式效果 ══');
const r2 = await ev(`(function(){
  var kzMoves={}, kzPets=0;
  SPECIES.forEach(function(s){
    if(!s.kz) return;
    kzPets++;
    (s.moves||[]).forEach(function(id){ kzMoves[id]=1; });
    var keys=s.pools?Object.keys(s.pools):[];
    keys.forEach(function(k){ (s.pools[k]||[]).forEach(function(id){ kzMoves[id]=1; }); });
  });
  var ids=Object.keys(kzMoves);
  var noFx=[], withFx=[];
  ids.forEach(function(id){
    var mv=MOVES[id]; if(!mv) return;
    var fx=fxOf(mv);
    (fx?withFx:noFx).push(mv.name+(fx?('→'+JSON.stringify(fx).slice(0,42)):''));
  });
  return {kzPets:kzPets, total:ids.length, noFxN:noFx.length, withFxN:withFx.length,
          noFx:noFx.slice(0,30), withFx:withFx.slice(0,10)};
})()`);
if (r2.__err) console.log('失败: ' + r2.__err);
else {
  console.log('  洛克宠物 ' + r2.kzPets + ' 只 · 涉及招式 ' + r2.total + ' 条');
  console.log('  有效果 ' + r2.withFxN + ' 条 · **没效果 ' + r2.noFxN + ' 条**');
  console.log('  有效果的样例：' + r2.withFx.slice(0, 6).join(' · '));
  console.log('  没效果的（前 30）：' + r2.noFx.join(' · '));
}

console.log('\n══ ③ 变身 / 百变怪 ══');
const r3 = await ev(`(function(){
  function idOf(nm){ var r=null; Object.keys(MOVES).forEach(function(k){ if(MOVES[k].name===nm) r=k; }); return r; }
  var ditto=null; SPECIES.forEach(function(s){ if(s.name==='百变怪') ditto=s; });
  var id=idOf('变身');
  return {ditto:ditto?{id:ditto.id,rarity:ditto.rarity,moves:ditto.moves,pools:ditto.pools,base:ditto.base}:null,
          hasTransform:!!id, fx:id?JSON.stringify(fxOf(MOVES[id])):null,
          transformInMoves: ditto? (ditto.moves||[]).indexOf(id)>=0 : null};
})()`);
if (r3.__err) console.log('失败: ' + r3.__err);
else {
  console.log('  百变怪：' + (r3.ditto?JSON.stringify(r3.ditto):'（没有这只宠）'));
  console.log('  「变身」招式存在=' + r3.hasTransform + ' · MOVE_FX=' + r3.fx + ' · 在百变怪招表里=' + r3.transformInMoves);
}

ws.close();
process.exit(0);
