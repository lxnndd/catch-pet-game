/* v60 审核：能力变化的方向有没有标反
   PokéAPI 的 stat_changes 要配合 target 判方向，但 **target 对某些招不准**：
     典型是「增强拳」（Power-Up Punch）—— 官方是「自己攻击 +1」，
     而 PokéAPI 的 target 写的是 selected-pokemon（对手），于是被生成成「对手 攻击 -1」。
   更可靠的判据是 meta.category：
     damage-raise / damage-lower 明确表示「攻击后自己提升 / 降低对手」；
     net-good-stats / net-bad-stats 要再看 change 的正负。
   用法：node v60-audit-direction.mjs */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CACHE = ROOT + '/_work/sources/宝可梦/poke-cache-kj/json';
const MAP = JSON.parse(readFileSync(ROOT + '/_work/out/pokeapi-move-map.json', 'utf8'));
const FX = JSON.parse(readFileSync(ROOT + '/_work/out/move-fx.json', 'utf8'));
const USER_TARGETS = new Set(['user', 'user-and-allies', 'users-field']);
const STAT_ZH = { attack: '攻击', defense: '防御', 'special-attack': '特攻', 'special-defense': '特防', speed: '速度', accuracy: '命中', evasion: '闪避' };
const RENAME = { '空气斩': '空气之刃', '鬼面': '可怕面孔', '炼狱': '烈火深渊' };

const wrong = [], uncertain = [];
for (const f of readdirSync(CACHE).filter(x => /^move-.*\.json$/.test(x))) {
  let o; try { o = JSON.parse(readFileSync(CACHE + '/' + f, 'utf8')); } catch (e) { continue; }
  const hit = MAP[o.name]; if (!hit) continue;
  const zh = RENAME[hit.zh] || hit.zh;
  if (!o.meta || !o.meta.category) continue;
  const cat = o.meta.category.name;
  const sc = o.stat_changes || [];
  if (!sc.length) continue;
  const toUser = USER_TARGETS.has((o.target || {}).name);

  /* 旧规则（v42/v57 都在用）：只按 target 判方向 */
  const oldBuff = {}, oldDebuff = {};
  sc.forEach(s => {
    const k = s.stat.name; if (!STAT_ZH[k]) return;
    if (toUser) oldBuff[k] = (oldBuff[k] || 0) + s.change;
    else oldDebuff[k] = (oldDebuff[k] || 0) + (-s.change);
  });

  /* 新规则：category 优先 */
  let dir = null;                                   /* 'buff' | 'debuff' | null(交给 target) */
  if (cat === 'damage-raise') dir = 'buff';
  else if (cat === 'damage-lower') dir = 'debuff';
  else if (cat === 'net-good-stats') dir = sc.every(s => s.change > 0) ? 'buff' : (sc.every(s => s.change < 0) ? 'debuff' : null);
  else if (cat === 'net-bad-stats') dir = sc.every(s => s.change < 0) ? 'debuff' : null;

  const newBuff = {}, newDebuff = {};
  sc.forEach(s => {
    const k = s.stat.name; if (!STAT_ZH[k]) return;
    const asBuff = (dir === 'buff') ? true : (dir === 'debuff' ? false : toUser);
    if (asBuff) newBuff[k] = (newBuff[k] || 0) + s.change;
    else newDebuff[k] = (newDebuff[k] || 0) + (-s.change);
  });

  const oldTxt = JSON.stringify({ buff: oldBuff, debuff: oldDebuff });
  const newTxt = JSON.stringify({ buff: newBuff, debuff: newDebuff });
  const cur = FX[zh] ? JSON.stringify({ buff: FX[zh].buff, debuff: FX[zh].debuff }) : '(无)';
  if (oldTxt !== newTxt) {
    wrong.push({ zh, cat, target: o.target.name, sc: sc.map(s => STAT_ZH[s.stat.name] + (s.change > 0 ? '+' : '') + s.change).join(','), old: oldTxt, neu: newTxt, cur });
  }
}

console.log('按「category 判方向」与「只按 target 判方向」结果不一致的招式：' + wrong.length + ' 条\n');
console.log('招式'.padEnd(12) + '| category'.padEnd(16) + '| target'.padEnd(20) + '| 官方 stat_changes'.padEnd(22) + '| 旧结果 → 应为');
console.log('-'.repeat(130));
wrong.forEach(w => {
  console.log(w.zh.padEnd(11) + '| ' + w.cat.padEnd(15) + '| ' + w.target.padEnd(19) + '| ' + w.sc.padEnd(21) + '| ' + w.old + '  →  ' + w.neu);
});
console.log('\n其中「增强拳」当前在 MOVE_FX 里是：' + (FX['增强拳'] ? JSON.stringify(FX['增强拳']) : '(不在表里)'));
