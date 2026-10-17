/* 查 MOVES 里 pp 缺失/异常的招式 */
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
const i = src.indexOf('var MOVES=');
const MOVES = new Function('return (' + sliceLiteral(src, i + 'var MOVES='.length) + ')')();
const keys = Object.keys(MOVES);
console.log('招式总数: ' + keys.length);
const miss = [], bad = [], fields = {};
keys.forEach(k => {
  const m = MOVES[k];
  Object.keys(m).forEach(f => fields[f] = (fields[f] || 0) + 1);
  if (m.pp === undefined || m.pp === null) miss.push(k + ' ' + m.name);
  else if (!(typeof m.pp === 'number' && m.pp > 0)) bad.push(k + ' ' + m.name + ' pp=' + JSON.stringify(m.pp));
});
console.log('字段覆盖: ' + Object.keys(fields).sort((a, b) => fields[b] - fields[a]).map(f => f + ':' + fields[f]).join(' '));
console.log('\npp 缺失: ' + miss.length + ' 个');
if (miss.length) console.log('  ' + miss.slice(0, 30).join(' / ') + (miss.length > 30 ? ' …' : ''));
console.log('\npp <=0 或非法: ' + bad.length + ' 个');
if (bad.length) console.log('  ' + bad.slice(0, 30).join(' / '));
/* pp 值分布 */
const d = {}; keys.forEach(k => { const v = MOVES[k].pp; d[v === undefined ? 'undefined' : v] = (d[v === undefined ? 'undefined' : v] || 0) + 1; });
console.log('\npp 值分布: ' + Object.keys(d).sort().map(k => k + '×' + d[k]).join(' '));
