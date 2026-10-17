/* 头像哈希审查：本地 pk-NNN.png 是否真的等于官方图鉴号 NNN 的图 */
import { readFileSync, existsSync } from 'node:fs';
import crypto from 'node:crypto';
const ROOT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植';
const AV = ROOT + '/_work/v17-avatars';
const h = b => crypto.createHash('sha256').update(b).digest('hex');
const GH = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/';
async function get(url, ms = 20000) {
  const ac = new AbortController(); const t = setTimeout(() => ac.abort(), ms);
  try { const r = await fetch(url, { signal: ac.signal }); if (!r.ok) return null; return Buffer.from(await r.arrayBuffer()); }
  catch (e) { return null; } finally { clearTimeout(t); }
}
/* 审查范围：前 60 号 + 140~160（覆盖用户报的 37 与 148） */
const IDS = [];
for (let i = 1; i <= 60; i++) IDS.push(i);
for (let i = 140; i <= 160; i++) IDS.push(i);
console.log('审查 ' + IDS.length + ' 个图鉴号的本地头像 vs 官方图…');
const bad = [], okList = [], noFile = [];
let idx = 0;
const CONC = 8;
async function worker() {
  while (idx < IDS.length) {
    const id = IDS[idx++];
    const f = AV + '/pk-' + String(id).padStart(3, '0') + '.png';
    if (!existsSync(f)) { noFile.push(id); continue; }
    const local = readFileSync(f);
    const off = await get(GH + id + '.png');
    if (!off) continue;
    if (h(local) === h(off)) okList.push(id);
    else {
      /* 找出本地这张图其实是哪个 id 的（在审查范围内比对） */
      let actual = null;
      for (const j of IDS) {
        if (j === id) continue;
        const r = await get(GH + j + '.png');
        if (r && h(r) === h(local)) { actual = j; break; }
      }
      bad.push({ id, actual, size: local.length });
    }
  }
}
await Promise.all(Array.from({ length: CONC }, worker));
console.log('\n✅ 正确 ' + okList.length + ' 个 · ❌ 错误 ' + bad.length + ' 个 · 无文件 ' + noFile.length);
if (bad.length) {
  console.log('\n错位的（本地文件其实是别人的图）：');
  bad.forEach(b => console.log('  pk-' + String(b.id).padStart(3, '0') + ' 实际内容是 #' + (b.actual === null ? '未知(不在审查范围)' : b.actual)));
  /* 偏移量统计 */
  const shifts = {};
  bad.forEach(b => { if (b.actual !== null) { const d = b.actual - b.id; shifts[d] = (shifts[d] || 0) + 1; } });
  console.log('\n偏移分布（实际id - 应有id）：' + Object.entries(shifts).map(([k, v]) => k + '→' + v + '个').join(' · '));
}
console.log('\n正确的 id：' + okList.join(','));
