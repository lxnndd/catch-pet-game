/* v26 出怪概率实测：复刻 rollEnemy，模拟抽取统计实际类别概率 */
import { readFileSync } from 'node:fs';
const ROOT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植';
const src = readFileSync(ROOT + '/抓宠游戏-v12-clean.html', 'utf8');
function sliceLiteral(s, i) {
  const o = s.slice(i).search(/[[{]/); const from = i + o;
  const oc = s[from], cc = oc === '[' ? ']' : '}';
  let d = 0, j = from, inStr = null, esc = false;
  for (; j < s.length; j++) {
    const c = s[j];
    if (inStr) { if (esc) { esc = false; continue; } if (c === '\\') { esc = true; continue; } if (c === inStr) inStr = null; continue; }
    if (c === '"' ) { inStr = c; continue; }
    if (c === oc) d++; else if (c === cc) { d--; if (d === 0) { j++; break; } }
  }
  return s.slice(from, j);
}
const lit = name => new Function('return (' + sliceLiteral(src, src.indexOf('var ' + name + '=') + ('var ' + name + '=').length) + ')')();
const SPECIES = lit('SPECIES');
const RARITY_W = new Function('return ' + src.match(/var RARITY_W=\[[^\]]*\];/)[0].replace('var RARITY_W=', '').replace(';', ''))();
const SKY_RATE = lit('SKY_RATE');
const LV_RANGE = lit('LV_RANGE');
console.log('RARITY_W = ' + JSON.stringify(RARITY_W));
console.log('SKY_RATE = ' + JSON.stringify(SKY_RATE));
console.log('LV_RANGE = ' + JSON.stringify(LV_RANGE));
/* 复刻 isEvolvedForm：有 EVO 指向它即为进化形态 */
const EVO = lit('EVO');
const evolvedIds = new Set();
for (const k of Object.keys(EVO)) { const t = EVO[k].to; (Array.isArray(t) ? t : [t]).forEach(x => evolvedIds.add(x)); }
const isEvo = s => evolvedIds.has(s.id);
const wild = SPECIES.filter(s => !isEvo(s) && !s.varOf);
console.log('\n总物种 ' + SPECIES.length + ' · 可野生（非进化/非亚种）' + wild.length);
const dist = {};
wild.forEach(s => { dist[s.rarity] = (dist[s.rarity] || 0) + 1; });
console.log('可野生池稀有度构成：常见(r0) ' + (dist[0] || 0) + ' · 稀有(r1) ' + (dist[1] || 0) + ' · 神兽(r2) ' + (dist[2] || 0));

const REGIONS = Object.keys(LV_RANGE);
const SIM = 200000;
function simulate(reg, topLv) {
  const maxR = topLv < 8 ? 0 : (topLv < 15 ? 1 : 2);
  let pool = wild.filter(s => s.habitat && s.habitat.indexOf(reg) >= 0);
  const poolSize = pool.length;
  let total = 0; pool.forEach(s => total += RARITY_W[s.rarity]);
  /* easy 兜底池 */
  let easy = wild.filter(s => s.rarity <= maxR && s.habitat && s.habitat.indexOf(reg) >= 0);
  if (!easy.length) easy = wild.filter(s => s.rarity <= maxR);
  const cnt = [0, 0, 0]; let downgraded = 0;
  for (let t = 0; t < SIM; t++) {
    let r = Math.random() * total, sp = pool[pool.length - 1];
    for (let i = 0; i < pool.length; i++) { r -= RARITY_W[pool[i].rarity]; if (r <= 0) { sp = pool[i]; break; } }
    if (sp.rarity > maxR) { downgraded++; sp = easy[Math.floor(Math.random() * easy.length)]; }
    cnt[sp.rarity]++;
  }
  return { poolSize, maxR, c0: cnt[0] / SIM, c1: cnt[1] / SIM, c2: cnt[2] / SIM, downgraded: downgraded / SIM };
}
for (const topLv of [5, 12, 30]) {
  console.log('\n===== 玩家最强宠 Lv' + topLv + '（maxR=' + (topLv < 8 ? 0 : topLv < 15 ? 1 : 2) + '）=====');
  for (const reg of REGIONS) {
    const r = simulate(reg, topLv);
    console.log('  ' + reg.padEnd(8) + ' 池' + String(r.poolSize).padStart(4) + ' | 常见 ' + (r.c0 * 100).toFixed(2).padStart(6) + '% | 稀有 ' + (r.c1 * 100).toFixed(3).padStart(6) + '% | 神兽 ' + (r.c2 * 100).toFixed(4).padStart(8) + '%' + (r.downgraded > 0.0001 ? ' | 降级 ' + (r.downgraded * 100).toFixed(2) + '%' : ''));
  }
}
/* 每只宠被抽中的概率（各地区） */
console.log('\n===== 单只宠物被抽中概率（按类别均摊）=====');
for (const reg of ['plain', 'forest', 'ocean', 'volcano']) {
  const r = simulate(reg, 30);
  console.log('  ' + reg.padEnd(8) + ' 单只常见 ' + (r.c0 / Math.max(1, (wild.filter(s => s.habitat.indexOf(reg) >= 0 && s.rarity === 0).length)) * 100).toFixed(4) + '% · 单只稀有 ' + (r.c1 / Math.max(1, wild.filter(s => s.habitat.indexOf(reg) >= 0 && s.rarity === 1).length) * 100).toFixed(4) + '% · 单只神兽 ' + (r.c2 / Math.max(1, wild.filter(s => s.habitat.indexOf(reg) >= 0 && s.rarity === 2).length) * 100).toFixed(5) + '%');
}
