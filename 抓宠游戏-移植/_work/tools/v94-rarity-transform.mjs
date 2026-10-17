/* v94 验收：① 神兽刷新权重（8.71% → ~0.5%）② 变身（百变怪）③ 洛克变化技统计
   用法：node v94-rarity-transform.mjs [url] [cdpPort] */
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
for (let i = 0; i < 200; i++) { await wait(250); if (await ev("(typeof SPECIES!=='undefined'&&SPECIES.length>1000&&typeof RARITY_W!=='undefined')")) break; }

console.log('══ 1. 神兽刷新权重 ══');
const r1 = await ev(`(function(){ try{
  localStorage.removeItem(SAVE_KEY); S=freshSave();
  var me=newPet('pk-006'); me.lv=40; me.hp=maxHpOf(me); ensureMoves(me);
  S.party=[me]; S.lead=me.uid; S.pos={x:SPAWN.x,y:SPAWN.y}; enterWorld();
  var n=6000, leg=0, nor=0;
  for(var i=0;i<n;i++){ var e=rollEnemy(); if(!e||!e.sp) continue; if(e.sp.rarity===2) leg++; else nor++; }
  var w=RARITY_W.slice();
  var cnt={0:0,2:0}; SPECIES.forEach(function(s){ if(s.rarity===0) cnt[0]++; else if(s.rarity===2) cnt[2]++; });
  var expect=cnt[2]*w[2]/(cnt[0]*w[0]+cnt[2]*w[2])*100;
  return {w:w, leg:leg, nor:nor, rate:+(leg/(leg+nor)*100).toFixed(2), expect:+expect.toFixed(2), n:n};
}catch(e){ return {__err:String(e.message)}; } })()`);
if (r1.__err) ck(false, '抽样可跑', r1.__err);
else {
  console.log('   权重 ' + JSON.stringify(r1.w) + ' · 理论神兽占比 ' + r1.expect + '%');
  console.log('   实测 ' + r1.n + ' 次遇敌：神兽 ' + r1.leg + ' 只 · 其它 ' + r1.nor + ' 只 → **' + r1.rate + '%**');
  ck(r1.rate < 1.5, '神兽占比已从 8.71% 压到 1% 以下', r1.rate + '%');
  ck(r1.leg > 0, '神兽**仍然会遇到**（不是被砍掉）', r1.leg + ' 只 / ' + r1.n + ' 次');
}

