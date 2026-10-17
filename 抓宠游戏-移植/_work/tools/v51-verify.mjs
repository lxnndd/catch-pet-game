/* v51 验收：进化型不能早于进化等级出现（修「Lv9 的掘地兔」）
   核心断言：每只刷出的野怪，其等级都必须落在**它自己的进化阶段区间**内：
     lo = evoLvOf(sp)（由谁进化而来的等级，基础形态为 1）
     hi = nextEvoLv(sp)-1（下一次进化等级-1，最终形态为 100）
   另检查：新手期仍遵守 ±3；25 级后进化型可以正常出现。
   用法：node v51-verify.mjs [url] [cdpPort] */
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
for (let i = 0; i < 200; i++) { await wait(250); if (await ev("(typeof SPECIES!=='undefined'&&SPECIES.length>1000&&typeof wildLvRange==='function')")) break; }

console.log('══ 0. 先看「掘地兔」的阶段区间 ══');
const dig = await ev(`(function(){
  var s=null; SPECIES.forEach(function(x){ if(x.name==='掘地兔') s=x; });
  var s2=null; SPECIES.forEach(function(x){ if(x.name==='掘掘兔') s2=x; });
  if(!s) return {missing:true};
  return {name:s.name, id:s.id, evoLv:evoLvOf(s.id), next:nextEvoLv(s),
          stage:stageRange(s), stageInPlain:stageLvRange(s,'plain'),
          base:s2?{name:s2.name, id:s2.id, evoLv:evoLvOf(s2.id), next:nextEvoLv(s2), stage:stageRange(s2)}:null};
})()`);
if (dig.missing) { console.log('   ⚠️ 游戏里没有「掘地兔」'); }
else {
  console.log('   ' + dig.name + '（' + dig.id + '）：由 ' + dig.evoLv + ' 级进化而来 · 阶段区间 [' + dig.stage + '] · 平原可刷 [' + dig.stageInPlain + ']');
  if (dig.base) console.log('   ' + dig.base.name + '（' + dig.base.id + '）：阶段区间 [' + dig.base.stage + '] · 下次进化 Lv' + dig.base.next);
  ck(dig.stage[0] >= 10, dig.name + ' 的初始阶段等级不低（不该在 9 级出现）', 'Lv' + dig.stage[0] + ' 起');
}

console.log('\n══ 1. Lv9 玩家在平原（原 bug 场景）：不该刷出掘地兔 ══');
const s1 = await ev(`(function(){
  try{
    localStorage.removeItem(SAVE_KEY); S=freshSave();
    var p=newPet('pk-004'); p.lv=9; p.hp=maxHpOf(p); ensureMoves(p);
    S.party=[p]; S.lead=p.uid; S.pos={x:SPAWN.x,y:SPAWN.y}; enterWorld();
    var bad=[], levels={}, seen={}, n=800;
    for(var i=0;i<n;i++){
      var e=rollEnemy();
      if(e && e.sp && e.sp.rarity===2) continue;   /* v86：神兽固定 70~100，不参与这些断言 */
      seen[e.sp.name]=(seen[e.sp.name]||0)+1;
      levels[e.lv]=(levels[e.lv]||0)+1;
      var lo=evoLvOf(e.sp.id); lo=(lo===undefined||lo<1)?1:lo;
      var nx=nextEvoLv(e.sp); var hi=(nx===null)?100:nx-1;
      if(e.lv<lo || e.lv>hi) bad.push({name:e.sp.name, lv:e.lv, stage:[lo,hi]});
    }
    var digCount=seen['掘地兔']||0;
    var mn=999,mx=0; Object.keys(levels).forEach(function(k){ var v=+k; if(v<mn)mn=v; if(v>mx)mx=v; });
    return {bad:bad.slice(0,8), badN:bad.length, digCount:digCount, min:mn, max:mx, uniq:Object.keys(seen).length,
            sample:Object.keys(seen).slice(0,10)};
  }catch(e){ return {__err:String(e.message)}; }
})()`);
if (s1.__err) ck(false, 'Lv9 抽样可跑', s1.__err);
else {
  console.log('   800 次遇敌：等级 ' + s1.min + '~' + s1.max + ' · 共 ' + s1.uniq + ' 个物种');
  console.log('   物种示例：' + (s1.sample || []).join(' / '));
  console.log('   掘地兔出现次数：' + s1.digCount);
  ck(s1.digCount === 0, 'Lv9 玩家**一次都没遇到掘地兔**', s1.digCount + ' 次');
  ck(s1.badN === 0, '所有野怪等级都落在自己的进化阶段区间内', s1.badN ? JSON.stringify(s1.bad) : '全部合规');
  ck(s1.min >= 6 && s1.max <= 12, '新手期仍是 ±3（Lv9 → 6~12）', s1.min + '~' + s1.max);
}

