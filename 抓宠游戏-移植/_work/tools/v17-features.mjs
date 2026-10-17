/* v17 训练师对战 / 切磋 / 状态 / 图鉴分页 验收 */
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
ws.on('message', d => { const m = JSON.parse(String(d)); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); return; } if (m.method === 'Runtime.exceptionThrown') errors.push('EXC: ' + String(m.params.exceptionDetails?.exception?.description || '').slice(0, 160)); });
await new Promise((r, j) => { ws.on('open', r); ws.on('error', j); });
const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async (expr) => { const rr = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (rr.exceptionDetails) return { __err: String(rr.exceptionDetails.exception?.description || '').slice(0, 220) }; return rr.result?.value; };
const wait = ms => new Promise(r => setTimeout(r, ms));
const shot = async (n) => { try { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(SHOT + '/' + n + '.png', Buffer.from(r.data, 'base64')); } catch (e) { } };
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: 480, height: 940, deviceScaleFactor: 2, mobile: true });
await send('Page.navigate', { url: URL_ + '?t=' + Date.now() });
await wait(9000);
await ev(`(function(){ try{ localStorage.clear(); }catch(e){} return 1; })()`);
await send('Page.navigate', { url: URL_ + '?t=' + Date.now() });
await wait(9000);
await ev(`document.getElementById('btn-start').click()`);
await wait(2500);
await ev(`(function(){ var c=document.querySelector('#starter-grid .st-card'); if(c) c.click(); return 1; })()`);
await wait(3000);
/* 给点等级，免得太弱 */
await ev(`(function(){ var p=selfPet(); for(var i=0;i<25;i++) gainExp(p,50); return p.lv; })()`);
await wait(800);