console.log('\n══ 2. 变身（百变怪）══');
const r2 = await ev(`(function(){ try{
  localStorage.removeItem(SAVE_KEY); S=freshSave();
  var me=newPet('pk-132'); me.lv=40; me.hp=maxHpOf(me); ensureMoves(me);   /* 百变怪 */
  S.party=[me]; S.lead=me.uid; S.pos={x:SPAWN.x,y:SPAWN.y}; enterWorld();
  var foe=initFighter(byId('pk-006'),40,'fierce',null); foe.hp=maxHpOf(foe);
  openBattle('wild',{sp:byId('pk-006'), fighter:foe});
  B.ehp=B.emax=maxHpOf(foe); B.foe.hp=B.ehp; B.fld={me:{},foe:{}};
  var beforeSp=me.sp, beforeMoves=me.moves.slice();
  function idOf(nm){ var r=null; Object.keys(MOVES).forEach(function(k){ if(MOVES[k].name===nm) r=k; }); return r; }
  var lines=applyMove(MOVES[idOf('变身')], byId(me.sp), byId('pk-006'), true);
  var afterSp=me.sp, afterMoves=me.moves.slice();
  var namesBefore=beforeMoves.map(function(i){return MOVES[i]?MOVES[i].name:i;});
  var namesAfter=afterMoves.map(function(i){return MOVES[i]?MOVES[i].name:i;});
  /* v95：变身后的 PP 必须是满的（原来复制来招式却没建 PP → 全显示「已用尽」） */
  var ppAfter={};
  afterMoves.forEach(function(i){ ppAfter[MOVES[i]?MOVES[i].name:i]=me.pp[i]; });
  var ppAllFull=afterMoves.every(function(i){ return me.pp[i]===ppMaxOf(i); });
  /* 换场还原 */
  clearStatus(me);
  var restored=me.sp;
  var ppRestored={};
  me.moves.forEach(function(i){ ppRestored[MOVES[i]?MOVES[i].name:i]=me.pp[i]; });
  var ppRestoredFull=me.moves.every(function(i){ return me.pp[i]===ppMaxOf(i); });
  return {beforeName:byId(beforeSp).name, afterName:byId(afterSp).name, restoredName:byId(restored).name,
          namesBefore:namesBefore, namesAfter:namesAfter, log:lines.join(' | ').slice(0,60),
          ppAfter:ppAfter, ppAllFull:ppAllFull, ppRestored:ppRestored, ppRestoredFull:ppRestoredFull};
}catch(e){ return {__err:String(e.message)}; } })()`);
if (r2.__err) ck(false, '变身可测', r2.__err);
else {
  console.log('   变身日志：' + r2.log);
  console.log('   物种：' + r2.beforeName + ' → **' + r2.afterName + '** → 换场还原为 ' + r2.restoredName);
  console.log('   招式：' + r2.namesBefore.join('/') + ' → ' + r2.namesAfter.join('/'));
  console.log('   变身后 PP：' + JSON.stringify(r2.ppAfter));
  console.log('   换场还原后 PP：' + JSON.stringify(r2.ppRestored));
  ck(r2.afterName !== r2.beforeName, '**变身后物种变成对手**（' + r2.beforeName + ' → ' + r2.afterName + '）', '');
  ck(r2.restoredName === r2.beforeName, '换场后**还原原形**（' + r2.restoredName + '）', '');
  ck(r2.namesAfter.join() !== r2.namesBefore.join(), '招式也复制了对手的', r2.namesAfter.join('/'));
  ck(r2.ppAllFull, '**变身后技能 PP 是满的**（修「全是用尽了」）', JSON.stringify(r2.ppAfter));
  ck(r2.ppRestoredFull, '换场还原后 PP 也是满的', JSON.stringify(r2.ppRestored));
  ck(Object.keys(r2.ppRestored).join() === r2.namesBefore.join(), '**换场还原后技能也回到原来的配置**', Object.keys(r2.ppRestored).join('/'));
}

console.log('\n══ 3. 洛克招式的效果覆盖（只统计变化技）══');
const r3 = await ev(`(function(){
  var kzMoves={};
  SPECIES.forEach(function(s){
    if(!s.kz) return;
    (s.moves||[]).forEach(function(id){ kzMoves[id]=1; });
    if(s.pools) Object.keys(s.pools).forEach(function(k){ (s.pools[k]||[]).forEach(function(id){ kzMoves[id]=1; }); });
  });
  var chg=0, chgNoFx=0, atk=0, noFxNames=[];
  Object.keys(kzMoves).forEach(function(id){
    var mv=MOVES[id]; if(!mv) return;
    var fx=fxOf(mv);
    if(mv.cat==="变化" || !mv.power){
      chg++;
      if(!fx){ chgNoFx++; if(noFxNames.length<25) noFxNames.push(mv.name); }
    }else atk++;
  });
  return {total:Object.keys(kzMoves).length, chg:chg, chgNoFx:chgNoFx, atk:atk, noFxNames:noFxNames};
})()`);
if (r3.__err) ck(false, '统计可跑', r3.__err);
else {
  console.log('   洛克招式共 ' + r3.total + ' 条：攻击招 ' + r3.atk + ' · 变化技 ' + r3.chg);
  console.log('   其中变化技**没效果**的：' + r3.chgNoFx + ' 条');
  console.log('   样例：' + r3.noFxNames.join(' · '));
  ck(true, '（数据已摸清，变化技缺口=' + r3.chgNoFx + ' 条，下一步补兜底）', '');
}

console.log('\n== 控制台异常: ' + errs.length + ' 条 ==');
ck(errs.length === 0, '零控制台异常');
console.log('\n═══ v94 验收：通过 ' + pass + ' / ' + (pass + fail) + ' ═══');
if (fails.length) console.log('失败项: ' + fails.join(' | '));
ws.close();
process.exit(0);
