/* v24：①道路骨架改石板色（中心不再是"一片荒漠"）②平原镇固定建在出生点 */
import { readFileSync, writeFileSync } from 'node:fs';
const ROOT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植';
const F = ROOT + '/抓宠游戏-v12-clean.html';
let src = readFileSync(F, 'utf8');
const before = src.length;
const done = [];

/* ① 道路骨架：中心广场 / 十字大道 / 辐射大道 / 环路 全部改成石板 STREET
      （原来用 T.PATH = 沙色，在中心交汇成一大片"荒漠"，这就是出生点看起来是荒漠的原因） */
const S1 = src.indexOf('  /* 2) 道路骨架');
const E1 = src.indexOf('var isRoad=', S1);
if (S1 < 0 || E1 < 0) throw new Error('找不到道路骨架段');
const seg = src.slice(S1, E1);
const segNew = seg.replace(/T\.PATH/g, 'T.STREET');
const nPath = (seg.match(/T\.PATH/g) || []).length;
src = src.slice(0, S1) + segNew + src.slice(E1);
if (nPath) done.push('道路骨架改石板（' + nPath + ' 处）');

/* ② 平原镇固定建在出生点 */
const reSpawn = /Object\.keys\(REGION_GYM\)\.forEach\(function\(reg\)\{\r?\n\s*var spot=findSpot\(reg\);/;
if (reSpawn.test(src)) {
  src = src.replace(reSpawn, `Object.keys(REGION_GYM).forEach(function(reg){
    /* v24：平原镇固定建在出生点 —— 玩家一出生就在小镇中心，旁边就是医院和道馆 */
    var spot = (reg==="plain") ? {x:MAP_CX, y:MAP_CY+2, score:0} : findSpot(reg);`);
  done.push('平原镇固定在出生点');
} else { console.log('  ⚠️ 平原镇固定 未匹配'); }

/* ③ 出生点本身也确保可走（城镇中心是石板） */
writeFileSync(F, src, 'utf8');
console.log('v24：' + (before / 1024).toFixed(0) + ' → ' + (src.length / 1024).toFixed(0) + ' KB');
done.forEach(d => console.log('  ✅ ' + d));
console.log('  校验：' + [
  src.includes('平原镇固定建在出生点') ? '平原镇✅' : '平原镇❌',
].join(' · '));
