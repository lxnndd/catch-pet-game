/* 重复函数定义体检：同一函数名出现多次时，后面的定义会覆盖前面的（JS function 提升规则） */
import { readFileSync } from 'node:fs';

const F = process.argv[2] || 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/抓宠游戏-v12-clean.html';
const s = readFileSync(F, 'utf8');
const a = s.indexOf('<script>'), b = s.lastIndexOf('</script>');
const js = s.slice(a, b);
const offset = s.slice(0, a).split('\n').length - 1;

const defs = new Map();
for (const m of js.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/g)) {
  const line = offset + js.slice(0, m.index).split('\n').length;
  if (!defs.has(m[1])) defs.set(m[1], []);
  defs.get(m[1]).push(line);
}
const dups = [...defs.entries()].filter(([, v]) => v.length > 1);
if (!dups.length) console.log('✅ 没有重复的函数定义');
else {
  console.log('⚠ 重复定义的函数（行号从左到右，最后一个生效）:');
  dups.sort((x, y) => x[1][0] - y[1][0]).forEach(([name, lines]) => console.log('  ' + name + ' → 行 ' + lines.join(', ')));
}
/* 顺带看看 var 重复声明（同名变量重复 var 也可能覆盖） */
const varDefs = new Map();
for (const m of js.matchAll(/^var\s+([A-Za-z_$][\w$]*)\s*=/gm)) {
  const line = offset + js.slice(0, m.index).split('\n').length;
  if (!varDefs.has(m[1])) varDefs.set(m[1], []);
  varDefs.get(m[1]).push(line);
}
const vd = [...varDefs.entries()].filter(([, v]) => v.length > 1);
console.log(vd.length ? '⚠ 重复 var 声明: ' + vd.map(([n, l]) => n + '(' + l.join(',') + ')').join(' | ') : '✅ 无重复 var 声明');
