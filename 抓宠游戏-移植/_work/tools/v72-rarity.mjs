/* v72 调查：本作的「稀有度」是怎么分的，官方对应什么
   用户反馈：还有蓝色品质（稀有档）的宠物，"理论上不存在"
   用法：node v72-rarity.mjs */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CACHE = ROOT + '/_work/sources/宝可梦/poke-cache-kj/json';
const src = readFileSync(ROOT + '/抓宠游戏-v12-clean.html', 'utf8');

/* 从 SPECIES 字面量里取每条 {id,name,rarity,cap,...} */
const at = src.indexOf('var SPECIES=[');
const end = src.indexOf('\n', at);
const SPECIES = new Function('return (' + src.slice(src.indexOf('[', at), end).replace(/;\s*$/, '') + ')')();
const cnt = { 0: 0, 1: 0, 2: 0 };
const byR = { 0: [], 1: [], 2: [] };
SPECIES.forEach(s => { cnt[s.rarity] = (cnt[s.rarity] || 0) + 1; byR[s.rarity].push(s); });
console.log('本作宠物总数 ' + SPECIES.length);
console.log('  普通(0) ' + cnt[0] + ' 只 · 稀有(1) ' + cnt[1] + ' 只 · 传说(2) ' + cnt[2] + ' 只');

/* 官方 legendary / mythical 标记 */
const leg = new Set(), myth = new Set(), all = new Set();
let nSpecies = 0;
readdirSync(CACHE).filter(f => /^species-\d+\.json$/.test(f)).forEach(f => {
  let o; try { o = JSON.parse(readFileSync(CACHE + '/' + f, 'utf8')); } catch (e) { return; }
  nSpecies++;
  const zh = o.names && o.names.find(x => x.language.name === 'zh-Hans');
  const nm = zh ? zh.name : o.name;
  all.add(nm);
  if (o.is_legendary) leg.add(nm);
  if (o.is_mythical) myth.add(nm);
});
console.log('\n官方 species 数据 ' + nSpecies + ' 条 · 其中传说 ' + leg.size + ' 只 · 幻之 ' + myth.size + ' 只');
console.log('  传说示例：' + [...leg].slice(0, 12).join(' · '));
console.log('  幻之示例：' + [...myth].slice(0, 8).join(' · '));

/* 交叉：稀有档(1)里，有多少是官方传说/幻之 */
const r1 = byR[1].map(s => s.name);
const r1leg = r1.filter(n => leg.has(n) || myth.has(n));
const r1noleg = r1.filter(n => !leg.has(n) && !myth.has(n));
console.log('\n稀有档(蓝) ' + r1.length + ' 只：');
console.log('  官方传说/幻之：' + r1leg.length + ' 只 —— ' + r1leg.join(' · '));
console.log('  其余（按捕捉率划进来的）：' + r1noleg.length + ' 只 —— ' + r1noleg.slice(0, 40).join(' · ') + (r1noleg.length > 40 ? ' …' : ''));

/* 传说档(2) 里有没有其实不是传说的 */
const r2 = byR[2].map(s => s.name);
const r2no = r2.filter(n => !leg.has(n) && !myth.has(n) && all.has(n));
console.log('\n传说档(红) ' + r2.length + ' 只，其中官方并未标为传说/幻之的：' + r2no.length + ' 只 —— ' + r2no.slice(0, 20).join(' · '));

/* 官方传说里，本作有没有漏掉没进传说档的 */
const inGame = new Set(SPECIES.map(s => s.name));
const miss = [...leg, ...myth].filter(n => inGame.has(n) && !r2.includes(n));
console.log('\n官方传说/幻之且本作有收录、却没进传说档的：' + miss.length + ' 只 —— ' + miss.slice(0, 25).join(' · '));
console.log('\n（捕捉率阈值：' + JSON.stringify(byR[0].slice(0, 3).map(s => s.cap)) + ' 属于普通档 · 稀有档示例 cap=' + JSON.stringify(byR[1].slice(0, 5).map(s => s.cap)) + ' · 传说档 cap=' + JSON.stringify(byR[2].slice(0, 5).map(s => s.cap)) + '）');
