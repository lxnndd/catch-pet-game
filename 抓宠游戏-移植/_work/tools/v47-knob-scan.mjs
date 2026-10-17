/* v47 旋钮扫描：直观看 DMG_K（全局伤害系数）在做什么
   —— 它是一个**整体音量旋钮**：只等比缩放所有伤害，不改变任何相对关系。
   用法：node v47-knob-scan.mjs [url] [cdpPort] */
import { WebSocket } from 'ws';
const URL_BASE = process.argv[2] || 'http://127.0.0.1:8728/';
const CDP_PORT = process.argv[3] || '9335';
let seq = 0;
const c = await (await fetch('http://127.0.0.1:' + CDP_PORT + '/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(c.webSocketDebuggerUrl);
const pend = new Map();
ws.on('message', d => { const m = JSON.parse(String(d)); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); } });
await new Promise((r, j) => { ws.on('open', r); ws.on('error', j); });
const send = (mm, p = {}) => new Promise((res, rej) => { const id = ++seq; pend.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method: mm, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) return { __err: String(r.exceptionDetails.exception?.description || '').slice(0, 400) }; return r.result?.value; };
const wait = ms => new Promise(r => setTimeout(r, ms));
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Page.navigate', { url: URL_BASE + '?t=' + Date.now() });
for (let i = 0; i < 200; i++) { await wait(250); if (await ev("(typeof SPECIES!=='undefined'&&SPECIES.length>1000&&typeof applyMove==='function')")) break; }

const out = await ev(`(function(){
  var ORIG=DMG_K;
  function idOf(nm){ var r=null; Object.keys(MOVES).forEach(function(k){ if(MOVES[k].name===nm) r=k; }); return r; }
  function run(aId,aLv,aMvNm,bId,bLv,bMvNm,n){
    localStorage.removeItem(SAVE_KEY); S=freshSave();
    var a=newPet(aId); a.trait='fierce'; a.lv=aLv; a.hp=maxHpOf(a); a.moves=[idOf(aMvNm)]; syncPP(a);
    S.party=[a]; S.lead=a.uid; S.pos={x:SPAWN.x,y:SPAWN.y}; enterWorld();
    var foe=initFighter(byId(bId),bLv,'fierce',null); foe.hp=maxHpOf(foe);
    openBattle('wild',{sp:byId(bId), fighter:foe});
    B.ehp=maxHpOf(foe); B.emax=maxHpOf(foe); B.foe.hp=B.ehp;
    var me=selfPet();
    function avg(mvId,isSelf,times){
      var sum=0,cnt=0;
      for(var i=0;i<times;i++){
        clearStatus(me); clearStatus(B.foe); B.ehp=B.emax; B.foe.hp=B.ehp; me.hp=maxHpOf(me);
        var before=isSelf?B.ehp:me.hp;
        var lines=applyMove(MOVES[mvId], byId(isSelf?aId:bId), byId(isSelf?bId:aId), isSelf);
        if(/打空了/.test(lines.join('|'))) continue;
        sum+=Math.max(0,before-(isSelf?B.ehp:me.hp)); cnt++;
      }
      return cnt? sum/cnt : 0;
    }
    var r={mine:avg(idOf(aMvNm),true,n), his:avg(idOf(bMvNm),false,n), aHp:maxHpOf(me), bHp:maxHpOf(B.foe)};
    if(B) closeBattle();
    return r;
  }
  var KS=[0.6,0.8,1.0,1.2,1.5,1.8,2.1,2.6];
  var rows=[];
  KS.forEach(function(K){
    DMG_K=K;
    var s20=run('pk-006',20,'喷射火焰','pk-143',20,'撞击',200);
    var s50=run('pk-006',50,'喷射火焰','pk-143',50,'撞击',200);
    var usr=run('pk-004',5,'爆击枪','pk-661',7,'啄',200);
    var up=run('pk-006',20,'喷射火焰','pk-319',56,'撞击',200);
    rows.push({K:K,
      p20:+(s20.mine/s20.bHp*100).toFixed(1), t20:+(s20.bHp/s20.mine).toFixed(1),
      p50:+(s50.mine/s50.bHp*100).toFixed(1), t50:+(s50.bHp/s50.mine).toFixed(1),
      userMine:+usr.mine.toFixed(1), userHis:+usr.his.toFixed(1), userRatio:+(usr.his/usr.mine).toFixed(2),
      upPct:+(up.mine/up.bHp*100).toFixed(1)});
  });
  DMG_K=ORIG;
  return {rows:rows, orig:ORIG};
})()`);
if (out.__err) { console.log('扫描失败: ' + out.__err); process.exit(1); }
console.log('当前 DMG_K = ' + out.orig + '（扫描结束后已还原）\n');
console.log('  DMG_K | 同级Lv20 占比/回合 | 同级Lv50 占比/回合 | 你的场景(我打它/它打我)=比值 | 越级Lv20打Lv56');
console.log('  ------|--------------------|--------------------|----------------------------|---------------');
out.rows.forEach(r => {
  console.log('  ' + String(r.K).padEnd(6) + '| ' + (r.p20 + '% / ' + r.t20 + '回合').padEnd(19) + '| ' +
    (r.p50 + '% / ' + r.t50 + '回合').padEnd(19) + '| ' +
    (r.userMine + ' / ' + r.userHis + ' = ' + r.userRatio + '倍').padEnd(27) + '| ' + r.upPct + '%');
});
console.log('\n  注：所有列的**相对关系**（伤害比、越级占比）在各行之间基本不变 —— 变的只是整体快慢。');
ws.close();
process.exit(0);
