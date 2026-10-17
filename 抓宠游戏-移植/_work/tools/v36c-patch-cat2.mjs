/* v36c：用 PokéAPI 的 damage_class 覆盖招式分类（修正属性兜底的误判，如火焰牙应为物理）
   优先级：PokéAPI damage_class > 属性兜底（v36b 已补） > 保持原值
   用法：node v36c-patch-cat2.mjs --apply */
import { readFileSync, writeFileSync, copyFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = ROOT + '/抓宠游戏-v12-clean.html';
const BAK = ROOT + '/抓宠游戏-v12-clean.bak-v36c.html';
const CACHE = ROOT + '/_work/sources/宝可梦/poke-cache-kj/json';
const apply = process.argv.includes('--apply');
const CN = { physical: '物理', special: '特殊', status: '变化' };

/* PokéAPI 英文名 → damage_class */
const dcByEn = {};
for (const f of readdirSync(CACHE)) {
  if (!f.startsWith('move-') || !f.endsWith('.json')) continue;
  try {
    const j = JSON.parse(readFileSync(path.join(CACHE, f), 'utf8'));
    if (j && j.name && j.damage_class && j.damage_class.name) dcByEn[j.name] = j.damage_class.name;
  } catch (e) { }
}
const MAP = JSON.parse(readFileSync(ROOT + '/_work/out/pokeapi-move-map.json', 'utf8'));
const dcByGameId = {};
Object.keys(MAP).forEach(en => { if (dcByEn[en]) dcByGameId[MAP[en].id] = CN[dcByEn[en]]; });
console.log('PokéAPI damage_class: ' + Object.keys(dcByEn).length + ' 条 → 映射到游戏招 ' + Object.keys(dcByGameId).length + ' 个');

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

let fixed = 0;
const samples = [];
Object.keys(MOVES).forEach(id => {
  const mv = MOVES[id];
  const want = dcByGameId[id];
  if (!want || mv.cat === want) return;
  if (samples.length < 10) samples.push(mv.name + '：' + (mv.cat || '(空)') + ' → ' + want);
  mv.cat = want; fixed++;
});
console.log('\n按 PokéAPI 修正分类: ' + fixed + ' 招');
samples.forEach(x => console.log('  ✅ ' + x));
const dist = {};
Object.keys(MOVES).forEach(id => { const c = MOVES[id].cat || '(空)'; dist[c] = (dist[c] || 0) + 1; });
console.log('\n最终分类分布: ' + Object.keys(dist).map(k => k + ' ' + dist[k]).join(' · '));
/* 抽查几个经典招 */
['火焰牙', '闪焰冲锋', '喷射火焰', '龙爪', '空气之刃', '空气斩', '咬碎', '暗影爪'].forEach(nm => {
  const id = Object.keys(MOVES).find(k => MOVES[k].name === nm);
  if (id) console.log('  ' + nm.padEnd(8) + ' → ' + MOVES[id].cat + '（' + MOVES[id].type + ' 威力' + MOVES[id].power + '）');
});
if (!apply) { console.log('\n（未加 --apply，仅预演）'); process.exit(0); }
work = work.slice(0, from) + JSON.stringify(MOVES) + work.slice(j);
if (!existsSync(BAK)) { copyFileSync(FILE, BAK); console.log('已备份 → ' + BAK); }
writeFileSync(FILE, eol === '\r\n' ? work.split('\n').join('\r\n') : work, 'utf8');
console.log('已写入 ' + FILE);
