/* v17 战斗实测：进世界 → 反复移动触发遇敌 → 验证 4 技能战斗 → 检查伤害/PP/日志/头像 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { WebSocket } from 'ws';
const URL_ = process.argv[2] || 'http://127.0.0.1:8727/';
const PORT = process.argv[3] || '9335';
const SHOT = process.argv[4] || 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/shots-v17';
mkdirSync(SHOT, { recursive: true });
let seq = 0;
const created = await (await fetch('http://127.0.0.1:' + PORT + '/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(created.webSocketDebuggerUrl);
const pending = new Map(); const errors = [];
ws.on('message', d => {
  const m = JSON.parse(String(d));
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); return; }
  if (m.method === 'Runtime.exceptionThrown') errors.push('EXC: ' + String(m.params.exceptionDetails?.exception?.description || '').slice(0, 150));
});
await new Promise((r, j) => { ws.on('open', r); ws.on('error', j); });
const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async (expr) => {
  const rr = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (rr.exceptionDetails) return { __err: String(rr.exceptionDetails.exception?.description || '').slice(0, 200) };
  return rr.result?.value;
};
const wait = ms => new Promise(r => setTimeout(r, ms));
const shot = async (n) => { try { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(SHOT + '/' + n + '.png', Buffer.from(r.data, 'base64')); } catch (e) { } };
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: 480, height: 940, deviceScaleFactor: 2, mobile: true });
await send('Page.navigate', { url: URL_ + '?t=' + Date.now() });
await wait(8000);
await ev(`(function(){ try{ localStorage.clear(); }catch(e){} return 1; })()`);
await send('Page.navigate', { url: URL_ + '?t=' + Date.now() });
await wait(8000);
await ev(`document.getElementById('btn-start').click()`);
await wait(2500);
await ev(`(function(){ var c=document.querySelector('#starter-grid .st-card'); if(c) c.click(); return !!c; })()`);
await wait(2800);

console.log('=== 我方状态 ===');
console.log(JSON.stringify(await ev(`(function(){
  var p = selfPet();
  return { name: byId(p.sp).name, lv: p.lv, hp: p.hp+'/'+maxHpOf(p),
           moves: movesOf(p).map(function(id){ return MOVES[id]? (MOVES[id].name+'('+(MOVES[id].power||'变化')+')') : ('❌缺失:'+id); }),
           slotCount: movesOf(p).length,
           pos: S.pos, region: REGION_NAME[regionAt(S.pos.x,S.pos.y)] };
})()`), null, 1));

/* 找最近的草丛格并直接移动过去（平地走） */
const walk = await ev(`(function(){
  var out={steps:0, encounters:0, mapSize: map.length, tallTiles:0};
  /* 统计周围草丛 */
  for(var y=0;y<MH;y++) for(var x=0;x<MW;x++) if(map[y*MW+x]===T.TALL) out.tallTiles++;
  return out;
})()`);
console.log('\n地图：' + JSON.stringify(walk));

/* 反复移动触发遇敌弹窗 */
let enc = null;
for (let i = 0; i < 200 && !enc; i++) {
  const dir = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'][i % 4];
  await ev(`(function(){ var d=${JSON.stringify(dir)}; try{ move(d); }catch(e){} return true; })()`);
  await wait(90);
  const s = await ev(`(function(){
    var ep=document.getElementById('enc-panel');
    if(ep && !ep.classList.contains('hidden')) return 'encounter';
    if(document.getElementById('screen-battle') && !document.getElementById('screen-battle').classList.contains('hidden')) return 'battle';
    return null;
  })()`);
  if (s) enc = { i, s };
}
console.log('\n遇敌触发：' + (enc ? ('第 ' + enc.i + ' 步 → ' + enc.s) : '❌ 200 步内没触发'));
if (!enc) { console.log('错误：' + errors.length); ws.close(); process.exit(1); }
await shot('v17-06-encounter');

if (enc.s === 'encounter') {
  await ev(`(function(){ var b=document.getElementById('enc-fight'); if(b) b.click(); return !!b; })()`);
  await wait(2200);
}
console.log('\n=== 战斗界面 ===');
const bt = await ev(`(function(){
  var row=document.getElementById('move-row');
  var btns=row?[...row.querySelectorAll('button')]:[];
  var foe=document.getElementById('enemy-sprite');
  var self=document.getElementById('self-sprite');
  return {
    battleShown: !document.getElementById('screen-battle').classList.contains('hidden'),
    moveButtons: btns.length,
    moveLabels: btns.map(function(b){ return b.textContent.replace(/\\s+/g,' ').trim().slice(0,42); }),
    foeName: (document.getElementById('enemy-name')||{}).textContent,
    foeAvatar: foe? foe.querySelectorAll('img.pet-avatar').length : 0,
    selfAvatar: self? self.querySelectorAll('img.pet-avatar').length : 0,
    log: (document.getElementById('battle-log')||{}).textContent ? document.getElementById('battle-log').textContent.slice(-120) : ''
  };
})()`);
console.log(JSON.stringify(bt, null, 1));
await shot('v17-07-battle');

/* 点第一个可用技能，打几个回合看伤害与 PP */
const fight = await ev(`(async function(){
  var out={ turns:0, logLines:[] };
  for(var t=0;t<6;t++){
    var row=document.getElementById('move-row');
    var btn=row?[...row.querySelectorAll('button')].find(function(b){return !b.disabled;}):null;
    if(!btn) break;
    btn.click();
    out.turns++;
    await new Promise(function(r){ setTimeout(r, 2600); });
    var st=document.getElementById('screen-battle');
    if(!st || st.classList.contains('hidden')) { out.ended=true; break; }
    var logEl=document.getElementById('battle-log');
    if(logEl) out.logLines.push(logEl.textContent.slice(-90).replace(/\\s+/g,' '));
  }
  var lf=document.getElementById('battle-log');
  out.finalLog = lf? lf.textContent.slice(-200).replace(/\\s+/g,' ') : '';
  out.pp = selfPet()? selfPet().pp : null;
  return out;
})()`);
console.log('\n=== 战斗过程 ===');
console.log(JSON.stringify(fight, null, 1));
await shot('v17-08-battle-after');
console.log('\n=== 异常 ' + errors.length + ' 条 ===');
errors.slice(0, 5).forEach(e => console.log('  ❌ ' + e));
if (!errors.length) console.log('  ✅ 零异常');
ws.close();
