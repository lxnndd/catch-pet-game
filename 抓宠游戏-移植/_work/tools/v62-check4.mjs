/* v62 调查：用户点名的 4 个招 + 增强拳为何"实际游戏没修"
   用法：node v62-check4.mjs */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CACHE = ROOT + '/_work/sources/宝可梦/poke-cache-kj/json';
const MAP = JSON.parse(readFileSync(ROOT + '/_work/out/pokeapi-move-map.json', 'utf8'));
const FX = JSON.parse(readFileSync(ROOT + '/_work/out/move-fx.json', 'utf8'));
const src = readFileSync(ROOT + '/抓宠游戏-v12-clean.html', 'utf8');

/* 找出中文名里带这些关键词的官方招 */
const KEYS = ['针刺', '借力', '挺住', '增强'];
const found = [];
for (const f of readdirSync(CACHE).filter(x => /^move-.*\.json$/.test(x))) {
  let o; try { o = JSON.parse(readFileSync(CACHE + '/' + f, 'utf8')); } catch (e) { continue; }
  const hit = MAP[o.name]; if (!hit) continue;
  if (!KEYS.some(k => hit.zh.indexOf(k) >= 0)) continue;
  found.push({ en: o.name, zh: hit.zh, id: hit.id, power: o.power, acc: o.accuracy, pri: o.priority, cat: o.meta && o.meta.category && o.meta.category.name, ail: o.meta && o.meta.ailment && o.meta.ailment.name, turns: (o.meta && o.meta.min_turns) || 0, drain: (o.meta && o.meta.drain) || 0, stat: JSON.stringify(o.stat_changes), target: o.target && o.target.name });
}
console.log('官方招式中名字含「针刺/借力/挺住/增强」的：');
found.forEach(x => console.log('   ' + x.zh.padEnd(10) + ' (' + x.en + ') 威力=' + x.power + ' 命中=' + x.acc + ' 先制=' + x.pri +
  ' cat=' + x.cat + ' ail=' + x.ail + ' turns=' + x.turns + ' drain=' + x.drain + ' target=' + x.target + '\n        stat_changes=' + x.stat));

console.log('\n本作 MOVE_FX 里这几条：');
['致命针刺', '借力摔', '借力甩', '挺住', '增强拳', '地球上投', '投掷', '山岚摔'].forEach(n => {
  console.log('   ' + n.padEnd(10) + ' → ' + (FX[n] ? JSON.stringify(FX[n]) : '（无）'));
});

/* 本作 MOVES 里增强拳的完整条目 */
function entry(zh) {
  const at = src.indexOf('"name":"' + zh + '"');
  if (at < 0) return null;
  const start = src.lastIndexOf('"mv', at);
  let depth = 0, i = src.indexOf('{', at);
  for (let k = i; k < src.length; k++) {
    if (src[k] === '{') depth++;
    else if (src[k] === '}') { depth--; if (depth === 0) return src.slice(start, k + 1); }
  }
  return null;
}
console.log('\n本作 MOVES 里的原始条目：');
['增强拳', '致命针刺', '挺住'].forEach(n => console.log('   ' + (entry(n) || '（没有这一招）')));
