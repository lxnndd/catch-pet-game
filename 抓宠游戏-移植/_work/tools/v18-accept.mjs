/* v18 最终验收（公网）：地图9倍/九地区/等级制/可达性 + 真实游玩（遇敌·战斗·抓捕·进化）*/
import { writeFileSync, mkdirSync } from 'node:fs';
import { WebSocket } from 'ws';
const URL_ = process.argv[2] || 'http://47.105.123.182:8727/';
const PORT = process.argv[3] || '9335';
const SHOT = process.argv[4] || 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/shots-v18-public';
mkdirSync(SHOT, { recursive: true });
let seq = 0;
const created = await (await fetch('http://127.0.0.1:' + PORT + '/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(created.webSocketDebuggerUrl);
const pending = new Map(); const errors = [];
ws.on('message', d => { const m = JSON.parse(String(d)); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); return; } if (m.method === 'Runtime.exceptionThrown') errors.push(String(m.params.exceptionDetails?.exception?.description || '').slice(0, 170)); });
await new Promise((r, j) => { ws.on('open', r); ws.on('error', j); });
const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async (expr) => { const rr = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (rr.exceptionDetails) return { __err: String(rr.exceptionDetails.exception?.description || '').slice(0, 200) }; return rr.result?.value; };
const wait = ms => new Promise(r => setTimeout(r, ms));
const shot = async (n) => { try { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(SHOT + '/' + n + '.png', Buffer.from(r.data, 'base64')); } catch (e) { } };
const P = []; const ck = (n, ok, x) => { P.push({ n, ok: !!ok, x: x === undefined ? '' : String(x).slice(0, 76) }); console.log((ok ? '  ✅ ' : '  ❌ ') + n + (x !== undefined ? '  → ' + String(x).slice(0, 76) : '')); };
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: 480, height: 940, deviceScaleFactor: 2, mobile: true });
await send('Page.navigate', { url: URL_ + '?t=' + Date.now() });
await wait(12000);
await ev('(function(){ try{ localStorage.clear(); }catch(e){} return 1; })()');
await send('Page.navigate', { url: URL_ + '?t=' + Date.now() });
await wait(12000);

console.log('\n【1】地图与数据');
const m = await ev('({ mw:MW, mh:MH, cells:map.length, species:SPECIES.length, moves:Object.keys(MOVES).length, evo:Object.keys(EVO).length, avatars:Object.keys(AVATARS).length, pal:SPECIES.filter(function(s){return s.pal;}).length })');
ck('地图 216×156（9 倍）', m.mw === 216 && m.mh === 156 && m.cells === 33696, m.mw + '×' + m.mh + ' = ' + m.cells);
ck('物种 1205（帕鲁 0）', m.species === 1205 && m.pal === 0, m.species + ' 只 / 帕鲁 ' + m.pal);
ck('招式 1093 / 进化 567 / 头像 1205', m.moves === 1093 && m.evo === 567 && m.avatars === 1205, m.moves + '/' + m.evo + '/' + m.avatars);
const lr = await ev('LV_RANGE');
ck('九地区等级段正确', lr.plain[0] === 1 && lr.plain[1] === 25 && lr.flower[0] === 26 && lr.mine[0] === 36 && lr.desert[0] === 46 && lr.ocean[0] === 56 && lr.volcano[0] === 66 && lr.snow[0] === 66, JSON.stringify(lr));
console.log('\n【2】开局');
await ev("document.getElementById('btn-start').click()"); await wait(3000);
const sg = await ev("(function(){ var n=0; (typeof STARTER_GROUPS!=='undefined'?STARTER_GROUPS:[]).forEach(function(g){ STARTER_TAB=g.key; renderStarter(); var el=document.getElementById('starter-grid'); n+=el?el.querySelectorAll('.st-card').length:0; }); if(STARTER_GROUPS[0]){STARTER_TAB=STARTER_GROUPS[0].key;renderStarter();} return n; })()");
ck('初始伙伴 30 只', sg === 30, sg);
await ev("(function(){ document.querySelector('#starter-grid .st-card').click(); return 1; })()"); await wait(3500);
const w = await ev("(function(){ var cv=document.getElementById('game-canvas'); return { world:!document.getElementById('screen-world').classList.contains('hidden'), canvas:cv.width+'x'+cv.height, pos:S.pos, region:REGION_NAME[regionAt(S.pos.x,S.pos.y)], hint:(document.getElementById('hint')||{}).textContent||'' }; })()");
ck('进入世界（视野宽屏）', w.world && /^920x5\d\d$/.test(w.canvas), w.canvas);
ck('出生在平原 + 提示带等级段', w.region === '平原' && /Lv\.1~25/.test(w.hint), w.hint);
await shot('v18-01-开局');

