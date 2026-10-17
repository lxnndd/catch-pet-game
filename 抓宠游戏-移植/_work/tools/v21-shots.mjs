import { writeFileSync, mkdirSync } from 'node:fs';
import { WebSocket } from 'ws';
const SHOT='C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/shots-v21';
mkdirSync(SHOT,{recursive:true});
let seq=0;
const c=await (await fetch('http://127.0.0.1:9335/json/new?about:blank',{method:'PUT'})).json();
const ws=new WebSocket(c.webSocketDebuggerUrl);
const pend=new Map(); const errs=[];
ws.on('message',d=>{const m=JSON.parse(String(d)); if(m.id&&pend.has(m.id)){const p=pend.get(m.id);pend.delete(m.id);m.error?p.reject(new Error(JSON.stringify(m.error))):p.resolve(m.result);return;} if(m.method==='Runtime.exceptionThrown') errs.push(String(m.params.exceptionDetails?.exception?.description||'').slice(0,140));});
await new Promise((r,j)=>{ws.on('open',r);ws.on('error',j);});
const send=(mm,p={})=>new Promise((res,rej)=>{const id=++seq;pend.set(id,{resolve:res,reject:rej});ws.send(JSON.stringify({id,method:mm,params:p}));});
const ev=async e=>{const r=await send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true}); if(r.exceptionDetails) return {__err:String(r.exceptionDetails.exception?.description||'').slice(0,150)}; return r.result?.value;};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const shot=async n=>{try{const r=await send('Page.captureScreenshot',{format:'png'});writeFileSync(SHOT+'/'+n+'.png',Buffer.from(r.data,'base64'));}catch(e){}};
await send('Runtime.enable');await send('Page.enable');await send('Network.enable');
await send('Network.setCacheDisabled',{cacheDisabled:true});
await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});
await send('Page.navigate',{url:'http://127.0.0.1:8727/?t='+Date.now()});
for(let i=0;i<45;i++){await wait(1000); if(await ev("(typeof MW!=='undefined'&&typeof S!=='undefined'&&!!S)?1:0")===1) break;}
await ev('(function(){try{localStorage.clear();}catch(e){}return 1;})()');
await send('Page.navigate',{url:'http://127.0.0.1:8727/?t='+Date.now()});
for(let i=0;i<45;i++){await wait(1000); if(await ev("(typeof MW!=='undefined'&&typeof S!=='undefined'&&!!S)?1:0")===1) break;}
await ev("document.getElementById('btn-start').click()");await wait(2800);
await ev("(function(){document.querySelector('#starter-grid .st-card').click();return 1;})()");await wait(3500);
/* 城镇地面地形构成 */
console.log('=== 城镇地面构成（地形图案）===');
console.log(JSON.stringify(await ev(`(function(){
  var out={};
  TOWNS.forEach(function(t){
    var c={};
    for(var y=t.y-6;y<=t.y+6;y++)for(var x=t.x-8;x<=t.x+8;x++){
      if(x<0||y<0||x>=MW||y>=MH) continue;
      var v=map[y*MW+x];
      var nm=Object.keys(T).find(function(k){return T[k]===v;})||String(v);
      c[nm]=(c[nm]||0)+1;
    }
    out[t.name]=c;
  });
  return out;
})()`),null,1));
/* 截图各城镇 */
for(const [nm,expr] of [['plain',"TOWNS.find(function(t){return t.gymType==='nor';})"],['flower',"TOWNS.find(function(t){return t.gymType==='fairy';})"],['forest',"TOWNS.find(function(t){return t.gymType==='grass';})"],['mine',"TOWNS.find(function(t){return t.gymType==='rock';})"],['desert',"TOWNS.find(function(t){return t.gymType==='ground';})"],['snow',"TOWNS.find(function(t){return t.gymType==='ice';})"]]){
  const r=await ev(`(function(){ var t=${expr}; if(!t) return 'no'; S.pos={x:t.x,y:t.y}; draw(); return t.name; })()`);
  await wait(800); await shot('v21-town-'+nm);
  console.log('  截图 '+nm+'：'+JSON.stringify(r));
}
console.log('异常 '+errs.length+' 条'); errs.slice(0,3).forEach(e=>console.log('  '+e));
ws.close();
