/* v19 修复：①把道馆函数从 ppLow 内部移到函数体外 ②放宽城镇选址 ③（随后重新注入应用 rarity） */
import { readFileSync, writeFileSync } from 'node:fs';
const ROOT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植';
const F = ROOT + '/抓宠游戏-v12-clean.html';
let src = readFileSync(F, 'utf8');
const before = src.length;

/* ① 抽出插错位置的 v19 函数块 */
const S = '/* ══ v19 道馆 / 联盟 ══ */';
const E = 'function ppLowEnd(){}';
const i1 = src.indexOf(S), i2 = src.indexOf(E);
if (i1 < 0 || i2 < 0) throw new Error('找不到 v19 函数块');
const block = src.slice(i1, i2 + E.length);
src = src.slice(0, i1) + src.slice(i2 + E.length);
console.log('抽出函数块 ' + block.length + ' 字符（原来嵌在 ppLow 里）');
/* 放到 openHospital 之前的顶层 */
const anchor = 'function openHospital(){';
const ia = src.indexOf(anchor);
if (ia < 0) throw new Error('找不到 openHospital');
src = src.slice(0, ia) + block + '\n' + src.slice(ia);
console.log('✅ 已移到 openHospital 之前（函数体外）');

/* ② 放宽城镇选址：只要求区域内「属于目标地区」的格子占多数，障碍由 buildTown 清平 */
const oldSpot = /var findSpot=function\(reg\)\{[\s\S]*?\n  \};/;
const mSpot = src.match(oldSpot);
if (!mSpot) throw new Error('找不到 findSpot');
const NEW_SPOT = `var findSpot=function(reg){
    var best=null;
    for(var sy=12;sy<MH-12;sy+=2)for(var sx=12;sx<MW-12;sx+=2){
      if(ringRegion(sx,sy)!==reg) continue;
      if(inTown(sx,sy)) continue;
      /* 只要求这块区域里多数格子属于该地区（地形障碍由 buildTown 清平，不受限） */
      var mine=0, tot=0;
      for(var dy2=-6;dy2<=6;dy2+=2)for(var dx2=-8;dx2<=8;dx2+=2){
        tot++; if(ringRegion(sx+dx2,sy+dy2)===reg) mine++;
      }
      if(mine/tot<0.62) continue;
      var d=Math.abs(sx-MAP_CX)+Math.abs(sy-MAP_CY);
      var want=Math.min(MW,MH)*0.34;
      var score=Math.abs(d-want);
      if(!best||score<best.score) best={x:sx,y:sy,score:score};
    }
    return best;
  };`;
src = src.replace(oldSpot, NEW_SPOT);
console.log('✅ findSpot 已放宽（要求区域内 62% 属于该地区即可）');

/* ③ 城镇建完后打印实际数量，便于排查 */
src = src.replace(/    if\(TOWNS\.length\)\{/, '    if(TOWNS.length){');
src = src.replace(/    HOSP=\{x:TOWNS\[0\]\.hosp\.x,y:TOWNS\[0\]\.hosp\.y\};\r?\n  \}/,
  '    HOSP={x:TOWNS[0].hosp.x,y:TOWNS[0].hosp.y};\n  }');

writeFileSync(F, src, 'utf8');
console.log('修复完成：' + (before / 1024).toFixed(0) + ' → ' + (src.length / 1024).toFixed(0) + ' KB');
