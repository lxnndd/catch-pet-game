/* v20 补修（正则版）：城镇围栏四向门 + 向外清通道 */
import { readFileSync, writeFileSync } from 'node:fs';
const ROOT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植';
const F = ROOT + '/抓宠游戏-v12-clean.html';
let src = readFileSync(F, 'utf8');
const before = src.length;

/* 1) 门判定：四方向各 3 格宽 */
const reDoor = /var isDoor=\(\(fy===cy\|\|fy===cy\+1\)&&Math\.abs\(fx-cx\)===8\);/;
if (!reDoor.test(src)) throw new Error('找不到门判定');
src = src.replace(reDoor, 'var isDoor=((Math.abs(fy-cy)<=1&&Math.abs(fx-cx)===8)||(Math.abs(fx-cx)<=1&&Math.abs(fy-cy)===6));');
console.log('✅ 门判定改为四方向');

/* 2) 在围栏循环结束后插入清通道（用正则找 for(fy...) 那个循环的结尾） */
const reLoop = /(for\(var fy=cy-6;fy<=cy\+6;fy\+\+\)for\(var fx=cx-8;fx<=cx\+8;fx\+\+\)\{[\s\S]*?m\[I\(fx,fy\)\]=isDoor\?T\.PATH:T\.TREE;\r?\n    \}\r?\n  \})/;
const mL = src.match(reLoop);
if (!mL) throw new Error('找不到围栏循环整体');
const CLEAR = `

  /* v20：从四个出入口向外再清 8 格通道（矿洞/火山被岩壁包围时也能进城） */
  [[1,0],[-1,0],[0,1],[0,-1]].forEach(function(dir){
    for(var ck=1;ck<=8;ck++){
      var cpx=cx+dir[0]*(8+ck), cpy=cy+dir[1]*(6+ck);
      for(var cw=-1;cw<=1;cw++){
        var cqx=cpx+(dir[0]?0:cw), cqy=cpy+(dir[0]?cw:0);
        if(!inb2(cqx,cqy)) continue;
        var cqv=m[I(cqx,cqy)];
        if(cqv!==T.HOSP&&cqv!==T.GYM&&cqv!==T.LEAGUE) m[I(cqx,cqy)]=T.PATH;
      }
    }
  });`;
src = src.replace(reLoop, mL[1] + CLEAR);
console.log('✅ 已插入向外清通道');

writeFileSync(F, src, 'utf8');
console.log('完成：' + (before / 1024).toFixed(0) + ' → ' + (src.length / 1024).toFixed(0) + ' KB');
console.log('校验：' + [
  src.includes('Math.abs(fy-cy)<=1&&Math.abs(fx-cx)===8') ? '四向门✅' : '门❌',
  src.includes('向外再清 8 格通道') ? '清通道✅' : '通道❌',
].join(' · '));
