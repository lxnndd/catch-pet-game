/* v52 验收：修「一个回合内敌方打两次」
   场景：敌方速度更快 → 走「先手」分支（enemyStrike 先打一下）→ 玩家出招 → 原来还会再调
        enemyTurnSoon 让敌方打第二次。现在该路径下不再调敌方回合。
   判定：一个玩家操作周期内，敌方行动次数（enemyStrike + enemyTurn）必须恰好为 1。
   用法：node v52-verify.mjs [url] [cdpPort] */
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
for (let i = 0; i < 200; i++) { await wait(250); if (await ev("(typeof SPECIES!=='undefined'&&SPECIES.length>1000&&typeof useMove==='function')")) break; }

/* ── 准备一个「我慢、敌快」的战斗，并把 enemyStrike / enemyTurn 挂上计数器 ── */
const SETUP = `
  function setup(slowId, fastId, lv){
    localStorage.removeItem(SAVE_KEY); S=freshSave();
    var me=newPet(slowId); me.trait='fierce'; me.lv=lv; me.hp=maxHpOf(me); ensureMoves(me); me.hp=maxHpOf(me);
    S.party=[me]; S.lead=me.uid; S.pos={x:SPAWN.x,y:SPAWN.y}; enterWorld();
    var foe=initFighter(byId(fastId),lv,'fierce',null); foe.hp=maxHpOf(foe);
    openBattle('wild',{sp:byId(fastId), fighter:foe});
    B.ehp=B.emax=maxHpOf(foe); B.foe.hp=B.ehp;
    if($('battle-log')) $('battle-log').textContent='';
    window.__cnt={strike:0,turn:0};
    var _es=enemyStrike, _et=enemyTurn;
    window.enemyStrike=function(){ window.__cnt.strike++; return _es.apply(null,arguments); };
    window.enemyTurn=function(){ window.__cnt.turn++; return _et.apply(null,arguments); };
    window.__restore=function(){ window.enemyStrike=_es; window.enemyTurn=_et; };
    return {mySpe:speOf(byId(slowId),lv), foeSpe:speOf(byId(fastId),lv), myName:byId(slowId).name, foeName:byId(fastId).name,
            mid:Object.keys(B.sPP).filter(function(k){return B.sPP[k]>0;})[0]};
  }
`;

console.log('══ 1. 敌方速度更快 → 先手分支：本回合它只该动一次 ══');
const a = await ev(`(function(){ try{ ${SETUP} return setup('pk-143','pk-025',20); }catch(e){ return {__err:String(e.message)}; } })()`);
if (a.__err) ck(false, '先手场景可建', a.__err);
else {
  console.log('   我：' + a.myName + ' 速度 ' + a.mySpe + ' · 敌：' + a.foeName + ' 速度 ' + a.foeSpe + '（敌更快）');
  await ev(`(function(){
    var _r=Math.random; Math.random=function(){ return 0.1; };   /* 强制命中「65% 先手」判定 */
    useMove(window.__mid || Object.keys(B.sPP).filter(function(k){return B.sPP[k]>0;})[0]);
    Math.random=_r; return 1;
  })()`);
  await wait(4000);
  const r1 = await ev(`(function(){
    var c=window.__cnt||{strike:0,turn:0};
    var t=($('battle-log')?$('battle-log').textContent:'');
    return {strike:c.strike, turn:c.turn, total:c.strike+c.turn, busy:(typeof B!=='undefined'&&B)?B.busy:null, log:t};
  })()`);
  console.log('   日志：' + String(r1.log).replace(/\s+/g, ' ').slice(0, 200));
  console.log('   敌方行动次数：先手 strike=' + r1.strike + ' · 常规回合 turn=' + r1.turn);
  ck(r1.strike === 1, '先手那一下发生了（enemyStrike = 1）', String(r1.strike));
  ck(r1.turn === 0, '**玩家出招后敌方不再有第二次行动**（enemyTurn = 0）', String(r1.turn));
  ck(r1.total === 1, '一个玩家操作周期内敌方总共只动 1 次', r1.total + ' 次');
  ck(r1.busy === false, '出手权已交还玩家（busy=false）', String(r1.busy));
  await ev("window.__restore && window.__restore(); 1");
}

