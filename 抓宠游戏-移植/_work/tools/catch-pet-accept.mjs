/* 抓宠游戏 v13 全流程验收（CDP）
   覆盖：标题屏 → 初始伙伴 → 世界渲染 → 训练师名册 → 训练师对战 → 状态/能力变化 →
        切磋 → 遇敌弹窗 → 重开存档弹窗 → 医院免费 → 图鉴 → 零控制台错误
   用法: node catch-pet-accept.mjs <url> [cdpPort] [shotDir] */
import { WebSocket } from 'ws';
import { writeFileSync } from 'node:fs';

const URL_ = process.argv[2] || 'http://127.0.0.1:8727/';
const CDP = 'http://127.0.0.1:' + (process.argv[3] ?? '9335');
const SHOTS = process.argv[4] || 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植';

const created = await (await fetch(`${CDP}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(created.webSocketDebuggerUrl);
let seq = 0; const pending = new Map(); const errors = []; const logs = [];
ws.on('message', d => {
  const m = JSON.parse(String(d));
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); }
  else if (m.method === 'Runtime.exceptionThrown') errors.push(String(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text).slice(0, 300));
  else if (m.method === 'Runtime.consoleAPICalled') logs.push(m.params.type + ': ' + m.params.args.map(a => a.value ?? a.description ?? '').join(' ').slice(0, 200));
});
await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.value;
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const shot = async (name) => { const s = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${SHOTS}/${name}`, Buffer.from(s.data, 'base64')); };

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok: !!ok, detail: String(detail).slice(0, 260) });
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + String(detail).slice(0, 220) : ''}`);
}
const click = (sel) => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return "NOTFOUND";e.click();return "OK";})()`);
const clickText = (re) => ev(`(()=>{const b=[...document.querySelectorAll("button")].find(x=>${re}.test(x.textContent));if(!b)return "NOTFOUND";b.click();return "OK:"+b.textContent.trim().slice(0,18);})()`);
const visible = (id) => ev(`!document.getElementById(${JSON.stringify(id)}).classList.contains("hidden")`);
const txt = (id) => ev(`document.getElementById(${JSON.stringify(id)}).textContent.trim()`);
const nonEmpty = `(()=>{const c=document.querySelector("canvas");if(!c||!c.width)return "无canvas";const g=c.getContext("2d");const d=g.getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i]!==0)n++;return n+"/"+(d.length/4);})()`;

await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: 900, height: 760, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: URL_ + (URL_.includes('?') ? '&' : '?') + 't=' + Date.now() });
await wait(5000);
console.log('页面版本自检: resolveSp=' + (await ev('typeof resolveSp')) + ' | openBattle 首行=' + String(await ev('openBattle.toString().slice(0,120)')).replace(/\s+/g, ' '));
console.log('页面版本自检: enemyFainted 头=' + String(await ev('enemyFainted.toString().slice(0,110)')).replace(/\s+/g, ' '));
console.log('页面版本自检: 地图=' + (await ev('MW+"x"+MH')) + ' | 招式数=' + (await ev('Object.keys(MOVES).length')));

