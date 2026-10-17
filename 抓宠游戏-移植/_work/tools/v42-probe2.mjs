/* v42 侦查 2：把 meta 里所有非零字段统计出来，并查几个关键招的真实字段
   用法：node v42-probe2.mjs */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CACHE = ROOT + '/_work/sources/宝可梦/poke-cache-kj/json';
const MAP = JSON.parse(readFileSync(ROOT + '/_work/out/pokeapi-move-map.json', 'utf8'));
const files = readdirSync(CACHE).filter(f => /^move-.*\.json$/.test(f));

const metaKeys = {};
const byEn = {};
for (const f of files) {
  let o; try { o = JSON.parse(readFileSync(CACHE + '/' + f, 'utf8')); } catch (e) { continue; }
  if (MAP[o.name]) byEn[o.name] = o;
  const m = o.meta || {};
  Object.keys(m).forEach(k => {
    const v = m[k];
    const isZero = (v === 0 || v === null || v === undefined || v === false ||
      (typeof v === 'object' && v && (v.name === 'none' || v.name === null)));
    if (!isZero) metaKeys[k] = (metaKeys[k] || 0) + 1;
  });
}
console.log('meta 非零字段分布（仅在映射到游戏的招里统计）:');
Object.keys(metaKeys).sort((a, b) => metaKeys[b] - metaKeys[a]).forEach(k => console.log('   ' + k + ': ' + metaKeys[k]));
console.log('\n关键招的真实字段:');
['tail-glow', 'focus-energy', 'rest', 'roost', 'protect', 'mist', 'trick', 'bullet-seed', 'teleport', 'fire-spin', 'shock-wave', 'double-team', 'minimize', 'hone-claws', 'sweet-scent', 'scary-face', 'acid', 'recover', 'calm-mind', 'swords-dance', 'giga-drain', 'leech-life', 'dream-eater', 'flamethrower', 'ice-beam', 'fire-fang', 'body-slam', 'air-slash'].forEach(en => {
  const o = byEn[en];
  if (!o) { console.log('   ' + en + ' → （不在映射表里）'); return; }
  const m = o.meta || {};
  const nz = {};
  Object.keys(m).forEach(k => { const v = m[k]; if (!(v === 0 || v === null || v === undefined || v === false || (typeof v === 'object' && v && v.name === 'none'))) nz[k] = v; });
  console.log('   ' + en + '（' + MAP[en].zh + '）target=' + (o.target && o.target.name) + ' cat=' + (o.damage_class && o.damage_class.name) + ' power=' + o.power);
  console.log('      stat_changes=' + JSON.stringify(o.stat_changes) + '  meta非零=' + JSON.stringify(nz));
});
console.log('\n映射表里的旧译名检查:');
['鬼面', '可怕面孔', '空气斩', '空气之刃', '炼狱', '烈火深渊'].forEach(zh => {
  const hit = Object.keys(MAP).filter(en => MAP[en].zh === zh);
  console.log('   ' + zh + ' ← ' + (hit.length ? hit.join(',') : '（映射表里没有）'));
});
