/* v19 修复2：让城镇选址支持「环内特征地区」（林间/水畔）—— 在 genMap 里用读 m 数组的特征判定 */
import { readFileSync, writeFileSync } from 'node:fs';
const ROOT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植';
const F = ROOT + '/抓宠游戏-v12-clean.html';
let src = readFileSync(F, 'utf8');
const before = src.length;

/* 在 findSpot 之前插入 regionAtM（跟 regionAt 同逻辑，但读 genMap 的局部数组 m） */
const anchor = '  var findSpot=function(reg){';
const ia = src.indexOf(anchor);
if (ia < 0) throw new Error('找不到 findSpot');
if (src.includes('var regionAtM=')) { console.log('（已有 regionAtM，跳过插入）'); }
else {
  const FNM = `  /* 城镇选址专用：与 regionAt 同逻辑，但读 genMap 的局部地形数组 m（此时全局 map 还没赋值） */
  var regionAtM=function(x,y){
    var base=ringRegion(x,y);
    if(base==="plain"||base==="flower"){
      var tree=0, water=0;
      for(var rdy=-2;rdy<=2;rdy++)for(var rdx=-2;rdx<=2;rdx++){
        var rx=x+rdx, ry=y+rdy;
        if(rx<0||ry<0||rx>=MW||ry>=MH) continue;
        var rv=m[I(rx,ry)];
        if(rv===T.TREE) tree++; else if(rv===T.WATER) water++;
      }
      if(tree>=11) return "forest";
      if(water>=7) return "water";
    }
    return base;
  };
`;
  src = src.slice(0, ia) + FNM + src.slice(ia);
  console.log('✅ 已插入 regionAtM');
}
/* findSpot 改用 regionAtM */
let n = 0;
src = src.replace(/if\(ringRegion\(sx,sy\)!==reg\) continue;/g, () => { n++; return 'if(regionAtM(sx,sy)!==reg) continue;'; });
src = src.replace(/if\(ringRegion\(sx\+dx2,sy\+dy2\)===reg\) mine\+\+;/g, () => { n++; return 'if(regionAtM(sx+dx2,sy+dy2)===reg) mine++;'; });
console.log('✅ findSpot 里改用 regionAtM：' + n + ' 处');

writeFileSync(F, src, 'utf8');
console.log('完成：' + (before / 1024).toFixed(0) + ' → ' + (src.length / 1024).toFixed(0) + ' KB');
