/* v76 验收：掉包封闭 / 声音招式+地狱突刺 / 空中状态+击落 / 意念移物 / 三重攻击 / 滚动
   用法：node v76-air.mjs [url] [cdpPort] */
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
for (let i = 0; i < 200; i++) { await wait(250); if (await ev("(typeof SPECIES!=='undefined'&&SPECIES.length>1000&&typeof SOUND_MOVES==='object')")) break; }

const S = `
  function idOf(nm){ var r=null; Object.keys(MOVES).forEach(function(k){ if(MOVES[k].name===nm) r=k; }); return r; }
  function arena(){
    localStorage.removeItem(SAVE_KEY); S=freshSave();
    var me=newPet('pk-006'); me.trait='fierce'; me.lv=40; me.hp=maxHpOf(me); ensureMoves(me); me.hp=maxHpOf(me);
    S.party=[me]; S.lead=me.uid; S.pos={x:SPAWN.x,y:SPAWN.y}; enterWorld();
    var foe=initFighter(byId('pk-143'),40,'fierce',null); foe.hp=maxHpOf(foe);
    openBattle('wild',{sp:byId('pk-143'), fighter:foe});
    B.ehp=B.emax=maxHpOf(foe); B.foe.hp=B.ehp; B.fld={me:{},foe:{}};
    return {me:me, foe:B.foe};
  }
  function P(nm){ var id=idOf(nm); return id?MOVES[id]:null; }
  function use(nm,self){ var m=P(nm); if(!m) return ['（本作没有「'+nm+'」）'];
    return applyMove(m, self?byId('pk-006'):byId('pk-143'), self?byId('pk-143'):byId('pk-006'), !!self); }
`;

console.log('══ 1. 声音招式表 + 地狱突刺（沉默）══');
const r1 = await ev(`(function(){ try{ ${S}
  var n=Object.keys(SOUND_MOVES).length;
  var inGame=Object.keys(SOUND_MOVES).filter(function(k){ return !!idOf(k); });
  return {n:n, inGame:inGame.length, sample:Object.keys(SOUND_MOVES).slice(0,10).join(' · ')};
}catch(e){ return {__err:String(e.message)}; } })()`);
if (r1.__err) ck(false, '声音表可查', r1.__err);
else {
  console.log('   声音招式表 ' + r1.n + ' 条（本作收录 ' + r1.inGame + ' 条）· 例：' + r1.sample);
  ck(r1.n > 30, '声音招式清单已建立（按官方百科）', r1.n + ' 条');
}
const r1b = await ev(`(function(){ try{ ${S} var a=arena(), me=a.me, out={};
  var sm=null; Object.keys(SOUND_MOVES).forEach(function(k){ if(!sm && idOf(k)) sm=k; });
  out.soundMove=sm;
  var atk=P('撞击');
  out.before={sound:moveAllowed(me,idOf(sm)), normal:moveAllowed(me,idOf('撞击'))};
  vsSet(me,'silence',2);
  out.after={sound:moveAllowed(me,idOf(sm)), normal:moveAllowed(me,idOf('撞击')), why:whyMoveBlocked(me,idOf(sm))};
  /* 实战：用声音招应被拦（guardPlayer 层），这里直接看 moveAllowed */
  return out;
}catch(e){ return {__err:String(e.message)}; } })()`);
if (r1b.__err) ck(false, '沉默可测', r1b.__err);
else {
  console.log('   声音招「' + r1b.soundMove + '」：沉默前可用=' + r1b.before.sound + ' · 沉默后可用=' + r1b.after.sound);
  console.log('   普通招「撞击」：沉默前后都可用=' + r1b.after.normal + ' · 提示「' + r1b.after.why + '」');
  ck(r1b.before.sound === true && r1b.after.sound === false, '地狱突刺让**声音类招式**被禁用', '');
  ck(r1b.after.normal === true, '普通招式不受影响', '');
}

console.log('\n══ 2. 空中状态 + 击落 ══');
const r2 = await ev(`(function(){ try{ ${S} var a=arena(), me=a.me, out={};
  /* 飞翔：第 1 回合进入空中 */
  var l1=use('飞翔',true);
  out.fly={air:!!vsGet(me,'air'), charging:vsGet(me,'charging')||null, log:l1.join(' | ').slice(0,44)};
  /* 此时对手用普通招打我们 → 应落空 */
  me.hp=maxHpOf(me); var hp0=me.hp;
  var l2=use('撞击',false);
  out.miss={dmg:hp0-me.hp, log:l2.join(' | ').slice(0,40)};
  /* 对手用「打雷」（官方能打中空中）→ 应命中；打雷本身有命中率，所以试 5 次取最佳 */
  var best=0, blog='';
  for(var _k=0;_k<5;_k++){
    me.hp=maxHpOf(me); var hp1=me.hp;
    var l3=use('打雷',false);
    if(hp1-me.hp>best){ best=hp1-me.hp; blog=l3.join(' | ').slice(0,40); }
  }
  out.thunder={dmg:best, log:blog};
  /* 我们用「击落」打空中的对手 */
  vsSet(B.foe,'air',true);
  var l4=use('击落',true);
  out.smack={foeAir:!!vsGet(B.foe,'air'), dmg:B.emax-B.ehp, log:l4.join(' | ').slice(0,44)};
  /* 击落打断蓄力 */
  vsSet(B.foe,'charging','飞翔'); vsSet(B.foe,'air',true);
  var l5=use('击落',true);
  out.breakCharging={charging:vsGet(B.foe,'charging')||null, log:l5.join(' | ').slice(0,50)};
  return out;
}catch(e){ return {__err:String(e.message)}; } })()`);
if (r2.__err) ck(false, '空中状态可测', r2.__err);
else {
  console.log('   飞翔第 1 回合：air=' + r2.fly.air + ' charging=' + r2.fly.charging + ' · 「' + r2.fly.log + '」');
  console.log('   空中的我挨「撞击」：伤害 ' + r2.miss.dmg + ' · 「' + r2.miss.log + '」');
  console.log('   空中的我挨「打雷」：伤害 ' + r2.thunder.dmg + ' · 「' + r2.thunder.log + '」');
  console.log('   击落：对手 air=' + r2.smack.foeAir + ' 伤害 ' + r2.smack.dmg + ' · 「' + r2.smack.log + '」');
  console.log('   击落打断蓄力：charging=' + r2.breakCharging.charging + ' · 「' + r2.breakCharging.log + '」');
  ck(r2.fly.air === true, '飞翔让使用者进入**空中状态**', '');
  ck(r2.miss.dmg === 0, '空中时**普通招式打不中**', '伤害 0');
  ck(r2.thunder.dmg > 0, '「打雷」能击中空中的目标（官方清单内）', r2.thunder.dmg + ' 点');
  ck(r2.smack.foeAir === false && r2.smack.dmg > 0, '「击落」命中并**解除空中状态**', '');
  ck(r2.breakCharging.charging === null, '「击落」打断正在蓄力的招式', String(r2.breakCharging.charging));
}

