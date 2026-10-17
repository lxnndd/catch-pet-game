/* v18 环形地图生成器（在 Node 里先独立验证：可达率、地区分布、火山↔海洋间距）
   与写进游戏的版本保持同一份逻辑 */
export const T = { PATH: 0, GRASS: 1, TALL: 2, TREE: 3, WATER: 4, HOSP: 5, LAVA: 6, ROCK: 7, DEEP: 8, FLOWER: 9, SNOW: 10 };
export const TNAME = { 0: '路', 1: '草', 2: '高草', 3: '树', 4: '水', 5: '医院', 6: '岩浆', 7: '岩', 8: '深海', 9: '花', 10: '雪' };

export function makeConfig(mw, mh) {
  const C = { x: Math.floor(mw / 2), y: Math.floor(mh / 2) };
  return { MW: mw, MH: mh, CX: C.x, CY: C.y, HOSP: { x: C.x + 8, y: C.y - 3 }, SPAWN: { x: C.x, y: C.y + 2 } };
}
/* 椭圆距离：让环在宽地图上也是"环"，而不是扁条 */
export function ringD(x, y, cx, cy, ratio) {
  return Math.max(Math.abs(x - cx) / ratio, Math.abs(y - cy));
}
/* 表观半径（用于定环边界） */
export function ringSpan(mw, mh, ratio) {
  return Math.min((mw / 2 - 2) / ratio, mh / 2 - 2);
}
export const REGION_NAME = { plain: '平原', forest: '林间', water: '水畔', flower: '花海', mine: '矿洞', desert: '荒漠', ocean: '海洋', volcano: '火山地带', snow: '雪原' };
/* 用户定稿的等级段 */
export const LV_RANGE = { plain: [1, 25], forest: [1, 25], water: [1, 25], flower: [26, 35], mine: [36, 45], desert: [46, 55], ocean: [56, 65], volcano: [66, 75], snow: [66, 75] };

