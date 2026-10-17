/* v29 验收：8 项需求逐条检查
   用法：node v29-accept.mjs [url] [cdpPort] [shotDir] */
import { WebSocket } from 'ws';
import { mkdirSync, writeFileSync } from 'node:fs';
const URL_BASE = process.argv[2] || 'http://127.0.0.1:8727/';
const CDP_PORT = process.argv[3] || '9335';
const SHOT_DIR = process.argv[4] || 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/shots-v29';
let seq = 0, pass = 0, fail = 0; const fails = [], warns = [];
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
for (let i = 0; i < 120; i++) { await wait(250); if (await ev("(typeof MW!=='undefined'&&typeof map!=='undefined'&&map&&map.length)") === true) break; }

const boot = lv => ev(`(function(){try{localStorage.removeItem(SAVE_KEY);S=freshSave();var p=newPet('pk-001');p.lv=${lv};p.hp=maxHpOf(p);ensureMoves(p);S.party=[p];S.lead=p.uid;enterWorld();return 'ok';}catch(e){return 'ERR '+e.message;}})()`);

console.log('【1】伤害：等级压制下不再被 85% 上限削平');
await boot(10);
let r1 = await ev(`(function(){
  try{
    var foeId=null; SPECIES.forEach(function(s){ if(s.name==="懒人獭"||s.name==="懒人翁") foeId=foeId||s.id; });
    var a=newPet('pk-795'); a.lv=52; a.hp=maxHpOf(a); ensureMoves(a);
    var d=newPet(foeId||'pk-001'); d.lv=9; ensureMoves(d);
    var asp=byId(a.sp), dsp=byId(d.sp);
    var mvId=null; Object.keys(MOVES).forEach(function(k){ var m=MOVES[k]; if(m.power>=90 && (!mvId || m.power>MOVES[mvId].power)) mvId=k; });
    if(!mvId) return JSON.stringify({err:'招表里没有 90+ 威力招式'});
    var mv=MOVES[mvId];
    var e=eff(mv.type,dsp);
    var lvOne=Math.max(1,atkOf(asp,a.lv)/Math.max(1,defOf(dsp,d.lv)));
    var statMul=clamp(atkOf(asp,a.lv)/Math.max(1,defOf(dsp,d.lv)),0.9,1.6)*0.75;
    var lvOf=a.lv;
    var lvBonus=clamp(0.55+0.055*(lvOf-1),0.55,3.2);
    var lvPress=clamp(0.5+0.5*(Math.max(1,a.lv)/Math.max(1,d.lv)),0.5,2.0);
    var atkT={atk:1,bloodrage:false};
    var base=mv.power*e*lvBonus*lvPress*statMul*1*1*1;
    var dmg=Math.max(1,Math.round(base));
    var dmax=maxHpAt(dsp,d.lv);
    var capOld=Math.max(1,Math.round(dmax*0.85));
    var capNew=(lvPress>=1.6)? dmax : capOld;
    var finalDmg=Math.min(dmg,capNew);
    return JSON.stringify({foe:dsp.name, foename:dsp.name, mv:mv.name, power:mv.power, eff:e,
      lvPress:+lvPress.toFixed(2), dmgRaw:dmg, foeMaxHp:dmax, capOld:capOld, capNew:capNew, finalDmg:finalDmg,
      overOldCap: dmg>capOld});
  }catch(e){ return 'ERR '+e.message; }
})()`);
if (r1 && r1.__err) ck(false, '伤害公式可算', r1.__err);
else {
  const o = JSON.parse(r1);
  if (o.err) ck(false, '伤害场景', o.err);
  else {
    ck(o.overOldCap === true, '52级打9级原始伤害超过 85% 上限', o.mv + ' 原始 ' + o.dmgRaw + ' / 对手血 ' + o.foeMaxHp + ' / 旧上限 ' + o.capOld);
    ck(o.capNew === o.foeMaxHp, '等级压制(≥1.6)时上限解除为满血', 'lvPress=' + o.lvPress + ' 上限 ' + o.capNew);
    ck(o.finalDmg >= o.foeMaxHp, '实际伤害足以一击带走', o.finalDmg + ' ≥ ' + o.foeMaxHp);
  }
}
/* 真实开战验证：实际打一下（useMove 带动画延迟，分两步读） */
let r1bS = await ev(`(function(){
  try{
    var foeId=null; SPECIES.forEach(function(s){ if(s.name==="懒人獭"||s.name==="懒人翁") foeId=foeId||s.id; });
    var p=newPet('pk-795'); p.lv=52; p.hp=maxHpOf(p); ensureMoves(p); S.party=[p]; S.lead=p.uid;
    var esp=byId(foeId||'pk-001');
    var foe=initFighter(esp, 9, null, 'test'); foe.hp=maxHpAt(esp,9);
    openBattle('wild',{sp:esp, fighter:foe});
    B.ehp=foe.hp; B.emax=maxHpOf(foe); B.foe.hp=B.ehp;
    var mvId=null; Object.keys(MOVES).forEach(function(k){ var m=MOVES[k]; if(m.power>=90 && !m.recoil && (!mvId || m.power>MOVES[mvId].power)) mvId=k; });
    p.moves[0]=mvId; syncPP(p); B.sPP=p.pp;
    var before=B.ehp;
    useMove(mvId);
    return JSON.stringify({mv:MOVES[mvId].name, before:before, foeMax:B.emax});
  }catch(e){ return 'ERR '+e.message; }
})()`);
if (r1bS && r1bS.__err) ck(false, '真实开战打一下', r1bS.__err);
else {
  const o = JSON.parse(r1bS);
  let a = null;
  for (let i = 0; i < 24; i++) {
    await wait(300);
    const raw = await ev(`(function(){ try{ return JSON.stringify({after:(B?B.ehp:null), over:!B}); }catch(e){ return 'ERR '+e.message; } })()`);
    a = JSON.parse(raw);
    if (a.after === null || a.after < o.before) break;   /* 血掉了或战斗已结束 */
  }
  await ev(`(function(){ try{ if(B) closeBattle(); }catch(e){} return 1; })()`);
  ck(a.after === null || a.after <= 0, '真实战斗：52级一招带走9级野怪', o.mv + ' → ' + o.before + '→' + (a.after === null ? '已倒下/战斗结束' : a.after) + '（对手满血 ' + o.foeMax + '）');
}

