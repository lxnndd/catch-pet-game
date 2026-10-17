/* 诊断进化目标缺失：看源数据里 evo.to 的原始写法 */
import { pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';
const D = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/_work/v17-data/';
const sp = JSON.parse(readFileSync('C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/_work/out/species-v17.json', 'utf8'));
const byName = {}; sp.forEach(s => byName[s.name] = s);
const CHECK = ['臭臭花', '喵喵', '蚊香君', '呆呆兽', '飞天螳螂', '伊布', '乌波', '狃拉', '无畏小子', '魔力猫'];
const FILES = [
  ['poke-kanto-johto.mjs', 'POKE_KANTO_JOHTO'],
  ['poke-hoenn-sinnoh.mjs', 'POKE_HOENN_SINNOH'],
  ['poke-unova-kalos.mjs', 'POKE_UNOVA_KALOS'],
  ['poke-alola-galar.mjs', 'POKE_ALOLA_GALAR'],
  ['poke-paldea-legend.mjs', 'POKE_PALDEA_LEGEND'],
  ['roco.mjs', 'ROCO'],
];
const all = {};
for (const [f, n] of FILES) {
  const mod = await import(pathToFileURL(D + f).href);
  (mod[n] || []).forEach(x => { if (!all[x.n]) all[x.n] = x; });
}
console.log('源数据里的 evo 写法：');
CHECK.forEach(n => {
  const x = all[n];
  if (!x) { console.log('  ' + n + '：源数据里没有'); return; }
  const to = x.evo ? x.evo.to : null;
  const toArr = Array.isArray(to) ? to : (to ? [to] : []);
  console.log('  ' + n.padEnd(7) + ' evo.to = ' + JSON.stringify(to) + '  lv=' + (x.evo ? x.evo.lv : '-') + ' how=' + (x.evo ? x.evo.how : '-'));
  toArr.forEach(t => {
    const direct = !!byName[t];
    console.log('      目标「' + t + '」 ' + (direct ? '✅ 表里有' : '❌ 表里没有') + (x.evo && x.evo.branches ? '  branches=' + JSON.stringify(x.evo.branches) : ''));
  });
  if (x.evo && x.evo.cond) console.log('      cond=' + x.evo.cond);
});
console.log('\n表里名字近似匹配：');
CHECK.forEach(n => {
  const x = all[n]; if (!x || !x.evo) return;
  const toArr = Array.isArray(x.evo.to) ? x.evo.to : [x.evo.to];
  toArr.forEach(t => {
    if (byName[t]) return;
    const near = Object.keys(byName).filter(k => k.includes(t.slice(0, 2)) || t.includes(k.slice(0, 2))).slice(0, 6);
    console.log('  ' + n + '→' + t + ' 近似：' + (near.length ? near.join('、') : '（无）'));
  });
});
