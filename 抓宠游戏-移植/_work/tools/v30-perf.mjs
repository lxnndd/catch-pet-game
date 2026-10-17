/* 排查「命令执行太久」：逐阶段计时，找出到底哪一步慢 */
import { WebSocket } from 'ws';
const URL_BASE = process.argv[2] || 'http://127.0.0.1:8727/';
const CDP_PORT = process.argv[3] || '9335';
const T = [];
const mark = (name, t0) => { const d = Date.now() - t0; T.push([name, d]); console.log('  ' + name.padEnd(34) + d + ' ms'); return Date.now(); };
let t = Date.now();
let seq = 0;
const c = await (await fetch('http://127.0.0.1:' + CDP_PORT + '/json/new?about:blank', { method: 'PUT' })).json();
t = mark('1. CDP 新建标签页', t);
const ws = new WebSocket(c.webSocketDebuggerUrl);
const pend = new Map();
ws.on('message', d => { const m = JSON.parse(String(d)); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); } });
await new Promise((r, j) => { ws.on('open', r); ws.on('error', j); });
t = mark('2. WebSocket 连接', t);
const send = (mm, p = {}) => new Promise((res, rej) => { const id = ++seq; pend.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method: mm, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) return { __err: String(r.exceptionDetails.exception?.description || '').slice(0, 200) }; return r.result?.value; };
const wait = ms => new Promise(r => setTimeout(r, ms));
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
t = mark('3. 开启 CDP 域', t);
await send('Page.navigate', { url: URL_BASE + '?t=' + Date.now() });
let waited = 0, ok = false;
while (waited < 60000) {
  await wait(250); waited += 250;
  if (await ev("(typeof TOWNS!=='undefined'&&TOWNS.length&&typeof map!=='undefined'&&map&&map.length)") === true) { ok = true; break; }
}
t = mark('4. 页面加载+genMap（' + (ok ? '成功' : '超时') + '）', t);
await ev(`(function(){localStorage.removeItem(SAVE_KEY);S=freshSave();var p=newPet('pk-001');p.lv=30;p.hp=maxHpOf(p);ensureMoves(p);S.party=[p];S.lead=p.uid;S.pos={x:SPAWN.x,y:SPAWN.y};enterWorld();return 'ok';})()`);
t = mark('5. 进入世界', t);
/* 关键：单次原生调用的耗时 */
const w = async (label, expr) => { const t0 = Date.now(); const v = await ev(expr); const d = Date.now() - t0; console.log('     ' + label.padEnd(30) + d + ' ms   ' + (v && v.__err ? 'ERR' : '')); return d; };
console.log('  --- 单次 JS 调用耗时 ---');
await w('byId 一次', "byId('pk-795').name");
await w('byId ×1000', "(function(){for(var i=0;i<1000;i++)byId('pk-795');return 1;})()");
await w('rollEnemy ×100', "(function(){for(var i=0;i<100;i++)rollEnemy();return 1;})()");
await w('rollEnemy ×1000', "(function(){for(var i=0;i<1000;i++)rollEnemy();return 1;})()");
await w('draw() ×20', "(function(){for(var i=0;i<20;i++)draw();return 1;})()");
await w('drawMinimap ×20', "(function(){for(var i=0;i<20;i++)drawMinimap();return 1;})()");
await w('openBattle 一次', "(function(){var e=rollEnemy();openBattle('wild',{sp:e.sp,fighter:initFighter(e.sp,e.lv,e.trait)});return 1;})()");
await w('closeBattle 一次', "(function(){closeBattle();return 1;})()");
await w('gymTeamPool 一次', "(function(){var t=TOWNS[0];gymTeamPool(t,gymRegion(t));return 1;})()");
await w('beginGymBattle 一次', "(function(){var t=TOWNS[0];beginGymBattle(t);return 1;})()");
await w('nextTrainerFoe 一次', "(function(){if(TB&&TB.team.length>1)nextTrainerFoe();return 1;})()");
await ev(`(function(){try{if(B)closeBattle();}catch(e){}return 1;})()`);
const total = T.reduce((a, b) => a + b[1], 0);
console.log('\n  阶段合计: ' + total + ' ms');
ws.close();
