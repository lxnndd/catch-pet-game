/* v36b：给缺 cat 的招式补上「物理/特殊/变化」
   缺口：1093 招里只有 641 招带 cat，417 个有威力的招没分类 → 会误走物攻公式
   规则：无威力 → 变化；有威力 → 按属性判定（沿用宝可梦第 1~3 世代的属性分法作兜底）
        物理系属性：一般/格斗/飞行/毒/地面/岩石/虫/幽灵/钢
        特殊系属性：水/草/火/电/冰/超能/龙/恶/妖精
   用法：node v36b-patch-cat.mjs --apply */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = ROOT + '/抓宠游戏-v12-clean.html';
const BAK = ROOT + '/抓宠游戏-v12-clean.bak-v36b.html';
const apply = process.argv.includes('--apply');
const PHYS = { nor: 1, fight: 1, flying: 1, poison: 1, ground: 1, rock: 1, bug: 1, ghost: 1, steel: 1 };

let src = readFileSync(FILE, 'utf8');
const eol = src.includes('\r\n') ? '\r\n' : '\n';
let work = src.split('\r\n').join('\n');
const key = 'var MOVES=';
const at = work.indexOf(key);
const head = at + key.length;
const from = head + work.slice(head).search(/[[{]/);
let d = 0, j = from, q = null, esc = false;
for (; j < work.length; j++) {
  const c = work[j];
  if (q) { if (esc) { esc = false; continue; } if (c === '\\') { esc = true; continue; } if (c === q) q = null; continue; }
  if (c === '"') { q = c; continue; }
  if (c === '{') d++; else if (c === '}') { d--; if (d === 0) { j++; break; } }
}
const MOVES = new Function('return (' + work.slice(from, j) + ')')();

let phys = 0, spec = 0, status = 0;
const samples = [];
Object.keys(MOVES).forEach(id => {
  const mv = MOVES[id];
  if (mv.cat) return;                                  /* 已有分类，不动 */
  if (!mv.power) { mv.cat = '变化'; status++; return; }
  if (PHYS[mv.type]) { mv.cat = '物理'; phys++; }
  else { mv.cat = '特殊'; spec++; }
  if (samples.length < 8) samples.push(mv.name + '（' + mv.type + ' ' + mv.power + '）→ ' + mv.cat);
});
console.log('补分类：物理 ' + phys + ' · 特殊 ' + spec + ' · 变化 ' + status + '（共 ' + (phys + spec + status) + ' 招）');
console.log('样例:');
samples.forEach(x => console.log('  ' + x));
const dist = {};
Object.keys(MOVES).forEach(id => { const c = MOVES[id].cat || '(空)'; dist[c] = (dist[c] || 0) + 1; });
console.log('\n新的分类分布: ' + Object.keys(dist).map(k => k + ' ' + dist[k]).join(' · '));
if (!apply) { console.log('\n（未加 --apply，仅预演）'); process.exit(0); }
work = work.slice(0, from) + JSON.stringify(MOVES) + work.slice(j);
if (!existsSync(BAK)) { copyFileSync(FILE, BAK); console.log('已备份 → ' + BAK); }
writeFileSync(FILE, eol === '\r\n' ? work.split('\n').join('\r\n') : work, 'utf8');
console.log('已写入 ' + FILE);
