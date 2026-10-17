/* v80 验收：龙之怒/音爆（固定伤害）· 重磅冲撞/踢倒（体重威力）· 68 条错误描述已清
   用法：node v80-fixed.mjs [url] [cdpPort] */
import { WebSocket } from 'ws';
const URL_BASE = process.argv[2] || 'http://127.0.0.1:8728/';
const CDP_PORT = process.argv[3] || '9335';
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
await send('Page.navigate', { url: URL_BASE + '?t=' + Date.now() });
for (let i = 0; i < 200; i++) { await wait(250); if (await ev("(typeof SPECIES!=='undefined'&&SPECIES.length>1000&&typeof weightPower==='function')")) break; }

const S = `
  function idOf(nm){ var r=null; Object.keys(MOVES).forEach(function(k){ if(MOVES[k].name===nm) r=k; }); return r; }
  function arena(aId,bId,lv){
    localStorage.removeItem(SAVE_KEY); S=freshSave();
    var me=newPet(aId||'pk-006'); me.trait='fierce'; me.lv=lv||40; me.hp=maxHpOf(me); ensureMoves(me); me.hp=maxHpOf(me);
    S.party=[me]; S.lead=me.uid; S.pos={x:SPAWN.x,y:SPAWN.y}; enterWorld();
    var foe=initFighter(byId(bId||'pk-143'),lv||40,'fierce',null); foe.hp=maxHpOf(foe);
    openBattle('wild',{sp:byId(bId||'pk-143'), fighter:foe});
    B.ehp=B.emax=maxHpOf(foe); B.foe.hp=B.ehp; B.fld={me:{},foe:{}};
    return {me:me, foe:B.foe};
  }
  function use(nm,self){ var id=idOf(nm); if(!id) return ['（本作没有「'+nm+'」）'];
    return applyMove(MOVES[id], self?byId('pk-006'):byId('pk-143'), self?byId('pk-143'):byId('pk-006'), !!self); }
`;

console.log('══ 1. 龙之怒 / 音爆：固定伤害 ══');
const r1 = await ev(`(function(){ try{ ${S} var out={};
  ['龙之怒','音爆'].forEach(function(nm){
    var a=arena(), me=a.me;
    /* 音爆自带 90 命中，试几次取命中的那次（打空时伤害为 0） */
    var lines=[], dmg=0;
    for(var k=0;k<6 && !dmg;k++){ B.ehp=B.emax; lines=use(nm,true); dmg=B.emax-B.ehp; }
    out[nm]={dmg:dmg, max:B.emax, fm:!!idOf(nm), fx:JSON.stringify(fxOf(MOVES[idOf(nm)])), log:lines.join(' | ').slice(0,60)};
  });
  /* 换个高等级对手，固定伤害应该还是同一个数 */
  var a2=arena('pk-006','pk-143',80); var l2=use('龙之怒',true);
  out.highLv={dmg:B.emax-B.ehp};
  return out;
}catch(e){ return {__err:String(e.message)}; } })()`);
if (r1.__err) ck(false, '固定伤害可测', r1.__err);
else {
  ['龙之怒', '音爆'].forEach(nm => {
    const o = r1[nm];
    console.log('   ' + nm + '：存在=' + o.fm + ' · ' + o.fx + ' · 伤害 ' + o.dmg + ' · 「' + o.log + '」');
    ck(o.fm && o.dmg > 0, nm + ' **可以正常使用**并造成伤害', o.dmg + ' 点');
  });
  ck(r1['龙之怒'].dmg === 40, '龙之怒固定 40 点伤害（与对手等级无关）', r1['龙之怒'].dmg + ' 点');
  ck(r1['音爆'].dmg === 20, '音爆固定 20 点伤害', r1['音爆'].dmg + ' 点');
  ck(r1.highLv.dmg === 40, '面对 80 级对手时龙之怒**仍是 40**', r1.highLv.dmg + ' 点');
}

