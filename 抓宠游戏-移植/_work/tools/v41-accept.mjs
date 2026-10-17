/* v41 验收（本地 CDP）：
   ① 官方数据注入（base_experience / growth_rate / 招式中文描述）
   ② 能力值与血量公式改成宝可梦官方口径
   ③ 经验曲线改成官方六种曲线（升级不再一场一级）
   ④ 获得经验改成官方第七世代公式
   ⑤ 长按技能弹出介绍浮层
   用法：node v41-accept.mjs [url] [cdpPort] [shotDir] */
import { WebSocket } from 'ws';
import { mkdirSync, writeFileSync } from 'node:fs';

const URL_BASE = process.argv[2] || 'http://127.0.0.1:8728/';
const CDP_PORT = process.argv[3] || '9335';
const SHOT_DIR = process.argv[4] || 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/shots-v41';
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
const ev = async e => {
  const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) return { __err: String(r.exceptionDetails.exception?.description || '').slice(0, 400) };
  return r.result?.value;
};
const wait = ms => new Promise(r => setTimeout(r, ms));
const ck = (ok, name, extra) => { if (ok) { pass++; console.log('  ✅ ' + name + (extra ? '  →  ' + extra : '')); } else { fail++; fails.push(name); console.log('  ❌ ' + name + (extra ? '  →  ' + extra : '')); } };

await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
try { mkdirSync(SHOT_DIR, { recursive: true }); } catch (e) { }
const shot = async (name) => { try { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(SHOT_DIR + '/' + name + '.png', Buffer.from(r.data, 'base64')); } catch (e) { } };

await send('Page.navigate', { url: URL_BASE + '?t=' + Date.now() });
for (let i = 0; i < 200; i++) { await wait(250); if (await ev("(typeof GROWTH_FN!=='undefined'&&typeof SPECIES!=='undefined'&&SPECIES.length>1000)")) break; }

console.log('══ 1. 官方数据注入 ══');
const inj = await ev(`(function(){
  var o={};
  var a=byId('pk-006'), b=byId('pk-025'), k=byId('kz-006');
  o.pk006={name:a.name,b:a.b,growth:a.growth};
  o.pk025={name:b.name,b:b.b,growth:b.growth};
  o.kz006={name:k.name,b:(k.b===undefined?null:k.b),growth:(k.growth||null),usedG:growthOf(k),usedB:baseExpOf(k)};
  o.descCount=Object.keys(MOVES).filter(function(id){return MOVES[id].desc;}).length;
  o.sampleDesc=(MOVES['mv171']&&MOVES['mv171'].desc)||'';
  o.sampleName=(MOVES['mv171']&&MOVES['mv171'].name)||'';
  return o;
})()`);
ck(inj.pk006 && inj.pk006.b === 240 && inj.pk006.growth === 'medium-slow', '喷火龙 b=240 / growth=medium-slow', JSON.stringify(inj.pk006));
ck(inj.pk025 && inj.pk025.b === 112 && inj.pk025.growth === 'medium', '皮卡丘 b=112 / growth=medium', JSON.stringify(inj.pk025));
ck(inj.kz006 && inj.kz006.b === null && inj.kz006.growth === null && inj.kz006.usedG === 'medium', '洛克（火神）无官方值 → 回落 medium 曲线', JSON.stringify(inj.kz006));
ck(inj.descCount > 440, '招式带中文描述数 > 440（v78 删掉 68 条「无法使用这个招式」的删招世代说明）', String(inj.descCount));
ck(/吸取/.test(inj.sampleDesc), '示例描述已注入（' + inj.sampleName + '）', String(inj.sampleDesc).slice(0, 30));

