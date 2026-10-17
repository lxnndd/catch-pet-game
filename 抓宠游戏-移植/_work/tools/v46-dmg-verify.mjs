/* v46 验收：修掉「等级压制被平方」+ 等级压制改成按等级差
   用户报的场景：火花（小火龙 Lv5）打小箭雀（小箭雀 Lv7）—— 打 4 点，被打 20 点（约 5 倍差距）
   修复要点：① atkM 里重复的 lvPress 删掉（原来 atkM 一次、base 一次 → 平方）
             ② lvPress 从「等级比值」改成「等级差」：1 + 0.0225×Δ，钳制 0.75~1.9
   检查：用户场景伤害比显著收窄；同级节奏不变；越级仍被压制；虐菜仍有优势
   用法：node v46-dmg-verify.mjs [url] [cdpPort] */
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

/* 通用取样器：aId/aLv 打 bId/bLv，各自用指定招式，返回平均伤害与占比 */
const SAMPLER = `
  function idOf(nm){ var r=null; Object.keys(MOVES).forEach(function(k){ if(MOVES[k].name===nm) r=k; }); return r; }
  function one(aId,aLv,aTrait,aMv,bId,bLv,bTrait,bMv,n){
    localStorage.removeItem(SAVE_KEY); S=freshSave();
    var a=newPet(aId); a.trait=aTrait; a.lv=aLv; a.hp=maxHpOf(a); a.moves=[aMv]; syncPP(a);
    S.party=[a]; S.lead=a.uid; S.pos={x:SPAWN.x,y:SPAWN.y}; enterWorld();
    var foe=initFighter(byId(bId),bLv,bTrait,null); foe.hp=maxHpOf(foe);
    openBattle('wild',{sp:byId(bId), fighter:foe});
    B.ehp=maxHpOf(foe); B.emax=maxHpOf(foe); B.foe.hp=B.ehp;
    var me=selfPet();
    function avg(mvId, isSelf, times){
      var sum=0, cnt=0, mx=0, mn=1e9;
      for(var i=0;i<times;i++){
        clearStatus(me); clearStatus(B.foe); B.ehp=B.emax; B.foe.hp=B.ehp; me.hp=maxHpOf(me);
        var before = isSelf ? B.ehp : me.hp;
        var lines=applyMove(MOVES[mvId], byId(isSelf?aId:bId), byId(isSelf?bId:aId), isSelf);
        var after = isSelf ? B.ehp : me.hp;
        var d=Math.max(0, before-after);
        if(/打空了/.test(lines.join('|'))) continue;
        sum+=d; cnt++; if(d>mx) mx=d; if(d<mn) mn=d;
      }
      return cnt? {avg:+(sum/cnt).toFixed(1), min:mn, max:mx, n:cnt} : null;
    }
    var aMvO=one_mv(aMv), bMvO=one_mv(bMv);
    function one_mv(x){ return x; }
    var out={
      aHp:maxHpOf(me), bHp:maxHpOf(B.foe),
      aStats:{atk:atkOf(byId(aId),aLv), def:defOf(byId(aId),aLv), spa:spaOf(byId(aId),aLv), spDef:spDefOf(byId(aId),aLv)},
      bStats:{atk:atkOf(byId(bId),bLv), def:defOf(byId(bId),bLv), spa:spaOf(byId(bId),bLv), spDef:spDefOf(byId(bId),bLv)},
      aHit:avg(aMv,true,n), bHit:avg(bMv,false,n)
    };
    if(B) closeBattle();
    return out;
  }
`;

