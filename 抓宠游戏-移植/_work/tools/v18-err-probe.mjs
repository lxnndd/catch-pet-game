import { WebSocket } from 'ws';
let seq=0;
const c=await (await fetch('http://127.0.0.1:9335/json/new?about:blank',{method:'PUT'})).json();
const ws=new WebSocket(c.webSocketDebuggerUrl);
const pend=new Map(); const errs=[];
ws.on('message',d=>{const m=JSON.parse(String(d)); if(m.id&&pend.has(m.id)){const p=pend.get(m.id);pend.delete(m.id);m.error?p.reject(new Error(JSON.stringify(m.error))):p.resolve(m.result);return;} if(m.method==='Runtime.exceptionThrown') errs.push(String(m.params.exceptionDetails?.exception?.description||m.params.exceptionDetails?.text||'').slice(0,300));});
await new Promise((r,j)=>{ws.on('open',r);ws.on('error',j);});
const send=(m,p={})=>new Promise((res,rej)=>{const id=++seq;pend.set(id,{resolve:res,reject:rej});ws.send(JSON.stringify({id,method:m,params:p}));});
const ev=async e=>{const r=await send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true}); if(r.exceptionDetails) return {__err:String(r.exceptionDetails.exception?.description||'').slice(0,200)}; return r.result?.value;};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
await send('Runtime.enable');await send('Page.enable');await send('Network.enable');
await send('Network.setCacheDisabled',{cacheDisabled:true});
await send('Page.navigate',{url:'http://47.105.123.182:8727/?t='+Date.now()});
for(let i=0;i<25;i++){await wait(1000); if(await ev("(typeof MW!=='undefined'&&typeof S!=='undefined'&&!!S)?1:0")===1) break;}
await ev('(function(){try{localStorage.clear();}catch(e){}return 1;})()');
await send('Page.navigate',{url:'http://47.105.123.182:8727/?t='+Date.now()});
for(let i=0;i<25;i++){await wait(1000); if(await ev("(typeof MW!=='undefined'&&typeof S!=='undefined'&&!!S)?1:0")===1) break;}
await ev("document.getElementById('btn-start').click()");await wait(2800);
await ev("(function(){document.querySelector('#starter-grid .st-card').click();return 1;})()");await wait(3000);
/* 复现：开战后直接 throwBall，看异常 */
const r=await ev("(function(){ var p=selfPet(); p.lv=25; p.hp=maxHpOf(p); var sp=SPECIES.filter(function(s){return !s.varOf&&s.rarity===0;})[3]; try{ startWildBattle({sp:sp.id,lv:12}); }catch(e){ return 'openBattle 就失败: '+e.message.slice(0,120); } return 'ok foe='+(B&&B.foe?B.foe.lv:'?')+' balls='+JSON.stringify(S.balls); })()");
console.log('开战：'+JSON.stringify(r));
const r2=await ev("(function(){ try{ throwBall(0); return 'throwBall ok'; }catch(e){ return 'throwBall 抛异常: '+e.message.slice(0,150); } })()");
console.log('丢球：'+JSON.stringify(r2));
await wait(1500);
const r3=await ev("(function(){ return { party:S.party.map(function(p){return byId(p.sp).name+' Lv'+p.lv;}), box:S.box.map(function(p){return byId(p.sp).name+' Lv'+p.lv;}), balls:JSON.stringify(S.balls), inBattle:!!B }; })()");
console.log('结果：'+JSON.stringify(r3));
console.log('\n未捕获异常 '+errs.length+' 条'); errs.slice(0,3).forEach(e=>console.log('  ❌ '+e));
ws.close();
