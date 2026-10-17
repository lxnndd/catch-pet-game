/* v29d 验收：所有路统一 1 格宽，且窄门/窄通道不破坏连通性
   用法：node v29d-accept.mjs [url] [cdpPort] [shotDir] */
import { WebSocket } from 'ws';
import { mkdirSync, writeFileSync } from 'node:fs';
const URL_BASE = process.argv[2] || 'http://127.0.0.1:8727/';
const CDP_PORT = process.argv[3] || '9335';
const SHOT_DIR = process.argv[4] || 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/shots-v29d';
let seq = 0, pass = 0, fail = 0; const fails = [];
const c = await (await fetch('http://127.0.0.1:' + CDP_PORT + '/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(c.webSocketDebuggerUrl);
const pend = new Map(); const errs = [];
ws.on('message', d => {
  const m = JSON.parse(String(d));
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); return; }
  if (m.method === 'Runtime.exceptionThrown') errs.push(String(m.params?.exceptionDetails?.exception?.description || '').slice(0, 200));
});
await new Promise((r, j) => { ws.on('open', r); ws.on('error', j); });
const send = (mm, p = {}) => new Promise((res, rej) => { const id = ++seq; pend.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method: mm, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) return { __err: String(r.exceptionDetails.exception?.description || '').slice(0, 400) }; return r.result?.value; };
const wait = ms => new Promise(r => setTimeout(r, ms));
const ck = (ok, name, extra) => { if (ok) { pass++; console.log('  ✅ ' + name + (extra ? '  →  ' + extra : '')); } else { fail++; fails.push(name); console.log('  ❌ ' + name + (extra ? '  →  ' + extra : '')); } };
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
try { mkdirSync(SHOT_DIR, { recursive: true }); } catch (e) { }
await send('Page.navigate', { url: URL_BASE + '?t=' + Date.now() });
for (let i = 0; i < 160; i++) { await wait(250); if (await ev("(typeof TOWNS!=='undefined'&&TOWNS.length&&typeof map!=='undefined'&&map&&map.length)") === true) break; }
await ev(`(function(){try{localStorage.removeItem(SAVE_KEY);S=freshSave();var p=newPet('pk-001');p.lv=30;p.hp=maxHpOf(p);ensureMoves(p);S.party=[p];S.lead=p.uid;S.pos={x:SPAWN.x,y:SPAWN.y};enterWorld();return 'ok';}catch(e){return 'ERR '+e.message;}})()`);

