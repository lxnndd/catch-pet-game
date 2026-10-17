/* v53 验证：新手期野怪等级分布是否对称（用户反馈「好像只有高于自身的」）
   检查三件事：
     ① ri(lo,hi) 本身是否均匀
     ② 单只 Lv9 的队伍：1000 次遇敌的等级分布（期望 6~12 大致均匀）
     ③ 队伍里带一只高等级宠时：野怪是否按「队伍最高」抬高（这会让玩家感觉总是偏高）
   用法：node v53-dist.mjs [url] [cdpPort] */
import { WebSocket } from 'ws';
const URL_BASE = process.argv[2] || 'http://127.0.0.1:8728/';
const CDP_PORT = process.argv[3] || '9335';
let seq = 0, pass = 0, fail = 0; const fails = [];
const c = await (await fetch('http://127.0.0.1:' + CDP_PORT + '/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(c.webSocketDebuggerUrl);
const pend = new Map(); const errs = [];
ws.on('message', d => {
  const m = JSON.parse(String(d));
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); return; }
  if (m.method === 'Runtime.exceptionThrown') errs.push(String(m.params?.exceptionDetails?.exception?.description || '').slice(0, 200));
});
await new Promise((r, j) => { ws.on('open', r); ws.on('error', j); });
const send = (mm, p = {}) => new Promise((res, rej) => { const id = ++seq; pend.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method: mm, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) return { __err: String(r.exceptionDetails.exception?.description || '').slice(0, 400) }; return r.result?.value; };
const wait = ms => new Promise(r => setTimeout(r, ms));
const ck = (ok, name, extra) => { if (ok) { pass++; console.log('  ✅ ' + name + (extra ? '  →  ' + extra : '')); } else { fail++; fails.push(name); console.log('  ❌ ' + name + (extra ? '  →  ' + extra : '')); } };
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Page.navigate', { url: URL_BASE + '?t=' + Date.now() });
for (let i = 0; i < 200; i++) { await wait(250); if (await ev("(typeof SPECIES!=='undefined'&&SPECIES.length>1000&&typeof rollEnemy==='function')")) break; }

console.log('══ 1. ri(lo,hi) 本身是否均匀（直接抽样 9000 次）══');
const r = await ev(`(function(){
  var cnt={};
  for(var i=0;i<9000;i++){ var v=ri(6,12); cnt[v]=(cnt[v]||0)+1; }
  return cnt;
})()`);
if (r.__err) ck(false, 'ri 抽样可跑', r.__err);
else {
  const ks = Object.keys(r).map(Number).sort((a, b) => a - b);
  const vals = ks.map(k => r[k]);
  const mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals);
  console.log('   ri(6,12) 9000 次：' + ks.map(k => k + '→' + r[k]).join(' · '));
  ck(ks[0] === 6 && ks[ks.length - 1] === 12, '覆盖 6~12 两端（不是开区间）', ks[0] + '~' + ks[ks.length - 1]);
  ck((mx - mn) / mn < 0.25, '分布均匀（最大最小频次差 <25%）', '最少 ' + mn + ' / 最多 ' + mx);
}

