/* v18 窄屏（360×640 这类小手机）对战 UI 压缩：保证一屏放得下 */
import { readFileSync, writeFileSync } from 'node:fs';
const F = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/抓宠游戏-v12-clean.html';
let src = readFileSync(F, 'utf8');
const before = src.length;
/* 找到 @media (max-width:520px){ ... } 块，在里面追加紧凑规则 */
const idx = src.indexOf('@media (max-width:520px){');
if (idx < 0) throw new Error('找不到窄屏媒体查询');
const close = src.indexOf('}', idx);
const oldBlock = src.slice(idx, close + 1);
console.log('原窄屏块：' + oldBlock.replace(/\s+/g, ' ').slice(0, 200));
const ADD = `
  /* v18：窄屏把对战卡片整体压紧，保证球/换宠/逃跑都在一屏内 */
  .battle-card{padding:9px 9px 8px; gap:5px; max-height:96dvh;}
  .battle-stage{min-height:212px;}
  .battle-stage .side-e .sp,.battle-stage .side-s .sp{font-size:64px;}
  .battle-stage .side-e .sp .pet-avatar,.battle-stage .side-s .sp .pet-avatar{width:66px; height:66px;}
  .battle-stage .side-name{font-size:12px;}
  .battle-stage .hpbar{height:9px;}
  .battle-stage .hp-txt{font-size:11px;}
  #battle-log{font-size:12px; padding:5px 7px; max-height:54px; overflow-y:auto;}
  .battle-tip{font-size:11px;}
  .move-btn{font-size:12px; padding:6px 7px;}
  .item-btn{font-size:12px; padding:5px 6px;}
`;
const newBlock = oldBlock.slice(0, -1) + ADD + '}';
src = src.slice(0, idx) + newBlock + src.slice(close + 1);
writeFileSync(F, src, 'utf8');
console.log('\n已追加窄屏压缩规则（' + (src.length - before) + ' 字符）');
console.log('大小 ' + (before / 1024).toFixed(0) + ' → ' + (src.length / 1024).toFixed(0) + ' KB');
