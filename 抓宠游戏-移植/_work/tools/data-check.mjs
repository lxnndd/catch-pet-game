/* 校验数据源里的属性名与技能名是否合法（对照游戏 HTML 的 MOVES 表与 18 属性） */
import { readFileSync } from 'node:fs';
import { PK } from './data-pokemon.mjs';

const F = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/抓宠游戏-v12-clean.html';
const src = readFileSync(F, 'utf8');
const mvA = src.indexOf('var MOVES={'), mvB = src.indexOf('\nvar SPECIES=[', mvA);
const moves = new Set([...src.slice(mvA, mvB).matchAll(/^\s{2}([a-z0-9_]+):\s*\{name:/gm)].map(m => m[1]));

const PK_TYPES = new Set(['nor','fire','water','grass','elec','ice','fight','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy']);
const badType = [], badMove = [], badHab = [];
const HAB = new Set(['plain','forest','water','volcano','mine','ocean','flower','snow','desert']);
for (const p of PK) {
  for (const t of p.t) if (!PK_TYPES.has(t)) badType.push(p.n + ':' + t);
  for (const m of p.m) if (!moves.has(m)) badMove.push(p.n + ':' + m);
  for (const h of p.h) if (!HAB.has(h)) badHab.push(p.n + ':' + h);
}
const names = PK.map(p => p.n);
const dup = names.filter((v, i) => names.indexOf(v) !== i);
const evoBad = [];
for (const p of PK) if (p.e) { if (!names.includes(p.e[0])) evoBad.push(p.n + '→' + p.e[0]); }
const noEvoTarget = PK.filter(p => !p.e && !PK.some(q => q.e && q.e[0] === p.n)).map(p => p.n);

console.log('宝可梦条目:', PK.length);
console.log('属性覆盖:', [...new Set(PK.flatMap(p => p.t))].sort().join(','));
console.log('双属性只数:', PK.filter(p => p.t.length === 2).length);
console.log('稀有度 常见/稀有/传说:', PK.filter(p => p.r === 0).length, PK.filter(p => p.r === 1).length, PK.filter(p => p.r === 2).length);
console.log('非法属性:', badType.length ? badType.join(', ') : '无');
console.log('表里没有的技能:', badMove.length ? badMove.join(', ') : '无');
console.log('非法栖息地:', badHab.length ? badHab.join(', ') : '无');
console.log('重名:', dup.length ? [...new Set(dup)].join(',') : '无');
console.log('进化目标不存在:', evoBad.length ? evoBad.join(', ') : '无');
console.log('（顶级形态，无进化）共', noEvoTarget.length, '只');
