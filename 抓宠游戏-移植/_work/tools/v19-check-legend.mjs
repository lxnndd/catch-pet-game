/* 查 rarity 误判根因：数据源里的 legendary 字段 vs note 里的"传说" */
import { readFileSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const D = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/_work/v17-data/';
const FILES = [
  ['poke-kanto-johto.mjs', 'POKE_KANTO_JOHTO', '关都城都'],
  ['poke-hoenn-sinnoh.mjs', 'POKE_HOENN_SINNOH', '丰缘神奥'],
  ['poke-unova-kalos.mjs', 'POKE_UNOVA_KALOS', '合众卡洛斯'],
  ['poke-alola-galar.mjs', 'POKE_ALOLA_GALAR', '阿罗拉伽勒尔'],
  ['poke-paldea-legend.mjs', 'POKE_PALDEA_LEGEND', '帕底亚传说'],
  ['roco.mjs', 'ROCO', '洛克'],
];
let withFlag = 0, total = 0;
const trueLegends = [], noteOnly = [], sampleNote = [];
for (const [f, n, label] of FILES) {
  if (!existsSync(D + f)) continue;
  const mod = await import(pathToFileURL(D + f).href);
  const arr = mod[n] || [];
  total += arr.length;
  arr.forEach(x => {
    if (x.legendary) withFlag++;
    const noteHas = /传说|幻之/.test(x.note || '');
    if (x.legendary) trueLegends.push(x.n);
    else if (noteHas) { noteOnly.push(x.n); if (sampleNote.length < 6) sampleNote.push(x.n + '：' + String(x.note).slice(0, 90)); }
  });
  console.log(label.padEnd(12) + ' ' + String(arr.length).padStart(4) + ' 只 · 带 legendary 字段 ' + arr.filter(x => x.legendary).length + ' · note 含"传说/幻之" ' + arr.filter(x => /传说|幻之/.test(x.note || '')).length);
}
console.log('\n合计 ' + total + ' 只 · 带 legendary 字段 ' + withFlag);
console.log('\n=== 有 legendary 字段的（真正的神兽/幻兽）共 ' + trueLegends.length + ' 只 ===');
console.log(trueLegends.slice(0, 60).join('、') + (trueLegends.length > 60 ? ' …' : ''));
console.log('\n=== 没有 legendary 字段、但 note 里含"传说/幻之"的（会被误判）共 ' + noteOnly.length + ' 只 ===');
console.log(noteOnly.slice(0, 50).join('、') + (noteOnly.length > 50 ? ' …' : ''));
console.log('\n=== 这些误判的 note 长什么样 ===');
sampleNote.forEach(s => console.log('  ' + s));
