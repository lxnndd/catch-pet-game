/* 极简实测：洛克宠到底会不会进化（每步带超时，避免卡住） */
import { WebSocket } from 'ws';
const URL_BASE = process.argv[2] || 'http://127.0.0.1:8728/';
const CDP_PORT = process.argv[3] || '9335';
const WITH_TIMEOUT = (p, ms, tag) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(tag + ' 超时 ' + ms + 'ms')), ms))]);
let seq = 0;
console.log('[1] 连 CDP…');
const c = await WITH_TIMEOUT((await fetch('http://127.0.0.1:' + CDP_PORT + '/json/new?about:blank', { method: 'PUT' })).json(), 15000, 'CDP 新建');
const ws = new WebSocket(c.webSocketDebuggerUrl);
const pend = new Map();
ws.on('message', d => { const m = JSON.parse(String(d)); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); } });
await WITH_TIMEOUT(new Promise((r, j) => { ws.on('open', r); ws.on('error', j); }), 15000, 'WS 连接');
const send = (mm, p = {}) => new Promise((res, rej) => { const id = ++seq; pend.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method: mm, params: p })); });
const ev = async e => { const r = await WITH_TIMEOUT(send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }), 20000, 'evaluate'); if (r.exceptionDetails) return { __err: String(r.exceptionDetails.exception?.description || '').slice(0, 300) }; return r.result?.value; };
console.log('[2] 打开页面…');
await WITH_TIMEOUT(send('Runtime.enable'), 10000, 'Runtime.enable');
await WITH_TIMEOUT(send('Page.enable'), 10000, 'Page.enable');
await WITH_TIMEOUT(send('Network.enable'), 10000, 'Network.enable');
await WITH_TIMEOUT(send('Network.setCacheDisabled', { cacheDisabled: true }), 10000, 'noCache');
await WITH_TIMEOUT(send('Page.navigate', { url: URL_BASE + '?t=' + Date.now() }), 15000, 'navigate');
let ready = false;
for (let i = 0; i < 120; i++) {
  await new Promise(r => setTimeout(r, 250));
  const v = await ev("(typeof TOWNS!=='undefined'&&TOWNS.length&&typeof map!=='undefined'&&map&&map.length)");
  if (v === true) { ready = true; break; }
}
console.log('    页面就绪: ' + ready);
if (!ready) { console.log('  ❌ 页面起不来（' + URL_BASE + '）——本地服务或 URL 有问题'); ws.close(); process.exit(1); }
await ev(`(function(){localStorage.removeItem(SAVE_KEY);S=freshSave();var p=newPet('kz-004');p.lv=35;p.hp=maxHpOf(p);ensureMoves(p);S.party=[p];S.lead=p.uid;S.pos={x:SPAWN.x,y:SPAWN.y};enterWorld();return 'ok';})()`);

console.log('\n[3] 洛克宠（火花 Lv35，链上 Lv30 该进化）');
const r = await ev(`(function(){
  try{
    var out={};
    var p=S.party[0];
    out.before={id:p.sp, name:byId(p.sp).name, lv:p.lv};
    out.chain=JSON.stringify(EVO[p.sp]||null);
    out.evoKeys=Object.keys(EVO).filter(function(k){return k.indexOf('kz-')===0;}).length;
    /* 直接调用 runEvoCheck */
    runEvoCheck();
    out.afterRun={id:p.sp, name:byId(p.sp).name};
    /* 再试一次走 gainExp 路径 */
    if(out.afterRun.id===out.before.id){
      gainExp(p, expNeed(p.lv)+5);
      out.afterGain={id:p.sp, name:byId(p.sp).name, lv:p.lv};
    }
    out.evolved = (out.afterRun.id!==out.before.id) || (out.afterGain && out.afterGain.id!==out.before.id);
    return JSON.stringify(out);
  }catch(e){ return 'ERR '+e.message; }
})()`);
if (r && r.__err) console.log('  ERR ' + r.__err);
else {
  const o = JSON.parse(r);
  console.log('  ' + o.before.name + ' Lv' + o.before.lv + '（链: ' + o.chain + '）');
  console.log('  EVO 里洛克条目数: ' + o.evoKeys);
  console.log('  runEvoCheck 后: ' + o.afterRun.name);
  if (o.afterGain) console.log('  gainExp 后: ' + o.afterGain.name + ' Lv' + o.afterGain.lv);
  console.log('\n  ' + (o.evolved ? '✅ 洛克宠会进化' : '❌ 洛克宠不进化 —— 这就是 bug'));
}
ws.close();