console.log('\n【3】可达性（陆地 / 带水系宠）');
const reach = await ev("(function(){ function flood(block){ var seen=new Uint8Array(MW*MH); var q=[SPAWN.y*MW+SPAWN.x]; seen[q[0]]=1; for(var h=0;h<q.length;h++){ var c=q[h],x=c%MW,y=(c-x)/MW; var nb=[[x+1,y],[x-1,y],[x,y+1],[x,y-1]]; for(var k=0;k<4;k++){ var nx=nb[k][0],ny=nb[k][1]; if(nx<1||ny<1||nx>=MW-1||ny>=MH-1) continue; var i=ny*MW+nx; if(seen[i]||block[map[i]]) continue; seen[i]=1; q.push(i); } } return seen; } var B={}; B[T.TREE]=1;B[T.WATER]=1;B[T.LAVA]=1;B[T.ROCK]=1;B[T.DEEP]=1; var W={}; W[T.TREE]=1;W[T.LAVA]=1;W[T.ROCK]=1; var s1=flood(B), s2=flood(W); var st={}; for(var y=1;y<MH-1;y++)for(var x=1;x<MW-1;x++){ var r=ringRegion(x,y); st[r]=st[r]||{t:0,a:0,b:0}; st[r].t++; if(s1[y*MW+x])st[r].a++; if(s2[y*MW+x])st[r].b++; } var out={}; ['plain','flower','mine','desert','ocean','volcano','snow'].forEach(function(r){ var s=st[r]; if(s) out[r]={land:Math.round(s.a/s.t*100), water:Math.round(s.b/s.t*100)}; }); return out; })()");
let reachOk = true;
Object.entries(reach || {}).forEach(([r, v]) => { const ok = v.water >= 45; if (!ok) reachOk = false; console.log('     ' + r + '：陆地 ' + v.land + '% · 带水系 ' + v.water + '%'); });
ck('各地区都能走进去（带水系 ≥45%）', reachOk, JSON.stringify(reach));
const key = reach && reach.ocean ? reach.ocean.water : 0;
ck('海洋全图连通（带水系）', key >= 90, '海洋带水系 ' + key + '%');

console.log('\n【4】地区等级实测（真实开战读野怪等级）');
const lvReal = await ev("(function(){ var saved={x:S.pos.x,y:S.pos.y}; var p=selfPet(); var savLv=p.lv; var pt={}; for(var y=1;y<MH-1;y+=3)for(var x=1;x<MW-1;x+=3){ var r=regionAt(x,y); if(!pt[r]) pt[r]={x:x,y:y}; } var out=[]; [['plain',1],['flower',30],['mine',40],['desert',50],['ocean',60],['volcano',70],['snow',70]].forEach(function(it){ var q=pt[it[0]]; if(!q) return; S.pos={x:q.x,y:q.y}; p.lv=it[1]; p.hp=maxHpOf(p); var lvs=[]; for(var i=0;i<8;i++){ try{ var e=rollEnemy(); startWildBattle(e); if(B&&B.foe&&B.foe.lv) lvs.push(B.foe.lv); closeBattle(); }catch(err){} } if(!lvs.length){ out.push(REGION_NAME[it[0]]+' 无法开战'); return; } var mn=Math.min.apply(null,lvs), mx=Math.max.apply(null,lvs); var lrr=LV_RANGE[it[0]]; out.push(REGION_NAME[it[0]]+' 玩家Lv'+it[1]+' → 野怪 Lv'+mn+'~'+mx+'（段 '+lrr[0]+'~'+lrr[1]+'）'+(mn>=lrr[0]&&mx<=lrr[1]?' OK':' BAD')); }); S.pos=saved; p.lv=savLv; p.hp=maxHpOf(p); return out; })()");
(lvReal || []).forEach(l => console.log('     ' + l));
ck('野怪等级始终落在该地区等级段内', (lvReal || []).length > 0 && (lvReal || []).every(l => /OK/.test(l)), (lvReal || []).length + ' 个地区');
console.log('\n【5】训练师站位 / 医院');
const tr = await ev("(function(){ return TRAINERS.map(function(t){ return t.name+'@'+t.pos.x+','+t.pos.y+'='+REGION_NAME[ringRegion(t.pos.x,t.pos.y)]; }); })()");
const trOk = (tr || []).some(l => /火山/.test(l)) && (tr || []).some(l => /海洋/.test(l)) && (tr || []).some(l => /雪原/.test(l)) && (tr || []).some(l => /矿洞/.test(l)) && (tr || []).some(l => /荒漠/.test(l));
(tr || []).forEach(l => console.log('     ' + l));
ck('训练师分布到各主题地区', trOk, (tr || []).length + ' 位');
const hosp = await ev("(function(){ var hv=tileAt(HOSP.x,HOSP.y); var around=[[1,0],[-1,0],[0,1],[0,-1]].map(function(d){ return tileAt(HOSP.x+d[0],HOSP.y+d[1]); }); return { isHosp:hv===T.HOSP, aroundOk:around.every(function(v){ return v===T.PATH; }), dist:Math.abs(HOSP.x-SPAWN.x)+Math.abs(HOSP.y-SPAWN.y), region:REGION_NAME[regionAt(HOSP.x,HOSP.y)] }; })()");
ck('医院在图中心附近且可到达（四邻是路）', hosp.isHosp && hosp.aroundOk, '距出生点 ' + hosp.dist + ' 格 · ' + hosp.region);

