/* 定点调试：复现训练师对战开战异常，打印真实错误栈 */
import { WebSocket } from 'ws';
const URL_ = process.argv[2] || 'http://127.0.0.1:8727/';
const CDP = 'http://127.0.0.1:' + (process.argv[3] ?? '9335');
const created = await (await fetch(`${CDP}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(created.webSocketDebuggerUrl);
let seq = 0; const pending = new Map(); const errors = []; const ex = [];
ws.on('message', d => {
  const m = JSON.parse(String(d));
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); }
  else if (m.method === 'Runtime.exceptionThrown') errors.push(String(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text).slice(0, 500));
  else if (m.method === 'Runtime.consoleAPICalled') ex.push(m.params.type + ': ' + m.params.args.map(a => a.value ?? a.description ?? '').join(' ').slice(0, 300));
});
await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async (expr, awaitPromise = false) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise });
  if (r.exceptionDetails) return 'JS_ERROR: ' + JSON.stringify(r.exceptionDetails.exception?.description || r.exceptionDetails.text).slice(0, 400);
  return r.result?.value;
};
const wait = ms => new Promise(r => setTimeout(r, ms));

await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: 900, height: 760, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: URL_ + '?t=' + Date.now() });
await wait(4000);
console.log('清空存档并重载…');
await ev('localStorage.clear()');
await send('Page.navigate', { url: URL_ });
await wait(4000);
console.log('开局：', await ev(`(()=>{document.querySelector("#btn-start").click();return "clicked";})()`));
await wait(900);
console.log('starter 可见:', await ev(`!document.getElementById("screen-starter").classList.contains("hidden")`));
await ev(`document.querySelectorAll("#starter-grid .st-card")[0].click()`);
await wait(1500);
console.log('世界可见:', await ev(`!document.getElementById("screen-world").classList.contains("hidden")`), '| party:', await ev('S.party.length'));

console.log('\n直接调用 openTrainerChallenge + acceptEncounter：');
console.log(' 挑战框:', await ev(`(()=>{openTrainerChallenge(TRAINERS[3]);return document.getElementById("enc-name").textContent+" / "+document.getElementById("enc-fight").textContent;})()`));
console.log(' 点击挑战:', await ev(`(()=>{document.getElementById("enc-fight").click();return "clicked pendEnc="+JSON.stringify(pendEnc&&Object.keys(pendEnc));})()`));
await wait(1200);
console.log(' B:', await ev('B?B.mode+" / foe="+B.esp.name:"null"'));
console.log(' 战斗屏可见:', await ev(`!document.getElementById("screen-battle").classList.contains("hidden")`));
console.log(' battle-title:', await ev(`document.getElementById("battle-title").textContent`), '| mode:', await ev(`document.getElementById("battle-mode").textContent`));
console.log(' 空指针体检:', await ev(`(()=>{const ids=["battle-title","battle-mode","battle-tip","swap-row","enemy-status","self-status","enc-panel","btn-trainer","btn-spar","panel-confirm","panel-trainer","panel-spar"];return ids.map(i=>i+":"+(document.getElementById(i)?"ok":"MISSING")).join(" ");})()`));

console.log('\n直接把 TB 建起来试试 beginTrainerBattle：');
console.log(' ', await ev(`(()=>{try{B=null;TB=null;beginTrainerBattle(TRAINERS[3]);return "ok B="+(B?B.mode:"null");}catch(e){return "THROW: "+e.message+" @ "+(e.stack||"").split("\\n")[1];}})()`));

console.log('\n=== 包裹 openBattle 打日志后重试 ===');
console.log(await ev(`(()=>{
  const orig = openBattle;
  window.openBattle = function(mode, enemy){
    window.__obLog = { mode: mode, spType: typeof enemy.sp, spVal: String(enemy.sp && enemy.sp.id || enemy.sp),
      fighterSp: enemy.fighter && enemy.fighter.sp, fighterSpType: typeof (enemy.fighter && enemy.fighter.sp),
      resolved: (function(){ try{ var r=resolveSp(enemy.sp); return r? ("OK:"+r.id) : "NULL"; }catch(e){ return "ERR:"+e.message; } })() };
    return orig.apply(this, arguments);
  };
  return "wrapped";
})()`));
console.log(' 重试:', await ev(`(()=>{try{B=null;TB=null;beginTrainerBattle(TRAINERS[3]);return "ok B="+(B?B.mode:"null");}catch(e){return "THROW: "+e.message;}})()`));
console.log(' 日志:', await ev('JSON.stringify(window.__obLog)'));

console.log('\n异常捕获：', errors.length ? errors.join('\n') : '（无）');
console.log('console:', ex.length ? ex.join(' | ') : '（无）');
process.exit(0);
