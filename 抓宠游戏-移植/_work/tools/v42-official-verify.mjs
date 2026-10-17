/* v42 验收：招式效果全部对标官方 + 命中/闪避档真正生效
   ① 官方效果表已注入（溶解液无中毒/10% 降特防 · 可怕面孔 速度-2 · 影子分身 闪避+1 · 磨爪 命中+1 · 萤火 特攻+3）
   ② 招式命中率 mv.acc 真正参与判定（原来完全没用到），且受命中/闪避档影响
   ③ 攻击招的官方附加效果生效（喷射火焰 10% 灼伤 / 终极吸取吸血）
   ④ 高暴击招（meta.crit_rate）暴击率更高
   ⑤ 能力变化触发概率（statChance）按官方生效
   用法：node v42-official-verify.mjs [url] [cdpPort] */
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
/* 各实验共用的开局：玩家喷火龙(固定特性) vs 卡比兽（血厚，不顶上限） */
const SETUP = `
  function idOf(nm){ var r=null; Object.keys(MOVES).forEach(function(k){ if(MOVES[k].name===nm) r=k; }); return r; }
  localStorage.removeItem(SAVE_KEY); S=freshSave();
  var p=newPet('pk-006'); p.trait='fierce'; p.lv=50; p.hp=maxHpOf(p);
  var MV={inferno:idOf('烈火深渊'), flame:idOf('喷射火焰'), drain:idOf('终极吸取'), acid:idOf('溶解液'), tackle:idOf('撞击'), growl:idOf('叫声')};
  p.moves=[MV.inferno,MV.flame,MV.tackle,MV.growl]; syncPP(p);
  S.party=[p]; S.lead=p.uid; S.pos={x:SPAWN.x,y:SPAWN.y}; enterWorld();
  var foe=initFighter(byId('pk-143'),50,null,''); foe.hp=maxHpOf(foe);
  openBattle('wild',{sp:byId('pk-143'), fighter:foe});
  B.ehp=maxHpOf(foe); B.emax=maxHpOf(foe); B.foe.hp=B.ehp;
  var me=selfPet();
`;

await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Page.navigate', { url: URL_BASE + '?t=' + Date.now() });
for (let i = 0; i < 200; i++) { await wait(250); if (await ev("(typeof SPECIES!=='undefined'&&SPECIES.length>1000&&typeof applyMove==='function'&&typeof MOVE_FX!=='undefined')")) break; }

console.log('══ 1. 官方效果表（抽查）══');
const tbl = await ev(`(function(){
  function g(n){ return MOVE_FX[n]?JSON.stringify(MOVE_FX[n]):'(无)'; }
  return { xiaoDu:g('溶解液'), kePa:g('可怕面孔'), yingZi:g('影子分身'), moZhua:g('磨爪'),
           yingHuo:g('萤火'), penHuo:g('喷射火焰'), lieHuo:g('烈火深渊'), jiQi:g('聚气'),
           dianJiBo:g('电击波'), zhongZi:g('种子机关枪'), huoYanXuan:g('火焰旋涡'),
           yanWu:g('烟幕'), tianTian:g('甜甜香气'), jinShu:g('金属音'), ziWo:g('自我再生'),
           count:Object.keys(MOVE_FX).length, keys:STAGE_KEYS };
})()`);
ck(/spDef/.test(tbl.xiaoDu) && /10/.test(tbl.xiaoDu) && !/poison/.test(tbl.xiaoDu), '溶解液 = 降特防 + 10% 概率、已无中毒', tbl.xiaoDu);
ck(tbl.kePa === '{"debuff":{"spd":2}}', '可怕面孔 = 速度 −2', tbl.kePa);
ck(tbl.yingZi === '{"buff":{"eva":1}}', '影子分身 = 闪避 +1', tbl.yingZi);
ck(tbl.moZhua === '{"buff":{"atk":1,"hit":1}}', '磨爪 = 攻击 +1、命中 +1', tbl.moZhua);
ck(tbl.yingHuo === '{"buff":{"spa":3}}', '萤火 = 特攻 +3', tbl.yingHuo);
ck(/burn/.test(tbl.penHuo) && /0\.1/.test(tbl.penHuo), '喷射火焰 = 10% 灼伤', tbl.penHuo);
ck(/burn/.test(tbl.lieHuo) && !/chance/.test(tbl.lieHuo), '烈火深渊 = 必定灼伤', tbl.lieHuo);
ck(tbl.jiQi === '{"buff":{"crit":2}}', '聚气（官方未建模）保留 暴击 +2', tbl.jiQi);
ck(tbl.dianJiBo === '(无)' && tbl.zhongZi === '(无)' && tbl.huoYanXuan === '(无)', '官方认定无附加效果的招已清掉手工配置', '电击波/种子机关枪/火焰旋涡');
ck(tbl.yanWu === '{"debuff":{"hit":1}}', '烟幕 = 命中 −1（官方新增）', tbl.yanWu);
ck(tbl.tianTian === '{"debuff":{"eva":2}}', '甜甜香气 = 闪避 −2（官方）', tbl.tianTian);
ck(tbl.keys.length === 8 && tbl.keys.indexOf('hit') >= 0 && tbl.keys.indexOf('eva') >= 0, '能力等级 8 档（含命中/闪避）', tbl.keys.join('/') + ' · 表内 ' + tbl.count + ' 条');