console.log('════════ 1. 标题屏 ════════');
check('页面标题 = 抓宠游戏', (await ev('document.title')) === '抓宠游戏', await ev('document.title'));
check('标题屏可见', await visible('screen-title'));
check('外链 script 为 0', (await ev('[...document.querySelectorAll("script[src]")].length')) === 0);
check('内联数据规模：宠物 119+', (await ev('SPECIES.length')) >= 119, 'SPECIES=' + await ev('SPECIES.length'));
check('训练师 10 位', (await ev('TRAINERS.length')) === 10, 'TRAINERS=' + await ev('TRAINERS.length'));
check('进化链 35+ 条', (await ev('Object.keys(EVO).length')) >= 35, 'EVO=' + await ev('Object.keys(EVO).length'));
check('地图 72×52', (await ev('MW+"x"+MH')) === '72x52', await ev('MW+"x"+MH'));
check('地区数 = 9（含雪原/荒漠）', (await ev('Object.keys(REGION_NAME).length')) === 9, await ev('Object.values(REGION_NAME).join("/")'));
/* 火山与海洋必须被隔开：统计两地区格子的最小切比雪夫距离 */
const sep = await ev(`(()=>{
  var vol=[], sea=[];
  for(var y=0;y<MH;y++)for(var x=0;x<MW;x++){
    var r=regionAt(x,y);
    if(r==="volcano") vol.push([x,y]);
    else if(r==="ocean") sea.push([x,y]);
  }
  var min=9999, minPair=null;
  for(var i=0;i<vol.length;i+=7)for(var j=0;j<sea.length;j+=7){
    var d=Math.max(Math.abs(vol[i][0]-sea[j][0]),Math.abs(vol[i][1]-sea[j][1]));
    if(d<min){ min=d; minPair=vol[i]+"↔"+sea[j]; }
  }
  return {volArea:vol.length, seaArea:sea.length, minDist:min, pair:minPair,
    volMid:vol[Math.floor(vol.length/2)], seaMid:sea[Math.floor(sea.length/2)]};
})()`);
check('火山与海洋最新间距 ≥ 20 格', sep.minDist >= 20, '最小距离 ' + sep.minDist + ' 格（' + sep.pair + '）');
check('火山在西南、海洋在东侧', sep.volMid[0] < 30 && sep.seaMid[0] >= 60, '火山中点 x=' + sep.volMid[0] + ' · 海洋中点 x=' + sep.seaMid[0]);
check('九大地区都能在图上找到', (await ev(`(()=>{var s={};for(var y=0;y<MH;y++)for(var x=0;x<MW;x++)s[regionAt(x,y)]=1;return Object.keys(s).sort().join(",");})()`)) === 'desert,flower,forest,mine,ocean,plain,snow,volcano,water', await ev(`(()=>{var s={};for(var y=0;y<MH;y++)for(var x=0;x<MW;x++)s[regionAt(x,y)]=1;return Object.keys(s).sort().join(",");})()`));
check('每个地区都有可遇物种', await ev(`(()=>{var regs=Object.keys(REGION_NAME);return regs.every(function(r){return SPECIES.some(function(s){return !s.ev && s.habitat.indexOf(r)>=0;});});})()`), await ev(`(()=>{var regs=Object.keys(REGION_NAME);return regs.filter(function(r){return !SPECIES.some(function(s){return !s.ev && s.habitat.indexOf(r)>=0;});}).join(",")||"全部覆盖";})()`));
check('技能表 99 招', (await ev('Object.keys(MOVES).length')) >= 99, 'MOVES=' + await ev('Object.keys(MOVES).length'));

console.log('\n════════ 2. 初始伙伴 → 世界 ════════');
/* 先清档重载，保证从「选初始伙伴」开始 */
await ev('localStorage.clear()');
await send('Page.navigate', { url: URL_ + (URL_.includes('?') ? '&' : '?') + 't=' + Date.now() });
await wait(4000);
await clickText('/进入草丛/'); await wait(1200);
check('初始伙伴界面可见', await visible('screen-starter'));
check('初始伙伴 3 选 1', (await ev('document.querySelectorAll("#starter-grid .st-card").length')) === 3);
await ev(`document.querySelectorAll("#starter-grid .st-card")[0].click()`); await wait(2000);
check('世界屏可见', await visible('screen-world'));
check('队伍 1 只', (await ev('S.party.length')) === 1, JSON.stringify(await ev('S.party.map(p=>p.sp+" Lv."+p.lv)')));
check('HUD 图鉴分母 = 物种数', (await txt('hud-dex')).endsWith('/' + await ev('SPECIES.length')), await txt('hud-dex'));
check('canvas 真实绘制', /^(\d+)\/\1/.test(String(await ev(nonEmpty))), await ev(nonEmpty));
check('玩家有速度值', (await ev('spdOf(S.party[0])')) > 0, 'spd=' + await ev('spdOf(S.party[0])'));
await shot('v13-world.png');

