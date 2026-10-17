/* v26 检查洛克物种 id 编号 与 kzNo 是否一致（判断以哪个为权威） */
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
const SP = new Function('return (' + sliceLiteral(src, src.indexOf('var SPECIES=') + 'var SPECIES='.length) + ')')();
const kz = SP.filter(s => s.kz);
const numOf = v => Number(String(v == null ? '' : v).replace(/^[a-z]+-?0*/, ''));
let same = 0, diff = [], nokz = 0;
for (const s of kz) {
  if (s.kzNo == null) { nokz++; continue; }
  const a = numOf(s.id), b = Number(s.kzNo);
  if (a === b) same++; else diff.push(s.id + ' / kzNo=' + s.kzNo + ' / ' + s.name);
}
console.log('洛克 ' + kz.length + ' 只：id编号===kzNo ' + same + ' · 不一致 ' + diff.length + ' · 无 kzNo ' + nokz);
console.log('\n前 12 只样本（id | kzNo | name | power）:');
for (const s of kz.slice(0, 12)) console.log('  ' + s.id + ' | ' + s.kzNo + ' | ' + s.name + ' | ' + s.power);
if (diff.length) { console.log('\n不一致清单（前 30）:'); for (const d of diff.slice(0, 30)) console.log('  ' + d); }
/* 反向：编号表 roco-name-no.json 与物种的差异 */
const noMap = JSON.parse(readFileSync(ROOT + '/_work/v17-data/roco-name-no.json', 'utf8'));
let mapSame = 0, mapDiff = [];
for (const s of kz) {
  const m = noMap[s.name];
  if (m == null) continue;
  if (Number(m) === Number(s.kzNo)) mapSame++; else mapDiff.push(s.name + ': 表=' + m + ' kzNo=' + s.kzNo);
}
console.log('\n名字→编号表 roco-name-no.json 与 kzNo 对比：一致 ' + mapSame + ' · 不一致 ' + mapDiff.length);
for (const d of mapDiff.slice(0, 25)) console.log('  ✗ ' + d);
