/* 测洛克宠物升级时到底会不会进化 + PP 现状 */
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
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) return { __err: String(r.exceptionDetails.exception?.description || '').slice(0, 300) }; return r.result?.value; };
const wait = ms => new Promise(r => setTimeout(r, ms));
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
const t0 = Date.now();
await send('Page.navigate', { url: URL_BASE + '?t=' + Date.now() });
let ready = false;
for (let i = 0; i < 120; i++) { await wait(250); if (await ev("(typeof TOWNS!=='undefined'&&TOWNS.length&&typeof map!=='undefined'&&map&&map.length)") === true) { ready = true; break; } }
console.log('页面就绪: ' + ready + '  用时 ' + (Date.now() - t0) + 'ms');
if (!ready) { console.log('页面没起来，URL 可能不对: ' + URL_BASE); ws.close(); process.exit(1); }
await ev(`(function(){localStorage.removeItem(SAVE_KEY);S=freshSave();var p=newPet('kz-002');p.lv=40;p.hp=maxHpOf(p);ensureMoves(p);S.party=[p];S.lead=p.uid;S.pos={x:SPAWN.x,y:SPAWN.y};enterWorld();return 'ok';})()`);

console.log('\n══ 1. 洛克宠升级会不会进化 ══');
const r1 = await ev(`(function(){
  try{
    var p=S.party[0];
    var out={};
    out.before={id:p.sp, name:byId(p.sp).name, lv:p.lv};
    out.chain=JSON.stringify(EVO[p.sp]||null);
    /* 直接给经验逼它升级（喵呜 → 魔力猫 需要 Lv42） */
    gainExp(p, expNeed(p.lv)+5);
    out.after={id:p.sp, name:byId(p.sp).name, lv:p.lv};
    out.evolved = out.before.id !== out.after.id;
    /* 再试试手动调用 */
    if(!out.evolved){ runEvoCheck(); out.afterManual={id:p.sp, name:byId(p.sp).name}; out.manualEvolved = out.afterManual.id!==out.before.id; }
    return JSON.stringify(out);
  }catch(e){ return 'ERR '+e.message; }
})()`);
if (r1 && r1.__err) console.log('  ERR ' + r1.__err);
else {
  const o = JSON.parse(r1);
  console.log('  ' + o.before.name + ' Lv' + o.before.lv + '  进化链: ' + o.chain);
  console.log('  gainExp 后: ' + o.after.name + ' Lv' + o.after.lv);
  console.log('  ' + (o.evolved ? '✅ 升级即进化' : ('❌ 升级没进化' + (o.manualEvolved !== undefined ? ('（手动 runEvoCheck 后: ' + (o.manualEvolved ? '✅ 会进化' : '❌ 仍不进化') + '）') : ''))));
}

console.log('\n══ 2. 抓到的洛克宠（高等级）会不会进化 ══');
const r2 = await ev(`(function(){
  try{
    var p=newPet('kz-004'); p.lv=35; p.hp=maxHpOf(p); ensureMoves(p);   /* 火花 Lv30 该进化成焰火 */
    S.party.push(p);
    var before=byId(p.sp).name;
    runEvoCheck();
    var after=byId(p.sp).name;
    return JSON.stringify({before:before, after:after, chain:JSON.stringify(EVO['kz-004']||null)});
  }catch(e){ return 'ERR '+e.message; }
})()`);
if (r2 && r2.__err) console.log('  ERR ' + r2.__err);
else { const o = JSON.parse(r2); console.log('  抓到 Lv35 的火花（Lv30 该进化）: ' + o.before + ' → ' + o.after + '  链: ' + o.chain); console.log('  ' + (o.before !== o.after ? '✅ 会进化' : '❌ 不进化')); }

console.log('\n══ 3. PP 现状 ══');
const r3 = await ev(`(function(){
  try{
    var d={}; Object.keys(MOVES).forEach(function(k){ var v=MOVES[k].pp; d[v]=(d[v]||0)+1; });
    var p=S.party[0];
    return JSON.stringify({dist:d, sample:{name:MOVES[p.moves[0]].name, pp:MOVES[p.moves[0]].pp}});
  }catch(e){ return 'ERR '+e.message; }
})()`);
{ const o = JSON.parse(r3); console.log('  招表 PP 分布: ' + JSON.stringify(o.dist)); console.log('  样例: ' + o.sample.name + ' PP=' + o.sample.pp); }
ws.close();
