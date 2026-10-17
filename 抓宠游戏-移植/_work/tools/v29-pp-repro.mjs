/* v29 复现：刚学会一招之后，PP 在哪显示成 undefined */
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

console.log('进入世界: ' + await ev(`(function(){try{localStorage.removeItem(SAVE_KEY);S=freshSave();var p=newPet('pk-001');p.lv=20;p.hp=maxHpOf(p);ensureMoves(p);S.party=[p];S.lead=p.uid;S.pos={x:SPAWN.x,y:SPAWN.y};enterWorld();return 'ok';}catch(e){return 'ERR '+e.message;}})()`));

console.log('\n== 1. 学招前的状态 ==');
console.log(await ev(`(function(){
  var p=S.party[0];
  return JSON.stringify({lv:p.lv, moves:p.moves, pp:p.pp, ppSp:p.ppSp, learned:p.learned, pend:pendLearn.length, nodes:pendingLearnNodes(p)});
})()`));

console.log('\n== 2. 强制触发学习弹窗并学一招 ==');
console.log(await ev(`(function(){
  try{
    var p=S.party[0];
    var nodes=pendingLearnNodes(p);
    if(!nodes.length) return '没有待学节点';
    var node=nodes[0];
    openLearnDialog(p,node,'learn');
    var dlg=$('panel-learn');
    var txt=dlg?dlg.textContent.replace(/\\s+/g,' ').trim().slice(0,260):'（无 panel-learn）';
    var cands=poolCandidates(p,poolKeyOfNode(node));
    var before=p.moves.slice();
    var pick=cands.filter(function(id){return p.moves.indexOf(id)<0;})[0];
    if(!pick) return JSON.stringify({note:'无新候选',txt:txt,cands:cands});
    doLearn(p,node,pick,null);
    return JSON.stringify({txtBefore:txt, picked:pick, pickedName:MOVES[pick].name, pickedPP:MOVES[pick].pp,
      movesAfter:p.moves, ppAfter:p.pp, ppSpAfter:p.ppSp,
      missingInPP:p.moves.filter(function(id){return p.pp[id]===undefined;})});
  }catch(e){ return 'ERR '+e.message; }
})()`));

console.log('\n== 3. 学招后各处 PP 显示 ==');
console.log(await ev(`(function(){
  var p=S.party[0], out=[];
  /* 学习弹窗的候选副标题（line 1440 那条） */
  out.push('pet.moves=' + JSON.stringify(p.moves));
  out.push('pet.pp=' + JSON.stringify(p.pp));
  p.moves.forEach(function(id){ out.push('  ' + (MOVES[id]?MOVES[id].name:'?') + ' pp字段=' + (MOVES[id]?MOVES[id].pp:'?') + ' 存档PP=' + p.pp[id]); });
  return out.join('\\n');
})()`));

console.log('\n== 4. 进战斗看技能按钮文本 ==');
console.log(await ev(`(function(){
  try{
    var p=S.party[0];
    S.pos={x:SPAWN.x,y:SPAWN.y};
    var e=rollEnemy();
    openBattle('wild',{sp:e.sp,fighter:initFighter(e.sp,e.lv,e.trait)});
    var rows=document.querySelectorAll('#move-row .move-btn');
    var out=[];
    Array.prototype.forEach.call(rows,function(b){ out.push('按钮: ' + b.textContent.replace(/\\s+/g,' ').trim()); });
    out.push('B.sPP=' + JSON.stringify(B.sPP));
    out.push('B.sPP 缺失键=' + JSON.stringify(p.moves.filter(function(id){return B.sPP[id]===undefined;})));
    closeBattle&&closeBattle();
    return out.join('\\n');
  }catch(e){ return 'ERR '+e.message; }
})()`));

console.log('\n== 5. 技能编辑器（队伍面板「调整技能」）文本 ==');
console.log(await ev(`(function(){
  try{
    if($('screen-battle') && !$('screen-battle').classList.contains('hidden')) closeBattle();
    var p=S.party[0];
    openSkillEditor(p);
    var panel=$('panel-skill')||document.querySelector('#panel-skill');
    var txt=panel?panel.textContent.replace(/\\s+/g,' ').trim().slice(0,320):'（找不到技能编辑器面板）';
    var all=document.querySelectorAll('[id*=skill],[id*=learn]');
    var ids=[]; Array.prototype.forEach.call(all,function(n){ ids.push(n.id); });
    return JSON.stringify({panelText:txt, relatedIds:ids});
  }catch(e){ return 'ERR '+e.message; }
})()`));
console.log('\n控制台异常: ' + errs.length + ' 条' + (errs.length ? '\n  ' + errs.slice(0, 4).join('\n  ') : ''));
ws.close();
