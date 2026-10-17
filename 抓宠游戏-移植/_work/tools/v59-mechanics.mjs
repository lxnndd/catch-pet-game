/* v59 验收：官方机制真正实现（不再是属性兜底）
   ① 连击：乱抓 = 官方 2~5 次（此前本作根本没有 hits 字段，只打一下）
   ② 挑衅：3 回合内对手**只能使用攻击招式**（moveAllowed 生效）
   ③ 定身法 / 折磨 / 畏缩 / 混乱 / 寄生种子 / 束缚 / 扎根 / 哈欠 / 灭亡之歌 / 守住 / 白雾
   ④ 先制 priority：官方数据 37 条，出手判定先比先制度
   ⑤ fxOf 不再给宝可梦招式做属性兜底（洛克招保留）
   用法：node v59-mechanics.mjs [url] [cdpPort] */
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
for (let i = 0; i < 200; i++) { await wait(250); if (await ev("(typeof SPECIES!=='undefined'&&SPECIES.length>1000&&typeof vsSet==='function'&&typeof MOVE_PRI!=='undefined')")) break; }

const ARENA = `
  function idOf(nm){ var r=null; Object.keys(MOVES).forEach(function(k){ if(MOVES[k].name===nm) r=k; }); return r; }
  function arena(aLv,bLv){
    localStorage.removeItem(SAVE_KEY); S=freshSave();
    var me=newPet('pk-006'); me.trait='fierce'; me.lv=aLv; me.hp=maxHpOf(me); ensureMoves(me); me.hp=maxHpOf(me);
    S.party=[me]; S.lead=me.uid; S.pos={x:SPAWN.x,y:SPAWN.y}; enterWorld();
    var foe=initFighter(byId('pk-143'),bLv,'fierce',null); foe.hp=maxHpOf(foe);
    openBattle('wild',{sp:byId('pk-143'), fighter:foe});
    B.ehp=B.emax=maxHpOf(foe); B.foe.hp=B.ehp;
    return {me:me, foe:B.foe};
  }
`;

console.log('══ 1. 连击：乱抓按官方 2~5 次 ══');
const hit = await ev(`(function(){
  try{
    ${ARENA}
    var a=arena(30,30), me=a.me, mvId=idOf('乱抓');
    if(!mvId) return {__err:'没有「乱抓」'};
    var fx=fxOf(MOVES[mvId]);
    var seen={}, n=200;
    for(var i=0;i<n;i++){
      clearStatus(me); clearStatus(B.foe); B.ehp=B.emax; B.foe.hp=B.ehp;
      var before=B.ehp;
      var lines=applyMove(MOVES[mvId], byId('pk-006'), byId('pk-143'), true);
      if(/打空了/.test(lines.join('|'))) continue;      /* 打空不计入连击统计 */
      var m=lines.join('|').match(/命中 (\\d+) 次/);
      var k=m?m[1]:'1';
      seen[k]=(seen[k]||0)+1;
    }
    clearStatus(me); clearStatus(B.foe);
    return {fx:fx, seen:seen, mvHits:MOVES[mvId].hits||null, power:MOVES[mvId].power};
  }catch(e){ return {__err:String(e.message)}; }
})()`);
if (hit.__err) ck(false, '连击测试可跑', hit.__err);
else {
  console.log('   乱抓：威力 ' + hit.power + ' · MOVE_FX=' + JSON.stringify(hit.fx) + ' · MOVES.hits=' + JSON.stringify(hit.mvHits));
  const ks = Object.keys(hit.seen).sort((a, b) => a - b);
  console.log('   200 次实战的连击次数分布：' + ks.map(k => k + '次→' + hit.seen[k]).join(' · '));
  ck(hit.fx && hit.fx.hits && hit.fx.hits[0] === 2 && hit.fx.hits[1] === 5, '官方数据是 2~5 次', JSON.stringify(hit.fx && hit.fx.hits));
  ck(ks.some(k => +k >= 3), '**实战中出现了 3 次以上的连击**（此前永远只打一下）', ks.join('/'));
  ck(ks.every(k => +k >= 2 && +k <= 5), '连击次数落在 2~5 区间内', ks.join('/'));
}

