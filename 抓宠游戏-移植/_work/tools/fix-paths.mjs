/* 一次性工具：项目从 AI\抓宠游戏-移植\ 迁到 AI\抓宠游戏\抓宠游戏-移植\ 后，
   批量修正 tools 下所有 .mjs 里指向旧路径的绝对路径引用。 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TOOLS = path.dirname(fileURLToPath(import.meta.url));
const PAIRS = [
  ['C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植', 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植'],
  ['C:\\Users\\10709\\Desktop\\AI\\抓宠游戏-移植', 'C:\\Users\\10709\\Desktop\\AI\\抓宠游戏\\抓宠游戏-移植'],
];
let n = 0, scanned = 0;
for (const f of readdirSync(TOOLS)) {
  if (!f.endsWith('.mjs')) continue;
  scanned++;
  const p = path.join(TOOLS, f);
  let c;
  try { c = readFileSync(p, 'utf8'); } catch { continue; }
  let hit = false;
  for (const [o, nw] of PAIRS) { if (c.includes(o)) { c = c.split(o).join(nw); hit = true; } }
  if (!hit) continue;
  writeFileSync(p, c, 'utf8');
  n++;
  console.log('  修正 ' + f);
}
console.log('扫描 ' + scanned + ' 个 .mjs，修正 ' + n + ' 个');