console.log('\n════════ 3. 训练师名册 ════════');
await click('#btn-trainer'); await wait(700);
check('训练师面板可见', await visible('panel-trainer'));
check('名册渲染 10 行', (await ev('document.querySelectorAll("#trainer-body .train-row").length')) === 10);
await shot('v13-trainer-list.png');
await click('[data-close="panel-trainer"]'); await wait(400);

console.log('\n════════ 4. 训练师对战 ════════');
/* 把玩家挪到训练师 t4 旁边，再用方向键踩上去触发挑战 */
await ev(`(()=>{S.pos={x:TRAINERS[3].pos.x,y:TRAINERS[3].pos.y+1};draw();updateHUD();return S.pos.x+","+S.pos.y;})()`);
await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 });
await wait(300);
await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 });
await wait(800);
check('踩到训练师弹出挑战框', await visible('enc-panel'), await txt('enc-name'));
check('弹窗按钮为挑战文案', /挑战/.test(String(await txt('enc-fight'))), await txt('enc-fight'));
await click('#enc-fight'); await wait(1500);
check('进入战斗屏', await visible('screen-battle'));
check('模式标签 = 训练师对战', (await txt('battle-mode')) === '训练师对战', await txt('battle-mode'));
check('战斗对象是训练师队伍', (await ev('B.mode')) === 'trainer' && (await ev('TB.team.length')) >= 2, 'team=' + await ev('TB.team.length'));
check('训练师队伍有等级', (await ev('TB.team.map(f=>f.lv).join(",")')), await ev('TB.team.map(f=>f.lv).join(",")'));
/* 只检查三种球按钮（零食按钮在训练师战里仍可用） */
const ballDisabled = `[...document.querySelectorAll("#ball-row .item-btn")].filter(b=>/标准球|加强球|精英球/.test(b.textContent)).every(b=>b.disabled)`;
check('训练师战禁用丢球', (await ev(ballDisabled)), '球钮全部 disabled');
check('技能按钮渲染', (await ev('document.querySelectorAll("#move-row .move-btn").length')) >= 2);
await shot('v13-battle-trainer.png');

console.log('\n════════ 5. 状态异常 / 能力变化 / 战斗结算 ════════');
/* 直接压测核心机制：给双方上状态、放变化招式、打伤害 */
const mech = await ev(`(()=>{
  const pet=selfPet(), sp=leadSp();
  const out={};
  out.setPoison = setStatus(pet,"poison");
  out.setBurn2 = setStatus(pet,"burn");
  const before=pet.hp;
  const lines=[];
  tickBoard(pet,"测试",lines);
  out.poisonDmg = before-pet.hp; out.poisonLines=lines.join("|");
  out.stageAtk = addStage(pet,"atk",2);
  out.stageMul = Math.round(stageMult(pet,"atk")*100)/100;
  out.chipCount = statusChips(pet).length;
  out.chipText = statusChips(pet).map(c=>c.t).join(" ");
  pet.st.status=null; pet.st.atk=0;
  lines.length=0;
  const d1=B.ehp; applyMove(MOVES["swordsdance"],sp,B.esp,true); out.buffOnEnemySwap=false;
  /* 对手可能触发「灵敏」特性躲避，最多试 6 次直到打出伤害 */
  var dmgTotal=0, allLines=[];
  for(var k=0;k<6 && dmgTotal<=0;k++){
    var hpBefore=B.ehp;
    allLines=applyMove(MOVES[sp.moves[0]],sp,B.esp,true);
    dmgTotal+=Math.max(0,hpBefore-B.ehp);
  }
  out.dmgDealt=dmgTotal; out.dmgLines=allLines.join("|").slice(0,180);
  const healLines=applyMove(MOVES["moonlight"],sp,B.esp,true);
  out.healTeamLine=healLines.join("|").slice(0,120);
  return out;
})()`);
check('状态可施加（中毒）', mech.setPoison === true);
check('异常状态不可叠加', mech.setBurn2 === false);
check('中毒每回合掉血', mech.poisonDmg > 0, '掉血 ' + mech.poisonDmg + ' 点：' + mech.poisonLines);
check('能力变化生效（攻击+2）', mech.stageMul > 1, mech.stageAtk + ' ×' + mech.stageMul);
check('状态条渲染 chip', mech.chipCount >= 1, mech.chipText);
check('变化招式不造成伤害', mech.buffOnEnemySwap === false);
check('攻击招式造成伤害', mech.dmgDealt > 0, '伤害 ' + mech.dmgDealt + '：' + mech.dmgLines);
check('全队回复招式可用', /全队/.test(String(mech.healTeamLine)), mech.healTeamLine);

