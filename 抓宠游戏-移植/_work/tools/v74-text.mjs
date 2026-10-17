/* v74 验收：① 招式提示框改版（去掉「游戏内效果」行、介绍详细）
              ② 稀有度只剩「普通 / 传说」两档
   用法：node v74-text.mjs [url] [cdpPort] */
import { WebSocket } from 'ws';
import { mkdirSync, writeFileSync } from 'node:fs';
const URL_BASE = process.argv[2] || 'http://127.0.0.1:8728/';
const CDP_PORT = process.argv[3] || '9335';
const DIR = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/shots-v74';
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
const shot = async n => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(DIR + '/' + n + '.png', Buffer.from(r.data, 'base64')); console.log('  → ' + n + '.png'); };
mkdirSync(DIR, { recursive: true });
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Page.navigate', { url: URL_BASE + '?t=' + Date.now() });
for (let i = 0; i < 200; i++) { await wait(250); if (await ev("(typeof SPECIES!=='undefined'&&SPECIES.length>1000&&typeof moveEffectText==='function')")) break; }

console.log('══ 1. 提示框：没有「游戏内效果」那一行 ══');
const dom = await ev(`(function(){
  function idOf(nm){ var r=null; Object.keys(MOVES).forEach(function(k){ if(MOVES[k].name===nm) r=k; }); return r; }
  showMoveInfo(idOf('挑衅'));
  var el=$('move-info');
  return {hasFx:!!el.querySelector('.mi-fx'), desc:(el.querySelector('.mi-desc')||{}).textContent||'', all:el.textContent};
})()`);
if (dom.__err) ck(false, '提示框可开', dom.__err);
else {
  console.log('   浮层内容：' + String(dom.all).replace(/\s+/g, ' ').slice(0, 150));
  ck(dom.hasFx === false, '**没有「游戏内效果」那一行**', 'mi-fx 元素=' + dom.hasFx);
  ck(!/游戏内效果/.test(dom.all), '页面里不再出现「游戏内效果」字样', '');
  ck(/回合内让对手只能使出给予伤害的招式/.test(dom.desc), '官方描述保留在前面', '');
  ck(/只能使用攻击招式/.test(dom.desc), '效果说明**写进了介绍里**', '');
  await wait(300); await shot('v74-01-provoke');
}

console.log('\n══ 2. 各类招式的详细描述 ══');
const txt = await ev(`(function(){
  function idOf(nm){ var r=null; Object.keys(MOVES).forEach(function(k){ if(MOVES[k].name===nm) r=k; }); return r; }
  var NAMES=['健美','剑舞','日光束','光墙','反射壁','顺风','撒菱','反击','鼓腹','撞击','破坏光线','喷射火焰','奇异之光','寄生种子','挺住','致命针刺','增强拳','乱抓','空气之刃'];
  var out={};
  NAMES.forEach(function(nm){ var id=idOf(nm); out[nm]=id?moveEffectText(id):'(本作没有这一招)'; });
  return out;
})()`);
if (txt.__err) ck(false, '描述可查', txt.__err);
else {
  Object.keys(txt).forEach(nm => console.log('   ' + nm.padEnd(7) + ' → ' + txt[nm]));
  ck(!/兜底|未实现|近似|undefined|NaN/.test(JSON.stringify(txt)), '描述里不再有「兜底/未实现/近似」等字样', '');
  ck(/提升 1 级/.test(txt['健美']), '能力变化用自然语言（"提升 1 级"）', txt['健美']);
  ck(/减半/.test(txt['光墙']), '场地效果有具体说明', txt['光墙']);
  ck(/蓄力/.test(txt['日光束']), '蓄力招说明了两回合', txt['日光束']);
  ck(/2 倍奉还/.test(txt['反击']), '反击说明了倍率', txt['反击']);
}

console.log('\n══ 3. 稀有度：只剩「普通」与「传说」两档 ══');
const rar = await ev(`(function(){
  var c={0:0,1:0,2:0}, bad=[];
  SPECIES.forEach(function(s){ c[s.rarity]=(c[s.rarity]||0)+1; if(s.rarity===1) bad.push(s.name); });
  return {c:c, badN:bad.length, bad:bad.slice(0,8), names:RARITY_NAME.slice()};
})()`);
if (rar.__err) ck(false, '稀有度可查', rar.__err);
else {
  console.log('   普通 ' + rar.c[0] + ' · 稀有 ' + rar.c[1] + ' · 传说 ' + rar.c[2] + ' · 档名 ' + JSON.stringify(rar.names));
  ck(rar.c[1] === 0, '**没有任何宠物属于「稀有」档**', rar.c[1] + ' 只');
  ck(rar.names[1] === '普通', '中间档的名字不再叫「稀有」', rar.names[1]);
  ck(rar.c[2] > 0, '传说档仍然存在（官方传说/幻之）', rar.c[2] + ' 只');
}

console.log('\n== 控制台异常: ' + errs.length + ' 条 ==');
ck(errs.length === 0, '零控制台异常');
console.log('\n═══ v74 验收：通过 ' + pass + ' / ' + (pass + fail) + ' ═══');
if (fails.length) console.log('失败项: ' + fails.join(' | '));
ws.close();
process.exit(fail ? 1 : 0);
