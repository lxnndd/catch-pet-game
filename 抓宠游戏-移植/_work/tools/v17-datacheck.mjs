/* v17 数据一致性检查：物种表引用的招式 id 是否都在 MOVES 里 */
import { readFileSync } from 'node:fs';
const F = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/抓宠游戏-v12-clean.html';
const src = readFileSync(F, 'utf8');
function sliceLiteral(s, i) {
  const o = s.slice(i).search(/[[{]/); const from = i + o;
  const oc = s[from], cc = oc === '[' ? ']' : '}';
  let d = 0, j = from, inStr = null, esc = false;
  for (; j < s.length; j++) {
    const c = s[j];
    if (inStr) { if (esc) { esc = false; continue; } if (c === '\\') { esc = true; continue; } if (c === inStr) inStr = null; continue; }
    if (c === '"' || c === "'") { inStr = c; continue; }
    if (c === oc) d++; else if (c === cc) { d--; if (d === 0) { j++; break; } }
  }
  return s.slice(from, j);
}
const g = (n) => { const i = src.indexOf('var ' + n + '='); return i < 0 ? null : new Function('return (' + sliceLiteral(src, i + ('var ' + n + '=').length) + ')')(); };
const SP = g('SPECIES'), MV = g('MOVES'), EV = g('EVO');
console.log('物种 ' + SP.length + ' · 招式 ' + Object.keys(MV).length + ' · 进化 ' + Object.keys(EV).length);
const POOLS = ['p0', 'p15', 'p25', 'p35', 'p45', 'p55', 'p65'];
let bad = 0; const badList = [];
SP.forEach(s => {
  POOLS.forEach(k => (s.pools[k] || []).forEach(id => { if (!MV[id]) { bad++; if (badList.length < 10) badList.push(s.name + '/' + k + '/' + String(id)); } }));
  (s.moves || []).forEach(id => { if (!MV[id]) { bad++; if (badList.length < 10) badList.push(s.name + '/moves/' + String(id)); } });
});
console.log('坏招式引用 ' + bad + ' 处' + (bad ? '：' + badList.join(' | ') : ' ✅'));
const bs = SP.find(s => s.name === '妙蛙种子');
console.log('\n妙蛙种子：');
console.log('  pools.p0 = ' + JSON.stringify(bs.pools.p0));
console.log('  p0 逐个存在性：' + bs.pools.p0.map(id => id + '=' + (!!MV[id])).join(', '));
console.log('  moves = ' + JSON.stringify(bs.moves));
console.log('  p15 = ' + JSON.stringify((bs.pools.p15 || []).map(id => id + '=' + (!!MV[id]))));
/* 招式里有没有 undefined/null 键 */
const undefKeys = Object.keys(MV).filter(k => /undefined|null/.test(k));
console.log('\nMOVES 里的可疑键：' + (undefKeys.length ? undefKeys.join(',') : '无'));
/* 找出所有 pools 里 id 为 null/undefined 的 */
let nullIds = 0;
SP.forEach(s => POOLS.forEach(k => (s.pools[k] || []).forEach(id => { if (id === null || id === undefined) nullIds++; })));
console.log('pools 里的 null/undefined id：' + nullIds + ' 个');
/* 进化表引用完整性 */
let badEvo = 0; const idset = new Set(SP.map(s => s.id));
Object.entries(EV).forEach(([from, e]) => {
  if (!idset.has(from)) badEvo++;
  const tos = Array.isArray(e.to) ? e.to : [e.to];
  tos.forEach(t => { if (!idset.has(t)) badEvo++; });
});
console.log('进化表坏引用：' + badEvo + (badEvo ? ' ❌' : ' ✅'));
