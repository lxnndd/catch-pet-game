/* v42 侦查：PokéAPI 招式缓存里有哪些「官方效果」字段可用
   目标：判断能否用官方数据重建 MOVE_FX（能力变化 / 异常状态 / 回复）
   用法：node v42-probe-movefx.mjs */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CACHE = ROOT + '/_work/sources/宝可梦/poke-cache-kj/json';
const MAP = JSON.parse(readFileSync(ROOT + '/_work/out/pokeapi-move-map.json', 'utf8'));
const files = readdirSync(CACHE).filter(f => /^move-.*\.json$/.test(f));

const statZh = {
  attack: 'atk', defense: 'def', 'special-attack': 'spa', 'special-defense': 'spDef',
  speed: 'spd', accuracy: 'hit', evasion: 'eva', crit_rate: 'crit'
};
const ailZh = { poison: 'poison', burn: 'burn', paralysis: 'para', sleep: 'sleep', freeze: 'freeze', none: null };

let nMap = 0, nStat = 0, nAil = 0, nHeal = 0, nDrain = 0, nFlinch = 0, nPrio = 0;
const unknownStat = {}, unknownAil = {}, unknownTarget = {};
const samples = [];
for (const f of files) {
  let o; try { o = JSON.parse(readFileSync(CACHE + '/' + f, 'utf8')); } catch (e) { continue; }
  const hit = MAP[o.name]; if (!hit) continue;
  nMap++;
  const sc = o.stat_changes || [];
  const meta = o.meta || {};
  const ail = meta.ailment && meta.ailment.name !== 'none' ? meta.ailment.name : null;
  if (sc.length) nStat++;
  if (ail) nAil++;
  if (meta.healing) nHeal++;
  if (meta.drain) nDrain++;
  if (meta.flinch_chance) nFlinch++;
  if (o.priority) nPrio++;
  sc.forEach(s => { const k = statZh[s.stat.name]; if (!k) unknownStat[s.stat.name] = (unknownStat[s.stat.name] || 0) + 1; });
  if (ail && !(ail in ailZh)) unknownAil[ail] = (unknownAil[ail] || 0) + 1;
  const t = (o.target && o.target.name) || '?';
  if (['user', 'selected-pokemon', 'all-opponents', 'user-and-allies', 'all-other-pokemon', 'entire-field', 'users-field', 'opponents-field', 'specific-move', 'all-pokemon', 'random-opponent', 'near-other-pokemon', 'user-or-ally', 'ally'].indexOf(t) < 0) unknownTarget[t] = (unknownTarget[t] || 0) + 1;
  if (['tail-glow', 'scary-face', 'acid', 'swords-dance', 'double-team', 'sweet-scent', 'smokescreen', 'hone-claws', 'minimize', 'metal-sound', 'nasty-plot', 'calm-mind', 'growth', 'cosmic-power', 'recover'].indexOf(o.name) >= 0) {
    samples.push({
      en: o.name, zh: hit.zh, target: t, cat: o.damage_class && o.damage_class.name, power: o.power,
      stat_changes: sc.map(s => ({ stat: s.stat.name + '→' + (statZh[s.stat.name] || '?'), change: s.change })),
      ailment: ail, ailment_chance: meta.ailment_chance, stat_chance: meta.stat_chance,
      healing: meta.healing, drain: meta.drain, flinch: meta.flinch_chance, prio: o.priority, acc: o.accuracy
    });
  }
}
console.log('映射到游戏的招式: ' + nMap);
console.log('  有 stat_changes: ' + nStat + ' · 有异常状态: ' + nAil + ' · 有回复: ' + nHeal +
            ' · 吸血: ' + nDrain + ' · 畏缩: ' + nFlinch + ' · 先制: ' + nPrio);
console.log('未识别的能力项: ' + JSON.stringify(unknownStat));
console.log('未识别的异常: ' + JSON.stringify(unknownAil));
console.log('未识别的 target: ' + JSON.stringify(unknownTarget));
console.log('\n样例：');
samples.sort((a, b) => a.en.localeCompare(b.en)).forEach(s => console.log('  ' + JSON.stringify(s)));