console.log('══ 1. 用户报的场景：火花 Lv5（小火龙·坚韧） vs 小箭雀 Lv7（莽勇）══');
const s1 = await ev(`(function(){
  try{
    ${SAMPLER}
    var MVK=idOf('爆击枪'), MVZ=idOf('啄');
    var mvNames={k:MVK?MOVES[MVK].name:'(没有爆击枪)', z:MVZ?MOVES[MVZ].name:'(没有啄)'};
    var r=one('pk-004',5,'tough',MVK,'pk-661',7,'brute',MVZ,300);
    r.mvNames=mvNames; r.lvPress={mine:+(1+0.0225*(5-7)).toFixed(3), foe:+(1+0.0225*(7-5)).toFixed(3)};
    return r;
  }catch(e){ return {__err:String(e.message)}; }
})()`);
if (s1.__err) ck(false, '场景可复现', s1.__err);
else {
  console.log('   火花: HP ' + s1.aHp + ' · 攻' + s1.aStats.atk + ' 防' + s1.aStats.def + ' 特攻' + s1.aStats.spa + ' 特防' + s1.aStats.spDef);
  console.log('   小箭雀: HP ' + s1.bHp + ' · 攻' + s1.bStats.atk + ' 防' + s1.bStats.def + ' 特攻' + s1.bStats.spa + ' 特防' + s1.bStats.spDef);
  console.log('   我方打它（' + (s1.mvNames.k) + '）：平均 ' + s1.aHit.avg + '（' + s1.aHit.min + '~' + s1.aHit.max + '）= 对方血量的 ' + (s1.aHit.avg / s1.bHp * 100).toFixed(1) + '%');
  console.log('   它打我（' + (s1.mvNames.z) + '）：平均 ' + s1.bHit.avg + '（' + s1.bHit.min + '~' + s1.bHit.max + '）= 我血量的 ' + (s1.bHit.avg / s1.aHp * 100).toFixed(1) + '%');
  const ratio = s1.bHit.avg / s1.aHit.avg;
  console.log('   伤害比 = ' + ratio.toFixed(2) + ' 倍（修复前实测约 5 倍：4 vs 20）');
  ck(ratio < 3.2, '**伤害比收窄到 3.2 倍以内**（原来约 5 倍）', ratio.toFixed(2) + ' 倍');
  ck(s1.aHit.avg >= 4, '我方伤害不再低到 4 点', s1.aHit.avg + ' 点');
  const turnsToKillFoe = s1.bHp / s1.aHit.avg, turnsToKillMe = s1.aHp / s1.bHit.avg;
  console.log('   需要 ' + turnsToKillFoe.toFixed(1) + ' 回合打死它 · 它需要 ' + turnsToKillMe.toFixed(1) + ' 回合打死我');
  ck(turnsToKillMe >= 2, '我不会被两下带走', turnsToKillMe.toFixed(1) + ' 回合');
}

console.log('\n══ 2. 同级节奏不变（这是历次平衡的基准）══');
const s2 = await ev(`(function(){
  try{
    ${SAMPLER}
    var r=one('pk-006',20,'fierce',idOf('喷射火焰'),'pk-143',20,'fierce',idOf('撞击'),300);
    return {dmg:r.aHit.avg, hp:r.bHp, pct:+(r.aHit.avg/r.bHp*100).toFixed(0), turns:+(r.bHp/r.aHit.avg).toFixed(1)};
  }catch(e){ return {__err:String(e.message)}; }
})()`);
if (s2.__err) ck(false, '同级场景可跑', s2.__err);
else {
  console.log('   20 级喷火龙打 20 级卡比兽：' + s2.dmg + ' / ' + s2.hp + ' = ' + s2.pct + '% → ' + s2.turns + ' 回合');
  ck(s2.pct >= 20 && s2.pct <= 50, '同级每击占比仍在 20~50%（v26 基准 36%）', s2.pct + '%');
  ck(s2.turns >= 2 && s2.turns <= 5, '同级 2~5 回合结束', s2.turns + ' 回合');
}

