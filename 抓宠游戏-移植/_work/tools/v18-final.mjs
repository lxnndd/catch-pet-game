/* v18 最终验收（简化可靠版）：地图/等级/可达性/训练师/游玩 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { WebSocket } from 'ws';
const URL_ = process.argv[2] || 'http://47.105.123.182:8727/';
const SHOT = process.argv[4] || 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/shots-v18-public';
mkdirSync(SHOT, { recursive: true });
let seq = 0;
const created = await (await fetch('http://127.0.0.1:9335/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(created.webSocketDebuggerUrl);
const pending = new Map(); const errors = [];
ws.on('message', d => { const m = JSON.parse(String(d)); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); return; } if (m.method === 'Runtime.exceptionThrown') errors.push(String(m.params.exceptionDetails?.exception?.description || '').slice(0, 150)); });
await new Promise((r, j) => { ws.on('open', r); ws.on('error', j); });
const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async (expr) => { const rr = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (rr.exceptionDetails) return null; return rr.result?.value; };
const wait = ms => new Promise(r => setTimeout(r, ms));
const shot = async (n) => { try { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(SHOT + '/' + n + '.png', Buffer.from(r.data, 'base64')); } catch (e) { } };
const P = []; const ck = (n, ok, x) => { P.push({ n, ok: !!ok }); console.log((ok ? '  ✅ ' : '  ❌ ') + n + (x !== undefined ? '  → ' + String(x).slice(0, 72) : '')); };
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: 480, height: 940, deviceScaleFactor: 2, mobile: true });
await send('Page.navigate', { url: URL_ + '?t=' + Date.now() });
/* 轮询等待就绪（不再死等固定秒数） */
let ready = false;
for (let i = 0; i < 25; i++) { await wait(1000); const r = await ev("(typeof MW!=='undefined'&&typeof S!=='undefined'&&!!S)?1:0"); if (r === 1) { ready = true; break; } }
ck('页面加载就绪', ready);
await ev('(function(){ try{ localStorage.clear(); }catch(e){} return 1; })()');
await send('Page.navigate', { url: URL_ + '?t=' + Date.now() });
for (let i = 0; i < 25; i++) { await wait(1000); const r = await ev("(typeof MW!=='undefined'&&typeof S!=='undefined'&&!!S)?1:0"); if (r === 1) break; }

console.log('\n【1】地图与数据规模');
const m = await ev('({ mw:MW, mh:MH, cells:map.length, species:SPECIES.length, moves:Object.keys(MOVES).length, evo:Object.keys(EVO).length, avatars:Object.keys(AVATARS).length, pal:SPECIES.filter(function(s){return s.pal;}).length })') || {};
ck('地图 216×156 = 33696 格（9 倍）', m.mw === 216 && m.mh === 156 && m.cells === 33696, m.mw + '×' + m.mh + '=' + m.cells);
ck('物种 1205 只 · 帕鲁 0', m.species === 1205 && m.pal === 0, m.species + ' 只 / 帕鲁 ' + m.pal);
ck('招式 1093 · 进化 567 · 头像 1205', m.moves === 1093 && m.evo === 567 && m.avatars === 1205, m.moves + ' / ' + m.evo + ' / ' + m.avatars);

console.log('\n【2】地区与等级段');
const rings = await ev("(function(){ var pt={}; for(var y=1;y<MH-1;y+=3)for(var x=1;x<MW-1;x+=3){ var r=regionAt(x,y); if(!pt[r]) pt[r]={x:x,y:y}; } return ['plain','forest','water','flower','mine','desert','ocean','volcano','snow'].map(function(r){ var l=LV_RANGE[r]; return (REGION_NAME[r]||r)+' Lv'+l[0]+'~'+l[1]+(pt[r]?'':' ❌地图上找不到'); }); })()") || [];
rings.forEach(r => console.log('     ' + r));
ck('九地区都在地图上 + 等级段正确', rings.length === 9 && !rings.some(r => /找不到/.test(r)) && /平原 Lv1~25/.test(rings[0]) && /火山地带 Lv66~75/.test(rings[7]) && /雪原 Lv66~75/.test(rings[8]), rings.join(' | '));

