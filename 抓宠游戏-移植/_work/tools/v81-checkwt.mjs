/* 查 SPECIES 里的体重注入结果 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const src = readFileSync(ROOT + '/抓宠游戏-v12-clean.html', 'utf8');
const at = src.indexOf('var SPECIES=[');
let j = src.indexOf('[', at), d = 0, k = j, ins = false, q = '', esc = false;
for (; k < src.length; k++) {
  const c = src[k];
  if (ins) { if (esc) { esc = false; continue; } if (c === '\\') { esc = true; continue; } if (c === q) ins = false; continue; }
  if (c === '"' || c === "'") { ins = true; q = c; continue; }
  if (c === '[') d++; else if (c === ']') { d--; if (d === 0) { k++; break; } }
}
const arr = JSON.parse(src.slice(j, k));
console.log('SPECIES 共 ' + arr.length + ' 条');
['pk-143', 'pk-025', 'pk-001', 'pk-006'].forEach(id => {
  const o = arr.find(x => x.id === id);
  if (!o) { console.log('   ' + id + ' 找不到'); return; }
  console.log('   ' + id + ' ' + o.name + ' pk=' + o.pk + ' wt=' + o.wt);
});
const withWt = arr.filter(x => x.wt).length;
const uniq = new Set(arr.filter(x => x.wt).map(x => x.wt));
console.log('有 wt 的 ' + withWt + ' / ' + arr.length + ' · 不同取值 ' + uniq.size + ' 个');
console.log('取值前 12 个：' + [...uniq].slice(0, 12).join(','));
/* 看看卡比兽的完整条目（前 400 字符） */
const sn = arr.find(x => x.id === 'pk-143');
console.log('\npk-143 的字段：' + Object.keys(sn).join(','));
console.log('它的 wt=' + sn.wt + ' pk=' + sn.pk);
