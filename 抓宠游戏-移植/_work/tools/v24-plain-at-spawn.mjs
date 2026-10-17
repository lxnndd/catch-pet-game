/* v24：平原镇固定建在出生点（出生即在小镇中心，医院/道馆就在旁边） */
import { readFileSync, writeFileSync } from 'node:fs';
const ROOT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植';
const F = ROOT + '/抓宠游戏-v12-clean.html';
let src = readFileSync(F, 'utf8');
const before = src.length;

const OLD = `  Object.keys(REGION_GYM).forEach(function(reg){
    var spot=findSpot(reg);
    if(!spot) return;
    var cfg=REGION_GYM[reg];
    buildTown(spot.x,spot.y,reg,cfg[0],cfg[1],cfg[2]);
  });`;
const NEW = `  Object.keys(REGION_GYM).forEach(function(reg){
    /* v24：平原镇固定建在出生点 —— 玩家一出生就在小镇中心，旁边就是医院和道馆 */
    var spot = (reg==="plain") ? {x:MAP_CX, y:MAP_CY+2, score:0} : findSpot(reg);
    if(!spot) return;
    var cfg=REGION_GYM[reg];
    buildTown(spot.x,spot.y,reg,cfg[0],cfg[1],cfg[2]);
  });`;
if (!src.includes(OLD)) throw new Error('找不到城镇生成循环');
src = src.replace(OLD, NEW);

/* 出生点确保落在平原镇中心区域内（buildTown 后 SPAWN 就位于小镇里） */
if (!src.includes('v24：平原镇固定在出生点')) throw new Error('替换未生效');
writeFileSync(F, src, 'utf8');
console.log('v24：' + (before / 1024).toFixed(0) + ' → ' + (src.length / 1024).toFixed(0) + ' KB');
console.log('  ✅ 平原镇固定在出生点 (' + 'MAP_CX,MAP_CY+2)');