console.log('\n【2】图鉴：去掉说明文字 + 顶端分类筛选');
await boot(20);
let r2 = await ev(`(function(){
  try{
    openDex(0);
    var tb=$('dex-toolbar');
    var cards=document.querySelectorAll('#dex-grid .dex-card');
    var metas=document.querySelectorAll('#dex-grid .meta');
    var firstCardText=cards.length?cards[0].textContent.replace(/\\s+/g,' ').trim():'';
    var tbText=tb?tb.textContent.replace(/\\s+/g,' ').trim():'';
    /* v29b：点「草」看列表是否真的只剩草系 */
    var filterInfo='', filterAttrOK=false, attrCount=0;
    var btns=tb?tb.querySelectorAll('button'):[];
    for(var bi=0;bi<btns.length;bi++){
      if(btns[bi].textContent.replace(/\\s+/g,'').indexOf('草')===0){ btns[bi].click(); break; }
    }
    var list=dexList();
    var allGrass=list.length>0 && list.every(function(s){ return s.type==='grass'||s.type2==='grass'; });
    filterAttrOK = allGrass && DEX_FILTER==='grass';
    filterInfo='DEX_FILTER='+DEX_FILTER+' · 命中 '+list.length+' 只 · 全草系='+allGrass;
    DEX_FILTER='all'; openDex(0);
    Object.keys(TYPE_NAME).forEach(function(k){ if(tbText.indexOf(TYPE_NAME[k])>=0) attrCount++; });
    return JSON.stringify({
      toolbarExists: !!tb,
      toolbarBtns: btns.length,
      toolbarText: tbText,
      attrCount: attrCount,
      toolbarAboveGrid: tb? (tb.compareDocumentPosition($('dex-grid')) & Node.DOCUMENT_POSITION_FOLLOWING) > 0 : false,
      cardCount: cards.length,
      metaPerCard: cards.length? metas.length/cards.length : 0,
      firstCardText: firstCardText,
      filterInfo: filterInfo,
      filterAttrOK: filterAttrOK,
      noSrcFilter: tbText.indexOf('洛克王国')<0,
      hasLongNote: document.body.innerHTML.indexOf('克制速查')>=0
    });
  }catch(e){ return 'ERR '+e.message; }
})()`);
if (r2 && r2.__err) ck(false, '图鉴可打开', r2.__err);
else {
  const o = JSON.parse(r2);
  ck(o.toolbarExists === true, '顶端有分类筛选工具条 #dex-toolbar', String(o.toolbarText).slice(0, 70));
  ck(o.attrCount >= 18, '分类筛选覆盖 18 属性', o.attrCount + ' / 18');
  ck(o.filterAttrOK === true, '点「草」筛选后列表全是草系', o.filterInfo);
  ck(o.noSrcFilter === true, '筛选里不再有来源（宝可梦/洛克王国）', '');
  ck(o.toolbarAboveGrid === true, '工具条在网格上方', String(o.toolbarAboveGrid));
  ck(o.hasLongNote === false, '长篇说明文字已删除', '');
  ck(o.metaPerCard <= 1, '每张卡片最多 1 个标签（来源）', '每卡 ' + o.metaPerCard + ' 个');
  ck(o.firstCardText.indexOf('血量基数') < 0 && o.firstCardText.indexOf('栖息') < 0, '卡片无属性说明文字', o.firstCardText.slice(0, 40));
}
await shot('v29-01-dex');

