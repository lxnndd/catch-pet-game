/* v75 调查：声音招式清单 + 击落/意念移物/三重攻击/滚动/冰球/掉包 的官方数据
   用法：node v75-probe.mjs */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CACHE = ROOT + '/_work/sources/宝可梦/poke-cache-kj/json';
const MAP = JSON.parse(readFileSync(ROOT + '/_work/out/pokeapi-move-map.json', 'utf8'));
const src = readFileSync(ROOT + '/抓宠游戏-v12-clean.html', 'utf8');
function entry(zh) {
  const at = src.indexOf('"name":"' + zh + '"');
  if (at < 0) return null;
  const start = src.lastIndexOf('"mv', at);
  let depth = 0, i = src.indexOf('{', at);
  for (let k = i; k < src.length; k++) { if (src[k] === '{') depth++; else if (src[k] === '}') { depth--; if (depth === 0) return src.slice(start, k + 1); } }
  return null;
}
const rows = [];
for (const f of readdirSync(CACHE).filter(x => /^move-.*\.json$/.test(x))) {
  let o; try { o = JSON.parse(readFileSync(CACHE + '/' + f, 'utf8')); } catch (e) { continue; }
  const hit = MAP[o.name]; if (!hit) continue;
  rows.push({ en: o.name, zh: hit.zh, id: hit.id, flags: (o.flags || []).map(x => x.name), meta: o.meta || {}, power: o.power });
}
/* ① 声音招式 */
const sound = rows.filter(r => r.flags.indexOf('sound') >= 0);
console.log('══ 官方标记为声音类（flag: sound）的招式：' + sound.length + ' 条 ══');
sound.forEach(r => {
  const inGame = entry(r.zh) ? '有' : '缺';
  console.log('   ' + r.zh.padEnd(12) + (r.id + '').padEnd(9) + '[' + inGame + '] ' + (r.meta.category ? r.meta.category.name : '') + ' ail=' + (r.meta.ailment ? r.meta.ailment.name : '-'));
});

/* ② 用户点名的几个 */
console.log('\n══ 相关招式官方数据 ══');
['smack-down', 'telekinesis', 'tri-attack', 'rollout', 'ice-ball', 'trick', 'throat-chop', 'fly', 'bounce', 'sky-drop', 'gust', 'twister', 'thunder', 'whirlwind', 'sky-uppercut', 'hurricane', 'sonic-boom', 'thousand-arrows', 'toxic', 'swift'].forEach(en => {
  const r = rows.find(x => x.en === en);
  if (!r) { console.log('   ' + en.padEnd(16) + '（映射表里没有）'); return; }
  const e = entry(r.zh);
  console.log('   ' + en.padEnd(16) + r.zh.padEnd(12) + (e ? '有' : '缺') + '  威力=' + r.power +
    ' cat=' + (r.meta.category ? r.meta.category.name : '-') + ' ail=' + (r.meta.ailment ? r.meta.ailment.name : '-') +
    ' turns=' + (r.meta.min_turns || 0) + '~' + (r.meta.max_turns || 0) + ' flags=' + r.flags.join(','));
});
