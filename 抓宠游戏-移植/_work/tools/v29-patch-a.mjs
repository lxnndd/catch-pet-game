/* v29 批次 A：①等级压制明显时解除 85% 伤害上限 ②PP 显示加固 ③去除野外 NPC ④战斗界面显示属性 + 稀有度配色
   用法：node v29-patch-a.mjs --apply */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
const ROOT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植';
const FILE = ROOT + '/抓宠游戏-v12-clean.html';
const BAK = ROOT + '/抓宠游戏-v12-clean.bak-v29a.html';
const apply = process.argv.includes('--apply');
let src = readFileSync(FILE, 'utf8');
const eol = src.includes('\r\n') ? '\r\n' : '\n';
let work = src.split('\r\n').join('\n');
const done = [];
const rep = (a, b, tag) => {
  if (b && work.includes(b)) { console.log('  [跳过] ' + tag + '（已改过）'); return; }
  if (!b && !work.includes(a)) { console.log('  [跳过] ' + tag + '（已删除）'); return; }
  if (!work.includes(a)) { console.error('  !! 找不到锚点: ' + tag); process.exit(1); }
  work = work.replace(a, b); done.push(tag); console.log('  [改动] ' + tag);
};

/* ── 1. 伤害：等级压制明显时解除 85% 上限 ── */
rep(
  ['  var capOf=Math.max(1, Math.round((atkIsSelf?B.emax:maxHpOf(selfP))*0.85));',
    '  if(dmg>capOf){ dmg=capOf; }'].join('\n'),
  ['  var _tgtMax=(atkIsSelf?B.emax:maxHpOf(selfP));',
    '  var capOf=Math.max(1, Math.round(_tgtMax*0.85));',
    '  /* v29：85% 上限只用来约束「等级相近」的对局。等级压制明显时解除上限 ——',
    '     52 级打 9 级本该一击带走，原来被削成 35 血（正好是懒人獭血上限的 85%）。 */',
    '  if(lvPress>=1.6) capOf=_tgtMax;',
    '  if(dmg>capOf){ dmg=capOf; }'].join('\n'),
  '解除等级压制下的 85% 伤害上限');

/* ── 2. PP 显示加固：新增 ppMaxOf() ── */
rep(
  '/* PP 与技能对齐：保留已有消耗，新技能补满 */\nfunction syncPP(pet){',
  ['/* v29：招式 PP 上限的统一读取口（招表里 pp 缺失/非法时兜底 10，避免界面出现 undefined） */',
    'function ppMaxOf(id){',
    '  var m=MOVES[id];',
    '  return (m && typeof m.pp==="number" && m.pp>0) ? m.pp : 10;',
    '}',
    '/* PP 与技能对齐：保留已有消耗，新技能补满 */',
    'function syncPP(pet){'].join('\n'),
  '新增 ppMaxOf()');
rep('" · PP " + mv.pp + (opts.cur', '" · PP " + ppMaxOf(id) + (opts.cur', '学习/技能弹窗 PP 上限走 ppMaxOf');
rep('" · PP "+B.sPP[mid]+"/"+mv.pp+edgeTxt', '" · PP "+B.sPP[mid]+"/"+ppMaxOf(mid)+edgeTxt', '战斗技能按钮 PP 上限走 ppMaxOf');
rep('m[id] = (cur === undefined || cur === null) ? MOVES[id].pp : Math.min(cur, MOVES[id].pp);',
  'm[id] = (cur === undefined || cur === null) ? ppMaxOf(id) : Math.min(cur, ppMaxOf(id));',
  'syncPP 补满 PP 走 ppMaxOf');
/* 顺带清理 syncPP 里的坏 id（不在招表里的技能会让 MOVES[id].pp 抛错） */
rep('  var m = {};\n  pet.moves.forEach(function(id){\n    var cur = pet.pp[id];',
  '  var m = {};\n  pet.moves = pet.moves.filter(function(id){ return !!MOVES[id]; });   /* v29：剔除坏 id，防 undefined */\n  pet.moves.forEach(function(id){\n    var cur = pet.pp[id];',
  'syncPP 剔除坏技能 id');