console.log('\n══ 2. 挑衅：只能使用攻击招式 ══');
const taunt = await ev(`(function(){
  try{
    ${ARENA}
    var a=arena(30,30), me=a.me;
    var atkId=idOf('撞击'), stId=idOf('剑舞');
    vsClear(me,'taunt');
    var before={atk:moveAllowed(me,atkId), st:moveAllowed(me,stId)};
    vsSet(me,'taunt',3);
    var after={atk:moveAllowed(me,atkId), st:moveAllowed(me,stId), why:whyMoveBlocked(me,stId)};
    vsClear(me,'taunt');
    return {before:before, after:after};
  }catch(e){ return {__err:String(e.message)}; }
})()`);
if (taunt.__err) ck(false, '挑衅测试可跑', taunt.__err);
else {
  console.log('   挑衅前：攻击招可用=' + taunt.before.atk + ' · 变化技可用=' + taunt.before.st);
  console.log('   挑衅后：攻击招可用=' + taunt.after.atk + ' · 变化技可用=' + taunt.after.st + ' · 提示「' + taunt.after.why + '」');
  ck(taunt.before.st === true && taunt.after.st === false, '挑衅后**变化技被禁用**（官方机制）', '');
  ck(taunt.after.atk === true, '攻击招仍可正常使用', '');
}

console.log('\n══ 3. 各类附加状态的实际结算 ══');
const vol = await ev(`(function(){
  try{
    ${ARENA}
    var a=arena(30,30), me=a.me, out={};
    function tick(setup){
      clearStatus(me); B.foe.st=stZero(); me.hp=maxHpOf(me); B.ehp=B.emax;
      if(setup) setup();
      var h0=me.hp, e0=B.ehp, lines=[];
      var ok=tickBoard(me,'我方',lines,true);
      return {dMy:h0-me.hp, dFoe:B.ehp-e0, canAct:ok, log:lines.join(' | ')};
    }
    out.seed = (function(){
      clearStatus(me); B.foe.st=stZero(); me.hp=maxHpOf(me);
      B.ehp=Math.round(B.emax*0.5);                     /* 对手半血，才看得出"吸血回给它" */
      vsSet(me,'seed',true);
      var h0=me.hp, e0=B.ehp, lines=[];
      tickBoard(me,'我方',lines,true);
      return {dMy:h0-me.hp, dFoe:B.ehp-e0, canAct:true, log:lines.join(' | ')};
    })();
    out.trap    = tick(function(){ vsSet(me,'trapT',4); });
    out.ingrain = tick(function(){ vsSet(me,'ingrain',true); me.hp=Math.round(maxHpOf(me)*0.5); });
    out.yawn    = tick(function(){ vsSet(me,'yawn',2); });
    out.perish  = tick(function(){ vsSet(me,'perish',1); });
    out.flinch  = tick(function(){ vsSet(me,'flinch',true); });
    out.confuse = (function(){
      var selfHurt=0, blocked=0, n=300;
      for(var i=0;i<n;i++){ var r=tick(function(){ vsSet(me,'confusion',3); }); if(r.dMy>0) selfHurt++; if(!r.canAct) blocked++; }
      return {rate:Math.round(selfHurt/n*100), blockRate:Math.round(blocked/n*100)};
    })();
    clearStatus(me); B.foe.st=stZero();
    return out;
  }catch(e){ return {__err:String(e.message)}; }
})()`);
if (vol.__err) ck(false, '附加状态测试可跑', vol.__err);
else {
  ck(vol.seed.dMy > 0 && vol.seed.dFoe > 0, '寄生种子：自己掉血、对手回血', '我 -' + vol.seed.dMy + ' / 它 +' + vol.seed.dFoe);
  ck(vol.trap.dMy > 0, '束缚：每回合扣血', '-' + vol.trap.dMy);
  ck(vol.ingrain.dMy < 0, '扎根：每回合回血', '+' + (-vol.ingrain.dMy));
  ck(vol.yawn.canAct === true, '哈欠：当回合仍能行动（只是倒计时）', vol.yawn.log.slice(0, 30));
  ck(vol.perish.dMy > 0 || !vol.perish.canAct, '灭亡之歌：倒数结束即倒下', vol.perish.log.slice(0, 36));
  ck(vol.flinch.canAct === false, '畏缩：**本回合无法行动**', vol.flinch.log.slice(0, 30));
  console.log('   混乱：' + vol.confuse.rate + '% 回合自伤 · ' + vol.confuse.blockRate + '% 回合无法行动');
  ck(vol.confuse.rate > 10 && vol.confuse.rate < 55, '混乱：约 1/3 回合自伤（官方 33%）', vol.confuse.rate + '%');
}

