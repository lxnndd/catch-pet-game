/* v18 步骤1：替换游戏里的地图尺寸/常量/地形表/医院出生点/genMap/regionAt */
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
const F = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/抓宠游戏-v12-clean.html';
copyFileSync(F, F.replace(/\.html$/, '.bak-v18-before-map.html'));
let src = readFileSync(F, 'utf8');
const orig = src.length;

/* ── 1. 常量区：尺寸 + 地形表（新增 SNOW=10）+ 动态医院/出生点 + 地区等级段 ── */
const OLD_CONST = 'var MW=72, MH=52, T={PATH:0,GRASS:1,TALL:2,TREE:3,WATER:4,HOSP:5,LAVA:6,ROCK:7,DEEP:8,FLOWER:9};';
const NEW_CONST = `var MW=216, MH=156, T={PATH:0,GRASS:1,TALL:2,TREE:3,WATER:4,HOSP:5,LAVA:6,ROCK:7,DEEP:8,FLOWER:9,SNOW:10};
/* v18：地图放大到 216×156（面积 9 倍），中心广场出生，医院在广场旁 */
var MAP_CX=Math.floor(MW/2), MAP_CY=Math.floor(MH/2);
/* 地区等级段（用户定稿）：野怪等级 = clamp(玩家最强宠等级±3, 该地区下限, 上限) */
var LV_RANGE={plain:[1,25],forest:[1,25],water:[1,25],flower:[26,35],mine:[36,45],desert:[46,55],ocean:[56,65],volcano:[66,75],snow:[66,75]};`;
if (!src.includes(OLD_CONST)) throw new Error('找不到 T 定义');
src = src.replace(OLD_CONST, NEW_CONST);

/* 医院/出生点：原来写死 36,26 —— 改为按中心动态算 */
src = src.replace(/var HOSP=\{x:36,y:26\};/, 'var HOSP={x:MAP_CX+8,y:MAP_CY-3};');
src = src.replace(/var SPAWN=\{x:36,y:28\};/, 'var SPAWN={x:MAP_CX,y:MAP_CY+2};');

