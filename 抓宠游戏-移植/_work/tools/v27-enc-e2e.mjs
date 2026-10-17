/* v27 端到端遇敌验证 v2
   阶段1：逐地区走真实 move() 1500 步，统计触发遇敌的步数（遇敌即 encFlee，不进战斗）
   阶段2：单独验证「遇敌 → 弹窗 → 点进入战斗 → 真的开战」链路 */
import { WebSocket } from 'ws';
/* 用法：node v27-enc-e2e.mjs [url] [cdpPort] */
const URL_BASE = process.argv[2] || 'http://127.0.0.1:8727/';
const CDP_PORT = process.argv[3] || '9335';
let seq = 0;
const c = await (await fetch('http://127.0.0.1:' + CDP_PORT + '/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(c.webSocketDebuggerUrl);
const pend = new Map();
ws.on('message', d => { const m = JSON.parse(String(d)); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); } });
await new Promise((r, j) => { ws.on('open', r); ws.on('error', j); });
const send = (mm, p = {}) => new Promise((res, rej) => { const id = ++seq; pend.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method: mm, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) return { __err: String(r.exceptionDetails.exception?.description || '').slice(0, 500) }; return r.result?.value; };
const wait = ms => new Promise(r => setTimeout(r, ms));
const errs = [];
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
ws.on('message', d => { try { const m = JSON.parse(String(d)); if (m.method === 'Runtime.exceptionThrown') errs.push(String(m.params?.exceptionDetails?.exception?.description || '').slice(0, 150)); } catch (e) { } });

async function boot() {
  await send('Page.navigate', { url: URL_BASE + '?t=' + Date.now() });
  for (let i = 0; i < 120; i++) { await wait(250); if (await ev("(typeof MW!=='undefined'&&typeof map!=='undefined'&&map&&map.length)") === true) break; }
  return await ev(`(function(){
    try{
      localStorage.removeItem(SAVE_KEY);
      S=freshSave();
      var pet=newPet('pk-001'); pet.lv=5; pet.exp=0; pet.hp=maxHpOf(pet); ensureMoves(pet);
      S.party=[pet]; S.lead=pet.uid; S.discovered['pk-001']=1;
      S.pos={x:SPAWN.x,y:SPAWN.y};
      enterWorld();
      return 'ok world-hidden=' + $('screen-world').classList.contains('hidden') + ' party=' + S.party.length + ' lv=' + S.party[0].lv + ' hp=' + S.party[0].hp;
    }catch(e){ return 'ERR ' + e.message; }
  })()`);
}
console.log('阶段0 进入世界: ' + await boot());

const REGS = ['plain', 'forest', 'water', 'flower', 'mine', 'desert', 'ocean', 'volcano', 'snow'];
console.log('\n== 阶段1：真实 move() 路径 · 逐地区 1500 步 ==');
console.log('  地区      平均步数   遇敌   ✅');
const summary = [];
for (const reg of REGS) {
  const raw = await ev(`(function(){
    var reg=${JSON.stringify(reg)}, sx=-1, sy=-1;
    for(var y=2;y<MH-2&&sx<0;y++) for(var x=2;x<MW-2;x++){
      if(regionAt(x,y)===reg && !blocked(x,y) && encRateOf(tileAt(x,y))>0){ sx=x; sy=y; break; }
    }
    if(sx<0) return JSON.stringify({err:'no spot'});
    var hits=0, moved=0, fail='';
    var dirs=[[0,1],[0,-1],[1,0],[-1,0]];
    for(var i=0;i<1500;i++){
      if(pendEnc) encFlee();
      S.pos={x:sx,y:sy};
      var d=dirs[Math.floor(Math.random()*4)];
      var px=S.pos.x, py=S.pos.y;
      try{ move(d[0],d[1]); }catch(e){ fail='move抛错:'+e.message; break; }
      if(S.pos.x!==px||S.pos.y!==py) moved++;
      if(pendEnc){ hits++; encFlee(); }
    }
    return JSON.stringify({moved:moved,hits:hits,fail:fail,per:hits?(moved/hits).toFixed(1):'∞'});
  })()`);
  if (raw && raw.__err) { console.log('  ' + reg.padEnd(9) + 'ERR ' + raw.__err.slice(0, 100)); continue; }
  const o = JSON.parse(raw);
  const per = o.per === '∞' ? Infinity : parseFloat(o.per);
  const ok = per !== Infinity && per >= 8 && per <= 25;
  summary.push({ reg, per, ok });
  console.log('  ' + reg.padEnd(9) + (isFinite(per) ? String(per).padStart(6) + ' 步' : '   ∞    ') + '  ' + String(o.hits).padStart(4) + ' 次  ' + (ok ? '✅' : '❌') + (o.fail ? '  ' + o.fail.slice(0, 70) : ''));
}

console.log('\n== 阶段2：遇敌 → 弹窗 → 开战 全链路 ==');
console.log('重载干净存档: ' + await boot());
const e2e = await ev(`(function(){
  var dirs=[[0,1],[0,-1],[1,0],[-1,0]];
  var found=false, steps=0;
  for(var i=0;i<4000 && !found;i++){
    var d=dirs[Math.floor(Math.random()*4)];
    var px=S.pos.x, py=S.pos.y;
    move(d[0],d[1]);
    if(S.pos.x!==px||S.pos.y!==py) steps++;
    if(pendEnc) found=true;
  }
  if(!found) return JSON.stringify({err:'4000 步内没触发遇敌', steps:steps});
  var panelShown = !$('enc-panel').classList.contains('hidden');
  var btnText = $('enc-fight').textContent.trim();
  var encName = $('enc-name') ? $('enc-name').textContent.trim() : ($('enc-title')?$('enc-title').textContent.trim():'?');
  var lvTxt = $('enc-panel').textContent.replace(/\\s+/g,' ').slice(0,140);
  acceptEncounter();
  var inBattle = !$('screen-battle').classList.contains('hidden');
  var foeName = $('enemy-name') ? $('enemy-name').textContent.trim() : '?';
  var foeHp = $('enemy-hp-text') ? $('enemy-hp-text').textContent.trim() : '?';
  var moveBtns = document.querySelectorAll('#move-row .move-btn').length;
  return JSON.stringify({steps:steps, panelShown:panelShown, btnText:btnText, panelText:lvTxt, inBattle:inBattle, foeName:foeName, foeHp:foeHp, moveBtns:moveBtns});
})()`);
if (e2e && e2e.__err) console.log('  ERR ' + e2e.__err);
else {
  const o = JSON.parse(e2e);
  if (o.err) console.log('  ❌ ' + o.err + '（走了 ' + o.steps + ' 步）');
  else {
    console.log('  ' + (o.panelShown ? '✅' : '❌') + ' 遇敌弹窗出现（走了 ' + o.steps + ' 步）');
    console.log('  ' + (o.btnText.includes('进入战斗') ? '✅' : '❌') + ' 弹窗按钮: ' + o.btnText);
    console.log('  弹窗内容: ' + o.panelText);
    console.log('  ' + (o.inBattle ? '✅' : '❌') + ' 点「进入战斗」后进入战斗屏 | 对手 ' + o.foeName + ' HP ' + o.foeHp + ' | 技能按钮 ' + o.moveBtns + ' 个');
  }
}
console.log('\n控制台异常: ' + errs.length + ' 条' + (errs.length ? ' → ' + errs.slice(0, 3).join(' || ') : ''));
ws.close();
