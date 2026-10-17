/* v28 运行时验证：①野怪等级不再跟随队伍 ②不会刷出「抓到就进化」的个体 ③进化型确实进池
   用法：node v28-verify.mjs [url] [cdpPort] */
import { WebSocket } from 'ws';
const URL_BASE = process.argv[2] || 'http://127.0.0.1:8727/';
const CDP_PORT = process.argv[3] || '9335';
let seq = 0;
const c = await (await fetch('http://127.0.0.1:' + CDP_PORT + '/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(c.webSocketDebuggerUrl);
const pend = new Map();
const errs = [];
ws.on('message', d => {
  const m = JSON.parse(String(d));
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); return; }
  if (m.method === 'Runtime.exceptionThrown') errs.push(String(m.params?.exceptionDetails?.exception?.description || '').slice(0, 160));
});
await new Promise((r, j) => { ws.on('open', r); ws.on('error', j); });
const send = (mm, p = {}) => new Promise((res, rej) => { const id = ++seq; pend.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method: mm, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) return { __err: String(r.exceptionDetails.exception?.description || '').slice(0, 400) }; return r.result?.value; };
const wait = ms => new Promise(r => setTimeout(r, ms));
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Page.navigate', { url: URL_BASE + '?t=' + Date.now() });
for (let i = 0; i < 120; i++) { await wait(250); if (await ev("(typeof MW!=='undefined'&&typeof map!=='undefined'&&map&&map.length)") === true) break; }

const boot = async (lv) => await ev(`(function(){
  try{
    localStorage.removeItem(SAVE_KEY); S=freshSave();
    var p=newPet('pk-001'); p.lv=${lv}; p.hp=maxHpOf(p); ensureMoves(p);
    S.party=[p]; S.lead=p.uid; S.pos={x:SPAWN.x,y:SPAWN.y}; enterWorld();
    return 'ok';
  }catch(e){ return 'ERR '+e.message; }
})()`);
console.log('进入世界(队伍 Lv5): ' + await boot(5));

const REGS = ['plain', 'forest', 'water', 'flower', 'mine', 'desert', 'ocean', 'volcano', 'snow'];
const sampler = `(function(reg,N){
  var sx=-1,sy=-1;
  for(var y=2;y<MH-2&&sx<0;y++) for(var x=2;x<MW-2;x++){ if(regionAt(x,y)===reg && !blocked(x,y) && encRateOf(tileAt(x,y))>0){ sx=x;sy=y;break; } }
  if(sx<0) return JSON.stringify({err:'no spot'});
  S.pos={x:sx,y:sy};
  var lo=999,hi=0,seen={},evo=0,bad=0,badList=[],sum=0;
  for(var i=0;i<N;i++){
    var e=rollEnemy(); var lv=e.lv;
    if(lv<lo)lo=lv; if(lv>hi)hi=lv; sum+=lv;
    seen[e.sp.id]=1;
    if(isEvolvedForm(e.sp)) evo++;
    var nl=nextEvoLv(e.sp);
    if(nl!==null && lv>=nl){ bad++; if(badList.length<3) badList.push(e.sp.name+' Lv'+lv+'（Lv'+nl+' 就该进化）'); }
    var el=evoLvOf(e.sp.id);
    if(el!==undefined && lv<el){ bad++; if(badList.length<3) badList.push(e.sp.name+' Lv'+lv+' < 来路 Lv'+el); }
  }
  return JSON.stringify({lo:lo,hi:hi,avg:+(sum/N).toFixed(1),sp:Object.keys(seen).length,evo:evo,bad:bad,badList:badList});
})`;
console.log('\n== 各地区 3000 次 rollEnemy 采样（地区等级段 / 物种数 / 进化型占比 / 违规）==');
console.log('  地区      等级范围      均值   物种   进化型      违规');
const regions = [];
for (const reg of REGS) {
  const raw = await ev(`(${sampler})(${JSON.stringify(reg)},3000)`);
  if (raw && raw.__err) { console.log('  ' + reg.padEnd(9) + 'ERR ' + raw.__err.slice(0, 90)); continue; }
  const o = JSON.parse(raw);
  if (o.err) { console.log('  ' + reg.padEnd(9) + '❌ ' + o.err); continue; }
  regions.push({ reg, o });
  const ok = o.bad === 0;
  console.log('  ' + reg.padEnd(9) + ('Lv' + o.lo + '~' + o.hi).padEnd(13) + String(o.avg).padStart(5) + String(o.sp).padStart(7) + ('  ' + (o.evo / 3000 * 100).toFixed(1) + '%').padStart(9) + (ok ? '        ✅ 0' : '        ❌ ' + o.bad + ' ← ' + o.badList.join(' | ')));
}
/* 关键：等级是否跟随队伍 */
console.log('\n== 关键验证：同一地区，队伍 Lv5 vs Lv90 的野怪等级分布 ==');
for (const lv of [5, 90]) {
  await boot(lv);
  const raw = await ev(`(${sampler})('plain',3000)`);
  const o = JSON.parse(raw);
  console.log('  队伍 Lv' + String(lv).padEnd(3) + ' → 平原野怪 Lv' + o.lo + '~' + o.hi + '  均值 ' + o.avg + '  物种 ' + o.sp);
}
/* 抓一只看看会不会立刻进化 */
console.log('\n== 真实链路：遇敌 → 捕获 → 是否立刻进化 ==');
await boot(20);
const cap = await ev(`(function(){
  try{
    var r=null;
    for(var i=0;i<4000;i++){ r=rollEnemy(); if(nextEvoLv(r.sp)!==null && isEvolvedForm(r.sp)) break; }
    if(!r) return JSON.stringify({err:'没抽到进化型'});
    var before=r.sp.name, nl=nextEvoLv(r.sp);
    var p=newPet(r.sp.id); p.lv=r.lv; p.hp=maxHpOf(p); ensureMoves(p);
    S.party.push(p);
    var stored=r.lv;
    runEvoCheck();
    var after=byId(p.sp).name;
    return JSON.stringify({name:before, lv:r.lv, nextEvo:nl, afterEvoCheck:after, evolved:(after!==before)});
  }catch(e){ return JSON.stringify({err:e.message}); }
})()`);
if (cap && cap.__err) console.log('  ERR ' + cap.__err);
else {
  const o = JSON.parse(cap);
  if (o.err) console.log('  ⚠ ' + o.err);
  else console.log('  抽到进化型 ' + o.name + ' Lv' + o.lv + '（它在 Lv' + o.nextEvo + ' 进化）→ runEvoCheck 后仍是 ' + o.afterEvoCheck + ' → ' + (o.evolved ? '❌ 立刻进化了' : '✅ 不会立刻进化'));
}
console.log('\n控制台异常: ' + errs.length + ' 条' + (errs.length ? '\n  ' + errs.slice(0, 3).join('\n  ') : ''));
ws.close();
