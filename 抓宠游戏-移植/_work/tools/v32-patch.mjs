/* v32：①图鉴点击出详情（含栖息地） ②图鉴改为「遇到过就解锁」 ③变化技补回效果 ④战斗日志可翻历史
   用法：node v32-patch.mjs --apply */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = ROOT + '/抓宠游戏-v12-clean.html';
const BAK = ROOT + '/抓宠游戏-v12-clean.bak-v32.html';
const apply = process.argv.includes('--apply');
let src = readFileSync(FILE, 'utf8');
const eol = src.includes('\r\n') ? '\r\n' : '\n';
let work = src.split('\r\n').join('\n');
const done = [];
const rep = (a, b, tag) => {
  if (!work.includes(a)) { console.error('  !! 找不到锚点: ' + tag); process.exit(1); }
  work = work.replace(a, b); done.push(tag); console.log('  [改动] ' + tag);
};

/* ══ ① 图鉴：卡片可点，弹详情（重点给栖息地） ══ */
rep(
  'function openDex(page){',
  ['/* v32：图鉴详情 —— 玩家最需要知道「去哪刷」，所以栖息地和可刷等级放最前 */',
    'function openDexDetail(sp){',
    '  if(!sp) return;',
    '  var got=!!S.discovered[sp.id];',
    '  $("petinfo-title").textContent=(got?sp.name:"？？？")+" 的图鉴";',
    '  var body=$("petinfo-body"); body.textContent="";',
    '  var head=document.createElement("div"); head.className="enc-box";',
    '  var face=document.createElement("div"); face.className="enc-emoji"; face.textContent=sp.emoji; setAvatar(face,sp);',
    '  var nm=document.createElement("b"); nm.textContent=got?sp.name:"？？？";',
    '  var sub=document.createElement("span"); sub.className="enc-sub";',
    '  sub.textContent=got?(typeText(sp)+" · "+RARITY_NAME[clamp(sp.rarity,0,2)]+" · 持有×"+ownedCount(sp.id)):("未捕获 · "+RARITY_NAME[clamp(sp.rarity,0,2)]);',
    '  head.appendChild(face); head.appendChild(nm); head.appendChild(sub);',
    '  body.appendChild(head);',
    '  var rows=[];',
    '  /* ★ 栖息地：分地区列出，并给出该地区的可刷等级区间 */',
    '  var hab=(sp.habitat||[]).map(function(r){ return REGION_NAME[r]||r; });',
    '  rows.push(["📍 栖息地", hab.length?hab.join(" · "):"未知"]);',
    '  var where=[];',
    '(sp.habitat||[]).forEach(function(r){',
    '    var sg=stageLvRange(sp,r);',
    '    if(sg) where.push(REGION_NAME[r]+" Lv."+sg[0]+"~"+sg[1]);',
    '  });',
    '  rows.push(["🎯 可刷等级", where.length?where.join("；"):"（该地区等级段没有它的位置）"]);',
    '  if(sp.ride) rows.push(["🪄 骑乘", {fly:"🕊 飞行坐骑",water:"🌊 水上坐骑",land:"🐎 陆地坐骑"}[sp.ride]||"可骑乘"]);',
    '  rows.push(["📊 血量基数", String(hpBaseOf(sp))]);',
    '  rows.push(["⚔️ 攻击", String(statOf(sp,"a"))]);',
    '  rows.push(["🛡️ 防御", String(statOf(sp,"d"))]);',
    '  rows.push(["🔥 特攻", String(statOf(sp,"spa"))]);',
    '  rows.push(["💠 特防", String(statOf(sp,"spd"))]);',
    '  rows.push(["💨 速度", String(statOf(sp,"s"))]);',
    '  var ev=EVO[sp.id];',
    '  if(ev){',
    '    var tos=(typeof ev.to==="string")?[ev.to]:ev.to;',
    '    rows.push(["🧬 进化", tos.map(function(t){ return (byId(t)?byId(t).name:t)+"（Lv."+((typeof ev.lv==="number"&&ev.lv>0)?ev.lv:32)+"）"; }).join(" 或 ") ]);',
    '  }',
    '  var src2=evoSrcOf(sp.id);',
    '  if(src2) rows.push(["🧬 由谁进化", src2.name+" 到 Lv."+src2.lv+(src2.branch?"（或另一分支）":"")]);',
    '  var list=document.createElement("div"); list.className="stat-list";',
    '  rows.forEach(function(r){',
    '    var line=document.createElement("div"); line.className="stat-line";',
    '    var k=document.createElement("span"); k.textContent=r[0];',
    '    var v=document.createElement("b"); v.textContent=r[1];',
    '    line.appendChild(k); line.appendChild(v); list.appendChild(line);',
    '  });',
    '  body.appendChild(list);',
    '  /* 技能池预览（遇到过就展示，方便规划） */',
    '  if(got){',
    '    var mh=document.createElement("p"); mh.className="dex-note"; mh.textContent="可学技能（按学习等级段）";',
    '    body.appendChild(mh);',
    '    var mg=document.createElement("div"); mg.className="learn-grid";',
    '    ["p0","p15","p25","p35","p45","p55","p65"].forEach(function(pk){',
    '      var lst=(sp.pools&&sp.pools[pk])?sp.pools[pk]:[];',
    '      if(!lst.length) return;',
    '      var h=document.createElement("p"); h.className="dex-note";',
    '      h.textContent="· "+(pk==="p0"?"初始":("Lv."+pk.slice(1)+" 解锁"));',
    '      mg.appendChild(h);',
    '      lst.forEach(function(id){',
    '        var mv=MOVES[id]; if(!mv) return;',
    '        var c=document.createElement("div"); c.className="learn-card";',
    '        var top=document.createElement("div"); top.className="lc-top";',
    '        var tg=document.createElement("span"); tg.className="type-tag"+(mv.type!=="nor"?" t-"+mv.type:"");',
    '        tg.textContent=TYPE_NAME[mv.type];',
    '        var n2=document.createElement("b"); n2.textContent=mv.name;',
    '        top.appendChild(tg); top.appendChild(n2);',
    '        var sm=document.createElement("small");',
    '        sm.textContent=(mv.power?("威力 "+mv.power):"变化技")+" · PP "+ppMaxOf(id);',
    '        c.appendChild(top); c.appendChild(sm); mg.appendChild(c);',
    '      });',
    '    });',
    '    body.appendChild(mg);',
    '  }',
    '  $("panel-petinfo").classList.remove("hidden");',
    '}',
    'function openDex(page){'].join('\n'),
  '新增 openDexDetail（含栖息地/可刷等级/种族值/进化/技能池）');

