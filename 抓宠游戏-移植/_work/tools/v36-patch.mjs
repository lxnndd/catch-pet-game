/* v36：①伤害公式区分物攻/特攻（核心机制修正）
        ②详情面板 HP 也显示种族值 + 加一行说明（左边是实值、括号是种族值）
        ③技能卡片标出 物理/特殊/变化
   用法：node v36-patch.mjs --apply */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = ROOT + '/抓宠游戏-v12-clean.html';
const BAK = ROOT + '/抓宠游戏-v12-clean.bak-v36.html';
const apply = process.argv.includes('--apply');
let src = readFileSync(FILE, 'utf8');
const eol = src.includes('\r\n') ? '\r\n' : '\n';
let work = src.split('\r\n').join('\n');
const done = [];
const rep = (a, b, tag) => {
  if (!work.includes(a)) { console.error('  !! 找不到锚点: ' + tag); process.exit(1); }
  work = work.replace(a, b); done.push(tag); console.log('  [改动] ' + tag);
};

/* ── ① 新增特攻/特防的能力值换算 ── */
rep(
  'function atkOf(sp,lv){ var v=Math.floor((2*statOf(sp,"a")+IV)*statLvK(lv)); return Math.max(1,v); }',
  ['function atkOf(sp,lv){ var v=Math.floor((2*statOf(sp,"a")+IV)*statLvK(lv)); return Math.max(1,v); }',
    '/* v36：特殊招要用特攻/特防，原来只有物攻/物防两套 → 特攻招被当成物攻算 */',
    'function spaOf(sp,lv){ var v=Math.floor((2*statOf(sp,"spa")+IV)*statLvK(lv)); return Math.max(1,v); }',
    'function spdOf(sp,lv){ var v=Math.floor((2*statOf(sp,"spd")+IV)*statLvK(lv)); return Math.max(1,v); }'].join('\n'),
  '新增 spaOf / spdOf（特攻/特防能力值）');

/* ── ② 伤害公式：按招式分类选攻防 ── */
rep(
  '  var statMul=clamp(atkOf(atkSpObj,atkLv)/Math.max(1,defOf(defSpObj,defLv)),0.9,1.6)*DMG_K;   /* 攻/防比 × 全局伤害系数（v14 定标） */',
  ['  /* v36：物理招 = 我方攻击 vs 对方防御；特殊招 = 我方特攻 vs 对方特防。',
    '     原来一律用 atkOf/defOf，导致特攻手（如洛克的魔攻型）打不出应有的伤害。 */',
    '  var _isSpecial = (mv.cat === "特殊");',
    '  var _atkVal = _isSpecial ? spaOf(atkSpObj,atkLv) : atkOf(atkSpObj,atkLv);',
    '  var _defVal = _isSpecial ? spdOf(defSpObj,defLv) : defOf(defSpObj,defLv);',
    '  var statMul=clamp(_atkVal/Math.max(1,_defVal),0.9,1.6)*DMG_K;   /* 攻/防（或特攻/特防）比 × 全局伤害系数 */'].join('\n'),
  '伤害公式区分物理/特殊（核心修正）');

/* ── ③ 详情面板：HP 带种族值 + 顶部说明 ── */
rep(
  '    ["❤️ HP",     p.hp+" / "+maxHpOf(p)],',
  '    ["❤️ HP",     p.hp+" / "+maxHpOf(p)+"   （种族 "+hpBaseOf(sp)+"）"],',
  '详情面板 HP 显示种族值');
rep(
  '  var list=document.createElement("div"); list.className="stat-list";\n  rows.forEach(function(r){',
  ['  /* v36：说明这列数字分别是什么，免得看不出「636（种族 85）」哪个是哪个 */',
    '  var tip=document.createElement("p"); tip.className="dex-note";',
    '  tip.textContent="左侧是按当前等级换算后的实际能力值（战斗中真正参与计算的就是它），括号里是种族值（1~255，决定成长上限，越高越强）。";',
    '  body.appendChild(tip);',
    '  var list=document.createElement("div"); list.className="stat-list";',
    '  rows.forEach(function(r){'].join('\n'),
  '详情面板加数值说明');
/* 详情面板技能卡片也标物理/特殊 */
rep(
  '        sm.textContent=(mv.power?("威力 "+mv.power):"变化技")+" · PP "+ppMaxOf(id);\n        c.appendChild(top); c.appendChild(sm); mg.appendChild(c);',
  ['        sm.textContent=(mv.power?("威力 "+mv.power):"变化技")+" · PP "+ppMaxOf(id)+(mv.cat?(" · "+mv.cat):"");',
    '        c.appendChild(top); c.appendChild(sm); mg.appendChild(c);'].join('\n'),
  '详情面板技能卡片标出分类');

/* ── ④ 学习/技能弹窗的卡片也标分类 ── */
rep(
  '  sub.textContent = (mv.power ? ("威力 " + mv.power) : "变化技") + " · PP " + ppMaxOf(id) + (opts.cur ? (opts.ppNow !== undefined ? (" · 剩余 " + opts.ppNow) : "") : "");',
  '  sub.textContent = (mv.power ? ("威力 " + mv.power) : "变化技") + (mv.cat ? (" · " + mv.cat) : "") + " · PP " + ppMaxOf(id) + (opts.cur ? (opts.ppNow !== undefined ? (" · 剩余 " + opts.ppNow) : "") : "");',
  '技能弹窗卡片标出分类');

/* ── ⑤ 战斗技能按钮标分类 ── */
rep(
  '    sm.textContent=B.sPP[mid]<=0?"PP 用尽":"威力 "+mv.power+" · PP "+B.sPP[mid]+"/"+ppMaxOf(mid)+edgeTxt;',
  '    sm.textContent=B.sPP[mid]<=0?"PP 用尽":((mv.power?("威力 "+mv.power):"变化技")+(mv.cat?(" · "+mv.cat):"")+" · PP "+B.sPP[mid]+"/"+ppMaxOf(mid)+edgeTxt);',
  '战斗技能按钮标出分类');

/* ── 校验 ── */
const need = ['function spaOf(sp,lv){', 'function spdOf(sp,lv){', 'var _isSpecial = (mv.cat === "特殊");',
  'var _atkVal = _isSpecial ? spaOf', 'var _defVal = _isSpecial ? spdOf',
  '（种族 "+hpBaseOf(sp)+"）', '左侧是按当前等级换算后的实际能力值'];
need.forEach(n => { if (!work.includes(n)) { console.error('!! 校验失败，缺: ' + n); process.exit(1); } });
if (work.includes('clamp(atkOf(atkSpObj,atkLv)/Math.max(1,defOf(defSpObj,defLv))')) { console.error('!! 旧的无差别攻防公式仍在'); process.exit(1); }
console.log('\n共 ' + done.length + ' 项改动' + (apply ? '' : '（未加 --apply，仅预演）'));
if (!apply) process.exit(0);
if (!existsSync(BAK)) { copyFileSync(FILE, BAK); console.log('已备份 → ' + BAK); }
writeFileSync(FILE, eol === '\r\n' ? work.split('\n').join('\r\n') : work, 'utf8');
console.log('已写入 ' + FILE);
