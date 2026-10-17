/* v26 核对：名字→编号表 与 物种 id 编号 的吻合率 */
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
const noMap = JSON.parse(readFileSync(ROOT + '/_work/v17-data/roco-name-no.json', 'utf8'));
const numOf = v => Number(String(v).replace(/^kz-0*/, ''));
let same = 0; const diff = [], noEntry = [];
for (const s of kz) {
  const m = noMap[s.name];
  if (m == null) { noEntry.push(s.name + '(' + s.id + ')'); continue; }
  if (Number(m) === numOf(s.id)) same++; else diff.push(s.name + ': 表=' + m + ' id编号=' + numOf(s.id));
}
console.log('id 编号 与 名字表 一致 ' + same + ' / ' + kz.length + ' · 不一致 ' + diff.length + ' · 表中无此名 ' + noEntry.length);
if (diff.length) { console.log('\n不一致（说明 id 编号与表值不符）：'); for (const d of diff.slice(0, 30)) console.log('  ' + d); }
if (noEntry.length) console.log('\n表中无名字（前 20）：' + noEntry.slice(0, 20).join('、'));
/* 表里是否存在「一对多」或「多对一」（错位的典型症状） */
const rev = new Map();
for (const [n, v] of Object.entries(noMap)) { if (!rev.has(v)) rev.set(v, []); rev.get(v).push(n); }
const dupNo = [...rev.entries()].filter(([, ns]) => ns.length > 1);
console.log('\n表中一个编号对应多个名字的情况：' + dupNo.length + ' 例');
for (const [v, ns] of dupNo.slice(0, 12)) console.log('  #' + v + ' → ' + ns.join(' / '));
const used = new Set(kz.map(s => noMap[s.name]).filter(v => v != null));
console.log('\n表大小 ' + Object.keys(noMap).length + ' · 被游戏用到 ' + used.size + ' 个编号，区间 ' + Math.min(...used) + '~' + Math.max(...used));
/* 有没有与宝可梦同名冲突导致 id 编号含义错乱 */
const pkNames = new Set(SP.filter(s => !s.kz).map(s => s.name));
const clash = kz.filter(s => pkNames.has(s.name)).map(s => s.name);
console.log('与宝可梦同名（两个世界都有）：' + (clash.length ? clash.join('、') : '无'));
