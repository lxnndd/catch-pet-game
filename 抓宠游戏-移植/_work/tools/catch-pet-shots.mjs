/* 生成线上截图集：九大地区巡览 + 训练师名册 + 训练师对战 + 状态条 + 遇敌弹窗 */
import { WebSocket } from 'ws';
import { writeFileSync } from 'node:fs';

const URL_ = process.argv[2] || 'http://47.105.123.182:8727/';
const CDP = 'http://127.0.0.1:' + (process.argv[3] ?? '9335');
const OUT = process.argv[4] || 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植';
const created = await (await fetch(`${CDP}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(created.webSocketDebuggerUrl);
let seq = 0; const pending = new Map(); const errs = [];
ws.on('message', d => {
  const m = JSON.parse(String(d));
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); }
  else if (m.method === 'Runtime.exceptionThrown') errs.push(String(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text).slice(0, 200));
});
await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) return 'JS_ERROR: ' + String(r.exceptionDetails.exception?.description || r.exceptionDetails.text).slice(0, 200); return r.result?.value; };
const wait = ms => new Promise(r => setTimeout(r, ms));
const shot = async (name) => { const s = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${OUT}/${name}`, Buffer.from(s.data, 'base64')); console.log('  [截图]', name); };

await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: 900, height: 780, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: URL_ + '?t=' + Date.now() }); await wait(5000);
await ev('localStorage.clear()');
await send('Page.navigate', { url: URL_ + '?t=' + Date.now() }); await wait(4500);

/* 开局：选初始伙伴 + 补两只，方便展示切磋/队伍 */
await ev('document.querySelector("#btn-start").click()'); await wait(900);
await shot('shot-01-选初始伙伴.png');
await ev('document.querySelectorAll("#starter-grid .st-card")[0].click()'); await wait(1500);
await ev(`(()=>{
  ["fox","wormling","frostwolf"].forEach(function(id,i){
    var p=newPet(id); p.lv=28+i*6; p.hp=byId(id).base; S.party.push(p); S.discovered[id]=1;
  });
  save(); updateHUD(); draw(); return S.party.length;
})()`);
await wait(400);
await shot('shot-02-主世界-平原.png');

/* 各地区巡览（把玩家搬到地区中心再重绘） */
const spots = [
  ['shot-03-花海.png', 14, 14], ['shot-04-雪原.png', 58, 10], ['shot-05-矿洞.png', 46, 12],
  ['shot-06-火山地带.png', 12, 44], ['shot-07-荒漠.png', 40, 48], ['shot-08-海洋.png', 66, 26]
];
for (const [name, x, y] of spots) {
  const reg = await ev(`(()=>{ S.pos={x:${x},y:${y}}; draw(); updateHUD();
    document.getElementById("hint").textContent="当前"+REGION_NAME[regionAt(${x},${y})]+" · "+regionHint(${x},${y});
    return REGION_NAME[regionAt(${x},${y})]; })()`);
  await wait(350);
  console.log('  ' + name + ' → ' + reg);
  await shot(name);
}

/* 训练师名册 */
await ev('openTrainerList()'); await wait(700); await shot('shot-09-训练师名册.png');
await ev('document.getElementById("panel-trainer").classList.add("hidden")');

/* 训练师对战 + 状态条 */
await ev(`(()=>{ try{ beginTrainerBattle(TRAINERS[7]); }catch(e){ return "ERR:"+e.message; }
  var pet=selfPet(); setStatus(pet,"burn"); addStage(pet,"atk",2); addStage(B.foe,"def",-1);
  refreshHP(); return B.mode; })()`);
await wait(900);
await shot('shot-10-训练师对战-带状态条.png');
await ev('if(B) B.busy=false; document.getElementById("btn-flee").click()'); await wait(2600);

/* 遇敌弹窗 */
await ev('openEncounter(rollEnemy())'); await wait(700);
await shot('shot-11-遇敌弹窗.png');
await ev('encFlee()'); await wait(500);

/* 切磋面板 */
await ev('openSpar()'); await wait(700); await shot('shot-12-队伍内切磋.png');
await ev('document.getElementById("panel-spar").classList.add("hidden")');

/* 医院（免费） */
await ev('openHospital()'); await wait(600); await shot('shot-13-医院免费.png');
await ev('document.getElementById("panel-hosp").classList.add("hidden")');

/* 图鉴（看得到 119 只的分页规模） */
await ev('openDex()'); await wait(900); await shot('shot-14-图鉴119只.png');
await ev('document.getElementById("panel-dex").classList.add("hidden")');

/* 清档确认弹窗 */
await ev('openConfirmReset()'); await wait(500); await shot('shot-15-清档确认弹窗.png');

console.log('控制台错误:', errs.length ? errs.join(' ;; ') : '无');
process.exit(0);
