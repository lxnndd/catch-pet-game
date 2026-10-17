/* v37：洛克招式的分类用「洛克自己的 cat 字段」
   优先级：PokéAPI damage_class（宝可梦招权威） > 洛克 roco.mjs 的 cat（洛克招权威） > 保持
   背景：v36b 是按属性兜底判的，把洛克招式一起判错了（藤之鞭/飞叶刀应为物理、清醒应为变化）
   用法：node v37-patch-kzcat.mjs --apply */
import { readFileSync, writeFileSync, copyFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = ROOT + '/抓宠游戏-v12-clean.html';
const BAK = ROOT + '/抓宠游戏-v12-clean.bak-v37.html';
const CACHE = ROOT + '/_work/sources/宝可梦/poke-cache-kj/json';
const apply = process.argv.includes('--apply');
const CN = { physical: '物理', special: '特殊', status: '变化' };

/* ① PokéAPI 权威分类 */
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

/* ② 洛克自己的分类（按招式中文名） */
const mod = await import('file:///' + (ROOT + '/_work/v17-data/roco.mjs').replace(/\\/g, '/').replace(/^\/+/, ''));
const kzCat = {};
mod.ROCO.forEach(o => Object.keys(o.pools || {}).forEach(pk => (o.pools[pk] || []).forEach(mv => {
  if (mv.m && mv.cat && !(mv.m in kzCat)) kzCat[mv.m] = mv.cat;
})));
console.log('PokéAPI 权威分类: ' + Object.keys(dcByGameId).length + ' 个游戏招');
console.log('洛克自己的分类: ' + Object.keys(kzCat).length + ' 个招式名');

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

let byPoke = 0, byKz = 0, kzFixed = 0;
const samples = [];
Object.keys(MOVES).forEach(id => {
  const mv = MOVES[id];
  const poke = dcByGameId[id];
  const want = poke || kzCat[mv.name];
  if (!want || mv.cat === want) return;
  if (samples.length < 12) samples.push(mv.name + '：' + (mv.cat || '(空)') + ' → ' + want + (poke ? '（宝可梦权威）' : '（洛克）'));
  if (poke) byPoke++; else { byKz++; if (mv.name in kzCat) kzFixed++; }
  mv.cat = want;
});
console.log('\n修正: 宝可梦权威 ' + byPoke + ' 个 · 洛克分类 ' + byKz + ' 个（其中洛克专有招 ' + kzFixed + ' 个）');
samples.forEach(x => console.log('  ✅ ' + x));
const dist = {};
Object.keys(MOVES).forEach(id => { const c = MOVES[id].cat || '(空)'; dist[c] = (dist[c] || 0) + 1; });
console.log('\n最终分布: ' + Object.keys(dist).map(k => k + ' ' + dist[k]).join(' · '));

/* 专项核对用户提到的几个 */
['藤之鞭', '飞叶刀', '清醒', '种子炸弹', '花瓣群舞', '火焰牙', '闪焰冲锋', '龙爪', '喷射火焰'].forEach(nm => {
  const id = Object.keys(MOVES).find(k => MOVES[k].name === nm);
  if (id) console.log('  ' + nm.padEnd(8) + ' → ' + MOVES[id].cat + '（' + MOVES[id].type + ' 威力' + MOVES[id].power + '）');
});
if (!apply) { console.log('\n（未加 --apply，仅预演）'); process.exit(0); }
work = work.slice(0, from) + JSON.stringify(MOVES) + work.slice(j);
if (!existsSync(BAK)) { copyFileSync(FILE, BAK); console.log('已备份 → ' + BAK); }
writeFileSync(FILE, eol === '\r\n' ? work.split('\n').join('\r\n') : work, 'utf8');
console.log('已写入 ' + FILE);