export function makeMap(cfg, rand = Math.random) {
  const { MW, MH, CX, CY, HOSP, SPAWN } = cfg;
  const ratio = 1.38;
  const span = ringSpan(MW, MH, ratio);
  const RB = [span * 0.20, span * 0.40, span * 0.58, span * 0.76];   /* 平原/花海/矿洞/荒漠 的外边界 */
  const m = new Array(MW * MH);
  const ri = (a, b) => a + Math.floor(rand() * (b - a + 1));
  const idx = (x, y) => y * MW + x;
  const inb = (x, y) => x >= 1 && y >= 1 && x < MW - 1 && y < MH - 1;

  /* ── 1. 底色按环 + 方位定地区 ── */
  function regionOf(x, y) {
    const d = ringD(x, y, CX, CY, ratio);
    if (d <= RB[0]) return 'plain';
    if (d <= RB[1]) return 'flower';
    if (d <= RB[2]) return 'mine';
    if (d <= RB[3]) return 'desert';
    /* 最外圈按方位分：北→雪原，东/南→海洋，西/西南→火山。
       用「归一化方向比重」判定，避免 dx≈0 / dy≈0 的死角把两个地区贴到一起。 */
    const dx = x - CX, dy = y - CY;
    const nx = dx / (MW / 2), ny = dy / (MH / 2);
    const n = Math.abs(ny), e = Math.abs(nx);
    if (dy < 0 && n > 1.15 * e) return 'snow';          /* 正北一条带 = 雪原 */
    if (dx > 0 && e >= n / 1.15) {                     /* 正东 */
      if (e < 0.78) return 'desert';                     /* 靠内的窄带当海滩/沙地，隔开海洋与雪原 */
      return 'ocean';
    }
    if (dy > 0 && n > 1.15 * e) {                        /* 正南（海岸） */
      if (n < 0.74) return 'desert';
      return 'ocean';
    }
    return 'volcano';                                    /* 西侧与西南角 */
  }
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    if (x === 0 || y === 0 || x === MW - 1 || y === MH - 1) { m[idx(x, y)] = T.TREE; continue; }
    const r = regionOf(x, y);
    const d = ringD(x, y, CX, CY, ratio);
    let v = T.GRASS;
    if (r === 'plain') v = rand() < 0.06 ? T.TALL : T.GRASS;
    else if (r === 'flower') v = rand() < 0.14 ? T.FLOWER : (rand() < 0.10 ? T.TALL : T.GRASS);
    else if (r === 'mine') v = rand() < 0.55 ? T.ROCK : (rand() < 0.25 ? T.TALL : T.GRASS);
    else if (r === 'desert') v = rand() < 0.12 ? T.TALL : T.PATH;
    else if (r === 'snow') v = rand() < 0.10 ? T.ROCK : T.SNOW;
    else if (r === 'volcano') v = rand() < 0.14 ? T.LAVA : (rand() < 0.22 ? T.ROCK : T.GRASS);
    else if (r === 'ocean') {
      /* 深海核心 + 浅水外环 + 靠内一侧留沙滩 */
      const inner = d < RB[3] + (span - RB[3]) * 0.35;
      v = inner ? (rand() < 0.55 ? T.WATER : T.PATH) : (rand() < 0.42 ? T.WATER : T.DEEP);
    }
    m[idx(x, y)] = v;
  }

  /* ── 2. 道路骨架先立起来（后面撒树/水/岩一律不许压路）── */
  /* 中心广场 */
  for (let y = CY - 4; y <= CY + 4; y++) for (let x = CX - 4; x <= CX + 4; x++) if (inb(x, y)) m[idx(x, y)] = T.PATH;
  /* 十字大道 */
  for (let x = 2; x < MW - 2; x++) m[idx(x, CY)] = T.PATH;
  for (let y = 2; y < MH - 2; y++) m[idx(CX, y)] = T.PATH;
  /* 辐射大道：从中心向外穿透所有环，16 个方向（保证每个地区都有入口）*/
  const ROADS = 16;
  for (let i = 0; i < ROADS; i++) {
    const a = (Math.PI * 2 * i) / ROADS + 0.15;
    const ca = Math.cos(a), sa = Math.sin(a);
    for (let t = 0; t < span * 1.15; t++) {
      const x = Math.round(CX + ca * t * ratio), y = Math.round(CY + sa * t);
      if (!inb(x, y)) break;
      m[idx(x, y)] = T.PATH;
      if (t % 2 === 0) { /* 路稍微加宽，方便走 */ if (inb(x + 1, y)) m[idx(x + 1, y)] = T.PATH; if (inb(x, y + 1) && t % 4 === 0) m[idx(x, y + 1)] = T.PATH; }
    }
  }
  /* 环间环路：每道环边界附近铺一圈路，方便横向换地区 */
  RB.forEach((rb, k) => {
    if (k === 0) return;                        /* 最内环不用（有中心广场） */
    const rr = rb - 2;
    for (let a = 0; a < Math.PI * 2; a += 0.012) {
      let x = Math.round(CX + Math.cos(a) * rr * ratio), y = Math.round(CY + Math.sin(a) * rr);
      if (inb(x, y)) m[idx(x, y)] = T.PATH;
      if (inb(x + 1, y)) m[idx(x + 1, y)] = T.PATH;
      y = y + 1; if (inb(x, y)) m[idx(x, y)] = T.PATH;
    }
  });
  const isRoad = (x, y) => inb(x, y) && m[idx(x, y)] === T.PATH;

  /* ── 3. 各环特色点缀（一律跳过路面）── */
  const blob = (cx, cy, r, kind, p = 0.8) => {
    for (let py = cy - r; py <= cy + r; py++) for (let px = cx - r; px <= cx + r; px++) {
      if (!inb(px, py)) continue;
      if (Math.abs(px - cx) + Math.abs(py - cy) > r) continue;
      if (rand() < p) m[idx(px, py)] = kind;
    }
  };
  /* 花海：内环一圈花田带 */
  for (let y = 1; y < MH - 1; y++) for (let x = 1; x < MW - 1; x++) {
    const d = ringD(x, y, CX, CY, ratio);
    if (d > RB[0] && d <= RB[1] && rand() < 0.34 && !isRoad(x, y)) m[idx(x, y)] = T.FLOWER;
  }
  /* 水畔/林间：在 1-25 段里散布池塘与树林 */
  const pondCount = Math.round(MW * MH * 0.0016);
  for (let i = 0; i < pondCount; i++) {
    const a = rand() * Math.PI * 2, rr = 16 + rand() * (RB[1] - 16);
    blob(Math.round(CX + Math.cos(a) * rr * ratio), Math.round(CY + Math.sin(a) * rr), ri(2, 3), T.WATER, 0.9);
  }
  const woodCount = Math.round(MW * MH * 0.0022);
  for (let i = 0; i < woodCount; i++) {
    const a = rand() * Math.PI * 2, rr = 20 + rand() * (RB[1] - 20);
    blob(Math.round(CX + Math.cos(a) * rr * ratio), Math.round(CY + Math.sin(a) * rr), ri(2, 3), T.TREE, 0.82);
  }
  /* 火山口：西侧一大片岩浆湖 */
  blob(Math.round(CX - span * ratio * 0.88), CY + Math.round(span * 0.25), 9, T.LAVA, 0.92);
  blob(Math.round(CX - span * ratio * 0.80), CY - Math.round(span * 0.35), 7, T.LAVA, 0.9);
  /* 雪原：北侧雪地里的冰丘点缀 */
  blob(Math.round(CX - 20), Math.round(CY - span * 0.9), 6, T.ROCK, 0.55);
  blob(Math.round(CX + 30), Math.round(CY - span * 0.86), 5, T.ROCK, 0.5);
  /* 海洋里的几座小岛（不挡路，当景观） */
  for (let i = 0; i < 6; i++) {
    blob(Math.round(CX + span * ratio * (0.72 + rand() * 0.26)), CY + ri(-Math.round(span * 0.5), Math.round(span * 0.5)), ri(2, 3), T.TALL, 0.8);
  }
  /* 荒漠：几处绿洲 */
  for (let i = 0; i < 8; i++) blob(CX + ri(-Math.round(span * ratio * 0.72), Math.round(span * ratio * 0.72)), CY + ri(-Math.round(span * 0.7), Math.round(span * 0.7)), ri(1, 2), T.WATER, 0.75);

  /* ── 4. 出生点与医院必须能站人、能走出去（先清出 5×5 空地，再做可达性修复）── */
  const clearPad = (cx, cy, r) => {
    for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) {
      if (!inb(x, y)) continue;
      const d = Math.abs(x - cx) + Math.abs(y - cy);
      if (d === 0 || rand() < 0.85) m[idx(x, y)] = T.PATH;
      else if (m[idx(x, y)] === T.TREE || m[idx(x, y)] === T.ROCK || m[idx(x, y)] === T.WATER || m[idx(x, y)] === T.LAVA || m[idx(x, y)] === T.DEEP) m[idx(x, y)] = T.GRASS;
    }
  };
  clearPad(SPAWN.x, SPAWN.y, 3);
  clearPad(HOSP.x, HOSP.y, 2);
  m[idx(HOSP.x, HOSP.y)] = T.HOSP;
  for (const [nx, ny] of [[HOSP.x + 1, HOSP.y], [HOSP.x - 1, HOSP.y], [HOSP.x, HOSP.y + 1], [HOSP.x, HOSP.y - 1]]) m[idx(nx, ny)] = T.PATH;
  m[idx(SPAWN.x, SPAWN.y)] = T.PATH;

  /* ── 5. 可达性修复：每次 BFS 后，把「离出生点最近却走不到」的那片地区，
        沿最短路把挡路的格子凿成通道（保证真正连通，而不是撒孤立碎片） ── */
  const BLOCK = new Set([T.TREE, T.WATER, T.LAVA, T.ROCK, T.DEEP]);
  function bfs() {
    const seen = new Uint8Array(MW * MH);
    const parent = new Int32Array(MW * MH).fill(-1);
    const q = [idx(SPAWN.x, SPAWN.y)];
    seen[q[0]] = 1;
    for (let head = 0; head < q.length; head++) {
      const cur = q[head]; const x = cur % MW, y = (cur - x) / MW;
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        if (!inb(nx, ny)) continue;
        const i2 = idx(nx, ny);
        if (seen[i2] || BLOCK.has(m[i2])) continue;
        seen[i2] = 1; parent[i2] = cur; q.push(i2);
      }
    }
    return { seen, parent, order: q };
  }
  let opened = 0;
  for (let pass = 0; pass < 80; pass++) {
    const { seen, parent, order } = bfs();
    const stat = {};
    for (let y = 1; y < MH - 1; y++) for (let x = 1; x < MW - 1; x++) {
      const r = regionOf(x, y);
      stat[r] = stat[r] || { tot: 0, ok: 0 };
      stat[r].tot++; if (seen[idx(x, y)]) stat[r].ok++;
    }
    let worst = null;
    Object.keys(stat).forEach(r => {
      const pct = stat[r].ok / stat[r].tot;
      if (pct < 0.60 && (!worst || pct < worst.pct)) worst = { r, pct };
    });
    if (!worst) break;
    /* 找该地区里「离出生点最近」的可走但走不到的格子（BFS 顺序天然由近到远） */
    let target = -1;
    for (const cur of order) { /* order 里都是可达的，跳过 */ }
    /* 改成：直接扫该地区的不可走格子，挑一个邻域里离可达区最近的 */
    let best = null;
    for (let y = 1; y < MH - 1; y++) for (let x = 1; x < MW - 1; x++) {
      if (regionOf(x, y) !== worst.r) continue;
      const i2 = idx(x, y);
      if (!BLOCK.has(m[i2])) continue;              /* 已经是可走的，不用凿 */
      /* 环视周围，找最近的「已可达」格子，记下步数 */
      for (let rad = 1; rad <= 6 && !best; rad++) {
        for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== rad) continue;
          const nx = x + dx, ny = y + dy;
          if (!inb(nx, ny)) continue;
          if (seen[idx(nx, ny)]) { best = { x, y, near: idx(nx, ny) }; break; }
        }
        if (best) break;
      }
      if (best) break;
    }
    if (!best) { /* 该地区与可达区完全不相邻（被别的地区隔开）→ 从最近的可达格子朝它硬凿一条线 */
      let any = null;
      for (let y = 1; y < MH - 1 && !any; y++) for (let x = 1; x < MW - 1; x++) {
        if (regionOf(x, y) === worst.r) { any = { x, y }; break; }
      }
      if (!any) break;
      /* 朝出生点方向走，沿途全凿通 */
      let cx2 = any.x, cy2 = any.y, guard = 0;
      while (guard++ < 400 && (cx2 !== SPAWN.x || cy2 !== SPAWN.y)) {
        if (inb(cx2, cy2) && m[idx(cx2, cy2)] !== T.HOSP) { m[idx(cx2, cy2)] = T.PATH; opened++; }
        if (Math.abs(SPAWN.x - cx2) > Math.abs(SPAWN.y - cy2)) cx2 += Math.sign(SPAWN.x - cx2);
        else cy2 += Math.sign(SPAWN.y - cy2);
      }
      continue;
    }
    /* 从该地区的这个格子，朝出生点方向【直线凿穿】直到接到已可达的路（保证连通） */
    let cx2 = best.x, cy2 = best.y;
    let guard = 0;
    const SR = 1 / ratio;
    while (guard++ < 400) {
      if (inb(cx2, cy2)) {
        if (m[idx(cx2, cy2)] !== T.HOSP) { m[idx(cx2, cy2)] = T.PATH; opened++; }
        if (seen[idx(cx2, cy2)]) break;            /* 接到已有通路就停 */
      }
      const ddx = SPAWN.x - cx2, ddy = SPAWN.y - cy2;
      if (ddx === 0 && ddy === 0) break;
      if (Math.abs(ddx) * SR > Math.abs(ddy)) cx2 += Math.sign(ddx);
      else cy2 += Math.sign(ddy);
    }
  }

  /* ── 5. 边界墙 + 医院 + 出生点 ── */
  for (let x = 0; x < MW; x++) { m[idx(x, 0)] = T.TREE; m[idx(x, MH - 1)] = T.TREE; }
  for (let y = 0; y < MH; y++) { m[idx(0, y)] = T.TREE; m[idx(MW - 1, y)] = T.TREE; }
  m[idx(HOSP.x, HOSP.y)] = T.HOSP;
  /* 医院四邻必须可走，否则玩家够不到 */
  for (const [nx, ny] of [[HOSP.x + 1, HOSP.y], [HOSP.x - 1, HOSP.y], [HOSP.x, HOSP.y + 1], [HOSP.x, HOSP.y - 1]]) m[idx(nx, ny)] = T.PATH;
  m[idx(SPAWN.x, SPAWN.y)] = T.PATH;
  return { map: m, regionOf, RB, span, ratio, opened };
}

