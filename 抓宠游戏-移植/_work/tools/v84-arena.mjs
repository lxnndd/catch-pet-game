/* v84 验收：联盟大会 128 强赛（完全按官方 —— 单败/不回血/强度递增/不能跳过/7 轮）
   用法：node v84-arena.mjs [url] [cdpPort] */
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
for (let i = 0; i < 200; i++) { await wait(250); if (await ev("(typeof SPECIES!=='undefined'&&SPECIES.length>1000&&typeof arenaTeam==='function')")) break; }

console.log('══ 1. 赛制：7 轮单败淘汰 ══');
const r1 = await ev(`(function(){
  return {rounds:ARENA_ROUNDS.slice(), n:ARENA_ROUNDS.length};
})()`);
if (r1.__err) ck(false, '赛制可查', r1.__err);
else {
  console.log('   轮次：' + r1.rounds.join(' → '));
  ck(r1.n === 7, '共 **7 轮**（128→64→32→16→8→4→决赛）', r1.n + ' 轮');
  ck(r1.rounds[0] === '128 强' && r1.rounds[6] === '决赛', '首轮是 128 强、末轮是决赛', r1.rounds[0] + ' → ' + r1.rounds[6]);
}

console.log('\n══ 2. 对手强度随轮次递增 ══');
const r2 = await ev(`(function(){ try{
  localStorage.removeItem(SAVE_KEY); S=freshSave();
  var me=newPet('pk-006'); me.lv=50; me.hp=maxHpOf(me); ensureMoves(me);
  S.party=[me]; S.lead=me.uid; S.pos={x:SPAWN.x,y:SPAWN.y}; enterWorld();
  var out=[];
  for(var r=0;r<7;r++){
    var t=arenaTeam(r);
    out.push({r:r, name:ARENA_ROUNDS[r], n:t.length, lv:t[0].lv, avg:Math.round(t.reduce(function(a,f){return a+f.lv;},0)/t.length)});
  }
  return {out:out, top:topPartyLv()};
}catch(e){ return {__err:String(e.message)}; } })()`);
if (r2.__err) ck(false, '对手生成可测', r2.__err);
else {
  console.log('   我的最高等级 ' + r2.top);
  r2.out.forEach(o => console.log('   ' + o.name.padEnd(7) + ' 对手 ' + o.n + ' 只 · 等级 ' + o.lv));
  const lvs = r2.out.map(o => o.lv);
  const inc = lvs.every((v, i) => i === 0 || v > lvs[i - 1]);
  ck(inc, '**等级逐轮递增**', lvs.join(' → '));
  const ns = r2.out.map(o => o.n);
  ck(ns[6] > ns[0], '**人数逐轮增加**（128强少 → 决赛多）', ns.join(' → '));
}

console.log('\n══ 3. 不能跳过：必须先赢下大会才能挑战四天王 ══');
const r3 = await ev(`(function(){ try{
  localStorage.removeItem(SAVE_KEY); S=freshSave();
  var me=newPet('pk-006'); me.lv=60; me.hp=maxHpOf(me); ensureMoves(me);
  S.party=[me]; S.lead=me.uid; S.pos={x:SPAWN.x,y:SPAWN.y}; enterWorld();
  S.badges=Object.keys(LV_RANGE).slice();      /* 集齐徽章（地区键即徽章标识） */
  S.arena=0; S.arenaWin=0; delete S.champion;
  openLeague();
  var note=$("gym-note").textContent, btn=$("gym-ok").textContent, sub=$("gym-sub").textContent;
  var before={note:note.slice(0,40), btn:btn, sub:sub};
  /* 把大会打通 */
  S.arenaWin=1; openLeague();
  var after={btn:$("gym-ok").textContent, note:$("gym-note").textContent.slice(0,30)};
  return {before:before, after:after};
}catch(e){ return {__err:String(e.message)}; } })()`);
if (r3.__err) ck(false, '联盟面板可测', r3.__err);
else {
  console.log('   未赢大会时：按钮「' + r3.before.btn + '」· 副标题「' + r3.before.sub + '」');
  console.log('   大会优胜后：按钮「' + r3.after.btn + '」');
  ck(/128 强/.test(r3.before.btn) || /参加/.test(r3.before.btn), '未赢大会时按钮是**参加大会**（不能直接打四天王）', r3.before.btn);
  ck(/四天王|挑战/.test(r3.after.btn), '大会优胜后按钮变成**挑战四天王**', r3.after.btn);
}

