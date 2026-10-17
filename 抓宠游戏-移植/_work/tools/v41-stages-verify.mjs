/* v41 能力等级六项验证：
   ① p.st 现在有 攻/防/特攻/特防/速度/暴击 六项，且旧存档缺键能自动补
   ② 物理招只吃「攻击/防御」档，特殊招只吃「特攻/特防」档（这是本次改动的核心）
   ③ UI（statusChips）与长按浮层显示正确的中文名
   用法：node v41-stages-verify.mjs [url] [cdpPort] */
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

console.log('══ 1. 能力等级键集合 ══');
const keys = await ev(`(function(){
  var p=newPet('pk-025');
  initSt(p);
  return {stageKeys:STAGE_KEYS, pst:Object.keys(p.st), labels:STAGE_KEYS.map(function(k){return stLabel(k);})};
})()`);
ck(JSON.stringify(keys.stageKeys) === JSON.stringify(['atk', 'def', 'spa', 'spDef', 'spd', 'crit', 'hit', 'eva']),
  'STAGE_KEYS 八项（v42 又加了命中/闪避）', JSON.stringify(keys.stageKeys));
ck(keys.pst.indexOf('spa') >= 0 && keys.pst.indexOf('spDef') >= 0, 'initSt 后 p.st 含特攻/特防', JSON.stringify(keys.pst));
ck(keys.labels.join('/') === '攻击/防御/特攻/特防/速度/暴击/命中/闪避', '中文名映射', keys.labels.join('/'));

console.log('\n══ 2. 旧存档兼容（只有四项时自动补键）══');
const mig = await ev(`(function(){
  var p=newPet('pk-025');
  p.st={atk:1,def:-1,spd:2,crit:0};      /* 模拟 v40 存档：只有四项 */
  initSt(p);
  return {keys:Object.keys(p.st).sort(), spa:p.st.spa, spDef:p.st.spDef, atk:p.st.atk, spd:p.st.spd};
})()`);
ck(mig.spa === 0 && mig.spDef === 0, '缺的键补 0', 'spa=' + mig.spa + ' spDef=' + mig.spDef);
ck(mig.atk === 1 && mig.spd === 2, '原有档位保留', 'atk=' + mig.atk + ' spd=' + mig.spd);

