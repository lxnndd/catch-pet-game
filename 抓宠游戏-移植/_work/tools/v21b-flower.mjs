/* v21b：花田渲染加底色（整片是花的感觉）+ 花点加密 */
import { readFileSync, writeFileSync } from 'node:fs';
const ROOT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植';
const F = ROOT + '/抓宠游戏-v12-clean.html';
let src = readFileSync(F, 'utf8');
const OLD = `    else if(v===T.FLOWER){
      var cols=["#f2a7c3","#f7d774","#e88bb0","#f5f0fa"];
      for(var fl=0;fl<4;fl++){ ctx.fillStyle=cols[(fl+x*2+y)%4]; ctx.fillRect(px+5+fl*7,py+6+((fl*3+x+y)%3)*8,3,3); }
      ctx.fillStyle="#68b86d"; ctx.fillRect(px+10,py+22,2,6); ctx.fillRect(px+22,py+18,2,6);
    }`;
const NEW = `    else if(v===T.FLOWER){
      /* v21：花田铺底色（整片是花的感觉，不再是绿底零星花点） */
      ctx.fillStyle="#c8e6a9"; ctx.fillRect(px,py,TILE,TILE);
      ctx.fillStyle="#e7d3ee"; ctx.fillRect(px+2,py+2,TILE-4,TILE-4);
      var cols=["#f2a7c3","#f7d774","#e88bb0","#f5f0fa","#f9c2d8","#ffe9a8"];
      for(var fl=0;fl<8;fl++){
        ctx.fillStyle=cols[(fl+x*2+y)%6];
        ctx.fillRect(px+3+(fl%4)*8, py+4+Math.floor(fl/4)*14+((fl*3+x+y)%3)*2, 4,4);
      }
      ctx.fillStyle="#7cc47f"; ctx.fillRect(px+9,py+23,2,6); ctx.fillRect(px+21,py+19,2,6);
    }`;
if (!src.includes(OLD)) throw new Error('找不到花田渲染');
src = src.replace(OLD, NEW);
writeFileSync(F, src, 'utf8');
console.log('✅ 花田渲染已加强（底色 + 8 个花点）');
