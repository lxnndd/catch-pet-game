/* v56 验收：招式提示框的「游戏内效果」文案
   ① 有官方精确效果的招（剑舞）→ 正常显示，无额外标注
   ② 走**属性兜底**的招（挑衅 = 恶系变化技，官方"3 回合只能出攻击招"本作没实现）→ 必须标注「兜底效果」
   ③ 本作**近似实现**的招（守住/白雾/睡觉/治愈之愿/瞬间移动）→ 标注「官方为「XX」，本作以这个效果近似」
   ④ 攻击招无附加效果 → 「直接造成伤害」；变化技无任何效果 → 「暂无附加效果」
   ⑤ 标题已从「本作效果」改成「游戏内效果」
   用法：node v56-skillinfo.mjs [url] [cdpPort] */
import { WebSocket } from 'ws';
import { mkdirSync, writeFileSync } from 'node:fs';
const URL_BASE = process.argv[2] || 'http://127.0.0.1:8728/';
const CDP_PORT = process.argv[3] || '9335';
const DIR = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/shots-v56';
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
const shot = async (n) => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(DIR + '/' + n + '.png', Buffer.from(r.data, 'base64')); console.log('  → ' + n + '.png'); };
mkdirSync(DIR, { recursive: true });
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Page.navigate', { url: URL_BASE + '?t=' + Date.now() });
for (let i = 0; i < 200; i++) { await wait(250); if (await ev("(typeof MOVES!=='undefined'&&typeof moveEffectText==='function'&&typeof FX_APPROX!=='undefined')")) break; }

console.log('══ 1. 三类文案 ══');
const t = await ev(`(function(){
  function idOf(nm){ var r=null; Object.keys(MOVES).forEach(function(k){ if(MOVES[k].name===nm) r=k; }); return r; }
  var names=['挑衅','守住','白雾','睡觉','治愈之愿','瞬间移动','剑舞','诡计','撞击','抓挠','瞪眼','长嚎','掉包','戏法'];
  var out={};
  names.forEach(function(nm){
    var id=idOf(nm);
    out[nm]= id ? {id:id, type:TYPE_NAME[MOVES[id].type], cat:MOVES[id].cat, power:MOVES[id].power,
                    exact:!!MOVE_FX[nm], text:moveEffectText(id)} : null;
  });
  /* 找一个「无兜底、无精确配置」的变化技（正常系变化技通常兜底为空） */
  var noFx=null;
  Object.keys(MOVES).forEach(function(id){
    var m=MOVES[id];
    if(noFx || m.cat!=='变化') return;
    if(MOVE_FX[m.name]) return;
    if(typeof FX_BY_TYPE[m.type]!=='undefined') return;
    noFx={name:m.name, id:id, text:moveEffectText(id)};
  });
  out.__noFx=noFx;
  return out;
})()`);
if (t.__err) ck(false, '文案查询可跑', t.__err);
else {
  ['挑衅', '守住', '白雾', '睡觉', '治愈之愿', '瞬间移动', '剑舞', '撞击'].forEach(nm => {
    const o = t[nm];
    if (!o) { console.log('   ' + nm + '：游戏里没有这一招'); return; }
    console.log('   ' + nm + '（' + o.type + '·' + o.cat + '）精确配置=' + o.exact);
    console.log('        → ' + o.text);
  });
  const prov = t['挑衅'];
  ck(prov && /兜底效果/.test(prov.text), '「挑衅」标明这是**属性兜底**效果（不是官方效果）', prov ? prov.text.slice(0, 60) : '');
  ck(prov && /防御 -1/.test(prov.text), '「挑衅」的兜底效果仍是降防御（行为没变，只是说清楚了）', '');
  const guard = t['守住'];
  ck(guard && /官方为/.test(guard.text) && /完全挡下/.test(guard.text), '「守住」标注了官方机制与近似关系', guard ? guard.text : '');
  const dance = t['剑舞'];
  ck(dance && !/兜底|官方为/.test(dance.text) && /攻击 \+2/.test(dance.text), '「剑舞」是官方精确效果，不加任何标注', dance ? dance.text : '');
  const tackle = t['撞击'];
  ck(tackle && tackle.text === '直接造成伤害', '攻击招无附加效果 → 「直接造成伤害」', tackle ? tackle.text : '');
  /* 注：fxOf() 对变化技有保底（`|| {buff:{def:1}}`），所以**不存在"无任何效果的变化技"**；
     这里改为验证「走兜底的变化技不会被误写成『直接造成伤害』」。 */
  ck(t.__noFx && /兜底效果/.test(t.__noFx.text), '变化技走兜底时显示兜底说明（不会误写「直接造成伤害」）',
    t.__noFx ? t.__noFx.name + '：' + t.__noFx.text.slice(0, 48) : '（未取到样本）');
}

console.log('\n══ 2. 提示框标题与兜底说明 ══');
const dom = await ev(`(function(){
  function idOf(nm){ var r=null; Object.keys(MOVES).forEach(function(k){ if(MOVES[k].name===nm) r=k; }); return r; }
  showMoveInfo(idOf('挑衅'));
  var el=$('move-info');
  var fx=el.querySelector('.mi-fx');
  var desc=el.querySelector('.mi-desc');
  var out={title:fx?fx.textContent:'', desc:desc?desc.textContent:'', hidden:el.classList.contains('hidden')};
  return out;
})()`);
if (dom.__err) ck(false, '提示框可打开', dom.__err);
else {
  console.log('   浮层效果行：' + dom.title);
  console.log('   官方描述行：' + dom.desc);
  ck(/^游戏内效果：/.test(dom.title), '标题是「游戏内效果：」（不再是「本作效果」）', dom.title.slice(0, 30));
  ck(!/本作效果/.test(dom.title), '页面里不再出现「本作效果」这个说法', '');
  ck(/使对手愤怒/.test(dom.desc), '官方描述仍然保留在上方', '');
  await wait(300); await shot('v56-01-moveinfo-provoke');
}

const dom2 = await ev(`(function(){
  function idOf(nm){ var r=null; Object.keys(MOVES).forEach(function(k){ if(MOVES[k].name===nm) r=k; }); return r; }
  showMoveInfo(idOf('守住'));
  var el=$('move-info'); var fx=el.querySelector('.mi-fx');
  return {title:fx?fx.textContent:''};
})()`);
if (!dom2.__err) { console.log('   「守住」：' + dom2.title); await wait(300); await shot('v56-02-moveinfo-protect'); }

console.log('\n══ 3. 全局一致性：所有招式都有可读的效果说明 ══');
const all = await ev(`(function(){
  var bad=[], n=0;
  Object.keys(MOVES).forEach(function(id){
    var m=MOVES[id];
    var txt=moveEffectText(id);
    n++;
    if(!txt || /undefined|NaN/.test(txt)) bad.push(m.name+' → '+txt);
  });
  return {n:n, bad:bad.slice(0,10), badN:bad.length};
})()`);
if (all.__err) ck(false, '全局检查可跑', all.__err);
else {
  console.log('   检查 ' + all.n + ' 个招式');
  ck(all.badN === 0, '没有「undefined / NaN / 空」的效果说明', all.badN ? JSON.stringify(all.bad) : '全部可读');
}

console.log('\n== 控制台异常: ' + errs.length + ' 条 ==');
ck(errs.length === 0, '零控制台异常');
console.log('\n═══ v56 验收：通过 ' + pass + ' / ' + (pass + fail) + ' ═══');
if (fails.length) console.log('失败项: ' + fails.join(' | '));
ws.close();
process.exit(fail ? 1 : 0);