console.log('\n══ 2. 能力值 / 血量：官方公式 ══');
const stats = await ev(`(function(){
  return {
    pk025a50: statVal(byId('pk-025'),'a',50),
    pk025a100: statVal(byId('pk-025'),'a',100),
    hp45_50: maxHpAt(byId('pk-001'),50),
    hp45_1: maxHpAt(byId('pk-001'),1),
    hp100_50: maxHpAt(byId('pk-150'),50),
    sameSource: (statValOf(byId('pk-025'),'a',50)===statVal(byId('pk-025'),'a',50))
  };
})()`);
ck(stats.pk025a50 === Math.floor((2 * 55 + 31) * 50 / 100) + 5, '皮卡丘 Lv50 物攻 = 官方公式', String(stats.pk025a50));
ck(stats.pk025a100 === Math.floor((2 * 55 + 31) * 100 / 100) + 5, '皮卡丘 Lv100 物攻', String(stats.pk025a100));
ck(stats.hp45_50 === 132, '种族45 Lv50 血量 = 132', String(stats.hp45_50));
ck(stats.hp45_1 === 24, '种族45 Lv1 血量 = 24（没有被一击必杀）', String(stats.hp45_1));
ck(stats.sameSource === true, '详情面板与战斗公式同源', String(stats.sameSource));

console.log('\n══ 3. 经验曲线：官方六种曲线 ══');
const exp = await ev(`(function(){
  function G(n){return {growth:n};}
  return {
    medium_need50: expNeed(50, byId('pk-025')),
    mediumslow_need50: expNeed(50, byId('pk-006')),
    slow_need50: expNeed(50, byId('pk-150')),
    medium_total100: expTotalOf(byId('pk-025'),100),
    erratic100: expTotalOf(G('slow-then-very-fast'),100),
    fluctu100: expTotalOf(G('fast-then-very-slow'),100),
    fast100: expTotalOf(G('fast'),100),
    slow100: expTotalOf(G('slow'),100)
  };
})()`);
ck(exp.medium_need50 === 7651, 'medium（皮卡丘）Lv50→51 = 7651', String(exp.medium_need50));
ck(exp.mediumslow_need50 === 7766, 'medium-slow（喷火龙）Lv50→51 = 7766', String(exp.mediumslow_need50));
ck(exp.slow_need50 === 9563, 'slow（超梦）Lv50→51 = 9563', String(exp.slow_need50));
ck(exp.medium_total100 === 1000000 && exp.fast100 === 800000 && exp.slow100 === 1250000, 'Lv100 累计：medium 100万 / fast 80万 / slow 125万', exp.medium_total100 + ' / ' + exp.fast100 + ' / ' + exp.slow100);
ck(exp.erratic100 === 600000 && exp.fluctu100 === 1640000, '最快组 60万 / 最慢组 164万', exp.erratic100 + ' / ' + exp.fluctu100);

console.log('\n══ 4. 升级行为（不再一场一级）══');
const lvl = await ev(`(function(){
  try{
    localStorage.removeItem(SAVE_KEY); S=freshSave();
    var p=newPet('pk-025'); p.trait='fierce';   /* v41 补：固定一个没有 exp 倍率的特性 —— 否则随机到「好奇(1.35)」或「慵懒(0.7)」会让下面的经验断言随机失败 */
    p.lv=50; p.hp=maxHpOf(p); ensureMoves(p);
    S.party=[p]; S.lead=p.uid; S.pos={x:SPAWN.x,y:SPAWN.y}; enterWorld();
    var need=expNeed(50, byId('pk-025'));
    gainExp(p, need-1); var lvA=p.lv, expA=p.exp;
    gainExp(p, 1);      var lvB=p.lv;
    return {need:need, lvA:lvA, expA:expA, lvB:lvB,
            foe25: expFromFoe(byId('pk-025'),25,25,false),
            foe25t: expFromFoe(byId('pk-025'),25,25,true)};
  }catch(e){ return {__err:String(e.message)}; }
})()`);
ck(!lvl.__err, '升级流程可执行', lvl.__err || 'ok');
ck(lvl.lvA === 50 && lvl.expA === lvl.need - 1, '差 1 点经验时不升级（Lv50 需 ' + lvl.need + '）', 'lv=' + lvl.lvA + ' exp=' + lvl.expA);
ck(lvl.lvB === 51, '补上最后 1 点才升到 51', 'lv=' + lvl.lvB);
ck(lvl.foe25 === Math.round(112 * 25 / 5 * Math.pow((2 * 25 + 10) / (25 + 25 + 10), 2.5) + 1), '打赢同级野生皮卡丘获得官方经验', String(lvl.foe25));
ck(lvl.foe25t === Math.round(lvl.foe25 * 1.5), '训练师战 ×1.5', String(lvl.foe25t));

