/* v18 对战 UI 完整性检查：多屏幕尺寸下检查战斗界面每个元素是否真的可见 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { WebSocket } from 'ws';
const URL_ = process.argv[2] || 'http://47.105.123.182:8727/';
const SHOT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/shots-v18-ui';
mkdirSync(SHOT, { recursive: true });
let seq = 0;
const created = await (await fetch('http://127.0.0.1:9335/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(created.webSocketDebuggerUrl);
const pending = new Map(); const errors = [];
ws.on('message', d => { const m = JSON.parse(String(d)); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); return; } if (m.method === 'Runtime.exceptionThrown') errors.push(String(m.params.exceptionDetails?.exception?.description || '').slice(0, 150)); });
await new Promise((r, j) => { ws.on('open', r); ws.on('error', j); });
const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async (expr) => { const rr = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (rr.exceptionDetails) return null; return rr.result?.value; };
const wait = ms => new Promise(r => setTimeout(r, ms));
const shot = async (n) => { try { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(SHOT + '/' + n + '.png', Buffer.from(r.data, 'base64')); } catch (e) { } };
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });

const SIZES = [
  ['手机-常见', 390, 844],
  ['窄屏-小手机', 360, 640],
  ['大屏手机', 430, 932],
  ['平板', 820, 1180],
  ['桌面', 1280, 800],
];
for (const [label, w, h] of SIZES) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile: w < 600 });
  await send('Page.navigate', { url: URL_ + '?t=' + Date.now() });
  let ready = false;
  for (let i = 0; i < 25; i++) { await wait(900); if (await ev("(typeof MW!=='undefined'&&typeof S!=='undefined'&&!!S)?1:0") === 1) { ready = true; break; } }
  if (!ready) { console.log(label + ' ❌ 没加载出来'); continue; }
  await ev('(function(){ try{ localStorage.clear(); }catch(e){} return 1; })()');
  await send('Page.navigate', { url: URL_ + '?t=' + Date.now() });
  for (let i = 0; i < 25; i++) { await wait(900); if (await ev("(typeof MW!=='undefined'&&typeof S!=='undefined'&&!!S)?1:0") === 1) break; }
  await ev("document.getElementById('btn-start').click()"); await wait(2600);
  await ev("(function(){ document.querySelector('#starter-grid .st-card').click(); return 1; })()"); await wait(3200);
  /* 直接开一场战斗 */
  const r = await ev("(function(){ var p=selfPet(); p.lv=20; p.hp=maxHpOf(p); var sp=SPECIES.filter(function(s){return !s.varOf&&s.rarity===0&&s.hpBase>60;})[5]; try{ startWildBattle({sp:sp.id, lv:20}); return sp.name; }catch(e){ return 'ERR:'+e.message.slice(0,60); } })()");
  await wait(2600);
  /* 逐个元素检查：是否存在 + 是否在视口内（不被裁掉） */
  const ui = await ev(`(function(){
    var out={};
    var card=document.querySelector('#screen-battle .battle-card');
    var vw=window.innerWidth, vh=window.innerHeight;
    out.viewport=vw+'x'+vh;
    out.cardRect=card?{w:Math.round(card.getBoundingClientRect().width),h:Math.round(card.getBoundingClientRect().height),scrollH:card.scrollHeight,clientH:card.clientHeight}:null;
    out.needScroll=card?(card.scrollHeight>card.clientHeight+2):null;
    var ids=['enemy-name','enemy-sprite','enemy-hp-fill','enemy-hp-text','self-sprite','self-hp-fill','self-hp-text','battle-log','move-row','ball-row','btn-switch','btn-flee'];
    out.missing=[]; out.offscreen=[];
    ids.forEach(function(id){
      var e=document.getElementById(id);
      if(!e){ out.missing.push(id); return; }
      var r=e.getBoundingClientRect();
      if(r.width<2||r.height<2){ out.missing.push(id+'(零尺寸)'); return; }
      if(r.bottom>vh+2||r.top<-2||r.right>vw+2||r.left<-2) out.offscreen.push(id+'('+Math.round(r.top)+'~'+Math.round(r.bottom)+' vs vh'+vh+')');
    });
    var btns=document.querySelectorAll('#move-row button');
    out.moveButtons=btns.length;
    out.ballButtons=document.querySelectorAll('#ball-row button').length;
    out.visibleMoves=0;
    btns.forEach(function(b){ var r=b.getBoundingClientRect(); if(r.height>2&&r.bottom<=vh+2&&r.top>=-2) out.visibleMoves++; });
    return out;
  })()`);
  console.log('\n【' + label + '】' + w + '×' + h);
  console.log('  视口 ' + (ui ? ui.viewport : '?') + ' · 卡片 ' + JSON.stringify(ui ? ui.cardRect : null) + (ui && ui.needScroll ? ' ⚠️ 需要滚动' : ' ✅ 一屏放得下'));
  console.log('  技能按钮 ' + (ui ? ui.moveButtons : '?') + ' 个（可见 ' + (ui ? ui.visibleMoves : '?') + '）· 球 ' + (ui ? ui.ballButtons : '?') + ' 个');
  console.log('  缺失元素：' + (ui && ui.missing.length ? ui.missing.join(', ') : '无'));
  console.log('  超出视口：' + (ui && ui.offscreen.length ? ui.offscreen.join(', ') : '无'));
  await shot('v18-ui-' + label);
}
console.log('\n异常 ' + errors.length + ' 条');
errors.slice(0, 4).forEach(e => console.log('  ❌ ' + e));
ws.close();
