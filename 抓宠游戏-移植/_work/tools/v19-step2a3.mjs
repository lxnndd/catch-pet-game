/* Step2a(v3)：地图 350×250 + 城镇(医院/道馆) + 联盟 + draw 补 SNOW/GYM/LEAGUE 渲染 */
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
const ROOT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植';
const F = ROOT + '/抓宠游戏-v12-clean.html';
copyFileSync(F, F.replace(/\.html$/, '.bak-v19-step2a.html'));
let src = readFileSync(F, 'utf8');
const before = src.length;
const done = [];

/* 1) 尺寸 + 地形 */
const reConst = /var MW=\d+, MH=\d+, T=\{[^}]*\};/;
if (!reConst.test(src)) throw new Error('找不到尺寸常量');
src = src.replace(reConst, 'var MW=350, MH=250, T={PATH:0,GRASS:1,TALL:2,TREE:3,WATER:4,HOSP:5,LAVA:6,ROCK:7,DEEP:8,FLOWER:9,SNOW:10,GYM:11,LEAGUE:12};');
done.push('地图 350×250 + GYM/LEAGUE 地形');

/* 2) 城镇常量 */
if (!src.includes('var TOWNS=[]')) {
  const reHosp = /var HOSP=\{x:MAP_CX\+8,y:MAP_CY-3\};/;
  if (!reHosp.test(src)) throw new Error('找不到 HOSP 定义');
  src = src.replace(reHosp, `var HOSP={x:MAP_CX+8,y:MAP_CY-3};
/* ══ v19 城镇 / 道馆 / 徽章 ══
   8 座城镇（水畔没有），每座一个 🏥医院 + 一个道馆；道馆对战暂为占位，徽章系统已就位，攒满 8 枚可挑战联盟大赛。 */
var TOWNS=[];
var REGION_GYM={ plain:["nor","一般系","阿磊"], forest:["grass","草系","小柯"], flower:["fairy","妖精系","小茜"],
                 mine:["rock","岩石系","铁镐"], desert:["ground","地面系","岩拳"], ocean:["water","水系","蓝波"],
                 volcano:["fire","火系","炎"], snow:["ice","冰系","凛"] };
var BADGE_MAX=8;
var LEAGUE_POS=null;`);
  done.push('城镇常量');
}

/* 3) genMap 插入城镇生成 */
const i5 = src.indexOf('  /* 5) 可达性修复');
if (i5 < 0) throw new Error('找不到可达性修复锚点');
if (!src.includes('var buildTown=')) {
  const TOWN_CODE = `  /* 4.5) v19 城镇：8 个地区各一座（水畔除外），每座含医院 + 道馆 */
  TOWNS=[];
  var inTown=function(x,y){ for(var ti=0;ti<TOWNS.length;ti++){ var t=TOWNS[ti]; if(Math.abs(x-t.x)<=10&&Math.abs(y-t.y)<=8) return true; } return false; };
  var buildTown=function(cx,cy,reg,gymType,gymName,leader){
    for(var ty=cy-5;ty<=cy+5;ty++)for(var tx=cx-7;tx<=cx+7;tx++) if(inb2(tx,ty)) m[I(tx,ty)]=T.PATH;
    for(var fy=cy-6;fy<=cy+6;fy++)for(var fx=cx-8;fx<=cx+8;fx++){
      if(!inb2(fx,fy)) continue;
      if(Math.abs(fx-cx)===8||Math.abs(fy-cy)===6){
        var isDoor=((fy===cy||fy===cy+1)&&Math.abs(fx-cx)===8);
        m[I(fx,fy)]=isDoor?T.PATH:T.TREE;
      }
    }
    var hx=cx+4, hy=cy+2;
    m[I(hx,hy)]=T.HOSP;
    m[I(hx-1,hy)]=T.PATH; m[I(hx+1,hy)]=T.PATH; m[I(hx,hy-1)]=T.PATH; m[I(hx,hy+1)]=T.PATH;
    var gx=cx-4, gy=cy-3;
    for(var gy2=gy-1;gy2<=gy+1;gy2++)for(var gx2=gx-1;gx2<=gx+1;gx2++) if(inb2(gx2,gy2)) m[I(gx2,gy2)]=T.GYM;
    m[I(gx,gy+2)]=T.PATH;
    TOWNS.push({region:reg,name:REGION_NAME[reg]+"镇",x:cx,y:cy,hosp:{x:hx,y:hy},gym:{x:gx,y:gy},
                gymType:gymType,gymName:gymName+"道馆",leaderName:leader});
  };
  var findSpot=function(reg){
    var best=null;
    for(var sy=12;sy<MH-12;sy+=2)for(var sx=12;sx<MW-12;sx+=2){
      if(ringRegion(sx,sy)!==reg) continue;
      if(inTown(sx,sy)) continue;
      var bad=0, ok=true;
      for(var dy2=-6;dy2<=6&&ok;dy2++)for(var dx2=-8;dx2<=8;dx2++){
        var vv=m[I(sx+dx2,sy+dy2)];
        if(vv===T.WATER||vv===T.DEEP||vv===T.LAVA||vv===T.HOSP||vv===T.GYM||vv===T.LEAGUE) bad++;
        if(bad>3){ ok=false; break; }
      }
      if(!ok) continue;
      var d=Math.abs(sx-MAP_CX)+Math.abs(sy-MAP_CY);
      var want=Math.min(MW,MH)*0.34;
      var score=Math.abs(d-want);
      if(!best||score<best.score) best={x:sx,y:sy,score:score};
    }
    return best;
  };
  Object.keys(REGION_GYM).forEach(function(reg){
    var spot=findSpot(reg);
    if(!spot) return;
    var cfg=REGION_GYM[reg];
    buildTown(spot.x,spot.y,reg,cfg[0],cfg[1],cfg[2]);
  });
  if(TOWNS.length){
    var pw=TOWNS[0];
    var lx=pw.x+26, ly=pw.y-16;
    if(lx>MW-14) lx=pw.x-26;
    if(ly<14) ly=pw.y+16;
    for(var ly2=ly-2;ly2<=ly+2;ly2++)for(var lx2=lx-3;lx2<=lx+3;lx2++) if(inb2(lx2,ly2)) m[I(lx2,ly2)]=T.PATH;
    for(var ly3=ly-1;ly3<=ly+1;ly3++)for(var lx3=lx-2;lx3<=lx+2;lx3++) if(inb2(lx3,ly3)) m[I(lx3,ly3)]=T.LEAGUE;
    m[I(lx,ly+3)]=T.PATH; m[I(lx,ly-3)]=T.PATH;
    LEAGUE_POS={x:lx,y:ly};
    HOSP={x:TOWNS[0].hosp.x,y:TOWNS[0].hosp.y};
  }
`;
  src = src.slice(0, i5) + TOWN_CODE + src.slice(i5);
  done.push('城镇生成');
}
src = src.replace(/if\(m\[I\(cx3,cy3\)\]!==T\.HOSP\) m\[I\(cx3,cy3\)\]=T\.PATH;/,
  'if(m[I(cx3,cy3)]!==T.HOSP && m[I(cx3,cy3)]!==T.GYM && m[I(cx3,cy3)]!==T.LEAGUE) m[I(cx3,cy3)]=T.PATH;');

