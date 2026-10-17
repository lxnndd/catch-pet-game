/* 快速诊断：战斗界面打开后，双方的名字/立绘到底渲染成什么
   （用户报「对战有时候显示双方宠物是一个问号」） */
import { WebSocket } from 'ws';
const URL_BASE = process.argv[2] || 'http://127.0.0.1:8727/';
const CDP_PORT = process.argv[3] || '9335';
let seq = 0;
const c = await (await fetch('http://127.0.0.1:' + CDP_PORT + '/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(c.webSocketDebuggerUrl);
const pend = new Map(); const netErrs = [];
ws.on('message', d => {
  const m = JSON.parse(String(d));
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); return; }
  if (m.method === 'Network.loadingFailed') netErrs.push(String(m.params?.errorText || '') + ' ' + String(m.params?.type || ''));
});
await new Promise((r, j) => { ws.on('open', r); ws.on('error', j); });
const send = (mm, p = {}) => new Promise((res, rej) => { const id = ++seq; pend.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method: mm, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) return { __err: String(r.exceptionDetails.exception?.description || '').slice(0, 400) }; return r.result?.value; };
const wait = ms => new Promise(r => setTimeout(r, ms));
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Page.navigate', { url: URL_BASE + '?t=' + Date.now() });
for (let i = 0; i < 200; i++) { await wait(250); if (await ev("(typeof TOWNS!=='undefined'&&TOWNS.length&&typeof map!=='undefined'&&map&&map.length)") === true) break; }
console.log('进入世界: ' + await ev(`(function(){try{localStorage.removeItem(SAVE_KEY);S=freshSave();var p=newPet('pk-001');p.lv=30;p.hp=maxHpOf(p);ensureMoves(p);S.party=[p];S.lead=p.uid;S.pos={x:SPAWN.x,y:SPAWN.y};enterWorld();return 'ok';}catch(e){return 'ERR '+e.message;}})()`));

/* 先把两个名字改成哨兵值，再开战斗，就能看出哪些路径没赋值 */
const probe = `(function(){
  var out={};
  var dump=function(tag){
    var en=$('enemy-name'), sn=$('self-name');
    var es=$('enemy-sprite'), ss=$('self-sprite');
    var eimg=es?es.querySelector('img'):null, simg=ss?ss.querySelector('img'):null;
    return tag+': enemy-name="'+en.textContent+'" self-name="'+sn.textContent+'"'+
      ' | enemy-sprite="'+(eimg?('[img '+(eimg.complete?('ok '+eimg.naturalWidth+'px'):'loading')+']'):es.textContent)+'"'+
      ' | self-sprite="'+(simg?('[img '+(simg.complete?('ok '+simg.naturalWidth+'px'):'loading')+']'):ss.textContent)+'"';
  };
  var lines=[];
  /* 1) 野生战 */
  var e=rollEnemy();
  openBattle('wild',{sp:e.sp, fighter:initFighter(e.sp, e.lv, e.trait)});
  lines.push(dump('野生战(立刻)'));
  closeBattle();
  /* 2) 用哨兵值测：先污染 DOM，再开一场新战斗 */
  $('enemy-name').textContent='SENTINEL-E'; $('self-name').textContent='SENTINEL-S';
  $('enemy-sprite').textContent='SENTINEL-E'; $('self-sprite').textContent='SENTINEL-S';
  var e2=rollEnemy();
  openBattle('wild',{sp:e2.sp, fighter:initFighter(e2.sp, e2.lv, e2.trait)});
  lines.push(dump('野生战(污染后)'));
  closeBattle();
  /* 3) 切磋 */
  var p=S.party[0];
  S.party.push(newPet('pk-004'));
  S.party[1].lv=20; S.party[1].hp=maxHpOf(S.party[1]);
  $('enemy-name').textContent='SENTINEL-E'; $('self-name').textContent='SENTINEL-S';
  $('enemy-sprite').textContent='SENTINEL-E'; $('self-sprite').textContent='SENTINEL-S';
  startSpar(S.party[0], S.party[1]);
  lines.push(dump('切磋(污染后)'));
  closeBattle();
  /* 4) 道馆战 */
  var t=null; TOWNS.forEach(function(q){ if(q.region==='plain') t=q; });
  $('enemy-name').textContent='SENTINEL-E'; $('self-name').textContent='SENTINEL-S';
  $('enemy-sprite').textContent='SENTINEL-E'; $('self-sprite').textContent='SENTINEL-S';
  beginGymBattle(t);
  lines.push(dump('道馆战(污染后)'));
  /* 5) 道馆战换人（打死第一只之后） */
  if(TB && TB.team.length>1){ nextTrainerFoe(); lines.push(dump('道馆换第二只')); }
  if(B) closeBattle();
  out.lines=lines;
  out.spriteEmoji = byId('pk-001').emoji;
  return JSON.stringify(out);
}`;
const r = await ev(probe);
if (r && r.__err) console.log('ERR ' + r.__err);
else {
  const o = JSON.parse(r);
  console.log('\n== 战斗界面渲染实测（SENTINEL = 没被赋值）==');
  o.lines.forEach(l => console.log('  ' + l));
  console.log('\n  物种表的 emoji 字段示例: ' + JSON.stringify(o.spriteEmoji) + '  ← 缺图时就会显示这个');
}
/* 再看头像资源有没有加载失败 */
await wait(1500);
const fails = await ev(`(function(){
  var bad=[];
  document.querySelectorAll('.pet-avatar').forEach(function(im){
    if(im.complete && im.naturalWidth===0) bad.push(im.getAttribute('src'));
  });
  return JSON.stringify(bad.slice(0,10));
})()`);
console.log('\n  已渲染头像中加载失败的: ' + fails);
console.log('  网络失败事件: ' + (netErrs.length ? netErrs.slice(0, 5).join(' | ') : '无'));
ws.close();
