/* v54 诊断：异常状态到底有没有实际效果（用户反馈「灼烧只有文本没扣血」）
   逐项实测：
     ① 中毒 / 灼烧 对**玩家**的扣血   ② 对**敌方**的扣血（关键：B.ehp vs B.foe.hp）
     ③ 灼烧是否降低物理招伤害（官方：物攻减半）  ④ 麻痹是否影响速度（官方：速度减半）
     ⑤ 睡眠 / 冰冻 / 麻痹 的行动限制概率         ⑥ 迟缓 slow 是否有任何来源
   用法：node v54-status-diag.mjs [url] [cdpPort] */
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
for (let i = 0; i < 200; i++) { await wait(250); if (await ev("(typeof SPECIES!=='undefined'&&SPECIES.length>1000&&typeof tickBoard==='function')")) break; }

const SETUP = `
  function arena(aLv,bLv){
    localStorage.removeItem(SAVE_KEY); S=freshSave();
    var me=newPet('pk-006'); me.trait='fierce'; me.lv=aLv; me.hp=maxHpOf(me); ensureMoves(me);
    S.party=[me]; S.lead=me.uid; S.pos={x:SPAWN.x,y:SPAWN.y}; enterWorld();
    var foe=initFighter(byId('pk-143'),bLv,'fierce',null); foe.hp=maxHpOf(foe);
    openBattle('wild',{sp:byId('pk-143'), fighter:foe});
    B.ehp=maxHpOf(foe); B.emax=maxHpOf(foe); B.foe.hp=B.ehp;
    return {me:me, foe:B.foe};
  }
`;

console.log('══ 1. 中毒 / 灼烧：对**玩家**的扣血 ══');
const p1 = await ev(`(function(){
  try{
    ${SETUP}
    var a=arena(20,20), me=a.me, out={};
    ['poison','burn'].forEach(function(k){
      me.hp=maxHpOf(me); me.st.status=null;
      setStatus(me,k);
      var before=me.hp, lines=[];
      var ok=tickBoard(me,'我的 喷火龙',lines,true);
      out[k]={before:before, after:me.hp, delta:before-me.hp, lines:lines.join(' | '), canAct:ok};
    });
    me.st.status=null;
    return out;
  }catch(e){ return {__err:String(e.message)}; }
})()`);
if (p1.__err) ck(false, '玩家侧可跑', p1.__err);
else {
  ['poison', 'burn'].forEach(k => {
    const o = p1[k];
    console.log('   ' + STATUS_LABEL(k) + '：HP ' + o.before + ' → ' + o.after + '（扣 ' + o.delta + '）· 日志「' + o.lines + '」');
    ck(o.delta > 0, '玩家' + STATUS_LABEL(k) + '**真的扣血了**', '-' + o.delta + ' HP');
  });
}

console.log('\n══ 2. 中毒 / 灼烧：对**敌方**的扣血（战斗界面读的是 B.ehp）══');
const p2 = await ev(`(function(){
  try{
    ${SETUP}
    var a=arena(20,20), out={};
    ['poison','burn'].forEach(function(k){
      B.ehp=B.emax; B.foe.hp=B.ehp; B.foe.st.status=null;
      setStatus(B.foe,k);
      var beforeEhp=B.ehp, beforeFoeHp=B.foe.hp, lines=[];
      var ok=tickBoard(B.foe,'对手的 卡比兽',lines,false);
      out[k]={beforeEhp:beforeEhp, afterEhp:B.ehp, dEhp:beforeEhp-B.ehp,
              beforeFoeHp:beforeFoeHp, afterFoeHp:B.foe.hp, dFoeHp:beforeFoeHp-B.foe.hp,
              lines:lines.join(' | ')};
    });
    B.foe.st.status=null;
    return out;
  }catch(e){ return {__err:String(e.message)}; }
})()`);
if (p2.__err) ck(false, '敌方侧可跑', p2.__err);
else {
  ['poison', 'burn'].forEach(k => {
    const o = p2[k];
    console.log('   ' + STATUS_LABEL(k) + '：日志说扣了，实际 B.ehp ' + o.beforeEhp + ' → ' + o.afterEhp + '（扣 ' + o.dEhp + '）');
    console.log('        内部 B.foe.hp ' + o.beforeFoeHp + ' → ' + o.afterFoeHp + '（扣 ' + o.dFoeHp + '）· 日志「' + o.lines + '」');
    ck(o.dEhp > 0, '敌方' + STATUS_LABEL(k) + '扣到了**战斗界面读的 B.ehp** 上', '-' + o.dEhp);
    ck(o.dFoeHp > 0 || o.dEhp > 0, '(' + STATUS_LABEL(k) + ' 至少改了一个 HP 字段)', 'B.ehp -' + o.dEhp + ' / B.foe.hp -' + o.dFoeHp);
  });
}

