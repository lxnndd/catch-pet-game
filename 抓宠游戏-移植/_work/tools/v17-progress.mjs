/* v17 升级学招 / 进化 / 医院 / 存档 实测 */
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
await ev(`(function(){ var c=document.querySelector('#starter-grid .st-card'); if(c) c.click(); return 1; })()`);
await wait(2800);

/* 1) 直接给经验，升到 16 级 → 应触发 15 级学招弹窗 + 16 级进化 */
const lv = await ev(`(function(){
  var p=selfPet();
  var before={ lv:p.lv, name:byId(p.sp).name, hp:p.hp, max:maxHpOf(p), moves:movesOf(p).map(function(id){return MOVES[id].name;}) };
  /* 一次性灌够经验到 16 级 */
  for(var i=0;i<40 && p.lv<16;i++){ gainExp(p, 60); }
  return { before:before, after:{ lv:p.lv, name:byId(p.sp).name, hp:p.hp, max:maxHpOf(p), learned:(p.learned||[]), moves:movesOf(p).map(function(id){return MOVES[id].name;}) } };
})()`);
console.log('=== 升级 16 级 ===');
console.log(JSON.stringify(lv, null, 1));
await wait(1200);
const dlg = await ev(`(function(){
  var p=document.getElementById('panel-learn');
  return { shown: p?!p.classList.contains('hidden'):false, title:(document.getElementById('learn-title')||{}).textContent||'',
           cands:[...document.querySelectorAll('#learn-pool .learn-card')].map(function(b){return b.textContent.replace(/\\s+/g,' ').trim().slice(0,42);}),
           cur:[...document.querySelectorAll('#learn-cur .learn-card')].map(function(b){return b.textContent.replace(/\\s+/g,' ').trim().slice(0,26);}) };
})()`);
console.log('\n=== 学招弹窗（15 级点）===');
console.log(JSON.stringify(dlg, null, 1));
await shot('v17-09-learn');
/* 点第一个候选 → 再点要替换的旧招 */
const learn = await ev(`(async function(){
  var c=document.querySelector('#learn-pool .learn-card:not([disabled])');
  if(!c) return {err:'没有可选候选'};
  var newName=c.textContent.replace(/\\s+/g,' ').trim().slice(0,30);
  c.click();
  await new Promise(function(r){setTimeout(r,600);});
  var cur=document.querySelector('#learn-cur .learn-card:not([disabled])');
  var oldName=cur?cur.textContent.replace(/\\s+/g,' ').trim().slice(0,26):'';
  if(cur) cur.click();
  await new Promise(function(r){setTimeout(r,900);});
  var p=selfPet();
  return { picked:newName, replaced:oldName, movesNow:movesOf(p).map(function(id){return MOVES[id].name;}), learned:(p.learned||[]) };
})()`);
console.log('\n=== 执行学招 ===');
console.log(JSON.stringify(learn, null, 1));
await shot('v17-10-after-learn');
/* 关掉弹窗 */
await ev(`(function(){ var p=document.getElementById('panel-learn'); if(p) p.classList.add('hidden'); return 1; })()`);
/* 2) 治疗 + PP */
const hosp = await ev(`(function(){
  var p=selfPet();
  p.hp=1; Object.keys(p.pp).forEach(function(k){ p.pp[k]=0; });
  var before={hp:p.hp+'/'+maxHpOf(p), pp:JSON.stringify(p.pp)};
  try{ treatOne(p); }catch(e){ return {err:String(e.message).slice(0,120)}; }
  return { before:before, after:{hp:p.hp+'/'+maxHpOf(p), pp:JSON.stringify(p.pp)} };
})()`);
console.log('\n=== 医院治疗（应回满 HP + PP）===');
console.log(JSON.stringify(hosp, null, 1));
/* 3) 存档 + 读档 */
const save = await ev(`(function(){
  var p=selfPet();
  save();
  var raw=localStorage.getItem(SAVE_KEY);
  var d=JSON.parse(raw);
  var pet=d.party[0];
  return { hasSave:!!raw, version:d.v, petMoves:pet.moves? pet.moves.length : -1, learned:pet.learned||[], lv:pet.lv, sp:pet.sp };
})()`);
console.log('\n=== 存档内容 ===');
console.log(JSON.stringify(save, null, 1));
/* 4) 重载后读档（技能/等级/进化是否保留） */
await send('Page.navigate', { url: URL_ + '?t=' + Date.now() });
await wait(8000);
const reload = await ev(`(function(){
  var inp=document.getElementById('btn-start');
  if(inp) inp.click();
  return { titleShown: !document.getElementById('screen-title').classList.contains('hidden') };
})()`);
await wait(2500);
const loaded = await ev(`(function(){
  if(typeof S==='undefined'||!S||!S.party.length) return {err:'没有队伍'};
  var p=S.party[0];
  return { lv:p.lv, sp:byId(p.sp).name, moves:movesOf(p).map(function(id){return MOVES[id].name;}), learned:p.learned||[], hp:p.hp+'/'+maxHpOf(p) };
})()`);
console.log('\n=== 重载读档后 ===');
console.log(JSON.stringify(loaded, null, 1));
console.log('\n异常 ' + errors.length + ' 条'); errors.slice(0, 5).forEach(e => console.log('  ❌ ' + e));
if (!errors.length) console.log('  ✅ 零异常');
ws.close();
