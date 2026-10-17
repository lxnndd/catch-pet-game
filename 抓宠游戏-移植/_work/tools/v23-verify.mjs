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
console.log('=== 各城镇地面地形 ===');
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
await ev("document.getElementById('btn-start').click()");await wait(2200);
await ev("(function(){document.querySelector('#starter-grid .st-card').click();return 1;})()");await wait(2800);
console.log('\n=== 道馆触发测试（只有中心格）===');
console.log(JSON.stringify(await ev(`(function(){
  var t=TOWNS[0];
  function tryAt(dx,dy){
    ['panel-gym'].forEach(function(id){var e=document.getElementById(id);if(e)e.classList.add('hidden');});
    S.pos={x:t.gym.x+dx,y:t.gym.y+dy-1};
    move(0,1);
    return !document.getElementById('panel-gym').classList.contains('hidden');
  }
  return { 中心格:tryAt(0,0), 左边一格:tryAt(-1,0), 右边一格:tryAt(1,0), 上面一格:tryAt(0,-1) };
})()`)));
console.log('\n=== 城外还有没有石板(STREET) ===');
console.log(JSON.stringify(await ev(`(function(){
  var out=[];
  TOWNS.forEach(function(t){
    var far=0, near=0;
    for(var y=0;y<MH;y++)for(var x=0;x<MW;x++){
      if(map[y*MW+x]!==T.STREET) continue;
      if(Math.abs(x-t.x)<=9&&Math.abs(y-t.y)<=7) near++; else far++;
    }
    out.push(t.name+' 城内石板'+near+' 城外'+(far>0?('❌'+far):'0 ✅'));
  });
  return out;
})()`)));
console.log('\n异常 '+errs.length+' 条'); errs.slice(0,3).forEach(e=>console.log('  ❌ '+e));
ws.close();
