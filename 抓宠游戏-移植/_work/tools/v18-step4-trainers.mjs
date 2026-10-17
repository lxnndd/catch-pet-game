/* v18 步骤4：训练师按新地图重排到各自主题地区（带自动校验，落错就报错） */
import { readFileSync, writeFileSync } from 'node:fs';
const F = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/抓宠游戏-v12-clean.html';
let src = readFileSync(F, 'utf8');

/* 用游戏同一套环形规则复算地区（与 ringRegion 一致） */
const MW = 216, MH = 156, CX = 108, CY = 78, RATIO = 1.38;
const SPAN = Math.min((MW / 2 - 2) / RATIO, MH / 2 - 2);
const RB = [SPAN * 0.20, SPAN * 0.40, SPAN * 0.58, SPAN * 0.76];
const ringD = (x, y) => Math.max(Math.abs(x - CX) / RATIO, Math.abs(y - CY));
function ringRegion(x, y) {
  const dx = x - CX, dy = y - CY;
  const nx = dx / (MW / 2), ny = dy / (MH / 2), n = Math.abs(ny), e = Math.abs(nx);
  if (e > 1 || n > 1) return 'plain';
  const d = ringD(x, y);
  if (d <= RB[0]) return 'plain';
  if (d <= RB[1]) return 'flower';
  if (d <= RB[2]) return 'mine';
  if (d <= RB[3]) return 'desert';
  if (dy < 0 && n > 1.15 * e) return 'snow';
  if (dx > 0 && e >= n / 1.15) return (e < 0.78 ? 'desert' : 'ocean');
  if (dy > 0 && n > 1.15 * e) return (n < 0.74 ? 'desert' : 'ocean');
  return 'volcano';
}
/* 训练师 → 目标地区 + 候选坐标（多给几个，自动挑落在目标地区里的那个） */
const PLAN = {
  t1: { want: 'plain', cands: [[95, 70], [100, 85], [115, 70], [96, 90]] },
  t2: { want: 'plain', cands: [[88, 62], [80, 70], [120, 88], [125, 70]] },
  t3: { want: 'plain', cands: [[118, 60], [122, 92], [92, 95], [130, 78]] },
  t4: { want: ['water', 'plain'], cands: [[88, 112], [130, 108], [86, 98], [126, 100]] },
  t5: { want: 'mine', cands: [[70, 40], [150, 45], [108, 30], [66, 110], [150, 112]] },
  t6: { want: ['plain', 'mine'], cands: [[95, 100], [120, 100], [80, 95], [130, 100]] },
  t7: { want: 'volcano', cands: [[35, 105], [40, 50], [30, 78], [45, 120]] },
  t8: { want: 'ocean', cands: [[196, 70], [200, 90], [190, 78], [180, 120]] },
  t9: { want: ['snow', 'ocean'], cands: [[150, 12], [120, 10], [190, 15], [60, 20]] },
  t10: { want: 'desert', cands: [[92, 145], [130, 140], [70, 130], [150, 130]] },
};
let TRAINERS = null;
const ti = src.indexOf('var TRAINERS=');
const open = src.indexOf('[', ti);
let depth = 0, j = open, inStr = null, esc = false;
for (; j < src.length; j++) {
  const c = src[j];
  if (inStr) { if (esc) { esc = false; continue; } if (c === '\\') { esc = true; continue; } if (c === inStr) inStr = null; continue; }
  if (c === '"') { inStr = c; continue; }
  if (c === '[') depth++; else if (c === ']') { depth--; if (depth === 0) { j++; break; } }
}
TRAINERS = JSON.parse(src.slice(open, j));
console.log('当前训练师 ' + TRAINERS.length + ' 位');
let ok = 0, bad = [];
TRAINERS.forEach(t => {
  const plan = PLAN[t.id];
  if (!plan) { bad.push(t.id + ' 没有重排方案'); return; }
  const want = Array.isArray(plan.want) ? plan.want : [plan.want];
  const pick = plan.cands.find(([x, y]) => want.includes(ringRegion(x, y)));
  if (!pick) {
    /* 打印候选各自落在哪，方便调 */
    const info = plan.cands.map(([x, y]) => '(' + x + ',' + y + ')=' + ringRegion(x, y)).join(' ');
    bad.push(t.id + ' 没有候选落在 ' + want.join('/') + '：' + info);
    return;
  }
  t.pos = { x: pick[0], y: pick[1] };
  ok++;
  console.log('  ' + t.id + ' ' + t.name + ' → (' + pick[0] + ',' + pick[1] + ') ' + ringRegion(pick[0], pick[1]) + ' ✅');
});
if (bad.length) { console.log('❌ 有问题：'); bad.forEach(b => console.log('   ' + b)); process.exit(1); }
const newLit = JSON.stringify(TRAINERS);
src = src.slice(0, open) + newLit + src.slice(j);
writeFileSync(F, src, 'utf8');
console.log('\n已写回 ' + ok + ' 位训练师的新坐标');
