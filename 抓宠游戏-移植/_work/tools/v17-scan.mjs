/* v17 数据规模扫描：合并 6 份查证数据，统计物种/招式/进化链/技能池
   用法: node v17-scan.mjs */
import { pathToFileURL } from 'node:url';
const D = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/_work/v17-data/';
const FILES = [
  ['poke-kanto-johto.mjs', 'POKE_KANTO_JOHTO', '关东+城都'],
  ['poke-hoenn-sinnoh.mjs', 'POKE_HOENN_SINNOH', '丰缘+神奥'],
  ['poke-unova-kalos.mjs', 'POKE_UNOVA_KALOS', '合众+卡洛斯'],
  ['poke-alola-galar.mjs', 'POKE_ALOLA_GALAR', '阿罗拉+伽勒尔'],
  ['poke-paldea-legend.mjs', 'POKE_PALDEA_LEGEND', '帕底亚+传说'],
  ['roco.mjs', 'ROCO', '洛克王国'],
];
const POOLS = ['p0', 'p15', 'p25', 'p35', 'p45', 'p55', 'p65'];
const all = [], srcStat = [];
const moveMap = new Map();      /* 招式中文名 → {t,power,pp,acc,cat,count} */
const poolStat = {}; POOLS.forEach(p => poolStat[p] = { total: 0, empty: 0, pets: 0 });
let evoCount = 0, evoNoLv = 0, typeErr = 0, missingPool = 0;
const TYPES = new Set(['nor', 'fire', 'water', 'grass', 'elec', 'ice', 'fight', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy']);

for (const [file, name, label] of FILES) {
  let arr = [];
  try {
    const mod = await import(pathToFileURL(D + file).href);
    arr = mod[name] || [];
  } catch (e) { console.log('❌ ' + label + ' 载入失败：' + String(e.message).slice(0, 120)); continue; }
  srcStat.push([label, arr.length, file]);
  arr.forEach(x => {
    (x.t || []).forEach(t => { if (!TYPES.has(t)) typeErr++; });
    const pools = x.pools || {};
    if (!x.pools) missingPool++;
    POOLS.forEach(k => {
      const list = pools[k] || [];
      poolStat[k].total += list.length;
      if (!list.length) poolStat[k].empty++;
      poolStat[k].pets++;
      list.forEach(mv => {
        if (!mv || !mv.m) return;
        const key = mv.m;
        if (!moveMap.has(key)) moveMap.set(key, { t: mv.t, power: mv.power, pp: mv.pp, acc: mv.acc, cat: mv.cat, count: 0, src: label });
        moveMap.get(key).count++;
      });
    });
    if (x.evo && x.evo.to) {
      evoCount++;
      if (x.evo.lv === null || x.evo.lv === undefined) evoNoLv++;
    }
  });
  all.push(...arr.map(x => ({ ...x, __src: label })));
}
console.log('=== 数据规模 ===');
srcStat.forEach(([l, n, f]) => console.log('  ' + l.padEnd(12) + String(n).padStart(4) + ' 只  (' + f + ')'));
console.log('  合计 ' + all.length + ' 只');
console.log('\n=== 招式 ===');
console.log('  不同招式名 ' + moveMap.size + ' 个（现有游戏只有 107 个）');
const byType = {};
[...moveMap.values()].forEach(m => { byType[m.t] = (byType[m.t] || 0) + 1; });
const CN = { nor: '一般', fire: '火', water: '水', grass: '草', elec: '电', ice: '冰', fight: '格斗', poison: '毒', ground: '地面', flying: '飞行', psychic: '超能力', bug: '虫', rock: '岩石', ghost: '幽灵', dragon: '龙', dark: '恶', steel: '钢', fairy: '妖精' };
console.log('  按属性：' + Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([t, n]) => (CN[t] || t) + n).join(' · '));
const cat = {};
[...moveMap.values()].forEach(m => { cat[m.cat] = (cat[m.cat] || 0) + 1; });
console.log('  按类别：' + Object.entries(cat).map(([k, v]) => k + ' ' + v).join(' · '));
const noPower = [...moveMap.values()].filter(m => !m.power).length;
console.log('  变化技（威力 0）' + noPower + ' 个 · 有威力 ' + (moveMap.size - noPower) + ' 个');
console.log('  属性键非法 ' + typeErr + ' 处 · 缺少 pools 字段 ' + missingPool + ' 只');
console.log('\n=== 技能池 ===');
POOLS.forEach(k => {
  const s = poolStat[k];
  console.log('  ' + k.padEnd(5) + '共 ' + String(s.total).padStart(5) + ' 招 · 空池 ' + String(s.empty).padStart(4) + ' 只（占 ' + (s.empty / Math.max(1, s.pets) * 100).toFixed(0) + '%）· 平均 ' + (s.total / Math.max(1, s.pets)).toFixed(1) + ' 招/只');
});
console.log('\n=== 进化 ===');
console.log('  有进化 ' + evoCount + ' 只 · 其中非等级进化（lv=null）' + evoNoLv + ' 只');
console.log('\n=== 抽样：一只宠的完整结构 ===');
const sample = all.find(x => x.n === '妙蛙种子') || all[0];
console.log(JSON.stringify({ n: sample.n, t: sample.t, hp: sample.hp, pools: Object.fromEntries(POOLS.map(k => [k, ((sample.pools || {})[k] || []).map(m => m.m)])), evo: sample.evo }, null, 1));