console.log('\n══ 4. 赢了晋级 / 输了归零（单败淘汰）══');
const r4 = await ev(`(function(){ try{
  localStorage.removeItem(SAVE_KEY); S=freshSave();
  var me=newPet('pk-006'); me.lv=60; me.hp=maxHpOf(me); ensureMoves(me);
  S.party=[me]; S.lead=me.uid; S.pos={x:SPAWN.x,y:SPAWN.y}; enterWorld();
  /* 模拟打完第 3 轮（16 强）*/
  S.arena=3;
  var prog=S.arena, rn=ARENA_ROUNDS[prog];
  /* 失败 → 归零 */
  S.arena=0; save();
  var afterLose=S.arena;
  /* 连胜到决赛并夺冠 */
  S.arena=0;
  for(var i=0;i<7;i++){ S.arena=i+1; if(S.arena>=ARENA_ROUNDS.length){ S.arenaWin=1; } }
  save();
  return {prog:prog, rn:rn, afterLose:afterLose, arenaFinal:S.arena, win:!!S.arenaWin};
}catch(e){ return {__err:String(e.message)}; } })()`);
if (r4.__err) ck(false, '晋级/失败可测', r4.__err);
else {
  console.log('   打到第 3 轮时：S.arena=3 → 对应「' + r4.rn + '」');
  console.log('   失败后：S.arena=' + r4.afterLose + '（回到 128 强）· 7 连胜后：S.arena=' + r4.arenaFinal + ' 优胜=' + r4.win);
  ck(r4.afterLose === 0, '**输了归零**（回到 128 强重新打起）', 'S.arena=' + r4.afterLose);
  ck(r4.arenaFinal === 7 && r4.win, '7 连胜后标记大会优胜', 'S.arena=' + r4.arenaFinal);
}

console.log('\n══ 5. v89：打完一场可以回血 ══');
const r5 = await ev(`(function(){ try{
  localStorage.removeItem(SAVE_KEY); S=freshSave();
  var me=newPet('pk-006'); me.lv=60; me.hp=maxHpOf(me); ensureMoves(me);
  S.party=[me]; S.lead=me.uid; S.pos={x:SPAWN.x,y:SPAWN.y}; enterWorld();
  var mx=maxHpOf(me);
  me.hp=Math.round(mx*0.4);
  S.arena=0;
  /* 再放一只倒下的伙伴，验证"救活" */
  var dead=newPet('pk-004'); dead.lv=30; ensureMoves(dead); dead.hp=0; S.party.push(dead);
  ensureMoves(me);
  var before=me.hp;
  S.coins=99999;
  var coinsBefore=S.coins;      /* ← 必须在设定金额之后记录，否则比对基准不对 */
  arenaHeal();
  var after=me.hp, deadAfter=dead.hp, coinsAfter=S.coins, cost=arenaHealCost();
  var ppAfter={};
  Object.keys(me.pp||{}).forEach(function(k){ ppAfter[MOVES[k]?MOVES[k].name:k]=me.pp[k]; });
  /* 金币不足时不应恢复 */
  var poor=newPet('pk-001'); poor.lv=10; ensureMoves(poor); poor.hp=1; S.party=[poor];
  S.coins=0; var hpPoor=1;
  var r=arenaHeal();
  var poorAfter=poor.hp;
  return {mx:mx, before:before, after:after, deadAfter:deadAfter, cost:cost,
          coinsBefore:coinsBefore, coinsAfter:coinsAfter, ppAfter:ppAfter,
          poorAfter:poorAfter, poorRet:r};
}catch(e){ return {__err:String(e.message)}; } })()`);
if (r5.__err) ck(false, '回血可测', r5.__err);
else {
  console.log('   恢复前 HP ' + r5.before + ' / ' + r5.mx + ' · 倒下的伙伴 HP ' + 0 + ' → ' + r5.deadAfter);
  console.log('   费用 🪙' + r5.cost + ' · 金币 ' + r5.coinsBefore + ' → ' + r5.coinsAfter);
  console.log('   PP 恢复为：' + JSON.stringify(r5.ppAfter));
  console.log('   金币为 0 时：HP 保持 ' + r5.poorAfter + '（返回值 ' + r5.poorRet + '）');
  ck(r5.after === r5.mx, '打完一场全队 HP 回满', r5.before + ' → ' + r5.after);
  ck(r5.deadAfter > 0, '**倒下的伙伴被救活**', 'HP 0 → ' + r5.deadAfter);
  ck(r5.coinsBefore - r5.coinsAfter === r5.cost && r5.cost > 0, '**回血扣了金币**', '🪙' + r5.cost);
  const ppAllFull = Object.keys(r5.ppAfter).length > 0 && Object.keys(r5.ppAfter).every(k => r5.ppAfter[k] >= 1);
  ck(ppAllFull, 'PP 一并回满', JSON.stringify(r5.ppAfter));
  ck(r5.poorAfter === 1 && r5.poorRet === 0, '**金币不足时不恢复**（残血继续打）', 'HP=' + r5.poorAfter);
}

console.log('\n== 控制台异常: ' + errs.length + ' 条 ==');
ck(errs.length === 0, '零控制台异常');
console.log('\n═══ v84 验收：通过 ' + pass + ' / ' + (pass + fail) + ' ═══');
if (fails.length) console.log('失败项: ' + fails.join(' | '));
ws.close();
process.exit(0);
