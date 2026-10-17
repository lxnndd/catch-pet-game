/* 逐行定位：openBattle 内部到底哪一步拿到 null */
import { WebSocket } from 'ws';
const URL_ = process.argv[2] || 'http://127.0.0.1:8727/';
const CDP = 'http://127.0.0.1:' + (process.argv[3] ?? '9335');
const created = await (await fetch(`${CDP}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(created.webSocketDebuggerUrl);
let seq = 0; const pending = new Map();
ws.on('message', d => { const m = JSON.parse(String(d)); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); } });
await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true }); if (r.exceptionDetails) return 'JS_ERROR: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text).slice(0, 200); return r.result?.value; };
const wait = ms => new Promise(r => setTimeout(r, ms));

await send('Page.enable'); await send('Runtime.enable');
await send('Page.navigate', { url: URL_ }); await wait(4000);
await ev('localStorage.clear()');
await send('Page.navigate', { url: URL_ }); await wait(4000);
await ev('document.querySelector("#btn-start").click()'); await wait(900);
await ev('document.querySelectorAll("#starter-grid .st-card")[0].click()'); await wait(1500);

console.log('—— 关键对象体检 ——');
console.log('byId("fish"):', await ev('JSON.stringify(byId("fish")&&{id:byId("fish").id,name:byId("fish").name,base:byId("fish").base})'));
console.log('TRAINERS[3].team:', await ev('JSON.stringify(TRAINERS[3].team)'));
console.log('beginTrainerBattle 前置：S.party:', await ev('S.party.length'), '| alivePets:', await ev('alivePets().length'), '| selfPet:', await ev('JSON.stringify(selfPet()&&{uid:selfPet().uid,sp:selfPet().sp,lv:selfPet().lv,trait:selfPet().trait})'));

const probe = await ev(`(()=>{
  try{
    var t=TRAINERS[3];
    var lv0=Math.max(5,Math.round(((selfPet()&&selfPet().lv)||5)*0.9));
    var team=t.team.map(function(id,i){ return initFighter(byId(id), clamp(lv0+i,3,100), null, t.name); });
    var out={lv0:lv0, teamLen:team.length, first:{sp:team[0].sp, db:JSON.stringify(byId(team[0].sp)), lv:team[0].lv, hp:team[0].hp, ppKeys:Object.keys(team[0].pp||{}).length}};
    var spObj=byId(team[0].sp);
    out.byIdOk=!!spObj; out.byIdBase=spObj?spObj.base:null;
    out.emaxTry=(function(){ try{ return byId(spObj).base; }catch(e){ return "ERR:"+e.message; } })();
    return JSON.stringify(out);
  }catch(e){ return "THROW:"+e.message+" | "+(e.stack||"").split("\\n").slice(0,3).join(" << "); }
})()`);
console.log('—— 构造 team 探测 ——');
console.log(probe);

const probe2 = await ev(`(()=>{
  try{
    var enemy={sp:byId("fish")};
    return "byId(fish)="+(enemy.sp?("ok base="+enemy.sp.base):"NULL")+" typeof byId="+(typeof byId)+" typeof SPECIES="+(typeof SPECIES)+" SPECIES.length="+SPECIES.length;
  }catch(e){ return "THROW:"+e.message; }
})()`);
console.log(probe2);
process.exit(0);
