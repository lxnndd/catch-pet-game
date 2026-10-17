/* v31 验收：技能拖动换招
   ①左栏=没学的、右栏=学了的（DOM 标记 data-side）
   ②右栏卡片不再 disabled
   ③applySkillDrop 三种落点：池→槽换招 / 槽→槽互换 / 槽→池卸下
   用法：node v31-accept.mjs [url] [cdpPort] */
import { WebSocket } from 'ws';
const URL_BASE = process.argv[2] || 'http://47.105.123.182:8727/';
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
let ready = false;
for (let i = 0; i < 160; i++) { await wait(250); if (await ev("(typeof TOWNS!=='undefined'&&TOWNS.length&&typeof map!=='undefined'&&map&&map.length&&typeof applySkillDrop==='function')") === true) { ready = true; break; } }
if (!ready) { console.log('❌ 页面没加载出来（TOWNS/applySkillDrop 未定义）——URL 可能不对: ' + URL_BASE); ws.close(); process.exit(1); }
console.log('页面就绪: ' + URL_BASE + '\n');
await ev(`(function(){localStorage.removeItem(SAVE_KEY);S=freshSave();var p=newPet('pk-006');p.lv=60;p.hp=maxHpOf(p);ensureMoves(p);S.party=[p];S.lead=p.uid;S.pos={x:SPAWN.x,y:SPAWN.y};enterWorld();return 'ok';})()`);

console.log('【1】编辑模式：左右栏结构与可拖状态');
const r1 = await ev(`(function(){
  try{
    var p=S.party[0];
    openSkillEditor(p);
    var dlg=$('panel-learn');
    var poolCards=document.querySelectorAll('#learn-pool .learn-card');
    var curCards=document.querySelectorAll('#learn-cur .learn-card');
    var curSides=[], curDisabled=0, poolSides=[];
    Array.prototype.forEach.call(curCards,function(x){ curSides.push(x.getAttribute('data-side')); if(x.disabled) curDisabled++; });
    Array.prototype.forEach.call(poolCards,function(x){ poolSides.push(x.getAttribute('data-side')); });
    return JSON.stringify({
      open: !dlg.classList.contains('hidden'),
      poolN: poolCards.length, curN: curCards.length,
      poolSides: poolSides.slice(0,3), curSides: curSides,
      curDisabled: curDisabled,
      poolHead: ($('learn-pool').querySelector('.dex-note')||{}).textContent,
      curHead: ($('learn-cur').querySelector('.dex-note')||{}).textContent,
      moves: p.moves.slice()
    });
  }catch(e){ return 'ERR '+e.message; }
})()`);
if (r1 && r1.__err) ck(false, '技能编辑器', r1.__err);
else {
  const o = JSON.parse(r1);
  ck(o.open === true, '「🔧 调整技能」能打开', '');
  ck(o.poolSides.every(s => s === 'pool') && o.poolN > 0, '左栏卡片标记 data-side=pool（没学的）', o.poolN + ' 张');
  ck(o.curSides.length > 0 && o.curSides.every(s => s === 'cur'), '右栏卡片标记 data-side=cur（学了的）', o.curN + ' 张');
  ck(o.curDisabled === 0, '右栏卡片不再被禁用（原来 disabled 导致换不了招）', '禁用 ' + o.curDisabled + ' 张');
  ck(String(o.poolHead).indexOf('没学的') >= 0, '左栏文案是「没学的」', o.poolHead);
  ck(String(o.curHead).indexOf('学了的') >= 0, '右栏文案是「学了的」', String(o.curHead).slice(0, 40));
}

console.log('\n【2】拖动落点三种玩法');
const r2 = await ev(`(function(){
  try{
    var p=S.party[0]; var out={};
    out.before=p.moves.slice();
    /* 找个左边有、右边没有的技能 */
    var poolIds=[]; Array.prototype.forEach.call(document.querySelectorAll('#learn-pool .learn-card'),function(x){ poolIds.push(x.getAttribute('data-skill')); });
    var newId=poolIds.filter(function(id){ return p.moves.indexOf(id)<0; })[0];
    out.newId=newId; out.newName=newId?MOVES[newId].name:null;
    /* ① 池 → 槽：换上第 1 个槽 */
    if(newId){ applySkillDrop(learnDlg,'pool',newId,'cur',p.moves[0]); }
    out.afterSwap=p.moves.slice();
    out.swappedIn = newId ? (p.moves.indexOf(newId)>=0) : false;
    /* ② 槽 → 槽：互换前两个 */
    var a0=p.moves[0], a1=p.moves[1];
    applySkillDrop(learnDlg,'cur',a0,'cur',a1);
    out.afterExchange=p.moves.slice();
    out.exchanged = (p.moves[0]===a1 && p.moves[1]===a0);
    /* ③ 槽 → 池：卸下（应被拒绝，因为会只剩 3 个？不，4→3 允许） */
    var beforeLen=p.moves.length;
    applySkillDrop(learnDlg,'cur',p.moves[p.moves.length-1],'pool',null);
    out.afterDrop=p.moves.slice();
    out.dropped = (p.moves.length === beforeLen-1);
    /* ④ 只留 1 个时不许再卸 */
    while(p.moves.length>1){ p.moves.pop(); }
    syncPP(p);
    var oneLen=p.moves.length;
    applySkillDrop(learnDlg,'cur',p.moves[0],'pool',null);
    out.lastGuard = (p.moves.length===oneLen);
    return JSON.stringify(out);
  }catch(e){ return 'ERR '+e.message; }
})()`);
if (r2 && r2.__err) ck(false, '拖动结算', r2.__err);
else {
  const o = JSON.parse(r2);
  if (o.newId) {
    ck(o.swappedIn === true, '① 池→槽：拖过去就换上', o.newName + ' → ' + JSON.stringify(o.afterSwap));
  } else ck(false, '① 池→槽', '左边没有可换的新技能');
  ck(o.exchanged === true, '② 槽→槽：两个技能互换位置', JSON.stringify(o.afterExchange));
  ck(o.dropped === true, '③ 槽→池：拖回左边即卸下', JSON.stringify(o.afterDrop));
  ck(o.lastGuard === true, '④ 只剩 1 个技能时不许再卸', '');
}
console.log('\n== 控制台异常: ' + errs.length + ' 条 ==');
if (errs.length) console.log('  ' + errs.slice(0, 3).join('\n  '));
console.log('\n═══ 验收：通过 ' + pass + ' / ' + (pass + fail) + ' ═══');
if (fails.length) console.log('失败项:\n  - ' + fails.join('\n  - '));
ws.close();
process.exit(fail ? 1 : 0);
