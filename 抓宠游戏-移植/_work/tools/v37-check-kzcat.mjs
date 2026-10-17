/* 核实：洛克「物攻/魔攻」的映射，以及洛克招式的分类用词（物理/魔法/变化？） */
import { readFileSync } from 'node:fs';
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
const MOVES = lit('MOVES'), SPECIES = lit('SPECIES');
const byId = {}; SPECIES.forEach(s => byId[s.id] = s);

console.log('══ 1. 数据源里洛克招式的分类用词 ══');
const mod = await import('file:///' + (ROOT + '/_work/v17-data/roco.mjs').replace(/\\/g, '/').replace(/^\/+/, ''));
const ROCO = mod.ROCO;
const cats = {};
ROCO.forEach(o => {
  Object.keys(o.pools || {}).forEach(pk => {
    (o.pools[pk] || []).forEach(mv => { const c = mv.cat || '(空)'; cats[c] = (cats[c] || 0) + 1; });
  });
});
Object.keys(cats).forEach(k => console.log('  ' + k + ': ' + cats[k] + ' 条'));
/* 样例 */
['物理', '魔法', '特殊'].forEach(c => {
  const ex = [];
  ROCO.forEach(o => Object.keys(o.pools || {}).forEach(pk => (o.pools[pk] || []).forEach(mv => { if (mv.cat === c && ex.length < 6) ex.push(mv.m + '(' + mv.t + ' ' + mv.power + ')'); })));
  if (ex.length) console.log('  ' + c + ' 样例: ' + ex.join('、'));
});

console.log('\n══ 2. 洛克宠的六维字段名（数据源）══');
const god = ROCO.find(o => o.n === '火神');
console.log('  火神 kzStats = ' + JSON.stringify(god ? god.kzStats : null));
console.log('  → 字段名是 hp/atk/def/spa/spd/spe（atk=物攻, spa=魔攻）');
const g2 = byId['kz-006'];
console.log('  游戏里火神: a=' + g2.a + ' spa=' + g2.spa + ' d=' + g2.d + ' spd=' + g2.spd + '  （a 应= atk, spa 应= 魔攻）');

console.log('\n══ 3. 游戏里洛克招式现在的分类 ══');
const kzMoves = new Set();
ROCO.forEach(o => Object.keys(o.pools || {}).forEach(pk => (o.pools[pk] || []).forEach(mv => kzMoves.add(mv.m))));
const dist = {};
let found = 0;
Object.keys(MOVES).forEach(id => {
  const mv = MOVES[id];
  if (!kzMoves.has(mv.name)) return;
  found++;
  const c = mv.cat || '(空)'; dist[c] = (dist[c] || 0) + 1;
});
console.log('  洛克招式在游戏里共 ' + found + ' 个，分类分布: ' + Object.keys(dist).map(k => k + ' ' + dist[k]).join(' · '));
/* 找几个洛克的"魔法"招，看游戏里判成什么 */
console.log('\n  对照（洛克分类 → 游戏分类）:');
const sample = [];
ROCO.forEach(o => Object.keys(o.pools || {}).forEach(pk => (o.pools[pk] || []).forEach(mv => {
  if (sample.length >= 12) return;
  const gid = Object.keys(MOVES).find(k => MOVES[k].name === mv.m);
  if (gid) sample.push('    ' + mv.m.padEnd(10) + ' 洛克=' + (mv.cat || '?') + '  游戏=' + (MOVES[gid].cat || '(空)') + '  属性=' + MOVES[gid].type + ' 威力' + MOVES[gid].power);
})));
sample.forEach(x => console.log(x));
