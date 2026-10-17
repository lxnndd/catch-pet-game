/* Step2a：地图 350×250 + 8 座城镇（每座含医院 + 道馆）+ 联盟建筑 + 渲染 */
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
const ROOT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植';
const F = ROOT + '/抓宠游戏-v12-clean.html';
copyFileSync(F, F.replace(/\.html$/, '.bak-v19-before-town.html'));
let src = readFileSync(F, 'utf8');
const before = src.length;
const nl = src.includes('\r\n') ? '\r\n' : '\n';

/* ── 1) 地图尺寸 + 新地形 ── */
const OLD_CONST = /var MW=216, MH=156, T=\{PATH:0,GRASS:1,TALL:2,TREE:3,WATER:4,HOSP:5,LAVA:6,ROCK:7,DEEP:8,FLOWER:9,SNOW:10\};/;
if (!OLD_CONST.test(src)) throw new Error('找不到 MW/MH/T 定义');
src = src.replace(OLD_CONST,
  'var MW=350, MH=250, T={PATH:0,GRASS:1,TALL:2,TREE:3,WATER:4,HOSP:5,LAVA:6,ROCK:7,DEEP:8,FLOWER:9,SNOW:10,GYM:11,LEAGUE:12};');
/* 城镇与徽章相关常量 */
src = src.replace(/var HOSP=\{x:MAP_CX\+8,y:MAP_CY-3\};/,
  `var HOSP={x:MAP_CX+8,y:MAP_CY-3};
/* ══ v19 城镇 / 道馆 / 徽章 ══
   8 座城镇，每座一个医院 + 一个道馆（水畔没有城镇，与用户要求一致）；
   道馆对战暂为占位（进去只显示"道馆主不在"），徽章系统已就位，攒满 8 枚可挑战联盟大赛。 */
var TOWNS=[];                  /* genMap 时填充：[{region,name,x,y,hosp,gym,gymType,gymName,leaderName}] */
var REGION_GYM={ plain:["nor","一般系","阿磊"], forest:["grass","草系","小柯"], flower:["fairy","妖精系","小茜"],
                 mine:["rock","岩石系","铁镐"], desert:["ground","地面系","岩拳"], ocean:["water","水系","蓝波"],
                 volcano:["fire","火系","炎"], snow:["ice","冰系","凛"] };
var BADGE_MAX=8;
var LEAGUE_POS=null;           /* 联盟大赛建筑坐标 */`);

/* ── 2) 在 genMap 的「可达性修复」之前插入城镇生成 ── */
const ANCHOR = '  /* 5) 可达性修复';
const idx = src.indexOf(ANCHOR);
if (idx < 0) throw new Error('找不到可达性修复锚点');
const TOWN_CODE = `  /* 4.5) v19 城镇：8 个地区各一座（水畔除外），每座含 🏥医院 + 道馆 */
  TOWNS=[];
  var TOWN_W=15, TOWN_H=11;                     /* 城镇可走区域尺寸（不含围栏） */
  var inTown=function(x,y){ for(var i=0;i<TOWNS.length;i++){ var t=TOWNS[i]; if(Math.abs(x-t.x)<=9&&Math.abs(y-t.y)<=7) return true; } return false; };
  var buildTown=function(cx,cy,reg,gymType,gymName,leader){
    /* 清出石板路 */
    for(var y=cy-5;y<=cy+5;y++)for(var x=cx-7;x<=cx+7;x++) if(inb2(x,y)) m[I(x,y)]=T.PATH;
    /* 外圈围栏（左右各留一处出入口） */
    for(var y2=cy-6;y2<=cy+6;y2++)for(var x2=cx-8;x2<=cx+8;x2++){
      if(!inb2(x2,y2)) continue;
      if(Math.abs(x2-cx)===8||Math.abs(y2-cy)===6){
        var isDoor=((y2===cy||y2===cy+1)&&Math.abs(x2-cx)===8);
        m[I(x2,y2)]=isDoor?T.PATH:T.TREE;
      }
    }
    /* 医院（城镇右侧） */
    var hx=cx+4, hy=cy+2;
    m[I(hx,hy)]=T.HOSP;
    m[I(hx-1,hy)]=T.PATH; m[I(hx+1,hy)]=T.PATH; m[I(hx,hy-1)]=T.PATH; m[I(hx,hy+1)]=T.PATH;
    /* 道馆 3×3（城镇左上） */
    var gx=cx-4, gy=cy-3;
    for(var y3=gy-1;y3<=gy+1;y3++)for(var x3=gx-1;x3<=gx+1;x3++) if(inb2(x3,y3)) m[I(x3,y3)]=T.GYM;
    m[I(gx,gy+2)]=T.PATH;                        /* 道馆门前留路 */
    TOWNS.push({region:reg,name:REGION_NAME[reg]+"镇",x:cx,y:cy,
                hosp:{x:hx,y:hy},gym:{x:gx,y:gy},
                gymType:gymType,gymName:gymName+"道馆",leaderName:leader});
    return {x:cx,y:cy};
  };
  /* 为每个地区找一块合适的位置：优先「该地区内离地图中心适中、且不在水里/岩浆里」的点 */
  var findSpot=function(reg){
    var best=null;
    for(var y=10;y<MH-10;y+=2)for(var x=10;x<MW-10;x+=2){
      if(ringRegion(x,y)!==reg) continue;
      /* 区域必须整块可用（不能是水/岩浆/深海/已有城镇） */
      var ok=true, bad=0;
      for(var dy=-6;dy<=6&&ok;dy++)for(var dx=-8;dx<=8;dx++){
        var v=m[I(x+dx,y+dy)];
        if(v===T.WATER||v===T.DEEP||v===T.LAVA||v===T.HOSP||v===T.GYM) bad++;
        if(bad>2){ ok=false; break; }
      }
      if(!ok) continue;
      if(inTown(x,y)) continue;
      /* 打分：到地图中心的距离要适中（城镇别挤在中心，也别贴边） */
      var d=Math.abs(x-MAP_CX)+Math.abs(y-MAP_CY);
      var want=Math.min(MW,MH)*0.35;             /* 目标距离 */
      var score=Math.abs(d-want);
      if(!best||score<best.score) best={x:x,y:y,score:score};
    }
    return best;
  };
  Object.keys(REGION_GYM).forEach(function(reg){
    var spot=findSpot(reg);
    if(!spot){ console.log('暂无（城镇位置没找到）',reg); return; }
    var cfg=REGION_GYM[reg];
    buildTown(spot.x,spot.y,reg,cfg[0],cfg[1],cfg[2]);
  });
  /* 联盟大赛：建在平原城镇的东北侧（靠近中心，方便找） */
  if(TOWNS.length){
    var pw=TOWNS[0];
    var lx=pw.x+26, ly=pw.y-16;
    if(lx>MW-12) lx=pw.x-26;
    if(ly<12) ly=pw.y+16;
    for(var ly2=ly-2;ly2<=ly+2;ly2++)for(var lx2=lx-3;lx2<=lx+3;lx2++) if(inb2(lx2,ly2)) m[I(lx2,ly2)]=T.PATH;
    for(var ly3=ly-1;ly3<=ly+1;ly3++)for(var lx3=lx-2;lx3<=lx+2;lx3++) if(inb2(lx3,ly3)) m[I(lx3,ly3)]=T.LEAGUE;
    m[I(lx,ly+3)]=T.PATH; m[I(lx,ly-3)]=T.PATH;
    LEAGUE_POS={x:lx,y:ly};
  }
  console.log('[v19] 城镇 ' + TOWNS.length + ' 座 · 联盟 ' + (LEAGUE_POS?('('+LEAGUE_POS.x+','+LEAGUE_POS.y+')'):'未建'));
  /* 把主医院指向平原城镇的医院（boot 的位置校验用） */
  if(TOWNS.length){ HOSP={x:TOWNS[0].hosp.x,y:TOWNS[0].hosp.y}; }

`;
src = src.slice(0, idx) + TOWN_CODE + src.slice(idx);