const r = await ev(`(function(){
  try{
    var out={};
    /* 1. 是否存在 2×2 的 STREET 块（= 路比 1 格宽） */
    var blocks=0, samples=[];
    for(var y=0;y<MH-1;y++) for(var x=0;x<MW-1;x++){
      if(map[y*MW+x]===T.STREET && map[y*MW+x+1]===T.STREET && map[(y+1)*MW+x]===T.STREET && map[(y+1)*MW+x+1]===T.STREET){
        blocks++; if(samples.length<5) samples.push(x+','+y);
      }
    }
    out.street2x2=blocks; out.samples=samples;
    /* 2. 每镇四向通道宽度（在围栏外 2 格处量横截面：连续可走格数） */
    out.towns = TOWNS.map(function(t){
      var dirs=[[1,0],[-1,0],[0,1],[0,-1]];
      var chans = dirs.map(function(d){
        var px=t.x+d[0]*10, py=t.y+d[1]*8, w=0;
        for(var k=-3;k<=3;k++){
          var qx=px+(d[0]?0:k), qy=py+(d[0]?k:0);
          if(qx<0||qy<0||qx>=MW||qy>=MH) continue;
          if(!blocked(qx,qy)) w++;
        }
        return w;
      });
      return {name:t.name, region:t.region, chans:chans};
    });
    /* 3. 围栏上的门宽（|dx|=8 竖边上连续可走格数） */
    out.doors = TOWNS.map(function(t){
      var w=0;
      for(var dy=-3;dy<=3;dy++){ var qy=t.y+dy, qx=t.x+8; if(qy>=0&&qy<MH&&qx<MW&&!blocked(qx,qy)) w++; }
      return {name:t.name, w:w};
    });
    /* 4. 镇内十字街宽度：中心那一行/列的连续 STREET */
    out.cross = TOWNS.map(function(t){
      var hw=0; for(var dx=-9;dx<=9;dx++){ var qx=t.x+dx; if(qx>=0&&qx<MW&&map[t.y*MW+qx]===T.STREET) hw++; }
      var vw=0; for(var dy=-9;dy<=9;dy++){ var qy=t.y+dy; if(qy>=0&&qy<MH&&map[qy*MW+t.x]===T.STREET) vw++; }
      /* 纵向厚度：检查上下相邻行是否也是 STREET（>1 说明街是宽的） */
      var th=0; for(var d2=-2;d2<=2;d2++){ var qy2=t.y+d2; if(qy2>=0&&qy2<MH&&map[qy2*MW+t.x]===T.STREET) th++; }
      return {name:t.name, hLen:hw, vLen:vw, vThick:th};
    });
    /* 5. 连通性：从平原镇 BFS 能否到其余镇 */
    var hub=null; TOWNS.forEach(function(q){ if(q.region==='plain') hub=q; });
    var reg=new Uint8Array(MW*MH); var st=hub.y*MW+hub.x; reg[st]=1; var q=[st];
    for(var h=0;h<q.length;h++){
      var cur=q[h], cx=cur%MW, cy=(cur-cx)/MW;
      var nb=[[cx+1,cy],[cx-1,cy],[cx,cy+1],[cx,cy-1]];
      for(var k2=0;k2<4;k2++){
        var nx=nb[k2][0], ny=nb[k2][1];
        if(nx<0||ny<0||nx>=MW||ny>=MH) continue;
        var ni=ny*MW+nx; if(reg[ni]) continue;
        if(blocked(nx,ny)) continue;
        reg[ni]=1; q.push(ni);
      }
    }
    out.reach = TOWNS.map(function(t){ return t.region + (reg[t.y*MW+t.x] ? '✓' : '✗'); });
    out.reachAll = TOWNS.every(function(t){ return !!reg[t.y*MW+t.x]; });
    /* 6. 安全区仍生效 */
    var t0=null; TOWNS.forEach(function(q){ if(q.region==='plain') t0=q; });
    var enc=0, orig=openEncounter;
    openEncounter=function(){ enc++; };
    for(var i=0;i<400;i++){
      var dd=[[1,0],[-1,0],[0,1],[0,-1]][Math.floor(Math.random()*4)];
      S.pos={x:t0.x,y:t0.y};
      for(var k3=0;k3<30;k3++){ move(dd[0],dd[1]); if(!inTownAt(S.pos.x,S.pos.y)) S.pos={x:t0.x,y:t0.y}; }
    }
    openEncounter=orig;
    out.encInTown=enc;
    return JSON.stringify(out);
  }catch(e){ return 'ERR '+e.message; }
})()`);
if (r && r.__err) { ck(false, '路宽检测', r.__err); }
else {
  const o = JSON.parse(r);
  ck(o.street2x2 === 0, '地图上不存在 2×2 的石板路块（路都是 1 格宽）', o.street2x2 === 0 ? '' : '发现 ' + o.street2x2 + ' 处，例如 ' + o.samples.join(' / '));
  const badChan = o.towns.filter(t => t.chans.some(w => w > 1));
  ck(badChan.length === 0, '八个镇的四向通道都是 1 格宽',
    badChan.length ? badChan.map(t => t.name + ':' + t.chans.join(',')).join(' | ') : o.towns.map(t => t.chans.join('')).join(' '));
  const badDoor = o.doors.filter(d => d.w !== 1);
  ck(badDoor.length === 0, '八个镇的门都是 1 格宽',
    badDoor.length ? badDoor.map(d => d.name + ':' + d.w).join(' | ') : o.doors.map(d => d.w).join(''));
  const thick = o.cross.filter(c2 => c2.vThick > 1);
  ck(thick.length === 0, '镇内十字街纵向厚度为 1 格（不是宽街）',
    thick.length ? thick.map(c2 => c2.name + ':厚' + c2.vThick).join(' | ') : '十字街横向 ' + o.cross[0].hLen + ' 格 · 纵向 ' + o.cross[0].vLen + ' 格');
  ck(o.reachAll === true, '八个镇仍然全部可达（窄门没堵死路）', o.reach.join(' '));
  ck(o.encInTown === 0, '安全区仍生效（城镇内 12000 步零遇敌）', '遇敌 ' + o.encInTown + ' 次');
}
console.log('\n== 控制台异常: ' + errs.length + ' 条 ==');
if (errs.length) console.log('  ' + errs.slice(0, 3).join('\n  '));
console.log('\n═══ 验收：通过 ' + pass + ' / ' + (pass + fail) + ' ═══');
if (fails.length) console.log('失败项:\n  - ' + fails.join('\n  - '));
ws.close();
process.exit(fail ? 1 : 0);
