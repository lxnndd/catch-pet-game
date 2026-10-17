/* v44 验收：① 八道馆等级 = 官方值 ② 联盟打完冠军后能正常结束（不再卡住）
   官方基准（火红/叶绿 · pokemondb）：
     小刚 12/14 · 小霞 18/21 · 马志士 21/18/24 · 莉佳 29/24/29 ·
     娜姿 38/37/38/43 · 坂木 45/42/44/45/50 · 夏伯 42/40/42/47 · （冰河道馆=科拿 52/51/52/54/54 自创）
   用法：node v44-verify.mjs [url] [cdpPort] */
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
for (let i = 0; i < 200; i++) { await wait(250); if (await ev("(typeof SPECIES!=='undefined'&&SPECIES.length>1000&&typeof beginLeagueBattle==='function'&&typeof REAL_GYMS!=='undefined')")) break; }

console.log('══ 1. 八道馆等级 = 官方值 ══');
const g = await ev(`(function(){
  var out={};
  Object.keys(REAL_GYMS).forEach(function(r){
    out[r]={leader:REAL_GYMS[r].leader, lvs:REAL_GYMS[r].team.map(function(x){ return x[1]; }),
            names:REAL_GYMS[r].team.map(function(x){ var s=byId(x[0]); return s?s.name:x[0]; })};
  });
  return out;
})()`);
const WANT = {
  mine: [12, 14], ocean: [18, 21], plain: [21, 18, 24], forest: [29, 24, 29],
  flower: [38, 37, 38, 43], desert: [45, 42, 44, 45, 50], volcano: [42, 40, 42, 47],
  snow: [37, 39, 37, 43]   /* v45：雪原改成官方第 5 道馆「浅红·阿桔（毒）」 */
};
Object.keys(WANT).forEach(r => {
  const got = g[r] ? g[r].lvs : null;
  ck(JSON.stringify(got) === JSON.stringify(WANT[r]), r + '（' + (g[r] ? g[r].leader : '?') + '）等级 = 官方',
    (g[r] ? g[r].names.join('/') : '') + ' → ' + JSON.stringify(got));
});

console.log('\n══ 2. 实际开打时用的是官方等级 ══');
const battle = await ev(`(function(){
  try{
    localStorage.removeItem(SAVE_KEY); S=freshSave();
    var p=newPet('pk-025'); p.trait='fierce'; p.lv=50; p.hp=maxHpOf(p); ensureMoves(p);
    S.party=[p]; S.lead=p.uid; S.pos={x:SPAWN.x,y:SPAWN.y}; enterWorld();
    var out={};
    ['mine','volcano'].forEach(function(reg){
      var t=TOWNS.filter(function(q){ return q.region===reg; })[0];
      if(!t){ out[reg]='(无此镇)'; return; }
      gymPending=t; openGym(t); beginGymBattle(t);
      out[reg]={levels:(TB&&TB.team)?TB.team.map(function(f){ return f.lv; }):null,
                names:(TB&&TB.team)?TB.team.map(function(f){ return byId(f.sp).name; }):null,
                note:$('gym-note').textContent.split(String.fromCharCode(10))[0]};
      if(B) closeBattle();
    });
    return out;
  }catch(e){ return {__err:String(e.message)}; }
})()`);
if (battle.__err) ck(false, '道馆战可开', battle.__err);
else {
  Object.keys(battle).forEach(reg => {
    const b = battle[reg];
    if (typeof b === 'string') { ck(false, reg, b); return; }
    ck(JSON.stringify(b.levels) === JSON.stringify(WANT[reg]), reg + ' 实战队伍等级', JSON.stringify(b.levels) + ' · ' + (b.names || []).join('/'));
    ck(/官方配置/.test(b.note), reg + ' 面板文案已更新', b.note);
  });
}