/* 4) draw：在 TREE 分支之后插入 SNOW/GYM/LEAGUE 渲染 */
if (!src.includes('else if(v===T.SNOW)')) {
  const reTree = /else if\(v===T\.TREE\)\{[\s\S]*?\r?\n    \}/;
  const mT = src.match(reTree);
  if (!mT) throw new Error('找不到 draw 的 TREE 分支');
  const at = src.indexOf(mT[0]) + mT[0].length;
  const RENDER = `
    else if(v===T.SNOW){
      /* 雪原：白色雪地 + 雪堆纹理（与岩石的冰丘造型区分开） */
      ctx.fillStyle="#eef4fb"; ctx.fillRect(px,py,TILE,TILE);
      ctx.fillStyle="#dbe7f5"; ctx.fillRect(px+3,py+4,10,4); ctx.fillRect(px+16,py+18,11,4);
      ctx.fillStyle="#ffffff"; ctx.fillRect(px+7,py+22,7,3);
    }
    else if(v===T.GYM){
      /* 道馆：红顶建筑 + 招牌 */
      ctx.fillStyle="#e8e2d4"; ctx.fillRect(px,py,TILE,TILE);
      ctx.fillStyle="#c94f3d"; ctx.beginPath();
      ctx.moveTo(px+2,py+TILE*0.45); ctx.lineTo(px+TILE/2,py+3); ctx.lineTo(px+TILE-2,py+TILE*0.45); ctx.closePath(); ctx.fill();
      ctx.fillStyle="#f7f4ec"; ctx.fillRect(px+3,py+TILE*0.45,TILE-6,TILE*0.48);
      ctx.fillStyle="#8b5a2b"; ctx.fillRect(px+TILE/2-4,py+TILE*0.64,8,TILE*0.28);
      ctx.fillStyle="#ffd54a"; ctx.fillRect(px+TILE/2-3,py+6,6,6);
    }
    else if(v===T.LEAGUE){
      /* 联盟大赛：金色场馆 */
      ctx.fillStyle="#f3e9c8"; ctx.fillRect(px,py,TILE,TILE);
      ctx.fillStyle="#d4a017"; ctx.beginPath();
      ctx.moveTo(px+1,py+TILE*0.5); ctx.lineTo(px+TILE/2,py+2); ctx.lineTo(px+TILE-1,py+TILE*0.5); ctx.closePath(); ctx.fill();
      ctx.fillStyle="#fffbe8"; ctx.fillRect(px+3,py+TILE*0.5,TILE-6,TILE*0.42);
      ctx.fillStyle="#b8860b"; ctx.fillRect(px+TILE/2-5,py+TILE*0.66,10,TILE*0.28);
      ctx.fillStyle="#fff3b0"; ctx.fillRect(px+5,py+5,4,4); ctx.fillRect(px+TILE-9,py+5,4,4);
    }`;
  src = src.slice(0, at) + RENDER + src.slice(at);
  done.push('draw 补 SNOW/GYM/LEAGUE 渲染');
} else done.push('（draw 已有 SNOW）');

writeFileSync(F, src, 'utf8');
console.log('Step2a 完成：' + (before / 1024).toFixed(0) + ' → ' + (src.length / 1024).toFixed(0) + ' KB');
done.forEach(d => console.log('  ✅ ' + d));
console.log('  校验：' + [
  src.includes('var MW=350, MH=250') ? '350×250✅' : '尺寸❌',
  src.includes('GYM:11,LEAGUE:12') ? '地形✅' : '地形❌',
  src.includes('else if(v===T.SNOW)') ? 'SNOW渲染✅' : 'SNOW❌',
  src.includes('else if(v===T.GYM)') ? 'GYM渲染✅' : 'GYM❌',
  src.includes('var buildTown=') ? '城镇✅' : '城镇❌',
].join(' · '));
