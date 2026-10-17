/* 探针 v2：用 Function 构造器把整段脚本 + 诊断代码放进同一作用域执行 */
import { WebSocket } from 'ws';
import { readFileSync } from 'node:fs';

const FILE = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/app/site/index.html';
const URL_ = process.argv[2] || 'http://127.0.0.1:8727/';
const CDP = 'http://127.0.0.1:' + (process.argv[3] ?? '9335');

const src = readFileSync(FILE, 'utf8');
const js = [...src.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
/* 去掉 boot() 自动调用，避免重复初始化 */
const jsNoBoot = js.replace(/\nboot\(\);\s*$/, '\n');
const probeTail = `
;window.__probe=(function(){
  try{
    /* 用页面里已有的真实存档状态填充本作用域的 S / map（同源同构） */
    S=window.__S; map=window.__map; sparkles=[]; B=null; TB=null; SPB=null;
    var t=TRAINERS[3];
    var lv0=Math.max(5,Math.round(((selfPet()&&selfPet().lv)||5)*0.9));
    var team=t.team.map(function(id,i){ return initFighter(byId(id), clamp(lv0+i,3,100), null, t.name); });
    var out={};
    out.teamSp=team.map(function(f){ return typeof f.sp + ":" + String(f.sp); }).join(",");
    out.byIdTeam0 = byId(team[0].sp) ? ("OK base="+byId(team[0].sp).base) : "NULL";
    out.sp0raw = JSON.stringify(team[0].sp);
    out.speciesIds = SPECIES.length;
    out.speciesFirst = SPECIES[0] ? SPECIES[0].id : "none";
    out.spIsInSpecies = SPECIES.some(function(s){ return s.id===team[0].sp; });
    out.typecmp = (SPECIES[0].id===team[0].sp) + " / " + (typeof SPECIES[0].id) + " vs " + (typeof team[0].sp);
    var e={sp:byId(team[0].sp), fighter:team[0]};
    out.eSpType = typeof e.sp;
    out.eSpVal = e.sp ? e.sp.id : "NULL";
    var r2=(function(){ try{ return "emax="+byId(e.sp).base; }catch(err){ return "emaxERR:"+err.message; } })();
    out.emaxTry=r2;
    try{ TB={t:t,team:team,idx:0}; openBattle("trainer", e); out.openBattle="OK mode="+B.mode; }
    catch(err){ out.openBattle="ERR:"+err.message+" @ "+(err.stack||"").split(String.fromCharCode(10)).slice(1,3).join(" <<< "); }
    return JSON.stringify(out);
  }catch(err){ return "OUTER:"+err.message+" | "+(err.stack||"").split(String.fromCharCode(10)).slice(0,3).join(" <<< "); }
})();
`;
const full = jsNoBoot + probeTail;

const created = await (await fetch(`${CDP}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(created.webSocketDebuggerUrl);
let seq = 0; const pending = new Map(); const errs = [];
ws.on('message', d => {
  const m = JSON.parse(String(d));
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); }
  else if (m.method === 'Runtime.exceptionThrown') errs.push(String(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text).slice(0, 300));
});
await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) return 'JS_ERROR: ' + String(r.exceptionDetails.exception?.description || r.exceptionDetails.text).slice(0, 400);
  return r.result?.value;
};
const wait = ms => new Promise(r => setTimeout(r, ms));

await send('Page.enable'); await send('Runtime.enable');
await send('Page.navigate', { url: URL_ }); await wait(4500);
await ev('localStorage.clear()');
await send('Page.navigate', { url: URL_ }); await wait(4000);
/* 手动起一局：注入函数在没有 boot() 世界里执行完整初始化 */
console.log('boot 重建:', await ev(`(()=>{try{ boot(); document.querySelector("#btn-start").click(); return "boot ok"; }catch(e){ return "boot ERR:"+e.message; }})()`));
await wait(1200);
console.log('starter 卡片:', await ev(`document.querySelectorAll("#starter-grid .st-card").length`));
await ev(`(()=>{const c=document.querySelectorAll("#starter-grid .st-card")[0]; if(c) c.click(); return 1;})()`);
await wait(1500);
console.log('party:', await ev('S.party.length'), '| world 可见:', await ev(`!document.getElementById("screen-world").classList.contains("hidden")`));

console.log('\n=== 同作用域探针 ===');
await ev(`window.__S=S; window.__map=map; "dug"`);
console.log(await ev(`(()=>{ var f = new Function(${JSON.stringify(full)}); try{ f(); return window.__probe || "probe 未设置"; }catch(e){ return "构造执行失败: "+e.message; } })()`));
console.log('\n异常:', errs.length ? errs.join('\n') : '（无）');
process.exit(0);
