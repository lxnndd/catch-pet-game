/* Step 1：用 PokéAPI 招式缓存 + 游戏招表，建立「英文招式名 → 游戏招式 id」映射
   用途：接下来要按第九世代（朱/紫）重抓升级表，必须能把 pokeapi 的 move.name 换成游戏里的招式 */
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CACHE = ROOT + '/_work/sources/宝可梦/poke-cache-kj/json';
const OUT = ROOT + '/_work/out/pokeapi-move-map.json';

/* 游戏招表：id → 中文名 */
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
const MOVES = new Function('return (' + sliceLiteral(src, declAt('MOVES')) + ')')();
const zh2id = {};
Object.keys(MOVES).forEach(k => { zh2id[MOVES[k].name] = k; });

if (!existsSync(CACHE)) { console.log('!! 找不到 PokéAPI 招式缓存目录: ' + CACHE); process.exit(1); }
const files = readdirSync(CACHE).filter(f => f.startsWith('move-') && f.endsWith('.json'));
console.log('PokéAPI 招式缓存: ' + files.length + ' 个文件');
console.log('游戏招表: ' + Object.keys(MOVES).length + ' 招\n');

const map = {};       /* en → {id, zh} */
const unmapped = [];  /* 有中文名但对不上游戏招表 */
const noZh = [];
let scanned = 0;
for (const f of files) {
  let j;
  try { j = JSON.parse(readFileSync(path.join(CACHE, f), 'utf8')); } catch { continue; }
  if (!j || !j.name) continue;
  scanned++;
  const zh = (j.names || []).filter(n => n.language && n.language.name === 'zh-hans').map(n => n.name)[0]
    || (j.names || []).filter(n => n.language && n.language.name === 'zh-hant').map(n => n.name)[0];
  if (!zh) { noZh.push(j.name); continue; }
  const id = zh2id[zh];
  if (id) map[j.name] = { id: id, zh: zh };
  else unmapped.push(j.name + ' (' + zh + ')');
}
console.log('扫描招式: ' + scanned);
console.log('✅ 映射成功: ' + Object.keys(map).length);
console.log('⚠ 有中文名但游戏招表里没有: ' + unmapped.length);
console.log('⚠ 连中文名都没有: ' + noZh.length);
console.log('\n对不上的样例（前 15 个）:');
unmapped.slice(0, 15).forEach(x => console.log('   ' + x));
console.log('\n映射样例:');
['tackle', 'ember', 'flamethrower', 'dragon-claw', 'heat-wave', 'scratch', 'smokescreen'].forEach(k => {
  console.log('   ' + k.padEnd(16) + ' → ' + (map[k] ? map[k].id + ' ' + map[k].zh : '（未映射）'));
});
writeFileSync(OUT, JSON.stringify(map), 'utf8');
console.log('\n已写出 → ' + OUT + '（' + Object.keys(map).length + ' 条）');