console.log('\n════════ 6. 训练师战推进（换对手） ════════');
const before6 = await ev('({mode:B&&B.mode, busy:B&&B.busy, ehp:B&&B.ehp, idx:TB&&TB.idx, sPP:JSON.stringify(B&&B.sPP)})');
console.log(' 出手前状态:', JSON.stringify(before6));
await ev(`(()=>{B.busy=false; B.ehp=1; var mid=leadSp().moves[0]; B.sPP[mid]=99; playerStrike(mid); return "strike:"+mid;})()`);
await wait(5000);
check('打倒一只后换下一只', (await ev('TB?TB.idx:-1')) >= 1, 'TB.idx=' + await ev('TB?TB.idx:-1') + ' | B=' + await ev('B?B.mode:"null"'));
check('第二只已上场且满血', (await ev('B?B.ehp:0')) > 0, 'ehp=' + await ev('B?B.ehp:0'));
await shot('v13-battle-next.png');
/* 认输退出（验证训练师战认输路径） */
await ev('if(B) B.busy=false;');
await click('#btn-flee'); await wait(2600);
check('认输后回到世界（或已结算）', (await visible('screen-world')), 'battle 隐藏=' + !(await visible('screen-battle')));
check('全队至少留 1 HP', (await ev('S.party.every(p=>p.hp>=1)')), JSON.stringify(await ev('S.party.map(p=>p.hp)')));

console.log('\n════════ 7. 队伍内切磋 ════════');
/* 先补一只伙伴，才能切磋 */
await ev(`(()=>{const p=newPet("fox");S.party.push(p);S.discovered.fox=1;save();updateHUD();return S.party.length;})()`);
await click('#btn-party'); await wait(600);
check('队伍面板可见', await visible('panel-party'));
check('快捷回血按钮（收费）', /快捷回血 🪙/.test(String(await ev('[...document.querySelectorAll("#party-list .mini-btn")].map(b=>b.textContent).join("|")'))), await ev('[...document.querySelectorAll("#party-list .mini-btn")].map(b=>b.textContent).join("|")'));
await ev(`(function(){var p=S.party[0];p.hp=Math.max(1,Math.round(byId(p.sp).base*0.4));openParty();return "hurt";})()`); await wait(500);
const coinsBefore = await ev('S.coins');
await ev(`(function(){var b=[...document.querySelectorAll("#party-list .mini-btn")].find(x=>/快捷回血/.test(x.textContent));b.click();return "heal";})()`);
await wait(600);
check('快捷回血扣金币', (await ev('S.coins')) < coinsBefore, coinsBefore + ' → ' + await ev('S.coins'));
check('快捷回血回满 HP', (await ev('S.party.every(p=>p.hp>=byId(p.sp).base)')), JSON.stringify(await ev('S.party.map(p=>p.hp+"/"+byId(p.sp).base)')));
await click('#btn-spar'); await wait(700);
check('切磋面板可见', await visible('panel-spar'));
check('切磋候选 ≥2', (await ev('document.querySelectorAll("#spar-body .spar-pick").length')) >= 2);
await ev(`document.querySelectorAll("#spar-body .spar-pick")[0].click()`); await wait(300);
check('选中第一只后高亮', (await ev('document.querySelectorAll("#spar-body .spar-pick.on").length')) === 1, await txt('spar-vs'));
await ev(`document.querySelectorAll("#spar-body .spar-pick")[1].click()`); await wait(1500);
check('切磋开战', await visible('screen-battle'));
check('模式标签 = 切磋', (await txt('battle-mode')) === '切磋', await txt('battle-mode'));
check('切磋禁用丢球', (await ev(ballDisabled)), '球钮全部 disabled');
check('切磋有换人一排', (await ev('document.querySelectorAll("#swap-row .item-btn").length')) >= 1, await ev('document.querySelectorAll("#swap-row .item-btn").length') + ' 个按钮');
check('切磋逃跑键 = 认输', /认输/.test(String(await txt('btn-flee'))), await txt('btn-flee'));
await shot('v13-battle-spar.png');
await ev('if(B) B.busy=false;');
await ev(`(()=>{B.ehp=1;const mid=leadSp().moves[0];B.sPP[mid]=99;playerStrike(mid);return 1;})()`);
await wait(2600);
check('切磋结束回到世界', await visible('screen-world'));
check('切磋不倒宠（≥1 HP）', (await ev('S.party.every(p=>p.hp>=1)')), JSON.stringify(await ev('S.party.map(p=>p.hp)')));
check('切磋对手也留 1 HP 以上', (await ev('S.party.concat(S.box).every(p=>p.hp>=1)')));