/* 独立验证 */
if (process.argv[1] && process.argv[1].endsWith('v18-mapgen.mjs')) {
  const cfg = makeConfig(216, 156);
  const { map: m, regionOf, opened, span, RB } = makeMap(cfg);
  const { MW, MH, CX, CY, SPAWN, HOSP } = cfg;
  const T2 = T;
  const BLOCK = new Set([T2.TREE, T2.WATER, T2.LAVA, T2.ROCK, T2.DEEP]);
  const idx = (x, y) => y * MW + x;
  console.log('地图 ' + MW + '×' + MH + ' = ' + (MW * MH) + ' 格 · 表观半径 ' + span.toFixed(1) + ' · 环界 ' + RB.map(v => v.toFixed(1)).join('/'));
  console.log('中心 (' + CX + ',' + CY + ') · 出生 ' + JSON.stringify(SPAWN) + ' · 医院 ' + JSON.stringify(HOSP) + ' · 自动开路 ' + opened + ' 格');
  const seen = new Uint8Array(MW * MH);
  const q = [idx(SPAWN.x, SPAWN.y)]; seen[q[0]] = 1; let reach = 1;
  while (q.length) {
    const cur = q.pop(); const x = cur % MW, y = (cur - x) / MW;
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      if (nx < 0 || ny < 0 || nx >= MW || ny >= MH) continue;
      const i2 = idx(nx, ny);
      if (seen[i2] || BLOCK.has(m[i2])) continue;
      seen[i2] = 1; reach++; q.push(i2);
    }
  }
  console.log('从出生点可达 ' + reach + ' / ' + (MW * MH) + '（' + (reach / (MW * MH) * 100).toFixed(1) + '%）');
  /* 带水系宠（可下水）的可达范围：水域不再阻挡 */
  const seenW = new Uint8Array(MW * MH);
  const BLOCKW = new Set([T2.TREE, T2.LAVA, T2.ROCK]);
  const qw = [idx(SPAWN.x, SPAWN.y)]; seenW[qw[0]] = 1;
  for (let head = 0; head < qw.length; head++) {
    const cur = qw[head]; const x = cur % MW, y = (cur - x) / MW;
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      if (nx < 0 || ny < 0 || nx >= MW || ny >= MH) continue;
      const i2 = idx(nx, ny);
      if (seenW[i2] || BLOCKW.has(m[i2])) continue;
      seenW[i2] = 1; qw.push(i2);
    }
  }
  let reachW = 0; for (let i = 0; i < MW * MH; i++) if (seenW[i]) reachW++;
  console.log('带水系宠（可下水）可达 ' + reachW + ' / ' + (MW * MH) + '（' + (reachW / (MW * MH) * 100).toFixed(1) + '%）');
  const stat = {};
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const r = regionOf(x, y);
    stat[r] = stat[r] || { tot: 0, ok: 0 };
    stat[r].tot++; if (seen[idx(x, y)]) stat[r].ok++;
  }
  console.log('\n地区        总格   陆地可达  陆地率  带水系可达  带水系率   等级段');
  Object.keys(stat).sort((a, b) => LV_RANGE[a][0] - LV_RANGE[b][0]).forEach(r => {
    const s = stat[r], pct = s.ok / s.tot * 100;
    let okW = 0; for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (regionOf(x, y) === r && seenW[idx(x, y)]) okW++;
    const pctW = okW / s.tot * 100;
    console.log('  ' + (REGION_NAME[r] || r).padEnd(10) + String(s.tot).padStart(6) + String(s.ok).padStart(8) + (pct.toFixed(1) + '%').padStart(9) + String(okW).padStart(8) + (pctW.toFixed(1) + '%').padStart(9) + '   Lv' + LV_RANGE[r][0] + '~' + LV_RANGE[r][1] + (pctW < 45 ? ' ⚠️' : ' ✅'));
  });
  /* 火山 ↔ 海洋 最小间距 */
  const pts = {};
  for (let y = 1; y < MH - 1; y++) for (let x = 1; x < MW - 1; x++) { const r = regionOf(x, y); (pts[r] = pts[r] || []).push([x, y]); }
  function minDist(a, b) {
    let best = 1e9;
    const B = pts[b] || [];
    /* 用 b 的格子做粗网格加速 */
    const grid = new Map();
    B.forEach(([x, y]) => { const k = (x >> 2) + ',' + (y >> 2); (grid.get(k) || grid.set(k, []).get(k)).push([x, y]); });
    (pts[a] || []).forEach(([x, y]) => {
      const gx = x >> 2, gy = y >> 2;
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
        const arr = grid.get((gx + dx) + ',' + (gy + dy));
        if (!arr) continue;
        arr.forEach(([bx, by]) => { const d = Math.abs(bx - x) + Math.abs(by - y); if (d < best) best = d; });
      }
    });
    return best;
  }
  console.log('\n火山 ↔ 海洋 最小曼哈顿间距：' + minDist('volcano', 'ocean') + ' 格');
  console.log('雪原 ↔ 海洋 最小曼哈顿间距：' + minDist('snow', 'ocean') + ' 格');
  console.log('雪原 ↔ 火山 最小曼哈顿间距：' + minDist('snow', 'volcano') + ' 格');
  /* 缩略图 */
  console.log('\n缩略图（每字符代表 6×6 格）');
  const CH = { plain: 'P', flower: 'F', mine: 'M', desert: 'D', ocean: 'O', volcano: 'V', snow: 'S' };
  for (let y = 0; y < MH; y += 6) {
    let row = '  ';
    for (let x = 0; x < MW; x += 6) {
      const r = regionOf(x, y);
      const ch = CH[r] || '?';
      row += seen[idx(Math.min(x + 2, MW - 1), Math.min(y + 2, MH - 1))] ? ch : ch.toLowerCase();
    }
    console.log(row);
  }
  console.log('  P平原 F花海 M矿洞 D荒漠 O海洋 V火山 S雪原 · 小写=该处不可达');
}
