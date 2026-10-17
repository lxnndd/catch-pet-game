/* v27 截图：证明「原先永不遇敌」的雪原/火山现在真的会出怪 */
import { WebSocket } from 'ws';
import { mkdirSync, writeFileSync } from 'node:fs';
const URL_BASE = process.argv[2] || 'http://127.0.0.1:8727/';
const CDP_PORT = process.argv[3] || '9335';
const OUT = process.argv[4] || 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/shots-v27';
mkdirSync(OUT, { recursive: true });
let seq = 0;
const c = await (await fetch('http://127.0.0.1:' + CDP_PORT + '/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(c.webSocketDebuggerUrl);
const pend = new Map();
ws.on('message', d => { const m = JSON.parse(String(d)); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); } });
await new Promise((r, j) => { ws.on('open', r); ws.on('error', j); });
const send = (mm, p = {}) => new Promise((res, rej) => { const id = ++seq; pend.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method: mm, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) return { __err: String(r.exceptionDetails.exception?.description || '').slice(0, 400) }; return r.result?.value; };
const wait = ms => new Promise(r => setTimeout(r, ms));
const shot = async (f) => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(OUT + '/' + f, Buffer.from(r.data, 'base64')); console.log('  📷 ' + f); };
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: 430, height: 900, deviceScaleFactor: 1, mobile: true });
await send('Page.navigate', { url: URL_BASE + '?t=' + Date.now() });
for (let i = 0; i < 120; i++) { await wait(250); if (await ev("(typeof MW!=='undefined'&&typeof map!=='undefined'&&map&&map.length)") === true) break; }
console.log('进入世界: ' + await ev(`(function(){
  try{
    localStorage.removeItem(SAVE_KEY); S=freshSave();
    var pet=newPet('pk-001'); pet.lv=20; pet.hp=maxHpOf(pet); ensureMoves(pet);
    S.party=[pet]; S.lead=pet.uid; S.discovered['pk-001']=1;
    S.pos={x:SPAWN.x,y:SPAWN.y}; enterWorld(); draw();
    return 'ok';
  }catch(e){ return 'ERR '+e.message; }
})()`));
for (const [reg, file, label] of [['snow', 'v27-01-snow-encounter.png', '雪原'], ['volcano', 'v27-02-volcano-encounter.png', '火山'], ['plain', 'v27-03-plain-encounter.png', '平原']]) {
  const r = await ev(`(function(){
    var reg=${JSON.stringify(reg)}, sx=-1, sy=-1;
    for(var y=2;y<MH-2&&sx<0;y++) for(var x=2;x<MW-2;x++){
      if(regionAt(x,y)===reg && !blocked(x,y) && encRateOf(tileAt(x,y))>0){ sx=x; sy=y; break; }
    }
    if(sx<0) return JSON.stringify({err:'no spot'});
    if(pendEnc) encFlee();
    S.pos={x:sx,y:sy}; draw();
    var dirs=[[0,1],[0,-1],[1,0],[-1,0]], steps=0;
    for(var i=0;i<3000;i++){
      var d=dirs[Math.floor(Math.random()*4)];
      var px=S.pos.x, py=S.pos.y;
      move(d[0],d[1]);
      if(S.pos.x!==px||S.pos.y!==py) steps++;
      if(pendEnc) break;
    }
    updateHUD(); draw();
    var h=$('hint').textContent;
    var panel=$('enc-panel').classList.contains('hidden')?'hidden':'shown';
    var txt=$('enc-panel').textContent.replace(/\\s+/g,' ').trim().slice(0,120);
    return JSON.stringify({steps:steps,hint:h,panel:panel,txt:txt});
  })()`);
  if (r && r.__err) { console.log('  ' + label + ' ERR ' + r.__err.slice(0, 100)); continue; }
  const o = JSON.parse(r);
  console.log('  ' + label + '：走 ' + o.steps + ' 步触发 · 弹窗 ' + o.panel + ' · ' + (o.txt || ''));
  await wait(400); await shot(file);
}
ws.close();