/* ── 3) 可达性修复：把「保护城镇」加入条件（城镇格子不许被凿掉）── */
src = src.replace('if(m[I(cx3,cy3)]!==T.HOSP) m[I(cx3,cy3)]=T.PATH;',
  'if(m[I(cx3,cy3)]!==T.HOSP && m[I(cx3,cy3)]!==T.GYM && m[I(cx3,cy3)]!==T.LEAGUE) m[I(cx3,cy3)]=T.PATH;');

/* ── 4) draw 里渲染道馆与联盟 ── */
const DRAW_ANCHOR = 'else if(v===T.SNOW){';
const dIdx = src.indexOf(DRAW_ANCHOR);
if (dIdx < 0) throw new Error('找不到 draw 插入点');
const DRAW_INSERT = `    else if(v===T.GYM){
      /* v19 道馆：红顶建筑 + 门口台阶 */
      ctx.fillStyle="#e8e2d4"; ctx.fillRect(px,py,TILE,TILE);
      ctx.fillStyle="#c94f3d"; ctx.beginPath();
      ctx.moveTo(px+2,py+TILE*0.42); ctx.lineTo(px+TILE/2,py+3); ctx.lineTo(px+TILE-2,py+TILE*0.42); ctx.closePath(); ctx.fill();
      ctx.fillStyle="#f4f1e8"; ctx.fillRect(px+3,py+TILE*0.42,TILE-6,TILE*0.5);
      ctx.fillStyle="#8b5a2b"; ctx.fillRect(px+TILE/2-4,py+TILE*0.62,8,TILE*0.3);
      ctx.fillStyle="#ffd54a"; ctx.fillRect(px+TILE/2-3,py+6,6,6);
    }
    else if(v===T.LEAGUE){
      /* v19 联盟大赛：金色大场馆 */
      ctx.fillStyle="#f3e9c8"; ctx.fillRect(px,py,TILE,TILE);
      ctx.fillStyle="#d4a017"; ctx.beginPath();
      ctx.moveTo(px+1,py+TILE*0.5); ctx.lineTo(px+TILE/2,py+2); ctx.lineTo(px+TILE-1,py+TILE*0.5); ctx.closePath(); ctx.fill();
      ctx.fillStyle="#fffbe8"; ctx.fillRect(px+3,py+TILE*0.5,TILE-6,TILE*0.42);
      ctx.fillStyle="#b8860b"; ctx.fillRect(px+TILE/2-5,py+TILE*0.66,10,TILE*0.28);
      ctx.fillStyle="#fff3b0"; ctx.fillRect(px+5,py+5,4,4); ctx.fillRect(px+TILE-9,py+5,4,4);
    }
    ` + src.slice(dIdx);

writeFileSync(F, src, 'utf8');
console.log('Step2a 完成：' + (before / 1024).toFixed(0) + ' → ' + (src.length / 1024).toFixed(0) + ' KB');
console.log('  地图 350×250：' + (src.includes('var MW=350, MH=250') ? '✅' : '❌'));
console.log('  GYM/LEAGUE 地形：' + (src.includes('GYM:11,LEAGUE:12') ? '✅' : '❌'));
console.log('  城镇生成代码：' + (src.includes('buildTown') ? '✅' : '❌'));
console.log('  draw 渲染：' + (src.includes('道馆：红顶建筑') ? '✅' : '❌'));
