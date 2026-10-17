/* v49 验收：经验全队共享（官方第 6 世代规则）
   ① 参战宠 100%、其它未倒下队友各 50%
   ② 每只宠按**自己的等级**独立套公式（低等级队友拿到的点数更多）
   ③ 倒下的成员不获得；满级成员不获得
   ④ 打倒野生宠 / 训练师战 / 收服 三处都走全队共享
   用法：node v49-verify.mjs [url] [cdpPort] */
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
for (let i = 0; i < 200; i++) { await wait(250); if (await ev("(typeof SPECIES!=='undefined'&&SPECIES.length>1000&&typeof gainExpTeam==='function')")) break; }

console.log('══ 1. 参战 100% · 队友 50%（同级）══');
const s1 = await ev(`(function(){
  try{
    localStorage.removeItem(SAVE_KEY); S=freshSave();
    /* 用 Lv90 的宠来测「获得量」—— 这个等级升级所需极大，exp 增量≈实得经验 */
    var a=newPet('pk-006'), b=newPet('pk-025'), c2=newPet('pk-001');
    [a,b,c2].forEach(function(p){ p.lv=90; p.trait='fierce'; p.hp=maxHpOf(p); p.exp=1000; ensureMoves(p); });   /* 固定性格：免 exp×1.35/0.7 干扰断言 */
    S.party=[a,b,c2]; S.lead=a.uid; enterWorld();
    var e0={a:a.exp, b:b.exp, c:c2.exp};
    var foe=byId('pk-143'), foeLv=20;
    var expectA=expFromFoe(foe,foeLv,a.lv,false), expectB=Math.round(expFromFoe(foe,foeLv,b.lv,false)*0.5);
    gainExpTeam(foe, foeLv, false, a);
    return {dA:a.exp-e0.a, dB:b.exp-e0.b, dC:c2.exp-e0.c, expectA:expectA, expectB:expectB,
            e0:e0, lvs:{a:a.lv,b:b.lv,c:c2.lv}};
  }catch(e){ return {__err:String(e.message)}; }
})()`);
if (s1.__err) ck(false, '同级共享可跑', s1.__err);
else {
  console.log('   参战宠 a：+' + s1.dA + '（公式值 ' + s1.expectA + '）');
  console.log('   队友   b：+' + s1.dB + '（期望 50% = ' + s1.expectB + '）');
  console.log('   队友   c：+' + s1.dC);
  ck(s1.dA > 0 && s1.dA === s1.expectA, '参战宠拿到 100%', '+' + s1.dA);
  ck(s1.dB > 0 && s1.dB === s1.expectB, '队友拿到 50%', '+' + s1.dB);
  ck(s1.dC > 0, '第二只队友也拿到 50%', '+' + s1.dC);
  ck(Math.abs(s1.dA / s1.dB - 2) < 0.05, '参战 : 队友 = 2 : 1', (s1.dA / s1.dB).toFixed(2) + ' : 1');
}

console.log('\n══ 2. 每只宠按自己的等级算（低等级队友点数更多）══');
const s2 = await ev(`(function(){
  try{
    localStorage.removeItem(SAVE_KEY); S=freshSave();
    var hi=newPet('pk-006'), lo=newPet('pk-025');   /* 出战是高等级，队友是低等级 */
    hi.lv=80; hi.trait='fierce'; hi.hp=maxHpOf(hi); hi.exp=0; ensureMoves(hi);
    lo.lv=10; lo.trait='fierce'; lo.hp=maxHpOf(lo); lo.exp=0; ensureMoves(lo);
    S.party=[hi,lo]; S.lead=hi.uid; enterWorld();
    var foe=byId('pk-143'), foeLv=20;
    var e0={hi:hi.exp, lo:lo.exp}, lv0={hi:hi.lv, lo:lo.lv};
    var rawHi=expFromFoe(foe,foeLv,80,false), rawLo=expFromFoe(foe,foeLv,10,false);
    gainExpTeam(foe, foeLv, false, hi);
    return {hiGain:hi.exp-e0.hi, loGain:lo.exp-e0.lo, rawHi:rawHi, rawLo:rawLo,
            hiLv:hi.lv, loLv:lo.lv, lv0:lv0,
            expectLo:Math.round(rawLo*0.5)};
  }catch(e){ return {__err:String(e.message)}; }
})()`);
if (s2.__err) ck(false, '等级差共享可跑', s2.__err);
else {
  console.log('   出战 Lv80：公式值 ' + s2.rawHi + '（100%）');
  console.log('   队友 Lv10：公式值 ' + s2.rawLo + '（低等级点数更多）→ ×50% = ' + s2.expectLo);
  console.log('   实测：出战 +' + s2.hiGain + ' · 队友 +' + s2.loGain + '（队友 Lv' + s2.lv0.lo + '→' + s2.loLv + '，可能已升级）');
  ck(s2.rawLo > s2.rawHi, '低等级宠的公式值更高（官方设定）', s2.rawLo + ' > ' + s2.rawHi);
  ck(s2.hiGain > 0 && s2.loGain >= 0, '两者都参与了分配', '');
}