console.log('\n══ 2. 招式命中率真正生效（原来 mv.acc 完全没用到）══');
const acc = await ev(`(function(){
  try{
    ${SETUP}
    function rate(mvId, n, setup){
      var hitN=0;
      for(var i=0;i<n;i++){
        clearStatus(me); clearStatus(B.foe); if(setup) setup();
        B.ehp=B.emax; B.foe.hp=B.ehp;
        var lines=applyMove(MOVES[mvId], byId('pk-006'), byId('pk-143'), true);
        if(!/打空了/.test(lines.join('|'))) hitN++;
      }
      clearStatus(me); clearStatus(B.foe);
      return Math.round(hitN/n*100);
    }
    var N=160, out={};
    out.mvAcc = MOVES[MV.inferno].acc; out.name = MOVES[MV.inferno].name;
    out.base = rate(MV.inferno, N);
    out.hitUp = rate(MV.inferno, N, function(){ me.st.hit=2; });
    out.evaUp = rate(MV.inferno, N, function(){ B.foe.st.eva=2; });
    out.hitDown = rate(MV.inferno, N, function(){ me.st.hit=-2; });
    out.always = rate(MV.flame, N);
    if(B) closeBattle();
    return out;
  }catch(e){ return {__err:String(e.message)}; }
})()`);
if (acc.__err) ck(false, '命中率实验可跑', acc.__err);
else {
  console.log('   ' + acc.name + ' 命中率字段 acc=' + acc.mvAcc + '（官方 50）');
  ck(Math.abs(acc.base - 50) <= 12, '基准命中率 ≈ 50%', acc.base + '%');
  /* 用相对关系判断（理论：命中+2 ×1.6、闪避+2 ÷1.6、命中−2 ×0.64），避免被单次采样的波动卡边 */
  ck(acc.hitUp > acc.base * 1.25, '自身命中 +2 → 命中率显著提高', acc.hitUp + '%');
  ck(acc.evaUp < acc.base * 0.8, '对手闪避 +2 → 命中率显著下降', acc.evaUp + '%');
  ck(acc.hitDown < acc.base * 0.8, '自身命中 −2 → 命中率显著下降', acc.hitDown + '%');
  ck(acc.always >= 97, '命中 100 的招几乎必中', acc.always + '%');
}

