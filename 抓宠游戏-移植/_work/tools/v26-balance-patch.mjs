/* v26 战斗平衡补丁：
   ① 全局伤害系数抽出为 DMG_K（原 0.75 硬编码，量级约为宝可梦官方 5 倍，导致同级两击必杀）
   ② 新增等级压制 lvPress（等级差直接决定伤害，同级 = 1 不影响既有节奏）
   用法：node v26-balance-patch.mjs [--apply] [--dmgk 0.20]                       */
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
const ROOT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植';
const F = ROOT + '/抓宠游戏-v12-clean.html';
const APPLY = process.argv.includes('--apply');
const DI = process.argv.indexOf('--dmgk');
const DMGK = DI > 0 ? Number(process.argv[DI + 1]) : 0.20;
let src = readFileSync(F, 'utf8');
const before = src;
const log = [];

function rep(what, oldS, newS) {
  const n = src.split(oldS).length - 1;
  if (n !== 1) { throw new Error(what + '：期望出现 1 次，实际 ' + n + ' 次'); }
  src = src.replace(oldS, newS);
  log.push('✅ ' + what);
}

/* A) 抽出 DMG_K */
if (src.includes('var HP_K=1, HP_C=12;')) {
  rep('A 抽出 DMG_K 常量', 'var HP_K=1, HP_C=12;',
    'var HP_K=1, HP_C=12, DMG_K=' + DMGK + ';   /* v26：全局伤害系数（原 0.75 硬编码在 statMul 里；重新定标至同级 3~4 回合） */');
} else if (src.includes('DMG_K=')) {
  src = src.replace(/var HP_K=1, HP_C=12, DMG_K=[\d.]+;/, 'var HP_K=1, HP_C=12, DMG_K=' + DMGK + ';');
  log.push('↻ A DMG_K 已存在，改为 ' + DMGK);
} else throw new Error('找不到 HP_C 常量行');

/* B) statMul 用 DMG_K */
if (src.includes(')*0.75;   /* 攻/防比 × 全局伤害系数')) {
  rep('B statMul 改用 DMG_K', ')*0.75;   /* 攻/防比 × 全局伤害系数',
    ')*DMG_K;   /* 攻/防比 × 全局伤害系数');
} else if (src.includes(')*DMG_K;')) {
  log.push('↻ B 已改过');
} else throw new Error('找不到 statMul 的 0.75');

/* C) 加等级压制 */
if (!src.includes('var lvPress=')) {
  rep('C 新增 lvPress 等级压制', '  var atkM=atkT.atk*statMul,',
    '  /* v26 等级压制：等级差直接决定伤害。同级 = 1（不影响既有的同级节奏）；\n' +
    '     公式 0.5+0.5×(攻方等级/守方等级)，温和但有感：20 打 56 → ×0.68，56 打 20 → ×1.9。 */\n' +
    '  var lvPress=clamp(0.5+0.5*(Math.max(1,atkLv)/Math.max(1,defLv)), 0.5, 2.0);\n' +
    '  var atkM=atkT.atk*statMul*lvPress,');
} else {
  src = src.replace(/var lvPress=clamp\([^;]+;/, 'var lvPress=clamp(0.5+0.5*(Math.max(1,atkLv)/Math.max(1,defLv)), 0.5, 2.0);');
  log.push('↻ C lvPress 已存在，重置公式');
}
/* E) 提高等级加成上限：原 3.2 在 Lv56 就封顶，导致高等级「血量继续涨、伤害不涨」→ Lv100 要 8.5 回合 */
src = src.replace(/var lvBonus=clamp\(0\.55\+0\.055\*\(lvOf-1\), 0\.55, [\d.]+\);/, 'var lvBonus=clamp(0.55+0.055*(lvOf-1), 0.55, 4.2);');
log.push('✅ E lvBonus 上限 → 4.2');
/* F) 开局折算放宽：伤害系数已从 0.75 降到 0.26，原 0.55 起点让 Lv1 要 7.8 回合 */
src = src.replace(/var fScale=0\.55\+0\.45\*Math\.min\(1, Math\.max\(0,\(lvOf-1\)\/12\)\);/, 'var fScale=0.75+0.25*Math.min(1, Math.max(0,(lvOf-1)/12));');
log.push('✅ F 开局折算 → 0.75 起');
/* D) 伤害表达式里补上 lvPress（若还没加） */
if (!/var base=mv\.power\*e\*lvBonus\*lvPress\*atkM/.test(src)) {
  rep('D base 乘入 lvPress', 'var base=mv.power*e*lvBonus*atkM',
    'var base=mv.power*e*lvBonus*lvPress*atkM');
} else log.push('↻ D 已乘入');

console.log(log.join('\n'));
console.log('DMG_K = ' + DMGK + ' · 文件 ' + (before.length / 1024).toFixed(0) + ' KB → ' + (src.length / 1024).toFixed(0) + ' KB');
if (!APPLY) { console.log('\n（未加 --apply，仅预演）'); process.exit(0); }
const bak = F.replace(/\.html$/, '.bak-v26-balance.html');
copyFileSync(F, bak);
writeFileSync(F, src, 'utf8');
console.log('\n已写入 ' + F + '\n备份 ' + bak);