console.log('\n══ 3. 物理招 / 特殊招 各吃自己那套档位（真实 applyMove 实测）══');
const dmg = await ev(`(function(){
  try{
    localStorage.removeItem(SAVE_KEY); S=freshSave();
    var p=newPet('pk-006'); p.trait='fierce'; p.lv=50; p.hp=maxHpOf(p);
    p.moves=['mv17','mv19','mv1','mv2'];      /* 喷射火焰(特殊,威力95) · 劈开(物理,威力70) · 撞击 · 叫声 */
    syncPP(p);
    S.party=[p]; S.lead=p.uid; S.pos={x:SPAWN.x,y:SPAWN.y}; enterWorld();
    var foe=initFighter(byId('pk-143'),50,null,''); foe.hp=maxHpOf(foe);   /* 卡比兽：血厚，避免伤害顶到 85% 上限而看不出档位效果 */
    openBattle('wild',{sp:byId('pk-143'), fighter:foe});
    B.ehp=foe.hp; B.emax=maxHpOf(foe); B.foe.hp=foe.hp;
    var me=selfPet();                        /* 当前首发宠（selfPet() 是函数；selfP 是战斗中的内部变量） */
    /* 每次测量：先清空双方能力等级 → 按 setup 设档位 → 回满血 → 打一发取伤害。
       注意不能把「设档位」放在 avg 外面：里面每次都会 clearStatus，会把档位清掉。 */
    function avg(mvId, n, setup){
      var mv=MOVES[mvId], sum=0;
      for(var i=0;i<n;i++){
        clearStatus(me); clearStatus(B.foe);
        if(setup) setup();
        B.ehp=B.emax; B.foe.hp=B.ehp;
        var b=B.ehp; applyMove(mv, byId('pk-006'), byId('pk-143'), true); sum+=(b-B.ehp);
      }
      clearStatus(me); clearStatus(B.foe); B.ehp=B.emax; B.foe.hp=B.ehp;
      return Math.round(sum/n);
    }
    var N=24, out={};
    out.spBase   = avg('mv17', N);
    out.sp_spaUp = avg('mv17', N, function(){ me.st.spa=2; });
    out.sp_atkUp = avg('mv17', N, function(){ me.st.atk=2; });
    out.sp_spDefDown = avg('mv17', N, function(){ B.foe.st.spDef=-2; });
    out.sp_defDown   = avg('mv17', N, function(){ B.foe.st.def=-2; });
    out.phBase   = avg('mv19', N);
    out.ph_atkUp = avg('mv19', N, function(){ me.st.atk=2; });
    out.ph_spaUp = avg('mv19', N, function(){ me.st.spa=2; });
    out.ph_defDown   = avg('mv19', N, function(){ B.foe.st.def=-2; });
    out.ph_spDefDown = avg('mv19', N, function(){ B.foe.st.spDef=-2; });
    out.emax=B.emax;
    if(B) closeBattle();
    return out;
  }catch(e){ return {__err:String(e.message)}; }
})()`);
if (dmg.__err) { ck(false, '伤害矩阵可测', dmg.__err); }
else {
  const r = (a, b) => (a / b).toFixed(2);
  console.log('   特殊招（喷射火焰）基准 ' + dmg.spBase + ' · 物理招（劈开）基准 ' + dmg.phBase + '（对手血上限 ' + dmg.emax + '）');
  ck(dmg.sp_spaUp > dmg.spBase * 1.3, '特攻+2 → 特殊招伤害显著提升', '×' + r(dmg.sp_spaUp, dmg.spBase));
  ck(Math.abs(dmg.sp_atkUp - dmg.spBase) < dmg.spBase * 0.22, '攻击+2 → 特殊招**不受影响**（本次改动的关键）', '×' + r(dmg.sp_atkUp, dmg.spBase));
  ck(dmg.sp_spDefDown > dmg.spBase * 1.3, '对手特防−2 → 特殊招伤害提升', '×' + r(dmg.sp_spDefDown, dmg.spBase));
  ck(Math.abs(dmg.sp_defDown - dmg.spBase) < dmg.spBase * 0.22, '对手防御−2 → 特殊招不受影响', '×' + r(dmg.sp_defDown, dmg.spBase));
  ck(dmg.ph_atkUp > dmg.phBase * 1.3, '攻击+2 → 物理招伤害显著提升', '×' + r(dmg.ph_atkUp, dmg.phBase));
  ck(Math.abs(dmg.ph_spaUp - dmg.phBase) < dmg.phBase * 0.22, '特攻+2 → 物理招不受影响', '×' + r(dmg.ph_spaUp, dmg.phBase));
  ck(dmg.ph_defDown > dmg.phBase * 1.3, '对手防御−2 → 物理招伤害提升', '×' + r(dmg.ph_defDown, dmg.phBase));
  ck(Math.abs(dmg.ph_spDefDown - dmg.phBase) < dmg.phBase * 0.22, '对手特防−2 → 物理招不受影响', '×' + r(dmg.ph_spDefDown, dmg.phBase));
}

console.log('\n══ 4. UI 与长按浮层 ══');
const ui = await ev(`(function(){
  var p=newPet('pk-025'); initSt(p); p.st.spa=2; p.st.spDef=-1;
  var chips=statusChips(p).map(function(c){return c.t;});
  function idOf(nm){ var r=null; Object.keys(MOVES).forEach(function(k){ if(MOVES[k].name===nm) r=k; }); return r; }
  function txt(nm){ var id=idOf(nm); return id?moveEffectText(id):'(招式表里没有「'+nm+'」)'; }
  return {chips:chips, guiJi:txt('诡计'), jinShu:txt('金属音'), xiaoDu:txt('溶解液'), mingXiang:txt('冥想')};
})()`);
ck(ui.chips.join(',') === '特攻↑2,特防↓1', 'statusChips 显示特攻/特防', ui.chips.join(','));
ck(/特攻/.test(ui.guiJi) && !/攻击/.test(ui.guiJi), '「诡计」显示为特攻（原来是攻击）', ui.guiJi);
ck(/特防/.test(ui.jinShu), '「金属音」显示为降特防', ui.jinShu);
ck(/特防/.test(ui.xiaoDu), '「溶解液」显示为降特防', ui.xiaoDu);
ck(/特攻/.test(ui.mingXiang) && /特防/.test(ui.mingXiang), '「冥想」显示为 特攻+特防', ui.mingXiang);

console.log('\n== 控制台异常: ' + errs.length + ' 条 ==');
ck(errs.length === 0, '零控制台异常');
console.log('\n═══ v41 能力等级验收：通过 ' + pass + ' / ' + (pass + fail) + ' ═══');
if (fails.length) console.log('失败项: ' + fails.join(' | '));
ws.close();
process.exit(fail ? 1 : 0);
