import { WebSocket } from 'ws';
let seq=0;
const c=await (await fetch('http://127.0.0.1:9335/json/new?about:blank',{method:'PUT'})).json();
const ws=new WebSocket(c.webSocketDebuggerUrl);
const pend=new Map();
ws.on('message',d=>{const m=JSON.parse(String(d)); if(m.id&&pend.has(m.id)){const p=pend.get(m.id);pend.delete(m.id);m.error?p.reject(new Error(JSON.stringify(m.error))):p.resolve(m.result);}});
await new Promise((r,j)=>{ws.on('open',r);ws.on('error',j);});
const send=(mm,p={})=>new Promise((res,rej)=>{const id=++seq;pend.set(id,{resolve:res,reject:rej});ws.send(JSON.stringify({id,method:mm,params:p}));});
const ev=async e=>{const r=await send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true}); if(r.exceptionDetails) return {__err:String(r.exceptionDetails.exception?.description||'').slice(0,150)}; return r.result?.value;};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
await send('Runtime.enable');await send('Page.enable');await send('Network.enable');
await send('Network.setCacheDisabled',{cacheDisabled:true});
await send('Page.navigate',{url:'http://127.0.0.1:8727/?t='+Date.now()});
for(let i=0;i<45;i++){await wait(1000); if(await ev("(typeof MW!=='undefined'&&typeof S!=='undefined'&&!!S)?1:0")===1) break;}
console.log('地图中心 ('+await ev('MAP_CX')+','+await ev('MAP_CY')+') · 环界 '+JSON.stringify(await ev('RING_B.map(function(v){return Math.round(v);})')));
const rows=await ev("(function(){ return TOWNS.map(function(t){ return t.name+' @'+t.x+','+t.y+' → ringRegion='+REGION_NAME[ringRegion(t.x,t.y)]+' / regionAt='+REGION_NAME[regionAt(t.x,t.y)]+' / 期望='+REGION_NAME[t.region]+(REGION_NAME[ringRegion(t.x,t.y)]===REGION_NAME[t.region]?' ✅':' ❌'); }); })()");
console.log('=== 8 座城镇实际所在地区 ===');
(rows||[]).forEach(r=>console.log('  '+r));
ws.close();
