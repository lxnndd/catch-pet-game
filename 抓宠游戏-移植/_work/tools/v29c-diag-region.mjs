/* 诊断：每个镇的 regionAt 与绑定地区是否一致（影响道馆等级上限与遇敌池） */
import { WebSocket } from 'ws';
const CDP_PORT = process.argv[2] || '9335';
const URL_BASE = process.argv[3] || 'http://127.0.0.1:8727/';
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
await send('Page.navigate', { url: URL_BASE + '?t=' + Date.now() });
for (let i = 0; i < 160; i++) { await wait(250); if (await ev("(typeof TOWNS!=='undefined'&&TOWNS.length&&typeof map!=='undefined'&&map&&map.length)") === true) break; }
await ev(`(function(){try{localStorage.removeItem(SAVE_KEY);S=freshSave();var p=newPet('pk-001');p.lv=30;p.hp=maxHpOf(p);ensureMoves(p);S.party=[p];S.lead=p.uid;S.pos={x:SPAWN.x,y:SPAWN.y};enterWorld();return 'ok';}catch(e){return 'ERR '+e.message;}})()`);
const out = await ev(`(function(){
  var rows=TOWNS.map(function(t){
    var r=regionAt(t.x,t.y);
    var cap=(LV_RANGE[r]||[1,25])[1];
    var wantCap=(LV_RANGE[t.region]||[1,25])[1];
    return {town:t.name, bound:t.region, at:r, ok:(r===t.region), cap:cap, wantCap:wantCap,
            gymType:t.gymType, pool:null};
  });
  /* 再看城镇中心一带的 regionAt（3×3） */
  var detail=TOWNS.map(function(t){
    var ring=[];
    [[0,0],[3,0],[-3,0],[0,3],[0,-3],[6,0],[-6,0],[0,6],[0,-6]].forEach(function(o){
      ring.push(regionAt(t.x+o[0],t.y+o[1]));
    });
    return t.name+': '+ring.join(',');
  });
  /* regionAt 里有没有城镇判定分支 */
  var src=String(regionAt);
  return JSON.stringify({rows:rows, detail:detail, hasTownBranch:(src.indexOf('TOWNS')>=0 || src.indexOf('inTown')>=0), srcLen:src.length, srcHead:src.slice(0,260)});
})()`);
const o = JSON.parse(out);
console.log('== 八个镇：绑定地区 vs regionAt ==');
console.log('  镇名            绑定      实测     一致   道馆上限(实测/应为)');
o.rows.forEach(r => console.log('  ' + r.town.padEnd(14) + r.bound.padEnd(9) + r.at.padEnd(9) + (r.ok ? '✅' : '❌').padEnd(7) + ('Lv' + r.cap + ' / Lv' + r.wantCap) + (r.ok ? '' : '   ← 不一致！')));
console.log('\n== 城镇中心各方向的 regionAt ==');
o.detail.forEach(d => console.log('  ' + d));
console.log('\nregionAt 里含城镇判定: ' + o.hasTownBranch + ' （函数体 ' + o.srcLen + ' 字符）');
console.log('regionAt 开头:\n' + o.srcHead);
ws.close();
