/* v35b：宝可梦技能池改用「第九世代（朱/紫）」升级表
   用户要求：都取第九世代的资料（原来是各世代并集，导致 wiki 上没有的招式也出现）
   数据：_work/out/sv-learnsets.json（1025 只）+ pokeapi-move-map.json（英→游戏招 id）
   分池：p0 ≤14 · p15 15-24 · p25 25-34 · p35 35-44 · p45 45-54 · p55 55-64 · p65 ≥65
   朱紫里没有数据的宠（292 只）：保留原池，避免技能表变空
   用法：node v35b-patch-pools.mjs --apply */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = ROOT + '/抓宠游戏-v12-clean.html';
const BAK = ROOT + '/抓宠游戏-v12-clean.bak-v35b.html';
const apply = process.argv.includes('--apply');
const SV = JSON.parse(readFileSync(ROOT + '/_work/out/sv-learnsets.json', 'utf8'));
const MAP = JSON.parse(readFileSync(ROOT + '/_work/out/pokeapi-move-map.json', 'utf8'));
console.log('第九世代升级表: ' + Object.keys(SV).length + ' 只 · 招式名映射: ' + Object.keys(MAP).length + ' 条');

let src = readFileSync(FILE, 'utf8');
const eol = src.includes('\r\n') ? '\r\n' : '\n';
let work = src.split('\r\n').join('\n');
const key = 'var SPECIES=';
const at = work.indexOf(key);
const head = at + key.length;
const from = head + work.slice(head).search(/[[{]/);
let d = 0, j = from, q = null, esc = false;
for (; j < work.length; j++) {
  const c = work[j];
  if (q) { if (esc) { esc = false; continue; } if (c === '\\') { esc = true; continue; } if (c === q) q = null; continue; }
  if (c === '"') { q = c; continue; }
  if (c === '[') d++; else if (c === ']') { d--; if (d === 0) { j++; break; } }
}
const SPECIES = new Function('return (' + work.slice(from, j) + ')')();
const byId = {}; SPECIES.forEach(s => byId[s.id] = s);

const bucket = lv => {
  if (lv <= 14) return 'p0';
  if (lv <= 24) return 'p15';
  if (lv <= 34) return 'p25';
  if (lv <= 44) return 'p35';
  if (lv <= 54) return 'p45';
  if (lv <= 64) return 'p55';
  return 'p65';
};
let updated = 0, kept = [], noMap = new Set(), emptyNew = [];
const previews = [];
SPECIES.forEach(sp => {
  if (!sp.id.startsWith('pk-')) return;                 /* 只处理宝可梦 */
  const num = String(parseInt(sp.id.slice(3), 10));
  const list = SV[num];
  if (!Array.isArray(list) || !list.length) { kept.push(sp.name); return; }  /* 朱紫没有 → 保留原池 */
  const pools = { p0: [], p15: [], p25: [], p35: [], p45: [], p55: [], p65: [] };
  let mapped = 0;
  list.forEach(it => {
    const m = MAP[it.n];
    if (!m) { noMap.add(it.n); return; }
    const b = bucket(it.lv || 0);
    if (pools[b].indexOf(m.id) < 0) pools[b].push(m.id);
    mapped++;
  });
  if (!mapped) { kept.push(sp.name); return; }
  /* 每个池内按学习等级排序，便于阅读 */
  const lvOf = {}; list.forEach(it => { const m = MAP[it.n]; if (m) lvOf[m.id] = it.lv || 0; });
  Object.keys(pools).forEach(k => pools[k].sort((a, b) => (lvOf[a] || 0) - (lvOf[b] || 0)));
  const before = sp.pools ? Object.keys(sp.pools).reduce((n, k) => n + (sp.pools[k] || []).length, 0) : 0;
  const after = Object.keys(pools).reduce((n, k) => n + pools[k].length, 0);
  sp.pools = pools;
  /* 初始 4 招也按新池重建（取 p0 前 4 个） */
  const init = pools.p0.slice(0, 4);
  if (init.length) {
    while (init.length < 4) {
      const nxt = ['p15', 'p25', 'p35', 'p45', 'p55', 'p65'].map(k => pools[k]).find(a => a.length);
      if (!nxt) break;
      init.push(nxt[0]);
    }
    sp.moves = init.slice(0, 4);
  }
  updated++;
  if (previews.length < 6 && before !== after) previews.push(sp.name + '：' + before + ' 招 → ' + after + ' 招（第九世代）');
});
const total = Object.keys(SV).filter(k => Array.isArray(SV[k]) && SV[k].length).length;
console.log('\n有朱紫数据的宝可梦: ' + total + ' 只');
console.log('已按第九世代重建技能池: ' + updated + ' 只');
console.log('朱紫无数据 → 保留原池: ' + kept.length + ' 只');
console.log('未映射到的招式名: ' + noMap.size + ' 个 → ' + [...noMap].slice(0, 8).join('、'));
console.log('\n变化预览:');
previews.forEach(x => console.log('  ' + x));
/* 喷火龙的专项核对放在预演之后单独做 */
if (!apply) { console.log('\n（未加 --apply，仅预演）'); process.exit(0); }
work = work.slice(0, from) + JSON.stringify(SPECIES) + work.slice(j);
if (!existsSync(BAK)) { copyFileSync(FILE, BAK); console.log('已备份 → ' + BAK); }
writeFileSync(FILE, eol === '\r\n' ? work.split('\n').join('\r\n') : work, 'utf8');
console.log('已写入 ' + FILE);
