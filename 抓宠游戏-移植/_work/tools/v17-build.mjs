/* v17 主合并：6 份查证数据 → 新物种表 + 新招表 + 进化表（剔除帕鲁）
   输出（全部在 _work/out/）:
     species-v17.json  物种表（含 pools 七池、头像 id）
     moves-v17.json    招表（统一数值 + 各来源差异记录）
     evo-v17.json      进化表
   用法: node v17-build.mjs */
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
/* 栖息地：按属性 + 名字特征给（沿用现有游戏的九地区体系） */
const HABITAT = {
  nor: ['plain'], fire: ['volcano'], water: ['water', 'ocean'], grass: ['forest', 'flower'], elec: ['mine'],
  ice: ['snow'], fight: ['plain', 'mine'], poison: ['mine', 'forest'], ground: ['desert', 'mine'],
  flying: ['flower', 'forest'], psychic: ['flower'], bug: ['forest'], rock: ['mine', 'desert'],
  ghost: ['mine'], dragon: ['volcano', 'mine'], dark: ['mine', 'desert'], steel: ['mine'], fairy: ['flower'],
};
const LEGEND_HABITAT = { psychic: ['ocean', 'flower'], fire: ['volcano'], water: ['ocean'], dragon: ['volcano', 'ocean'], flying: ['ocean', 'flower'], grass: ['forest'] };

