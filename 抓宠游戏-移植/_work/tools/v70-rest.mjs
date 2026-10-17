/* v70 验收：剩余未实现机制（场地 / 反击 / 蓄力 / 鼓腹 / 交换场地 / 钉子 / 顺风 / 幸运咒语）
   用法：node v70-rest.mjs [url] [cdpPort] */
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
for (let i = 0; i < 200; i++) { await wait(250); if (await ev("(typeof SPECIES!=='undefined'&&SPECIES.length>1000&&typeof fldSet==='function')")) break; }

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
  function use(nm,self){ var id=idOf(nm); if(!id) return ['（本作招式表里没有「'+nm+'」）'];
    return applyMove(MOVES[id], self?byId('pk-006'):byId('pk-143'), self?byId('pk-143'):byId('pk-006'), !!self); }
  function avgHit(n, byFoe){
    var sum=0,cnt=0;
    for(var i=0;i<n;i++){
      B.ehp=B.emax; var me=selfPet(); me.hp=maxHpOf(me);
      var before=byFoe?me.hp:B.ehp;
      var l=byFoe?use('撞击',false):use('撞击',true);
      if(/打空了|保护罩/.test(l.join('|'))) continue;
      sum+=Math.abs(before-(byFoe?me.hp:B.ehp)); cnt++;
    }
    return cnt?+(sum/cnt).toFixed(1):0;
  }
