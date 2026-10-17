/* v29 复现 2：走真实点击流程学招，并检查所有 PP 显示点 */
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
  if (m.method === 'Runtime.exceptionThrown') errs.push(String(m.params?.exceptionDetails?.exception?.description || '').slice(0, 200));
});
await new Promise((r, j) => { ws.on('open', r); ws.on('error', j); });
const send = (mm, p = {}) => new Promise((res, rej) => { const id = ++seq; pend.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method: mm, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) return { __err: String(r.exceptionDetails.exception?.description || '').slice(0, 500) }; return r.result?.value; };
const wait = ms => new Promise(r => setTimeout(r, ms));
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Page.navigate', { url: URL_BASE + '?t=' + Date.now() });
for (let i = 0; i < 120; i++) { await wait(250); if (await ev("(typeof MW!=='undefined'&&typeof map!=='undefined'&&map&&map.length)") === true) break; }
await ev(`(function(){localStorage.removeItem(SAVE_KEY);S=freshSave();var p=newPet('pk-001');p.lv=20;p.hp=maxHpOf(p);ensureMoves(p);S.party=[p];S.lead=p.uid;S.pos={x:SPAWN.x,y:SPAWN.y};enterWorld();})()`);

console.log('== 真实点击流程：打开学习弹窗 → 点候选 → 点当前技能 → 确认 ==');
console.log(await ev(`(function(){
  try{
    var p=S.party[0];
    var node=pendingLearnNodes(p)[0];
    openLearnDialog(p,node,'learn');
    /* 1. 点左侧候选（第一个未拥有的） */
    var pool=$('learn-pool').querySelectorAll('.learn-chip');
    var candClicked=null;
    for(var i=0;i<pool.length;i++){ if(pool[i].querySelector('.lc-badge')) continue; pool[i].click(); candClicked=pool[i].textContent.replace(/\\s+/g,' ').trim(); break; }
    /* 2. 点右侧当前技能（第一个） */
    var cur=$('learn-cur').querySelectorAll('.learn-chip');
    var curClicked=null;
    if(cur.length){ curClicked=cur[0].textContent.replace(/\\s+/g,' ').trim(); cur[0].click(); }
    /* 3. 看替换后的状态 */
    var after={moves:p.moves, pp:p.pp, ppSp:p.ppSp};
    var missing=p.moves.filter(function(id){return p.pp[id]===undefined;});
    return JSON.stringify({candClicked:candClicked, curClicked:curClicked, after:after, ppMissing:missing,
      learned:(p.learned||[])});
  }catch(e){ return 'ERR '+e.message; }
})()`));

console.log('\n== 学招后 UI 各处文本 ==');
console.log(await ev(`(function(){
  var p=S.party[0], out=[];
  out.push('pet.moves = ' + JSON.stringify(p.moves));
  p.moves.forEach(function(id){ out.push('   ' + (MOVES[id]?MOVES[id].name:'?') + ' · 招表pp=' + (MOVES[id]?MOVES[id].pp:'?') + ' · 存档pp=' + JSON.stringify(p.pp[id])); });
  /* 学习弹窗若还开着，抄下它的文本 */
  var dlg=$('panel-learn');
  if(dlg && !dlg.classList.contains('hidden')) out.push('弹窗文本: ' + dlg.textContent.replace(/\\s+/g,' ').trim().slice(0,300));
  return out.join('\\n');
})()`));

console.log('\n== 关闭弹窗，进战斗看技能按钮 ==');
console.log(await ev(`(function(){
  try{
    closeLearnDialog();
    var p=S.party[0];
    var e=rollEnemy();
    openBattle('wild',{sp:e.sp,fighter:initFighter(e.sp,e.lv,e.trait)});
    var rows=document.querySelectorAll('#move-row .move-btn');
    var out=[];
    Array.prototype.forEach.call(rows,function(b){ out.push('  ' + b.textContent.replace(/\\s+/g,' ').trim()); });
    out.push('  B.sPP = ' + JSON.stringify(B.sPP));
    out.push('  B.sPP 缺失 = ' + JSON.stringify(p.moves.filter(function(id){return B.sPP[id]===undefined;})));
    closeBattle();
    return out.join('\\n');
  }catch(e){ return 'ERR '+e.message; }
})()`));

console.log('\n== 🔧 调整技能编辑器 ==');
console.log(await ev(`(function(){
  try{
    if($('screen-battle') && !$('screen-battle').classList.contains('hidden')) closeBattle();
    var p=S.party[0];
    openSkillEditor(p);
    var dlg=$('panel-learn');
    var txt=dlg?dlg.textContent.replace(/\\s+/g,' ').trim():'（无）';
    return JSON.stringify({open: dlg? !dlg.classList.contains('hidden') : null, text: txt.slice(0,340)});
  }catch(e){ return 'ERR '+e.message; }
})()`));
console.log('\n== 队伍面板查看 ==');
console.log(await ev(`(function(){
  try{ closeLearnDialog(); var p=S.party[0]; openParty(); var t=$('panel-party').textContent.replace(/\\s+/g,' ').trim(); return t.slice(0,260); }catch(e){ return 'ERR '+e.message; }
})()`));
console.log('\n控制台异常: ' + errs.length + ' 条' + (errs.length ? '\n  ' + errs.slice(0, 4).join('\n  ') : ''));
ws.close();
