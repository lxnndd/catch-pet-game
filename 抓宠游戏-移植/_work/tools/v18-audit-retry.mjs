/* 补验：上一次因网络取不到官方图而跳过的那些 */
import { readFileSync, existsSync } from 'node:fs';
import crypto from 'node:crypto';
const ROOT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植';
const AV = ROOT + '/_work/v17-avatars';
const h = b => crypto.createHash('sha256').update(b).digest('hex');
const SRC = [
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/',
  'https://fastly.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/other/home/',
  'https://cdn.statically.io/gh/PokeAPI/sprites/master/sprites/pokemon/other/home/',
];
async function get(url, ms = 25000) {
  const ac = new AbortController(); const t = setTimeout(() => ac.abort(), ms);
  try { const r = await fetch(url, { signal: ac.signal, headers: { 'User-Agent': 'Mozilla/5.0 Chrome/120' } }); if (!r.ok) return null; return Buffer.from(await r.arrayBuffer()); }
  catch (e) { return null; } finally { clearTimeout(t); }
}
const ids = [];
for (let i = 1; i <= 1025; i++) ids.push(i);
console.log('逐张复核（只报问题，全部要过）…');
let ok = 0, bad = [], unknown = [];
const t0 = Date.now();
for (let k = 0; k < ids.length; k++) {
  const id = ids[k];
  const f = AV + '/pk-' + String(id).padStart(3, '0') + '.png';
  if (!existsSync(f)) { bad.push(id + '(缺文件)'); continue; }
  const local = readFileSync(f);
  let off = null;
  for (const s of SRC) { off = await get(s + id + '.png'); if (off) break; await new Promise(r => setTimeout(r, 300)); }
  if (!off) { unknown.push(id); continue; }
  if (h(local) === h(off)) ok++;
  else bad.push(id);
  if ((k + 1) % 250 === 0) console.log('  ' + (k + 1) + '/1025 · 一致 ' + ok + ' · 不一致 ' + bad.length + ' · 取不到 ' + unknown.length + '（' + ((Date.now() - t0) / 1000).toFixed(0) + 's）');
}
console.log('\n═══ 复核结果 ═══');
console.log('一致 ' + ok + ' / 1025');
console.log('不一致 ' + bad.length + (bad.length ? '：' + bad.join(',') : ' ✅ 无'));
console.log('官方图仍取不到 ' + unknown.length + (unknown.length ? '：' + unknown.join(',') : ' ✅ 无'));