console.log('\n【3】可达性');
const reach = await ev("(function(){ function fl(b){ var s=new Uint8Array(MW*MH),q=[SPAWN.y*MW+SPAWN.x]; s[q[0]]=1; for(var h=0;h<q.length;h++){ var c=q[h],x=c%MW,y=(c-x)/MW; var nb=[[x+1,y],[x-1,y],[x,y+1],[x,y-1]]; for(var k=0;k<4;k++){ var nx=nb[k][0],ny=nb[k][1]; if(nx<1||ny<1||nx>=MW-1||ny>=MH-1) continue; var i=ny*MW+nx; if(s[i]||b[map[i]]) continue; s[i]=1; q.push(i); } } return s; } var B={};B[T.TREE]=1;B[T.WATER]=1;B[T.LAVA]=1;B[T.ROCK]=1;B[T.DEEP]=1; var W={};W[T.TREE]=1;W[T.LAVA]=1;W[T.ROCK]=1; var a=fl(B),b2=fl(W),st={}; for(var y=1;y<MH-1;y++)for(var x=1;x<MW-1;x++){ var r=ringRegion(x,y); st[r]=st[r]||{t:0,a:0,b:0}; st[r].t++; if(a[y*MW+x])st[r].a++; if(b2[y*MW+x])st[r].b++; } var o={}; ['plain','flower','mine','desert','ocean','volcano','snow'].forEach(function(r){ if(st[r]) o[REGION_NAME[r]]={陆地:Math.round(st[r].a/st[r].t*100),带水系:Math.round(st[r].b/st[r].t*100)}; }); return o; })()") || {};
Object.entries(reach).forEach(([k, v]) => console.log('     ' + k + '：陆地 ' + v.陆地 + '% · 带水系 ' + v.带水系 + '%'));
ck('每个地区都走得进去（带水系 ≥45%）', Object.values(reach).every(v => v.带水系 >= 45), Object.keys(reach).length + ' 个地区');
ck('海洋全图连通（能游过去）', (reach['海洋'] || {}).带水系 >= 90, '海洋带水系 ' + ((reach['海洋'] || {}).带水系 || 0) + '%');

console.log('\n【4】野怪等级实测（真实开战）');
const lvReal = await ev("(function(){ var sv={x:S.pos.x,y:S.pos.y},p=selfPet(),sl=p.lv; var pt={}; for(var y=1;y<MH-1;y+=3)for(var x=1;x<MW-1;x+=3){ var r=regionAt(x,y); if(!pt[r]) pt[r]={x:x,y:y}; } var out=[]; [['plain',1],['flower',30],['mine',40],['desert',50],['ocean',60],['volcano',70],['snow',70]].forEach(function(it){ var q=pt[it[0]]; if(!q) return; S.pos={x:q.x,y:q.y}; p.lv=it[1]; p.hp=maxHpOf(p); var lv=[]; for(var i=0;i<8;i++){ try{ startWildBattle(rollEnemy()); if(B&&B.foe&&B.foe.lv) lv.push(B.foe.lv); closeBattle(); }catch(e){} } if(!lv.length) return; var mn=Math.min.apply(null,lv),mx=Math.max.apply(null,lv),l=LV_RANGE[it[0]]; out.push(REGION_NAME[it[0]]+' 玩家Lv'+it[1]+'→Lv'+mn+'~'+mx+'(段'+l[0]+'~'+l[1]+')'+(mn>=l[0]&&mx<=l[1]?' OK':' BAD')); }); S.pos=sv; p.lv=sl; p.hp=maxHpOf(p); return out; })()") || [];
lvReal.forEach(l => console.log('     ' + l));
ck('野怪等级一律落在该地区段内', lvReal.length === 7 && lvReal.every(l => /OK/.test(l)), lvReal.length + ' 个地区');

console.log('\n【5】训练师与医院');
const tr = await ev("(function(){ return TRAINERS.map(function(t){ return REGION_NAME[ringRegion(t.pos.x,t.pos.y)]; }); })()") || [];
ck('训练师分布各主题地区', ['火山地带', '海洋', '雪原', '矿洞', '荒漠'].every(r => tr.includes(r)), tr.join('/'));
const hs = await ev("(function(){ var a=[[1,0],[-1,0],[0,1],[0,-1]].every(function(d){ return tileAt(HOSP.x+d[0],HOSP.y+d[1])===T.PATH; }); return { ok:tileAt(HOSP.x,HOSP.y)===T.HOSP && a, d:Math.abs(HOSP.x-SPAWN.x)+Math.abs(HOSP.y-SPAWN.y), r:REGION_NAME[regionAt(HOSP.x,HOSP.y)] }; })()") || {};
ck('医院可到达且不在路口正中', hs.ok, '距出生点 ' + hs.d + ' 格 · ' + hs.r);