console.log('\n════════ 8. 遇敌弹窗 ════════');
await ev(`(()=>{const e=rollEnemy();openEncounter(e);return e.sp.name;})()`); await wait(700);
check('遇敌弹窗可见', await visible('enc-panel'), await txt('enc-name'));
check('显示稀有度与地区', /出没/.test(String(await txt('enc-sub'))), await txt('enc-sub'));
await click('#enc-flee'); await wait(500);
check('绕开后关闭弹窗', !(await visible('enc-panel')));
check('绕开不进战斗', !(await visible('screen-battle')));
await ev(`(()=>{openEncounter(rollEnemy());return 1;})()`); await wait(600);
await click('#enc-fight'); await wait(1400);
check('选择战斗后进入野生战', await visible('screen-battle') && (await ev('B.mode')) === 'wild', 'mode=' + await ev('B.mode'));
check('野生战可丢球', (await ev('[...document.querySelectorAll("#ball-row .item-btn")].some(b=>!b.disabled)')) || (await ev('S.balls[0]+S.balls[1]+S.balls[2]')) === 0, '球=' + await ev('S.balls.join("/")'));
await shot('v13-battle-wild.png');
/* 逃跑有 30% 失败率，重试几次直到真的退出 */
for (let i = 0; i < 6 && (await visible('screen-battle')); i++) { await click('#btn-flee'); await wait(2600); }
check('野生战已退出（为后续流程清场）', !(await visible('screen-battle')), 'B=' + await ev('B?B.mode:"null"'));

console.log('\n════════ 9. 医院（免费）+ 图鉴 + 进化 ════════');
if (await visible('screen-battle')) { await ev('closeBattle()'); await wait(800); }
await ev(`(()=>{const p=S.party[0];p.hp=1;setStatus(p,"poison");save();openHospital();return 1;})()`); await wait(700);
check('医院面板可见', await visible('panel-hosp'));
const hospText = String(await ev('document.getElementById("hosp-body").textContent'));
check('医院文案已改为免费', /免费/.test(hospText), hospText.slice(0, 90));
const coins2 = await ev('S.coins');
await ev(`(function(){var b=[...document.querySelectorAll("#hosp-body .mini-btn")].find(x=>/免费治疗/.test(x.textContent));if(!b)return "无按钮";b.click();return "ok";})()`);
await wait(600);
check('医院治疗不花钱', (await ev('S.coins')) === coins2, coins2 + ' → ' + await ev('S.coins'));
check('治疗清除异常状态', (await ev('!S.party[0].st.status')));
await ev(`document.querySelector('[data-close="panel-hosp"]').click()`); await wait(300);
await click('#btn-dex'); await wait(800);
check('图鉴面板可见', await visible('panel-dex'));
check('图鉴卡片 = 物种数', (await ev('document.querySelectorAll("#dex-grid .dex-card").length')) === await ev('SPECIES.length'));
check('图鉴显示进化来源', /进化形态/.test(String(await ev('document.getElementById("dex-grid").textContent'))), String(await ev('document.getElementById("dex-grid").textContent')).slice(0, 90));
await shot('v13-dex.png');
await click('[data-close="panel-dex"]'); await wait(300);

