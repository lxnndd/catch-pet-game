/* v17 用「游戏真实公式」做平衡标定：目标是各等级平均 3~4 回合 */
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
const pick = (re, d) => { const m = src.match(re); return m ? Number(m[1]) : d; };
const HP_C = pick(/var HP_C\s*=\s*([\d.]+)/, 12);
const STAT_LV_K = pick(/var STAT_LV_K\s*=\s*([\d.]+)/, 25);
const IV = pick(/var IV\s*=\s*([\d.]+)/, 15);
const STATMUL_K = 0.75;                    /* statMul 后面的全局系数 */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hpBaseOf = (sp) => (sp.hpBase !== undefined ? sp.hpBase : sp.base);
const maxHpAt = (sp, lv) => Math.max(1, Math.floor(2 * hpBaseOf(sp) * Math.max(1, lv) / 100) + Math.max(1, lv) + 10 + HP_C);
const statOf = (sp, k) => sp[k] || 70;
const statLvK = (lv) => 1 + Math.max(1, lv) / STAT_LV_K;
const atkOf = (sp, lv) => Math.max(1, Math.floor((2 * statOf(sp, 'a') + IV) * statLvK(lv)));
const defOf = (sp, lv) => Math.max(1, Math.floor((2 * statOf(sp, 'd') + IV) * statLvK(lv)));
const typesOf = (sp) => [sp.type, ...(sp.type2 ? [sp.type2] : [])].filter(Boolean);
function eff(t, defSp) { let m = 1; typesOf(defSp).forEach(d => { const v = (CHART[t] || {})[d]; m *= (v === undefined ? 1 : v); }); return m; }
const pool = SP.filter(s => !s.varOf && s.rarity === 0 && s.hpBase >= 45 && s.hpBase <= 80);
console.log('样本 ' + pool.length + ' 只 · HP_C=' + HP_C + ' STAT_LV_K=' + STAT_LV_K + ' IV=' + IV);

function avgTurns(lv, lvBonusFn, statmulK, critOn = true) {
  let turns = 0, n = 0;
  for (let i = 0; i < 260; i++) {
    const a = pool[i % pool.length], d = pool[(i * 7 + 3) % pool.length];
    const mvId = ((a.pools && a.pools.p0) || [])[0];
    const mv = MV[mvId];
    if (!mv || !mv.power) continue;
    const statMul = clamp(atkOf(a, lv) / Math.max(1, defOf(d, lv)), 0.9, 1.6) * statmulK;
    const e = eff(mv.type, d);
    const crit = critOn ? 1.06 : 1;         /* 暴击期望 ≈ 1+0.06*0.6 */
    const base = mv.power * e * lvBonusFn(lv) * statMul * crit * (0.85 + 0.15);
    const dmg = Math.max(1, Math.round(base));
    turns += maxHpAt(d, lv) / dmg;
    n++;
  }
  return turns / Math.max(1, n);
}
const FSCALE = (lv) => 0.55 + 0.45 * Math.min(1, Math.max(0, (lv - 1) / 12));
const CUR = (lv) => clamp(0.55 + 0.055 * (lv - 1), 0.55, 3.2) * FSCALE(lv);
console.log('\n=== 现状（0.75 × 现有 lvBonus）===');
console.log([1, 5, 10, 15, 20, 30, 40, 50].map(lv => 'Lv' + lv + ':' + avgTurns(lv, CUR, STATMUL_K).toFixed(1)).join('  '));

console.log('\n=== 候选参数（目标每档 3~4 回合）===');
const CANDS = [
  ['A: statmul 0.42 + 现 lvBonus', (lv) => CUR(lv), 0.42],
  ['B: statmul 0.38 + 温和 lvBonus(0.03/2.0)', (lv) => clamp(0.55 + 0.030 * (lv - 1), 0.55, 2.0) * FSCALE(lv), 0.38],
  ['C: statmul 0.40 + 0.035/2.2', (lv) => clamp(0.55 + 0.035 * (lv - 1), 0.55, 2.2) * FSCALE(lv), 0.40],
  ['D: statmul 0.45 + 0.030/2.0', (lv) => clamp(0.55 + 0.030 * (lv - 1), 0.55, 2.0) * FSCALE(lv), 0.45],
  ['E: statmul 0.35 + 0.040/2.4', (lv) => clamp(0.55 + 0.040 * (lv - 1), 0.55, 2.4) * FSCALE(lv), 0.35],
];
CANDS.forEach(([label, fn, k]) => {
  const vals = [1, 5, 10, 15, 20, 30, 40, 50].map(lv => avgTurns(lv, fn, k));
  const inRange = vals.filter(v => v >= 2.6 && v <= 4.6).length;
  console.log('  ' + label.padEnd(38) + vals.map((v, i) => 'Lv' + [1, 5, 10, 15, 20, 30, 40, 50][i] + ':' + v.toFixed(1)).join(' ') + '  合格 ' + inRange + '/8');
});
