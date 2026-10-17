/* v18 头像根治：按「物种 id 里的图鉴号」直接下载官方图（不再走名字查表，杜绝错位） */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import crypto from 'node:crypto';
const ROOT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植';
const AV = ROOT + '/_work/v17-avatars';
const AV_NEW = ROOT + '/_work/v17-avatars-v2';     /* 新目录，先不覆盖旧的，验证后替换 */
mkdirSync(AV_NEW, { recursive: true });
const F = ROOT + '/抓宠游戏-v12-clean.html';
const src = readFileSync(F, 'utf8');
function sliceLiteral(s, i) {
  const o = s.slice(i).search(/[[{]/); const from = i + o;
  const oc = s[from], cc = oc === '[' ? ']' : '}';
  let d = 0, j = from, inStr = null, esc = false;
  for (; j < s.length; j++) { const c = s[j];
    if (inStr) { if (esc) { esc = false; continue; } if (c === '\\') { esc = true; continue; } if (c === inStr) inStr = null; continue; }
    if (c === '"') { inStr = c; continue; }
    if (c === oc) d++; else if (c === cc) { d--; if (d === 0) { j++; break; } } }
  return s.slice(from, j);
}
const SP = new Function('return (' + sliceLiteral(src, src.indexOf('var SPECIES=') + 'var SPECIES='.length) + ')')();
const pks = SP.filter(s => s.pk).map(s => ({ id: s.id, name: s.name, num: Number(String(s.id).replace(/^pk-0*/, '')) }));
console.log('宝可梦 ' + pks.length + ' 只，图鉴号范围 ' + Math.min(...pks.map(p => p.num)) + ' ~ ' + Math.max(...pks.map(p => p.num)));
const GH = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/';
const JSD = 'https://fastly.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/other/home/';
const JSD2 = 'https://cdn.statically.io/gh/PokeAPI/sprites/master/sprites/pokemon/other/home/';
async function get(url, ms = 25000) {
  const ac = new AbortController(); const t = setTimeout(() => ac.abort(), ms);
  try {
    const r = await fetch(url, { signal: ac.signal, headers: { 'User-Agent': 'Mozilla/5.0 Chrome/120' } });
    if (!r.ok) return null;
    const b = Buffer.from(await r.arrayBuffer());
    return b.length > 500 ? b : null;
  } catch (e) { return null; } finally { clearTimeout(t); }
}
let idx = 0, ok = 0, fail = [];
const t0 = Date.now();
async function worker() {
  while (idx < pks.length) {
    const p = pks[idx++];
    const out = AV_NEW + '/' + p.id + '.png';
    if (existsSync(out)) { ok++; continue; }
    let buf = null;
    for (const u of [GH + p.num + '.png', JSD + p.num + '.png', JSD2 + p.num + '.png']) {
      buf = await get(u); if (buf) break;
      await new Promise(r => setTimeout(r, 150));
    }
    if (buf) { writeFileSync(out, buf); ok++; }
    else fail.push(p.name + '(' + p.id + ')');
    if (ok % 150 === 0 && ok) console.log('  已下 ' + ok + '/' + pks.length + '（' + ((Date.now() - t0) / 1000).toFixed(0) + 's）');
  }
}
const CONC = Number(process.argv[2] || 6);
await Promise.all(Array.from({ length: CONC }, worker));
console.log('\n下载完成：成功 ' + ok + ' 张 · 失败 ' + fail.length + '（' + ((Date.now() - t0) / 1000).toFixed(0) + 's）');
if (fail.length) console.log('失败：' + fail.slice(0, 20).join('、'));
/* 立即抽样验证哈希 */
const h = b => crypto.createHash('sha256').update(b).digest('hex');
let vOk = 0, vBad = [];
for (const n of [1, 4, 7, 25, 37, 38, 52, 147, 148, 150, 151, 152, 252, 888, 906, 1025]) {
  const id = 'pk-' + String(n).padStart(3, '0');
  const f = AV_NEW + '/' + id + '.png';
  if (!existsSync(f)) { vBad.push(id + '(无文件)'); continue; }
  const local = readFileSync(f);
  const off = await get(GH + n + '.png');
  if (off && h(off) === h(local)) vOk++; else vBad.push(id);
}
console.log('抽样验证：' + vOk + '/16 与官方图一致' + (vBad.length ? ' · 不一致：' + vBad.join(',') : ' ✅'));
