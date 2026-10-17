/* 静态体检：MOVES/SPECIES/EVO/技能引用/emoji 合法性 */
import { readFileSync } from 'node:fs';
const F = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/抓宠游戏-v12-clean.html';
const src = readFileSync(F, 'utf8');

function block(startMark, endMark){
  const a = src.indexOf(startMark);
  if (a < 0) throw new Error('找不到 ' + startMark);
  const b = src.indexOf(endMark, a);
  if (b < 0) throw new Error('找不到 ' + endMark);
  return { text: src.slice(a, b), from: a, to: b, line: src.slice(0, a).split('\n').length };
}

const mv = block('var MOVES={', '\nvar SPECIES=[');
const sp = block('var SPECIES=[', '\nvar EVO={');
const ev = block('var EVO={', '\n/* 稀有度不再影响强度');

const moves = [...mv.text.matchAll(/^\s{2}([a-zA-Z0-9_]+)\s*:/gm)].map(m => m[1]);
const moveSet = new Set(moves);
const species = [...sp.text.matchAll(/\{id:"([a-zA-Z0-9_]+)"/g)].map(m => m[1]);
const spSet = new Set(species);
const evoKeys = [...ev.text.matchAll(/(?:^|[\s,{])([a-zA-Z0-9_]+)\s*:\s*\{to:"([a-zA-Z0-9_]+)",lv:(\d+)/g)]
  .map(m => ({ from: m[1], to: m[2], lv: +m[3] }));

console.log('LOC MOVES 行', mv.line, '| SPECIES 行', sp.line, '| EVO 行', ev.line);
console.log('MOVES 数:', moves.length, '| SPECIES 数:', species.length, '| EVO 条目:', evoKeys.length);

// 1) 技能引用校验
const bad = [];
for (const line of sp.text.split('\n')) {
  const idm = line.match(/\{id:"([a-zA-Z0-9_]+)"/);
  if (!idm) continue;
  const mm = line.match(/moves:\[([^\]]*)\]/);
  if (!mm) continue;                       /* 不是物种行（如训练师表）就跳过 */
  for (const raw of mm[1].split(',')) {
    const k = raw.trim().replace(/"/g, '');
    if (!k) continue;
    if (!moveSet.has(k)) bad.push(idm[1] + ' → 未知技能 ' + k);
  }
}
console.log('技能引用问题:', bad.length ? bad.join(' | ') : '无');

// 2) id 重复 & EVO 端点
const dup = species.filter((v, i) => species.indexOf(v) !== i);
console.log('重复 id:', dup.length ? [...new Set(dup)].join(',') : '无');
const evoBad = evoKeys.filter(e => !spSet.has(e.from) || !spSet.has(e.to)).map(e => e.from + '→' + e.to);
console.log('EVO 端点缺失:', evoBad.length ? evoBad.join(',') : '无');

// 3) 未被任何宠物使用的技能
const used = new Set();
for (const m of sp.text.matchAll(/moves:\[([^\]]*)\]/g)) {
  for (const raw of m[1].split(',')) { const k = raw.trim().replace(/"/g, ''); if (k) used.add(k); }
}
const unused = moves.filter(m => !used.has(m));
console.log('未被引用的技能(' + unused.length + '):', unused.join(',') || '无');

// 4) emoji 单字符校验（只查带 moves 的物种行；训练师 emoji 允许带变体选择符）
const emojiBad = [];
for (const line of sp.text.split('\n')) {
  const idm = line.match(/\{id:"([a-zA-Z0-9_]+)"/);
  const em = line.match(/emoji:"([^"]*)"/);
  if (!idm || !em) continue;
  if (!/moves:\[/.test(line)) continue;
  const chars = [...em[1]];
  if (chars.length !== 1) emojiBad.push(idm[1] + ':' + em[1] + '(' + chars.length + ')');
}
console.log('emoji 非单字符:', emojiBad.length ? emojiBad.join(' | ') : '无');

const rarity = { 0: 0, 1: 0, 2: 0 };
for (const m of sp.text.matchAll(/rarity:(\d)/g)) rarity[m[1]]++;
console.log('稀有度分布 常见/稀有/传说:', rarity[0], rarity[1], rarity[2]);
