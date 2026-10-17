/* v43：把官方「捕获率」（1~255）注入 SPECIES 的 cap 字段
   · 宝可梦（pk-*）：用 PokéAPI /pokemon-species 的 capture_rate（1025 只全都有）
   · 洛克（kz-*）：官方无此概念，按稀有度给基准值（普通 120 / 稀有 75 / 传说 25）
   用法：node v43-inject-capture.mjs [--apply] */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = ROOT + '/抓宠游戏-v12-clean.html';
const BAK = ROOT + '/抓宠游戏-v12-clean.bak-v43.html';
const apply = process.argv.includes('--apply');

const META = JSON.parse(readFileSync(ROOT + '/_work/out/pokemon-meta.json', 'utf8'));

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
const eol = src.includes('\r\n') ? '\r\n' : '\n';
let work = src.split('\r\n').join('\n');
const sp = lit(work, 'SPECIES');

const KZ_BY_RARITY = { 0: 120, 1: 75, 2: 25 };   /* 洛克：官方无捕获率，按稀有度给基准 */
let nPk = 0, nKz = 0, miss = 0;
const dist = {};
sp.value.forEach(s => {
  if (/^pk-/.test(s.id)) {
    const num = String(parseInt(s.id.slice(3), 10));
    const m = META[num];
    if (m && typeof m.capture === 'number') { s.cap = m.capture; nPk++; }
    else { s.cap = 45; miss++; }
  } else if (/^kz-/.test(s.id)) {
    s.cap = KZ_BY_RARITY[s.rarity] || 120; nKz++;
  }
  dist[s.cap] = (dist[s.cap] || 0) + 1;
});
work = work.slice(0, sp.start) + JSON.stringify(sp.value) + work.slice(sp.end);

console.log('宝可梦注入官方捕获率: ' + nPk + ' 只' + (miss ? '（缺数据回落 45：' + miss + ' 只）' : ''));
console.log('洛克按稀有度给基准: ' + nKz + ' 只（普通 120 / 稀有 75 / 传说 25）');
console.log('捕获率分布（前 12 档）:');
Object.keys(dist).map(Number).sort((a, b) => b - a).slice(0, 12).forEach(k => console.log('   ' + k + ' → ' + dist[k] + ' 只'));
function show(id) { const s = sp.value.filter(x => x.id === id)[0]; return s ? (s.name + ' cap=' + s.cap + ' rarity=' + s.rarity) : '(无)'; }
console.log('抽查: ' + show('pk-150') + ' | ' + show('pk-001') + ' | ' + show('pk-025') + ' | ' + show('pk-384') + ' | ' + show('kz-006'));

if (!apply) { console.log('（未加 --apply，仅预演）'); process.exit(0); }
if (!existsSync(BAK)) { copyFileSync(FILE, BAK); console.log('已备份 → ' + BAK); }
writeFileSync(FILE, eol === '\r\n' ? work.split('\n').join('\r\n') : work, 'utf8');
console.log('已写入 ' + FILE + '（' + Buffer.byteLength(work, 'utf8') + ' 字节）');
