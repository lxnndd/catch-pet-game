/* v17 补齐关东+城都缺失的 12 只（数据源：PokéAPI 官方 API，世代招式表按 52poke 口径）
   输出: _work/v17-data/poke-patch-12.mjs
   用法: node v17-patch12.mjs */
import { writeFileSync } from 'node:fs';

const OUT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/_work/v17-data/poke-patch-12.mjs';
const MISSING = ['鸭嘴宝宝', '大奶罐', '幸福蛋', '雷公', '炎帝', '水君', '班基拉斯', '幼基拉斯', '沙基拉斯', '洛奇亚', '凤王', '时拉比'];
const CN2EN = {
  '鸭嘴宝宝': 'magby', '大奶罐': 'miltank', '幸福蛋': 'blissey', '雷公': 'raikou', '炎帝': 'entei', '水君': 'suicune',
  '班基拉斯': 'tyranitar', '幼基拉斯': 'larvitar', '沙基拉斯': 'pupitar', '洛奇亚': 'lugia', '凤王': 'ho-oh', '时拉比': 'celebi',
};
async function get(url, ms = 25000) {
  const ac = new AbortController(); const t = setTimeout(() => ac.abort(), ms);
  try {
    const r = await fetch(url, { signal: ac.signal });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) { return null; } finally { clearTimeout(t); }
}
const poolOf = (lv) => lv <= 14 ? 'p0' : lv <= 24 ? 'p15' : lv <= 34 ? 'p25' : lv <= 44 ? 'p35' : lv <= 54 ? 'p45' : lv <= 64 ? 'p55' : 'p65';
const CNTYPE = { normal: 'nor', fire: 'fire', water: 'water', grass: 'grass', electric: 'elec', ice: 'ice', fighting: 'fight', poison: 'poison', ground: 'ground', flying: 'flying', psychic: 'psychic', bug: 'bug', rock: 'rock', ghost: 'ghost', dragon: 'dragon', dark: 'dark', steel: 'steel', fairy: 'fairy' };
const CAT = { physical: '物理', special: '特殊', status: '变化' };

const out = [];
for (const cn of MISSING) {
  const en = CN2EN[cn];
  const pk = await get('https://pokeapi.co/api/v2/pokemon/' + en);
  if (!pk) { console.log('❌ ' + cn + ' 拉取失败'); continue; }
  const stats = {}; pk.stats.forEach(s => { stats[s.stat.name] = s.base_stat; });
  const types = pk.types.sort((a, b) => a.slot - b.slot).map(t => CNTYPE[t.type.name]);
  /* 招式：优先取最新世代（scarlet-violet → sword-shield → …）的 level-up 表 */
  const versions = ['scarlet-violet', 'sword-shield', 'ultra-sun-ultra-moon', 'omega-ruby-alpha-sapphire', 'black-2-white-2', 'heartgold-soulsilver', 'platinum', 'emerald', 'firered-leafgreen'];
  let used = null, moves = [];
  for (const v of versions) {
    const list = pk.moves.filter(m => m.version_group_details.some(d => d.version_group.name === v && d.move_learn_method.name === 'level-up'));
    if (list.length >= 3) {
      used = v;
      moves = list.map(m => {
        const d = m.version_group_details.find(x => x.version_group.name === v && x.move_learn_method.name === 'level-up');
        return { lv: d.level_learned_at, name: m.move.name };
      });
      break;
    }
  }
  /* 招式中文名与数值：查 move 接口（缓存起来，12 只重复招式不少） */
  const pools = { p0: [], p15: [], p25: [], p35: [], p45: [], p55: [], p65: [] };
  const seen = new Set();
  for (const m of moves.sort((a, b) => a.lv - b.lv)) {
    if (seen.has(m.name)) continue; seen.add(m.name);
    const mv = await get('https://pokeapi.co/api/v2/move/' + m.name);
    if (!mv) continue;
    const zh = (mv.names || []).find(n => n.language.name === 'zh-hans');
    const zhName = zh ? zh.name : m.name;
    const key = poolOf(m.lv);
    pools[key].push({
      m: zhName,
      t: CNTYPE[mv.type.name] || 'nor',
      power: mv.power || 0,
      pp: mv.pp || 10,
      acc: mv.accuracy === null ? 0 : mv.accuracy,
      cat: CAT[mv.damage_class.name] || '变化',
      _lv: m.lv,
    });
  }
  /* 每池裁剪：p0 取 4，其余最多 5（本系优先） */
  Object.keys(pools).forEach(k => {
    let list = pools[k];
    list.sort((a, b) => (b.t === types[0] ? 1 : 0) - (a.t === types[0] ? 1 : 0) || a._lv - b._lv);
    pools[k] = list.slice(0, k === 'p0' ? 4 : 5).map(x => { const { _lv, ...rest } = x; return rest; });
  });
  const evo = await get('https://pokeapi.co/api/v2/pokemon-species/' + en);
  let evoOut = null;
  if (evo && evo.evolves_to && evo.evolves_to.length) {
    const target = evo.evolves_to[0];
    const tName = target.species.name;
    const sp2 = await get('https://pokeapi.co/api/v2/pokemon-species/' + tName);
    const zh2 = sp2 && (sp2.names || []).find(n => n.language.name === 'zh-hans');
    const det = target.evolution_details[0] || {};
    evoOut = { to: zh2 ? zh2.name : tName, lv: det.min_level || null, how: det.min_level ? '等级' : (det.trigger && det.trigger.name === 'trade' ? '通信' : '其他'), item: det.item ? det.item.name : '' };
  }
  out.push({
    n: cn, t: types,
    hp: stats.hp, atk: stats.attack, def: stats.defense, spa: stats['special-attack'], spd: stats['special-defense'], spe: stats.speed,
    pools: pools, evo: evoOut, note: '补充条目（原关都+城都文件尾部被截断后重建）；升级招式表取世代 ' + used,
  });
  console.log('✅ ' + cn.padEnd(7) + types.join('/').padEnd(14) + 'HP' + String(stats.hp).padStart(4) + ' · 招式 ' + Object.values(pools).reduce((a, b) => a + b.length, 0) + ' 个 · 世代 ' + used);
}
const body = '/* 关都+城都补充 ' + out.length + ' 只（原文件尾部截断缺失，数据源 PokéAPI 官方 API） */\n' +
  'export const POKE_PATCH_12 = [\n' + out.map(o => JSON.stringify(o)).join(',\n') + '\n];\n';
writeFileSync(OUT, body, 'utf8');
console.log('\n已写出 ' + OUT + '（' + (body.length / 1024).toFixed(0) + ' KB，' + out.length + ' 条）');
