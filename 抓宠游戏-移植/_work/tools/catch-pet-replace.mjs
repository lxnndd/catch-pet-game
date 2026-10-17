/* 按行范围精确替换 SPECIES 表 + EVO 表（避免长文本匹配出错）
   用法: node catch-pet-replace.mjs [--apply] */
import { readFileSync, writeFileSync } from 'node:fs';

const F = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/抓宠游戏-v12-clean.html';
const SPEC = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/_species-new.txt';
const EVOF = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/_evo-new.txt';
const apply = process.argv.includes('--apply');

const lines = readFileSync(F, 'utf8').split('\n');
const s0 = lines.findIndex(l => l.startsWith('var SPECIES=['));
const e0 = lines.findIndex(l => l.startsWith('var EVO={'));
const e1 = lines.findIndex((l, i) => i > e0 && l.startsWith('};'));
if (s0 < 0 || e0 < 0 || e1 < 0 || !(s0 < e0 && e0 < e1)) { console.error('定位失败', s0, e0, e1); process.exit(1); }

const species = readFileSync(SPEC, 'utf8').replace(/\r\n/g, '\n').replace(/\n+$/, '');
const evo = readFileSync(EVOF, 'utf8').replace(/\r\n/g, '\n').replace(/\n+$/, '');

console.log('SPECIES 表位置:', s0 + 1, '→', e0, '（', e0 - s0, '行）原宠物数:', lines.slice(s0, e0).filter(l => l.includes('{id:')).length);
console.log('EVO 表位置:', e0 + 1, '→', e1 + 1, '（', e1 - e0 + 1, '行）原进化条目:', lines.slice(e0, e1).join('').split('{to:').length - 1);
console.log('新 SPECIES 行数:', species.split('\n').length, '新宠物数:', (species.match(/\{id:/g) || []).length);
console.log('新 EVO 行数:', evo.split('\n').length, '新进化条目:', (evo.match(/\{to:/g) || []).length);

if (!apply) { console.log('\n[dry-run] 加 --apply 才写入'); process.exit(0); }

const out = [
  ...lines.slice(0, s0),
  'var SPECIES=[',
  ...species.split('\n'),
  '];',
  ...evo.split('\n'),
  ...lines.slice(e1 + 1)
];
writeFileSync(F, out.join('\n'), 'utf8');
console.log('\n✅ 已写入，新文件行数:', out.length);