/* 卡片加点击 */
rep(
  '    card.appendChild(face); card.appendChild(nm); card.appendChild(badge);\n    grid.appendChild(card);',
  ['    card.appendChild(face); card.appendChild(nm); card.appendChild(badge);',
    '    card.style.cursor="pointer";',
    '    card.addEventListener("click",function(){ openDexDetail(sp); });   /* v32：点卡片看详情 */',
    '    grid.appendChild(card);'].join('\n'),
  '图鉴卡片可点开详情');

/* ══ ② 图鉴解锁改为「遇到过」 ══ */
rep(
  '  var sp=pool[clamp(i,0,pool.length-1)];',
  ['  var sp=pool[clamp(i,0,pool.length-1)];',
    '  /* v32：见过就算解锁（原来只有捕获才进图鉴，玩家没法查「在哪刷」） */',
    '  if(S && sp && sp.id){ S.discovered[sp.id]=1; }'].join('\n'),
  'rollEnemy 遇到即解锁图鉴');
/* 训练师/道馆的宠也解锁 */
rep(
  '    var _gf=initFighter(s, capLv, null, t.leaderName);',
  ['    if(S && s && s.id) S.discovered[s.id]=1;                    /* v32：道馆对手也解锁图鉴 */',
    '    var _gf=initFighter(s, capLv, null, t.leaderName);'].join('\n'),
  '道馆对手解锁图鉴');