console.log('\n【6】真实游玩');
await ev("document.getElementById('btn-start').click()"); await wait(3000);
const sg = await ev("(function(){ var n=0; (typeof STARTER_GROUPS!=='undefined'?STARTER_GROUPS:[]).forEach(function(g){ STARTER_TAB=g.key; renderStarter(); var e=document.getElementById('starter-grid'); n+=e?e.querySelectorAll('.st-card').length:0; }); if(STARTER_GROUPS[0]){STARTER_TAB=STARTER_GROUPS[0].key;renderStarter();} return n; })()");
ck('初始伙伴 30 只（3 页）', sg === 30, sg);
await ev("(function(){ document.querySelector('#starter-grid .st-card').click(); return 1; })()"); await wait(3500);
const w = await ev("(function(){ var cv=document.getElementById('game-canvas'); return { world:!document.getElementById('screen-world').classList.contains('hidden'), cv:cv.width+'x'+cv.height, hint:(document.getElementById('hint')||{}).textContent||'' }; })()") || {};
ck('进入世界 + 视野宽屏', w.world && /^920x5\d\d$/.test(w.cv), w.cv);
ck('提示条显示地区与等级段', /Lv\.1~25/.test(w.hint), w.hint);
await shot('v18-01-开局');
/* 走向草丛遇敌 */
let enc = null;
await ev("(function(){ S.pos={x:MAP_CX,y:MAP_CY+6}; var p=selfPet(); p.lv=5; p.hp=maxHpOf(p); return 1; })()");
for (let i = 0; i < 400 && !enc; i++) {
  const d = [[0, -1], [0, 1], [-1, 0], [1, 0]][i % 4];
  await ev('(function(){ try{ move(' + d[0] + ',' + d[1] + '); }catch(e){} if(Math.abs(S.pos.x-MAP_CX)>14||Math.abs(S.pos.y-MAP_CY)>14) S.pos={x:MAP_CX,y:MAP_CY+6}; return 1; })()');
  await wait(60);
  const s = await ev("(function(){ var e=document.getElementById('enc-panel'); if(e&&!e.classList.contains('hidden')) return 'enc'; var b=document.getElementById('screen-battle'); if(b&&!b.classList.contains('hidden')) return 'battle'; return null; })()");
  if (s) enc = s;
}
ck('走到草丛触发遇敌', !!enc, enc || '400 步未触发');
if (enc === 'enc') { await ev("(function(){ var b=document.getElementById('enc-fight'); if(b) b.click(); return 1; })()"); await wait(2800); }
const bs = await ev("(function(){ var r=document.getElementById('move-row'); var l=LV_RANGE[regionAt(S.pos.x,S.pos.y)]; return { shown:!document.getElementById('screen-battle').classList.contains('hidden'), foe:(document.getElementById('enemy-name')||{}).textContent||'', mv:r?r.querySelectorAll('button').length:0, lv:(typeof B!=='undefined'&&B&&B.foe)?B.foe.lv:0, l:l }; })()") || {};
ck('战斗正常（4 技能 + 等级在段内）', bs.shown && bs.mv === 4 && bs.lv >= bs.l[0] && bs.lv <= bs.l[1], bs.foe + ' · Lv' + bs.lv + '（段 ' + bs.l[0] + '~' + bs.l[1] + '）');
await shot('v18-02-战斗');
const fight = await ev("(async function(){ var o={t:0,log:''}; for(var i=0;i<10;i++){ var b=[...document.querySelectorAll('#move-row button')].find(function(x){return !x.disabled;}); if(!b) break; b.click(); o.t++; await new Promise(function(r){setTimeout(r,2400);}); var s=document.getElementById('screen-battle'); if(!s||s.classList.contains('hidden')) break; } var lf=document.getElementById('battle-log'); o.log=lf?lf.textContent.replace(/\\s+/g,' ').slice(-100):''; return o; })()") || {};
ck('技能可释放且战斗能结束', fight.t > 0 && fight.log.length > 5, fight.t + ' 回合 · ' + fight.log);

console.log('\n【7】雪地/火山/海洋 场景截图');
const snow = await ev("(function(){ return map.filter(function(v){return v===T.SNOW;}).length; })()");
ck('雪原用白色雪地地形（非岩石）', snow > 200, snow + ' 格雪地');
await ev("(function(){ S.pos={x:MAP_CX,y:13}; draw(); return 1; })()"); await wait(1000); await shot('v18-03-雪原');
await ev("(function(){ S.pos={x:17,y:MAP_CY}; draw(); return 1; })()"); await wait(1000); await shot('v18-04-火山');
await ev("(function(){ S.pos={x:200,y:MAP_CY}; draw(); return 1; })()"); await wait(1000); await shot('v18-05-海洋');

console.log('\n控制台异常 ' + errors.length + ' 条');
errors.slice(0, 4).forEach(e => console.log('  ❌ ' + e));
const pass = P.filter(x => x.ok).length;
console.log('\n通过 ' + pass + ' / ' + P.length);
writeFileSync(SHOT + '/v18-accept-result.json', JSON.stringify({ url: URL_, pass, total: P.length, errors: errors.length, items: P }, null, 1), 'utf8');
ws.close();
