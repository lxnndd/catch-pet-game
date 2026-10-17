/* v18 视野自适应：小屏也要能看到足够大的地图范围（原来 TILE 固定 32px → 小手机只看到 11×7 格） */
import { readFileSync, writeFileSync } from 'node:fs';
const F = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/抓宠游戏-v12-clean.html';
let src = readFileSync(F, 'utf8');
const before = src.length;
const re = /var TILE=32, VIEW_W=0, VIEW_H=0;\r?\nfunction resizeCanvas\(\)\{[\s\S]*?\n\}/;
const m = src.match(re);
if (!m) throw new Error('找不到 resizeCanvas');
const NEW = [
  'var TILE=32, VIEW_W=0, VIEW_H=0;',
  '/* v18：视野自适应 —— 地图放大 9 倍后，格子尺寸按屏幕重算，保证任何设备都能看到约 18 格宽，',
  '   否则小手机上只能看到眼前 11 格，等于"盲走"。TILE 限制在 34~64px 之间，兼顾清晰与视野。 */',
  'function resizeCanvas(){',
  '  var rect=canvas.parentElement.getBoundingClientRect();',
  '  var dpr=window.devicePixelRatio||1;',
  '  canvas.width=Math.max(1,Math.round(rect.width*dpr));',
  '  canvas.height=Math.max(1,Math.round(rect.height*dpr));',
  '  ctx.setTransform(dpr,0,0,dpr,0,0);',
  '  /* 目标：一屏约 18 格宽、14 格高（按画布实际 CSS 尺寸算，不被 dpr 干扰） */',
  '  var wantW=rect.width/18, wantH=rect.height/14;',
  '  TILE=Math.max(34, Math.min(64, Math.round(Math.min(wantW, wantH))));',
  '  VIEW_W=rect.width/TILE; VIEW_H=rect.height/TILE;',
  '  draw();',
  '}',
].join('\n');
src = src.replace(re, NEW);
writeFileSync(F, src, 'utf8');
console.log('已改：' + (before / 1024).toFixed(0) + ' → ' + (src.length / 1024).toFixed(0) + ' KB');
console.log('  自适应 TILE: ' + (src.includes('TILE=Math.max(34, Math.min(64') ? '✅' : '❌'));