console.log('\n══ 2. 单只 Lv9 队伍：1000 次遇敌的等级分布 ══');
const s1 = await ev(`(function(){
  try{
    localStorage.removeItem(SAVE_KEY); S=freshSave();
    var p=newPet('pk-004'); p.lv=9; p.hp=maxHpOf(p); ensureMoves(p);
    S.party=[p]; S.lead=p.uid; S.pos={x:SPAWN.x,y:SPAWN.y}; enterWorld();
    var cnt={}, n=1000;
    for(var i=0;i<n;i++){ var e=rollEnemy(); cnt[e.lv]=(cnt[e.lv]||0)+1; }
    return {cnt:cnt, top:topPartyLv()};
  }catch(e){ return {__err:String(e.message)}; }
})()`);
if (s1.__err) ck(false, '单宠抽样可跑', s1.__err);
else {
  const ks = Object.keys(s1.cnt).map(Number).sort((a, b) => a - b);
  const below = ks.filter(k => k < 9).reduce((s, k) => s + s1.cnt[k], 0);
  const equal = s1.cnt[9] || 0;
  const above = ks.filter(k => k > 9).reduce((s, k) => s + s1.cnt[k], 0);
  console.log('   队伍最高 Lv' + s1.top + ' · 分布：' + ks.map(k => k + '→' + s1.cnt[k]).join(' · '));
  console.log('   低于自身 ' + below + ' · 等于 ' + equal + ' · 高于 ' + above);
  ck(below > 0, '**存在低于自身等级的野怪**', below + ' 次');
  ck(below > 200 && above > 200, '低于/高于两侧都有相当数量（大致对称）', below + ' vs ' + above);
  const ratio = below / Math.max(1, above);
  ck(ratio > 0.6 && ratio < 1.6, '两侧比例接近 1:1', ratio.toFixed(2) + ' : 1');
}

console.log('\n══ 3. 队伍里带了高等级宠时（这会让「相对当前出战宠」感觉偏高）══');
const s2 = await ev(`(function(){
  try{
    localStorage.removeItem(SAVE_KEY); S=freshSave();
    var a=newPet('pk-004'); a.lv=9; a.hp=maxHpOf(a); ensureMoves(a);      /* 出战 */
    var b=newPet('pk-025'); b.lv=16; b.hp=maxHpOf(b); ensureMoves(b);     /* 队里练得高的 */
    S.party=[a,b]; S.lead=a.uid; S.pos={x:SPAWN.x,y:SPAWN.y}; enterWorld();
    var cnt={}, n=1000;
    for(var i=0;i<n;i++){ var e=rollEnemy(); cnt[e.lv]=(cnt[e.lv]||0)+1; }
    return {cnt:cnt, top:topPartyLv(), base:wildBaseLv(), leadLv:selfPet().lv};
  }catch(e){ return {__err:String(e.message)}; }
})()`);
if (s2.__err) ck(false, '多宠抽样可跑', s2.__err);
else {
  const ks = Object.keys(s2.cnt).map(Number).sort((a, b) => a - b);
  const rel = {};
  ks.forEach(k => { const d = k - s2.leadLv; rel[d] = (rel[d] || 0) + s2.cnt[k]; });
  const rk = Object.keys(rel).map(Number).sort((a, b) => a - b);
  console.log('   队伍最高 Lv' + s2.top + ' · 出战 Lv' + s2.leadLv + ' · **等级基准 = ' + s2.base + '** · 野怪等级 ' + ks[0] + '~' + ks[ks.length - 1]);
  console.log('   相对出战宠的差值分布：' + rk.map(d => (d >= 0 ? '+' : '') + d + '→' + rel[d]).join(' · '));
  const neg = rk.filter(d => d < 0).reduce((s, d) => s + rel[d], 0);
  const pos = rk.filter(d => d > 0).reduce((s, d) => s + rel[d], 0);
  console.log('   比出战宠低 ' + neg + ' 次 · 比它高 ' + pos + ' 次');
  ck(s2.base === 9 && s2.top === 16, '等级基准 = **出战宠（9）**，而不是队里最高的 16', '基准=' + s2.base + ' / 队伍最高=' + s2.top);
  ck(neg > 0 && pos > 0, '相对出战宠两侧都出现了（不再全是正差）', neg + ' vs ' + pos);
  const ratio2 = neg / Math.max(1, pos);
  ck(ratio2 > 0.6 && ratio2 < 1.6, '两侧大致对称', ratio2.toFixed(2) + ' : 1');
}

console.log('\n== 控制台异常: ' + errs.length + ' 条 ==');
ck(errs.length === 0, '零控制台异常');
console.log('\n═══ v53 验证：通过 ' + pass + ' / ' + (pass + fail) + ' ═══');
if (fails.length) console.log('未达标项: ' + fails.join(' | '));
ws.close();
process.exit(fail ? 1 : 0);
