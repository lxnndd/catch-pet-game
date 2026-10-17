/* v50 数值复核：复现「好奇·小火焰猴 Lv7 vs 慵懒·够赞狗 Lv8（攻击+1）」这一场
   目标：把每一层系数都打出来，确认 4 点 / 31 点是否符合 v47 的官方公式；
        并检查「克制提示」为什么显示「效果不理想」。
   用法：node v50-recheck.mjs [url] [cdpPort] */
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

console.log('══ 1. 参战双方的账面（种族值 / 当前等级能力值）══');
const info = await ev(`(function(){
  function find(nm){ var r=null; SPECIES.forEach(function(s){ if(s.name===nm) r=s; }); return r; }
  var a=find('小火焰猴'), b=find('够赞狗');
  if(!a||!b) return {missing:true, a:!!a, b:!!b, hint:SPECIES.filter(function(s){return /够赞|狗/.test(s.name);}).slice(0,6).map(function(s){return s.name;})};
  function line(s,lv){
    return { name:s.name, type:typesOf(s).join('/'),
      base:{hp:hpBaseOf(s), atk:statOf(s,'a'), def:statOf(s,'d'), spa:statOf(s,'spa'), spD:statOf(s,'spd'), spe:statOf(s,'s')},
      val:{hp:maxHpAt(s,lv), atk:atkOf(s,lv), def:defOf(s,lv), spa:spaOf(s,lv), spD:spDefOf(s,lv), spe:speOf(s,lv)},
      bst:statOf(s,'a')+statOf(s,'d')+statOf(s,'spa')+statOf(s,'spd')+statOf(s,'s')+hpBaseOf(s) };
  }
  return {a:line(a,7), b:line(b,8)};
})()`);
if (info.missing) { console.log('   ⚠️ 找不到物种: 小火焰猴=' + info.a + ' 够赞狗=' + info.b + ' · 含狗的候选: ' + (info.hint || []).join('/')); }
else {
  ['a', 'b'].forEach(k => {
    const o = info[k];
    console.log('   ' + o.name + '（' + o.type + '）种族总和 ' + o.bst);
    console.log('      种族: HP' + o.base.hp + ' 攻' + o.base.atk + ' 防' + o.base.def + ' 特攻' + o.base.spa + ' 特防' + o.base.spD + ' 速' + o.base.spe);
    console.log('      实战: HP' + o.val.hp + ' 攻' + o.val.atk + ' 防' + o.val.def + ' 特攻' + o.val.spa + ' 特防' + o.val.spD + ' 速' + o.val.spe);
  });
  const bstGap = info.b.bst - info.a.bst;
  console.log('   种族总和差 = ' + bstGap + '（' + info.b.bst + ' vs ' + info.a.bst + '）');
  ck(bstGap > 150, '够赞狗是**高种族**宝可梦，与小火焰猴差距悬殊', '差 ' + bstGap);
}

