/* v28 预演：按新规则（阶段区间 ∩ 地区等级段）核算九地区野生池规模 */
import { readFileSync } from 'node:fs';
const src = readFileSync('C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/抓宠游戏-v12-clean.html', 'utf8');
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
const SPECIES = lit('SPECIES'), EVO = lit('EVO');
const LV_RANGE_RAW = lit('LV_RANGE');
/* v28 预演口径：所有地区下限统一为 1（地区只决定等级上限） */
const LV_RANGE = {}; Object.keys(LV_RANGE_RAW).forEach(k => LV_RANGE[k] = [1, LV_RANGE_RAW[k][1]]);
const byId = {}; SPECIES.forEach(s => byId[s.id] = s);
/* 与补丁一致的实现 */
const evoLvMap = {};
for (const k of Object.keys(EVO)) {
  const e = EVO[k]; const lv = (typeof e.lv === 'number' && e.lv > 0) ? e.lv : 32;
  const arr = (typeof e.to === 'string') ? [e.to] : (e.to || []);
  arr.forEach(t => { if (evoLvMap[t] === undefined || lv < evoLvMap[t]) evoLvMap[t] = lv; });
}
const evoLvOf = id => evoLvMap[id];
const nextEvoLv = sp => { const c = EVO[sp.id]; if (!c) return null; return (typeof c.lv === 'number' && c.lv > 0) ? c.lv : 32; };
const stageRange = sp => { const el = evoLvOf(sp.id), nl = nextEvoLv(sp); const lo = (el === undefined || el < 1) ? 1 : el; return [lo, nl === null ? 100 : Math.max(lo, nl - 1)]; };
const stageLvRange = (sp, reg) => { const r = LV_RANGE[reg] || [1, 25], s = stageRange(sp); const lo = Math.max(s[0], r[0]), hi = Math.min(s[1], r[1]); return hi < lo ? null : [lo, hi]; };
const wildOk = (sp, reg) => !sp.varOf && sp.habitat && sp.habitat.indexOf(reg) >= 0 && !!stageLvRange(sp, reg);
/* 旧规则口径（基础形态） */
const evolved = new Set();
for (const k of Object.keys(EVO)) { const t = EVO[k].to; (Array.isArray(t) ? t : [t]).forEach(x => evolved.add(x)); }
const oldPool = reg => SPECIES.filter(s => !evolved.has(s.id) && !s.varOf && s.habitat.indexOf(reg) >= 0).length;

console.log('== 九地区野生池：旧规则(仅基础形态) → 新规则(阶段区间匹配) ==');
const REGS = ['plain', 'forest', 'water', 'flower', 'mine', 'desert', 'ocean', 'volcano', 'snow'];
let tot = 0;
for (const reg of REGS) {
  const pool = SPECIES.filter(s => wildOk(s, reg));
  tot += pool.length;
  const [a, b] = LV_RANGE[reg];
  const evoN = pool.filter(s => evolved.has(s.id)).length;
  console.log('  ' + reg.padEnd(8) + 'Lv' + String(a).padStart(3) + '~' + String(b).padStart(3) + ' | ' + String(oldPool(reg)).padStart(4) + ' → ' + String(pool.length).padStart(4) + '  (+' + String(pool.length - oldPool(reg)).padStart(4) + ')  其中进化型 ' + String(evoN).padStart(4) + (pool.length === 0 ? '   ❌ 空池！' : ''));
  /* 抽样展示 */
  const show = [];
  const pick = [pool[0], pool[Math.floor(pool.length / 3)], pool[Math.floor(pool.length * 2 / 3)], pool[pool.length - 1]].filter(Boolean);
  pick.forEach(s => { const r = stageLvRange(s, reg); show.push(s.name + '(Lv' + r[0] + '~' + r[1] + ')'); });
  console.log('           示例: ' + show.join(' · '));
}
console.log('\n九地区池合计 ' + tot);
/* 每个地区是否至少能出「不会立刻进化」的个体：构造上必然满足，这里抽验 */
console.log('\n== 抽验：池中每只宠的等级上限是否 < 它的下次进化等级（保证抓到不会立刻进化）==');
let bad = [];
for (const reg of REGS) {
  SPECIES.filter(s => wildOk(s, reg)).forEach(s => {
    const r = stageLvRange(s, reg), nl = nextEvoLv(s);
    if (nl !== null && r[1] >= nl) bad.push(reg + '/' + s.name + ' 上限' + r[1] + ' ≥ 进化等级' + nl);
    if (evoLvOf(s.id) !== undefined && r[0] < evoLvOf(s.id)) bad.push(reg + '/' + s.name + ' 下限' + r[0] + ' < 来路' + evoLvOf(s.id));
  });
}
console.log(bad.length === 0 ? '  ✅ 全部合法（0 例外）' : '  ❌ ' + bad.length + ' 例外:\n    ' + bad.slice(0, 8).join('\n    '));
/* 展示几个极端例子说明效果 */
console.log('\n== 效果示例（同一只宠在不同地区的可刷等级）==');
['绿毛虫', '铁甲蛹', '巴大蝶', '妙蛙种子', '妙蛙草', '妙蛙花', '喷火龙'].forEach(nm => {
  const s = SPECIES.find(x => x.name === nm); if (!s) return;
  const sr = stageRange(s);
  /* 展示必须同时过 habitat 检查（wildOk），否则会把「只生活在林间」的虫系显示成满地图都是 */
const line = REGS.map(r => { const ok = wildOk(s, r); const x = ok ? stageLvRange(s, r) : null; return r.slice(0, 3) + (x ? '[' + x[0] + '-' + x[1] + ']' : '✗'); }).join(' ');
  console.log('  ' + s.name.padEnd(16) + 'habitat=[' + (s.habitat || []).join(',') + '] 阶段 Lv' + sr[0] + '~' + sr[1] + '  →  ' + line);
});
