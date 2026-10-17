/* v68 验收：能力变化保留到换场（修「buff 随回合减少」）
   ① 健美后连续推进 5 个回合，攻击/防御档应**保持**
   ② 剑舞 +2、铁壁 +2 同样保持
   ③ 降低对手的能力（如叫声）也应保持
   ④ 换宠 / 战斗结束仍然清零（与官方一致）
   用法：node v68-stages.mjs [url] [cdpPort] */
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
for (let i = 0; i < 200; i++) { await wait(250); if (await ev("(typeof SPECIES!=='undefined'&&SPECIES.length>1000&&typeof applyMove==='function'&&typeof endBoardTurn==='function')")) break; }

const S = `
  function idOf(nm){ var r=null; Object.keys(MOVES).forEach(function(k){ if(MOVES[k].name===nm) r=k; }); return r; }
  function arena(){
    localStorage.removeItem(SAVE_KEY); S=freshSave();
    var me=newPet('pk-006'); me.trait='fierce'; me.lv=40; me.hp=maxHpOf(me); ensureMoves(me); me.hp=maxHpOf(me);
    S.party=[me]; S.lead=me.uid; S.pos={x:SPAWN.x,y:SPAWN.y}; enterWorld();
    var foe=initFighter(byId('pk-143'),40,'fierce',null); foe.hp=maxHpOf(foe);
    openBattle('wild',{sp:byId('pk-143'), fighter:foe});
    B.ehp=B.emax=maxHpOf(foe); B.foe.hp=B.ehp;
    return {me:me, foe:B.foe};
  }
  function rounds(n, p){ var l=[]; for(var i=0;i<n;i++){ endBoardTurn(p||selfPet(), l); } return l.join(' | '); }
`;

console.log('══ 1. 健美之后，连续 5 个回合能力档是否保持 ══');
const r1 = await ev(`(function(){ try{ ${S} var a=arena(), me=a.me;
  me.st.atk=0; me.st.def=0;
  applyMove(MOVES[idOf('健美')], byId('pk-006'), byId('pk-143'), true);
  var a0=me.st.atk, d0=me.st.def;
  var trace=[];
  for(var i=0;i<5;i++){ trace.push(me.st.atk+'/'+me.st.def); rounds(1, me); }
  return {a0:a0, d0:d0, after:me.st.atk+'/'+me.st.def, trace:trace};
}catch(e){ return {__err:String(e.message)}; } })()`);
if (r1.__err) ck(false, '可测', r1.__err);
else {
  console.log('   健美后 攻击/防御 = ' + r1.a0 + '/' + r1.d0);
  console.log('   逐回合追踪：' + r1.trace.join(' → '));
  console.log('   5 回合后 = ' + r1.after);
  ck(r1.a0 === 1 && r1.d0 === 1, '健美给出 +1/+1', r1.a0 + '/' + r1.d0);
  ck(r1.after === '1/1', '**5 个回合后能力档依然保持**（不再逐回合衰减）', r1.after);
}

console.log('\n══ 2. 其它强化招同样保持 ══');
const r2 = await ev(`(function(){ try{ ${S}
  var out={};
  [['剑舞','atk',2],['铁壁','def',2],['龙之舞','atk',1],['冥想','spDef',1]].forEach(function(x){
    var a=arena(), me=a.me;
    ['atk','def','spa','spDef','spd'].forEach(function(k){ me.st[k]=0; });
    applyMove(MOVES[idOf(x[0])], byId('pk-006'), byId('pk-143'), true);
    var before=me.st[x[1]];
    for(var i=0;i<4;i++) rounds(1, me);
    out[x[0]]={before:before, after:me.st[x[1]], want:x[2]};
  });
  return out;
}catch(e){ return {__err:String(e.message)}; } })()`);
if (r2.__err) ck(false, '可测', r2.__err);
else {
  Object.keys(r2).forEach(nm => {
    const o = r2[nm];
    console.log('   ' + nm.padEnd(6) + ' 使用后 ' + o.before + ' → 4 回合后 ' + o.after + '（期望 ' + o.want + '）');
    ck(o.after === o.want, nm + ' 的强化保持不衰减', String(o.after));
  });
}

console.log('\n══ 3. 对对手的削弱也应保持 ══');
const r3 = await ev(`(function(){ try{ ${S} var a=arena(), me=a.me;
  B.foe.st.atk=0;
  applyMove(MOVES[idOf('叫声')], byId('pk-006'), byId('pk-143'), true);
  var before=B.foe.st.atk;
  for(var i=0;i<4;i++) endBoardTurn(B.foe, []);
  return {before:before, after:B.foe.st.atk};
}catch(e){ return {__err:String(e.message)}; } })()`);
if (r3.__err) ck(false, '可测', r3.__err);
else {
  console.log('   叫声后 对手攻击档 ' + r3.before + ' → 4 回合后 ' + r3.after);
  ck(r3.after === r3.before && r3.after < 0, '对手被削弱的等级同样保持', String(r3.after));
}

console.log('\n══ 4. 换宠 / 战斗结束仍然清零（官方行为）══');
const r4 = await ev(`(function(){ try{ ${S} var a=arena(), me=a.me;
  me.st.atk=0; me.st.def=0;
  applyMove(MOVES[idOf('健美')], byId('pk-006'), byId('pk-143'), true);
  var inBattle={atk:me.st.atk, def:me.st.def};
  clearStatus(me);                       /* 换下场时调用 */
  var afterSwitch={atk:me.st.atk, def:me.st.def};
  return {inBattle:inBattle, afterSwitch:afterSwitch};
}catch(e){ return {__err:String(e.message)}; } })()`);
if (r4.__err) ck(false, '可测', r4.__err);
else {
  console.log('   战斗中 ' + JSON.stringify(r4.inBattle) + ' → 换下场后 ' + JSON.stringify(r4.afterSwitch));
  ck(r4.afterSwitch.atk === 0 && r4.afterSwitch.def === 0, '换下场时能力变化清零（与官方一致）', JSON.stringify(r4.afterSwitch));
}

console.log('\n== 控制台异常: ' + errs.length + ' 条 ==');
ck(errs.length === 0, '零控制台异常');
console.log('\n═══ v68 验收：通过 ' + pass + ' / ' + (pass + fail) + ' ═══');
if (fails.length) console.log('失败项: ' + fails.join(' | '));
ws.close();
process.exit(fail ? 1 : 0);
