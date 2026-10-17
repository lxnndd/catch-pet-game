/* v46b 验收：性格详情可见（详情面板 + 收服日志）
   ① traitDesc() 对 8 个性格都给出正确的效果文字（与 TRAITS 定义一致）
   ② 未知性格有不崩的兜底文案
   ③ 宠物详情面板出现「💫 性格」行，含性格名与效果
   ④ 收服流程会把性格效果写进战斗日志
   用法：node v46b-trait-verify.mjs [url] [cdpPort] */
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
for (let i = 0; i < 200; i++) { await wait(250); if (await ev("(typeof SPECIES!=='undefined'&&SPECIES.length>1000&&typeof traitDesc==='function')")) break; }

console.log('══ 1. 八种性格的效果文字 ══');
const d = await ev(`(function(){
  var out={};
  Object.keys(TRAITS).forEach(function(k){ out[k]={name:TRAITS[k].name, desc:traitDesc(k)}; });
  out.unknown=traitDesc('definitely_not_a_trait');
  out.unknownName=trOf('definitely_not_a_trait').name;
  return out;
})()`);
const WANT = [
  ['fierce', '凶猛', ['攻击×1.15', '防御×1.1']],
  ['gentle', '温和', ['攻击×0.9', '防御×0.85']],
  ['brute', '莽勇', ['攻击×1.25', '18% 概率打空']],
  ['swift', '灵敏', ['攻击×0.95', '15% 概率闪开']],
  ['tough', '坚韧', ['攻击×0.92', '回血×1.3']],
  ['curious', '好奇', ['防御×1.08', '经验×1.35']],
  ['pugnacious', '好斗', ['防御×1.02', '残血时伤害 +35%']],
  ['lazy', '慵懒', ['攻击×1.08', '经验×0.7']]
];
WANT.forEach(([k, nm, keys]) => {
  const o = d[k];
  const ok = o && o.name === nm && keys.every(x => o.desc.indexOf(x) >= 0);
  ck(ok, nm + '（' + k + '）', o ? o.desc : '(缺失)');
});
ck(d.unknown === '无额外效果' && d.unknownName === '随和', '未知性格兜底为「随和 · 无额外效果」', d.unknownName + ' / ' + d.unknown);

console.log('\n══ 2. 宠物详情面板能看到性格 ══');
const r = await ev(`(function(){
  try{
    localStorage.removeItem(SAVE_KEY); S=freshSave();
    var p=newPet('pk-006'); p.trait='brute'; p.lv=50; p.hp=maxHpOf(p); ensureMoves(p);
    S.party=[p]; S.lead=p.uid; S.pos={x:SPAWN.x,y:SPAWN.y}; enterWorld();
    openPetInfo(p);
    var rows=[]; document.querySelectorAll('#petinfo-body .stat-line').forEach(function(x){ rows.push(x.textContent.trim()); });
    var tip=''; var t=document.querySelector('#petinfo-body .dex-note'); if(t) tip=t.textContent;
    /* 逐个性格都过一遍，确认面板文案会跟着变 */
    var perTrait={};
    Object.keys(TRAITS).forEach(function(k){
      p.trait=k; openPetInfo(p);
      var rr=[]; document.querySelectorAll('#petinfo-body .stat-line').forEach(function(x){ rr.push(x.textContent.trim()); });
      perTrait[k]=rr[0]||'';
    });
    $('panel-petinfo').classList.add('hidden');
    return {rows:rows, first:rows[0]||'', last:rows[rows.length-1]||'', tip:tip, perTrait:perTrait};
  }catch(e){ return {__err:String(e.message)}; }
})()`);
if (r.__err) ck(false, '详情面板可打开', r.__err);
else {
  console.log('   面板行数: ' + r.rows.length + ' · 第一行: ' + r.first);
  ck(/性格/.test(r.first), '详情面板**第一行是「💫 性格」**（打开就能看见，不用滚动）', r.first);
  ck(/莽勇/.test(r.first) && /打空/.test(r.first), '内容含性格名与效果', r.first);
  ck(r.rows.length === 8, '面板行数从 7 增加到 8（原有六维+经验未动）', r.rows.length + ' 行');
  ck(/性格/.test(r.tip), '说明文字提到了性格', r.tip.slice(-40));
  const diffs = WANT.filter(([k, nm]) => r.perTrait[k] && r.perTrait[k].indexOf(nm) >= 0).length;
  ck(diffs === 8, '切换性格后面板文案同步更新（8/8）', diffs + ' / 8');
  console.log('   例：凶猛 → ' + r.perTrait.fierce);
  console.log('   例：好奇 → ' + r.perTrait.curious);
}

console.log('\n══ 3. 收服日志也会写明性格 ══');
const cap = await ev("captureSuccess.toString()");
if (typeof cap !== 'string') ck(false, '读取收服函数', String(cap));
else {
  ck(/traitDesc/.test(cap), 'captureSuccess 里引用了性格说明', '');
  ck(/性格是/.test(cap), '收服时会输出「性格是「XX」：<效果>」', '');
}

console.log('\n== 控制台异常: ' + errs.length + ' 条 ==');
ck(errs.length === 0, '零控制台异常');
console.log('\n═══ v46b 验收：通过 ' + pass + ' / ' + (pass + fail) + ' ═══');
if (fails.length) console.log('失败项: ' + fails.join(' | '));
ws.close();
process.exit(fail ? 1 : 0);
