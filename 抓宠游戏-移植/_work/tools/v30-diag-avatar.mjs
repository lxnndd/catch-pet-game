/* 诊断：哪些宠会显示成问号 ❔
   两条路径：①AVATARS 集合里没有该 id ②avatars/<id>.webp 文件不存在（404 → onerror 回退） */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
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
const lit = n => { const i = declAt(n); if (i < 0) throw new Error('找不到 var ' + n); return new Function('return (' + sliceLiteral(src, i) + ')')(); };
const SPECIES = lit('SPECIES');
const AVATARS = lit('AVATARS');
const specIds = SPECIES.map(s => s.id);
const avKeys = Object.keys(AVATARS);
console.log('SPECIES 只数: ' + specIds.length);
console.log('AVATARS 条目: ' + avKeys.length);
/* ① AVATARS 集合缺失 */
const noAvatarEntry = SPECIES.filter(s => !AVATARS[s.id]);
console.log('\n== ① AVATARS 里查不到的宠: ' + noAvatarEntry.length + ' 只 ==');
noAvatarEntry.slice(0, 25).forEach(s => console.log('   ' + s.id + ' ' + s.name));
if (noAvatarEntry.length > 25) console.log('   …其余 ' + (noAvatarEntry.length - 25) + ' 只');
/* ② 文件缺失 */
const dir = ROOT + '/app/site/avatars';
const files = new Set(existsSync(dir) ? readdirSync(dir) : []);
console.log('\navatars 目录文件数: ' + files.size);
const noFile = specIds.filter(id => !files.has(id + '.webp'));
console.log('== ② avatars/<id>.webp 缺失的宠: ' + noFile.length + ' 只 ==');
noFile.slice(0, 25).forEach(id => { const s = SPECIES.find(x => x.id === id); console.log('   ' + id + ' ' + (s ? s.name : '?')); });
if (noFile.length > 25) console.log('   …其余 ' + (noFile.length - 25) + ' 只');
/* ③ 无用文件（有图但物种表里没有） */
const orphan = [...files].filter(f => { const id = f.replace(/\.webp$/, ''); return !AVATARS[id]; });
console.log('\n== ③ 有图但不在 AVATARS 里的文件: ' + orphan.length + ' 个（正常，历史残留） ==');
/* 结论 */
const totalBad = new Set([...noAvatarEntry.map(s => s.id), ...noFile]).size;
console.log('\n会显示成问号的宠合计: ' + totalBad + ' / ' + specIds.length + (totalBad === 0 ? '   ✅ 全部有图' : '   ❌ 需要补图'));
