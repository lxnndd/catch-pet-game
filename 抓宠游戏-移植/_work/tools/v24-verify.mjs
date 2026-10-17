import { WebSocket } from 'ws';
let seq=0;
const c=await (await fetch('http://127.0.0.1:9335/json/new?about:blank',{method:'PUT'})).json();
const ws=new WebSocket(c.webSocketDebuggerUrl);
const pend=new Map(); const errs=[];
ws.on('message',d=>{const m=JSON.parse(String(d)); if(m.id&&pend.has(m.id)){const p=pend.get(m.id);pend.delete(m.id);m.error?p.reject(new Error(JSON.stringify(m.error))):p.resolve(m.result);return;} if(m.method==='Runtime.exceptionThrown') errs.push(String(m.params.exceptionDetails?.exception?.description||'').slice(0,140));});
await new Promise((r,j)=>{ws.on('open',r);ws.on('error',j);});
const send=(mm,p={})=>new Promise((res,rej)=>{const id=++seq;pend.set(id,{resolve:res,reject:rej});ws.send(JSON.stringify({id,method:mm,params:p}));});
const ev=async e=>{const r=await send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true}); if(r.exceptionDetails) return {__err:String(r.exceptionDetails.exception?.description||'').slice(0,150)}; return r.result?.value;};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
await send('Runtime.enable');await send('Page.enable');await send('Network.enable');
await send('Network.setCacheDisabled',{cacheDisabled:true});
await send('Page.navigate',{url:'http://127.0.0.1:8727/?t='+Date.now()});
for(let i=0;i<60;i++){await wait(250); if(await ev("(typeof MW!=='undefined'&&typeof S!=='undefined'&&!!S)?1:0")===1) break;}
console.log('出生点：'+JSON.stringify(await ev('SPAWN')));
console.log('平原镇：'+JSON.stringify(await ev("(function(){ var t=TOWNS.find(function(x){return x.region==='plain';}); return t?{name:t.name,x:t.x,y:t.y,hosp:t.hosp,gym:t.gym}:'无'; })()")));
console.log('出生点地区：'+await ev("REGION_NAME[regionAt(SPAWN.x,SPAWN.y)]"));
console.log('出生点下方 3 格是否是城镇范围：'+await ev("(function(){ var t=TOWNS.find(function(x){return x.region==='plain';}); if(!t) return '无镇'; return (Math.abs(SPAWN.x-t.x)<=9&&Math.abs(SPAWN.y-t.y)<=7)?'✅ 在镇内':'❌ 在镇外'; })()"));
console.log('出生点附近 21×21 地形构成：'+JSON.stringify(await ev(`(function(){
  var c={};
  for(var y=SPAWN.y-10;y<=SPAWN.y+10;y++)for(var x=SPAWN.x-10;x<=SPAWN.x+10;x++){
    if(x<0||y<0||x>=MW||y>=MH) continue;
    var v=map[y*MW+x];
    var nm=Object.keys(T).find(function(k){return T[k]===v;})||String(v);
    c[nm]=(c[nm]||0)+1;
  }
  return c;
})()`)));
console.log('医院距出生点：'+await ev("(function(){ var t=TOWNS.find(function(x){return x.region==='plain';}); if(!t) return '无'; return Math.abs(t.hosp.x-SPAWN.x)+Math.abs(t.hosp.y-SPAWN.y)+' 格（曼哈顿）'; })()"));
console.log('异常 '+errs.length+' 条'); errs.slice(0,3).forEach(e=>console.log('  ❌ '+e));
ws.close();
