/* v17 数据注入：把 out/ 的数据与头像写进游戏 HTML
   替换 SPECIES / MOVES / EVO / AVATARS 四个块
   用法: node v17-inject.mjs [--dry] */
import { readFileSync, writeFileSync, copyFileSync, readdirSync, existsSync } from 'node:fs';

const ROOT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植';
const HTML = ROOT + '/抓宠游戏-v12-clean.html';
const OUT = ROOT + '/_work/out/';
const AVW = ROOT + '/_work/v17-avatars-webp';
const DRY = process.argv.includes('--dry');

let src = readFileSync(HTML, 'utf8');
const species = JSON.parse(readFileSync(OUT + 'species-v17.json', 'utf8'));
const moves = JSON.parse(readFileSync(OUT + 'moves-v17.json', 'utf8'));
const evo = JSON.parse(readFileSync(OUT + 'evo-v17.json', 'utf8'));
console.log('载入：物种 ' + species.length + ' · 招式 ' + moves.length + ' · 进化 ' + Object.keys(evo).length);

/* ── 1. 进化等级：用户定「全部按等级触发」→ 把 null 的补成合理等级 ──
   规则：按进化链的深度递推（初阶 30 级、二阶 42 级），已有等级的保持不变 */
const byId = {}; species.forEach(s => byId[s.id] = s);
const stageOf = (id) => {           /* 往上数有几段进化 */
  let depth = 0, cur = id, guard = 0;
  while (guard++ < 10) {
    const parent = Object.entries(evo).find(([, e]) => {
      const tos = Array.isArray(e.to) ? e.to : [e.to];
      return tos.includes(cur);
    });
    if (!parent) break;
    depth++; cur = parent[0];
  }
  return depth;
};
const evoFixed = {};
let lvAssigned = 0;
Object.entries(evo).forEach(([from, e]) => {
  let lv = e.lv;
  if (lv === null || lv === undefined) {
    const st = stageOf(from);
    lv = st === 0 ? 30 : (st === 1 ? 42 : 52);   /* 初阶 30、二阶 42、三阶 52 */
    lvAssigned++;
  }
  evoFixed[from] = { to: e.to, lv: lv, how: '等级', item: '', branchCount: e.branchCount || 1 };
});
console.log('进化等级补齐：' + lvAssigned + ' 条原本需要道具/通信的，已按阶段给 30/42/52 级');

/* ── 2. 物种表：带 pools，供「4 技能槽 + 7 学习等级点」使用 ── */
const REG_OK = new Set(['plain', 'forest', 'water', 'flower', 'snow', 'mine', 'volcano', 'desert', 'ocean']);
/* 初始 4 招：p0 不足 4 个时，按 p15→p65 顺序往后借（官方很多宠低等级只有 2~3 招） */
const POOL_ORDER = ['p0', 'p15', 'p25', 'p35', 'p45', 'p55', 'p65'];
let borrowCount = 0;
const speciesOut = species.map(s => {
  const pools = {};
  POOL_ORDER.forEach(k => pools[k] = (s.pools && s.pools[k] ? s.pools[k].slice() : []));
  /* 借用：从后池搬招到 p0，补满 4 个 */
  if (pools.p0.length < 4) {
    for (const k of POOL_ORDER.slice(1)) {
      while (pools.p0.length < 4 && pools[k].length) {
        pools.p0.push(pools[k].shift());
        borrowCount++;
      }
      if (pools.p0.length >= 4) break;
    }
  }
  const o = {
    id: s.id, name: s.name, emoji: '❔', rarity: s.rarity,
    base: s.hpBase, hpBase: s.hpBase, a: s.a, d: s.d, s: s.s, spa: s.spa, spd: s.spd,
    type: s.type, type2: s.type2 || undefined,
    habitat: (s.habitat || ['plain']).filter(h => REG_OK.has(h)),
    pools: pools,
    moves: pools.p0.slice(0, 4),          /* 兼容旧字段：初始 4 招 */
    reward: [4 + s.hpBase, 12 + Math.round(1.6 * s.hpBase)],
    pk: s.src === 'pk' ? 1 : undefined,
    kz: s.src === 'kz' ? 1 : undefined,
  };
  if (!o.habitat.length) o.habitat = ['plain'];
  if (!o.type2) delete o.type2;
  if (!o.pk) delete o.pk; if (!o.kz) delete o.kz;
  return o;
});
console.log('物种输出 ' + speciesOut.length + ' 条（宝可梦 ' + speciesOut.filter(s => s.pk).length + ' / 洛克 ' + speciesOut.filter(s => s.kz).length + '）· 借招补满初始 4 个共 ' + borrowCount + ' 次');

