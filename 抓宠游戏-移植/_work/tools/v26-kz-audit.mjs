/* v26 洛克头像全量审计：按 kz-{dvg编号} 下载官方图，与本地图逐张 sha256 比对
   用法：node v26-kz-audit.mjs [--save]   --save 时把官方图存到 _work/v17-avatars-fix/ */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import crypto from 'node:crypto';
const ROOT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植';
const F = ROOT + '/抓宠游戏-v12-clean.html';
const SAVE = process.argv.includes('--save');
const FIXDIR = ROOT + '/_work/v17-avatars-fix';
if (SAVE) mkdirSync(FIXDIR, { recursive: true });
const src = readFileSync(F, 'utf8');
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
const SP = new Function('return (' + sliceLiteral(src, src.indexOf('var SPECIES=') + 'var SPECIES='.length) + ')')();
const kz = SP.filter(s => s.kz);
const AV = ROOT + '/_work/v17-avatars';
const h = b => crypto.createHash('sha256').update(b).digest('hex').slice(0, 12);
async function get(url, ms = 25000) {
  const ac = new AbortController(); const t = setTimeout(() => ac.abort(), ms);
  try {
    const r = await fetch(url, { signal: ac.signal, headers: { 'User-Agent': 'Mozilla/5.0 Chrome/120', 'Referer': 'https://roco.dvg.cn/spirits.php' } });
    if (!r.ok) return null;
    const b = Buffer.from(await r.arrayBuffer());
    return b.length > 500 ? b : null;
  } catch (e) { return null; } finally { clearTimeout(t); }
}
const numOf = id => Number(String(id).replace(/^kz-0*/, ''));
const rows = [];
let same = 0, diff = 0, miss = 0, nofile = 0;
const CONC = 6;
let idx = 0;
async function worker() {
  while (idx < kz.length) {
    const sp = kz[idx++];
    const num = numOf(sp.id);
    const off = await get('https://roco.dvg.cn/dbsource/spirit/300/' + num + '-.png');
    const locPath = AV + '/' + sp.id + '.png';
    const loc = existsSync(locPath) ? readFileSync(locPath) : null;
    let st;
    if (!off) { st = '官方取不到'; miss++; }
    else if (!loc) { st = '本地无文件'; nofile++; }
    else if (h(off) === h(loc)) { st = '一致'; same++; }
    else { st = '不一致'; diff++; }
    if (SAVE && off) writeFileSync(FIXDIR + '/' + sp.id + '.png', off);
    rows.push({ id: sp.id, num, name: sp.name, st, offLen: off ? off.length : 0, locLen: loc ? loc.length : 0 });
    if (rows.length % 30 === 0) console.log('  ...已核对 ' + rows.length + '/' + kz.length);
  }
}
console.log('洛克物种 ' + kz.length + ' 只，并发 ' + CONC + ' 下载比对中…');
await Promise.all(Array.from({ length: CONC }, worker));
console.log('\n== 汇总 ==');
console.log('一致 ' + same + ' · 不一致 ' + diff + ' · 官方取不到 ' + miss + ' · 本地缺文件 ' + nofile);
const bad = rows.filter(r => r.st === '不一致');
if (bad.length) {
  console.log('\n不一致清单（前 40）：');
  for (const r of bad.slice(0, 40)) console.log('  ' + r.id + ' ' + r.name + ' 官方' + r.offLen + 'B / 本地' + r.locLen + 'B');
}
writeFileSync(ROOT + '/_work/out/v26-kz-audit.json', JSON.stringify(rows, null, 1));
console.log('\n明细已写 _work/out/v26-kz-audit.json' + (SAVE ? '，官方图已存 _work/v17-avatars-fix/' : ''));
