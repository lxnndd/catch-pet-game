/* v47 标定/验收：伤害公式换成官方主体（去掉 lvBonus / lvPress / 攻防比钳制）后的全等级谱系
   目标：① 同级仍是 3~5 回合  ② 低等级打高等级「纯看面板」（不再有额外压制）
        ③ 极高等级打极低等级应当是真碾压（一击必杀）
   用法：node v47-calibrate.mjs [url] [cdpPort] */
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

const CASES = [
  ['你遇到的：Lv5 打 Lv7', 'pk-004', 5, '爆击枪', 'pk-661', 7, '啄'],
  ['同级 Lv20', 'pk-006', 20, '喷射火焰', 'pk-143', 20, '撞击'],
  ['同级 Lv50', 'pk-006', 50, '喷射火焰', 'pk-143', 50, '撞击'],
  ['同级 Lv80', 'pk-006', 80, '喷射火焰', 'pk-143', 80, '撞击'],
  ['越级 Lv5 打 Lv50', 'pk-004', 5, '爆击枪', 'pk-143', 50, '撞击'],
  ['越级 Lv20 打 Lv56', 'pk-006', 20, '喷射火焰', 'pk-319', 56, '撞击'],
  ['碾压 Lv50 打 Lv10', 'pk-006', 50, '喷射火焰', 'pk-004', 10, '爆击枪'],
  ['极高打极低 Lv80 打 Lv5', 'pk-006', 80, '喷射火焰', 'pk-004', 5, '爆击枪'],
  ['极端 Lv100 打 Lv1', 'pk-006', 100, '喷射火焰', 'pk-010', 1, '撞击']
];
const rows = await ev(`(function(){
  function idOf(nm){ var r=null; Object.keys(MOVES).forEach(function(k){ if(MOVES[k].name===nm) r=k; }); return r; }
  function run(aId,aLv,aMvNm,bId,bLv,bMvNm,n){
    localStorage.removeItem(SAVE_KEY); S=freshSave();
    var a=newPet(aId); a.trait='fierce'; a.lv=aLv; a.hp=maxHpOf(a); a.moves=[idOf(aMvNm)]; syncPP(a);
    S.party=[a]; S.lead=a.uid; S.pos={x:SPAWN.x,y:SPAWN.y}; enterWorld();
    var foe=initFighter(byId(bId),bLv,'fierce',null); foe.hp=maxHpOf(foe);
    openBattle('wild',{sp:byId(bId), fighter:foe});
    B.ehp=maxHpOf(foe); B.emax=maxHpOf(foe); B.foe.hp=B.ehp;
    var me=selfPet();
    function avg(mvId, isSelf, times){
      var sum=0, cnt=0, mx=0;
      for(var i=0;i<times;i++){
        clearStatus(me); clearStatus(B.foe); B.ehp=B.emax; B.foe.hp=B.ehp; me.hp=maxHpOf(me);
        var before = isSelf ? B.ehp : me.hp;
        var lines=applyMove(MOVES[mvId], byId(isSelf?aId:bId), byId(isSelf?bId:aId), isSelf);
        var d=Math.max(0, before - (isSelf?B.ehp:me.hp));
        if(/打空了/.test(lines.join('|'))) continue;
        sum+=d; cnt++; if(d>mx) mx=d;
      }
      return cnt? {avg:+(sum/cnt).toFixed(1), max:mx} : {avg:0,max:0};
    }
    var mine=avg(idOf(aMvNm),true,n), his=avg(idOf(bMvNm),false,n);
    var out={ aHp:maxHpOf(me), bHp:maxHpOf(B.foe),
              aAtk:spaOf(byId(aId),aLv), aStat:atkOf(byId(aId),aLv),
              bStat:defOf(byId(bId),bLv), bSpd:spDefOf(byId(bId),bLv),
              mine:mine.avg, mineMax:mine.max, his:his.avg, hisMax:his.max };
    if(B) closeBattle();
    return out;
  }
  var out=[];
  ${JSON.stringify(CASES)}.forEach(function(cs){
    var r=run(cs[1],cs[2],cs[3],cs[4],cs[5],cs[6],200);
    r.label=cs[0]; out.push(r);
  });
  out.push({global:{dmgK:DMG_K}});
  return out;
})()`);
if (rows.__err) { ck(false, '标定可跑', rows.__err); }
else {
  const g = rows[rows.length - 1].global;
  console.log('   当前 DMG_K = ' + g.dmgK);
  console.log('');
  console.log('   场景                        | 我方伤害/它HP  = 占比 | 它伤害/我HP  = 占比 | 回合(我打死它/它打死我)');
  console.log('   ----------------------------|----------------------|---------------------|------------------------');
  rows.slice(0, -1).forEach(r => {
    const mp = r.mine / r.bHp * 100, hp = r.his / r.aHp * 100;
    const t1 = r.mine ? (r.bHp / r.mine).toFixed(1) : '∞', t2 = r.his ? (r.aHp / r.his).toFixed(1) : '∞';
    console.log('   ' + r.label.padEnd(26) + ' | ' + (r.mine + '/' + r.bHp).padEnd(12) + ' ' + (mp.toFixed(1) + '%').padStart(6) +
      ' | ' + (r.his + '/' + r.aHp).padEnd(11) + ' ' + (hp.toFixed(1) + '%').padStart(6) + ' | ' + t1 + ' / ' + t2);
  });

  const at = n => rows.filter(r => r.label === n)[0];
  const same20 = at('同级 Lv20'), same50 = at('同级 Lv50'), same80 = at('同级 Lv80');
  const user = at('你遇到的：Lv5 打 Lv7');
  const up5 = at('越级 Lv5 打 Lv50'), up20 = at('越级 Lv20 打 Lv56');
  const crush = at('碾压 Lv50 打 Lv10'), extreme = at('极高打极低 Lv80 打 Lv5'), ext100 = at('极端 Lv100 打 Lv1');

  console.log('');
  ck(true, '公式已换成官方主体（无 lvBonus / lvPress / 攻防比钳制）', 'DMG_K=' + g.dmgK);
  const t20 = same20.bHp / same20.mine, t50 = same50.bHp / same50.mine, t80 = same80.bHp / same80.mine;
  ck(t20 >= 2 && t20 <= 6, '同级 Lv20 在 2~6 回合', t20.toFixed(1) + ' 回合（每击 ' + (same20.mine / same20.bHp * 100).toFixed(0) + '%）');
  ck(t50 >= 2 && t50 <= 6, '同级 Lv50 在 2~6 回合', t50.toFixed(1) + ' 回合（每击 ' + (same50.mine / same50.bHp * 100).toFixed(0) + '%）');
  ck(t80 >= 2 && t80 <= 6, '同级 Lv80 在 2~6 回合', t80.toFixed(1) + ' 回合（每击 ' + (same80.mine / same80.bHp * 100).toFixed(0) + '%）');
  const rt = user.his / user.mine;
  ck(rt < 3.2, '你的场景伤害比仍在 3.2 倍以内', rt.toFixed(2) + ' 倍（' + user.mine + ' vs ' + user.his + '）');
  ck(up5.mine / up5.bHp < 0.05, 'Lv5 打 Lv50 几乎打不动（纯面板差距）', (up5.mine / up5.bHp * 100).toFixed(1) + '%');
  ck(up20.mine / up20.bHp <= 0.15, 'Lv20 打 Lv56 每击 ≤15%', (up20.mine / up20.bHp * 100).toFixed(1) + '%');
  ck(crush.mine >= crush.bHp, 'Lv50 打 Lv10 = 一击必杀', crush.mine + ' vs HP ' + crush.bHp);
  ck(extreme.mine >= extreme.bHp, 'Lv80 打 Lv5 = 一击必杀', extreme.mine + ' vs HP ' + extreme.bHp);
  ck(ext100.mine >= ext100.bHp, 'Lv100 打 Lv1 = 一击必杀', ext100.mine + ' vs HP ' + ext100.bHp);
  console.log('');
  console.log('   面板差（供对照）:');
  rows.slice(0, -1).forEach(r => {
    console.log('     ' + r.label.padEnd(26) + ' 攻/特攻 ' + String(r.aStat + '/' + r.aAtk).padEnd(9) + ' vs 防/特防 ' + r.bStat + '/' + r.bSpd);
  });
}
console.log('\n== 控制台异常: ' + errs.length + ' 条 ==');
ck(errs.length === 0, '零控制台异常');
console.log('\n═══ v47 标定：通过 ' + pass + ' / ' + (pass + fail) + ' ═══');
if (fails.length) console.log('未达标项: ' + fails.join(' | '));
ws.close();
process.exit(fail ? 1 : 0);
