/* 后处理 _species-new.txt：非单码点 emoji 替换、稀有度调整、进化链起点标 ev */
import { readFileSync, writeFileSync } from 'node:fs';

const SP = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/_species-new.txt';
const EV = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/_evo-new.txt';

// 1) 单码点 emoji 替换（避免 canvas fillText 出现豆腐块）
const emojiFix = { shadowcat: '😼' };
let sp = readFileSync(SP, 'utf8');
for (const [id, em] of Object.entries(emojiFix)) {
  const re = new RegExp('(\\{id:"' + id + '"[^\\n]*?emoji:")[^"]*(")');
  sp = sp.replace(re, '$1' + em + '$2');
}

// 2) 稀有度下调（新加的灵兽级改为稀有）
const rarityFix = { vaporeon: 1, jolteon: 1, flareon: 1, shadowcat: 1 };
for (const [id, r] of Object.entries(rarityFix)) {
  const re = new RegExp('(\\{id:"' + id + '"[^\\n]*?)rarity:\\d');
  sp = sp.replace(re, '$1rarity:' + r);
}

// 3) 进化链起点 → ev:true（不出现在野外遇敌池）
const evo = readFileSync(EV, 'utf8');
const froms = [...evo.matchAll(/(?:^|[\s,{])([a-zA-Z0-9_]+)\s*:\s*\{to:/gm)].map(m => m[1]);
let marked = 0;
for (const id of froms) {
  const re = new RegExp('(\\{id:"' + id + '"[^\\n]*?)(\\},?)$', 'm');
  const line = sp.split('\n').find(l => l.includes('{id:"' + id + '"'));
  if (!line) { console.log('⚠ 找不到物种行:', id); continue; }
  if (line.includes('ev:true')) continue;
  const nl = line.replace(/(\},?)$/, ',ev:true$1');
  sp = sp.replace(line, nl);
  marked++;
}
writeFileSync(SP, sp, 'utf8');

// 4) 复检
const ids = [...sp.matchAll(/\{id:"([a-zA-Z0-9_]+)"/g)].map(m => m[1]);
const badEmoji = [];
for (const line of sp.split('\n')) {
  const idm = line.match(/\{id:"([a-zA-Z0-9_]+)"/); const em = line.match(/emoji:"([^"]*)"/);
  if (idm && em && [...em[1]].length !== 1) badEmoji.push(idm[1] + ':' + em[1]);
}
const r = { 0: 0, 1: 0, 2: 0 };
for (const m of sp.matchAll(/rarity:(\d)/g)) r[m[1]]++;
console.log('新标 ev:true 的进化起点:', marked, '| 进化起点总数:', froms.length);
console.log('物种数:', ids.length, '| 稀有度 常见/稀有/传说:', r[0], r[1], r[2]);
console.log('emoji 非单码点:', badEmoji.length ? badEmoji.join(' | ') : '无');
console.log('ev:true 数:', (sp.match(/ev:true/g) || []).length);
