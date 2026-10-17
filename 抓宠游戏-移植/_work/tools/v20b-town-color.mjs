/* v20b：城镇地面按道馆属性着色（标志背景）+ 四向通道（矿洞也能进） */
import { readFileSync, writeFileSync } from 'node:fs';
const ROOT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植';
const F = ROOT + '/抓宠游戏-v12-clean.html';
let src = readFileSync(F, 'utf8');
const before = src.length;
const done = [];
const rep = (re, to, label) => { if (!re.test(src)) { console.log('  ⚠️ ' + label + ' 未匹配'); return false; } src = src.replace(re, to); done.push(label); return true; };

/* 1) 新地形 TOWN（城镇地面，可通行、按道馆属性着色） */
rep(/ROCKFLOOR:13\};/, 'ROCKFLOOR:13,TOWN:14};', '新增 TOWN 地形');

/* 2) 道馆属性 → 标志色 */
rep(/(var BADGE_MAX=8;)/,
  `$1
/* v20：每个道馆所在地铺上该属性的标志背景色 */
var GYM_COLOR={ nor:"#d9d3c5", grass:"#a9d9a1", fairy:"#f6c8dc", rock:"#c9bda9",
                 ground:"#e2d09d", water:"#a9d0ea", fire:"#f2b18c", ice:"#d9eefb" };
var GYM_COLOR2={ nor:"#c9c2b2", grass:"#93c98b", fairy:"#e9aecb", rock:"#b9ac97",
                  ground:"#d4c088", water:"#93bcdc", fire:"#e39a72", ice:"#c6e2f5" };`,
  '道馆标志色表');

/* 3) 城镇地面铺 TOWN + 四方向向外清出通道（一次解决「围栏堵死」） */
rep(/    for\(var ty=cy-5;ty<=cy\+5;ty\+\+\)for\(var tx=cx-7;tx<=cx\+7;tx\+\+\) if\(inb2\(tx,ty\)\) m\[I\(tx,ty\)\]=T\.PATH;/,
  `    /* v20：城镇地面铺 TOWN（按道馆属性着色，可通行） */
    for(var ty=cy-5;ty<=cy+5;ty++)for(var tx=cx-7;tx<=cx+7;tx++) if(inb2(tx,ty)) m[I(tx,ty)]=T.TOWN;
    /* v20：四个方向向外清 10 格通道，保证被岩壁/树包围时也能进城 */
    [[1,0],[-1,0],[0,1],[0,-1]].forEach(function(dir){
      for(var k=1;k<=10;k++){
        var cpx=cx+dir[0]*(7+k), cpy=cy+dir[1]*(5+k);
        for(var w=-1;w<=1;w++){
          var cqx=cpx+(dir[0]?0:w), cqy=cpy+(dir[0]?cw:0);
          if(!inb2(cqx,cqy)) continue;
          var cqv=m[I(cqx,cqy)];
          if(cqv!==T.HOSP&&cqv!==T.GYM&&cqv!==T.LEAGUE) m[I(cqx,cqy)]=T.TOWN;
        }
      }
    });`,
  '城镇地面 TOWN + 四向通道');

/* 4) 围栏门：四方向都留 3 格宽 */
rep(/var isDoor=\(\(fy===cy\|\|fy===cy\+1\)&&Math\.abs\(fx-cx\)===8\);/,
  'var isDoor=((Math.abs(fy-cy)<=1&&Math.abs(fx-cx)===8)||(Math.abs(fx-cx)<=1&&Math.abs(fy-cy)===6));',
  '围栏四向门');

/* 5) draw 渲染 TOWN（按该城镇道馆属性着色） */
rep(/    else if\(v===T\.ROCKFLOOR\)\{/,
  `    else if(v===T.TOWN){
      /* v20 城镇地面：按该地道馆属性铺标志背景色 */
      var _tc="#d9d3c5", _tc2="#c9c2b2";
      for(var _ti=0;_ti<TOWNS.length;_ti++){
        var _tt=TOWNS[_ti];
        if(Math.abs(x-_tt.x)<=11 && Math.abs(y-_tt.y)<=9){
          _tc=GYM_COLOR[_tt.gymType]||_tc; _tc2=GYM_COLOR2[_tt.gymType]||_tc2; break;
        }
      }
      ctx.fillStyle=_tc; ctx.fillRect(px,py,TILE,TILE);
      ctx.fillStyle=_tc2; ctx.fillRect(px+3,py+3,TILE-6,TILE-6);
      ctx.fillStyle="rgba(255,255,255,.35)"; ctx.fillRect(px+6,py+6,4,4);
    }
    else if(v===T.ROCKFLOOR){`,
  'draw 渲染城镇标志背景');

/* 6) 可达性修复不许覆盖城镇地面 */
rep(/if\(m\[I\(cx3,cy3\)\]!==T\.HOSP && m\[I\(cx3,cy3\)\]!==T\.GYM && m\[I\(cx3,cy3\)\]!==T\.LEAGUE\) m\[I\(cx3,cy3\)\]=T\.PATH;/,
  'if(m[I(cx3,cy3)]!==T.HOSP && m[I(cx3,cy3)]!==T.GYM && m[I(cx3,cy3)]!==T.LEAGUE && m[I(cx3,cy3)]!==T.TOWN) m[I(cx3,cy3)]=T.PATH;',
  '可达性修复保护城镇');

writeFileSync(F, src, 'utf8');
console.log('v20b：' + (before / 1024).toFixed(0) + ' → ' + (src.length / 1024).toFixed(0) + ' KB');
done.forEach(d => console.log('  ✅ ' + d));
console.log('  校验：' + [
  src.includes('TOWN:14') ? 'TOWN✅' : 'TOWN❌',
  src.includes('GYM_COLOR') ? '色表✅' : '色表❌',
  src.includes('向外清 10 格通道') ? '通道✅' : '通道❌',
  src.includes('else if(v===T.TOWN)') ? '渲染✅' : '渲染❌',
].join(' · '));
