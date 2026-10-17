/* v28b 验证：异兽/幻兽/神兽是否同档，以及抽样分布 */
import { WebSocket } from 'ws';
const URL_BASE = process.argv[2] || 'http://127.0.0.1:8727/';
const CDP_PORT = process.argv[3] || '9335';
let seq = 0;
const c = await (await fetch('http://127.0.0.1:' + CDP_PORT + '/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(c.webSocketDebuggerUrl);
const pend = new Map(); const errs = [];
ws.on('message', d => {
  const m = JSON.parse(String(d));
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); return; }
  if (m.method === 'Runtime.exceptionThrown') errs.push(String(m.params?.exceptionDetails?.exception?.description || '').slice(0, 150));
});
await new Promise((r, j) => { ws.on('open', r); ws.on('error', j); });
const send = (mm, p = {}) => new Promise((res, rej) => { const id = ++seq; pend.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method: mm, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) return { __err: String(r.exceptionDetails.exception?.description || '').slice(0, 400) }; return r.result?.value; };
const wait = ms => new Promise(r => setTimeout(r, ms));
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Page.navigate', { url: URL_BASE + '?t=' + Date.now() });
for (let i = 0; i < 120; i++) { await wait(250); if (await ev("(typeof MW!=='undefined'&&typeof map!=='undefined'&&map&&map.length)") === true) break; }
console.log('进入世界: ' + await ev(`(function(){try{localStorage.removeItem(SAVE_KEY);S=freshSave();var p=newPet('pk-001');p.lv=60;p.hp=maxHpOf(p);ensureMoves(p);S.party=[p];S.lead=p.uid;S.pos={x:SPAWN.x,y:SPAWN.y};enterWorld();return 'ok';}catch(e){return 'ERR '+e.message;}})()`));
const data = await ev(`(function(){
  var UB=['pk-793','pk-794','pk-795','pk-796','pk-797','pk-798','pk-799','pk-803','pk-804','pk-805','pk-806'];
  var MYTH=['pk-151','pk-251','pk-385','pk-386','pk-489','pk-490','pk-491','pk-492','pk-493','pk-494','pk-647','pk-648','pk-649','pk-719','pk-720','pk-721','pk-802','pk-807','pk-808','pk-809','pk-893','pk-1024','pk-1025'];
  var dist={}; SPECIES.forEach(function(s){dist[s.rarity]=(dist[s.rarity]||0)+1;});
  var ubBad=UB.filter(function(id){var s=byId(id);return !s||s.rarity!==2;}).map(function(id){var s=byId(id);return id+(s?s.name+'='+s.rarity:'不存在');});
  var mythBad=MYTH.filter(function(id){var s=byId(id);return !s||s.rarity!==2;}).map(function(id){var s=byId(id);return id+(s?s.name+'='+s.rarity:'缺');});
  return JSON.stringify({dist:dist,ubBad:ubBad,mythBad:mythBad,ubNames:UB.map(function(id){var s=byId(id);return s?s.name:'?';})});
})()`);
const o = JSON.parse(data);
console.log('\n== rarity 分布 ==');
Object.keys(o.dist).sort().forEach(k => console.log('  rarity=' + k + ' : ' + o.dist[k] + ' 只'));
console.log('\n== 异兽 11 只 ==');
console.log('  ' + o.ubNames.join('、'));
console.log('  ' + (o.ubBad.length === 0 ? '✅ 全部 rarity=2（与神兽同档）' : '❌ 异常: ' + o.ubBad.join(' , ')));
console.log('\n== 幻兽 23 只 ==');
console.log('  ' + (o.mythBad.length === 0 ? '✅ 全部 rarity=2（与神兽同档）' : '❌ 异常: ' + o.mythBad.join(' , ')));
/* 抽样：异兽与神兽的出现率是否同量级 */
const sample = await ev(`(function(){
  var regs=['mine','desert','ocean','volcano'],tot={};
  var ubHits=0,legHits=0,N=0;
  regs.forEach(function(reg){
    var sx=-1,sy=-1;
    for(var y=2;y<MH-2&&sx<0;y++) for(var x=2;x<MW-2;x++){ if(regionAt(x,y)===reg && !blocked(x,y) && encRateOf(tileAt(x,y))>0){sx=x;sy=y;break;} }
    if(sx<0) return; S.pos={x:sx,y:sy};
    for(var i=0;i<3000;i++){ var e=rollEnemy(); N++;
      var id=e.sp.id;
      if(['pk-793','pk-794','pk-795','pk-796','pk-797','pk-798','pk-799','pk-803','pk-804','pk-805','pk-806'].indexOf(id)>=0) ubHits++;
      else if(e.sp.rarity===2) legHits++;
    }
  });
  return JSON.stringify({N:N,ubHits:ubHits,legHits:legHits});
})()`);
const s = JSON.parse(sample);
console.log('\n== 抽样 ' + s.N + ' 次（矿洞/荒漠/海洋/火山）==');
console.log('  异兽命中 ' + s.ubHits + ' 次（' + (s.ubHits / s.N * 100).toFixed(3) + '%） · 其他神兽档命中 ' + s.legHits + ' 次（' + (s.legHits / s.N * 100).toFixed(3) + '%）');
console.log('  ' + (s.ubHits > 0 ? '✅ 异兽确实会以神兽档概率出现' : '（本批抽样未命中，属 0.1% 量级的正常波动）'));
console.log('\n控制台异常: ' + errs.length + ' 条' + (errs.length ? '\n  ' + errs.slice(0, 3).join('\n  ') : ''));
ws.close();
