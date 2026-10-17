import { WebSocket } from 'ws';
let seq=0;
const c=await (await fetch('http://127.0.0.1:9335/json/new?about:blank',{method:'PUT'})).json();
const ws=new WebSocket(c.webSocketDebuggerUrl);
const pend=new Map();
ws.on('message',d=>{const m=JSON.parse(String(d)); if(m.id&&pend.has(m.id)){const p=pend.get(m.id);pend.delete(m.id);m.error?p.reject(new Error(JSON.stringify(m.error))):p.resolve(m.result);}});
await new Promise((r,j)=>{ws.on('open',r);ws.on('error',j);});
const send=(m,p={})=>new Promise((res,rej)=>{const id=++seq;pend.set(id,{resolve:res,reject:rej});ws.send(JSON.stringify({id,method:m,params:p}));});
const ev=async e=>{const r=await send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true}); if(r.exceptionDetails) return null; return r.result?.value;};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
await send('Runtime.enable');await send('Page.enable');await send('Network.enable');
await send('Network.setCacheDisabled',{cacheDisabled:true});
await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});
await send('Page.navigate',{url:'http://47.105.123.182:8727/?t='+Date.now()});
for(let i=0;i<25;i++){await wait(1000); if(await ev("(typeof MW!=='undefined'&&typeof S!=='undefined'&&!!S)?1:0")===1) break;}
await ev('(function(){try{localStorage.clear();}catch(e){}return 1;})()');
await send('Page.navigate',{url:'http://47.105.123.182:8727/?t='+Date.now()});
for(let i=0;i<25;i++){await wait(1000); if(await ev("(typeof MW!=='undefined'&&typeof S!=='undefined'&&!!S)?1:0")===1) break;}
await ev("document.getElementById('btn-start').click()");await wait(2800);
await ev("(function(){document.querySelector('#starter-grid .st-card').click();return 1;})()");await wait(3200);
/* 帧率测量：连续移动 2 秒，数 draw 调用 */
const fps=await ev("(async function(){ var n=0; var orig=window.draw; window.draw=function(){ n++; return orig.apply(this,arguments); }; var t0=performance.now(); for(var i=0;i<40;i++){ move([0,-1,0,1][i%4],[1,0,-1,0][i%4]); await new Promise(function(r){setTimeout(r,50);}); } var dt=(performance.now()-t0)/1000; window.draw=orig; return { frames:n, seconds:dt.toFixed(2), fps:(n/dt).toFixed(1), mapCells:MW*MH, viewW:VIEW_W.toFixed(1), viewH:VIEW_H.toFixed(1) }; })()");
console.log('=== 渲染性能（216×156 地图，视口裁剪）===');
console.log(JSON.stringify(fps,null,1));
ws.close();
