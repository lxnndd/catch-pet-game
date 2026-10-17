/* v63 实测：增强拳到底有没有生效 + 4 个点名招的现状
   用法：node v63-test4.mjs [url] [cdpPort] */
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

const r = await ev(`(function(){
  try{
    function idOf(nm){ var r=null; Object.keys(MOVES).forEach(function(k){ if(MOVES[k].name===nm) r=k; }); return r; }
    localStorage.removeItem(SAVE_KEY); S=freshSave();
    var me=newPet('pk-006'); me.trait='fierce'; me.lv=30; me.hp=maxHpOf(me); ensureMoves(me); me.hp=maxHpOf(me);
    S.party=[me]; S.lead=me.uid; S.pos={x:SPAWN.x,y:SPAWN.y}; enterWorld();
    var foe=initFighter(byId('pk-143'),30,'fierce',null); foe.hp=maxHpOf(foe);
    openBattle('wild',{sp:byId('pk-143'), fighter:foe});
    B.ehp=B.emax=maxHpOf(foe); B.foe.hp=B.ehp;
    var out={};
    /* 增强拳：自己攻击应 +1 */
    var id=idOf('增强拳');
    out.fx=JSON.stringify(fxOf(MOVES[id]));
    out.id=id;
    me.st.atk=0; B.ehp=B.emax;
    var lines=applyMove(MOVES[id], byId('pk-006'), byId('pk-143'), true);
    out.enhance={atkAfter:me.st.atk, lines:lines.join(' | ')};
    /* 对照组：给自己加个别的 */
    me.st.atk=0;
    var id2=idOf('剑舞');
    var l2=applyMove(MOVES[id2], byId('pk-006'), byId('pk-143'), true);
    out.sword={atkAfter:me.st.atk, lines:l2.join(' | ')};
    /* 挺住 / 借力摔 / 致命针刺 的现状 */
    ['挺住','借力摔','致命针刺','蛮干','地球上投'].forEach(function(nm){
      var i2=idOf(nm);
      if(!i2){ out[nm]='（游戏里没有）'; return; }
      out[nm]={fx:JSON.stringify(fxOf(MOVES[i2])), power:MOVES[i2].power, acc:MOVES[i2].acc===undefined?'(未定义=必中)':MOVES[i2].acc,
               pri:(typeof MOVE_PRI!=='undefined'&&MOVE_PRI[i2])||0, cat:MOVES[i2].cat};
    });
    if(B) closeBattle();
    return out;
  }catch(e){ return {__err:String(e.message)}; }
})()`);
if (r.__err) console.log('失败: ' + r.__err);
else {
  console.log('══ 增强拳（mv id ' + r.id + '）══');
  console.log('   MOVE_FX = ' + r.fx);
  console.log('   实战后 我方攻击档 = ' + r.enhance.atkAfter + '（期望 +1）');
  console.log('   战斗日志：' + r.enhance.lines);
  console.log('\n══ 对照：剑舞 ══');
  console.log('   实战后 我方攻击档 = ' + r.sword.atkAfter + '（期望 +2）');
  console.log('   战斗日志：' + r.sword.lines);
  console.log('\n══ 4 个点名招的现状 ══');
  ['挺住', '借力摔', '致命针刺', '蛮干', '地球上投'].forEach(nm => {
    const o = r[nm];
    if (typeof o === 'string') { console.log('   ' + nm + '：' + o); return; }
    console.log('   ' + nm.padEnd(6) + '：MOVE_FX=' + o.fx + ' · 威力=' + o.power + ' · 命中=' + o.acc + ' · 先制=' + o.pri + ' · ' + o.cat);
  });
}
ws.close();
process.exit(0);
