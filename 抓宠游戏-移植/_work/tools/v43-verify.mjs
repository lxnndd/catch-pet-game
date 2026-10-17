/* v43 验收：刷新概率平权 + 官方捕获公式 + 配色
   ① 官方捕获率已注入（超梦 3 / 妙蛙种子 45 / 皮卡丘 190）
   ② 野外刷新不再分档（RARITY_W 全 1），且低等级的稀有度限制已取消
   ③ 捕获改用官方公式：满血精灵球 —— 捕获率 3 ≈ 1.57% / 45 ≈ 11.94% / 255 ≈ 43.87%
   ④ 球倍率 1 / 1.5 / 2；状态加成 睡眠·冰冻 2.5×、麻痹·中毒·灼烧 1.5×；血量越低越易抓
   ⑤ 配色：稀有度标签「普通=白」；18 属性改用官方属性色（冰=#96d9d6）
   用法：node v43-verify.mjs [url] [cdpPort] */
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
for (let i = 0; i < 200; i++) { await wait(250); if (await ev("(typeof SPECIES!=='undefined'&&SPECIES.length>1000&&typeof catchProb==='function')")) break; }

console.log('══ 1. 官方捕获率注入 ══');
const cap = await ev(`(function(){
  function g(id){ var s=byId(id); return s?{n:s.name,cap:s.cap,r:s.rarity}:null; }
  var d={}; SPECIES.forEach(function(s){ if(typeof s.cap==='number') d[s.cap]=(d[s.cap]||0)+1; });
  return {mewtwo:g('pk-150'), venusaur:g('pk-001'), pikachu:g('pk-025'), rayquaza:g('pk-384'), kz:g('kz-006'),
          n:SPECIES.filter(function(s){return typeof s.cap==='number';}).length, dist:d};
})()`);
ck(cap.mewtwo && cap.mewtwo.cap === 3, '超梦 cap=3（官方传说）', JSON.stringify(cap.mewtwo));
ck(cap.venusaur && cap.venusaur.cap === 45, '妙蛙种子 cap=45', JSON.stringify(cap.venusaur));
ck(cap.pikachu && cap.pikachu.cap === 190, '皮卡丘 cap=190', JSON.stringify(cap.pikachu));
ck(cap.n === 1205, '全部 1205 只都有捕获率', String(cap.n));
console.log('   分布（前 6 档）: ' + Object.keys(cap.dist).map(Number).sort((a,b)=>b-a).slice(0,6).map(k=>k+'→'+cap.dist[k]).join(' · '));

console.log('\n══ 2. 捕获公式 vs 官方数值（满血 · 无状态）══');
const prob = await ev(`(function(){
  function f(rate,ball,st,hpRatio){ var s={cap:rate}; return +(catchProb(s,100,100*hpRatio,ball,st)*100).toFixed(2); }
  return {
    r3:[f(3,1,1,1), f(3,1.5,1,1), f(3,2,1,1)],
    r45:[f(45,1,1,1), f(45,1.5,1,1), f(45,2,1,1)],
    r255:[f(255,1,1,1), f(255,1.5,1,1), f(255,2,1,1)],
    halfHp:f(3,1,1,0.5), thirdHp:f(3,1,1,0.34), oneHp:f(3,1,1,0.01),
    sleep:f(3,1,2.5,1), para:f(3,1,1.5,1),
    realMewtwo:+(catchProb(byId('pk-150'),100,100,1,1)*100).toFixed(2),
    realPika:+(catchProb(byId('pk-025'),100,100,1,1)*100).toFixed(2)
  };
})()`);
ck(Math.abs(prob.r3[0] - 1.57) < 0.05, '捕获率 3 满血·标准球 = 1.57%（官方）', prob.r3[0] + '%');
ck(Math.abs(prob.r3[1] - 2.12) < 0.06, '捕获率 3 · 加强球(1.5×) = 2.12%', prob.r3[1] + '%');
ck(Math.abs(prob.r3[2] - 2.64) < 0.08, '捕获率 3 · 精英球(2×) = 2.64%', prob.r3[2] + '%');
ck(Math.abs(prob.r45[0] - 11.94) < 0.2, '捕获率 45 满血·标准球 = 11.94%', prob.r45[0] + '%');
ck(Math.abs(prob.r255[0] - 43.87) < 0.5, '捕获率 255 满血·标准球 = 43.87%', prob.r255[0] + '%');
ck(prob.halfHp > prob.r3[0] && prob.thirdHp > prob.halfHp && prob.oneHp > prob.thirdHp,
  '血量越低越好抓（官方血量项）', '满血 ' + prob.r3[0] + '% → 半血 ' + prob.halfHp + '% → 1/3 ' + prob.thirdHp + '% → 残血 ' + prob.oneHp + '%');
ck(prob.sleep > prob.r3[0] && prob.para > prob.r3[0] && prob.sleep > prob.para,
  '异常状态加成：睡眠 2.5× > 麻痹 1.5× > 无', '无 ' + prob.r3[0] + '% · 麻痹 ' + prob.para + '% · 睡眠 ' + prob.sleep + '%');
ck(prob.realMewtwo === 1.57, '超梦（cap 3）实测 = 1.57%', prob.realMewtwo + '%');
ck(prob.realPika > 30, '皮卡丘（cap 190）实测 = ' + prob.realPika + '%', '');

