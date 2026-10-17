import { WebSocket } from 'ws';
let seq=0;
const c=await (await fetch('http://127.0.0.1:9335/json/new?about:blank',{method:'PUT'})).json();
const ws=new WebSocket(c.webSocketDebuggerUrl);
const pend=new Map(); const errs=[];
ws.on('message',d=>{const m=JSON.parse(String(d)); if(m.id&&pend.has(m.id)){const p=pend.get(m.id);pend.delete(m.id);m.error?p.reject(new Error(JSON.stringify(m.error))):p.resolve(m.result);return;} if(m.method==='Runtime.exceptionThrown') errs.push(String(m.params.exceptionDetails?.exception?.description||'').slice(0,150));});
await new Promise((r,j)=>{ws.on('open',r);ws.on('error',j);});
const send=(mm,p={})=>new Promise((res,rej)=>{const id=++seq;pend.set(id,{resolve:res,reject:rej});ws.send(JSON.stringify({id,method:mm,params:p}));});
const ev=async e=>{const r=await send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true}); if(r.exceptionDetails) return {__err:String(r.exceptionDetails.exception?.description||'').slice(0,150)}; return r.result?.value;};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
await send('Runtime.enable');await send('Page.enable');await send('Network.enable');
await send('Network.setCacheDisabled',{cacheDisabled:true});
await send('Page.navigate',{url:'http://127.0.0.1:8727/?t='+Date.now()});
for(let i=0;i<60;i++){await wait(250); if(await ev("(typeof MW!=='undefined'&&typeof S!=='undefined'&&!!S)?1:0")===1) break;}
console.log('STREET 总格数：'+await ev("map.filter(function(v){return v===T.STREET;}).length"));
console.log('不属于任何城镇的 STREET：'+await ev(`(function(){
  var orphan=0;
  for(var y=0;y<MH;y++)for(var x=0;x<MW;x++){
    if(map[y*MW+x]!==T.STREET) continue;
    var inAny=false;
    for(var i=0;i<TOWNS.length;i++){ var t=TOWNS[i]; if(Math.abs(x-t.x)<=10&&Math.abs(y-t.y)<=8){ inAny=true; break; } }
    if(!inAny) orphan++;
  }
  return orphan;
})()`));
console.log('PATH(沙色) 总格数：'+await ev("map.filter(function(v){return v===T.PATH;}).length"));
console.log('\n可达性（带水系宠）：'+JSON.stringify(await ev(`(function(){
  var W={}; W[T.TREE]=1;W[T.LAVA]=1;W[T.ROCK]=1;
  var sw=new Uint8Array(MW*MH); var qw=[SPAWN.y*MW+SPAWN.x]; sw[qw[0]]=1;
  for(var h=0;h<qw.length;h++){ var c2=qw[h],x2=c2%MW,y2=(c2-x2)/MW;
    var nb=[[x2+1,y2],[x2-1,y2],[x2,y2+1],[x2,y2-1]];
    for(var k=0;k<4;k++){ var nx=nb[k][0],ny=nb[k][1];
      if(nx<1||ny<1||nx>=MW-1||ny>=MH-1) continue;
      var j=ny*MW+nx; if(sw[j]||W[map[j]]) continue; sw[j]=1; qw.push(j); } }
  var st={};
  for(var y=1;y<MH-1;y++)for(var x=1;x<MW-1;x++){ var r=ringRegion(x,y); st[r]=st[r]||{t:0,o:0}; st[r].t++; if(sw[y*MW+x]) st[r].o++; }
  var out=[];
  ['plain','flower','mine','desert','ocean','volcano','snow'].forEach(function(r){ var s=st[r]; if(s) out.push(REGION_NAME[r]+':'+Math.round(s.o/s.t*100)+'%'); });
  return out;
})()`)));
console.log('异常 '+errs.length+' 条'); errs.slice(0,3).forEach(e=>console.log('  ❌ '+e));
ws.close();
