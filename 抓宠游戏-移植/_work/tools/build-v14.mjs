/* v14 注入器：三方数据 → 游戏 HTML
   用法： node build-v14.mjs            # 试运行，只打印统计与预览
          node build-v14.mjs --apply    # 写入 HTML（自动备份）
   · 替换区： var SPECIES=[ ... ];  → 全部三方宠（含 EVO 标记）
   · 替换区： var EVO={ ... };      → 三方进化链
   · 替换区： var TRAINERS=[ ... ]; → 按新宠池重建训练师队伍
   · 同步改： MW/MH 不变；18 属性 TYPE_NAME/CHART；TRAINERS 引用新 id
*/
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { PK } from './data-pokemon.mjs';
import { PAL } from './data-pal.mjs';
import { merge, summarize, TYPE_HABITAT } from './merge-species.mjs';
import { CHART18, T18_NAME } from './typechart18.mjs';

const APPLY = process.argv.includes('--apply');
const HTML = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/抓宠游戏-v12-clean.html';
const KZ_FILE = './data-kz.mjs';

/* ── 1. 载入洛克（文件可能还没生成）── */
let KZ = [];
if (existsSync(new URL(KZ_FILE, import.meta.url))) {
  const m = await import(KZ_FILE);
  KZ = m.KZ || m.KZ_LIST || [];
  console.log('洛克载入:', KZ.length, '只');
} else {
  console.log('⚠ 未找到 data-kz.mjs，本次只合并宝可梦 + 帕鲁');
}

/* ── 1b. 攻/防/速：宝可梦用官方真实值（data-pokemon-stats.mjs），洛克/帕鲁用拟造值 ── */
let PK_STATS = {};
if (existsSync(new URL('./data-pokemon-stats.mjs', import.meta.url))) {
  PK_STATS = (await import('./data-pokemon-stats.mjs')).PK_STATS || {};
  console.log('宝可梦攻防速载入:', Object.keys(PK_STATS).length, '只');
} else {
  console.log('⚠ 未找到 data-pokemon-stats.mjs（攻防速查证中），宝可梦暂用中性值');
}
let AUX_STATS = {};
if (existsSync(new URL('./data-aux-species.mjs', import.meta.url))) {
  AUX_STATS = (await import('./data-aux-species.mjs')).AUX_STATS || {};
  console.log('洛克/帕鲁拟造攻防速载入:', Object.keys(AUX_STATS).length, '只');
}
const statsOf = (name, src) => PK_STATS[name] || AUX_STATS[name] || null;

/* ── 2. 合并 ── */
const list = merge({ pk: PK, kz: KZ, pal: PAL, statsOf });

/* ── 3. 分配 emoji（按属性给候选池，同属性内轮转，避免全表同图）── */
const EMOJI_BY_TYPE = {
  nor: ['🐾', '🐑', '🐮', '🐷', '🐒', '🦫', '🐹'], fire: ['🔥', '🦊', '🐲', '🦁', '🐯'],
  water: ['💧', '🐟', '🐬', '🐳', '🐙', '🦑', '🐚'], grass: ['🌿', '🍃', '🌱', '🦎', '🐢'],
  elec: ['⚡', '🐭', '⚡️', '🦔'], ice: ['❄️', '🐧', '🦭', '🐻‍❄️'],
  fight: ['🥊', '💪', '🦵', '🤼'], poison: ['☠️', '🟣', '🐍', '🦂'],
  ground: ['⛰️', '🦫', '🐗', '🦔'], flying: ['🕊️', '🦅', '🦉', '🦇', '🐦'],
  psychic: ['🔮', '🧠', '👁️', '🌀'], bug: ['🐛', '🦋', '🐝', '🦗', '🕷️'],
  rock: ['🪨', '🗿', '⛏️'], ghost: ['👻', '💀', '🕯️'], dragon: ['🐉', '🦖', '🐲'],
  dark: ['🌑', '🦇', '🐺', '😈'], steel: ['⚙️', '🔩', '🛡️'], fairy: ['🧚', '🌸', '✨', '🎀']
};
const emojiCursor = {};
function emojiFor(types) {
  const t = types[0] || 'nor';
  const pool = EMOJI_BY_TYPE[t] || ['🐾'];
  const i = (emojiCursor[t] = (emojiCursor[t] || 0) + 1);
  return pool[i % pool.length];
}
list.forEach(p => { p.emoji = emojiFor(p.types); });

