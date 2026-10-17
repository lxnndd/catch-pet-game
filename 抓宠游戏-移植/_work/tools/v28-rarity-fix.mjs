/* 用 PokéAPI 权威名册核对：哪些 legendary/mythical 还不是 rarity=2，并可选修正 */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
const ROOT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植';
const FILE = ROOT + '/抓宠游戏-v12-clean.html';
const BAK = ROOT + '/抓宠游戏-v12-clean.bak-v28b-rarity.html';
const apply = process.argv.includes('--apply');
const src = readFileSync(FILE, 'utf8');
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
const litText = src.indexOf('var SPECIES=[');
const SPECIES = new Function('return (' + sliceLiteral(src, litText + 'var SPECIES='.length) + ')')();
const byId = {}; SPECIES.forEach(s => byId[s.id] = s);

const J = JSON.parse(readFileSync(ROOT + '/_work/v17-data/poke-legendary.json', 'utf8'));
console.log('名册字段: ' + Object.keys(J).join(', '));
const LEG = J.legendary || [], MYTH = J.mythical || [];
console.log('legendary ' + LEG.length + ' 条 · mythical ' + MYTH.length + ' 条');
console.log('  样例 legendary: ' + JSON.stringify(LEG.slice(0, 4)));
console.log('  样例 mythical : ' + JSON.stringify(MYTH.slice(0, 4)));
/* 名册元素可能是 {id,name} 或字符串 */
const ids = arr => arr.map(x => typeof x === 'object' ? (x.id || x.pkid || x.pk) : x).filter(Boolean).map(String);
const norm = v => String(v).replace(/^pk-/, '');
const LEGID = ids(LEG).map(norm), MYTHID = ids(MYTH).map(norm);
const need = new Map();
LEGID.forEach(i => { const s = byId['pk-' + i]; if (s && s.rarity !== 2) need.set(s.id, { s, why: 'legendary' }); });
MYTHID.forEach(i => { const s = byId['pk-' + i]; if (s && s.rarity !== 2) need.set(s.id, { s, why: 'mythical' }); });
console.log('\n== 权威名册里但 rarity ≠ 2 的宠: ' + need.size + ' 只 ==');
[...need.values()].forEach(({ s, why }) => console.log('  ' + s.id + ' ' + s.name + '  rarity=' + s.rarity + '  (' + why + ')'));
/* 反查：当前 r2 但不在名册里的 */
const inList = new Set([...LEGID, ...MYTHID].map(i => 'pk-' + i));
const extra = SPECIES.filter(s => s.rarity === 2 && !inList.has(s.id));
console.log('\n== 当前 rarity=2 但不在权威名册里: ' + extra.length + ' 只 ==');
console.log('  ' + extra.map(s => s.name + '(' + s.id + ')').join('、'));
if (!need.size) { console.log('\n无需改动'); process.exit(0); }
if (!apply) { console.log('\n（未加 --apply，仅预演）'); process.exit(0); }
/* 修正：把 SPECIES 里这些 id 的 rarity 改成 2 */
let work = src;
let changed = 0, missed = [];
need.forEach(({ s }, id) => {
  const re = new RegExp('("id":"' + id + '"[^}]*?"rarity":)(\\d+)');
  if (re.test(work)) { work = work.replace(re, '$1' + 2); changed++; }
  else missed.push(s.name);
});
console.log('\n已改 ' + changed + ' 只' + (missed.length ? '，未匹配: ' + missed.join('、') : ''));
if (changed) {
  if (!existsSync(BAK)) { copyFileSync(FILE, BAK); console.log('已备份 → ' + BAK); }
  writeFileSync(FILE, work, 'utf8');
  console.log('已写入 ' + FILE + ' (' + Buffer.byteLength(work, 'utf8') + ' 字节)');
}
