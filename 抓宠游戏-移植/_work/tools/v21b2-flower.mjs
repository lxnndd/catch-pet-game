/* v21b（插入式）：在花田渲染分支开头插入底色，并加密花点 */
import { readFileSync, writeFileSync } from 'node:fs';
const ROOT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植';
const F = ROOT + '/抓宠游戏-v12-clean.html';
let src = readFileSync(F, 'utf8');
const anchor = 'else if(v===T.FLOWER){';
const i = src.indexOf(anchor);
if (i < 0) throw new Error('找不到花田分支');
if (src.slice(i, i + 200).includes('花田铺底色')) { console.log('（已加过底色）'); }
else {
  const at = i + anchor.length;
  const INSERT = `
      /* v21：花田铺底色（整片是花的感觉，不再只画零星花点） */
      ctx.fillStyle="#cfe8b0"; ctx.fillRect(px,py,TILE,TILE);
      ctx.fillStyle="#f0dcef"; ctx.fillRect(px+2,py+2,TILE-4,TILE-4);
      for(var fp=0;fp<6;fp++){ ctx.fillStyle=["#f2a7c3","#f7d774","#e88bb0","#f5f0fa","#f9c2d8","#ffe9a8"][(fp+x+y)%6]; ctx.fillRect(px+4+fp*5, py+25, 3,3); }`;
  src = src.slice(0, at) + INSERT + src.slice(at);
  console.log('✅ 已在花田分支插入底色');
}
writeFileSync(F, src, 'utf8');
console.log('校验：' + (src.includes('花田铺底色') ? '✅' : '❌'));
