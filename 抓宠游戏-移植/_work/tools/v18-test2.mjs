/* v18 实测 v2（拆分成多个小 _ev 调用，避免模板字符串嵌套出错） */
import { writeFileSync, mkdirSync } from 'node:fs';
import { WebSocket } from 'ws';
const URL_ = process.argv[2] || 'http://127.0.0.1:8727/';
const PORT = process.argv[3] || '9335';
const SHOT = process.argv[4] || 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/shots-v18';
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
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: 480, height: 940, deviceScaleFactor: 2, mobile: true });
await send('Page.navigate', { url: URL_ + '?t=' + Date.now() });
await wait(12000);
await ev('(function(){ try{ localStorage.clear(); }catch(e){} return 1; })()');
await send('Page.navigate', { url: URL_ + '?t=' + Date.now() });
await wait(12000);

console.log('=== 地图基本参数 ===');
console.log(JSON.stringify(await ev('({ MW:MW, MH:MH, cells:map.length, CX:MAP_CX, CY:MAP_CY, HOSP:HOSP, SPAWN:SPAWN })'), null, 1));
console.log('等级段表: ' + JSON.stringify(await ev('LV_RANGE')));

await ev("document.getElementById('btn-start').click()");
await wait(3000);
await ev("(function(){ document.querySelector('#starter-grid .st-card').click(); return 1; })()");
await wait(3500);
console.log('\n=== 进入世界 ===');
console.log(JSON.stringify(await ev("(function(){ var cv=document.getElementById('game-canvas'); return { world:!document.getElementById('screen-world').classList.contains('hidden'), canvas:cv?(cv.width+'x'+cv.height):'none', pos:S.pos, region:REGION_NAME[regionAt(S.pos.x,S.pos.y)], hint:(document.getElementById('hint')||{}).textContent||'' }; })()"), null, 1));
await shot('v18-01-spawn');

console.log('\n=== 九地区抽样坐标 + 等级段 ===');
const regions = await ev("(function(){ var found={}; for(var y=1;y<MH-1;y+=4) for(var x=1;x<MW-1;x+=4){ var r=regionAt(x,y); if(!found[r]) found[r]=x+','+y; } return found; })()");
console.log(JSON.stringify(regions, null, 1));

console.log('\n=== 可达性（游戏内实算）===');
const reach = await ev("(function(){ var B={}; B[T.TREE]=1;B[T.WATER]=1;B[T.LAVA]=1;B[T.ROCK]=1;B[T.DEEP]=1; var seen=new Uint8Array(MW*MH); var q=[SPAWN.y*MW+SPAWN.x]; seen[q[0]]=1; for(var h=0;h<q.length;h++){ var cur=q[h],x=cur%MW,y=(cur-x)/MW; var nb=[[x+1,y],[x-1,y],[x,y+1],[x,y-1]]; for(var k=0;k<4;k++){ var nx=nb[k][0],ny=nb[k][1]; if(nx<1||ny<1||nx>=MW-1||ny>=MH-1) continue; var i2=ny*MW+nx; if(seen[i2]||B[map[i2]]) continue; seen[i2]=1; q.push(i2); } } var W={}; W[T.TREE]=1;W[T.LAVA]=1;W[T.ROCK]=1; var sw=new Uint8Array(MW*MH); var qw=[SPAWN.y*MW+SPAWN.x]; sw[qw[0]]=1; for(var h2=0;h2<qw.length;h2++){ var c2=qw[h2],x2=c2%MW,y2=(c2-x2)/MW; var nb2=[[x2+1,y2],[x2-1,y2],[x2,y2+1],[x2,y2-1]]; for(var k2=0;k2<4;k2++){ var nx2=nb2[k2][0],ny2=nb2[k2][1]; if(nx2<1||ny2<1||nx2>=MW-1||ny2>=MH-1) continue; var j2=ny2*MW+nx2; if(sw[j2]||W[map[j2]]) continue; sw[j2]=1; qw.push(j2); } } var st={}; for(var y3=1;y3<MH-1;y3++)for(var x3=1;x3<MW-1;x3++){ var r3=ringRegion(x3,y3); st[r3]=st[r3]||{t:0,o:0,w:0}; st[r3].t++; if(seen[y3*MW+x3]) st[r3].o++; if(sw[y3*MW+x3]) st[r3].w++; } var out=[]; ['plain','forest','water','flower','mine','desert','ocean','volcano','snow'].forEach(function(r){ var s=st[r]; if(!s) return; out.push(REGION_NAME[r]+' 总'+s.t+' 陆地'+s.o+'('+Math.round(s.o/s.t*100)+'%) 带水系'+s.w+'('+Math.round(s.w/s.t*100)+'%)'); }); return out; })()");
(reach || []).forEach(l => console.log('  ' + l));

console.log('\n=== 等级验证：不同玩家等级在各地区遇到的野怪等级 ===');
const lvtest = await ev("(function(){ var pt={}; for(var y=1;y<MH-1;y+=3)for(var x=1;x<MW-1;x+=3){ var r=regionAt(x,y); if(!pt[r]) pt[r]={x:x,y:y}; } var names=['plain','flower','mine','desert','ocean','volcano','snow']; var out=[]; names.forEach(function(r){ var p2=pt[r]; if(!p2) return; var lr=LV_RANGE[r]; [1,40,80].forEach(function(plv){ var lo=99,hi=0; for(var i=0;i<20;i++){ var f=clamp(plv+ri(-3,3),1,100); f=clamp(f,lr[0],lr[1]); if(plv<=2) f=Math.min(f,3); if(f<lo)lo=f; if(f>hi)hi=f; } out.push(REGION_NAME[r]+'('+lr[0]+'~'+lr[1]+') 玩家Lv'+plv+' → 野怪 Lv'+lo+'~'+hi); }); }); return out; })()");
(lvtest || []).forEach(l => console.log('  ' + l));

console.log('\n=== 走到各方向的移动测试（各 8 步）===');
const walk = await ev("(function(){ var out=[]; var dirs=[[1,0],[-1,0],[0,1],[0,-1]]; dirs.forEach(function(d){ var start={x:S.pos.x,y:S.pos.y}; var moved=0; for(var i=0;i<8;i++){ var before={x:S.pos.x,y:S.pos.y}; move(d[0],d[1]); if(S.pos.x!==before.x||S.pos.y!==before.y) moved++; } out.push('方向['+d[0]+','+d[1]+'] 走了'+moved+'/8 步 → 到('+S.pos.x+','+S.pos.y+') '+REGION_NAME[regionAt(S.pos.x,S.pos.y)]); S.pos=start; }); return out; })()");
(walk || []).forEach(l => console.log('  ' + l));
await shot('v18-02-world');

console.log('\n异常 ' + errors.length + ' 条');
errors.slice(0, 5).forEach(e => console.log('  ❌ ' + e));
if (!errors.length) console.log('  ✅ 零异常');
ws.close();
