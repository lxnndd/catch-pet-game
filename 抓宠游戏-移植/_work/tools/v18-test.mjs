/* v18 实测：新地图尺寸/九地区/可达性/地区等级/雪地渲染 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { WebSocket } from 'ws';
const URL_ = process.argv[2] || 'http://127.0.0.1:8727/';
const PORT = process.argv[3] || '9335';
const SHOT = process.argv[4] || 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/shots-v18';
mkdirSync(SHOT, { recursive: true });
let seq = 0;
const created = await (await fetch('http://127.0.0.1:' + PORT + '/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(created.webSocketDebuggerUrl);
const pending = new Map(); const errors = [];
ws.on('message', d => { const m = JSON.parse(String(d)); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); return; } if (m.method === 'Runtime.exceptionThrown') errors.push(String(m.params.exceptionDetails?.exception?.description || '').slice(0, 170)); });
await new Promise((r, j) => { ws.on('open', r); ws.on('error', j); });
const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async (expr) => { const rr = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (rr.exceptionDetails) return { __err: String(rr.exceptionDetails.exception?.description || '').slice(0, 200) }; return rr.result?.value; };
const wait = ms => new Promise(r => setTimeout(r, ms));
const shot = async (n) => { try { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(SHOT + '/' + n + '.png', Buffer.from(r.data, 'base64')); } catch (e) { } };
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: 480, height: 940, deviceScaleFactor: 2, mobile: true });
await send('Page.navigate', { url: URL_ + '?t=' + Date.now() });
await wait(12000);
await ev(`(function(){ try{ localStorage.clear(); }catch(e){} return 1; })()`);
await send('Page.navigate', { url: URL_ + '?t=' + Date.now() });
await wait(12000);
console.log('=== 地图基本参数 ===');
console.log(JSON.stringify(await ev(`(function(){
  return { MW:MW, MH:MH, 总格数:MW*MH, cells:map.length, CX:MAP_CX, CY:MAP_CY, HOSP:HOSP, SPAWN:SPAWN,
           中心地区:(typeof regionAt==='function')?REGION_NAME[regionAt(MAP_CX,MAP_CY)]:'—',
           LV_RANGE:LV_RANGE };
})()`), null, 1));
await ev(`document.getElementById('btn-start').click()`);
await wait(3000);
await ev(`(function(){ document.querySelector('#starter-grid .st-card').click(); return 1; })()`);
await wait(3500);
console.log('\n=== 进入世界 ===');
console.log(JSON.stringify(await ev(`(function(){
  var cv=document.getElementById('game-canvas');
  return { world:!document.getElementById('screen-world').classList.contains('hidden'),
           画布:cv?(cv.width+'x'+cv.height):'无', 玩家位置:S.pos, 当前地区:REGION_NAME[regionAt(S.pos.x,S.pos.y)],
           提示:(document.getElementById('hint')||{}).textContent||'' };
})()`), null, 1));
await shot('v18-01-spawn');
/* 九地区：报名字+等级段+实际抽样坐标 */
console.log('\n=== 九地区（等级段 + 在地图上抽样到的坐标）===');
console.log(await ev(`(function(){
  var found={};
  for(var y=1;y<MH-1&&Object.keys(found).length<9;y+=4) for(var x=1;x<MW-1;x+=4){
    var r=regionAt(x,y);
    if(!found[r]) found[r]={x:x,y:y};
  }
  var out=[];
  ['plain','forest','water','flower','mine','desert','ocean','volcano','snow'].forEach(function(r){
    var lr=LV_RANGE[r]||[1,25];
    out.push((REGION_NAME[r]||r)+' Lv'+lr[0]+'~'+lr[1]+' @'+(found[r]?('('+found[r].x+','+found[r].y+')'):'❌ 地图上找不到'));
  });
  return out.join('\\n');
})()`));
/* 洪水填充可达率（带水系宠口径） */
console.log('\n=== 可达性实况（游戏内计算）===');
console.log(JSON.stringify(await ev(`(function(){
  var BLOCK={}; BLOCK[T.TREE]=1; BLOCK[T.WATER]=1; BLOCK[T.LAVA]=1; BLOCK[T.ROCK]=1; BLOCK[T.DEEP]=1;
  var seen=new Uint8Array(MW*MH), q=[SPAWN.y*MW+SPAWN.x]; seen[q[0]]=1;
  for(var h=0;h<q.length;h++){
    var cur=q[h], x=cur%MW, y=(cur-x)/MW;
    var nb=[[x+1,y],[x-1,y],[x,y+1],[x,y-1]];
    for(var k=0;k<4;k++){ var nx=nb[k][0],ny=nb[k][1];
      if(nx<1||ny<1||nx>=MW-1||ny>=MH-1) continue;
      var i2=ny*MW+nx;
      if(seen[i2]||BLOCK[map[i2]]) continue;
      seen[i2]=1; q.push(i2);
    }
  }
  var BLOCKW={}; BLOCKW[T.TREE]=1; BLOCKW[T.LAVA]=1; BLOCKW[T.ROCK]=1;
  var seenW=new Uint8Array(MW*MH), qw=[SPAWN.y*MW+SPAWN.x]; seenW[qw[0]]=1;
  for(var h2=0;h2<qw.length;h2++){
    var c2=qw[h2], x2=c2%MW, y2=(c2-x2)/MW;
    var nb2=[[x2+1,y2],[x2-1,y2],[x2,y2+1],[x2,y2-1]];
    for(var k2=0;k2<4;k2++){ var nx2=nb2[k2][0],ny2=nb2[k2][1];
      if(nx2<1||ny2<1||nx2>=MW-1||ny2>=MH-1) continue;
      var j2=ny2*MW+nx2;
      if(seenW[j2]||BLOCKW[map[j2]]) continue;
      seenW[j2]=1; qw.push(j2);
    }
  }
  var stat={};
  for(var y3=1;y3<MH-1;y3++)for(var x3=1;x3<MW-1;x3++){
    var r3=ringRegion(x3,y3);
    stat[r3]=stat[r3]||{tot:0,ok:0,okw:0};
    stat[r3].tot++; if(seen[y3*MW+x3]) stat[r3].ok++; if(seenW[y3*MW+x3]) stat[r3].okw++;
  }
  var out=[];
  ['plain','forest','water','flower','mine','desert','ocean','volcano','snow'].forEach(function(r){
    var s=stat[r]; if(!s) return;
    out.push((REGION_NAME[r]||r).padEnd(5)+' 总'+String(s.tot).padStart(5)+' 陆地可达'+String(s.ok).padStart(5)+'('+(s.ok/s.tot*100).toFixed(0)+'%) 带水系'+String(s.okw).padStart(5)+'('+(s.okw/s.tot*100).toFixed(0)+'%)');
  });
  return out.join('\\n');
})()`));
/* 地区等级验证：把玩家等级设成不同值，看野怪等级 */
console.log('\n=== 地区等级验证（同一地区、不同玩家等级 → 野怪等级）===');
console.log(await ev(`(function(){
  var p=selfPet(); var savedLv=p.lv;
  var lines=[];
  function testAt(x,y,plv){
    S.pos={x:x,y:y};
    p.lv=plv;
    var reg=regionAt(x,y), lr=LV_RANGE[reg]||[1,25];
    var lvs=[];
    for(var i=0;i<12;i++){
      var topLv=topPartyLv();
      var foeLv=clamp(topLv+ri(-3,3),1,100);
      foeLv=clamp(foeLv,lr[0],lr[1]);
      if(topLv<=2) foeLv=Math.min(foeLv,3);
      lvs.push(foeLv);
    }
    return REGION_NAME[reg]+'(Lv'+lr[0]+'~'+lr[1]+') 玩家Lv'+plv+' → 野怪 '+Math.min.apply(null,lvs)+'~'+Math.max.apply(null,lvs);
  }
  /* 找各地区一个坐标 */
  var pt={};
  for(var y=1;y<MH-1;y+=3)for(var x=1;x<MW-1;x+=3){ var r=regionAt(x,y); if(!pt[r]) pt[r]={x:x,y:y}; }
  ['plain','flower','mine','desert','ocean','volcano','snow'].forEach(function(r){
    if(!pt[r]) return;
    lines.push(testAt(pt[r].x,pt[r].y,1));
    lines.push(testAt(pt[r].x,pt[r].y,40));
    lines.push(testAt(pt[r].x,pt[r].y,80));
  });
  p.lv=savedLv; S.pos={x:SPAWN.x,y:SPAWN.y};
  return lines.join('\\n');
})()`));
console.log('\n异常 ' + errors.length + ' 条'); errors.slice(0, 5).forEach(e => console.log('  ❌ ' + e));
if (!errors.length) console.log('  ✅ 零异常');
ws.close();
