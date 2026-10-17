/* v30 验收：①治疗按钮+PP回满 ②馆主满血 ③道路不分裂 ④克制伤害不再被削平
   用法：node v30-accept.mjs [url] [cdpPort] */
import { WebSocket } from 'ws';
const URL_BASE = process.argv[2] || 'http://127.0.0.1:8727/';
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
for (let i = 0; i < 200; i++) { await wait(250); if (await ev("(typeof TOWNS!=='undefined'&&TOWNS.length&&typeof map!=='undefined'&&map&&map.length&&typeof quickHealAll==='function')") === true) break; }
await ev(`(function(){try{localStorage.removeItem(SAVE_KEY);S=freshSave();var p=newPet('pk-001');p.lv=30;p.hp=maxHpOf(p);ensureMoves(p);S.party=[p];S.lead=p.uid;S.pos={x:SPAWN.x,y:SPAWN.y};enterWorld();return 'ok';}catch(e){return 'ERR '+e.message;}})()`);

console.log('【1】右上角治疗按钮 + PP 回满');
const r1 = await ev(`(function(){
  try{
    var out={};
    out.btnExists = !!$('btn-heal');
    out.btnText = $('btn-heal') ? $('btn-heal').textContent : '';
    var cs = $('btn-heal') ? getComputedStyle($('btn-heal')) : null;
    out.hudSticky = getComputedStyle($('hud')).position;
    /* 制造「PP 不同步」的场景（复现用户遇到的路径） */
    var p=S.party[0];
    p.pp[p.moves[0]] = 0;
    p.ppSp = '___bad___';                     /* 让 healPP 走进 syncPP 分支 */
    out.beforePP = JSON.parse(JSON.stringify(p.pp));
    quickHealAll();
    out.afterPP = JSON.parse(JSON.stringify(p.pp));
    out.maxPP = {}; p.moves.forEach(function(id){ out.maxPP[id]=ppMaxOf(id); });
    out.allFull = p.moves.every(function(id){ return p.pp[id]===ppMaxOf(id); });
    out.hpFull = p.hp===maxHpOf(p);
    return JSON.stringify(out);
  }catch(e){ return 'ERR '+e.message; }
})()`);
if (r1 && r1.__err) ck(false, '治疗按钮/PP', r1.__err);
else {
  const o = JSON.parse(r1);
  ck(o.btnExists === true, 'HUD 有常驻「🏥 治疗」按钮', o.btnText);
  ck(o.hudSticky === 'sticky', 'HUD 吸顶（按钮固定在右上角）', o.hudSticky);
  ck(o.allFull === true, '治疗后 PP 全部回满（含"状态不同步"场景）',
    JSON.stringify(o.afterPP) + ' / 上限 ' + JSON.stringify(o.maxPP));
  ck(o.hpFull === true, '治疗后 HP 回满', '');
}

console.log('\n【2】道馆馆主的宠必须满血');
const r2 = await ev(`(function(){
  try{
    var t=null; TOWNS.forEach(function(q){ if(q.region==='plain') t=q; });
    S.party[0].hp=maxHpOf(S.party[0]);
    gymPending=t; 
    var btn=$('gym-ok'); openGym(t);
    beginGymBattle(t);
    var out={team:TB.team.map(function(f){ return {name:byId(f.sp).name, lv:f.lv, hp:f.hp, max:maxHpOf(f), full:(f.hp===maxHpOf(f))}; })};
    out.allFull = out.team.every(function(x){ return x.full; });
    if(B) closeBattle();
    return JSON.stringify(out);
  }catch(e){ return 'ERR '+e.message; }
})()`);
if (r2 && r2.__err) ck(false, '馆主满血', r2.__err);
else {
  const o = JSON.parse(r2);
  ck(o.allFull === true, '馆主每只都满血', o.team.map(x => x.name + ' ' + x.hp + '/' + x.max).join(' · '));
}

