/* v86 验收：神兽野生个体 70 级起（降低初期抓到的可能性）
   用法：node v86-legend.mjs [url] [cdpPort] */
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

console.log('══ 1. wildLvRange：神兽一律 70~100 ══');
const r1 = await ev(`(function(){
  var leg=SPECIES.filter(function(s){ return s.rarity===2; })[0];
  var nor=SPECIES.filter(function(s){ return s.rarity===0; })[0];
  var out={legName:leg.name, norName:nor.name, cases:[]};
  [1,5,10,30,60].forEach(function(top){
    out.cases.push({top:top, leg:wildLvRange(leg,'plain',top), nor:wildLvRange(nor,'plain',top)});
  });
  return out;
})()`);
if (r1.__err) ck(false, '等级区间可测', r1.__err);
else {
  console.log('   神兽样例：' + r1.legName + ' · 普通样例：' + r1.norName);
  r1.cases.forEach(c => console.log('   玩家最高 Lv' + String(c.top).padEnd(3) + ' → 神兽 ' + JSON.stringify(c.leg) + ' · 普通 ' + JSON.stringify(c.nor)));
  const allHigh = r1.cases.every(c => c.leg && c.leg[0] >= 70);
  ck(allHigh, '**任何玩家等级下，神兽区间都从 70 起**', JSON.stringify(r1.cases.map(c => c.leg)));
  /* 普通宠规则不变：<25 级跟随玩家 ±3；≥25 级改用地区等级段（v48/v53 的既有设计） */
  const norNormal = r1.cases.filter(c => c.top < 25).every(c => c.nor && c.nor[1] <= 13)
                 && r1.cases.filter(c => c.top >= 25).every(c => c.nor && c.nor[0] === 1);
  ck(norNormal, '普通宠仍按原规则（<25 级跟随玩家、≥25 级用地区段），不受神兽规则影响', JSON.stringify(r1.cases.map(c => c.nor)));
}

console.log('\n══ 2. 实战抽样：Lv5 玩家遇到的神兽等级 ══');
const r2 = await ev(`(function(){ try{
  localStorage.removeItem(SAVE_KEY); S=freshSave();
  var me=newPet('pk-004'); me.lv=5; me.hp=maxHpOf(me); ensureMoves(me);
  S.party=[me]; S.lead=me.uid; S.pos={x:SPAWN.x,y:SPAWN.y}; enterWorld();
  var leg=[], nor=[], n=4000;
  for(var i=0;i<n;i++){
    var e=rollEnemy();
    if(!e || !e.sp) continue;
    if(e.sp.rarity===2) leg.push(e.lv);
    else nor.push(e.lv);
  }
  function mm(a){ if(!a.length) return null; return {min:Math.min.apply(null,a), max:Math.max.apply(null,a), n:a.length}; }
  return {leg:mm(leg), nor:mm(nor), top:topPartyLv()};
}catch(e){ return {__err:String(e.message)}; } })()`);
if (r2.__err) ck(false, '抽样可跑', r2.__err);
else {
  console.log('   玩家最高 Lv' + r2.top + ' · 4000 次遇敌');
  console.log('   神兽：' + (r2.leg ? ('出现 ' + r2.leg.n + ' 次，等级 ' + r2.leg.min + '~' + r2.leg.max) : '没抽到'));
  console.log('   普通/稀有：' + (r2.nor ? ('出现 ' + r2.nor.n + ' 次，等级 ' + r2.nor.min + '~' + r2.nor.max) : '没抽到'));
  ck(r2.leg && r2.leg.min >= 70, '**实测神兽最低也有 70 级**', r2.leg ? (r2.leg.min + '~' + r2.leg.max) : '（本次没抽到神兽，属正常随机）');
  ck(r2.nor && r2.nor.max <= 12, '同一次抽样里，普通宠仍是 2~8 左右的低等级', r2.nor ? (r2.nor.min + '~' + r2.nor.max) : '');
  ck(r2.leg && r2.leg.n > 0, '神兽**仍然会出现**（不是被过滤掉）', r2.leg ? (r2.leg.n + ' 次') : '');
}

console.log('\n══ 3. 高等级玩家下神兽依然是 70+ ══');
const r3 = await ev(`(function(){ try{
  localStorage.removeItem(SAVE_KEY); S=freshSave();
  var me=newPet('pk-006'); me.lv=90; me.hp=maxHpOf(me); ensureMoves(me);
  S.party=[me]; S.lead=me.uid; S.pos={x:SPAWN.x,y:SPAWN.y}; enterWorld();
  var leg=[], n=3000;
  for(var i=0;i<n;i++){ var e=rollEnemy(); if(e && e.sp && e.sp.rarity===2) leg.push(e.lv); }
  return {n:leg.length, min:leg.length?Math.min.apply(null,leg):null, max:leg.length?Math.max.apply(null,leg):null,
          seg:wildLvRange(SPECIES.filter(function(s){return s.rarity===2;})[0],'plain',90)};
}catch(e){ return {__err:String(e.message)}; } })()`);
if (r3.__err) ck(false, '高等级抽样可跑', r3.__err);
else {
  console.log('   Lv90 玩家：wildLvRange(神兽) = ' + JSON.stringify(r3.seg) + ' · 实测出现 ' + r3.n + ' 次，等级 ' + r3.min + '~' + r3.max);
  ck(r3.seg && r3.seg[0] >= 70, '高等级玩家下神兽区间仍是 70 起（不会被抬到 90+）', JSON.stringify(r3.seg));
}

console.log('\n== 控制台异常: ' + errs.length + ' 条 ==');
ck(errs.length === 0, '零控制台异常');
console.log('\n═══ v86 验收：通过 ' + pass + ' / ' + (pass + fail) + ' ═══');
if (fails.length) console.log('失败项: ' + fails.join(' | '));
ws.close();
process.exit(0);
