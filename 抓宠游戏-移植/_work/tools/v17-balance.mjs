/* v17 平衡标定：直接从游戏里取真实公式与数据，模拟不同等级的战斗回合数 */
import { readFileSync } from 'node:fs';
const F = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/抓宠游戏-v12-clean.html';
const src = readFileSync(F, 'utf8');
function sliceLiteral(s, i) {
  const o = s.slice(i).search(/[[{]/); const from = i + o;
  const oc = s[from], cc = oc === '[' ? ']' : '}';
  let d = 0, j = from, inStr = null, esc = false;
  for (; j < s.length; j++) { const c = s[j];
    if (inStr) { if (esc) { esc = false; continue; } if (c === '\\') { esc = true; continue; } if (c === inStr) inStr = null; continue; }
    if (c === '"' || c === "'") { inStr = c; continue; }
    if (c === oc) d++; else if (c === cc) { d--; if (d === 0) { j++; break; } }
  }
  return s.slice(from, j);
}
const g = (n) => { const i = src.indexOf('var ' + n + '='); return i < 0 ? null : new Function('return (' + sliceLiteral(src, i + ('var ' + n + '=').length) + ')')(); };
const SP = g('SPECIES'), MV = g('MOVES'), CHART = g('CHART');
/* 从游戏源码里抠出数值常量 */
const pick = (re, dflt) => { const m = src.match(re); return m ? Number(m[1]) : dflt; };
const HP_C = pick(/var HP_C\s*=\s*([\d.]+)/, 12);
console.log('HP_C = ' + HP_C);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const statOf = (sp, k) => sp[k] || 70;
const hpBaseOf = (sp) => (sp.hpBase !== undefined ? sp.hpBase : sp.base);
const maxHpAt = (sp, lv) => Math.max(1, Math.floor(2 * hpBaseOf(sp) * Math.max(1, lv) / 100) + Math.max(1, lv) + 10 + HP_C);
const typesOf = (sp) => [sp.type, ...(sp.type2 ? [sp.type2] : [])].filter(Boolean);
function eff(t, defSp) { let m = 1; typesOf(defSp).forEach(d => { const v = (CHART[t] || {})[d]; m *= (v === undefined ? 1 : v); }); return m; }
const STAT_LV_K = pick(/var STAT_LV_K\s*=\s*([\d.]+)/, 25);
const IV = pick(/var IV\s*=\s*([\d.]+)/, 15);
const statLvK = (lv) => 1 + Math.max(1, lv) / STAT_LV_K;
const atkOf = (sp, lv) => Math.max(1, Math.floor((2 * statOf(sp, 'a') + IV) * statLvK(lv)));
const defOf = (sp, lv) => Math.max(1, Math.floor((2 * statOf(sp, 'd') + IV) * statLvK(lv)));
/* 复刻游戏里的 lvBonus 与 statMul（取值来自源码，若改了这里也会跟着变） */
const lvBonusSrc = src.match(/var lvBonus\s*=\s*([^;]+);/);
console.log('游戏内 lvBonus 表达式：' + (lvBonusSrc ? lvBonusSrc[1].trim() : '未找到'));
const statMulK = pick(/statMul\s*=\s*clamp\([^)]*\)\s*\*\s*([\d.]+)/, 0.75);
console.log('statMul 系数：' + statMulK);
const fScaleSrc = src.match(/function fScale[^}]*}/);
if (fScaleSrc) console.log('fScale：' + fScaleSrc[0].replace(/\s+/g, ' ').slice(0, 160));

/* 用固定参数模拟（如果不一致，以源码为准再调） */
const lvBonusNow = (lv) => clamp(0.55 + 0.055 * (lv - 1), 0.55, 3.2);
function dmg(aSp, dSp, mv, lv) {
  const statMul = clamp(atkOf(aSp, lv) / Math.max(1, defOf(dSp, lv)), 0.9, 1.6) * statMulK;
  return Math.max(1, Math.round(mv.power * eff(mv.type, dSp) * lvBonusNow(lv) * statMul * 0.9));
}
/* 取常见宝可梦（非进化形态、种族值中等）做样本 */
const pool = SP.filter(s => !s.varOf && s.rarity === 0 && s.hpBase >= 45 && s.hpBase <= 80);
console.log('\n样本 ' + pool.length + ' 只（常见中等体型）');
console.log('\n等级   对手HP   我方伤害/回合   预计回合');
[1, 5, 10, 15, 20, 30, 40, 50].forEach(lv => {
  let sum = 0, hpSum = 0, n = 0;
  for (let i = 0; i < 120; i++) {
    const a = pool[i % pool.length], d = pool[(i * 7 + 3) % pool.length];
    const mvId = (a.pools && a.pools.p0 || [])[0];
    const mv = MV[mvId];
    if (!mv || !mv.power) continue;
    sum += dmg(a, d, mv, lv); hpSum += maxHpAt(d, lv); n++;
  }
  const avgDmg = sum / Math.max(1, n), avgHp = hpSum / Math.max(1, n);
  console.log(String(lv).padEnd(6) + avgHp.toFixed(0).padEnd(9) + avgDmg.toFixed(1).padEnd(15) + (avgHp / avgDmg).toFixed(1));
});
console.log('\n目标：各等级平均 3~4 回合。');
console.log('\n=== 参数敏感性（如果改 lvBonus 上限/系数）===');
[['现参数 0.055/上限3.2', (lv) => clamp(0.55 + 0.055 * (lv - 1), 0.55, 3.2)],
['温和 0.030/上限2.0', (lv) => clamp(0.55 + 0.030 * (lv - 1), 0.55, 2.0)],
['更温和 0.018/上限1.6', (lv) => clamp(0.55 + 0.018 * (lv - 1), 0.55, 1.6)]].forEach(([label, fn]) => {
  const out = [1, 10, 20, 30, 50].map(lv => {
    let s = 0, h = 0, n = 0;
    for (let i = 0; i < 120; i++) {
      const a = pool[i % pool.length], d = pool[(i * 7 + 3) % pool.length];
      const mvId = (a.pools && a.pools.p0 || [])[0]; const mv = MV[mvId];
      if (!mv || !mv.power) continue;
      const statMul = clamp(atkOf(a, lv) / Math.max(1, defOf(d, lv)), 0.9, 1.6) * statMulK;
      s += Math.max(1, Math.round(mv.power * eff(mv.type, d) * fn(lv) * statMul * 0.9));
      h += maxHpAt(d, lv); n++;
    }
    return 'Lv' + lv + ':' + (h / n / (s / n)).toFixed(1) + '回合';
  }).join('  ');
  console.log('  ' + label.padEnd(22) + out);
});
