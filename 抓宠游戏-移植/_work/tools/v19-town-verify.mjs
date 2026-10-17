import { WebSocket } from 'ws';
let seq=0;
const c=await (await fetch('http://127.0.0.1:9335/json/new?about:blank',{method:'PUT'})).json();
const ws=new WebSocket(c.webSocketDebuggerUrl);
const pend=new Map(); const errs=[];
ws.on('message',d=>{const m=JSON.parse(String(d)); if(m.id&&pend.has(m.id)){const p=pend.get(m.id);pend.delete(m.id);m.error?p.reject(new Error(JSON.stringify(m.error))):p.resolve(m.result);return;} if(m.method==='Runtime.exceptionThrown') errs.push(String(m.params.exceptionDetails?.exception?.description||'').slice(0,150));});
await new Promise((r,j)=>{ws.on('open',r);ws.on('error',j);});
const send=(mm,p={})=>new Promise((res,rej)=>{const id=++seq;pend.set(id,{resolve:res,reject:rej});ws.send(JSON.stringify({id,method:mm,params:p}));});
const ev=async e=>{const r=await send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true}); if(r.exceptionDetails) return {__err:String(r.exceptionDetails.exception?.description||'').slice(0,160)}; return r.result?.value;};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
await send('Runtime.enable');await send('Page.enable');await send('Network.enable');
await send('Network.setCacheDisabled',{cacheDisabled:true});
await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});
await send('Page.navigate',{url:'http://127.0.0.1:8727/?t='+Date.now()});
for(let i=0;i<40;i++){await wait(1000); if(await ev("(typeof MW!=='undefined'&&typeof S!=='undefined'&&!!S)?1:0")===1) break;}
await ev('(function(){try{localStorage.clear();}catch(e){}return 1;})()');
await send('Page.navigate',{url:'http://127.0.0.1:8727/?t='+Date.now()});
for(let i=0;i<40;i++){await wait(1000); if(await ev("(typeof MW!=='undefined'&&typeof S!=='undefined'&&!!S)?1:0")===1) break;}
console.log('城镇数：'+await ev('TOWNS.length'));
console.log(JSON.stringify(await ev("TOWNS.map(function(t){return t.name+'='+REGION_NAME[regionAtM?regionAt(t.x,t.y):t.region];})")));
await ev("document.getElementById('btn-start').click()");await wait(2800);
await ev("(function(){document.querySelector('#starter-grid .st-card').click();return 1;})()");await wait(3500);
/* 联盟：先关掉所有面板，再站到联盟格上，然后朝联盟走一步 */
const lg=await ev("(function(){ if(!LEAGUE_POS) return '无联盟'; ['panel-gym','panel-hosp','panel-party','panel-dex'].forEach(function(id){ var e=document.getElementById(id); if(e) e.classList.add('hidden'); }); var lp=LEAGUE_POS; S.pos={x:lp.x,y:lp.y+2}; move(0,-1); return { shown:!document.getElementById('panel-gym').classList.contains('hidden'), title:(document.getElementById('gym-title')||{}).textContent||'', note:(document.getElementById('gym-note')||{}).textContent ? document.getElementById('gym-note').textContent.replace(/\s+/g,' ').slice(0,80) : '' }; })()");
console.log('联盟测试：'+JSON.stringify(lg));
/* 每座城镇的道馆都能触发 */
const allGyms=await ev("(function(){ var out=[]; TOWNS.forEach(function(t){ ['panel-gym','panel-hosp'].forEach(function(id){ var e=document.getElementById(id); if(e) e.classList.add('hidden'); }); S.pos={x:t.gym.x,y:t.gym.y-2}; move(0,1); out.push(t.name+': '+((document.getElementById('gym-title')||{}).textContent||'未触发')); }); return out; })()");
console.log('各城镇道馆：'); (allGyms||[]).forEach(x=>console.log('  '+x));
/* 每座城镇的医院都能触发 */
const allHosp=await ev("(function(){ var out=[]; TOWNS.forEach(function(t){ ['panel-gym','panel-hosp'].forEach(function(id){ var e=document.getElementById(id); if(e) e.classList.add('hidden'); }); S.pos={x:t.hosp.x-1,y:t.hosp.y}; move(1,0); out.push(t.name+': '+(document.getElementById('panel-hosp').classList.contains('hidden')?'❌未触发':'✅可治疗')); }); return out; })()");
console.log('各城镇医院：'); (allHosp||[]).forEach(x=>console.log('  '+x));
console.log('异常 '+errs.length+' 条'); errs.slice(0,3).forEach(e=>console.log('  '+e));
ws.close();
