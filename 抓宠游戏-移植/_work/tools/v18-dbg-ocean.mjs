/* 诊断：为什么海洋/火山凿不通 */
import { makeConfig, makeMap, T } from './v18-mapgen.mjs';
const cfg = makeConfig(216, 156);
const { map: m, regionOf } = makeMap(cfg);
const { MW, MH, CX, CY, SPAWN } = cfg;
const idx = (x, y) => y * MW + x;
const BLOCK = new Set([T.TREE, T.WATER, T.LAVA, T.ROCK, T.DEEP]);
const seen = new Uint8Array(MW * MH);
const q = [idx(SPAWN.x, SPAWN.y)]; seen[q[0]] = 1;
while (q.length) {
  const cur = q.pop(); const x = cur % MW, y = (cur - x) / MW;
  for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
    if (nx < 0 || ny < 0 || nx >= MW || ny >= MH) continue;
    const i2 = idx(nx, ny);
    if (seen[i2] || BLOCK.has(m[i2])) continue;
    seen[i2] = 1; q.push(i2);
  }
}
/* 找海洋里每个不连通块的规模，看看是不是被切成了几十个小岛 */
const label = new Int32Array(MW * MH).fill(-1);
let comp = 0; const sizes = [];
for (let y = 1; y < MH - 1; y++) for (let x = 1; x < MW - 1; x++) {
  const i0 = idx(x, y);
  if (label[i0] >= 0 || BLOCK.has(m[i0])) continue;
  if (seen[i0]) continue;                 /* 只统计"走不到"的部分 */
  const stack = [i0]; label[i0] = comp; let n = 0;
  const regions = {};
  while (stack.length) {
    const cur = stack.pop(); const cx = cur % MW, cy = (cur - cx) / MW;
    n++; const r = regionOf(cx, cy); regions[r] = (regions[r] || 0) + 1;
    for (const [nx, ny] of [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]]) {
      if (nx < 1 || ny < 1 || nx >= MW - 1 || ny >= MH - 1) continue;
      const i2 = idx(nx, ny);
      if (label[i2] >= 0 || BLOCK.has(m[i2]) || seen[i2]) continue;
      label[i2] = comp; stack.push(i2);
    }
  }
  sizes.push({ comp, n, main: Object.entries(regions).sort((a, b) => b[1] - a[1])[0] });
  comp++;
}
sizes.sort((a, b) => b.n - a.n);
console.log('走不到的独立区域块：' + sizes.length + ' 个（前 12 大）');
sizes.slice(0, 12).forEach(s => console.log('  块#' + s.comp + ' 大小 ' + String(s.n).padStart(5) + '  主要属于：' + s.main[0] + ' (' + s.main[1] + ' 格)'));
/* 海洋的整体构成 */
let oceanTot = 0, oceanOk = 0, oceanDeep = 0, oceanWater = 0, oceanOther = 0;
for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
  if (regionOf(x, y) !== 'ocean') continue;
  oceanTot++;
  const v = m[idx(x, y)];
  if (seen[idx(x, y)]) oceanOk++;
  if (v === T.DEEP) oceanDeep++; else if (v === T.WATER) oceanWater++; else oceanOther++;
}
console.log('\n海洋：总 ' + oceanTot + ' 格 · 可达 ' + oceanOk + ' · 深海 ' + oceanDeep + ' · 浅水 ' + oceanWater + ' · 其他 ' + oceanOther);
/* 火山 */
let vTot = 0, vOk = 0, vLava = 0, vRock = 0, vOther = 0;
for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
  if (regionOf(x, y) !== 'volcano') continue;
  vTot++;
  const v = m[idx(x, y)];
  if (seen[idx(x, y)]) vOk++;
  if (v === T.LAVA) vLava++; else if (v === T.ROCK) vRock++; else vOther++;
}
console.log('火山：总 ' + vTot + ' 格 · 可达 ' + vOk + ' · 岩浆 ' + vLava + ' · 岩 ' + vRock + ' · 其他 ' + vOther);
/* 从 SPAWN 向正东凿一条线，看会撞到什么 */
console.log('\n从出生点向正东的直线（x=108→215, y=80）:');
let line = '  ';
const cnts = {};
for (let x = CX; x < MW; x++) {
  const v = m[idx(x, 80)];
  cnts[v] = (cnts[v] || 0) + 1;
  line += seen[idx(x, 80)] ? '#' : (BLOCK.has(v) ? ['·', 'o', '"', 'T', '~', 'H', '!', '#', 'D', '*', 's'][v] : ' ');
  if (x % 20 === 0 && x > CX) line += '|';
}
console.log(line);
console.log('  沿途地形计数：' + JSON.stringify(cnts));
