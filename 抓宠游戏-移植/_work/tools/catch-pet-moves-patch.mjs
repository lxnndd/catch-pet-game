/* 给 SPECIES 表补新招式（去重、每只最多 4 个技能） */
import { readFileSync, writeFileSync } from 'node:fs';

const F = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/抓宠游戏-v12-clean.html';

/* 目标补招：id → 想补的技能（已存在的会自动跳过） */
const PLAN = {
  /* 专属招式收尾（保证每个招式都有持有者） */
  batking2: [], batking: ['aerialace', 'lockon'], titanrock2: [], titanrock: ['stoneedge', 'irontread'],
  moleking2: [], moleking: ['irontail', 'irontread'],
  /* 普通系 */
  rat: [], mouse: ['quickattack'], meowth: [], cat: ['feint'], bison: ['crushclaw'], oxen: ['warcry'],
  behemoth: ['giga'], fox: ['quickattack'], hound: ['flamethrower'], houndoom: ['heatwave'],
  firegod: ['willowisp'], firelord: ['heatwave', 'flamethrower'],
  /* 火系 */
  chick: ['willowisp'], emberling: ['willowisp', 'flamethrower'], oni: ['heatwave'],
  billy: ['heatwave'], lion: ['flamethrower'], tiger: ['flamethrower'], magmoth: ['heatwave'],
  /* 草系 */
  sprout: ['gigadrain'], sprout2: ['gigadrain'], floraking: ['solarbeam'],
  deerking: ['solarbeam'], treegod: ['solarbeam', 'gigadrain'],
  /* 水系 */
  duck: ['aquaring'], swan: ['aquaring'], seaqueen: ['scald'], vaporeon: ['aquaring'],
  blowsky: ['scald'], whale: ['scald'],
  /* 电系 */
  boltlord: ['voltswitch'], peacock: ['chargebeam'], jolteon: ['voltswitch', 'chargebeam'],
  /* 冰系 */
  seal: ['icespinner'], empoleon: ['icespinner'], cub: ['icespinner'], frostbear: ['icespinner'],
  /* 岩系 */
  golem: ['rockblast'], titanrock: ['stoneedge'], scorp: ['stoneedge'], moleking: ['irontail'],
  /* 地面系 */
  mole: ['earthquake'], boar: ['earthquake', 'irontread'], sandlord: ['earthquake'], bison2: [],
  /* 毒系 */
  viper: ['toxicspikes'], cobra: ['crosspoison'], sphinx: ['gunkshot'], meow2: [],
  vampire: ['gunkshot'], specter: ['gunkshot'], panther: ['crosspoison'], kitten: ['toxicspikes'],
  /* 虫系 */
  spider: ['xscissor'], beetle: ['xscissor'], bee: ['sting'], butter: ['xscissor', 'sting'],
  /* 飞行系 */
  crow: ['bravebird'], eagle: ['bravebird'], parrot: ['aerialace'], warplane: ['bravebird'],
  peacock2: [], batking: ['aerialace'], dove: ['aerialace'],
  /* 格斗系 */
  fist: ['drainpunch'], boxer: ['rocksmash'], fistking: ['bulkup'], panda: ['bulkup'],
  ape: ['bulkup'], monkey: ['drainpunch'], rooster: ['rocksmash'],
  /* 龙系 */
  dragon: ['dragonrush', 'dragondance'], rexking: ['dragonrush'], dragonking: ['dragonrush', 'dragondance'],
  dragonite: ['dragonrush'], rex: ['dragonrush'], coatl: ['dragondance'], sphinx2: []
};

const src = readFileSync(F, 'utf8');
const a = src.indexOf('var SPECIES=[');
const b = src.indexOf('var EVO={', a);
if (a < 0 || b < 0) { console.error('定位 SPECIES 失败'); process.exit(1); }
let table = src.slice(a, b);
const lines = table.split('\n');

const known = new Set([...src.matchAll(/^\s{2}([a-z0-9_]+):\s*\{name:/gm)].map(m => m[1]));
if (!known.size) { console.error('未能解析 MOVES 表'); process.exit(1); }

const report = { added: 0, skippedFull: [], unknownId: [], unknownMove: [], perSpecies: [] };
for (const [id, wants] of Object.entries(PLAN)) {
  if (!id || !wants.length) continue;
  const li = lines.findIndex(l => l.includes('{id:"' + id + '"'));
  if (li < 0) { report.unknownId.push(id); continue; }
  let line = lines[li];
  const mm = line.match(/moves:\[([^\]]*)\]/);
  if (!mm) { report.unknownId.push(id + '(无moves)'); continue; }
  const cur = mm[1].split(',').map(s => s.trim().replace(/"/g, '')).filter(Boolean);
  const add = [];
  for (const w of wants) {
    if (!known.has(w)) { report.unknownMove.push(id + '→' + w); continue; }
    if (cur.includes(w) || add.includes(w)) continue;
    add.push(w);
  }
  if (!add.length) continue;
  let next = cur.concat(add);
  if (next.length > 4) { report.skippedFull.push(id + '(' + next.length + ')'); next = next.slice(0, 4); }
  const replaced = line.replace(/moves:\[[^\]]*\]/, 'moves:[' + next.map(x => '"' + x + '"').join(',') + ']');
  if (replaced === line) { report.unknownId.push(id + '(替换失败)'); continue; }
  lines[li] = replaced;
  report.added += add.length;
  report.perSpecies.push(id + ':' + add.join('+'));
}

table = lines.join('\n');
writeFileSync(F, src.slice(0, a) + table + src.slice(b), 'utf8');
console.log('新增技能引用:', report.added, '处');
console.log('涉及宠物:', report.perSpecies.length, '只');
console.log('  明细:', report.perSpecies.join(' , '));
if (report.skippedFull.length) console.log('⚠ 技能已满 4 个被截断:', report.skippedFull.join(', '));
if (report.unknownId.length) console.log('⚠ 找不到的宠物 id:', report.unknownId.join(', '));
if (report.unknownMove.length) console.log('⚠ 不存在的技能:', report.unknownMove.join(', '));
