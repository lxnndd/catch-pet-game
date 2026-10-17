/* v77 调查：龙之怒 / 重磅冲击 / 技能池拖拽 / 冠军赛赛制 */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CACHE = ROOT + '/_work/sources/宝可梦/poke-cache-kj/json';
const MAP = JSON.parse(readFileSync(ROOT + '/_work/out/pokeapi-move-map.json', 'utf8'));
const FX = JSON.parse(readFileSync(ROOT + '/_work/out/move-fx.json', 'utf8'));
const src = readFileSync(ROOT + '/抓宠游戏-v12-clean.html', 'utf8');
function entry(zh) {
  const at = src.indexOf('"name":"' + zh + '"');
  if (at < 0) return null;
  const start = src.lastIndexOf('"mv', at);
  let depth = 0, i = src.indexOf('{', at);
  for (let k = i; k < src.length; k++) { if (src[k] === '{') depth++; else if (src[k] === '}') { depth--; if (depth === 0) return src.slice(start, k + 1); } }
  return null;
}
console.log('══ ① 龙之怒 / 重磅冲击 类 ══');
['dragon-rage', 'heavy-slam', 'heat-crash', 'low-kick', 'grass-knot', 'seismic-toss', 'night-shade', 'sonic-boom', 'night-shade'].forEach(en => {
  let o = null; try { o = JSON.parse(readFileSync(CACHE + '/move-' + en + '.json', 'utf8')); } catch (e) { }
  const hit = MAP[en];
  if (!o || !hit) { console.log('   ' + en.padEnd(14) + '（没有官方数据）'); return; }
  const e = entry(hit.zh);
  console.log('   ' + hit.zh.padEnd(8) + (en + '').padEnd(14) + '威力=' + o.power + ' cat=' + (o.meta && o.meta.category && o.meta.category.name) +
    ' ail=' + (o.meta && o.meta.ailment && o.meta.ailment.name) + ' damage=' + (o.meta && o.meta.damage) +
    ' drain=' + (o.meta && o.meta.drain) + '\n        MOVE_FX=' + JSON.stringify(FX[hit.zh] || null) + '\n        条目=' + (e || '(没有)'));
});
console.log('\n══ ② 体重数据（重磅冲击需要）══');
let withW = 0, tot = 0;
readdirSync(CACHE).filter(f => /^pokemon-\d+\.json$/.test(f)).slice(0, 999).forEach(f => {
  let o; try { o = JSON.parse(readFileSync(CACHE + '/' + f, 'utf8')); } catch (e) { return; }
  tot++; if (o.weight) withW++;
});
console.log('   pokemon 缓存 ' + tot + ' 条，其中带 weight 的 ' + withW + ' 条');
console.log('   示例：' + (() => { const a = []; for (const f of readdirSync(CACHE).filter(x => /^pokemon-\d+\.json$/.test(x)).slice(0, 3)) { const o = JSON.parse(readFileSync(CACHE + '/' + f, 'utf8')); a.push(o.name + '=' + o.weight + 'hg'); } return a.join(' · '); })());

console.log('\n══ ③ 技能池相关函数 ══');
['function renderPool', 'function movePoolDnD', 'pool-left', 'pool-right', 'function openMovePool', 'dragstart'].forEach(k => {
  const i = src.indexOf(k);
  console.log('   ' + k.padEnd(24) + (i >= 0 ? '找到（行 ' + (src.slice(0, i).split('\n').length) + '）' : '没找到'));
});
console.log('\n══ ④ 冠军赛 / 全国大赛 ══');
['E4_N', 'REAL_E4', 'champion', '128', '全国大赛', 'openLeague'].forEach(k => {
  const n = src.split(k).length - 1;
  console.log('   ' + k.padEnd(14) + '出现 ' + n + ' 次');
});
