/* v19 修复3：林间/水畔这类「环内特征地区」的城镇选址 → 取特征最密集处 */
import { readFileSync, writeFileSync } from 'node:fs';
const ROOT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植';
const F = ROOT + '/抓宠游戏-v12-clean.html';
let src = readFileSync(F, 'utf8');
const before = src.length;

/* 在 findSpot 开头插入「特征地区」分支 */
const anchor = '  var findSpot=function(reg){\n    var best=null;';
const anchorAlt = '  var findSpot=function(reg){';
const ia = src.indexOf(anchorAlt);
if (ia < 0) throw new Error('找不到 findSpot');
if (src.includes('featureSpot')) { console.log('（已有特征分支）'); }
else {
  const at = ia + anchorAlt.length;
  const BRANCH = `
    /* 环内特征地区（林间=树多、水畔=水多）：取「特征最密集」的位置，不要求成片比例 */
    if(reg==="forest"||reg==="water"){
      var fBest=null;
      for(var fsy=14;fsy<MH-14;fsy+=2)for(var fsx=14;fsx<MW-14;fsx+=2){
        var fb=ringRegion(fsx,fsy);
        if(fb!=="plain"&&fb!=="flower") continue;
        if(inTown(fsx,fsy)) continue;
        var fcnt=0;
        for(var fdy=-6;fdy<=6;fdy+=2)for(var fdx=-8;fdx<=8;fdx+=2){
          var fv=m[I(fsx+fdx,fsy+fdy)];
          if(reg==="forest"&&fv===T.TREE) fcnt++;
          if(reg==="water"&&fv===T.WATER) fcnt++;
        }
        if(fcnt>0&&(!fBest||fcnt>fBest.cnt)) fBest={x:fsx,y:fsy,cnt:fcnt,score:0};
      }
      if(fBest){ return fBest; }
    }`;
  src = src.slice(0, at) + BRANCH + src.slice(at);
  console.log('✅ 已加特征地区选址分支');
}
writeFileSync(F, src, 'utf8');
console.log('完成：' + (before / 1024).toFixed(0) + ' → ' + (src.length / 1024).toFixed(0) + ' KB');
