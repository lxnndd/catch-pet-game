/* v29c 验收：①城镇安全区不遇敌 ②城镇之间道路连通 ③左上角小地图
   用法：node v29c-accept.mjs [url] [cdpPort] [shotDir] */
import { WebSocket } from 'ws';
import { mkdirSync, writeFileSync } from 'node:fs';
const URL_BASE = process.argv[2] || 'http://127.0.0.1:8727/';
const CDP_PORT = process.argv[3] || '9335';
const SHOT_DIR = process.argv[4] || 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/shots-v29c';
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
const shot = async n => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(SHOT_DIR + '/' + n + '.png', Buffer.from(r.data, 'base64')); };
await send('Page.navigate', { url: URL_BASE + '?t=' + Date.now() });
for (let i = 0; i < 160; i++) { await wait(250); if (await ev("(typeof MW!=='undefined'&&typeof map!=='undefined'&&map&&map.length&&typeof TOWNS!=='undefined'&&TOWNS.length)") === true) break; }
await ev(`(function(){try{localStorage.removeItem(SAVE_KEY);S=freshSave();var p=newPet('pk-001');p.lv=30;p.hp=maxHpOf(p);ensureMoves(p);S.party=[p];S.lead=p.uid;S.pos={x:SPAWN.x,y:SPAWN.y};enterWorld();return 'ok';}catch(e){return 'ERR '+e.message;}})()`);

console.log('【1】城镇（树围起来那片）= 安全区');
let r1 = await ev(`(function(){
  try{
    var t=null; TOWNS.forEach(function(q){ if(q.region==='plain') t=q; });
    if(!t) return JSON.stringify({err:'没有平原镇'});
    var inside=0, encIn=0, encOut=0, outSteps=0;
    var orig=openEncounter;
    openEncounter=function(e){ if(inTownAt(S.pos.x,S.pos.y)) encIn++; else encOut++; };
    var dirs=[[1,0],[-1,0],[0,1],[0,-1]];
    for(var i=0;i<900;i++){
      var d=dirs[Math.floor(Math.random()*4)];
      S.pos={x:t.x,y:t.y};
      /* 在城镇内随机游走：出门就拉回中心 */
      for(var k=0;k<40;k++){
        var d2=dirs[Math.floor(Math.random()*4)];
        var bx=S.pos.x, by=S.pos.y;
        move(d2[0],d2[1]);
        if(S.pos.x!==bx||S.pos.y!==by) inside++;
        if(!inTownAt(S.pos.x,S.pos.y)){ S.pos.x=t.x; S.pos.y=t.y; }
      }
    }
    /* 对照组：把玩家放到野外同类地形上走同样步数 */
    var wild=null;
    for(var wy=4;wy<MH-4&&!wild;wy++) for(var wx=4;wx<MW-4;wx++){
      if(!inTownAt(wx,wy) && !blocked(wx,wy) && encRateOf(tileAt(wx,wy))>0){ wild={x:wx,y:wy}; break; }
    }
    if(wild){ S.pos={x:wild.x,y:wild.y}; for(var j=0;j<600;j++){ move(dirs[Math.floor(Math.random()*4)][0],dirs[Math.floor(Math.random()*4)][1]); outSteps++; } }
    openEncounter=orig;
    return JSON.stringify({town:t.name, insideSteps:inside, encIn:encIn, encOut:encOut, outSteps:outSteps, wildSpot:wild});
  }catch(e){ return 'ERR '+e.message; }
})()`);
if (r1 && r1.__err) ck(false, '城镇安全区测试', r1.__err);
else {
  const o = JSON.parse(r1);
  if (o.err) ck(false, '城镇存在', o.err);
  else {
    ck(o.encIn === 0, '城镇内走了 ' + o.insideSteps + ' 步，一次都没遇到宠', '遇敌 ' + o.encIn + ' 次');
    ck(o.encOut > 0, '对照组：城镇外同样走路会遇敌', '野外 ' + o.outSteps + ' 步触发 ' + o.encOut + ' 次');
  }
}