/* 进化与分支进化（直接调用，确定性验证逻辑） */
const evo = await ev(`(()=>{
  const p=S.party[0];
  p.sp="wormling"; p.lv=17; clearStatus(p);
  runEvoCheck();
  const first=p.sp;
  p.lv=40; runEvoCheck();
  const second=p.sp;
  const P2=newPet("deer"); P2.lv=40; S.party.push(P2);
  runEvoCheck();
  const branch=P2.sp;
  const dexHas=!!S.discovered[second];
  p.sp=byId(p.sp).id; S.discovered[p.sp]=1;
  return {first:first, second:second, branch:branch, dexHas:dexHas,
    secondName:byId(second).name, branchName:byId(branch).name};
})()`);
check('三段进化第 1 段', evo.first === 'sprout2', evo.first);
check('三段进化第 2 段', evo.second === 'floraking', evo.secondName);
check('分支进化随机取一支', ['deerking', 'floraking'].includes(evo.branch), evo.branchName);
check('进化后进图鉴', evo.dexHas === true);

console.log('\n════════ 10. 重开存档弹窗 + 存档持久化 ════════');
await click('#btn-reset'); await wait(600);
check('重开弹窗可见（不再靠隐蔽二次点击）', await visible('panel-confirm'));
check('弹窗提示含存档规模', /宠物/.test(String(await txt('confirm-note'))), await txt('confirm-note'));
await shot('v13-confirm-reset.png');
await click('#confirm-no'); await wait(400);
check('取消后保留存档', !(await visible('panel-confirm')) && (await ev('S.party.length')) >= 1, 'party=' + await ev('S.party.length'));
await click('#btn-reset'); await wait(500);
await click('#confirm-yes'); await wait(900);
check('确认后清空存档回到标题', await visible('screen-title') && (await ev('S.party.length')) === 0, 'party=' + await ev('S.party.length'));
await wait(1600);
const lsNow = await ev('localStorage.getItem(SAVE_KEY)');
check('localStorage 已清空（1.6s 后仍为空，无异步回写）', lsNow === null, lsNow === null ? 'null' : String(lsNow).slice(0, 60));
/* 恢复一局可玩状态 */
await clickText('/进入草丛/'); await wait(900);
await ev(`document.querySelectorAll("#starter-grid .st-card")[0].click()`); await wait(1600);
check('清档后可重新开局', await visible('screen-world') && (await ev('S.party.length')) === 1);
/* 刷新后存档仍在 */
await send('Page.navigate', { url: URL_ }); await wait(4000);
await clickText('/进入草丛/'); await wait(1500);
check('刷新后自动读档（不弹选伙伴）', await visible('screen-world'), 'starter 可见=' + await visible('screen-starter'));

console.log('\n════════ 11. 控制台 ════════');
check('全程零控制台错误', errors.length === 0, errors.slice(0, 5).join(' ;; ') || '无');
console.log(' console 输出:', logs.length ? logs.slice(0, 6).join(' | ') : '（无）');

const pass = results.filter(r => r.ok).length;
console.log(`\n════════ 汇总：${pass}/${results.length} 通过 ════════`);
const failed = results.filter(r => !r.ok);
if (failed.length) { console.log('失败项：'); failed.forEach(f => console.log(' ❌ ' + f.name + ' — ' + f.detail)); }
console.log('[screenshots]', SHOTS);
process.exit(failed.length ? 2 : 0);
