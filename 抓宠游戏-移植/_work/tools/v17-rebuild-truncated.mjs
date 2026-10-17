/* 精确重建 poke-kanto-johto.mjs：逐条括号配对 + JSON 校验，只保留能完整解析的条目 */
import { readFileSync, writeFileSync } from 'node:fs';
const F = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/_work/v17-data/poke-kanto-johto.mjs';
const BAK = F.replace(/\.mjs$/, '.truncated.bak');
const txt = readFileSync(BAK, 'utf8');       /* 用原始截断文件为准 */
const start = txt.indexOf('[');
const body = txt.slice(start + 1);

const good = [];
const names = [];
let i = 0, bad = [];
while (i < body.length) {
  /* 跳过分隔符 */
  while (i < body.length && !'{["'.includes(body[i])) i++;
  if (i >= body.length) break;
  if (body[i] === ']') break;
  if (body[i] !== '{') { i++; continue; }
  /* 从 { 开始做括号配对（考虑字符串与转义） */
  let depth = 0, inStr = null, esc = false, j = i;
  for (; j < body.length; j++) {
    const c = body[j];
    if (inStr) { if (esc) { esc = false; continue; } if (c === '\\') { esc = true; continue; } if (c === inStr) inStr = null; continue; }
    if (c === '"') { inStr = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) { j++; break; } }
  }
  const chunk = body.slice(i, j);
  if (depth !== 0) { bad.push({ at: i, reason: '括号未闭合（文件在此截断）' }); break; }
  try {
    const obj = JSON.parse(chunk);
    if (obj && obj.n) { good.push(chunk); names.push(obj.n); }
    else bad.push({ at: i, reason: '缺少 n 字段' });
  } catch (e) {
    bad.push({ at: i, reason: 'JSON: ' + String(e.message).slice(0, 60), name: (chunk.match(/"n"\s*:\s*"([^"]+)"/) || [])[1] });
    /* 继续往后找下一条，避免一条坏带崩全部 */
  }
  i = j;
}
console.log('完整可用条目 ' + good.length + ' 条');
console.log('第 1 条：' + names[0] + ' · 最后一条：' + names[names.length - 1]);
if (bad.length) { console.log('跳过 ' + bad.length + ' 条：'); bad.slice(0, 6).forEach(b => console.log('  ' + (b.name || '?') + ' — ' + b.reason)); }

const out = '/* 宝可梦 · 关都+城都 · 多源查证（PokeAPI + 52poke 世代招式表交叉核对）\n' +
  '   注：原文件尾部被截断，此处为逐条校验后重建，共 ' + good.length + ' 条。 */\n' +
  'export const POKE_KANTO_JOHTO = [\n' + good.join(',\n') + '\n];\n';
writeFileSync(F, out, 'utf8');
console.log('\n已写出 ' + F + '（' + (out.length / 1024).toFixed(0) + ' KB）');
