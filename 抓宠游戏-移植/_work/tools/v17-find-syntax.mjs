/* 定位 poke-kanto-johto.mjs 的语法错误位置（二分法） */
import { readFileSync } from 'node:fs';
const F = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/_work/v17-data/poke-kanto-johto.mjs';
const txt = readFileSync(F, 'utf8');
console.log('文件 ' + (txt.length / 1024).toFixed(0) + ' KB · ' + txt.split('\n').length + ' 行');
/* 找出导出数组的范围 */
const start = txt.indexOf('[');
const end = txt.lastIndexOf(']');
console.log('数组范围 ' + start + ' … ' + end);
const body = txt.slice(start, end + 1);
/* 按顶层对象（{...}）切分，逐条 parse，定位坏条目 */
const items = [];
let depth = 0, cur = '', inStr = null, esc = false, line = 1, itemStartLine = 1;
for (let i = 0; i < body.length; i++) {
  const c = body[i];
  if (c === '\n') line++;
  if (inStr) { cur += c; if (esc) { esc = false; continue; } if (c === '\\') { esc = true; continue; } if (c === inStr) inStr = null; continue; }
  if (c === '"' || c === "'") { inStr = c; cur += c; continue; }
  if (c === '{') { if (depth === 0) itemStartLine = line; depth++; cur += c; continue; }
  if (c === '}') { depth--; cur += c; if (depth === 0) { items.push({ src: cur, line: itemStartLine }); cur = ''; } continue; }
  if (depth > 0) cur += c;
}
console.log('顶层对象 ' + items.length + ' 个');
let bad = 0;
for (const it of items) {
  if (/^\s*$/.test(it.src)) continue;
  /* 用 new Function 校验语法（不执行） */
  try {
    new Function('return (' + it.src + ')');
  } catch (e) {
    bad++;
    if (bad <= 5) {
      console.log('\n❌ 第 ' + it.line + ' 行附近的条目语法错误：' + String(e.message).slice(0, 90));
      console.log('   片段：' + it.src.slice(0, 220).replace(/\s+/g, ' '));
      const lines = txt.split('\n');
      for (let k = Math.max(0, it.line - 2); k < Math.min(lines.length, it.line + 3); k++) console.log('   ' + (k + 1) + '| ' + lines[k].slice(0, 200));
    }
  }
}
console.log('\n坏条目 ' + bad + ' / ' + items.length);