/* 1) 训练师名册 */
await ev(`(function(){ var d=document.getElementById('panel-learn'); if(d) d.classList.add('hidden'); var b=document.getElementById('btn-trainer'); if(b) b.click(); return 1; })()`);
await wait(1500);
const roster = await ev(`(function(){
  var p=document.getElementById('panel-trainer');
  var rows=[...document.querySelectorAll('#trainer-body .train-row')];
  return { shown: p?!p.classList.contains('hidden'):false,
           rows: rows.length,
           text: (document.getElementById('trainer-body')||{}).textContent ? document.getElementById('trainer-list').textContent.replace(/\\s+/g,' ').trim().slice(0,220) : '' };
})()`);
console.log('=== 训练师名册 ===');
console.log(JSON.stringify(roster, null, 1));
await shot('v17-11-trainers');
/* 2) 直接开一场训练师战 */
await ev(`(function(){ var p=document.getElementById('panel-trainer'); if(p) p.classList.add('hidden'); return 1; })()`);
const tb = await ev(`(function(){
  try{
    var t = TRAINERS[0];
    /* 让玩家够强，避免秒败 */
    var p=selfPet(); p.lv=25; p.hp=maxHpOf(p);
    beginTrainerBattle(t);
    return { ok:true, trainer:t.name, team:t.team.map(function(id){ return byId(id)? byId(id).name : ('❌'+id); }) };
  }catch(e){ return { err:String(e.message).slice(0,180) }; }
})()`);
console.log('\n=== 训练师对战开战 ===');
console.log(JSON.stringify(tb, null, 1));
await wait(2600);
const tbs = await ev(`(function(){
  var row=document.getElementById('move-row');
  return { battleShown: !document.getElementById('screen-battle').classList.contains('hidden'),
           foe:(document.getElementById('enemy-name')||{}).textContent,
           mode:(document.getElementById('battle-tip')||{}).textContent ? document.getElementById('battle-tip').textContent.slice(0,60):'',
           moveButtons: row? row.querySelectorAll('button').length : 0,
           ballDisabled: [...document.querySelectorAll('#ball-row button')].map(function(b){return b.disabled;}) };
})()`);
console.log('\n=== 训练师对战界面 ===');
console.log(JSON.stringify(tbs, null, 1));
await shot('v17-12-trainer-battle');
/* 3) 切磋（队伍内） */
await ev(`(function(){ try{ closeBattle(); }catch(e){} return 1; })()`);
await wait(1200);
/* 先补一只宠 */
await ev(`(function(){
  try{
    var sp=SPECIES.filter(function(s){return !s.varOf && s.rarity===0 && byName && s.hpBase>40;})[3];
    var np=initFighter(sp.id, 10); np.uid=(S.party.reduce(function(m,p){return Math.max(m,p.uid);},0))+1; S.party.push(np); save();
    return true;
  }catch(e){ return String(e.message).slice(0,80); }
})()`);
const spar = await ev(`(function(){
  try{ openSpar(); return {ok:true, party:S.party.length, a:byId(S.party[0].sp).name, b:S.party[1]?byId(S.party[1].sp).name:'—'}; }
  catch(e){ return {err:String(e.message).slice(0,180)}; }
})()`);
console.log('\n=== 队伍内切磋 ===');
console.log(JSON.stringify(spar, null, 1));
await wait(2200);
const spars = await ev(`(function(){
  var row=document.getElementById('move-row');
  return { battleShown: !document.getElementById('screen-battle').classList.contains('hidden'),
           tip:(document.getElementById('battle-tip')||{}).textContent ? document.getElementById('battle-tip').textContent.slice(0,70):'',
           moveButtons: row? row.querySelectorAll('button').length : 0 };
})()`);
console.log(JSON.stringify(spars, null, 1));
await shot('v17-13-spar');
/* 4) 图鉴分页 */
await ev(`(function(){ try{ closeBattle(); }catch(e){} var b=document.getElementById('btn-dex'); if(b) b.click(); return 1; })()`);
await wait(2600);
const dex = await ev(`(function(){
  var g=document.getElementById('dex-grid');
  var pager=[...document.querySelectorAll('#dex-grid button, .dex-pager button')].map(function(b){return b.textContent.trim().slice(0,8);}).slice(0,6);
  var note=[...document.querySelectorAll('.dex-note')].map(function(n){return n.textContent.replace(/\\s+/g,' ').trim().slice(0,60);}).slice(0,3);
  return { count:(document.getElementById('dex-count')||{}).textContent||'', cards:g?g.querySelectorAll('.pet-card,.dex-card,.dex-item,.st-card').length:0, avatars:g?g.querySelectorAll('img.pet-avatar').length:0, pager:pager, notes:note };
})()`);
console.log('\n=== 图鉴 ===');
console.log(JSON.stringify(dex, null, 1));
await shot('v17-14-dex');
/* 5) 海洋 / 骑乘 */
const ocean = await ev(`(function(){
  var out={};
  try{
    out.rideCount = SPECIES.filter(function(s){return s.ride;}).length;
    out.waterPets = SPECIES.filter(function(s){return s.type==='water'||s.type2==='water';}).length;
    /* 找一片海水，测试 blocked 与骑乘 */
    var wx=null,wy=null;
    for(var y=0;y<MH && wx===null;y++) for(var x=60;x<MW;x++){ if(map[y*MW+x]===T.DEEP||map[y*MW+x]===T.WATER){ wx=x; wy=y; break; } }
    out.waterTile = wx!==null ? {x:wx,y:wy} : null;
    if(wx!==null){
      var savedPos={x:S.pos.x,y:S.pos.y};
      S.pos={x:wx,y:wy};
      out.blockedNow = blocked(wx,wy);
      out.canSwim = (typeof waterCount==='function') ? waterCount() : 'no fn';
      out.speedMul = (typeof speedMul==='function') ? speedMul() : 'no fn';
      S.pos=savedPos;
    }
  }catch(e){ out.err=String(e.message).slice(0,140); }
  return out;
})()`);
console.log('\n=== 海洋 / 骑乘 ===');
console.log(JSON.stringify(ocean, null, 1));
console.log('\n异常 ' + errors.length + ' 条'); errors.slice(0, 6).forEach(e => console.log('  ❌ ' + e));
if (!errors.length) console.log('  ✅ 零异常');
ws.close();
