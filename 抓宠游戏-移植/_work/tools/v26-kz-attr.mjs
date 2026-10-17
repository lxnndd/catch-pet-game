/* v26 统计洛克物种的属性映射，找出可疑项 */
import { readFileSync, writeFileSync } from 'node:fs';
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
const SP = new Function('return (' + sliceLiteral(src, src.indexOf('var SPECIES=') + 'var SPECIES='.length) + ')')();
const kz = SP.filter(s => s.kz);
const pk = SP.filter(s => s.pk);
console.log('洛克 ' + kz.length + ' · 宝可梦 ' + pk.length);
/* 字段清单 */
const keys = new Set(); kz.forEach(s => Object.keys(s).forEach(k => keys.add(k)));
console.log('洛克物种字段: ' + [...keys].join(','));
console.log('宝可梦物种字段: ' + [...new Set(pk.flatMap(s => Object.keys(s)))].join(','));
/* 属性分布 */
const dist = {};
kz.forEach(s => { const k = s.type + (s.type2 ? '/' + s.type2 : ''); dist[k] = (dist[k] || 0) + 1; });
console.log('\n洛克属性分布:');
Object.entries(dist).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log('  ' + k + ' : ' + v));
/* 前 60 只明细 */
const lines = kz.map(s => [s.id, s.name, s.type, s.type2 || '', s.habitat ? s.habitat.join('/') : '', s.hpBase, s.rarity].join('\t'));
writeFileSync(ROOT + '/_work/out/v26-kz-attr.tsv', 'id\tname\ttype\ttype2\thabitat\thpBase\trarity\n' + lines.join('\n'));
console.log('\n明细已写 _work/out/v26-kz-attr.tsv，前 40 只：');
for (const l of lines.slice(0, 40)) console.log('  ' + l.replace(/\t/g, ' | '));
