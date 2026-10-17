/* v28 细查：进化方式(how)分布 + 进化等级>75 的到底是哪些 */
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
const SPECIES = lit('SPECIES'), EVO = lit('EVO');
const byId = {}; SPECIES.forEach(s => byId[s.id] = s);
const evolvedIds = new Set();
for (const k of Object.keys(EVO)) { const t = EVO[k].to; (Array.isArray(t) ? t : [t]).forEach(x => evolvedIds.add(x)); }
/* how 分布 */
const hows = {};
let noLv = [];
for (const k of Object.keys(EVO)) {
  const e = EVO[k];
  const h = e.how || e.evoType || '?';
  hows[h] = (hows[h] || 0) + 1;
  if (!(typeof e.lv === 'number' && e.lv > 0)) {
    const to = Array.isArray(e.to) ? e.to[0] : e.to;
    noLv.push({ from: byId[k]?.name || k, to: byId[to]?.name || to, how: h, lv: e.lv, item: e.item });
  }
}
console.log('== EVO 条目进化方式分布 ==');
Object.keys(hows).sort((a, b) => hows[b] - hows[a]).forEach(h => console.log('  ' + h.padEnd(10) + hows[h]));
console.log('\n== 没有有效等级(lv 非正数/缺失)的进化条目 ' + noLv.length + ' 条 ==');
noLv.slice(0, 30).forEach(o => console.log('  ' + o.from + ' → ' + o.to + '  how=' + o.how + ' lv=' + o.lv + (o.item ? ' item=' + o.item : '')));
if (noLv.length > 30) console.log('  … 其余 ' + (noLv.length - 30) + ' 条');
/* lv > 75 */
const over = [];
for (const k of Object.keys(EVO)) {
  const e = EVO[k];
  if (typeof e.lv === 'number' && e.lv > 75) {
    const to = Array.isArray(e.to) ? e.to[0] : e.to;
    over.push(byId[k]?.name + ' → ' + (byId[to]?.name || to) + ' (Lv' + e.lv + ')');
  }
}
console.log('\n== 进化等级 > 75 的条目（现有地区最高 75，练不到）: ' + over.length + ' 条 ==');
over.forEach(o => console.log('  ' + o));
/* runEvoCheck 实际怎么判 */
const m = src.match(/function runEvoCheck[\s\S]{0,700}?\n\}/);
console.log('\n== 游戏内 runEvoCheck 实现 ==\n' + (m ? m[0].split('\n').slice(0, 26).join('\n') : '未找到'));
