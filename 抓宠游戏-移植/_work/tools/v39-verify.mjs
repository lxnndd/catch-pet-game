/* 验证 v39：真实道馆/四天王队伍里的宝可梦是否都存在于游戏中 */
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
const SPECIES = lit('SPECIES'), GYMS = lit('REAL_GYMS'), E4 = lit('REAL_E4');
const byId = {}; SPECIES.forEach(s => byId[s.id] = s);
const LV = lit('LV_RANGE');
const REGION_NAME = lit('REGION_NAME');

console.log('══ 八道馆（真实数据）══');
let miss = 0;
Object.keys(GYMS).forEach(reg => {
  const g = GYMS[reg];
  const cap = (LV[reg] || [1, 25])[1];
  const team = g.team.map(it => {
    const s = byId[it[0]];
    if (!s) { miss++; return '❌' + it[0]; }
    return s.name + (it[1] > 0 ? (' Lv' + it[1]) : (' Lv' + cap));
  });
  console.log('  ' + (REGION_NAME[reg] || reg).padEnd(6) + ' ' + (g.leader + '').padEnd(6) + ' ' + (g.gym + '').padEnd(8) + ' ' + (g.badge + '').padEnd(6) + ' → ' + team.join(' · '));
});
console.log('\n══ 四天王 + 冠军（真实等级）══');
E4.forEach(w => {
  const team = w.team.map(it => {
    const s = byId[it[0]];
    if (!s) { miss++; return '❌' + it[0]; }
    return s.name + ' Lv' + it[1];
  });
  console.log('  ' + w.title + ' ' + w.name.padEnd(6) + ' → ' + team.join(' · '));
});
console.log('\n缺失的宝可梦: ' + miss + (miss === 0 ? '  ✅ 全部存在' : '  ❌'));
