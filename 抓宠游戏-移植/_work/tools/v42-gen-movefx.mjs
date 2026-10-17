/* v42：用 PokéAPI 的官方效果数据重建 MOVE_FX（招式附加效果表）
   数据字段：stat_changes（能力变化）· meta.stat_chance（触发概率）· meta.ailment（异常）
             meta.healing（变化技回复）· meta.drain（吸血）· meta.crit_rate（高暴击）· meta.category
   三条规则：
     ① **宝可梦招式以官方为准**：官方有效果 → 用官方；官方明确「无附加效果」（category=damage 等）→ 旧手工效果作废
     ② 官方**没建模**的独特机制（category=unique / field-effect，如聚气、睡觉、守住、白雾）→ 保留旧手工配置，
        否则这些招会变成「放了没用」
     ③ 洛克招式 PokéAPI 没有数据 → 保留旧手工配置
   另修：映射表用的是 v35c 之前的旧译名（鬼面/空气斩/炼狱），这里按游戏内现行译名对齐
   用法：node v42-gen-movefx.mjs [--apply] */
import { readFileSync, writeFileSync, readdirSync, copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = ROOT + '/抓宠游戏-v12-clean.html';
const BAK = ROOT + '/抓宠游戏-v12-clean.bak-v42.html';
const CACHE = ROOT + '/_work/sources/宝可梦/poke-cache-kj/json';
const OUT = ROOT + '/_work/out/move-fx.json';
const apply = process.argv.includes('--apply');

const STAT = { attack: 'atk', defense: 'def', 'special-attack': 'spa', 'special-defense': 'spDef', speed: 'spd', accuracy: 'hit', evasion: 'eva' };
const AIL = { poison: 'poison', burn: 'burn', paralysis: 'para', sleep: 'sleep', freeze: 'freeze' };
const USER_TARGETS = new Set(['user', 'user-and-allies', 'users-field']);
const RENAME = { '空气斩': '空气之刃', '鬼面': '可怕面孔', '炼狱': '烈火深渊' };   /* v35c 改过译名，映射表还是旧名 */
const KEEP_CATEGORIES = new Set(['unique', 'field-effect']);                    /* 官方没建模的独特机制 */
/* 官方数据查不到、但已知官方效果的个别招（PokéAPI 的中文映射表里没有它们） */
const MANUAL = {
  '萤火': { buff: { spa: 3 } },     /* Tail Glow：官方特攻 +3（第 5 世代起） */
};

function lit(text, name) {
  const at = text.indexOf('var ' + name + '=');
  if (at < 0) throw new Error('找不到 var ' + name + '=');
  let j = text.indexOf('=', at) + 1;
  while (/\s/.test(text[j])) j++;
  const open = text[j], close = open === '[' ? ']' : '}';
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

const official = {};        /* 官方有效果的（游戏内译名索引） */
const cleared = new Set();  /* 官方明确「无附加效果」→ 旧手工效果作废 */
let nStat = 0, nAil = 0, nHeal = 0, nDrain = 0, nChance = 0, nCrit = 0, nKeptUnique = 0;
for (const f of files) {
  let o; try { o = JSON.parse(readFileSync(CACHE + '/' + f, 'utf8')); } catch (e) { continue; }
  const hit = MAP[o.name]; if (!hit) continue;
  const zh = RENAME[hit.zh] || hit.zh;
  const meta = o.meta || {};
  const cat = (meta.category && meta.category.name) || '';
  const toUser = USER_TARGETS.has((o.target || {}).name);

  const buff = {}, debuff = {};
  (o.stat_changes || []).forEach(s => {
    const k = STAT[s.stat.name];
    if (!k) return;
    if (toUser) buff[k] = (buff[k] || 0) + s.change;
    else debuff[k] = (debuff[k] || 0) + (-s.change);
  });
  Object.keys(buff).forEach(k => { if (!buff[k]) delete buff[k]; });
  Object.keys(debuff).forEach(k => { if (!debuff[k]) delete debuff[k]; });

  const fx = {};
  if (Object.keys(buff).length) fx.buff = buff;
  if (Object.keys(debuff).length) fx.debuff = debuff;
  if (fx.buff || fx.debuff) {
    const sc = meta.stat_chance || 0;
    if (sc > 0 && sc < 100) { fx.statChance = sc; nChance++; }
    nStat++;
  }
  const ail = meta.ailment && AIL[meta.ailment.name] ? AIL[meta.ailment.name] : null;
  if (ail) {
    fx.status = { k: ail };
    const ch = meta.ailment_chance || 0;
    if (ch > 0 && ch < 100) fx.status.chance = ch / 100;
    nAil++;
  }
  if (meta.healing > 0) { fx.heal = meta.healing / 100; nHeal++; }
  if (meta.drain > 0) { fx.drain = meta.drain / 100; nDrain++; }
  if (meta.crit_rate > 0) { fx.critRate = meta.crit_rate; nCrit++; }

  if (fx.buff || fx.debuff || fx.status || fx.heal || fx.drain || fx.critRate) {
    official[zh] = fx;
  } else if (!KEEP_CATEGORIES.has(cat)) {
    cleared.add(zh);        /* 官方确实没有附加效果（纯伤害 / 换人 / 回复类等） */
  } else {
    nKeptUnique++;          /* 官方未建模，留给旧表兜底 */
  }
}

const pokeNames = new Set(Object.keys(MAP).map(en => RENAME[MAP[en].zh] || MAP[en].zh));
const out = Object.assign({}, official);
let nKz = 0, nKeptOld = 0;
Object.keys(oldFX).forEach(n => {
  if (!pokeNames.has(n)) { out[n] = oldFX[n]; nKz++; }                    /* 洛克招 */
  else if (!official[n] && !cleared.has(n)) { out[n] = oldFX[n]; nKeptOld++; }   /* 官方没建模的独特机制 */
});
const dropped = Object.keys(oldFX).filter(n => pokeNames.has(n) && !official[n] && cleared.has(n));
Object.keys(MANUAL).forEach(n => { out[n] = MANUAL[n]; });   /* 手工兜底优先级最高 */

console.log('旧表条目: ' + Object.keys(oldFX).length + ' → 新表: ' + Object.keys(out).length);
console.log('官方生成: ' + Object.keys(official).length +
  '（能力变化 ' + nStat + ' · 带概率 ' + nChance + ' · 异常 ' + nAil + ' · 回复 ' + nHeal + ' · 吸血 ' + nDrain + ' · 高暴击 ' + nCrit + '）');
console.log('保留：洛克招 ' + nKz + ' 条 · 官方未建模的独特机制 ' + nKeptOld + ' 条');
console.log('作废的旧手工条目（官方明确无附加效果）: ' + dropped.length + ' → ' + dropped.join('、'));
console.log('\n与旧表内容发生变化的招:');
Object.keys(official).forEach(n => {
  if (oldFX[n] && JSON.stringify(oldFX[n]) !== JSON.stringify(official[n])) {
    console.log('   * ' + n + '：' + JSON.stringify(oldFX[n]) + ' → ' + JSON.stringify(official[n]));
  }
});
console.log('\n重点招核对:');
['剑舞', '诡计', '冥想', '生长', '宇宙力量', '金属音', '溶解液', '影子分身', '磨爪', '烟幕', '甜甜香气',
  '可怕面孔', '空气之刃', '烈火深渊', '萤火', '自我再生', '聚气', '睡觉', '守住', '喷射火焰', '火焰牙', '空气之刃'].forEach(n => {
    console.log('   ' + n + ' → ' + (out[n] ? JSON.stringify(out[n]) : '（无附加效果）'));
  });

writeFileSync(OUT, JSON.stringify(out), 'utf8');
console.log('\n已写出 → ' + OUT);
if (!apply) { console.log('（未加 --apply，仅生成数据）'); process.exit(0); }
if (!existsSync(BAK)) { copyFileSync(FILE, BAK); console.log('已备份 → ' + BAK); }
const eol = src.includes('\r\n') ? '\r\n' : '\n';
let work = src.split('\r\n').join('\n');
const at = lit(work, 'MOVE_FX');
work = work.slice(0, at.start) + JSON.stringify(out) + work.slice(at.end);
writeFileSync(FILE, eol === '\r\n' ? work.split('\n').join('\r\n') : work, 'utf8');
console.log('已写入 ' + FILE + '（' + Buffer.byteLength(work, 'utf8') + ' 字节）');
