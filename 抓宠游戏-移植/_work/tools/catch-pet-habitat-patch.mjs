/* 给雪原 / 荒漠补上出没物种（这些地区必须有可抓的宠） */
import { readFileSync, writeFileSync } from 'node:fs';

const F = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/抓宠游戏-v12-clean.html';
let s = readFileSync(F, 'utf8');
const a = s.indexOf('var SPECIES=[');
const b = s.indexOf('var EVO={', a);
let table = s.slice(a, b);
const lines = table.split('\n');

/* id → 追加的栖息地（会自动去重，最多 4 个） */
const HAB = {
  cub: ['snow'], seal: ['snow'], empoleon: ['snow'], frostbear: ['snow'], penguin: ['snow'],
  frostwolf: ['snow'], ice1: [], vulpix: ['snow'],
  mole: ['desert'], sandlord: ['desert'], boar: ['desert'], moleking: ['desert'],
  titanrock: ['desert'], magmoth: ['desert'], golem: ['desert'],
  sand1: [], viper: ['desert'], scorp: ['desert'], torterra: ['desert']
};

const done = [], missing = [];
for (const [id, wants] of Object.entries(HAB)) {
  if (!id || !wants.length) continue;
  const li = lines.findIndex(l => l.includes('{id:"' + id + '"'));
  if (li < 0) { missing.push(id); continue; }
  const line = lines[li];
  const hm = line.match(/habitat:\[([^\]]*)\]/);
  if (!hm) { missing.push(id + '(无habitat)'); continue; }
  const cur = hm[1].split(',').map(x => x.trim().replace(/"/g, '')).filter(Boolean);
  const add = wants.filter(w => !cur.includes(w));
  if (!add.length) continue;
  const next = cur.concat(add).slice(0, 4);
  lines[li] = line.replace(/habitat:\[[^\]]*\]/, 'habitat:[' + next.map(x => '"' + x + '"').join(',') + ']');
  done.push(id + ':+' + add.join('+'));
}
table = lines.join('\n');
writeFileSync(F, s.slice(0, a) + table + s.slice(b), 'utf8');
console.log('补栖息地:', done.length, '只 →', done.join(' , '));
if (missing.length) console.log('⚠ 找不到:', missing.join(', '));
