/* v17 地图可达性诊断：从出生点洪水填充，看哪些地区走不到 + 医院十字 + 雪原/矿洞边界 */
import { readFileSync } from 'node:fs';
const F = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/抓宠游戏-v12-clean.html';
const src = readFileSync(F, 'utf8');
function sliceLiteral(s, i) {
  const o = s.slice(i).search(/[[{]/); const from = i + o;
  const oc = s[from], cc = oc === '[' ? ']' : '}';
  let d = 0, j = from, inStr = null, esc = false;
  for (; j < s.length; j++) { const c = s[j];
    if (inStr) { if (esc) { esc = false; continue; } if (c === '\\') { esc = true; continue; } if (c === inStr) inStr = null; continue; }
    if (c === '"' || c === "'") { inStr = c; continue; }
    if (c === oc) d++; else if (c === cc) { d--; if (d === 0) { j++; break; } }
  }
  return s.slice(from, j);
}
const g = (n) => { const i = src.indexOf('var ' + n + '='); return i < 0 ? null : new Function('return (' + sliceLiteral(src, i + ('var ' + n + '=').length) + ')')(); };
const MW = 72, MH = 52;
const T = { PATH: 0, GRASS: 1, TALL: 2, TREE: 3, WATER: 4, HOSP: 5, LAVA: 6, ROCK: 7, DEEP: 8, FLOWER: 9 };
const TNAME = ['PATH路', 'GRASS草', 'TALL高草', 'TREE树', 'WATER水', 'HOSP医院', 'LAVA岩浆', 'ROCK岩', 'DEEP深海', 'FLOWER花'];
const HOSP = { x: 36, y: 26 }, SPAWN = { x: 36, y: 28 };
const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
/* 复刻 gameMap（去掉 UI 相关） */
function makeMap() {
  const m = [];
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    let v = T.GRASS;
    if (x === 0 || y === 0 || x === MW - 1 || y === MH - 1) v = T.TREE;
    m.push(v);
  }
  for (let x = 1; x < MW - 1; x++) m[Math.floor(MH / 2) * MW + x] = T.PATH;
  for (let y = 1; y < MH - 1; y++) m[y * MW + Math.floor(MW / 2)] = T.PATH;
  const patch = (cx, cy, r, kind) => {
    for (let py = cy - r; py <= cy + r; py++) for (let px = cx - r; px <= cx + r; px++) {
      if (px < 1 || py < 1 || px >= MW - 1 || py >= MH - 1) continue;
      if (Math.abs(px - cx) + Math.abs(py - cy) > r) continue;
      if (Math.random() < .82) m[py * MW + px] = kind;
    }
  };
  const ring = (cx, cy, rIn, rOut, kindIn, kindOut) => {
    for (let py = cy - rOut; py <= cy + rOut; py++) for (let px = cx - rOut; px <= cx + rOut; px++) {
      if (px < 1 || py < 1 || px >= MW - 1 || py >= MH - 1) continue;
      const d = Math.abs(px - cx) + Math.abs(py - cy);
      if (d <= rIn) m[py * MW + px] = kindIn;
      else if (d <= rOut && Math.random() < .85) m[py * MW + px] = kindOut;
    }
  };
  patch(36, 16, 4, T.TALL); patch(30, 30, 3, T.TALL); patch(22, 22, 3, T.TALL);
  patch(46, 24, 3, T.TALL); patch(50, 40, 3, T.TALL); patch(26, 40, 3, T.TALL);
  patch(14, 32, 3, T.TALL); patch(42, 8, 3, T.TALL); patch(34, 44, 3, T.TALL);
  patch(18, 44, 2, T.TALL); patch(56, 20, 2, T.TALL); patch(60, 36, 3, T.TALL);
  patch(22, 24, 3, T.WATER); patch(30, 38, 3, T.WATER); patch(14, 14, 2, T.WATER);
  patch(48, 14, 2, T.WATER); patch(12, 44, 2, T.WATER); patch(40, 34, 2, T.WATER);
  ring(12, 12, 3, 5, T.FLOWER, T.GRASS); patch(12, 16, 2, T.TALL);
  ring(34, 12, 3, 5, T.FLOWER, T.GRASS); patch(34, 16, 2, T.TALL);
  patch(56, 8, 4, T.ROCK); patch(62, 12, 3, T.ROCK); patch(52, 10, 2, T.ROCK);
  patch(58, 14, 3, T.TALL); patch(64, 6, 2, T.TALL); patch(54, 16, 2, T.TALL);
  patch(44, 6, 4, T.ROCK); patch(50, 6, 3, T.ROCK); patch(47, 12, 2, T.ROCK);
  patch(44, 11, 2, T.TALL); patch(52, 4, 2, T.TALL); patch(49, 15, 2, T.TALL);
  patch(10, 44, 4, T.LAVA); patch(15, 48, 3, T.LAVA); patch(8, 38, 3, T.LAVA); patch(20, 44, 2, T.LAVA);
  patch(6, 48, 2, T.TALL); patch(14, 40, 2, T.TALL); patch(22, 48, 2, T.TALL); patch(12, 50, 2, T.TALL);
  patch(34, 50, 3, T.PATH); patch(40, 48, 2, T.PATH); patch(28, 50, 2, T.PATH);
  patch(36, 48, 2, T.TALL); patch(44, 46, 2, T.TALL);
  ring(64, 26, 5, 9, T.DEEP, T.WATER);
  patch(54, 26, 3, T.TALL); patch(52, 34, 2, T.TALL); patch(56, 16, 2, T.TALL);
  let t = 0;
  while (t < 460) { const rx = ri(1, MW - 2), ry = ri(1, MH - 2); if (m[ry * MW + rx] === T.GRASS) { m[ry * MW + rx] = T.TREE; t++; } }
  m[HOSP.y * MW + HOSP.x] = T.HOSP;
  m[HOSP.y * MW + HOSP.x] = T.HOSP;
  return m;
}
const tileAt = (m, x, y) => (x < 0 || y < 0 || x >= MW || y >= MH) ? T.TREE : m[y * MW + x];
function regionAt(m, x, y) {
  if (x >= 60) return 'ocean';
  if (x <= 22 && y >= 38) return 'volcano';
  if (y <= 16 && x >= 50) return 'snow';
  if (y <= 14 && x >= 40 && x < 50) return 'mine';
  let flower = 0;
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (tileAt(m, x + dx, y + dy) === T.FLOWER) flower++;
  if (flower >= 4) return 'flower';
  if (y >= 44 && x >= 24 && x < 48) return 'desert';
  let tree = 0, water = 0;
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    const v = tileAt(m, x + dx, y + dy);
    if (v === T.TREE) tree++; else if (v === T.WATER) water++;
  }
  if (tree >= 9) return 'forest';
  if (water >= 3) return 'water';
  return 'plain';
}
const BLOCK = new Set([T.TREE, T.WATER, T.LAVA, T.ROCK, T.DEEP]);
const NAME = { plain: '平原', forest: '林间', water: '水畔', flower: '花海', snow: '雪原', mine: '矿洞', volcano: '火山地带', desert: '荒漠', ocean: '海洋' };

