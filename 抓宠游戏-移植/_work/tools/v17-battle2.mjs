/* v17 战斗实测 v2：直接把玩家放到草丛里触发遇敌（避开寻路问题） */
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
  if (m.method === 'Runtime.exceptionThrown') errors.push('EXC: ' + String(m.params.exceptionDetails?.exception?.description || '').slice(0, 160));
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
/* 选草系伙伴 */
await ev(`(function(){ var c=document.querySelector('#starter-grid .st-card'); if(c) c.click(); return !!c; })()`);
await wait(2800);

console.log('=== 我方 ===');
console.log(JSON.stringify(await ev(`(function(){
  var p=selfPet();
  return { name:byId(p.sp).name, lv:p.lv, hp:p.hp+'/'+maxHpOf(p), slotCount:movesOf(p).length,
    moves:movesOf(p).map(function(id){ var m=MOVES[id]; return m? m.name+'('+(m.power||'变化')+'/'+m.type+')' : '❌'+id; }),
    region:REGION_NAME[regionAt(S.pos.x,S.pos.y)] };
})()`), null, 1));

/* 找草丛格，把玩家瞬移过去，然后触发遇敌 */
const move = await ev(`(function(){
  var target=null, best=9999;
  for(var y=0;y<MH;y++) for(var x=0;x<MW;x++){
    if(map[y*MW+x]===T.TALL){ var d=Math.abs(x-S.pos.x)+Math.abs(y-S.pos.y); if(d<best){best=d;target={x:x,y:y};} }
  }
  if(!target) return 'no tall tile';
  S.pos=target; draw();
  return { moved:{x:target.x,y:target.y}, dist:best, region:REGION_NAME[regionAt(target.x,target.y)] };
})()`);
console.log('\n挪到最近草丛：' + JSON.stringify(move));
/* 在草丛上反复走（move 收的是 dx,dy 数值偏移）+ 调用遇敌判定 */
let enc = null;
for (let i = 0; i < 80 && !enc; i++) {
  const DIRS = [[0, -1], [0, 1], [-1, 0], [1, 0]];
  const d = DIRS[i % 4];
  await ev(`(function(){
    try{ move(${d[0]}, ${d[1]}); }catch(e){}
    return true;
  })()`);
  await wait(110);
  const s = await ev(`(function(){
    var ep=document.getElementById('enc-panel');
    if(ep && !ep.classList.contains('hidden')) return 'encounter';
    var bp=document.getElementById('screen-battle');
    if(bp && !bp.classList.contains('hidden')) return 'battle';
    return null;
  })()`);
  if (s) enc = { i, s };
}
console.log('\n遇敌：' + (enc ? ('第 ' + enc.i + ' 次 → ' + enc.s) : '❌ 未触发'));
if (!enc) {
  console.log('兜底：直接调 startWildBattle（契约是 startWildBattle({sp,lv})）');
  const r = await ev(`(function(){
    try{
      var sp = SPECIES.filter(function(s){ return !s.varOf && s.rarity===0; })[Math.floor(Math.random()*50)];
      startWildBattle({ sp: sp.id, lv: 3 });
      return { ok:true, foe: sp.name };
    }catch(e){ return {err:String(e.message).slice(0,180)}; }
  })()`);
  console.log('  ' + JSON.stringify(r));
  await wait(2500);
  enc = { i: -1, s: 'battle' };
}
await shot('v17-06-encounter');
if (enc.s === 'encounter') { await ev(`(function(){ var b=document.getElementById('enc-fight'); if(b) b.click(); return 1; })()`); await wait(2500); }

console.log('\n=== 战斗界面 ===');
console.log(JSON.stringify(await ev(`(function(){
  var row=document.getElementById('move-row');
  var btns=row?[...row.querySelectorAll('button')]:[];
  return {
    battleShown: !document.getElementById('screen-battle').classList.contains('hidden'),
    moveButtons: btns.length,
    moves: btns.map(function(b){ return b.textContent.replace(/\\s+/g,' ').trim().slice(0,46); }),
    foe: (document.getElementById('enemy-name')||{}).textContent,
    foeAvatar: (document.getElementById('enemy-sprite')||{querySelectorAll:function(){return[]}}).querySelectorAll('img.pet-avatar').length,
    selfAvatar: (document.getElementById('self-sprite')||{querySelectorAll:function(){return[]}}).querySelectorAll('img.pet-avatar').length
  };
})()`), null, 1));
await shot('v17-07-battle');
/* 打 6 回合 */
const fight = await ev(`(async function(){
  var out={turns:0, dmg:[], ppStart:JSON.stringify(selfPet().pp||{})};
  for(var t=0;t<6;t++){
    var row=document.getElementById('move-row');
    var btn=row?[...row.querySelectorAll('button')].find(function(b){return !b.disabled;}):null;
    if(!btn){ out.noBtn=true; break; }
    var label=btn.textContent.replace(/\\s+/g,' ').trim().slice(0,30);
    var hpBefore=(function(){ var e=document.getElementById('enemy-hp-text'); return e?e.textContent:''; })();
    btn.click(); out.turns++;
    await new Promise(function(r){ setTimeout(r,2600); });
    var hpAfter=(function(){ var e=document.getElementById('enemy-hp-text'); return e?e.textContent:''; })();
    out.dmg.push(label+' | '+hpBefore+' → '+hpAfter);
    var st=document.getElementById('screen-battle');
    if(!st || st.classList.contains('hidden')){ out.ended=true; break; }
  }
  var lf=document.getElementById('battle-log');
  out.finalLog = lf? lf.textContent.slice(-160).replace(/\\s+/g,' ') : '';
  out.ppEnd = JSON.stringify(selfPet().pp||{});
  return out;
})()`);
console.log('\n=== 战斗过程 ===');
console.log(JSON.stringify(fight, null, 1));
await shot('v17-08-battle-after');
console.log('\n异常 ' + errors.length + ' 条'); errors.slice(0, 5).forEach(e => console.log('  ❌ ' + e));
if (!errors.length) console.log('  ✅ 零异常');
ws.close();
