/* v18 修：对战舞台高度自适应（原来写死 212px，两个立绘+血条装不下被裁掉） */
import { readFileSync, writeFileSync } from 'node:fs';
const F = 'C:/Users/10709/Desktop/AI/抓宠游戏/抓宠游戏-移植/抓宠游戏-v12-clean.html';
let src = readFileSync(F, 'utf8');
const before = src.length;

/* ① 主定义：给 battle-stage 一个能装下「双方名字+状态+血条+立绘」的最小高度 */
const re1 = /(\.battle-stage\{)[^}]*(\})/;
if (re1.test(src)) {
  src = src.replace(re1, (m) => m);   /* 先看原样 */
}
const m1 = src.match(re1);
console.log('原来 .battle-stage 主定义：' + (m1 ? m1[0].replace(/\s+/g, ' ') : '未找到'));

/* ② 窄屏那处写死高度改成自适应 */
const re2 = /\.battle-stage\{height:212px;\}/;
if (re2.test(src)) {
  src = src.replace(re2, '.battle-stage{height:auto; min-height:300px;}');
  console.log('✅ 写死高度 212px → auto/min-height 300px');
} else {
  /* 宽匹配任意 height:NNNpx 的 battle-stage */
  const re2b = /\.battle-stage\{height:\d+px;\}/;
  if (re2b.test(src)) { src = src.replace(re2b, '.battle-stage{height:auto; min-height:300px;}'); console.log('✅ （宽匹配）改成自适应'); }
  else console.log('❌ 未找到写死高度');
}
/* ③ 窄屏媒体查询里同步：立绘缩到 78px、舞台 min-height 260px、血条窄一点 */
const re3 = /\.battle-stage \.side-e \.sp\{font-size:86px;\} \.battle-stage \.side-s \.sp\{font-size:86px;\}/;
if (re3.test(src)) {
  src = src.replace(re3, '.battle-stage{min-height:260px;} .battle-stage .side-e .sp,.battle-stage .side-s .sp{font-size:78px;} .battle-stage .side-e .sp .pet-avatar,.battle-stage .side-s .sp .pet-avatar{width:88px;height:88px;}');
  console.log('✅ 窄屏立绘 86px → 78px 并同步头像尺寸');
}
/* ④ 通用：给头像在战斗里加一个上限，避免撑破 */
const re4 = /(\.battle-stage \.side-e \.sp \.pet-avatar, \.battle-stage \.side-s \.sp \.pet-avatar\{)[^}]*(\})/;
if (re4.test(src)) {
  src = src.replace(re4, '$1width:104px; height:104px; max-width:100%; object-fit:contain;$2');
  console.log('✅ 战斗头像尺寸统一 104px + object-fit:contain');
}
/* ⑤ 让两个立绘区域别压在一起：side-e 上、side-s 下，各自限制宽度与高度 */
const re5 = /\.battle-stage \.side-e\{right:2%; top:8px;\}/;
if (re5.test(src)) src = src.replace(re5, '.battle-stage .side-e{right:3%; top:4px; max-width:52%;}');
const re6 = /\.battle-stage \.side-s\{left:2%; bottom:8px;\}/;
if (re6.test(src)) src = src.replace(re6, '.battle-stage .side-s{left:3%; bottom:4px; max-width:52%;}');

writeFileSync(F, src, 'utf8');
console.log('\n大小 ' + (before / 1024).toFixed(0) + ' → ' + (src.length / 1024).toFixed(0) + ' KB');
console.log('校验：');
console.log('  舞台自适应: ' + (/\.battle-stage\{height:auto; min-height:300px;\}/.test(src) ? '✅' : '❌'));
console.log('  窄屏舞台: ' + (/\.battle-stage\{min-height:260px;\}/.test(src) ? '✅' : '❌'));