/* ── 读现有游戏：招式中文名→id、物种 id 规则 ── */
const html = readFileSync(ROOT + '/抓宠游戏-v12-clean.html', 'utf8');
function sliceLiteral(startIdx) {
  const open = html.slice(startIdx).search(/[[{]/); const from = startIdx + open;
  const openCh = html[from], closeCh = openCh === '[' ? ']' : '}';
  let depth = 0, i = from, inStr = null, esc = false;
  for (; i < html.length; i++) { const c = html[i];
    if (inStr) { if (esc) { esc = false; continue; } if (c === '\\') { esc = true; continue; } if (c === inStr) inStr = null; continue; }
    if (c === '"' || c === "'") { inStr = c; continue; }
    if (c === openCh) depth++; else if (c === closeCh) { depth--; if (depth === 0) { i++; break; } } }
  return html.slice(from, i);
}
const grab = (n) => { const i = html.indexOf('var ' + n + '='); return i < 0 ? null : new Function('return (' + sliceLiteral(i + ('var ' + n + '=').length) + ')')(); };
const OLD_MOVES = grab('MOVES'), OLD_SPECIES = grab('SPECIES');
const oldMoveByName = {};                    /* 中文名 → 现有招式 id（保留 id 稳定，存档兼容） */
Object.values(OLD_MOVES).forEach(m => { oldMoveByName[m.name] = m; });
console.log('现有招表 ' + Object.keys(OLD_MOVES).length + ' 个 · 现有物种 ' + OLD_SPECIES.length + ' 条');

/* 已有头像（按游戏物种 id 命名） */
const avatarIds = new Set(existsSync(AV) ? readdirSync(AV).filter(f => f.endsWith('.png')).map(f => f.replace(/\.png$/, '')) : []);
console.log('已下载头像 ' + avatarIds.size + ' 张');

/* ── 载入 6 份数据 ── */
const FILES = [
  ['poke-kanto-johto.mjs', 'POKE_KANTO_JOHTO', 'pk', '宝可梦·关都城都'],
  ['poke-patch-12.mjs', 'POKE_PATCH_12', 'pk', '宝可梦·补齐12只'],
  ['poke-hoenn-sinnoh.mjs', 'POKE_HOENN_SINNOH', 'pk', '宝可梦·丰缘神奥'],
  ['poke-unova-kalos.mjs', 'POKE_UNOVA_KALOS', 'pk', '宝可梦·合众卡洛斯'],
  ['poke-alola-galar.mjs', 'POKE_ALOLA_GALAR', 'pk', '宝可梦·阿罗拉伽勒尔'],
  ['poke-paldea-legend.mjs', 'POKE_PALDEA_LEGEND', 'pk', '宝可梦·帕底亚传说'],
  ['roco.mjs', 'ROCO', 'kz', '洛克王国'],
];
const raw = [];
for (const [file, name, src, label] of FILES) {
  if (!existsSync(D + file)) { console.log('⏳ 缺文件 ' + file); continue; }
  try {
    const mod = await import(pathToFileURL(D + file).href);
    const arr = mod[name] || [];
    arr.forEach(x => raw.push({ ...x, __src: src, __label: label }));
    console.log('  ✅ ' + label.padEnd(18) + String(arr.length).padStart(4) + ' 只');
  } catch (e) { console.log('  ❌ ' + label + '：' + String(e.message).slice(0, 90)); }
}
console.log('合计原始条目 ' + raw.length);

/* ── 去重：宝可梦内部同一只可能被多个子代理收录（帕底亚那路覆盖了历代传说）；
        洛克与宝可梦允许同名（是两个不同世界的宠物） ── */
const poolCountOf = (x) => Object.values(x.pools || {}).reduce((a, b) => a + (b ? b.length : 0), 0);
const dedup = new Map();                       /* key = 来源 + 名字 */
const dupInfo = [];
for (const x of raw) {
  const key = x.__src + '|' + x.n;
  if (!dedup.has(key)) { dedup.set(key, x); continue; }
  const cur = dedup.get(key);
  /* 取舍：帕底亚传说那路是 4 源交叉 + 大陆官方译名，优先；否则取招式池更全的 */
  const preferNew = (x.__label === '宝可梦·帕底亚传说' && cur.__label !== '宝可梦·帕底亚传说')
    || (poolCountOf(x) > poolCountOf(cur) && cur.__label !== '宝可梦·帕底亚传说');
  if (preferNew) { dupInfo.push([x.n, cur.__label + '(' + poolCountOf(cur) + ')', x.__label + '(' + poolCountOf(x) + ')']); dedup.set(key, x); }
  else dupInfo.push([x.n, cur.__label + '(保留)', x.__label + '(' + poolCountOf(x) + ')']);
}
const rawDedup = [...dedup.values()];
const crossName = {};                          /* 宝可梦与洛克同名的，列出来备查 */
rawDedup.forEach(x => { if (x.__src === 'pk') { crossName[x.n] = crossName[x.n] || {}; crossName[x.n].pk = 1; } else { crossName[x.n] = crossName[x.n] || {}; crossName[x.n].kz = 1; } });
const bothSides = Object.entries(crossName).filter(([, v]) => v.pk && v.kz).map(([k]) => k);
console.log('\n去重：' + raw.length + ' → ' + rawDedup.length + ' 只（去掉 ' + (raw.length - rawDedup.length) + ' 条重复收录）');
console.log('宝可梦与洛克同名（两个世界的不同宠物，都保留）：' + bothSides.length + ' 个' + (bothSides.length ? '：' + bothSides.slice(0, 20).join('、') : ''));
const raw2 = rawDedup;

/* ── 招表：以中文名为主键，统一数值（同一招式多处出现取「威力优先、最新世代数值」）── */
const moveByName = new Map();
let moveIdSeq = 0;
function slug(s) { return String(s).replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || ('m' + (++moveIdSeq)); }
const usedIds = new Set(Object.keys(OLD_MOVES));
function newMoveId(cnName, cat, t) {
  let base = 'mv-' + (slug(cnName).slice(0, 14) || String(++moveIdSeq));
  let id = base, k = 2;
  while (usedIds.has(id)) id = base + '-' + (k++);
  usedIds.add(id);
  return id;
}
const conflicts = [];
for (const x of raw2) {
  for (const k of POOLS) {
    for (const mv of ((x.pools || {})[k] || [])) {
      if (!mv || !mv.m) continue;
      const key = mv.m;
      if (!moveByName.has(key)) {
        const old = oldMoveByName[key];
        moveByName.set(key, {
          id: old ? old.id : newMoveId(key, mv.cat, mv.t),
          name: key,
          type: TYPES.has(mv.t) ? mv.t : 'nor',
          power: mv.power || 0,
          pp: mv.pp === undefined || mv.pp === null ? 10 : mv.pp,
          acc: mv.acc === undefined || mv.acc === null ? 100 : (mv.acc === '-' ? 0 : mv.acc),
          cat: mv.cat || '变化',
          _from: [x.__label],
          _vals: [[x.__label, mv.power, mv.pp, mv.acc, mv.cat]],
        });
      } else {
        const cur = moveByName.get(key);
        cur._from.push(x.__label);
        cur._vals.push([x.__label, mv.power, mv.pp, mv.acc, mv.cat]);
        /* 数值差异记录 + 取更合理者（威力取最大、PP 取最大，避免同一招两套数值） */
        if ((mv.power || 0) > cur.power) { conflicts.push({ m: key, field: '威力', was: cur.power, now: mv.power, from: x.__label }); cur.power = mv.power || 0; }
        if (mv.pp && mv.pp > cur.pp) { cur.pp = mv.pp; }
        if (mv.cat && cur.cat !== mv.cat) { conflicts.push({ m: key, field: '类别', was: cur.cat, now: mv.cat, from: x.__label }); }
      }
    }
  }
}
console.log('\n招表：' + moveByName.size + ' 个招式（现有 ' + Object.keys(OLD_MOVES).length + ' 个沿用旧 id，新增 ' + (moveByName.size - Object.keys(oldMoveByName).filter(n => moveByName.has(n)).length) + ' 个）');
console.log('数值冲突 ' + conflicts.length + ' 处（威力差异已取最大）');

/* 每个属性的招式数（检查 5 个原本空缺的属性） */
const typeMoveCount = {};
[...moveByName.values()].forEach(m => typeMoveCount[m.type] = (typeMoveCount[m.type] || 0) + 1);
console.log('各属性招式数：' + Object.entries(typeMoveCount).sort((a, b) => b[1] - a[1]).map(([t, n]) => (TYPE_CN[t] || t) + n).join(' · '));

/* ── 物种表：宝可梦 + 洛克，剔除帕鲁；按来源编号 pk-001 / kz-001 ── */
const NO_AVATAR_DROP = [];   /* 没头像被丢弃的 */
const species = [];
let pkN = 0, kzN = 0;
const pad = (n) => String(n).padStart(3, '0');
for (const x of raw2) {
  if (!x.n) continue;
  const id = x.__src === 'kz' ? ('kz-' + pad(++kzN)) : ('pk-' + pad(++pkN));
  const types = (x.t || []).filter(t => TYPES.has(t));
  const isLegend = !!x.legendary || (x.note && /传说|幻之/.test(x.note)) || false;
  /* 栖息地 */
  let hab = [];
  types.forEach(t => { (isLegend ? (LEGEND_HABITAT[t] || HABITAT[t]) : HABITAT[t] || []).forEach(h => { if (!hab.includes(h)) hab.push(h); }); });
  if (!hab.length) hab = ['plain'];
  /* 技能池 → 招式 id */
  const pools = {};
  POOLS.forEach(k => {
    pools[k] = ((x.pools || {})[k] || []).map(mv => moveByName.get(mv.m)).filter(Boolean).map(m => m.id);
    pools[k] = [...new Set(pools[k])];
  });
  const avatar = avatarIds.has(id);
  if (!avatar) NO_AVATAR_DROP.push(x.n + '(' + id + ')');
  const hpStat = Number(x.hp || 50);
  species.push({
    id, name: x.n, src: x.__src,
    type: types[0] || 'nor', type2: types[1] || null,
    hpBase: Math.max(30, Math.min(255, hpStat)),
    rarity: isLegend ? 2 : (hpStat >= 100 ? 1 : 0),
    a: Number(x.atk || 70), d: Number(x.def || 70), s: Number(x.spe || 70),
    spa: Number(x.spa || x.atk || 70), spd: Number(x.spd || x.def || 70),
    pools, habitat: hab, emoji: '❔', avatar,
    __note: x.note || '',
  });
}
console.log('\n物种表：' + species.length + ' 只（宝可梦 ' + species.filter(s => s.src === 'pk').length + ' / 洛克 ' + species.filter(s => s.src === 'kz').length + '）');
console.log('没头像会被排除的 ' + NO_AVATAR_DROP.length + ' 只' + (NO_AVATAR_DROP.length ? '：' + NO_AVATAR_DROP.slice(0, 15).join('、') + (NO_AVATAR_DROP.length > 15 ? ' …' : '') : ' ✅ 全部有头像'));

/* ── 进化表 ──
   注意：分支进化的源数据写法是 evo.to = "霸王花／美丽花"（一个字符串！），
   真正的分支信息在 evo.branches[]，所以必须优先读 branches，否则整条链会被丢掉。 */
const evo = {};
const byName = {}; species.forEach(s => byName[s.name] = s);
let evoOk = 0, evoMissingTarget = [], evoBranchesUsed = 0;
for (const x of raw2) {
  if (!x.evo) continue;
  const from = byName[x.n]; if (!from) continue;
  let targets = [];
  if (Array.isArray(x.evo.branches) && x.evo.branches.length) {
    evoBranchesUsed++;
    targets = x.evo.branches.map(b => ({
      to: b.to,
      lv: (b.lv === '' || b.lv === undefined || b.lv === null) ? null : Number(b.lv),
      how: b.how || '等级', item: b.item || '',
    }));
  } else if (x.evo.to) {
    const tos = Array.isArray(x.evo.to) ? x.evo.to : [x.evo.to];
    const lvs = Array.isArray(x.evo.lv) ? x.evo.lv : [x.evo.lv];
    targets = tos.map((t, i) => ({ to: t, lv: (lvs[i] === undefined || lvs[i] === null || lvs[i] === '') ? null : Number(lvs[i]), how: x.evo.how || '等级', item: x.evo.item || '' }));
  }
  if (!targets.length) continue;
  const valid = targets.filter(t => byName[t.to]);
  targets.filter(t => !byName[t.to]).forEach(t => evoMissingTarget.push(x.n + '→' + t.to));
  if (!valid.length) continue;
  /* 等级：所有分支都是等级进化时取最小等级；含道具/通信/友好度的分支留 null（游戏不自动触发） */
  const lvs = valid.map(t => t.lv).filter(v => v !== null && !isNaN(v));
  const allLevel = lvs.length === valid.length && lvs.length > 0;
  const toIds = valid.map(t => byName[t.to].id);
  evo[from.id] = {
    to: toIds.length === 1 ? toIds[0] : toIds,
    lv: allLevel ? Math.min(...lvs) : null,
    how: valid[0].how || '等级',
    item: valid[0].item || '',
    allLevel: allLevel,
    branchCount: toIds.length,
  };
  evoOk++;
}
const branchChains = Object.values(evo).filter(e => e.branchCount > 1).length;
const levelChains = Object.values(evo).filter(e => e.allLevel).length;
console.log('进化链 ' + evoOk + ' 条（含分支 ' + evoBranchesUsed + ' 条）· 目标缺失 ' + evoMissingTarget.length + ' 处' + (evoMissingTarget.length ? '：' + evoMissingTarget.slice(0, 8).join('、') : ''));
console.log('  纯等级进化 ' + levelChains + ' 条 · 分支进化 ' + branchChains + ' 条 · 需道具/通信/友好度 ' + (evoOk - levelChains) + ' 条');

writeFileSync(OUT + 'species-v17.json', JSON.stringify(species, null, 1), 'utf8');
writeFileSync(OUT + 'moves-v17.json', JSON.stringify([...moveByName.values()], null, 1), 'utf8');
writeFileSync(OUT + 'evo-v17.json', JSON.stringify(evo, null, 1), 'utf8');
writeFileSync(OUT + 'move-conflicts.json', JSON.stringify(conflicts, null, 1), 'utf8');
console.log('\n已写出：out/species-v17.json · moves-v17.json · evo-v17.json · move-conflicts.json');
