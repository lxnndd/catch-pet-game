/* v28 分析：野怪等级规则 + 进化型可否进野外池 */
import { readFileSync } from 'node:fs';
const ROOT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植';
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
const lit = n => new Function('return (' + sliceLiteral(src, src.indexOf('var ' + n + '=') + ('var ' + n + '=').length) + ')')();
const SPECIES = lit('SPECIES'), EVO = lit('EVO'), LV_RANGE = lit('LV_RANGE');
const byId = {}; SPECIES.forEach(s => byId[s.id] = s);
/* 进化关系 */
const evolvedIds = new Set(), evoOf = {};
for (const k of Object.keys(EVO)) {
  const e = EVO[k], tos = Array.isArray(e.to) ? e.to : [e.to];
  tos.forEach(t => { evolvedIds.add(t); if (!evoOf[t]) evoOf[t] = []; evoOf[t].push({ from: k, lv: e.lv, how: e.how || e.evoType }); });
}
const wild = SPECIES.filter(s => !evolvedIds.has(s.id) && !s.varOf);
const evoWild = SPECIES.filter(s => evolvedIds.has(s.id) && !s.varOf);
console.log('物种 ' + SPECIES.length + ' · 基础形态(可野生) ' + wild.length + ' · 进化形态 ' + evoWild.length);
/* 进化等级分布 */
const lvs = evoWild.map(s => Math.min(...(evoOf[s.id] || [{ lv: 999 }]).map(x => x.lv || 999)));
lvs.sort((a, b) => a - b);
const q = p => lvs[Math.floor(lvs.length * p)];
console.log('\n== 进化形态的「最低进化等级」分布 ==');
console.log('  最小 ' + lvs[0] + ' · 25%分位 ' + q(0.25) + ' · 中位 ' + q(0.5) + ' · 75%分位 ' + q(0.75) + ' · 最大 ' + lvs[lvs.length - 1]);
const bands = [[0, 15], [16, 25], [26, 35], [36, 45], [46, 55], [56, 65], [66, 75], [76, 999]];
bands.forEach(([a, b]) => { const n = lvs.filter(v => v >= a && v <= b).length; console.log('  进化等级 ' + String(a).padStart(3) + '~' + String(b === 999 ? '∞' : b).padStart(3) + ' : ' + String(n).padStart(4) + ' 只  ' + '#'.repeat(Math.round(n / 8))); });
console.log('\n== 现有地区等级段 ==');
Object.keys(LV_RANGE).forEach(r => {
  const [a, b] = LV_RANGE[r];
  const cur = wild.filter(s => s.habitat && s.habitat.indexOf(r) >= 0).length;
  const canAdd = evoWild.filter(s => s.habitat && s.habitat.indexOf(r) >= 0 && Math.min(...(evoOf[s.id] || [{ lv: 999 }]).map(x => x.lv || 999)) <= b).length;
  const cannot = evoWild.filter(s => s.habitat && s.habitat.indexOf(r) >= 0 && Math.min(...(evoOf[s.id] || [{ lv: 999 }]).map(x => x.lv || 999)) > b).length;
  console.log('  ' + r.padEnd(8) + 'Lv' + String(a).padStart(3) + '~' + String(b).padStart(3) + ' | 现有基础形态池 ' + String(cur).padStart(4) + ' | 该地区栖息地里的进化形态 ' + String(canAdd + cannot).padStart(4) + '（进化等级≤上限 = ' + canAdd + '，>上限 = ' + cannot + '）');
});
console.log('\n== 三段进化链示例（看形态与等级门槛）==');
let shown = 0;
for (const k of Object.keys(EVO)) {
  const e = EVO[k], tos = Array.isArray(e.to) ? e.to : [e.to];
  const to = tos[0];
  const e2 = EVO[to];
  if (!e2) continue;
  const to2 = Array.isArray(e2.to) ? e2.to[0] : e2.to;
  console.log('  ' + (byId[k]?.name || k) + ' --Lv' + e.lv + '--> ' + (byId[to]?.name || to) + ' --Lv' + e2.lv + '--> ' + (byId[to2]?.name || to2));
  if (++shown >= 6) break;
}
/* 各栖息地分区统计 */
console.log('\n== 若「进化形态按进化等级 ≤ 地区上限」进池，各地区池规模变化 ==');
let t0 = 0, t1 = 0;
Object.keys(LV_RANGE).forEach(r => {
  const [a, b] = LV_RANGE[r];
  const cur = wild.filter(s => s.habitat && s.habitat.indexOf(r) >= 0).length;
  const add = evoWild.filter(s => s.habitat && s.habitat.indexOf(r) >= 0 && Math.min(...(evoOf[s.id] || [{ lv: 999 }]).map(x => x.lv || 999)) <= b).length;
  t0 += cur; t1 += cur + add;
  console.log('  ' + r.padEnd(8) + String(cur).padStart(4) + ' → ' + String(cur + add).padStart(4) + '  (+' + add + ')');
});
console.log('  九地区合计 ' + t0 + ' → ' + t1);