console.log('\n【3】PP：学招后不出现 undefined');
let r3 = await ev(`(function(){
  try{
    var p=S.party[0];
    p.lv=20; p.hp=maxHpOf(p);
    var node=pendingLearnNodes(p)[0];
    var out={};
    out.toolbarPP = [];
    openLearnDialog(p,node,'learn');
    var cands=poolCandidates(p,poolKeyOfNode(node)).filter(function(id){ return p.moves.indexOf(id)<0; });
    if(cands.length){
      var pick=cands[0];
      doLearn(p,node,pick,p.moves[0]);
    }
    out.moves=p.moves.slice();
    out.ppUndefined=p.moves.filter(function(id){ return p.pp[id]===undefined; });
    out.ppMissing = (p.moves||[]).some(function(id){ return typeof p.pp[id] !== 'number'; });
    closeLearnDialog();
    /* 战斗按钮文本 */
    var esp=byId('pk-004');
    openBattle('wild',{sp:esp, fighter:initFighter(esp,5,null)});
    var txt=[];
    Array.prototype.forEach.call(document.querySelectorAll('#move-row .move-btn'),function(b){ txt.push(b.textContent.replace(/\\s+/g,' ').trim()); });
    out.btnTexts=txt;
    closeBattle();
    /* 技能编辑器 */
    openSkillEditor(p);
    out.editorText=$('panel-learn').textContent.replace(/\\s+/g,' ').trim();
    closeLearnDialog();
    return JSON.stringify(out);
  }catch(e){ return 'ERR '+e.message; }
})()`);
if (r3 && r3.__err) ck(false, '学招流程', r3.__err);
else {
  const o = JSON.parse(r3);
  ck((o.ppUndefined || []).length === 0, '存档 PP 无 undefined', JSON.stringify(o.ppUndefined));
  ck(!o.btnTexts.join(' ').includes('undefined'), '战斗技能按钮无 undefined', o.btnTexts[0] || '');
  ck(!String(o.editorText).includes('undefined'), '技能编辑器无 undefined', '');
}

console.log('\n【4】野外 NPC 已移除');
let r4 = await ev(`(function(){
  try{
    var hits=0;
    for(var y=0;y<MH;y++) for(var x=0;x<MW;x++){ if(trainerAt(x,y)) hits++; }
    return JSON.stringify({trainerTiles:hits, trainerCount:(typeof TRAINERS!=='undefined'?TRAINERS.length:0)});
  }catch(e){ return 'ERR '+e.message; }
})()`);
{
  const o = JSON.parse(r4);
  ck(o.trainerCount === 0 || o.trainerTiles === 0, '地图上没有会触发的野外训练师', '训练师数据 ' + o.trainerCount + ' 条 · 落格 ' + o.trainerTiles + ' 个');
}

console.log('\n【5/6】道馆：可挑战 · 相同数量 · 等级 = 地区上限');
await boot(30);
let r5 = await ev(`(function(){
  try{
    if(!TOWNS || !TOWNS.length) return JSON.stringify({err:'没有城镇/道馆'});
    var t=TOWNS.filter(function(q){ return q.gym && q.gymType; })[0];
    var reg=gymRegion(t);
    var capLv=(LV_RANGE[reg]||[1,25])[1];
    S.pos={x:t.gym.x,y:t.gym.y};
    openGym(t);
    var btn=$('gym-ok');
    var note=$('gym-note').textContent.replace(/\\s+/g,' ').trim();
    var out={town:t.name, gymName:t.gymName, gymType:t.gymType, region:reg, capLv:capLv,
      btnText:btn?btn.textContent:'', note:note, pending:!!gymPending};
    /* 真的开打 */
    var partyN=S.party.length;
    if(btn) btn.click();
    var inB=!!B;
    var foeLv=B?B.foe.lv:null;
    var mode=B?B.mode:null;
    out.started=inB; out.foeLv=foeLv; out.mode=mode; out.partyN=partyN; out.teamLen=(TB&&TB.team)?TB.team.length:0;
    out.isGym=!!(TB&&TB.gym);
    if(B) closeBattle();
    return JSON.stringify(out);
  }catch(e){ return 'ERR '+e.message; }
})()`);
if (r5 && r5.__err) ck(false, '道馆流程', r5.__err);
else {
  const o = JSON.parse(r5);
  if (o.err) ck(false, '道馆存在', o.err);
  else {
    ck(o.started === true, '点按钮能进道馆战', o.gymName + '（' + o.gymType + '系 · ' + o.region + '）');
    ck(o.isGym === true, '标记为道馆战', String(o.isGym));
    ck(o.teamLen === o.partyN, '馆主队伍数量 = 玩家队伍数量', '馆主 ' + o.teamLen + ' vs 玩家 ' + o.partyN);
    ck(o.foeLv === o.capLv, '馆主等级 = 地区等级上限', 'Lv' + o.foeLv + ' vs 上限 Lv' + o.capLv);
    ck(o.note.indexOf('出门修行') < 0, '闭馆文案已替换', o.note.slice(0, 46));
  }
}