/* ── 骑乘：v17 数据源没有 ride 字段，按「最终形态 + 体型」重新生成 ──
   规则：水系且体型够大 → 水上坐骑；飞行且够大 → 飞行坐骑（水上也能骑）；其余够大 → 陆地坐骑。
   水上必须 water/fly 才能骑（游戏里 rideMount 会强制下马）。 */
const evoFrom = JSON.parse(readFileSync(OUT + 'evo-v17.json', 'utf8'));
const evoIds = new Set(Object.keys(evoFrom));
const bigEnough = (s, t) => (s.hpBase || 0) >= t;
let rideCount = 0;
speciesOut.forEach(s => {
  const isFinal = !evoIds.has(s.id);                 /* 不再进化 = 最终形态 */
  if (!isFinal) return;
  const hasW = s.type === 'water' || s.type2 === 'water';
  const hasF = s.type === 'flying' || s.type2 === 'flying';
  if (hasW && bigEnough(s, 70)) { s.ride = 'water'; rideCount++; }
  else if (hasF && bigEnough(s, 65)) { s.ride = 'fly'; rideCount++; }
  else if (bigEnough(s, 85)) { s.ride = 'land'; rideCount++; }
});
console.log('骑乘：' + rideCount + ' 只可骑（水上 ' + speciesOut.filter(s => s.ride === 'water').length + ' · 飞行 ' + speciesOut.filter(s => s.ride === 'fly').length + ' · 陆地 ' + speciesOut.filter(s => s.ride === 'land').length + '）');
const shortP0 = speciesOut.filter(s => s.moves.length < 4);
const noPools = speciesOut.filter(s => !s.pools || !Object.values(s.pools).some(v => v && v.length));
console.log('初始招不足 4 个的物种 ' + shortP0.length + (shortP0.length ? '：' + shortP0.slice(0, 8).map(s => s.name + '(' + s.moves.length + ')').join('、') : ' ✅'));
console.log('没有任何技能的物种 ' + noPools.length + (noPools.length ? '：' + noPools.slice(0, 8).map(s => s.name).join('、') : ' ✅'));

/* ── 3. 招表 ──
   注意：旧表里存在 "undefined" 这类坏键（v13 建表遗留），若直接沿用会把多个招式写到同一个键上、
   互相覆盖（曾导致 58 个高频招式丢失）。这里统一：id 不是非空字符串就重新生成，并维护 id 重映射。 */
const movesOut = {};
const idRemap = {};          /* 旧 id → 新 id */
let regen = 0;
moves.forEach(m => {
  let id = (typeof m.id === 'string' && m.id && m.id !== 'undefined') ? m.id : null;
  if (!id) {
    id = 'mv-' + (m.name || 'x');
    let base = id, k = 2;
    while (movesOut[id]) id = base + '-' + (k++);
    if (m.id !== undefined && m.id !== null) idRemap[String(m.id)] = id;
    regen++;
  }
  /* 同一个 id 重复出现也要错开，避免覆盖 */
  if (movesOut[id]) { let base = id, k = 2; while (movesOut[id]) id = base + '-' + (k++); }
  const o = { name: m.name, type: m.type, power: m.power || 0, pp: Math.max(1, Math.min(40, m.pp || 10)) };
  if (m.acc && m.acc > 0 && m.acc < 100) o.acc = m.acc;
  if (m.cat && m.cat !== '物理') o.cat = m.cat;
  movesOut[id] = o;
});
console.log('招表输出 ' + Object.keys(movesOut).length + ' 个（重新生成 id ' + regen + ' 个）· 变化技 ' + Object.values(movesOut).filter(m => !m.power).length);
/* 物种表里引用的招式 id 必须都存在，否则把坏引用换成兜底招式 */
const allMoveIds = new Set(Object.keys(movesOut));
const fallbackId = Object.keys(movesOut).find(id => movesOut[id].name === '撞击') || Object.keys(movesOut)[0];
let fixedRef = 0;
speciesOut.forEach(s => {
  ['p0', 'p15', 'p25', 'p35', 'p45', 'p55', 'p65'].forEach(k => {
    s.pools[k] = (s.pools[k] || []).map(id => {
      const good = (typeof id === 'string' && allMoveIds.has(id));
      if (!good) { fixedRef++; return fallbackId; }
      return id;
    }).filter((v, i, a) => a.indexOf(v) === i);
  });
  s.moves = (s.pools.p0 || []).slice(0, 4);
});
console.log('修正物种表里的坏招式引用 ' + fixedRef + ' 处');

