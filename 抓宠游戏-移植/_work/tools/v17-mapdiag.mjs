/* v17 地图问题调查：矿洞是否封闭、医院十字、雪原与矿洞是否重叠、地图尺寸 */
import { readFileSync } from 'node:fs';
const F = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/抓宠游戏-v12-clean.html';
const src = readFileSync(F, 'utf8');
function sliceLiteral(s, i) {
  const o = s.slice(i).search(/[[{]/); const from = i + o;
  const oc = s[from], cc = oc === '[' ? ']' : '}';
  let d = 0, j = from, inStr = null, esc = false;
  for (; j < s.length; j++) { const c = s[j];
    if (inStr) { if (esc) { esc = false; continue; } if (c === '\\') { esc = true; continue; } if (c === inStr) inStr = null; continue; }
    if (c === '"' || c === "'") { inStr = c; continue; }
    if (c === oc) d++; else if (c === cc) { d--; if (d === 0) { j++; break; } }
  }
  return s.slice(from, j);
}
const g = (n) => { const i = src.indexOf('var ' + n + '='); return i < 0 ? null : new Function('return (' + sliceLiteral(src, i + ('var ' + n + '=').length) + ')')(); };
const MW = 72, MH = 52, T = { PATH: 0, GRASS: 1, TALL: 2, TREE: 3, WATER: 4, HOSP: 5, LAVA: 6, ROCK: 7, DEEP: 8, FLOWER: 9 };
const HOSP = { x: 36, y: 26 }, SPAWN = { x: 36, y: 28 };

console.log('═══ 一、genMap 全文（地形生成）═══');
const i = src.indexOf('function genMap');
const seg = src.slice(i, src.indexOf('function tileAt'));
seg.split('\n').forEach(l => { const t = l.trim(); if (t) console.log('  ' + t); });
console.log('\n  genMap 代码长度 ' + seg.length + ' 字符 / ' + seg.split('\n').length + ' 行');

console.log('\n═══ 二、regionAt 判定顺序（注意先后覆盖）═══');
const j = src.indexOf('function regionAt');
console.log(src.slice(j, j + 900).split('\n').map(l => '  ' + l.trim()).filter(l => l.length > 2).join('\n'));
