/* v57：用官方数据重建 MOVE_FX —— 这次把**官方机制真正实现**，而不是按属性兜底
   与 v42 的区别：
     · 新增 volatile 状态字段：畏缩 / 混乱 / 挑衅 / 定身法 / 寄生种子 / 束缚 / 扎根 /
       恶梦 / 回复封锁 / 折磨 / 哈欠 / 灭亡之歌 / 守住 / 无属性免疫（全部对应官方 ailment）
     · 新增 meta.min_hits/max_hits → hits（官方连击次数）
     · 新增 meta.crit_rate（保留）、meta.flinch_chance → flinch
     · 同时输出 **POKE_MOVES**（宝可梦招式名集合）——
       供 fxOf() 判断「这招是宝可梦招式，没有官方附加效果就是没有」，不再用属性兜底硬凑
   用法：node v57-gen-movefx.mjs [--apply] */
import { readFileSync, writeFileSync, readdirSync, copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = ROOT + '/抓宠游戏-v12-clean.html';
const BAK = ROOT + '/抓宠游戏-v12-clean.bak-v57.html';
const CACHE = ROOT + '/_work/sources/宝可梦/poke-cache-kj/json';
const OUT = ROOT + '/_work/out/move-fx.json';
const apply = process.argv.includes('--apply');

const STAT = { attack: 'atk', defense: 'def', 'special-attack': 'spa', 'special-defense': 'spDef', speed: 'spd', accuracy: 'hit', evasion: 'eva' };
const AIL = { poison: 'poison', burn: 'burn', paralysis: 'para', sleep: 'sleep', freeze: 'freeze' };
/* 官方 volatile ailment → 本作字段（val 为持续回合；chance:true 表示用 ailment_chance 当概率） */
const VOL = {
  confusion: { k: 'confuse', chance: true },
  taunt: { k: 'taunt', val: 3 },
  disable: { k: 'disable', val: 4 },
  'leech-seed': { k: 'seed' },
  trap: { k: 'trap' },
  ingrain: { k: 'ingrain' },
  nightmare: { k: 'nightmare' },
  'heal-block': { k: 'healBlock', val: 5 },
  torment: { k: 'torment' },
  yawn: { k: 'yawn' },
  'perish-song': { k: 'perish' },
  protect: { k: 'protect' },
  'no-type-immunity': { k: 'noImmune', val: 1 }
};
const USER_TARGETS = new Set(['user', 'user-and-allies', 'users-field']);
const RENAME = { '空气斩': '空气之刃', '鬼面': '可怕面孔', '炼狱': '烈火深渊' };
/* ══ PokéAPI 没有建模、但**官方机制明确**的招式 —— 按官方手工补上（不是编造）══
   （PokéAPI 把它们归在 category=unique 里，ailment=none、stat_changes 为空） */
const MANUAL = {
  '萤火': { buff: { spa: 3 } },                       /* Tail Glow：特攻 +3 */
  '挑衅': { taunt: 3 },                               /* Taunt：3 回合内对手只能使用攻击招式 */
  '聚气': { buff: { crit: 2 } },                      /* Focus Energy：暴击等级 +2 */
  '睡觉': { heal: 1, selfSleep: 2 },                  /* Rest：回满 HP，并睡 2 回合 */
  '白雾': { mist: 5 },                                /* Mist：5 回合内能力不会被对手降低 */
  '治愈之愿': { selfFaint: true, teamHeal: 1 },        /* Healing Wish：自己倒下，回复之后上场的伙伴 */
  '瞬间移动': { escape: true },                        /* Teleport：立刻从战斗中脱离 */
  /* ── v62：用户点名的几个 + 同类条件机制（官方效果明确、PokéAPI 没建模）── */
  '挺住': { endure: true },                            /* Endure：受到致命伤害时至少留下 1 HP */
  '致命针刺': { onKO: { buff: { atk: 3 } } },           /* Fell Stinger：击倒对手则自身攻击大幅提升 */
  '蛮干': { endeavor: true },                          /* Endeavor：把对手 HP 拉低到与自己相同 */
  '地球上投': { fixedDamage: 'level' },                 /* Seismic Toss：伤害 = 自身等级 */
  '黑夜魔影': { fixedDamage: 'level' },                 /* Night Shade：同上 */
  '地裂': { ohko: true }, '断头钳': { ohko: true }, '角钻': { ohko: true }, '绝对零度': { ohko: true },
  /* ── v69：剩余机制（场地 / 反击 / 蓄力 / 鼓腹 / 查封 / 交换场地 / 双打改写）── */
  '光墙': { field: { k: 'ls', n: 5, txt: '🌈 光墙升起，5 回合内特殊伤害减半！' } },
  '反射壁': { field: { k: 'rf', n: 5, txt: '🧱 反射壁升起，5 回合内物理伤害减半！' } },
  '神秘守护': { field: { k: 'sg', n: 5, txt: '✨ 神秘守护展开，5 回合内不会陷入异常状态！' } },
  '顺风': { field: { k: 'tw', n: 4, txt: '💨 顺风吹起，4 回合内速度翻倍！' } },
  '幸运咒语': { field: { k: 'lc', n: 5, txt: '🍀 幸运咒语生效，5 回合内不会被击中要害！' } },
  '撒菱': { hazard: { k: 'spikes', txt: '🔺 在对手场上撒下了菱！' } },
  '隐形岩': { hazard: { k: 'sr', txt: '🪨 在对手场上布下了隐形岩！' } },
  '毒菱': { hazard: { k: 'ts', txt: '☠️ 在对手场上撒下了毒菱！' } },
  '黏黏网': { hazard: { k: 'web', txt: '🕸 在对手场上布下了黏黏网！' } },
  '反击': { counter: 'physical' }, '双倍奉还': { counter: 'physical' }, '镜面反射': { counter: 'special' },
  '鼓腹': { bellyDrum: true },
  '查封': { embargo: 5 },
  '交换场地': { swapStages: true },
  '点穴': { acuRandom: true }, '帮助': { helping: true }, '抢先一步': { meFirst: true },
  /* 蓄力招（官方 flag=charge，PokéAPI 没建模） */
  '日光束': { charge: true }, '阳光烈焰': { charge: true }, '飞翔': { charge: true }, '挖洞': { charge: true },
  '潜水': { charge: true }, '神鸟猛击': { charge: true }, '火箭头锤': { charge: true },
  '幽灵潜行': { charge: true }, '暗影潜袭': { charge: true }, '自由落体': { charge: true },
  /* ── v75：掉包封闭 · 地狱突刺 · 击落 · 意念移物 · 三重攻击 · 滚动/冰球 ── */
  '掉包': { blocked: '官方是与对手交换持有道具，本作没有道具系统（招式已占位保留）' },
  '戏法': { blocked: '官方是与对手交换持有道具，本作没有道具系统（招式已占位保留）' },
  '地狱突刺': { silence: 2 },
  '击落': { breakAir: true },
  '意念移物': { telekinesis: 3 },
  '三重攻击': { triStatus: 0.2 },
  '滚动': { rollout: true },
  '冰球': { rollout: true },
  /* ── v78：固定伤害类 + 体重类（官方效果明确，而 PokéAPI 的 power 是 null）── */
  '龙之怒': { fixedDamage: 40 },                       /* Dragon Rage：固定 40 点伤害 */
  '音爆': { fixedDamage: 20 },                         /* Sonic Boom：固定 20 点伤害 */
  '重磅冲撞': { weightHeavy: true },                    /* Heavy Slam：自己越重威力越大（40~120） */
  '踢倒': { weightLight: true },                        /* Low Kick：对手越重威力越大（20~120） */
  /* ── v93：变身 ── */
  '变身': { transform: true }                           /* Transform：变成对手的样子，复制其物种与招式 */
};

function lit(text, name) {
  const at = text.indexOf('var ' + name + '=');
  if (at < 0) throw new Error('找不到 var ' + name + '=');
  let j = text.indexOf('=', at) + 1;
  while (/\s/.test(text[j])) j++;
  const open = text[j], close = open === '[' ? ']' : (open === '(' ? ')' : '}');
  let depth = 0, inStr = false, q = '', esc = false, k = j;
  for (; k < text.length; k++) {
    const c = text[k];
    if (inStr) { if (esc) { esc = false; continue; } if (c === '\\') { esc = true; continue; } if (c === q) inStr = false; continue; }
    if (c === '"' || c === "'") { inStr = true; q = c; continue; }
    if (c === open) depth++;
    else if (c === close) { depth--; if (depth === 0) { k++; break; } }
  }
  return { start: j, end: k, value: new Function('return (' + text.slice(j, k) + ')')() };
}

const src = readFileSync(FILE, 'utf8');
const oldFX = lit(src, 'MOVE_FX').value;
const MAP = JSON.parse(readFileSync(ROOT + '/_work/out/pokeapi-move-map.json', 'utf8'));
const files = readdirSync(CACHE).filter(f => /^move-.*\.json$/.test(f));

const official = {};
const pokeNames = [];
const stats = { stat: 0, ail: 0, vol: 0, flinch: 0, heal: 0, drain: 0, crit: 0, hits: 0, empty: 0 };
for (const f of files) {
  let o; try { o = JSON.parse(readFileSync(CACHE + '/' + f, 'utf8')); } catch (e) { continue; }
  const hit = MAP[o.name]; if (!hit) continue;
  const zh = RENAME[hit.zh] || hit.zh;
  pokeNames.push(zh);
  const meta = o.meta || {};
  const toUser = USER_TARGETS.has((o.target || {}).name);
  const cat = (meta.category && meta.category.name) || '';
  /* ══ v60：能力变化的**方向**要用 category 判定，不能只信 target ══
     PokéAPI 把「攻击后自己能力发生变化」的招（damage-raise）的 target 一律标成
     selected-pokemon，于是「增强拳（自己攻击 +1）」被生成成「对手 攻击 -1」。
     实测有 16 条招方向全反（增强拳/近身战/臂锤/蛮力/飞叶风暴/过热/金属爪/彗星拳/
     钢翼/充电光束/蓄能焰袭/高速旋转/原始之力/奇异之风/银色旋风/耕地）。 */
  const scList = o.stat_changes || [];
  let dir = null;                                   /* 'buff'（自己）| 'debuff'（对手）| null（交给 target） */
  if (cat === 'damage-raise') dir = 'buff';
  else if (cat === 'damage-lower') dir = 'debuff';
  else if (cat === 'net-good-stats') dir = scList.every(s => s.change > 0) ? 'buff' : (scList.every(s => s.change < 0) ? 'debuff' : null);
  else if (cat === 'net-bad-stats') dir = scList.every(s => s.change < 0) ? 'debuff' : null;
  const buff = {}, debuff = {};
  scList.forEach(s => {
    const k = STAT[s.stat.name]; if (!k) return;
    const asBuff = (dir === 'buff') ? true : (dir === 'debuff' ? false : toUser);
    if (asBuff) buff[k] = (buff[k] || 0) + s.change;
    else debuff[k] = (debuff[k] || 0) + (-s.change);
  });
  Object.keys(buff).forEach(k => { if (!buff[k]) delete buff[k]; });
  Object.keys(debuff).forEach(k => { if (!debuff[k]) delete debuff[k]; });

  const fx = {};
  if (Object.keys(buff).length) { fx.buff = buff; stats.stat++; }
  if (Object.keys(debuff).length) { fx.debuff = debuff; stats.stat++; }
  if (fx.buff || fx.debuff) {
    const sc = meta.stat_chance || 0;
    if (sc > 0 && sc < 100) fx.statChance = sc;
  }
  const an = meta.ailment && meta.ailment.name;
  if (an && AIL[an]) {
    fx.status = { k: AIL[an] };
    const ch = meta.ailment_chance || 0;
    if (ch > 0 && ch < 100) fx.status.chance = ch / 100;
    stats.ail++;
  } else if (an && VOL[an]) {
    const v = VOL[an];
    if (v.chance) {
      const ch = meta.ailment_chance || 0;
      fx[v.k] = (ch > 0 && ch < 100) ? (ch / 100) : 1;
    } else {
      fx[v.k] = (v.val === undefined) ? true : v.val;
    }
    stats.vol++;
  }
  if (meta.flinch_chance > 0) { fx.flinch = meta.flinch_chance / 100; stats.flinch++; }
  if (meta.healing > 0) { fx.heal = meta.healing / 100; stats.heal++; }
  if (meta.drain > 0) { fx.drain = meta.drain / 100; stats.drain++; }
  if (meta.crit_rate > 0) { fx.critRate = meta.crit_rate; stats.crit++; }
  /* 连击：官方 min_hits/max_hits。注意排除 power 为空的（如「围攻」是"队友各打一次"，
     本作没有队伍成员参战的概念，给了 hits 反而会变成 0 伤害的连击） */
  if (meta.min_hits > 0 && meta.max_hits >= meta.min_hits && o.power > 0) { fx.hits = [meta.min_hits, meta.max_hits]; stats.hits++; }

  if (Object.keys(fx).length) official[zh] = fx; else stats.empty++;
}

/* 洛克招（不在映射表里）保留旧手工配置 —— 它们本来就没有官方数据，不算"编造" */
const pokeSet = new Set(pokeNames);
const out = Object.assign({}, official);
let nKz = 0;
Object.keys(oldFX).forEach(n => { if (!pokeSet.has(n)) { out[n] = oldFX[n]; nKz++; } });
Object.keys(MANUAL).forEach(n => { out[n] = MANUAL[n]; });

console.log('宝可梦招式（映射表命中）：' + pokeNames.length + ' 条');
console.log('生成有效果的：' + Object.keys(official).length +
  '（能力变化 ' + stats.stat + ' · 异常 ' + stats.ail + ' · volatile ' + stats.vol +
  ' · 畏缩 ' + stats.flinch + ' · 回复 ' + stats.heal + ' · 吸血 ' + stats.drain +
  ' · 高暴击 ' + stats.crit + ' · 连击 ' + stats.hits + '）');
console.log('官方没有任何可实现效果的宝可梦招式：' + stats.empty + ' 条（这些在本作里就是"暂无附加效果"，不再硬凑）');
console.log('洛克招式保留旧配置：' + nKz + ' 条 · 手工兜底 ' + Object.keys(MANUAL).length + ' 条');
console.log('新表条目合计：' + Object.keys(out).length);
console.log('\n新增 volatile 的招式抽查：');
['挑衅', '定身法', '寄生种子', '扎根', '恶梦', '回复封锁', '无理取闹', '哈欠', '灭亡之歌', '守住', '看穿', '识破', '奇异之光', '空气之刃', '火焰牙'].forEach(n => {
  console.log('   ' + n.padEnd(8) + ' → ' + (out[n] ? JSON.stringify(out[n]) : '（无附加效果）'));
});

/* v57：先制度（官方 priority）—— 只收集非 0 的，供出手顺序判定 */
const priMap = {};
files.forEach(f => {
  let o; try { o = JSON.parse(readFileSync(CACHE + '/' + f, 'utf8')); } catch (e) { return; }
  const hit = MAP[o.name]; if (!hit) return;
  if (o.priority) priMap[hit.id] = o.priority;
});
const payload = JSON.stringify(out);
const pokePayload = JSON.stringify(pokeNames);
const priPayload = JSON.stringify(priMap);
writeFileSync(OUT, payload, 'utf8');
console.log('先制招式（官方 priority ≠ 0）：' + Object.keys(priMap).length + ' 条');
console.log('\n已写出 → ' + OUT);
if (!apply) { console.log('（未加 --apply，仅预演）'); process.exit(0); }

if (!existsSync(BAK)) { copyFileSync(FILE, BAK); console.log('已备份 → ' + BAK); }
const eol = src.includes('\r\n') ? '\r\n' : '\n';
let work = src.split('\r\n').join('\n');
/* 1) 替换 MOVE_FX */
let at = lit(work, 'MOVE_FX');
work = work.slice(0, at.start) + payload + work.slice(at.end);
/* 2) 写入 POKE_MOVES（宝可梦招式名集合）+ MOVE_PRI（先制度） */
const pokeDecl = '\n/* v57：宝可梦招式名集合 —— fxOf() 用它判断「该招无官方附加效果时就是没有」，不再属性兜底 */\nvar POKE_MOVES=(function(){ var o={}; ' +
  pokePayload + '.forEach(function(n){ o[n]=1; }); return o; })();\n' +
  '/* v57：官方先制度（priority ≠ 0 的招式）—— 出手顺序先比它、再比速度 */\nvar MOVE_PRI=' + priPayload + ';\n';
if (work.indexOf('var POKE_MOVES=') >= 0) {
  const at2 = lit(work, 'POKE_MOVES');
  const lineStart = work.lastIndexOf('\nvar POKE_MOVES=', at2.start);
  let endPos = at2.end;
  if (work.indexOf('var MOVE_PRI=') >= 0) {
    const at3 = lit(work, 'MOVE_PRI');
    const l3 = work.lastIndexOf('\nvar MOVE_PRI=', at3.start);
    endPos = Math.max(endPos, at3.end);
    /* 连同中间注释一起替换 */
    work = work.slice(0, lineStart) + pokeDecl + work.slice(endPos);
  } else {
    work = work.slice(0, lineStart) + pokeDecl + work.slice(endPos);
  }
} else {
  const anchor = work.indexOf('\n', lit(work, 'MOVE_FX').end);
  work = work.slice(0, anchor) + pokeDecl + work.slice(anchor);
}
writeFileSync(FILE, eol === '\r\n' ? work.split('\n').join('\r\n') : work, 'utf8');
console.log('已写入 ' + FILE + '（' + Buffer.byteLength(work, 'utf8') + ' 字节）');
