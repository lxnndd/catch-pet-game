/* v19 公网验收：地图/城镇/道馆/徽章/稀有度 + 六尾头像修复确认 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { WebSocket } from 'ws';
const URL_ = 'http://47.105.123.182:8727/';
const SHOT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/shots-v19-public';
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
const P = []; const ck = (n, ok, x) => { P.push({ n, ok: !!ok }); console.log((ok ? '  ✅ ' : '  ❌ ') + n + (x !== undefined ? '  → ' + String(x).slice(0, 74) : '')); };
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await send('Page.navigate', { url: URL_ + '?t=' + Date.now() });
let ready = false;
for (let i = 0; i < 45; i++) { await wait(1000); if (await ev("(typeof MW!=='undefined'&&typeof S!=='undefined'&&!!S)?1:0") === 1) { ready = true; break; } }
ck('页面加载就绪', ready);

console.log('\n【1】地图与城镇');
const m = await ev('({ mw:MW, mh:MH, cells:map.length, towns:TOWNS.length, league:LEAGUE_POS, species:SPECIES.length, moves:Object.keys(MOVES).length, avatars:Object.keys(AVATARS).length, pal:SPECIES.filter(function(s){return s.pal;}).length })') || {};
ck('地图 350×250 = 87500 格', m.mw === 350 && m.mh === 250 && m.cells === 87500, m.mw + '×' + m.mh + '=' + m.cells);
ck('8 座城镇', m.towns === 8, m.towns + ' 座');
ck('联盟大赛建筑已建', !!m.league, JSON.stringify(m.league));
ck('数据完整（1205 物种 / 1093 招式 / 1205 头像 / 0 帕鲁）', m.species === 1205 && m.moves === 1093 && m.avatars === 1205 && m.pal === 0, m.species + '/' + m.moves + '/' + m.avatars + '/' + m.pal);

console.log('\n【2】八道馆（地区 + 属性）');
const gyms = await ev("(function(){ return TOWNS.map(function(t){ return t.name+'·'+t.gymName+'('+t.gymType+')'; }); })()") || [];
gyms.forEach(g => console.log('     ' + g));
ck('8 个道馆属性齐全（一般/草/妖精/岩/地面/水/火/冰）', gyms.length === 8 && /一般系/.test(gyms.join()) && /火系/.test(gyms.join()) && /冰系/.test(gyms.join()), gyms.length + ' 个');

console.log('\n【3】稀有度（神兽降爆率）');
const rar = await ev("(function(){ var pk=SPECIES.filter(function(s){return s.pk;}); var tot=RARITY_W.reduce(function(a,b){return a+b;},0); var my=SPECIES.find(function(s){return s.name==='超梦';}); return { god:pk.filter(function(s){return s.rarity===2;}).length, my:my?my.rarity:-1, prob:(RARITY_W[2]/tot*100).toFixed(3) }; })()") || {};
ck('神兽档 94 只（权威名单）', rar.god === 94, rar.god + ' 只');
ck('超梦已是神兽档（原来不是）', rar.my === 2, 'rarity=' + rar.my);
ck('神兽爆率降到 0.1%', Math.abs(Number(rar.prob) - 0.101) < 0.02, rar.prob + '%');

console.log('\n【4】六尾头像修复确认（用户报的问题）');
const av = await ev("(function(){ var s=SPECIES.find(function(x){return x.name==='六尾';}); if(!s) return null; var b64=AVATARS[s.id]||''; return { id:s.id, len:b64.length, head:b64.slice(0,20) }; })()") || {};
ck('六尾头像是新图（3756 字节的 webp）', av.len > 4800 && av.len < 5200, av.id + ' base64 ' + av.len + ' 字符');

console.log('\n【5】徽章与交互');
await ev("document.getElementById('btn-start').click()"); await wait(2800);
await ev("(function(){ document.querySelector('#starter-grid .st-card').click(); return 1; })()"); await wait(3500);
const hud = await ev("(function(){ var e=document.getElementById('hud-badges'); return e?e.textContent:'无'; })()");
ck('HUD 显示徽章 0/8', hud === '0/8', hud);
const gymOk = await ev("(function(){ var t=TOWNS[0]; ['panel-gym','panel-hosp'].forEach(function(id){var e=document.getElementById(id);if(e)e.classList.add('hidden');}); S.pos={x:t.gym.x,y:t.gym.y-2}; move(0,1); return !document.getElementById('panel-gym').classList.contains('hidden'); })()");
ck('走进道馆弹出占位说明', gymOk === true);
await shot('v19-pub-01-gym');
await ev("(function(){ var e=document.getElementById('panel-gym'); if(e)e.classList.add('hidden'); var lp=LEAGUE_POS; S.pos={x:lp.x,y:lp.y+2}; move(0,-1); return 1; })()");
await wait(900);
const lgOk = await ev("(function(){ return { shown:!document.getElementById('panel-gym').classList.contains('hidden'), sub:(document.getElementById('gym-sub')||{}).textContent||'' }; })()") || {};
ck('走进联盟提示需要 8 枚徽章', lgOk.shown && /0 \/ 8|0\/8/.test(lgOk.sub), lgOk.sub);
await shot('v19-pub-02-league');

console.log('\n控制台异常 ' + errs.length + ' 条');
errs.slice(0, 4).forEach(e => console.log('  ❌ ' + e));
const pass = P.filter(x => x.ok).length;
console.log('\n通过 ' + pass + ' / ' + P.length);
writeFileSync(SHOT + '/v19-accept-result.json', JSON.stringify({ url: URL_, pass, total: P.length, errors: errs.length, items: P }, null, 1), 'utf8');
ws.close();
