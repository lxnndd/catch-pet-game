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
const t0=Date.now();
await send('Page.navigate',{url:'http://47.105.123.182:8727/?t='+Date.now()});
let ms=0;
for(let i=0;i<60;i++){await wait(250); if(await ev("(typeof MW!=='undefined'&&typeof S!=='undefined'&&!!S)?1:0")===1){ms=Date.now()-t0;break;}}
console.log('【公网加载耗时】'+(ms/1000).toFixed(2)+' 秒（优化前手机上要等好几秒）');
await ev('(function(){try{localStorage.clear();}catch(e){}return 1;})()');
await send('Page.navigate',{url:'http://47.105.123.182:8727/?t='+Date.now()});
for(let i=0;i<60;i++){await wait(250); if(await ev("(typeof MW!=='undefined'&&typeof S!=='undefined'&&!!S)?1:0")===1) break;}
console.log('HTML 体积：'+await ev("Math.round(document.documentElement.outerHTML.length/1024)+' KB'"));
console.log('头像 URL 示例：'+await ev("(function(){ var s=SPECIES.find(function(x){return x.id==='pk-037';}); return avatarURL(s); })()"));
await ev("document.getElementById('btn-start').click()");await wait(2500);
await ev("(function(){document.querySelector('#starter-grid .st-card').click();return 1;})()");await wait(3000);
/* 检查头像图片是否真的加载成功 */
console.log('\n【头像加载验证】');
console.log(JSON.stringify(await ev(`(async function(){
  var s=SPECIES.find(function(x){return x.id==='pk-037';});
  var url=avatarURL(s);
  var img=new Image();
  var ok=await new Promise(function(res){ img.onload=function(){res(true);}; img.onerror=function(){res(false);}; img.src=url; });
  return { url:url, 加载成功:ok, 尺寸:img.naturalWidth+'x'+img.naturalHeight };
})()`)));
console.log('\n【游戏内渲染的头像数】'+await ev("document.querySelectorAll('img.pet-avatar').length"));
console.log('异常 '+errs.length+' 条'); errs.slice(0,3).forEach(e=>console.log('  ❌ '+e));
ws.close();
