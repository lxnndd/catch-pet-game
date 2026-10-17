/* v26 克制体系全量校验：游戏内 CHART vs 权威 CHART18（typechart18.mjs），18×18=324 对 */
import { readFileSync } from 'node:fs';
import { CHART18, T18, T18_NAME } from './typechart18.mjs';
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
const GAME = new Function('return (' + sliceLiteral(src, src.indexOf('var CHART=') + 'var CHART='.length) + ')')();
console.log('游戏内 CHART 攻击属性 ' + Object.keys(GAME).length + ' 个 · 权威表 ' + Object.keys(CHART18).length + ' 个');
const diffs = [];
for (const a of T18) {
  for (const d of T18) {
    const g = (GAME[a] && GAME[a][d] !== undefined) ? GAME[a][d] : 1;
    const r = (CHART18[a] && CHART18[a][d] !== undefined) ? CHART18[a][d] : 1;
    if (g !== r) diffs.push(T18_NAME[a] + '→' + T18_NAME[d] + '：游戏 ' + g + '× / 官方 ' + r + '×');
  }
}
console.log(diffs.length ? '\n❌ 差异 ' + diffs.length + ' 处：' : '\n✅ 324 对全部一致');
for (const x of diffs) console.log('  ' + x);
/* 游戏内有没有出现权威表里不存在的属性键 */
const extra = [];
for (const a of Object.keys(GAME)) for (const d of Object.keys(GAME[a])) if (!T18.includes(a) || !T18.includes(d)) extra.push(a + '→' + d);
console.log(extra.length ? '⚠️ 非官方属性键：' + extra.join('、') : '属性键全部合法（18 属性）');
/* 逐属性统计「克制/抵抗/无效」条数，与官方对照 */
console.log('\n各攻击属性的克制条数（游戏 vs 官方）：');
for (const a of T18) {
  const stat = ch => { let n2 = 0, n05 = 0, n0 = 0; for (const d of T18) { const v = (ch[a] && ch[a][d] !== undefined) ? ch[a][d] : 1; if (v === 2) n2++; else if (v === 0.5) n05++; else if (v === 0) n0++; } return n2 + '/' + n05 + '/' + n0; };
  const g = stat(GAME), r = stat(CHART18);
  console.log('  ' + T18_NAME[a].padEnd(4) + ' 游戏 ' + g.padEnd(8) + ' 官方 ' + r.padEnd(8) + (g === r ? '' : '  ← 不一致'));
}
