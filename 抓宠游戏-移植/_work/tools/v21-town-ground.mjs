/* v21：城镇地面用地形图案（非纯色）+ 街道改石板色（与荒漠区分）+ 城镇间距校验防重叠 */
import { readFileSync, writeFileSync } from 'node:fs';
const ROOT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植';
const F = ROOT + '/抓宠游戏-v12-clean.html';
let src = readFileSync(F, 'utf8');
const before = src.length;
const done = [];
const rep = (re, to, label) => { if (!re.test(src)) { console.log('  ⚠️ ' + label + ' 未匹配'); return false; } src = src.replace(re, to); done.push(label); return true; };

/* 1) 新增 STREET 地形（城镇石板街道，避免和荒漠的沙色 PATH 撞色） */
rep(/ROCKFLOOR:13,TOWN:14\};/, 'ROCKFLOOR:13,TOWN:14,STREET:15};', '新增 STREET 地形');

/* 2) 各地区城镇的地面地形 + 装饰 */
rep(/(var GYM_COLOR2=\{[\s\S]*?\};)/,
  `$1
/* v21：城镇地面用该地区的标志「地形图案」（不是纯色块） */
var TOWN_GROUND={ plain:"GRASS", forest:"GRASS", flower:"FLOWER", mine:"ROCKFLOOR",
                  desert:"PATH", ocean:"PATH", volcano:"ROCKFLOOR", snow:"SNOW" };
/* 该地区的装饰地形与洒落比例（街道与通道后铺，不会被挡住） */
var TOWN_DECO={ plain:["FLOWER",0.10], forest:["TREE",0.30], flower:["TALL",0.12], mine:["ROCK",0.08],
                desert:["TALL",0.10], ocean:["WATER",0.06], volcano:["LAVA",0.06], snow:["ROCK",0.08] };`,
  '城镇地面图案表');

/* 3) buildTown：铺地区地形 + 洒装饰 + 石板十字街道 */
rep(/    \/\* v20：城镇地面铺 TOWN（按道馆属性着色，可通行） \*\/\r?\n    for\(var ty=cy-5;ty<=cy\+5;ty\+\+\)for\(var tx=cx-7;tx<=cx\+7;tx\+\+\) if\(inb2\(tx,ty\)\) m\[I\(tx,ty\)\]=T\.TOWN;/,
  `    /* v21：城镇地面铺该地区的标志地形（花海=花田、林间=草地树木、矿洞=岩地…） */
    var gbase=T[TOWN_GROUND[reg]||"GRASS"]||T.GRASS;
    var gdeco=TOWN_DECO[reg]||["FLOWER",0.10];
    var gdk=T[gdeco[0]]||T.FLOWER;
    for(var ty=cy-5;ty<=cy+5;ty++)for(var tx=cx-7;tx<=cx+7;tx++) if(inb2(tx,ty)) m[I(tx,ty)]=gbase;
    /* 洒地区装饰（后面铺街道与通道时会覆盖，不会挡路） */
    for(var ty9=cy-5;ty9<=cy+5;ty9++)for(var tx9=cx-7;tx9<=cx+7;tx9++){
      if(!inb2(tx9,ty9)) continue;
      if(m[I(tx9,ty9)]===gbase && Math.random()<gdeco[1]) m[I(tx9,ty9)]=gdk;
    }
    /* 城镇十字街道：石板色（与荒漠的沙地明确区分） */
    for(var stx=cx-7;stx<=cx+7;stx++) if(inb2(stx,cy)) m[I(stx,cy)]=T.STREET;
    for(var sty=cy-5;sty<=cy+5;sty++) if(inb2(cx,sty)) m[I(cx,sty)]=T.STREET;
    if(inb2(cx,cy)) m[I(cx,cy)]=T.STREET;`,
  '城镇地面用地形图案 + 石板街道');

/* 4) 四向通道改用石板 */
rep(/if\(cqv!==T\.HOSP&&cqv!==T\.GYM&&cqv!==T\.LEAGUE\) m\[I\(cqx,cqy\)\]=T\.TOWN;/,
  'if(cqv!==T.HOSP&&cqv!==T.GYM&&cqv!==T.LEAGUE) m[I(cqx,cqy)]=T.STREET;',
  '四向通道改石板');

/* 5) findSpot 加最小间距，防止两座城镇区域重叠（荒漠镇↔雪原镇曾差 12 格） */
rep(/      if\(mine\/tot<0\.62\) continue;/,
  `      if(mine/tot<0.62) continue;
      /* v21：与已有城镇保持距离，防止 17×13 的城镇区域互相重叠 */
      var tooClose=false;
      for(var ci=0;ci<TOWNS.length;ci++){
        if(Math.abs(sx-TOWNS[ci].x)<26 && Math.abs(sy-TOWNS[ci].y)<20){ tooClose=true; break; }
      }
      if(tooClose) continue;`,
  '城镇最小间距校验');

/* 6) draw 渲染石板街道 */
rep(/    else if\(v===T\.TOWN\)\{/,
  `    else if(v===T.STREET){
      /* v21 城镇街道：石板灰（跟荒漠的沙地明显不同色） */
      ctx.fillStyle="#b9b3a7"; ctx.fillRect(px,py,TILE,TILE);
      ctx.fillStyle="#a9a396"; ctx.fillRect(px+3,py+3,TILE-6,TILE-6);
      ctx.fillStyle="#c6c0b4"; ctx.fillRect(px+6,py+6,5,5); ctx.fillRect(px+TILE-11,py+TILE-11,5,5);
    }
    else if(v===T.TOWN){`,
  'draw 渲染石板街道');

writeFileSync(F, src, 'utf8');
console.log('v21：' + (before / 1024).toFixed(0) + ' → ' + (src.length / 1024).toFixed(0) + ' KB');
done.forEach(d => console.log('  ✅ ' + d));
console.log('  校验：' + [
  src.includes('STREET:15') ? 'STREET✅' : 'STREET❌',
  src.includes('TOWN_GROUND') ? '地面表✅' : '地面表❌',
  src.includes('v21：与已有城镇保持距离') ? '间距✅' : '间距❌',
  src.includes('else if(v===T.STREET)') ? '街道渲染✅' : '街道❌',
].join(' · '));
