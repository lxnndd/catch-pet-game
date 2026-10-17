/* v58 核查：连击类招式在本作的旧数据 vs 官方数据
   用户要求「乱抓这种也要尊重原本的效果」—— 即连击次数与威力都要按官方，
   还要去掉自创的连击伤害倍率（本作原来给连击乘了 0.62）。
   用法：node v58-check-hits.mjs */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CACHE = ROOT + '/_work/sources/宝可梦/poke-cache-kj/json';
const MAP = JSON.parse(readFileSync(ROOT + '/_work/out/pokeapi-move-map.json', 'utf8'));
const FX = JSON.parse(readFileSync(ROOT + '/_work/out/move-fx.json', 'utf8'));
const src = readFileSync(ROOT + '/抓宠游戏-v12-clean.html', 'utf8');

/* 从 MOVES 里取某个招的条目（MOVES 是 "mvXX":{"name":"...",...} 这样的一行 JSON 对象） */
function moveEntry(zh) {
  const key = '(' + zh + ')';
  const at = src.indexOf('"name":"' + zh + '"');
  if (at < 0) return null;
  const start = src.lastIndexOf('"mv', at);
  let depth = 0, i = src.indexOf('{', at);
  for (let k = i; k < src.length; k++) {
    if (src[k] === '{') depth++;
    else if (src[k] === '}') { depth--; if (depth === 0) { return src.slice(start, k + 1); } }
  }
  return null;
}

/* 官方连击招的完整信息 */
const official = {};
for (const f of readdirSync(CACHE).filter(x => /^move-.*\.json$/.test(x))) {
  let o; try { o = JSON.parse(readFileSync(CACHE + '/' + f, 'utf8')); } catch (e) { continue; }
  const hit = MAP[o.name]; if (!hit) continue;
  if (!o.meta || !o.meta.min_hits) continue;
  official[hit.zh] = { min: o.meta.min_hits, max: o.meta.max_hits, power: o.power, id: hit.id };
}

console.log('官方连击招式：' + Object.keys(official).length + ' 条\n');
console.log('招式'.padEnd(10) + ' | 官方 次数/威力        | MOVE_FX hits     | 本作 MOVES 条目');
console.log('-'.repeat(120));
let mismatchPower = [], mismatchHits = [];
Object.keys(official).forEach(zh => {
  const o = official[zh];
  const f = FX[zh];
  const entry = moveEntry(zh);
  let gPower = null, gHits = null;
  if (entry) {
    const mp = entry.match(/"power":(\d+)/); if (mp) gPower = +mp[1];
    const mh = entry.match(/"hits":\[(\d+),(\d+)\]/); if (mh) gHits = [ +mh[1], +mh[2] ];
  }
  const fxHits = f && f.hits ? f.hits : null;
  if (gPower !== null && gPower !== o.power) mismatchPower.push(zh + '（本作 ' + gPower + ' / 官方 ' + o.power + '）');
  if (gHits && (gHits[0] !== o.min || gHits[1] !== o.max)) mismatchHits.push(zh + '（本作 ' + gHits + ' / 官方 [' + o.min + ',' + o.max + ']）');
  console.log(zh.padEnd(10) + ' | ' + (o.min + '~' + o.max + ' 次 / 威力 ' + o.power).padEnd(22) +
    ' | ' + (fxHits ? JSON.stringify(fxHits) : '（无）').padEnd(17) + ' | ' +
    (entry ? ('威力 ' + gPower + (gHits ? ' hits ' + JSON.stringify(gHits) : ' 无 hits 字段')) : '（找不到）'));
});
console.log('\n威力与官方不一致：' + mismatchPower.length + ' 条');
mismatchPower.slice(0, 25).forEach(x => console.log('   ' + x));
console.log('\n连击次数与官方不一致：' + mismatchHits.length + ' 条');
mismatchHits.slice(0, 25).forEach(x => console.log('   ' + x));

/* 连击倍率（自创） */
const mul = src.match(/hitsMul[^;]{0,60}/g);
console.log('\n本作的连击伤害倍率（自创，官方没有这一项）：');
(mul || []).slice(0, 5).forEach(x => console.log('   ' + x.trim()));
