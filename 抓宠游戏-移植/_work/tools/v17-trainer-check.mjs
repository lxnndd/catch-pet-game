/* v17 检查并修复训练师队伍里的坏引用（原来引用帕鲁，现已移除） */
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
const F = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/抓宠游戏-v12-clean.html';
const src = readFileSync(F, 'utf8');
function sliceLiteral(startIdx) {
  const open = src.slice(startIdx).search(/[[{]/); const from = startIdx + open;
  const openCh = src[from], closeCh = openCh === '[' ? ']' : '}';
  let depth = 0, i = from, inStr = null, esc = false;
  for (; i < src.length; i++) { const c = src[i];
    if (inStr) { if (esc) { esc = false; continue; } if (c === '\\') { esc = true; continue; } if (c === inStr) inStr = null; continue; }
    if (c === '"' || c === "'") { inStr = c; continue; }
    if (c === openCh) depth++; else if (c === closeCh) { depth--; if (depth === 0) { i++; break; } } }
  return src.slice(from, i);
}
const grab = (n) => { const i = src.indexOf('var ' + n + '='); return i < 0 ? null : new Function('return (' + sliceLiteral(i + ('var ' + n + '=').length) + ')')(); };
const SPECIES = grab('SPECIES'), TRAINERS = grab('TRAINERS');
const byId = {}; SPECIES.forEach(s => byId[s.id] = s);
console.log('训练师 ' + TRAINERS.length + ' 位：');
let broken = 0;
TRAINERS.forEach(t => {
  const bad = (t.team || []).filter(id => !byId[id]);
  if (bad.length) { broken += bad.length; console.log('  ⚠️ ' + (t.name || t.id) + ' 有 ' + bad.length + ' 个坏引用：' + bad.join('、')); }
  else console.log('  ✅ ' + (t.name || t.id) + '（' + (t.team || []).length + ' 只）' + (t.team || []).map(id => byId[id] ? byId[id].name : id).join('/'));
});
console.log('\n坏引用共 ' + broken + ' 个');
