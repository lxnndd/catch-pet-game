import { writeFileSync, mkdirSync } from 'node:fs';
import { WebSocket } from 'ws';
const SHOT='C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/shots-v25';
mkdirSync(SHOT,{recursive:true});
let seq=0;
const c=await (await fetch('http://127.0.0.1:9335/json/new?about:blank',{method:'PUT'})).json();
const ws=new WebSocket(c.webSocketDebuggerUrl);
const pend=new Map();
ws.on('message',d=>{const m=JSON.parse(String(d)); if(m.id&&pend.has(m.id)){const p=pend.get(m.id);pend.delete(m.id);m.error?p.reject(new Error(JSON.stringify(m.error))):p.resolve(m.result);}});
await new Promise((r,j)=>{ws.on('open',r);ws.on('error',j);});
const send=(mm,p={})=>new Promise((res,rej)=>{const id=++seq;pend.set(id,{resolve:res,reject:rej});ws.send(JSON.stringify({id,method:mm,params:p}));});
const ev=async e=>{const r=await send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true}); if(r.exceptionDetails) return {__err:String(r.exceptionDetails.exception?.description||'').slice(0,150)}; return r.result?.value;};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const shot=async n=>{try{const r=await send('Page.captureScreenshot',{format:'png'});writeFileSync(SHOT+'/'+n+'.png',Buffer.from(r.data,'base64'));}catch(e){}};
await send('Runtime.enable');await send('Page.enable');await send('Network.enable');
await send('Network.setCacheDisabled',{cacheDisabled:true});
await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});
await send('Page.navigate',{url:'http://127.0.0.1:8727/?t='+Date.now()});
for(let i=0;i<60;i++){await wait(250); if(await ev("(typeof MW!=='undefined'&&typeof S!=='undefined'&&!!S)?1:0")===1) break;}
await ev('(function(){try{localStorage.clear();}catch(e){}return 1;})()');
await send('Page.navigate',{url:'http://127.0.0.1:8727/?t='+Date.now()});
for(let i=0;i<60;i++){await wait(250); if(await ev("(typeof MW!=='undefined'&&typeof S!=='undefined'&&!!S)?1:0")===1) break;}
await ev("document.getElementById('btn-start').click()");await wait(2500);
await ev("(function(){document.querySelector('#starter-grid .st-card').click();return 1;})()");await wait(3000);
await shot('v25-01-spawn');
console.log('出生点截图 ✅');
/* 走到小镇外看看（向上走 20 步） */
await ev("(function(){ for(var i=0;i<20;i++) move(0,-1); draw(); return 1; })()");
await wait(800); await shot('v25-02-outside');
console.log('镇外截图 ✅ · 当前地区：'+await ev("REGION_NAME[regionAt(S.pos.x,S.pos.y)]"));
ws.close();
