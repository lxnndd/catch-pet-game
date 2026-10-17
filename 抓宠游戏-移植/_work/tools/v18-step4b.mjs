/* v18 步骤4b：自动在各主题地区里搜落脚点（保证落在目标地区且可走） */
import { readFileSync, writeFileSync } from 'node:fs';
const F = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/抓宠游戏-v12-clean.html';
let src = readFileSync(F, 'utf8');
const MW = 216, MH = 156, CX = 108, CY = 78, RATIO = 1.38;
const SPAN = Math.min((MW / 2 - 2) / RATIO, MH / 2 - 2);
const RB = [SPAN * 0.20, SPAN * 0.40, SPAN * 0.58, SPAN * 0.76];
function ringRegion(x, y) {
  const dx = x - CX, dy = y - CY;
  const nx = dx / (MW / 2), ny = dy / (MH / 2), n = Math.abs(ny), e = Math.abs(nx);
  if (e > 1 || n > 1) return 'plain';
  const d = Math.max(Math.abs(dx) / RATIO, Math.abs(dy));
  if (d <= RB[0]) return 'plain';
  if (d <= RB[1]) return 'flower';
  if (d <= RB[2]) return 'mine';
  if (d <= RB[3]) return 'desert';
  if (dy < 0 && n > 1.15 * e) return 'snow';
  if (dx > 0 && e >= n / 1.15) return (e < 0.78 ? 'desert' : 'ocean');
  if (dy > 0 && n > 1.15 * e) return (n < 0.74 ? 'desert' : 'ocean');
  return 'volcano';
}
/* 各地区可用点：取离中心适中的一批（方便训练师站在地区中部） */
const buckets = {};
for (let y = 6; y < MH - 6; y++) for (let x = 6; x < MW - 6; x++) {
  const r = ringRegion(x, y);
  (buckets[r] = buckets[r] || []).push([x, y]);
}
console.log('各地区可用格数：' + Object.entries(buckets).map(([k, v]) => k + ' ' + v.length).join(' · '));
/* 训练师 → 目标地区（水畔/林间是环内特征，训练师按结构地区站） */
const PLAN = [
  ['t1', '短裤小子·阿磊', 'plain', 0],
  ['t2', '捕虫少年·小柯', 'plain', 1],
  ['t3', '露营少女·小茜', 'plain', 2],
  ['t4', '渔夫·大鲛', 'water', 0],      /* 水畔是平原环内特征，退一步用平原环边缘 */
  ['t5', '矿工·铁镐', 'mine', 0],
  ['t6', '格斗家·岩拳', 'plain', 3],
  ['t7', '火山学者·炎', 'volcano', 0],
  ['t8', '冲浪手·蓝波', 'ocean', 0],
  ['t9', '龙之使者·凛', 'snow', 0],
  ['t10', '冠军·劫火', 'desert', 0],
];
/* 用地图实际地形校验（从 HTML 里取 map） */
const mi = src.indexOf('var map=[]');
console.log('（地图运行时生成，这里只按环形规则挑点）');
/* 从每个地区里均匀挑第 k 个点（按扫描顺序，稳定性靠排序） */
const picked = {};
PLAN.forEach(([id, name, reg, k]) => {
  const list = (buckets[reg] || []).slice().sort((a, b) => (a[1] - b[1]) || (a[0] - b[0]));
  if (!list.length) { console.log('  ❌ ' + id + ' ' + name + '：地区 ' + reg + ' 没有可用格'); return; }
  /* 尽量挑地区中部：按到地区质心的距离排序 */
  const cx = list.reduce((a, p) => a + p[0], 0) / list.length;
  const cy = list.reduce((a, p) => a + p[1], 0) / list.length;
  const sorted = list.slice().sort((a, b) => (Math.abs(a[0] - cx) + Math.abs(a[1] - cy)) - (Math.abs(b[0] - cx) + Math.abs(b[1] - cy)));
  const step = Math.max(1, Math.floor(sorted.length / 6));
  const p = sorted[Math.min(sorted.length - 1, k * step)];
  picked[id] = p;
  console.log('  ' + id + ' ' + name + ' → (' + p[0] + ',' + p[1] + ') ' + ringRegion(p[0], p[1]) + ' ✅');
});
/* 写回 TRAINERS */
const ti = src.indexOf('var TRAINERS=');
const open = src.indexOf('[', ti);
let depth = 0, j = open, inStr = null, esc = false;
for (; j < src.length; j++) { const c = src[j];
  if (inStr) { if (esc) { esc = false; continue; } if (c === '\\') { esc = true; continue; } if (c === inStr) inStr = null; continue; }
  if (c === '"') { inStr = c; continue; }
  if (c === '[') depth++; else if (c === ']') { depth--; if (depth === 0) { j++; break; } } }
const TRAINERS = JSON.parse(src.slice(open, j));
TRAINERS.forEach(t => { const p = picked[t.id]; if (p) t.pos = { x: p[0], y: p[1] }; });
src = src.slice(0, open) + JSON.stringify(TRAINERS) + src.slice(j);
writeFileSync(F, src, 'utf8');
console.log('\n已写回 ' + Object.keys(picked).length + ' 位训练师坐标');