console.log('\n══ 2. 25 级后：进化型应能正常出现（掘地兔 Lv20+）══');
const s2 = await ev(`(function(){
  try{
    localStorage.removeItem(SAVE_KEY); S=freshSave();
    var p=newPet('pk-006'); p.lv=30; p.hp=maxHpOf(p); ensureMoves(p);
    S.party=[p]; S.lead=p.uid; S.pos={x:SPAWN.x,y:SPAWN.y}; enterWorld();
    var digLv=[], bad=[], n=1500;
    for(var i=0;i<n;i++){
      var e=rollEnemy();
      if(e && e.sp && e.sp.rarity===2) continue;   /* v86：神兽固定 70~100 */
      if(e.sp.name==='掘地兔') digLv.push(e.lv);
      var lo=evoLvOf(e.sp.id); lo=(lo===undefined||lo<1)?1:lo;
      var nx=nextEvoLv(e.sp); var hi=(nx===null)?100:nx-1;
      if(e.lv<lo || e.lv>hi) bad.push({name:e.sp.name, lv:e.lv, stage:[lo,hi]});
    }
    var mn=999,mx=0; digLv.forEach(function(v){ if(v<mn)mn=v; if(v>mx)mx=v; });
    return {digN:digLv.length, digMin:digLv.length?mn:null, digMax:digLv.length?mx:null, badN:bad.length, bad:bad.slice(0,6)};
  }catch(e){ return {__err:String(e.message)}; }
})()`);
if (s2.__err) ck(false, 'Lv30 抽样可跑', s2.__err);
else {
  console.log('   掘地兔出现 ' + s2.digN + ' 次，等级 ' + (s2.digN ? (s2.digMin + '~' + s2.digMax) : '—'));
  ck(s2.badN === 0, 'Lv30 抽样中同样没有越阶段的野怪', s2.badN ? JSON.stringify(s2.bad) : '全部合规');
  if (s2.digN > 0) ck(s2.digMin >= 20, '掘地兔出现时等级 ≥20（它的进化等级）', s2.digMin + '~' + s2.digMax);
  else console.log('   （平原池这次没抽到掘地兔，属正常随机）');
}

console.log('\n══ 3. 其它高等级地区也合规 ══');
const s3 = await ev(`(function(){
  try{
    localStorage.removeItem(SAVE_KEY); S=freshSave();
    var p=newPet('pk-006'); p.lv=60; p.hp=maxHpOf(p); ensureMoves(p);
    S.party=[p]; S.lead=p.uid;
    var out={};
    ['volcano','desert','snow'].forEach(function(reg){
      var town=TOWNS.filter(function(t){ return t.region===reg; })[0];
      S.pos = town ? {x:town.x,y:town.y} : {x:SPAWN.x,y:SPAWN.y};
      enterWorld();
      var bad=0, mn=999, mx=0, first=null;
      for(var i=0;i<600;i++){
        var e=rollEnemy();
        if(e && e.sp && e.sp.rarity===2) continue;   /* v86：神兽固定 70~100 */
        if(!first) first=e.sp.name+' Lv'+e.lv;
        if(e.lv<mn)mn=e.lv; if(e.lv>mx)mx=e.lv;
        var lo=evoLvOf(e.sp.id); lo=(lo===undefined||lo<1)?1:lo;
        var nx=nextEvoLv(e.sp); var hi=(nx===null)?100:nx-1;
        if(e.lv<lo || e.lv>hi) bad++;
      }
      out[reg]={bad:bad, min:mn, max:mx, first:first, region:regionAt(S.pos.x,S.pos.y)};
    });
    return out;
  }catch(e){ return {__err:String(e.message)}; }
})()`);
if (s3.__err) ck(false, '高等级地区抽样可跑', s3.__err);
else {
  Object.keys(s3).forEach(reg => {
    const o = s3[reg];
    console.log('   ' + o.region + '（Lv60）：等级 ' + o.min + '~' + o.max + ' · 越阶段 ' + o.bad + ' 例 · 例：' + o.first);
    ck(o.bad === 0, o.region + ' 无越阶段野怪', o.min + '~' + o.max);
  });
}

console.log('\n== 控制台异常: ' + errs.length + ' 条 ==');
ck(errs.length === 0, '零控制台异常');
console.log('\n═══ v51 验收：通过 ' + pass + ' / ' + (pass + fail) + ' ═══');
if (fails.length) console.log('失败项: ' + fails.join(' | '));
ws.close();
process.exit(fail ? 1 : 0);
