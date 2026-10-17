/* v19 优化：3×3 道馆只让中心格画建筑，其余画庭院，看起来像一座道馆 */
import { readFileSync, writeFileSync } from 'node:fs';
const ROOT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植';
const F = ROOT + '/抓宠游戏-v12-clean.html';
let src = readFileSync(F, 'utf8');
const before = src.length;

const OLD = `    else if(v===T.GYM){
      /* 道馆：红顶建筑 + 招牌 */
      ctx.fillStyle="#e8e2d4"; ctx.fillRect(px,py,TILE,TILE);
      ctx.fillStyle="#c94f3d"; ctx.beginPath();
      ctx.moveTo(px+2,py+TILE*0.45); ctx.lineTo(px+TILE/2,py+3); ctx.lineTo(px+TILE-2,py+TILE*0.45); ctx.closePath(); ctx.fill();
      ctx.fillStyle="#f7f4ec"; ctx.fillRect(px+3,py+TILE*0.45,TILE-6,TILE*0.48);
      ctx.fillStyle="#8b5a2b"; ctx.fillRect(px+TILE/2-4,py+TILE*0.64,8,TILE*0.28);
      ctx.fillStyle="#ffd54a"; ctx.fillRect(px+TILE/2-3,py+6,6,6);
    }`;
const NEW = `    else if(v===T.GYM){
      /* 道馆：3×3 只有中心格是主楼，其余是庭院，整体看起来像一座道馆 */
      var _gc=false;
      for(var _gi=0;_gi<TOWNS.length;_gi++) if(TOWNS[_gi].gym.x===x && TOWNS[_gi].gym.y===y){ _gc=true; break; }
      if(_gc){
        ctx.fillStyle="#efe9dc"; ctx.fillRect(px,py,TILE,TILE);
        ctx.fillStyle="#c94f3d"; ctx.beginPath();
        ctx.moveTo(px+1,py+TILE*0.5); ctx.lineTo(px+TILE/2,py+2); ctx.lineTo(px+TILE-1,py+TILE*0.5); ctx.closePath(); ctx.fill();
        ctx.fillStyle="#f7f4ec"; ctx.fillRect(px+2,py+TILE*0.5,TILE-4,TILE*0.45);
        ctx.fillStyle="#8b5a2b"; ctx.fillRect(px+TILE/2-5,py+TILE*0.66,10,TILE*0.29);
        ctx.fillStyle="#ffd54a"; ctx.fillRect(px+TILE/2-4,py+5,8,8);
        ctx.fillStyle="#c94f3d"; ctx.fillRect(px+4,py+TILE*0.62,5,5); ctx.fillRect(px+TILE-9,py+TILE*0.62,5,5);
      } else {
        ctx.fillStyle="#e6dfd0"; ctx.fillRect(px,py,TILE,TILE);
        ctx.fillStyle="#d6cebd"; ctx.fillRect(px+4,py+4,TILE-8,TILE-8);
      }
    }`;
if (!src.includes(OLD)) throw new Error('找不到道馆渲染代码');
src = src.replace(OLD, NEW);
writeFileSync(F, src, 'utf8');
console.log('✅ 道馆渲染已优化（中心主楼 + 庭院）');
console.log('   ' + (before / 1024).toFixed(0) + ' → ' + (src.length / 1024).toFixed(0) + ' KB');