console.log('\n══ 2. 复现：火花（威力40·特殊）打够赞狗 ══');
const s1 = await ev(`(function(){
  try{
    localStorage.removeItem(SAVE_KEY); S=freshSave();
    var a=newPet('pk-390'); a.trait='curious'; a.lv=7; a.hp=maxHpOf(a); a.moves=[idOf2('火花')]; syncPP(a);
    S.party=[a]; S.lead=a.uid; S.pos={x:SPAWN.x,y:SPAWN.y}; enterWorld();
    function idOf2(nm){ var r=null; Object.keys(MOVES).forEach(function(k){ if(MOVES[k].name===nm) r=k; }); return r; }
    var foe=initFighter(byId('pk-1014'),8,'lazy',null); foe.hp=maxHpOf(foe);
    openBattle('wild',{sp:byId('pk-1014'), fighter:foe});
    B.ehp=maxHpOf(foe); B.emax=maxHpOf(foe); B.foe.hp=B.ehp;
    var me=selfPet();
    var mv=MOVES[idOf2('火花')];
    var sum=0,mn=1e9,mx=0,n=200;
    for(var i=0;i<n;i++){
      clearStatus(me); clearStatus(B.foe); B.ehp=B.emax; B.foe.hp=B.ehp;
      var before=B.ehp;
      var lines=applyMove(mv, byId('pk-390'), byId('pk-1014'), true);
      if(/打空了/.test(lines.join('|'))) continue;
      var d=before-B.ehp; sum+=d; if(d<mn)mn=d; if(d>mx)mx=d;
    }
    return {avg:+(sum/n).toFixed(1), min:mn, max:mx,
            atkVal:spaOf(byId('pk-390'),7), defVal:spDefOf(byId('pk-1014'),8),
            lvTerm:+(2*7/5+2).toFixed(2), dmgK:DMG_K,
            hitHp:maxHpOf(B.foe), myHp:maxHpOf(me),
            eff:eff(mv.type, byId('pk-1014')), effText:effText(eff(mv.type, byId('pk-1014')))};
  }catch(e){ return {__err:String(e.message)}; }
})()`);
if (s1.__err) ck(false, '火花场景可跑', s1.__err);
else {
  console.log('   特攻 ' + s1.atkVal + ' vs 对方特防 ' + s1.defVal + ' → 比值 ' + (s1.atkVal / s1.defVal).toFixed(3));
  console.log('   等级项 ' + s1.lvTerm + ' · 全局系数 ' + s1.dmgK + ' · 克制 ' + s1.eff + '×（' + s1.effText + '）');
  console.log('   实测伤害：平均 ' + s1.avg + '（' + s1.min + '~' + s1.max + '）= 对方 HP ' + s1.hitHp + ' 的 ' + (s1.avg / s1.hitHp * 100).toFixed(1) + '%');
  const core = Math.floor(Math.floor(s1.lvTerm * 40 * (s1.atkVal / s1.defVal)) / 50) + 2;
  console.log('   手算核心 = floor(floor(' + s1.lvTerm + '×40×' + (s1.atkVal / s1.defVal).toFixed(3) + ')/50)+2 = ' + core + ' → ×1.2×性格 ≈ ' + (core * 1.2).toFixed(1) + '（截图实测 4 点）');
  ck(s1.avg >= 3 && s1.avg <= 7, '火花伤害与手算一致（截图 4 点在范围内）', s1.avg + ' 点');
}

