/* v64 验收：用户点名的机制（挺住 / 致命针刺 / 蛮干 / 固定伤害 / 一击必杀 / 增强拳方向）
   用法：node v64-named.mjs [url] [cdpPort] */
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
for (let i = 0; i < 200; i++) { await wait(250); if (await ev("(typeof SPECIES!=='undefined'&&SPECIES.length>1000&&typeof applyMove==='function')")) break; }

const S = `
  function idOf(nm){ var r=null; Object.keys(MOVES).forEach(function(k){ if(MOVES[k].name===nm) r=k; }); return r; }
  function arena(aLv,bLv,aId){
    localStorage.removeItem(SAVE_KEY); S=freshSave();
    var me=newPet(aId||'pk-006'); me.trait='fierce'; me.lv=aLv; me.hp=maxHpOf(me); ensureMoves(me); me.hp=maxHpOf(me);
    S.party=[me]; S.lead=me.uid; S.pos={x:SPAWN.x,y:SPAWN.y}; enterWorld();
    var foe=initFighter(byId('pk-143'),bLv,'fierce',null); foe.hp=maxHpOf(foe);
    openBattle('wild',{sp:byId('pk-143'), fighter:foe});
    B.ehp=B.emax=maxHpOf(foe); B.foe.hp=B.ehp;
    return {me:me, foe:B.foe};
  }
`;

console.log('══ 1. 增强拳：自己攻击 +1（不是对手）══');
const r1 = await ev(`(function(){ try{ ${S} var a=arena(30,30); var me=a.me; me.st.atk=0; B.ehp=B.emax;
  var lines=applyMove(MOVES[idOf('增强拳')], byId('pk-006'), byId('pk-143'), true);
  return {myAtk:me.st.atk, foeAtk:B.foe.st.atk, fx:JSON.stringify(fxOf(MOVES[idOf('增强拳')])), log:lines.join(' | ').slice(-40)}; }catch(e){ return {__err:String(e.message)}; } })()`);
if (r1.__err) ck(false, '增强拳可测', r1.__err);
else {
  console.log('   我方攻击档 ' + r1.myAtk + ' · 对手攻击档 ' + r1.foeAtk + ' · ' + r1.fx);
  ck(r1.myAtk === 1 && r1.foeAtk === 0, '**自己 +1、对手不变**（之前是加给对手）', '我=' + r1.myAtk + ' 敌=' + r1.foeAtk);
}

console.log('\n══ 2. 挺住：致命伤害时留下 1 HP ══');
const r2 = await ev(`(function(){ try{ ${S} var a=arena(50,50); var me=a.me;
  me.hp=Math.round(maxHpOf(me)*0.1); vsSet(me,'endure',true);
  var foe=initFighter(byId('pk-143'),50,'fierce',null);
  var before=me.hp;
  applyMove(MOVES[idOf('撞击')], byId('pk-143'), byId('pk-006'), false);
  var withEndure=me.hp;
  vsClear(me,'endure'); me.hp=before;
  applyMove(MOVES[idOf('撞击')], byId('pk-143'), byId('pk-006'), false);
  var without=me.hp;
  return {before:before, withEndure:withEndure, without:without}; }catch(e){ return {__err:String(e.message)}; } })()`);
if (r2.__err) ck(false, '挺住可测', r2.__err);
else {
  console.log('   半血以下挨打：有挺住 → HP ' + r2.withEndure + ' · 无挺住 → HP ' + r2.without);
  ck(r2.withEndure === 1, '有「挺住」时**至少留下 1 HP**', 'HP=' + r2.withEndure);
  ck(r2.without === 0, '（对照）没有挺住则倒下', 'HP=' + r2.without);
}

console.log('\n══ 3. 致命针刺：击倒对手才强化自己 ══');
const r3 = await ev(`(function(){ try{ ${S} var a=arena(30,30); var me=a.me, out={};
  me.st.atk=0; B.ehp=1;
  var lines=applyMove(MOVES[idOf('致命针刺')], byId('pk-006'), byId('pk-143'), true);
  out.ko={atk:me.st.atk, log:lines.join(' | ').slice(-40)};
  /* 对手没倒时不该强化 */
  me.st.atk=0; B.ehp=B.emax;
  var l2=applyMove(MOVES[idOf('致命针刺')], byId('pk-006'), byId('pk-143'), true);
  out.noKO={atk:me.st.atk};
  return out; }catch(e){ return {__err:String(e.message)}; } })()`);
