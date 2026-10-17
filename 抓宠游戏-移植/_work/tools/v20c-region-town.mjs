/* v20c：城镇范围内 regionAt 直接返回该城镇绑定的地区（解决林间镇被判成花海） */
import { readFileSync, writeFileSync } from 'node:fs';
const ROOT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植';
const F = ROOT + '/抓宠游戏-v12-clean.html';
let src = readFileSync(F, 'utf8');
const before = src.length;

const OLD = `function regionAt(x,y){
  var base=ringRegion(x,y);`;
const NEW = `function regionAt(x,y){
  /* v20：城镇范围内直接返回该城镇绑定的地区（否则"林间镇"因为树被清平会被判成花海） */
  for(var _ti=0;_ti<TOWNS.length;_ti++){
    var _tt=TOWNS[_ti];
    if(Math.abs(x-_tt.x)<=9 && Math.abs(y-_tt.y)<=7) return _tt.region;
  }
  var base=ringRegion(x,y);`;
if (!src.includes(OLD)) throw new Error('找不到 regionAt');
src = src.replace(OLD, NEW);
writeFileSync(F, src, 'utf8');
console.log('✅ regionAt 已加城镇优先判定');
console.log('   ' + (before / 1024).toFixed(0) + ' → ' + (src.length / 1024).toFixed(0) + ' KB');
