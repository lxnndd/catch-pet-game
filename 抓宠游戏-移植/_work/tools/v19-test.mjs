/* v19 测试：350×250 地图 + 8 城镇(医院/道馆) + 联盟 + 稀有度 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { WebSocket } from 'ws';
const URL_ = process.argv[2] || 'http://127.0.0.1:8727/';
const SHOT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/shots-v19';
mkdirSync(SHOT, { recursive: true });
let seq = 0;
const c = await (await fetch('http://127.0.0.1:9335/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(c.webSocketDebuggerUrl);
const pend = new Map(); const errs = []; const logs = [];
ws.on('message', d => {
  const m = JSON.parse(String(d));
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); return; }
  if (m.method === 'Runtime.exceptionThrown') errs.push(String(m.params.exceptionDetails?.exception?.description || '').slice(0, 160));
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'log') logs.push((m.params.args || []).map(a => a.value || '').join(' ').slice(0, 120));
});
await new Promise((r, j) => { ws.on('open', r); ws.on('error', j); });
const send = (mm, p = {}) => new Promise((res, rej) => { const id = ++seq; pend.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method: mm, params: p })); });
const ev = async (e) => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) return { __err: String(r.exceptionDetails.exception?.description || '').slice(0, 180) }; return r.result?.value; };
const wait = ms => new Promise(r => setTimeout(r, ms));
const shot = async (n) => { try { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(SHOT + '/' + n + '.png', Buffer.from(r.data, 'base64')); } catch (e) { } };
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await send('Page.navigate', { url: URL_ + '?t=' + Date.now() });
let ready = false;
for (let i = 0; i < 40; i++) { await wait(1000); if (await ev("(typeof MW!=='undefined'&&typeof S!=='undefined'&&!!S)?1:0") === 1) { ready = true; break; } }
console.log('加载就绪：' + (ready ? '✅' : '❌ 40 秒未就绪'));
await ev('(function(){ try{ localStorage.clear(); }catch(e){} return 1; })()');
await send('Page.navigate', { url: URL_ + '?t=' + Date.now() });
for (let i = 0; i < 40; i++) { await wait(1000); if (await ev("(typeof MW!=='undefined'&&typeof S!=='undefined'&&!!S)?1:0") === 1) break; }

console.log('\n【1】地图与数据');
const m = await ev('({ mw:MW, mh:MH, cells:map.length, towns:TOWNS.length, league:LEAGUE_POS, species:SPECIES.length })') || {};
console.log('  ' + JSON.stringify(m));

console.log('\n【2】8 座城镇（地区/医院/道馆/馆主）');
const towns = await ev("(function(){ return TOWNS.map(function(t){ return t.name+' @'+t.x+','+t.y+' 实际地区='+REGION_NAME[ringRegion(t.x,t.y)]+' · '+t.gymName+'('+t.gymType+') 馆主'+t.leaderName+' · 医院('+t.hosp.x+','+t.hosp.y+') 道馆('+t.gym.x+','+t.gym.y+')'; }); })()") || [];
towns.forEach(t => console.log('  ' + t));

console.log('\n【3】稀有度修正结果');
const rar = await ev("(function(){ var pk=SPECIES.filter(function(s){return s.pk;}); var g=pk.filter(function(s){return s.rarity===2;}); var tot=RARITY_W.reduce(function(a,b){return a+b;},0); return { god:g.length, godList:g.slice(0,10).map(function(s){return s.name;}), rare:pk.filter(function(s){return s.rarity===1;}).length, common:pk.filter(function(s){return s.rarity===0;}).length, prob:['常见 '+(RARITY_W[0]/tot*100).toFixed(1)+'%','稀有 '+(RARITY_W[1]/tot*100).toFixed(1)+'%','神兽 '+(RARITY_W[2]/tot*100).toFixed(3)+'%'] }; })()") || {};
console.log('  神兽 ' + rar.god + ' 只（' + (rar.godList || []).join('、') + '…）· 稀有 ' + rar.rare + ' · 常见 ' + rar.common);
console.log('  爆率：' + (rar.prob || []).join(' · '));
console.log('  超梦是神兽档：' + (await ev("(function(){ var s=SPECIES.find(function(x){return x.name==='超梦';}); return s? ('rarity='+s.rarity+' id='+s.id) : '未找到'; })()")));

console.log('\n【4】城镇可达性 + 道馆/医院能触发');
await ev("document.getElementById('btn-start').click()"); await wait(2800);
await ev("(function(){ document.querySelector('#starter-grid .st-card').click(); return 1; })()"); await wait(3500);
const gymTest = await ev("(function(){ if(!TOWNS.length) return {err:'没有城镇'}; var t=TOWNS[0]; S.pos={x:t.gym.x,y:t.gym.y}; move(1,0); return { tileAtGym: tileAt(t.gym.x,t.gym.y), panelShown: !document.getElementById('panel-gym').classList.contains('hidden'), title: (document.getElementById('gym-title')||{}).textContent||'' }; })()");
console.log('  踩道馆：' + JSON.stringify(gymTest));
const hospTest = await ev("(function(){ var t=TOWNS[0]; S.pos={x:t.hosp.x-1,y:t.hosp.y}; if(!TOWNS.length) return {err:'无'}; move(1,0); return { panelShown: !document.getElementById('panel-hosp').classList.contains('hidden') }; })()");
console.log('  踩医院：' + JSON.stringify(hospTest));
const leagueTest = await ev("(function(){ if(!LEAGUE_POS) return {err:'无联盟'}; var lp=LEAGUE_POS; S.pos={x:lp.x,y:lp.y+3}; move(0,-1); return { tile: tileAt(lp.x,lp.y), shown: !document.getElementById('panel-gym').classList.contains('hidden'), note: (document.getElementById('gym-note')||{}).textContent ? document.getElementById('gym-note').textContent.slice(0,60) : '' }; })()");
console.log('  踩联盟：' + JSON.stringify(leagueTest));
await shot('v19-01-town');
console.log('\n控制台 log（含游戏内日志）：' + JSON.stringify(logs.slice(0, 6)));
console.log('异常 ' + errs.length + ' 条'); errs.slice(0, 5).forEach(e => console.log('  ❌ ' + e));
ws.close();
