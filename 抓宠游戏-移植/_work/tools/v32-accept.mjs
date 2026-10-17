/* v32 本地验收：①图鉴详情含栖息地 ②遇到过即解锁 ③变化技有效果 ④战斗日志可翻历史 */
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
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) return { __err: String(r.exceptionDetails.exception?.description || '').slice(0, 300) }; return r.result?.value; };
const wait = ms => new Promise(r => setTimeout(r, ms));
const ck = (ok, name, extra) => { if (ok) { pass++; console.log('  ✅ ' + name + (extra ? '  →  ' + extra : '')); } else { fail++; fails.push(name); console.log('  ❌ ' + name + (extra ? '  →  ' + extra : '')); } };
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Page.navigate', { url: URL_BASE + '?t=' + Date.now() });
let ready = false;
for (let i = 0; i < 200; i++) { await wait(250); if (await ev("(typeof TOWNS!=='undefined'&&TOWNS.length&&typeof openDexDetail==='function'&&typeof fxOf==='function')") === true) { ready = true; break; } }
if (!ready) { console.log('❌ 页面未就绪（openDexDetail/fxOf 未定义）: ' + URL_BASE); ws.close(); process.exit(1); }
console.log('本地页面就绪: ' + URL_BASE + '\n');
await ev(`(function(){localStorage.removeItem(SAVE_KEY);S=freshSave();var p=newPet('pk-006');p.lv=60;p.hp=maxHpOf(p);ensureMoves(p);S.party=[p];S.lead=p.uid;S.pos={x:SPAWN.x,y:SPAWN.y};enterWorld();return 'ok';})()`);

console.log('【1】图鉴详情（含栖息地）');
const r1 = await ev(`(function(){
  try{
    S.discovered['pk-006']=1;
    openDexDetail(byId('pk-006'));
    var t=$('petinfo-body').textContent.replace(/\\s+/g,' ');
    return JSON.stringify({open:!$('panel-petinfo').classList.contains('hidden'),
      hasHab:t.indexOf('栖息地')>=0, hasLvRange:t.indexOf('可刷等级')>=0,
      head:t.slice(0,190)});
  }catch(e){ return 'ERR '+e.message; }
})()`);
{ const o = JSON.parse(r1);
  ck(o.open === true, '点击图鉴卡片能打开详情面板', '');
  ck(o.hasHab === true, '详情里有「📍 栖息地」', o.head.slice(0, 70));
  ck(o.hasLvRange === true, '详情里有「🎯 可刷等级」（哪个地区几级能刷）', o.head.slice(70, 150));
}

console.log('\n【2】图鉴：遇到过就解锁（不需要捕获）');
const r2 = await ev(`(function(){
  try{
    S.discovered={};
    var before=Object.keys(S.discovered).length;
    for(var i=0;i<30;i++) rollEnemy();
    var after=Object.keys(S.discovered).length;
    return JSON.stringify({before:before, after:after});
  }catch(e){ return 'ERR '+e.message; }
})()`);
{ const o = JSON.parse(r2);
  ck(o.after > 0, '野外遇到就进图鉴', '遇到 30 次 → 解锁 ' + o.after + ' 只（原来 ' + o.before + '）');
}

console.log('\n【3】变化技真的有效果了');
const r3a = await ev(`(function(){
  try{
    var mid=null;
    Object.keys(MOVES).forEach(function(k){ if(MOVES[k].name==='剑舞') mid=k; });
    if(!mid) return JSON.stringify({err:'招表里没有「剑舞」'});
    var p=S.party[0];
    p.moves[0]=mid; syncPP(p);
    var esp=byId('pk-004');
    var foe=initFighter(esp, 30, null, ''); foe.hp=maxHpOf(foe);
    openBattle('wild',{sp:esp, fighter:foe});
    B.ehp=foe.hp; B.emax=maxHpOf(foe); B.foe.hp=B.ehp; B.sPP=p.pp;
    var before=p.st?p.st.atk:0;
    useMove(mid);
    window.__v32={mid:mid, before:before, name:p.moves[0]};
    return JSON.stringify({mv:MOVES[mid].name, beforeAtk:before, fx:JSON.stringify(fxOf(MOVES[mid]))});
  }catch(e){ return 'ERR '+e.message; }
})()`);
if (r3a && r3a.__err) ck(false, '变化技测试', r3a.__err);
else {
  const o = JSON.parse(r3a);
  if (o.err) ck(false, '剑舞存在', o.err);
  else {
    await wait(900);
    const r3b = await ev(`(function(){ try{ var p=S.party[0]; var v={atk:p.st?p.st.atk:0, log:($('battle-log')?$('battle-log').textContent.replace(/\\s+/g,' '):'')}; if(B)closeBattle(); return JSON.stringify(v); }catch(e){ return 'ERR '+e.message; } })()`);
    const b = JSON.parse(r3b);
    ck(o.fx !== 'null', '剑舞有配置效果（v32 前是 undefined）', o.fx);
    ck(b.atk > o.beforeAtk, '用完攻击能力真的提升了', 'atk ' + o.beforeAtk + ' → ' + b.atk);
    ck(String(b.log).indexOf('剑舞') >= 0, '战斗日志里能看到这招的记录', String(b.log).slice(-90));
  }
}

console.log('\n【4】战斗日志能翻历史');
const r4 = await ev(`(function(){
  try{
    if(B) closeBattle();     /* v41 补：先确保上一场战斗结束，否则 openBattle 会直接 return、日志不会被清空 */
    clearBattleLog();
    var esp=byId('pk-004');
    var foe=initFighter(esp, 30, null, ''); foe.hp=maxHpOf(foe);
    openBattle('wild',{sp:esp, fighter:foe});
    B.ehp=foe.hp; B.emax=maxHpOf(foe); B.foe.hp=B.ehp;
    for(var i=0;i<6;i++) log('第'+(i+1)+'条测试记录');
    var lines=document.querySelectorAll('#battle-log .blog-line');
    var el=$('battle-log');
    var scrollable=(el.scrollHeight>el.clientHeight) || getComputedStyle(el).overflowY==='auto';
    var all=[]; lines.forEach(function(d){ all.push(d.textContent); });
    var v={lines:lines.length, first:lines.length?lines[0].textContent:'', last:lines.length?lines[lines.length-1].textContent:'', scrollable:scrollable, all:all,
           i1:all.indexOf('第1条测试记录'), i6:all.indexOf('第6条测试记录')};
    if(B) closeBattle();
    return JSON.stringify(v);
  }catch(e){ return 'ERR '+e.message; }
})()`);
{ const o = JSON.parse(r4);
  ck(o.lines >= 6, '日志累积保留（不是只显示最新一条）', o.lines + ' 行');
  ck(o.i1 >= 0 && o.i6 > o.i1, '能翻到最早的记录（第1条在列表中，且早于第6条）',
     '第1条@' + o.i1 + ' 第6条@' + o.i6 + ' · 首行是开场白: ' + String(o.first).slice(0, 22));
  ck(o.scrollable === true, '日志区域可滚动翻看', '');
}
console.log('\n== 控制台异常: ' + errs.length + ' 条 ==');
if (errs.length) console.log('  ' + errs.slice(0, 3).join('\n  '));
console.log('\n═══ 本地验收：通过 ' + pass + ' / ' + (pass + fail) + ' ═══');
if (fails.length) console.log('失败项:\n  - ' + fails.join('\n  - '));
ws.close();
process.exit(fail ? 1 : 0);