/* ── 2. 整块替换「地图生成」区块（genMap + tileAt + regionAt） ── */
const NEW_MAP_SECTION = `/* SECTION: map generation */
/* ══════════════════════════════════════════════════════════════
   v18 环形九地区地图（216×156，面积 9 倍）
   布局：中心平原(1-25) → 花海(26-35) → 矿洞(36-45) → 荒漠(46-55)
         → 最外圈按方位：东/南=海洋(56-65) · 西/西南=火山(66-75) · 北=雪原(66-75)
   道路：中心广场 + 十字大道 + 16 条辐射大道 + 8 条环路，全部贯穿各地区
   保障：撒完地形后自动做「可达性修复」，保证每个地区都能走进去
   ══════════════════════════════════════════════════════════════ */
var RING_RATIO=1.38;          /* 椭圆系数：让环在宽地图上仍是"环" */
var RING_SPAN=0, RING_B=[];
function ringD(x,y){ return Math.max(Math.abs(x-MAP_CX)/RING_RATIO, Math.abs(y-MAP_CY)); }
/* 只按环+方位给结构分区（供地形生成与野怪池用；林间/水畔是环内特征） */
function ringRegion(x,y){
  var dx=x-MAP_CX, dy=y-MAP_CY;
  var nx=dx/(MW/2), ny=dy/(MH/2), n=Math.abs(ny), e=Math.abs(nx);
  if(e>1||n>1) return "plain";
  var d=ringD(x,y);
  if(d<=RING_B[0]) return "plain";
  if(d<=RING_B[1]) return "flower";
  if(d<=RING_B[2]) return "mine";
  if(d<=RING_B[3]) return "desert";
  if(dy<0 && n>1.15*e) return "snow";
  if(dx>0 && e>=n/1.15) return (e<0.78?"desert":"ocean");
  if(dy>0 && n>1.15*e) return (n<0.74?"desert":"ocean");
  return "volcano";
}
/* 地区判定：环结构 + 环内地形特征（树多=林间、水多=水畔），玩家看到的地区名与野怪池一致 */
function regionAt(x,y){
  var base=ringRegion(x,y);
  if(base==="plain"||base==="flower"){
    var tree=0, water=0;
    for(var dy=-2;dy<=2;dy++) for(var dx=-2;dx<=2;dx++){
      var v=tileAt(x+dx,y+dy);
      if(v===T.TREE) tree++; else if(v===T.WATER) water++;
    }
    if(tree>=11) return "forest";
    if(water>=7) return "water";
  }
  return base;
}
function genMap(){
  var m=new Array(MW*MH);
  RING_SPAN=Math.min((MW/2-2)/RING_RATIO, MH/2-2);
  RING_B=[RING_SPAN*0.20, RING_SPAN*0.40, RING_SPAN*0.58, RING_SPAN*0.76];
  var ri2=function(a,b){ return a+Math.floor(Math.random()*(b-a+1)); };
  var inb2=function(x,y){ return x>=1&&y>=1&&x<MW-1&&y<MH-1; };
  var I=function(x,y){ return y*MW+x; };
  /* 1) 底色：按环 + 方位铺地形 */
  for(var y=0;y<MH;y++)for(var x=0;x<MW;x++){
    if(x===0||y===0||x===MW-1||y===MH-1){ m[I(x,y)]=T.TREE; continue; }
    var r=ringRegion(x,y), d=ringD(x,y), v=T.GRASS;
    if(r==="plain") v=Math.random()<0.06?T.TALL:T.GRASS;
    else if(r==="flower") v=Math.random()<0.14?T.FLOWER:(Math.random()<0.10?T.TALL:T.GRASS);
    else if(r==="mine") v=Math.random()<0.55?T.ROCK:(Math.random()<0.25?T.TALL:T.GRASS);
    else if(r==="desert") v=Math.random()<0.12?T.TALL:T.PATH;
    else if(r==="snow") v=Math.random()<0.10?T.ROCK:T.SNOW;
    else if(r==="volcano") v=Math.random()<0.14?T.LAVA:(Math.random()<0.22?T.ROCK:T.GRASS);
    else if(r==="ocean"){
      var inner=d<RING_B[3]+(RING_SPAN-RING_B[3])*0.35;
      v=inner?(Math.random()<0.55?T.WATER:T.PATH):(Math.random()<0.42?T.WATER:T.DEEP);
    }
    m[I(x,y)]=v;
  }
  /* 2) 道路骨架：广场 + 十字 + 16 条辐射大道 + 8 条环路（后面撒地形一律不压路） */
  for(var yy=MAP_CY-4;yy<=MAP_CY+4;yy++)for(var xx=MAP_CX-4;xx<=MAP_CX+4;xx++) if(inb2(xx,yy)) m[I(xx,yy)]=T.PATH;
  for(var x2=2;x2<MW-2;x2++) m[I(x2,MAP_CY)]=T.PATH;
  for(var y2=2;y2<MH-2;y2++) m[I(MAP_CX,y2)]=T.PATH;
  for(var i=0;i<16;i++){
    var a=Math.PI*2*i/16+0.15, ca=Math.cos(a), sa=Math.sin(a);
    for(var t=0;t<260;t++){
      var rx2=Math.round(MAP_CX+ca*t*RING_RATIO), ry2=Math.round(MAP_CY+sa*t);
      if(rx2<1||ry2<1||rx2>=MW-1||ry2>=MH-1) continue;
      m[I(rx2,ry2)]=T.PATH;
      if(t%2===0&&inb2(rx2+1,ry2)) m[I(rx2+1,ry2)]=T.PATH;
      if(t%4===0&&inb2(rx2,ry2+1)) m[I(rx2,ry2+1)]=T.PATH;
    }
  }
  var RINGS=[RING_B[0]+4,RING_B[0]+11,RING_B[1]-4,RING_B[1]+5,RING_B[2]+5,RING_B[2]+12,RING_B[3]-5,RING_B[3]+6];
  RINGS.forEach(function(rr){
    for(var a2=0;a2<Math.PI*2;a2+=0.008){
      var x3=Math.round(MAP_CX+Math.cos(a2)*rr*RING_RATIO), y3=Math.round(MAP_CY+Math.sin(a2)*rr);
      if(inb2(x3,y3)) m[I(x3,y3)]=T.PATH;
      if(inb2(x3+1,y3)) m[I(x3+1,y3)]=T.PATH;
      if(inb2(x3,y3+1)) m[I(x3,y3+1)]=T.PATH;
    }
  });
  var isRoad=function(x,y){ return inb2(x,y)&&m[I(x,y)]===T.PATH; };
  /* 3) 特色点缀（一律跳过路面） */
  var blob=function(cx,cy,r,kind,p){
    for(var py=cy-r;py<=cy+r;py++)for(var px=cx-r;px<=cx+r;px++){
      if(!inb2(px,py)) continue;
      if(Math.abs(px-cx)+Math.abs(py-cy)>r) continue;
      if(isRoad(px,py)) continue;
      if(Math.random()<p) m[I(px,py)]=kind;
    }
  };
  for(var fy=1;fy<MH-1;fy++)for(var fx=1;fx<MW-1;fx++){
    var fd=ringD(fx,fy);
    if(fd>RING_B[0]&&fd<=RING_B[1]&&Math.random()<0.34&&!isRoad(fx,fy)) m[I(fx,fy)]=T.FLOWER;
  }
  var pc=Math.round(MW*MH*0.0016);
  for(var i2=0;i2<pc;i2++){
    var a3=Math.random()*Math.PI*2, rr2=16+Math.random()*(RING_B[1]-16);
    blob(Math.round(MAP_CX+Math.cos(a3)*rr2*RING_RATIO), Math.round(MAP_CY+Math.sin(a3)*rr2), ri2(2,3), T.WATER, 0.9);
  }
  var wc=Math.round(MW*MH*0.0022);
  for(var i3=0;i3<wc;i3++){
    var a4=Math.random()*Math.PI*2, rr3=20+Math.random()*(RING_B[1]-20);
    blob(Math.round(MAP_CX+Math.cos(a4)*rr3*RING_RATIO), Math.round(MAP_CY+Math.sin(a4)*rr3), ri2(2,3), T.TREE, 0.82);
  }
  /* 平原环保持开阔：把多余的树/岩/水清成草地，只留零星点缀 */
  for(var py2=1;py2<MH-1;py2++)for(var px2=1;px2<MW-1;px2++){
    if(ringD(px2,py2)>RING_B[0]) continue;
    var pv=m[I(px2,py2)];
    if((pv===T.TREE||pv===T.ROCK)&&Math.random()<0.88) m[I(px2,py2)]=T.GRASS;
    else if(pv===T.DEEP||pv===T.LAVA) m[I(px2,py2)]=T.GRASS;
    else if(pv===T.WATER&&Math.random()<0.7) m[I(px2,py2)]=T.GRASS;
  }
  /* 火山口 + 雪原冰丘 + 海洋小岛 + 荒漠绿洲 */
  blob(Math.round(MAP_CX-RING_SPAN*RING_RATIO*0.88), MAP_CY+Math.round(RING_SPAN*0.25), 9, T.LAVA, 0.92);
  blob(Math.round(MAP_CX-RING_SPAN*RING_RATIO*0.80), MAP_CY-Math.round(RING_SPAN*0.35), 7, T.LAVA, 0.9);
  blob(MAP_CX-20, Math.round(MAP_CY-RING_SPAN*0.9), 6, T.ROCK, 0.55);
  blob(MAP_CX+30, Math.round(MAP_CY-RING_SPAN*0.86), 5, T.ROCK, 0.5);
  for(var i4=0;i4<6;i4++) blob(Math.round(MAP_CX+RING_SPAN*RING_RATIO*(0.72+Math.random()*0.26)), MAP_CY+ri2(-Math.round(RING_SPAN*0.5),Math.round(RING_SPAN*0.5)), ri2(2,3), T.TALL, 0.8);
  for(var i5=0;i5<8;i5++) blob(MAP_CX+ri2(-Math.round(RING_SPAN*RING_RATIO*0.72),Math.round(RING_SPAN*RING_RATIO*0.72)), MAP_CY+ri2(-Math.round(RING_SPAN*0.7),Math.round(RING_SPAN*0.7)), ri2(1,2), T.WATER, 0.75);
  /* 4) 出生点与医院先清出空地（保证站得住、走得出去） */
  var clearPad=function(cx,cy,r){
    for(var qy=cy-r;qy<=cy+r;qy++)for(var qx=cx-r;qx<=cx+r;qx++){
      if(!inb2(qx,qy)) continue;
      var qd=Math.abs(qx-cx)+Math.abs(qy-cy);
      if(qd===0||Math.random()<0.85) m[I(qx,qy)]=T.PATH;
      else if(m[I(qx,qy)]===T.TREE||m[I(qx,qy)]===T.ROCK||m[I(qx,qy)]===T.WATER||m[I(qx,qy)]===T.LAVA||m[I(qx,qy)]===T.DEEP) m[I(qx,qy)]=T.GRASS;
    }
  };
  clearPad(SPAWN.x,SPAWN.y,5);
  clearPad(HOSP.x,HOSP.y,2);
  m[I(HOSP.x,HOSP.y)]=T.HOSP;
  m[I(HOSP.x+1,HOSP.y)]=T.PATH; m[I(HOSP.x-1,HOSP.y)]=T.PATH;
  m[I(HOSP.x,HOSP.y+1)]=T.PATH; m[I(HOSP.x,HOSP.y-1)]=T.PATH;
  m[I(SPAWN.x,SPAWN.y)]=T.PATH;
  /* 5) 可达性修复：每个地区不够 60% 可走时，从该地区直线凿一条路接到已通的路 */
  var BLOCK={};
  BLOCK[T.TREE]=1; BLOCK[T.WATER]=1; BLOCK[T.LAVA]=1; BLOCK[T.ROCK]=1; BLOCK[T.DEEP]=1;
  var seen=new Uint8Array(MW*MH);
  var bfsSeen=function(){
    seen=new Uint8Array(MW*MH);
    var q=[I(SPAWN.x,SPAWN.y)]; seen[q[0]]=1;
    for(var head=0;head<q.length;head++){
      var cur=q[head], cx2=cur%MW, cy2=(cur-cx2)/MW;
      var nb=[[cx2+1,cy2],[cx2-1,cy2],[cx2,cy2+1],[cx2,cy2-1]];
      for(var k2=0;k2<4;k2++){
        var nx2=nb[k2][0], ny2=nb[k2][1];
        if(!inb2(nx2,ny2)) continue;
        var id2=I(nx2,ny2);
        if(seen[id2]||BLOCK[m[id2]]) continue;
        seen[id2]=1; q.push(id2);
      }
    }
  };
  for(var pass=0;pass<90;pass++){
    bfsSeen();
    var stat={};
    for(var sy=1;sy<MH-1;sy++)for(var sx=1;sx<MW-1;sx++){
      var sr=ringRegion(sx,sy);
      stat[sr]=stat[sr]||{tot:0,ok:0};
      stat[sr].tot++; if(seen[I(sx,sy)]) stat[sr].ok++;
    }
    var worst=null;
    Object.keys(stat).forEach(function(k3){
      var pct=stat[k3].ok/stat[k3].tot;
      if(pct<0.60&&(!worst||pct<worst.pct)) worst={r:k3,pct:pct};
    });
    if(!worst) break;
    var best=null;
    for(var by=1;by<MH-1&&!best;by++)for(var bx=1;bx<MW-1&&!best;bx++){
      if(ringRegion(bx,by)!==worst.r) continue;
      if(!BLOCK[m[I(bx,by)]]) continue;
      for(var rad=1;rad<=6&&!best;rad++){
        for(var ddy=-rad;ddy<=rad&&!best;ddy++)for(var ddx=-rad;ddx<=rad&&!best;ddx++){
          if(Math.max(Math.abs(ddx),Math.abs(ddy))!==rad) continue;
          var nnx=bx+ddx, nny=by+ddy;
          if(!inb2(nnx,nny)) continue;
          if(seen[I(nnx,nny)]) best={x:bx,y:by};
        }
      }
    }
    if(!best) continue;
    var cx3=best.x, cy3=best.y, guard=0;
    while(guard++<400){
      if(inb2(cx3,cy3)){
        if(m[I(cx3,cy3)]!==T.HOSP) m[I(cx3,cy3)]=T.PATH;
        if(seen[I(cx3,cy3)]) break;
      }
      var ddx2=SPAWN.x-cx3, ddy2=SPAWN.y-cy3;
      if(ddx2===0&&ddy2===0) break;
      if(Math.abs(ddx2)/RING_RATIO>Math.abs(ddy2)) cx3+=ddx2>0?1:-1; else cy3+=ddy2>0?1:-1;
    }
  }
  /* 6) 边界墙 + 医院 + 出生点（最后再确认一次，免得被凿路覆盖） */
  for(var bx2=0;bx2<MW;bx2++){ m[I(bx2,0)]=T.TREE; m[I(bx2,MH-1)]=T.TREE; }
  for(var by2=0;by2<MH;by2++){ m[I(0,by2)]=T.TREE; m[I(MW-1,by2)]=T.TREE; }
  m[I(HOSP.x,HOSP.y)]=T.HOSP;
  m[I(SPAWN.x,SPAWN.y)]=T.PATH;
  return m;
}
function tileAt(x,y){ if(x<0||y<0||x>=MW||y>=MH) return T.TREE; return map[y*MW+x]; }

`;
const S = src.indexOf('/* SECTION: map generation */');
const E = src.indexOf('/* SECTION: movement */');
if (S < 0 || E < 0 || E < S) throw new Error('找不到地图生成区块标记');
const oldBlock = src.slice(S, E);
console.log('被替换的地图区块：' + oldBlock.length + ' 字符');
src = src.slice(0, S) + NEW_MAP_SECTION + src.slice(E);

writeFileSync(F, src, 'utf8');
console.log('已完成：' + (orig / 1024).toFixed(0) + ' KB → ' + (src.length / 1024).toFixed(0) + ' KB');
console.log('检查残留：');
console.log('  旧 regionAt 硬编码 x>=60: ' + (src.includes('if(x>=60) return "ocean"') ? '❌ 还在' : '✅ 已清除'));
console.log('  旧 genMap patch 调用: ' + (src.includes('patch(36,16,4,T.TALL)') ? '❌ 还在' : '✅ 已清除'));
console.log('  新 SNOW 地形: ' + (src.includes('SNOW:10') ? '✅ 已加' : '❌'));
console.log('  动态 HOSP: ' + (src.includes('var HOSP={x:MAP_CX+8') ? '✅' : '❌'));
