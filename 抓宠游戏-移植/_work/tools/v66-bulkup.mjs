/* v66 实测：健美（以及同类自我强化招）在游戏里到底有没有生效
   用法：node v66-bulkup.mjs [url] [cdpPort] */
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
  function arena(){
    localStorage.removeItem(SAVE_KEY); S=freshSave();
    var me=newPet('pk-006'); me.trait='fierce'; me.lv=30; me.hp=maxHpOf(me); ensureMoves(me); me.hp=maxHpOf(me);
    S.party=[me]; S.lead=me.uid; S.pos={x:SPAWN.x,y:SPAWN.y}; enterWorld();
    var foe=initFighter(byId('pk-143'),30,'fierce',null); foe.hp=maxHpOf(foe);
    openBattle('wild',{sp:byId('pk-143'), fighter:foe});
    B.ehp=B.emax=maxHpOf(foe); B.foe.hp=B.ehp;
    return {me:me, foe:B.foe};
  }
`;

console.log('══ 健美（官方：自己攻击 +1、防御 +1）══');
const r = await ev(`(function(){ try{ ${S}
  var a=arena(), me=a.me;
  me.st.atk=0; me.st.def=0; B.foe.st.atk=0; B.foe.st.def=0;
  var id=idOf('健美');
  if(!id) return {__err:'游戏里没有健美'};
  var fx=JSON.stringify(fxOf(MOVES[id]));
  var mvBuff=JSON.stringify(MOVES[id].buff||null);
  var lines=applyMove(MOVES[id], byId('pk-006'), byId('pk-143'), true);
  return {fx:fx, mvBuff:mvBuff, myAtk:me.st.atk, myDef:me.st.def, foeAtk:B.foe.st.atk, foeDef:B.foe.st.def,
          log:lines.join(' | ')};
}catch(e){ return {__err:String(e.message)}; } })()`);
if (r.__err) ck(false, '健美可测', r.__err);
else {
  console.log('   MOVE_FX = ' + r.fx + ' · MOVES.buff = ' + r.mvBuff);
  console.log('   出招后：我方 攻击档 ' + r.myAtk + ' · 防御档 ' + r.myDef + ' ｜ 对手 攻击档 ' + r.foeAtk + ' · 防御档 ' + r.foeDef);
  console.log('   日志：' + r.log);
  ck(r.myAtk === 1, '健美让**自己攻击 +1**', 'atk=' + r.myAtk);
  ck(r.myDef === 1, '健美让**自己防御 +1**', 'def=' + r.myDef);
  ck(r.foeAtk === 0 && r.foeDef === 0, '对手的能力不受影响', '敌 atk=' + r.foeAtk + ' def=' + r.foeDef);
}

console.log('\n══ 同类自我强化招（批量核对）══');
const many = await ev(`(function(){ try{ ${S}
  var NAMES=['健美','冥想','龙之舞','蝶舞','岩石打磨','铁壁','瞬间失忆','诡计','剑舞','磨爪','宇宙力量'];
  var out={};
  NAMES.forEach(function(nm){
    var a=arena(), me=a.me;
    ['atk','def','spa','spDef','spd','crit','hit','eva'].forEach(function(k){ me.st[k]=0; });
    var id=idOf(nm); if(!id){ out[nm]='(没有)'; return; }
    var lines=applyMove(MOVES[id], byId('pk-006'), byId('pk-143'), true);
    var st={};
    ['atk','def','spa','spDef','spd','crit','hit','eva'].forEach(function(k){ if(me.st[k]) st[k]=me.st[k]; });
    out[nm]={fx:JSON.stringify(fxOf(MOVES[id])), got:JSON.stringify(st), log:lines.join(' | ').slice(0,50)};
  });
  return out;
}catch(e){ return {__err:String(e.message)}; } })()`);
if (many.__err) ck(false, '批量可测', many.__err);
else {
  const want = {
    '健美': { atk: 1, def: 1 }, '冥想': { spa: 1, spDef: 1 }, '龙之舞': { atk: 1, spd: 1 },
    '蝶舞': { spa: 1, spDef: 1, spd: 1 }, '岩石打磨': { spd: 2 }, '铁壁': { def: 2 },
    '瞬间失忆': { spDef: 2 }, '诡计': { spa: 2 }, '剑舞': { atk: 2 }, '磨爪': { atk: 1, hit: 1 },
    '宇宙力量': { def: 1, spDef: 1 }
  };
  Object.keys(many).forEach(nm => {
    const o = many[nm];
    if (typeof o === 'string') { console.log('   ' + nm + '：' + o); return; }
    const got = JSON.parse(o.got), w = want[nm] || {};
    const ok = JSON.stringify(got) === JSON.stringify(w);
    console.log('   ' + (ok ? '✅' : '❌') + ' ' + nm.padEnd(6) + ' 期望 ' + JSON.stringify(w).padEnd(26) + ' 实得 ' + o.got);
    if (!ok) fails.push(nm);
  });
  ck(Object.keys(many).every(nm => {
    if (typeof many[nm] === 'string') return true;
    return JSON.stringify(JSON.parse(many[nm].got)) === JSON.stringify(want[nm] || {});
  }), '全部自我强化招的效果都与官方一致', '');
}

console.log('\n== 控制台异常: ' + errs.length + ' 条 ==');
console.log('\n═══ v66 验收：通过 ' + pass + ' / ' + (pass + fail) + ' ═══');
if (fails.length) console.log('不符项: ' + fails.join(' | '));
ws.close();
process.exit(0);