console.log('\n══ 3. 攻击招的官方附加效果 ══');
const fx = await ev(`(function(){
  try{
    ${SETUP}
    var out={};
    var b=0, n=300;
    for(var i=0;i<n;i++){
      clearStatus(me); clearStatus(B.foe); B.ehp=B.emax; B.foe.hp=B.ehp;
      applyMove(MOVES[MV.flame], byId('pk-006'), byId('pk-143'), true);
      if(B.foe.st && B.foe.st.status && B.foe.st.status.k==='burn') b++;
    }
    out.burn=Math.round(b/n*100);
    clearStatus(me); clearStatus(B.foe);
    me.hp=Math.round(maxHpOf(me)*0.5); B.ehp=B.emax; B.foe.hp=B.ehp;
    var hpBefore=me.hp;
    var lines=applyMove(MOVES[MV.drain], byId('pk-006'), byId('pk-143'), true);
    out.drainName=MOVES[MV.drain].name;
    out.healBack=me.hp-hpBefore;
    out.drainLine=/吸回/.test(lines.join('|'));
    out.drainFx=JSON.stringify(MOVE_FX[MOVES[MV.drain].name]||{});
    if(B) closeBattle();
    return out;
  }catch(e){ return {__err:String(e.message)}; }
})()`);
if (fx.__err) ck(false, '附加效果实验可跑', fx.__err);
else {
  ck(Math.abs(fx.burn - 10) <= 6, '喷射火焰灼伤率 ≈ 10%（官方 ailment_chance）', fx.burn + '%');
  ck(fx.drainLine && fx.healBack > 0, fx.drainName + ' 按官方比例吸血', '回血 ' + fx.healBack + ' 点 · ' + fx.drainFx);
}

console.log('\n══ 4. 能力变化概率（statChance）══');
const ch = await ev(`(function(){
  try{
    ${SETUP}
    var n=400, down=0;
    for(var i=0;i<n;i++){
      clearStatus(me); clearStatus(B.foe); B.ehp=B.emax; B.foe.hp=B.ehp;
      applyMove(MOVES[MV.acid], byId('pk-006'), byId('pk-143'), true);
      if(B.foe.st && B.foe.st.spDef < 0) down++;
    }
    clearStatus(me); clearStatus(B.foe);
    var out={rate:Math.round(down/n*100), fx:JSON.stringify(MOVE_FX[MOVES[MV.acid].name])};
    if(B) closeBattle();
    return out;
  }catch(e){ return {__err:String(e.message)}; }
})()`);
if (ch.__err) ck(false, '概率实验可跑', ch.__err);
else ck(Math.abs(ch.rate - 10) <= 6, '溶解液降特防触发率 ≈ 10%（官方 stat_chance）', ch.rate + '% · ' + ch.fx);

console.log('\n══ 5. 高暴击招（meta.crit_rate）══');
const cr = await ev(`(function(){
  try{
    ${SETUP}
    function critRate(mvId, n){
      var cN=0, mv=MOVES[mvId];
      for(var i=0;i<n;i++){
        clearStatus(me); clearStatus(B.foe); B.ehp=B.emax; B.foe.hp=B.ehp;
        var lines=applyMove(mv, byId('pk-006'), byId('pk-143'), true);
        if(/会心一击/.test(lines.join('|'))) cN++;
      }
      return Math.round(cN/n*100);
    }
    var hi=null, hiName='';
    Object.keys(MOVE_FX).forEach(function(nm){ if(!hi && MOVE_FX[nm].critRate){ var id=idOf(nm); if(id){ hi=id; hiName=nm; } } });
    var out={ highName:hiName, highFx:hi?JSON.stringify(MOVE_FX[hiName]):'', high:hi?critRate(hi,300):-1, normal:critRate(MV.tackle,300) };
    if(B) closeBattle();
    return out;
  }catch(e){ return {__err:String(e.message)}; }
})()`);
if (cr.__err) ck(false, '暴击实验可跑', cr.__err);
else ck(cr.high > cr.normal + 5, '高暴击招暴击率高于普通招', (cr.highName || '?') + ' ' + cr.high + '% vs 普通招 ' + cr.normal + '% · ' + cr.highFx);

console.log('\n== 控制台异常: ' + errs.length + ' 条 ==');
ck(errs.length === 0, '零控制台异常');
console.log('\n═══ v42 官方对标验收：通过 ' + pass + ' / ' + (pass + fail) + ' ═══');
if (fails.length) console.log('失败项: ' + fails.join(' | '));
ws.close();
process.exit(fail ? 1 : 0);