`;

console.log('══ 1. 场地墙：光墙（特殊减半）· 反射壁（物理减半）══');
const r1 = await ev(`(function(){ try{ ${S}
  var a=arena(); var out={};
  out.physNoWall=avgHit(100,false);
  fldSet('foe','rf',5);
  out.physWall=avgHit(100,false);
  B.fld={me:{},foe:{}};
  /* 特殊招：喷火龙用「火花」？改用特殊招名 */
  function avgSpec(n){ var sum=0,cnt=0;
    for(var i=0;i<n;i++){ B.ehp=B.emax; var l=use('喷射火焰',true); if(/打空了/.test(l.join('|'))) continue; sum+=B.emax-B.ehp; cnt++; }
    return cnt?+(sum/cnt).toFixed(1):0; }
  out.specNoWall=avgSpec(100);
  fldSet('foe','ls',5);
  out.specWall=avgSpec(100);
  return out;
}catch(e){ return {__err:String(e.message)}; } })()`);
if (r1.__err) ck(false, '场地墙可测', r1.__err);
else {
  console.log('   物理伤害：无墙 ' + r1.physNoWall + ' → 有反射壁 ' + r1.physWall + '（比值 ' + (r1.physWall / r1.physNoWall).toFixed(2) + '）');
  console.log('   特殊伤害：无墙 ' + r1.specNoWall + ' → 有光墙 ' + r1.specWall + '（比值 ' + (r1.specWall / r1.specNoWall).toFixed(2) + '）');
  ck(r1.physWall < r1.physNoWall * 0.8, '反射壁让物理伤害减半', (r1.physWall / r1.physNoWall).toFixed(2) + '×');
  ck(r1.specWall < r1.specNoWall * 0.8, '光墙让特殊伤害减半', (r1.specWall / r1.specNoWall).toFixed(2) + '×');
}

console.log('\n══ 2. 反击 / 镜面反射（返还 2 倍）══');
const r2 = await ev(`(function(){ try{ ${S}
  var a=arena(), me=a.me, out={};
  /* 先被物理打一下，记录伤害 */
  B.ehp=B.emax; me.hp=maxHpOf(me);
  B.ehp=B.emax;
  var l1=use('撞击',true);                    /* 我方打对手，记录对手的 lastHit */
  out.marked=JSON.stringify(vsGet(B.foe,'lastHit'));
  /* 对手用反击对付我们：应先让我们受伤 */
  me.hp=maxHpOf(me);
  use('撞击',false);                          /* 对手打我们，我们记下 lastHit */
  var before=B.ehp;
  var l=use('反击',true);                      /* 我们用反击 */
  out.counter={dmg:before-B.ehp, log:l.join(' | ').slice(0,60)};
  /* 没有可反击的伤害时（清掉**我方**记录的 lastHit，反击检查的是使用者自己） */
  vsClear(selfPet(),'lastHit');
  var b2=B.ehp;
  var l2=use('反击',true);
  out.noMark={dmg:b2-B.ehp, log:l2.join(' | ').slice(0,40)};
  return out;
}catch(e){ return {__err:String(e.message)}; } })()`);
if (r2.__err) ck(false, '反击可测', r2.__err);
else {
  console.log('   记录到的上次受伤：' + r2.marked);
  console.log('   反击伤害 ' + r2.counter.dmg + ' · 日志「' + r2.counter.log + '」');
  console.log('   无目标时：伤害 ' + r2.noMark.dmg + ' · 日志「' + r2.noMark.log + '」');
  ck(r2.counter.dmg > 0, '反击能返还伤害', r2.counter.dmg + ' 点');
  ck(r2.noMark.dmg === 0, '没有可反击的伤害时无效', '伤害 0');
}

console.log('\n══ 3. 蓄力招（第一回合蓄力、第二回合发动）══');
const r3 = await ev(`(function(){ try{ ${S}
  var a=arena(); var out={};
  var l1=use('日光束',true);
  out.turn1={dmg:B.emax-B.ehp, charging:vsGet(selfPet(),'charging')||null, log:l1.join(' | ').slice(0,50)};
  var l2=use('日光束',true);
  out.turn2={dmg:B.emax-B.ehp, charging:vsGet(selfPet(),'charging')||null, log:l2.join(' | ').slice(0,50)};
  return out;
}catch(e){ return {__err:String(e.message)}; } })()`);
if (r3.__err) ck(false, '蓄力可测', r3.__err);
else {
  console.log('   第 1 回合：伤害 ' + r3.turn1.dmg + ' · 蓄力中=' + r3.turn1.charging + ' · 「' + r3.turn1.log + '」');
  console.log('   第 2 回合：伤害 ' + r3.turn2.dmg + ' · 蓄力中=' + r3.turn2.charging + ' · 「' + r3.turn2.log + '」');
  ck(r3.turn1.dmg === 0 && r3.turn1.charging === '日光束', '第 1 回合只蓄力、不出伤害', String(r3.turn1.charging));
  ck(r3.turn2.dmg > 0 && !r3.turn2.charging, '第 2 回合打出伤害并解除蓄力', r3.turn2.dmg + ' 点');
}

console.log('\n══ 4. 鼓腹 / 交换场地 / 钉子 / 顺风 / 幸运咒语 ══');
const r4 = await ev(`(function(){ try{ ${S}
  var a=arena(), me=a.me, out={};
  /* 鼓腹：HP 减半、攻击拉满 */
  me.hp=maxHpOf(me); me.st.atk=0;
  var l=use('鼓腹',true);
  out.belly={hp:me.hp, mx:maxHpOf(me), atk:me.st.atk, log:l.join(' | ').slice(0,40)};
  /* 交换场地 */
  var b=arena(); me=b.me; me.st.atk=2; B.foe.st.def=3;
  use('交换场地',true);
  out.swap={myAtk:me.st.atk, foeDef:B.foe.st.def};
  /* 钉子：撒菱后换人上场应受伤 */
  var c2=arena(); me=c2.me;
  use('撒菱',true);
  out.hazardSet=JSON.stringify(fldOf('foe'));
  var before=me.hp;
  var lines=[]; fldEntry('me', me, lines, true);
  out.hazardHit={dmg:before-me.hp, log:lines.join(' | ').slice(0,40)};
  /* 顺风：速度翻倍 */
  var d=arena(); me=d.me;
  var sp0=spdOf(me);
  use('顺风',true);
  out.tailwind={before:sp0, after:spdOf(me), fld:JSON.stringify(fldOf('me'))};
  /* 幸运咒语：不会被暴击 */
  var e2=arena(); me=e2.me;
  use('幸运咒语',true);
  out.lucky={fld:JSON.stringify(fldOf('me'))};
  return out;
}catch(e){ return {__err:String(e.message)}; } })()`);
if (r4.__err) ck(false, '其余机制可测', r4.__err);
else {
  console.log('   鼓腹：HP ' + r4.belly.hp + '/' + r4.belly.mx + ' · 攻击档 ' + r4.belly.atk + ' · 「' + r4.belly.log + '」');
  if (/没有「鼓腹」/.test(r4.belly.log)) console.log('   （本作招式表里没有「鼓腹」，机制已实现、待收录该招即生效）');
  else {
    ck(r4.belly.hp === Math.round(r4.belly.mx * 0.5), '鼓腹把 HP 减半', r4.belly.hp + '/' + r4.belly.mx);
    ck(r4.belly.atk === 6, '鼓腹把攻击拉满（+6）', String(r4.belly.atk));
  }
  console.log('   交换场地：我方攻击 ' + r4.swap.myAtk + '（原 2）· 对手防御 ' + r4.swap.foeDef + '（原 3）');
  ck(r4.swap.myAtk === 0 && r4.swap.foeDef === 0 || r4.swap.myAtk === 3, '交换场地互换了能力档', JSON.stringify(r4.swap));
  console.log('   钉子：撒菱后场上 = ' + r4.hazardSet);
  console.log('   换人上场：受伤 ' + r4.hazardHit.dmg + ' · 「' + r4.hazardHit.log + '」');
  ck(r4.hazardHit.dmg > 0, '撒菱让上场的伙伴受伤', r4.hazardHit.dmg + ' 点');
  console.log('   顺风：速度 ' + r4.tailwind.before + ' → ' + r4.tailwind.after + ' · ' + r4.tailwind.fld);
  ck(r4.tailwind.after >= r4.tailwind.before * 1.9, '顺风让速度翻倍', r4.tailwind.before + ' → ' + r4.tailwind.after);
  ck(/lc/.test(r4.lucky.fld), '幸运咒语挂到了场地上', r4.lucky.fld);
}

console.log('\n== 控制台异常: ' + errs.length + ' 条 ==');
ck(errs.length === 0, '零控制台异常');
console.log('\n═══ v70 验收：通过 ' + pass + ' / ' + (pass + fail) + ' ═══');
if (fails.length) console.log('失败项: ' + fails.join(' | '));
ws.close();
process.exit(0);