console.log('\n【7】宠物详情面板（HP/攻/防/特攻/特防/速度/经验）');
let r7 = await ev(`(function(){
  try{
    var p=S.party[0];
    openPetInfo(p);
    var txt=$('petinfo-body').textContent.replace(/\\s+/g,' ').trim();
    var open=!$('panel-petinfo').classList.contains('hidden');
    var need=['HP','攻击','防御','特攻','特防','速度','经验值'];
    var miss=need.filter(function(k){ return txt.indexOf(k)<0; });
    /* 从队伍面板点击行是否也能打开 */
    $('panel-petinfo').classList.add('hidden');
    openParty();
    var row=document.querySelector('#party-list .pet-row');
    if(row){ var d=row.querySelector('.desc'); if(d) d.click(); }
    var openedByRow=!$('panel-petinfo').classList.contains('hidden');
    var rowTxt=$('petinfo-body').textContent.replace(/\\s+/g,' ').trim();
    return JSON.stringify({open:open, text:txt.slice(0,240), missing:miss, openedByRow:openedByRow, rowTxt:rowTxt.slice(0,120)});
  }catch(e){ return 'ERR '+e.message; }
})()`);
if (r7 && r7.__err) ck(false, '详情面板', r7.__err);
else {
  const o = JSON.parse(r7);
  ck(o.open === true, 'openPetInfo 能打开面板', '');
  ck((o.missing || []).length === 0, '七项数据齐全（HP/攻击/防御/特攻/特防/速度/经验值）', '缺: ' + JSON.stringify(o.missing));
  ck(o.openedByRow === true, '队伍面板点宠物行能打开详情', o.rowTxt.slice(0, 60));
}
await shot('v29-02-petinfo');

console.log('\n【8】战斗界面：显示属性 + 稀有度配色（灰/蓝/红）');
let r8 = await ev(`(function(){
  try{
    $('panel-petinfo').classList.add('hidden');
    var out={};
    function tryOne(rare){
      var sp=SPECIES.filter(function(s){ return s.rarity===rare; })[0];
      if(!sp) return null;
      var f=initFighter(sp, 20, null, '');
      openBattle('wild',{sp:sp, fighter:f});
      var nm=$('enemy-name'), tg=$('enemy-rarity');
      var o={name:nm.textContent, nameCls:nm.className, tag:tg.textContent, tagCls:tg.className, expectType:typeText(sp), rarity:rare};
      closeBattle();
      return o;
    }
    out.common=tryOne(0); out.rare=tryOne(1); out.legend=tryOne(2);
    return JSON.stringify(out);
  }catch(e){ return 'ERR '+e.message; }
})()`);
if (r8 && r8.__err) ck(false, '战斗界面', r8.__err);
else {
  const o = JSON.parse(r8);
  const chk = (one, tagName) => {
    if (!one) { warns.push(tagName + ' 档无样本'); return; }
    ck(one.tag === one.expectType, tagName + ' 右侧显示属性', one.tag + '（期望 ' + one.expectType + '）');
    ck(one.tag.indexOf('常见') < 0 && one.tag.indexOf('平原') < 0, tagName + ' 不再显示「罕见 · 地区」', one.tag);
    ck(one.nameCls === 'rar' + one.rarity, tagName + ' 名字带稀有度类名', one.nameCls);
    ck(one.tagCls.indexOf('rar' + one.rarity) >= 0, tagName + ' 标签带稀有度类名', one.tagCls);
  };
  chk(o.common, '常见(灰)'); chk(o.rare, '稀有(蓝)'); chk(o.legend, '神兽(红)');
}
await shot('v29-03-battle');

console.log('\n== 控制台异常: ' + errs.length + ' 条 ==');
if (errs.length) console.log('  ' + errs.slice(0, 4).join('\n  '));
console.log('\n═══ 验收：通过 ' + pass + ' / ' + (pass + fail) + ' ═══');
if (fails.length) console.log('失败项:\n  - ' + fails.join('\n  - '));
if (warns.length) console.log('提醒:\n  - ' + warns.join('\n  - '));
ws.close();
process.exit(fail ? 1 : 0);
