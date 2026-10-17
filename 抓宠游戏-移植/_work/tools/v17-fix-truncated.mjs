/* 修复被截断的 poke-kanto-johto.mjs：丢弃最后一个不完整条目，正确闭合数组 */
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
const F = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/_work/v17-data/poke-kanto-johto.mjs';
const txt = readFileSync(F, 'utf8');
copyFileSync(F, F.replace(/\.mjs$/, '.truncated.bak'));

const start = txt.indexOf('[');
const body = txt.slice(start);
/* 扫顶层对象，记录每个完整对象的结束位置 */
let depth = 0, inStr = null, esc = false, lastEnd = -1, items = 0, curStart = -1;
for (let i = 0; i < body.length; i++) {
  const c = body[i];
  if (inStr) { if (esc) { esc = false; continue; } if (c === '\\') { esc = true; continue; } if (c === inStr) inStr = null; continue; }
  if (c === '"' || c === "'") { inStr = c; continue; }
  if (c === '{') { if (depth === 0) curStart = i; depth++; continue; }
  if (c === '}') { depth--; if (depth === 0) { items++; lastEnd = i; } continue; }
}
console.log('完整顶层对象 ' + items + ' 个，最后一个结束于偏移 ' + lastEnd);
const tail = body.slice(Math.max(0, lastEnd - 60), lastEnd + 40).replace(/\s+/g, ' ');
console.log('最后一条结尾：…' + tail);
/* 找出最后一条的名字，确认谁被丢了 */
const lastObj = body.slice(body.lastIndexOf('{', lastEnd - 1), lastEnd + 1);
const nm = (lastObj.match(/"n"\s*:\s*"([^"]+)"/) || [])[1];
const dropped = body.slice(lastEnd + 1).replace(/\s+/g, ' ').slice(0, 120);
console.log('最后一条完整的是：' + nm);
console.log('被丢弃的残片：' + dropped);

const fixed = body.slice(0, lastEnd + 1) + '\n];\n';
writeFileSync(F, fixed, 'utf8');
console.log('\n已修复：' + F + '（' + (fixed.length / 1024).toFixed(0) + ' KB）');
