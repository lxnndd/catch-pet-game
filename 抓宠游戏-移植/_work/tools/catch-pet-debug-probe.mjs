/* 诊断探针：用动态脚本在同一作用域内复现 openBattle，打印关键值 */
import { WebSocket } from 'ws';
const URL_ = process.argv[2] || 'http://127.0.0.1:8727/';
const CDP = 'http://127.0.0.1:' + (process.argv[3] ?? '9335');
const created = await (await fetch(`${CDP}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(created.webSocketDebuggerUrl);
let seq = 0; const pending = new Map();
ws.on('message', d => { const m = JSON.parse(String(d)); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); } });
await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) return 'JS_ERROR: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text).slice(0, 300); return r.result?.value; };
const wait = ms => new Promise(r => setTimeout(r, ms));

await send('Page.enable'); await send('Runtime.enable');
await send('Page.navigate', { url: URL_ }); await wait(4000);
await ev('localStorage.clear()');
await send('Page.navigate', { url: URL_ }); await wait(4000);
await ev('document.querySelector("#btn-start").click()'); await wait(900);
await ev('document.querySelectorAll("#starter-grid .st-card")[0].click()'); await wait(1500);

const probe = `
(async () => {
  const js = await (await fetch(location.href)).text();
  const s = document.createElement('script');
  s.textContent = js + "\\n;window.__probe=(function(){"
    + "try{"
    + "  var t=TRAINERS[3];"
    + "  var lv0=Math.max(5,Math.round(((selfPet()&&selfPet().lv)||5)*0.9));"
    + "  var team=t.team.map(function(id,i){ return initFighter(byId(id), clamp(lv0+i,3,100), null, t.name); });"
    + "  var e={sp:byId(team[0].sp), fighter:team[0]};"
    + "  var r1=(typeof e.sp)+\"|\"+(e.sp?(\"id=\"+e.sp.id+\" base=\"+e.sp.base):\"NULL\")+\"|\"+(typeof byId)+\"|\"+JSON.stringify(Object.keys(e.fighter));"
    + "  var r2=(function(){ try{ return \"emax=\"+byId(e.sp).base; }catch(err){ return \"emaxERR:\"+err.message; } })();"
    + "  var r3=(function(){ try{ TB={t:t,team:team,idx:0}; openBattle(\"trainer\", e); return \"openBattle OK mode=\"+B.mode; }catch(err){ return \"openBattleERR:\"+err.message+\" @@ \"+(err.stack||\"\").split(String.fromCharCode(10)).slice(0,3).join(\" <<< \"); } })();"
    + "  return r1+\" ;; \"+r2+\" ;; \"+r3;"
    + "}catch(err){ return \"OUTER:\"+err.message; }"
    + "})();";
  document.body.appendChild(s);
  for (let i=0;i<40;i++){ if (window.__probe!==undefined) return window.__probe; await new Promise(r=>setTimeout(r,150)); }
  return 'probe 超时';
})()`;
console.log(await ev(probe));
process.exit(0);