/* ── 4. 头像（内联 base64）── */
const avatars = {};
let avBytes = 0;
if (existsSync(AVW)) {
  readdirSync(AVW).filter(f => f.endsWith('.webp')).forEach(f => {
    const id = f.replace(/\.webp$/, '');
    if (!byId[id]) return;
    const buf = readFileSync(AVW + '/' + f);
    avBytes += buf.length;
    avatars[id] = buf.toString('base64');
  });
}
console.log('头像 ' + Object.keys(avatars).length + ' 张（' + (avBytes / 1024 / 1024).toFixed(2) + ' MB → base64 约 ' + (avBytes * 1.34 / 1024 / 1024).toFixed(2) + ' MB）');
const noAvatar = speciesOut.filter(s => !avatars[s.id]);
console.log('没头像的物种 ' + noAvatar.length + (noAvatar.length ? '：' + noAvatar.slice(0, 10).map(s => s.name).join('、') : ' ✅ 全部有图'));

if (DRY) { console.log('\n--dry：不写入'); process.exit(0); }

/* ── 5. 替换四个块 ── */
copyFileSync(HTML, HTML.replace(/\.html$/, '.bak-v17-pre.html'));
function replaceBlock(text, startRe, endMark, newBody, label) {
  const m = text.match(startRe);
  if (!m) throw new Error('找不到起止标记：' + label);
  const start = m.index;
  const after = text.indexOf(endMark, start + m[0].length);
  if (after < 0) throw new Error('找不到结束标记：' + label + ' → ' + endMark);
  /* 区间里不允许有函数定义，防止误吞代码（v14 血泪教训） */
  const inner = text.slice(start, after);
  const fnCount = (inner.match(/function\s+\w+\s*\(/g) || []).length;
  if (fnCount > 0) throw new Error('替换区间含 ' + fnCount + ' 个函数定义，拒绝执行：' + label);
  return text.slice(0, start) + newBody + text.slice(after);
}
function replaceVar(text, varName, json, label) {
  const startRe = new RegExp('var ' + varName + '\\s*=\\s*');
  const m = text.match(startRe);
  if (!m) throw new Error('找不到 var ' + varName);
  const start = m.index;
  /* 从开始处做括号配对找结束 */
  let i = start + m[0].length;
  while (i < text.length && /\s/.test(text[i])) i++;
  const openCh = text[i], closeCh = openCh === '[' ? ']' : '}';
  let depth = 0, j = i, inStr = null, esc = false;
  for (; j < text.length; j++) {
    const c = text[j];
    if (inStr) { if (esc) { esc = false; continue; } if (c === '\\') { esc = true; continue; } if (c === inStr) inStr = null; continue; }
    if (c === '"' || c === "'") { inStr = c; continue; }
    if (c === openCh) depth++;
    else if (c === closeCh) { depth--; if (depth === 0) { j++; break; } }
  }
  const inner = text.slice(i, j);
  const fnCount = (inner.match(/function\s+\w+\s*\(/g) || []).length;
  if (fnCount > 0) throw new Error('var ' + varName + ' 区间含 ' + fnCount + ' 个函数定义，拒绝：' + label);
  return text.slice(0, i) + json + text.slice(j);
}
const t0 = Date.now();
src = replaceVar(src, 'SPECIES', JSON.stringify(speciesOut), '物种表');
console.log('  ✅ SPECIES 已替换（' + ((Date.now() - t0) / 1000).toFixed(1) + 's）');
src = replaceVar(src, 'MOVES', JSON.stringify(movesOut), '招表');
console.log('  ✅ MOVES 已替换');
src = replaceVar(src, 'EVO', JSON.stringify(evoFixed), '进化表');
console.log('  ✅ EVO 已替换');
/* 头像块：多行格式，便于 diff */
const avLines = Object.entries(avatars).map(([id, b64]) => '"' + id + '":"' + b64 + '"');
const avBlock = 'var AVATARS = {\n' + avLines.join(',\n') + '\n};';
const re = /var AVATARS = \{[\s\S]*?\n\};/;
if (!re.test(src)) throw new Error('找不到 AVATARS 块');
src = src.replace(re, avBlock);
console.log('  ✅ AVATARS 已替换（' + Object.keys(avatars).length + ' 张）');

writeFileSync(HTML, src, 'utf8');
console.log('\n写入完成：' + (src.length / 1024 / 1024).toFixed(2) + ' MB');