if (r3.__err) ck(false, '致命针刺可测', r3.__err);
else {
  console.log('   击倒对手时：攻击档 → ' + r3.ko.atk + ' · 日志「' + r3.ko.log + '」');
  console.log('   未击倒时：攻击档 → ' + r3.noKO.atk);
  ck(r3.ko.atk === 3, '击倒对手 → **自身攻击 +3**（官方条件触发）', '+' + r3.ko.atk);
  ck(r3.noKO.atk === 0, '没击倒就不强化（条件判定正确）', String(r3.noKO.atk));
}

console.log('\n══ 4. 蛮干 / 固定伤害 / 一击必杀 ══');
const r4 = await ev(`(function(){ try{ ${S} var a=arena(40,40); var me=a.me, out={};
  /* 蛮干：我血少 → 对手被拉到与我相同 */
  me.hp=20; B.ehp=B.emax;
  var l=applyMove(MOVES[idOf('蛮干')], byId('pk-006'), byId('pk-143'), true);
  out.endeavor={foeHp:B.ehp, myHp:me.hp, log:l.join(' | ').slice(-30)};
  /* 地球上投：伤害 = 自身等级 */
  B.ehp=B.emax;
  var l2=applyMove(MOVES[idOf('地球上投')], byId('pk-006'), byId('pk-143'), true);
  out.seismic={dmg:B.emax-B.ehp, lv:me.lv};
  /* 一击必杀：30% 命中，命中即秒 */
  var ko=0, n=200;
  for(var i=0;i<n;i++){ clearStatus(me); clearStatus(B.foe); B.ehp=B.emax; B.foe.hp=B.ehp;
    applyMove(MOVES[idOf('地裂')], byId('pk-006'), byId('pk-143'), true);
    if(B.ehp<=0) ko++; }
  out.ohko={rate:Math.round(ko/n*100)};
  clearStatus(me); clearStatus(B.foe);
  return out; }catch(e){ return {__err:String(e.message)}; } })()`);
if (r4.__err) ck(false, '特殊伤害可测', r4.__err);
else {
  console.log('   蛮干：我 HP ' + r4.endeavor.myHp + ' → 对手 HP ' + r4.endeavor.foeHp);
  ck(r4.endeavor.foeHp === r4.endeavor.myHp, '蛮干把对手 HP 拉低到与自己相同', r4.endeavor.foeHp + ' vs ' + r4.endeavor.myHp);
  console.log('   地球上投：伤害 ' + r4.seismic.dmg + ' · 自身等级 ' + r4.seismic.lv);
  ck(r4.seismic.dmg === r4.seismic.lv, '地球上投伤害 = 自身等级', r4.seismic.dmg + ' = Lv' + r4.seismic.lv);
  console.log('   地裂：200 次里 ' + r4.ohko.rate + '% 一击必杀（官方 30%）');
  ck(r4.ohko.rate > 15 && r4.ohko.rate < 48, '一击必杀约 30% 命中率', r4.ohko.rate + '%');
}

console.log('\n══ 5. 借力摔：必中 + 先制 −1 ══');
const r5 = await ev(`(function(){ try{ ${S} var a=arena(30,30); var me=a.me;
  var id=idOf('借力摔');
  return {acc:MOVES[id].acc===undefined?'(未定义=必中)':MOVES[id].acc, pri:(typeof MOVE_PRI!=='undefined'&&MOVE_PRI[id])||0,
          hitRate:(function(){ var hit=0,n=300; for(var i=0;i<n;i++){ clearStatus(me); clearStatus(B.foe); B.ehp=B.emax; B.foe.hp=B.ehp;
            var l=applyMove(MOVES[id], byId('pk-006'), byId('pk-143'), true); if(!/打空了/.test(l.join('|'))) hit++; } return Math.round(hit/n*100); })()};
  }catch(e){ return {__err:String(e.message)}; } })()`);
if (r5.__err) ck(false, '借力摔可测', r5.__err);
else {
  console.log('   命中率字段 ' + r5.acc + ' · 先制度 ' + r5.pri + ' · 实测命中率 ' + r5.hitRate + '%');
  ck(r5.hitRate >= 98, '借力摔**必中**（官方 accuracy = null）', r5.hitRate + '%');
  ck(r5.pri === -1, '先制度 −1（官方后手）', String(r5.pri));
}

console.log('\n== 控制台异常: ' + errs.length + ' 条 ==');
ck(errs.length === 0, '零控制台异常');
console.log('\n═══ v64 验收：通过 ' + pass + ' / ' + (pass + fail) + ' ═══');
if (fails.length) console.log('失败项: ' + fails.join(' | '));
ws.close();
process.exit(fail ? 1 : 0);