console.log('\n══ 3. 刷新概率平权 ══');
const enc = await ev(`(function(){
  try{
    localStorage.removeItem(SAVE_KEY); S=freshSave();
    var p=newPet('pk-001'); p.lv=1; p.hp=maxHpOf(p); ensureMoves(p);
    S.party=[p]; S.lead=p.uid; S.pos={x:SPAWN.x,y:SPAWN.y}; enterWorld();
    var cnt={0:0,1:0,2:0}, seen={}, n=1200;
    for(var i=0;i<n;i++){ var e=rollEnemy(); cnt[e.sp.rarity]++; seen[e.sp.id]=1; }
    /* v51/v53 起，实际可抽的池子还要经过「阶段区间 ∩ 目标等级区间」过滤，
       所以期望值必须按**同一套过滤后**的池子算，否则会误判（v43 写这段时还没有这层过滤）。 */
    var _reg0=regionAt(SPAWN.x,SPAWN.y), _top0=wildBaseLv();
    var pool=SPECIES.filter(function(s){ return wildOk(s,_reg0) && !!wildLvRange(s,_reg0,_top0); });
    var p2=pool.filter(function(s){ return s.rarity===2; }).length;
    var p0=pool.filter(function(s){ return s.rarity!==2; }).length;
    return {w:RARITY_W.slice(), cnt:cnt, poolTotal:pool.length, poolR2:p2, poolR0:p0, uniq:Object.keys(seen).length, lv:S.party[0].lv};
  }catch(e){ return {__err:String(e.message)}; }
})()`);
if (enc.__err) ck(false, '遇敌抽样可跑', enc.__err);
else {
  /* v93 起传说档权重被压到 0.05（神兽占比 8.71% → 0.5%），所以这里按**当前权重**算期望 */
  ck(enc.w[0] === 1 && enc.w[1] === 1, '普通/稀有档权重仍为 1', JSON.stringify(enc.w));
  ck(enc.w[2] < 1, '传说档权重已下调（v93：神兽占比压到 0.5%）', 'RARITY_W[2]=' + enc.w[2]);
  console.log('   玩家 Lv' + enc.lv + ' · 平原池 ' + enc.poolTotal + ' 只（其中传说档 ' + enc.poolR2 + ' 只）');
  console.log('   1200 次遇敌：普通 ' + enc.cnt[0] + ' · 稀有 ' + enc.cnt[1] + ' · 传说 ' + enc.cnt[2] + '（共 ' + enc.uniq + ' 个不同物种）');
  ck(enc.cnt[2] > 0, '**1 级玩家也能遇到传说档**（低等级限制已取消）', '传说 ' + enc.cnt[2] + ' 次');
  const exp2 = (enc.poolR2 * enc.w[2]) / (enc.poolR0 * enc.w[0] + enc.poolR2 * enc.w[2] || 1) * 1200;
  ck(Math.abs(enc.cnt[2] - exp2) < Math.max(6, exp2 * 1.2), '传说档出现次数 ≈ 按权重的期望（v93 起不再是等概率）', '实得 ' + enc.cnt[2] + '，期望 ' + exp2.toFixed(1));
}

console.log('\n══ 4. 球与配色 ══');
const ui = await ev(`(function(){
  var cs=getComputedStyle(document.documentElement);
  return {
    balls: BALLS.map(function(b){ return b.name+' '+b.mult+'×'; }),
    tIce: cs.getPropertyValue('--t-ice').trim(),
    tPsychic: cs.getPropertyValue('--t-psychic').trim(),
    tSteel: cs.getPropertyValue('--t-steel').trim(),
    rar0: (function(){ var d=document.createElement('span'); d.className='rarity-tag rar0'; d.textContent='普通'; document.body.appendChild(d); var v=getComputedStyle(d).backgroundColor+' / '+getComputedStyle(d).color; d.remove(); return v; })(),
    rar1: (function(){ var d=document.createElement('span'); d.className='rarity-tag rar1'; document.body.appendChild(d); var v=getComputedStyle(d).backgroundColor; d.remove(); return v; })(),
    rar2: (function(){ var d=document.createElement('span'); d.className='rarity-tag rar2'; document.body.appendChild(d); var v=getComputedStyle(d).backgroundColor; d.remove(); return v; })(),
    typeClasses: ['t-nor','t-fire','t-water','t-elec','t-grass','t-ice','t-fight','t-poison','t-ground','t-flying','t-psychic','t-bug','t-rock','t-ghost','t-dragon','t-dark','t-steel','t-fairy'].filter(function(k){
      var d=document.createElement('span'); d.className='type-tag '+k; document.body.appendChild(d);
      var v=getComputedStyle(d).backgroundColor; d.remove(); return v && v!=='rgba(0, 0, 0, 0)';
    }).length
  };
})()`);
ck(ui.balls.join(' / ') === '标准球 1× / 加强球 1.5× / 精英球 2×', '球倍率 = 官方 1 / 1.5 / 2', ui.balls.join(' / '));
ck(ui.tIce === '#96d9d6', '冰属性色 = #96d9d6（官方雪白青）', ui.tIce);
ck(ui.tPsychic === '#f95587' && ui.tSteel === '#b7b7ce', '超能力/钢属性色已定义（原来缺失）', ui.tPsychic + ' / ' + ui.tSteel);
ck(/rgb\(255, 255, 255\)/.test(ui.rar0), '稀有度标签「普通」= 白底', ui.rar0);
ck(/rgb\(79, 143, 221\)/.test(ui.rar1) && /rgb\(229, 72, 77\)/.test(ui.rar2), '稀有=蓝 · 传说=红', ui.rar1 + ' / ' + ui.rar2);
ck(ui.typeClasses === 18, '18 个属性色类全部可用', ui.typeClasses + ' / 18');

console.log('\n== 控制台异常: ' + errs.length + ' 条 ==');
ck(errs.length === 0, '零控制台异常');
console.log('\n═══ v43 验收：通过 ' + pass + ' / ' + (pass + fail) + ' ═══');
if (fails.length) console.log('失败项: ' + fails.join(' | '));
ws.close();
process.exit(fail ? 1 : 0);
