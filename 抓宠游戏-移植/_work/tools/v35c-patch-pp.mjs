/* v35c：①统一 3 处译名（对齐 52poke 第九世代） ②用 PokéAPI 缓存恢复宝可梦招式的真实 PP
   背景：v20 曾把 1093 招 PP 全改成 10；现在有 PokéAPI 缓存（含真实 pp），恢复宝可梦招式
   用法：node v35c-patch-pp.mjs --apply */
import { readFileSync, writeFileSync, copyFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = ROOT + '/抓宠游戏-v12-clean.html';
const BAK = ROOT + '/抓宠游戏-v12-clean.bak-v35c.html';
const CACHE = ROOT + '/_work/sources/宝可梦/poke-cache-kj/json';
const apply = process.argv.includes('--apply');

/* 1. 从缓存收集 英文名 → pp */
const ppByEn = {};
for (const f of readdirSync(CACHE)) {
  if (!f.startsWith('move-') || !f.endsWith('.json')) continue;
  try {
    const j = JSON.parse(readFileSync(path.join(CACHE, f), 'utf8'));
    if (j && j.name && typeof j.pp === 'number' && j.pp > 0) ppByEn[j.name] = j.pp;
  } catch (e) { }
}
const MAP = JSON.parse(readFileSync(ROOT + '/_work/out/pokeapi-move-map.json', 'utf8'));
const ppByGameId = {};
Object.keys(MAP).forEach(en => { if (ppByEn[en]) ppByGameId[MAP[en].id] = ppByEn[en]; });
console.log('PokéAPI 招式缓存 pp: ' + Object.keys(ppByEn).length + ' 条');
console.log('映射到游戏招 id: ' + Object.keys(ppByGameId).length + ' 条');

/* 2. 译名统一（对齐 52poke 第九世代） */
const RENAME = { '空气斩': '空气之刃', '鬼面': '可怕面孔', '炼狱': '烈火深渊' };

let src = readFileSync(FILE, 'utf8');
const eol = src.includes('\r\n') ? '\r\n' : '\n';
let work = src.split('\r\n').join('\n');
const key = 'var MOVES=';
const at = work.indexOf(key);
const head = at + key.length;
const from = head + work.slice(head).search(/[[{]/);
let d = 0, j = from, q = null, esc = false;
for (; j < work.length; j++) {
  const c = work[j];
  if (q) { if (esc) { esc = false; continue; } if (c === '\\') { esc = true; continue; } if (c === q) q = null; continue; }
  if (c === '"') { q = c; continue; }
  if (c === '{') d++; else if (c === '}') { d--; if (d === 0) { j++; break; } }
}
const MOVES = new Function('return (' + work.slice(from, j) + ')')();

let ppChanged = 0, ren = 0;
const ppPreview = [];
Object.keys(MOVES).forEach(id => {
  const mv = MOVES[id];
  if (RENAME[mv.name]) { mv.name = RENAME[mv.name]; ren++; }
  const real = ppByGameId[id];
  if (real && mv.pp !== real) {
    if (ppPreview.length < 8) ppPreview.push(mv.name + '  PP' + mv.pp + ' → ' + real);
    mv.pp = real; ppChanged++;
  }
});
console.log('\n译名统一: ' + ren + ' 处');
console.log('PP 恢复真实的招式: ' + ppChanged + ' 个');
console.log('PP 变化预览:');
ppPreview.forEach(x => console.log('  ' + x));
const dist = {};
Object.keys(MOVES).forEach(id => { const v = MOVES[id].pp; dist[v] = (dist[v] || 0) + 1; });
console.log('\n新的 PP 分布: ' + Object.keys(dist).sort((a, b) => a - b).map(k => 'PP' + k + '×' + dist[k]).join('  '));
if (!apply) { console.log('\n（未加 --apply，仅预演）'); process.exit(0); }
work = work.slice(0, from) + JSON.stringify(MOVES) + work.slice(j);
if (!existsSync(BAK)) { copyFileSync(FILE, BAK); console.log('已备份 → ' + BAK); }
writeFileSync(FILE, eol === '\r\n' ? work.split('\n').join('\r\n') : work, 'utf8');
console.log('已写入 ' + FILE);
