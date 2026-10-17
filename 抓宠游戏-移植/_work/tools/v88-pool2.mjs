/* v88 验收：技能池「没满时拖到右侧空白 = 直接添加」
   用法：node v88-pool2.mjs [url] [cdpPort] */
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

console.log('══ 1. 只有 2 个技能时：拖到空白 → 直接添加 ══');
const r1 = await ev(`(function(){ try{
  localStorage.removeItem(SAVE_KEY); S=freshSave();
  var me=newPet('pk-001'); me.lv=40; ensureMoves(me);
  me.moves=me.moves.slice(0,2); syncPP(me);              /* 人为做成只有 2 个技能 */
  S.party=[me]; S.lead=me.uid;
  openSkillEditor(me); renderLearnDialog();
  var d=learnDlg;
  var newId=d.cands.filter(function(id){ return me.moves.indexOf(id)<0; })[0];
  var before=me.moves.slice();
  applySkillDrop(d,'pool',newId,'cur',null);             /* 关键：toId 为空 = 拖到空白 */
  return {before:before.map(function(i){return MOVES[i].name;}), after:me.moves.map(function(i){return MOVES[i].name;}),
          newName:MOVES[newId].name, ok:me.moves.indexOf(newId)>=0 && me.moves.length===before.length+1};
}catch(e){ return {__err:String(e.message)}; } })()`);
if (r1.__err) ck(false, '可测', r1.__err);
else {
  console.log('   拖之前（2 个）：' + r1.before.join(' / '));
  console.log('   拖之后（' + r1.after.length + ' 个）：' + r1.after.join(' / '));
  console.log('   拖的是「' + r1.newName + '」');
  ck(r1.ok, '**2 个技能时，从左边拖到右侧空白 → 成功添加**', r1.before.length + ' → ' + r1.after.length);
}

console.log('\n══ 2. 技能栏满（4 个）时：拖到空白 → 拒绝并提示 ══');
const r2 = await ev(`(function(){ try{
  localStorage.removeItem(SAVE_KEY); S=freshSave();
  var me=newPet('pk-001'); me.lv=40; ensureMoves(me);
  S.party=[me]; S.lead=me.uid;
  openSkillEditor(me); renderLearnDialog();
  var d=learnDlg;
  var newId=d.cands.filter(function(id){ return me.moves.indexOf(id)<0; })[0];
  var before=me.moves.slice();
  applySkillDrop(d,'pool',newId,'cur',null);
  return {beforeLen:before.length, afterLen:me.moves.length, added:me.moves.indexOf(newId)>=0};
}catch(e){ return {__err:String(e.message)}; } })()`);
if (r2.__err) ck(false, '可测', r2.__err);
else {
  console.log('   满栏（' + r2.beforeLen + ' 个）拖到空白 → 变成 ' + r2.afterLen + ' 个');
  ck(r2.afterLen === r2.beforeLen && !r2.added, '栏位满时**不会硬塞**（提示去替换）', r2.beforeLen + ' → ' + r2.afterLen);
}

console.log('\n══ 3. 拖到已有技能上（替换）仍然正常 ══');
const r3 = await ev(`(function(){ try{
  localStorage.removeItem(SAVE_KEY); S=freshSave();
  var me=newPet('pk-001'); me.lv=40; ensureMoves(me);
  S.party=[me]; S.lead=me.uid;
  openSkillEditor(me); renderLearnDialog();
  var d=learnDlg;
  var newId=d.cands.filter(function(id){ return me.moves.indexOf(id)<0; })[0];
  var old=me.moves[0], beforeLen=me.moves.length;
  applySkillDrop(d,'pool',newId,'cur',old);
  return {oldName:MOVES[old].name, newName:MOVES[newId].name,
          hasNew:me.moves.indexOf(newId)>=0, hasOld:me.moves.indexOf(old)>=0, len:beforeLen+'→'+me.moves.length};
}catch(e){ return {__err:String(e.message)}; } })()`);
if (r3.__err) ck(false, '可测', r3.__err);
else {
  console.log('   用「' + r3.newName + '」替换掉「' + r3.oldName + '」· 栏位 ' + r3.len);
  ck(r3.hasNew && !r3.hasOld, '拖到已有技能上 = **替换**（原功能保留）', '');
}

console.log('\n══ 4. 落点识别：右侧空白区也算合法落点 ══');
const r4 = await ev(`(function(){ try{
  localStorage.removeItem(SAVE_KEY); S=freshSave();
  var me=newPet('pk-001'); me.lv=40; ensureMoves(me);
  me.moves=me.moves.slice(0,2); syncPP(me);
  S.party=[me]; S.lead=me.uid;
  openSkillEditor(me); renderLearnDialog();
  var cur=$('learn-cur');
  var rc=cur.getBoundingClientRect();
  /* 取右侧列底部一块空白（避开卡片） */
  var x=rc.left+rc.width/2, y=rc.bottom-8;
  var hit=_hiAt(x,y);
  return {zoneHit:!!hit, hitId:hit?hit.id:null, hasZoneCss:getComputedStyle(cur).minHeight,
          dropHi:cur.classList.contains('drop-hi')};
}catch(e){ return {__err:String(e.message)}; } })()`);
if (r4.__err) ck(false, '落点可测', r4.__err);
else {
  console.log('   在右侧空白处取点：命中=' + r4.zoneHit + ' · id=' + r4.hitId + ' · min-height=' + r4.hasZoneCss + ' · 高亮=' + r4.dropHi);
  ck(r4.zoneHit && r4.hitId === 'learn-cur', '**右侧空白区域被识别为合法落点**', r4.hitId || '无');
  ck(parseFloat(r4.hasZoneCss) >= 150, '右侧栏有足够的最小高度（便于拖入）', r4.hasZoneCss);
}

console.log('\n== 控制台异常: ' + errs.length + ' 条 ==');
ck(errs.length === 0, '零控制台异常');
console.log('\n═══ v88 验收：通过 ' + pass + ' / ' + (pass + fail) + ' ═══');
if (fails.length) console.log('失败项: ' + fails.join(' | '));
ws.close();
process.exit(0);
