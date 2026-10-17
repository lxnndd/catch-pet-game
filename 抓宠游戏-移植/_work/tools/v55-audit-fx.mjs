/* v55 审核：哪些招式的「本作效果」是硬凑的
   判据：
     A. 官方有结构化数据（stat_changes / ailment / healing…）→ 本作照搬，正常
     B. 官方 category = unique / field-effect（PokéAPI 没建模）→ 本作保留了旧手工配置 ⚠️ 需人工看
     C. 官方有 ailment 但本作不支持（taunt/disable/trap/confusion…）→ 本作可能硬凑了别的效果 ⚠️
   用法：node v55-audit-fx.mjs */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = ROOT + '/抓宠游戏-v12-clean.html';
const CACHE = ROOT + '/_work/sources/宝可梦/poke-cache-kj/json';
const MAP = JSON.parse(readFileSync(ROOT + '/_work/out/pokeapi-move-map.json', 'utf8'));

/* 从 HTML 里取 MOVE_FX */
function lit(text, name) {
  const at = text.indexOf('var ' + name + '=');
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
  return new Function('return (' + text.slice(j, k) + ')')();
}
const src = readFileSync(FILE, 'utf8');
const MOVE_FX = lit(src, 'MOVE_FX');
const STAT_ZH = { attack: '攻击', defense: '防御', 'special-attack': '特攻', 'special-defense': '特防', speed: '速度', accuracy: '命中', evasion: '闪避' };
const AIL_ZH = { poison: '中毒', burn: '灼烧', paralysis: '麻痹', sleep: '睡眠', freeze: '冰冻', confusion: '混乱', trap: '束缚', flinch: '畏缩', taunt: '挑衅', disable: '定身法', torment: '折磨', yawn: '哈欠', 'leech-seed': '寄生种子', protect: '守住', 'heal-block': '回复封锁', embargo: '禁止携带', ingrain: '扎根', nightmare: '恶梦', 'perish-song': '灭亡之歌', 'no-type-immunity': '无属性免疫', unknown: '未知', silence: '沉默' };
const SUPPORTED = new Set(['poison', 'burn', 'paralysis', 'sleep', 'freeze']);

const files = readdirSync(CACHE).filter(f => /^move-.*\.json$/.test(f));
const catA = [], catB = [], catC = [];
files.forEach(f => {
  let o; try { o = JSON.parse(readFileSync(CACHE + '/' + f, 'utf8')); } catch (e) { return; }
  const hit = MAP[o.name]; if (!hit) return;
  const zh = hit.zh;
  const cur = MOVE_FX[zh];
  const meta = o.meta || {};
  const cat = (meta.category && meta.category.name) || '';
  const ail = meta.ailment && meta.ailment.name !== 'none' ? meta.ailment.name : null;
  const hasStat = (o.stat_changes || []).length > 0;
  const official = [];
  (o.stat_changes || []).forEach(s => official.push((STAT_ZH[s.stat.name] || s.stat.name) + (s.change > 0 ? ' +' : ' ') + s.change));
  if (ail) official.push('异常:' + (AIL_ZH[ail] || ail));
  if (meta.healing) official.push('回复' + meta.healing + '%');
  if (meta.drain) official.push('吸血' + meta.drain + '%');
  if (meta.flinch_chance) official.push('畏缩' + meta.flinch_chance + '%');
  if (!cur) return;                                  /* 本作没配效果，跳过 */
  if (hasStat) { catA.push({ zh, official: official.join(' / '), cur: JSON.stringify(cur) }); return; }
  const unsupported = ail && !SUPPORTED.has(ail);
  if (unsupported) { catC.push({ zh, ail: AIL_ZH[ail] || ail, official: official.join(' / ') || ('（仅 ' + (AIL_ZH[ail] || ail) + '）'), cur: JSON.stringify(cur) }); return; }
  if (cat === 'unique' || cat === 'field-effect') { catB.push({ zh, cat, official: official.join(' / ') || '（无结构化数据）', cur: JSON.stringify(cur) }); return; }
});

console.log('官方有结构化效果、本作照搬的招式：' + catA.length + ' 条（正常，不列）\n');
console.log('════ B 类：官方 category = unique / field-effect（PokéAPI 没建模）本作保留了旧手工配置 ════');
catB.forEach(x => console.log('  ' + x.zh.padEnd(10) + ' [' + x.cat + ']  官方:' + x.official.padEnd(24) + ' 本作:' + x.cur));
console.log('\n════ C 类：官方有异常状态但本作不支持 → 本作却配了别的效果（最可疑）════');
catC.forEach(x => console.log('  ' + x.zh.padEnd(10) + ' 官方:' + x.official.padEnd(28) + ' 本作:' + x.cur));

/* 顺便列出：官方有本作不支持的异常、但本作**没有**配任何效果的（诚实留空，可接受） */
const emptyUnsupported = [];
files.forEach(f => {
  let o; try { o = JSON.parse(readFileSync(CACHE + '/' + f, 'utf8')); } catch (e) { return; }
  const hit = MAP[o.name]; if (!hit) return;
  const meta = o.meta || {};
  const ail = meta.ailment && meta.ailment.name !== 'none' ? meta.ailment.name : null;
  if (!ail || SUPPORTED.has(ail)) return;
  if (MOVE_FX[hit.zh]) return;
  emptyUnsupported.push(hit.zh + '（' + (AIL_ZH[ail] || ail) + '）');
});
console.log('\n官方有本作不支持的异常、本作**没配效果**的招式：' + emptyUnsupported.length + ' 条');
console.log('  ' + emptyUnsupported.slice(0, 30).join(' · ') + (emptyUnsupported.length > 30 ? ' …' : ''));
console.log('\n合计：B 类 ' + catB.length + ' 条 · C 类 ' + catC.length + ' 条（这两类都需要人工判断是否合理）');