console.log('\n══ 3. 越级仍被压制 / 虐菜仍有优势 ══');
const s3 = await ev(`(function(){
  try{
    ${SAMPLER}
    var up=one('pk-005',20,'fierce',idOf('喷射火焰'),'pk-319',56,'fierce',idOf('撞击'),200);
    var dn=one('pk-005',56,'fierce',idOf('喷射火焰'),'pk-319',20,'fierce',idOf('撞击'),200);
    var same=one('pk-005',20,'fierce',idOf('喷射火焰'),'pk-319',20,'fierce',idOf('撞击'),200);
    return {
      up:{dmg:up.aHit.avg, hp:up.bHp, pct:+(up.aHit.avg/up.bHp*100).toFixed(1)},
      dn:{dmg:dn.aHit.avg, hp:dn.bHp, pct:+(dn.aHit.avg/dn.bHp*100).toFixed(1)},
      same:{pct:+(same.aHit.avg/same.bHp*100).toFixed(1)},
      ratio:+(same.aHit.avg/dn.aHit.avg).toFixed(2)
    };
  }catch(e){ return {__err:String(e.message)}; }
})()`);
if (s3.__err) ck(false, '越级场景可跑', s3.__err);
else {
  console.log('   20 打 56：' + s3.up.dmg + ' / ' + s3.up.hp + ' = ' + s3.up.pct + '%');
  console.log('   20 打 20：' + s3.same.pct + '%');
  console.log('   56 打 20：' + s3.dn.dmg + ' / ' + s3.dn.hp + ' = ' + s3.dn.pct + '%');
  ck(s3.up.pct <= 12, '越级 36 级时每击 ≤12%（v26 用户案例断言）', s3.up.pct + '%');
  ck(s3.same.pct / s3.up.pct >= 3, '同级 / 越级 伤害比 ≥3 倍（压制仍在）', (s3.same.pct / s3.up.pct).toFixed(1) + ' 倍');
  ck(s3.dn.pct >= s3.same.pct * 1.5, '虐菜仍明显更痛（56 打 20 ≥ 同级的 1.5 倍）', s3.dn.pct + '% vs ' + s3.same.pct + '%');
}

console.log('\n══ 4. 自创等级系数已彻底移除、改用官方公式主体（直接检查函数源码）══');
/* 注意：正则必须写在 Node 端 —— 放进模板字符串会被转义吃掉（v43c/v46 都踩过） */
const srcText = await ev("applyMove.toString()");
if (typeof srcText !== 'string') { ck(false, '源码检查可跑', String(srcText && srcText.__err || srcText)); }
else {
  const code = srcText.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const baseLine = (code.match(/var base=[^;]*/) || [''])[0];
  const statMulLine = (code.match(/var statMul=[^;]*/) || [''])[0];
  const atkMLine = (code.match(/var atkM=[^;]*/) || [''])[0];
  console.log('   statMul = ' + statMulLine.replace(/\s+/g, ' ').slice(0, 80));
  console.log('   base    = ' + baseLine.replace(/\s+/g, ' ').slice(0, 120));
  ck(!/lvPress/.test(code), '已移除 lvPress（自创的等级压制）', '');
  ck(!/lvBonus/.test(code), '已移除 lvBonus（自创的等级伤害折算）', '');
  ck(/^var statMul=_atkVal\/Math\.max\(1,_defVal\)$/.test(statMulLine.trim()), 'statMul 是**纯面板比值**（无 0.9~1.6 钳制、无系数）', statMulLine.trim().slice(0, 60));
  ck(!/clamp\(_atkVal/.test(code), '攻防比不再被 clamp 压平', '');
  ck(/_lvTerm=2\*atkLv\/5\+2/.test(code), '改用官方等级项 (2×Lv/5+2)', '');
  ck(/_core=Math\.floor\(Math\.floor\(_lvTerm\*mv\.power\*statMul\)\/50\)\+2/.test(code), '核心伤害 = 官方公式主体 floor(floor(lvTerm×威力×A/D)/50)+2', '');
  ck(/atkT\.atk/.test(atkMLine) && !/statMul/.test(atkMLine),
    'atkM **只含性格倍率**（面板比值已在 _core 里，不能重复乘 → 否则等效 A/D²）', atkMLine.trim().slice(0, 60));
}

console.log('\n== 控制台异常: ' + errs.length + ' 条 ==');
ck(errs.length === 0, '零控制台异常');
console.log('\n═══ v46 验收：通过 ' + pass + ' / ' + (pass + fail) + ' ═══');
if (fails.length) console.log('失败项: ' + fails.join(' | '));
ws.close();
process.exit(fail ? 1 : 0);
