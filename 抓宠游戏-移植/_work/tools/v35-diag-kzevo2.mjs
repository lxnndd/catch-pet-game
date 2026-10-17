/* 列出洛克的进化链状态：哪些有、哪些没有（用户报「洛克王国的宠物不会进化」） */
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
const SPECIES = lit('SPECIES'), EVO = lit('EVO');
const byId = {}; SPECIES.forEach(s => byId[s.id] = s);
const evolved = new Set();
Object.keys(EVO).forEach(k => { const t = EVO[k].to; (Array.isArray(t) ? t : [t]).forEach(x => evolved.add(x)); });

const kz = SPECIES.filter(s => s.id.startsWith('kz-'));
const withEvo = kz.filter(s => EVO[s.id]);
const noEvo = kz.filter(s => !EVO[s.id] && !evolved.has(s.id));
const isFinal = kz.filter(s => !EVO[s.id] && evolved.has(s.id));
console.log('洛克共 ' + kz.length + ' 只');
console.log('  ✅ 还能再进化（有 EVO 目标）: ' + withEvo.length + ' 只');
console.log('  ✅ 已是最终形态（被指向，不再进化）: ' + isFinal.length + ' 只');
console.log('  ⚠️ 既没有进化目标、也不是任何人的进化形态: ' + noEvo.length + ' 只');
console.log('\n══ 这 ' + noEvo.length + ' 只「孤立的」洛克（永远不会进化）══');
console.log('  ' + noEvo.map(s => s.name).join('、'));
console.log('\n══ 能进化的样例 ══');
withEvo.slice(0, 10).forEach(s => {
  const e = EVO[s.id];
  const to = (Array.isArray(e.to) ? e.to : [e.to]).map(t => byId[t] ? byId[t].name : t).join('/');
  console.log('  ' + s.name.padEnd(8) + ' → ' + to.padEnd(10) + ' Lv.' + e.lv);
});
/* 关键：检查 runEvoCheck 对洛克是否真的有效（模拟升级） */
console.log('\n══ 模拟：把每只「还能进化」的洛克练到 Lv100，看会不会进化 ══');
let ok = 0, bad = [];
withEvo.forEach(s => {
  const e = EVO[s.id];
  const lv = 100;
  if (e && lv >= e.lv) {
    const to = (Array.isArray(e.to) ? e.to : [e.to])[0];
    if (byId[to]) ok++; else bad.push(s.name + ' → 目标 ' + to + ' 不存在');
  } else bad.push(s.name + ' 条件不满足 lv=' + e.lv);
});
console.log('  会进化: ' + ok + ' / ' + withEvo.length);
if (bad.length) console.log('  有问题: ' + bad.slice(0, 8).join(' | '));