/* ── 3. 去除野外 NPC（训练师不再在地图上触发） ── */
rep(
  ['  var tr=trainerAt(nx,ny);',
    '  $("hint").textContent="当前"+REGION_NAME[regionAt(nx,ny)]+" · "+regionHint(nx,ny)+moveStateText()+" 🏥 小屋可治疗与存取仓库"+(tr?" · 🧑‍🏫 训练师就在旁边！":"");'].join('\n'),
  ['  /* v29：野外 NPC 已全部移除，训练师对战改为道馆挑战（见 openGym） */',
    '  $("hint").textContent="当前"+REGION_NAME[regionAt(nx,ny)]+" · "+regionHint(nx,ny)+moveStateText()+" 🏥 小屋可治疗与存取仓库";'].join('\n'),
  'move() 不再查找野外训练师 + 提示语去掉训练师');
rep('  if(tr){ updateHUD(); draw(); save(); openTrainerChallenge(tr); return; }\n',
  '', 'move() 删除野外训练师触发分支');

/* ── 4. 战斗界面：右侧标签显示属性；稀有度改用颜色 ── */
rep(
  ['  tag.textContent=RARITY_NAME[enemy.sp.rarity]+" · "+REGION_NAME[regionAt(S.pos.x,S.pos.y)];',
    '  tag.className="rarity-tag"+(enemy.sp.rarity>0?(" r"+enemy.sp.rarity):"");'].join('\n'),
  ['  /* v29：右侧标签显示「属性」（原来显示「常见 · 平原」）；稀有度改用颜色区分 */',
    '  tag.textContent=typeText(enemy.sp);',
    '  tag.className="rarity-tag rar"+clamp(enemy.sp.rarity,0,2);',
    '  if($("enemy-name")) $("enemy-name").className="rar"+clamp(enemy.sp.rarity,0,2);'].join('\n'),
  'openBattle 敌方面板显示属性 + 稀有度配色');
rep('  $("enemy-rarity").textContent=RARITY_NAME[B.esp.rarity]+" · "+typeText(B.esp);',
  ['  /* v29：同 openBattle —— 显示属性，稀有度用颜色 */',
    '  $("enemy-rarity").textContent=typeText(B.esp);',
    '  $("enemy-rarity").className="rarity-tag rar"+clamp(B.esp.rarity,0,2);',
    '  if($("enemy-name")) $("enemy-name").className="rar"+clamp(B.esp.rarity,0,2);'].join('\n'),
  '换人后敌方面板同步');
/* CSS 配色 */
rep(
  '.rarity-tag{font-size:11px; padding:1px 8px; border-radius:999px; color:#fff; background:#7c9a72;}\n.rarity-tag.r1{background:var(--rare);} .rarity-tag.r2{background:var(--legend);}',
  ['.rarity-tag{font-size:11px; padding:1px 8px; border-radius:999px; color:#fff; background:#8d949b;}',
    '/* v29 稀有度配色：常见=灰 · 稀有=蓝 · 神兽/幻兽/异兽=红（标签底色 + 名字字色） */',
    '.rarity-tag.rar0{background:#8d949b;} .rarity-tag.rar1{background:#4f8fdd;} .rarity-tag.rar2{background:#e5484d;}',
    '.rarity-tag.r1{background:#4f8fdd;} .rarity-tag.r2{background:#e5484d;}',
    '#enemy-name.rar0{color:#8d949b;} #enemy-name.rar1{color:#4f8fdd;} #enemy-name.rar2{color:#e5484d;}'].join('\n'),
  'CSS 稀有度配色（灰/蓝/红）');

/* ── 校验 ── */
const need = ['function ppMaxOf(id)', 'if(lvPress>=1.6) capOf=_tgtMax;', 'tag.textContent=typeText(enemy.sp);', 'ppMaxOf(mid)', 'ppMaxOf(id)', '.rarity-tag.rar2{background:#e5484d;}'];
need.forEach(n => { if (!work.includes(n)) { console.error('!! 校验失败，缺: ' + n); process.exit(1); } });
if (work.includes('var tr=trainerAt(nx,ny);')) { console.error('!! 野外训练师锚点仍在'); process.exit(1); }
console.log('\n共 ' + done.length + ' 项改动' + (apply ? '' : '（未加 --apply，仅预演）'));
if (!apply) process.exit(0);
if (!existsSync(BAK)) { copyFileSync(FILE, BAK); console.log('已备份 → ' + BAK); }
writeFileSync(FILE, eol === '\r\n' ? work.split('\n').join('\r\n') : work, 'utf8');
console.log('已写入 ' + FILE + ' (' + Buffer.byteLength(work, 'utf8') + ' 字节)');
