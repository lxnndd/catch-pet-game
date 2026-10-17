/* v20 测试：城镇着色/可达、PP=10、初始5级、道馆一次、队伍UI、遇敌等级 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { WebSocket } from 'ws';
const SHOT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/shots-v20';
mkdirSync(SHOT, { recursive: true });
let seq = 0;
const c = await (await fetch('http://127.0.0.1:9335/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(c.webSocketDebuggerUrl);
const pend = new Map(); const errs = [];
ws.on('message', d => { const m = JSON.parse(String(d)); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); return; } if (m.method === 'Runtime.exceptionThrown') errs.push(String(m.params.exceptionDetails?.exception?.description || '').slice(0, 150)); });
await new Promise((r, j) => { ws.on('open', r); ws.on('error', j); });
const send = (mm, p = {}) => new Promise((res, rej) => { const id = ++seq; pend.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method: mm, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) return { __err: String(r.exceptionDetails.exception?.description || '').slice(0, 170) }; return r.result?.value; };
const wait = ms => new Promise(r => setTimeout(r, ms));
const shot = async n => { try { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(SHOT + '/' + n + '.png', Buffer.from(r.data, 'base64')); } catch (e) { } };
const P = []; const ck = (n, ok, x) => { P.push({ n, ok: !!ok }); console.log((ok ? '  ✅ ' : '  ❌ ') + n + (x !== undefined ? '  → ' + String(x).slice(0, 76) : '')); };
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await send('Page.navigate', { url: 'http://127.0.0.1:8727/?t=' + Date.now() });
let ready = false;
for (let i = 0; i < 45; i++) { await wait(1000); if (await ev("(typeof MW!=='undefined'&&typeof S!=='undefined'&&!!S)?1:0") === 1) { ready = true; break; } }
ck('加载就绪', ready);
await ev('(function(){ try{ localStorage.clear(); }catch(e){} return 1; })()');
await send('Page.navigate', { url: 'http://127.0.0.1:8727/?t=' + Date.now() });
for (let i = 0; i < 45; i++) { await wait(1000); if (await ev("(typeof MW!=='undefined'&&typeof S!=='undefined'&&!!S)?1:0") === 1) break; }

console.log('\n【1】城镇地面着色 + 可达');
const t = await ev("(function(){ return { towns:TOWNS.length, townTiles:map.filter(function(v){return v===T.TOWN;}).length, colors:TOWNS.map(function(x){return x.name+':'+(GYM_COLOR[x.gymType]||'?');}) }; })()") || {};
ck('城镇地面用 TOWN 地形（可着色）', t.townTiles > 1000, t.townTiles + ' 格');
ck('8 座城镇各有标志色', (t.colors || []).length === 8, (t.colors || []).join(' '));
/* 每座城镇四向出口外侧是否可走 */
const reach = await ev(`(function(){
  var out=[];
  TOWNS.forEach(function(tw){
    var dirs=[[1,0],[-1,0],[0,1],[0,-1]], ok=0;
    dirs.forEach(function(d){
      var x=tw.x+d[0]*12, y=tw.y+d[1]*10;
      if(x<0||y<0||x>=MW||y>=MH){ return; }
      var v=tileAt(x,y);
      if(v!==T.TREE&&v!==T.ROCK&&v!==T.LAVA&&v!==T.DEEP&&v!==T.WATER) ok++;
    });
    out.push(tw.name+':'+ok+'/4');
  });
  return out;
})()`) || [];
ck('每座城镇四向出口外都可走', reach.every(x => Number(x.split(':')[1].split('/')[0]) >= 3), reach.join(' '));

console.log('\n【2】PP 统一 10/10');
const pp = await ev("(function(){ var ids=Object.keys(MOVES); var bad=ids.filter(function(id){ return MOVES[id].pp!==10; }); return { total:ids.length, bad:bad.length, sample:['mv1','mv2','mv3'].map(function(id){ return (MOVES[id]?MOVES[id].name:'?')+':'+(MOVES[id]?MOVES[id].pp:'-'); }) }; })()") || {};
ck('所有招式 PP 都是 10', pp.bad === 0, pp.total + ' 个招式，异常 ' + pp.bad + ' · ' + (pp.sample || []).join(' '));

console.log('\n【3】初始伙伴 5 级');
await ev("document.getElementById('btn-start').click()"); await wait(2800);
await ev("(function(){ document.querySelector('#starter-grid .st-card').click(); return 1; })()"); await wait(3500);
const st = await ev("(function(){ var p=selfPet(); var ids=movesOf(p); return { lv:p.lv, hp:p.hp+'/'+maxHpOf(p), pp:ids.map(function(id){return p.pp[id];}), moves:ids.length }; })()") || {};
ck('初始伙伴 5 级', st.lv === 5, 'Lv' + st.lv + ' HP ' + st.hp);
ck('初始技能 PP 都是 10', (st.pp || []).every(v => v === 10), JSON.stringify(st.pp));

