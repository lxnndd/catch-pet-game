/* v67 深测：健美加的能力等级，**真的作用到伤害上了吗**
   （用户说"健美机制要修"——数据实测是对的，那就查它有没有落到实处）
   用法：node v67-bulkup-effect.mjs [url] [cdpPort] */
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

const S = `
  function idOf(nm){ var r=null; Object.keys(MOVES).forEach(function(k){ if(MOVES[k].name===nm) r=k; }); return r; }
  function arena(){
    localStorage.removeItem(SAVE_KEY); S=freshSave();
    var me=newPet('pk-006'); me.trait='fierce'; me.lv=40; me.hp=maxHpOf(me); ensureMoves(me); me.hp=maxHpOf(me);
    S.party=[me]; S.lead=me.uid; S.pos={x:SPAWN.x,y:SPAWN.y}; enterWorld();
    var foe=initFighter(byId('pk-143'),40,'fierce',null); foe.hp=maxHpOf(foe);
    openBattle('wild',{sp:byId('pk-143'), fighter:foe});
    B.ehp=B.emax=maxHpOf(foe); B.foe.hp=B.ehp;
    return {me:me, foe:B.foe};
  }
`;

const r = await ev(`(function(){ try{ ${S}
  var me, out={};
  /* ① 攻击 +1 之后，打出的伤害是否提高（用物理招） */
  function avgOut(n){
    var sum=0,cnt=0;
    for(var i=0;i<n;i++){
      B.ehp=B.emax; B.foe.hp=B.ehp;
      var before=B.ehp;
      var l=applyMove(MOVES[idOf('撞击')], byId('pk-006'), byId('pk-143'), true);
      if(/打空了|保护罩/.test(l.join('|'))) continue;
      sum+=before-B.ehp; cnt++;
    }
    return cnt?+(sum/cnt).toFixed(1):0;
  }
  var a=arena(); me=a.me;
  me.st.atk=0; me.st.def=0;
  out.base=avgOut(120);
  arena(); me=selfPet();
  me.st.atk=1; me.st.def=0;
  out.atk1=avgOut(120);
  /* ② 防御 +1 之后，受到的伤害是否降低 */
  function avgIn(n){
    var sum=0,cnt=0;
    for(var i=0;i<n;i++){
      me.hp=maxHpOf(me); B.ehp=B.emax;
      var before=me.hp;
      var l=applyMove(MOVES[idOf('撞击')], byId('pk-143'), byId('pk-006'), false);
      if(/打空了|保护罩/.test(l.join('|'))) continue;
      sum+=before-me.hp; cnt++;
    }
    return cnt?+(sum/cnt).toFixed(1):0;
  }
  arena(); me=selfPet(); me.st.atk=0; me.st.def=0;
  out.inBase=avgIn(120);
  arena(); me=selfPet(); me.st.atk=0; me.st.def=1;
  out.inDef1=avgIn(120);
  /* ③ 一次真正的「健美」之后 */
  arena(); me=selfPet(); me.st.atk=0; me.st.def=0;
  applyMove(MOVES[idOf('健美')], byId('pk-006'), byId('pk-143'), true);
  out.afterBulkStage={atk:me.st.atk, def:me.st.def};
  out.afterBulkOut=avgOut(120);
  out.afterBulkIn=avgIn(120);
  /* ④ 舞台倍率本身 */
  out.mul={ atk0:stageMult(me,'atk'), def0:stageMult(me,'def') };
  me.st.atk=0; me.st.def=0;
  out.mul0={ atk:stageMult(me,'atk'), def:stageMult(me,'def') };
  me.st.atk=1; out.mulAtk1=stageMult(me,'atk');
  me.st.atk=0; me.st.def=1; out.mulDef1=stageMult(me,'def');
  clearStatus(me); B.foe.st=stZero();
  return out;
}catch(e){ return {__err:String(e.message)}; } })()`);

if (r.__err) console.log('失败: ' + r.__err);
else {
  console.log('══ ① 攻击等级对「打出伤害」的影响 ══');
  console.log('   攻击档 0 → 平均伤害 ' + r.base);
  console.log('   攻击档 1 → 平均伤害 ' + r.atk1 + '（比值 ' + (r.atk1 / r.base).toFixed(3) + '）');
  console.log('   stageMult: atk0=' + r.mul0.atk + ' · atk1=' + r.mulAtk1);
  console.log('\n══ ② 防御等级对「受到伤害」的影响 ══');
  console.log('   防御档 0 → 平均受伤 ' + r.inBase);
  console.log('   防御档 1 → 平均受伤 ' + r.inDef1 + '（比值 ' + (r.inDef1 / r.inBase).toFixed(3) + '）');
  console.log('   stageMult: def0=' + r.mul0.def + ' · def1=' + r.mulDef1);
  console.log('\n══ ③ 用一次「健美」之后 ══');
  console.log('   能力档：攻击 ' + r.afterBulkStage.atk + ' · 防御 ' + r.afterBulkStage.def);
  console.log('   打出伤害 ' + r.afterBulkOut + '（对比健美前 ' + r.base + '）');
  console.log('   受到伤害 ' + r.afterBulkIn + '（对比健美前 ' + r.inBase + '）');
  console.log('\n判断：攻击档 1 应让伤害明显上升、防御档 1 应让受伤明显下降。');
}
ws.close();
process.exit(0);