console.log('\n【3】平原镇道路不再从中心分裂');
const r3 = await ev(`(function(){
  try{
    var t=null; TOWNS.forEach(function(q){ if(q.region==='plain') t=q; });
    /* 镇中心一圈（|dx|<=3,|dy|<=3）的 STREET 数：只有十字街交叉的话是个小十字 */
    var core=0, coreCells=[];
    for(var dy=-3;dy<=3;dy++)for(var dx=-3;dx<=3;dx++){
      var qx=t.x+dx, qy=t.y+dy;
      if(qx<0||qy<0||qx>=MW||qy>=MH) continue;
      if(map[qy*MW+qx]===T.STREET){ core++; coreCells.push(dx+','+dy); }
    }
    /* 中心环上（距离 4~6）的 STREET 数：修复前会有多条辐射路的残留 */
    var ring=0;
    for(var dy2=-6;dy2<=6;dy2++)for(var dx2=-6;dx2<=6;dx2++){
      var d=Math.max(Math.abs(dx2),Math.abs(dy2));
      if(d<4||d>6) continue;
      var qx2=t.x+dx2, qy2=t.y+dy2;
      if(qx2<0||qy2<0||qx2>=MW||qy2>=MH) continue;
      if(map[qy2*MW+qx2]===T.STREET) ring++;
    }
    /* 镇外围（距中心 12~16）有哪些方向有 STREET —— 应该只有门口方向 */
    var dirs={N:0,S:0,E:0,W:0};
    for(var r=12;r<=16;r++){
      if(map[(t.y-r)*MW+t.x]===T.STREET) dirs.N++;
      if(map[(t.y+r)*MW+t.x]===T.STREET) dirs.S++;
      if(map[t.y*MW+(t.x+r)]===T.STREET) dirs.E++;
      if(map[t.y*MW+(t.x-r)]===T.STREET) dirs.W++;
    }
    return JSON.stringify({core:core, ring:ring, dirs:dirs, cells:coreCells.join(' ')});
  }catch(e){ return 'ERR '+e.message; }
})()`);
if (r3 && r3.__err) ck(false, '道路', r3.__err);
else {
  const o = JSON.parse(r3);
  /* 镇内只剩十字街：中心 7×7 内 STREET 正好是横竖两条（13 格但被截到 7×7 → 13 格） */
  ck(o.core <= 13, '镇中心只有十字街（无多余辐射路）', '中心 7×7 内 STREET ' + o.core + ' 格');
  ck(o.ring <= 13, '中心外圈也没有额外辐射路', '4~6 环上 ' + o.ring + ' 格');
  console.log('     镇外各方向 12~16 格的 STREET 数: 北' + o.dirs.N + ' 南' + o.dirs.S + ' 东' + o.dirs.E + ' 西' + o.dirs.W);
}

console.log('\n【4】克制伤害不再被 85% 上限削平（复现你的场景）');
const r4a = await ev(`(function(){
  try{
    var A='pk-795', D='pk-565';                 /* 费洛美螂 · 肋骨海龟 */
    var asp=byId(A), dsp=byId(D);
    if(!asp||!dsp) return JSON.stringify({err:'缺少 '+(!asp?A:D)});
    /* 找 130 威力的格斗招（飞膝踢） */
    var mid=null;
    Object.keys(MOVES).forEach(function(k){ var m=MOVES[k]; if(m.type==='fight' && m.power>=120 && (!mid||m.power>MOVES[mid].power)) mid=k; });
    if(!mid) return JSON.stringify({err:'招表里没有 120+ 格斗招'});
    var a=newPet(A); a.lv=66; a.hp=maxHpOf(a); ensureMoves(a);
    a.moves[0]=mid; syncPP(a);
    S.party=[a]; S.lead=a.uid;
    var foe=initFighter(dsp, 46, null, ''); foe.hp=maxHpOf(foe);
    openBattle('wild',{sp:dsp, fighter:foe});
    B.ehp=foe.hp; B.emax=maxHpOf(foe); B.foe.hp=B.ehp; B.sPP=a.pp;
    var e=eff(MOVES[mid].type, dsp);
    var lvPress=clamp(0.5+0.5*(66/46),0.5,2.0);
    window.__v30={before:B.ehp, mid:mid};
    useMove(mid);
    return JSON.stringify({mv:MOVES[mid].name, power:MOVES[mid].power, type:MOVES[mid].type,
      atkName:asp.name, defName:dsp.name, defHp:B.emax, eff:e, lvPress:+lvPress.toFixed(3), before:window.__v30.before});
  }catch(e){ return 'ERR '+e.message; }
})()`);
if (r4a && r4a.__err) ck(false, '克制伤害场景', r4a.__err);
else {
  const o = JSON.parse(r4a);
  if (o.err) ck(false, '数据齐全', o.err);
  else {
    await wait(1500);
    const r4b = await ev(`(function(){ try{ var hp=(B?B.ehp:0), mx=(B?B.emax:null); if(B) closeBattle(); return JSON.stringify({after:hp, max:mx}); }catch(e){ return 'ERR '+e.message; } })()`);
    const b = JSON.parse(r4b);
    const dmg = o.before - (b.after || 0);
    const oldCap = Math.round(o.defHp * 0.85);
    ck(o.eff >= 2, '格斗 → 水/岩石 = 克制（2×）', 'e=' + o.eff + '  lvPress=' + o.lvPress);
    ck(dmg > oldCap, '克制伤害已突破旧的 85% 上限', dmg + ' > ' + oldCap + '（对手满血 ' + o.defHp + '）');
    ck(b.after <= 0, '克制一击带走（' + o.mv + ' ' + o.power + ' 威力）',
      o.atkName + ' Lv66 → ' + o.defName + ' Lv46：' + o.before + ' → ' + (b.after <= 0 ? '倒下' : b.after) + '（伤害 ' + dmg + '）');
  }
}

console.log('\n== 控制台异常: ' + errs.length + ' 条 ==');
if (errs.length) console.log('  ' + errs.slice(0, 3).join('\n  '));
console.log('\n═══ 验收：通过 ' + pass + ' / ' + (pass + fail) + ' ═══');
if (fails.length) console.log('失败项:\n  - ' + fails.join('\n  - '));
ws.close();
process.exit(fail ? 1 : 0);