console.log('\n══ 5. 长按技能看介绍 ══');
const longPress = await ev(`(function(){
  try{
    var p=S.party[0];
    openSkillEditor(p);
    var el=document.querySelector('#learn-cur .learn-card')||document.querySelector('.learn-card');
    if(!el) return {__err:'找不到技能卡'};
    var mid=el.getAttribute('data-skill');
    var before=document.getElementById('move-info').classList.contains('hidden');
    el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:20,clientY:20,pointerType:'touch',button:0}));
    return {mid:mid, beforeHidden:before};
  }catch(e){ return {__err:String(e.message)}; }
})()`);
ck(!longPress.__err, '能打开技能编辑面板并按下技能卡', longPress.__err || ('技能 ' + longPress.mid));
await wait(700);
const info = await ev(`(function(){
  var el=document.getElementById('move-info');
  return {hidden:el.classList.contains('hidden'), text:el.textContent||'', html:el.innerHTML.slice(0,120)};
})()`);
ck(info.hidden === false, '长按 450ms 后介绍浮层出现');
ck(!/游戏内效果|本作效果/.test(info.text), '浮层不再有「本作效果/游戏内效果」单独一行（v71 起效果并入介绍）', String(info.text).slice(0, 90));
await shot('v41-01-move-info');
const closed = await ev(`(function(){
  document.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:5,clientY:5}));
  return document.getElementById('move-info').classList.contains('hidden');
})()`);
ck(closed === true, '点任意处可关闭浮层');

console.log('\n══ 6. 图鉴与战斗界面也能长按 ══');
const bind = await ev(`(function(){
  var n=0;
  S.discovered['pk-006']=1; openDexDetail(byId('pk-006'));
  var card=null;
  document.querySelectorAll('#petinfo-body .learn-card').forEach(function(c){
    if(c.getAttribute('data-skill')){ n++; if(!card) card=c; }
  });
  var mid=card?card.getAttribute('data-skill'):null;
  var name=mid&&MOVES[mid]?MOVES[mid].name:'';
  if(card) card.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:30,clientY:30,pointerType:'touch',button:0}));
  return {cards:n, mid:mid, name:name, hasFn:(typeof bindMoveInfo==='function'), hasShow:(typeof showMoveInfo==='function')};
})()`);
ck(bind.hasFn && bind.hasShow, 'bindMoveInfo / showMoveInfo 已定义');
ck(bind.cards > 0, '图鉴技能池卡片可长按', String(bind.cards) + ' 张');
await wait(700);
const dexInfo = await ev(`(function(){
  var el=document.getElementById('move-info');
  return {hidden:el.classList.contains('hidden'), text:el.textContent||''};
})()`);
ck(dexInfo.hidden === false, '图鉴卡片上长按也能弹出介绍');
ck(bind.name && dexInfo.text.indexOf(bind.name) >= 0, '浮层显示的是被长按的那只招（' + bind.name + '）', String(dexInfo.text).slice(0, 60));
await ev("hideMoveInfo()");
await shot('v41-02-dex-petinfo');

const total = await ev(`(function(){
  document.querySelectorAll('.overlay').forEach(function(o){ if(o.id!=='panel-petinfo') o.classList.add('hidden'); });
  return {n:SPECIES.length, m:Object.keys(MOVES).length};
})()`);
console.log('\n  物种 ' + total.n + ' · 招式 ' + total.m);
console.log('== 控制台异常: ' + errs.length + ' 条 ==');
if (errs.length) errs.slice(0, 5).forEach(e => console.log('   ! ' + e));
ck(errs.length === 0, '零控制台异常');

console.log('\n═══ v41 验收：通过 ' + pass + ' / ' + (pass + fail) + ' ═══');
if (fails.length) console.log('失败项: ' + fails.join(' | '));
ws.close();
process.exit(fail ? 1 : 0);