console.log('\n【2】城镇之间道路连通（从任一镇都能走到平原镇）');
let r2 = await ev(`(function(){
  try{
    var hub=null; TOWNS.forEach(function(q){ if(q.region==='plain') hub=q; });
    if(!hub) return JSON.stringify({err:'没有平原镇'});
    var reg=new Uint8Array(MW*MH);
    var start=hub.y*MW+hub.x;
    reg[start]=1; var q=[start];
    for(var h=0;h<q.length;h++){
      var cur=q[h], cx=cur%MW, cy=(cur-cx)/MW;
      var nb=[[cx+1,cy],[cx-1,cy],[cx,cy+1],[cx,cy-1]];
      for(var k=0;k<4;k++){
        var nx=nb[k][0], ny=nb[k][1];
        if(nx<0||ny<0||nx>=MW||ny>=MH) continue;
        var ni=ny*MW+nx;
        if(reg[ni]) continue;
        if(blocked(nx,ny)) continue;              /* 用真实通行判定（队伍里没有水系宠） */
        reg[ni]=1; q.push(ni);
      }
    }
    var rows=TOWNS.map(function(t){
      return {name:t.name, region:t.region, x:t.x, y:t.y, reach: !!reg[t.y*MW+t.x]};
    });
    var streets=0;
    for(var i=0;i<MW*MH;i++) if(map[i]===T.STREET) streets++;
    return JSON.stringify({towns:rows, streetTiles:streets, reachAll: rows.every(function(o){return o.reach;})});
  }catch(e){ return 'ERR '+e.message; }
})()`);
if (r2 && r2.__err) ck(false, '道路连通测试', r2.__err);
else {
  const o = JSON.parse(r2);
  if (o.err) ck(false, '城镇数据', o.err);
  else {
    ck(o.streetTiles > 200, '地图上铺出了城镇间道路', o.streetTiles + ' 格 STREET');
    ck(o.reachAll === true, '八个镇全部可达（不依赖水系宠）',
      o.towns.map(t => t.region + (t.reach ? '✓' : '✗')).join(' '));
    const bad = o.towns.filter(t => !t.reach).map(t => t.name);
    if (bad.length) console.log('     不可达: ' + bad.join('、'));
  }
}

console.log('\n【3】左上角小地图');
let r3 = await ev(`(function(){
  try{
    var cv=$('minimap');
    if(!cv) return JSON.stringify({exists:false});
    if(typeof drawMinimap==='function') drawMinimap();
    var g=cv.getContext('2d');
    var d=g.getImageData(0,0,cv.width,cv.height).data;
    var drawn=0;
    for(var i=3;i<d.length;i+=4) if(d[i]>0) drawn++;
    /* 检查小地图是否真的画出了东西：统计不同颜色数量 */
    var colset={};
    for(var j=0;j<d.length;j+=4*17) colset[d[j]+','+d[j+1]+','+d[j+2]]=1;
    var cs=document.defaultView.getComputedStyle(cv);
    return JSON.stringify({exists:true, w:cv.width, h:cv.height, drawn:drawn, total:d.length/4,
      colors:Object.keys(colset).length, pos:cs.position, left:cs.left, top:cs.top, towns:TOWNS.length});
  }catch(e){ return 'ERR '+e.message; }
})()`);
if (r3 && r3.__err) ck(false, '小地图', r3.__err);
else {
  const o = JSON.parse(r3);
  ck(o.exists === true, '#minimap canvas 存在', o.w + '×' + o.h);
  ck(o.drawn > o.total * 0.9, '小地图已绘制地形', o.drawn + '/' + o.total + ' 像素');
  ck(o.colors >= 4, '小地图有地形层次（多色）', o.colors + ' 种颜色');
  ck(o.pos === 'absolute', '小地图定位在画面左上角', o.pos + ' left:' + o.left + ' top:' + o.top);
  ck(o.towns >= 8, '八个小镇都画了标记', o.towns + ' 个');
}
await shot('v29c-01-minimap');

/* 附带：走到野外看一眼小地图 + 城镇 */
let r4 = await ev(`(function(){
  try{
    var t=null; TOWNS.forEach(function(q){ if(q.region==='flower') t=q; });
    if(t){ S.pos={x:t.x,y:t.y+3}; draw(); updateHUD(); }
    return JSON.stringify({pos:S.pos, inTown: !!inTownAt(S.pos.x,S.pos.y), hint:($('hint')?$('hint').textContent.slice(0,60):'')});
  }catch(e){ return 'ERR '+e.message; }
})()`);
console.log('\n【4】进入小镇时的状态：' + r4);
await wait(400); await shot('v29c-02-town');

console.log('\n== 控制台异常: ' + errs.length + ' 条 ==');
if (errs.length) console.log('  ' + errs.slice(0, 4).join('\n  '));
console.log('\n═══ 验收：通过 ' + pass + ' / ' + (pass + fail) + ' ═══');
if (fails.length) console.log('失败项:\n  - ' + fails.join('\n  - '));
ws.close();
process.exit(fail ? 1 : 0);