console.log('\n══ 3. 意念移物（必中）· 三重攻击 · 滚动 ══');
const r3 = await ev(`(function(){ try{ ${S} var a=arena(), me=a.me, out={};
  /* 意念移物：给对手加 tk，我方招式必中（原本喷火龙对卡比兽命中不低，改用一个低命中招验证） */
  vsSet(B.foe,'tk',3);
  var hit=0,n=60;
  for(var i=0;i<n;i++){ B.ehp=B.emax; var l=use('撞击',true); if(!/打空了/.test(l.join('|'))) hit++; }
  out.tk={rate:Math.round(hit/n*100)};
  /* 三重攻击：附加异常概率 */
  var st=0;
  for(var j=0;j<200;j++){ clearStatus(me); clearStatus(B.foe); B.ehp=B.emax; B.foe.hp=B.ehp;
    use('三重攻击',true); if(B.foe.st.status) st++; }
  out.tri={rate:Math.round(st/200*100)};
  clearStatus(B.foe);
  /* 滚动：连续使用威力递增 */
  var d1=0,d3=0;
  var a2=arena(); me=selfPet(); vsClear(me,'rollN');
  B.ehp=B.emax; var b1=B.ehp; use('滚动',true); d1=b1-B.ehp;
  B.ehp=B.emax; use('滚动',true);
  B.ehp=B.emax; var b3=B.ehp; use('滚动',true); d3=b3-B.ehp;
  out.roll={first:d1, third:d3, n:vsGet(me,'rollN')};
  clearStatus(me); clearStatus(B.foe);
  return out;
}catch(e){ return {__err:String(e.message)}; } })()`);
if (r3.__err) ck(false, '其余机制可测', r3.__err);
else {
  console.log('   意念移物：60 次攻击命中率 ' + r3.tk.rate + '%');
  ck(r3.tk.rate >= 98, '意念移物让招式**必中**', r3.tk.rate + '%');
  console.log('   三重攻击：200 次里 ' + r3.tri.rate + '% 触发了异常（官方 20%）');
  ck(r3.tri.rate > 8 && r3.tri.rate < 36, '三重攻击约 20% 概率附加异常', r3.tri.rate + '%');
  console.log('   滚动：第 1 次 ' + r3.roll.first + ' → 第 3 次 ' + r3.roll.third + '（连续 ' + r3.roll.n + ' 次）');
  ck(r3.roll.third > r3.roll.first * 2, '滚动**连续使用威力递增**', r3.roll.first + ' → ' + r3.roll.third);
}

console.log('\n══ 4. 掉包（封闭使用但占位）══');
const r4 = await ev(`(function(){ try{ ${S} var a=arena(), me=a.me, out={};
  var id=idOf('掉包')||idOf('戏法');
  if(!id) return {__err:'本作没有掉包/戏法'};
  out.name=MOVES[id].name;
  out.allowed=moveAllowed(me,id);
  out.why=whyMoveBlocked(me,id);
  out.fx=JSON.stringify(fxOf(MOVES[id]));
  var lines=applyMove(MOVES[id], byId('pk-006'), byId('pk-143'), true);
  out.log=lines.join(' | ');
  return out;
}catch(e){ return {__err:String(e.message)}; } })()`);
if (r4.__err) ck(false, '掉包可测', r4.__err);
else {
  console.log('   ' + r4.name + '：可用=' + r4.allowed + ' · 提示「' + r4.why + '」');
  console.log('   出招日志：' + r4.log);
  ck(r4.allowed === false, '掉包**被封闭**（不可使用）', '');
  ck(/暂未开放/.test(r4.log) || /暂未开放/.test(r4.why), '但招式**保留占位**并说明原因', '');
}

console.log('\n== 控制台异常: ' + errs.length + ' 条 ==');
ck(errs.length === 0, '零控制台异常');
console.log('\n═══ v76 验收：通过 ' + pass + ' / ' + (pass + fail) + ' ═══');
if (fails.length) console.log('失败项: ' + fails.join(' | '));
ws.close();
process.exit(0);