let m = makeMap();
/* 洪水填充（无水系宠、不骑乘） */
const seen = new Uint8Array(MW * MH);
const q = [[SPAWN.x, SPAWN.y]];
seen[SPAWN.y * MW + SPAWN.x] = 1;
let reach = 0;
while (q.length) {
  const [x, y] = q.pop(); reach++;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= MW || ny >= MH) continue;
    const idx = ny * MW + nx;
    if (seen[idx]) continue;
    if (BLOCK.has(m[idx])) continue;
    seen[idx] = 1; q.push([nx, ny]);
  }
}
console.log('地图 ' + MW + '×' + MH + ' = ' + (MW * MH) + ' 格');
console.log('从出生点能走到的格子：' + reach + ' / ' + (MW * MH) + '（' + (reach / (MW * MH) * 100).toFixed(1) + '%）');
console.log('\n═══ 各地区：格子数 / 其中可走到 / 可达率 ═══');
const stat = {};
for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
  const r = regionAt(m, x, y);
  stat[r] = stat[r] || { total: 0, ok: 0 };
  stat[r].total++;
  if (seen[y * MW + x]) stat[r].ok++;
}
Object.keys(stat).forEach(r => {
  const s = stat[r];
  const pct = (s.ok / s.total * 100).toFixed(1);
  const flag = s.ok === 0 ? '  ❌ 完全走不进去！' : (pct < 15 ? '  ⚠️ 几乎进不去' : '');
  console.log('  ' + (NAME[r] || r).padEnd(10) + String(s.total).padStart(5) + ' 格   可达 ' + String(s.ok).padStart(5) + '   ' + pct.padStart(5) + '%' + flag);
});
console.log('\n═══ 医院周围 9×9 地形（HOSP 在 ' + HOSP.x + ',' + HOSP.y + '）═══');
for (let y = HOSP.y - 4; y <= HOSP.y + 4; y++) {
  let row = '  ';
  for (let x = HOSP.x - 4; x <= HOSP.x + 4; x++) {
    const v = tileAt(m, x, y);
    const ch = v === T.HOSP ? 'H' : v === T.PATH ? '·' : v === T.TREE ? 'T' : v === T.TALL ? '"' : v === T.WATER ? '~' : v === T.ROCK ? '#' : v === T.LAVA ? '!' : v === T.DEEP ? 'D' : v === T.FLOWER ? '*' : 'o';
    row += ch;
  }
  console.log(row + (y === HOSP.y ? '   ← 医院所在行（H=医院 ·=路 o=草 T=树 "=高草 ~=水 #=岩 *=花）' : ''));
}
console.log('\n═══ 北部 y=1..16 的地形带（x=0..71，每 2 格取 1）═══');
for (let y = 1; y <= 16; y += 1) {
  let row = '  y' + String(y).padStart(2) + ' ';
  for (let x = 0; x < MW; x += 2) {
    const v = tileAt(m, x, y);
    const ch = v === T.HOSP ? 'H' : v === T.PATH ? '·' : v === T.TREE ? 'T' : v === T.TALL ? '"' : v === T.WATER ? '~' : v === T.ROCK ? '#' : v === T.LAVA ? '!' : v === T.DEEP ? 'D' : v === T.FLOWER ? '*' : 'o';
    row += ch;
  }
  console.log(row);
}
console.log('\n图例：·=路 o=草 "=高草 T=树 ~=水 #=岩 ! =岩浆 *=花 H=医院');
console.log('x 轴每字符代表 2 格；x=40 对应第 20 个字符，x=50 对应第 25 个字符（矿洞 vs 雪原分界）');