console.log('\n══ 3. 复现：咬住（威力60·物理）+ 攻击+1 打小火焰猴 ══');
const s2 = await ev(`(function(){
  try{
    localStorage.removeItem(SAVE_KEY); S=freshSave();
    var a=newPet('pk-390'); a.trait='curious'; a.lv=7; a.hp=maxHpOf(a); a.moves=[idOf3('抓')]; syncPP(a);
    S.party=[a]; S.lead=a.uid; S.pos={x:SPAWN.x,y:SPAWN.y}; enterWorld();
    function idOf3(nm){ var r=null; Object.keys(MOVES).forEach(function(k){ if(MOVES[k].name===nm) r=k; }); return r; }
    var foe=initFighter(byId('pk-1014'),8,'lazy',null); foe.hp=maxHpOf(foe);
    openBattle('wild',{sp:byId('pk-1014'), fighter:foe});
    B.ehp=maxHpOf(foe); B.emax=maxHpOf(foe); B.foe.hp=B.ehp;
    var me=selfPet();
    var idB=idOf3('咬住'), mv=MOVES[idB];
    if(!mv) return {__err:'没有「咬住」这个招'};
    function run(withStage,n){
      var sum=0,mn=1e9,mx=0;
      for(var i=0;i<n;i++){
        clearStatus(me); clearStatus(B.foe); B.ehp=B.emax; B.foe.hp=B.ehp; me.hp=maxHpOf(me);
        if(withStage) B.foe.st.atk=1;
        var before=me.hp;
        applyMove(mv, byId('pk-1014'), byId('pk-390'), false);
        var d=before-me.hp; sum+=d; if(d<mn)mn=d; if(d>mx)mx=d;
      }
      clearStatus(B.foe);
      return {avg:+(sum/n).toFixed(1), min:mn, max:mx};
    }
    var noStage=run(false,200), withStage=run(true,200);
    return {noStage:noStage, withStage:withStage,
            atkVal:atkOf(byId('pk-1014'),8), defVal:defOf(byId('pk-390'),7),
            lvTerm:+(2*8/5+2).toFixed(2), dmgK:DMG_K,
            myHp:maxHpOf(me), traitB:trOf('lazy'), traitA:trOf('curious'),
            eff:eff(mv.type, byId('pk-390')), effText:effText(eff(mv.type, byId('pk-390'))),
            power:mv.power};
  }catch(e){ return {__err:String(e.message)}; }
})()`);
if (s2.__err) ck(false, '咬住场景可跑', s2.__err);
else {
  console.log('   攻击 ' + s2.atkVal + ' vs 我方防御 ' + s2.defVal + ' → 比值 ' + (s2.atkVal / s2.defVal).toFixed(3));
  console.log('   威力 ' + s2.power + ' · 等级项 ' + s2.lvTerm + ' · 全局系数 ' + s2.dmgK + ' · 克制 ' + s2.eff + '×（' + s2.effText + '）');
  console.log('   性格：够赞狗 慵懒 攻×' + s2.traitB.atk + ' / 小火焰猴 好奇 防×' + s2.traitA.def);
  console.log('   无能力等级：平均 ' + s2.noStage.avg + '（' + s2.noStage.min + '~' + s2.noStage.max + '）');
  console.log('   攻击+1（×1.5）：平均 ' + s2.withStage.avg + '（' + s2.withStage.min + '~' + s2.withStage.max + '）= 我 HP ' + s2.myHp + ' 的 ' + (s2.withStage.avg / s2.myHp * 100).toFixed(0) + '%');
  const core = Math.floor(Math.floor(s2.lvTerm * s2.power * (s2.atkVal / s2.defVal)) / 50) + 2;
  console.log('   手算核心 = ' + core + ' → ×1.2×1.08(性格)×1.5(+1级)/1.08(我方防) ≈ ' + (core * 1.2 * 1.08 * 1.5 / 1.08).toFixed(1) + '（截图实测 31 点）');
  const pct2 = s2.withStage.avg / s2.myHp;
  ck(pct2 >= 0.4 && pct2 <= 0.7, '修复后「攻击+1 的咬住」落在 40~70%',
    (pct2 * 100).toFixed(0) + '%（截图 84% = A/D 被乘两次后撞上 85% 伤害上限）');
  ck(s2.withStage.avg / s2.noStage.avg > 1.2 && s2.withStage.avg / s2.noStage.avg < 1.4,
    '攻击+1 = ×1.3 正常生效（修前因撞上限而完全看不出来）', (s2.withStage.avg / s2.noStage.avg).toFixed(2) + ' 倍');
  ck(s2.noStage.avg < 25, '基础伤害回落到合理值（不再被上限削平）', s2.noStage.avg + ' 点');
}

console.log('\n══ 4. 克制提示为什么显示「效果不理想」 ══');
const tip = await ev(`(function(){
  function find(nm){ var r=null; SPECIES.forEach(function(s){ if(s.name===nm) r=s; }); return r; }
  var a=find('小火焰猴'), b=find('够赞狗');
  var rows=(a.moves||[]).map(function(id){ return {name:MOVES[id]?MOVES[id].name:id, type:MOVES[id]?TYPE_NAME[MOVES[id].type]:'?', e:eff(MOVES[id].type,b)}; });
  return {rows:rows, edge:typeEdge(a,b)};
})()`);
if (tip.__err) ck(false, '克制提示可查', tip.__err);
else {
  console.log('   小火焰猴的技能对 毒/格斗 各自的倍率：');
  tip.rows.forEach(r => console.log('      ' + r.name + '（' + r.type + '）→ ' + r.e + '×'));
  console.log('   面板显示：' + tip.edge);
  const best = Math.max.apply(null, tip.rows.map(r => r.e));
  ck(best >= 1, '技能池里**存在 1× 的招**（火/普通），所以「效果不理想」是被最差那招带偏的', '最好 ' + best + '×');
  ck(/不理想|效果很差/.test(tip.edge), '当前提示取的是「最差招式」→ 语义误导', tip.edge);
}

console.log('\n== 控制台异常: ' + errs.length + ' 条 ==');
ck(errs.length === 0, '零控制台异常');
console.log('\n═══ v50 复核：通过 ' + pass + ' / ' + (pass + fail) + ' ═══');
if (fails.length) console.log('未达标项: ' + fails.join(' | '));
ws.close();
process.exit(fail ? 1 : 0);