/* ══ ③ 变化技补回效果（招表丢了 buff/debuff/status 字段） ══ */
rep(
  'function moveChip(id, opts){',
  ['/* ══ v32：变化技效果补全 ══',
    '   v17 重建招表后只剩 name/type/power/pp/cat/acc 六个字段，buff/debuff/status 全丢了，',
    '   于是所有变化技都是「放了个空炮」。这里按招名精确配一批，再按属性给通用兜底。 */',
    'var MOVE_FX={',
    '  "剑舞":{buff:{atk:2}},"磨爪":{buff:{atk:1}},"生长":{buff:{atk:1}},"健美":{buff:{atk:1,def:1}},"巨大化":{buff:{atk:1,def:1}},',
    '  "铁壁":{buff:{def:2}},"变硬":{buff:{def:1}},"缩入壳中":{buff:{def:1}},"屏障":{buff:{def:2}},"宇宙力量":{buff:{def:1}},',
    '  "高速移动":{buff:{spd:2}},"影子分身":{buff:{spd:1}},"瞬间移动":{buff:{spd:1}},"火箭推进":{buff:{spd:2}},',
    '  "聚气":{buff:{crit:2}},"磨砺":{buff:{crit:1}},"龙之舞":{buff:{atk:1,spd:1}},',
    '  "冥想":{buff:{atk:1}},"诡计":{buff:{atk:2}},"阴谋":{buff:{atk:2}},"萤火":{buff:{atk:1}},',
    '  "剧毒":{status:{k:"poison"}},"毒粉":{status:{k:"poison"}},"毒瓦斯":{status:{k:"poison"}},"溶解液":{status:{k:"poison",chance:0.3}},',
    '  "鬼火":{status:{k:"burn"}},"磷火":{status:{k:"burn"}},"火焰旋涡":{status:{k:"burn",chance:0.4}},',
    '  "电磁波":{status:{k:"para"}},"麻痹粉":{status:{k:"para"}},"电击波":{status:{k:"para",chance:0.4}},"蹭蹭脸颊":{status:{k:"para"}},',
    '  "催眠术":{status:{k:"sleep"}},"催眠粉":{status:{k:"sleep"}},"唱歌":{status:{k:"sleep"}},"恶魔之吻":{status:{k:"sleep"}},"蘑菇孢子":{status:{k:"sleep"}},"黑洞":{status:{k:"sleep"}},',
    '  "冰息":{status:{k:"freeze",chance:0.3}},"冰冻之风":{debuff:{spd:1}},"白雾":{buff:{def:1}},',
    '  "叫声":{debuff:{atk:1}},"瞪眼":{debuff:{def:1}},"摇尾巴":{debuff:{def:1}},"可怕面孔":{debuff:{spd:1}},',
    '  "鬼脸":{debuff:{spd:2}},"刺耳声":{debuff:{def:2}},"撒娇":{debuff:{atk:2}},"甜甜香气":{debuff:{spd:1}},',
    '  "金属音":{debuff:{def:2}},"羽毛舞":{debuff:{atk:2}},"掉包":{debuff:{atk:1}},"挠痒":{debuff:{atk:1,def:1}},',
    '  "溶解液":{debuff:{def:2}},"酸液":{debuff:{def:1}},"种子机关枪":{debuff:{def:1}},',
    '  "月光":{heal:0.5},"光合作用":{heal:0.5},"晨光":{heal:0.5},"喝牛奶":{heal:0.5},"自我再生":{heal:0.5},"羽栖":{heal:0.5},',
    '  "睡觉":{heal:1},"治愈之愿":{heal:0.5},',
    '  "守住":{buff:{def:1}}',
    '};',
    '/* 按属性兜底：招表里没配到的变化技，也让它有实际作用 */',
    'var FX_BY_TYPE={',
    '  fire:{status:{k:"burn",chance:0.5}}, poison:{status:{k:"poison",chance:0.6}}, elec:{status:{k:"para",chance:0.5}},',
    '  ice:{status:{k:"freeze",chance:0.25}}, psychic:{debuff:{atk:1}}, dark:{debuff:{def:1}}, ghost:{debuff:{spd:1}},',
    '  fighting:{buff:{atk:1}}, steel:{buff:{def:1}}, flying:{buff:{spd:1}}, ground:{debuff:{spd:1}},',
    '  rock:{buff:{def:1}}, bug:{debuff:{spd:1}}, grass:{buff:{def:1}}, water:{buff:{def:1}}, dragon:{buff:{atk:1}}, fairy:{debuff:{atk:1}}',
    '};',
    'function fxOf(mv){',
    '  if(!mv) return null;',
    '  var exact=MOVE_FX[mv.name];',
    '  if(exact) return exact;',
    '  if(!mv.power) return FX_BY_TYPE[mv.type] || {buff:{def:1}};   /* 变化技一律有作用 */',
    '  return null;',
    '}',
    'function moveChip(id, opts){'].join('\n'),
  '新增 MOVE_FX / FX_BY_TYPE / fxOf（变化技效果表）');
