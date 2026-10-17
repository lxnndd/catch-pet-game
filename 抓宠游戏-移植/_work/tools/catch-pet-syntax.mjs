/* 语法体检：抽出 HTML 内的 <script> 内容，编译校验 + 检查 DOM id 引用是否齐全 */
import { readFileSync } from 'node:fs';

const F = process.argv[2] || 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/抓宠游戏-v12-clean.html';
const src = readFileSync(F, 'utf8');
const scripts = [...src.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
console.log('内联 script 块:', scripts.length, '| 总字符:', scripts.reduce((a, s) => a + s.length, 0));

let fail = 0;
scripts.forEach((s, i) => {
  try { new Function(s); console.log('  script#' + i + ' 语法 OK (' + s.length + ' 字符)'); }
  catch (e) { fail++; console.log('  ❌ script#' + i + ' 语法错误: ' + e.message); }
});

const js = scripts.join('\n');
/* 1) 未定义的函数调用静态排查（收集声明 vs 调用） */
const declared = new Set([...js.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/g)].map(m => m[1]));
const varFn = new Set([...js.matchAll(/var\s+([A-Za-z_$][\w$]*)\s*=\s*function/g)].map(m => m[1]));
declared.forEach(d => varFn.add(d));
const called = new Set([...js.matchAll(/(?:^|[^.\w$])([a-z_$][\w$]*)\s*\(/g)].map(m => m[1]));
const builtins = new Set(['if','for','while','switch','catch','return','typeof','function','new','do','else','try',
  'setTimeout','setInterval','clearTimeout','clearInterval','parseInt','parseFloat','isNaN','String','Number','Boolean',
  'Array','Object','Math','JSON','Date','RegExp','Error','localStorage','document','window','console','requestAnimationFrame',
  'AudioContext','fetch','alert','confirm','prompt','encodeURIComponent','decodeURIComponent','Function','Promise']);
const undef = [...called].filter(n => !declared.has(n) && !builtins.has(n));
console.log('可疑的未声明函数调用:', undef.length ? undef.join(', ') : '无');

/* 2) $("id") 引用是否都在 HTML 里存在 */
const htmlIds = new Set([...src.matchAll(/id="([\w-]+)"/g)].map(m => m[1]));
const used = [...js.matchAll(/\$\("([\w-]+)"\)/g)].map(m => m[1]);
const missing = [...new Set(used)].filter(id => !htmlIds.has(id));
console.log('JS 引用但 HTML 中不存在的 id:', missing.length ? missing.join(', ') : '无');

/* 3) data-close 目标是否存在 */
const closes = [...src.matchAll(/data-close="([\w-]+)"/g)].map(m => m[1]);
const badClose = closes.filter(id => !htmlIds.has(id));
console.log('data-close 无效目标:', badClose.length ? badClose.join(', ') : '无');

/* 4) 关键表规模 */
const count = (re) => (js.match(re) || []).length;
console.log('SPECIES 条目:', count(/\{id:"[a-z0-9]+",\s*name:/g), '| TRAINERS:', count(/\{id:"t\d+", name:/g), '| MOVES:', count(/^\s{2}[a-z0-9_]+:\s*\{name:/gm));
process.exit(fail ? 1 : 0);