console.log('\n══ 3. 联盟：打完冠军必须能结束（原 bug：卡在「第 6 位」，点了没反应）══');
const lg = await ev(`(function(){
  try{
    var out={};
    S.badges=['plain','forest','flower','mine','desert','ocean','volcano','snow'];
    S.champion=0; LEAGUE_IDX=0;
    /* 进度 0/5 */
    openLeague();
    out.at0={note:$('gym-note').textContent, btn:$('gym-ok').textContent, sub:$('gym-sub').textContent};
    /* 打完 4 天王 → 冠军赛 */
    LEAGUE_IDX=4; openLeague();
    out.at4={note:$('gym-note').textContent, btn:$('gym-ok').textContent};
    /* 打完冠军 → LEAGUE_IDX 涨到 5（真实流程里的值） */
    LEAGUE_IDX=REAL_E4.length; openLeague();
    out.at5={note:$('gym-note').textContent, btn:$('gym-ok').textContent, sub:$('gym-sub').textContent,
             hasChampionFlag:!!S.champion};
    /* 越界直调要有明确反馈（此时还没开战，B 为空，才走得到越界分支） */
    LEAGUE_IDX=0;
    beginLeagueBattle(REAL_E4.length);
    out.overflowToast=$('toast')?$('toast').textContent:'';
    /* 最后再测按钮点击（这一步会真的开战，所以放到最后） */
    LEAGUE_IDX=REAL_E4.length; openLeague();
    ($('gym-ok').onclick) && $('gym-ok').onclick();
    out.afterClickResets=(LEAGUE_IDX===0);
    if(B) closeBattle();
    /* 存档标记：模拟打赢冠军那一步 */
    S.champion=1; LEAGUE_IDX=0; openLeague();
    out.fromSave={btn:$('gym-ok').textContent, sub:$('gym-sub').textContent};
    return out;
  }catch(e){ return {__err:String(e.message)}; }
})()`);
if (lg.__err) ck(false, '联盟流程可跑', lg.__err);
else {
  console.log('   进度 0/5 按钮: ' + lg.at0.btn + ' | ' + lg.at0.note.split(String.fromCharCode(10))[0]);
  ck(/第 1 位 \/ 共 4 位/.test(lg.at0.btn), '进度 0 时按钮显示「第 1 位 / 共 4 位」（v45 修正：四天王只有 4 位，冠军另计）', lg.at0.btn);
  console.log('   进度 4/5 按钮: ' + lg.at4.btn);
  ck(/挑战冠军/.test(lg.at4.btn), '打完四天王后按钮变成「挑战冠军」', lg.at4.btn);
  console.log('   进度 5/5 按钮: ' + lg.at5.btn + ' | sub: ' + lg.at5.sub);
  ck(/重新挑战联盟/.test(lg.at5.btn), '打完冠军后按钮变成「重新挑战联盟」（不再是第 6 位）', lg.at5.btn);
  ck(/已夺冠/.test(lg.at5.sub), '标题区显示「🏆 已夺冠」', lg.at5.sub);
  ck(/联盟冠军/.test(lg.at5.note), '文案明确说明已夺冠', lg.at5.note.split(String.fromCharCode(10))[0]);
  ck(lg.afterClickResets === true, '点「重新挑战」会重置进度（可再打一轮）', 'LEAGUE_IDX → 0');
  ck(/已经打赢整个联盟/.test(lg.overflowToast), '越界直调有明确提示（不再静默失败）', lg.overflowToast);
  ck(/重新挑战联盟/.test(lg.fromSave.btn), '存档里有夺冠标记时也显示已夺冠', lg.fromSave.btn);
}

console.log('\n== 控制台异常: ' + errs.length + ' 条 ==');
ck(errs.length === 0, '零控制台异常');
console.log('\n═══ v44 验收：通过 ' + pass + ' / ' + (pass + fail) + ' ═══');
if (fails.length) console.log('失败项: ' + fails.join(' | '));
ws.close();
process.exit(fail ? 1 : 0);