/* ── 4. 进化链：把「名字→目标名」翻译成「id→id」，同时给有进化的宠打 ev 标记 ── */
const byName = new Map(list.map(p => [p.name, p]));
const EVO = {};
const evoMiss = [];
for (const p of list) {
  if (!p.evo) continue;
  const tgt = byName.get(p.evo[0]);
  /* 目标不在三方数据里 → 该链断裂，直接不建链（避免游戏内进化到不存在的物种） */
  if (!tgt) { evoMiss.push(p.name + '→' + p.evo[0]); continue; }
  EVO[p.id] = { to: tgt.id, lv: p.evo[1] || 20 };
}
for (const id of Object.keys(EVO)) { const p = list.find(x => x.id === id); if (p) p.ev = true; }

/* ── 5. 统计与自检 ── */
const s = summarize(list);
const warn = [];
for (const h of ['plain', 'forest', 'water', 'volcano', 'mine', 'ocean', 'flower', 'snow', 'desert'])
  if ((s.地区分布[h] || 0) < 12) warn.push('地区 ' + h + ' 只有 ' + (s.地区分布[h] || 0) + ' 只（偏少）');
const mineable = list.filter(p => !p.ev);
for (const h of ['plain', 'forest', 'water', 'volcano', 'mine', 'ocean', 'flower', 'snow', 'desert']) {
  const n = mineable.filter(p => p.habitat.includes(h)).length;
  if (n < 8) warn.push('遇敌池 ' + h + ' 只有 ' + n + ' 只可遇');
}
if (s.水上坐骑 < 3) warn.push('水上坐骑不足 3 只（海洋通行会卡）');
if (evoMiss.length) warn.push('进化目标缺失 ' + evoMiss.length + ' 条: ' + evoMiss.slice(0, 5).join(', '));

console.log('\n=== 合并结果 ===');
console.log('总宠数:', s.总数, JSON.stringify(s.来源));
console.log('稀有度:', JSON.stringify(s.稀有度), ' 飞行坐骑:', s.飞行坐骑, ' 水上坐骑:', s.水上坐骑);
console.log('地区分布:', Object.entries(s.地区分布).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ':' + v).join(' '));
console.log('属性分布:', Object.entries(s.属性分布).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ':' + v).join(' '));
console.log('进化链:', Object.keys(EVO).length, '条；可进化宠:', list.filter(p => p.ev).length, '只');
console.log('警告:', warn.length ? '\n  - ' + warn.join('\n  - ') : '无');

/* ── 6. 生成代码文本 ── */
const SPECIES_TXT = 'var SPECIES=[\n' + list.map(p => {
  /* 金币奖励随强度走：下限 4+base，上限 12+1.6×base（保证下限<上限）
     hpBase 存「血量种族值」：宝可梦用官方 HP 种族值（真实值），保证进化后成长明显；
     洛克/帕鲁用档位或面板血量折算出的等效种族值。 */
  const rw = [4 + p.base, 12 + Math.round(p.base * 1.6)];
  const hpBase = p.rawStat != null ? p.rawStat : p.base;
  return '  {id:' + JSON.stringify(p.id) + ',name:' + JSON.stringify(p.name) + ',emoji:' + JSON.stringify(p.emoji) +
  ',rarity:' + p.rarity + ',base:' + p.base + ',hpBase:' + hpBase + ',reward:[' + rw[0] + ',' + rw[1] + ']' +
  ',a:' + (p.a || 70) + ',d:' + (p.d || 70) + ',s:' + (p.s || 70) +
  ',type:' + JSON.stringify(p.types[0]) + (p.types[1] ? ',type2:' + JSON.stringify(p.types[1]) : '') +
  ',moves:[' + p.moves.map(m => JSON.stringify(m)).join(',') + ']' +
  ',habitat:[' + p.habitat.map(h => JSON.stringify(h)).join(',') + ']' +
  (p.src === 'pal' ? ',pal:1' : p.src === 'kz' ? ',kz:1' : ',pk:1') +
  (p.ride ? ',ride:' + JSON.stringify(p.ride) : '') + (p.ride2 ? ',ride2:' + JSON.stringify(p.ride2) : '') +
  (p.varOf ? ',varOf:' + JSON.stringify(p.varOf) : '') +
  (p.ev ? ',ev:true' : '') + '}';
}).join(',\n') + '\n];\n';

const EVO_TXT = 'var EVO={\n' + Object.entries(EVO).map(([k, v]) =>
  '  ' + JSON.stringify(k) + ':{to:' + JSON.stringify(v.to) + ',lv:' + v.lv + '}'
).join(',\n') + '\n};\n';