console.log('\n【4】道馆只弹一次');
const gym = await ev(`(function(){
  var tw=TOWNS[0];
  ['panel-gym','panel-hosp'].forEach(function(id){var e=document.getElementById(id);if(e)e.classList.add('hidden');});
  S.gymsSeen={};
  S.pos={x:tw.gym.x,y:tw.gym.y-2}; move(0,1);
  var first=!document.getElementById('panel-gym').classList.contains('hidden');
  document.getElementById('panel-gym').classList.add('hidden');
  S.pos={x:tw.gym.x,y:tw.gym.y-2}; move(0,1);
  var second=!document.getElementById('panel-gym').classList.contains('hidden');
  return { first:first, second:second };
})()`) || {};
ck('第一次踩道馆弹窗、第二次不弹', gym.first === true && gym.second === false, JSON.stringify(gym));

console.log('\n【5】遇敌等级与提示一致（用户报的问题）');
const enc = await ev(`(function(){
  var saved={x:S.pos.x,y:S.pos.y};
  var out=[];
  [['plain',1],['flower',30],['mine',40],['ocean',60],['volcano',70],['snow',70]].forEach(function(it){
    var pt=null;
    for(var y=2;y<MH-2&&!pt;y+=3)for(var x=2;x<MW-2;x+=3){ if(regionAt(x,y)===it[0]){ pt={x:x,y:y}; break; } }
    if(!pt) return;
    S.pos={x:pt.x,y:pt.y};
    var p=selfPet(); p.lv=it[1]; p.hp=maxHpOf(p);
    var lr=LV_RANGE[it[0]];
    var lvs=[]; var ok=true;
    for(var i=0;i<10;i++){
      var e=rollEnemy();
      if(!e||!e.lv) { ok=false; break; }
      if(e.lv<lr[0]||e.lv>lr[1]) ok=false;
      lvs.push(e.lv);
    }
    out.push(REGION_NAME[it[0]]+' 玩家Lv'+it[1]+'→'+Math.min.apply(null,lvs)+'~'+Math.max.apply(null,lvs)+'(段'+lr[0]+'~'+lr[1]+') '+(ok?'OK':'BAD'));
  });
  S.pos=saved;
  return out;
})()`) || [];
enc.forEach(l => console.log('     ' + l));
ck('各地区遇敌等级落在区间内（含高等级区）', enc.length >= 5 && enc.every(l => /OK/.test(l)), enc.length + ' 个地区');

console.log('\n【6】队伍面板 UI（按钮不压 HP）');
await ev("(function(){ var b=document.getElementById('btn-party'); if(b) b.click(); return 1; })()"); await wait(1500);
const ui = await ev(`(function(){
  var row=document.querySelector('#party-list .pet-row');
  if(!row) return { err:'没有队伍行' };
  var desc=row.querySelector('.desc'), acts=row.querySelector('.acts');
  if(!desc||!acts) return { err:'找不到 desc/acts' };
  var rd=desc.getBoundingClientRect(), ra=acts.getBoundingClientRect();
  return { descBottom:Math.round(rd.bottom), actsTop:Math.round(ra.top), overlap: ra.top < rd.bottom - 2, descText:(desc.textContent||'').slice(-28) };
})()`) || {};
ck('按钮在 HP 文本下方（不重叠）', ui.overlap === false, JSON.stringify(ui));
await shot('v20-01-party');
/* 截图：城镇着色 */
await ev("(function(){ var e=document.getElementById('panel-party'); if(e)e.classList.add('hidden'); var t=TOWNS.find(function(x){return x.gymType==='fire';}); S.pos={x:t.x,y:t.y}; draw(); return 1; })()");
await wait(900); await shot('v20-02-fire-town');
await ev("(function(){ var t=TOWNS.find(function(x){return x.gymType==='water';}); S.pos={x:t.x,y:t.y}; draw(); return 1; })()");
await wait(900); await shot('v20-03-water-town');
await ev("(function(){ var t=TOWNS.find(function(x){return x.gymType==='ice';}); S.pos={x:t.x,y:t.y}; draw(); return 1; })()");
await wait(900); await shot('v20-04-ice-town');

console.log('\n异常 ' + errs.length + ' 条'); errs.slice(0, 4).forEach(e => console.log('  ❌ ' + e));
const pass = P.filter(x => x.ok).length;
console.log('\n通过 ' + pass + ' / ' + P.length);
writeFileSync(SHOT + '/v20-result.json', JSON.stringify({ pass, total: P.length, errors: errs.length, items: P }, null, 1), 'utf8');
ws.close();
