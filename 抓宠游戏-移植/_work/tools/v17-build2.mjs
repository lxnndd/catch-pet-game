/* v17 主合并 v2：编号改用「官方图鉴号」做稳定 id（宝可梦用 PokéAPI 图鉴号，洛克用 dvg 编号）
   这样头像文件名与物种 id 天然对齐，且重新构建不会漂移。
   输出（_work/out/）: species-v17.json · moves-v17.json · evo-v17.json · move-conflicts.json
   用法: node v17-build2.mjs */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const ROOT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植';
const D = ROOT + '/_work/v17-data/';
const OUT = ROOT + '/_work/out/';
const AV = ROOT + '/_work/v17-avatars';
mkdirSync(OUT, { recursive: true });

const POOLS = ['p0', 'p15', 'p25', 'p35', 'p45', 'p55', 'p65'];
const TYPES = new Set(['nor', 'fire', 'water', 'grass', 'elec', 'ice', 'fight', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy']);
const TYPE_CN = { nor: '一般', fire: '火', water: '水', grass: '草', elec: '电', ice: '冰', fight: '格斗', poison: '毒', ground: '地面', flying: '飞行', psychic: '超能力', bug: '虫', rock: '岩石', ghost: '幽灵', dragon: '龙', dark: '恶', steel: '钢', fairy: '妖精' };
const HABITAT = {
  nor: ['plain'], fire: ['volcano'], water: ['water', 'ocean'], grass: ['forest', 'flower'], elec: ['mine'],
  ice: ['snow'], fight: ['plain', 'mine'], poison: ['mine', 'forest'], ground: ['desert', 'mine'],
  flying: ['flower', 'forest'], psychic: ['flower'], bug: ['forest'], rock: ['mine', 'desert'],
  ghost: ['mine'], dragon: ['volcano', 'mine'], dark: ['mine', 'desert'], steel: ['mine'], fairy: ['flower'],
};
const LEGEND_HABITAT = { psychic: ['ocean', 'flower'], fire: ['volcano'], water: ['ocean'], dragon: ['volcano', 'ocean'], flying: ['ocean', 'flower'], grass: ['forest'] };

/* 现有游戏（沿用旧招式 id） */
const html = readFileSync(ROOT + '/抓宠游戏-v12-clean.html', 'utf8');
function sliceLiteral(startIdx, text) {
  const t = text || html;
  const open = t.slice(startIdx).search(/[[{]/); const from = startIdx + open;
  const openCh = t[from], closeCh = openCh === '[' ? ']' : '}';
  let depth = 0, i = from, inStr = null, esc = false;
  for (; i < t.length; i++) { const c = t[i];
    if (inStr) { if (esc) { esc = false; continue; } if (c === '\\') { esc = true; continue; } if (c === inStr) inStr = null; continue; }
    if (c === '"' || c === "'") { inStr = c; continue; }
    if (c === openCh) depth++; else if (c === closeCh) { depth--; if (depth === 0) { i++; break; } } }
  return t.slice(from, i);
}
const grab = (n, text) => { const t = text || html; const i = t.indexOf('var ' + n + '='); return i < 0 ? null : new Function('return (' + sliceLiteral(i + ('var ' + n + '=').length, t) + ')')(); };
const OLD_MOVES = grab('MOVES');
const oldMoveByName = {}; Object.values(OLD_MOVES).forEach(m => oldMoveByName[m.name] = m);

/* 编号映射表 */
const pkNameId = JSON.parse(readFileSync(D + 'poke-name-id.json', 'utf8'));
/* PokéAPI 的 zh-hans 有繁简混写错误，这 3 只按大陆官方名的图鉴号硬绑（其余一律走表） */
const PK_ID_OVERRIDE = { '负电拍拍': 312, '缠红鹤': 973, '铁辙迹': 990 };
Object.entries(PK_ID_OVERRIDE).forEach(([n, id]) => { if (!pkNameId[n]) pkNameId[n] = id; });
const rocoNo = existsSync(D + 'roco-name-no.json') ? JSON.parse(readFileSync(D + 'roco-name-no.json', 'utf8')) : {};
/* roco.mjs 自带 kzNo，可补索引表没有的 */
const avatarIds = new Set(existsSync(AV) ? readdirSync(AV).filter(f => f.endsWith('.png')).map(f => f.replace(/\.png$/, '')) : []);
console.log('图鉴号表：宝可梦 ' + Object.keys(pkNameId).length + ' · 洛克 ' + Object.keys(rocoNo).length + ' · 已下头像 ' + avatarIds.size);

/* ── 载入 7 份数据 + 去重 ── */
const FILES = [
  ['poke-kanto-johto.mjs', 'POKE_KANTO_JOHTO', 'pk', '宝可梦·关都城都'],
  ['poke-hoenn-sinnoh.mjs', 'POKE_HOENN_SINNOH', 'pk', '宝可梦·丰缘神奥'],
  ['poke-unova-kalos.mjs', 'POKE_UNOVA_KALOS', 'pk', '宝可梦·合众卡洛斯'],
  ['poke-alola-galar.mjs', 'POKE_ALOLA_GALAR', 'pk', '宝可梦·阿罗拉伽勒尔'],
  ['poke-paldea-legend.mjs', 'POKE_PALDEA_LEGEND', 'pk', '宝可梦·帕底亚传说'],
  ['roco.mjs', 'ROCO', 'kz', '洛克王国'],
];
const raw = [];
for (const [file, name, src, label] of FILES) {
  if (!existsSync(D + file)) { console.log('⏳ 缺 ' + file); continue; }
  try {
    const mod = await import(pathToFileURL(D + file).href);
    (mod[name] || []).forEach(x => raw.push({ ...x, __src: src, __label: label }));
    console.log('  ✅ ' + label.padEnd(18) + String((mod[name] || []).length).padStart(4) + ' 只');
  } catch (e) { console.log('  ❌ ' + label + '：' + String(e.message).slice(0, 90)); }
}
const poolCountOf = (x) => Object.values(x.pools || {}).reduce((a, b) => a + (b ? b.length : 0), 0);
const dedup = new Map();
for (const x of raw) {
  const key = x.__src + '|' + x.n;
  if (!dedup.has(key)) { dedup.set(key, x); continue; }
  const cur = dedup.get(key);
  const preferNew = (x.__label === '宝可梦·帕底亚传说' && cur.__label !== '宝可梦·帕底亚传说') || (poolCountOf(x) > poolCountOf(cur) && cur.__label !== '宝可梦·帕底亚传说');
  if (preferNew) dedup.set(key, x);
}
const raw2 = [...dedup.values()];
console.log('去重后 ' + raw2.length + ' 只（去掉 ' + (raw.length - raw2.length) + ' 条重复收录）');

/* ── 招表 ── */
const moveByName = new Map();
let seq = 0;
function newMoveId(cn) {
  let base = 'mv-' + String(cn).replace(/[^a-zA-Z0-9]/g, '').slice(0, 12).toLowerCase();
  if (!base || base === 'mv-') base = 'mv' + (++seq);
  let id = base, k = 2;
  while (Object.keys(OLD_MOVES).includes(id) || [...moveByName.values()].some(m => m.id === id)) id = base + '-' + (k++);
  return id;
}
const conflicts = [];
for (const x of raw2) {
  for (const k of POOLS) {
    for (const mv of ((x.pools || {})[k] || [])) {
      if (!mv || !mv.m) continue;
      if (!moveByName.has(mv.m)) {
        const old = oldMoveByName[mv.m];
        /* 旧表里可能没有 id、或 id 是 'undefined' 这种坏值（v13 建表遗留），必须兜底重新生成，
           否则会把多个招式写到同一个 "undefined" 键上互相覆盖 */
        const oldId = (old && typeof old.id === 'string' && old.id && old.id !== 'undefined') ? old.id : null;
        moveByName.set(mv.m, {
          id: oldId || newMoveId(mv.m), name: mv.m,
          type: TYPES.has(mv.t) ? mv.t : 'nor',
          power: mv.power || 0,
          pp: (mv.pp === undefined || mv.pp === null) ? 10 : mv.pp,
          acc: (mv.acc === undefined || mv.acc === null) ? 100 : (mv.acc === '-' ? 0 : mv.acc),
          cat: mv.cat || '变化', _from: [x.__label],
        });
      } else {
        const cur = moveByName.get(mv.m);
        cur._from.push(x.__label);
        if ((mv.power || 0) > cur.power) { conflicts.push({ m: mv.m, field: '威力', was: cur.power, now: mv.power, from: x.__label }); cur.power = mv.power || 0; }
        if (mv.pp && mv.pp > cur.pp) cur.pp = mv.pp;
      }
    }
  }
}
console.log('招表 ' + moveByName.size + ' 个（沿用旧 id ' + Object.keys(oldMoveByName).filter(n => moveByName.has(n)).length + ' 个）· 数值冲突 ' + conflicts.length + ' 处');
const typeMoveCount = {};
[...moveByName.values()].forEach(m => typeMoveCount[m.type] = (typeMoveCount[m.type] || 0) + 1);
console.log('五属性招式覆盖：超能力 ' + (typeMoveCount.psychic || 0) + ' · 幽灵 ' + (typeMoveCount.ghost || 0) + ' · 恶 ' + (typeMoveCount.dark || 0) + ' · 钢 ' + (typeMoveCount.steel || 0) + ' · 妖精 ' + (typeMoveCount.fairy || 0));

/* ── 物种表：稳定 id = 图鉴号 ── */
const species = [];
const usedId = new Set();
const nameSeen = new Set();
let noIdList = [];
raw2.sort((a, b) => {              /* 按图鉴号排序，让编号连续好看 */
  const ai = a.__src === 'kz' ? (rocoNo[a.n] || 9000) : (pkNameId[a.n] || 9000);
  const bi = b.__src === 'kz' ? (rocoNo[b.n] || 9000) : (pkNameId[b.n] || 9000);
  return ai - bi;
});
let spare = 8000;
for (const x of raw2) {
  if (!x.n || nameSeen.has(x.__src + x.n)) continue;
  nameSeen.add(x.__src + x.n);
  let num = x.__src === 'kz' ? rocoNo[x.n] : pkNameId[x.n];
  if (!num) { num = ++spare; noIdList.push(x.n); }
  let id = (x.__src === 'kz' ? 'kz-' : 'pk-') + String(num).padStart(3, '0');
  while (usedId.has(id)) id = (x.__src === 'kz' ? 'kz-' : 'pk-') + String(++spare).padStart(3, '0');
  usedId.add(id);
  const types = (x.t || []).filter(t => TYPES.has(t));
  const isLegend = !!x.legendary || /传说|幻之/.test(x.note || '');
  let hab = [];
  types.forEach(t => { (isLegend ? (LEGEND_HABITAT[t] || HABITAT[t]) : HABITAT[t] || []).forEach(h => { if (!hab.includes(h)) hab.push(h); }); });
  if (!hab.length) hab = ['plain'];
  const pools = {};
  POOLS.forEach(k => {
    pools[k] = [...new Set(((x.pools || {})[k] || []).map(mv => moveByName.get(mv.m)).filter(Boolean).map(m => m.id))];
  });
  const hpStat = Number(x.hp || 50);
  species.push({
    id, name: x.n, src: x.__src, kzNo: x.kzNo || undefined,
    type: types[0] || 'nor', type2: types[1] || null,
    hpBase: Math.max(30, Math.min(255, hpStat)),
    rarity: isLegend ? 2 : (hpStat >= 100 ? 1 : 0),
    a: Number(x.atk || 70), d: Number(x.def || 70), s: Number(x.spe || 70),
    spa: Number(x.spa || x.atk || 70), spd: Number(x.spd || x.def || 70),
    pools, habitat: hab, emoji: '❔',
    avatar: avatarIds.has(id), __note: x.note || '',
  });
}
console.log('\n物种表 ' + species.length + ' 只（宝可梦 ' + species.filter(s => s.src === 'pk').length + ' / 洛克 ' + species.filter(s => s.src === 'kz').length + '）');
console.log('无图鉴号、用备用编号的 ' + noIdList.length + ' 只' + (noIdList.length ? '：' + noIdList.slice(0, 10).join('、') : ''));
console.log('有头像 ' + species.filter(s => s.avatar).length + ' · 缺头像 ' + species.filter(s => !s.avatar).length + '：' + species.filter(s => !s.avatar).slice(0, 12).map(s => s.name + '(' + s.id + ')').join('、'));

/* 没技能的物种：从全池兜底（同属性威力最低的招） */
const byTypeMove = {};
[...moveByName.values()].forEach(m => { if (m.power > 0) { (byTypeMove[m.type] = byTypeMove[m.type] || []).push(m); } });
Object.values(byTypeMove).forEach(a => a.sort((x, y) => x.power - y.power));
let fixedNoSkill = 0;
species.forEach(s => {
  const total = POOLS.reduce((a, k) => a + (s.pools[k] || []).length, 0);
  if (total === 0) {
    const pool = (byTypeMove[s.type] || byTypeMove.nor || []).slice(0, 4);
    s.pools.p0 = pool.map(m => m.id);
    fixedNoSkill++;
  } else if (!(s.pools.p0 || []).length) {
    /* p0 空的话，把最早解锁池里的招提到 p0 */
    const firstPk = POOLS.find(k => (s.pools[k] || []).length);
    if (firstPk) { s.pools.p0 = (s.pools[firstPk] || []).slice(0, 4); }
  }
});
console.log('兜底补了 ' + fixedNoSkill + ' 只原本没有任何技能的物种');

/* ── 进化表：分支用 branches；等级缺失的按阶段补 ── */
const byName = {}; species.forEach(s => byName[s.name] = s);
const evo = {};
let evoOk = 0, missTarget = [];
const stageOf = (name) => {
  let depth = 0, cur = name, guard = 0;
  while (guard++ < 10) {
    const parent = raw2.find(x => x.evo && (Array.isArray(x.evo.branches) ? x.evo.branches.some(b => b.to === cur) : (Array.isArray(x.evo.to) ? x.evo.to.includes(cur) : x.evo.to === cur)));
    if (!parent) break;
    depth++; cur = parent.n;
  }
  return depth;
};
for (const x of raw2) {
  if (!x.evo) continue;
  const from = byName[x.n]; if (!from) continue;
  let targets = [];
  if (Array.isArray(x.evo.branches) && x.evo.branches.length) {
    targets = x.evo.branches.map(b => ({ to: b.to, lv: (b.lv === '' || b.lv === undefined || b.lv === null) ? null : Number(b.lv) }));
  } else if (x.evo.to) {
    const tos = Array.isArray(x.evo.to) ? x.evo.to : [x.evo.to];
    const lvs = Array.isArray(x.evo.lv) ? x.evo.lv : [x.evo.lv];
    targets = tos.map((t, i) => ({ to: t, lv: (lvs[i] === undefined || lvs[i] === null || lvs[i] === '') ? null : Number(lvs[i]) }));
  }
  const valid = targets.filter(t => byName[t.to]);
  targets.filter(t => !byName[t.to]).forEach(t => missTarget.push(x.n + '→' + t.to));
  if (!valid.length) continue;
  let lv = valid.every(t => t.lv !== null) ? Math.min(...valid.map(t => t.lv)) : null;
  if (lv === null) { const st = stageOf(x.n); lv = st === 0 ? 30 : (st === 1 ? 42 : 52); }   /* 用户定：全部按等级触发 */
  const toIds = valid.map(t => byName[t.to].id);
  evo[from.id] = { to: toIds.length === 1 ? toIds[0] : toIds, lv, how: '等级', item: '', branchCount: toIds.length };
  evoOk++;
}
const branchCount = Object.values(evo).filter(e => e.branchCount > 1).length;
console.log('进化链 ' + evoOk + ' 条（分支 ' + branchCount + ' 条）· 目标缺失 ' + missTarget.length + ' 处' + (missTarget.length ? '：' + missTarget.slice(0, 6).join('、') : ''));

writeFileSync(OUT + 'species-v17.json', JSON.stringify(species, null, 1), 'utf8');
writeFileSync(OUT + 'moves-v17.json', JSON.stringify([...moveByName.values()], null, 1), 'utf8');
writeFileSync(OUT + 'evo-v17.json', JSON.stringify(evo, null, 1), 'utf8');
writeFileSync(OUT + 'move-conflicts.json', JSON.stringify(conflicts, null, 1), 'utf8');
console.log('\n已写出 out/ 四个文件');
