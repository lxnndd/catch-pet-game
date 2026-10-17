/* v35：洛克王国宠物改用「真实六维 × 0.85」的换算值
   现状：游戏里 180 只洛克的 a/d/spa/spd/s 全是默认 70（v17 注入时丢了 kzStats）
   规则（用户指定）：洛克真实种族值 × 0.85 ≈ 宝可梦量级
   用法：node v35-patch-kzstats.mjs --apply */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = ROOT + '/抓宠游戏-v12-clean.html';
const BAK = ROOT + '/抓宠游戏-v12-clean.bak-v35.html';
const apply = process.argv.includes('--apply');
/* 用户 2026-09-28 修正：不要 ×0.85 —— 洛克真实值和宝可梦同量级
   （例：火神 78/84/78/109/85/100 总 534  ↔  妙蛙花 80/82/83/100/100/80 总 525），直接用真实值 */
const K = 1.0;
const clampStat = v => Math.max(1, Math.min(255, Math.round(v)));

/* 真实六维 */
const mod = await import('file:///' + (ROOT + '/_work/v17-data/roco.mjs').replace(/\\/g, '/').replace(/^\/+/, ''));
const ROCO = mod.ROCO;
if (!Array.isArray(ROCO)) { console.error('!! 读不到 roco.mjs 的 ROCO'); process.exit(1); }
const real = {};
ROCO.forEach(o => {
  const id = 'kz-' + String(o.kzNo || '').padStart(3, '0');
  const s = o.kzStats || {};
  if (typeof s.hp !== 'number') return;
  real[id] = { n: o.n, hpBase: clampStat(s.hp * K), a: clampStat(s.atk * K), d: clampStat(s.def * K), spa: clampStat(s.spa * K), spd: clampStat(s.spd * K), s: clampStat(s.spe * K) };
});
console.log('真实六维可用: ' + Object.keys(real).length + ' / ' + ROCO.length + ' 只');

let src = readFileSync(FILE, 'utf8');
const eol = src.includes('\r\n') ? '\r\n' : '\n';
let work = src.split('\r\n').join('\n');

/* 解析 → 改 → 回写 SPECIES 段 */
const key = 'var SPECIES=';
const at = work.indexOf(key);
if (at < 0) { console.error('!! 找不到 var SPECIES='); process.exit(1); }
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
console.log('SPECIES: ' + SPECIES.length + ' 只');

let changed = 0, skipped = [];
const preview = [];
SPECIES.forEach(sp => {
  const r = real[sp.id];
  if (!r) { if (sp.id.startsWith('kz-')) skipped.push(sp.id + ' ' + sp.name); return; }
  const before = sp.hpBase + '/' + sp.a + '/' + sp.d + '/' + sp.spa + '/' + sp.spd + '/' + sp.s;
  sp.hpBase = r.hpBase; sp.base = r.hpBase;   /* base 是旧血量字段，一起同步 */
  sp.a = r.a; sp.d = r.d; sp.spa = r.spa; sp.spd = r.spd; sp.s = r.s;
  changed++;
  if (preview.length < 6) preview.push(sp.name + '：' + before + '  →  ' + [r.hpBase, r.a, r.d, r.spa, r.spd, r.s].join('/'));
});
console.log('\n改动预览（顺序: 血/攻/防/特攻/特防/速）:');
preview.forEach(x => console.log('  ' + x));
if (skipped.length) console.log('\n未匹配到真实值的洛克: ' + skipped.length + ' 只 → ' + skipped.slice(0, 8).join('、'));
console.log('\n共改 ' + changed + ' 只洛克的六维' + (apply ? '' : '（未加 --apply，仅预演）'));
if (!apply) process.exit(0);

work = work.slice(0, from) + JSON.stringify(SPECIES) + work.slice(j);
if (!existsSync(BAK)) { copyFileSync(FILE, BAK); console.log('已备份 → ' + BAK); }
writeFileSync(FILE, eol === '\r\n' ? work.split('\n').join('\r\n') : work, 'utf8');
console.log('已写入 ' + FILE);
