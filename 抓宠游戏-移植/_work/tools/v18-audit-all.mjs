/* 全量审查：1025 张宝可梦头像逐张与 PokéAPI 官方图比对哈希 */
import { readFileSync, existsSync } from 'node:fs';
import crypto from 'node:crypto';
const ROOT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植';
const AV = ROOT + '/_work/v17-avatars';
const GH = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/';
const JSD = 'https://fastly.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/other/home/';
const h = b => crypto.createHash('sha256').update(b).digest('hex');
async function get(url, ms = 20000) {
  const ac = new AbortController(); const t = setTimeout(() => ac.abort(), ms);
  try { const r = await fetch(url, { signal: ac.signal, headers: { 'User-Agent': 'Mozilla/5.0 Chrome/120' } }); if (!r.ok) return null; return Buffer.from(await r.arrayBuffer()); }
  catch (e) { return null; } finally { clearTimeout(t); }
}
const ids = [];
for (let i = 1; i <= 1025; i++) ids.push(i);
console.log('全量审查 ' + ids.length + ' 张（宝可梦 1~1025）…');
let idx = 0, ok = 0, bad = [], skip = 0;
const t0 = Date.now();
async function worker() {
  while (idx < ids.length) {
    const id = ids[idx++];
    const pad = String(id).padStart(3, '0');
    const f = AV + '/pk-' + pad + '.png';
    if (!existsSync(f)) { bad.push(id + '(无文件)'); continue; }
    const local = readFileSync(f);
    let off = await get(GH + id + '.png');
    if (!off) off = await get(JSD + id + '.png');
    if (!off) { skip++; continue; }
    if (h(local) === h(off)) ok++;
    else bad.push(id);
    const done = ok + bad.length + skip;
    if (done % 200 === 0) console.log('  进度 ' + done + '/' + ids.length + '（一致 ' + ok + ' · 不一致 ' + bad.length + ' · 跳过 ' + skip + '）' + ((Date.now() - t0) / 1000).toFixed(0) + 's');
  }
}
await Promise.all(Array.from({ length: 8 }, worker));
console.log('\n═══ 审查结果 ═══');
console.log('✅ 与官方图完全一致：' + ok);
console.log('❌ 不一致：' + bad.length + (bad.length ? '：' + bad.slice(0, 25).join(',') + (bad.length > 25 ? ' …' : '') : ''));
console.log('⚠️ 官方图取不到（跳过）：' + skip);
console.log('耗时 ' + ((Date.now() - t0) / 1000).toFixed(0) + 's');