console.log('\n══ 2. 重磅冲撞 / 踢倒：威力随体重 ══');
const r2 = await ev(`(function(){ try{ ${S}
  var out={};
  function dmgOf(nm,aId,bId){
    var a=arena(aId,bId,50); B.ehp=B.emax;
    var l=use(nm,true);
    return {dmg:B.emax-B.ehp, log:l.join(' | ').slice(0,44), myW:wtOf(byId(aId)), foeW:wtOf(byId(bId))};
  }
  /* 我重(卡比兽) vs 它轻(皮卡丘) → 重磅冲撞威力应更高；我轻 vs 它重 → 更低 */
  out.heavy_vs_light=dmgOf('重磅冲撞','pk-143','pk-025');
  out.light_vs_heavy=dmgOf('重磅冲撞','pk-025','pk-143');
  /* 踢倒：对手越重威力越大 */
  out.kick_vs_heavy=dmgOf('踢倒','pk-025','pk-143');
  out.kick_vs_light=dmgOf('踢倒','pk-025','pk-025');
  /* 公式直测 */
  out.f={ h_1_1:weightPower(true,300,300), h_5_1:weightPower(true,500,100), h_1_5:weightPower(true,100,500),
          l_5:weightPower(false,100,50), l_500:weightPower(false,100,5000) };
  return out;
}catch(e){ return {__err:String(e.message)}; } })()`);
if (r2.__err) ck(false, '体重可测', r2.__err);
else {
  console.log('   卡比兽(' + r2.heavy_vs_light.myW + 'hg) 对 皮卡丘(' + r2.heavy_vs_light.foeW + 'hg)：重磅冲撞 ' + r2.heavy_vs_light.dmg + ' 点 · 「' + r2.heavy_vs_light.log + '」');
  console.log('   皮卡丘(' + r2.light_vs_heavy.myW + 'hg) 对 卡比兽(' + r2.light_vs_heavy.foeW + 'hg)：重磅冲撞 ' + r2.light_vs_heavy.dmg + ' 点');
  console.log('   踢倒打重对手 ' + r2.kick_vs_heavy.dmg + ' 点（对手 ' + r2.kick_vs_heavy.foeW + 'hg） · 打轻对手 ' + r2.kick_vs_light.dmg + ' 点');
  console.log('   公式：等重=' + r2.f.h_1_1 + ' · 我5倍重=' + r2.f.h_5_1 + ' · 我1/5重=' + r2.f.h_1_5 + ' · 踢倒50hg=' + r2.f.l_5 + ' · 踢倒5000hg=' + r2.f.l_500);
  ck(r2.heavy_vs_light.dmg > r2.light_vs_heavy.dmg, '重磅冲撞：**自己越重威力越大**', r2.heavy_vs_light.dmg + ' > ' + r2.light_vs_heavy.dmg);
  ck(r2.kick_vs_heavy.dmg > r2.kick_vs_light.dmg, '踢倒：**对手越重威力越大**', r2.kick_vs_heavy.dmg + ' > ' + r2.kick_vs_light.dmg);
  ck(r2.f.h_5_1 === 120 && r2.f.h_1_5 === 40, '官方分档正确（我5倍重=120 / 我1/5重=40）', r2.f.h_5_1 + ' / ' + r2.f.h_1_5);
  ck(r2.f.l_5 === 20 && r2.f.l_500 === 120, '踢倒分档正确（5kg=20 / 500kg=120）', r2.f.l_5 + ' / ' + r2.f.l_500);
}

console.log('\n══ 3. 68 条「无法使用这个招式」的错误描述已清 ══');
const r3 = await ev(`(function(){
  var bad=[], n=0;
  Object.keys(MOVES).forEach(function(id){
    n++;
    var d=MOVES[id].desc||'';
    if(d.indexOf('无法使用这个招式')>=0) bad.push(MOVES[id].name);
  });
  return {n:n, badN:bad.length, bad:bad.slice(0,10)};
})()`);
if (r3.__err) ck(false, '描述可查', r3.__err);
else {
  console.log('   检查 ' + r3.n + ' 个招式，仍带错误描述的：' + r3.badN + ' 条');
  ck(r3.badN === 0, '**没有任何招式**再写着「无法使用这个招式」', r3.badN ? r3.bad.join('·') : '全部清除');
}

console.log('\n══ 4. 这几招的提示框文案 ══');
const r4 = await ev(`(function(){
  function idOf(nm){ var r=null; Object.keys(MOVES).forEach(function(k){ if(MOVES[k].name===nm) r=k; }); return r; }
  var out={};
  ['龙之怒','音爆','重磅冲撞','踢倒'].forEach(function(nm){ out[nm]=moveEffectText(idOf(nm)); });
  return out;
})()`);
if (r4.__err) ck(false, '文案可查', r4.__err);
else {
  Object.keys(r4).forEach(nm => console.log('   ' + nm.padEnd(6) + ' → ' + r4[nm]));
  ck(/固定 40/.test(r4['龙之怒']) || /40/.test(r4['龙之怒']), '龙之怒的文案说明了固定伤害', r4['龙之怒']);
}

console.log('\n== 控制台异常: ' + errs.length + ' 条 ==');
ck(errs.length === 0, '零控制台异常');
console.log('\n═══ v80 验收：通过 ' + pass + ' / ' + (pass + fail) + ' ═══');
if (fails.length) console.log('失败项: ' + fails.join(' | '));
ws.close();
process.exit(0);