console.log('\n══ 3. 灼烧是否降低物理招伤害（官方：物攻减半）══');
const p3 = await ev(`(function(){
  try{
    ${SETUP}
    var a=arena(30,30), me=a.me;
    var mvId=null; Object.keys(MOVES).forEach(function(k){ if(MOVES[k].name==='撞击') mvId=k; });
    function avg(withBurn,n){
      var sum=0,cnt=0;
      for(var i=0;i<n;i++){
        clearStatus(me); clearStatus(B.foe); B.ehp=B.emax; B.foe.hp=B.ehp;
        if(withBurn) setStatus(me,'burn');
        var before=B.ehp;
        var lines=applyMove(MOVES[mvId], byId('pk-006'), byId('pk-143'), true);
        if(/打空了/.test(lines.join('|'))) continue;
        sum+=before-B.ehp; cnt++;
      }
      clearStatus(me); clearStatus(B.foe);
      return cnt? +(sum/cnt).toFixed(1) : 0;
    }
    return {normal:avg(false,150), burned:avg(true,150), mvId:mvId};
  }catch(e){ return {__err:String(e.message)}; }
})()`);
if (p3.__err) ck(false, '灼烧伤害测试可跑', p3.__err);
else {
  console.log('   物理招（撞击）平均伤害：正常 ' + p3.normal + ' · 灼烧状态 ' + p3.burned);
  const ratio = p3.burned / p3.normal;
  console.log('   比值 ' + ratio.toFixed(3));
  ck(ratio < 0.75, '灼烧会让物理招伤害下降（官方减半）', ratio.toFixed(2) + '×（1.00 表示完全没影响 ❌）');
}

console.log('\n══ 4. 麻痹是否影响速度（官方：速度减半）══');
const p4 = await ev(`(function(){
  try{
    ${SETUP}
    var a=arena(30,30), me=a.me;
    clearStatus(me);
    var normal=spdOf(me);
    setStatus(me,'para');
    var para=spdOf(me);
    clearStatus(me);
    return {normal:normal, para:para, ratio:+(para/normal).toFixed(3)};
  }catch(e){ return {__err:String(e.message)}; }
})()`);
if (p4.__err) ck(false, '麻痹速度测试可跑', p4.__err);
else {
  console.log('   速度：正常 ' + p4.normal + ' · 麻痹 ' + p4.para + '（比值 ' + p4.ratio + '）');
  ck(p4.ratio < 0.75, '麻痹会降低速度（官方减半）', p4.ratio + '×（1.00 表示没影响 ❌）');
}

console.log('\n══ 5. 睡眠 / 冰冻 / 麻痹 的行动限制 ══');
const p5 = await ev(`(function(){
  try{
    ${SETUP}
    var a=arena(20,20), me=a.me, out={};
    ['sleep','freeze','para'].forEach(function(k){
      var blocked=0, n=400;
      for(var i=0;i<n;i++){
        me.hp=maxHpOf(me); me.st.status=null;
        setStatus(me,k);
        var lines=[];
        var ok=tickBoard(me,'我的 喷火龙',lines,true);
        if(!ok) blocked++;
      }
      out[k]=+(blocked/n*100).toFixed(0);
    });
    me.st.status=null;
    return out;
  }catch(e){ return {__err:String(e.message)}; }
})()`);
if (p5.__err) ck(false, '行动限制测试可跑', p5.__err);
else {
  ['sleep', 'freeze', 'para'].forEach(k => {
    console.log('   ' + STATUS_LABEL(k) + '：' + p5[k] + '% 的回合无法行动');
    ck(p5[k] > 5, STATUS_LABEL(k) + '确实会阻止行动', p5[k] + '%');
  });
}

console.log('\n══ 6. 迟缓 slow 是否有任何来源 / 效果 ══');
const p6 = await ev(`(function(){
  var src=[];
  Object.keys(MOVES).forEach(function(id){
    var m=MOVES[id];
    if(m.status && m.status.k==='slow') src.push('招:'+m.name);
  });
  Object.keys(MOVE_FX).forEach(function(nm){
    var f=MOVE_FX[nm];
    if(f && f.status && f.status.k==='slow') src.push('效果表:'+nm);
  });
  Object.keys(FX_BY_TYPE).forEach(function(t){
    var f=FX_BY_TYPE[t];
    if(f && f.status && f.status.k==='slow') src.push('属性兜底:'+t);
  });
  /* tickBoard 里有没有处理 slow 的分支 */
  var src2=tickBoard.toString();
  return {sources:src, tickHandlesSlow:/slow/.test(src2), inName:!!STATUS_NAME.slow, dur:({poison:4,burn:4,para:4,sleep:2,freeze:2,slow:4}).slow};
})()`);
if (p6.__err) ck(false, 'slow 检查可跑', p6.__err);
else {
  console.log('   产生 slow 的来源：' + (p6.sources.length ? p6.sources.join(' / ') : '（无）'));
  console.log('   tickBoard 是否处理 slow：' + p6.tickHandlesSlow + ' · 有名称定义：' + p6.inName + ' · 持续 4 回合');
  ck(p6.sources.length === 0, 'slow **没有任何招式/效果会产生它**（僵尸状态）', p6.sources.length + ' 个来源');
  ck(!p6.tickHandlesSlow, 'slow 在 tickBoard 里也没有任何效果处理', '');
}

function STATUS_LABEL(k) { return { poison: '中毒', burn: '灼烧', para: '麻痹', sleep: '睡眠', freeze: '冰冻', slow: '迟缓' }[k] || k; }

console.log('\n== 控制台异常: ' + errs.length + ' 条 ==');
ck(errs.length === 0, '零控制台异常');
console.log('\n═══ v54 诊断：通过 ' + pass + ' / ' + (pass + fail) + ' ═══');
if (fails.length) console.log('存疑/待修项: ' + fails.join(' | '));
ws.close();
process.exit(0);