console.log('\n══ 2. 玩家先手（未触发先手分支）：敌方正常行动一次 ══');
const b = await ev(`(function(){ try{ ${SETUP} return setup('pk-143','pk-025',20); }catch(e){ return {__err:String(e.message)}; } })()`);
if (b.__err) ck(false, '对照场景可建', b.__err);
else {
  await ev(`(function(){
    var _r=Math.random; Math.random=function(){ return 0.99; };   /* 不触发先手 */
    useMove(Object.keys(B.sPP).filter(function(k){return B.sPP[k]>0;})[0]);
    Math.random=_r; return 1;
  })()`);
  await wait(4000);
  const r2 = await ev(`(function(){
    var c=window.__cnt||{strike:0,turn:0};
    var t=($('battle-log')?$('battle-log').textContent:'');
    return {strike:c.strike, turn:c.turn, total:c.strike+c.turn, busy:(typeof B!=='undefined'&&B)?B.busy:null, log:t};
  })()`);
  console.log('   日志：' + String(r2.log).replace(/\s+/g, ' ').slice(0, 200));
  console.log('   敌方行动次数：先手 strike=' + r2.strike + ' · 常规回合 turn=' + r2.turn);
  ck(r2.total === 1, '玩家先手时敌方也恰好行动 1 次', r2.total + ' 次');
  ck(r2.strike + r2.turn === 1, '敌方恰好行动一次（v57 起先制度可能让它走先手分支）', 'strike=' + r2.strike + ' turn=' + r2.turn);
  ck(r2.busy === false, '出手权交还玩家', String(r2.busy));
  await ev("window.__restore && window.__restore(); 1");
}

console.log('\n══ 3. 连续 3 个玩家回合：敌方总行动次数应等于回合数 ══');
const c3 = await ev(`(function(){ try{ ${SETUP} return setup('pk-143','pk-025',20); }catch(e){ return {__err:String(e.message)}; } })()`);
if (c3.__err) ck(false, '连续回合场景可建', c3.__err);
else {
  for (let k = 0; k < 3; k++) {
    await ev(`(function(){
      if(!B || B.busy) return 0;
      var _r=Math.random; Math.random=function(){ return 0.1; };
      useMove(Object.keys(B.sPP).filter(function(k2){return B.sPP[k2]>0;})[0]);
      Math.random=_r; return 1;
    })()`);
    await wait(4000);
  }
  const r3 = await ev(`(function(){
    var c=window.__cnt||{strike:0,turn:0};
    var t=($('battle-log')?$('battle-log').textContent:'');
    var acts=(t.match(/够赞狗|皮卡丘/g)||[]).length;
    return {strike:c.strike, turn:c.turn, total:c.strike+c.turn,
            hpLossMy:(typeof B!=='undefined'&&B)?(B.foe?B.foe.hp:null):null,
            lines:t.split(String.fromCharCode(10)).length};
  })()`);
  console.log('   3 个玩家回合后：敌方行动 ' + r3.total + ' 次（先手 ' + r3.strike + ' + 常规 ' + r3.turn + '）');
  ck(r3.total <= 3, '**3 个玩家回合内敌方不超过 3 次行动**（修前会到 6 次）', r3.total + ' 次');
  ck(r3.total >= 3, '也不少于 3 次（每回合都该有行动）', r3.total + ' 次');
  await ev("window.__restore && window.__restore(); 1");
}

console.log('\n== 控制台异常: ' + errs.length + ' 条 ==');
ck(errs.length === 0, '零控制台异常');
console.log('\n═══ v52 验收：通过 ' + pass + ' / ' + (pass + fail) + ' ═══');
if (fails.length) console.log('失败项: ' + fails.join(' | '));
ws.close();
process.exit(fail ? 1 : 0);
