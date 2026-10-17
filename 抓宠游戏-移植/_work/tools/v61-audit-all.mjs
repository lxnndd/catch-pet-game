/* v61 全量审计：527 个宝可梦招式里，官方有的机制本作**还没实现**的清单
   已实现（v42~v60）：能力变化 / 异常(毒烧麻睡冰) / 畏缩 / 混乱 / 挑衅 / 定身法 / 寄生种子 /
     束缚 / 扎根 / 恶梦 / 回复封锁 / 折磨 / 哈欠 / 灭亡之歌 / 守住 / 无属性免疫 /
     回复 / 吸血 / 高暴击 / 连击 / 先制 / 反作用力(MOVES.recoil)
   逐项检查剩余字段，按「未实现的原因」归类输出。
   用法：node v61-audit-all.mjs */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CACHE = ROOT + '/_work/sources/宝可梦/poke-cache-kj/json';
const MAP = JSON.parse(readFileSync(ROOT + '/_work/out/pokeapi-move-map.json', 'utf8'));
const FX = JSON.parse(readFileSync(ROOT + '/_work/out/move-fx.json', 'utf8'));
const src = readFileSync(ROOT + '/抓宠游戏-v12-clean.html', 'utf8');
const RENAME = { '空气斩': '空气之刃', '鬼面': '可怕面孔', '炼狱': '烈火深渊' };
const AIL_ZH = { embargo: '查封（禁止携带道具）', unknown: '未知', silence: '沉默', 'heal-block': '回复封锁', 'no-type-immunity': '无属性免疫', taunt: '挑衅', disable: '定身法', torment: '折磨', yawn: '哈欠', 'perish-song': '灭亡之歌', 'leech-seed': '寄生种子', trap: '束缚', ingrain: '扎根', nightmare: '恶梦', protect: '守住', confusion: '混乱' };
const SUPPORTED_AIL = new Set(['poison', 'burn', 'paralysis', 'sleep', 'freeze']);
const SUPPORTED_VOL = new Set(['confusion', 'taunt', 'disable', 'leech-seed', 'trap', 'ingrain', 'nightmare', 'heal-block', 'torment', 'yawn', 'perish-song', 'protect', 'no-type-immunity']);

/* 本作 MOVES 里该招有没有 recoil / 多回合 等字段 */
function gameEntry(zh) {
  const at = src.indexOf('"name":"' + zh + '"');
  if (at < 0) return null;
  let depth = 0, i = src.indexOf('{', at);
  for (let k = i; k < src.length; k++) {
    if (src[k] === '{') depth++;
    else if (src[k] === '}') { depth--; if (depth === 0) return src.slice(i, k + 1); }
  }
  return null;
}

const buckets = {};
function add(cat, zh, note) { (buckets[cat] = buckets[cat] || []).push(zh + (note ? '（' + note + '）' : '')); }
let impl = 0, total = 0;

for (const f of readdirSync(CACHE).filter(x => /^move-.*\.json$/.test(x))) {
  let o; try { o = JSON.parse(readFileSync(CACHE + '/' + f, 'utf8')); } catch (e) { continue; }
  const hit = MAP[o.name]; if (!hit) continue;
  total++;
  const zh = RENAME[hit.zh] || hit.zh;
  const meta = o.meta || {};
  const cat = (meta.category && meta.category.name) || '';
  const tg = (o.target && o.target.name) || '';
  const fx = FX[zh];
  const ge = gameEntry(zh) || '';
  let unimplemented = false;

  /* ① 未支持的异常状态 */
  const an = meta.ailment && meta.ailment.name;
  if (an && an !== 'none' && !SUPPORTED_AIL.has(an) && !SUPPORTED_VOL.has(an)) {
    add('① 异常状态本作没有', zh, AIL_ZH[an] || an); unimplemented = true;
  }
  /* ② 多回合 / 蓄力 */
  if (meta.min_turns > 0 || meta.max_turns > 0) {
    add('② 多回合·蓄力·持续', zh, (meta.min_turns || '?') + '~' + (meta.max_turns || '?') + ' 回合'); unimplemented = true;
  }
  /* ③ 场地 / 队伍 / 换人 类 */
  if (cat === 'field-effect') { add('③ 场地·队伍效果', zh, 'category=field-effect'); unimplemented = true; }
  if (cat === 'switching' || /switch|flee|teleport/.test(o.name)) { add('④ 换人·逃跑类', zh, 'category=' + cat); unimplemented = true; }
  /* ⑤ 一击必杀 */
  if (cat === 'ohko' || /ohko/.test(o.name)) { add('⑤ 一击必杀', zh, ''); unimplemented = true; }
  /* ⑥ 固定伤害 */
  if (meta.damage) { add('⑥ 固定伤害', zh, 'damage=' + meta.damage); unimplemented = true; }
  /* ⑦ 反作用力：官方有但本作招式表没配 */
  if (meta.recoil > 0 && ge.indexOf('"recoil"') < 0) { add('⑦ 反作用力（招式表缺字段）', zh, 'recoil=' + meta.recoil); unimplemented = true; }
  /* ⑧ 特殊 target */
  if (tg === 'selected-pokemon-me-first' || tg === 'user-or-ally' || tg === 'ally') { add('⑧ 特殊目标', zh, 'target=' + tg); unimplemented = true; }
  /* ⑨ 官方有 stat_changes 但本作没生成（可能是 STAT 映射缺项） */
  if ((o.stat_changes || []).length && !fx) { add('⑨ 能力变化未生成', zh, JSON.stringify(o.stat_changes)); unimplemented = true; }

  if (!unimplemented) impl++;
}

console.log('宝可梦招式总数：' + total + ' · 机制已实现/无附加机制：' + impl + ' · 存在未实现机制：' + (total - impl) + '\n');
const order = Object.keys(buckets).sort();
let sum = 0;
order.forEach(k => {
  const list = buckets[k];
  sum += list.length;
  console.log('════ ' + k + '：' + list.length + ' 条 ════');
  console.log('   ' + list.slice(0, 40).join(' · ') + (list.length > 40 ? ' …（共 ' + list.length + '）' : ''));
  console.log('');
});
console.log('（各类合计 ' + sum + ' 条次，一条招可能同时命中多类）');
writeFileSync(ROOT + '/_work/out/unimplemented-audit.json', JSON.stringify(buckets, null, 1), 'utf8');
console.log('清单已写出 → _work/out/unimplemented-audit.json');