console.log('\n【6】真实游玩：遇敌 → 战斗');
/* 回到平原（高草丛多的环），等级给了 5 级，边走边看是否遇到野怪 */
await ev("(function(){ try{ if(typeof B!=='undefined'&&B) closeBattle(); }catch(e){} S.pos={x:MAP_CX,y:MAP_CY+6}; var p=selfPet(); p.lv=5; p.hp=maxHpOf(p); return REGION_NAME[regionAt(S.pos.x,S.pos.y)]; })()");
await wait(600);
let enc = null;
for (let i = 0; i < 400 && !enc; i++) {
  const d = [[0,-1],[0,1],[-1,0],[1,0]][i % 4];
  await ev('(function(){ try{ move(' + d[0] + ',' + d[1] + '); }catch(e){} if(typeof B!==\'undefined\'&&B) return 1; if(Math.abs(S.pos.x-MAP_CX)>12||Math.abs(S.pos.y-MAP_CY)>12) S.pos={x:MAP_CX,y:MAP_CY+6}; return 1; })()');
  await wait(70);
  const st = await ev("(function(){ var ep=document.getElementById('enc-panel'); if(ep&&!ep.classList.contains('hidden')) return 'enc'; var bp=document.getElementById('screen-battle'); if(bp&&!bp.classList.contains('hidden')) return 'battle'; return null; })()");
  if (st) enc = st;
}
ck('在平原走到草丛能触发遇敌', !!enc, enc || '400 步未触发');
if (enc === 'enc') { await ev("(function(){ var b=document.getElementById('enc-fight'); if(b) b.click(); return 1; })()"); await wait(2800); }
const bs = await ev("(function(){ var row=document.getElementById('move-row'); var lr=LV_RANGE[regionAt(S.pos.x,S.pos.y)]; return { shown:!document.getElementById('screen-battle').classList.contains('hidden'), foe:(document.getElementById('enemy-name')||{}).textContent||'', moves:row?row.querySelectorAll('button').length:0, eLv:(typeof B!=='undefined'&&B&&B.foe)?B.foe.lv:0, lr:lr }; })()");
ck('战斗界面正常（4 技能 + 野怪等级在本地段内）', bs.shown && bs.moves === 4 && bs.eLv >= bs.lr[0] && bs.eLv <= bs.lr[1], bs.foe + ' · Lv' + bs.eLv + '（段 ' + bs.lr[0] + '~' + bs.lr[1] + '）· ' + bs.moves + ' 技能');
await shot('v18-02-战斗');
const fight = await ev("(async function(){ var out={turns:0,log:''}; for(var t=0;t<10;t++){ var b=[...document.querySelectorAll('#move-row button')].find(function(x){return !x.disabled;}); if(!b) break; b.click(); out.turns++; await new Promise(function(r){setTimeout(r,2500);}); var st=document.getElementById('screen-battle'); if(!st||st.classList.contains('hidden')) break; } var lf=document.getElementById('battle-log'); out.log=lf?lf.textContent.replace(/\\s+/g,' ').slice(-110):''; return out; })()");
ck('技能可释放、战斗能正常结束', fight.turns > 0 && fight.log.length > 5, fight.turns + ' 回合 · ' + fight.log);
console.log('\n【7】雪地地形渲染');
const snow = await ev("(function(){ var has=false; for(var i=0;i<map.length;i++) if(map[i]===T.SNOW){ has=true; break; } return { hasSnow:has, snowTiles:map.filter(function(v){return v===T.SNOW;}).length }; })()");
ck('雪原地形（白色雪地，非岩石）', snow.hasSnow && snow.snowTiles > 200, snow.snowTiles + ' 格雪地');
await ev("(function(){ S.pos={x:MAP_CX,y:13}; draw(); return 1; })()"); await wait(1200);
await shot('v18-03-雪原');
await ev("(function(){ S.pos={x:17,y:MAP_CY}; draw(); return 1; })()"); await wait(1200);
await shot('v18-04-火山');
await ev("(function(){ S.pos={x:200,y:MAP_CY}; draw(); return 1; })()"); await wait(1200);
await shot('v18-05-海洋');

console.log('\n=== 控制台异常 ' + errors.length + ' 条 ===');
errors.slice(0, 5).forEach(e => console.log('  ❌ ' + e));
const pass = P.filter(x => x.ok).length;
console.log('\n通过 ' + pass + ' / ' + P.length);
writeFileSync(SHOT + '/v18-accept-result.json', JSON.stringify({ url: URL_, pass, total: P.length, errors: errors.length, items: P }, null, 1), 'utf8');
ws.close();
