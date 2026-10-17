import { WebSocket } from 'ws';
let seq=0;
const c=await (await fetch('http://127.0.0.1:9335/json/new?about:blank',{method:'PUT'})).json();
const ws=new WebSocket(c.webSocketDebuggerUrl);
const pend=new Map();
ws.on('message',d=>{const m=JSON.parse(String(d)); if(m.id&&pend.has(m.id)){const p=pend.get(m.id);pend.delete(m.id);m.error?p.reject(new Error(JSON.stringify(m.error))):p.resolve(m.result);}});
await new Promise((r,j)=>{ws.on('open',r);ws.on('error',j);});
const send=(m,p={})=>new Promise((res,rej)=>{const id=++seq;pend.set(id,{resolve:res,reject:rej});ws.send(JSON.stringify({id,method:m,params:p}));});
const ev=async e=>{const r=await send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true}); if(r.exceptionDetails) return {__err:String(r.exceptionDetails.exception?.description||'').slice(0,150)}; return r.result?.value;};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
await send('Runtime.enable');await send('Page.enable');await send('Network.enable');
await send('Network.setCacheDisabled',{cacheDisabled:true});
await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});
await send('Page.navigate',{url:'http://47.105.123.182:8727/?t='+Date.now()});
for(let i=0;i<25;i++){await wait(1000); if(await ev("(typeof MW!=='undefined'&&typeof S!=='undefined'&&!!S)?1:0")===1) break;}
await ev('(function(){try{localStorage.clear();}catch(e){}return 1;})()');
await send('Page.navigate',{url:'http://47.105.123.182:8727/?t='+Date.now()});
for(let i=0;i<25;i++){await wait(1000); if(await ev("(typeof MW!=='undefined'&&typeof S!=='undefined'&&!!S)?1:0")===1) break;}
console.log('点开始前：'+JSON.stringify(await ev("(function(){ return { titleHidden:document.getElementById('screen-title').classList.contains('hidden'), starterHidden:document.getElementById('screen-starter').classList.contains('hidden'), worldHidden:document.getElementById('screen-world').classList.contains('hidden'), party:S.party.length }; })()")));
await ev("document.getElementById('btn-start').click()");await wait(2800);
console.log('点开始后：'+JSON.stringify(await ev("(function(){ var g=document.getElementById('starter-grid'); return { cards:g?g.querySelectorAll('.st-card').length:0, starterHidden:document.getElementById('screen-starter').classList.contains('hidden'), worldHidden:document.getElementById('screen-world').classList.contains('hidden') }; })()")));
const clicked=await ev("(function(){ var c=document.querySelector('#starter-grid .st-card'); if(!c) return 'no card'; c.click(); return 'clicked:'+c.textContent.replace(/\\s+/g,' ').slice(0,20); })()");
console.log('点伙伴：'+JSON.stringify(clicked));
await wait(3500);
const st=await ev("(function(){ return { worldHidden:document.getElementById('screen-world').classList.contains('hidden'), starterHidden:document.getElementById('screen-starter').classList.contains('hidden'), titleHidden:document.getElementById('screen-title').classList.contains('hidden'), party:S.party.length, pos:S.pos, region:REGION_NAME[regionAt(S.pos.x,S.pos.y)], tall:(function(){ for(var y=1;y<MH-1;y++)for(var x=1;x<MW-1;x++){ if(map[y*MW+x]===T.TALL) return {x:x,y:y}; } return null; })() }; })()");
console.log('进世界状态：'+JSON.stringify(st));
/* 站到草丛上，跑 move 20 次看 steps 有没有加 */
const r=await ev("(function(){ if(S.party.length===0) return 'no party'; var t=null; for(var y=1;y<MH-1;y++)for(var x=1;x<MW-1;x++){ if(map[y*MW+x]===T.TALL){ var d=Math.abs(x-MAP_CX)+Math.abs(y-MAP_CY); if(!t||d<t.d) t={x:x,y:y,d:d}; } } S.pos={x:t.x,y:t.y}; var before=S.steps; for(var i=0;i<20;i++){ move([0,1,0,-1][i%4],[1,0,-1,0][i%4]); } return { stepsAdded:S.steps-before, atTall:map[S.pos.y*MW+S.pos.x]===T.TALL, region:REGION_NAME[regionAt(S.pos.x,S.pos.y)] }; })()");
console.log('移动测试：'+JSON.stringify(r));
ws.close();
