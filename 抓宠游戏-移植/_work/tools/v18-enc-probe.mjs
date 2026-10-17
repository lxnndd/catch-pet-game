import { WebSocket } from 'ws';
let seq=0;
const c=await (await fetch('http://127.0.0.1:9335/json/new?about:blank',{method:'PUT'})).json();
const ws=new WebSocket(c.webSocketDebuggerUrl);
const pend=new Map(); const errs=[];
ws.on('message',d=>{const m=JSON.parse(String(d)); if(m.id&&pend.has(m.id)){const p=pend.get(m.id);pend.delete(m.id);m.error?p.reject(new Error(JSON.stringify(m.error))):p.resolve(m.result);return;} if(m.method==='Runtime.exceptionThrown') errs.push(String(m.params.exceptionDetails?.exception?.description||'').slice(0,180));});
await new Promise((r,j)=>{ws.on('open',r);ws.on('error',j);});
const send=(m,p={})=>new Promise((res,rej)=>{const id=++seq;pend.set(id,{resolve:res,reject:rej});ws.send(JSON.stringify({id,method:m,params:p}));});
const ev=async e=>{const r=await send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true}); if(r.exceptionDetails) return {__err:String(r.exceptionDetails.exception?.description||'').slice(0,160)}; return r.result?.value;};
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
/* 找最近的 TALL 格并站上去，反复 move 触发 openEncounter */
const setup=await ev("(function(){ var best=null; for(var y=1;y<MH-1;y++)for(var x=1;x<MW-1;x++){ if(map[y*MW+x]!==T.TALL) continue; var d=Math.abs(x-S.pos.x)+Math.abs(y-S.pos.y); if(!best||d<best.d) best={x:x,y:y,d:d}; } if(best){ S.pos={x:best.x,y:best.y}; draw(); } var p=selfPet(); p.lv=5; p.hp=maxHpOf(p); return { tall:best, region:REGION_NAME[regionAt(S.pos.x,S.pos.y)], step:S.steps }; })()");
console.log('站位：'+JSON.stringify(setup));
let enc=null, tries=0;
for(let i=0;i<500 && !enc;i++){
  const d=[[0,-1],[0,1],[-1,0],[1,0]][i%4];
  await ev('(function(){ try{ move('+d[0]+','+d[1]+'); }catch(e){} if(map[S.pos.y*MW+S.pos.x]!==T.TALL){ var b=null; for(var y=1;y<MH-1;y++)for(var x=1;x<MW-1;x++){ if(map[y*MW+x]!==T.TALL) continue; var dd=Math.abs(x-MAP_CX)+Math.abs(y-MAP_CY); if(!b||dd<b.dd) b={x:x,y:y,dd:dd}; } if(b){ S.pos={x:b.x,y:b.y}; } } return 1; })()');
  await wait(50); tries++;
  const s=await ev("(function(){ var e=document.getElementById('enc-panel'); if(e&&!e.classList.contains('hidden')) return 'enc'; var b=document.getElementById('screen-battle'); if(b&&!b.classList.contains('hidden')) return 'battle'; return null; })()");
  if(s) enc=s;
}
console.log('遇敌：'+(enc?('第 '+tries+' 次 → '+enc):'❌ 未触发'));
if(enc==='enc'){ await ev("(function(){ var b=document.getElementById('enc-fight'); if(b) b.click(); return 1; })()"); await wait(2600); }
const bs=await ev("(function(){ var r=document.getElementById('move-row'); return { shown:!document.getElementById('screen-battle').classList.contains('hidden'), foe:(document.getElementById('enemy-name')||{}).textContent||'', mv:r?r.querySelectorAll('button').length:0, lv:(typeof B!=='undefined'&&B&&B.foe)?B.foe.lv:0 }; })()");
console.log('战斗：'+JSON.stringify(bs));
const one=await ev("(async function(){ var b=[...document.querySelectorAll('#move-row button')].find(function(x){return !x.disabled;}); if(!b) return 'no btn'; b.click(); await new Promise(function(r){setTimeout(r,2500);}); var l=document.getElementById('battle-log'); return l?l.textContent.replace(/\\s+/g,' ').slice(-90):''; })()");
console.log('一回合日志：'+JSON.stringify(one));
console.log('异常 '+errs.length+' 条'); errs.slice(0,3).forEach(e=>console.log('  '+e));
ws.close();
