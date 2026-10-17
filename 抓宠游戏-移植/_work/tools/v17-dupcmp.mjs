/* 检查重复传说宝可梦：两份数据谁更完整 */
import { pathToFileURL } from 'node:url';
const D = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/_work/v17-data/';
const LATEST = ['poke-paldea-legend.mjs', 'POKE_PALDEA_LEGEND'];
const mods = [
  ['poke-kanto-johto.mjs', 'POKE_KANTO_JOHTO', '关都城都'],
  ['poke-patch-12.mjs', 'POKE_PATCH_12', '补齐12'],
  ['poke-hoenn-sinnoh.mjs', 'POKE_HOENN_SINNOH', '丰缘神奥'],
  ['poke-unova-kalos.mjs', 'POKE_UNOVA_KALOS', '合众卡洛斯'],
  ['poke-alola-galar.mjs', 'POKE_ALOLA_GALAR', '阿罗拉伽勒尔'],
  [LATEST[0], LATEST[1], '帕底亚传说'],
  ['roco.mjs', 'ROCO', '洛克'],
];
const map = new Map();
for (const [f, n, label] of mods) {
  const mod = await import(pathToFileURL(D + f).href);
  (mod[n] || []).forEach(x => {
    if (!map.has(x.n)) map.set(x.n, []);
    const poolCount = Object.values(x.pools || {}).reduce((a, b) => a + b.length, 0);
    map.get(x.n).push({ label, poolCount, hp: x.hp, t: (x.t || []).join('/'), evo: x.evo ? x.evo.to : null, hasStats: !!(x.atk && x.spa) });
  });
}
const dups = [...map.entries()].filter(([k, v]) => v.length > 1);
console.log('重复条目 ' + dups.length + ' 只\n');
let latestWins = 0, otherWins = 0, tie = 0;
dups.forEach(([name, list]) => {
  const latest = list.find(x => x.label === '帕底亚传说');
  const others = list.filter(x => x.label !== '帕底亚传说');
  const bestOther = others.sort((a, b) => b.poolCount - a.poolCount)[0];
  let winner;
  if (!latest) winner = bestOther.label;
  else if (latest.poolCount >= bestOther.poolCount) { winner = '帕底亚传说'; latestWins++; }
  else { winner = bestOther.label; otherWins++; }
  if (latest && bestOther && latest.poolCount === bestOther.poolCount) tie++;
  console.log('  ' + name.padEnd(9) + list.map(x => x.label + '(' + x.poolCount + '招' + (x.hasStats ? '' : '⚠无六维') + ')').join(' vs ') + '  → 取 ' + winner);
});
console.log('\n帕底亚版本更优 ' + latestWins + ' 只 · 其它版本更优 ' + otherWins + ' 只 · 打平 ' + tie + ' 只');
