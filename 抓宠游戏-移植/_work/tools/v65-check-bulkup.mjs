/* v65 查「健美」的官方数据与本作现状 */
import { readFileSync } from 'node:fs';
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
  for (let k = i; k < src.length; k++) {
    if (src[k] === '{') depth++;
    else if (src[k] === '}') { depth--; if (depth === 0) return src.slice(start, k + 1); }
  }
  return null;
}
/* 检查一批"自己提升多项能力"的招 */
const NAMES = ['健美', '冥想', '龙之舞', '蝶舞', '岩石打磨', '铁壁', '瞬间失忆', '诡计', '剑舞', '磨爪', '宇宙力量', '鼓腹'];
const en = { '健美': 'bulk-up', '冥想': 'calm-mind', '龙之舞': 'dragon-dance', '蝶舞': 'quiver-dance', '岩石打磨': 'rock-polish', '铁壁': 'iron-defense', '瞬间失忆': 'amnesia', '诡计': 'nasty-plot', '剑舞': 'swords-dance', '磨爪': 'hone-claws', '宇宙力量': 'cosmic-power', '鼓腹': 'belly-drum' };
const STAT_ZH = { attack: '攻击', defense: '防御', 'special-attack': '特攻', 'special-defense': '特防', speed: '速度', accuracy: '命中', evasion: '闪避' };

console.log('招式'.padEnd(10) + '| 官方 stat_changes'.padEnd(30) + '| target'.padEnd(18) + '| category'.padEnd(16) + '| 本作 MOVE_FX');
console.log('-'.repeat(125));
NAMES.forEach(zh => {
  const e = en[zh];
  let o = null;
  try { o = JSON.parse(readFileSync(CACHE + '/move-' + e + '.json', 'utf8')); } catch (err) { }
  const off = o ? (o.stat_changes || []).map(s => STAT_ZH[s.stat.name] + (s.change > 0 ? '+' : '') + s.change).join(',') : '(读不到)';
  const tg = o ? (o.target || {}).name : '?';
  const cat = o ? ((o.meta && o.meta.category && o.meta.category.name) || '?') : '?';
  console.log(zh.padEnd(9) + '| ' + off.padEnd(29) + '| ' + tg.padEnd(17) + '| ' + cat.padEnd(15) + '| ' + JSON.stringify(FX[zh] || null));
});
console.log('\n本作 MOVES 条目：');
NAMES.forEach(zh => console.log('   ' + zh.padEnd(6) + ' ' + (entry(zh) || '(没有)')));