console.log('\n══ 4. 守住（完全免伤）与白雾（能力不被降低）══');
const guard = await ev(`(function(){
  try{
    ${ARENA}
    var a=arena(30,30), me=a.me, out={};
    var atkId=idOf('撞击');
    vsSet(B.foe,'protect',true);
    B.ehp=B.emax;
    var lines=applyMove(MOVES[atkId], byId('pk-006'), byId('pk-143'), true);
    out.protect={dmg:B.emax-B.ehp, log:lines.join(' | ')};
    vsClear(B.foe,'protect');
    /* 白雾：让**对手用降能力招**打我，看是否被挡下（拦截点在 applyMove 里，不在 addStage） */
    var growlId=idOf('叫声');
    vsSet(me,'mist',5); me.st.atk=0;
    applyMove(MOVES[growlId], byId('pk-143'), byId('pk-006'), false);
    out.mist={atk:me.st.atk};
    vsClear(me,'mist'); me.st.atk=0;
    applyMove(MOVES[growlId], byId('pk-143'), byId('pk-006'), false);
    out.noMist={atk:me.st.atk};
    clearStatus(me);
    return out;
  }catch(e){ return {__err:String(e.message)}; }
})()`);
if (guard.__err) ck(false, '守住/白雾测试可跑', guard.__err);
else {
  console.log('   守住：伤害 ' + guard.protect.dmg + ' · 日志「' + guard.protect.log + '」');
  ck(guard.protect.dmg === 0 && /保护罩/.test(guard.protect.log), '守住完全挡下攻击（官方 protect）', '');
  console.log('   白雾：被降能力后 atk=' + guard.mist.atk + ' · 无白雾对照 atk=' + guard.noMist.atk);
  ck(guard.mist.atk === 0, '白雾挡下了对手的能力降低', 'atk=' + guard.mist.atk);
  ck(guard.noMist.atk === -1, '（对照）没有白雾时正常下降', 'atk=' + guard.noMist.atk);
}

console.log('\n══ 5. 先制度 priority ══');
const pri = await ev(`(function(){
  var n=Object.keys(MOVE_PRI).length;
  var sample=Object.keys(MOVE_PRI).slice(0,8).map(function(id){ return (MOVES[id]?MOVES[id].name:id)+':'+MOVE_PRI[id]; });
  function idOf(nm){ var r=null; Object.keys(MOVES).forEach(function(k){ if(MOVES[k].name===nm) r=k; }); return r; }
  return {n:n, sample:sample, quick:priOf(idOf('电光一闪')), tackle:priOf(idOf('撞击'))};
})()`);
if (pri.__err) ck(false, '先制度可查', pri.__err);
else {
  console.log('   官方先制招式 ' + pri.n + ' 条 · 例：' + pri.sample.join(' · '));
  ck(pri.n > 20, '先制数据已注入（37 条官方数据）', pri.n + ' 条');
  ck(pri.tackle === 0, '普通招先制度为 0', String(pri.tackle));
  if (pri.quick !== undefined) ck(pri.quick > 0, '「电光一闪」这类先制招 > 0', String(pri.quick));
}

console.log('\n══ 6. fxOf 不再给宝可梦招式做属性兜底 ══');
const fb = await ev(`(function(){
  function idOf(nm){ var r=null; Object.keys(MOVES).forEach(function(k){ if(MOVES[k].name===nm) r=k; }); return r; }
  var out={};
  ['挑衅','定身法','奇异之光','守住','剑舞','空气之刃'].forEach(function(nm){
    var id=idOf(nm); var mv=MOVES[id];
    out[nm]={isPoke:!!POKE_MOVES[nm], fx:mv?JSON.stringify(fxOf(mv)):null};
  });
  /* 洛克招（不在宝可梦表里）应仍保留属性兜底 */
  var kz=null;
  Object.keys(MOVES).forEach(function(id){ if(!kz && !POKE_MOVES[MOVES[id].name] && MOVES[id].cat==='变化') kz=MOVES[id].name; });
  out.__kz={name:kz, fx:kz?JSON.stringify(fxOf(MOVES[idOf(kz)])):null};
  return out;
})()`);
if (fb.__err) ck(false, '兜底检查可跑', fb.__err);
else {
  Object.keys(fb).filter(k => k !== '__kz').forEach(nm => {
    console.log('   ' + nm + '：宝可梦招=' + fb[nm].isPoke + ' → ' + fb[nm].fx);
  });
  ck(fb['挑衅'] && /taunt/.test(fb['挑衅'].fx), '「挑衅」现在有**真实的官方机制**（taunt），不是降防御', fb['挑衅'].fx);
  ck(fb['守住'] && /protect/.test(fb['守住'].fx), '「守住」是 protect（完全免伤），不是防御+1', fb['守住'].fx);
  console.log('   洛克变化技样本：' + fb.__kz.name + ' → ' + fb.__kz.fx);
  ck(fb.__kz.fx && fb.__kz.fx !== 'null', '洛克招式仍保留属性兜底（它们没有官方数据）', fb.__kz.fx);
}

console.log('\n== 控制台异常: ' + errs.length + ' 条 ==');
ck(errs.length === 0, '零控制台异常');
console.log('\n═══ v59 验收：通过 ' + pass + ' / ' + (pass + fail) + ' ═══');
if (fails.length) console.log('失败项: ' + fails.join(' | '));
ws.close();
process.exit(fail ? 1 : 0);