/* 训练师队伍：按主题地区从遇敌池里挑同地区宠，等级越高队伍越大 */
const REGION_POOL = {};
for (const h of Object.keys(TYPE_HABITAT.flatMap ? {} : {})) { /* noop */ }
for (const p of mineable) for (const h of p.habitat) (REGION_POOL[h] = REGION_POOL[h] || []).push(p);
function pickFrom(habitat, n, seed) {
  const pool = (REGION_POOL[habitat] || mineable).slice();
  const out = [];
  for (let i = 0; i < n && pool.length; i++) {
    const idx = (seed * 7 + i * 13) % pool.length;
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}
const TRAINER_DEF = [
  { id: 't1', name: '短裤小子·阿磊', emoji: '🧒', pos: { x: 30, y: 30 }, h: 'plain', n: 2 },
  { id: 't2', name: '捕虫少年·小柯', emoji: '👦', pos: { x: 26, y: 10 }, h: 'forest', n: 3 },
  { id: 't3', name: '露营少女·小茜', emoji: '👧', pos: { x: 14, y: 14 }, h: 'flower', n: 3 },
  { id: 't4', name: '渔夫·大鲛', emoji: '🎣', pos: { x: 23, y: 27 }, h: 'water', n: 3 },
  { id: 't5', name: '矿工·铁镐', emoji: '⛏️', pos: { x: 46, y: 12 }, h: 'mine', n: 4 },
  { id: 't6', name: '格斗家·岩拳', emoji: '🥊', pos: { x: 33, y: 42 }, h: 'plain', n: 4 },
  { id: 't7', name: '火山学者·炎', emoji: '🌋', pos: { x: 14, y: 42 }, h: 'volcano', n: 5 },
  { id: 't8', name: '冲浪手·蓝波', emoji: '🏄', pos: { x: 54, y: 28 }, h: 'ocean', n: 5 },
  { id: 't9', name: '龙之使者·凛', emoji: '🐉', pos: { x: 58, y: 10 }, h: 'snow', n: 5 },
  { id: 't10', name: '冠军·劫火', emoji: '👑', pos: { x: 41, y: 48 }, h: 'desert', n: 6 }
];
const TRAINERS_TXT = 'var TRAINERS=[\n' + TRAINER_DEF.map(t => {
  const team = pickFrom(t.h, t.n, t.pos.x + t.pos.y);
  return '  {id:' + JSON.stringify(t.id) + ', name:' + JSON.stringify(t.name) + ',  emoji:' + JSON.stringify(t.emoji) +
    ', pos:{x:' + t.pos.x + ',y:' + t.pos.y + '}, team:[' + team.map(p => JSON.stringify(p.id)).join(',') + ']}';
}).join(',\n') + '\n];\n';

/* 18 属性名与克制表（供游戏内使用） */
const TYPE_TXT = 'var TYPE_NAME=' + JSON.stringify(T18_NAME).replace(/","/g, '", "') + ';\n';
const CHART_TXT = 'var CHART=' + JSON.stringify(CHART18) + ';\n';

console.log('\n=== 代码块预览 ===');
console.log(SPECIES_TXT.split('\n').slice(0, 3).join('\n'));
console.log('...共', list.length, '条');
console.log(EVO_TXT.split('\n').slice(0, 4).join('\n'));
console.log(TRAINERS_TXT);

if (!APPLY) { console.log('\n[试运行] 未写入。加 --apply 实际写入。'); process.exit(0); }

/* ── 7. 注入 ── */
let src = readFileSync(HTML, 'utf8');
const spA = src.indexOf('var SPECIES=[');
const trA = src.indexOf('var TRAINERS=[');
if (spA < 0 || trA < 0 || trA < spA) { console.error('锚点异常，放弃写入'); process.exit(1); }
const bak = HTML.replace('.html', '.bak-v14-pre.html');
if (!existsSync(bak)) copyFileSync(HTML, bak);

src = src.slice(0, spA) + SPECIES_TXT + '\n/* TRAINERS 在此之后 */\n' + src.slice(trA);
const trA2 = src.indexOf('var TRAINERS=[');
const trEnd = src.indexOf('function trainerAt', trA2);
src = src.slice(0, trA2) + TRAINERS_TXT + '\n' + src.slice(trEnd);
const evA = src.indexOf('var EVO={');
if (evA > 0) {
  const evEnd = src.indexOf('var RARITY_NAME', evA);
  src = src.slice(0, evA) + EVO_TXT + '\n' + src.slice(evEnd);
}
// 18 属性名 + 克制表：替换旧的 TYPE_NAME 与 CHART
const tnA = src.indexOf('var TYPE_NAME=');
if (tnA > 0) { const tnEnd = src.indexOf('\n', tnA); src = src.slice(0, tnA) + TYPE_TXT.trimEnd() + src.slice(tnEnd); }
const chA = src.indexOf('var CHART={');
if (chA > 0) { const chEnd = src.indexOf('var MOVES={', chA); src = src.slice(0, chA) + CHART_TXT + '\n' + src.slice(chEnd); }

writeFileSync(HTML, src, 'utf8');
console.log('\n✔ 已写入', HTML, '新字节数', Buffer.byteLength(src, 'utf8'), '备份', bak);
