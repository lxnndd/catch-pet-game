/* 验证 v36：招式分类覆盖率 + 物攻/特攻分离后的实际效果 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const src = readFileSync(ROOT + '/抓宠游戏-v12-clean.html', 'utf8');
function sliceLiteral(s, i) {
  const o = s.slice(i).search(/[[{]/); const from = i + o;
  const oc = s[from], cc = oc === '[' ? ']' : '}';
  let d = 0, j = from, inStr = null, esc = false;
  for (; j < s.length; j++) {
    const c = s[j];
    if (inStr) { if (esc) { esc = false; continue; } if (c === '\\') { esc = true; continue; } if (c === inStr) inStr = null; continue; }
    if (c === '"') { inStr = c; continue; }
    if (c === oc) d++; else if (c === cc) { d--; if (d === 0) { j++; break; } }
  }
  return s.slice(from, j);
}
const declAt = n => { const m = new RegExp('var\\s+' + n + '\\s*=').exec(src); return m ? m.index + m[0].length : -1; };
const lit = n => new Function('return (' + sliceLiteral(src, declAt(n)) + ')')();
const MOVES = lit('MOVES'), SPECIES = lit('SPECIES');
const byId = {}; SPECIES.forEach(s => byId[s.id] = s);

console.log('══ 1. 招式分类覆盖率 ══');
const cat = {};
Object.keys(MOVES).forEach(k => { const c = MOVES[k].cat || '(空)'; cat[c] = (cat[c] || 0) + 1; });
Object.keys(cat).forEach(k => console.log('  ' + k + ': ' + cat[k] + ' 招'));
const noCat = Object.keys(MOVES).filter(k => !MOVES[k].cat || !MOVES[k].power === false && false);
const noCatWithPower = Object.keys(MOVES).filter(k => !MOVES[k].cat && MOVES[k].power > 0);
console.log('  有威力但没分类（会走物攻公式）: ' + noCatWithPower.length + ' 招');

console.log('\n══ 2. 物攻/特攻分离的实际效果 ══');
const IV = 15, STAT_LV_K = 25, DMG_K = 0.26;
const statOf = (s, k) => s[k] || 70;
const statLvK = lv => 1 + Math.max(1, lv) / STAT_LV_K;
const atkOf = (s, lv) => Math.max(1, Math.floor((2 * statOf(s, 'a') + IV) * statLvK(lv)));
const defOf = (s, lv) => Math.max(1, Math.floor((2 * statOf(s, 'd') + IV) * statLvK(lv)));
const spaOf = (s, lv) => Math.max(1, Math.floor((2 * statOf(s, 'spa') + IV) * statLvK(lv)));
const spdOf = (s, lv) => Math.max(1, Math.floor((2 * statOf(s, 'spd') + IV) * statLvK(lv)));
const A = byId['pk-208'], D = byId['pk-095'];   /* 大钢蛇（攻85/特攻55） vs 大岩蛇 */
if (A && D) {
  const lv = 61, dlv = 61;
  const phys = Math.min(1.6, Math.max(0.9, atkOf(A, lv) / defOf(D, dlv)));
  const spec = Math.min(1.6, Math.max(0.9, spaOf(A, lv) / spdOf(D, dlv)));
  console.log('  ' + A.name + ' Lv' + lv + '（攻' + statOf(A, 'a') + '/特攻' + statOf(A, 'spa') + '）打 ' + D.name + '（防' + statOf(D, 'd') + '/特防' + statOf(D, 'spd') + '）');
  console.log('    物理招 系数 = ' + (phys * DMG_K).toFixed(4) + '   （攻' + atkOf(A, lv) + ' / 防' + defOf(D, dlv) + '）');
  console.log('    特殊招 系数 = ' + (spec * DMG_K).toFixed(4) + '   （特攻' + spaOf(A, lv) + ' / 特防' + spdOf(D, dlv) + '）');
  console.log('    → ' + (Math.abs(phys - spec) > 0.01 ? '✅ 两者不同，特攻招已走特攻/特防' : '⚠️ 两者相同（该宠双攻接近）'));
}
console.log('\n══ 3. 抽查几只特攻手（它们的特殊招应该明显强于/异于物理招）══');
['pk-006', 'pk-085', 'kz-006'].forEach(id => {
  const s = byId[id]; if (!s) return;
  console.log('  ' + (s.name + '').padEnd(8) + ' 攻' + String(statOf(s, 'a')).padStart(3) + ' 特攻' + String(statOf(s, 'spa')).padStart(3) + ' 防' + String(statOf(s, 'd')).padStart(3) + ' 特防' + String(statOf(s, 'spd')).padStart(3) + (statOf(s, 'spa') > statOf(s, 'a') ? '  ← 特攻型' : ''));
});