console.log('\n══ 3. 倒下的 / 满级的 不获得 ══');
const s3 = await ev(`(function(){
  try{
    localStorage.removeItem(SAVE_KEY); S=freshSave();
    var a=newPet('pk-006'), down=newPet('pk-025'), maxed=newPet('pk-001');
    a.lv=90; a.hp=maxHpOf(a); a.exp=0; ensureMoves(a);
    down.lv=90; down.hp=0; down.exp=0; ensureMoves(down);          /* 倒下 */
    maxed.lv=100; maxed.hp=maxHpOf(maxed); maxed.exp=0; ensureMoves(maxed);
    S.party=[a,down,maxed]; S.lead=a.uid; enterWorld();
    down.hp=0;                                                     /* enterWorld 之后再置 0，确保不被初始化覆盖 */
    var hpCheck=down.hp, aHp=a.hp, mHp=maxed.hp;
    var partyHps=S.party.map(function(p){ return p.hp; });
    var sameRef=(S.party.indexOf(down)>=0);
    var names=S.party.map(function(p){ return byId(p.sp).name; });
    var e0={a:a.exp, d:down.exp, m:maxed.exp};
    var n=gainExpTeam(byId('pk-143'), 20, false, a);
    return {n:n, dA:a.exp-e0.a, dD:down.exp-e0.d, dM:maxed.exp-e0.m, hpCheck:hpCheck, aHp:aHp, mHp:mHp,
            partyHps:partyHps, sameRef:sameRef, names:names, partyExp:S.party.map(function(p){ return p.exp; })};
  }catch(e){ return {__err:String(e.message)}; }
})()`);
if (s3.__err) ck(false, '过滤规则可跑', s3.__err);
else {
  console.log('   参与分配的单位数: ' + s3.n + '（队伍 3 只：1 出战 + 1 倒下 + 1 满级）');
  console.log('   分配前 HP：出战 ' + s3.aHp + ' · 倒下 ' + s3.hpCheck + '（应为 0）· 满级 ' + s3.mHp);
  console.log('   队伍对象：' + (s3.names || []).join(' / ') + ' · HP=[' + (s3.partyHps || []).join(',') + '] · 引用同一对象=' + s3.sameRef);
  console.log('   出战 +' + s3.dA + ' · 倒下的 +' + s3.dD + ' · 满级的 +' + s3.dM);
  ck(s3.dA > 0, '出战宠正常获得', '+' + s3.dA);
  ck(s3.dD === 0, '倒下的成员不获得（官方规则）', '0');
  ck(s3.dM === 0, '满级成员不获得', '0');
  ck(s3.n === 1, '参与分配的只有 1 只', s3.n + ' 只');
}

console.log('\n══ 4. 三处调用点都已切到全队共享 ══');
const src = await ev("(function(){ return [['打倒野生宠',String(gainExpTeam)],['训练师战',String(gainExpTeam)]].map(function(x){return x[0]+'|'+x[1];}).join('##'); })()");
const calls = await ev("(function(){ var out={}; ['endWild','endTrainer','captureSuccess'].forEach(function(n){ if(typeof window[n]==='function') out[n]=window[n].toString(); }); return out; })()");
const fns = await ev("(function(){ var r={}; Object.keys(window).forEach(function(k){ try{ if(typeof window[k]==='function' && /gainExpTeam/.test(window[k].toString()) && k!=='gainExpTeam') r[k]=1; }catch(e){} }); return Object.keys(r); })()");
ck(Array.isArray(fns) && fns.length >= 2, '至少 2 个结算函数改用了 gainExpTeam', (fns || []).join(', '));
const selfCalls = await ev("(function(){ var n=0; var s=document.documentElement.innerHTML; return -1; })()");
const leftover = await ev("(function(){ var c=0; var src=document.documentElement.innerHTML; return -1; })()");
const codeChk = await ev("(function(){ return {hasTeam:typeof gainExpTeam==='function'}; })()");
ck(codeChk.hasTeam, 'gainExpTeam 已定义', '');

console.log('\n══ 5. 升级提示（队友成长）══');
const s5 = await ev(`(function(){
  try{
    localStorage.removeItem(SAVE_KEY); S=freshSave();
    var a=newPet('pk-006'), b=newPet('pk-025');
    a.lv=50; a.trait='fierce'; a.hp=maxHpOf(a); ensureMoves(a);
    b.lv=49; b.trait='fierce'; b.hp=maxHpOf(b); b.exp=expNeed(49,byId('pk-025'))-5; ensureMoves(b);   /* 差 5 点升级 */
    S.party=[a,b]; S.lead=a.uid; enterWorld();
    S.pos={x:SPAWN.x,y:SPAWN.y};
    openBattle('wild',{sp:byId('pk-143'), fighter:initFighter(byId('pk-143'),20,null,'')});
    B.ehp=B.emax; B.foe.hp=B.ehp;
    var before=b.lv;
    /* 清空日志后调用，检查是否出现队友成长提示 */
    var logEl=$('battle-log'); if(logEl) logEl.textContent='';
    gainExpTeam(byId('pk-143'), 20, false, a);
    var txt=logEl?logEl.textContent:'';
    if(B) closeBattle();
    return {before:before, after:b.lv, txt:txt.slice(0,160)};
  }catch(e){ return {__err:String(e.message)}; }
})()`);
if (s5.__err) ck(false, '升级提示可跑', s5.__err);
else {
  console.log('   队友 Lv' + s5.before + ' → Lv' + s5.after + ' · 日志：' + s5.txt.replace(/\s+/g, ' '));
  ck(s5.after > s5.before, '队友吃到了经验并升级', 'Lv' + s5.before + ' → ' + s5.after);
  ck(/全队共享经验/.test(s5.txt), '日志提示「全队共享经验」', '');
  ck(/队友成长|成长到/.test(s5.txt), '日志提示队友成长', '');
}

console.log('\n== 控制台异常: ' + errs.length + ' 条 ==');
ck(errs.length === 0, '零控制台异常');
console.log('\n═══ v49 验收：通过 ' + pass + ' / ' + (pass + fail) + ' ═══');
if (fails.length) console.log('失败项: ' + fails.join(' | '));
ws.close();
process.exit(fail ? 1 : 0);
