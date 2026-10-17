/* 精确复现 openBattle 报错点 */
import { WebSocket } from 'ws';
const URL_ = process.argv[2] || 'http://127.0.0.1:8727/';
const CDP = 'http://127.0.0.1:' + (process.argv[3] ?? '9335');
const created = await (await fetch(`${CDP}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(created.webSocketDebuggerUrl);
let seq = 0; const pending = new Map();
ws.on('message', d => { const m = JSON.parse(String(d)); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); } });
await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true }); if (r.exceptionDetails) return 'JS_ERROR: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text).slice(0, 300); return r.result?.value; };
const wait = ms => new Promise(r => setTimeout(r, ms));

await send('Page.enable'); await send('Runtime.enable');
await send('Page.navigate', { url: URL_ }); await wait(4000);
await ev('localStorage.clear()');
await send('Page.navigate', { url: URL_ }); await wait(4000);
await ev('document.querySelector("#btn-start").click()'); await wait(900);
await ev('document.querySelectorAll("#starter-grid .st-card")[0].click()'); await wait(1500);

// 用 monkey patch 记录 byId 调用
console.log(await ev(`(()=>{
  window.__log=[];
  var orig=byId;
  window.byId=function(x){ var r=orig(x); window.__log.push(String(x)+" => "+(r?("OK:"+r.id):"NULL")); return r; };
  return "patched";
})()`));

console.log(await ev(`(()=>{
  try{
    var t=TRAINERS[3];
    var lv0=Math.max(5,Math.round(((selfPet()&&selfPet().lv)||5)*0.9));
    var team=t.team.map(function(id,i){ return initFighter(byId(id), clamp(lv0+i,3,100), null, t.name); });
    TB={t:t, team:team, idx:0};
    openBattle("trainer", {sp:byId(team[0].sp), fighter:team[0]});
    return "openBattle OK, B="+B.mode;
  }catch(e){ return "THROW: "+e.message+" | stack: "+(e.stack||"").split("\\n").slice(0,4).join(" <<< ")+" | byIdLog: "+window.__log.slice(-8).join(" , "); }
})()`));
process.exit(0);
