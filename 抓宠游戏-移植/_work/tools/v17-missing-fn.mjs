/* v17 缺失函数扫描：把 script 里「被调用但没定义」的函数名全找出来 */
import { readFileSync } from 'node:fs';
const F = process.argv[2] || 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/抓宠游戏-v12-clean.html';
const src = readFileSync(F, 'utf8');
const js = src.slice(src.indexOf('<script>') + 8, src.lastIndexOf('</script>'));

/* 已定义的函数名 */
const defined = new Set();
for (const m of js.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/g)) defined.add(m[1]);
/* var 形式的函数表达式 */
for (const m of js.matchAll(/var\s+([A-Za-z_$][\w$]*)\s*=\s*function/g)) defined.add(m[1]);
/* 被调用的名字（排除方法调用 .xxx( ） */
const called = new Map();
for (const m of js.matchAll(/(^|[^.\w$])([A-Za-z_$][\w$]*)\s*\(/g)) {
  const name = m[2];
  called.set(name, (called.get(name) || 0) + 1);
}
const BUILTIN = new Set(['if', 'for', 'while', 'switch', 'catch', 'return', 'function', 'typeof', 'new', 'do', 'else', 'try',
  'String', 'Number', 'Boolean', 'Array', 'Object', 'Math', 'JSON', 'Date', 'RegExp', 'Error', 'Promise', 'Set', 'Map',
  'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'alert', 'confirm', 'prompt', 'setTimeout', 'setInterval', 'clearTimeout',
  'clearInterval', 'requestAnimationFrame', 'fetch', 'Image', 'Audio', 'localStorage', 'console', 'encodeURIComponent',
  'decodeURIComponent', 'btoa', 'atob', 'Function', 'Symbol', 'WeakMap', 'BigInt', 'queueMicrotask']);
/* 也把同名 var 当已声明 */
for (const m of js.matchAll(/var\s+([A-Za-z_$][\w$]*)\s*=/g)) defined.add(m[1]);
const missing = [];
for (const [name, cnt] of called) {
  if (defined.has(name) || BUILTIN.has(name)) continue;
  /* 属性名/对象字面量键的误报过滤：看看它前面是不是 key: */
  const re = new RegExp('[:{,]\\s*' + name + '\\s*\\(', 'g');
  if (re.test(js)) continue;
  missing.push([name, cnt]);
}
missing.sort((a, b) => b[1] - a[1]);
console.log('已定义函数 ' + defined.size + ' 个 · 被调用名字 ' + called.size + ' 个');
console.log('\n可能缺失的函数（按调用次数）：');
missing.forEach(([n, c]) => console.log('  ' + n.padEnd(24) + c + ' 次'));
if (!missing.length) console.log('  ✅ 没有缺失');
