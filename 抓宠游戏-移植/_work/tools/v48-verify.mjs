/* v48 验收：① 队伍无 25 级以上宠时，野怪等级 = 队伍最高等级 ±3
             ② 有 25 级以上宠时，恢复「地区等级段 ∩ 进化阶段区间」随机
             ③ 核查经验分配：是否全队共享（当前实现只给出战宠）
   用法：node v48-verify.mjs [url] [cdpPort] */
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

console.log('══ 1. 新手期（队伍最高 <25 级）：野怪等级 = 最高等级 ±3 ══');
const s1 = await ev(`(function(){
  function sample(topLv, reg, n){
    localStorage.removeItem(SAVE_KEY); S=freshSave();
    var p=newPet('pk-006'); p.lv=topLv; p.hp=maxHpOf(p); ensureMoves(p);
    S.party=[p]; S.lead=p.uid;
    var town=TOWNS.filter(function(t){ return t.region===reg; })[0];
    S.pos = town ? {x:town.x, y:town.y} : {x:SPAWN.x,y:SPAWN.y};
    enterWorld();
    var mn=999, mx=0, arr=[];
    for(var i=0;i<n;i++){ var e=rollEnemy(); if(e.lv<mn)mn=e.lv; if(e.lv>mx)mx=e.lv; arr.push(e.lv); }
    return {top:topLv, reg:reg, region:regionAt(S.pos.x,S.pos.y), min:mn, max:mx, range:wildLvRange(byId('pk-006'), regionAt(S.pos.x,S.pos.y), topLv)};
  }
  return {
    plain1:  sample(1,  'plain', 300),
    plain20: sample(20, 'plain', 300),
    plain24: sample(24, 'plain', 300),
    vol20:   sample(20, 'volcano', 300),
    vol24:   sample(24, 'volcano', 300)
  };
})()`);
if (s1.__err) ck(false, '新手期抽样可跑', s1.__err);
else {
  [['plain1', 'Lv1 在平原', 1], ['plain20', 'Lv20 在平原', 20], ['plain24', 'Lv24 在平原', 24],
   ['vol20', 'Lv20 在火山', 20], ['vol24', 'Lv24 在火山', 24]].forEach(([k, label, top]) => {
    const o = s1[k];
    const okLo = Math.max(1, top - 3), okHi = top + 3;
    console.log('   ' + label + '：实测等级 ' + o.min + '~' + o.max + '（期望区间 ' + okLo + '~' + okHi + '，地区 ' + o.region + '）');
    ck(o.min >= okLo && o.max <= okHi, label + ' → 全部落在 ±3 内', o.min + '~' + o.max);
    ck(o.max > o.min, label + ' → 等级有随机浮动（不是固定一个数）', o.min + '~' + o.max);
  });
}

console.log('\n══ 2. 有 25 级以上宠：恢复地区/阶段区间随机（不再被 ±3 限制）══');
const s2 = await ev(`(function(){
  function sample(topLv, reg, n){
    localStorage.removeItem(SAVE_KEY); S=freshSave();
    var p=newPet('pk-006'); p.lv=topLv; p.hp=maxHpOf(p); ensureMoves(p);
    S.party=[p]; S.lead=p.uid;
    var town=TOWNS.filter(function(t){ return t.region===reg; })[0];
    S.pos = town ? {x:town.x, y:town.y} : {x:SPAWN.x,y:SPAWN.y};
    enterWorld();
    var mn=999, mx=0;
    for(var i=0;i<300;i++){ var e=rollEnemy(); if(e.lv<mn)mn=e.lv; if(e.lv>mx)mx=e.lv; }
    return {top:topLv, min:mn, max:mx, region:regionAt(S.pos.x,S.pos.y)};
  }
  return { vol25: sample(25,'volcano',300), vol40: sample(40,'volcano',300), vol60: sample(60,'volcano',300) };
})()`);
if (s2.__err) ck(false, '非新手期抽样可跑', s2.__err);
else {
  ['vol25', 'vol40', 'vol60'].forEach(k => {
    const o = s2[k];
    const lo = o.top - 3, hi = o.top + 3;
    const outside = (o.min < lo || o.max > hi);
    console.log('   队伍最高 Lv' + o.top + ' 在 ' + o.region + '：实测等级 ' + o.min + '~' + o.max + '（±3 会是 ' + lo + '~' + hi + '）');
    ck(outside, 'Lv' + o.top + ' → 等级范围已超出 ±3（回到地区/阶段随机）', o.min + '~' + o.max);
  });
  ck(s2.vol25.max > 26 || s2.vol25.min < 22, 'Lv25 是分界点：一过 25 就立刻恢复随机', s2.vol25.min + '~' + s2.vol25.max);
}

console.log('\n══ 3. 经验分配核查：是否全队共享 ══');
const s3 = await ev(`(function(){
  try{
    localStorage.removeItem(SAVE_KEY); S=freshSave();
    var a=newPet('pk-006'); a.lv=20; a.hp=maxHpOf(a); ensureMoves(a);
    var b=newPet('pk-025'); b.lv=20; b.hp=maxHpOf(b); ensureMoves(b);
    var c2=newPet('pk-001'); c2.lv=20; c2.hp=maxHpOf(c2); ensureMoves(c2);
    S.party=[a,b,c2]; S.lead=a.uid; S.pos={x:SPAWN.x,y:SPAWN.y}; enterWorld();
    var before={a:a.exp||0, b:b.exp||0, c:c2.exp||0, al:a.lv, bl:b.lv, cl:c2.lv};
    /* 模拟「打倒一只 20 级野怪」：只对出战宠 a 调一次 gainExp（与战斗结算的调用方式一致） */
    var amt=expFromFoe(byId('pk-143'), 20, a.lv, false);
    gainExp(selfPet(), amt);
    return {before:before, after:{a:a.exp||0, b:b.exp||0, c:c2.exp||0},
            amt:amt, whoIsSelf:selfPet()===a, leadId:S.lead, aUid:a.uid};
  }catch(e){ return {__err:String(e.message)}; }
})()`);
if (s3.__err) ck(false, '经验分配可核查', s3.__err);
else {
  console.log('   出战宠 a 经验 ' + s3.before.a + ' → ' + s3.after.a + '（+ ' + s3.amt + '）');
  console.log('   队友   b 经验 ' + s3.before.b + ' → ' + s3.after.b);
  console.log('   队友   c 经验 ' + s3.before.c + ' → ' + s3.after.c);
  ck(s3.after.a > s3.before.a, '出战宠获得经验', '+' + (s3.after.a - s3.before.a));
  ck(s3.after.b === s3.before.b && s3.after.c === s3.before.c,
    '**队友没有获得经验** → 说明目前「不是全队共享」', 'b/c 未变化');
}

console.log('\n== 控制台异常: ' + errs.length + ' 条 ==');
ck(errs.length === 0, '零控制台异常');
console.log('\n═══ v48 验收：通过 ' + pass + ' / ' + (pass + fail) + ' ═══');
if (fails.length) console.log('失败项: ' + fails.join(' | '));
ws.close();
process.exit(fail ? 1 : 0);
