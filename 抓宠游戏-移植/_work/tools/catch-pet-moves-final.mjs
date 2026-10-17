/* 收尾：给少数宠物补上专属招式（每只保持 ≤4 招） */
import { readFileSync, writeFileSync } from 'node:fs';

const F = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/抓宠游戏-v12-clean.html';
const ADDS = [
  ['batking', ['lockon']],
  ['titanrock', ['irontread']],
  ['moleking', ['irontread']],
  ['firelord', ['flamethrower']],
  ['emberling', ['flamethrower']],
  ['treegod', ['gigadrain']],
  ['jolteon', ['chargebeam']],
  ['boar', ['irontread']],
  ['butter', ['sting']],
  ['dragon', ['dragondance']],
  ['dragonking', ['dragondance']]
];

let s = readFileSync(F, 'utf8');
const out = [];
for (const [id, wants] of ADDS) {
  const re = new RegExp('(\\{id:"' + id + '"[^\\n]*?moves:\\[)([^\\]]*)(\\])');
  const m = s.match(re);
  if (!m) { out.push(id + ':NOTFOUND'); continue; }
  const cur = m[2].split(',').map(x => x.trim().replace(/"/g, '')).filter(Boolean);
  const add = wants.filter(w => !cur.includes(w));
  if (!add.length) { out.push(id + ':already'); continue; }
  const next = cur.concat(add).slice(0, 4);
  s = s.replace(re, '$1' + next.map(x => '"' + x + '"').join(',') + '$3');
  out.push(id + ':+' + add.join('+'));
}
writeFileSync(F, s, 'utf8');
console.log(out.join(' | '));
