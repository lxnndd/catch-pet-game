/* v25：删掉全图路网（十字大道/16 条辐射大道/8 条环路），只留城镇内部街道；可达性凿通用地区背景地形 */
import { readFileSync, writeFileSync } from 'node:fs';
const ROOT = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植';
const F = ROOT + '/抓宠游戏-v12-clean.html';
let src = readFileSync(F, 'utf8');
const before = src.length;
const done = [];

/* ① 整段替换「道路骨架」：不再铺任何全图道路，isRoad 改为判石板 */
const S1 = src.indexOf('  /* 2) 道路骨架');
const E1 = src.indexOf('var isRoad=', S1);
if (S1 < 0 || E1 < 0) throw new Error('找不到道路骨架');
const oldSeg = src.slice(S1, E1);
console.log('原道路骨架 ' + oldSeg.length + ' 字符（含十字大道/16 条辐射大道/8 条环路）');
const NEW_SEG = `  /* 2) v25：不再铺全图路网。地图 = 自然地形 + 各座小镇（镇内街道由 buildTown 自己铺）
     —— 用户要求：除镇子中心外，其它地方都还原成地区背景地形。 */
`;
/* 找到 isRoad 那一行的结尾并一起替换 */
const isRoadEnd = src.indexOf('\n', src.indexOf('var isRoad=', S1));
const oldFull = src.slice(S1, isRoadEnd);
src = src.slice(0, S1) + NEW_SEG + `  var isRoad=function(x,y){ return inb2(x,y)&&m[I(x,y)]===T.STREET; };` + src.slice(isRoadEnd);
done.push('删除全图路网');

/* ② 可达性修复：凿通时不再铺沙色 PATH，改用该地区的背景地形 */
const reRepair = /if\(m\[I\(cx3,cy3\)\]!==T\.HOSP && m\[I\(cx3,cy3\)\]!==T\.GYM && m\[I\(cx3,cy3\)\]!==T\.LEAGUE && m\[I\(cx3,cy3\)\]!==T\.TOWN\) m\[I\(cx3,cy3\)\]=T\.PATH;/;
if (reRepair.test(src)) {
  src = src.replace(reRepair,
    `if(m[I(cx3,cy3)]!==T.HOSP && m[I(cx3,cy3)]!==T.GYM && m[I(cx3,cy3)]!==T.LEAGUE && m[I(cx3,cy3)]!==T.STREET){
          /* v25：凿通时铺该地区的背景地形（原来是沙色 PATH，会在自然地形上留下一条沙路） */
          var _bk=TOWN_GROUND[ringRegion(cx3,cy3)]||"GRASS";
          m[I(cx3,cy3)]=(T[_bk]!==undefined)?T[_bk]:T.GRASS;
        }`);
  done.push('凿通用地区背景地形');
} else console.log('  ⚠️ 可达性凿通段未匹配');

writeFileSync(F, src, 'utf8');
console.log('\nv25：' + (before / 1024).toFixed(0) + ' → ' + (src.length / 1024).toFixed(0) + ' KB');
done.forEach(d => console.log('  ✅ ' + d));
console.log('  校验：' + [
  src.includes('不再铺全图路网') ? '路网已删✅' : '❌',
  src.includes('凿通时铺该地区的背景地形') ? '凿通改背景✅' : '❌',
  src.includes('RINGS.forEach') ? '（环路代码仍在❌）' : '环路已去✅',
].join(' · '));
