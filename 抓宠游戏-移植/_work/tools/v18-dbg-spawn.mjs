/* 调试：出生点与医院周边的真实地形 + 平原环为什么走不通 */
import { makeConfig, makeMap, T, TNAME, ringD } from './v18-mapgen.mjs';
const cfg = makeConfig(216, 156);
const { map: m, regionOf } = makeMap(cfg);
const { MW, MH, CX, CY, SPAWN, HOSP } = cfg;
const idx = (x, y) => y * MW + x;
const CH = { 0: '·', 1: 'o', 2: '"', 3: 'T', 4: '~', 5: 'H', 6: '!', 7: '#', 8: 'D', 9: '*', 10: 's' };
function show(cx, cy, r, title) {
  console.log('\n' + title + '（中心 ' + cx + ',' + cy + '，范围 ±' + r + '）');
  for (let y = cy - r; y <= cy + r; y++) {
    let row = '  ';
    for (let x = cx - r; x <= cx + r; x++) {
      if (x < 0 || y < 0 || x >= MW || y >= MH) { row += ' '; continue; }
      const v = m[idx(x, y)];
      row += (x === SPAWN.x && y === SPAWN.y) ? 'S' : (x === HOSP.x && y === HOSP.y) ? 'H' : (CH[v] || '?');
    }
    console.log(row + (y === SPAWN.y ? '  ← 出生点行(S)' : (y === HOSP.y ? '  ← 医院行(H)' : '')));
  }
  console.log('  图例 ·路 o草 "高草 T树 ~水 H医院 !岩浆 #岩 D深海 *花 s雪');
}
show(SPAWN.x, SPAWN.y, 14, '出生点周边');
show(HOSP.x, HOSP.y, 8, '医院周边');

console.log('\n═══ 平原环（d≤15.2）内部地形统计 ═══');
const ratio = 1.38;
const RB0 = 15.2;
const cnt = {};
let plainTot = 0;
for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
  const d = ringD(x, y, CX, CY, ratio);
  if (d > RB0) continue;
  if (x === 0 || y === 0 || x === MW - 1 || y === MH - 1) continue;
  plainTot++;
  const v = m[idx(x, y)];
  cnt[TNAME[v]] = (cnt[TNAME[v]] || 0) + 1;
}
console.log('  总格数 ' + plainTot + '：' + Object.entries(cnt).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ' + v).join(' · '));
/* 从出生点 BFS，看能走多远，画可达范围 */
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
console.log('\n可达范围（#可走 .不可走，±30 格）：');
for (let y = SPAWN.y - 12; y <= SPAWN.y + 12; y += 1) {
  let row = '  ';
  for (let x = SPAWN.x - 30; x <= SPAWN.x + 30; x += 1) {
    if (x < 0 || y < 0 || x >= MW || y >= MH) { row += ' '; continue; }
    row += seen[idx(x, y)] ? '#' : '.';
  }
  console.log(row);
}
