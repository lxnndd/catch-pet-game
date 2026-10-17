/* v82 验收：技能池 —— 左池不再出现右边已有的技能 + 双向拖放都能生效
   用法：node v82-pool.mjs [url] [cdpPort] */
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
for (let i = 0; i < 200; i++) { await wait(250); if (await ev("(typeof SPECIES!=='undefined'&&SPECIES.length>1000&&typeof applySkillDrop==='function')")) break; }

console.log('══ 1. 左池不再出现右边已有的技能 ══');
const r1 = await ev(`(function(){ try{
  localStorage.removeItem(SAVE_KEY); S=freshSave();
  var me=newPet('pk-001'); me.lv=40; ensureMoves(me);
  S.party=[me]; S.lead=me.uid;
  openSkillEditor(me);
  renderLearnDialog();
  var d=learnDlg;
  var leftIds=[].slice.call(document.querySelectorAll('#learn-pool .learn-card')).map(function(e){ return e.getAttribute('data-skill'); });
  var rightIds=[].slice.call(document.querySelectorAll('#learn-cur .learn-card')).map(function(e){ return e.getAttribute('data-skill'); });
  var overlap=leftIds.filter(function(id){ return rightIds.indexOf(id)>=0; });
  return {left:leftIds.length, right:rightIds.length, overlap:overlap, cands:d.cands.length,
          leftNames:leftIds.map(function(i){return MOVES[i].name;}), rightNames:rightIds.map(function(i){return MOVES[i].name;})};
}catch(e){ return {__err:String(e.message)}; } })()`);
if (r1.__err) ck(false, '技能池可打开', r1.__err);
else {
  console.log('   左池 ' + r1.left + ' 个（cands ' + r1.cands + '）· 右边 ' + r1.right + ' 个：' + r1.rightNames.join('/'));
  console.log('   左边的技能：' + r1.leftNames.slice(0, 12).join('/') + (r1.leftNames.length > 12 ? ' …' : ''));
  ck(r1.overlap.length === 0, '**左边没有右边已有的技能**', r1.overlap.length ? r1.overlap.join('/') : '无重叠');
}

console.log('\n══ 2. 双向拖放都生效 ══');
const r2 = await ev(`(function(){ try{
  localStorage.removeItem(SAVE_KEY); S=freshSave();
  var me=newPet('pk-001'); me.lv=40; ensureMoves(me);
  S.party=[me]; S.lead=me.uid;
  openSkillEditor(me); renderLearnDialog();
  var d=learnDlg, out={};
  var rightBefore=me.moves.slice();
  /* 左 → 右：把左池第一个新技能拖到右边第一个槽 */
  var newId=d.cands.filter(function(id){ return me.moves.indexOf(id)<0; })[0];
  out.newSkill=newId?MOVES[newId].name:null;
  if(newId){
    applySkillDrop(d, 'pool', newId, 'cur', me.moves[0]);
    out.afterPoolToCur=me.moves.slice();
    out.namesPoolToCur=me.moves.map(function(i){return MOVES[i].name;});
    out.poolToCurOK = me.moves.indexOf(newId)>=0 && me.moves.indexOf(rightBefore[0])<0;
  }
  /* 右 → 左：把右边第一个拖回池子（卸下） */
  renderLearnDialog();
  var anyCur=me.moves[1];
  var lenBefore=me.moves.length;
  applySkillDrop(d, 'cur', anyCur, 'pool', null);
  out.afterCurToPool=me.moves.slice();
  out.namesCurToPool=me.moves.map(function(i){return MOVES[i].name;});
  out.curToPoolOK = me.moves.length===lenBefore-1 && me.moves.indexOf(anyCur)<0;
  return out;
}catch(e){ return {__err:String(e.message)}; } })()`);
if (r2.__err) ck(false, '拖放可测', r2.__err);
else {
  console.log('   新技能「' + r2.newSkill + '」· 换上后：' + r2.namesPoolToCur.join('/'));
  console.log('   卸下一个后：' + r2.namesCurToPool.join('/'));
  ck(r2.poolToCurOK, '**左 → 右：新技能成功换上**', '');
  ck(r2.curToPoolOK, '右 → 左：成功卸下', '');
}

console.log('\n══ 3. 拖放后的池子刷新（左池相应减少）══');
const r3 = await ev(`(function(){ try{
  localStorage.removeItem(SAVE_KEY); S=freshSave();
  var me=newPet('pk-001'); me.lv=40; ensureMoves(me);
  S.party=[me]; S.lead=me.uid;
  openSkillEditor(me); renderLearnDialog();
  var d=learnDlg;
  var n0=document.querySelectorAll('#learn-pool .learn-card').length;
  var newId=d.cands.filter(function(id){ return me.moves.indexOf(id)<0; })[0];
  applySkillDrop(d, 'pool', newId, 'cur', me.moves[0]);
  renderLearnDialog();
  var n1=document.querySelectorAll('#learn-pool .learn-card').length;
  var overlaps=[].slice.call(document.querySelectorAll('#learn-pool .learn-card')).filter(function(e){
    return me.moves.indexOf(e.getAttribute('data-skill'))>=0; }).length;
  return {before:n0, after:n1, overlaps:overlaps};
}catch(e){ return {__err:String(e.message)}; } })()`);
if (r3.__err) ck(false, '刷新可测', r3.__err);
else {
  console.log('   左池：换上前 ' + r3.before + ' 个 → 换上后 ' + r3.after + ' 个 · 与右边重叠 ' + r3.overlaps + ' 个');
  /* 换上一招：新技能离开池子、被替换的旧技能回到池子 → 池子总数不变（正确行为） */
  ck(r3.after === r3.before, '换上后池子总数不变（一个进、一个出）', r3.before + ' → ' + r3.after);
  ck(r3.overlaps === 0, '刷新后依然没有与右边重叠的', String(r3.overlaps));
}

console.log('\n== 控制台异常: ' + errs.length + ' 条 ==');
ck(errs.length === 0, '零控制台异常');
console.log('\n═══ v82 验收：通过 ' + pass + ' / ' + (pass + fail) + ' ═══');
if (fails.length) console.log('失败项: ' + fails.join(' | '));
ws.close();
process.exit(0);
