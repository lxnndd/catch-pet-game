/* 修正视野参数：手机约 13~14 格宽（TILE 34~44），大屏格子不超 44px */
import { readFileSync, writeFileSync } from 'node:fs';
const F = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/抓宠游戏-v12-clean.html';
let src = readFileSync(F, 'utf8');
const OLD = `  /* 目标：一屏约 18 格宽、14 格高（按画布实际 CSS 尺寸算，不被 dpr 干扰） */
  var wantW=rect.width/18, wantH=rect.height/14;
  TILE=Math.max(34, Math.min(64, Math.round(Math.min(wantW, wantH))));`;
const NEW = `  /* 目标：一屏约 14 格宽、11 格高；TILE 夹在 34~44px 之间（手机 34px≈11.5 格宽、平板 44px≈8 格宽） */
  var wantW=rect.width/14, wantH=rect.height/11;
  TILE=Math.max(34, Math.min(44, Math.round(Math.min(wantW, wantH))));`;
if (!src.includes(OLD)) throw new Error('找不到视野参数段');
src = src.replace(OLD, NEW);
writeFileSync(F, src, 'utf8');
console.log('✅ 视野参数已修正为 TILE 34~44（约 14 格宽）');
console.log(src.match(/TILE=Math\.max\([^)]*\)[^;]*;/)[0]);
