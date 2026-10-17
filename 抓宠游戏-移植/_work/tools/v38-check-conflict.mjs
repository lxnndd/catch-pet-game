/* 核查「清醒」「隐形岩」「撒菱」的分类来源，找出洛克数据里分类错误的招 */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const src = readFileSync(ROOT + '/抓宠游戏-v12-clean.html', 'utf8');
function sliceLiteral(s, i) {
  const o = s.slice(i).search(/[[{]/); const from = i + o;
  const oc = s[from], cc = oc === '[' ? ']' : '}';
  let d = 0, j = from, inStr = null, esc = false;
  for (; j < s.length; j++) {
    const c = s[j];
    if (inStr) { if (esc) { esc = false; continue; } if (c === '\\') { esc = true; continue; } if (c === inStr) inStr = null; continue; }
    if (c === '"') { inStr = c; continue; }
    if (c === oc) d++; else if (c === cc) { d--; if (d === 0) { j++; break; } }
  }
  return s.slice(from, j);
}
const declAt = n => { const m = new RegExp('var\\s+' + n + '\\s*=').exec(src); return m ? m.index + m[0].length : -1; };
const lit = n => new Function('return (' + sliceLiteral(src, declAt(n)) + ')')();
const MOVES = lit('MOVES');
const MAP = JSON.parse(readFileSync(ROOT + '/_work/out/pokeapi-move-map.json', 'utf8'));
const idToEn = {};
Object.keys(MAP).forEach(en => { idToEn[MAP[en].id] = en; });

console.log('══ 1. 三只在意的招 ══');
['清醒', '隐形岩', '撒菱'].forEach(nm => {
  const id = Object.keys(MOVES).find(k => MOVES[k].name === nm);
  if (!id) { console.log('  ' + nm + ' → 游戏里没有'); return; }
  const mv = MOVES[id];
  console.log('  ' + nm.padEnd(6) + ' id=' + id + '  属性=' + mv.type + '  威力=' + mv.power + '  分类=' + (mv.cat || '(空)') + '  有宝可梦映射=' + (idToEn[id] || '无'));
});

console.log('\n══ 2. 洛克数据里这几只的分类 ══');
const mod = await import('file:///' + (ROOT + '/_work/v17-data/roco.mjs').replace(/\\/g, '/').replace(/^\/+/, ''));
const found = {};
mod.ROCO.forEach(o => Object.keys(o.pools || {}).forEach(pk => (o.pools[pk] || []).forEach(mv => {
  if (['清醒', '隐形岩', '撒菱'].indexOf(mv.m) >= 0 && !found[mv.m]) found[mv.m] = { cat: mv.cat, power: mv.power, t: mv.t };
})));
Object.keys(found).forEach(k => console.log('  ' + k + ' → 洛克分类=' + found[k].cat + ' 威力=' + found[k].power + ' 属性=' + found[k].t));

console.log('\n══ 3. 宝可梦侧同名招的分类（PokéAPI）══');
const CACHE = ROOT + '/_work/sources/宝可梦/poke-cache-kj/json';
const zh2en = {};
for (const f of readdirSync(CACHE)) {
  if (!f.startsWith('move-') || !f.endsWith('.json')) continue;
  try {
    const j = JSON.parse(readFileSync(path.join(CACHE, f), 'utf8'));
    const zh = (j.names || []).filter(n => n.language && n.language.name === 'zh-hans').map(n => n.name)[0];
    if (zh && j.damage_class) zh2en[zh] = j.name + ' / ' + j.damage_class.name + ' / 威力' + j.power;
  } catch (e) { }
}
['清醒', '隐形岩', '撒菱'].forEach(nm => console.log('  ' + nm + ' → ' + (zh2en[nm] || '（PokéAPI 缓存里没有）')));

console.log('\n══ 4. 找出「洛克说是变化、但宝可梦说是攻击招」的全部冲突 ══');
const conflicts = [];
mod.ROCO.forEach(o => Object.keys(o.pools || {}).forEach(pk => (o.pools[pk] || []).forEach(mv => {
  const poke = zh2en[mv.m];
  if (!poke) return;
  const isPokeAttack = poke.indexOf('physical') >= 0 || poke.indexOf('special') >= 0;
  const isKzStatus = mv.cat === '变化';
  if (isPokeAttack && isKzStatus) conflicts.push(mv.m + '：洛克=变化 / 宝可梦=' + poke);
  if (!isKzStatus && mv.cat && poke.indexOf('status') >= 0) conflicts.push(mv.m + '：洛克=' + mv.cat + ' / 宝可梦=status');
})));
const uniq = [...new Set(conflicts)];
console.log('  冲突 ' + uniq.length + ' 条:');
uniq.slice(0, 15).forEach(x => console.log('    ' + x));