/* applyMove 里读效果 */
rep(
  ['    if(mv.buff){',
    '      var bs=[]; Object.keys(mv.buff).forEach(function(k){ bs.push(addStage(atkF,k,mv.buff[k])); });',
    '      lines.push(atkSp.name+" 使出 "+mv.name+"！"+bs.join("；"));',
    '    }',
    '    if(mv.debuff){',
    '      var ds=[]; Object.keys(mv.debuff).forEach(function(k){ ds.push(addStage(defF,k,-mv.debuff[k])); });',
    '      lines.push((mv.buff?"":"对手被 "+mv.name+" 影响：")+ds.join("；"));',
    '    }',
    '    if(mv.status&&Math.random()<(mv.status.chance===undefined?1:mv.status.chance)){',
    '      if(setStatus(defF,mv.status.k)) lines.push(defF===selfP?("你中了"+STATUS_NAME[mv.status.k]+"！"):(defSp.name+" 陷入了"+STATUS_NAME[mv.status.k]+"状态！"));',
    '    }',
    '    return lines;'].join('\n'),
  ['    /* v32：招表缺字段时用 fxOf 兜底，保证变化技一定有作用 */',
    '    var _fx=fxOf(mv) || {};',
    '    var _buff=mv.buff || _fx.buff, _debuff=mv.debuff || _fx.debuff, _status=mv.status || _fx.status;',
    '    var _heal=mv.heal || _fx.heal;',
    '    if(_heal){',
    '      var _amt=Math.round(maxOf()*_heal*(atkT.heal||1));',
    '      healTo((atkIsSelf?selfHp():B.ehp)+_amt);',
    '      lines.push(atkSp.name+" 使用 "+mv.name+"，回复了 "+_amt+" 点 HP！");',
    '    }',
    '    if(_buff){',
    '      var bs=[]; Object.keys(_buff).forEach(function(k){ bs.push(addStage(atkF,k,_buff[k])); });',
    '      lines.push(atkSp.name+" 使出 "+mv.name+"！"+bs.join("；"));',
    '    }',
    '    if(_debuff){',
    '      var ds=[]; Object.keys(_debuff).forEach(function(k){ ds.push(addStage(defF,k,-_debuff[k])); });',
    '      lines.push((_buff?"":"对手被 "+mv.name+" 影响：")+ds.join("；"));',
    '    }',
    '    if(_status&&Math.random()<(_status.chance===undefined?1:_status.chance)){',
    '      if(setStatus(defF,_status.k)) lines.push(defF===selfP?("你中了"+STATUS_NAME[_status.k]+"！"):(defSp.name+" 陷入了"+STATUS_NAME[_status.k]+"状态！"));',
    '    }',
    '    return lines;'].join('\n'),
  'applyMove 用 fxOf 兜底变化技效果');

/* ══ ④ 战斗日志：累积 + 可滚动翻历史 ══ */
rep(
  'function log(msg){ $("battle-log").textContent=msg; }',
  ['/* v32：战斗日志改成累积列表（原来每行直接覆盖，玩家看不到上一回合发生了啥） */',
    'var _battleLog=[];',
    'function log(msg){',
    '  var el=$("battle-log"); if(!el) return;',
    '  _battleLog.push(msg);',
    '  if(_battleLog.length>200) _battleLog.shift();',
    '  el.textContent="";',
    '  _battleLog.forEach(function(m,i){',
    '    var p=document.createElement("div");',
    '    p.className="blog-line"+(i===_battleLog.length-1?" blog-new":"");',
    '    p.textContent=m; el.appendChild(p);',
    '  });',
    '  el.scrollTop=el.scrollHeight;                 /* 自动滚到最新 */',
    '}',
    'function clearBattleLog(){ _battleLog=[]; var el=$("battle-log"); if(el) el.textContent=""; }'].join('\n'),
  '战斗日志改为累积列表');
rep(
  ['  function dmgTo(v){ if(atkIsSelf) B.ehp=Math.max(0,v); else setSelfHp(v); }'],
  ['  function dmgTo(v){ if(atkIsSelf) B.ehp=Math.max(0,v); else setSelfHp(v); }'],
  '（占位：无改动）');
/* 开战时清空日志 */
rep(
  '  B={mode:mode||"wild",',
  '  clearBattleLog();   /* v32：新战斗从空日志开始 */\n  B={mode:mode||"wild",',
  '开战清空战斗日志');

/* 日志区域 CSS：可滚动 */
rep(
  '.learn-card.dragging{opacity:.35;}',
  ['.blog-line{padding:1px 0;}',
    '.blog-line.blog-new{font-weight:700;}',
    '#battle-log{max-height:132px; overflow-y:auto; overscroll-behavior:contain;}',
    '.learn-card.dragging{opacity:.35;}'].join('\n'),
  '战斗日志样式（可滚动）');

/* ── 校验 ── */
const need = ['function openDexDetail(sp){', 'openDexDetail(sp);', 'var MOVE_FX={', 'function fxOf(mv){',
  'var _fx=fxOf(mv) || {};', 'var _battleLog=[];', 'function clearBattleLog(){', 'clearBattleLog();   /* v32',
  'if(S && sp && sp.id){ S.discovered[sp.id]=1; }'.replace('{ S', '{ S'), '#battle-log{max-height:132px'];
need.forEach(n => { if (!work.includes(n)) { console.error('!! 校验失败，缺: ' + n); process.exit(1); } });
console.log('\n共 ' + done.length + ' 项改动' + (apply ? '' : '（未加 --apply，仅预演）'));
if (!apply) process.exit(0);
if (!existsSync(BAK)) { copyFileSync(FILE, BAK); console.log('已备份 → ' + BAK); }
writeFileSync(FILE, eol === '\r\n' ? work.split('\n').join('\r\n') : work, 'utf8');
console.log('已写入 ' + FILE);
